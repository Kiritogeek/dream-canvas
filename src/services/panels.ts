// Service — Panels (table panels) + estimation découpage + génération image
import { supabase } from "@/integrations/supabase/client";
import type { Panel, PanelInsert, PanelLayout, PanelBlock } from "@/types";
import type { PanelOutlineItem } from "@/types";

/** Retourne la liste des blocs du panel (layout.blocks). */
export function getPanelBlocks(panel: Panel): PanelBlock[] {
  const layout = panel.layout as PanelLayout | null | undefined;
  if (!layout?.blocks || !Array.isArray(layout.blocks)) return [];
  return layout.blocks.filter(
    (b): b is PanelBlock =>
      b != null && typeof b === "object" && typeof b.id === "string" && typeof b.x === "number" && typeof b.y === "number"
  );
}

/** Payload pour l'Edge Function generate-panel-image */
export interface GeneratePanelImagePayload {
  panel_id: string;
  prompt: string;
  style_template?: string;
  style_image_urls?: string[];
  project_id?: string;
}

/** Résultat de la génération d'image panel */
export interface GeneratePanelImageResult {
  image_url: string;
  plan?: string;
}

/** Référence indicative : ~6–10 panels par chapitre (bande verticale riche par panel) */
export const PANELS_REFERENCE_PER_CHAPTER = 8;

/** Dimensions par défaut d'un nouveau bloc (glisser-déposer ou ajout). */
export const DEFAULT_BLOCK_WIDTH = 500;
export const DEFAULT_BLOCK_HEIGHT = 500;

/** Caractères par panel pour estimation : un panel = bande verticale pouvant contenir textes + scène + dialogues + actions */
const CHARS_PER_PANEL_ESTIMATE = 900;

/** Estime le nombre de panels à partir du contenu textuel du chapitre. Indicatif uniquement. */
export function estimatePanelCount(content: string | null | undefined): number {
  if (!content?.trim()) return 0;
  const len = content.trim().length;
  const count = Math.max(1, Math.round(len / CHARS_PER_PANEL_ESTIMATE));
  return Math.min(count, 50);
}

/** Récupère tous les panels d'un chapitre, triés par panel_number */
export async function fetchPanelsByChapter(chapterId: string): Promise<Panel[]> {
  const { data, error } = await supabase
    .from("panels")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("panel_number", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Panel[];
}

/** Crée un panel */
export async function createPanel(
  panel: Pick<PanelInsert, "chapter_id" | "user_id" | "panel_number"> &
    Partial<Pick<PanelInsert, "prompt" | "layout">>
): Promise<Panel> {
  const { data, error } = await supabase
    .from("panels")
    .insert(panel)
    .select()
    .single();

  if (error) throw error;
  return data as Panel;
}

/** Crée la succession de panels à partir du découpage (outline). Par défaut aucun bloc ; l'utilisateur ajoute des blocs par glisser-déposer. */
export async function createPanelsFromOutline(
  chapterId: string,
  userId: string,
  outline: PanelOutlineItem[]
): Promise<Panel[]> {
  if (outline.length === 0) return [];

  const created: Panel[] = [];
  for (let i = 0; i < outline.length; i++) {
    const item = outline[i];
    const prompt =
      item.description +
      (item.context?.lieu ? ` [Lieu: ${item.context.lieu}]` : "") +
      (item.context?.personnages ? ` [Personnages: ${item.context.personnages}]` : "");
    const panel = await createPanel({
      chapter_id: chapterId,
      user_id: userId,
      panel_number: i + 1,
      prompt: prompt.trim(),
      layout: { blocks: [] },
    });
    created.push(panel);
  }
  return created;
}

/** Supprime un panel */
export async function deletePanel(id: string): Promise<void> {
  const { error } = await supabase.from("panels").delete().eq("id", id);
  if (error) throw error;
}

/** Met à jour un panel */
export async function updatePanel(
  id: string,
  updates: Partial<Pick<Panel, "prompt" | "layout" | "panel_number">>
): Promise<Panel> {
  const { data, error } = await supabase
    .from("panels")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Panel;
}

/** Supprime tous les panels d'un chapitre */
export async function deletePanelsByChapter(chapterId: string): Promise<void> {
  const { error } = await supabase.from("panels").delete().eq("chapter_id", chapterId);
  if (error) throw error;
}

/** Remplace tous les panels du chapitre par le découpage (supprime puis crée). */
export async function replacePanelsFromOutline(
  chapterId: string,
  userId: string,
  outline: PanelOutlineItem[]
): Promise<Panel[]> {
  await deletePanelsByChapter(chapterId);
  return createPanelsFromOutline(chapterId, userId, outline);
}

/** Appelle l'Edge Function pour générer une image pour un panel (style + prompt). */
export async function generatePanelImage(
  payload: GeneratePanelImagePayload
): Promise<GeneratePanelImageResult> {
  const { data: { session } } = await supabase.auth.getSession();
  await supabase.auth.refreshSession();
  const { data: { session: sessionAfter } } = await supabase.auth.getSession();
  const token = sessionAfter?.access_token ?? session?.access_token;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-panel-image`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    },
    body: JSON.stringify(payload),
  });

  const resBody = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = resBody?.details ?? resBody?.error ?? res.statusText;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  return resBody as GeneratePanelImageResult;
}
