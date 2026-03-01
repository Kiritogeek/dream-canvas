// Service layer — Projets
import { supabase } from "@/integrations/supabase/client";
import type { Project, ProjectInsert, ProjectUpdate } from "@/types";

/** Récupère tous les projets de l'utilisateur courant */
export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Récupère les N projets les plus récents */
export async function fetchRecentProjects(limit = 6): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/** Récupère un projet par son ID */
export async function fetchProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Crée un nouveau projet */
export async function createProject(
  project: Pick<ProjectInsert, "title" | "description" | "user_id">
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert(project)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Met à jour un projet */
export async function updateProject(
  id: string,
  updates: ProjectUpdate
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

/** Supprime un projet */
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** Compte le nombre total de projets de l'utilisateur */
export async function countProjects(): Promise<number> {
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}
