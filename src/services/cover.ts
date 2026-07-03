// Service — Couverture de projet.
// generateCoverIllustration : appelle l'Edge Function (illustration key art).
// saveCover : upload la couverture finale composée (illustration + titre) → projects.cover_url.
import { supabase } from "@/integrations/supabase/client";
import { uploadCoverImage } from "@/services/storage";

/** Génère l'illustration de couverture (key art) à partir de tout le projet. Renvoie son URL. */
export async function generateCoverIllustration(projectId: string): Promise<{ image_url: string }> {
  await supabase.auth.refreshSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Session expirée — reconnectez-vous.");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover-image`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    },
    body: JSON.stringify({ project_id: projectId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof body?.error === "string" ? body.error : body?.details ?? `Erreur ${res.status}`;
    throw new Error(String(msg));
  }
  if (!body?.image_url) throw new Error("Réponse invalide : image_url manquant");
  return { image_url: body.image_url };
}

/** Upload la couverture finale composée et l'enregistre sur le projet. Renvoie l'URL publique. */
export async function saveCover(userId: string, projectId: string, blob: Blob): Promise<string> {
  const coverUrl = await uploadCoverImage(userId, projectId, blob);
  const { error } = await supabase.from("projects").update({ cover_url: coverUrl }).eq("id", projectId);
  if (error) throw error;
  return coverUrl;
}
