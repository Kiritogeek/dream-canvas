// Hook — Plan utilisateur et usage mensuel
// Le changement de plan passe OBLIGATOIREMENT par Stripe :
//   goToCheckout() → Stripe Checkout (Libre → Créateur ou Studio)
//   goToPortal()   → Stripe Customer Portal (annulation, moyen de paiement, etc.)
// La colonne profiles.plan n'est jamais modifiée côté client (cf. migration 20260418120000).

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UserPlan, UsageInfo, TierLimits } from "@/types";
import { TIER_CONFIG } from "@/types";

interface ProfileData {
  plan: UserPlan;
  billingPeriodStart: string | null;
}

/** Récupère le plan et la date d'abonnement depuis profiles */
async function fetchUserPlan(userId: string): Promise<ProfileData> {
  const { data, error } = await supabase
    .from("profiles")
    .select("plan, billing_period_start")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Erreur lecture plan:", error.message);
    return { plan: "libre", billingPeriodStart: null };
  }

  const p = data?.plan;
  const plan: UserPlan = p === "createur" ? "createur" : p === "studio" ? "studio" : "libre";
  return { plan, billingPeriodStart: data?.billing_period_start ?? null };
}

/**
 * Calcule le début de la période d'usage courante.
 * Plans payants : jour d'abonnement du mois courant (ou précédent si pas encore passé).
 * Libre : 1er du mois calendaire.
 */
function computeUsagePeriodStart(billingPeriodStart: string | null): Date {
  const now = new Date();
  if (!billingPeriodStart) {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const billingDay = new Date(billingPeriodStart).getDate();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), billingDay);
  if (thisMonthStart <= now) return thisMonthStart;
  return new Date(now.getFullYear(), now.getMonth() - 1, billingDay);
}

/**
 * Calcule la prochaine date de renouvellement / reset de quota.
 */
function computeNextResetDate(billingPeriodStart: string | null): Date {
  const now = new Date();
  if (!billingPeriodStart) {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  const billingDay = new Date(billingPeriodStart).getDate();
  const thisMonthReset = new Date(now.getFullYear(), now.getMonth(), billingDay);
  if (thisMonthReset > now) return thisMonthReset;
  return new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
}

/** Compte les générations depuis le début de la période d'usage */
async function fetchMonthlyUsage(userId: string, periodStart: Date): Promise<number> {
  const { count, error } = await supabase
    .from("usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "image_generation")
    .gte("created_at", periodStart.toISOString());

  if (error) {
    console.warn("Erreur lecture usage:", error.message);
    return 0;
  }

  return count ?? 0;
}

/** Crée une session Stripe Checkout → retourne l'URL de paiement */
async function createCheckoutSession(accessToken: string): Promise<string> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Erreur création session Stripe");
  const { url } = (await res.json()) as { url: string };
  return url;
}

/** Crée une session Stripe Customer Portal → retourne l'URL de gestion */
async function createPortalSession(accessToken: string): Promise<string> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Erreur création session Portal");
  const { url } = (await res.json()) as { url: string };
  return url;
}

/** Hook combiné : plan + usage + limites + actions Stripe */
export function useUserPlan() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const planQuery = useQuery({
    queryKey: ["userPlan", user?.id],
    queryFn: () => fetchUserPlan(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });

  const plan: UserPlan = planQuery.data?.plan ?? "libre";
  const billingPeriodStart = planQuery.data?.billingPeriodStart ?? null;
  const usagePeriodStart = computeUsagePeriodStart(billingPeriodStart);
  const nextResetDate = computeNextResetDate(billingPeriodStart);

  const usageQuery = useQuery({
    queryKey: ["monthlyUsage", user?.id, usagePeriodStart.toISOString()],
    queryFn: () => fetchMonthlyUsage(user!.id, usagePeriodStart),
    enabled: !!user,
    staleTime: 30_000,
  });

  const limits: TierLimits = TIER_CONFIG[plan];
  const monthlyUsage = usageQuery.data ?? 0;

  const usageInfo: UsageInfo = {
    count: monthlyUsage,
    limit: limits.maxGenerationsPerMonth,
    plan,
  };

  /** Redirige vers Stripe Checkout pour passer au plan Artiste */
  const goToCheckout = async () => {
    await supabase.auth.refreshSession();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Session Supabase introuvable");
    const url = await createCheckoutSession(session.access_token);
    window.location.href = url;
  };

  /** Redirige vers Stripe Customer Portal pour gérer son abonnement */
  const goToPortal = async () => {
    await supabase.auth.refreshSession();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Session Supabase introuvable");
    const url = await createPortalSession(session.access_token);
    window.location.href = url;
  };

  return {
    plan,
    limits,
    usageInfo,
    nextResetDate,
    isLoading: planQuery.isLoading || usageQuery.isLoading,
    goToCheckout,
    goToPortal,
    /** Invalider le cache pour forcer un rafraîchissement */
    invalidate: () => {
      qc.invalidateQueries({ queryKey: ["userPlan"] });
      qc.invalidateQueries({ queryKey: ["monthlyUsage"] });
    },
  };
}
