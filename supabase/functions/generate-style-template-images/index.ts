declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const FAL_TEXT_TO_IMAGE = "https://fal.run/fal-ai/flux-2-pro";
const BUCKET = "dreamweave";
const FAL_TIMEOUT_MS = 120_000;

import { STYLE_TEMPLATE_IMAGE_DEFINITIONS } from "../_shared/style-template-image-prompts.ts";

const DEFINITIONS = STYLE_TEMPLATE_IMAGE_DEFINITIONS;

type GenerateRequestBody = {
  targets?: string[];
};

function getCorsHeaders(): Record<string, string> {
  const origin = Deno.env.get("ALLOWED_ORIGIN")?.trim();
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-template-admin-token",
  };
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
  });
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
  falKey: string
): Promise<{ url: string } | { error: string }> {
  const res = await fetchWithTimeout(
    FAL_TEXT_TO_IMAGE,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
      body: JSON.stringify({
        prompt,
        image_size: { width: 1024, height: 1024 },
        num_images: 1,
        output_format: "png",
        safety_tolerance: "3",
        enable_safety_checker: true,
      }),
    },
    FAL_TIMEOUT_MS
  );

  const text = await res.text();
  if (!res.ok) return { error: `FAL.ai ${res.status}: ${text.slice(0, 200)}` };

  let json: { images?: Array<{ url: string }> };
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "Reponse FAL invalide" };
  }

  const url = json.images?.[0]?.url;
  if (!url) return { error: "FAL n'a pas retourne d'image" };
  return { url };
}

async function uploadToStorage(
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

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const adminToken = Deno.env.get("TEMPLATE_STYLE_ADMIN_TOKEN");
    const providedToken = req.headers.get("x-template-admin-token");
    if (!adminToken || !providedToken || providedToken !== adminToken) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const falKey = Deno.env.get("FAL_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!falKey || !supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "Configuration manquante" }, 500);
    }

    let body: GenerateRequestBody = {};
    try {
      body = (await req.json()) as GenerateRequestBody;
    } catch {
      body = {};
    }

    const requestedTargets = Array.isArray(body.targets)
      ? body.targets.map((x) => String(x).trim()).filter(Boolean)
      : [];

    const definitionsToGenerate =
      requestedTargets.length > 0
        ? DEFINITIONS.filter((item) =>
            requestedTargets.includes(`${item.style}.${item.type}`)
          )
        : DEFINITIONS;

    if (requestedTargets.length > 0 && definitionsToGenerate.length === 0) {
      return jsonResponse(
        {
          error: "Aucune cible valide",
          details:
            "Utilisez le format style.type, ex: manga.scene, webtoon-coreen.scene",
        },
        400
      );
    }

    const output: Record<string, string> = {};

    for (const item of definitionsToGenerate) {
      const generated = await generateImage(item.prompt, falKey);
      if ("error" in generated) {
        return jsonResponse(
          {
            error: "Generation interrompue",
            details: generated.error,
            failed_on: `${item.style}/${item.type}`,
          },
          502
        );
      }

      const storagePath = `template-style-img/${item.style}/${item.type}.png`;
      const publicUrl = await uploadToStorage(
        generated.url,
        storagePath,
        supabaseUrl,
        serviceKey
      );

      if (!publicUrl) {
        return jsonResponse(
          {
            error: "Upload storage echoue",
            failed_on: `${item.style}/${item.type}`,
          },
          502
        );
      }

      output[`${item.style}.${item.type}`] = publicUrl;
    }

    return jsonResponse({ success: true, templates: output }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: "Erreur serveur", details: msg }, 500);
  }
});
