declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const ADMIN_EMAIL = "kiritogeek@gmail.com";

function getCors(req: Request): Record<string, string> {
  const origin = Deno.env.get("ALLOWED_ORIGIN")?.trim() ?? req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function json(body: object, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function serviceDelete(
  supabaseUrl: string,
  serviceKey: string,
  path: string
): Promise<Response> {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=minimal",
    },
  });
}

async function serviceGet(
  supabaseUrl: string,
  serviceKey: string,
  path: string
): Promise<unknown[]> {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "count=none",
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PostgREST GET error on ${path}: ${err}`);
  }
  return res.json() as Promise<unknown[]>;
}

async function handleResetQuota(
  supabaseUrl: string,
  serviceKey: string,
  cors: Record<string, string>,
  userId: string
) {
  const profilesRaw = await serviceGet(
    supabaseUrl,
    serviceKey,
    `profiles?select=billing_period_start&user_id=eq.${userId}`
  );
  const profile = (profilesRaw as Array<{ billing_period_start: string | null }>)[0];

  let periodStart: string;
  if (profile?.billing_period_start) {
    periodStart = profile.billing_period_start;
  } else {
    const now = new Date();
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  }

  // Count before delete to return deletedCount
  const usageBeforeRaw = await serviceGet(
    supabaseUrl,
    serviceKey,
    `usage?select=id&user_id=eq.${userId}&created_at=gte.${periodStart}`
  );
  const deletedCount = (usageBeforeRaw as unknown[]).length;

  const delRes = await serviceDelete(
    supabaseUrl,
    serviceKey,
    `usage?user_id=eq.${userId}&created_at=gte.${periodStart}`
  );
  if (!delRes.ok) {
    const err = await delRes.text();
    return json({ error: "Échec reset quota", details: err }, 502, cors);
  }

  return json({ success: true, deletedCount }, 200, cors);
}

async function handleDeleteUser(
  supabaseUrl: string,
  serviceKey: string,
  cors: Record<string, string>,
  userId: string
) {
  // 1. Supprimer usage
  await serviceDelete(supabaseUrl, serviceKey, `usage?user_id=eq.${userId}`);

  // 2. Supprimer données liées aux projets
  const projectsRaw = await serviceGet(
    supabaseUrl,
    serviceKey,
    `projects?select=id&user_id=eq.${userId}`
  );
  const projectIds = (projectsRaw as Array<{ id: string }>).map((p) => p.id);

  for (const pid of projectIds) {
    const chaptersRaw = await serviceGet(
      supabaseUrl,
      serviceKey,
      `chapters?select=id&project_id=eq.${pid}`
    );
    const chapterIds = (chaptersRaw as Array<{ id: string }>).map((c) => c.id);

    if (chapterIds.length > 0) {
      const idsParam = `(${chapterIds.join(",")})`;
      await serviceDelete(supabaseUrl, serviceKey, `chapter_canvases?chapter_id=in.${idsParam}`);
    }

    await serviceDelete(supabaseUrl, serviceKey, `chapters?project_id=eq.${pid}`);
    await serviceDelete(supabaseUrl, serviceKey, `scenario_chapters?project_id=eq.${pid}`);
    await serviceDelete(supabaseUrl, serviceKey, `assets?project_id=eq.${pid}`);
  }

  // 3. Supprimer projets
  await serviceDelete(supabaseUrl, serviceKey, `projects?user_id=eq.${userId}`);

  // 4. Supprimer profil
  await serviceDelete(supabaseUrl, serviceKey, `profiles?user_id=eq.${userId}`);

  // 5. Supprimer compte Auth via Admin API
  const authDeleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!authDeleteRes.ok) {
    const err = await authDeleteRes.text();
    return json({ error: "Échec suppression compte Auth", details: err }, 502, cors);
  }

  return json({ success: true }, 200, cors);
}

async function handleSetPlan(
  supabaseUrl: string,
  serviceKey: string,
  cors: Record<string, string>,
  userId: string,
  plan: string
) {
  const validPlans = ["libre", "createur", "studio"];
  if (!validPlans.includes(plan)) {
    return json({ error: "Plan invalide" }, 400, cors);
  }

  const billingPeriodStart = plan !== "libre" ? new Date().toISOString() : null;

  const patchRes = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ plan, billing_period_start: billingPeriodStart }),
  });

  if (!patchRes.ok) {
    const err = await patchRes.text();
    return json({ error: "Échec mise à jour plan", details: err }, 502, cors);
  }

  return json({ success: true, plan }, 200, cors);
}

Deno.serve(async (req) => {
  const cors = getCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Config manquante" }, 500, cors);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Authorization manquante" }, 401, cors);
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey ?? serviceKey },
  });
  if (!userRes.ok) return json({ error: "JWT invalide" }, 401, cors);
  const userData = await userRes.json();
  if (userData?.email !== ADMIN_EMAIL) return json({ error: "Accès refusé" }, 403, cors);

  let body: {
    action?: string;
    userId?: string;
    plan?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body invalide" }, 400, cors);
  }

  const { action, userId, plan } = body;

  if (!userId) return json({ error: "userId requis" }, 400, cors);

  try {
    if (action === "reset_quota") {
      return await handleResetQuota(supabaseUrl, serviceKey, cors, userId);
    }
    if (action === "delete_user") {
      return await handleDeleteUser(supabaseUrl, serviceKey, cors, userId);
    }
    if (action === "set_plan") {
      if (!plan) return json({ error: "plan requis" }, 400, cors);
      return await handleSetPlan(supabaseUrl, serviceKey, cors, userId, plan);
    }
    return json({ error: "Action invalide" }, 400, cors);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    return json({ error: message }, 502, cors);
  }
});
