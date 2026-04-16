// Edge Function: génération d'image par bloc de panel (Étape 5)
// Body: panel_id, block_id, width, height, prompt, context_chapter?, block_asset_*
// Style : uniquement `projects.style_template` en BDD (pas le corps de requête).
// Stockage: {user_id}/projects/{project_id}/panels/{panel_id}/blocks/{block_id}.png
// Secrets: FAL_API_KEY

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const FAL_TEXT_TO_IMAGE = "https://fal.run/fal-ai/flux-2-pro";
const FAL_IMAGE_EDIT = "https://fal.run/fal-ai/flux-2-pro/edit";
const BUCKET = "dreamweave";
const FAL_TIMEOUT_MS = 120_000;
const MAX_DIMENSION = 1024; // FAL limite souvent à 1024

function getCorsHeaders(): Record<string, string> {
  const origin = Deno.env.get("ALLOWED_ORIGIN")?.trim();
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function verifyUserFromToken(
  authHeader: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = anonKey?.trim() || serviceKey;
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: apiKey },
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

async function generateImageWithReferences(
  prompt: string,
  referenceImageUrls: string[],
  falKey: string,
  width: number,
  height: number
): Promise<{ url: string } | { error: string }> {
  const res = await fetchWithTimeout(
    FAL_IMAGE_EDIT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
      body: JSON.stringify({
        prompt,
        image_urls: referenceImageUrls,
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
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN")?.trim();
  if (!allowedOrigin) {
    return jsonResponse(
      {
        error:
          "ALLOWED_ORIGIN non configurée. Configurez ce secret pour autoriser les requêtes CORS.",
      },
      500
    );
  }

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

    // Plan utilisateur : détermine si on peut utiliser les images de référence (cohérence graphique).
    let userPlan: "free" | "pro" = "free";
    try {
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=plan`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (profileRes.ok) {
        const profiles = (await profileRes.json()) as { plan?: string }[];
        if (profiles?.[0]?.plan === "pro") userPlan = "pro";
      }
    } catch {
      // Dégradé : si on ne peut pas lire le plan, on reste en "free".
      userPlan = "free";
    }

    let body: {
      panel_id?: string;
      block_id?: string;
      width?: number;
      height?: number;
      prompt?: string;
      context_chapter?: string;
      block_asset_image_urls?: string[];
      block_asset_names?: string[];
    };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Body JSON invalide" }, 400);
    }

    const {
      panel_id,
      block_id,
      width: w,
      height: h,
      prompt,
      context_chapter,
      block_asset_names,
      block_asset_image_urls,
    } = body;
    if (!panel_id || !block_id || !prompt?.trim()) {
      return jsonResponse({ error: "panel_id, block_id et prompt requis" }, 400);
    }
    if (!isUuid(panel_id) || !isUuid(block_id)) {
      return jsonResponse(
        { error: "panel_id et block_id invalides (UUID attendus)" },
        400
      );
    }

    const width = typeof w === "number" && w > 0 ? Math.min(w, MAX_DIMENSION) : 500;
    const height = typeof h === "number" && h > 0 ? Math.min(h, MAX_DIMENSION) : 500;

    // Vérifier que le panel appartient à l'utilisateur et récupérer chapter_id
    const panelRes = await fetch(
      `${supabaseUrl}/rest/v1/panels?id=eq.${encodeURIComponent(panel_id)}&select=id,user_id,chapter_id`,
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
      `${supabaseUrl}/rest/v1/chapters?id=eq.${encodeURIComponent(panel.chapter_id)}&select=project_id`,
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

    const projectStyleRes = await fetch(
      `${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=user_id,style_template`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!projectStyleRes.ok) {
      return jsonResponse({ error: "Erreur lecture projet" }, 502);
    }
    const projectRows = (await projectStyleRes.json()) as {
      user_id: string;
      style_template: string | null;
    }[];
    const projRow = projectRows?.[0];
    if (!projRow || projRow.user_id !== userId) {
      return jsonResponse({ error: "Projet introuvable ou accès refusé" }, 403);
    }
    const dbStyleText = (projRow.style_template ?? "").trim();
    if (!dbStyleText) {
      return jsonResponse(
        {
          error: "Style requis",
          details:
            "Enregistrez et sauvegardez un template de style texte sur le projet avant de générer une case (la génération de case s'appuie sur ce texte en base, pas sur le brouillon).",
        },
        400
      );
    }

    const effectiveStyleTemplate = dbStyleText;

    // Construire le prompt : style + contexte chapitre + assets du bloc (noms) + instruction cadre + prompt bloc
    let fullPrompt = prompt.trim();
    if (effectiveStyleTemplate) {
      fullPrompt = `Style à appliquer : ${effectiveStyleTemplate}\n\n${fullPrompt}`;
    }
    if (context_chapter?.trim()) {
      fullPrompt = `Contexte de la scène : ${context_chapter.trim()}\n\n${fullPrompt}`;
    }
    if (Array.isArray(block_asset_names) && block_asset_names.length > 0) {
      fullPrompt = `Éléments à inclure (références) : ${block_asset_names.join(", ")}.\n\n${fullPrompt}`;
    }
    fullPrompt += `\n\nIMPORTANT FORMAT (OBLIGATOIRE) :
- L'image doit être générée EXACTEMENT au format ${width}×${height} pixels.
- L'illustration doit occuper 100% de la surface, bord à bord (full bleed).
- INTERDIT : cadre, bordure, marge blanche, liseré, passe-partout, effet "carte/poster", contour de case BD.
- INTERDIT : image dans une image (pas de rectangle interne contenant la scène).
- Si une composition avec marge apparaît, zoom/cadre la scène pour supprimer toute bordure et remplir tout le cadre final.`;

    const referenceImageUrls = Array.isArray(block_asset_image_urls)
      ? block_asset_image_urls.filter((u) => typeof u === "string" && u.trim().length > 0)
      : [];
    const limitedReferenceImageUrls = referenceImageUrls.slice(0, 5);
    const useReferences =
      userPlan === "pro" && limitedReferenceImageUrls.length > 0;

    if (useReferences) {
      fullPrompt +=
        "\n\nIMPORTANT RÉFÉRENCES : Les images fournies sont des fiches d'assets. Utilise-les UNIQUEMENT pour conserver l'identité visuelle (style, forme, visage/coiffure si applicable, matière). " +
        "Ne montre jamais la fiche, jamais une grille, jamais un cadre de présentation : génère une scène originale plein cadre, sans bordure.";
    }

    const result = useReferences
      ? await generateImageWithReferences(
          fullPrompt,
          limitedReferenceImageUrls,
          falKey,
          width,
          height
        )
      : await generateImage(fullPrompt, falKey, width, height);
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
