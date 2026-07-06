// Service — Panels (table panels), découpage, génération par bloc
import { supabase } from "@/integrations/supabase/client";
import { logGenerationFailure, logGenerationInfo } from "@/lib/generationLogger";
import type { Panel, PanelInsert, PanelUpdate, PanelLayout, PanelBlock, PanelOutlineItem, ColorBlock, SpeechBubble, SfxBlock, SystemBlock, SystemBlockVariant } from "@/types";
import { SYSTEM_BLOCK_VARIANT_CONFIG } from "@/types";
import type { Project } from "@/types";

// ── Constantes ───────────────────────────────────────────────────

export const PANEL_WIDTH = 800;
export const PANEL_HEIGHT_DEFAULT = 5000;
export const PANEL_HEIGHT_MIN = 1200;
export const PANEL_HEIGHT_MAX = 100_000;

/** Hauteur du panel (layout.panelHeight clampé ou défaut). */
export function getPanelHeight(panel: Panel | null | undefined): number {
  if (!panel?.layout || typeof panel.layout !== "object") return PANEL_HEIGHT_DEFAULT;
  const layout = panel.layout as PanelLayout;
  const h = layout.panelHeight ?? PANEL_HEIGHT_DEFAULT;
  return Math.max(PANEL_HEIGHT_MIN, Math.min(PANEL_HEIGHT_MAX, h));
}

/** Dimensions par défaut d'un nouveau bloc (500×500). */
export const DEFAULT_BLOCK_WIDTH = 500;
export const DEFAULT_BLOCK_HEIGHT = 500;

/** Zones de clic des poignées de redimensionnement (éditeur canvas), ×1.5 pour faciliter la prise en main. */
export const RESIZE_HANDLE_EDGE_PX = 14;
export const RESIZE_HANDLE_CORNER_PX = 23;
/** Bulles (valeurs historiques 8 / 12, ×1.5 arrondies). */
export const RESIZE_BUBBLE_EDGE_PX = 12;
export const RESIZE_BUBBLE_CORNER_PX = 18;

/** Bibliothèque de blocs prédéfinis (image et couleur partagent les mêmes dimensions). */
export const BLOCK_PRESETS = [
  { label: "500×500", width: 500, height: 500 },
  { label: "400×600", width: 400, height: 600 },
  { label: "720×400", width: 720, height: 400 },
  { label: "350×500", width: 350, height: 500 },
  { label: "600×400", width: 600, height: 400 },
] as const;

/** Couleur par défaut d'un nouveau bloc de couleur. */
export const DEFAULT_COLOR_BLOCK_FILL = { type: "solid" as const, color: "#1e293b" };

/**
 * Hauteurs de case standard webtoon (grille 400px, canvas 800 de large).
 * petite = beat rapide, moyenne = standard, grande = temps fort, impact = splash/thumb-stop.
 */
export const WEBTOON_CASE_PRESETS = [
  { label: "Petite — 800×400",   description: "Beat rapide, enchaînement",   width: 800, height: 400 },
  { label: "Moyenne — 800×800",  description: "Case standard",               width: 800, height: 800 },
  { label: "Grande — 800×1200",  description: "Temps fort, émotion",         width: 800, height: 1200 },
  { label: "Impact — 800×1600",  description: "Splash, révélation",          width: 800, height: 1600 },
  { label: "Letterbox — 800×200", description: "Bande ciné (yeux, horizon)", width: 800, height: 200 },
] as const;

/**
 * Fonds narratifs webtoon — la couleur de fond encode la scène
 * (grammaire observée : Solo Leveling, Your Talent is Mine).
 */
export const NARRATIVE_COLOR_PRESETS = [
  { label: "Quotidien",  description: "Dialogue neutre, calme", color: "#ffffff" },
  { label: "Mystère",    description: "Danger, révélation",     color: "#0a0a12" },
  { label: "Action",     description: "Combat, transformation", color: "#b45309" },
  { label: "Pouvoir",    description: "Magie, intériorité",     color: "#1e1b4b" },
  { label: "Tension",    description: "Boss fight, extrême",    color: "#7f1d1d" },
  { label: "Flashback",  description: "Souvenir, sépia",        color: "#e8d9c0" },
] as const;

// ── Respirations verticales (le vide = le temps) ─────────────────

/**
 * Presets d'espacement sémantique — en scroll vertical, la gouttière encode le temps
 * narratif (mesures croisées : Comistitch, McCloud, références SL/YTIM).
 */
export const BREATHING_PRESETS = [
  { label: "Enchaînement",        description: "Action continue",        gap: 120 },
  { label: "Battement",           description: "Pause émotionnelle",     gap: 250 },
  { label: "Changement de scène", description: "Transition lieu/temps",  gap: 500 },
  { label: "Cliffhanger",         description: "Révélation, choc",       gap: 700 },
] as const;

export interface PanelContentSnapshot {
  layout: PanelLayout;
  colorBlocks: ColorBlock[];
  speechBubbles: SpeechBubble[];
}

/**
 * Insère une respiration verticale : décale de `gap` px tout élément dont le bord haut
 * est ≥ y (les éléments à cheval sur la ligne restent en place) et agrandit le canvas.
 */
export function insertVerticalBreathing(snapshot: PanelContentSnapshot, y: number, gap: number): PanelContentSnapshot {
  const shiftRect = <T extends { y: number }>(el: T): T => (el.y >= y ? { ...el, y: el.y + gap } : el);
  const layout = snapshot.layout;
  const panelHeight = Math.min(PANEL_HEIGHT_MAX, (layout.panelHeight ?? PANEL_HEIGHT_DEFAULT) + gap);
  return {
    layout: {
      ...layout,
      panelHeight,
      blocks: layout.blocks.map(shiftRect),
      ...(Array.isArray(layout.sfxBlocks) ? { sfxBlocks: layout.sfxBlocks.map(shiftRect) } : {}),
      ...(Array.isArray(layout.systemBlocks) ? { systemBlocks: layout.systemBlocks.map(shiftRect) } : {}),
    },
    colorBlocks: snapshot.colorBlocks.map(shiftRect),
    speechBubbles: snapshot.speechBubbles.map((b) =>
      (b.position?.y ?? 0) >= y ? { ...b, position: { ...b.position, y: b.position.y + gap } } : b
    ),
  };
}

// ── Blocs SFX (onomatopées) ──────────────────────────────────────

export const DEFAULT_SFX_WIDTH = 320;
export const DEFAULT_SFX_HEIGHT = 140;

/** Presets SFX de la bibliothèque (fonts chargées dans index.html). */
export const SFX_PRESETS: Array<{
  id: string;
  label: string;
  text: string;
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  rotation: number;
  glowColor?: string;
  glowBlur?: number;
  fontSize: number;
}> = [
  { id: "boom",    label: "Impact",      text: "BOOM !",  fontFamily: "'Bangers', cursive",       color: "#ef4444", strokeColor: "#1a0a0a", strokeWidth: 6, rotation: -6,  glowColor: "#f97316", glowBlur: 18, fontSize: 72 },
  { id: "slash",   label: "Coup",        text: "SLASH",   fontFamily: "'Bangers', cursive",       color: "#fbbf24", strokeColor: "#111111", strokeWidth: 6, rotation: 8,   fontSize: 64 },
  { id: "crack",   label: "Fracas",      text: "KRAK",    fontFamily: "'Black Ops One', cursive", color: "#ffffff", strokeColor: "#111111", strokeWidth: 5, rotation: -3,  fontSize: 60 },
  { id: "whoosh",  label: "Vitesse",     text: "FWOOSH",  fontFamily: "'Luckiest Guy', cursive",  color: "#7dd3fc", strokeColor: "#0c1c3d", strokeWidth: 5, rotation: -14, fontSize: 54 },
  { id: "rumble",  label: "Grondement",  text: "GRRRR…",  fontFamily: "'Rock Salt', cursive",     color: "#c4b5fd", strokeColor: "#17102e", strokeWidth: 4, rotation: 0,   glowColor: "#7c3aed", glowBlur: 14, fontSize: 42 },
  { id: "tap",     label: "Pas",         text: "TAP TAP", fontFamily: "'Permanent Marker', cursive", color: "#e2e8f0", strokeColor: "#1e293b", strokeWidth: 3, rotation: 4, fontSize: 36 },
];

/** Extrait les blocs SFX du layout (layout.sfxBlocks ou []). */
export function getPanelSfxBlocks(panel: Panel | null | undefined): SfxBlock[] {
  if (!panel?.layout || typeof panel.layout !== "object") return [];
  const layout = panel.layout as PanelLayout;
  return Array.isArray(layout.sfxBlocks) ? layout.sfxBlocks : [];
}

/** Fabrique un bloc SFX depuis un preset (ou le preset par défaut). */
export function makeSfxBlockFromPreset(presetId: string | undefined, x: number, y: number, zIndex: number): SfxBlock {
  const preset = SFX_PRESETS.find((p) => p.id === presetId) ?? SFX_PRESETS[0];
  return {
    id: crypto.randomUUID(),
    x, y,
    width: DEFAULT_SFX_WIDTH,
    height: DEFAULT_SFX_HEIGHT,
    text: preset.text,
    fontFamily: preset.fontFamily,
    fontSize: preset.fontSize,
    color: preset.color,
    strokeColor: preset.strokeColor,
    strokeWidth: preset.strokeWidth,
    rotation: preset.rotation,
    ...(preset.glowColor ? { glowColor: preset.glowColor, glowBlur: preset.glowBlur ?? 12 } : {}),
    zIndex,
  };
}

// ── Blocs Notification Système ───────────────────────────────────

export const DEFAULT_SYSTEM_BLOCK_WIDTH = 460;
export const DEFAULT_SYSTEM_BLOCK_HEIGHT = 240;

/** Corps d'exemple par variante (aide à la prise en main). */
export const SYSTEM_BLOCK_SAMPLE_BODY: Record<SystemBlockVariant, string> = {
  notification: "Vous avez accompli les conditions\nde la quête secrète « Courage ».",
  quest: "Objectif : vaincre 10 gobelins\nRécompense : 500 XP",
  alert: "Zone de danger détectée.\nÉvacuez immédiatement.",
  levelup: "Niveau 12 → 13\nPoints de capacité +3",
  status: "Nom : ???\nClasse : Chasseur — Rang E",
};

/** Extrait les blocs système du layout (layout.systemBlocks ou []). */
export function getPanelSystemBlocks(panel: Panel | null | undefined): SystemBlock[] {
  if (!panel?.layout || typeof panel.layout !== "object") return [];
  const layout = panel.layout as PanelLayout;
  return Array.isArray(layout.systemBlocks) ? layout.systemBlocks : [];
}

/** Fabrique un bloc système d'une variante donnée. */
export function makeSystemBlock(variant: SystemBlockVariant, x: number, y: number, zIndex: number): SystemBlock {
  const cfg = SYSTEM_BLOCK_VARIANT_CONFIG[variant];
  return {
    id: crypto.randomUUID(),
    x, y,
    width: DEFAULT_SYSTEM_BLOCK_WIDTH,
    height: DEFAULT_SYSTEM_BLOCK_HEIGHT,
    variant,
    title: cfg.defaultTitle,
    body: SYSTEM_BLOCK_SAMPLE_BODY[variant],
    accentColor: cfg.accent,
    showIcon: true,
    zIndex,
  };
}

// ── Helpers ──────────────────────────────────────────────────────

/** Extrait les blocs du layout d'un panel (layout.blocks ou []). */
export function getPanelBlocks(panel: Panel | null | undefined): PanelBlock[] {
  if (!panel?.layout || typeof panel.layout !== "object") return [];
  const layout = panel.layout as PanelLayout;
  return Array.isArray(layout.blocks) ? layout.blocks : [];
}

/** Récupère le layout typé (blocks + panelHeight). */
export function getPanelLayout(panel: Panel | null | undefined): PanelLayout {
  if (!panel?.layout || typeof panel.layout !== "object") return { blocks: [] };
  return panel.layout as PanelLayout;
}

/** Extrait les blocs de couleur d'un panel (panels.color_blocks ou []). */
export function getPanelColorBlocks(panel: Panel | null | undefined): ColorBlock[] {
  const raw = panel?.color_blocks;
  if (!Array.isArray(raw)) return [];
  return raw as ColorBlock[];
}

/** Extrait les bulles de dialogue d'un panel (panels.speech_bubbles ou []). */
export function getPanelSpeechBubbles(panel: Panel | null | undefined): SpeechBubble[] {
  const raw = panel?.speech_bubbles;
  if (!Array.isArray(raw)) return [];
  return raw as SpeechBubble[];
}

/**
 * Estime le nombre de panels à partir du contenu textuel du chapitre.
 * ≈ 45 mots par panel (densité typique webtoon). Si le projet a une cible définie,
 * elle est utilisée directement car c'est ce que l'auteur vise pour ce chapitre.
 */
export function estimatePanelCount(
  content: string | null | undefined,
  targetPerChapter?: number | null
): number {
  if (!content?.trim()) return 0;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  if (words < 30) return 0;
  if (targetPerChapter && targetPerChapter > 0) return targetPerChapter;
  return Math.max(1, Math.round(words / 45));
}

// ── API Panels ────────────────────────────────────────────────────

/** Récupère tous les panels d'un chapitre, triés par panel_number. */
export async function fetchPanels(chapterId: string): Promise<Panel[]> {
  const { data, error } = await supabase
    .from("chapter_canvases")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("panel_number", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Met à jour un panel (layout, prompt, etc.). */
export async function updatePanel(id: string, updates: PanelUpdate): Promise<Panel> {
  const { data, error } = await supabase
    .from("chapter_canvases")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Crée un panel vide (sans blocs). panel_number = suivant disponible si non fourni. */
export async function createPanel(
  chapterId: string,
  userId: string,
  panelNumber?: number
): Promise<Panel> {
  let number = panelNumber;
  if (number == null || number < 1) {
    const existing = await fetchPanels(chapterId);
    const maxNum = existing.length > 0 ? Math.max(...existing.map((p) => p.panel_number)) : 0;
    number = maxNum + 1;
  }
  const insert: PanelInsert = {
    chapter_id: chapterId,
    user_id: userId,
    panel_number: number,
    layout: { blocks: [] },
  };
  const { data, error } = await supabase.from("chapter_canvases").insert(insert).select().single();
  if (error) throw error;
  return data;
}

/** Crée les panels à partir d'un outline (suggestion IA ou liste prédéfinie). layout.blocks = [] par défaut. */
export async function createPanelsFromOutline(
  chapterId: string,
  outline: PanelOutlineItem[],
  userId: string
): Promise<Panel[]> {
  if (!outline.length) return [];

  const inserts: PanelInsert[] = outline.map((_item, i) => ({
    chapter_id: chapterId,
    user_id: userId,
    panel_number: i + 1,
    layout: { blocks: [] },
  }));

  const { data, error } = await supabase
    .from("chapter_canvases")
    .insert(inserts)
    .select()
    .order("panel_number", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Supprime un panel par id. */
export async function deletePanel(id: string): Promise<void> {
  const { error } = await supabase.from("chapter_canvases").delete().eq("id", id);
  if (error) throw error;
}

/** Supprime tous les panels du chapitre puis crée les nouveaux à partir de l'outline. */
export async function replacePanelsFromOutline(
  chapterId: string,
  outline: PanelOutlineItem[],
  userId: string
): Promise<Panel[]> {
  const { error: deleteError } = await supabase.from("chapter_canvases").delete().eq("chapter_id", chapterId);
  if (deleteError) throw deleteError;

  return createPanelsFromOutline(chapterId, outline, userId);
}

// ── Génération d'image par bloc ───────────────────────────────────

export interface GenerateBlockImageParams {
  panelId: string;
  blockId: string;
  width: number;
  height: number;
  prompt: string;
  project: Project;
  contextChapter?: string | null;
  /** IDs des assets sélectionnés pour ce bloc (optionnel). */
  blockAssetRefs?: string[];
  /** URLs des images des assets du bloc (résolues côté client, envoyées à l'API). */
  blockAssetImageUrls?: string[];
  /** Noms des assets du bloc pour enrichir le prompt. */
  blockAssetNames?: string[];
  /** Paires nom↔image alignées (prioritaire serveur) — évite le désalignement C6. */
  blockAssets?: Array<{ name: string; url: string | null }>;
  /** URL de l'image du bloc précédent dans la séquence (contexte visuel pour la continuité). */
  previousImageUrl?: string;
  /** Type de scène issu du découpage IA (ex: action_impact, dialogue, establishing). */
  sceneType?: string;
  /** Effets visuels à injecter dans le prompt FLUX (ex: radial_speed_lines, impact_burst). */
  effects?: string[];
  /** Cadrage (ex: extreme_close_up, wide_shot) — pilote les hints anatomie. */
  shotType?: string;
}

/**
 * Génère une image pour un bloc du panel (dimensions = bloc).
 * Appelle l'Edge Function generate-panel-image.
 * Stockage attendu : panels/{panel_id}/blocks/{block_id}.png
 */
export async function generatePanelBlockImage(
  params: GenerateBlockImageParams
): Promise<{ image_url: string }> {
  logGenerationInfo("panel-image:start", {
    panel_id: params.panelId,
    block_id: params.blockId,
    width: params.width,
    height: params.height,
    prompt_chars: params.prompt?.length ?? 0,
    block_assets_count: params.blockAssetRefs?.length ?? 0,
    block_asset_images_count: params.blockAssetImageUrls?.length ?? 0,
  });

  await supabase.auth.refreshSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session?.access_token) {
    throw new Error("Session expirée ou invalide. Reconnectez-vous pour générer.");
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-panel-image`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    },
    body: JSON.stringify({
      panel_id: params.panelId,
      block_id: params.blockId,
      width: params.width,
      height: params.height,
      prompt: params.prompt,
      context_chapter: params.contextChapter ?? undefined,
      block_asset_image_urls: params.blockAssetImageUrls?.length ? params.blockAssetImageUrls : undefined,
      block_asset_names: params.blockAssetNames?.length ? params.blockAssetNames : undefined,
      block_assets: params.blockAssets?.length ? params.blockAssets : undefined,
      previous_image_url: params.previousImageUrl ?? undefined,
      scene_type: params.sceneType ?? undefined,
      effects: params.effects?.length ? params.effects : undefined,
      shot_type: params.shotType ?? undefined,
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof body?.error === "string"
        ? body.error
        : body?.details ?? body?.message ?? res.statusText;
    const requestId =
      typeof body?.request_id === "string" && body.request_id.trim()
        ? body.request_id.trim()
        : null;
    logGenerationFailure(
      "panel-image:http-error",
      {
        panel_id: params.panelId,
        block_id: params.blockId,
        status: res.status,
      },
      body
    );
    const err = new Error(
      requestId
        ? `${String(msg || `Erreur ${res.status}`)} (request_id: ${requestId})`
        : String(msg || `Erreur ${res.status}`)
    );
    // 429 quota : marqué pour que l'appelant (batch « Tout générer ») affiche la
    // modale quota au lieu d'avaler l'échec en silence.
    if (res.status === 429 || body?.quota_exceeded) {
      (err as Error & { quotaExceeded?: boolean }).quotaExceeded = true;
    }
    throw err;
  }

  if (!body?.image_url) {
    logGenerationFailure(
      "panel-image:invalid-response",
      {
        panel_id: params.panelId,
        block_id: params.blockId,
      },
      body
    );
    throw new Error("Réponse invalide : image_url manquant");
  }

  return { image_url: body.image_url };
}
