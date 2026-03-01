// Service layer — Assets
import { supabase } from "@/integrations/supabase/client";
import type { Asset, AssetInsert, AssetUpdate, GenerateAssetPayload, GenerationResult } from "@/types";
import { deleteAssetImages } from "./storage";

/** Récupère tous les assets d'un projet */
export async function fetchAssets(projectId: string): Promise<Asset[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Crée un nouvel asset */
export async function createAsset(
  asset: Pick<AssetInsert, "user_id" | "project_id" | "name" | "asset_type" | "prompt">
): Promise<Asset> {
  const { data, error } = await supabase
    .from("assets")
    .insert(asset)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Met à jour un asset */
export async function updateAsset(
  id: string,
  updates: AssetUpdate
): Promise<void> {
  const { error } = await supabase
    .from("assets")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

/** Supprime un asset et ses images Storage associées */
export async function deleteAsset(asset: Asset): Promise<void> {
  // 1. Supprimer les images du Storage
  await deleteAssetImages(asset);

  // 2. Supprimer l'asset en BDD
  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", asset.id);

  if (error) throw error;
}

/** Compte le nombre total d'assets de l'utilisateur */
export async function countAssets(): Promise<number> {
  const { count, error } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

/** Appelle l'Edge Function pour générer une image d'asset */
export async function generateAssetImage(
  payload: GenerateAssetPayload
): Promise<GenerationResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-asset-image`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: session?.access_token
        ? `Bearer ${session.access_token}`
        : "",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    },
    body: JSON.stringify(payload),
  });

  const resBody = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      resBody?.details ?? resBody?.error ?? res.statusText;
    throw new Error(
      typeof msg === "string" ? msg : JSON.stringify(msg)
    );
  }

  return resBody as GenerationResult;
}
