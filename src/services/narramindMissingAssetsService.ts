import { supabase } from "@/integrations/supabase/client";
import type { NarramindMissingAsset, NarramindMissingAssetStatus } from "@/types";

type RawRow = {
  id: string;
  user_id: string;
  project_id: string;
  chapter_id: string;
  chapter_number: number;
  name: string;
  suggested_type: string | null;
  mention_count: number;
  status: string;
  dedupe_key: string;
  created_at: string;
  updated_at: string;
};

function rowToView(row: RawRow): NarramindMissingAsset {
  return {
    id: row.id,
    projectId: row.project_id,
    chapterId: row.chapter_id,
    chapterNumber: row.chapter_number,
    name: row.name,
    suggestedType: (row.suggested_type as NarramindMissingAsset["suggestedType"]) ?? null,
    mentionCount: row.mention_count,
    status: row.status as NarramindMissingAssetStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchNarramindMissingAssets(
  projectId: string
): Promise<NarramindMissingAsset[]> {
  const { data, error } = await supabase
    .from("narramind_missing_assets")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("chapter_number", { ascending: true })
    .order("mention_count", { ascending: false });
  if (error) throw error;
  return (data as RawRow[] ?? []).map(rowToView);
}

export async function setNarramindMissingAssetStatus(
  id: string,
  status: "dismissed"
): Promise<void> {
  const { error } = await supabase
    .from("narramind_missing_assets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
