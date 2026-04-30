// Service — Panels (table panels), découpage, génération par bloc
import { supabase } from "@/integrations/supabase/client";
import { logGenerationFailure, logGenerationInfo } from "@/lib/generationLogger";
import type { Panel, PanelInsert, PanelUpdate, PanelLayout, PanelBlock, PanelOutlineItem, ColorBlock, SpeechBubble } from "@/types";
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

/** Référence affichée : nombre de panels par chapitre (indicatif). */
export const PANELS_REFERENCE_PER_CHAPTER = 10;

/** Plage typique de panels par chapitre (indicatif). */
export const PANELS_REFERENCE_MIN = 8;
export const PANELS_REFERENCE_MAX = 14;

/** Dimensions par défaut d'un nouveau bloc (500×500). */
export const DEFAULT_BLOCK_WIDTH = 500;
export const DEFAULT_BLOCK_HEIGHT = 500;

/** Bibliothèque de blocs prédéfinis (image et couleur partagent les mêmes dimensions). */
export const BLOCK_PRESETS = [
  { label: "500×500", width: 500, height: 500 },
  { label: "400×600", width: 400, height: 600 },
  { label: "720×400", width: 720, height: 400 },
  { label: "350×500", width: 350, height: 500 },
  { label: "600×400", width: 600, height: 400 },
] as const;

export const COLOR_BLOCK_PRESETS = BLOCK_PRESETS;

/** Couleur par défaut d'un nouveau bloc de couleur. */
export const DEFAULT_COLOR_BLOCK_FILL = { type: "solid" as const, color: "#1e293b" };

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
 * Indicatif uniquement ; basé sur la longueur du texte (≈ 400–600 caractères par panel).
 */
export function estimatePanelCount(content: string | null | undefined): number {
  if (!content?.trim()) return 0;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  if (words < 100) return PANELS_REFERENCE_MIN;
  // Scale: 100 words → 8 panels, 1000+ words → 14 panels
  const scale = Math.min(1, (words - 100) / 900);
  return Math.round(
    PANELS_REFERENCE_MIN + scale * (PANELS_REFERENCE_MAX - PANELS_REFERENCE_MIN)
  );
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
    throw new Error(
      requestId
        ? `${String(msg || `Erreur ${res.status}`)} (request_id: ${requestId})`
        : String(msg || `Erreur ${res.status}`)
    );
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
