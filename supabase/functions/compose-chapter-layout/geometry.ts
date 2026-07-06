// Moteur de placement pur du compose — extrait d'index.ts pour être testable (vitest).
// Aucune dépendance Deno : uniquement des calculs de géométrie webtoon (canvas 800px × H).
// Codes webtoon appliqués (sources : wiki Webtoon-Research, References/spec — 146 planches
// SL/YTIM/AsuraScans) : barème de respirations « Distance = Time », réserve header 300px,
// bulles contenues dans leur case, letterbox Q.

import type { PanelOutlineBlock } from "./system-prompts/compose-layout.ts";

// ═══════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

// Gap FALLBACK si l'IA ne fournit pas gap_after — normalement l'IA le calcule
export const GAP_FALLBACK_PX = 400;
// Barème mesuré (Distance = Time) : action 50-150 · beat 200 · émotionnel 200-400 ·
// transition 400-600 · cliffhanger 600-900 · lieu 1000+ · ellipse 2000.
// Le clamp couvre tout le barème — il borne les valeurs aberrantes, il ne les déforme plus.
export const GAP_MIN_PX = 50;
export const GAP_MAX_PX = 2000;
export const MIN_CANVAS_HEIGHT = 5_000;
// Réserve en haut d'épisode : ~300px sans info critique (header des plateformes mobiles).
export const TOP_RESERVE_PX = 300;

export const PANEL_W = 800;

export type HeightHint = "strip" | "compact" | "standard" | "grand" | "splash";

export const HINT_PX: Record<HeightHint, number> = {
  strip:    280,
  compact:  550,
  standard: 900,
  grand:   1400,
  splash:  2200,
};

export interface PositionedBlock {
  source_index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: string;
}

export interface AbsRect { x: number; y: number; width: number; height: number }

// L'IA ne fournit QUE le groupement, la composition et l'intensité.
// Le serveur calcule toute la géométrie (positions, tailles, shapes).
export interface AISimpleScene {
  source_indices: number[];   // indices des blocs dans panels_outline
  composition: string;        // A–Q
  gap_after?: number;         // espace blanc après cette scène (px)
  height_hint?: string;       // strip | compact | standard | grand | splash
  rationale?: string;
}

// ── Hauteur par contenu ────────────────────────────────────────
// Chaque bloc obtient une hauteur adaptée à CE qu'il montre, pas au hint de scène.
export function inferBlockHeight(description: string, baseH: number): number {
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
export const E_WIDTH_PATTERNS: Array<{ x: number; width: number }> = [
  { x: 0,   width: 800 },  // plein
  { x: 110, width: 580 },  // indent gauche
  { x: 0,   width: 640 },  // légèrement réduit gauche
  { x: 160, width: 640 },  // indent droite
  { x: 0,   width: 800 },  // plein
  { x: 60,  width: 680 },  // légèrement centré
];

export function fallbackLayout(
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

export function computeSceneLayout(
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

    case "Q": { // Letterbox — bande cinéma ultra-plate : yeux, horizon, détail linéaire
      return {
        positioned: [{ source_index: indices[0], x: 0, y: 0, width: 800, height: 200 }],
        sectionHeight: 200,
      };
    }

    default:
      return fallbackLayout(indices, baseH, descriptions);
  }
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION & NORMALISATION — avant de placer les blocs
// ═══════════════════════════════════════════════════════════════

// Blocs max par composition. Au-delà → on coupe et redistribue.
export const MAX_BLOCKS_PER_COMP: Record<string, number> = {
  A: 1, B: 1, G: 1, H: 1, O: 1, P: 1, Q: 1,   // 1 bloc uniquement
  D: 2, I: 2, J: 2, L: 2, N: 2,                // exactement 2
  M: 3,                                          // exactement 3
  C: 5, E: 5,                                    // empilés libres
  K: 4,                                          // flash limité à 4
};

export function normalizeScenes(
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

export interface SfxPresetStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  rotation: number;
  glowColor?: string;
  glowBlur?: number;
}

export const SFX_PRESET_STYLE: Record<string, SfxPresetStyle> = {
  boom:   { fontFamily: "'Bangers', cursive",         fontSize: 72, color: "#ef4444", strokeColor: "#1a0a0a", strokeWidth: 6, rotation: -6, glowColor: "#f97316", glowBlur: 18 },
  slash:  { fontFamily: "'Bangers', cursive",         fontSize: 64, color: "#fbbf24", strokeColor: "#111111", strokeWidth: 6, rotation: 8 },
  crack:  { fontFamily: "'Black Ops One', cursive",   fontSize: 60, color: "#ffffff", strokeColor: "#111111", strokeWidth: 5, rotation: -3 },
  whoosh: { fontFamily: "'Luckiest Guy', cursive",    fontSize: 54, color: "#7dd3fc", strokeColor: "#0c1c3d", strokeWidth: 5, rotation: -14 },
  rumble: { fontFamily: "'Rock Salt', cursive",       fontSize: 42, color: "#c4b5fd", strokeColor: "#17102e", strokeWidth: 4, rotation: 0, glowColor: "#7c3aed", glowBlur: 14 },
  tap:    { fontFamily: "'Permanent Marker', cursive", fontSize: 36, color: "#e2e8f0", strokeColor: "#1e293b", strokeWidth: 3, rotation: 4 },
};

export const SYSTEM_ACCENT: Record<string, { accent: string; defaultTitle: string }> = {
  notification: { accent: "#22d3ee", defaultTitle: "NOTIFICATION" },
  quest:        { accent: "#fbbf24", defaultTitle: "QUÊTE" },
  alert:        { accent: "#f87171", defaultTitle: "ALERTE" },
  levelup:      { accent: "#a78bfa", defaultTitle: "LEVEL UP !" },
  status:       { accent: "#60a5fa", defaultTitle: "STATUT" },
};

export const VALID_BUBBLE_TYPES = new Set(["speech", "shout", "whisper", "thought", "narration"]);

function normName(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Personnages de la case (v2) ↔ assets du projet → ids pour asset_refs (pré-liaison). */
export function matchAssetRefs(
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
export function buildBubblesForBlock(rect: AbsRect, source: PanelOutlineBlock): object[] {
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

  const dialogue = (Array.isArray(source.dialogue) ? source.dialogue : []).filter(
    (d) => d && typeof d.text === "string" && d.text.trim()
  );
  if (dialogue.length === 0) return out;

  // Code webtoon : une bulle appartient visuellement à sa case — coins et bords,
  // pas dans la gouttière. Si la pile de bulles dépasse le bas du bloc, on
  // compresse le pas (cascade dense, min 100px — pattern SL c01 p016).
  // Limite assumée : un bloc < ~316px avec ≥ 2 répliques déborde quand même
  // (le plancher 100px prime sur le confinement) — cas rendu rare par la
  // rétrogradation Q→G et le budget de bulles du découpage.
  const lastTop = rect.y + rect.height - PAD - BH;
  let step = STEP;
  if (dialogue.length > 1 && cy + (dialogue.length - 1) * STEP > lastTop) {
    step = Math.max(100, Math.floor((lastTop - cy) / (dialogue.length - 1)));
  }

  let side = 0;
  let prevChar: string | undefined;
  for (const d of dialogue) {
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
    cy += step;
  }
  return out;
}

/** Bloc SFX posé sur le tiers supérieur du bloc image, alterné gauche/droite. */
export function buildSfxForBlock(rect: AbsRect, sfx: { text?: string; preset?: string }, altRight: boolean): object | null {
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
export function buildSystemForBlock(rect: AbsRect, sw: { variant?: string; title?: string; body?: string }): object {
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

export function clampGap(v: number): number {
  return Math.max(GAP_MIN_PX, Math.min(GAP_MAX_PX, v));
}

export function processComposition(
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
  // Code webtoon : réserve haut d'épisode (~300px) — aucune info critique sous
  // le header des plateformes mobiles.
  let yOffset = TOP_RESERVE_PX;
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

    // Règle 7 appliquée CÔTÉ SERVEUR (le prompt ne suffit pas) : Q est une bande
    // de 200px, une bulle fait 150px — un Q avec dialogue/narration détruirait le
    // letterbox et déborderait. Rétrogradé en G (panel centré, 400px minimum).
    let comp = (scene.composition ?? "E").toUpperCase();
    if (comp === "Q") {
      const src = panelsOutline[indices[0]];
      const hasDlg = Array.isArray(src?.dialogue) &&
        src.dialogue.some((d) => d && typeof d.text === "string" && d.text.trim());
      if (hasDlg || (typeof src?.narration === "string" && src.narration.trim())) {
        console.warn("[compose] Q avec dialogue/narration — rétrogradé en G");
        comp = "G";
      }
    }

    const { positioned, sectionHeight } = computeSceneLayout(
      comp,
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

    // Respiration v2 : le tempo du découpage (breathing_after, barème 120-700)
    // prime sur le gap IA, SAUF si l'IA demande un palier hors barème (> 700 :
    // cliffhanger long, changement de lieu 1000+, ellipse 2000) que
    // breathing_after ne peut pas exprimer. L'IA peut étendre, jamais raccourcir.
    const sceneMaxIdx = positioned.length > 0 ? Math.max(...positioned.map((p) => p.source_index)) : -1;
    const breathing = sceneMaxIdx >= 0 ? panelsOutline[sceneMaxIdx]?.breathing_after : undefined;
    const aiGap = scene.gap_after != null ? clampGap(scene.gap_after) : GAP_FALLBACK_PX;
    const gapAfter = (typeof breathing === "number" && breathing > 0)
      ? (aiGap > 700 ? aiGap : clampGap(breathing))
      : aiGap;
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
