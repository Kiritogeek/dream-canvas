// Source de vérité unique pour les quotas par plan — Edge Functions
// DOIT rester synchronisée avec src/types/index.ts (TIER_CONFIG côté frontend)
//
// Libre    : 20 crédits / mois
// Créateur : 100 crédits / mois
// Studio   : 250 crédits / mois  + mémoire narrative longue

export type UserPlan = "libre" | "createur" | "studio";

export interface TierLimits {
  maxGenerationsPerMonth: number;
  allowReferenceImages: boolean;
  allowLongMemory: boolean;
  model: string;
}

export const TIER_LIMITS: Record<UserPlan, TierLimits> = {
  libre: {
    maxGenerationsPerMonth: 20,
    allowReferenceImages: true,
    allowLongMemory: false,
    model: "flux-2-pro",
  },
  createur: {
    maxGenerationsPerMonth: 100,
    allowReferenceImages: true,
    allowLongMemory: false,
    model: "flux-2-pro",
  },
  studio: {
    maxGenerationsPerMonth: 250,
    allowReferenceImages: true,
    allowLongMemory: true,
    model: "flux-2-pro",
  },
};

/** Retourne les limites du plan donné (fallback sur "libre" si inconnu). */
export function getTierLimits(plan: string): TierLimits {
  if (plan === "createur" || plan === "studio") return TIER_LIMITS[plan];
  return TIER_LIMITS.libre;
}
