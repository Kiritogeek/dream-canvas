import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface AdminGlobalKPIs {
  totalUsers: number;
  active7d: number;
  active30d: number;
  newUsers7d: number;
  dau: number;
  activationRate: number;
  conversionRate: number;
  paidUsers: number;
  arpuEstimated: number;
  dauMauRatio: number;
  planDistribution: { libre: number; createur: number; studio: number };
  dailyGenerations: { date: string; count: number }[];
  subscriptionsByMonth: { month: string; createur: number; studio: number; total: number }[];
}

export interface AdminUserRow {
  user_id: string;
  email: string;
  display_name: string;
  plan: string;
  created_at: string;
  generationsThisMonth: number;
  projectsCount: number;
}

export interface AdminUsersListResult {
  users: AdminUserRow[];
  total: number;
}

export interface AdminProjectSummary {
  id: string;
  title: string;
  style_template: string | null;
  assets_count: number;
  chapters_count: number;
  updated_at: string;
}

export interface AdminUserDetail {
  profile: {
    user_id: string;
    email: string;
    display_name: string;
    plan: string;
    billing_period_start: string | null;
    created_at: string;
  };
  generationsThisMonth: number;
  generationsTotal: number;
  projectsCount: number;
  assetsCount: number;
  chaptersCount: number;
  sessions7d: number;
  projects: AdminProjectSummary[];
  recentActivity: { created_at: string; action: string }[];
}

async function getAdminToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Non connecté");
  return session.access_token;
}

async function callAdminKpis<T>(body: object): Promise<T> {
  const token = await getAdminToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-get-kpis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Erreur admin-get-kpis");
  }
  return res.json() as Promise<T>;
}

async function callAdminAction<T>(body: object): Promise<T> {
  const token = await getAdminToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-user-action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Erreur admin-user-action");
  }
  return res.json() as Promise<T>;
}

export async function fetchGlobalKPIs(period: "30d" | "90d" | "1y" = "30d"): Promise<AdminGlobalKPIs> {
  return callAdminKpis<AdminGlobalKPIs>({ mode: "global", period });
}

export async function fetchUsersList(params: {
  search?: string;
  plan?: string;
  page?: number;
}): Promise<AdminUsersListResult> {
  return callAdminKpis<AdminUsersListResult>({ mode: "users_list", ...params });
}

export async function fetchUserDetail(userId: string): Promise<AdminUserDetail> {
  return callAdminKpis<AdminUserDetail>({ mode: "user", userId });
}

export async function resetUserQuota(userId: string): Promise<void> {
  await callAdminAction<{ success: boolean; deletedCount: number }>({
    action: "reset_quota",
    userId,
  });
}

export async function deleteUser(userId: string): Promise<void> {
  await callAdminAction<{ success: boolean }>({
    action: "delete_user",
    userId,
  });
}

export async function setUserPlan(
  userId: string,
  plan: "libre" | "createur" | "studio"
): Promise<void> {
  // admin-set-plan existant applique le plan au caller uniquement — pas de targetUserId.
  // On passe par admin-user-action action='set_plan' pour modifier un autre utilisateur.
  await callAdminAction<{ success: boolean; plan: string }>({
    action: "set_plan",
    userId,
    plan,
  });
}
