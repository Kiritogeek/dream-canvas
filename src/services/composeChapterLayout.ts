import { supabase } from "@/integrations/supabase/client";

export interface ComposeChapterLayoutParams {
  chapterId: string;
  panelsOutline: Array<{
    panel_number: number;
    block_number?: number;
    description: string;
    text_excerpt?: string;
    locked?: boolean;
    scene_type?: string;
    shot_type?: string;
    effects?: string[];
  }>;
  projectStyle?: string | null;
  characters?: string[];
  /** Assets du projet (id + nom) — le serveur pré-lie les blocs composés à leurs personnages (asset_refs). */
  assets?: Array<{ id: string; name: string }>;
  chapterTitle?: string;
  chapterSynopsis?: string;
  chapterScenarioContent?: string;
  /** Blocs existants avec images (recomposition) — le serveur les restaure sur les blocs au même prompt */
  existingBlocks?: Array<{ prompt?: string | null; image_url?: string | null; name?: string | null }>;
}

export interface ComposeChapterLayoutResult {
  canvasId: string;
  blocksCount: number;
  bubblesCount: number;
  panelHeight: number;
  modelUsed: string;
}

export async function composeChapterLayout(
  params: ComposeChapterLayoutParams
): Promise<ComposeChapterLayoutResult> {
  await supabase.auth.refreshSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Session expirée — reconnectez-vous.");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compose-chapter-layout`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    },
    body: JSON.stringify({
      chapter_id: params.chapterId,
      panels_outline: params.panelsOutline,
      project_style: params.projectStyle ?? undefined,
      characters: params.characters?.length ? params.characters : undefined,
      assets: params.assets?.length ? params.assets : undefined,
      chapter_title: params.chapterTitle,
      chapter_synopsis: params.chapterSynopsis ?? undefined,
      chapter_scenario_content: params.chapterScenarioContent ?? undefined,
      existing_blocks: params.existingBlocks?.length ? params.existingBlocks : undefined,
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof body?.error === "string"
        ? body.error
        : body?.message ?? `Erreur ${res.status}`;
    throw new Error(msg);
  }

  return {
    canvasId: body.canvas_id,
    blocksCount: body.blocks_count,
    bubblesCount: body.bubbles_count,
    panelHeight: body.panel_height,
    modelUsed: body.model_used,
  };
}
