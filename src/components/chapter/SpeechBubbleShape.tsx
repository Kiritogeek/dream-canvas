import type { SpeechBubble, SpeechBubbleType } from "@/types";
import { SPEECH_BUBBLE_DEFAULT_STYLE, SPEECH_BUBBLE_NO_TAIL_TYPES } from "@/types";
import { buildUnifiedTailPath, TAIL_ELLIPSE } from "./speechBubbleTail";

export const SPEECH_BUBBLE_TAIL_H = 14;
export const SPEECH_BUBBLE_VIEWBOX_WITH_TAIL = "0 0 100 120";
export const SPEECH_BUBBLE_VIEWBOX_NARRATION = "0 0 100 100";

const SAMPLE_TEXT: Record<SpeechBubbleType, string> = {
  speech: "Salut !",
  thought: "...",
  cloud: "Hmm...",
  shout: "AAAH !",
  anger: "RAGE !",
  sadness: "sob...",
  whisper: "...psst",
  narration: "Il était une fois…",
  radio: "Bzzt—",
  electronic: "01101",
  explosion: "BOOM!",
  wavy: "n-non…",
  text: "CRACK!",
};

// Subtle feTurbulence filter — simulates hand-drawn wobble (scale=1.5 = barely perceptible)
const HAND_DRAWN_DEFS = (
  <defs>
    <filter id="hd" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="2" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
);

function wavyEllipsePath(cx: number, cy: number, rx: number, ry: number, amp: number, freq: number, n = 60): string {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    const ampVar = amp * (0.75 + 0.25 * Math.sin(a * 2.1 + 0.8));
    const w = ampVar * Math.sin(freq * a);
    pts.push(`${(cx + (rx + w) * Math.cos(a)).toFixed(2)},${(cy + (ry + w) * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(" L ")} Z`;
}

function spikePath(cx: number, cy: number, rInner: number, rOuter: number, spikes: number): string {
  const pts: string[] = [];
  const total = spikes * 2;
  for (let i = 0; i < total; i++) {
    const a = (i / total) * 2 * Math.PI - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(" L ")} Z`;
}

function angryOvalPath(cx: number, cy: number, rx: number, ry: number, amp: number, spikes: number, n = 120): string {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    const s = amp * Math.abs(Math.sin(spikes * a));
    pts.push(`${(cx + (rx + s) * Math.cos(a)).toFixed(2)},${(cy + (ry + s) * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(" L ")} Z`;
}

// Irregular star: variable outer radii + slight angular noise per spike
function irregularSpikePath(
  cx: number, cy: number, rInner: number,
  outerRadii: number[], angleNoises: number[]
): string {
  const pts: string[] = [];
  const spikes = outerRadii.length;
  for (let i = 0; i < spikes; i++) {
    const baseA = (i / spikes) * 2 * Math.PI - Math.PI / 2;
    const outerA = baseA + (angleNoises[i] * Math.PI / 180);
    const innerA = baseA + Math.PI / spikes;
    pts.push(`${(cx + outerRadii[i] * Math.cos(outerA)).toFixed(2)},${(cy + outerRadii[i] * Math.sin(outerA)).toFixed(2)}`);
    pts.push(`${(cx + rInner * Math.cos(innerA)).toFixed(2)},${(cy + rInner * Math.sin(innerA)).toFixed(2)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(" L ")} Z`;
}

const SHOUT_OUTER = [52, 47, 55, 46, 53, 49, 56, 48, 52, 45, 54, 47];
const SHOUT_NOISE = [0, 1.5, -1, 2, -1.5, 1, -2, 2, -1, 1.5, -1.5, 1];

const TAIL_FLIP = "translate(100, 0) scale(-1, 1)";
const NNS = "non-scaling-stroke" as const;

/**
 * Règle de rendu : la queue est toujours dessinée EN PREMIER.
 * Le corps de la bulle (fill blanc) est dessiné PAR-DESSUS et couvre la base de la queue.
 * → jonction propre, aucun trait de queue visible à l'intérieur du corps.
 *
 * Les points de base de la queue sont volontairement placés à l'intérieur du corps
 * pour garantir que le fill du corps les couvre totalement.
 */
export function SpeechBubbleShape({ type, fill, stroke, tailFlip, strokeWidth, tailX, tailY, tailBaseWidth, tailCurve }: {
  type: SpeechBubble["type"];
  fill: string;
  stroke: string;
  tailFlip?: boolean;
  strokeWidth?: number;
  tailX?: number;
  tailY?: number;
  tailBaseWidth?: number;
  tailCurve?: number;
}) {
  const sw = strokeWidth ?? 2;
  const tf = tailFlip ? TAIL_FLIP : undefined;

  // Résout les coords de la pointe de queue (en coordonnées viewBox "0 0 100 120")
  const resolveTailCoords = (defaultTx: number) => {
    const tx = tailX ?? defaultTx;
    const ty = tailY ?? 115;
    const hw = (tailBaseWidth ?? 28) / 2;
    const curve = tailCurve ?? 0;
    return { tx, ty, hw, curve };
  };

  // ── Dialogue : queue dessinée EN PREMIER, corps (ellipse fixe) PAR-DESSUS ──
  // Même règle que whisper/cloud : le fill de l'ellipse couvre la base de la queue,
  // ce qui stabilise le body quand tailBaseWidth / tailCurve changent.
  if (type === "speech") {
    const e = TAIL_ELLIPSE.speech;
    const defaultTx = tailFlip ? 85 : 15;
    const { tx, ty, hw, curve } = resolveTailCoords(defaultTx);
    const d = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    return (
      <>
        <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
      </>
    );
  }

  // ── Pensée : nuage de cercles + queue de bulles décroissantes ─────────────
  if (type === "thought") {
    return (
      <>
        <g transform={tf}>
          <circle cx={34} cy={80} r={7} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          <circle cx={25} cy={95} r={4.5} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          <circle cx={18} cy={108} r={2.5} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        </g>
        <circle cx={50} cy={46} r={29} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        <circle cx={24} cy={53} r={17} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        <circle cx={76} cy={53} r={17} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        <circle cx={34} cy={32} r={14} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        <circle cx={66} cy={32} r={14} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        <circle cx={50} cy={23} r={12} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
      </>
    );
  }

  // ── Pensée nuage : queue unifiée + filtre hd + corps nuage ──────────────
  if (type === "cloud") {
    const e = TAIL_ELLIPSE.cloud;
    const defaultTx = tailFlip ? 85 : 15;
    const { tx, ty, hw, curve } = resolveTailCoords(defaultTx);
    const tailPath = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    return (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          <path d={tailPath} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
          <ellipse cx={50} cy={47} rx={44} ry={36} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          <circle cx={20} cy={43} r={12} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          <circle cx={80} cy={43} r={12} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          <circle cx={32} cy={18} r={9.5} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          <circle cx={68} cy={18} r={9.5} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        </g>
      </>
    );
  }

  // ── Narration : rectangle, aspect intentionnellement mécanique ───────────
  if (type === "narration") {
    return (
      <rect x={3} y={3} width={94} height={94} rx={3} ry={3}
        fill={fill} stroke={stroke} strokeWidth={sw + 0.5} vectorEffect={NNS} />
    );
  }

  // ── Cri : étoile 12 pointes irrégulières, queue éclair ───────────────────
  if (type === "shout") {
    const body = irregularSpikePath(50, 50, 37, SHOUT_OUTER, SHOUT_NOISE);
    return (
      <>
        <g transform={tf}>
          <path d="M 34 70 L 24 104 L 34 106 L 20 120 L 34 116 L 32 108 L 44 80 Z"
            fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        </g>
        <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
      </>
    );
  }

  // ── Chuchotement : queue unifiée + ovale tirets + filtre hd ─────────────
  if (type === "whisper") {
    const e = TAIL_ELLIPSE.whisper;
    const defaultTx = tailFlip ? 85 : 15;
    const { tx, ty, hw, curve } = resolveTailCoords(defaultTx);
    const tailPath = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    return (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          {/* Queue unifiée dessinée EN PREMIER */}
          <path d={tailPath} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="5 4" strokeLinejoin="round" vectorEffect={NNS} />
          {/* Corps PAR-DESSUS — couvre la base de la queue */}
          <ellipse cx={50} cy={46} rx={47} ry={42}
            fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="6 3" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  // ── Colère : queue unifiée + ovale avec pointes + filtre hd ──────────────
  if (type === "anger") {
    const body = angryOvalPath(50, 46, 43, 38, 8, 10);
    const e = TAIL_ELLIPSE.anger;
    const defaultTx = tailFlip ? 85 : 15;
    const { tx, ty, hw, curve } = resolveTailCoords(defaultTx);
    const tailPath = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    return (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          <path d={tailPath} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
          <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  // ── Tristesse : queue unifiée + ovale + larmes + filtre hd ───────────────
  if (type === "sadness") {
    const e = TAIL_ELLIPSE.sadness;
    const defaultTx = tailFlip ? 85 : 15;
    const { tx, ty, hw, curve } = resolveTailCoords(defaultTx);
    const tailPath = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    return (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          <path d={tailPath} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
          <ellipse cx={50} cy={44} rx={47} ry={40}
            fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          <ellipse cx={28} cy={91} rx={4} ry={6.5} fill={stroke} />
          <ellipse cx={40} cy={94} rx={3} ry={5} fill={stroke} />
          <ellipse cx={52} cy={93} rx={3.5} ry={5.5} fill={stroke} />
        </g>
      </>
    );
  }

  // ── Transmission : octogone + filtre hd ──────────────────────────────────
  if (type === "radio") {
    return (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          <g transform={tf}>
            <path d="M 70 82 L 60 103 L 71 105 L 57 120 L 72 117 L 69 109 L 80 84 Z"
              fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
          </g>
          <path d="M 10 14 L 90 14 L 96 26 L 96 76 L 88 88 L 12 88 L 4 76 L 4 26 Z"
            fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  // ── Électronique : aspect mécanique conservé intentionnellement ──────────
  if (type === "electronic") {
    return (
      <>
        <g transform={tf}>
          <path d="M 42 84 L 38 106 L 45 108 L 40 120 L 50 117 L 48 108 L 56 84 Z"
            fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        </g>
        <path d="M 6 18 L 20 8 L 80 8 L 94 18 L 96 82 L 82 92 L 18 92 L 4 82 Z"
          fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        <polyline points="20,92 24,98 28,92 32,98 36,92"
          fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
      </>
    );
  }

  // ── Impact : étoile + filtre hd ───────────────────────────────────────────
  if (type === "explosion") {
    const body = spikePath(50, 50, 28, 52, 9);
    return (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          <g transform={tf}>
            <path d="M 34 62 L 22 100 L 34 102 L 22 118 L 36 114 L 33 106 L 44 70 Z"
              fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
          </g>
          <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  // ── Tremblant : queue unifiée + ovale amplitude variable + filtre hd ─────
  if (type === "wavy") {
    const body = wavyEllipsePath(50, 46, 46, 41, 3, 7);
    const e = TAIL_ELLIPSE.wavy;
    const defaultTx = tailFlip ? 85 : 15;
    const { tx, ty, hw, curve } = resolveTailCoords(defaultTx);
    const tailPath = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    return (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          <path d={tailPath} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="5 2" strokeLinejoin="round" vectorEffect={NNS} />
          <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        </g>
      </>
    );
  }

  return null;
}

export function BubblePreview({ type }: { type: SpeechBubbleType }) {
  const { fill, stroke } = SPEECH_BUBBLE_DEFAULT_STYLE[type];
  const label = SAMPLE_TEXT[type];
  const isNoShape = type === "text";
  const isNoTail = SPEECH_BUBBLE_NO_TAIL_TYPES.has(type);
  const viewBox = isNoTail ? SPEECH_BUBBLE_VIEWBOX_NARRATION : SPEECH_BUBBLE_VIEWBOX_WITH_TAIL;

  if (isNoShape) {
    return (
      <div className="w-full h-14 flex items-center justify-center">
        <span style={{ fontSize: 15, fontFamily: "'Bangers', cursive", letterSpacing: "0.1em", color: "hsl(var(--foreground))" }}>
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-14">
      <svg viewBox={viewBox} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
        <SpeechBubbleShape type={type} fill={fill} stroke={stroke} />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center px-2 ${isNoTail ? "" : "pb-2"}`}>
        <span className="text-center leading-tight break-words line-clamp-2"
          style={{ fontSize: 8, color: "#111", maxWidth: "88%" }}>
          {label}
        </span>
      </div>
    </div>
  );
}
