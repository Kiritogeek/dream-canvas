// Types partagés — source unique de vérité pour les modèles de données
// Dérivés du schéma Supabase (src/integrations/supabase/types.ts)

import type { Tables, TablesInsert, TablesUpdate, Enums } from "@/integrations/supabase/types";

// ── Enums ────────────────────────────────────────────────────────
export type AssetType = Enums<"asset_type">; // "character" | "background" | "object"

export type CharacterView = "profile_left" | "profile_right" | "back";
export type ImageView = "front" | CharacterView;

// ── Tiers / Plans ────────────────────────────────────────────────
export type UserPlan = "free" | "pro";

export interface TierLimits {
  maxGenerationsPerMonth: number;
  allowReferenceImages: boolean;
  allowMultipleViews: boolean;
  model: string;
  label: string;
}

export const TIER_CONFIG: Record<UserPlan, TierLimits> = {
  free: {
    maxGenerationsPerMonth: 20,
    allowReferenceImages: false,
    allowMultipleViews: false,
    model: "schnell",
    label: "Free",
  },
  pro: {
    maxGenerationsPerMonth: 300,
    allowReferenceImages: true,
    allowMultipleViews: true,
    model: "flux-2-pro",
    label: "Pro",
  },
};

// ── Row types (lecture BDD) ──────────────────────────────────────
export type Project = Tables<"projects">;
export type Asset = Tables<"assets">;
export type Chapter = Tables<"chapters">;
export type Panel = Tables<"panels">;
export type Profile = Tables<"profiles">;

// ── Insert types (création) ──────────────────────────────────────
export type ProjectInsert = TablesInsert<"projects">;
export type AssetInsert = TablesInsert<"assets">;
export type ChapterInsert = TablesInsert<"chapters">;

// ── Update types (mise à jour) ───────────────────────────────────
export type ProjectUpdate = TablesUpdate<"projects">;
export type AssetUpdate = TablesUpdate<"assets">;

// ── Types métier ─────────────────────────────────────────────────

/** Résultat d'une génération d'image via l'Edge Function */
export interface GenerationResult {
  image_url: string;
  image_view: string;
  update_field: string;
  model: "flux-2-pro-edit" | "flux-2-pro" | "schnell";
  plan: UserPlan;
}

/** Résultat d'un comptage d'usage mensuel */
export interface UsageInfo {
  count: number;
  limit: number;
  plan: UserPlan;
}

/** Payload envoyé à l'Edge Function generate-asset-image */
export interface GenerateAssetPayload {
  asset_id: string;
  prompt: string;
  style_template?: string;
  style_image_urls?: string[];
  asset_type?: AssetType;
  image_view?: ImageView;
}

/** Configuration d'onglet asset dans l'UI */
export interface AssetTabConfig {
  type: AssetType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}
