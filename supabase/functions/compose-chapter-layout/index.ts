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
import { userOwnsChapter } from "../_shared/ownership.ts";
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
// CONSOMMATION DES CHAMPS DÉCOUPAGE v2 (dialogue, sfx, système…)
// Miroir de src/services/panels.ts (SFX_PRESETS) et src/types
// (SYSTEM_BLOCK_VARIANT_CONFIG). Doit rester aligné.
// ═══════════════════════════════════════════════════════════════

interface AbsRect { x: number; y: number; width: number; height: number }

interface SfxPresetStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  rotation: number;
  glowColor?: string;
  glowBlur?: number;
}

const SFX_PRESET_STYLE: Record<string, SfxPresetStyle> = {
  boom:   { fontFamily: "'Bangers', cursive",         fontSize: 72, color: "#ef4444", strokeColor: "#1a0a0a", strokeWidth: 6, rotation: -6, glowColor: "#f97316", glowBlur: 18 },
  slash:  { fontFamily: "'Bangers', cursive",         fontSize: 64, color: "#fbbf24", strokeColor: "#111111", strokeWidth: 6, rotation: 8 },
  crack:  { fontFamily: "'Black Ops One', cursive",   fontSize: 60, color: "#ffffff", strokeColor: "#111111", strokeWidth: 5, rotation: -3 },
  whoosh: { fontFamily: "'Luckiest Guy', cursive",    fontSize: 54, color: "#7dd3fc", strokeColor: "#0c1c3d", strokeWidth: 5, rotation: -14 },
  rumble: { fontFamily: "'Rock Salt', cursive",       fontSize: 42, color: "#c4b5fd", strokeColor: "#17102e", strokeWidth: 4, rotation: 0, glowColor: "#7c3aed", glowBlur: 14 },
  tap:    { fontFamily: "'Permanent Marker', cursive", fontSize: 36, color: "#e2e8f0", strokeColor: "#1e293b", strokeWidth: 3, rotation: 4 },
};

const SYSTEM_ACCENT: Record<string, { accent: string; defaultTitle: string }> = {
  notification: { accent: "#22d3ee", defaultTitle: "NOTIFICATION" },
  quest:        { accent: "#fbbf24", defaultTitle: "QUÊTE" },
  alert:        { accent: "#f87171", defaultTitle: "ALERTE" },
  levelup:      { accent: "#a78bfa", defaultTitle: "LEVEL UP !" },
  status:       { accent: "#60a5fa", defaultTitle: "STATUT" },
};

const VALID_BUBBLE_TYPES = new Set(["speech", "shout", "whisper", "thought", "narration"]);

const PANEL_W = 800;

function normName(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Personnages de la case (v2) ↔ assets du projet → ids pour asset_refs (pré-liaison). */
function matchAssetRefs(
  characters: string[] | undefined,
  description: string,
  assets: Array<{ id: string; name: string }>
): string[] {
  if (assets.length === 0) return [];
  const byNorm = new Map(assets.map((a) => [normName(a.name), a.id]));
  const ids = new Set<string>();
  for (const c of characters ?? []) {
    if (typeof c !== "string") continue;
    const id = byNorm.get(normName(c));
    if (id) ids.add(id);
  }
  // Fallback : scanner la description quand la case ne liste pas ses personnages.
  if (ids.size === 0 && description) {
    const dl = normName(description);
    for (const a of assets) {
      const n = normName(a.name);
      if (n.length >= 3 && dl.includes(n)) ids.add(a.id);
    }
  }
  return [...ids];
}

/** Bulles depuis dialogue[]/narration, positions ABSOLUES dans le rect du bloc. */
function buildBubblesForBlock(rect: AbsRect, source: PanelOutlineBlock): object[] {
  const out: object[] = [];
  const BW = 300, BH = 150, NW = 360, NH = 90, PAD = 16, STEP = 160;
  let cy = rect.y + PAD;

  if (typeof source.narration === "string" && source.narration.trim()) {
    out.push({
      id: crypto.randomUUID(),
      type: "narration",
      text: source.narration.trim(),
      position: { x: Math.max(0, Math.min(PANEL_W - NW, rect.x + PAD)), y: cy },
      width: NW, height: NH, character: null, origin: "compose",
    });
    cy += NH + 14;
  }

  const dialogue = Array.isArray(source.dialogue) ? source.dialogue : [];
  let side = 0;
  let prevChar: string | undefined;
  for (const d of dialogue) {
    if (!d || typeof d.text !== "string" || !d.text.trim()) continue;
    if (prevChar !== undefined && d.character && d.character !== prevChar) side = 1 - side;
    prevChar = d.character;
    const type = VALID_BUBBLE_TYPES.has(d.type ?? "") ? (d.type as string) : "speech";
    const rawX = side === 0 ? rect.x + PAD : rect.x + rect.width - BW - PAD;
    out.push({
      id: crypto.randomUUID(),
      type,
      text: d.text.trim(),
      position: { x: Math.max(0, Math.min(PANEL_W - BW, rawX)), y: cy },
      width: BW, height: BH, character: d.character ?? null, origin: "compose",
    });
    cy += STEP;
  }
  return out;
}

/** Bloc SFX posé sur le tiers supérieur du bloc image, alterné gauche/droite. */
function buildSfxForBlock(rect: AbsRect, sfx: { text?: string; preset?: string }, altRight: boolean): object | null {
  const text = (sfx.text ?? "").trim();
  if (!text) return null;
  const style = SFX_PRESET_STYLE[sfx.preset ?? "boom"] ?? SFX_PRESET_STYLE.boom;
  const W = 320, H = 140;
  const rawX = altRight ? rect.x + rect.width - W - 20 : rect.x + 20;
  return {
    id: crypto.randomUUID(),
    x: Math.max(0, Math.min(PANEL_W - W, rawX)),
    y: rect.y + Math.min(40, Math.round(rect.height * 0.12)),
    width: W, height: H,
    text,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    color: style.color,
    strokeColor: style.strokeColor,
    strokeWidth: style.strokeWidth,
    rotation: style.rotation,
    ...(style.glowColor ? { glowColor: style.glowColor, glowBlur: style.glowBlur ?? 12 } : {}),
    zIndex: 10,
    origin: "compose",
  };
}

/** Fenêtre système native, centrée dans le rect réservé (bandeau pleine largeur si body vide). */
function buildSystemForBlock(rect: AbsRect, sw: { variant?: string; title?: string; body?: string }): object {
  const variant = SYSTEM_ACCENT[sw.variant ?? ""] ? (sw.variant as string) : "notification";
  const cfg = SYSTEM_ACCENT[variant];
  const bodyEmpty = !sw.body || !sw.body.trim();
  const W = bodyEmpty ? 800 : 460;
  const H = bodyEmpty ? 90 : 240;
  const x = bodyEmpty ? 0 : Math.max(0, Math.min(PANEL_W - W, rect.x + Math.round((rect.width - W) / 2)));
  const y = rect.y + Math.max(0, Math.round((rect.height - H) / 2));
  return {
    id: crypto.randomUUID(),
    x, y, width: W, height: H,
    variant,
    title: (sw.title && sw.title.trim()) ? sw.title.trim() : cfg.defaultTitle,
    body: sw.body ?? "",
    accentColor: cfg.accent,
    showIcon: true,
    zIndex: 10,
    origin: "compose",
  };
}

// ═══════════════════════════════════════════════════════════════
// COMPOSITION : le serveur place tous les blocs
// L'IA fournit uniquement groupement + type + gap + height_hint
// ═══════════════════════════════════════════════════════════════

function processComposition(
  scenes: AISimpleScene[],
  panelsOutline: PanelOutlineBlock[],
  existingBlocks?: Array<{ prompt?: string | null; image_url?: string | null; name?: string | null }>,
  assets: Array<{ id: string; name: string }> = []
): { blocks: object[]; speechBubbles: object[]; sfxBlocks: object[]; systemBlocks: object[]; panelHeight: number } {
  // Index des images existantes par prompt (recomposition) — préserve le travail déjà généré
  const existingImageByPrompt = new Map<string, string>();
  for (const eb of existingBlocks ?? []) {
    if (eb.image_url && eb.prompt) {
      existingImageByPrompt.set(eb.prompt.trim(), eb.image_url);
    }
  }
  const blocks: object[] = [];
  const speechBubbles: object[] = [];
  const sfxBlocks: object[] = [];
  const systemBlocks: object[] = [];
  const usedSourceIndices = new Set<number>();
  let yOffset = 0;
  let sfxCount = 0;

  const blockNameFor = (b: PanelOutlineBlock | undefined): string | null =>
    b ? ((b.block_number && b.block_number > 1) ? `Case ${b.panel_number}.${b.block_number}` : `Case ${b.panel_number}`) : null;

  // Émet UNE source à sa position absolue : bloc système natif OU bloc image
  // (+ bulles depuis dialogue[]/narration + SFX). Partagé par la boucle
  // principale et la réparation.
  const emitSource = (source: PanelOutlineBlock | undefined, rect: AbsRect, shape: string | undefined) => {
    if (!source) return;
    // system_window → fenêtre native, pas d'image ni de crédit descriptif.
    if (source.system_window && (source.system_window.title || source.system_window.body || source.system_window.variant)) {
      systemBlocks.push(buildSystemForBlock(rect, source.system_window));
      return;
    }
    const promptText = source.description ?? "";
    const restoredImage = existingImageByPrompt.get(promptText.trim()) ?? null;
    const hasDialogue = Array.isArray(source.dialogue) &&
      source.dialogue.some((d) => d && typeof d.text === "string" && d.text.trim());
    blocks.push({
      id: crypto.randomUUID(),
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      shape: shape ?? undefined,
      name: blockNameFor(source),
      prompt: promptText,
      // Bulles créées ici → ne pas dupliquer via la génération post-image (dialogue_text).
      dialogue_text: hasDialogue ? null : (source.text_excerpt?.trim() || null),
      asset_refs: matchAssetRefs(source.characters, promptText, assets),
      image_url: restoredImage,
      scene_type: source.scene_type ?? null,
      effects: source.effects ?? null,
      shot_type: source.shot_type ?? null,
      location: source.location ?? null,
      ...(Array.isArray(source.characters) ? { characters: source.characters } : {}),
    });
    for (const b of buildBubblesForBlock(rect, source)) speechBubbles.push(b);
    if (source.sfx && typeof source.sfx.text === "string" && source.sfx.text.trim()) {
      const s = buildSfxForBlock(rect, source.sfx, sfxCount % 2 === 1);
      if (s) { sfxBlocks.push(s); sfxCount++; }
    }
  };

  const clampGap = (v: number) => Math.max(GAP_MIN_PX, Math.min(GAP_MAX_PX, v));

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
      emitSource(
        panelsOutline[pb.source_index],
        { x: pb.x, y: yOffset + pb.y, width: pb.width, height: pb.height },
        pb.shape,
      );
    }

    // Respiration v2 : celle du dernier bloc narratif de la scène prime sur le gap IA.
    const sceneMaxIdx = positioned.length > 0 ? Math.max(...positioned.map((p) => p.source_index)) : -1;
    const breathing = sceneMaxIdx >= 0 ? panelsOutline[sceneMaxIdx]?.breathing_after : undefined;
    const gapAfter = (typeof breathing === "number" && breathing > 0)
      ? clampGap(breathing)
      : (scene.gap_after != null ? clampGap(scene.gap_after) : GAP_FALLBACK_PX);
    yOffset += sectionHeight + gapAfter;
  }

  // Réparation : source_index non couverts → ajout en fin de canvas
  for (let i = 0; i < panelsOutline.length; i++) {
    if (!usedSourceIndices.has(i)) {
      console.warn(`[compose] source_index ${i} manquant — bloc par défaut ajouté`);
      usedSourceIndices.add(i);
      emitSource(panelsOutline[i], { x: 0, y: yOffset, width: 800, height: 850 }, undefined);
      const breathing = panelsOutline[i]?.breathing_after;
      yOffset += 850 + ((typeof breathing === "number" && breathing > 0) ? clampGap(breathing) : GAP_FALLBACK_PX);
    }
  }

  return {
    blocks,
    speechBubbles,
    sfxBlocks,
    systemBlocks,
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
    /** Assets du projet (id + nom) — pré-liaison des blocs composés à leurs personnages. */
    assets?: Array<{ id?: unknown; name?: unknown }>;
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

  // Assets (id + nom) pour la pré-liaison des personnages aux blocs composés.
  const assetPairs = Array.isArray(body.assets)
    ? body.assets
        .filter((a): a is { id: string; name: string } =>
          !!a && typeof a.id === "string" && typeof a.name === "string" && a.name.trim().length > 0)
        .map((a) => ({ id: a.id, name: a.name }))
    : [];

  if (!chapter_id) return json({ error: "chapter_id requis" }, 400);
  if (!Array.isArray(panels_outline) || panels_outline.length === 0) {
    return json({ error: "panels_outline non vide requis (lancer le Découpage IA d'abord)" }, 400);
  }

  // Ownership : getOrCreateCanvas/updateCanvas opèrent en service role (bypass RLS).
  // Sans ce contrôle, un chapter_id d'autrui ferait écraser le canvas de la victime (IDOR).
  const ownsChapter = await userOwnsChapter(supabaseUrl, serviceKey, chapter_id, userId);
  if (!ownsChapter) {
    return json({ error: "Chapitre introuvable ou accès refusé." }, 403);
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
  const { blocks, speechBubbles, sfxBlocks, systemBlocks, panelHeight } = processComposition(
    normalizedScenes,
    panels_outline,
    Array.isArray(existing_blocks) ? existing_blocks : undefined,
    assetPairs
  );

  // sfxBlocks / systemBlocks : clés additives du layout, seulement si non vides
  // (un chapitre sans découpage v2 garde exactement le layout d'avant).
  const layout: Record<string, unknown> = { blocks, panelHeight };
  if (sfxBlocks.length > 0) layout.sfxBlocks = sfxBlocks;
  if (systemBlocks.length > 0) layout.systemBlocks = systemBlocks;

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
      sfx_count: sfxBlocks.length,
      system_count: systemBlocks.length,
      panel_height: panelHeight,
      model_used: aiResult.modelUsed,
    },
    200
  );
});
