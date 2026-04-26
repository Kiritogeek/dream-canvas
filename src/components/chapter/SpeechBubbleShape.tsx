import type { SpeechBubble, SpeechBubbleType } from "@/types";
import { SPEECH_BUBBLE_DEFAULT_STYLE } from "@/types";

export const SPEECH_BUBBLE_TAIL_H = 14;
export const SPEECH_BUBBLE_VIEWBOX_WITH_TAIL = "0 0 100 120";
export const SPEECH_BUBBLE_VIEWBOX_NARRATION = "0 0 100 100";

const SAMPLE_TEXT: Record<SpeechBubbleType, string> = {
  speech: "Salut !",
  shout: "AAAH !",
  whisper: "...psst",
  thought: "Hmm...",
  narration: "Il était une fois…",
  radio: "Bzzt—",
  electronic: "01101",
  explosion: "BOOM!",
  wavy: "n-non…",
  text: "CRACK!",
};

function wavyEllipsePath(cx: number, cy: number, rx: number, ry: number, amplitude: number, freq: number, n = 60): string {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 2 * Math.PI;
    const wave = amplitude * Math.sin(freq * angle);
    pts.push(`${(cx + (rx + wave) * Math.cos(angle)).toFixed(2)},${(cy + (ry + wave) * Math.sin(angle)).toFixed(2)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(" L ")} Z`;
}

function spikePath(cx: number, cy: number, rInner: number, rOuter: number, spikes: number): string {
  const pts: string[] = [];
  const total = spikes * 2;
  for (let i = 0; i < total; i++) {
    const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(" L ")} Z`;
}

export function SpeechBubbleShape({ type, fill, stroke }: {
  type: SpeechBubble["type"];
  fill: string;
  stroke: string;
}) {
  const sw = 2.2;

  if (type === "speech") {
    return (
      <>
        <ellipse cx={50} cy={49} rx={47} ry={43} fill={fill} stroke={stroke} strokeWidth={sw} />
        <path
          d="M 26 90 Q 12 108 20 118 Q 28 110 40 91 Z"
          fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"
        />
      </>
    );
  }

  if (type === "whisper") {
    return (
      <>
        <ellipse cx={50} cy={49} rx={47} ry={43} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="5 3" />
        <path
          d="M 26 90 Q 12 108 20 118 Q 28 110 40 91 Z"
          fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="5 3" strokeLinejoin="round"
        />
      </>
    );
  }

  if (type === "thought") {
    return (
      <>
        <ellipse cx={50} cy={47} rx={44} ry={36} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={20} cy={43} r={12} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={80} cy={43} r={12} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={32} cy={18} r={9.5} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={68} cy={18} r={9.5} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={62} cy={86} r={7} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={70} cy={101} r={5} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={77} cy={113} r={3.5} fill={fill} stroke={stroke} strokeWidth={sw} />
      </>
    );
  }

  if (type === "narration") {
    return (
      <>
        <rect x={3} y={3} width={94} height={94} rx={6} ry={6} fill={fill} stroke={stroke} strokeWidth={sw} />
        <rect x={3} y={3} width={6} height={94} rx={3} ry={3} fill={stroke} />
      </>
    );
  }

  if (type === "shout") {
    const body = spikePath(50, 50, 37, 51, 12);
    return (
      <>
        <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path
          d="M 30 88 L 20 104 L 32 106 L 18 120 L 33 116 L 30 108 L 42 98 Z"
          fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"
        />
      </>
    );
  }

  if (type === "radio") {
    return (
      <>
        <path
          d="M 10 14 L 90 14 L 96 26 L 96 76 L 88 88 L 12 88 L 4 76 L 4 26 Z"
          fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"
        />
        <path
          d="M 70 88 L 60 103 L 71 105 L 57 120 L 72 117 L 69 109 L 80 95 Z"
          fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"
        />
      </>
    );
  }

  if (type === "electronic") {
    return (
      <>
        <path
          d="M 6 18 L 20 8 L 80 8 L 94 18 L 96 82 L 82 92 L 18 92 L 4 82 Z"
          fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"
        />
        <polyline
          points="20,92 24,98 28,92 32,98 36,92"
          fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"
        />
        <path
          d="M 42 92 L 38 106 L 45 108 L 40 120 L 50 117 L 48 108 L 56 98 Z"
          fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"
        />
      </>
    );
  }

  if (type === "explosion") {
    const body = spikePath(50, 50, 28, 52, 9);
    return (
      <>
        <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path
          d="M 28 84 L 22 100 L 34 102 L 24 118 L 38 114 L 35 106 L 46 96 Z"
          fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"
        />
      </>
    );
  }

  if (type === "wavy") {
    const wavyPath = wavyEllipsePath(50, 49, 46, 42, 3, 7);
    return (
      <>
        <path d={wavyPath} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path
          d="M 26 90 Q 12 108 20 118 Q 28 110 40 91 Z"
          fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="4 2" strokeLinejoin="round"
        />
      </>
    );
  }

  return null;
}

/** Aperçu miniature d'une bulle — utilisé dans la sidebar du menu Dialogue. */
export function BubblePreview({ type, size = "md" }: {
  type: SpeechBubbleType;
  size?: "sm" | "md";
}) {
  const { fill, stroke } = SPEECH_BUBBLE_DEFAULT_STYLE[type];
  const label = SAMPLE_TEXT[type];
  const isNoShape = type === "text";
  const isNarration = type === "narration";
  const viewBox = isNarration ? SPEECH_BUBBLE_VIEWBOX_NARRATION : SPEECH_BUBBLE_VIEWBOX_WITH_TAIL;
  const h = size === "sm" ? 44 : 52;
  const fontSize = size === "sm" ? 8 : 9;

  if (isNoShape) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: h }}>
        <span className="font-bold tracking-widest text-foreground" style={{ fontSize: 13, fontFamily: "'Bangers', cursive", letterSpacing: "0.1em" }}>
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: h }}>
      <svg viewBox={viewBox} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
        <SpeechBubbleShape type={type} fill={fill} stroke={stroke} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pb-2 px-2">
        <span
          className="text-center font-medium leading-tight line-clamp-2 break-words"
          style={{ fontSize, color: "#111", maxWidth: "90%" }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
