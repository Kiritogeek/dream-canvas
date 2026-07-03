// Edge Function : génération de l'ILLUSTRATION de couverture d'un projet.
// Body : { project_id }
// Génère un key art vertical (800×1216) à partir du style + personnages + genre + tonalité
// du projet, l'upload dans le Storage et renvoie { image_url }.
// Le titre stylisé est ajouté CÔTÉ CLIENT (blocs texte) ; le compositing final → cover_url.
// Secrets : FAL_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, ALLOWED_ORIGIN

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

import { getCorsHeaders, makeJsonResponse, isAllowedOriginConfigured } from "../_shared/cors.ts";
import { getTierLimits, type UserPlan } from "../_shared/tierConfig.ts";
import { computeUsagePeriodStart } from "../_shared/usagePeriod.ts";
import { reserveImageCredit, refundImageCredit } from "../_shared/quota.ts";

const FAL_TEXT_TO_IMAGE = "https://fal.run/fal-ai/flux-2-pro";
const FAL_IMAGE_EDIT = "https://fal.run/fal-ai/flux-2-pro/edit";
const BUCKET = "dreamweave";
const FAL_TIMEOUT_MS = 120_000;
// Portrait webtoon : 800 de large, hauteur multiple de 32 (FLUX) proche de 1200.
const COVER_W = 800;
const COVER_H = 1216;
const FLUX_MAX_REFS = 4;

const COVER_NEGATIVE_PROMPT =
  "text, title, letters, typography, watermark, logo, signature, caption, subtitle, " +
  "speech bubble, word balloon, panel borders, multi-panel, collage, grid, comic layout, " +
  "reference sheet, character sheet, split image, frame, white border, blank margins";

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const TONE_MOOD: Record<string, string> = {
  epique: "epic grandiose atmosphere, dramatic scale, heroic lighting, high contrast",
  sombre: "dark moody atmosphere, deep shadows, cold desaturated palette, chiaroscuro",
  humoristique: "bright cheerful atmosphere, lively colors, playful energy",
  romantique: "soft warm romantic atmosphere, gentle pastel palette, tender light",
  mysterieux: "mysterious foggy atmosphere, muted palette, intriguing partial reveal",
  "slice of life": "calm warm everyday atmosphere, natural soft light, cozy palette",
};

function normalizeMeta(v: string): string {
  return v.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Parse les tags [Tags: G] / [Tone: T] de la description projet. */
function parseMeta(description: string | null): { genre: string; tone: string } {
  const d = description ?? "";
  return {
    genre: d.match(/\[Tags:\s*([^\]]*)\]/)?.[1]?.trim() ?? "",
    tone: d.match(/\[Tone:\s*([^\]]*)\]/)?.[1]?.trim() ?? "",
  };
}

async function verifyUserFromToken(authHeader: string, supabaseUrl: string, serviceKey: string): Promise<string | null> {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey || serviceKey },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return typeof user?.id === "string" ? user.id : null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function callFlux(prompt: string, refs: string[], falKey: string): Promise<{ url: string } | { error: string }> {
  const useEdit = refs.length > 0;
  const body: Record<string, unknown> = {
    prompt,
    negative_prompt: COVER_NEGATIVE_PROMPT,
    image_size: { width: COVER_W, height: COVER_H },
    num_images: 1,
    output_format: "png",
    safety_tolerance: "3",
    enable_safety_checker: true,
  };
  if (useEdit) body.image_urls = refs;
  const res = await fetchWithTimeout(
    useEdit ? FAL_IMAGE_EDIT : FAL_TEXT_TO_IMAGE,
    { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` }, body: JSON.stringify(body) },
    FAL_TIMEOUT_MS,
  );
  const text = await res.text();
  if (!res.ok) {
    console.error("[generate-cover-image] FAL error", { status: res.status, details: text.slice(0, 300) });
    return { error: `FAL.ai ${res.status}` };
  }
  let json: { images?: Array<{ url: string }> };
  try { json = JSON.parse(text); } catch { return { error: "Réponse FAL invalide" }; }
  const url = json.images?.[0]?.url;
  return url ? { url } : { error: "FAL n'a pas retourné d'image" };
}

async function downloadAndUpload(imageUrl: string, path: string, supabaseUrl: string, serviceKey: string): Promise<string | null> {
  try {
    const dl = await fetchWithTimeout(imageUrl, {}, 30_000);
    if (!dl.ok) return null;
    const buffer = await dl.arrayBuffer();
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: "image/png" }), "cover.png");
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "x-upsert": "true" },
      body: form,
    });
    if (!uploadRes.ok) {
      console.error("[generate-cover-image] upload failed", uploadRes.status);
      return null;
    }
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
  } catch (e) {
    console.error("[generate-cover-image] downloadAndUpload exception", e instanceof Error ? e.message : String(e));
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const json = makeJsonResponse(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  if (!isAllowedOriginConfigured()) return json({ error: "ALLOWED_ORIGIN non configuré" }, 500);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const falKey = Deno.env.get("FAL_API_KEY") ?? "";
  if (!falKey) return json({ error: "FAL_API_KEY manquant" }, 500);

  const userId = await verifyUserFromToken(req.headers.get("authorization") ?? "", supabaseUrl, serviceKey);
  if (!userId) return json({ error: "Non authentifié" }, 401);

  let body: { project_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Body invalide" }, 400); }
  const projectId = body.project_id;
  if (!projectId || !isUuid(projectId)) return json({ error: "project_id (UUID) requis" }, 400);

  // Ownership + données projet
  const projRes = await fetch(
    `${supabaseUrl}/rest/v1/projects?id=eq.${projectId}&select=user_id,title,description,style_template,style_image_urls`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!projRes.ok) return json({ error: "Erreur lecture projet" }, 502);
  const projRows = (await projRes.json()) as Array<{
    user_id: string; title: string; description: string | null;
    style_template: string | null; style_image_urls: unknown;
  }>;
  const project = projRows?.[0];
  if (!project || project.user_id !== userId) return json({ error: "Projet introuvable ou accès refusé" }, 403);

  const styleText = (project.style_template ?? "").trim();
  if (!styleText) return json({ error: "Style requis", details: "Définis un style de projet avant de générer une couverture." }, 400);

  // Personnages principaux (identité) — jusqu'à 3 portraits en référence.
  const assetRes = await fetch(
    `${supabaseUrl}/rest/v1/assets?project_id=eq.${projectId}&asset_type=eq.character&select=name,image_url&limit=3`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  const assetRows = assetRes.ok ? (await assetRes.json()) as Array<{ name: string; image_url: string | null }> : [];
  const heroNames = assetRows.map((a) => a.name).filter(Boolean);
  const heroRefs = assetRows.map((a) => a.image_url).filter((u): u is string => typeof u === "string" && u.trim().length > 0).slice(0, FLUX_MAX_REFS);

  // Références de style (jusqu'à 2), en complétant le budget.
  const styleImageUrls = Array.isArray(project.style_image_urls)
    ? (project.style_image_urls as unknown[]).filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    : [];
  const styleRefs = styleImageUrls.slice(0, Math.max(0, FLUX_MAX_REFS - heroRefs.length)).slice(0, 2);
  const refs = [...heroRefs, ...styleRefs];

  const { genre, tone } = parseMeta(project.description);
  const moodDir = tone ? (TONE_MOOD[normalizeMeta(tone)] ?? `${tone} mood`) : "";

  const prompt = [
    "Official webtoon cover key art, single striking vertical illustration.",
    heroNames.length ? `Featuring the main character(s): ${heroNames.join(", ")}.` : "Atmospheric establishing key art of the world.",
    genre ? `Genre: ${genre}.` : "",
    moodDir ? `Atmosphere: ${moodDir}.` : "",
    "Dramatic central composition, strong focal subject, cinematic key lighting, rich background, portrait orientation.",
    "Leave clear negative space at the top and bottom for a title to be added later.",
    heroRefs.length ? "Reproduce EXACTLY the identity (face, hairstyle, outfit, colors) of the referenced character(s)." : "",
    styleRefs.length ? "Reproduce the art style, linework, palette and shading of the style reference image(s) — do not copy their content." : "",
    `Art style of the project: ${styleText.slice(0, 400)}`,
    "One single integrated illustration — NO text, NO title, NO panels, NO borders.",
  ].filter(Boolean).join(" ");

  // Quota (1 crédit, comme une case) — mêmes helpers partagés que generate-panel-image.
  const planRes = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=plan,billing_period_start`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const planRows = planRes.ok ? (await planRes.json()) as Array<{ plan?: string; billing_period_start?: string | null }> : [];
  const rawPlan = planRows?.[0]?.plan;
  const userPlan: UserPlan = rawPlan === "createur" || rawPlan === "studio" ? rawPlan : "libre";
  const periodStart = computeUsagePeriodStart(planRows?.[0]?.billing_period_start ?? null);
  const limits = getTierLimits(userPlan);

  const reservation = await reserveImageCredit(supabaseUrl, serviceKey, userId, limits.maxGenerationsPerMonth, periodStart.toISOString());
  if (!reservation.allowed) {
    return json({ error: "Quota mensuel atteint", quota_exceeded: true, current_usage: reservation.count, max_usage: limits.maxGenerationsPerMonth, plan: userPlan }, 429);
  }

  const result = await callFlux(prompt, refs, falKey);
  if ("error" in result) {
    await refundImageCredit(supabaseUrl, serviceKey, reservation.usageId);
    return json({ error: result.error }, 502);
  }

  const path = `${userId}/projects/${projectId}/cover-illustration.png`;
  const publicUrl = await downloadAndUpload(result.url, path, supabaseUrl, serviceKey);
  if (!publicUrl) {
    await refundImageCredit(supabaseUrl, serviceKey, reservation.usageId);
    return json({ error: "Échec de l'enregistrement de l'illustration" }, 500);
  }

  return json({ image_url: `${publicUrl}?v=${Date.now()}` }, 200);
});
