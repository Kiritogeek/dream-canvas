// Types partagés — source unique de vérité pour les modèles de données
// Dérivés du schéma Supabase (src/integrations/supabase/types.ts)

import type { Tables, TablesInsert, TablesUpdate, Enums } from "@/integrations/supabase/types";

// ── Enums ────────────────────────────────────────────────────────
export type AssetType = Enums<"asset_type">; // "character" | "background" | "object"

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
export type Panel = Tables<"chapter_canvases">;
export type Profile = Tables<"profiles">;
export type ScenarioChapter = Tables<"scenario_chapters">;
export type ScenarioVersion = Tables<"scenario_versions">;

// ── Insert types (création) ──────────────────────────────────────
export type ProjectInsert = TablesInsert<"projects">;
export type AssetInsert = TablesInsert<"assets">;
export type ChapterInsert = TablesInsert<"chapters">;
export type PanelInsert = TablesInsert<"chapter_canvases">;
export type ScenarioChapterInsert = TablesInsert<"scenario_chapters">;
export type ScenarioVersionInsert = TablesInsert<"scenario_versions">;

// ── Update types (mise à jour) ───────────────────────────────────
export type ProjectUpdate = TablesUpdate<"projects">;
export type AssetUpdate = TablesUpdate<"assets">;
export type ChapterUpdate = TablesUpdate<"chapters">;
export type PanelUpdate = TablesUpdate<"chapter_canvases">;
export type ScenarioChapterUpdate = TablesUpdate<"scenario_chapters">;
export type ScenarioVersionUpdate = TablesUpdate<"scenario_versions">;

// ── Types métier ─────────────────────────────────────────────────

/** Résultat d'une génération d'image via l'Edge Function. */
export interface GenerationResult {
  image_url: string;
  /** URL de la sheet composite 4 angles (personnages uniquement). */
  image_url_sheet?: string | null;
  update_field: string;
  model: "flux-2-pro-edit" | "flux-2-pro" | "schnell";
  plan: UserPlan;
  request_id?: string;
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
  asset_type?: AssetType;
}

/** Configuration d'onglet asset dans l'UI */
export interface AssetTabConfig {
  type: AssetType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

/** Un item du découpage chapitre → panels (panels_outline sur scenario_chapters) */
export interface PanelOutlineItem {
  description: string;
  context?: { lieu?: string; scene?: string; personnages?: string };
}

/** Un bloc d'image dans le layout d'un panel (800×hauteur). Dimensions en px. */
export interface PanelBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Nom affiché du bloc (ex. "Bloc 1"), défini à la création et éditable. */
  name?: string | null;
  prompt: string | null;
  asset_refs?: string[];
  image_url?: string | null;
}

/** Layout d'un panel : liste de blocs + hauteur du panel. Stocké dans panels.layout (JSONB). */
export interface PanelLayout {
  blocks: PanelBlock[];
  /** Hauteur du canvas en px (défaut 5000, min 1200, max 7000). */
  panelHeight?: number;
}

/** Remplissage d'un bloc de couleur (couleur unie ou dégradé). */
export type ColorBlockFill =
  | { type: "solid"; color: string }
  | { type: "gradient"; from: string; to: string; angle?: number };

/** Bloc de couleur dans un panel (même principe qu'architecture : position, dimensions). Remplit les espaces entre blocs image. */
export interface ColorBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: ColorBlockFill;
}

/** Dimensions par défaut d'une nouvelle bulle de dialogue (panel 800px de large). */
export const DEFAULT_SPEECH_BUBBLE_WIDTH = 300;
export const DEFAULT_SPEECH_BUBBLE_HEIGHT = 160;

/** Types de bulles (format stockage). dialogue = speech, caption = narration en UI. */
export type SpeechBubbleType = "speech" | "thought" | "cloud" | "shout" | "whisper" | "narration" | "radio" | "text" | "electronic" | "explosion" | "wavy" | "anger" | "sadness";

/** Style de texte étendu (éditeur avancé). */
export interface SpeechBubbleTextStyle {
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  textTransform?: "none" | "uppercase" | "lowercase";
  letterSpacing?: number;
  textShadow?: boolean;
  textShadowColor?: string;
  textShadowBlur?: number;
  textColor?: string;
  fontFamily?: string;
}

/** Sous-bulle connectée (format étendu). */
export interface SpeechBubbleConnected {
  id: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  borderRadius?: number;
  text: string;
  textStyle?: SpeechBubbleTextStyle;
  bgFill?: "solid" | "gradient";
  bgColor?: string;
  bgColor2?: string;
  gradientDir?: "to bottom" | "to right" | "to bottom right" | "to bottom left";
  borderColor?: string;
  borderWidth?: number;
  neckWidth?: number;
}

/** Bulle de dialogue / pensée (overlay sur le panel). Stocké dans panels.speech_bubbles. Format minimal + optionnel étendu (éditeur avancé). */
export interface SpeechBubble {
  id: string;
  type: SpeechBubbleType;
  text: string;
  position: { x: number; y: number };
  /** Largeur de la bulle. Défaut: DEFAULT_SPEECH_BUBBLE_WIDTH. */
  width?: number;
  /** Hauteur de la bulle. Défaut: DEFAULT_SPEECH_BUBBLE_HEIGHT. */
  height?: number;
  /** Style minimal (compatible écran chapitre). */
  style?: { font?: string; size?: number; color?: string; stroke?: string; fill?: string; bold?: boolean; italic?: boolean; textAlign?: "left" | "center" | "right"; textTransform?: "none" | "uppercase" };
  character?: string;
  // ── Format étendu (Edition_Panel_Blocs_Bulles.md, 08_Modele_de_Donnees.md)
  /** Retourne la queue de la bulle du côté opposé (droite au lieu de gauche). */
  tailFlip?: boolean;
  borderRadius?: number;
  tailX?: number;
  tailY?: number;
  tailBaseWidth?: number;
  bgFill?: "solid" | "gradient";
  bgColor?: string;
  bgColor2?: string;
  gradientDir?: "to bottom" | "to right" | "to bottom right" | "to bottom left";
  borderColor?: string;
  borderWidth?: number;
  textStyle?: SpeechBubbleTextStyle;
  spikes?: number;
  connected?: SpeechBubbleConnected | null;
}

/** Libellés UI des types de bulles (alignés Edition_Panel_Blocs_Bulles.md § 7.1). */
export const SPEECH_BUBBLE_TYPE_LABELS: Record<SpeechBubbleType, string> = {
  text: "Texte libre",
  speech: "Dialogue",
  thought: "Dramatique",
  cloud: "Pensée",
  shout: "Cri",
  anger: "Colère",
  sadness: "Tristesse",
  whisper: "Chuchotement",
  narration: "Narration",
  radio: "Transmission",
  electronic: "Électronique",
  explosion: "Impact",
  wavy: "Tremblant",
};

/** Couleurs par défaut (fond, contour) par type de bulle. Toutes blanc/noir — l'utilisateur personnalise ensuite. */
export const SPEECH_BUBBLE_DEFAULT_STYLE: Record<SpeechBubbleType, { fill: string; stroke: string }> = {
  text: { fill: "transparent", stroke: "transparent" },
  speech: { fill: "#ffffff", stroke: "#000000" },
  thought: { fill: "#ffffff", stroke: "#000000" },
  cloud: { fill: "#ffffff", stroke: "#000000" },
  shout: { fill: "#ffffff", stroke: "#000000" },
  anger: { fill: "#ffffff", stroke: "#000000" },
  sadness: { fill: "#ffffff", stroke: "#000000" },
  whisper: { fill: "#ffffff", stroke: "#000000" },
  narration: { fill: "#ffffff", stroke: "#000000" },
  radio: { fill: "#ffffff", stroke: "#000000" },
  electronic: { fill: "#ffffff", stroke: "#000000" },
  explosion: { fill: "#ffffff", stroke: "#000000" },
  wavy: { fill: "#ffffff", stroke: "#000000" },
};

/** Types de bulles sans queue ni hauteur de queue (tailH = 0). */
export const SPEECH_BUBBLE_NO_TAIL_TYPES = new Set<SpeechBubbleType>(["narration", "text", "thought"] as const);

/** Retourne fill et stroke pour le rendu d'une bulle (étendu puis style minimal puis défaut par type). */
export function getSpeechBubbleFillStroke(bubble: SpeechBubble): { fill: string; stroke: string } {
  const defaults = SPEECH_BUBBLE_DEFAULT_STYLE[bubble.type];
  const fill = bubble.bgColor ?? bubble.style?.fill ?? defaults.fill;
  const stroke = bubble.borderColor ?? bubble.style?.stroke ?? defaults.stroke;
  return { fill, stroke };
}

// ── Scénario IA ─────────────────────────────────────────────────

/** Un bloc verrouillé dans le scénario (panel suggéré validé par l'auteur). */
export interface LockedBlock {
  id: string;
  panel_number: number;
  block_number: number;
  description: string;
  text_excerpt: string;
}

/** Réponse de l'IA pour detect_blocks. */
export interface DetectedBlock {
  panel_number: number;
  block_number: number;
  description: string;
  text_excerpt: string;
}
