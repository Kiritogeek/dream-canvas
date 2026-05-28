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

// Gap FALLBACK si l'IA ne fournit pas gap_after — normalement l'IA le calcule
const GAP_FALLBACK_PX = 400;
const GAP_MIN_PX = 150;
const GAP_MAX_PX = 1000;
const MIN_CANVAS_HEIGHT = 5_000;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type AIResult =
  | { text: string; modelUsed: string }
  | { error: string; status?: number; rateLimited?: boolean };

// L'IA ne fournit QUE le groupement, la composition et l'intensité.
// Le serveur calcule toute la géométrie (positions, tailles, shapes).
interface AISimpleScene {
  source_indices: number[];   // indices des blocs dans panels_outline
  composition: string;        // A–N
  gap_after?: number;         // espace blanc après cette scène (px)
  height_hint?: string;       // strip | compact | standard | grand | splash
  rationale?: string;
}

interface AIComposition {
  scenes: AISimpleScene[];
}

// ─── Géométrie serveur ────────────────────────────────────────────

type HeightHint = "strip" | "compact" | "standard" | "grand" | "splash";

const HINT_PX: Record<HeightHint, number> = {
  strip:    280,
  compact:  550,
  standard: 900,
  grand:   1400,
  splash:  2200,
};

interface PositionedBlock {
  source_index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: string;
}

// ── Hauteur par contenu ────────────────────────────────────────
// Chaque bloc obtient une hauteur adaptée à CE qu'il montre, pas au hint de scène.
function inferBlockHeight(description: string, baseH: number): number {
  const d = description.toLowerCase();

  // Plans ultra-serrés → strip
  if (/extrême gros plan|ultra gros|très gros plan/.test(d))
    return 280;

  // Gros plans / détails → compact
  if (/gros plan|zoom|détail|yeux|regard|main|doigt|pied|lèvre|plante|fleur|insecte|larme|sueur|cicatrice|bague|symbole/.test(d))
    return Math.min(520, baseH);

  // Plans larges / panoramas → grand
  if (/panorama|vue d'ensemble|plan large|plan général|plan d'ensemble|ville entière|paysage|horizon|immense|vaste|foule|armée|ciel|montagne|mer|forêt entière/.test(d))
    return Math.max(1400, baseH);

  // Scènes d'arrivée, révélation de lieu → grand
  if (/donjon|entrée|arrivée|découvrent le|bâtiment|château|salle immense|couloir|portail/.test(d))
    return Math.max(1100, baseH);

  return baseH;
}

// Largeurs variées pour E — ni mécaniques ni répétitives
const E_WIDTH_PATTERNS: Array<{ x: number; width: number }> = [
  { x: 0,   width: 800 },  // plein
  { x: 110, width: 580 },  // indent gauche
  { x: 0,   width: 640 },  // légèrement réduit gauche
  { x: 160, width: 640 },  // indent droite
  { x: 0,   width: 800 },  // plein
  { x: 60,  width: 680 },  // légèrement centré
];

function fallbackLayout(
  indices: number[],
  h: number,
  descriptions: string[] = []
): { positioned: PositionedBlock[]; sectionHeight: number } {
  const gap = 120;
  const positioned: PositionedBlock[] = [];
  let cy = 0;
  for (let i = 0; i < indices.length; i++) {
    const bh = Math.max(500, Math.min(1200, inferBlockHeight(descriptions[i] ?? "", h)));
    positioned.push({ source_index: indices[i], x: 0, y: cy, width: 800, height: bh });
    cy += bh + gap;
  }
  return { positioned, sectionHeight: cy - gap };
}

function computeSceneLayout(
  composition: string,
  indices: number[],
  hint: HeightHint,
  descriptions: string[] = []   // descriptions[i] correspond à indices[i]
): { positioned: PositionedBlock[]; sectionHeight: number } {
  const baseH = HINT_PX[hint] ?? 900;
  const c = composition.toUpperCase();
  const n = indices.length;
  if (n === 0) return { positioned: [], sectionHeight: 0 };

  switch (c) {
    case "A": { // Splash — pleine largeur
      const ah = Math.max(1200, inferBlockHeight(descriptions[0] ?? "", baseH));
      return {
        positioned: [{ source_index: indices[0], x: 0, y: 0, width: 800, height: ah }],
        sectionHeight: ah,
      };
    }

    case "B": { // Isolement centré — blanc massif autour
      const bh = Math.max(500, Math.min(800, inferBlockHeight(descriptions[0] ?? "", 600)));
      return {
        positioned: [{ source_index: indices[0], x: 160, y: 0, width: 480, height: bh }],
        sectionHeight: bh,
      };
    }

    case "C": { // Séquence rapide — serrés, hauteurs légèrement variées
      const positioned: PositionedBlock[] = [];
      let cy = 0;
      for (let i = 0; i < n; i++) {
        const bh = inferBlockHeight(descriptions[i] ?? "", 400 + (i % 2) * 60);
        const clamped = Math.max(320, Math.min(560, bh));
        positioned.push({ source_index: indices[i], x: 0, y: cy, width: 800, height: clamped });
        cy += clamped + 15;
      }
      return { positioned, sectionHeight: cy - 15 };
    }

    case "D": { // Face-à-face — largeurs reflétant l'importance narrative
      if (n < 2) return fallbackLayout(indices, baseH, descriptions);
      const h0 = Math.max(600, Math.min(1100, inferBlockHeight(descriptions[0] ?? "", baseH)));
      const h1 = Math.max(600, Math.min(1100, inferBlockHeight(descriptions[1] ?? "", baseH)));
      const maxH = Math.max(h0, h1);
      // Le plus grand panel prend 520px, l'autre 280px
      const w0 = h0 >= h1 ? 520 : 280;
      const w1 = 800 - w0;
      return {
        positioned: [
          { source_index: indices[0], x: 0,  y: 0, width: w0, height: maxH },
          { source_index: indices[1], x: w0, y: 0, width: w1, height: maxH },
        ],
        sectionHeight: maxH,
      };
    }

    case "E": { // Dialogue — hauteurs par contenu, largeurs non-mécaniques
      const positioned: PositionedBlock[] = [];
      let cy = 0;
      for (let i = 0; i < n; i++) {
        const bh = Math.max(550, Math.min(1300, inferBlockHeight(descriptions[i] ?? "", baseH)));
        const pat = E_WIDTH_PATTERNS[i % E_WIDTH_PATTERNS.length];
        positioned.push({ source_index: indices[i], x: pat.x, y: cy, width: pat.width, height: bh });
        cy += bh + 120;
      }
      return { positioned, sectionHeight: cy - 120 };
    }

    case "F": { // Établissement — grand décor + réaction centrée
      if (n < 2) return fallbackLayout(indices, baseH, descriptions);
      const decorH = Math.max(1100, Math.min(1900, inferBlockHeight(descriptions[0] ?? "", baseH)));
      const reactH = Math.max(500, Math.min(800, inferBlockHeight(descriptions[1] ?? "", 650)));
      return {
        positioned: [
          { source_index: indices[0], x: 0,   y: 0,            width: 800, height: decorH },
          { source_index: indices[1], x: 110, y: decorH + 150, width: 580, height: reactH },
        ],
        sectionHeight: decorH + 150 + reactH,
      };
    }

    case "G": { // Réplique isolée — panel réduit centré
      const bh = Math.max(400, Math.min(700, inferBlockHeight(descriptions[0] ?? "", 550)));
      return {
        positioned: [{ source_index: indices[0], x: 100, y: 0, width: 600, height: bh }],
        sectionHeight: bh,
      };
    }

    case "H": { // Transition — mini panel centré
      return {
        positioned: [{ source_index: indices[0], x: 200, y: 0, width: 400, height: 380 }],
        sectionHeight: 380,
      };
    }

    case "I": { // Diagonale latérale — collision horizontale
      if (n < 2) return fallbackLayout(indices, baseH, descriptions);
      const bh = Math.max(800, Math.min(1300, baseH));
      return {
        positioned: [
          { source_index: indices[0], x: 0,   y: 0, width: 380, height: bh, shape: "diagonal-r" },
          { source_index: indices[1], x: 380, y: 0, width: 420, height: bh, shape: "diagonal-l" },
        ],
        sectionHeight: bh,
      };
    }

    case "J": { // Incrustation — fond + petit chevauchant
      if (n < 2) return fallbackLayout(indices, baseH, descriptions);
      const fondH = Math.max(1200, Math.min(2000, inferBlockHeight(descriptions[0] ?? "", baseH)));
      return {
        positioned: [
          { source_index: indices[0], x: 0,   y: 0,   width: 800, height: fondH },
          { source_index: indices[1], x: 430, y: 200, width: 300, height: 400 },
        ],
        sectionHeight: fondH,
      };
    }

    case "K": { // Flash séquence — ultra-fins alternés
      const positioned: PositionedBlock[] = [];
      let cy = 0;
      for (let i = 0; i < Math.min(n, 4); i++) {
        positioned.push({
          source_index: indices[i],
          x: 0, y: cy, width: 800, height: 260,
          shape: i % 2 === 0 ? "diagonal-r" : "diagonal-l",
        });
        cy += 260;
      }
      return { positioned, sectionHeight: cy };
    }

    case "L": { // Strip + Grand — signature SL (300px tension interne)
      if (n < 2) return fallbackLayout(indices, baseH, descriptions);
      const stripH = Math.max(240, Math.min(350, inferBlockHeight(descriptions[0] ?? "", 280)));
      const grandH = Math.max(1000, Math.min(1900, inferBlockHeight(descriptions[1] ?? "", baseH)));
      return {
        positioned: [
          { source_index: indices[0], x: 0, y: 0,            width: 800, height: stripH },
          { source_index: indices[1], x: 0, y: stripH + 300, width: 800, height: grandH },
        ],
        sectionHeight: stripH + 300 + grandH,
      };
    }

    case "M": { // Triptyque — 3 côte à côte, hauteurs indépendantes
      if (n < 3) return fallbackLayout(indices, baseH, descriptions);
      const heights = descriptions.slice(0, 3).map(d => Math.max(450, Math.min(950, inferBlockHeight(d, baseH))));
      const maxH = Math.max(...heights);
      return {
        positioned: [
          { source_index: indices[0], x: 0,   y: maxH - heights[0], width: 260, height: heights[0] },
          { source_index: indices[1], x: 260, y: maxH - heights[1], width: 280, height: heights[1] },
          { source_index: indices[2], x: 540, y: maxH - heights[2], width: 260, height: heights[2] },
        ],
        sectionHeight: maxH,
      };
    }

    case "N": { // Diagonale verticale — attaque/contre-attaque jointifs
      if (n < 2) return fallbackLayout(indices, baseH, descriptions);
      const bh = Math.max(700, Math.min(1100, baseH));
      return {
        positioned: [
          { source_index: indices[0], x: 0, y: 0,  width: 800, height: bh, shape: "taper-r" },
          { source_index: indices[1], x: 0, y: bh, width: 800, height: bh, shape: "taper-l" },
        ],
        sectionHeight: bh * 2,
      };
    }

    case "O": { // Panel ancré GAUCHE — blanc massif à droite
      const bh = Math.max(450, Math.min(900, inferBlockHeight(descriptions[0] ?? "", 650)));
      const bw = Math.round(bh * 0.75); // ratio carré-ish, max 560
      const w = Math.min(560, bw);
      return {
        positioned: [{ source_index: indices[0], x: 0, y: 0, width: w, height: bh }],
        sectionHeight: bh,
      };
    }

    case "P": { // Panel ancré DROITE — blanc massif à gauche
      const bh = Math.max(450, Math.min(900, inferBlockHeight(descriptions[0] ?? "", 650)));
      const w = Math.min(560, Math.round(bh * 0.75));
      return {
        positioned: [{ source_index: indices[0], x: 800 - w, y: 0, width: w, height: bh }],
        sectionHeight: bh,
      };
    }

    default:
      return fallbackLayout(indices, baseH, descriptions);
  }
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
// VALIDATION & NORMALISATION — avant de placer les blocs
// ═══════════════════════════════════════════════════════════════

// Blocs max par composition. Au-delà → on coupe et redistribue.
const MAX_BLOCKS_PER_COMP: Record<string, number> = {
  A: 1, B: 1, G: 1, H: 1, O: 1, P: 1,   // 1 bloc uniquement
  D: 2, I: 2, J: 2, L: 2, N: 2,          // exactement 2
  M: 3,                                    // exactement 3
  C: 5, E: 5,                              // empilés libres
  K: 4,                                    // flash limité à 4
};

function normalizeScenes(
  scenes: AISimpleScene[],
  totalBlocks: number
): AISimpleScene[] {
  const result: AISimpleScene[] = [];
  const overflow: number[] = [];
  let kSeen = 0;

  for (const scene of scenes) {
    const comp = (scene.composition ?? "E").toUpperCase();

    // K : max 1 par chapitre, max 4 blocs
    if (comp === "K") {
      if (kSeen >= 1) {
        scene.composition = "E";
      } else {
        kSeen++;
        // Plafonner K à 4 blocs
        if ((scene.source_indices ?? []).length > 4) {
          overflow.push(...scene.source_indices.slice(4));
          scene.source_indices = scene.source_indices.slice(0, 4);
          console.warn("[compose] Scène K tronquée à 4 blocs");
        }
      }
    }

    const effectiveComp = (scene.composition ?? "E").toUpperCase();
    const maxB = MAX_BLOCKS_PER_COMP[effectiveComp] ?? 5;
    // Trier les source_indices en ordre croissant = ordre narratif garanti
    const indices = [...(scene.source_indices ?? [])].sort((a, b) => a - b);
    scene.source_indices = indices;

    if (indices.length > maxB) {
      overflow.push(...indices.slice(maxB));
      scene.source_indices = indices.slice(0, maxB);
      console.warn(`[compose] Scène ${effectiveComp} tronquée de ${indices.length} → ${maxB} blocs`);
    }

    if ((scene.source_indices ?? []).length > 0) {
      result.push(scene);
    }
  }

  // Redistribuer les blocs overflow en scènes E
  while (overflow.length > 0) {
    const chunk = overflow.splice(0, 3);
    console.warn(`[compose] Redistribution overflow : blocs [${chunk.join(",")}] → E`);
    result.push({
      source_indices: chunk,
      composition: "E",
      gap_after: 400,
      height_hint: "standard",
      rationale: "redistribution automatique",
    });
  }

  // Si l'IA a tout groupé en < 2 scènes pour ≥ 4 blocs → log warning
  if (result.length < 2 && totalBlocks >= 4) {
    console.warn(`[compose] Seulement ${result.length} scène(s) pour ${totalBlocks} blocs — vérifier le prompt`);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// COMPOSITION : le serveur place tous les blocs
// L'IA fournit uniquement groupement + type + gap + height_hint
// ═══════════════════════════════════════════════════════════════

function processComposition(
  scenes: AISimpleScene[],
  panelsOutline: PanelOutlineBlock[],
  existingBlocks?: Array<{ prompt?: string | null; image_url?: string | null; name?: string | null }>
): { blocks: object[]; speechBubbles: object[]; panelHeight: number } {
  // Index des images existantes par prompt (recomposition) — préserve le travail déjà généré
  const existingImageByPrompt = new Map<string, string>();
  for (const eb of existingBlocks ?? []) {
    if (eb.image_url && eb.prompt) {
      existingImageByPrompt.set(eb.prompt.trim(), eb.image_url);
    }
  }
  const blocks: object[] = [];
  const usedSourceIndices = new Set<number>();
  let yOffset = 0;

  for (const scene of scenes) {
    // Filtrer les source_indices invalides ou déjà utilisés
    const indices = (scene.source_indices ?? []).filter(
      (idx) => typeof idx === "number" && idx >= 0 && idx < panelsOutline.length && !usedSourceIndices.has(idx)
    );

    if (indices.length === 0) continue;

    const hint: HeightHint = (
      ["strip", "compact", "standard", "grand", "splash"].includes(scene.height_hint ?? "")
        ? (scene.height_hint as HeightHint)
        : "standard"
    );

    const descriptions = indices.map(idx => panelsOutline[idx]?.description ?? "");

    const { positioned, sectionHeight } = computeSceneLayout(
      scene.composition ?? "E",
      indices,
      hint,
      descriptions
    );

    for (const pb of positioned) {
      if (usedSourceIndices.has(pb.source_index)) continue;
      usedSourceIndices.add(pb.source_index);

      const sourceBlock = panelsOutline[pb.source_index];
      const promptText = sourceBlock?.description ?? "";
      const blockName = sourceBlock
        ? (sourceBlock.block_number && sourceBlock.block_number > 1)
          ? `Case ${sourceBlock.panel_number}.${sourceBlock.block_number}`
          : `Case ${sourceBlock.panel_number}`
        : null;
      const restoredImage = existingImageByPrompt.get(promptText.trim()) ?? null;

      blocks.push({
        id: crypto.randomUUID(),
        x: pb.x,
        y: yOffset + pb.y,
        width: pb.width,
        height: pb.height,
        shape: pb.shape ?? undefined,
        name: blockName,
        prompt: promptText,
        dialogue_text: sourceBlock?.text_excerpt?.trim() || null,
        asset_refs: [],
        image_url: restoredImage,
        scene_type: (sourceBlock as { scene_type?: string })?.scene_type ?? null,
        effects: (sourceBlock as { effects?: string[] })?.effects ?? null,
        shot_type: (sourceBlock as { shot_type?: string })?.shot_type ?? null,
      });
    }

    const rawGap = scene.gap_after;
    const gapAfter = rawGap != null
      ? Math.max(GAP_MIN_PX, Math.min(GAP_MAX_PX, rawGap))
      : GAP_FALLBACK_PX;
    yOffset += sectionHeight + gapAfter;
  }

  // Réparation : source_index non couverts → ajout en fin de canvas
  for (let i = 0; i < panelsOutline.length; i++) {
    if (!usedSourceIndices.has(i)) {
      const sourceBlock = panelsOutline[i];
      console.warn(`[compose] source_index ${i} manquant — bloc par défaut ajouté`);
      const promptText = sourceBlock?.description ?? "";
      const blockName = sourceBlock
        ? (sourceBlock.block_number && sourceBlock.block_number > 1)
          ? `Case ${sourceBlock.panel_number}.${sourceBlock.block_number}`
          : `Case ${sourceBlock.panel_number}`
        : null;
      const restoredImage = existingImageByPrompt.get(promptText.trim()) ?? null;
      blocks.push({
        id: crypto.randomUUID(),
        x: 0, y: yOffset,
        width: 800, height: 850,
        shape: undefined,
        name: blockName,
        prompt: promptText,
        dialogue_text: sourceBlock?.text_excerpt?.trim() || null,
        asset_refs: [], image_url: restoredImage,
        scene_type: (sourceBlock as { scene_type?: string })?.scene_type ?? null,
        effects: (sourceBlock as { effects?: string[] })?.effects ?? null,
        shot_type: (sourceBlock as { shot_type?: string })?.shot_type ?? null,
      });
      yOffset += 850 + GAP_FALLBACK_PX;
    }
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
    chapter_synopsis?: string;
    chapter_scenario_content?: string;
    /** Blocs existants du canvas (recomposition) — pour préserver les images générées */
    existing_blocks?: Array<{ prompt?: string | null; image_url?: string | null; name?: string | null }>;
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: "Corps de requête invalide" }, 400);
  }

  const { chapter_id, panels_outline, project_style, characters, chapter_title, chapter_synopsis, chapter_scenario_content, existing_blocks } = body;

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
    chapterSynopsis: chapter_synopsis,
    chapterScenarioContent: chapter_scenario_content,
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

  // ── Validation & normalisation avant placement ────────────────
  const normalizedScenes = normalizeScenes(aiComposition.scenes, panels_outline.length);

  // ── Placement serveur ─────────────────────────────────────────
  const { blocks, speechBubbles, panelHeight } = processComposition(
    normalizedScenes,
    panels_outline,
    Array.isArray(existing_blocks) ? existing_blocks : undefined
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
