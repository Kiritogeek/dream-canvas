// Service layer — Scenario chapters & versions
import { supabase } from "@/integrations/supabase/client";
import type {
  ScenarioChapter,
  ScenarioChapterInsert,
  ScenarioChapterUpdate,
  ScenarioVersion,
  ScenarioVersionInsert,
  ScenarioVersionUpdate,
} from "@/types";

// ── Scenario chapters ────────────────────────────────────────

/** Récupère tous les chapitres de scénario d'un projet, triés par numéro */
export async function fetchScenarioChapters(
  projectId: string
): Promise<ScenarioChapter[]> {
  const { data, error } = await supabase
    .from("scenario_chapters")
    .select("*")
    .eq("project_id", projectId)
    .order("chapter_number", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Récupère un chapitre de scénario par son id */
export async function fetchScenarioChapter(
  id: string
): Promise<ScenarioChapter> {
  const { data, error } = await supabase
    .from("scenario_chapters")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/** Crée un nouveau chapitre de scénario */
export async function createScenarioChapter(
  chapter: Pick<
    ScenarioChapterInsert,
    "project_id" | "user_id" | "title" | "chapter_number" | "content"
  >
): Promise<ScenarioChapter> {
  const { data, error } = await supabase
    .from("scenario_chapters")
    .insert(chapter)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Met à jour un chapitre de scénario */
export async function updateScenarioChapter(
  id: string,
  updates: ScenarioChapterUpdate
): Promise<ScenarioChapter> {
  const { data, error } = await supabase
    .from("scenario_chapters")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Supprime un chapitre de scénario */
export async function deleteScenarioChapter(id: string): Promise<void> {
  const { error } = await supabase
    .from("scenario_chapters")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** Réordonne les chapitres (met à jour chapter_number pour chaque id) */
export async function reorderScenarioChapters(
  chapters: { id: string; chapter_number: number }[]
): Promise<void> {
  // Exécution séquentielle pour garantir l'ordre
  for (const ch of chapters) {
    const { error } = await supabase
      .from("scenario_chapters")
      .update({ chapter_number: ch.chapter_number })
      .eq("id", ch.id);

    if (error) throw error;
  }
}

// ── Scenario versions ────────────────────────────────────────

/** Récupère les versions d'un projet (les plus récentes en premier) */
export async function fetchScenarioVersions(
  projectId: string
): Promise<ScenarioVersion[]> {
  const { data, error } = await supabase
    .from("scenario_versions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Récupère les versions d'un chapitre de scénario spécifique */
export async function fetchChapterVersions(
  chapterId: string
): Promise<ScenarioVersion[]> {
  const { data, error } = await supabase
    .from("scenario_versions")
    .select("*")
    .eq("scenario_chapter_id", chapterId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Récupère la version en attente (pending) pour un chapitre ou le scénario complet */
export async function fetchPendingVersion(
  projectId: string,
  chapterId?: string
): Promise<ScenarioVersion | null> {
  let query = supabase
    .from("scenario_versions")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  if (chapterId) {
    query = query.eq("scenario_chapter_id", chapterId);
  } else {
    query = query.is("scenario_chapter_id", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

/** Crée une nouvelle version (générée par l'IA ou sauvegarde manuelle) */
export async function createScenarioVersion(
  version: Pick<
    ScenarioVersionInsert,
    "project_id" | "scenario_chapter_id" | "user_id" | "content" | "version_type"
  >
): Promise<ScenarioVersion> {
  const { data, error } = await supabase
    .from("scenario_versions")
    .insert({ ...version, status: "pending" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Accepte une version (status → 'accepted') */
export async function acceptScenarioVersion(
  versionId: string
): Promise<ScenarioVersion> {
  const { data, error } = await supabase
    .from("scenario_versions")
    .update({ status: "accepted" } as ScenarioVersionUpdate)
    .eq("id", versionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Rejette une version (status → 'rejected') */
export async function rejectScenarioVersion(
  versionId: string
): Promise<ScenarioVersion> {
  const { data, error } = await supabase
    .from("scenario_versions")
    .update({ status: "rejected" } as ScenarioVersionUpdate)
    .eq("id", versionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
