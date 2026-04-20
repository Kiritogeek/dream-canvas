// Edge Function: génération d'image via FAL.ai
// Secrets requis :
//   - FAL_API_KEY (Supabase → Edge Functions → Secrets)
//
// Style : uniquement `projects.style_template` et `projects.style_image_urls` (lues en service role).
// Le corps de requête ne doit pas servir de source de vérité pour le style (évite brouillon UI / cache).
//
// Trois modes selon le tier utilisateur :
//   Free → FLUX.1 Schnell (text-to-image uniquement, pas d'images de référence)
//   Pro  → FLUX.2 Pro (text-to-image) ou FLUX.2 Pro Edit (multi-référence)

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const FAL_SCHNELL = "https://fal.run/fal-ai/flux/schnell";     // Free tier
const FAL_TEXT_TO_IMAGE = "https://fal.run/fal-ai/flux-2-pro"; // Pro tier
const FAL_IMAGE_EDIT = "https://fal.run/fal-ai/flux-2-pro/edit"; // Pro + refs
const BUCKET = "dreamweave";
const FAL_TIMEOUT_MS = 100_000; // 100 secondes max par appel FAL

// ── Limites par tier ──────────────────────────────────────────
type UserPlan = "free" | "pro";

interface TierLimits {
  maxGenerationsPerMonth: number;
  allowReferenceImages: boolean;
  allowMultipleViews: boolean;
  model: string;
}

const TIER_LIMITS: Record<UserPlan, TierLimits> = {
  free: {
    maxGenerationsPerMonth: 20,
    allowReferenceImages: false,
    allowMultipleViews: false,
    model: "schnell",
  },
  pro: {
    maxGenerationsPerMonth: 300,
    allowReferenceImages: true,
    allowMultipleViews: true,
    model: "flux-2-pro",
  },
};

import {
  buildCharacterPrompt,
  buildCharacterSheetPrompt,
} from "./system-prompts/characters.ts";
import {
  buildBackgroundPrompt,
} from "./system-prompts/backgrounds.ts";
import {
  buildObjectPrompt,
} from "./system-prompts/objects.ts";

// CORS — Restreindre en production via ALLOWED_ORIGIN
function getCorsHeaders(): Record<string, string> {
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN")?.trim();
  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
  });
}

function clip(value: string, max = 1200): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function extractFalErrorDetails(rawText: string): string {
  const text = rawText.trim();
  if (!text) return "Réponse vide";
  try {
    const json = JSON.parse(text) as {
      detail?: unknown;
      details?: unknown;
      error?: unknown;
      message?: unknown;
    };
    const main = json.detail ?? json.details ?? json.error ?? json.message;
    if (typeof main === "string") return clip(main);
    if (main != null) return clip(JSON.stringify(main));
  } catch {
    // no-op: fallback texte brut
  }
  return clip(text);
}

function isFalPolicyViolation(details: string): boolean {
  const lower = details.toLowerCase();
  return (
    lower.includes("content_policy_violation") ||
    lower.includes("content policy") ||
    lower.includes("safety checker")
  );
}

function buildSafeFallbackPrompt(prompt: string): string {
  const softened = prompt
    .replace(/\b(nude|naked|nsfw|gore|blood|violent|violence|sexy|erotic)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return `${softened}\n\nSafety constraints: fully clothed, non-sexual, non-violent, family-friendly, no gore, no explicit content.`;
}

function buildUltraSafePrompt(kind: "character" | "background" | "object"): string {
  if (kind === "character") {
    return "Adult character design sheet, fully clothed, neutral pose, clean studio lighting, non-sexual, non-violent, family-friendly comic style, original content.";
  }
  if (kind === "background") {
    return "Safe environment concept art, no people, no violence, no explicit content, family-friendly, original comic style background.";
  }
  return "Safe object concept art, clean product-like composition, no violence, no explicit content, family-friendly, original comic style.";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function extractStyleKeyFromTemplate(text: string): string | null {
  const m = text.match(/style_key:\s*(\S+)/);
  return m?.[1]?.trim() ?? null;
}

// ═══════════════════════════════════════════════════════════════
// VÉRIFICATION JWT SÉCURISÉE (via Supabase Auth)
// ═══════════════════════════════════════════════════════════════

async function verifyUserFromToken(
  authHeader: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;

    // /auth/v1/user attend en général la clé anon en apikey (comme le client JS)
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = anonKey?.trim() || serviceKey;

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: apiKey,
      },
    });

    if (!res.ok) return null;

    const user = await res.json();
    return typeof user?.id === "string" ? user.id : null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// FETCH AVEC TIMEOUT
// ═══════════════════════════════════════════════════════════════

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// ═══════════════════════════════════════════════════════════════
// RETRY AVEC BACKOFF
// ═══════════════════════════════════════════════════════════════

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 1
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options, FAL_TIMEOUT_MS);
      // Ne retrier que sur erreur serveur (5xx)
      if (res.ok || res.status < 500) return res;
      if (attempt < maxRetries) {
        console.warn(
          `[generate-asset-image] Retry ${attempt + 1}/${maxRetries} après erreur ${res.status}`
        );
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.name === "AbortError") {
        throw new Error(
          "La génération a pris trop de temps (timeout). Réessayez."
        );
      }
      if (attempt < maxRetries) {
        console.warn(
          `[generate-asset-image] Retry ${attempt + 1}/${maxRetries} après erreur réseau`
        );
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error("Échec après retries");
}

// ═══════════════════════════════════════════════════════════════
// GÉNÉRATION VIA FAL.ai
// ═══════════════════════════════════════════════════════════════

async function generateTextToImage(
  prompt: string,
  falKey: string,
  width: number,
  height: number,
  kind: "character" | "background" | "object" = "character"
): Promise<{ url: string } | { error: string }> {
  const payload = {
    prompt,
    image_size: { width, height },
    num_images: 1,
    output_format: "png",
    safety_tolerance: "3",
    enable_safety_checker: true,
  };

  let res = await fetchWithRetry(FAL_TEXT_TO_IMAGE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${falKey}`,
    },
    body: JSON.stringify(payload),
  });

  let text = await res.text();
  if (!res.ok) {
    const details = extractFalErrorDetails(text);
    if (res.status === 422 && isFalPolicyViolation(details)) {
      const safePrompt = buildSafeFallbackPrompt(prompt);
      console.warn("[generate-asset-image] Policy violation, retry with safe prompt", {
        status: res.status,
      });
      res = await fetchWithRetry(FAL_TEXT_TO_IMAGE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${falKey}`,
        },
        body: JSON.stringify({ ...payload, prompt: safePrompt }),
      });
      text = await res.text();
      if (!res.ok) {
        const retriedDetails = extractFalErrorDetails(text);
        const ultraSafePrompt = buildUltraSafePrompt(kind);
        console.warn("[generate-asset-image] Second retry with ultra-safe prompt (text-to-image)");
        res = await fetchWithRetry(FAL_TEXT_TO_IMAGE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Key ${falKey}`,
          },
          body: JSON.stringify({ ...payload, prompt: ultraSafePrompt }),
        });
        text = await res.text();
        if (!res.ok) {
          return { error: `Contenu bloqué par la politique FAL (422): ${retriedDetails}` };
        }
      }
    } else {
      console.error("[generate-asset-image] FAL.ai text-to-image error", {
        status: res.status,
        details,
      });
      return { error: `FAL.ai erreur ${res.status}: ${details}` };
    }
  }

  let json: { images?: Array<{ url: string }> };
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "Réponse invalide de l'API de génération" };
  }

  const imageUrl = json.images?.[0]?.url;
  if (!imageUrl) return { error: "FAL.ai n'a pas retourné d'image" };

  return { url: imageUrl };
}

async function generateWithReferences(
  prompt: string,
  referenceImageUrls: string[],
  falKey: string,
  width: number,
  height: number,
  kind: "character" | "background" | "object" = "character"
): Promise<{ url: string } | { error: string }> {
  const payload = {
    prompt,
    image_urls: referenceImageUrls,
    image_size: { width, height },
    num_images: 1,
    output_format: "png",
    safety_tolerance: "3",
    enable_safety_checker: true,
  };

  let res = await fetchWithRetry(FAL_IMAGE_EDIT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${falKey}`,
    },
    body: JSON.stringify(payload),
  });

  let text = await res.text();
  if (!res.ok) {
    const details = extractFalErrorDetails(text);
    if (res.status === 422 && isFalPolicyViolation(details)) {
      const safePrompt = buildSafeFallbackPrompt(prompt);
      console.warn("[generate-asset-image] Policy violation (edit), retry with safe prompt", {
        status: res.status,
        reference_images_count: referenceImageUrls.length,
      });
      res = await fetchWithRetry(FAL_IMAGE_EDIT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${falKey}`,
        },
        body: JSON.stringify({ ...payload, prompt: safePrompt }),
      });
      text = await res.text();
      if (!res.ok) {
        const retriedDetails = extractFalErrorDetails(text);
        const ultraSafePrompt = buildUltraSafePrompt(kind);
        console.warn("[generate-asset-image] Second retry with ultra-safe prompt (image-edit)");
        res = await fetchWithRetry(FAL_IMAGE_EDIT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Key ${falKey}`,
          },
          body: JSON.stringify({ ...payload, prompt: ultraSafePrompt }),
        });
        text = await res.text();
        if (!res.ok) {
          return { error: `Contenu bloqué par la politique FAL (422): ${retriedDetails}` };
        }
      }
    } else {
      console.error("[generate-asset-image] FAL.ai image-edit error", {
        status: res.status,
        details,
        reference_images_count: referenceImageUrls.length,
      });
      return { error: `FAL.ai erreur ${res.status}: ${details}` };
    }
  }

  let json: { images?: Array<{ url: string }> };
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "Réponse invalide de l'API de génération" };
  }

  const imageUrl = json.images?.[0]?.url;
  if (!imageUrl) return { error: "FAL.ai n'a pas retourné d'image" };

  return { url: imageUrl };
}

async function generateSchnell(
  prompt: string,
  falKey: string,
  width: number,
  height: number,
  kind: "character" | "background" | "object" = "character"
): Promise<{ url: string } | { error: string }> {
  const payload = {
    prompt,
    image_size: { width, height },
    num_images: 1,
    num_inference_steps: 4,
    output_format: "png",
    enable_safety_checker: true,
  };

  let res = await fetchWithRetry(FAL_SCHNELL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${falKey}`,
    },
    body: JSON.stringify(payload),
  });

  let text = await res.text();
  if (!res.ok) {
    const details = extractFalErrorDetails(text);
    if (res.status === 422 && isFalPolicyViolation(details)) {
      const safePrompt = buildSafeFallbackPrompt(prompt);
      console.warn("[generate-asset-image] Policy violation (schnell), retry with safe prompt", {
        status: res.status,
      });
      res = await fetchWithRetry(FAL_SCHNELL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${falKey}`,
        },
        body: JSON.stringify({ ...payload, prompt: safePrompt }),
      });
      text = await res.text();
      if (!res.ok) {
        const retriedDetails = extractFalErrorDetails(text);
        const ultraSafePrompt = buildUltraSafePrompt(kind);
        console.warn("[generate-asset-image] Second retry with ultra-safe prompt (schnell)");
        res = await fetchWithRetry(FAL_SCHNELL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Key ${falKey}`,
          },
          body: JSON.stringify({ ...payload, prompt: ultraSafePrompt }),
        });
        text = await res.text();
        if (!res.ok) {
          return { error: `Contenu bloqué par la politique FAL (422): ${retriedDetails}` };
        }
      }
    } else {
      console.error("[generate-asset-image] FAL.ai schnell error", {
        status: res.status,
        details,
      });
      return { error: `FAL.ai erreur ${res.status}: ${details}` };
    }
  }

  let json: { images?: Array<{ url: string }> };
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "Réponse invalide de l'API de génération" };
  }

  const imageUrl = json.images?.[0]?.url;
  if (!imageUrl) return { error: "FAL.ai n'a pas retourné d'image" };

  return { url: imageUrl };
}

async function downloadAndUploadToStorage(
  imageUrl: string,
  storagePath: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const downloadRes = await fetchWithTimeout(imageUrl, {}, 60_000);
      if (!downloadRes.ok) {
        const errText = await downloadRes.text().catch(() => "");
        console.error("[generate-asset-image] Download source image failed", {
          attempt,
          status: downloadRes.status,
          details: clip(errText, 500),
        });
        continue;
      }
      const imageArrayBuffer = await downloadRes.arrayBuffer();

      let uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`,
        {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "x-upsert": "true",
          },
          body: imageArrayBuffer,
        }
      );

      // Fallback historique: certains contextes Storage acceptent mieux le multipart/form-data.
      if (!uploadRes.ok) {
        const form = new FormData();
        form.append("file", new Blob([imageArrayBuffer]), "image.png");
        uploadRes = await fetch(
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
      }

      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => "");
        console.error("[generate-asset-image] Upload Storage failed", {
          attempt,
          status: uploadRes.status,
          details: clip(errText, 800),
          storage_path: storagePath,
        });
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }

      const ts = Date.now();
      return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}?v=${ts}`;
    } catch (err) {
      console.error("[generate-asset-image] Exception download/upload", {
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
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
    // 1. Vérification FAL_API_KEY
    const falKey = Deno.env.get("FAL_API_KEY");
    if (!falKey) {
      return jsonResponse(
        {
          error:
            "FAL_API_KEY non configurée. Supabase → Edge Functions → Secrets → ajouter FAL_API_KEY.",
        },
        500
      );
    }

    // 2. Vérification Supabase config
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "Config Supabase manquante" }, 500);
    }

    // 3. Vérification JWT sécurisée
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization manquante" }, 401);
    }

    const userId = await verifyUserFromToken(
      authHeader,
      supabaseUrl,
      serviceKey
    );
    if (!userId) {
      return jsonResponse({ error: "JWT invalide ou expiré" }, 401);
    }

    // 3b. Récupérer le plan de l'utilisateur
    let userPlan: UserPlan = "free";
    try {
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=plan`,
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
        if (
          profiles?.[0]?.plan === "pro"
        ) {
          userPlan = "pro";
        }
      }
    } catch {
      // En cas d'erreur, on reste sur "free" par sécurité
      console.warn("[generate-asset-image] Impossible de lire le plan utilisateur, défaut: free");
    }

    const limits = TIER_LIMITS[userPlan];

    // 3c. Vérifier le quota de générations mensuelles
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const usageRes = await fetch(
        `${supabaseUrl}/rest/v1/usage?user_id=eq.${userId}&action=eq.image_generation&created_at=gte.${startOfMonth}&select=id`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "count=exact",
          },
        }
      );
      if (usageRes.ok) {
        const countHeader = usageRes.headers.get("content-range");
        // Format: "0-9/42" ou "*/0"
        let usageCount = 0;
        if (countHeader) {
          const match = countHeader.match(/\/(\d+)$/);
          if (match) usageCount = parseInt(match[1], 10);
        }

        if (usageCount >= limits.maxGenerationsPerMonth) {
          return jsonResponse(
            {
              error: "Limite de générations atteinte",
              details: `Vous avez utilisé ${usageCount}/${limits.maxGenerationsPerMonth} générations ce mois-ci. ${userPlan === "free" ? "Passez au plan Pro pour plus de générations." : "Votre quota mensuel sera réinitialisé le 1er du mois prochain."}`,
              quota_exceeded: true,
              current_usage: usageCount,
              max_usage: limits.maxGenerationsPerMonth,
              plan: userPlan,
            },
            429
          );
        }
      }
    } catch {
      console.warn("[generate-asset-image] Impossible de vérifier l'usage, on continue");
    }

    // 4. Parse body JSON
    let body: {
      asset_id?: string;
      prompt?: string;
      asset_type?: "character" | "background" | "object";
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return jsonResponse({ error: "Body JSON invalide" }, 400);
    }

    const { asset_id, prompt, asset_type } = body;
    if (!asset_id || !prompt?.trim()) {
      return jsonResponse({ error: "asset_id et prompt requis" }, 400);
    }
    if (!isUuid(asset_id)) {
      return jsonResponse({ error: "asset_id invalide (UUID attendu)" }, 400);
    }

    const MAX_STYLE_IMAGES = 2;

    // 5a. Asset + projet — style = uniquement la ligne projet en BDD
    const assetRes = await fetch(
      `${supabaseUrl}/rest/v1/assets?id=eq.${encodeURIComponent(asset_id)}&select=id,user_id,project_id`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!assetRes.ok) {
      const errT = await assetRes.text();
      return jsonResponse(
        { error: "Erreur lecture asset", details: errT.slice(0, 200) },
        502
      );
    }
    const assets = (await assetRes.json()) as {
      id: string;
      user_id: string;
      project_id: string;
    }[];
    const asset = assets?.[0];
    if (!asset || asset.user_id !== userId) {
      return jsonResponse(
        { error: "Asset introuvable ou accès refusé" },
        403
      );
    }

    const projectRes = await fetch(
      `${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(asset.project_id)}&select=id,user_id,style_template,style_image_urls`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!projectRes.ok) {
      const errT = await projectRes.text();
      return jsonResponse(
        { error: "Erreur lecture projet", details: errT.slice(0, 200) },
        502
      );
    }
    const projects = (await projectRes.json()) as {
      id: string;
      user_id: string;
      style_template: string | null;
      style_image_urls: unknown;
    }[];
    const projRow = projects?.[0];
    if (!projRow || projRow.user_id !== userId) {
      return jsonResponse(
        { error: "Projet introuvable ou accès refusé" },
        403
      );
    }

    const dbText = (projRow.style_template ?? "").trim();
    const dbUrlsRaw = Array.isArray(projRow.style_image_urls)
      ? projRow.style_image_urls
      : [];
    const dbUrls = dbUrlsRaw.filter(
      (u): u is string => typeof u === "string" && u.trim().length > 0
    );

    let style_image_urls_merged: string[] | undefined =
      dbUrls.length > 0 ? dbUrls.slice(0, MAX_STYLE_IMAGES) : undefined;

    const mergedStyleKey = extractStyleKeyFromTemplate(dbText);
    // Preset manga = N&B : les refs couleur (souvent webtoon) imposent un rendu full-color au modèle
    if (mergedStyleKey === "manga") {
      if (style_image_urls_merged && style_image_urls_merged.length > 0) {
        console.log(
          `[generate-asset-image] preset=manga: ${style_image_urls_merged.length} image(s) de reference ignorees (evite derive webtoon / couleur)`
        );
      }
      style_image_urls_merged = undefined;
    }

    console.log("[generate-asset-image] request context", {
      request_id: requestId,
      asset_id,
      style_key: mergedStyleKey ?? "none",
      style_text_chars: dbText.length,
      style_refs_count: style_image_urls_merged?.length ?? 0,
      plan: userPlan,
      asset_type: asset_type ?? "character",
    });

    const hasStyleText = !!dbText;
    const hasStyleImages =
      Array.isArray(style_image_urls_merged) &&
      style_image_urls_merged.length > 0;
    if (!hasStyleText && !hasStyleImages) {
      return jsonResponse(
        {
          error: "Style requis",
          details:
            "Définissez un style dans l'onglet Style du projet : remplissez le champ « Template de style » et/ou ajoutez des images de référence.",
        },
        400
      );
    }

    const MANGA_RENDER_LOCK =
      "\n\n[CONTRAINTE RENDU MANGA] Sortie STRICTEMENT monochrome noir et blanc (encre, trames / screentone). " +
      "Interdit : couleurs, peau coloree, degrades peints type webtoon, digital painting full-color, rendu 3D lisse. " +
      "Ne pas produire un style webtoon coreen colore.";

    let userStyleText = dbText;
    if (mergedStyleKey === "manga") {
      userStyleText += MANGA_RENDER_LOCK;
    }
    const style_image_urls = style_image_urls_merged;
    const type_ = asset_type ?? "character";

    // ═══════════════════════════════════════════════════════════
    // CONSTRUCTION DU PROMPT
    // ═══════════════════════════════════════════════════════════

    let fullPrompt = "";

    if (type_ === "character") {
      fullPrompt = buildCharacterPrompt(
        prompt.trim(),
        hasStyleText ? userStyleText : undefined,
        undefined,
        userPlan
      );
    } else if (type_ === "background") {
      fullPrompt = buildBackgroundPrompt(
        prompt.trim(),
        hasStyleText ? userStyleText : undefined,
        undefined,
        userPlan
      );
    } else if (type_ === "object") {
      fullPrompt = buildObjectPrompt(
        prompt.trim(),
        hasStyleText ? userStyleText : undefined,
        undefined,
        userPlan
      );
    } else {
      fullPrompt = prompt.trim();
    }

    if (hasStyleImages) {
      fullPrompt +=
        "\n\nIMPORTANT : Les images de référence guident surtout trait, ombrage et matière. " +
        "Le bloc STYLE_SYSTEM (style_key, style_principal, description_style) ci-dessus définit le GENRE et la direction artistique : il est prioritaire si une ambiguïté apparaît avec les visuels. " +
        "Reproduis un rendu cohérent avec ces consignes. Crée un contenu 100% original.";
    }

    const viewPrompt = fullPrompt;

    // ═══════════════════════════════════════════════════════════
    // 6. APPEL FAL.ai (sélection modèle selon tier)
    // ═══════════════════════════════════════════════════════════

    const width = 1280;
    const height = 1024;

    if (hasStyleImages && !limits.allowReferenceImages) {
      // Free tier: ignorer les images de référence, utiliser Schnell text-only
      console.warn(
        "[generate-asset-image] Free tier: images de référence ignorées, utilisation de Schnell"
      );
    }

    // 6a. Génération SÉQUENTIELLE : face d'abord, PUIS sheet en utilisant
    //     la face comme référence d'identité (flux-2-pro/edit).
    //     C'est la clé pour que la sheet 4 angles reproduise EXACTEMENT le
    //     même personnage que la vue de face affichée dans la bibliothèque.
    //     Pour background/object : pas de sheet.
    const facePath = `${asset.user_id}/assets/${asset_id}.png`;
    const sheetPath = `${asset.user_id}/assets/${asset_id}_sheet.png`;

    const generateFace = async (): Promise<{ url: string } | { error: string }> => {
      if (userPlan === "free") {
        return generateSchnell(viewPrompt, falKey, width, height, type_);
      }
      if (hasStyleImages && style_image_urls && style_image_urls.length > 0) {
        return generateWithReferences(
          viewPrompt,
          style_image_urls,
          falKey,
          width,
          height,
          type_
        );
      }
      return generateTextToImage(viewPrompt, falKey, width, height, type_);
    };

    const modelUsed: string =
      userPlan === "free"
        ? "schnell"
        : hasStyleImages && style_image_urls && style_image_urls.length > 0
          ? "flux-2-pro-edit"
          : "flux-2-pro";

    const shouldGenerateSheet = type_ === "character";

    // --- Étape 1 : génération + upload de la face (bloquant) ---
    const faceResult = await generateFace();
    if ("error" in faceResult) {
      return jsonResponse(
        {
          error: "Échec génération image",
          details: faceResult.error,
          request_id: requestId,
        },
        502
      );
    }

    const publicUrl = await downloadAndUploadToStorage(
      faceResult.url,
      facePath,
      supabaseUrl,
      serviceKey
    );

    if (!publicUrl) {
      return jsonResponse(
        {
          error: "Vue générée par FAL.ai mais échec du transfert vers Storage",
          request_id: requestId,
        },
        502
      );
    }

    // --- Étape 2 : génération de la sheet avec la face comme référence ---
    //     Pro : flux-2-pro/edit, la face publique URL en 1ère position + style
    //           images éventuelles derrière. useFaceReference=true ajoute dans
    //           le prompt l'instruction "la 1ère image est le personnage".
    //     Free : Schnell ne supporte pas le mode edit → prompt texte renforcé,
    //           cohérence un peu moins stricte mais sheet produite quand même.
    //
    // Sheet = strip horizontal 2048×768 → 4 panneaux verticaux ~512×768 chacun.
    //   Ce format "planche manga 1 rangée × 4 cases" est beaucoup plus fiable
    //   que le 2×2 pour Flux (évite le biais "character sheet" avec bande
    //   d'expressions). Chaque case est assez haute pour afficher un corps
    //   entier en cadre portrait.
    const SHEET_WIDTH = 2048;
    const SHEET_HEIGHT = 768;

    let sheetPublicUrl: string | null = null;

    if (shouldGenerateSheet) {
      const sheetResult: { url: string } | { error: string } = await (async () => {
        if (userPlan === "free") {
          const sheetPromptFree = buildCharacterSheetPrompt(
            prompt.trim(),
            hasStyleText ? userStyleText : undefined,
            false
          );
          return generateSchnell(
            sheetPromptFree,
            falKey,
            SHEET_WIDTH,
            SHEET_HEIGHT,
            type_
          );
        }

        // Pro : face en première référence d'identité, images de style ensuite.
        const sheetRefs: string[] = [publicUrl];
        if (hasStyleImages && style_image_urls && style_image_urls.length > 0) {
          sheetRefs.push(...style_image_urls);
        }
        const sheetPromptPro = buildCharacterSheetPrompt(
          prompt.trim(),
          hasStyleText ? userStyleText : undefined,
          true
        );
        return generateWithReferences(
          sheetPromptPro,
          sheetRefs,
          falKey,
          SHEET_WIDTH,
          SHEET_HEIGHT,
          type_
        );
      })();

      if ("error" in sheetResult) {
        console.warn("[generate-asset-image] Sheet generation failed (face OK)", {
          request_id: requestId,
          asset_id,
          details: sheetResult.error,
        });
      } else {
        sheetPublicUrl = await downloadAndUploadToStorage(
          sheetResult.url,
          sheetPath,
          supabaseUrl,
          serviceKey
        );
        if (!sheetPublicUrl) {
          console.warn("[generate-asset-image] Sheet upload failed (face OK)", {
            request_id: requestId,
            asset_id,
          });
        }
      }
    }

    // 8. Mise à jour BDD — image_url (face) + image_url_sheet (composite 4 angles).
    //    image_url_profile_* sont réinitialisées (legacy abandonné, cf. CLAUDE.md "Sheet System").
    const updateField = "image_url";

    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/assets?id=eq.${encodeURIComponent(asset_id)}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          image_url_sheet: sheetPublicUrl,
          image_url_profile_left: null,
          image_url_profile_right: null,
          image_url_back: null,
          [updateField]: publicUrl,
        }),
      }
    );

    if (!updateRes.ok) {
      const errT = await updateRes.text();
      return jsonResponse(
        {
          error: "Image générée mais mise à jour BDD échouée",
          details: errT.slice(0, 200),
        },
        502
      );
    }

    // 9. Enregistrer l'utilisation dans la table usage
    try {
      await fetch(`${supabaseUrl}/rest/v1/usage`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          user_id: userId,
          action: "image_generation",
        }),
      });
    } catch {
      console.warn("[generate-asset-image] Impossible d'enregistrer l'usage");
    }

    return jsonResponse(
      {
        image_url: publicUrl,
        image_url_sheet: sheetPublicUrl,
        update_field: updateField,
        model: modelUsed,
        plan: userPlan,
        request_id: requestId,
      },
      200
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-asset-image] Exception", {
      request_id: requestId,
      message: msg,
    });
    return jsonResponse({ error: "Erreur serveur", details: msg, request_id: requestId }, 500);
  }
});
