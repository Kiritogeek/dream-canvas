import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type ChapterCanvasImageHistoryRow =
  Database["public"]["Tables"]["chapter_canvas_image_history"]["Row"];

export type ChapterCanvasImageHistoryEventKind = ChapterCanvasImageHistoryRow["event_kind"];

export type LayoutRect = { x: number; y: number; width: number; height: number };

/** Clé TanStack Query — invalider après insert. */
export const chapterCanvasImageHistoryQueryKey = (chapterId: string) =>
  ["chapter-canvas-image-history", chapterId] as const;

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export function parseLayoutRect(layoutRect: Json | null): LayoutRect | null {
  if (!layoutRect || typeof layoutRect !== "object" || Array.isArray(layoutRect)) return null;
  const o = layoutRect as Record<string, unknown>;
  const x = o.x,
    y = o.y,
    width = o.width,
    height = o.height;
  if (typeof x !== "number" || typeof y !== "number" || typeof width !== "number" || typeof height !== "number")
    return null;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

export async function fetchChapterCanvasImageHistory(chapterId: string): Promise<ChapterCanvasImageHistoryRow[]> {
  const { data, error } = await supabase
    .from("chapter_canvas_image_history")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ChapterCanvasImageHistoryRow[];
}

export async function insertChapterCanvasImageHistory(params: {
  chapterId: string;
  panelCanvasId: string;
  eventKind: ChapterCanvasImageHistoryEventKind;
  sourceBlockId: string;
  prompt: string | null;
  imageUrl: string;
  blockName?: string | null;
  layoutRect?: LayoutRect | null;
  userId: string;
}): Promise<void> {
  const payload = {
    user_id: params.userId,
    chapter_id: params.chapterId,
    panel_canvas_id: params.panelCanvasId,
    event_kind: params.eventKind,
    source_block_id: params.sourceBlockId,
    prompt: params.prompt?.trim() || null,
    image_url: params.imageUrl,
    block_name: params.blockName ?? null,
    layout_rect: (params.layoutRect == null ? null : params.layoutRect) as Json | null,
  };
  const { error } = await supabase.from("chapter_canvas_image_history").insert(payload);
  if (error) throw error;
}

/** Résout user_id ; throw si non connecté. */
export async function insertChapterCanvasImageHistoryForSession(params: {
  chapterId: string;
  panelCanvasId: string;
  eventKind: ChapterCanvasImageHistoryEventKind;
  sourceBlockId: string;
  prompt: string | null;
  imageUrl: string;
  blockName?: string | null;
  layoutRect?: LayoutRect | null;
}): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Non connecté.");
  await insertChapterCanvasImageHistory({
    ...params,
    userId,
  });
}
