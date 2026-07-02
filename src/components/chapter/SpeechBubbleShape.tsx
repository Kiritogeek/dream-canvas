import type { SpeechBubble, SpeechBubbleType } from "@/types";
import { SPEECH_BUBBLE_DEFAULT_STYLE, SPEECH_BUBBLE_NO_TAIL_TYPES } from "@/types";
import { buildUnifiedTailPath, buildTailOnlyPath, buildBodyArcPath, TAIL_ELLIPSE } from "./speechBubbleTail";

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

// Irregular star with concave sides — control point pulled toward center
function concaveIrregularSpikePath(
  cx: number, cy: number, rInner: number,
  outerRadii: number[], angleNoises: number[],
  concaveness: number
): string {
  const spikes = outerRadii.length;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < spikes; i++) {
    const baseA = (i / spikes) * 2 * Math.PI - Math.PI / 2;
    const outerA = baseA + (angleNoises[i] * Math.PI / 180);
    const innerA = baseA + Math.PI / spikes;
    pts.push({ x: cx + outerRadii[i] * Math.cos(outerA), y: cy + outerRadii[i] * Math.sin(outerA) });
    pts.push({ x: cx + rInner * Math.cos(innerA), y: cy + rInner * Math.sin(innerA) });
  }
  const total = pts.length;
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} `;
  for (let i = 0; i < total; i++) {
    const from = pts[i];
    const to = pts[(i + 1) % total];
    if (concaveness > 0) {
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      d += `Q ${(mx + (cx - mx) * concaveness).toFixed(2)} ${(my + (cy - my) * concaveness).toFixed(2)} ${to.x.toFixed(2)} ${to.y.toFixed(2)} `;
    } else {
      d += `L ${to.x.toFixed(2)} ${to.y.toFixed(2)} `;
    }
  }
  return d + "Z";
}

function thoughtBodyRadius(rx: number, ry: number, bumpR: number, angle: number): number {
  const ex = (rx + bumpR) * Math.cos(angle);
  const ey = (ry + bumpR) * Math.sin(angle);
  return Math.sqrt(ex * ex + ey * ey);
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
export function SpeechBubbleShape({ type, fill, stroke, tailFlip, strokeWidth, tailX, tailY, tailBaseWidth, tailCurve, tailOn, thoughtBumpR, thoughtGap, thoughtTailGap, thoughtTailOval, thoughtTailDotSize, tailDotAspectRatio }: {
  type: SpeechBubble["type"];
  fill: string;
  stroke: string;
  tailFlip?: boolean;
  strokeWidth?: number;
  tailX?: number;
  tailY?: number;
  tailBaseWidth?: number;
  tailCurve?: number;
  tailOn?: boolean;
  thoughtBumpR?: number;
  thoughtGap?: number;
  thoughtTailGap?: number;
  thoughtTailOval?: number;
  thoughtTailDotSize?: number;
  tailDotAspectRatio?: number;
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
    if (tailOn === false) {
      return <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />;
    }
    const defaultTx = tailFlip ? 85 : 15;
    const { tx, ty, hw, curve } = resolveTailCoords(defaultTx);
    const d = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    const tailOnly = buildTailOnlyPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    const arcD = buildBodyArcPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    return (
      <>
        <path d={d} fill={fill} stroke="none" />
        {tailOnly && <path d={tailOnly} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" vectorEffect={NNS} />}
        <path d={arcD} fill="none" stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
      </>
    );
  }

  // ── Pensée : nuage de cercles + queue de bulles décroissantes ─────────────
  if (type === "thought") {
    const bumpR = thoughtBumpR ?? 10;
    const gap = thoughtGap ?? -5;
    const tGap = thoughtTailGap ?? 3;
    const tOval = thoughtTailOval ?? 0;
    const tDotSize = thoughtTailDotSize ?? 1;
    const curve = tailCurve ?? 0;
    const CX = 50, CY = 46, RX = 24, RY = 18;

    const perim = Math.PI * (3 * (RX + RY) - Math.sqrt((3 * RX + RY) * (RX + 3 * RY)));
    const N = Math.max(3, Math.round(perim / (2 * bumpR + Math.max(-bumpR * 1.5, gap))));

    const tailDotsStroke: JSX.Element[] = [];
    const tailDots: JSX.Element[] = [];
    if (tailOn !== false) {
      const tx = tailX ?? 15;
      const ty = tailY ?? 115;
      const angle = Math.atan2(ty - CY, tx - CX);
      const bodyR = thoughtBodyRadius(RX, RY, bumpR, angle);
      const p0x = CX + bodyR * Math.cos(angle), p0y = CY + bodyR * Math.sin(angle);
      const mx = (p0x + tx) / 2, my = (p0y + ty) / 2;
      const cpx = mx - Math.sin(angle) * curve, cpy = my + Math.cos(angle) * curve;
      const bezier = (t: number): [number, number] => {
        const u = 1 - t;
        return [u * u * p0x + 2 * u * t * cpx + t * t * tx, u * u * p0y + 2 * u * t * cpy + t * t * ty];
      };
      const SAMPLES = 120;
      const cumLen = [0];
      let prevPt = bezier(0);
      for (let i = 1; i <= SAMPLES; i++) {
        const pt = bezier(i / SAMPLES);
        cumLen.push(cumLen[i - 1] + Math.hypot(pt[0] - prevPt[0], pt[1] - prevPt[1]));
        prevPt = pt;
      }
      const arcLen = cumLen[SAMPLES];
      const tAtDist = (d: number) => {
        for (let i = 1; i <= SAMPLES; i++) {
          if (cumLen[i] >= d) return (i - 1 + (d - cumLen[i - 1]) / (cumLen[i] - cumLen[i - 1])) / SAMPLES;
        }
        return 1;
      };
      // 5 cercles toujours distribués sur toute la longueur de l'arc — même principe que la bulle dialogue.
      // Les tailles s'adaptent à la distance : queue courte → petits cercles, queue longue → grands cercles.
      const N_DOTS = 5;
      const TAPER = [1, 0.72, 0.52, 0.37, 0.26];
      const baseR = Math.min(arcLen * 0.14, 9) * tDotSize;
      const step = arcLen / (N_DOTS + 1) + tGap;
      const stretch = 1 + Math.abs(tOval) * 0.2;
      const dotRx = (r: number) => tOval >= 0 ? r * stretch : r / stretch;
      const dotRy = (r: number) => tOval >= 0 ? r / stretch : r * stretch;
      if (arcLen > 3) {
        TAPER.forEach((rel, idx) => {
          const r = Math.max(0.3, baseR * rel);
          const [dx, dy] = bezier(tAtDist(step * (idx + 1)));
          const ex = parseFloat(dx.toFixed(1));
          const ey = parseFloat(dy.toFixed(1));
          const erx = parseFloat((dotRx(r) * (tailDotAspectRatio ?? 1)).toFixed(1));
          const ery = parseFloat(dotRy(r).toFixed(1));
          tailDotsStroke.push(
            <ellipse
              key={`tds-${idx}`}
              className="thought-tail-dot-stroke"
              cx={ex} cy={ey} rx={erx} ry={ery}
              fill="none"
              stroke={stroke}
              strokeWidth={sw}
              vectorEffect={NNS}
            />
          );
          tailDots.push(
            <ellipse
              key={`td-${idx}`}
              className="thought-tail-dot"
              cx={ex} cy={ey} rx={erx} ry={ery}
              fill={fill}
              stroke="none"
            />
          );
        });
      }
    }

    // Calcul des centres des bosses une seule fois (utilisés pour les deux passes).
    const bumpCenters: { cx: number; cy: number }[] = [];
    for (let k = 0; k < N; k++) {
      const a = (k / N) * 2 * Math.PI;
      bumpCenters.push({
        cx: parseFloat((CX + RX * Math.cos(a)).toFixed(1)),
        cy: parseFloat((CY + RY * Math.sin(a)).toFixed(1)),
      });
    }

    // Rendu en deux passes (identique aux autres bulles) :
    // 1. Anneaux de contour (stroke only) — vectorEffect NNS = pixels écran, pas unités SVG.
    // 2. Remplissage (fill only) par-dessus — couvre les chevauchements internes de contours.
    return (
      <>
        {tailDotsStroke}
        {tailDots}
        {bumpCenters.map(({ cx, cy }, k) => (
          <circle key={`bcs-${k}`} cx={cx} cy={cy} r={bumpR}
            fill="none" stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        ))}
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY}
          fill="none" stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        {bumpCenters.map(({ cx, cy }, k) => (
          <circle key={`bcf-${k}`} cx={cx} cy={cy} r={bumpR} fill={fill} stroke="none" />
        ))}
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill={fill} stroke="none" />
      </>
    );
  }

  // ── Pensée nuage : queue unifiée + filtre hd + corps nuage ──────────────
  if (type === "cloud") {
    const cloudBody = (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          <ellipse cx={50} cy={47} rx={44} ry={36} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          <circle cx={20} cy={43} r={12} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          <circle cx={80} cy={43} r={12} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          <circle cx={32} cy={18} r={9.5} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          <circle cx={68} cy={18} r={9.5} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
        </g>
      </>
    );
    if (tailOn === false) return cloudBody;
    const e = TAIL_ELLIPSE.cloud;
    const defaultTx = tailFlip ? 85 : 15;
    const { tx, ty, hw, curve } = resolveTailCoords(defaultTx);
    const tailPath = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    const tailOnly = buildTailOnlyPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    return (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          <path d={tailPath} fill={fill} stroke="none" />
          {tailOnly && <path d={tailOnly} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" vectorEffect={NNS} />}
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
      <rect x={3} y={3} width={94} height={94} rx={0} ry={0}
        fill={fill} stroke={stroke} strokeWidth={sw + 0.5} vectorEffect={NNS} />
    );
  }

  // ── Cri : étoile 12 pointes irrégulières concaves
  // Queue opt-in (tailOn === true) : ellipse virtuelle interne dessinée EN PREMIER,
  // corps PAR-DESSUS — même stratégie que cloud/explosion, zéro espace visible.
  if (type === "shout") {
    const conc = 0.5;
    const body = concaveIrregularSpikePath(50, 46, 37, SHOUT_OUTER, SHOUT_NOISE, conc);
    if (tailOn !== true) {
      return <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />;
    }
    const defaultTx = tailFlip ? 85 : 15;
    const { tx, ty, hw, curve } = resolveTailCoords(defaultTx);
    const vr = Math.max(14, 30 * (1 - 0.5 * conc));
    const tailPath = buildTailOnlyPath(50, 46, vr, vr, tx, ty, hw, curve);
    return (
      <>
        {tailPath && (
          <path d={tailPath} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" vectorEffect={NNS} />
        )}
        <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
      </>
    );
  }

  // ── Chuchotement : queue unifiée + ovale tirets + filtre hd ─────────────
  if (type === "whisper") {
    const whisperBody = (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          <ellipse cx={50} cy={46} rx={47} ry={42}
            fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="6 3" vectorEffect={NNS} />
        </g>
      </>
    );
    if (tailOn === false) return whisperBody;
    const e = TAIL_ELLIPSE.whisper;
    const defaultTx = tailFlip ? 85 : 15;
    const { tx, ty, hw, curve } = resolveTailCoords(defaultTx);
    const tailPath = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    const tailOnly = buildTailOnlyPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    return (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          <path d={tailPath} fill={fill} stroke="none" />
          {tailOnly && <path d={tailOnly} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" vectorEffect={NNS} />}
          <ellipse cx={50} cy={46} rx={47} ry={42}
            fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="6 3" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  // ── Colère : queue unifiée + ovale avec pointes + filtre hd ──────────────
  if (type === "anger") {
    const body = angryOvalPath(50, 46, 43, 38, 8, 10);
    if (tailOn === false) {
      return (
        <>
          {HAND_DRAWN_DEFS}
          <g filter="url(#hd)">
            <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
          </g>
        </>
      );
    }
    const e = TAIL_ELLIPSE.anger;
    const defaultTx = tailFlip ? 85 : 15;
    const { tx, ty, hw, curve } = resolveTailCoords(defaultTx);
    const tailPath = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    const tailOnly = buildTailOnlyPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    return (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          <path d={tailPath} fill={fill} stroke="none" />
          {tailOnly && <path d={tailOnly} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" vectorEffect={NNS} />}
          <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" vectorEffect={NNS} />
        </g>
      </>
    );
  }

  // ── Tristesse : queue unifiée + ovale + larmes + filtre hd ───────────────
  if (type === "sadness") {
    if (tailOn === false) {
      return (
        <>
          {HAND_DRAWN_DEFS}
          <g filter="url(#hd)">
            <ellipse cx={50} cy={44} rx={47} ry={40}
              fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
            <ellipse cx={28} cy={91} rx={4} ry={6.5} fill={stroke} />
            <ellipse cx={40} cy={94} rx={3} ry={5} fill={stroke} />
            <ellipse cx={52} cy={93} rx={3.5} ry={5.5} fill={stroke} />
          </g>
        </>
      );
    }
    const e = TAIL_ELLIPSE.sadness;
    const defaultTx = tailFlip ? 85 : 15;
    const { tx, ty, hw, curve } = resolveTailCoords(defaultTx);
    const tailPath = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    const tailOnly = buildTailOnlyPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    return (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          <path d={tailPath} fill={fill} stroke="none" />
          {tailOnly && <path d={tailOnly} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" vectorEffect={NNS} />}
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
    if (tailOn === false) {
      return (
        <>
          {HAND_DRAWN_DEFS}
          <g filter="url(#hd)">
            <path d={body} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect={NNS} />
          </g>
        </>
      );
    }
    const e = TAIL_ELLIPSE.wavy;
    const defaultTx = tailFlip ? 85 : 15;
    const { tx, ty, hw, curve } = resolveTailCoords(defaultTx);
    const tailPath = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    const tailOnly = buildTailOnlyPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
    return (
      <>
        {HAND_DRAWN_DEFS}
        <g filter="url(#hd)">
          <path d={tailPath} fill={fill} stroke="none" />
          {tailOnly && <path d={tailOnly} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" vectorEffect={NNS} />}
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
