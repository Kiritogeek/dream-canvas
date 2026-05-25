// Edge Function: génération d'image par bloc de case (Étape 5)
// Body: panel_id (id de la case), block_id, width, height, prompt, block_asset_*
// Style : uniquement `projects.style_template` en BDD (pas le corps de requête).
// Stockage: {user_id}/projects/{project_id}/cases/{panel_id}/blocks/{block_id}.png
// Secrets: FAL_API_KEY

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const FAL_TEXT_TO_IMAGE = "https://fal.run/fal-ai/flux-2-pro";
const FAL_IMAGE_EDIT = "https://fal.run/fal-ai/flux-2-pro/edit";
const BUCKET = "dreamweave";
const FAL_TIMEOUT_MS = 120_000;
const MAX_DIMENSION = 1440;
const NO_BORDER_NEGATIVE_PROMPT =
  "white border, white bars, white margin, white edge, white padding, white corners, white frame, " +
  "blank area, blank margin, empty space, empty area, empty corners, " +
  "border, frame, inner border, outer border, thin border, thick border, " +
  "letterbox, pillarbox, passe-partout, vignette, white vignette, " +
  "postcard, poster frame, image frame, canvas frame, image inside image, " +
  "collage, grid, reference sheet, contact sheet, color chart" +
  ", speech bubble, dialogue bubble, thought bubble, text bubble, word balloon, caption box, " +
  "text overlay, comic text, manga text, speech cloud, onomatopoeia, sound effects text, " +
  "dialogue text, subtitle, annotation, watermark, written words, letters, typography";

// FLUX génère proprement uniquement sur des multiples de 32.
// Si les dimensions ne sont pas des multiples de 32, le modèle snap en interne
// et compense le ratio avec des barres blanches.
function snapToFluxDim(v: number): number {
  const snapped = Math.round(v / 32) * 32;
  return Math.max(256, Math.min(MAX_DIMENSION, snapped));
}

import { getCorsHeaders, makeJsonResponse, isAllowedOriginConfigured } from "../_shared/cors.ts";

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
    // fallback sur texte brut
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
  // Retire uniquement les termes explicitement sexuels ou graphiquement violents.
  // "sang", "meurtre", "blessure", "combat", "mort" sont légitimes en manga/webtoon.
  const softened = prompt
    .replace(
      /\b(nude|naked|nsfw|porn|pornographie|erotic|erotique|sexe explicite|explicit sex|nudite|nudity)\b/gi,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
  return `${softened}\n\nFamily-friendly visual adaptation: no nudity, no explicit sexual content. Stylized manga/comic depiction.`;
}

function buildUltraSafePrompt(styleTemplate: string, scenePrompt: string): string {
  const styleKey = styleTemplate.match(/style_key:\s*(.+)/i)?.[1]?.trim();
  const stylePrincipal = styleTemplate.match(/style_principal:\s*(.+)/i)?.[1]?.trim();
  const styleDesc = styleTemplate.match(/description_style:\s*(.+)/i)?.[1]?.trim();

  const styleHint = [styleKey, stylePrincipal, styleDesc].filter(Boolean).join(", ");
  const stylePrefix = styleHint
    ? `Visual style: ${styleHint}. `
    : "Polished modern manga/comic visual style. ";

  // Extrait l'essence de la scène (sujet + lieu si possible), sans les termes potentiellement bloquants.
  const sceneWords = scenePrompt
    .replace(/\b(nude|naked|nsfw|porn|erotic|erotique|explicit)\b/gi, "")
    .split(/[,.\n]/)
    .slice(0, 2)
    .join(", ")
    .trim();

  return (
    stylePrefix +
    (sceneWords ? `Scene: ${sceneWords}. ` : "") +
    "Full-bleed edge-to-edge illustration, zero white borders, zero margins, zero frames. " +
    "Single high-quality comic panel, professional finish, detailed linework, clean composition, cinematic lighting, original content, family-friendly, no explicit content, no sexual content. " +
    "Every pixel of all four edges must contain scene content — never white, never blank. " +
    "Extend background/scenery to fill entire canvas if needed. " +
    "No frame, border, margin, letterbox, pillarbox, collage, grid, reference sheet, white corners."
  );
}

function summarizeStyleTemplateForPrompt(styleTemplate: string): string {
  const text = styleTemplate.trim();
  if (!text) return "";

  const hasStyleSystem = text.includes("STYLE_SYSTEM_V1");
  if (!hasStyleSystem) return clip(text, 900);

  const styleKey = text.match(/style_key:\s*(.+)/i)?.[1]?.trim() ?? "inconnu";
  const stylePrincipal =
    text.match(/style_principal:\s*(.+)/i)?.[1]?.trim() ?? "inconnu";
  const description =
    text.match(/description_style:\s*(.+)/i)?.[1]?.trim() ?? "non fournie";
  const extraNotes =
    text.match(/Contraintes additionnelles du projet:\s*([\s\S]*)$/i)?.[1]?.trim() ?? "";

  let summary =
    `STYLE_SYSTEM_V1 (résumé): style_key=${styleKey}; style_principal=${stylePrincipal}; ` +
    `description_style=${description}. ` +
    "Appliquer ce style visuel de façon cohérente sans copier d'oeuvre existante.";
  if (extraNotes) {
    summary += ` Contraintes additionnelles: ${extraNotes}`;
  }
  return clip(summary, 900);
}

function sanitizePolicySensitiveText(input: string, max = 320): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const softened = trimmed
    // Protection minimale : uniquement termes sexuellement explicites.
    .replace(/\b(sexe explicite|explicit sex|porn|pornographie|erotique explicite|sexual content explicite)\b/gi, "safe content")
    .replace(/\b(nsfw|nude|naked|nudite|nudity)\b/gi, "fully clothed")
    .replace(/\s{2,}/g, " ")
    .trim();

  return clip(softened, max);
}

function sanitizeAssetLabels(assetNames: string[]): string[] {
  return assetNames
    .map((name) => sanitizePolicySensitiveText(name, 120))
    .filter((name) => name.length > 0)
    .slice(0, 8);
}

function buildPolicySafePanelPrompt(params: {
  styleSummary: string;
  scenePrompt: string;
  assetNames?: string[];
  width: number;
  height: number;
  withReferences: boolean;
}): string {
  const safeStyle = clip(params.styleSummary.trim(), 520);
  const safeScene = sanitizePolicySensitiveText(params.scenePrompt, 1200);
  const safeAssets = params.assetNames ? sanitizeAssetLabels(params.assetNames) : [];

  const FULLBLEED_OPEN =
    `Full-bleed cinematic scene, no borders, no margins, no frames, no gutters, no white space. ` +
    `Scene content bleeds to every pixel of all four edges. ` +
    `No speech bubbles, no text overlays, no dialogue boxes, no captions, no word balloons, no written text — any dialogue is added as separate overlay by the application. `;

  const FULLBLEED_CLOSE =
    `\n\nSTRICT FORMAT (${params.width}x${params.height}px): absolute full-bleed — ` +
    `every pixel on all 4 edges is scene content, zero margin, zero border, zero letterbox, zero pillarbox. ` +
    `If the subject does not fill the entire frame, extend the background environment or zoom in to eliminate any white or empty space. ` +
    `No canvas padding, no image frame, no passe-partout, no white corners.`;

  const parts: string[] = [];

  parts.push(FULLBLEED_OPEN + (safeStyle ? `Style visuel : ${safeStyle}` : ""));

  parts.push(safeScene);

  if (safeAssets.length > 0) {
    if (params.withReferences) {
      // Chaque image de référence est indexée par son nom d'asset pour que le modèle sache quelle image correspond à quel élément.
      const indexedRefs = safeAssets
        .map((name, i) => `image de référence ${i + 1} = "${name}"`)
        .join(", ");
      parts.push(
        `CORRESPONDANCE DES RÉFÉRENCES : ${indexedRefs}. ` +
        `Reproduire fidèlement l'apparence visuelle de chaque élément en utilisant uniquement l'image de référence qui lui correspond.`
      );
    } else {
      parts.push(`Inclure dans la scène : ${safeAssets.join(", ")}.`);
    }
  }

  let fullPrompt = parts.join("\n\n") + FULLBLEED_CLOSE;

  if (params.withReferences) {
    fullPrompt +=
      "\n\nRÈGLE ABSOLUE : chaque image de référence fournie représente un élément précis de la scène (voir correspondance ci-dessus). " +
      "Reproduire l'apparence exacte (visage, coiffure, costume, couleurs, style graphique, forme) de chaque élément à partir de son image de référence. " +
      "Composer une scène unique et cohérente — pas de fiche, grille, collage, cadre ou montage.";
  }

  return clip(fullPrompt, 2800);
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
  height: number,
  styleTemplate = "",
  scenePrompt = ""
): Promise<{ url: string } | { error: string }> {
  const res = await fetchWithTimeout(
    FAL_TEXT_TO_IMAGE,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
      body: JSON.stringify({
        prompt,
        negative_prompt: NO_BORDER_NEGATIVE_PROMPT,
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
    const details = extractFalErrorDetails(text);
    if (res.status === 422 && isFalPolicyViolation(details)) {
      const safePrompt = buildSafeFallbackPrompt(prompt);
      console.warn("[generate-panel-image] Policy violation, retry text-to-image with safe prompt", {
        status: res.status,
        details,
      });
      const retryRes = await fetchWithTimeout(
        FAL_TEXT_TO_IMAGE,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
          body: JSON.stringify({
            prompt: safePrompt,
            negative_prompt: NO_BORDER_NEGATIVE_PROMPT,
            image_size: { width, height },
            num_images: 1,
            output_format: "png",
            safety_tolerance: "3",
            enable_safety_checker: true,
          }),
        },
        FAL_TIMEOUT_MS
      );
      const retryText = await retryRes.text();
      if (retryRes.ok) {
        let retryJson: { images?: Array<{ url: string }> };
        try {
          retryJson = JSON.parse(retryText);
        } catch {
          return { error: "Réponse FAL invalide (retry)" };
        }
        const retryUrl = retryJson.images?.[0]?.url;
        if (!retryUrl) return { error: "FAL n'a pas retourné d'image (retry)" };
        return { url: retryUrl };
      }
      const retryDetails = extractFalErrorDetails(retryText);
      if (retryRes.status === 422 && isFalPolicyViolation(retryDetails)) {
        const ultraSafePrompt = buildUltraSafePrompt(styleTemplate, scenePrompt);
        console.warn("[generate-panel-image] Second retry text-to-image with ultra-safe prompt", {
          status: retryRes.status,
          details: retryDetails,
        });
        const retry2Res = await fetchWithTimeout(
          FAL_TEXT_TO_IMAGE,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
            body: JSON.stringify({
              prompt: ultraSafePrompt,
              negative_prompt: NO_BORDER_NEGATIVE_PROMPT,
              image_size: { width, height },
              num_images: 1,
              output_format: "png",
              safety_tolerance: "3",
              enable_safety_checker: true,
            }),
          },
          FAL_TIMEOUT_MS
        );
        const retry2Text = await retry2Res.text();
        if (retry2Res.ok) {
          let retry2Json: { images?: Array<{ url: string }> };
          try {
            retry2Json = JSON.parse(retry2Text);
          } catch {
            return { error: "Réponse FAL invalide (retry-2)" };
          }
          const retry2Url = retry2Json.images?.[0]?.url;
          if (!retry2Url) return { error: "FAL n'a pas retourné d'image (retry-2)" };
          return { url: retry2Url };
        }
      }
    }
    console.error("[generate-panel-image] FAL text-to-image error", {
      status: res.status,
      details,
    });
    return { error: `FAL.ai ${res.status}: ${details}` };
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
  height: number,
  styleTemplate = "",
  scenePrompt = ""
): Promise<{ url: string } | { error: string }> {
  const res = await fetchWithTimeout(
    FAL_IMAGE_EDIT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
      body: JSON.stringify({
        prompt,
        negative_prompt: NO_BORDER_NEGATIVE_PROMPT,
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
    const details = extractFalErrorDetails(text);
    if (res.status === 422 && isFalPolicyViolation(details)) {
      const safePrompt = buildSafeFallbackPrompt(prompt);
      console.warn("[generate-panel-image] Policy violation, retry image-edit with safe prompt", {
        status: res.status,
        details,
        reference_images_count: referenceImageUrls.length,
      });
      const retryRes = await fetchWithTimeout(
        FAL_IMAGE_EDIT,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
          body: JSON.stringify({
            prompt: safePrompt,
            negative_prompt: NO_BORDER_NEGATIVE_PROMPT,
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
      const retryText = await retryRes.text();
      if (retryRes.ok) {
        let retryJson: { images?: Array<{ url: string }> };
        try {
          retryJson = JSON.parse(retryText);
        } catch {
          return { error: "Réponse FAL invalide (retry)" };
        }
        const retryUrl = retryJson.images?.[0]?.url;
        if (!retryUrl) return { error: "FAL n'a pas retourné d'image (retry)" };
        return { url: retryUrl };
      }
      const retryDetails = extractFalErrorDetails(retryText);
      if (retryRes.status === 422 && isFalPolicyViolation(retryDetails)) {
        const ultraSafePrompt = buildUltraSafePrompt(styleTemplate, scenePrompt);
        console.warn("[generate-panel-image] Second retry image-edit with ultra-safe prompt", {
          status: retryRes.status,
          details: retryDetails,
          reference_images_count: referenceImageUrls.length,
        });
        const retry2Res = await fetchWithTimeout(
          FAL_TEXT_TO_IMAGE,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
            body: JSON.stringify({
              prompt: ultraSafePrompt,
              negative_prompt: NO_BORDER_NEGATIVE_PROMPT,
              image_size: { width, height },
              num_images: 1,
              output_format: "png",
              safety_tolerance: "3",
              enable_safety_checker: true,
            }),
          },
          FAL_TIMEOUT_MS
        );
        const retry2Text = await retry2Res.text();
        if (retry2Res.ok) {
          let retry2Json: { images?: Array<{ url: string }> };
          try {
            retry2Json = JSON.parse(retry2Text);
          } catch {
            return { error: "Réponse FAL invalide (retry-2)" };
          }
          const retry2Url = retry2Json.images?.[0]?.url;
          if (!retry2Url) return { error: "FAL n'a pas retourné d'image (retry-2)" };
          return { url: retry2Url };
        }
      }
    }
    console.error("[generate-panel-image] FAL image-edit error", {
      status: res.status,
      details,
      reference_images_count: referenceImageUrls.length,
    });
    return { error: `FAL.ai ${res.status}: ${details}` };
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


async function cropWhiteBorders(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    // @ts-expect-error -- import npm résolu par Deno Deploy au runtime
    const { PNG } = await import("npm:pngjs@7.0.0");
    const { Buffer } = await import("node:buffer");
    const src = PNG.sync.read(Buffer.from(buffer)) as {
      width: number; height: number; data: Buffer;
    };
    const { width, height, data } = src;
    const WHITE = 238;

    const isRowWhite = (y: number): boolean => {
      const base = y * width * 4;
      for (let x = 0; x < width; x++) {
        const i = base + x * 4;
        if (data[i] < WHITE || data[i + 1] < WHITE || data[i + 2] < WHITE) return false;
      }
      return true;
    };
    const isColWhite = (x: number, y0: number, y1: number): boolean => {
      for (let y = y0; y <= y1; y++) {
        const i = (y * width + x) * 4;
        if (data[i] < WHITE || data[i + 1] < WHITE || data[i + 2] < WHITE) return false;
      }
      return true;
    };

    let top = 0; while (top < height && isRowWhite(top)) top++;
    let bottom = height - 1; while (bottom > top && isRowWhite(bottom)) bottom--;
    let left = 0; while (left < width && isColWhite(left, top, bottom)) left++;
    let right = width - 1; while (right > left && isColWhite(right, top, bottom)) right--;

    if (top <= 2 && (height - 1 - bottom) <= 2 && left <= 2 && (width - 1 - right) <= 2) {
      return buffer;
    }
    const cropW = right - left + 1;
    const cropH = bottom - top + 1;
    if (cropW < 64 || cropH < 64) return buffer;

    const dst = new PNG({ width: cropW, height: cropH, filterType: -1 });
    for (let y = 0; y < cropH; y++) {
      const srcOff = ((top + y) * width + left) * 4;
      const dstOff = y * cropW * 4;
      (data as Buffer).copy(dst.data, dstOff, srcOff, srcOff + cropW * 4);
    }
    const encoded: Buffer = PNG.sync.write(dst);
    return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
  } catch {
    return buffer;
  }
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
    const rawBuffer = await downloadRes.arrayBuffer();
    const croppedBuffer = await cropWhiteBorders(rawBuffer);
    const blob = new Blob([croppedBuffer], { type: "image/png" });
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
  const requestId = crypto.randomUUID();
  const origin = req.headers.get("origin");
  const jsonResponse = makeJsonResponse(origin);

  if (!isAllowedOriginConfigured()) {
    return jsonResponse(
      { error: "ALLOWED_ORIGIN non configurée. Configurez ce secret Supabase." },
      500
    );
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
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
    let userPlan: "libre" | "createur" | "studio" = "libre";
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
        const p = profiles?.[0]?.plan;
        if (p === "createur" || p === "studio") userPlan = p;
      }
    } catch {
      userPlan = "libre";
    }

    let body: {
      panel_id?: string;
      block_id?: string;
      width?: number;
      height?: number;
      prompt?: string;
      block_asset_image_urls?: string[];
      block_asset_names?: string[];
      previous_image_url?: string;
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
      block_asset_names,
      block_asset_image_urls,
      previous_image_url,
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

    const width = snapToFluxDim(typeof w === "number" && w > 0 ? w : 512);
    const height = snapToFluxDim(typeof h === "number" && h > 0 ? h : 512);
    console.log("[generate-panel-image] request context", {
      request_id: requestId,
      panel_id,
      block_id,
      width,
      height,
      plan: userPlan,
      prompt_chars: prompt.trim().length,
      block_asset_names_count: block_asset_names?.length ?? 0,
      block_asset_image_urls_count: block_asset_image_urls?.length ?? 0,
    });

    // Vérifier que le panel appartient à l'utilisateur et récupérer chapter_id
    const panelRes = await fetch(
      `${supabaseUrl}/rest/v1/chapter_canvases?id=eq.${encodeURIComponent(panel_id)}&select=id,user_id,chapter_id`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!panelRes.ok) {
      return jsonResponse({ error: "Erreur lecture canvas" }, 502);
    }
    const panels = (await panelRes.json()) as { id: string; user_id: string; chapter_id: string }[];
    const panel = panels?.[0];
    if (!panel || panel.user_id !== userId) {
      return jsonResponse({ error: "Canvas introuvable ou accès refusé" }, 403);
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

    const effectiveStyleTemplate = summarizeStyleTemplateForPrompt(dbStyleText);

    const referenceImageUrls = Array.isArray(block_asset_image_urls)
      ? block_asset_image_urls.filter((u) => typeof u === "string" && u.trim().length > 0)
      : [];
    const limitedReferenceImageUrls = referenceImageUrls.slice(0, 5);

    const previousImageUrl = typeof previous_image_url === "string" && previous_image_url.trim()
      ? previous_image_url.trim()
      : null;

    // Combine asset refs + previous image pour la continuité visuelle
    const allReferenceImageUrls = [
      ...limitedReferenceImageUrls,
      ...(previousImageUrl ? [previousImageUrl] : []),
    ];
    const useReferences = allReferenceImageUrls.length > 0;

    const fullPrompt = buildPolicySafePanelPrompt({
      styleSummary: effectiveStyleTemplate,
      scenePrompt: prompt.trim(),
      assetNames: Array.isArray(block_asset_names) ? block_asset_names : undefined,
      width,
      height,
      withReferences: useReferences,
    });

    let finalPrompt = fullPrompt;
    if (previousImageUrl) {
      finalPrompt = clip(
        fullPrompt +
        "\n\nCONTINUITÉ VISUELLE : La dernière image de référence est le panneau qui précède directement cette case dans la séquence. " +
        "Maintenir la cohérence : même espace narratif, même éclairage ambiant, même angle de caméra (relatif au personnage), " +
        "même position du personnage dans l'environnement. Ne PAS reproduire l'image précédente — générer la scène SUIVANTE " +
        "qui s'enchaîne naturellement. L'environnement et l'atmosphère doivent être visuellement continus.",
        2800
      );
    }

    const result = useReferences
      ? await generateImageWithReferences(
          finalPrompt,
          allReferenceImageUrls,
          falKey,
          width,
          height,
          dbStyleText,
          prompt.trim()
        )
      : await generateImage(finalPrompt, falKey, width, height, dbStyleText, prompt.trim());
    if ("error" in result) {
      return jsonResponse({ error: result.error, request_id: requestId }, 502);
    }

    const storagePath = `${userId}/projects/${projectId}/panels/${panel_id}/blocks/${block_id}.png`;
    const publicUrl = await downloadAndUpload(result.url, storagePath, supabaseUrl, serviceKey);
    if (!publicUrl) {
      return jsonResponse({ error: "Échec transfert vers Storage" }, 502);
    }

    // Log usage — fire-and-forget, n'échoue pas la génération si l'insert échoue.
    fetch(`${supabaseUrl}/rest/v1/usage`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ user_id: userId, action: "image_generation" }),
    }).catch(() => {});

    return jsonResponse({ image_url: publicUrl, request_id: requestId }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-panel-image] Exception", {
      request_id: requestId,
      message: msg,
    });
    return jsonResponse({ error: "Erreur serveur", details: msg, request_id: requestId }, 500);
  }
});
