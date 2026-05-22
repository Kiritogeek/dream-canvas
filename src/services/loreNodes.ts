import { supabase } from "@/integrations/supabase/client";
import type { LoreNode, LoreEdge, LoreNodeInsert, LoreNodeUpdate, LoreEdgeInsert } from "@/types";

export async function fetchLoreNodes(projectId: string): Promise<LoreNode[]> {
  const { data, error } = await supabase
    .from("lore_nodes")
    .select()
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as LoreNode[];
}

export async function createLoreNode(input: LoreNodeInsert): Promise<LoreNode> {
  const { data, error } = await supabase
    .from("lore_nodes")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as LoreNode;
}

export async function updateLoreNode(id: string, updates: LoreNodeUpdate): Promise<LoreNode> {
  const { data, error } = await supabase
    .from("lore_nodes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as LoreNode;
}

export async function deleteLoreNode(id: string): Promise<void> {
  const { error } = await supabase
    .from("lore_nodes")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function fetchLoreEdges(projectId: string): Promise<LoreEdge[]> {
  const { data, error } = await supabase
    .from("lore_edges")
    .select()
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as LoreEdge[];
}

export async function createLoreEdge(input: LoreEdgeInsert): Promise<LoreEdge> {
  const { data, error } = await supabase
    .from("lore_edges")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as LoreEdge;
}

export async function updateLoreEdge(id: string, updates: { label?: string | null }): Promise<LoreEdge> {
  const { data, error } = await supabase
    .from("lore_edges")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as LoreEdge;
}

export async function deleteLoreEdge(id: string): Promise<void> {
  const { error } = await supabase
    .from("lore_edges")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
