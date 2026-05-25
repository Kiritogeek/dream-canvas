// Edge Function: Composition visuelle IA d'un chapitre webtoon
// Secrets requis :
//   - GEMINI_API_KEY
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - SUPABASE_ANON_KEY
//   - ALLOWED_ORIGIN
//
// Reçoit les panels_outline (blocs visuels du découpage IA),
// appelle Gemini pour composer la mise en page du canvas unique (800px × H),
// puis upsert le résultat dans chapter_canvases.

import { getCorsHeaders, makeJsonResponse, isAllowedOriginConfigured } from "../_shared/cors.ts";
import {
  COMPOSE_LAYOUT_SYSTEM_PROMPT,
  buildComposeLayoutPrompt,
  type PanelOutlineBlock,
} from "./system-prompts/compose-layout.ts";

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const AI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const AI_MODEL = "gemini-2.5-flash";
const AI_FALLBACK_MODEL = "gemini-2.5-flash-lite";
const AI_TIMEOUT_MS = 90_000;
const AI_MAX_OUTPUT_TOKENS = 16_384;

const GAP_BETWEEN_SCENES_PX = 80;
const MIN_CANVAS_HEIGHT = 5_000;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type AIResult =
  | { text: string; modelUsed: string }
  | { error: string; status?: number; rateLimited?: boolean };

interface AIOutputBlock {
  source_index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: string;
}

interface AIOutputBubble {
  type?: string;
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface AIOutputScene {
  panel_number: number;
  composition_type: string;
  rationale?: string;
  section_height: number;
  blocks: AIOutputBlock[];
  speech_bubbles?: AIOutputBubble[];
}

interface AIComposition {
  scenes: AIOutputScene[];
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function clip(value: string, max = 300): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
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
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey || serviceKey,
      },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return typeof user?.id === "string" ? user.id : null;
  } catch {
    return null;
  }
}

async function callAIOnce(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<AIResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: AI_MAX_OUTPUT_TOKENS,
        top_p: 0.6,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error("[compose-chapter-layout] Gemini error", {
        model,
        status: res.status,
        raw: clip(raw),
      });
      return {
        error: `Gemini erreur ${res.status}: ${clip(raw, 200)}`,
        status: res.status,
        rateLimited: res.status === 429 || res.status === 503,
      };
    }
    let parsed: { choices?: Array<{ message?: { content?: string } }> };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { error: "Réponse invalide de Gemini" };
    }
    const text = parsed.choices?.[0]?.message?.content?.trim();
    if (!text) return { error: "Gemini n'a pas retourné de texte" };
    return { text, modelUsed: model };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Timeout — la composition a pris trop de temps." };
    }
    return { error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

// ═══════════════════════════════════════════════════════════════
// TRANSFORMATION : positions relatives → absolues
// ═══════════════════════════════════════════════════════════════

function processComposition(
  scenes: AIOutputScene[],
  panelsOutline: PanelOutlineBlock[]
): { blocks: object[]; speechBubbles: object[]; panelHeight: number } {
  const blocks: object[] = [];
  let yOffset = 0;

  for (const scene of scenes) {
    const sectionHeight = Math.max(600, Math.min(5000, scene.section_height ?? 1500));

    for (const b of scene.blocks ?? []) {
      const sourceBlock = panelsOutline[b.source_index];
      const promptText = sourceBlock?.description ?? "";
      const dialogueText = sourceBlock?.text_excerpt?.trim() || null;

      blocks.push({
        id: crypto.randomUUID(),
        x: Math.max(0, Math.min(800, b.x ?? 0)),
        y: yOffset + Math.max(0, b.y ?? 0),
        width: Math.max(100, Math.min(800, b.width ?? 800)),
        height: Math.max(100, Math.min(5000, b.height ?? 600)),
        shape: b.shape && b.shape !== "rect" ? b.shape : undefined,
        prompt: promptText,
        dialogue_text: dialogueText,
        asset_refs: [],
        image_url: null,
      });
    }

    yOffset += sectionHeight + GAP_BETWEEN_SCENES_PX;
  }

  return {
    blocks,
    speechBubbles: [],
    panelHeight: Math.max(MIN_CANVAS_HEIGHT, yOffset),
  };
}

// ═══════════════════════════════════════════════════════════════
// SUPABASE REST API
// ═══════════════════════════════════════════════════════════════

async function getOrCreateCanvas(
  chapterId: string,
  userId: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    Prefer: "return=representation",
  };

  const fetchRes = await fetch(
    `${supabaseUrl}/rest/v1/chapter_canvases?chapter_id=eq.${chapterId}&order=panel_number.asc&limit=1`,
    { headers }
  );
  if (!fetchRes.ok) {
    console.error("[compose-chapter-layout] Fetch canvas failed", fetchRes.status);
    return null;
  }

  const existing = await fetchRes.json();
  if (Array.isArray(existing) && existing.length > 0) {
    return existing[0].id as string;
  }

  const createRes = await fetch(`${supabaseUrl}/rest/v1/chapter_canvases`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      chapter_id: chapterId,
      user_id: userId,
      panel_number: 1,
      layout: { blocks: [], panelHeight: MIN_CANVAS_HEIGHT },
      speech_bubbles: [],
      color_blocks: [],
    }),
  });

  if (!createRes.ok) {
    console.error("[compose-chapter-layout] Create canvas failed", createRes.status);
    return null;
  }

  const created = await createRes.json();
  return (Array.isArray(created) ? created[0]?.id : created?.id) as string | null;
}

async function updateCanvas(
  canvasId: string,
  layout: object,
  speechBubbles: object[],
  supabaseUrl: string,
  serviceKey: string
): Promise<boolean> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/chapter_canvases?id=eq.${canvasId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ layout, speech_bubbles: speechBubbles }),
    }
  );
  return res.ok;
}

// ═══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const json = makeJsonResponse(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }

  if (!isAllowedOriginConfigured()) {
    return json({ error: "ALLOWED_ORIGIN non configuré" }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

  if (!geminiKey) return json({ error: "GEMINI_API_KEY manquant" }, 500);

  const authHeader = req.headers.get("authorization") ?? "";
  const userId = await verifyUserFromToken(authHeader, supabaseUrl, serviceKey);
  if (!userId) return json({ error: "Non authentifié" }, 401);

  let body: {
    chapter_id?: string;
    panels_outline?: PanelOutlineBlock[];
    project_style?: string;
    characters?: string[];
    chapter_title?: string;
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: "Corps de requête invalide" }, 400);
  }

  const { chapter_id, panels_outline, project_style, characters, chapter_title } = body;

  if (!chapter_id) return json({ error: "chapter_id requis" }, 400);
  if (!Array.isArray(panels_outline) || panels_outline.length === 0) {
    return json({ error: "panels_outline non vide requis (lancer le Découpage IA d'abord)" }, 400);
  }

  // ── Appel IA ─────────────────────────────────────────────────
  const userPrompt = buildComposeLayoutPrompt({
    panelsOutline: panels_outline,
    projectStyle: project_style,
    characters,
    chapterTitle: chapter_title,
  });

  let aiResult = await callAIOnce(AI_MODEL, COMPOSE_LAYOUT_SYSTEM_PROMPT, userPrompt, geminiKey);

  if ("rateLimited" in aiResult && aiResult.rateLimited) {
    console.warn("[compose-chapter-layout] Rate limit — fallback vers", AI_FALLBACK_MODEL);
    aiResult = await callAIOnce(AI_FALLBACK_MODEL, COMPOSE_LAYOUT_SYSTEM_PROMPT, userPrompt, geminiKey);
  }

  if ("error" in aiResult) {
    return json({ error: aiResult.error }, aiResult.status ?? 500);
  }

  // ── Parse réponse ────────────────────────────────────────────
  let aiComposition: AIComposition;
  try {
    aiComposition = JSON.parse(aiResult.text);
    if (!Array.isArray(aiComposition?.scenes) || aiComposition.scenes.length === 0) {
      throw new Error("Aucune scène dans la réponse IA");
    }
  } catch (err) {
    console.error("[compose-chapter-layout] Parse error", {
      raw: clip(aiResult.text, 500),
      err: err instanceof Error ? err.message : String(err),
    });
    return json({ error: "Réponse IA invalide — réessaie." }, 500);
  }

  // ── Transformation positions relatives → absolues ─────────────
  const { blocks, speechBubbles, panelHeight } = processComposition(
    aiComposition.scenes,
    panels_outline
  );

  const layout = { blocks, panelHeight };

  // ── Persistance ──────────────────────────────────────────────
  const canvasId = await getOrCreateCanvas(chapter_id, userId, supabaseUrl, serviceKey);
  if (!canvasId) {
    return json({ error: "Impossible de créer ou trouver le canvas du chapitre" }, 500);
  }

  const saved = await updateCanvas(canvasId, layout, speechBubbles, supabaseUrl, serviceKey);
  if (!saved) {
    return json({ error: "Erreur lors de la sauvegarde de la composition" }, 500);
  }

  return json(
    {
      success: true,
      canvas_id: canvasId,
      blocks_count: blocks.length,
      bubbles_count: speechBubbles.length,
      panel_height: panelHeight,
      model_used: aiResult.modelUsed,
    },
    200
  );
});
