// Types partagés — source unique de vérité pour les modèles de données
// Dérivés du schéma Supabase (src/integrations/supabase/types.ts)

import type { Tables, TablesInsert, TablesUpdate, Enums } from "@/integrations/supabase/types";

// ── Enums ────────────────────────────────────────────────────────
export type AssetType = Enums<"asset_type">; // "character" | "background" | "object"

// ── Tiers / Plans ────────────────────────────────────────────────
export type UserPlan = "libre" | "createur" | "studio";

export interface TierLimits {
  maxGenerationsPerMonth: number;
  maxProjects: number | null;
  allowReferenceImages: boolean;
  allowScenarioAI: boolean;
  allowFullExport: boolean;
  allowLongMemory: boolean;
  filArianeLimit: number | null;
  model: string;
  label: string;
  price: number;
}

export const TIER_CONFIG: Record<UserPlan, TierLimits> = {
  libre: {
    maxGenerationsPerMonth: 20,
    maxProjects: 1,
    allowReferenceImages: true,
    allowScenarioAI: false,
    allowFullExport: false,
    allowLongMemory: false,
    filArianeLimit: 3,
    model: "flux-2-pro",
    label: "Libre",
    price: 0,
  },
  createur: {
    maxGenerationsPerMonth: 100,
    maxProjects: null,
    allowReferenceImages: true,
    allowScenarioAI: true,
    allowFullExport: true,
    allowLongMemory: false,
    filArianeLimit: null,
    model: "flux-2-pro",
    label: "Créateur",
    price: 12.99,
  },
  studio: {
    maxGenerationsPerMonth: 250,
    maxProjects: null,
    allowReferenceImages: true,
    allowScenarioAI: true,
    allowFullExport: true,
    allowLongMemory: true,
    filArianeLimit: null,
    model: "flux-2-pro",
    label: "Studio",
    price: 29.99,
  },
};

export function planDisplayName(plan: UserPlan): string {
  return TIER_CONFIG[plan].label;
}

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

// ── Types métier — cohérence narrative (alertes chapitre) ─────────

export type NarrativeAlertSeverity = "info" | "warning" | "critical";

/** Phase 2 : repère un passage du chapitre pour scroll / surlignage. */
export type NarrativeAlertAnchor = { type: "excerpt"; text: string };

/** Alerte cohérence (NarraMind) — API, colonne JSON `narramind_anomalies` ou table `narramind_alerts`. */
export interface NarrativeCoherenceAlert {
  id: string;
  title: string;
  explanation: string;
  severity?: NarrativeAlertSeverity;
  anchor?: NarrativeAlertAnchor;
}

export type NarraMindAlertStatus = "active" | "dismissed" | "resolved";

export type NarraMindAlertRow = Tables<"narramind_alerts">;

export type NarraMindAlertView = NarrativeCoherenceAlert & {
  dedupeKey: string;
  status: NarraMindAlertStatus;
  projectId: string;
  chapterId: string;
  createdAt: string;
  updatedAt: string;
};

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
  zIndex?: number;
  hidden?: boolean;
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
  zIndex?: number;
  hidden?: boolean;
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
  style?: { font?: string; size?: number; color?: string; stroke?: string; fill?: string; bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; textAlign?: "left" | "center" | "right"; textTransform?: "none" | "uppercase" };
  character?: string;
  // ── Format étendu (Edition-Oeuvre.md Partie III, 08_Modele_de_Donnees.md)
  /** Retourne la queue de la bulle du côté opposé (droite au lieu de gauche). */
  tailFlip?: boolean;
  borderRadius?: number;
  tailX?: number;
  tailY?: number;
  tailBaseWidth?: number;
  tailCurve?: number;
  tailOn?: boolean;
  bgFill?: "solid" | "gradient";
  bgColor?: string;
  bgColor2?: string;
  gradientDir?: "to bottom" | "to right" | "to bottom right" | "to bottom left";
  borderColor?: string;
  borderWidth?: number;
  bgTransparency?: number;
  textStyle?: SpeechBubbleTextStyle;
  spikes?: number;
  connected?: SpeechBubbleConnected | null;
  thoughtBumpR?: number;
  thoughtGap?: number;
  thoughtTailGap?: number;
  thoughtTailOval?: number;
  thoughtTailDotSize?: number;
  zIndex?: number;
  hidden?: boolean;
}

/** Type d'élément dans le panneau Couches. */
export type LayerElementType = "block" | "colorBlock" | "bubble";

/** Représentation d'un élément dans le panneau Couches (blocs image, couleur, bulles). */
export interface LayerItem {
  id: string;
  type: LayerElementType;
  name: string;
  zIndex: number;
  hidden?: boolean;
  preview?: string | null;
}

/** Libellés UI des types de bulles (alignés Edition-Oeuvre.md § 7.1). */
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
export const SPEECH_BUBBLE_NO_TAIL_TYPES = new Set<SpeechBubbleType>(["narration", "text"] as const);

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

// ── Assets manquants détectés par NarraMind ──────────────────────
export type NarramindMissingAssetSuggestedType = "character" | "background" | "object";
export type NarramindMissingAssetStatus = "pending" | "dismissed";

export interface NarramindMissingAsset {
  id: string;
  projectId: string;
  chapterId: string;
  chapterNumber: number;
  name: string;
  suggestedType: NarramindMissingAssetSuggestedType | null;
  mentionCount: number;
  status: NarramindMissingAssetStatus;
  createdAt: string;
  updatedAt: string;
}

// ── NarraMind Compass — vectorisation sémantique ─────────────────

export type CompassSourceType = "chapter" | "lore_world_section" | "asset_lore" | "summary";

export type CompassProposalType = "lore_world" | "lore_asset" | "narrative_direction" | "asset_prefill";

export interface CompassProposal {
  id: string;
  project_id: string;
  user_id: string;
  source_id: string | null;
  proposal_type: CompassProposalType;
  origin: "extracted" | "generated";
  title: string;
  content: string;
  prefill_data: Record<string, unknown> | null;
  status: "active" | "accepted" | "dismissed";
  dedupe_key: string;
  created_at: string;
}

export interface ProjectEmbedding {
  id: string;
  project_id: string;
  source_type: CompassSourceType;
  source_id: string;
  section_key: string | null;
  content: string;
  updated_at: string;
}

// ── Wiki Graphique Univers ────────────────────────────────────────

export type LoreNodeType = 'character' | 'location' | 'object' | 'event';

export const LORE_NODE_TYPE_CONFIG: Record<LoreNodeType, { label: string; emoji: string }> = {
  character: { label: 'Personnage', emoji: '👤' },
  location:  { label: 'Lieu',       emoji: '📍' },
  object:    { label: 'Objet',      emoji: '⚔️' },
  event:     { label: 'Événement',  emoji: '📜' },
};

export interface LoreNode {
  id: string;
  project_id: string;
  user_id: string;
  type: LoreNodeType;
  name: string;
  description: string | null;
  image_url: string | null;
  asset_id: string | null;
  chapter_id: string | null;  // Événements uniquement — chapitre source dans la timeline
  pos_x: number;
  pos_y: number;
  created_at: string;
  updated_at: string;
}

export interface LoreEdge {
  id: string;
  project_id: string;
  user_id: string;
  from_node_id: string;
  to_node_id: string;
  label: string | null;
  created_at: string;
}

export type LoreNodeInsert = Omit<LoreNode, 'id' | 'created_at' | 'updated_at'>;
export type LoreNodeUpdate  = Partial<Omit<LoreNode, 'id' | 'project_id' | 'user_id' | 'created_at'>>;
export type LoreEdgeInsert  = Omit<LoreEdge, 'id' | 'created_at'>;

