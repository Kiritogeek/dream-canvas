import { useState, useRef, useCallback, useLayoutEffect, useEffect } from "react";
import type { Panel, SpeechBubble } from "@/types";
import { getSpeechBubbleFillStroke, DEFAULT_SPEECH_BUBBLE_WIDTH, DEFAULT_SPEECH_BUBBLE_HEIGHT, SPEECH_BUBBLE_NO_TAIL_TYPES } from "@/types";
import { getPanelHeight, PANEL_WIDTH, RESIZE_BUBBLE_CORNER_PX, RESIZE_BUBBLE_EDGE_PX } from "@/services/panels";
import { useResizeBlock } from "@/hooks/useResizeBlock";
import type { ResizingState } from "@/hooks/useResizeBlock";
import { SpeechBubbleShape, SPEECH_BUBBLE_VIEWBOX_WITH_TAIL, SPEECH_BUBBLE_VIEWBOX_NARRATION } from "./SpeechBubbleShape";
import { SPEECH_TEXT_BODY_BOUNDS } from "./speechBubbleTextAreaLayout";
import { getTailHitPath, TAIL_ELLIPSE as BUBBLE_TAIL_ELLIPSE, buildUnifiedTailPath, buildTailOnlyPath, buildBodyArcPath } from "./speechBubbleTail";
import { sanitizeBubbleHtml } from "@/lib/bubbleHtmlSanitize";

// Types qui ont une queue draggable via handle
const DRAGGABLE_TAIL_TYPES = new Set(["speech", "whisper", "cloud", "wavy", "sadness", "anger", "shout", "thought"]);

// Bounds du corps visible de la bulle dans le viewBox "0 0 100 120" (ou "0 0 100 100" pour no-tail).
// topFrac / heightFrac × totalH donnent la zone où centrer le texte.
// Dérivé des formes SVG réelles dans SpeechBubbleShape.tsx.
// topFrac/heightFrac : fractions de la hauteur viewBox (120)
// leftFrac/widthFrac : fractions de la largeur viewBox (100)
const BODY_BOUNDS_FRAC: Partial<Record<string, {
  topFrac: number; heightFrac: number;
  leftFrac?: number; widthFrac?: number;
}>> = {
  // Ellipses (cy, ry depuis TAIL_ELLIPSE — viewBox height=120, width=100)
  speech:     SPEECH_TEXT_BODY_BOUNDS,
  whisper:    { topFrac:  4/120, heightFrac: 84/120, leftFrac:  3/100, widthFrac: 94/100 }, // rx=47
  cloud:      { topFrac: 11/120, heightFrac: 72/120, leftFrac: 10/100, widthFrac: 80/100 }, // rx=44 + bumps
  wavy:       { topFrac:  5/120, heightFrac: 82/120, leftFrac:  4/100, widthFrac: 92/100 }, // rx=46
  sadness:    { topFrac:  4/120, heightFrac: 80/120, leftFrac:  3/100, widthFrac: 94/100 }, // rx=47
  anger:      { topFrac:  8/120, heightFrac: 76/120, leftFrac:  7/100, widthFrac: 86/100 }, // rx=43
  // Pensée : ellipse interne cx=50 rx=24 — zone de texte = l'ellipse intérieure
  thought:    { topFrac: 28/120, heightFrac: 36/120, leftFrac: 26/100, widthFrac: 48/100 },
  // Cri : étoile, innerR≈18 → zone sûre ≈ 50±20
  shout:      { topFrac: 13/120, heightFrac: 74/120, leftFrac: 20/100, widthFrac: 60/100 },
  // Octogone radio : x=4→96
  radio:      { topFrac: 14/120, heightFrac: 74/120, leftFrac: 10/100, widthFrac: 80/100 },
  // Hexagone électronique : x=6→94
  electronic: { topFrac:  8/120, heightFrac: 76/120, leftFrac: 10/100, widthFrac: 80/100 },
  // Explosion : innerR=28 → zone sûre ≈ 50±20
  explosion:  { topFrac: 20/120, heightFrac: 60/120, leftFrac: 22/100, widthFrac: 56/100 },
};

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

export function BubbleLayer({
  panel,
  panels,
  speechBubbles,
  canvasRefByPanel,
  zoomRef: _zoomRef,
  selectedBubbleId,
  onSelectBubble,
  onMoveCommit,
  onResizeCommit,
  onTextCommit,
  tailContextBubbleId,
  onTailContext,
  onBubbleUpdate,
}: BubbleLayerProps) {
  const bubbleDivRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const activeBubbleDragCleanupRef = useRef<(() => void) | null>(null);
  const bubbleSvgRefs = useRef<Map<string, SVGSVGElement>>(new Map());
  const bubbleHandleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Position "live" de la queue pendant le drag — aucun setState, juste une ref.
  // Utilisée par le useLayoutEffect pour corriger le DOM après tout re-render React externe.
  const liveTailRef = useRef<{ bubbleId: string; vbX: number; vbY: number; hw: number; curve: number } | null>(null);
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

  const editingBubbleTextRef = useRef<string>("");
  const committedCurrentEditRef = useRef<boolean>(false);

  // Callback ref stable — n'est appelé qu'au mount/unmount, jamais au re-render.
  const editingDivCallback = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      el.innerHTML = sanitizeBubbleHtml(editingBubbleTextRef.current);
      el.focus({ preventScroll: true });
      // Sélectionne tout le texte existant pour permettre un remplacement immédiat.
      // Sur une bulle vide, on laisse le navigateur placer le curseur naturellement
      // (text-align: center → centre visuel) — évite le curseur "collé à droite".
      if (el.textContent?.trim()) {
        const r = document.createRange();
        r.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(r);
      }
      editingDivRef.current = el;
    } else {
      editingDivRef.current = null;
    }
  }, []);

  useEffect(() => () => { activeBubbleDragCleanupRef.current?.(); }, []);

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

  // Garde de sécurité contre les re-renders React externes (mutation qui finit, React Query, etc.)
  // Si un drag de queue est en cours, tout re-render React écrase notre setAttribute direct.
  // Ce useLayoutEffect (sans deps = après CHAQUE render) réapplique la bonne position
  // AVANT que le navigateur peigne — aucun flash visible.
  useLayoutEffect(() => {
    const live = liveTailRef.current;
    if (!live) return;
    const svgEl = bubbleSvgRefs.current.get(live.bubbleId);
    if (!svgEl) return;
    const bubble = speechBubbles.find((b) => b.id === live.bubbleId);
    if (!bubble) return;
    if (bubble.type === "thought") {
      const angle3 = Math.atan2(live.vbY - 46, live.vbX - 50);
      const bR3 = bubble.thoughtBumpR ?? 10;
      const ex3 = (24 + bR3) * Math.cos(angle3);
      const ey3 = (18 + bR3) * Math.sin(angle3);
      const bodyR3 = Math.sqrt(ex3 * ex3 + ey3 * ey3);
      const p0x3 = 50 + bodyR3 * Math.cos(angle3), p0y3 = 46 + bodyR3 * Math.sin(angle3);
      const tds3 = bubble.thoughtTailDotSize ?? 1;
      const mx3 = (p0x3 + live.vbX) / 2, my3 = (p0y3 + live.vbY) / 2;
      const cp3x = mx3 - Math.sin(angle3) * live.curve, cp3y = my3 + Math.cos(angle3) * live.curve;
      const bez3 = (t: number): [number, number] => { const u=1-t; return [u*u*p0x3+2*u*t*cp3x+t*t*live.vbX, u*u*p0y3+2*u*t*cp3y+t*t*live.vbY]; };
      const S3 = 60; const cl3 = [0]; let pp3 = bez3(0);
      for (let i=1;i<=S3;i++){const pt=bez3(i/S3);cl3.push(cl3[i-1]+Math.hypot(pt[0]-pp3[0],pt[1]-pp3[1]));pp3=pt;}
      const aL3=cl3[S3];
      const tD3=(d:number)=>{for(let i=1;i<=S3;i++){if(cl3[i]>=d)return(i-1+(d-cl3[i-1])/(cl3[i]-cl3[i-1]))/S3;}return 1;};
      const TAPER3=[1,0.72,0.52,0.37,0.26];
      const baseR3=Math.min(aL3*0.14,9)*tds3;
      const tGap3=bubble.thoughtTailGap??3;
      const step3=aL3/(TAPER3.length+1)+tGap3;
      const dots3=svgEl.querySelectorAll(".thought-tail-dot");
      const dotsStroke3=svgEl.querySelectorAll(".thought-tail-dot-stroke");
      const bw3 = bubble.width ?? DEFAULT_SPEECH_BUBBLE_WIDTH;
      const bh3 = bubble.height ?? DEFAULT_SPEECH_BUBBLE_HEIGHT;
      const bSvgH3 = bh3;
      const corr3 = (bSvgH3 / 92) / (bw3 / 100);
      if (aL3 > 3) {
        TAPER3.forEach((rel,idx)=>{
          const el3=dots3[idx]as SVGElement|undefined;
          const els3=dotsStroke3[idx]as SVGElement|undefined;
          if(!el3)return;
          const[dx3,dy3]=bez3(tD3(step3*(idx+1)));
          const ry3=Math.max(0.3,baseR3*rel);
          const rx3=(ry3*corr3).toFixed(1);
          el3.setAttribute("cx",dx3.toFixed(1));el3.setAttribute("cy",dy3.toFixed(1));
          el3.setAttribute("rx",rx3);el3.setAttribute("ry",ry3.toFixed(1));
          if(els3){els3.setAttribute("cx",dx3.toFixed(1));els3.setAttribute("cy",dy3.toFixed(1));
            els3.setAttribute("rx",rx3);els3.setAttribute("ry",ry3.toFixed(1));}
        });
      }
    } else {
      const e = BUBBLE_TAIL_ELLIPSE[bubble.type];
      let newPath: string | null = null;
      if (e) {
        newPath = buildUnifiedTailPath(e.cx, e.cy, e.rx, e.ry, live.vbX, live.vbY, live.hw, live.curve);
      } else if (bubble.type === "shout") {
        const vr = Math.max(14, 30 * (1 - 0.5 * 0.5));
        newPath = buildTailOnlyPath(50, 46, vr, vr, live.vbX, live.vbY, live.hw, live.curve) ?? null;
      }
      if (newPath) svgEl.querySelector("path")?.setAttribute("d", newPath);
      if (e) {
        const tailOnlyPath = buildTailOnlyPath(e.cx, e.cy, e.rx, e.ry, live.vbX, live.vbY, live.hw, live.curve);
        const svgPaths = svgEl.querySelectorAll("path");
        if (tailOnlyPath && svgPaths[1]) svgPaths[1].setAttribute("d", tailOnlyPath);
        if (bubble.type === "speech") {
          const arcPath = buildBodyArcPath(e.cx, e.cy, e.rx, e.ry, live.vbX, live.vbY, live.hw, live.curve);
          if (svgPaths[2]) svgPaths[2].setAttribute("d", arcPath);
        }
      }
    }
    const handleEl = bubbleHandleRefs.current.get(live.bubbleId);
    if (handleEl) {
      const bw = bubble.width ?? DEFAULT_SPEECH_BUBBLE_WIDTH;
      const bh = bubble.height ?? DEFAULT_SPEECH_BUBBLE_HEIGHT;
      const bSvgH = bubble.type === "thought" ? bh : bh * 1.2;
      const bVbH = bubble.type === "thought" ? 92 : 120;
      const bBodyCY = (bubble.type === "thought" || bubble.type === "shout")
        ? 46
        : (BUBBLE_TAIL_ELLIPSE[bubble.type]?.cy ?? 46);
      const bSvgTopOffset = (bh / 2) - (bBodyCY / bVbH) * bSvgH;
      handleEl.style.left = `${(live.vbX / 100) * bw}px`;
      handleEl.style.top = `${(live.vbY / bVbH) * bSvgH + bSvgTopOffset}px`;
    }
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
          ? {
              x: Math.round(resizeSpeechBubbleDraft.x),
              y: Math.round(resizeSpeechBubbleDraft.y),
              width: Math.round(resizeSpeechBubbleDraft.width),
              height: Math.round(resizeSpeechBubbleDraft.height),
            }
          : {
              x: Math.round(bubble.position.x),
              y: Math.round(bubble.position.y),
              width: Math.round(bw),
              height: Math.round(bh),
            };
        const fontSize = bubble.style?.size ?? 30;
        const fontFamily = bubble.style?.font ?? "inherit";
        const color = bubble.style?.color ?? "#000000";
        const fontWeight = bubble.style?.bold ? "bold" : "normal";
        const fontStyle = bubble.style?.italic ? "italic" : "normal";
        const textDecoration = [bubble.style?.underline ? "underline" : null, bubble.style?.strikethrough ? "line-through" : null].filter(Boolean).join(" ") || undefined;
        const textAlign = bubble.style?.textAlign ?? "center";
        const textTransform = bubble.style?.textTransform ?? "none";
        const { fill: fillColor, stroke: strokeColor } = getSpeechBubbleFillStroke(bubble);
        const noTailType = SPEECH_BUBBLE_NO_TAIL_TYPES.has(bubble.type);
        // svgH et effectiveViewBox sont constants — jamais affectés par tailOn.
        // La queue apparaît/disparaît comme contenu SVG sans changer les dimensions.
        const effectiveViewBox = noTailType
          ? SPEECH_BUBBLE_VIEWBOX_NARRATION
          : bubble.type === "thought"
            ? "0 0 100 92"
            : SPEECH_BUBBLE_VIEWBOX_WITH_TAIL;
        // thought : viewBox "0 0 100 92" + svgH = geom.height → nuage (cy=46 = 50% de 92)
        // centré exactement dans le container. Queue (y=115) déborde via overflow="visible".
        const svgH = noTailType ? geom.height : bubble.type === "thought" ? geom.height : geom.height * 1.2;
        const vbParts = effectiveViewBox.split(" ").map(Number);
        const vbY = vbParts[1];
        const vbH = vbParts[3];
        // Centrer le corps visible dans la zone de sélection (container div).
        // Formule générale : svgTopOffset = container_center − body_center_in_svgH
        //                                 = h/2 − (bodyCY/vbH) × svgH
        const bodyCY = (bubble.type === "thought" || bubble.type === "shout")
          ? 46
          : (BUBBLE_TAIL_ELLIPSE[bubble.type]?.cy ?? 46);
        const svgTopOffset = noTailType ? 0 : (geom.height / 2) - (bodyCY / vbH) * svgH;

        // Zone de texte centrée sur le corps visible — fractions normalisées au vbH réel
        const bodyBounds = noTailType ? null : BODY_BOUNDS_FRAC[bubble.type];
        const textAreaTop = bodyBounds ? ((bodyBounds.topFrac * 120 - vbY) / vbH) * svgH : 0;
        // Le SVG est décalé de svgTopOffset pour centrer le corps : le textAreaTop suit.
        const adjustedTextAreaTop = textAreaTop + svgTopOffset;
        const textAreaH = noTailType
          ? geom.height
          : bodyBounds
            ? (bodyBounds.heightFrac * 120 / vbH) * svgH
            : (svgH * 100) / vbH;
        // Bornes horizontales : leftFrac/widthFrac normalisés sur la largeur viewBox (100)
        // → convertis en px en multipliant par geom.width (scale = geom.width/100)
        const textAreaLeft = bodyBounds?.leftFrac != null ? bodyBounds.leftFrac * geom.width : null;
        const textAreaWidth = bodyBounds?.widthFrac != null ? bodyBounds.widthFrac * geom.width : null;
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
          wordBreak: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "pre-wrap",
        };

        // Tailwind preflight efface text-decoration/font-weight/font-style des balises HTML.
        // Ces classes les restaurent pour le rich text stocké en HTML dans bubble.text.
        const richTextClass = "[&_u]:underline [&_s]:line-through [&_strike]:line-through [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic";

        // Coordonnées de la pointe de queue dans le repère viewBox
        const hasDraggableTail = DRAGGABLE_TAIL_TYPES.has(bubble.type) && (bubble.type === "shout" ? bubble.tailOn === true : bubble.tailOn !== false);
        const isTailContext = tailContextBubbleId === bubble.id;
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
            ref={(el) => {
              if (el) {
                bubbleDivRefs.current.set(bubble.id, el);
                if (isResizingThis) resizingSpeechBubbleElRef.current = el;
              } else {
                bubbleDivRefs.current.delete(bubble.id);
              }
            }}
            role={!isResizingThis && !isEditing ? "button" : undefined}
            className={`group absolute overflow-visible transition-[box-shadow,outline,outline-offset,filter,ring] duration-150 ${isEditing ? "cursor-text" : "cursor-grab active:cursor-grabbing"} ${isSelected && !isTailContext ? "brightness-[1.02]" : !isTailContext ? "hover:ring-[3px] hover:ring-inset hover:ring-primary/55" : ""}`}
            style={{
              left: geom.x,
              top: geom.y,
              width: geom.width,
              height: geom.height,
              zIndex: isSelected ? 99999 : (bubble.zIndex ?? 0) + 10000,
              ...(bubble.hidden ? { opacity: 0, pointerEvents: "none" } : {}),
              ...(isSelected && !isTailContext
                ? {
                    outline: "4px solid hsl(var(--primary))",
                    outlineOffset: "-4px",
                  }
                : {}),
            }}
            onPointerDown={!isResizingThis && !isResizingSpeechBubbleRef.current && !isEditing ? (e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              const bubbleDiv = bubbleDivRefs.current.get(bubble.id);
              const canvasEl = canvasRefByPanel.current[panel.id];
              if (!bubbleDiv || !canvasEl) return;
              const capturedGeomX = geom.x;
              const capturedGeomY = geom.y;
              const capturedW = geom.width;
              const capturedH = geom.height;
              const capturedPanelH = getPanelHeight(panel);
              const capturedPanelId = panel.id;
              const capturedBubbleId = bubble.id;
              const r0 = canvasEl.getBoundingClientRect();
              const s0 = canvasEl.offsetWidth > 0 ? r0.width / canvasEl.offsetWidth : 1;
              const startMouseX = (e.clientX - r0.left) / s0;
              const startMouseY = (e.clientY - r0.top) / s0;
              let dragStarted = false;
              const THRESHOLD = 5;
              const onMove = (ev: PointerEvent) => {
                const r = canvasEl.getBoundingClientRect();
                const s = canvasEl.offsetWidth > 0 ? r.width / canvasEl.offsetWidth : 1;
                const mx = (ev.clientX - r.left) / s;
                const my = (ev.clientY - r.top) / s;
                const dx = mx - startMouseX;
                const dy = my - startMouseY;
                if (!dragStarted) {
                  if (Math.sqrt(dx * dx + dy * dy) < THRESHOLD) return;
                  dragStarted = true;
                  // Désactive toutes les transitions CSS pour que le drag et le relâché soient instantanés.
                  bubbleDiv.style.transition = "none";
                  bubbleDiv.style.cursor = "grabbing";
                  bubbleDiv.style.filter = "drop-shadow(0 4px 16px rgba(0,0,0,0.35))";
                }
                const newX = Math.max(0, Math.min(PANEL_WIDTH - capturedW, capturedGeomX + dx));
                const newY = Math.max(0, Math.min(capturedPanelH - capturedH, capturedGeomY + dy));
                bubbleDiv.style.left = `${newX}px`;
                bubbleDiv.style.top = `${newY}px`;
              };
              const onUp = (ev: PointerEvent) => {
                if (ev.button !== 0) return;
                if (!dragStarted) { cleanup(); return; }
                const r = canvasEl.getBoundingClientRect();
                const s = canvasEl.offsetWidth > 0 ? r.width / canvasEl.offsetWidth : 1;
                const mx = (ev.clientX - r.left) / s;
                const my = (ev.clientY - r.top) / s;
                const finalX = Math.max(0, Math.min(PANEL_WIDTH - capturedW, Math.round(capturedGeomX + (mx - startMouseX))));
                const finalY = Math.max(0, Math.min(capturedPanelH - capturedH, Math.round(capturedGeomY + (my - startMouseY))));
                // Position finale + nettoyage visuels instantanés (transition déjà désactivée).
                bubbleDiv.style.left = `${finalX}px`;
                bubbleDiv.style.top = `${finalY}px`;
                bubbleDiv.style.cursor = "";
                bubbleDiv.style.filter = "";
                cleanup();
                // Restaure les transitions CSS après que le navigateur a peint la frame finale.
                requestAnimationFrame(() => { bubbleDiv.style.transition = ""; });
                onMoveCommit(capturedPanelId, capturedBubbleId, finalX, finalY);
              };
              const cleanup = () => {
                document.removeEventListener("pointermove", onMove, true);
                document.removeEventListener("pointerup", onUp, true);
                activeBubbleDragCleanupRef.current = null;
              };
              activeBubbleDragCleanupRef.current?.();
              activeBubbleDragCleanupRef.current = cleanup;
              document.addEventListener("pointermove", onMove, { capture: true, passive: true });
              document.addEventListener("pointerup", onUp, true);
            } : undefined}
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) return;
              if (tailContextBubbleId === bubble.id) {
                onTailContext?.(null);
                return;
              }
              if (isSelected) {
                editingBubbleTextRef.current = bubble.text;
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
                onSelectBubble(bubble.id);
                committedCurrentEditRef.current = false;
                setEditingBubbleId(bubble.id);
              }
            }}
          >
            {bubble.type !== "text" && (
              <svg
                ref={(el) => { if (el) bubbleSvgRefs.current.set(bubble.id, el); else bubbleSvgRefs.current.delete(bubble.id); }}
                viewBox={effectiveViewBox}
                className="absolute pointer-events-none"
                style={{ top: svgTopOffset, left: 0, width: "100%", height: svgH }}
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
                  tailDotAspectRatio={bubble.type === "thought" ? (svgH / vbH) / (geom.width / 100) : undefined}
                />
              </svg>
            )}

            {/* SVG overlay pour la zone de hit de la queue — triangle seulement */}
            {hitPath && (
              <svg
                viewBox={effectiveViewBox}
                className="absolute"
                style={{ top: svgTopOffset, left: 0, width: "100%", height: svgH, pointerEvents: "none" }}
                preserveAspectRatio="none"
                overflow="visible"
              >
                <path
                  d={hitPath}
                  strokeWidth={1.5}
                  pointerEvents="all"
                  className={`transition-colors cursor-crosshair ${isTailContext ? "fill-primary/10 stroke-transparent" : "fill-transparent stroke-transparent hover:fill-primary/20 hover:stroke-primary/50"}`}
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
                ref={(el) => { if (el) bubbleHandleRefs.current.set(bubble.id, el); else bubbleHandleRefs.current.delete(bubble.id); }}
                style={{
                  position: "absolute",
                  left: (resolvedTailX / 100) * geom.width,
                  top: (resolvedTailY / vbH) * svgH + svgTopOffset,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "hsl(var(--primary))",
                  border: "3px solid rgba(255,255,255,0.95)",
                  cursor: "grab",
                  zIndex: 30,
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.45), 0 0 0 4px hsl(var(--primary) / 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Déplacer la pointe de la queue"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.preventDefault();
                  e.stopPropagation();

                  const bubbleDiv = (e.currentTarget as HTMLElement).parentElement;
                  if (!bubbleDiv) return;

                  const rect = bubbleDiv.getBoundingClientRect();
                  const clickOffX = (e.clientX - rect.left) / (rect.width / 100) - resolvedTailX;
                  // Unités viewBox contenues dans le container : 120/svgRatio (zoom-correct via rect.height).
                  // thought=80 (svgH=1.5×h), tous les autres=100 (svgH=1.2×h).
                  const tailVbBodyH = bubble.type === "thought" ? 92 : 100;
                  const clickOffY = (e.clientY - rect.top)  / (rect.height / tailVbBodyH) - resolvedTailY;

                  // Capture stable values for the drag closure
                  const capturedId = bubble.id;
                  const capturedBubbleType = bubble.type;
                  const capturedEllipse = ellipseParams;
                  const capturedVr = capturedBubbleType === "shout" ? Math.max(14, 30 * (1 - 0.5 * 0.5)) : 0;
                  const capturedHw = (bubble.tailBaseWidth ?? 28) / 2;
                  const capturedCurve = bubble.tailCurve ?? 0;
                  const capturedThoughtBumpR = bubble.thoughtBumpR ?? 10;
                  const capturedThoughtTailGap = bubble.thoughtTailGap ?? 3;
                  const capturedThoughtTailDotSize = bubble.thoughtTailDotSize ?? 1;
                  const capturedGeomW = geom.width;
                  const capturedSvgH = svgH;
                  const capturedVbH = vbH;
                  const capturedSvgTopOffset = svgTopOffset;
                  const svgEl = bubbleSvgRefs.current.get(capturedId);
                  const handleEl = bubbleHandleRefs.current.get(capturedId);
                  // Track latest position for single commit on pointerup
                  const latestPos = { vbX: resolvedTailX, vbY: resolvedTailY };

                  const onMove = (ev: PointerEvent) => {
                    const r = bubbleDiv.getBoundingClientRect();
                    const vbX = (ev.clientX - r.left) / (r.width  / 100) - clickOffX;
                    const vbY = (ev.clientY - r.top)  / (r.height  / tailVbBodyH) - clickOffY;

                    if (capturedEllipse) {
                      const { cx, cy, rx, ry } = capturedEllipse;
                      if (Math.pow((vbX - cx) / rx, 2) + Math.pow((vbY - cy) / ry, 2) < 1.15 * 1.15) return;
                    } else if (capturedBubbleType === "shout") {
                      if (Math.hypot(vbX - 50, vbY - 46) < capturedVr * 1.5) return;
                    } else if (capturedBubbleType === "thought") {
                      const angle2 = Math.atan2(vbY - 46, vbX - 50);
                      const ex2 = (24 + capturedThoughtBumpR) * Math.cos(angle2);
                      const ey2 = (18 + capturedThoughtBumpR) * Math.sin(angle2);
                      if (Math.hypot(vbX - 50, vbY - 46) < Math.sqrt(ex2 * ex2 + ey2 * ey2) * 1.05) return;
                    }

                    latestPos.vbX = Math.round(vbX * 10) / 10;
                    latestPos.vbY = Math.round(vbY * 10) / 10;

                    liveTailRef.current = { bubbleId: capturedId, vbX, vbY, hw: capturedHw, curve: capturedCurve };

                    // Direct DOM update — réponse immédiate, sans attendre un re-render
                    if (svgEl) {
                      if (capturedBubbleType === "thought") {
                        const angle = Math.atan2(vbY - 46, vbX - 50);
                        const bodyR = (() => {
                          const ex = (24 + capturedThoughtBumpR) * Math.cos(angle);
                          const ey = (18 + capturedThoughtBumpR) * Math.sin(angle);
                          return Math.sqrt(ex * ex + ey * ey);
                        })();
                        const p0x = 50 + bodyR * Math.cos(angle), p0y = 46 + bodyR * Math.sin(angle);
                        const mx = (p0x + vbX) / 2, my = (p0y + vbY) / 2;
                        const cp2x = mx - Math.sin(angle) * capturedCurve, cp2y = my + Math.cos(angle) * capturedCurve;
                        const bez = (t: number): [number, number] => {
                          const u = 1 - t;
                          return [u*u*p0x + 2*u*t*cp2x + t*t*vbX, u*u*p0y + 2*u*t*cp2y + t*t*vbY];
                        };
                        const S = 60;
                        const cl = [0];
                        let pp = bez(0);
                        for (let i = 1; i <= S; i++) {
                          const pt = bez(i/S);
                          cl.push(cl[i-1] + Math.hypot(pt[0]-pp[0], pt[1]-pp[1]));
                          pp = pt;
                        }
                        const aL = cl[S];
                        const tD = (d: number) => { for (let i = 1; i <= S; i++) { if (cl[i] >= d) return (i-1+(d-cl[i-1])/(cl[i]-cl[i-1]))/S; } return 1; };
                        const TAPER2 = [1, 0.72, 0.52, 0.37, 0.26];
                        const baseR2 = Math.min(aL * 0.14, 9) * capturedThoughtTailDotSize;
                        const step2 = aL / (TAPER2.length + 1) + capturedThoughtTailGap;
                        const dots = svgEl.querySelectorAll(".thought-tail-dot");
                        const dotsStroke = svgEl.querySelectorAll(".thought-tail-dot-stroke");
                        const dotCorr = (capturedSvgH / capturedVbH) / (capturedGeomW / 100);
                        if (aL > 3) {
                          TAPER2.forEach((rel, idx) => {
                            const el = dots[idx] as SVGElement | undefined;
                            const els = dotsStroke[idx] as SVGElement | undefined;
                            if (!el) return;
                            const [dx2, dy2] = bez(tD(step2 * (idx + 1)));
                            const ry2 = Math.max(0.3, baseR2 * rel);
                            const rx2 = (ry2 * dotCorr).toFixed(1);
                            el.setAttribute("cx", dx2.toFixed(1)); el.setAttribute("cy", dy2.toFixed(1));
                            el.setAttribute("rx", rx2); el.setAttribute("ry", ry2.toFixed(1));
                            if (els) {
                              els.setAttribute("cx", dx2.toFixed(1)); els.setAttribute("cy", dy2.toFixed(1));
                              els.setAttribute("rx", rx2); els.setAttribute("ry", ry2.toFixed(1));
                            }
                          });
                        }
                      } else {
                        let newPath: string | null = null;
                        if (capturedEllipse) {
                          const { cx, cy, rx, ry } = capturedEllipse;
                          newPath = buildUnifiedTailPath(cx, cy, rx, ry, vbX, vbY, capturedHw, capturedCurve);
                        } else if (capturedBubbleType === "shout") {
                          newPath = buildTailOnlyPath(50, 46, capturedVr, capturedVr, vbX, vbY, capturedHw, capturedCurve) ?? null;
                        }
                        if (newPath) svgEl.querySelector("path")?.setAttribute("d", newPath);
                        if (capturedEllipse) {
                          const { cx, cy, rx, ry } = capturedEllipse;
                          const tailOnlyPath = buildTailOnlyPath(cx, cy, rx, ry, vbX, vbY, capturedHw, capturedCurve);
                          const svgPaths = svgEl.querySelectorAll("path");
                          if (tailOnlyPath && svgPaths[1]) svgPaths[1].setAttribute("d", tailOnlyPath);
                          if (capturedBubbleType === "speech") {
                            const arcPath = buildBodyArcPath(cx, cy, rx, ry, vbX, vbY, capturedHw, capturedCurve);
                            if (svgPaths[2]) svgPaths[2].setAttribute("d", arcPath);
                          }
                        }
                      }
                    }
                    if (handleEl) {
                      handleEl.style.left = `${(vbX / 100) * capturedGeomW}px`;
                      handleEl.style.top  = `${(vbY / capturedVbH) * capturedSvgH + capturedSvgTopOffset}px`;
                    }
                  };

                  const onUp = () => {
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", onUp);
                    // Efface la ref live — React reprend le contrôle du DOM pour le paint final
                    liveTailRef.current = null;
                    // Single React commit avec la position finale (1 seul re-render)
                    onBubbleUpdate?.(speechBubbles.map((b) =>
                      b.id === capturedId
                        ? { ...b, tailX: latestPos.vbX, tailY: latestPos.vbY }
                        : b
                    ));
                  };

                  window.addEventListener("pointermove", onMove);
                  window.addEventListener("pointerup", onUp);
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden style={{ pointerEvents: "none", flexShrink: 0 }}>
                  <line x1="5" y1="1.5" x2="5" y2="8.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="1.5" y1="5" x2="8.5" y2="5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            )}

            {isEditing ? (
              <div
                key="bubble-editor"
                className={`absolute flex flex-col justify-center z-30 ${textAreaLeft == null ? `inset-x-0 ${bubble.type === "narration" ? "px-11 py-10" : "px-3"}` : "px-2"}`}
                style={{
                  top: adjustedTextAreaTop,
                  minHeight: textAreaH,
                  ...(textAreaLeft != null ? { left: textAreaLeft, width: textAreaWidth ?? undefined } : {}),
                }}
              >
                <div
                  ref={editingDivCallback}
                  contentEditable
                  suppressContentEditableWarning
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
                  className={`w-full bg-transparent border-none outline-none ${richTextClass}`}
                  style={sharedTextStyle}
                />
              </div>
            ) : (
              <div
                key="bubble-readonly"
                className={`absolute flex flex-col justify-center pointer-events-none ${textAreaLeft == null ? `inset-x-0 ${bubble.type === "narration" ? "px-11 py-10" : "px-3"}` : "px-2"}`}
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
            )}

            {isSelected && !isResizingThis && !isEditing && !isTailContext && [
              { edge: "r" as const, style: { right: 0, top: 0, bottom: 0, width: RESIZE_BUBBLE_EDGE_PX }, cursor: "ew-resize" },
              { edge: "b" as const, style: { bottom: 0, left: 0, right: 0, height: RESIZE_BUBBLE_EDGE_PX }, cursor: "ns-resize" },
              { edge: "l" as const, style: { left: 0, top: 0, bottom: 0, width: RESIZE_BUBBLE_EDGE_PX }, cursor: "ew-resize" },
              { edge: "t" as const, style: { top: 0, left: 0, right: 0, height: RESIZE_BUBBLE_EDGE_PX }, cursor: "ns-resize" },
              { edge: "tl" as const, style: { left: 0, top: 0, width: RESIZE_BUBBLE_CORNER_PX, height: RESIZE_BUBBLE_CORNER_PX }, cursor: "nwse-resize" },
              { edge: "tr" as const, style: { right: 0, top: 0, width: RESIZE_BUBBLE_CORNER_PX, height: RESIZE_BUBBLE_CORNER_PX }, cursor: "nesw-resize" },
              { edge: "br" as const, style: { right: 0, bottom: 0, width: RESIZE_BUBBLE_CORNER_PX, height: RESIZE_BUBBLE_CORNER_PX }, cursor: "nwse-resize" },
              { edge: "bl" as const, style: { left: 0, bottom: 0, width: RESIZE_BUBBLE_CORNER_PX, height: RESIZE_BUBBLE_CORNER_PX }, cursor: "nesw-resize" },
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
    </>
  );
}
