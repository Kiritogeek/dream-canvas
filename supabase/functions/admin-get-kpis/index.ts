import { getCorsHeaders } from "../_shared/cors.ts";

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const ADMIN_EMAIL = "kiritogeek@gmail.com";

function json(body: object, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

type PlanKey = "libre" | "createur" | "studio";

interface ProfileRow {
  user_id: string;
  email: string;
  display_name: string;
  plan: PlanKey;
  billing_period_start: string | null;
  created_at: string;
  excluded_from_stats: boolean;
}

interface UsageRow {
  user_id: string;
  action: string;
  created_at: string;
}

interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  style_template: string | null;
  updated_at: string;
}

async function restGet(
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
    throw new Error(`PostgREST error on ${path}: ${err}`);
  }
  return res.json() as Promise<unknown[]>;
}

async function handleGlobal(
  supabaseUrl: string,
  serviceKey: string,
  cors: Record<string, string>,
  period: string = "30d",
  testOnly: boolean = false
) {
  const now = new Date();
  const ago7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const ago14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let daysBack = 30;
  if (period === "90d") daysBack = 90;
  else if (period === "1y") daysBack = 365;
  const periodStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  const [profilesRaw, usageRaw] = await Promise.all([
    restGet(supabaseUrl, serviceKey, "profiles?select=user_id,plan,billing_period_start,created_at,excluded_from_stats"),
    restGet(supabaseUrl, serviceKey, `usage?select=user_id,created_at&order=created_at.desc`),
  ]);

  const profiles = profilesRaw as Pick<ProfileRow, "user_id" | "plan" | "billing_period_start" | "created_at" | "excluded_from_stats">[];
  const usageAll = usageRaw as Pick<UsageRow, "user_id" | "created_at">[];
  const visibleProfiles = profiles.filter(p => testOnly ? p.excluded_from_stats : !p.excluded_from_stats);
  const visibleUserIds = new Set(visibleProfiles.map(p => p.user_id));
  const visibleUsage = usageAll.filter(u => visibleUserIds.has(u.user_id));

  const totalUsers = visibleProfiles.length;
  const paidUsers = visibleProfiles.filter((p) => p.plan !== "libre").length;
  const planDistribution: Record<PlanKey, number> = { libre: 0, createur: 0, studio: 0 };
  for (const p of visibleProfiles) {
    if (p.plan in planDistribution) planDistribution[p.plan as PlanKey]++;
  }
  const newUsers7d = visibleProfiles.filter((p) => p.created_at >= ago7d).length;

  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const activeSet24h = new Set(visibleUsage.filter((u) => u.created_at >= ago24h).map((u) => u.user_id));
  const activeSet7d = new Set(visibleUsage.filter((u) => u.created_at >= ago7d).map((u) => u.user_id));
  const activeSet30d = new Set(visibleUsage.filter((u) => u.created_at >= ago30d).map((u) => u.user_id));
  const dau = activeSet24h.size;
  const active7d = activeSet7d.size;
  const active30d = activeSet30d.size;
  const activationRate = totalUsers > 0 ? Math.round((active30d / totalUsers) * 100) / 100 : 0;
  const conversionRate = totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 10000) / 100 : 0;
  const dauMauRatio = active30d > 0 ? Math.round((dau / active30d) * 10000) / 100 : 0;
  const mrrEstimated = planDistribution.createur * 12.99 + planDistribution.studio * 29.99;
  const arpuEstimated = paidUsers > 0 ? Math.round((mrrEstimated / paidUsers) * 100) / 100 : 0;

  const prevNewUsers7d = visibleProfiles.filter((p) => p.created_at >= ago14d && p.created_at < ago7d).length;
  const prevActiveSet7d = new Set(visibleUsage.filter((u) => u.created_at >= ago14d && u.created_at < ago7d).map((u) => u.user_id));

  const kpiTrends = {
    totalUsers: newUsers7d - prevNewUsers7d,
    newUsers7d: newUsers7d - prevNewUsers7d,
    active7d: active7d - prevActiveSet7d.size,
    active30d: 0,
    paidUsers: 0,
    mrrEstimated: 0,
  };

  const totalGenerations = visibleUsage.length;

  const cohortD7 = visibleProfiles.filter(p => p.created_at >= ago14d && p.created_at < ago7d);
  const retentionD7 = cohortD7.length === 0 ? 0 : Math.round(
    cohortD7.filter(p => {
      const regDate = p.created_at;
      const d7After = new Date(new Date(regDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      return visibleUsage.some(u => u.user_id === p.user_id && u.created_at >= regDate && u.created_at < d7After);
    }).length / cohortD7.length * 100
  );

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const usageThisMonth = visibleUsage.filter(u => u.created_at >= monthStart);
  const usageByUser = new Map<string, number>();
  for (const u of usageThisMonth) {
    usageByUser.set(u.user_id, (usageByUser.get(u.user_id) ?? 0) + 1);
  }

  function saturationRate(planName: PlanKey, limit: number): number {
    const planUsers = visibleProfiles.filter(p => p.plan === planName);
    if (planUsers.length === 0) return 0;
    const saturated = planUsers.filter(p => (usageByUser.get(p.user_id) ?? 0) >= limit).length;
    return Math.round(saturated / planUsers.length * 100);
  }

  const quotaSaturation = {
    libre: saturationRate("libre", 20),
    createur: saturationRate("createur", 100),
    studio: saturationRate("studio", 250),
  };

  const everPaid = visibleProfiles.filter(p => p.billing_period_start !== null);
  const churned = everPaid.filter(p => p.plan === "libre");
  const churnEstimated = everPaid.length === 0 ? 0 : Math.round(churned.length / everPaid.length * 100);

  const dailyMap = new Map<string, number>();
  for (const u of visibleUsage) {
    if (u.created_at < periodStart) continue;
    const date = u.created_at.slice(0, 10);
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1);
  }
  const dailyGenerations = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const newUsersMap = new Map<string, number>();
  for (const p of visibleProfiles) {
    if (p.created_at < periodStart) continue;
    const date = p.created_at.slice(0, 10);
    newUsersMap.set(date, (newUsersMap.get(date) ?? 0) + 1);
  }
  const dailyNewUsers = Array.from(newUsersMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const subsByMonth = new Map<string, { createur: number; studio: number }>();
  for (const p of visibleProfiles) {
    if (!p.billing_period_start || p.plan === "libre") continue;
    const month = p.billing_period_start.slice(0, 7);
    if (!subsByMonth.has(month)) subsByMonth.set(month, { createur: 0, studio: 0 });
    const entry = subsByMonth.get(month)!;
    if (p.plan === "createur") entry.createur++;
    else if (p.plan === "studio") entry.studio++;
  }
  const subscriptionsByMonth = Array.from(subsByMonth.entries())
    .map(([month, counts]) => ({ month, createur: counts.createur, studio: counts.studio, total: counts.createur + counts.studio }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return json(
    {
      totalUsers,
      active7d,
      active30d,
      newUsers7d,
      dau,
      activationRate,
      conversionRate,
      paidUsers,
      mrrEstimated,
      arpuEstimated,
      dauMauRatio,
      planDistribution,
      dailyGenerations,
      dailyNewUsers,
      subscriptionsByMonth,
      kpiTrends,
      totalGenerations,
      retentionD7,
      quotaSaturation,
      churnEstimated,
    },
    200,
    cors
  );
}

async function handleUsersList(
  supabaseUrl: string,
  serviceKey: string,
  cors: Record<string, string>,
  search: string | undefined,
  plan: string | undefined,
  page: number
) {
  const PAGE_SIZE = 20;
  const isUnactivated = plan === "unactivated";

  let profilesPath = "profiles?select=user_id,email,display_name,plan,created_at,excluded_from_stats";
  if (plan && !isUnactivated) profilesPath += `&plan=eq.${plan}`;

  const profilesRaw = (await restGet(supabaseUrl, serviceKey, profilesPath)) as ProfileRow[];

  let filtered = profilesRaw;
  if (search) {
    const q = search.toLowerCase();
    filtered = profilesRaw.filter(
      (p) =>
        p.display_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const offset = (page - 1) * PAGE_SIZE;
  const pageUsers = filtered.slice(offset, offset + PAGE_SIZE);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const enriched = await Promise.all(
    pageUsers.map(async (p) => {
      const [usageRaw, projectsRaw, lastActiveRaw] = await Promise.all([
        restGet(
          supabaseUrl,
          serviceKey,
          `usage?select=id&user_id=eq.${p.user_id}&created_at=gte.${monthStart}`
        ),
        restGet(supabaseUrl, serviceKey, `projects?select=id&user_id=eq.${p.user_id}`),
        restGet(
          supabaseUrl,
          serviceKey,
          `usage?select=created_at&user_id=eq.${p.user_id}&action=eq.image_generation&order=created_at.desc&limit=1`
        ),
      ]);
      const lastActiveAt = (lastActiveRaw as { created_at: string }[])[0]?.created_at ?? null;
      return {
        user_id: p.user_id,
        email: p.email,
        display_name: p.display_name,
        plan: p.plan,
        created_at: p.created_at,
        excluded_from_stats: p.excluded_from_stats,
        generationsThisMonth: (usageRaw as unknown[]).length,
        projectsCount: (projectsRaw as unknown[]).length,
        lastActiveAt,
      };
    })
  );

  const finalUsers = isUnactivated
    ? enriched.filter((u) => u.generationsThisMonth === 0 && u.lastActiveAt === null)
    : enriched;

  return json({ users: finalUsers, total: isUnactivated ? finalUsers.length : total }, 200, cors);
}

async function handleUser(
  supabaseUrl: string,
  serviceKey: string,
  cors: Record<string, string>,
  userId: string
) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [profileRaw, usageMonthRaw, usageTotalRaw, projectsRaw, assetsRaw, chaptersRaw, recentActivityRaw] =
    await Promise.all([
      restGet(
        supabaseUrl,
        serviceKey,
        `profiles?select=user_id,email,display_name,plan,billing_period_start,created_at,excluded_from_stats&user_id=eq.${userId}`
      ),
      restGet(
        supabaseUrl,
        serviceKey,
        `usage?select=id&user_id=eq.${userId}&created_at=gte.${monthStart}`
      ),
      restGet(supabaseUrl, serviceKey, `usage?select=id,created_at&user_id=eq.${userId}`),
      restGet(
        supabaseUrl,
        serviceKey,
        `projects?select=id,title,style_template,updated_at&user_id=eq.${userId}`
      ),
      restGet(supabaseUrl, serviceKey, `assets?select=id&user_id=eq.${userId}`),
      restGet(supabaseUrl, serviceKey, `chapters?select=id&user_id=eq.${userId}`),
      restGet(
        supabaseUrl,
        serviceKey,
        `usage?select=created_at,action&user_id=eq.${userId}&order=created_at.desc&limit=50`
      ),
    ]);

  const profile = (profileRaw as ProfileRow[])[0];
  if (!profile) return json({ error: "Utilisateur introuvable" }, 404, cors);

  const ago7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const allUsage = recentActivityRaw as Pick<UsageRow, "created_at" | "action">[];
  const sessions7d = new Set(
    (usageTotalRaw as Pick<UsageRow, "user_id" | "created_at">[])
      .filter((u) => u.created_at >= ago7d)
      .map((u) => u.created_at.slice(0, 10))
  ).size;

  const projects = projectsRaw as ProjectRow[];

  const projectsEnriched = await Promise.all(
    projects.map(async (proj) => {
      const [projAssetsRaw, projChaptersRaw] = await Promise.all([
        restGet(supabaseUrl, serviceKey, `assets?select=id&project_id=eq.${proj.id}`),
        restGet(supabaseUrl, serviceKey, `chapters?select=id&project_id=eq.${proj.id}`),
      ]);
      return {
        id: proj.id,
        title: proj.title,
        style_template: proj.style_template,
        assets_count: (projAssetsRaw as unknown[]).length,
        chapters_count: (projChaptersRaw as unknown[]).length,
        updated_at: proj.updated_at,
      };
    })
  );

  return json(
    {
      profile: {
        user_id: profile.user_id,
        email: profile.email,
        display_name: profile.display_name,
        plan: profile.plan,
        billing_period_start: profile.billing_period_start,
        created_at: profile.created_at,
        excluded_from_stats: profile.excluded_from_stats,
      },
      generationsThisMonth: (usageMonthRaw as unknown[]).length,
      generationsTotal: (usageTotalRaw as unknown[]).length,
      projectsCount: projects.length,
      assetsCount: (assetsRaw as unknown[]).length,
      chaptersCount: (chaptersRaw as unknown[]).length,
      sessions7d,
      projects: projectsEnriched,
      recentActivity: allUsage,
    },
    200,
    cors
  );
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = getCorsHeaders(origin);
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
    mode?: string;
    search?: string;
    plan?: string;
    page?: number;
    userId?: string;
    period?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body invalide" }, 400, cors);
  }

  const { mode, search, plan, page = 1, userId, period, testOnly } = body as typeof body & { testOnly?: boolean };

  try {
    if (mode === "global") {
      return await handleGlobal(supabaseUrl, serviceKey, cors, period, testOnly ?? false);
    }
    if (mode === "users_list") {
      return await handleUsersList(supabaseUrl, serviceKey, cors, search, plan, page);
    }
    if (mode === "user") {
      if (!userId) return json({ error: "userId requis" }, 400, cors);
      return await handleUser(supabaseUrl, serviceKey, cors, userId);
    }
    return json({ error: "Mode invalide" }, 400, cors);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    return json({ error: message }, 502, cors);
  }
});
