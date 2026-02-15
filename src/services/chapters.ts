// Service — Chapitres webtoon (table chapters)
import { supabase } from "@/integrations/supabase/client";
import type { Chapter, ChapterInsert, ChapterUpdate } from "@/types";

/** Récupère tous les chapitres visuels d'un projet, triés par chapter_number */
export async function fetchChapters(projectId: string): Promise<Chapter[]> {
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("project_id", projectId)
    .order("chapter_number", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Récupère un chapitre par son id */
export async function fetchChapter(id: string): Promise<Chapter | null> {
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Crée un nouveau chapitre visuel */
export async function createChapter(
  chapter: Pick<ChapterInsert, "project_id" | "user_id" | "title" | "chapter_number"> &
    Partial<Pick<ChapterInsert, "synopsis" | "linked_scenario_chapter_id">>
): Promise<Chapter> {
  const { data, error } = await supabase
    .from("chapters")
    .insert(chapter)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Met à jour un chapitre */
export async function updateChapter(
  id: string,
  updates: ChapterUpdate
): Promise<Chapter> {
  const { data, error } = await supabase
    .from("chapters")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Supprime un chapitre (cascade sur les panels) */
export async function deleteChapter(id: string): Promise<void> {
  const { error } = await supabase.from("chapters").delete().eq("id", id);

  if (error) throw error;
}

/** Réordonne les chapitres (met à jour chapter_number pour chaque id) */
export async function reorderChapters(
  chapters: { id: string; chapter_number: number }[]
): Promise<void> {
  for (const ch of chapters) {
    const { error } = await supabase
      .from("chapters")
      .update({ chapter_number: ch.chapter_number })
      .eq("id", ch.id);

    if (error) throw error;
  }
}
