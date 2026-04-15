// Éditeur de bulles avancé — types dialogue, pensée, cri, narrative ; bulles connectées ; queue ; style texte complet.
import { useState, useRef, useCallback, useEffect } from "react";
import type { CSSProperties } from "react";
import type { SpeechBubble, SpeechBubbleConnected, SpeechBubbleTextStyle } from "@/types";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BubbleType = "dialogue" | "thought" | "shout" | "caption";
type FillMode = "solid" | "gradient";
type GradientDir = "to bottom" | "to right" | "to bottom right" | "to bottom left";

interface TextStyle {
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  textTransform: "none" | "uppercase" | "lowercase";
  letterSpacing: number;       // em units * 100
  textShadow: boolean;
  textShadowColor: string;
  textShadowBlur: number;
  textColor: string;
  fontFamily: string;
}

interface ConnectedBubble {
  id: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  borderRadius: number;
  text: string;
  textStyle: TextStyle;
  bgFill: FillMode;
  bgColor: string;
  bgColor2: string;
  gradientDir: GradientDir;
  borderColor: string;
  borderWidth: number;
  neckWidth: number;
}

interface Bubble {
  id: string;
  type: BubbleType;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
  tailX: number;
  tailY: number;
  tailBaseWidth: number;
  bgFill: FillMode;
  bgColor: string;
  bgColor2: string;
  gradientDir: GradientDir;
  borderColor: string;
  borderWidth: number;
  textStyle: TextStyle;
  spikes: number;
  connected: ConnectedBubble | null;
}

type InteractionMode =
  | { type: "idle" }
  | { type: "drag";        id: string; startMx: number; startMy: number; origX: number; origY: number }
  | { type: "resize";      id: string; handle: string; startMx: number; startMy: number; origX: number; origY: number; origW: number; origH: number }
  | { type: "tail";        id: string; startMx: number; startMy: number; origTx: number; origTy: number }
  | { type: "drag-conn";   id: string; startMx: number; startMy: number; origOx: number; origOy: number }
  | { type: "resize-conn"; id: string; handle: string; startMx: number; startMy: number; origW: number; origH: number; origOx: number; origOy: number };

// ═══════════════════════════════════════════════════════════════════════════════
// GEOMETRY — full-perimeter parameterisation (supports diagonal corners)
// ═══════════════════════════════════════════════════════════════════════════════

interface PerimPoint { x: number; y: number; t: number }

function buildPerimeter(w: number, h: number, r: number) {
  const rc = Math.min(r, w / 2, h / 2);
  const arcLen = (Math.PI / 2) * rc;

  type Seg =
    | { kind: "line"; x1: number; y1: number; x2: number; y2: number; len: number }
    | { kind: "arc";  cx: number; cy: number; r: number; aStart: number; aEnd: number; len: number };

  const segs: Seg[] = [
    { kind: "line", x1: rc, y1: 0,     x2: w - rc, y2: 0,     len: Math.max(0, w - 2 * rc) },
    { kind: "arc",  cx: w - rc, cy: rc,     r: rc, aStart: -Math.PI / 2,      aEnd: 0,                   len: arcLen },
    { kind: "line", x1: w, y1: rc,     x2: w, y2: h - rc,     len: Math.max(0, h - 2 * rc) },
    { kind: "arc",  cx: w - rc, cy: h - rc, r: rc, aStart: 0,                 aEnd: Math.PI / 2,         len: arcLen },
    { kind: "line", x1: w - rc, y1: h, x2: rc, y2: h,         len: Math.max(0, w - 2 * rc) },
    { kind: "arc",  cx: rc,     cy: h - rc, r: rc, aStart: Math.PI / 2,       aEnd: Math.PI,             len: arcLen },
    { kind: "line", x1: 0, y1: h - rc, x2: 0, y2: rc,         len: Math.max(0, h - 2 * rc) },
    { kind: "arc",  cx: rc,     cy: rc,     r: rc, aStart: Math.PI,           aEnd: 3 * Math.PI / 2,     len: arcLen },
  ];

  const totalLen = segs.reduce((s, seg) => s + seg.len, 0);

  function sampleAt(tParam: number): PerimPoint {
    const tMod = ((tParam % totalLen) + totalLen) % totalLen;
    let acc = 0;
    for (const seg of segs) {
      if (tMod <= acc + seg.len + 1e-9) {
        const u = seg.len > 0 ? (tMod - acc) / seg.len : 0;
        if (seg.kind === "line") {
          return { x: seg.x1 + (seg.x2 - seg.x1) * u, y: seg.y1 + (seg.y2 - seg.y1) * u, t: tMod };
        } else {
          const angle = seg.aStart + (seg.aEnd - seg.aStart) * u;
          return { x: seg.cx + seg.r * Math.cos(angle), y: seg.cy + seg.r * Math.sin(angle), t: tMod };
        }
      }
      acc += seg.len;
    }
    return { x: rc, y: 0, t: 0 };
  }

  function closestT(px: number, py: number): number {
    const STEPS = 200;
    let bestT = 0, bestDist = Infinity;
    for (let i = 0; i < STEPS; i++) {
      const t = (i / STEPS) * totalLen;
      const p = sampleAt(t);
      const d = Math.hypot(px - p.x, py - p.y);
      if (d < bestDist) { bestDist = d; bestT = t; }
    }
    let lo = bestT - totalLen / STEPS, hi = bestT + totalLen / STEPS;
    for (let i = 0; i < 20; i++) {
      const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
      const d1 = ((p: PerimPoint) => Math.hypot(px - p.x, py - p.y))(sampleAt(m1));
      const d2 = ((p: PerimPoint) => Math.hypot(px - p.x, py - p.y))(sampleAt(m2));
      if (d1 < d2) hi = m2; else lo = m1;
    }
    return (lo + hi) / 2;
  }

  return { sampleAt, closestT, totalLen };
}

function buildBubblePath(w: number, h: number, borderRadius: number, tipX: number, tipY: number, half: number): string {
  // borderRadius in % (0-50), convert to px
  const r = Math.min(w, h) * (borderRadius / 100);
  const perim = buildPerimeter(w, h, r);
  const { sampleAt, closestT, totalLen } = perim;

  const tAttach = closestT(tipX, tipY);
  const pB1 = sampleAt(tAttach - half);
  const pB2 = sampleAt(tAttach + half);

  const SAMPLES = 150;
  const pts: string[] = [`M ${fx(pB2.x)},${fx(pB2.y)}`];
  const walkLen = totalLen - 2 * half;
  for (let i = 1; i <= SAMPLES; i++) {
    const p = sampleAt(pB2.t + (walkLen * i) / SAMPLES);
    pts.push(`L ${fx(p.x)},${fx(p.y)}`);
  }
  pts.push(`L ${fx(pB1.x)},${fx(pB1.y)}`);
  pts.push(`L ${fx(tipX)},${fx(tipY)}`);
  pts.push(`L ${fx(pB2.x)},${fx(pB2.y)} Z`);
  return pts.join(" ");
}

function buildRoundedRectPath(w: number, h: number, borderRadius: number): string {
  const r = Math.min(w, h) * (borderRadius / 100);
  const perim = buildPerimeter(w, h, r);
  const { sampleAt, totalLen } = perim;
  const SAMPLES = 100;
  const pts: string[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const p = sampleAt((i / SAMPLES) * totalLen);
    pts.push(i === 0 ? `M ${fx(p.x)},${fx(p.y)}` : `L ${fx(p.x)},${fx(p.y)}`);
  }
  return pts.join(" ") + " Z";
}

/**
 * Returns a single merged SVG path for parent+neck+child,
 * using cubic Bézier curves for organic neck sides.
 * Requires the bubbles to be positioned so they overlap or are adjacent.
 */
function buildConnectedPath(
  pw: number, ph: number, pBr: number,
  ox: number, oy: number, cw: number, ch: number, cBr: number,
  neckWidth: number
): { mergedPath: string; parentPath: string; childPath: string } {
  const pR = Math.min(pw, ph) * (pBr / 100);
  const cR = Math.min(cw, ch) * (cBr / 100);
  const pPerim = buildPerimeter(pw, ph, pR);
  const cPerim = buildPerimeter(cw, ch, cR);

  const pCx = pw / 2, pCy = ph / 2;
  const childCx = ox + cw / 2, childCy = oy + ch / 2;

  const tPBase = pPerim.closestT(childCx, childCy);
  const tCBase = cPerim.closestT(pCx - ox, pCy - oy);

  // Arc-length half-width for neck opening
  const pHalf = Math.min(neckWidth, pPerim.totalLen * 0.14);
  const cHalf = Math.min(neckWidth, cPerim.totalLen * 0.14);

  const tP1 = tPBase - pHalf, tP2 = tPBase + pHalf;
  const tC1 = tCBase - cHalf, tC2 = tCBase + cHalf;

  // Sample with tangent: returns {x, y, tx, ty}
  const sampleWithTangent = (perim: ReturnType<typeof buildPerimeter>, t: number) => {
    const p0 = perim.sampleAt(t);
    const p1 = perim.sampleAt(t + 0.5);
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p0.x, y: p0.y, tx: dx / len, ty: dy / len };
  };

  const pB1 = sampleWithTangent(pPerim, tP1);
  const pB2 = sampleWithTangent(pPerim, tP2);
  const cB1 = sampleWithTangent(cPerim, tC1);
  const cB2 = sampleWithTangent(cPerim, tC2);

  // World coords for child neck points
  const cB1w = { x: cB1.x + ox, y: cB1.y + oy, tx: cB1.tx, ty: cB1.ty };
  const cB2w = { x: cB2.x + ox, y: cB2.y + oy, tx: cB2.tx, ty: cB2.ty };

  // pB1 connects to nearest child neck point
  const d1 = Math.hypot(pB1.x - cB1w.x, pB1.y - cB1w.y);
  const d2 = Math.hypot(pB1.x - cB2w.x, pB1.y - cB2w.y);
  const [firstC, lastC, tCStart] = d1 < d2
    ? [cB1w, cB2w, tC1]
    : [cB2w, cB1w, tC2];
  const cWalkLen = cPerim.totalLen - 2 * cHalf;
  const pWalkLen = pPerim.totalLen - 2 * pHalf;

  const SAMPLES = 120;
  const tension = 0.38;

  // Bezier control points for neck side 1: pB1 → firstC
  const dist1 = Math.hypot(pB1.x - firstC.x, pB1.y - firstC.y);
  const cp1ax = pB1.x + pB1.tx * dist1 * tension;
  const cp1ay = pB1.y + pB1.ty * dist1 * tension;
  const cp1bx = firstC.x - firstC.tx * dist1 * tension;
  const cp1by = firstC.y - firstC.ty * dist1 * tension;

  // Bezier control points for neck side 2: lastC → pB2
  const dist2 = Math.hypot(lastC.x - pB2.x, lastC.y - pB2.y);
  const cp2ax = lastC.x + lastC.tx * dist2 * tension;
  const cp2ay = lastC.y + lastC.ty * dist2 * tension;
  const cp2bx = pB2.x - pB2.tx * dist2 * tension;
  const cp2by = pB2.y - pB2.ty * dist2 * tension;

  // Build merged path
  const pts: string[] = [`M ${fx(pB2.x)},${fx(pB2.y)}`];
  // Walk parent CW long way: tP2 → tP1
  for (let i = 1; i <= SAMPLES; i++) {
    const p = pPerim.sampleAt(tP2 + (pWalkLen * i) / SAMPLES);
    pts.push(`L ${fx(p.x)},${fx(p.y)}`);
  }
  // Bezier side 1: pB1 → firstC
  pts.push(`C ${fx(cp1ax)},${fx(cp1ay)} ${fx(cp1bx)},${fx(cp1by)} ${fx(firstC.x)},${fx(firstC.y)}`);
  // Walk child CW long way
  for (let i = 1; i <= SAMPLES; i++) {
    const p = cPerim.sampleAt(tCStart + (cWalkLen * i) / SAMPLES);
    pts.push(`L ${fx(p.x + ox)},${fx(p.y + oy)}`);
  }
  // Bezier side 2: lastC → pB2
  pts.push(`C ${fx(cp2ax)},${fx(cp2ay)} ${fx(cp2bx)},${fx(cp2by)} ${fx(pB2.x)},${fx(pB2.y)}`);
  pts.push("Z");

  const parentPath = buildRoundedRectPath(pw, ph, pBr);
  const childPath = buildRoundedRectPath(cw, ch, cBr);
  return { mergedPath: pts.join(" "), parentPath, childPath };
}

function computeThoughtCircles(w: number, h: number, tx: number, ty: number) {
  const cx = w / 2, cy = h / 2;
  const rx = w / 2 - 3, ry = h / 2 - 3;
  const angle = Math.atan2((ty - cy) / ry, (tx - cx) / rx);
  const ax = cx + rx * Math.cos(angle), ay = cy + ry * Math.sin(angle);
  return [0.20, 0.48, 0.76].map((t, i) => ({
    x: ax + (tx - ax) * t, y: ay + (ty - ay) * t, r: 9 - i * 2,
  }));
}

function fx(n: number) { return Math.round(n * 10) / 10; }

// ═══════════════════════════════════════════════════════════════════════════════
// FILL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const GRAD_DIRS: GradientDir[] = ["to bottom", "to right", "to bottom right", "to bottom left"];
const GRAD_DIR_LABELS: Record<GradientDir, string> = {
  "to bottom": "↓ Bas", "to right": "→ Droite",
  "to bottom right": "↘ Diag", "to bottom left": "↙ Diag",
};

function gradAngle(dir: GradientDir): number {
  return { "to bottom": 90, "to right": 0, "to bottom right": 135, "to bottom left": 225 }[dir];
}

/** Returns a unique SVG gradient id and the <linearGradient> element */
function GradDef({ id, color1, color2, dir }: { id: string; color1: string; color2: string; dir: GradientDir }) {
  const angle = gradAngle(dir);
  const rad = (angle * Math.PI) / 180;
  const x1 = 50 - Math.cos(rad) * 50, y1 = 50 - Math.sin(rad) * 50;
  const x2 = 50 + Math.cos(rad) * 50, y2 = 50 + Math.sin(rad) * 50;
  return (
    <linearGradient id={id} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}>
      <stop offset="0%" stopColor={color1} />
      <stop offset="100%" stopColor={color2} />
    </linearGradient>
  );
}

function fillAttr(fill: FillMode, color: string, gradId: string) {
  return fill === "gradient" ? `url(#${gradId})` : color;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT STYLE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const FONTS = [
  { label: "Système", value: "'Segoe UI', system-ui, sans-serif" },
  { label: "Manga", value: "'Bangers', 'Impact', sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "'Courier New', monospace" },
  { label: "Rounded", value: "'Nunito', 'Varela Round', sans-serif" },
];

function textStyleCSS(ts: TextStyle): CSSProperties {
  return {
    fontSize: ts.fontSize,
    fontWeight: ts.fontWeight,
    fontStyle: ts.fontStyle,
    textAlign: ts.textAlign,
    textTransform: ts.textTransform,
    letterSpacing: `${ts.letterSpacing / 100}em`,
    color: ts.textColor,
    fontFamily: ts.fontFamily,
    textShadow: ts.textShadow
      ? `0 0 ${ts.textShadowBlur}px ${ts.textShadowColor}, 1px 1px 0 ${ts.textShadowColor}`
      : "none",
    lineHeight: 1.3,
    wordBreak: "break-word",
    width: "100%",
    margin: 0,
  };
}

const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 15, fontWeight: "bold", fontStyle: "normal",
  textAlign: "center", textTransform: "none",
  letterSpacing: 0, textShadow: false, textShadowColor: "#000000",
  textShadowBlur: 3, textColor: "#000000",
  fontFamily: "'Segoe UI', system-ui, sans-serif",
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

const PAD = 100;

const DEFAULT_CONNECTED = (parentW: number, parentH: number): ConnectedBubble => {
  const pR = Math.min(parentW, parentH) * 0.5;
  const cW = Math.round(parentW * 0.5);
  const cH = Math.round(parentH * 0.5);
  const cR = Math.min(cW, cH) * 0.5;
  const dist = pR + cR - pR * 0.22;
  const angle = -Math.PI * 0.72;
  const childCx = parentW/2 + dist * Math.cos(angle);
  const childCy = parentH/2 + dist * Math.sin(angle);
  return {
    id: `conn-${Math.random().toString(36).slice(2)}`,
    offsetX: Math.round(childCx - cW/2),
    offsetY: Math.round(childCy - cH/2),
    width: cW,
    height: cH,
    borderRadius: 50,
    text: "Aah...",
    textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 12 },
    bgFill: "solid",
    bgColor: "#ffffff",
    bgColor2: "#e0e0ff",
    gradientDir: "to bottom",
    borderColor: "#000000",
    borderWidth: 2.5,
    neckWidth: 40,
  };
};

const BUBBLE_DEFAULTS = {
  dialogue: {
    width: 240, height: 200, borderRadius: 50,
    bgFill: "solid" as FillMode, bgColor: "#ffffff", bgColor2: "#e8e8ff", gradientDir: "to bottom" as GradientDir,
    borderColor: "#000000", borderWidth: 3,
    tailBaseWidth: 22, spikes: 0,
  },
  thought: {
    width: 220, height: 160, borderRadius: 50,
    bgFill: "solid" as FillMode, bgColor: "#f0f8ff", bgColor2: "#d0e8ff", gradientDir: "to bottom" as GradientDir,
    borderColor: "#4a90d9", borderWidth: 2.5,
    tailBaseWidth: 15, spikes: 0,
  },
  shout: {
    width: 220, height: 160, borderRadius: 8,
    bgFill: "solid" as FillMode, bgColor: "#fff3cd", bgColor2: "#ffe0a0", gradientDir: "to bottom" as GradientDir,
    borderColor: "#e63946", borderWidth: 3,
    tailBaseWidth: 18, spikes: 12,
  },
  caption: {
    width: 260, height: 70, borderRadius: 4,
    bgFill: "solid" as FillMode, bgColor: "#1a1a2e", bgColor2: "#2a2a4e", gradientDir: "to right" as GradientDir,
    borderColor: "#e94560", borderWidth: 3,
    tailBaseWidth: 0, spikes: 0,
  },
};

const LABELS: Record<BubbleType, string> = {
  dialogue: "💬 Dialogue", thought: "💭 Pensée", shout: "💥 Cri", caption: "📋 Narrative",
};

// ── Conversion panel (SpeechBubble) ↔ éditeur (Bubble) ────────────────────────
function editorTypeToPanelType(t: BubbleType): SpeechBubble["type"] {
  return t === "dialogue" ? "speech" : t === "caption" ? "narration" : t;
}
function panelTypeToEditorType(t: SpeechBubble["type"]): BubbleType {
  return t === "speech" || t === "whisper" ? "dialogue" : t === "narration" ? "caption" : t;
}

function fullTextStyle(ts?: SpeechBubbleTextStyle | null, style?: { font?: string; size?: number; color?: string }): TextStyle {
  return {
    fontSize: ts?.fontSize ?? style?.size ?? 15,
    fontWeight: (ts?.fontWeight as "normal" | "bold") ?? "bold",
    fontStyle: (ts?.fontStyle as "normal" | "italic") ?? "normal",
    textAlign: (ts?.textAlign as "left" | "center" | "right") ?? "center",
    textTransform: (ts?.textTransform as "none" | "uppercase" | "lowercase") ?? "none",
    letterSpacing: ts?.letterSpacing ?? 0,
    textShadow: ts?.textShadow ?? false,
    textShadowColor: ts?.textShadowColor ?? "#000000",
    textShadowBlur: ts?.textShadowBlur ?? 3,
    textColor: ts?.textColor ?? style?.color ?? "#000000",
    fontFamily: ts?.fontFamily ?? (style?.font ? `${style.font}, sans-serif` : "'Segoe UI', system-ui, sans-serif"),
  };
}

/** Convertit les bulles du panel (speech_bubbles) vers le format éditeur. */
export function speechBubblesToEditorBubbles(panelBubbles: SpeechBubble[]): Bubble[] {
  return panelBubbles.map((sb) => {
    const editorType = panelTypeToEditorType(sb.type);
    const d = BUBBLE_DEFAULTS[editorType];
    const w = sb.width ?? d.width;
    const h = sb.height ?? d.height;
    const conn = sb.connected;
    return {
      id: sb.id,
      type: editorType,
      text: sb.text,
      x: sb.position.x,
      y: sb.position.y,
      width: w,
      height: h,
      borderRadius: sb.borderRadius ?? d.borderRadius,
      tailX: sb.tailX ?? w / 2,
      tailY: sb.tailY ?? h + 60,
      tailBaseWidth: sb.tailBaseWidth ?? d.tailBaseWidth,
      bgFill: (sb.bgFill as FillMode) ?? d.bgFill,
      bgColor: sb.bgColor ?? sb.style?.fill ?? d.bgColor,
      bgColor2: sb.bgColor2 ?? d.bgColor2,
      gradientDir: (sb.gradientDir as GradientDir) ?? d.gradientDir,
      borderColor: sb.borderColor ?? sb.style?.stroke ?? d.borderColor,
      borderWidth: sb.borderWidth ?? d.borderWidth,
      textStyle: fullTextStyle(sb.textStyle, sb.style),
      spikes: sb.spikes ?? d.spikes,
      connected: conn
        ? {
            id: conn.id,
            offsetX: conn.offsetX,
            offsetY: conn.offsetY,
            width: conn.width,
            height: conn.height,
            borderRadius: conn.borderRadius ?? 50,
            text: conn.text,
            textStyle: fullTextStyle(conn.textStyle),
            bgFill: (conn.bgFill as FillMode) ?? "solid",
            bgColor: conn.bgColor ?? "#ffffff",
            bgColor2: conn.bgColor2 ?? "#e0e0ff",
            gradientDir: (conn.gradientDir as GradientDir) ?? "to bottom",
            borderColor: conn.borderColor ?? "#000000",
            borderWidth: conn.borderWidth ?? 2.5,
            neckWidth: conn.neckWidth ?? 40,
          }
        : null,
    };
  });
}

/** Convertit les bulles de l'éditeur vers le format panel (speech_bubbles). */
export function editorBubblesToSpeechBubbles(editorBubbles: Bubble[]): SpeechBubble[] {
  return editorBubbles.map((b) => {
    const panelType = editorTypeToPanelType(b.type);
    const sb: SpeechBubble = {
      id: b.id,
      type: panelType,
      text: b.text,
      position: { x: b.x, y: b.y },
      width: b.width,
      height: b.height,
      style: {
        font: b.textStyle.fontFamily,
        size: b.textStyle.fontSize,
        color: b.textStyle.textColor,
        fill: b.bgColor,
        stroke: b.borderColor,
      },
      borderRadius: b.borderRadius,
      tailX: b.tailX,
      tailY: b.tailY,
      tailBaseWidth: b.tailBaseWidth,
      bgFill: b.bgFill,
      bgColor: b.bgColor,
      bgColor2: b.bgColor2,
      gradientDir: b.gradientDir,
      borderColor: b.borderColor,
      borderWidth: b.borderWidth,
      textStyle: {
        fontSize: b.textStyle.fontSize,
        fontWeight: b.textStyle.fontWeight,
        fontStyle: b.textStyle.fontStyle,
        textAlign: b.textStyle.textAlign,
        textTransform: b.textStyle.textTransform,
        letterSpacing: b.textStyle.letterSpacing,
        textShadow: b.textStyle.textShadow,
        textShadowColor: b.textStyle.textShadowColor,
        textShadowBlur: b.textStyle.textShadowBlur,
        textColor: b.textStyle.textColor,
        fontFamily: b.textStyle.fontFamily,
      },
      spikes: b.spikes,
      connected: b.connected
        ? {
            id: b.connected.id,
            offsetX: b.connected.offsetX,
            offsetY: b.connected.offsetY,
            width: b.connected.width,
            height: b.connected.height,
            borderRadius: b.connected.borderRadius,
            text: b.connected.text,
            textStyle: {
              fontSize: b.connected.textStyle.fontSize,
              fontWeight: b.connected.textStyle.fontWeight,
              fontStyle: b.connected.textStyle.fontStyle,
              textAlign: b.connected.textStyle.textAlign,
              textTransform: b.connected.textStyle.textTransform,
              letterSpacing: b.connected.textStyle.letterSpacing,
              textShadow: b.connected.textStyle.textShadow,
              textShadowColor: b.connected.textStyle.textShadowColor,
              textShadowBlur: b.connected.textStyle.textShadowBlur,
              textColor: b.connected.textStyle.textColor,
              fontFamily: b.connected.textStyle.fontFamily,
            },
            bgFill: b.connected.bgFill,
            bgColor: b.connected.bgColor,
            bgColor2: b.connected.bgColor2,
            gradientDir: b.connected.gradientDir,
            borderColor: b.connected.borderColor,
            borderWidth: b.connected.borderWidth,
            neckWidth: b.connected.neckWidth,
          }
        : undefined,
    };
    return sb;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG BUBBLE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function TailHandle({ tx, ty, p, onDown }: { tx: number; ty: number; p: number; onDown: (e: React.MouseEvent) => void }) {
  return (
    <g style={{ pointerEvents: "auto", cursor: "crosshair" }} onMouseDown={e => { e.stopPropagation(); onDown(e); }}>
      <circle cx={tx + p} cy={ty + p} r={13} fill="rgba(99,102,241,0.15)" />
      <circle cx={tx + p} cy={ty + p} r={6}  fill="#6366f1" stroke="white" strokeWidth={2.5} />
      <line x1={tx+p-9} y1={ty+p}   x2={tx+p+9} y2={ty+p}   stroke="white" strokeWidth={1.5} strokeLinecap="round" />
      <line x1={tx+p}   y1={ty+p-9} x2={tx+p}   y2={ty+p+9} stroke="white" strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

interface BubbleSVGProps {
  b: Bubble;
  isSel: boolean;
  isConnSel: boolean;
  onTailDown: (e: React.MouseEvent) => void;
  onConnDragDown: (e: React.MouseEvent) => void;
  onConnResizeDown: (e: React.MouseEvent, handle: string) => void;
  onConnClick: (e: React.MouseEvent) => void;
}

function DialogueSVG({ b, isSel, isConnSel, onTailDown, onConnDragDown, onConnResizeDown, onConnClick }: BubbleSVGProps) {
  const { width: w, height: h, borderRadius: br, bgFill, bgColor, bgColor2, gradientDir,
    borderColor, borderWidth: bw, tailX: tx, tailY: ty, tailBaseWidth,
    textStyle: ts, text, connected: conn } = b;
  const p = PAD;
  const gId = `grad-${b.id}`;
  const connGId = `grad-conn-${b.id}`;


  const tailBodyPath = buildBubblePath(w, h, br, tx, ty, tailBaseWidth);

  return (
    <svg width={w + p * 2} height={h + p * 2}
      style={{ position: "absolute", left: -p, top: -p, overflow: "visible", pointerEvents: "none" }}>
      <defs>
        <GradDef id={gId} color1={bgColor} color2={bgColor2} dir={gradientDir} />
        {conn && <GradDef id={connGId} color1={conn.bgColor} color2={conn.bgColor2} dir={conn.gradientDir} />}
      </defs>
      <g transform={`translate(${p},${p})`}>

        {conn ? (() => {
          const ccx = conn.offsetX, ccy = conn.offsetY;
          const cw = conn.width, ch = conn.height, cBr = conn.borderRadius;
          const { mergedPath, parentPath, childPath } = buildConnectedPath(
            w, h, br, ccx, ccy, cw, ch, cBr, conn.neckWidth
          );
          const fillP = fillAttr(bgFill, bgColor, gId);
          const fillC = fillAttr(conn.bgFill, conn.bgColor, connGId);
          return (
            <g>
              <path d={mergedPath}
                fill={fillP} stroke={borderColor} strokeWidth={bw}
                strokeLinejoin="round" strokeLinecap="round" />

              <path d={tailBodyPath}
                fill={fillP} stroke={borderColor} strokeWidth={bw}
                strokeLinejoin="round" strokeLinecap="round" />

              <g transform={`translate(${ccx},${ccy})`}>
                <path d={childPath} fill={fillC} stroke="none" />
                <path d={childPath}
                  fill="none" stroke={conn.borderColor}
                  strokeWidth={conn.borderWidth} strokeLinejoin="round" />
                {isConnSel && (
                  <path d={childPath} fill="none" stroke="#6366f1"
                    strokeWidth={2} strokeDasharray="5,3" style={{ pointerEvents: "none" }} />
                )}
                <foreignObject x={10} y={8} width={cw - 20} height={ch - 16}
                  style={{ pointerEvents: "none" }}>
                  <div xmlns="http://www.w3.org/1999/xhtml" style={{
                    width: "100%", height: "100%", display: "flex", alignItems: "center",
                    justifyContent: conn.textStyle.textAlign === "left" ? "flex-start"
                      : conn.textStyle.textAlign === "right" ? "flex-end" : "center",
                    overflow: "hidden" }}>
                    <p style={textStyleCSS(conn.textStyle)}>{conn.text}</p>
                  </div>
                </foreignObject>
                <path d={childPath} fill="transparent"
                  style={{ pointerEvents: "auto", cursor: "grab" }}
                  onMouseDown={e => { e.stopPropagation(); onConnDragDown(e); }}
                  onClick={e => { e.stopPropagation(); onConnClick(e); }} />
                {isConnSel && [["se", cw, ch], ["sw", 0, ch], ["ne", cw, 0], ["nw", 0, 0]].map(([hid, hx, hy]) => (
                  <rect key={hid as string}
                    x={(hx as number) - 5} y={(hy as number) - 5}
                    width={10} height={10} rx={2}
                    fill="#6366f1" stroke="white" strokeWidth={1.5}
                    style={{ pointerEvents: "auto", cursor: `${hid}-resize` }}
                    onMouseDown={e => { e.stopPropagation(); onConnResizeDown(e, hid as string); }} />
                ))}
              </g>
            </g>
          );
        })() : (
          <path d={tailBodyPath}
            fill={fillAttr(bgFill, bgColor, gId)}
            stroke={borderColor} strokeWidth={bw}
            strokeLinejoin="round" strokeLinecap="round" />
        )}

        <foreignObject x={16} y={14} width={w - 32} height={h - 28}
          style={{ pointerEvents: "auto" }}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            width: "100%", height: "100%", display: "flex", alignItems: "center",
            justifyContent: ts.textAlign === "left" ? "flex-start"
              : ts.textAlign === "right" ? "flex-end" : "center",
            overflow: "hidden" }}>
            <p style={textStyleCSS(ts)}>{text}</p>
          </div>
        </foreignObject>
      </g>
      {isSel && <TailHandle tx={tx} ty={ty} p={p} onDown={onTailDown} />}
    </svg>
  );
}

function ThoughtSVG({ b, isSel, isConnSel, onTailDown, onConnDragDown, onConnResizeDown, onConnClick }: BubbleSVGProps) {
  const { width: w, height: h, borderRadius: br, bgFill, bgColor, bgColor2, gradientDir,
    borderColor, borderWidth: bw, tailX: tx, tailY: ty, textStyle: ts, text, connected: conn } = b;
  const p = PAD;
  const gId = `grad-${b.id}`;
  const connGId = `grad-conn-${b.id}`;
  const circles = computeThoughtCircles(w, h, tx, ty);
  const bodyPath = buildRoundedRectPath(w, h, br);

  return (
    <svg width={w + p * 2} height={h + p * 2}
      style={{ position: "absolute", left: -p, top: -p, overflow: "visible", pointerEvents: "none" }}>
      <defs>
        <GradDef id={gId} color1={bgColor} color2={bgColor2} dir={gradientDir} />
        {conn && <GradDef id={connGId} color1={conn.bgColor} color2={conn.bgColor2} dir={conn.gradientDir} />}
      </defs>
      <g transform={`translate(${p},${p})`}>

        {conn ? (() => {
          const ccx = conn.offsetX, ccy = conn.offsetY;
          const cw = conn.width, ch = conn.height, cBr = conn.borderRadius;
          const { mergedPath, parentPath, childPath } = buildConnectedPath(
            w, h, br, ccx, ccy, cw, ch, cBr, conn.neckWidth
          );
          const fillP = fillAttr(bgFill, bgColor, gId);
          const fillC = fillAttr(conn.bgFill, conn.bgColor, connGId);
          return (
            <g>
              <path d={mergedPath}
                fill={fillP} stroke={borderColor} strokeWidth={bw}
                strokeLinejoin="round" strokeLinecap="round" />
              {circles.map((c, i) => (
                <ellipse key={i} cx={c.x} cy={c.y} rx={c.r} ry={c.r * 0.9}
                  fill={fillP} stroke={borderColor} strokeWidth={Math.max(0.5, bw - 0.5)} />
              ))}
              <g transform={`translate(${ccx},${ccy})`}>
                <path d={childPath} fill={fillC} stroke="none" />
                <path d={childPath} fill="none"
                  stroke={conn.borderColor} strokeWidth={conn.borderWidth} strokeLinejoin="round" />
                {isConnSel && <path d={childPath} fill="none" stroke="#6366f1" strokeWidth={2} strokeDasharray="5,3" />}
                <foreignObject x={10} y={8} width={cw - 20} height={ch - 16} style={{ pointerEvents: "none" }}>
                  <div xmlns="http://www.w3.org/1999/xhtml" style={{
                    width: "100%", height: "100%", display: "flex", alignItems: "center",
                    justifyContent: conn.textStyle.textAlign === "left" ? "flex-start"
                      : conn.textStyle.textAlign === "right" ? "flex-end" : "center" }}>
                    <p style={textStyleCSS(conn.textStyle)}>{conn.text}</p>
                  </div>
                </foreignObject>
                <path d={childPath} fill="transparent"
                  style={{ pointerEvents: "auto", cursor: "grab" }}
                  onMouseDown={e => { e.stopPropagation(); onConnDragDown(e); }}
                  onClick={e => { e.stopPropagation(); onConnClick(e); }} />
                {isConnSel && [["se", cw, ch], ["sw", 0, ch], ["ne", cw, 0], ["nw", 0, 0]].map(([hid, hx, hy]) => (
                  <rect key={hid as string} x={(hx as number) - 5} y={(hy as number) - 5} width={10} height={10}
                    rx={2} fill="#6366f1" stroke="white" strokeWidth={1.5}
                    style={{ pointerEvents: "auto", cursor: `${hid}-resize` }}
                    onMouseDown={e => { e.stopPropagation(); onConnResizeDown(e, hid as string); }} />
                ))}
              </g>
            </g>
          );
        })() : (
          <>
            {circles.map((c, i) => (
              <ellipse key={i} cx={c.x} cy={c.y} rx={c.r} ry={c.r * 0.9}
                fill={fillAttr(bgFill, bgColor, gId)}
                stroke={borderColor} strokeWidth={Math.max(0.5, bw - 0.5)} />
            ))}
            <path d={bodyPath} fill={fillAttr(bgFill, bgColor, gId)}
              stroke={borderColor} strokeWidth={bw} strokeLinejoin="round" />
          </>
        )}

        <foreignObject x={16} y={14} width={w - 32} height={h - 28} style={{ pointerEvents: "auto" }}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            width: "100%", height: "100%", display: "flex", alignItems: "center",
            justifyContent: ts.textAlign === "left" ? "flex-start" : ts.textAlign === "right" ? "flex-end" : "center" }}>
            <p style={{ ...textStyleCSS(ts), fontStyle: "italic" }}>{text}</p>
          </div>
        </foreignObject>
      </g>
      {isSel && <TailHandle tx={tx} ty={ty} p={p} onDown={onTailDown} />}
    </svg>
  );
}


function ShoutSVG({ b, isSel, onTailDown }: BubbleSVGProps) {
  const { width: w, height: h, bgFill, bgColor, bgColor2, gradientDir,
    borderColor, borderWidth: bw, tailX: tx, tailY: ty, tailBaseWidth,
    textStyle: ts, text, spikes } = b;
  const p = PAD;
  const gId = `grad-${b.id}`;
  const cx = w / 2, cy = h / 2;
  const outerR = Math.min(w, h) / 2 - 4, innerR = outerR * 0.78;
  const n = spikes;
  const pts = Array.from({ length: n * 2 }, (_, i) => {
    const angle = (Math.PI * i) / n - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    return `${fx(cx + r * Math.cos(angle))},${fx(cy + r * Math.sin(angle))}`;
  }).join(" ");

  const tipAngle = Math.atan2(ty - cy, tx - cx);
  let bestIdx = 0, bestDiff = Infinity;
  for (let i = 0; i < n * 2; i += 2) {
    const angle = (Math.PI * i) / n - Math.PI / 2;
    const diff = Math.abs(((angle - tipAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  }
  const allPts = Array.from({ length: n * 2 }, (_, i) => {
    const angle = (Math.PI * i) / n - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  const pathPts: string[] = [];
  for (let i = 0; i < allPts.length; i++) {
    const [px2, py2] = allPts[i];
    if (i === bestIdx && i % 2 === 0 && i > 0) {
      const prevA = (Math.PI * (i - 1)) / n - Math.PI / 2;
      const nextA = (Math.PI * (i + 1)) / n - Math.PI / 2;
      const b1x2 = cx + innerR * Math.cos(prevA), b1y2 = cy + innerR * Math.sin(prevA);
      const b2x2 = cx + innerR * Math.cos(nextA), b2y2 = cy + innerR * Math.sin(nextA);
      pathPts.push(`L ${fx(b1x2)},${fx(b1y2)} L ${fx(tx)},${fx(ty)} L ${fx(b2x2)},${fx(b2y2)} L ${fx(px2)},${fx(py2)}`);
    } else {
      pathPts.push(i === 0 ? `M ${fx(px2)},${fx(py2)}` : `L ${fx(px2)},${fx(py2)}`);
    }
  }
  pathPts.push("Z");

  return (
    <svg width={w + p * 2} height={h + p * 2}
      style={{ position: "absolute", left: -p, top: -p, overflow: "visible", pointerEvents: "none" }}>
      <defs><GradDef id={gId} color1={bgColor} color2={bgColor2} dir={gradientDir} /></defs>
      <g transform={`translate(${p},${p})`}>
        <path d={pathPts.join(" ")} fill={fillAttr(bgFill, bgColor, gId)}
          stroke={borderColor} strokeWidth={bw} strokeLinejoin="round" />
        <foreignObject x={cx - innerR * 0.72} y={cy - innerR * 0.65}
          width={innerR * 1.44} height={innerR * 1.3} style={{ pointerEvents: "auto" }}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ ...textStyleCSS(ts), textTransform: ts.textTransform === "none" ? "uppercase" : ts.textTransform }}>{text}</p>
          </div>
        </foreignObject>
      </g>
      {isSel && <TailHandle tx={tx} ty={ty} p={p} onDown={onTailDown} />}
    </svg>
  );
}

function CaptionSVG({ b }: { b: Bubble }) {
  const { width: w, height: h, borderRadius: br, bgFill, bgColor, bgColor2, gradientDir,
    borderColor, borderWidth: bw, textStyle: ts, text } = b;
  const p = PAD;
  const gId = `grad-${b.id}`;
  const bodyPath = buildRoundedRectPath(w, h, br);
  return (
    <svg width={w + p * 2} height={h + p * 2}
      style={{ position: "absolute", left: -p, top: -p, overflow: "visible", pointerEvents: "none" }}>
      <defs><GradDef id={gId} color1={bgColor} color2={bgColor2} dir={gradientDir} /></defs>
      <g transform={`translate(${p},${p})`}>
        <path d={bodyPath} fill={fillAttr(bgFill, bgColor, gId)} stroke={borderColor} strokeWidth={bw} />
        <rect x={0} y={0} width={6} height={h} rx={2} fill={borderColor} />
        <foreignObject x={14} y={8} width={w - 22} height={h - 16} style={{ pointerEvents: "auto" }}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
            <p style={textStyleCSS(ts)}>{text}</p>
          </div>
        </foreignObject>
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESIZE HANDLES
// ═══════════════════════════════════════════════════════════════════════════════

function ResizeHandles({ onDown }: { onDown: (e: React.MouseEvent, h: string) => void }) {
  const hs: { id: string; s: CSSProperties }[] = [
    { id: "nw", s: { top: -5, left: -5, cursor: "nw-resize" } },
    { id: "n",  s: { top: -5, left: "50%", transform: "translateX(-50%)", cursor: "n-resize" } },
    { id: "ne", s: { top: -5, right: -5, cursor: "ne-resize" } },
    { id: "e",  s: { top: "50%", right: -5, transform: "translateY(-50%)", cursor: "e-resize" } },
    { id: "se", s: { bottom: -5, right: -5, cursor: "se-resize" } },
    { id: "s",  s: { bottom: -5, left: "50%", transform: "translateX(-50%)", cursor: "s-resize" } },
    { id: "sw", s: { bottom: -5, left: -5, cursor: "sw-resize" } },
    { id: "w",  s: { top: "50%", left: -5, transform: "translateY(-50%)", cursor: "w-resize" } },
  ];
  return (
    <>
      {hs.map(h => (
        <div key={h.id} onMouseDown={e => { e.stopPropagation(); onDown(e, h.id); }}
          style={{ position: "absolute", width: 10, height: 10,
            background: "#6366f1", border: "2px solid white", borderRadius: 2, zIndex: 20, ...h.s }} />
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SpeechBubbleEditorProps {
  /** Bulles du panel à éditer (mode contrôlé). Si fourni, l'éditeur initialise avec ces bulles et affiche Enregistrer / Fermer. */
  initialBubbles?: SpeechBubble[];
  /** Appelé avec les bulles au format panel quand l'utilisateur clique Enregistrer. */
  onSave?: (bubbles: SpeechBubble[]) => void;
  /** Appelé quand l'utilisateur clique Fermer / Annuler. */
  onClose?: () => void;
  /** Dimensions logiques du panel pour positionner correctement les bulles. */
  canvasWidth?: number;
  canvasHeight?: number;
}

export default function SpeechBubbleEditor({
  initialBubbles,
  onSave,
  onClose,
  canvasWidth = 800,
  canvasHeight = 5000,
}: SpeechBubbleEditorProps = {}) {
  const isControlled = initialBubbles != null && (onSave != null || onClose != null);

  // En mode contrôlé, état initial uniquement (la modale se démonte à la fermeture)
  const [bubbles, setBubbles] = useState<Bubble[]>(() =>
    initialBubbles?.length ? speechBubblesToEditorBubbles(initialBubbles) : []
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connSelected, setConnSelected] = useState(false);
  const [editTarget, setEditTarget] = useState<"main" | "conn" | null>(null);
  const [editText, setEditText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<InteractionMode>({ type: "idle" });
  const nextId = useRef(1);

  const selected = bubbles.find(b => b.id === selectedId) ?? null;

  useEffect(() => {
    if (!initialBubbles) return;
    setBubbles(speechBubblesToEditorBubbles(initialBubbles));
  }, [initialBubbles]);

  const updateBubble = useCallback((id: string, patch: Partial<Bubble>) => {
    setBubbles(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  }, []);

  const updateConn = useCallback((id: string, patch: Partial<ConnectedBubble>) => {
    setBubbles(prev => prev.map(b =>
      b.id === id && b.connected ? { ...b, connected: { ...b.connected, ...patch } } : b
    ));
  }, []);

  const updateTextStyle = useCallback((id: string, patch: Partial<TextStyle>, target: "main" | "conn") => {
    setBubbles(prev => prev.map(b => {
      if (b.id !== id) return b;
      if (target === "main") return { ...b, textStyle: { ...b.textStyle, ...patch } };
      if (b.connected) return { ...b, connected: { ...b.connected, textStyle: { ...b.connected.textStyle, ...patch } } };
      return b;
    }));
  }, []);

  const addBubble = useCallback((type: BubbleType) => {
    const id = `b${nextId.current++}`;
    const cw = canvasWidth;
    const ch = canvasHeight;
    const d = BUBBLE_DEFAULTS[type];
    const w = d.width, h = d.height;
    const bub: Bubble = {
      id, type,
      text: type === "caption" ? "Il était une fois..." : type === "shout" ? "WAAA !!!" : "Texte ici...",
      x: Math.random() * (cw - w - 40) + 20,
      y: Math.random() * (ch - h - 80) + 40,
      width: w, height: h,
      borderRadius: d.borderRadius,
      tailX: w / 2, tailY: h + 60,
      tailBaseWidth: d.tailBaseWidth,
      bgFill: d.bgFill, bgColor: d.bgColor, bgColor2: d.bgColor2, gradientDir: d.gradientDir,
      borderColor: d.borderColor, borderWidth: d.borderWidth,
      textStyle: { ...DEFAULT_TEXT_STYLE },
      spikes: d.spikes,
      connected: null,
    };
    setBubbles(prev => [...prev, bub]);
    setSelectedId(id);
    setConnSelected(false);
  }, [canvasHeight, canvasWidth]);

  const addConnected = useCallback(() => {
    if (!selectedId) return;
    const b = bubbles.find(b => b.id === selectedId);
    if (!b || b.connected) return;
    updateBubble(selectedId, { connected: DEFAULT_CONNECTED(b.width, b.height) });
    setConnSelected(true);
  }, [selectedId, bubbles, updateBubble]);

  const startDrag = (e: React.MouseEvent, b: Bubble) => {
    e.stopPropagation();
    setSelectedId(b.id);
    setConnSelected(false);
    modeRef.current = { type: "drag", id: b.id, startMx: e.clientX, startMy: e.clientY, origX: b.x, origY: b.y };
  };

  const startResize = (e: React.MouseEvent, handle: string, b: Bubble) => {
    e.preventDefault();
    modeRef.current = { type: "resize", id: b.id, handle, startMx: e.clientX, startMy: e.clientY,
      origX: b.x, origY: b.y, origW: b.width, origH: b.height };
  };

  const startTailDrag = (e: React.MouseEvent, b: Bubble) => {
    e.stopPropagation();
    modeRef.current = { type: "tail", id: b.id, startMx: e.clientX, startMy: e.clientY,
      origTx: b.tailX, origTy: b.tailY };
  };

  const startConnDrag = (e: React.MouseEvent, b: Bubble) => {
    e.stopPropagation();
    if (!b.connected) return;
    setConnSelected(true);
    modeRef.current = { type: "drag-conn", id: b.id, startMx: e.clientX, startMy: e.clientY,
      origOx: b.connected.offsetX, origOy: b.connected.offsetY };
  };

  const startConnResize = (e: React.MouseEvent, handle: string, b: Bubble) => {
    e.preventDefault();
    if (!b.connected) return;
    modeRef.current = { type: "resize-conn", id: b.id, handle, startMx: e.clientX, startMy: e.clientY,
      origW: b.connected.width, origH: b.connected.height,
      origOx: b.connected.offsetX, origOy: b.connected.offsetY };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const m = modeRef.current;
      if (m.type === "idle") return;
      const dx = e.clientX - m.startMx, dy = e.clientY - m.startMy;

      if (m.type === "drag") {
        updateBubble(m.id, { x: m.origX + dx, y: m.origY + dy });
      } else if (m.type === "tail") {
        updateBubble(m.id, { tailX: m.origTx + dx, tailY: m.origTy + dy });
      } else if (m.type === "resize") {
        const { handle: hd, origX, origY, origW, origH } = m;
        let nx = origX, ny = origY, nw = origW, nh = origH;
        if (hd.includes("e")) nw = Math.max(80, origW + dx);
        if (hd.includes("s")) nh = Math.max(60, origH + dy);
        if (hd.includes("w")) { nw = Math.max(80, origW - dx); nx = origX + origW - nw; }
        if (hd.includes("n")) { nh = Math.max(60, origH - dy); ny = origY + origH - nh; }
        updateBubble(m.id, { x: nx, y: ny, width: nw, height: nh });
      } else if (m.type === "drag-conn") {
        updateConn(m.id, { offsetX: m.origOx + dx, offsetY: m.origOy + dy });
      } else if (m.type === "resize-conn") {
        const { handle: hd, origW, origH, origOx, origOy } = m;
        let nw = origW, nh = origH, nox = origOx, noy = origOy;
        if (hd.includes("e")) nw = Math.max(60, origW + dx);
        if (hd.includes("s")) nh = Math.max(40, origH + dy);
        if (hd.includes("w")) { nw = Math.max(60, origW - dx); nox = origOx + origW - nw; }
        if (hd.includes("n")) { nh = Math.max(40, origH - dy); noy = origOy + origH - nh; }
        updateConn(m.id, { width: nw, height: nh, offsetX: nox, offsetY: noy });
      }
    };
    const onUp = () => { modeRef.current = { type: "idle" }; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [updateBubble, updateConn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && editTarget === null) {
        if (connSelected) {
          updateBubble(selectedId, { connected: null });
          setConnSelected(false);
        } else {
          setBubbles(p => p.filter(b => b.id !== selectedId));
          setSelectedId(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, connSelected, editTarget, updateBubble]);

  const commitEdit = () => {
    if (!editTarget || !selectedId) return;
    if (editTarget === "main") updateBubble(selectedId, { text: editText });
    else updateConn(selectedId, { text: editText });
    setEditTarget(null);
  };

  const activeTS: TextStyle | null = !selected ? null
    : connSelected && selected.connected ? selected.connected.textStyle
    : selected.textStyle;

  const patchTS = (patch: Partial<TextStyle>) => {
    if (!selectedId) return;
    updateTextStyle(selectedId, patch, connSelected ? "conn" : "main");
  };

  const lbl: CSSProperties = { fontSize: 10, color: "#777", textTransform: "uppercase",
    letterSpacing: "0.06em", fontWeight: 600 };
  const inp: CSSProperties = { padding: "5px 8px", background: "#1c1c2e",
    border: "1px solid #333350", borderRadius: 6, color: "#dde", fontSize: 12,
    fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
  const btn: CSSProperties = { padding: "5px 8px", background: "#1c1c2e",
    border: "1px solid #333350", borderRadius: 6, color: "#c8c8e8", cursor: "pointer", fontSize: 12 };
  const sep: CSSProperties = { borderTop: "1px solid #222234", margin: "6px 0" };

  const activeBubble = connSelected && selected?.connected
    ? { borderRadius: selected.connected.borderRadius, bgFill: selected.connected.bgFill,
        bgColor: selected.connected.bgColor, bgColor2: selected.connected.bgColor2,
        gradientDir: selected.connected.gradientDir, borderColor: selected.connected.borderColor,
        borderWidth: selected.connected.borderWidth }
    : selected
      ? { borderRadius: selected.borderRadius, bgFill: selected.bgFill,
          bgColor: selected.bgColor, bgColor2: selected.bgColor2,
          gradientDir: selected.gradientDir, borderColor: selected.borderColor,
          borderWidth: selected.borderWidth }
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Segoe UI', system-ui, sans-serif",
      background: "#0d0d14", color: "#e8e8f0" }}>
      {isControlled && (onSave != null || onClose != null) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px",
          background: "#13131f", borderBottom: "1px solid #222234", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>Édition des bulles</span>
          <div style={{ display: "flex", gap: 8 }}>
            {onClose && (
              <button type="button" onClick={onClose}
                style={{ padding: "6px 14px", background: "#1c1c2e", border: "1px solid #333350", borderRadius: 6,
                  color: "#c8c8e8", cursor: "pointer", fontSize: 12 }}>
                Fermer
              </button>
            )}
            {onSave && (
              <button type="button" onClick={() => onSave(editorBubblesToSpeechBubbles(bubbles))}
                style={{ padding: "6px 14px", background: "#6366f1", border: "none", borderRadius: 6,
                  color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                Enregistrer
              </button>
            )}
          </div>
        </div>
      )}
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <div style={{ width: 236, background: "#13131f", borderRight: "1px solid #222234",
        display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>

        <div style={{ padding: "13px 16px 10px", fontSize: 13, fontWeight: 700,
          color: "#6366f1", letterSpacing: "0.05em", borderBottom: "1px solid #222234" }}>
          DreamWeave · Bulles
        </div>

        <div style={{ padding: "8px 10px 2px", ...lbl }}>Ajouter</div>
        {(Object.keys(LABELS) as BubbleType[]).map(type => (
          <button key={type} onClick={() => addBubble(type)}
            style={{ margin: "2px 8px", padding: "8px 12px", background: "#1c1c2e",
              border: "1px solid #2d2d45", borderRadius: 7, color: "#c0c0e0",
              cursor: "pointer", textAlign: "left", fontSize: 12, transition: "background 0.12s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#252540")}
            onMouseLeave={e => (e.currentTarget.style.background = "#1c1c2e")}>
            {LABELS[type]}
          </button>
        ))}

        {selected && (
          <div style={{ flex: 1, overflowY: "auto", borderTop: "1px solid #222234",
            padding: "8px 10px 16px", display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>

            <div style={{ display: "flex", gap: 4, marginBottom: 2 }}>
              <button onClick={() => setConnSelected(false)}
                style={{ ...btn, flex: 1, background: !connSelected ? "#6366f1" : "#1c1c2e",
                  fontSize: 11 }}>Corps</button>
              {selected.connected ? (
                <button onClick={() => setConnSelected(true)}
                  style={{ ...btn, flex: 1, background: connSelected ? "#6366f1" : "#1c1c2e",
                    fontSize: 11 }}>Connectée</button>
              ) : (
                <button onClick={addConnected}
                  style={{ ...btn, flex: 1, background: "#1c2c1c", border: "1px solid #2d4a2d",
                    color: "#7ecf7e", fontSize: 11 }}>+ Connecter</button>
              )}
              {connSelected && selected.connected && (
                <button onClick={() => { updateBubble(selectedId!, { connected: null }); setConnSelected(false); }}
                  style={{ ...btn, background: "#2d1515", border: "1px solid #6b2323",
                    color: "#f87171", fontSize: 11, padding: "5px 6px" }}>✕</button>
              )}
            </div>

            <hr style={sep} />

            <div style={lbl}>Texte</div>
            <textarea
              value={editTarget === (connSelected ? "conn" : "main")
                ? editText
                : connSelected ? (selected.connected?.text ?? "") : selected.text}
              rows={2}
              onFocus={() => {
                const t = connSelected ? "conn" : "main";
                setEditTarget(t);
                setEditText(connSelected ? (selected.connected?.text ?? "") : selected.text);
              }}
              onChange={e => setEditText(e.target.value)}
              onBlur={commitEdit}
              style={{ ...inp, resize: "vertical" }}
            />

            {activeTS && (
              <>
                <div style={lbl}>Police</div>
                <select value={activeTS.fontFamily} onChange={e => patchTS({ fontFamily: e.target.value })}
                  style={{ ...inp }}>
                  {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>

                <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <div style={lbl}>Taille · {activeTS.fontSize}px</div>
                    <input type="range" min={8} max={40} value={activeTS.fontSize}
                      onChange={e => patchTS({ fontSize: +e.target.value })}
                      style={{ width: "100%", accentColor: "#6366f1" }} />
                  </div>
                  <div>
                    <div style={lbl}>Couleur</div>
                    <input type="color" value={activeTS.textColor}
                      onChange={e => patchTS({ textColor: e.target.value })}
                      style={{ width: 32, height: 28, border: "none", borderRadius: 4, cursor: "pointer" }} />
                  </div>
                </div>

                <div style={lbl}>Espacement · {activeTS.letterSpacing / 100}em</div>
                <input type="range" min={-10} max={50} value={activeTS.letterSpacing}
                  onChange={e => patchTS({ letterSpacing: +e.target.value })}
                  style={{ accentColor: "#6366f1" }} />

                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {([
                    ["B", "fontWeight", "bold", "normal"],
                    ["I", "fontStyle", "italic", "normal"],
                    ["AA", "textTransform", "uppercase", "none"],
                    ["aa", "textTransform", "lowercase", "none"],
                  ] as const).map(([label, prop, on, off]) => (
                    <button key={label} onClick={() => patchTS({ [prop]: activeTS[prop] === on ? off : on } as Partial<TextStyle>)}
                      style={{ ...btn, flex: 1, minWidth: 30,
                        background: activeTS[prop] === on ? "#6366f1" : "#1c1c2e",
                        fontWeight: label === "B" ? "bold" : "normal",
                        fontStyle: label === "I" ? "italic" : "normal",
                        fontSize: 11 }}>{label}</button>
                  ))}
                  {(["left", "center", "right"] as const).map(a => (
                    <button key={a} onClick={() => patchTS({ textAlign: a })}
                      style={{ ...btn, flex: 1, minWidth: 30,
                        background: activeTS.textAlign === a ? "#6366f1" : "#1c1c2e",
                        fontSize: 13 }}>
                      {a === "left" ? "⬅" : a === "center" ? "■" : "➡"}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => patchTS({ textShadow: !activeTS.textShadow })}
                    style={{ ...btn, flex: 1, background: activeTS.textShadow ? "#6366f1" : "#1c1c2e",
                      fontSize: 11 }}>
                    Ombre texte {activeTS.textShadow ? "✓" : ""}
                  </button>
                  {activeTS.textShadow && (
                    <input type="color" value={activeTS.textShadowColor}
                      onChange={e => patchTS({ textShadowColor: e.target.value })}
                      style={{ width: 28, height: 26, border: "none", borderRadius: 4, cursor: "pointer" }} />
                  )}
                </div>
                {activeTS.textShadow && (
                  <>
                    <div style={lbl}>Flou ombre · {activeTS.textShadowBlur}px</div>
                    <input type="range" min={1} max={20} value={activeTS.textShadowBlur}
                      onChange={e => patchTS({ textShadowBlur: +e.target.value })}
                      style={{ accentColor: "#6366f1" }} />
                  </>
                )}
              </>
            )}

            <hr style={sep} />

            {activeBubble && (
              <>
                <div style={lbl}>Forme</div>

                <div style={lbl}>Arrondi · {activeBubble.borderRadius}%</div>
                <input type="range" min={0} max={50} value={activeBubble.borderRadius}
                  onChange={e => {
                    const v = +e.target.value;
                    if (connSelected) updateConn(selectedId!, { borderRadius: v });
                    else updateBubble(selectedId!, { borderRadius: v });
                  }}
                  style={{ accentColor: "#818cf8" }} />

                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={lbl}>Épaisseur · {activeBubble.borderWidth}px</div>
                    <input type="range" min={0} max={8} step={0.5} value={activeBubble.borderWidth}
                      onChange={e => {
                        const v = +e.target.value;
                        if (connSelected) updateConn(selectedId!, { borderWidth: v });
                        else updateBubble(selectedId!, { borderWidth: v });
                      }}
                      style={{ accentColor: "#818cf8" }} />
                  </div>
                  <div>
                    <div style={lbl}>Bordure</div>
                    <input type="color" value={activeBubble.borderColor}
                      onChange={e => {
                        if (connSelected) updateConn(selectedId!, { borderColor: e.target.value });
                        else updateBubble(selectedId!, { borderColor: e.target.value });
                      }}
                      style={{ width: 32, height: 28, border: "none", borderRadius: 4, cursor: "pointer" }} />
                  </div>
                </div>

                <hr style={sep} />
                <div style={lbl}>Remplissage</div>

                <div style={{ display: "flex", gap: 4 }}>
                  {(["solid", "gradient"] as FillMode[]).map(m => (
                    <button key={m} onClick={() => {
                      if (connSelected) updateConn(selectedId!, { bgFill: m });
                      else updateBubble(selectedId!, { bgFill: m });
                    }}
                      style={{ ...btn, flex: 1, fontSize: 11,
                        background: activeBubble.bgFill === m ? "#6366f1" : "#1c1c2e" }}>
                      {m === "solid" ? "Uni" : "Dégradé"}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <div>
                    <div style={lbl}>{activeBubble.bgFill === "gradient" ? "Couleur 1" : "Fond"}</div>
                    <input type="color" value={activeBubble.bgColor}
                      onChange={e => {
                        if (connSelected) updateConn(selectedId!, { bgColor: e.target.value });
                        else updateBubble(selectedId!, { bgColor: e.target.value });
                      }}
                      style={{ width: 32, height: 28, border: "none", borderRadius: 4, cursor: "pointer" }} />
                  </div>
                  {activeBubble.bgFill === "gradient" && (
                    <>
                      <div>
                        <div style={lbl}>Couleur 2</div>
                        <input type="color" value={activeBubble.bgColor2}
                          onChange={e => {
                            if (connSelected) updateConn(selectedId!, { bgColor2: e.target.value });
                            else updateBubble(selectedId!, { bgColor2: e.target.value });
                          }}
                          style={{ width: 32, height: 28, border: "none", borderRadius: 4, cursor: "pointer" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={lbl}>Direction</div>
                        <select value={activeBubble.gradientDir}
                          onChange={e => {
                            const v = e.target.value as GradientDir;
                            if (connSelected) updateConn(selectedId!, { gradientDir: v });
                            else updateBubble(selectedId!, { gradientDir: v });
                          }}
                          style={{ ...inp, padding: "4px 5px", fontSize: 11 }}>
                          {GRAD_DIRS.map(d => <option key={d} value={d}>{GRAD_DIR_LABELS[d]}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {selected.type !== "caption" && !connSelected && (
              <>
                <hr style={sep} />
                <div style={lbl}>Queue</div>
                <div style={{ padding: "5px 7px", background: "#191928", borderRadius: 5,
                  fontSize: 10, color: "#5a5a88", lineHeight: 1.6 }}>
                  Glissez le <span style={{ color: "#818cf8", fontWeight: 600 }}>✛ violet</span> sur le canvas
                </div>
                <div style={lbl}>Pointe X · {Math.round(selected.tailX)}</div>
                <input type="range" min={-120} max={selected.width + 120} value={selected.tailX}
                  onChange={e => updateBubble(selectedId!, { tailX: +e.target.value })}
                  style={{ accentColor: "#818cf8" }} />
                <div style={lbl}>Pointe Y · {Math.round(selected.tailY)}</div>
                <input type="range" min={-120} max={selected.height + 120} value={selected.tailY}
                  onChange={e => updateBubble(selectedId!, { tailY: +e.target.value })}
                  style={{ accentColor: "#818cf8" }} />
                <div style={lbl}>Largeur base · {selected.tailBaseWidth}px</div>
                <input type="range" min={4} max={60} value={selected.tailBaseWidth}
                  onChange={e => updateBubble(selectedId!, { tailBaseWidth: +e.target.value })}
                  style={{ accentColor: "#818cf8" }} />
              </>
            )}

            {connSelected && selected.connected && (
              <>
                <hr style={sep} />
                <div style={lbl}>Cou · {selected.connected.neckWidth}px</div>
                <input type="range" min={4} max={50} value={selected.connected.neckWidth}
                  onChange={e => updateConn(selectedId!, { neckWidth: +e.target.value })}
                  style={{ accentColor: "#818cf8" }} />
              </>
            )}

            {selected.type === "shout" && !connSelected && (
              <>
                <hr style={sep} />
                <div style={lbl}>Pointes · {selected.spikes}</div>
                <input type="range" min={6} max={22} value={selected.spikes}
                  onChange={e => updateBubble(selectedId!, { spikes: +e.target.value })}
                  style={{ accentColor: "#f43f5e" }} />
              </>
            )}

            <hr style={sep} />
            <button onClick={() => { setBubbles(p => p.filter(b => b.id !== selectedId)); setSelectedId(null); }}
              style={{ ...btn, background: "#2d1515", border: "1px solid #6b2323", color: "#f87171" }}>
              🗑 Supprimer la bulle
            </button>
          </div>
        )}

        {!selected && (
          <div style={{ padding: "14px 12px", fontSize: 11, color: "#333355", lineHeight: 1.7, marginTop: 8 }}>
            Ajoutez une bulle puis cliquez dessus.
          </div>
        )}
      </div>

      {/* CANVAS */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: "relative", overflow: "auto", background: "#10101a" }}
        onClick={() => { setSelectedId(null); setConnSelected(false); setEditTarget(null); }}
      >
        <div
          style={{
            width: canvasWidth,
            height: canvasHeight,
            margin: "20px auto",
            position: "relative",
            overflow: "hidden",
            borderRadius: 12,
            border: "1px solid #222234",
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 45%, #0f3460 100%)",
          }}
        >
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.05, pointerEvents: "none" }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {bubbles.length === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.12)", userSelect: "none" }}>
                <div style={{ fontSize: 52 }}>💬</div>
                <div style={{ fontSize: 14, marginTop: 8 }}>Canvas du panel ({canvasWidth}×{canvasHeight})</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>← Ajoutez des bulles</div>
              </div>
            </div>
          )}

          {bubbles.map(bub => {
          const isSel = bub.id === selectedId && !connSelected;
          const isConnSel = bub.id === selectedId && connSelected;
          const svgProps: BubbleSVGProps = {
            b: bub, isSel, isConnSel,
            onTailDown: e => startTailDrag(e, bub),
            onConnDragDown: e => startConnDrag(e, bub),
            onConnResizeDown: (e, h) => startConnResize(e, h, bub),
            onConnClick: e => { e.stopPropagation(); setSelectedId(bub.id); setConnSelected(true); },
          };

            return (
              <div key={bub.id}
                style={{ position: "absolute", left: bub.x, top: bub.y,
                  width: bub.width, height: bub.height, cursor: "grab", userSelect: "none" }}
                onMouseDown={e => startDrag(e, bub)}
                onDoubleClick={e => {
                  e.stopPropagation();
                  setSelectedId(bub.id); setConnSelected(false);
                  setEditTarget("main"); setEditText(bub.text);
                }}
                onClick={e => { e.stopPropagation(); setSelectedId(bub.id); setConnSelected(false); }}>

              {isSel && (
                <div style={{ position: "absolute", inset: -3,
                  border: "2px dashed rgba(99,102,241,0.6)", borderRadius: 4,
                  pointerEvents: "none", zIndex: 5 }} />
              )}

              {bub.type === "dialogue" && <DialogueSVG {...svgProps} />}
              {bub.type === "thought"  && <ThoughtSVG  {...svgProps} />}
              {bub.type === "shout"    && <ShoutSVG    {...svgProps} />}
              {bub.type === "caption"  && <CaptionSVG  b={bub} />}

                {isSel && <ResizeHandles onDown={(e, h) => startResize(e, h, bub)} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT LAYERS */}
      <div style={{ width: 168, background: "#13131f", borderLeft: "1px solid #222234",
        padding: "13px 11px", display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: "#6366f1", textTransform: "uppercase",
          letterSpacing: "0.1em", fontWeight: 700, marginBottom: 4 }}>
          Calques ({bubbles.length})
        </div>
        {[...bubbles].reverse().map(b => (
          <div key={b.id} onClick={() => { setSelectedId(b.id); setConnSelected(false); }}
            style={{ padding: "6px 9px", borderRadius: 6, cursor: "pointer", fontSize: 11,
              background: b.id === selectedId ? "#23234a" : "#181828",
              border: `1px solid ${b.id === selectedId ? "#6366f1" : "#222234"}`,
              color: b.id === selectedId ? "#b0b0ff" : "#555",
              transition: "all 0.1s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {LABELS[b.type]}{b.connected ? " 🔗" : ""} · <span style={{ opacity: 0.6 }}>{b.text.slice(0, 10)}…</span>
          </div>
        ))}
        {bubbles.length === 0 && <div style={{ fontSize: 11, color: "#2a2a44" }}>Aucune bulle</div>}
        <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid #222234",
          fontSize: 10, color: "#2e2e50", lineHeight: 1.9 }}>
          <div style={{ color: "#44446a", fontWeight: 600, marginBottom: 1 }}>Raccourcis</div>
          Clic → sélect.<br />
          2× clic → éditer<br />
          Glisser → déplacer<br />
          ✛ violet → queue<br />
          🔗 → bulle connectée<br />
          Suppr → effacer
        </div>
      </div>
    </div>
    </div>
  );
}
