// Edge Function: Admin — override plan (kiritogeek@gmail.com uniquement)
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

  // Vérifier l'identité de l'appelant
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey ?? serviceKey },
  });
  if (!userRes.ok) return json({ error: "JWT invalide" }, 401, cors);
  const userData = await userRes.json();
  if (userData?.email !== ADMIN_EMAIL) return json({ error: "Accès refusé" }, 403, cors);

  const userId: string = userData.id;

  let body: { plan?: string };
  try { body = await req.json(); } catch { return json({ error: "Body invalide" }, 400, cors); }

  const validPlans = ["libre", "createur", "studio"];
  const newPlan = validPlans.includes(body.plan ?? "") ? (body.plan as string) : "libre";
  const billingPeriodStart = newPlan !== "libre" ? new Date().toISOString() : null;

  // Mise à jour avec service role (bypass RLS)
  const updateRes = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ plan: newPlan, billing_period_start: billingPeriodStart }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.text();
    return json({ error: "Échec mise à jour", details: err }, 502, cors);
  }

  return json({ success: true, plan: newPlan }, 200, cors);
});
