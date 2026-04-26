import { useState, useRef } from "react";
import type { Panel, SpeechBubble } from "@/types";
import { getSpeechBubbleFillStroke, DEFAULT_SPEECH_BUBBLE_WIDTH, DEFAULT_SPEECH_BUBBLE_HEIGHT, SPEECH_BUBBLE_NO_TAIL_TYPES } from "@/types";
import { getPanelHeight } from "@/services/panels";
import { useDragBlock } from "@/hooks/useDragBlock";
import { useResizeBlock } from "@/hooks/useResizeBlock";
import type { ResizingState } from "@/hooks/useResizeBlock";
import { SpeechBubbleShape, SPEECH_BUBBLE_TAIL_H, SPEECH_BUBBLE_VIEWBOX_WITH_TAIL, SPEECH_BUBBLE_VIEWBOX_NARRATION } from "./SpeechBubbleShape";

interface BubbleLayerProps {
  panel: Panel;
  panels: Panel[];
  speechBubbles: SpeechBubble[];
  canvasRefByPanel: React.RefObject<Record<string, HTMLDivElement | null>>;
  zoomRef: React.RefObject<number>;
  selectedBubbleId: string | null;
  onSelectBubble: (id: string | null) => void;
  onMoveCommit: (panelId: string, bubbleId: string, x: number, y: number) => void;
  onResizeCommit: (panelId: string, bubbleId: string, draft: { x: number; y: number; width: number; height: number }) => void;
  onDelete?: (bubble: SpeechBubble) => void;
  onTextCommit: (bubbleId: string, text: string) => void;
}

type BubbleResizingState = ResizingState & { bubbleId: string };

export function BubbleLayer({
  panel,
  panels,
  speechBubbles,
  canvasRefByPanel,
  zoomRef,
  selectedBubbleId,
  onSelectBubble,
  onMoveCommit,
  onResizeCommit,
  onTextCommit,
}: BubbleLayerProps) {
  const ghostRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  const isResizingSpeechBubbleRef = useRef(false);
  const resizingSpeechBubbleElRef = useRef<HTMLDivElement | null>(null);
  const [resizingSpeechBubbleState, setResizingSpeechBubbleState] = useState<BubbleResizingState | null>(null);
  const [resizeSpeechBubbleDraft, setResizeSpeechBubbleDraft] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const resizeSpeechBubbleDraftRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const saveResizeSpeechBubbleRef = useRef<((draft: { x: number; y: number; width: number; height: number }) => void) | null>(null);
  const lastResizeSpeechBubbleMouseRef = useRef<{ x: number; y: number } | null>(null);
  const resizeSpeechBubbleCaptureTargetRef = useRef<HTMLElement | null>(null);
  const [editingBubbleId, setEditingBubbleId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string>("");

  const dragSpeechBubble = useDragBlock({
    canvasRefByPanel,
    ghostRefByPanel,
    isResizingRef: isResizingSpeechBubbleRef,
    zoomRef,
    onCommit: onMoveCommit,
  });

  useResizeBlock({
    resizingState: resizingSpeechBubbleState,
    captureTargetRef: resizeSpeechBubbleCaptureTargetRef,
    elementRef: resizingSpeechBubbleElRef,
    draftRef: resizeSpeechBubbleDraftRef,
    lastMouseRef: lastResizeSpeechBubbleMouseRef,
    saveCallbackRef: saveResizeSpeechBubbleRef,
    canvasRefByPanel,
    panels,
    minW: 60,
    minH: 28,
    elementExtraH: 14,
    useDocumentCapture: true,
    onDraft: setResizeSpeechBubbleDraft,
    onCommit: () => {},
    onCancel: () => {
      setResizingSpeechBubbleState(null);
      setResizeSpeechBubbleDraft(null);
      resizeSpeechBubbleDraftRef.current = null;
      lastResizeSpeechBubbleMouseRef.current = null;
      resizeSpeechBubbleCaptureTargetRef.current = null;
      resizingSpeechBubbleElRef.current = null;
      isResizingSpeechBubbleRef.current = false;
    },
  });

  return (
    <>
      {speechBubbles.map((bubble) => {
        const isSelected = selectedBubbleId === bubble.id;
        const isEditing = editingBubbleId === bubble.id;
        const isResizingThis = resizingSpeechBubbleState?.panelId === panel.id && resizingSpeechBubbleState?.bubbleId === bubble.id;
        const useResizeDraft = isResizingThis && resizeSpeechBubbleDraft != null;
        const bw = bubble.width ?? DEFAULT_SPEECH_BUBBLE_WIDTH;
        const bh = bubble.height ?? DEFAULT_SPEECH_BUBBLE_HEIGHT;
        const geom = useResizeDraft
          ? { x: resizeSpeechBubbleDraft.x, y: resizeSpeechBubbleDraft.y, width: resizeSpeechBubbleDraft.width, height: resizeSpeechBubbleDraft.height }
          : { x: bubble.position.x, y: bubble.position.y, width: bw, height: bh };
        const fontSize = bubble.style?.size ?? 14;
        const fontFamily = bubble.style?.font ?? "inherit";
        const color = bubble.style?.color ?? "#000000";
        const fontWeight = bubble.style?.bold ? "bold" : "normal";
        const fontStyle = bubble.style?.italic ? "italic" : "normal";
        const textAlign = bubble.style?.textAlign ?? "center";
        const textTransform = bubble.style?.textTransform ?? "none";
        const { fill: fillColor, stroke: strokeColor } = getSpeechBubbleFillStroke(bubble);
        const tailH = SPEECH_BUBBLE_NO_TAIL_TYPES.has(bubble.type) ? 0 : SPEECH_BUBBLE_TAIL_H;
        const totalH = geom.height + tailH;
        const textAreaH = bubble.type === "narration" || bubble.type === "text" ? geom.height : (totalH * 100) / 120;

        return (
          <div
            key={bubble.id}
            ref={isResizingThis ? (el) => { if (el) resizingSpeechBubbleElRef.current = el; } : undefined}
            role={!isResizingThis && !isEditing ? "button" : undefined}
            className={`group absolute z-20 overflow-visible transition-[box-shadow,ring] duration-150 ${isEditing ? "cursor-text" : "cursor-grab active:cursor-grabbing"} ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-2 hover:ring-primary/40"}`}
            style={{ left: geom.x, top: geom.y, width: geom.width, height: totalH }}
            onPointerDown={!isResizingThis && !isResizingSpeechBubbleRef.current && !isEditing ? (e) => dragSpeechBubble.onPointerDown(e, panel.id, bubble.id, geom.x, geom.y, geom.width, totalH, getPanelHeight(panel)) : undefined}
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) return;
              if (isSelected) {
                setEditingBubbleId(bubble.id);
                setEditDraft(bubble.text);
              } else {
                onSelectBubble(bubble.id);
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!isEditing) {
                onSelectBubble(bubble.id);
                setEditingBubbleId(bubble.id);
                setEditDraft(bubble.text);
              }
            }}
          >
            {bubble.type !== "text" && (
              <svg width="100%" height="100%" viewBox={SPEECH_BUBBLE_NO_TAIL_TYPES.has(bubble.type) ? SPEECH_BUBBLE_VIEWBOX_NARRATION : SPEECH_BUBBLE_VIEWBOX_WITH_TAIL} className="absolute inset-0 pointer-events-none" preserveAspectRatio="none">
                <SpeechBubbleShape type={bubble.type} fill={fillColor} stroke={strokeColor} tailFlip={bubble.tailFlip} strokeWidth={bubble.borderWidth} />
              </svg>
            )}

            {isEditing ? (
              <textarea
                autoFocus
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onBlur={() => {
                  setEditingBubbleId(null);
                  onTextCommit(bubble.id, editDraft);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setEditingBubbleId(null);
                    setEditDraft(bubble.text);
                  }
                }}
                className="absolute inset-0 bg-transparent border-none outline-none resize-none w-full px-3 py-1 z-30"
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily === "inherit" ? undefined : fontFamily,
                  color,
                  fontWeight,
                  fontStyle,
                  textAlign,
                  textTransform,
                  height: textAreaH,
                  lineHeight: "1.4",
                }}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center px-3 py-1 pointer-events-none overflow-hidden"
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily === "inherit" ? undefined : fontFamily,
                  color,
                  fontWeight,
                  fontStyle,
                  textAlign,
                  textTransform,
                  height: textAreaH,
                }}
              >
                <span className="break-words w-full">{bubble.text || "…"}</span>
              </div>
            )}

            {isSelected && !isResizingThis && !isEditing && [
              { edge: "r" as const, style: { right: 0, top: 0, bottom: 0, width: 8 }, cursor: "ew-resize" },
              { edge: "b" as const, style: { bottom: 0, left: 0, right: 0, height: 8 }, cursor: "ns-resize" },
              { edge: "l" as const, style: { left: 0, top: 0, bottom: 0, width: 8 }, cursor: "ew-resize" },
              { edge: "t" as const, style: { top: 0, left: 0, right: 0, height: 8 }, cursor: "ns-resize" },
              { edge: "tl" as const, style: { left: 0, top: 0, width: 12, height: 12 }, cursor: "nwse-resize" },
              { edge: "tr" as const, style: { right: 0, top: 0, width: 12, height: 12 }, cursor: "nesw-resize" },
              { edge: "br" as const, style: { right: 0, bottom: 0, width: 12, height: 12 }, cursor: "nwse-resize" },
              { edge: "bl" as const, style: { left: 0, bottom: 0, width: 12, height: 12 }, cursor: "nesw-resize" },
            ].map(({ edge, style, cursor }) => (
              <div
                key={edge}
                className="absolute z-10 rounded-sm bg-primary/30 hover:bg-primary/50"
                style={{ ...style, cursor }}
                onPointerDown={(ev) => {
                  if (ev.button !== 0) return;
                  ev.preventDefault();
                  ev.stopPropagation();
                  isResizingSpeechBubbleRef.current = true;
                  resizeSpeechBubbleCaptureTargetRef.current = ev.currentTarget as HTMLElement;
                  (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
                  setResizingSpeechBubbleState({ panelId: panel.id, bubbleId: bubble.id, edge, start: { x: geom.x, y: geom.y, w: geom.width, h: geom.height }, startMouse: { x: ev.clientX, y: ev.clientY } });
                  setResizeSpeechBubbleDraft({ x: geom.x, y: geom.y, width: geom.width, height: geom.height });
                  resizeSpeechBubbleDraftRef.current = { x: geom.x, y: geom.y, width: geom.width, height: geom.height };
                  saveResizeSpeechBubbleRef.current = (draft) => {
                    const roundedDraft = {
                      x: Math.round(draft.x), y: Math.round(draft.y),
                      width: Math.round(draft.width), height: Math.round(draft.height)
                    };
                    setResizingSpeechBubbleState(null);
                    setResizeSpeechBubbleDraft(null);
                    resizeSpeechBubbleDraftRef.current = null;
                    lastResizeSpeechBubbleMouseRef.current = null;
                    resizeSpeechBubbleCaptureTargetRef.current = null;
                    resizingSpeechBubbleElRef.current = null;
                    isResizingSpeechBubbleRef.current = false;
                    onResizeCommit(panel.id, bubble.id, roundedDraft);
                  };
                }}
                aria-label="Redimensionner la bulle"
              />
            ))}
          </div>
        );
      })}
      {/* Ghost de drag pour bulles de dialogue */}
      <div
        ref={(el) => { if (el) ghostRefByPanel.current[panel.id] = el; }}
        aria-hidden
        className="pointer-events-none absolute z-50 border-2 border-primary border-dashed bg-white/50 rounded-[50%] box-border"
        style={{ display: "none", left: 0, top: 0, width: 100, height: 100 }}
      />
    </>
  );
}
