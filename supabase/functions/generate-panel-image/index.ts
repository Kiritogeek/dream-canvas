// Edge Function: génération d'image par bloc de panel (Étape 5)
// Body: panel_id, block_id, width, height, prompt, style_template?, style_image_urls?, context_chapter?
// Stockage: {user_id}/projects/{project_id}/panels/{panel_id}/blocks/{block_id}.png
// Secrets: FAL_API_KEY

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const FAL_SCHNELL = "https://fal.run/fal-ai/flux/schnell";
const FAL_TEXT_TO_IMAGE = "https://fal.run/fal-ai/flux-2-pro";
const BUCKET = "dreamweave";
const FAL_TIMEOUT_MS = 120_000;
const MAX_DIMENSION = 1024; // FAL limite souvent à 1024

function getCorsHeaders(): Record<string, string> {
  const origin = Deno.env.get("ALLOWED_ORIGIN") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
  });
}

async function verifyUserFromToken(
  authHeader: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return typeof user?.id === "string" ? user.id : null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function generateImage(
  prompt: string,
  falKey: string,
  width: number,
  height: number
): Promise<{ url: string } | { error: string }> {
  const res = await fetchWithTimeout(
    FAL_TEXT_TO_IMAGE,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
      body: JSON.stringify({
        prompt,
        image_size: { width, height },
        num_images: 1,
        output_format: "png",
        safety_tolerance: "3",
        enable_safety_checker: true,
      }),
    },
    FAL_TIMEOUT_MS
  );

  const text = await res.text();
  if (!res.ok) {
    return { error: `FAL.ai ${res.status}: ${text.slice(0, 200)}` };
  }
  let json: { images?: Array<{ url: string }> };
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "Réponse FAL invalide" };
  }
  const url = json.images?.[0]?.url;
  if (!url) return { error: "FAL n'a pas retourné d'image" };
  return { url };
}

async function downloadAndUpload(
  imageUrl: string,
  storagePath: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
  try {
    const downloadRes = await fetchWithTimeout(imageUrl, {}, 30_000);
    if (!downloadRes.ok) return null;
    const blob = await downloadRes.blob();
    const form = new FormData();
    form.append("file", blob, "image.png");
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "x-upsert": "true",
        },
        body: form,
      }
    );
    if (!uploadRes.ok) return null;
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}?v=${Date.now()}`;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders() });
  }

  try {
    const falKey = Deno.env.get("FAL_API_KEY");
    if (!falKey) {
      return jsonResponse({ error: "FAL_API_KEY non configurée" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "Config Supabase manquante" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization manquante" }, 401);
    }

    const userId = await verifyUserFromToken(authHeader, supabaseUrl, serviceKey);
    if (!userId) {
      return jsonResponse({ error: "JWT invalide ou expiré" }, 401);
    }

    let body: {
      panel_id?: string;
      block_id?: string;
      width?: number;
      height?: number;
      prompt?: string;
      style_template?: string;
      style_image_urls?: string[];
      context_chapter?: string;
    };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Body JSON invalide" }, 400);
    }

    const { panel_id, block_id, width: w, height: h, prompt, style_template, context_chapter } = body;
    if (!panel_id || !block_id || !prompt?.trim()) {
      return jsonResponse({ error: "panel_id, block_id et prompt requis" }, 400);
    }

    let width = typeof w === "number" && w > 0 ? Math.min(w, MAX_DIMENSION) : 500;
    let height = typeof h === "number" && h > 0 ? Math.min(h, MAX_DIMENSION) : 500;

    // Vérifier que le panel appartient à l'utilisateur et récupérer chapter_id
    const panelRes = await fetch(
      `${supabaseUrl}/rest/v1/panels?id=eq.${panel_id}&select=id,user_id,chapter_id`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!panelRes.ok) {
      return jsonResponse({ error: "Erreur lecture panel" }, 502);
    }
    const panels = (await panelRes.json()) as { id: string; user_id: string; chapter_id: string }[];
    const panel = panels?.[0];
    if (!panel || panel.user_id !== userId) {
      return jsonResponse({ error: "Panel introuvable ou accès refusé" }, 403);
    }

    // Récupérer project_id pour le chemin de stockage
    const chapterRes = await fetch(
      `${supabaseUrl}/rest/v1/chapters?id=eq.${panel.chapter_id}&select=project_id`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!chapterRes.ok) {
      return jsonResponse({ error: "Erreur lecture chapitre" }, 502);
    }
    const chapters = (await chapterRes.json()) as { project_id: string }[];
    const projectId = chapters?.[0]?.project_id;
    if (!projectId) {
      return jsonResponse({ error: "Projet introuvable" }, 404);
    }

    // Construire le prompt : style + contexte chapitre + instruction cadre + prompt bloc
    let fullPrompt = prompt.trim();
    if (style_template?.trim()) {
      fullPrompt = `Style à appliquer : ${style_template.trim()}\n\n${fullPrompt}`;
    }
    if (context_chapter?.trim()) {
      fullPrompt = `Contexte de la scène : ${context_chapter.trim()}\n\n${fullPrompt}`;
    }
    fullPrompt += "\n\nIMPORTANT : Remplis tout le cadre, sans bandeaux ni bandes vides. L'illustration doit occuper toute la surface.";

    const result = await generateImage(fullPrompt, falKey, width, height);
    if ("error" in result) {
      return jsonResponse({ error: result.error }, 502);
    }

    const storagePath = `${userId}/projects/${projectId}/panels/${panel_id}/blocks/${block_id}.png`;
    const publicUrl = await downloadAndUpload(result.url, storagePath, supabaseUrl, serviceKey);
    if (!publicUrl) {
      return jsonResponse({ error: "Échec transfert vers Storage" }, 502);
    }

    return jsonResponse({ image_url: publicUrl }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-panel-image]", msg);
    return jsonResponse({ error: "Erreur serveur", details: msg }, 500);
  }
});
