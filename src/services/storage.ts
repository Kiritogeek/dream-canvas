// Service layer — Supabase Storage
import { supabase } from "@/integrations/supabase/client";
import type { Asset } from "@/types";

const BUCKET = "dreamweave";

/** Extrait le path Storage depuis une URL publique Supabase */
function extractStoragePath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

/** Upload une image dans le Storage et retourne l'URL publique */
export async function uploadStyleImage(
  userId: string,
  projectId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/projects/${projectId}/style/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/** Supprime toutes les images Storage d'un asset */
export async function deleteAssetImages(asset: Asset): Promise<void> {
  const urls = [
    asset.image_url,
    asset.image_url_profile_left,
    asset.image_url_profile_right,
    asset.image_url_back,
  ].filter(Boolean) as string[];

  const paths = urls
    .map(extractStoragePath)
    .filter(Boolean) as string[];

  if (paths.length === 0) return;

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove(paths);

  if (error) {
    // Ne pas bloquer la suppression de l'asset si le nettoyage Storage échoue
    console.warn("[Storage] Échec nettoyage images:", error.message);
  }
}

/** Supprime une image de référence de style du Storage */
export async function deleteStyleImage(url: string): Promise<void> {
  const path = extractStoragePath(url);
  if (!path) return;

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (error) {
    console.warn("[Storage] Échec suppression image style:", error.message);
  }
}
