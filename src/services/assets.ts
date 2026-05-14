// Service layer — Assets
import { supabase } from "@/integrations/supabase/client";
import { messageFromFunctionsInvokeError } from "@/lib/edgeFunctionInvokeError";
import { logGenerationFailure, logGenerationInfo } from "@/lib/generationLogger";
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

/** Upload une image de référence réelle dans Storage et retourne son URL publique */
export async function uploadReferenceImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${userId}/references/${Date.now()}_ref.${ext}`;
  const { error } = await supabase.storage.from("dreamweave").upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from("dreamweave").getPublicUrl(path);
  return publicUrl;
}

/** Appelle l'Edge Function pour générer une image d'asset */
export async function generateAssetImage(
  payload: GenerateAssetPayload
): Promise<GenerationResult> {
  logGenerationInfo("asset-image:start", {
    asset_id: payload.asset_id,
    asset_type: payload.asset_type,
    prompt_chars: payload.prompt?.length ?? 0,
  });

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    console.warn("[assets] refreshSession:", refreshError.message);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.access_token) {
    throw new Error(
      "Session expirée ou invalide. Reconnectez-vous pour générer une image."
    );
  }

  // invoke utilise fetchWithAuth : apikey + JWT alignés sur le client Supabase (évite les 401 passerelle)
  const { data, error } = await supabase.functions.invoke<GenerationResult>(
    "generate-asset-image",
    { body: payload }
  );

  if (error) {
    const msg = await messageFromFunctionsInvokeError(error);
    console.error(`[DreamWeave][asset-image:invoke][reason] ${msg}`);
    logGenerationFailure(
      "asset-image:invoke",
      {
        asset_id: payload.asset_id,
        asset_type: payload.asset_type,
        parsed_reason: msg,
      },
      error
    );
    throw new Error(msg);
  }

  if (!data?.image_url) {
    logGenerationFailure(
      "asset-image:invalid-response",
      { asset_id: payload.asset_id, has_data: Boolean(data) },
      data
    );
    throw new Error("Réponse invalide : image_url manquant");
  }

  return data;
}
