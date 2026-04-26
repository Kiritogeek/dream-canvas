import type { SpeechBubble, SpeechBubbleType } from "@/types";
import { SPEECH_BUBBLE_DEFAULT_STYLE, SPEECH_BUBBLE_NO_TAIL_TYPES } from "@/types";

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

function bristlePath(cx: number, cy: number, rInner: number, rOuter: number, count: number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * 2 * Math.PI;
    const v = 0.7 + 0.3 * ((Math.sin(i * 1.7 + 0.5) + Math.sin(i * 3.1 + 1.2) + Math.sin(i * 7.3)) / 3);
    const ro = rInner + (rOuter - rInner) * v;
    const hw = (Math.PI / count) * 0.22;
    const x1 = (cx + rInner * Math.cos(a - hw)).toFixed(1);
    const y1 = (cy + rInner * Math.sin(a - hw)).toFixed(1);
    const x2 = (cx + rInner * Math.cos(a + hw)).toFixed(1);
    const y2 = (cy + rInner * Math.sin(a + hw)).toFixed(1);
    const x3 = (cx + ro * Math.cos(a)).toFixed(1);
    const y3 = (cy + ro * Math.sin(a)).toFixed(1);
    parts.push(`M ${x1} ${y1} L ${x3} ${y3} L ${x2} ${y2} Z`);
  }
  return parts.join(" ");
}

function wavyEllipsePath(cx: number, cy: number, rx: number, ry: number, amp: number, freq: number, n = 60): string {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    const w = amp * Math.sin(freq * a);
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

const TAIL_FLIP = "translate(100, 0) scale(-1, 1)";
const NNS = "non-scaling-stroke" as const;

export function SpeechBubbleShape({ type, fill, stroke, tailFlip }: {
  type: SpeechBubble["type"];
  fill: string;
  stroke: string;
  tailFlip?: boolean;
}) {
  const sw = 2;
  const tf = tailFlip ? TAIL_FLIP : undefined;

  if (type === "speech") {
    return (
      <>
        <ellipse cx={50} cy={46} rx={47} ry={42} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        <g transform={tf}>
          <path d="M 16 84 L 4 120 L 36 90 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  if (type === "thought") {
    const bristles = bristlePath(50, 50, 37, 56, 180);
    return (
      <>
        <path d={bristles} fill={stroke} />
        <circle cx={50} cy={50} r={37} fill={fill} />
      </>
    );
  }

  if (type === "cloud") {
    return (
      <>
        <ellipse cx={50} cy={47} rx={44} ry={36} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        <circle cx={20} cy={43} r={12} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        <circle cx={80} cy={43} r={12} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        <circle cx={32} cy={18} r={9.5} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        <circle cx={68} cy={18} r={9.5} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        <g transform={tf}>
          <circle cx={62} cy={86} r={7} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          <circle cx={70} cy={101} r={5} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          <circle cx={77} cy={113} r={3.5} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        </g>
      </>
    );
  }

  if (type === "narration") {
    return <rect x={3} y={3} width={94} height={94} rx={3} ry={3} fill={fill} stroke={stroke} strokeWidth={sw + 0.5} vectorEffect={NNS} />;
  }

  if (type === "shout") {
    const body = spikePath(50, 50, 37, 52, 12);
    return (
      <>
        <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        <g transform={tf}>
          <path d="M 28 88 L 18 104 L 30 106 L 16 120 L 32 116 L 29 108 L 42 98 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  if (type === "whisper") {
    return (
      <>
        <ellipse cx={50} cy={46} rx={47} ry={42} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="6 3" vectorEffect={NNS} />
        <g transform={tf}>
          <path d="M 16 84 L 4 120 L 36 90 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="6 3" strokeLinejoin="round" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  if (type === "anger") {
    const body = angryOvalPath(50, 46, 43, 38, 8, 10);
    return (
      <>
        <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        <g transform={tf}>
          <path d="M 16 80 L 6 104 L 20 100 L 10 120 L 26 114 L 22 106 L 34 88 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  if (type === "sadness") {
    return (
      <>
        <ellipse cx={50} cy={44} rx={47} ry={40} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        <ellipse cx={28} cy={91} rx={4} ry={6.5} fill={stroke} />
        <ellipse cx={40} cy={94} rx={3} ry={5} fill={stroke} />
        <ellipse cx={52} cy={93} rx={3.5} ry={5.5} fill={stroke} />
        <g transform={tf}>
          <path d="M 16 82 L 4 120 L 36 88 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  if (type === "radio") {
    return (
      <>
        <path d="M 10 14 L 90 14 L 96 26 L 96 76 L 88 88 L 12 88 L 4 76 L 4 26 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        <g transform={tf}>
          <path d="M 70 88 L 60 103 L 71 105 L 57 120 L 72 117 L 69 109 L 80 95 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  if (type === "electronic") {
    return (
      <>
        <path d="M 6 18 L 20 8 L 80 8 L 94 18 L 96 82 L 82 92 L 18 92 L 4 82 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        <polyline points="20,92 24,98 28,92 32,98 36,92" fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        <g transform={tf}>
          <path d="M 42 92 L 38 106 L 45 108 L 40 120 L 50 117 L 48 108 L 56 98 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  if (type === "explosion") {
    const body = spikePath(50, 50, 28, 52, 9);
    return (
      <>
        <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        <g transform={tf}>
          <path d="M 26 84 L 20 100 L 32 102 L 22 118 L 36 114 L 33 106 L 44 96 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  if (type === "wavy") {
    const body = wavyEllipsePath(50, 46, 46, 41, 3, 7);
    return (
      <>
        <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        <g transform={tf}>
          <path d="M 16 84 L 4 120 L 36 90 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="5 2" strokeLinejoin="round" vectorEffect={NNS} />
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
        <span className="text-center leading-tight break-words line-clamp-2" style={{ fontSize: 8, color: "#111", maxWidth: "88%" }}>
          {label}
        </span>
      </div>
    </div>
  );
}
