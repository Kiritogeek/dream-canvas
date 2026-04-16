declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const FAL_IMAGE_EDIT = "https://fal.run/fal-ai/flux-2-pro/edit";
const BUCKET = "dreamweave";
const FAL_TIMEOUT_MS = 120_000;

function corsHeaders() {
  const origin = Deno.env.get("ALLOWED_ORIGIN")?.trim();
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-template-admin-token",
  };
}

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithReference(prompt: string, referenceImageUrl: string, falKey: string) {
  const res = await fetchWithTimeout(
    FAL_IMAGE_EDIT,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${falKey}`,
      },
      body: JSON.stringify({
        prompt,
        image_urls: [referenceImageUrl],
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
  if (!res.ok) return { error: `FAL ${res.status}: ${text.slice(0, 180)}` };

  try {
    const parsed = JSON.parse(text) as { images?: Array<{ url: string }> };
    const url = parsed.images?.[0]?.url;
    return url ? { url } : { error: "Aucune image retournée" };
  } catch {
    return { error: "Réponse FAL invalide" };
  }
}

async function uploadPublicImage(
  sourceUrl: string,
  destinationPath: string,
  supabaseUrl: string,
  serviceRoleKey: string
) {
  const download = await fetchWithTimeout(sourceUrl, {}, 30_000);
  if (!download.ok) return null;
  const blob = await download.blob();

  const form = new FormData();
  form.append("file", blob, "image.png");

  const upload = await fetch(
    `${supabaseUrl}/storage/v1/object/${BUCKET}/${destinationPath}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "x-upsert": "true",
      },
      body: form,
    }
  );
  if (!upload.ok) return null;

  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${destinationPath}?v=${Date.now()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const adminToken = Deno.env.get("TEMPLATE_STYLE_ADMIN_TOKEN");
  const providedToken = req.headers.get("x-template-admin-token");
  if (!adminToken || !providedToken || providedToken !== adminToken) {
    return json({ error: "Forbidden" }, 403);
  }

  const falKey = Deno.env.get("FAL_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!falKey || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Configuration manquante" }, 500);
  }

  let referenceImageUrl = "";
  let startIndex = 0;
  let countFromBody: number | undefined = undefined;
  try {
    const body = (await req.json()) as {
      reference_image_url?: string;
      start_index?: number;
      count?: number;
    };
    referenceImageUrl = body.reference_image_url?.trim() ?? "";
    startIndex = typeof body.start_index === "number" ? body.start_index : 0;
    countFromBody = typeof body.count === "number" ? body.count : undefined;
  } catch {
    return json({ error: "Body JSON invalide" }, 400);
  }
  if (!referenceImageUrl) return json({ error: "reference_image_url requis" }, 400);

  // 12 images = 3 styles (Manga/Coréen/Chinois) x 3 types (Personnages/Décors/Objets)
  // + une variante supplémentaire sur "Objets" (pour plus de diversité sans faire exploser le coût).
  const baseNoText =
    "NO text, NO letters, NO speech bubbles with readable content, NO watermark.";

  const prompts = [
    // Manga - Décors (0)
    "Premium manga style webtoon background example. Quiet Tokyo side street after rain, empty scene, no characters, no objects in close-up, strong one-point perspective, authentic black ink linework, refined screentone shadows, dramatic puddle reflections, cinematic depth, unmistakable Japanese manga decor. Full-bleed edge-to-edge artwork, no white margins. " +
      baseNoText,
    // Manga - Décors (1)
    "Premium manga style webtoon background example. Narrow covered market arcade in Osaka at night, no people, black-and-white ink with heavy screentones, dramatic overhead lamps, wet floor reflections, deep tunnel perspective, hanging cables and shutters, unmistakable Japanese manga environment. Full-bleed edge-to-edge artwork, no white margins. " +
      baseNoText,
    // Manga - Décors (2)
    "Premium manga style webtoon background example. Dramatic Japanese city rooftop at sunset, layered buildings, cables, signs as abstract shapes without readable text, strong black ink linework, refined screentone shadows, cinematic depth, no characters. Full-bleed composition, no white margins, authentic manga decor. " +
      baseNoText,

    // Coréen - Personnages (1)
    "Premium Korean webtoon character example. Clean full-color digital portrait, glossy hair lighting, expressive cinematic eyes, modern fashion details, balanced pastel-but-rich palette. Full-bleed panel snapshot, subject edge-to-edge, no white margins. " +
      baseNoText,
    // Coréen - Décors (1)
    "Premium Korean webtoon background example. Quiet riverside park in Seoul during spring morning, cherry blossom petals in the air, pastel sky, elegant bridge, clean polished digital painting, wide open composition, no characters, no close-up objects. Full-bleed edge-to-edge, no white margins. " +
      baseNoText,
    // Coréen - Personnages (2)
    "Premium manga style character example. Dynamic manga hero portrait, black-and-white ink drawing with screentones, intense eyes, expressive hair, clean silhouette, strong linework, authentic Japanese manga energy. Full-bleed edge-to-edge portrait, no white margins. " +
      baseNoText,

    // Chinois - Personnages (1)
    "Premium Chinese manhua character example. Warrior hero portrait, ornate costume, intense expression, vivid cinematic colors with tasteful texture, clear silhouette. Full-bleed panel snapshot, edge-to-edge, no white margins. " +
      baseNoText,
    // Chinois - Décors (1)
    "Premium Chinese manhua background example. Ancient mountain temple courtyard, epic atmosphere, rich architectural ornament details, dramatic lighting, no characters. Full-bleed edge-to-edge, no white margins. " +
      baseNoText,
    // Coréen - Décors (2)
    "Premium Korean webtoon background example. Modern rooftop garden above Seoul at sunset, glass railings, city skyline in the distance, soft orange to lavender gradient sky, premium full-color webtoon rendering, airy composition, no characters, no close-up props. Full-bleed webtoon decor, no white margins. " +
      baseNoText,

    // Manga - Objets (2)
    "Premium manga style webtoon object example variant 2. Vintage instant camera on a cluttered artist desk, top-down shot, strong black ink linework, rich screentones, scattered film sheets and pens, authentic manga still life, no characters. Full-bleed edge-to-edge, no white margins. " +
      baseNoText,
    // Coréen - Objets (2)
    "Premium Korean webtoon object example variant 2. Elegant dessert display with strawberry cake and iced drink in a trendy cafe, soft bloom light, glossy full-color webtoon rendering, front three-quarter angle, premium lifestyle composition, no characters. Full-bleed edge-to-edge, no white margins. " +
      baseNoText,
    // Chinois - Objets (2)
    "Premium Chinese manhua object example variant 2. Ancient observatory interior with bronze astrolabe, scroll racks, moonlight beams through circular window, rich manhua colors, ornate shadows, atmospheric environment-focused composition, no characters. Full-bleed edge-to-edge, no white margins. " +
      baseNoText,
  ];

  const requestedCount = countFromBody ?? prompts.length;
  const safeStart = Math.max(0, Math.floor(startIndex));
  const safeCount = Math.max(
    1,
    Math.min(prompts.length - safeStart, Math.floor(requestedCount))
  );
  const end = safeStart + safeCount;

  const uploaded: string[] = [];
  for (let i = safeStart; i < end; i++) {
    const generated = await generateWithReference(prompts[i], referenceImageUrl, falKey);
    if ("error" in generated) return json({ error: generated.error, failed_on: i + 1 }, 502);

    const storagePath = `landing-showcase/card-${i + 1}.png`;
    const uploadedUrl = await uploadPublicImage(generated.url, storagePath, supabaseUrl, serviceRoleKey);
    if (!uploadedUrl)
      return json(
        { error: "Upload storage échoué", failed_on: i + 1 },
        502
      );
    uploaded.push(uploadedUrl);
  }

  return json({ success: true, images: uploaded });
});

