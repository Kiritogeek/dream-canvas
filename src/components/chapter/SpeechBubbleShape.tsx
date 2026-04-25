import type { SpeechBubble } from "@/types";

export const SPEECH_BUBBLE_TAIL_H = 14;

/** ViewBox normalisé pour bulles avec queue (corps 0–100, queue 100–120). Redimensionnement propre. */
export const SPEECH_BUBBLE_VIEWBOX_WITH_TAIL = "0 0 100 120";
/** ViewBox pour narration (rectangle, pas de queue). */
export const SPEECH_BUBBLE_VIEWBOX_NARRATION = "0 0 100 100";

/** Rendu SVG de la forme de bulle (coordonnées normalisées 0–100). Styles BD/manga les plus utilisés. */
export function SpeechBubbleShape(props: {
  type: SpeechBubble["type"];
  fill: string;
  stroke: string;
}) {
  const { type, fill, stroke } = props;
  const sw = 2; // strokeWidth en unités viewBox, scale avec la forme

  // Parole (dialogue) : ovale + queue triangulaire pointant vers le personnage (standard BD/manga)
  if (type === "speech") {
    return (
      <>
        <ellipse cx={50} cy={50} rx={48} ry={46} fill={fill} stroke={stroke} strokeWidth={sw} />
        <path d="M 28 98 L 18 118 L 38 98 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </>
    );
  }

  // Chuchotement : même forme que parole, contour en pointillés (convention comics/manga)
  if (type === "whisper") {
    return (
      <>
        <ellipse cx={50} cy={50} rx={48} ry={46} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="5 4" />
        <path d="M 28 98 L 18 118 L 38 98 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="5 4" strokeLinejoin="round" />
      </>
    );
  }

  // Pensée : nuage (plusieurs bulles reliées, queue en chaîne de cercles — standard "thought bubble")
  if (type === "thought") {
    return (
      <>
        <ellipse cx={50} cy={46} rx={42} ry={34} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={22} cy={42} r={11} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={78} cy={42} r={11} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={33} cy={20} r={9} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={67} cy={20} r={9} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={58} cy={84} r={8} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={66} cy={100} r={5.5} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={73} cy={112} r={3.8} fill={fill} stroke={stroke} strokeWidth={sw} />
      </>
    );
  }

  // Narration / légende : rectangle arrondi sans queue (caption style)
  if (type === "narration") {
    return (
      <rect x={3} y={3} width={94} height={94} rx={8} ry={8} fill={fill} stroke={stroke} strokeWidth={sw} />
    );
  }

  // Radio / transmission : contour angulaire + queue éclair (convention voix via appareil)
  if (type === "radio") {
    return (
      <>
        <path
          d="M 8 12 L 92 12 L 98 24 L 98 78 L 90 90 L 12 90 L 2 78 L 2 24 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <path
          d="M 72 90 L 62 104 L 72 106 L 58 120 L 72 118 L 70 108 L 82 96 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </>
    );
  }

  // Cri / shout : contour en dents (explosion) + queue en éclair + petite étoile (style "scream bubble")
  if (type === "shout") {
    const n = 20;
    const points: string[] = [];
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      const r = i % 2 === 0 ? 40 : 52;
      points.push(`${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`);
    }
    const jagged = `M ${points.join(" L ")} Z`;
    const lightning = "M 34 96 L 25 106 L 36 109 L 22 120 L 36 118 L 33 110 L 44 102 Z";
    return (
      <>
        <path d={jagged} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d={lightning} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </>
    );
  }

  return null;
}
