import type { SpeechBubble } from "@/types";
import {
  DEFAULT_SPEECH_BUBBLE_HEIGHT,
  SPEECH_BUBBLE_NO_TAIL_TYPES,
} from "@/types";
import {
  SPEECH_BUBBLE_VIEWBOX_WITH_TAIL,
  SPEECH_BUBBLE_VIEWBOX_NARRATION,
} from "@/components/chapter/SpeechBubbleShape";
import { TAIL_ELLIPSE as BUBBLE_TAIL_ELLIPSE } from "@/components/chapter/speechBubbleTail";

/**
 * Même logique que BubbleLayer / PanelExportSpeechBubbles — boîte englobante SVG
 * (pour hauteur d'export sans couper queues / traits).
 */
const TAIL_STROKE_BLEED_PX = 14;

/** viewBox « h » (dernier nombre), aligné BubbleLayer / SpeechBubbleShape. */
export function getSpeechBubbleViewBoxHeight(bubble: SpeechBubble): number {
  if (bubble.type === "text") return 0;
  if (SPEECH_BUBBLE_NO_TAIL_TYPES.has(bubble.type)) return 100;
  if (bubble.type === "thought") return 92;
  return 120;
}

/** La queue SVG est dessinée (pas shout sans tailOn, pas tailOn:false, etc.). */
export function bubbleShowsTailGraphic(bubble: SpeechBubble): boolean {
  if (bubble.type === "text" || SPEECH_BUBBLE_NO_TAIL_TYPES.has(bubble.type)) return false;
  if (bubble.type === "shout") return bubble.tailOn === true;
  if (bubble.tailOn === false) return false;
  return true;
}

export function getSpeechBubbleSvgBoxRelToBubble(bubble: SpeechBubble): {
  svgTopOffset: number;
  svgH: number;
} {
  const bh = Math.round(bubble.height ?? DEFAULT_SPEECH_BUBBLE_HEIGHT);
  const noTailType = SPEECH_BUBBLE_NO_TAIL_TYPES.has(bubble.type);
  const effectiveViewBox = noTailType
    ? SPEECH_BUBBLE_VIEWBOX_NARRATION
    : bubble.type === "thought"
      ? "0 0 100 92"
      : SPEECH_BUBBLE_VIEWBOX_WITH_TAIL;
  const vbParts = effectiveViewBox.split(" ").map(Number);
  const vbH = vbParts[3];
  const bodyCY =
    bubble.type === "thought" || bubble.type === "shout"
      ? 46
      : (BUBBLE_TAIL_ELLIPSE[bubble.type]?.cy ?? 46);
  const svgH = noTailType ? bh : bubble.type === "thought" ? bh : bh * 1.2;
  const svgTopOffset = noTailType ? 0 : bh / 2 - (bodyCY / vbH) * svgH;
  return { svgTopOffset, svgH };
}

/** Bas du bloc SVG bulle dans le repère panel (pixels), pour ajuster la capture (queue comprise). */
export function getSpeechBubbleBottomInPanelPx(bubble: SpeechBubble): number {
  const y = Math.round(bubble.position.y);
  const h = Math.round(bubble.height ?? DEFAULT_SPEECH_BUBBLE_HEIGHT);
  if (bubble.type === "text") return y + h;

  const b = { ...bubble, height: h } as SpeechBubble;
  const { svgTopOffset, svgH } = getSpeechBubbleSvgBoxRelToBubble(b);
  const bodyBottom = y + svgTopOffset + svgH + TAIL_STROKE_BLEED_PX;

  if (!bubbleShowsTailGraphic(bubble)) return bodyBottom;

  const vbH = getSpeechBubbleViewBoxHeight(bubble);
  if (vbH <= 0) return bodyBottom;
  /** Pointe dans l’espace viewBox (~115 par défaut) → pixels sous le haut du SVG. */
  const tipPxFromSvgTop = ((bubble.tailY ?? 115) / vbH) * svgH;
  const tipBottom = y + svgTopOffset + tipPxFromSvgTop + TAIL_STROKE_BLEED_PX;
  return Math.max(bodyBottom, tipBottom);
}
