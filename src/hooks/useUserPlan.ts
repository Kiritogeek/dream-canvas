// Hook — Plan utilisateur et usage mensuel
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UserPlan, UsageInfo, TierLimits } from "@/types";
import { TIER_CONFIG } from "@/types";

/** Récupère le plan de l'utilisateur depuis la table profiles */
async function fetchUserPlan(userId: string): Promise<UserPlan> {
  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Erreur lecture plan:", error.message);
    return "free";
  }

  return (data?.plan === "pro" ? "pro" : "free") as UserPlan;
}

/** Compte les générations du mois en cours */
async function fetchMonthlyUsage(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count, error } = await supabase
    .from("usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "image_generation")
    .gte("created_at", startOfMonth);

  if (error) {
    console.warn("Erreur lecture usage:", error.message);
    return 0;
  }

  return count ?? 0;
}

/** Met à jour le plan dans la table profiles */
async function updateUserPlan(userId: string, newPlan: UserPlan): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ plan: newPlan })
    .eq("user_id", userId);

  if (error) throw error;
}

/** Hook combiné : plan + usage + limites + mutation */
export function useUserPlan() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const planQuery = useQuery({
    queryKey: ["userPlan", user?.id],
    queryFn: () => fetchUserPlan(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });

  const usageQuery = useQuery({
    queryKey: ["monthlyUsage", user?.id],
    queryFn: () => fetchMonthlyUsage(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });

  const changePlanMutation = useMutation({
    mutationFn: (newPlan: UserPlan) => updateUserPlan(user!.id, newPlan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userPlan"] });
      qc.invalidateQueries({ queryKey: ["monthlyUsage"] });
    },
  });

  const plan: UserPlan = planQuery.data ?? "free";
  const limits: TierLimits = TIER_CONFIG[plan];
  const monthlyUsage = usageQuery.data ?? 0;

  const usageInfo: UsageInfo = {
    count: monthlyUsage,
    limit: limits.maxGenerationsPerMonth,
    plan,
  };

  return {
    plan,
    limits,
    usageInfo,
    isLoading: planQuery.isLoading || usageQuery.isLoading,
    changePlan: changePlanMutation,
    /** Invalider le cache pour forcer un rafraîchissement */
    invalidate: () => {
      planQuery.refetch();
      usageQuery.refetch();
    },
  };
}
