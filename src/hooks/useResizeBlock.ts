import { useEffect } from "react";
import type { Panel } from "@/types";
import { getPanelHeight, PANEL_WIDTH } from "@/services/panels";

export type ResizeEdge = "r" | "b" | "l" | "t" | "tl" | "tr" | "br" | "bl";

export interface ResizingState {
  panelId: string;
  edge: ResizeEdge;
  start: { x: number; y: number; w: number; h: number };
  startMouse: { x: number; y: number };
}

export interface UseResizeBlockOptions {
  resizingState: ResizingState | null;
  captureTargetRef: React.RefObject<HTMLElement | null>;
  elementRef: React.RefObject<HTMLElement | null>;
  draftRef: React.MutableRefObject<{ x: number; y: number; width: number; height: number } | null>;
  lastMouseRef: React.MutableRefObject<{ x: number; y: number } | null>;
  saveCallbackRef: React.MutableRefObject<((draft: { x: number; y: number; width: number; height: number }) => void) | null>;
  canvasRefByPanel: React.RefObject<Record<string, HTMLDivElement | null>>;
  panels: Panel[];
  minW?: number;
  minH?: number;
  /** Extra height added to the element during resize (used for speech bubble tail) */
  elementExtraH?: number;
  /** If true, attaches listeners to document.body in capture mode instead of the captureTarget */
  useDocumentCapture?: boolean;
  onDraft: (draft: { x: number; y: number; width: number; height: number }) => void;
  onCommit: (draft: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
}

function viewportToCanvas(canvasEl: HTMLDivElement, clientX: number, clientY: number) {
  const rect = canvasEl.getBoundingClientRect();
  const scale = canvasEl.offsetWidth > 0 ? rect.width / canvasEl.offsetWidth : 1;
  return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
}

export function useResizeBlock(options: UseResizeBlockOptions): void {
  const {
    resizingState,
    captureTargetRef,
    elementRef,
    draftRef,
    lastMouseRef,
    saveCallbackRef,
    canvasRefByPanel,
    panels,
    minW = 100,
    minH = 100,
    elementExtraH = 0,
    useDocumentCapture = false,
    onDraft,
    onCommit,
    onCancel,
  } = options;

  useEffect(() => {
    if (!resizingState) return;
    const target = useDocumentCapture ? document.body : captureTargetRef.current;
    if (!target) return;

    const { edge, start } = resizingState;
    const rightFixed = start.x + start.w;
    const bottomFixed = start.y + start.h;

    const computeFromMouse = (clientX: number, clientY: number) => {
      const canvasEl = canvasRefByPanel.current[resizingState.panelId];
      if (!canvasEl) return { x: start.x, y: start.y, width: start.w, height: start.h };

      const mouse = viewportToCanvas(canvasEl, clientX, clientY);
      let x = start.x;
      let y = start.y;
      let w = start.w;
      let h = start.h;

      switch (edge) {
        case "r":  w = mouse.x - start.x; break;
        case "l":  x = mouse.x; w = rightFixed - mouse.x; break;
        case "b":  h = mouse.y - start.y; break;
        case "t":  y = mouse.y; h = bottomFixed - mouse.y; break;
        case "tr": y = mouse.y; w = mouse.x - start.x; h = bottomFixed - mouse.y; break;
        case "br": w = mouse.x - start.x; h = mouse.y - start.y; break;
        case "bl": x = mouse.x; w = rightFixed - mouse.x; h = mouse.y - start.y; break;
        case "tl": x = mouse.x; y = mouse.y; w = rightFixed - mouse.x; h = bottomFixed - mouse.y; break;
      }

      const leftFixed    = edge === "r"  || edge === "tr" || edge === "br";
      const topFixed     = edge === "r"  || edge === "b"  || edge === "br" || edge === "bl";
      const rightAnchored  = edge === "l"  || edge === "bl" || edge === "tl";
      const bottomAnchored = edge === "t"  || edge === "tr" || edge === "tl";

      const panel = panels.find((p) => p.id === resizingState.panelId);
      const panelH = getPanelHeight(panel);

      w = Math.max(minW, Math.min(PANEL_WIDTH, w));
      h = Math.max(minH, Math.min(panelH, h));

      if (leftFixed)     w = Math.min(w, PANEL_WIDTH - start.x);
      if (topFixed)      h = Math.min(h, panelH - start.y);
      if (rightAnchored)  { w = Math.min(w, rightFixed);  x = rightFixed - w; }
      if (bottomAnchored) { h = Math.min(h, bottomFixed); y = bottomFixed - h; }

      if (leftFixed)          x = start.x;
      else if (rightAnchored) x = rightFixed - w;
      else                    x = Math.max(0, Math.min(PANEL_WIDTH - w, x));

      if (topFixed)            y = start.y;
      else if (bottomAnchored) y = bottomFixed - h;
      else                     y = Math.max(0, Math.min(panelH - h, y));

      return { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) };
    };

    const onMove = (e: PointerEvent) => {
      if (e.buttons !== 1) return;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      const result = computeFromMouse(e.clientX, e.clientY);
      draftRef.current = result;
      onDraft(result);
      const el = elementRef.current;
      if (el) {
        el.style.left   = `${result.x}px`;
        el.style.top    = `${result.y}px`;
        el.style.width  = `${result.width}px`;
        el.style.height = `${result.height + elementExtraH}px`;
      }
    };

    const onUp = () => {
      const lastClient = lastMouseRef.current;
      const rawResult = lastClient
        ? computeFromMouse(lastClient.x, lastClient.y)
        : draftRef.current ?? { x: start.x, y: start.y, width: start.w, height: start.h };
      const result = {
        x: Math.round(rawResult.x),
        y: Math.round(rawResult.y),
        width: Math.round(rawResult.width),
        height: Math.round(rawResult.height),
      };
      const hadSave = !!saveCallbackRef.current;
      saveCallbackRef.current?.(result);
      saveCallbackRef.current = null;
      if (!hadSave) {
        onCommit(result);
        onCancel();
      }
    };

    if (useDocumentCapture) {
      target.addEventListener("pointermove", onMove, true);
      target.addEventListener("pointerup", onUp, true);
    } else {
      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
    }

    return () => {
      if (useDocumentCapture) {
        target.removeEventListener("pointermove", onMove, true);
        target.removeEventListener("pointerup", onUp, true);
      } else {
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizingState, panels]);
}
