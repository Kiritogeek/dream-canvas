import type { CSSProperties } from "react";
import type { SpeechBubble } from "@/types";
import {
  getSpeechBubbleFillStroke,
  DEFAULT_SPEECH_BUBBLE_WIDTH,
  DEFAULT_SPEECH_BUBBLE_HEIGHT,
  SPEECH_BUBBLE_NO_TAIL_TYPES,
} from "@/types";
import { sanitizeBubbleHtml } from "@/lib/bubbleHtmlSanitize";
import {
  SpeechBubbleShape,
  SPEECH_BUBBLE_VIEWBOX_WITH_TAIL,
  SPEECH_BUBBLE_VIEWBOX_NARRATION,
} from "./SpeechBubbleShape";
import { SPEECH_TEXT_BODY_BOUNDS } from "./speechBubbleTextAreaLayout";
import {
  TAIL_ELLIPSE as BUBBLE_TAIL_ELLIPSE,
  UNIFIED_TAIL_TYPES,
  buildUnifiedTailPath,
  buildTailOnlyPath,
  buildBodyArcPath,
} from "./speechBubbleTail";
import {
  getSpeechBubbleSvgBoxRelToBubble,
  getSpeechBubbleBottomInPanelPx,
  bubbleShowsTailGraphic,
} from "@/lib/bubbleSvgLayout";

/** Aligné sur BubbleLayer.tsx — zone de texte dans le viewBox. */
const BODY_BOUNDS_FRAC: Partial<Record<string, {
  topFrac: number;
  heightFrac: number;
  leftFrac?: number;
  widthFrac?: number;
}>> = {
  speech: SPEECH_TEXT_BODY_BOUNDS,
  whisper: { topFrac: 4 / 120, heightFrac: 84 / 120, leftFrac: 3 / 100, widthFrac: 94 / 100 },
  cloud: { topFrac: 11 / 120, heightFrac: 72 / 120, leftFrac: 10 / 100, widthFrac: 80 / 100 },
  wavy: { topFrac: 5 / 120, heightFrac: 82 / 120, leftFrac: 4 / 100, widthFrac: 92 / 100 },
  sadness: { topFrac: 4 / 120, heightFrac: 80 / 120, leftFrac: 3 / 100, widthFrac: 94 / 100 },
  anger: { topFrac: 8 / 120, heightFrac: 76 / 120, leftFrac: 7 / 100, widthFrac: 86 / 100 },
  thought: { topFrac: 28 / 120, heightFrac: 36 / 120, leftFrac: 26 / 100, widthFrac: 48 / 100 },
  shout: { topFrac: 13 / 120, heightFrac: 74 / 120, leftFrac: 20 / 100, widthFrac: 60 / 100 },
  radio: { topFrac: 14 / 120, heightFrac: 74 / 120, leftFrac: 10 / 100, widthFrac: 80 / 100 },
  electronic: { topFrac: 8 / 120, heightFrac: 76 / 120, leftFrac: 10 / 100, widthFrac: 80 / 100 },
  explosion: { topFrac: 20 / 120, heightFrac: 60 / 120, leftFrac: 22 / 100, widthFrac: 56 / 100 },
};

const richTextClass =
  "[&_u]:underline [&_s]:line-through [&_strike]:line-through [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic";

/**
 * Rendu statique des bulles pour html2canvas (export ZIP / PNG hors écran).
 * Doit rester aligné avec le rendu lecture de BubbleLayer.
 *
 * Fix queues :
 * - Pour les types "speech/whisper/..." : le SVG (svgH = bh * 1.2) déborde du wrapper div
 *   (height = bh). html2canvas clippe les absolus débordants → on dimensionne le wrapper
 *   au bas réel de la queue via getSpeechBubbleBottomInPanelPx.
 * - Pour "thought" : la queue (tailY ≈ 115) est hors du viewBox 92. html2canvas ignore
 *   overflow:visible sur SVG → on étend le viewBox et svgH proportionnellement.
 */
export function PanelExportSpeechBubbles({ speechBubbles }: { speechBubbles: SpeechBubble[] }) {
  return (
    <>
      {speechBubbles.map((bubble) => {
        const bw = bubble.width ?? DEFAULT_SPEECH_BUBBLE_WIDTH;
        const bh = bubble.height ?? DEFAULT_SPEECH_BUBBLE_HEIGHT;
        const geom = {
          x: Math.round(bubble.position.x),
          y: Math.round(bubble.position.y),
          width: Math.round(bw),
          height: Math.round(bh),
        };
        const fontSize = bubble.style?.size ?? 14;
        const fontFamily = bubble.style?.font ?? "inherit";
        const color = bubble.style?.color ?? "#000000";
        const fontWeight = bubble.style?.bold ? "bold" : "normal";
        const fontStyle = bubble.style?.italic ? "italic" : "normal";
        const textDecoration =
          [bubble.style?.underline ? "underline" : null, bubble.style?.strikethrough ? "line-through" : null].filter(Boolean).join(" ")
          || undefined;
        const textAlign = bubble.style?.textAlign ?? "center";
        const textTransform = bubble.style?.textTransform ?? "none";
        const { fill: fillColor, stroke: strokeColor } = getSpeechBubbleFillStroke(bubble);
        const noTailType = SPEECH_BUBBLE_NO_TAIL_TYPES.has(bubble.type);
        const effectiveViewBox = noTailType
          ? SPEECH_BUBBLE_VIEWBOX_NARRATION
          : bubble.type === "thought"
            ? "0 0 100 92"
            : SPEECH_BUBBLE_VIEWBOX_WITH_TAIL;
        const vbParts = effectiveViewBox.split(" ").map(Number);
        const vbY = vbParts[1];
        const vbH = vbParts[3];
        const synthBubble = {
          ...bubble,
          height: geom.height,
        } as SpeechBubble;
        const { svgTopOffset, svgH } =
          bubble.type === "text" ? { svgTopOffset: 0, svgH: geom.height } : getSpeechBubbleSvgBoxRelToBubble(synthBubble);

        // ── Fix thought : étendre le viewBox pour contenir la queue hors-viewBox ──
        // thought utilise viewBox "0 0 100 92" mais tailY ≈ 115 → hors limite.
        // On étend à "0 0 100 {neededVbH}" + svgH proportionnel → corps inchangé.
        let exportViewBox = effectiveViewBox;
        let exportSvgH = svgH;
        if (bubble.type === "thought" && bubbleShowsTailGraphic(bubble)) {
          const tailY = bubble.tailY ?? 115;
          const origVbH = 92;
          const neededVbH = Math.ceil(tailY + 16);
          if (neededVbH > origVbH) {
            exportViewBox = `0 0 100 ${neededVbH}`;
            exportSvgH = (svgH * neededVbH) / origVbH;
          }
        }

        // ── Fix débordement : wrapper div dimensionné jusqu'au bas réel de la queue ──
        // html2canvas clippe les enfants absolus débordant du div parent (même overflow:visible).
        const tailBottom = getSpeechBubbleBottomInPanelPx(bubble);
        const wrapperHeight = Math.max(geom.height, Math.ceil(tailBottom) - geom.y);

        const bodyBounds = noTailType ? null : BODY_BOUNDS_FRAC[bubble.type];
        const textAreaTop = bodyBounds ? ((bodyBounds.topFrac * 120 - vbY) / vbH) * svgH : 0;
        const adjustedTextAreaTop = textAreaTop + svgTopOffset;
        const textAreaH = noTailType
          ? geom.height
          : bodyBounds
            ? (bodyBounds.heightFrac * 120 / vbH) * svgH
            : (svgH * 100) / vbH;
        const textAreaLeft = bodyBounds?.leftFrac != null ? bodyBounds.leftFrac * geom.width : null;
        const textAreaWidth = bodyBounds?.widthFrac != null ? bodyBounds.widthFrac * geom.width : null;
        const fillOpacity = 1 - (bubble.bgTransparency ?? 0) / 100;

        // Pré-calcule les paths SVG pour dessin Canvas 2D direct (bypass html2canvas)
        let exportTailData: string | undefined;
        if (UNIFIED_TAIL_TYPES.has(bubble.type) && bubbleShowsTailGraphic(bubble)) {
          const e = BUBBLE_TAIL_ELLIPSE[bubble.type];
          if (e) {
            const defaultTx = bubble.tailFlip ? 85 : 15;
            const tx = bubble.tailX ?? defaultTx;
            const ty = bubble.tailY ?? 115;
            const hw = (bubble.tailBaseWidth ?? 28) / 2;
            const curve = bubble.tailCurve ?? 0;
            const sw = bubble.borderWidth ?? 2;
            const fp = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
            const tp = buildTailOnlyPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve) ?? undefined;
            const ap = buildBodyArcPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, curve);
            exportTailData = JSON.stringify({
              x: geom.x, y: geom.y, w: geom.width,
              svgTop: svgTopOffset, svgH: exportSvgH,
              vbH,
              fill: fillColor, stroke: strokeColor, sw, fillOpacity,
              fp, tp, ap,
            });
          }
        }

        const sharedTextStyle: CSSProperties = {
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily === "inherit" ? undefined : fontFamily,
          color,
          fontWeight,
          fontStyle,
          textDecoration,
          textAlign,
          textTransform,
          lineHeight: "1.4",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "pre-wrap",
        };

        return (
          <div
            key={bubble.id}
            data-export-tail={exportTailData}
            className="absolute overflow-visible"
            style={{
              left: geom.x,
              top: geom.y,
              width: geom.width,
              height: wrapperHeight,
              zIndex: 20,
            }}
          >
            {bubble.type !== "text" && (
              <svg
                data-export-layer="svg"
                viewBox={exportViewBox}
                className="absolute pointer-events-none"
                style={{ top: svgTopOffset, left: 0, width: "100%", height: exportSvgH }}
                preserveAspectRatio="none"
                fillOpacity={fillOpacity}
                overflow="visible"
              >
                <SpeechBubbleShape
                  type={bubble.type}
                  fill={fillColor}
                  stroke={strokeColor}
                  tailFlip={bubble.tailFlip}
                  strokeWidth={bubble.borderWidth}
                  tailX={bubble.tailX}
                  tailY={bubble.tailY}
                  tailBaseWidth={bubble.tailBaseWidth}
                  tailCurve={bubble.tailCurve}
                  tailOn={bubble.tailOn}
                  thoughtBumpR={bubble.thoughtBumpR}
                  thoughtGap={bubble.thoughtGap}
                  thoughtTailGap={bubble.thoughtTailGap}
                  thoughtTailOval={bubble.thoughtTailOval}
                  thoughtTailDotSize={bubble.thoughtTailDotSize}
                  tailDotAspectRatio={bubble.type === "thought" ? (exportSvgH / vbH) / (geom.width / 100) : undefined}
                />
              </svg>
            )}

            <div
              data-export-layer="text"
              className={`absolute flex flex-col justify-center pointer-events-none ${textAreaLeft == null ? "inset-x-0 px-3" : "px-2"}`}
              style={{
                top: adjustedTextAreaTop,
                minHeight: textAreaH,
                ...(textAreaLeft != null ? { left: textAreaLeft, width: textAreaWidth ?? undefined } : {}),
              }}
            >
              <div
                className={`w-full ${richTextClass}`}
                style={sharedTextStyle}
                dangerouslySetInnerHTML={{ __html: sanitizeBubbleHtml(bubble.text) || "…" }}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}
