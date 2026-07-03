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
    maxProjects: null,
    allowReferenceImages: true,
    allowScenarioAI: true,
    allowFullExport: true,
    allowLongMemory: false,
    filArianeLimit: null,
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

// ── Insert types (création) ──────────────────────────────────────
export type ProjectInsert = TablesInsert<"projects">;
export type AssetInsert = TablesInsert<"assets">;
export type ChapterInsert = TablesInsert<"chapters">;
export type PanelInsert = TablesInsert<"chapter_canvases">;
export type ScenarioChapterInsert = TablesInsert<"scenario_chapters">;

// ── Update types (mise à jour) ───────────────────────────────────
export type ProjectUpdate = TablesUpdate<"projects">;
export type AssetUpdate = TablesUpdate<"assets">;
export type ChapterUpdate = TablesUpdate<"chapters">;
export type PanelUpdate = TablesUpdate<"chapter_canvases">;
export type ScenarioChapterUpdate = TablesUpdate<"scenario_chapters">;

// ── Curation des assets de chapitre (validation en 3 étapes) ──────

/**
 * Décision utilisateur sur un asset du chapitre.
 * - auto : détecté par matching nom, inclus par défaut
 * - added : ajouté manuellement depuis la bibliothèque (pas détecté dans le texte)
 * - removed : faux positif retiré → exclu de la liste effective
 * - skipped : détecté mais l'utilisateur choisit de ne pas le générer
 */
export type ChapterAssetStatus = "auto" | "added" | "removed" | "skipped";

export interface ChapterAssetItem {
  asset_id: string;
  status: ChapterAssetStatus;
  /** Mention textuelle liée manuellement à cet asset. */
  linked_alias?: string;
}

/** Forme du JSONB `scenario_chapters.chapter_assets`. */
export interface ChapterAssetsState {
  validated: boolean;
  items: ChapterAssetItem[];
}

/** État par défaut quand la colonne est absente/vide. */
export const EMPTY_CHAPTER_ASSETS: ChapterAssetsState = {
  validated: false,
  items: [],
};

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

/**
 * Forme de découpe d'un bloc image (clip-path CSS).
 * "rect" = rectangle standard (défaut, pas de clip-path).
 * Formes diagonales : inspirées des panels d'action Solo Leveling.
 */
export type PanelBlockShape =
  | "rect"        // rectangle plein (défaut)
  | "diagonal-r"  // bord DROIT vertical en biais : action latérale droite (pour panels côte à côte)
  | "diagonal-l"  // bord GAUCHE vertical en biais : action latérale gauche (pour panels côte à côte)
  | "taper-r"     // bord BAS diagonal bas-gauche→haut-droit : panel du HAUT en coupe diagonale verticale
  | "taper-l"     // bord HAUT diagonal haut-gauche→bas-droit : panel du BAS en coupe diagonale verticale
  | "angle-tr"    // coin haut-droit coupé : focus, révélation sur un visage
  | "angle-br"    // coin bas-droit coupé : transition descendante
  | "angle-tl"    // coin haut-gauche coupé
  | "angle-bl";   // coin bas-gauche coupé

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
  /** Texte dialogue/pensée du bloc (stocké par compose, utilisé par la génération post-image des bulles). */
  dialogue_text?: string | null;
  /** Forme de découpe du bloc (clip-path). Défaut : "rect". */
  shape?: PanelBlockShape;
  /**
   * Intensité de la diagonale (0–100, valeur brute en %).
   * taper-r : Y% du coin bas-droit (défaut 65). taper-l : Y% du coin haut-gauche (défaut 35).
   * diagonal-r : X% du coin bas-droit (défaut 87). diagonal-l : X% du coin haut-gauche (défaut 13).
   */
  shapeOffset?: number;
  /** Type de scène issu du découpage IA (ex: action_impact, dialogue, establishing). */
  scene_type?: string | null;
  /** Effets visuels à injecter dans le prompt FLUX (ex: radial_speed_lines, impact_burst). */
  effects?: string[] | null;
  /** Type de cadrage (ex: extreme_close_up, wide_shot, over_the_shoulder). */
  shot_type?: string | null;
  /** Lieu de la scène (découpage v2) — sert la continuité visuelle par lieu plutôt que par matching lexical. */
  location?: string | null;
  /** Personnages présents dans la case (découpage v2) — noms d'assets. */
  characters?: string[];
}

/**
 * Bloc SFX — onomatopée graphique (texte stylisé hors bulle, rotation libre).
 * Référence : Solo Leveling c01 p006 (SFX rouges stylisés), grammaire visuelle webtoon.
 * Le contour est simulé par text-shadows multi-directionnels (compatible html2canvas,
 * contrairement à -webkit-text-stroke qui n'est pas rendu à l'export).
 */
export interface SfxBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  /** Couleur de remplissage du texte. */
  color: string;
  /** Couleur du contour (simulé en text-shadow). */
  strokeColor: string;
  /** Épaisseur du contour en px (0 = aucun). */
  strokeWidth: number;
  /** Rotation en degrés (-180 à 180), appliquée autour du centre du bloc. */
  rotation: number;
  /** Lueur optionnelle (halo) autour du texte — signature manhwa action. */
  glowColor?: string;
  glowBlur?: number;
  letterSpacing?: number;
  /** Opacité 0–1 (échos mentaux : instances multiples à opacités dégressives). */
  opacity?: number;
  /** Origine du bloc : "compose" = posé par la composition Auto. */
  origin?: "compose";
  zIndex?: number;
  hidden?: boolean;
}

/** Variantes de fenêtre système (genre RPG/hunter — Solo Leveling, YTIM). */
export type SystemBlockVariant = "notification" | "quest" | "alert" | "levelup" | "status";

/**
 * Bloc Notification Système — fenêtre UI in-fiction à texte net éditable.
 * Remplace le rendu FLUX de `revelation_system` (texte IA illisible) par un vrai bloc UI :
 * fond near-black, bordure lumineuse, typo monospace.
 */
export interface SystemBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  variant: SystemBlockVariant;
  /** Titre en tête de fenêtre (ex : "NOTIFICATION"). */
  title: string;
  /** Corps multi-lignes (\n = retour ligne). */
  body: string;
  /** Couleur d'accent (bordure, lueur, titre). */
  accentColor: string;
  /** Affiche l'icône [!] dans l'en-tête. */
  showIcon?: boolean;
  /** Affiche le bouton ✕ en haut à droite (signature RPG — Solo Leveling). */
  showClose?: boolean;
  /** Origine du bloc : "compose" = posé par la composition Auto. */
  origin?: "compose";
  zIndex?: number;
  hidden?: boolean;
}

/** Libellés + accents par défaut des variantes système. */
export const SYSTEM_BLOCK_VARIANT_CONFIG: Record<SystemBlockVariant, { label: string; accent: string; defaultTitle: string }> = {
  notification: { label: "Notification", accent: "#22d3ee", defaultTitle: "NOTIFICATION" },
  quest:        { label: "Quête",        accent: "#fbbf24", defaultTitle: "QUÊTE" },
  alert:        { label: "Alerte",       accent: "#f87171", defaultTitle: "ALERTE" },
  levelup:      { label: "Level Up",     accent: "#a78bfa", defaultTitle: "LEVEL UP !" },
  status:       { label: "Statut",       accent: "#60a5fa", defaultTitle: "STATUT" },
};

/**
 * Layout d'un panel : liste de blocs + hauteur du panel. Stocké dans panels.layout (JSONB).
 * sfxBlocks / systemBlocks : clés additives — préservées par tous les writes client
 * (spread {...layout}) ; re-fusionnées côté client après une composition Auto
 * (l'Edge Function compose-chapter-layout réécrit le layout sans ces clés).
 */
export interface PanelLayout {
  blocks: PanelBlock[];
  /** Hauteur du canvas en px (défaut 5000, min 1200, max 7000). */
  panelHeight?: number;
  sfxBlocks?: SfxBlock[];
  systemBlocks?: SystemBlock[];
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
  scene_type?: string;
  shot_type?: string;
  effects?: string[];
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

export type CompassProposalType = "lore_world" | "lore_asset" | "lore_chapter_update" | "lore_connection" | "narrative_direction" | "asset_prefill";

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

