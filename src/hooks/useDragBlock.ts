import { useCallback, useEffect, useRef } from "react";
import { PANEL_WIDTH } from "@/services/panels";

const DRAG_THRESHOLD_PX = 5;

function viewportToCanvas(canvasEl: HTMLDivElement, clientX: number, clientY: number) {
  const rect = canvasEl.getBoundingClientRect();
  const scale = canvasEl.offsetWidth > 0 ? rect.width / canvasEl.offsetWidth : 1;
  return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
}

export interface UseDragBlockOptions {
  canvasRefByPanel: React.RefObject<Record<string, HTMLDivElement | null>>;
  ghostRefByPanel: React.RefObject<Record<string, HTMLDivElement | null>>;
  isResizingRef: React.RefObject<boolean>;
  zoomRef: React.RefObject<number>;
  onCommit: (panelId: string, entityId: string, x: number, y: number) => void;
}

export interface DragHandlers {
  onPointerDown: (
    e: React.PointerEvent,
    panelId: string,
    entityId: string,
    startX: number,
    startY: number,
    width: number,
    height: number,
    panelHeight: number,
  ) => void;
}

export function useDragBlock(options: UseDragBlockOptions): DragHandlers {
  const { canvasRefByPanel, ghostRefByPanel, isResizingRef, zoomRef, onCommit } = options;

  // Stores the cancel function of any active drag so unmount can clean up.
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cancelRef.current?.();
    };
  }, []);

  const onPointerDown = useCallback(
    (
      e: React.PointerEvent,
      panelId: string,
      entityId: string,
      startX: number,
      startY: number,
      width: number,
      height: number,
      panelHeight: number,
    ) => {
      if (e.button !== 0 || isResizingRef.current) return;
      e.preventDefault();

      const canvasEl = canvasRefByPanel.current[panelId];
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const dragScale = canvasEl.offsetWidth > 0 ? rect.width / canvasEl.offsetWidth : 1;
      const startMouseX = (e.clientX - rect.left) / dragScale;
      const startMouseY = (e.clientY - rect.top) / dragScale;

      const el = e.currentTarget as HTMLDivElement;
      const dataRef = { panelId, entityId, startX, startY, startMouseX, startMouseY, width, height, rectLeft: rect.left, rectTop: rect.top };

      let dragStarted = false;

      const cancel = (finalPos?: { x: number; y: number }) => {
        document.removeEventListener("pointermove", onPointerMove, true);
        document.removeEventListener("pointerup", onPointerUp, true);
        // Si une position finale est fournie, place l'élément avant de cacher le ghost
        // pour éviter le saut visuel (ghost → ancienne position → nouvelle position).
        if (finalPos != null) {
          el.style.transition = "none";
          el.style.left = `${finalPos.x}px`;
          el.style.top = `${finalPos.y}px`;
        }
        el.style.opacity = "";
        const g = ghostRefByPanel.current[panelId];
        if (g) g.style.display = "none";
        if (finalPos != null) {
          requestAnimationFrame(() => { el.style.transition = ""; });
        }
        cancelRef.current = null;
      };

      cancelRef.current = cancel;

      const onPointerMove = (ev: PointerEvent) => {
        const canvas = canvasRefByPanel.current[panelId];
        const r = canvas?.getBoundingClientRect();
        const ms = canvas && canvas.offsetWidth > 0 ? r!.width / canvas.offsetWidth : 1;
        const canvasMouseX = r ? (ev.clientX - r.left) / ms : (ev.clientX - dataRef.rectLeft) / (zoomRef.current ?? 1);
        const canvasMouseY = r ? (ev.clientY - r.top) / ms : (ev.clientY - dataRef.rectTop) / (zoomRef.current ?? 1);
        const dx = canvasMouseX - startMouseX;
        const dy = canvasMouseY - startMouseY;

        if (!dragStarted) {
          if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD_PX) return;
          dragStarted = true;
          const ghost = ghostRefByPanel.current[panelId];
          if (ghost) {
            ghost.style.display = "block";
            ghost.style.left = `${startX}px`;
            ghost.style.top = `${startY}px`;
            ghost.style.width = `${width}px`;
            ghost.style.height = `${height}px`;
          }
          el.style.opacity = "0.35";
        }

        const newX = Math.max(0, Math.min(PANEL_WIDTH - width, startX + dx));
        const newY = Math.max(0, Math.min(panelHeight - height, startY + dy));
        const g = ghostRefByPanel.current[panelId];
        if (g) { g.style.left = `${newX}px`; g.style.top = `${newY}px`; }
      };

      const onPointerUp = (ev: PointerEvent) => {
        if (ev.button !== 0) return;

        if (!dragStarted) { cancel(); return; }

        const canvas = canvasRefByPanel.current[panelId];
        if (!canvas) return;
        const { x: canvasMouseX, y: canvasMouseY } = viewportToCanvas(canvas, ev.clientX, ev.clientY);
        const clampedX = Math.max(0, Math.min(PANEL_WIDTH - width, Math.round(startX + (canvasMouseX - startMouseX))));
        const clampedY = Math.max(0, Math.min(panelHeight - height, Math.round(startY + (canvasMouseY - startMouseY))));
        // Passe la position finale à cancel() pour placer l'élément avant de cacher le ghost (pas de saut visuel).
        cancel({ x: clampedX, y: clampedY });
        onCommit(panelId, entityId, clampedX, clampedY);
      };

      document.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
      document.addEventListener("pointerup", onPointerUp, true);
    },
    [canvasRefByPanel, ghostRefByPanel, isResizingRef, zoomRef, onCommit],
  );

  return { onPointerDown };
}
