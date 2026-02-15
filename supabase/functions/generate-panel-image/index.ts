// Edge Function: génération d'image pour un panel (mode Automatique)
// Prompt = style + contexte chapitre + description du panel.
// Secrets: FAL_API_KEY. Même quota usage que generate-asset-image.

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const FAL_SCHNELL = "https://fal.run/fal-ai/flux/schnell";
const FAL_TEXT_TO_IMAGE = "https://fal.run/fal-ai/flux-2-pro";
const FAL_IMAGE_EDIT = "https://fal.run/fal-ai/flux-2-pro/edit";
const BUCKET = "dreamweave";
const FAL_TIMEOUT_MS = 120_000;
const PANEL_IMAGE_WIDTH = 720;
const PANEL_IMAGE_HEIGHT = 1280;

type UserPlan = "free" | "pro";
const TIER_LIMITS: Record<UserPlan, { maxGenerationsPerMonth: number; allowReferenceImages: boolean }> = {
  free: { maxGenerationsPerMonth: 20, allowReferenceImages: false },
  pro: { maxGenerationsPerMonth: 300, allowReferenceImages: true },
};

function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
  });
}

async function verifyUser(
  authHeader: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceKey;
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return typeof user?.id === "string" ? user.id : null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

async function generateSchnell(
  prompt: string,
  falKey: string,
  w: number,
  h: number
): Promise<{ url: string } | { error: string }> {
  const res = await fetchWithTimeout(
    FAL_SCHNELL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
      body: JSON.stringify({
        prompt,
        image_size: { width: w, height: h },
        num_images: 1,
        num_inference_steps: 4,
        output_format: "png",
        enable_safety_checker: true,
      }),
    },
    FAL_TIMEOUT_MS
  );
  const text = await res.text();
  if (!res.ok) return { error: `FAL ${res.status}: ${text.slice(0, 150)}` };
  let json: { images?: Array<{ url: string }> };
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "Réponse FAL invalide" };
  }
  const url = json.images?.[0]?.url;
  return url ? { url } : { error: "FAL n'a pas retourné d'image" };
}

async function generateTextToImage(
  prompt: string,
  falKey: string,
  w: number,
  h: number
): Promise<{ url: string } | { error: string }> {
  const res = await fetchWithTimeout(
    FAL_TEXT_TO_IMAGE,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
      body: JSON.stringify({
        prompt,
        image_size: { width: w, height: h },
        num_images: 1,
        output_format: "png",
        safety_tolerance: "3",
        enable_safety_checker: true,
      }),
    },
    FAL_TIMEOUT_MS
  );
  const text = await res.text();
  if (!res.ok) return { error: `FAL ${res.status}: ${text.slice(0, 150)}` };
  let json: { images?: Array<{ url: string }> };
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "Réponse FAL invalide" };
  }
  const url = json.images?.[0]?.url;
  return url ? { url } : { error: "FAL n'a pas retourné d'image" };
}

async function generateWithRefs(
  prompt: string,
  refUrls: string[],
  falKey: string,
  w: number,
  h: number
): Promise<{ url: string } | { error: string }> {
  const res = await fetchWithTimeout(
    FAL_IMAGE_EDIT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
      body: JSON.stringify({
        prompt,
        image_urls: refUrls,
        image_size: { width: w, height: h },
        num_images: 1,
        output_format: "png",
        safety_tolerance: "3",
        enable_safety_checker: true,
      }),
    },
    FAL_TIMEOUT_MS
  );
  const text = await res.text();
  if (!res.ok) return { error: `FAL ${res.status}: ${text.slice(0, 150)}` };
  let json: { images?: Array<{ url: string }> };
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "Réponse FAL invalide" };
  }
  const url = json.images?.[0]?.url;
  return url ? { url } : { error: "FAL n'a pas retourné d'image" };
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
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "x-upsert": "true" },
      body: form,
    });
    if (!uploadRes.ok) return null;
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}?v=${Date.now()}`;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders() });

  try {
    const falKey = Deno.env.get("FAL_API_KEY");
    if (!falKey) return jsonResponse({ error: "FAL_API_KEY non configurée" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return jsonResponse({ error: "Config Supabase manquante" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authorization manquante" }, 401);

    const userId = await verifyUser(authHeader, supabaseUrl, serviceKey);
    if (!userId) return jsonResponse({ error: "JWT invalide ou expiré" }, 401);

    let userPlan: UserPlan = "free";
    try {
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=plan`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" } }
      );
      if (profileRes.ok) {
        const arr = (await profileRes.json()) as { plan?: string }[];
        if (arr?.[0]?.plan === "pro") userPlan = "pro";
      }
    } catch {
      // ignore
    }

    const limits = TIER_LIMITS[userPlan];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    try {
      const usageRes = await fetch(
        `${supabaseUrl}/rest/v1/usage?user_id=eq.${userId}&action=eq.image_generation&created_at=gte.${startOfMonth}&select=id`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: "count=exact" } }
      );
      if (usageRes.ok) {
        const range = usageRes.headers.get("content-range");
        const m = range?.match(/\/(\d+)$/);
        const count = m ? parseInt(m[1], 10) : 0;
        if (count >= limits.maxGenerationsPerMonth) {
          return jsonResponse(
            {
              error: "Limite de générations atteinte",
              quota_exceeded: true,
              current_usage: count,
              max_usage: limits.maxGenerationsPerMonth,
              plan: userPlan,
            },
            429
          );
        }
      }
    } catch {
      // continue
    }

    let body: {
      panel_id?: string;
      prompt?: string;
      style_template?: string;
      style_image_urls?: string[];
      project_id?: string;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return jsonResponse({ error: "Body JSON invalide" }, 400);
    }

    const { panel_id, prompt, style_template, style_image_urls, project_id } = body;
    if (!panel_id || !prompt?.trim()) {
      return jsonResponse({ error: "panel_id et prompt requis" }, 400);
    }

    const hasStyleText = !!style_template?.trim();
    const hasStyleImages = Array.isArray(style_image_urls) && style_image_urls.length > 0;
    if (!hasStyleText && !hasStyleImages) {
      return jsonResponse(
        { error: "Style requis : définissez un style (texte et/ou images) dans le projet." },
        400
      );
    }

    const styleText = (style_template?.trim() ?? "");
    let fullPrompt = "";
    if (hasStyleText) fullPrompt += `STYLE À APPLIQUER (OBLIGATOIRE) : ${styleText}\n\n`;
    fullPrompt += prompt.trim();
    if (hasStyleImages) {
      fullPrompt += "\n\nIMPORTANT : Reproduis le style graphique des images de référence (traits, couleurs, rendu).";
    }

    const panelRes = await fetch(
      `${supabaseUrl}/rest/v1/panels?id=eq.${panel_id}&select=id,user_id,chapter_id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" } }
    );
    if (!panelRes.ok) return jsonResponse({ error: "Erreur lecture panel" }, 502);
    const panels = (await panelRes.json()) as { id: string; user_id: string; chapter_id: string }[];
    const panel = panels?.[0];
    if (!panel || panel.user_id !== userId) {
      return jsonResponse({ error: "Panel introuvable ou accès refusé" }, 403);
    }

    const w = PANEL_IMAGE_WIDTH;
    const h = PANEL_IMAGE_HEIGHT;

    let result: { url: string } | { error: string };
    if (userPlan === "free") {
      result = await generateSchnell(fullPrompt, falKey, w, h);
    } else if (hasStyleImages && style_image_urls && style_image_urls.length > 0 && limits.allowReferenceImages) {
      const refs = style_image_urls.slice(0, 2);
      result = await generateWithRefs(fullPrompt, refs, falKey, w, h);
    } else {
      result = await generateTextToImage(fullPrompt, falKey, w, h);
    }

    if ("error" in result) {
      return jsonResponse({ error: "Échec génération image", details: result.error }, 502);
    }

    const storagePath = `${userId}/projects/${project_id || "unknown"}/panels/${panel_id}.png`;
    const publicUrl = await downloadAndUpload(result.url, storagePath, supabaseUrl, serviceKey);
    if (!publicUrl) {
      return jsonResponse({ error: "Image générée mais transfert Storage échoué" }, 502);
    }

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/panels?id=eq.${panel_id}`, {
      method: "PATCH",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ image_url: publicUrl }),
    });
    if (!updateRes.ok) {
      return jsonResponse({ error: "Image générée mais mise à jour panel échouée" }, 502);
    }

    try {
      await fetch(`${supabaseUrl}/rest/v1/usage`, {
        method: "POST",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ user_id: userId, action: "image_generation" }),
      });
    } catch {
      // ignore
    }

    return jsonResponse({ image_url: publicUrl, plan: userPlan }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-panel-image] Exception:", msg);
    return jsonResponse({ error: "Erreur serveur", details: msg }, 500);
  }
});
