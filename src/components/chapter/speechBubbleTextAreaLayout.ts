/**
 * Zone de texte des bulles « avec queue » — alignée sur BubbleLayer.tsx.
 * Source de vérité partagée avec le canva pour éviter un décalage onboarding / édition.
 */
import { SPEECH_BUBBLE_VIEWBOX_NARRATION } from "./SpeechBubbleShape";
import { TAIL_ELLIPSE } from "./speechBubbleTail";

export const SPEECH_TEXT_BODY_BOUNDS = {
  topFrac: 3 / 120,
  heightFrac: 86 / 120,
  leftFrac: 3 / 100,
  widthFrac: 94 / 100,
} as const;

export type BubbleGeom = { width: number; height: number };

/** Bulle dialogue sans queue — onboarding Ariane (`viewBox` 100×100, pas d’espace réservé à la queue). */
export function layoutSpeechBubbleNoTailTextRect(geom: BubbleGeom): {
  svgTopOffset: number;
  svgH: number;
  textTop: number;
  textMinHeight: number;
  textLeft: number;
  textWidth: number;
} {
  const vbParts = SPEECH_BUBBLE_VIEWBOX_NARRATION.split(/\s+/).map(Number);
  const vbY = vbParts[1] ?? 0;
  const vbH = vbParts[3] ?? 100;
  const bodyCY = TAIL_ELLIPSE.speech.cy;
  const svgH = geom.height;
  const svgTopOffset = geom.height / 2 - (bodyCY / vbH) * svgH;
  const b = SPEECH_TEXT_BODY_BOUNDS;
  const topVb = b.topFrac * 120;
  const heightVb = b.heightFrac * 120;
  const scale = vbH / 120;
  const textAreaTopRaw = ((topVb * scale - vbY) / vbH) * svgH;
  const textMinHeight = ((heightVb * scale) / vbH) * svgH;
  const textTop = textAreaTopRaw + svgTopOffset;
  const textLeft = b.leftFrac * geom.width;
  const textWidth = b.widthFrac * geom.width;
  return { svgTopOffset, svgH, textTop, textMinHeight, textLeft, textWidth };
}
