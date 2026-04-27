import { useState, useRef, useCallback } from "react";
import type { Panel, SpeechBubble } from "@/types";
import { getSpeechBubbleFillStroke, DEFAULT_SPEECH_BUBBLE_WIDTH, DEFAULT_SPEECH_BUBBLE_HEIGHT, SPEECH_BUBBLE_NO_TAIL_TYPES } from "@/types";
import { getPanelHeight } from "@/services/panels";
import { useDragBlock } from "@/hooks/useDragBlock";
import { useResizeBlock } from "@/hooks/useResizeBlock";
import type { ResizingState } from "@/hooks/useResizeBlock";
import { SpeechBubbleShape, SPEECH_BUBBLE_TAIL_H, SPEECH_BUBBLE_VIEWBOX_WITH_TAIL, SPEECH_BUBBLE_VIEWBOX_NARRATION } from "./SpeechBubbleShape";
import { getTailHitPath, TAIL_ELLIPSE as BUBBLE_TAIL_ELLIPSE } from "./speechBubbleTail";

// Types qui ont une queue draggable via handle
const DRAGGABLE_TAIL_TYPES = new Set(["speech", "whisper", "cloud", "wavy", "sadness", "anger"]);

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
  tailContextBubbleId?: string | null;
  onTailContext?: (id: string | null) => void;
  onBubbleUpdate?: (bubbles: SpeechBubble[]) => void;
}

type BubbleResizingState = ResizingState & { bubbleId: string };

function recenterEditable(el: HTMLElement, areaH: number) {
  el.style.height = "0px";
  el.style.paddingTop = "0px";
  const contentH = el.scrollHeight;
  el.style.height = `${areaH}px`;
  const pt = Math.max(8, Math.round((areaH - contentH) / 2));
  el.style.paddingTop = `${pt}px`;
}

// Whitelist HTML : on ne garde que les balises de formatage propres.
// Tout le reste (<font>, <span>, <div>, attributs, styles inline, classes…) est strippé.
// Cause directe du bug de doublon historique : execCommand("foreColor") injectait
// `<font color="...">` qui s'accumulait dans bubble.text au fil des saves.
const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "s", "strike", "del", "br"]);

function sanitizeBubbleHtml(html: string): string {
  if (!html) return "";
  let out = html.replace(/<\/(p|div|li|h[1-6])>/gi, "<br>");
  out = out.replace(/<(p|div|li|h[1-6])\b[^>]*>/gi, "");
  out = out.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (_match, slash, tag: string) => {
    const tagLower = tag.toLowerCase();
    return ALLOWED_TAGS.has(tagLower) ? `<${slash}${tagLower}>` : "";
  });
  out = out.replace(/<br\s*\/?>/gi, "<br>");
  out = out.replace(/(<br>\s*){3,}/gi, "<br><br>");
  out = out.replace(/(<br>\s*)+$/i, "");
  return out.trim();
}

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
  tailContextBubbleId,
  onTailContext,
  onBubbleUpdate,
}: BubbleLayerProps) {
  const ghostRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  const [tailDragActive, setTailDragActive] = useState(false);
  const tailDragBubbleIdRef = useRef<string | null>(null);
  const isResizingSpeechBubbleRef = useRef(false);
  const resizingSpeechBubbleElRef = useRef<HTMLDivElement | null>(null);
  const [resizingSpeechBubbleState, setResizingSpeechBubbleState] = useState<BubbleResizingState | null>(null);
  const [resizeSpeechBubbleDraft, setResizeSpeechBubbleDraft] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const resizeSpeechBubbleDraftRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const saveResizeSpeechBubbleRef = useRef<((draft: { x: number; y: number; width: number; height: number }) => void) | null>(null);
  const lastResizeSpeechBubbleMouseRef = useRef<{ x: number; y: number } | null>(null);
  const resizeSpeechBubbleCaptureTargetRef = useRef<HTMLElement | null>(null);
  const [editingBubbleId, setEditingBubbleId] = useState<string | null>(null);

  // Ref to the currently active contenteditable div (uncontrolled)
  const editingDivRef = useRef<HTMLDivElement | null>(null);
  const textAreaHRef = useRef<number>(0);
  const editingBubbleTextRef = useRef<string>("");
  const committedCurrentEditRef = useRef<boolean>(false);

  // Callback ref stable — n'est appelé qu'au mount/unmount, jamais au re-render.
  const editingDivCallback = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      el.innerHTML = sanitizeBubbleHtml(editingBubbleTextRef.current);
      recenterEditable(el, textAreaHRef.current);
      el.focus({ preventScroll: true });
      const r = document.createRange();
      r.selectNodeContents(el);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(r);
      editingDivRef.current = el;
    } else {
      editingDivRef.current = null;
    }
  }, []);

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
        const textDecoration = [bubble.style?.underline ? "underline" : null, bubble.style?.strikethrough ? "line-through" : null].filter(Boolean).join(" ") || undefined;
        const textAlign = bubble.style?.textAlign ?? "center";
        const textTransform = bubble.style?.textTransform ?? "none";
        const { fill: fillColor, stroke: strokeColor } = getSpeechBubbleFillStroke(bubble);
        const tailH = SPEECH_BUBBLE_NO_TAIL_TYPES.has(bubble.type) ? 0 : SPEECH_BUBBLE_TAIL_H;
        const totalH = geom.height + tailH;
        const textAreaH = bubble.type === "narration" || bubble.type === "text" ? geom.height : (totalH * 100) / 120;
        const fillOpacity = 1 - (bubble.bgTransparency ?? 0) / 100;

        const sharedTextStyle: React.CSSProperties = {
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily === "inherit" ? undefined : fontFamily,
          color,
          fontWeight,
          fontStyle,
          textDecoration,
          textAlign,
          textTransform,
          lineHeight: "1.4",
        };

        // Tailwind preflight efface text-decoration/font-weight/font-style des balises HTML.
        // Ces classes les restaurent pour le rich text stocké en HTML dans bubble.text.
        const richTextClass = "[&_u]:underline [&_s]:line-through [&_strike]:line-through [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic";

        // Coordonnées de la pointe de queue dans le repère viewBox
        const hasDraggableTail = DRAGGABLE_TAIL_TYPES.has(bubble.type);
        const defaultTailX = bubble.tailFlip ? 85 : 15;
        const defaultTailY = 115;
        const resolvedTailX = bubble.tailX ?? defaultTailX;
        const resolvedTailY = bubble.tailY ?? defaultTailY;

        const ellipseParams = BUBBLE_TAIL_ELLIPSE[bubble.type];

        const hitPath = hasDraggableTail
          ? getTailHitPath(bubble.type, bubble.tailX, bubble.tailY, bubble.tailFlip, bubble.tailBaseWidth, bubble.tailCurve)
          : null;

        return (
          <div
            key={bubble.id}
            ref={isResizingThis ? (el) => { if (el) resizingSpeechBubbleElRef.current = el; } : undefined}
            role={!isResizingThis && !isEditing ? "button" : undefined}
            className={`group absolute z-20 overflow-visible transition-[box-shadow,ring] duration-150 ${isEditing ? "cursor-text" : "cursor-grab active:cursor-grabbing"} ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-2 hover:ring-primary/40"}`}
            style={{ left: geom.x, top: geom.y, width: geom.width, height: totalH }}
            onPointerDown={!isResizingThis && !isResizingSpeechBubbleRef.current && !isEditing && !tailDragActive ? (e) => dragSpeechBubble.onPointerDown(e, panel.id, bubble.id, geom.x, geom.y, geom.width, totalH, getPanelHeight(panel)) : undefined}
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) return;
              if (tailContextBubbleId === bubble.id) {
                onTailContext?.(null);
                return;
              }
              if (isSelected) {
                editingBubbleTextRef.current = bubble.text;
                textAreaHRef.current = textAreaH;
                committedCurrentEditRef.current = false;
                setEditingBubbleId(bubble.id);
              } else {
                onSelectBubble(bubble.id);
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!isEditing) {
                editingBubbleTextRef.current = bubble.text;
                textAreaHRef.current = textAreaH;
                onSelectBubble(bubble.id);
                committedCurrentEditRef.current = false;
                setEditingBubbleId(bubble.id);
              }
            }}
          >
            {bubble.type !== "text" && (
              <svg
                width="100%" height="100%"
                viewBox={SPEECH_BUBBLE_NO_TAIL_TYPES.has(bubble.type) ? SPEECH_BUBBLE_VIEWBOX_NARRATION : SPEECH_BUBBLE_VIEWBOX_WITH_TAIL}
                className="absolute inset-0 pointer-events-none"
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
                />
              </svg>
            )}

            {/* SVG overlay pour la zone de hit de la queue — pointer-events sur le path uniquement */}
            {hitPath && (
              <svg
                width="100%" height="100%"
                viewBox={SPEECH_BUBBLE_VIEWBOX_WITH_TAIL}
                className="absolute inset-0"
                style={{ pointerEvents: "none" }}
                preserveAspectRatio="none"
                overflow="visible"
              >
                <path
                  d={hitPath}
                  strokeWidth={20}
                  pointerEvents="visibleStroke"
                  className="fill-transparent stroke-transparent hover:stroke-primary/40 transition-colors cursor-crosshair"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBubble(bubble.id);
                    onTailContext?.(bubble.id);
                  }}
                />
              </svg>
            )}

            {/* Handle de la pointe de queue — visible uniquement si bulle sélectionnée */}
            {isSelected && hasDraggableTail && !isEditing && (
              <div
                style={{
                  position: "absolute",
                  left: (resolvedTailX / 100) * geom.width,
                  top: (resolvedTailY / 120) * totalH,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#7c6ff7",
                  border: "2px solid white",
                  cursor: "grab",
                  zIndex: 30,
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                }}
                title="Déplacer la pointe de la queue"
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.preventDefault();
                  e.stopPropagation();

                  // bubbleDiv = parent direct du handle (le div positionné sur le panel)
                  const bubbleDiv = (e.currentTarget as HTMLElement).parentElement;
                  if (!bubbleDiv) return;

                  // rect.width/height = taille réelle en px viewport (zoom inclus)
                  const rect = bubbleDiv.getBoundingClientRect();
                  // Offset click dans le repère viewBox pour que la pointe ne saute pas
                  const clickOffX = (e.clientX - rect.left) / (rect.width / 100) - resolvedTailX;
                  const clickOffY = (e.clientY - rect.top)  / (rect.height / 120) - resolvedTailY;

                  tailDragBubbleIdRef.current = bubble.id;
                  setTailDragActive(true);

                  const onMove = (ev: PointerEvent) => {
                    const r = bubbleDiv.getBoundingClientRect();
                    const vbX = (ev.clientX - r.left) / (r.width  / 100) - clickOffX;
                    const vbY = (ev.clientY - r.top)  / (r.height / 120) - clickOffY;

                    if (ellipseParams) {
                      const { cx, cy, rx, ry } = ellipseParams;
                      if (Math.pow((vbX - cx) / rx, 2) + Math.pow((vbY - cy) / ry, 2) < 1.15 * 1.15) return;
                    }

                    onBubbleUpdate?.(speechBubbles.map((b) =>
                      b.id === bubble.id
                        ? { ...b, tailX: Math.round(vbX * 10) / 10, tailY: Math.round(vbY * 10) / 10 }
                        : b
                    ));
                  };

                  const onUp = () => {
                    tailDragBubbleIdRef.current = null;
                    setTailDragActive(false);
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", onUp);
                  };

                  window.addEventListener("pointermove", onMove);
                  window.addEventListener("pointerup", onUp);
                }}
              />
            )}

            {isEditing ? (
              <div
                key="bubble-editor"
                ref={editingDivCallback}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => recenterEditable(e.currentTarget as HTMLDivElement, textAreaH)}
                onBlur={(e) => {
                  if (committedCurrentEditRef.current) return;
                  committedCurrentEditRef.current = true;
                  const html = sanitizeBubbleHtml(e.currentTarget.innerHTML);
                  setEditingBubbleId(null);
                  if (html !== bubble.text) {
                    onTextCommit(bubble.id, html);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    committedCurrentEditRef.current = true;
                    e.currentTarget.innerHTML = sanitizeBubbleHtml(bubble.text);
                    setEditingBubbleId(null);
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData("text/plain");
                  document.execCommand("insertText", false, text);
                }}
                className={`absolute inset-x-0 top-0 bg-transparent border-none outline-none w-full px-3 z-30 overflow-y-hidden ${richTextClass}`}
                style={{ height: textAreaH, boxSizing: "border-box", ...sharedTextStyle }}
              />
            ) : (
              <div
                key="bubble-readonly"
                className="absolute inset-x-0 top-0 flex items-center px-3 pointer-events-none overflow-hidden"
                style={{ height: textAreaH }}
              >
                <div
                  className={`break-words w-full ${richTextClass}`}
                  style={sharedTextStyle}
                  dangerouslySetInnerHTML={{ __html: sanitizeBubbleHtml(bubble.text) || "…" }}
                />
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
