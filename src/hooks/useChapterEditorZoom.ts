import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  type MutableRefObject,
  type RefObject,
} from "react";

/** Zoom modale canvas chapitre (éditeur). */
export const CHAPTER_EDITOR_ZOOM_MIN = 0.1;
export const CHAPTER_EDITOR_ZOOM_MAX = 2;

export function clampChapterEditorZoom(z: number): number {
  return Math.min(CHAPTER_EDITOR_ZOOM_MAX, Math.max(CHAPTER_EDITOR_ZOOM_MIN, Math.round(z * 100) / 100));
}

type ChapterEditorZoomPivot = {
  scrollLeft: number;
  scrollTop: number;
  rx: number;
  ry: number;
  anchorClientX: number;
  anchorClientY: number;
};

function capturePivotViewportCenter(
  scrollEl: HTMLDivElement,
  frameEl: HTMLDivElement,
): ChapterEditorZoomPivot | null {
  const fr = frameEl.getBoundingClientRect();
  if (fr.width < 8 || fr.height < 8) return null;
  const sr = scrollEl.getBoundingClientRect();
  const anchorClientX = sr.left + scrollEl.clientWidth / 2;
  const anchorClientY = sr.top + scrollEl.clientHeight / 2;
  const rx = Math.min(1, Math.max(0, (anchorClientX - fr.left) / fr.width));
  const ry = Math.min(1, Math.max(0, (anchorClientY - fr.top) / fr.height));
  return {
    scrollLeft: scrollEl.scrollLeft,
    scrollTop: scrollEl.scrollTop,
    rx,
    ry,
    anchorClientX,
    anchorClientY,
  };
}

function capturePivotAtMouse(
  scrollEl: HTMLDivElement,
  frameEl: HTMLDivElement,
  clientX: number,
  clientY: number,
): ChapterEditorZoomPivot | null {
  const fr = frameEl.getBoundingClientRect();
  if (fr.width < 8 || fr.height < 8) return null;
  const rx = Math.min(1, Math.max(0, (clientX - fr.left) / fr.width));
  const ry = Math.min(1, Math.max(0, (clientY - fr.top) / fr.height));
  return {
    scrollLeft: scrollEl.scrollLeft,
    scrollTop: scrollEl.scrollTop,
    rx,
    ry,
    anchorClientX: clientX,
    anchorClientY: clientY,
  };
}

export type ChapterEditorZoomPivotSource = "buttons" | { clientX: number; clientY: number };

type UseChapterEditorZoomParams = {
  expandedPanelId: string | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  zoomFrameRef: RefObject<HTMLDivElement | null>;
  /** Défaut 0.5 */
  initialZoom?: number;
};

/**
 * Zoom du canvas dans la modale d’édition : état synchronisé, ref pour les layers pointer,
 * recalibration du scroll (boutons centrés ou Ctrl + molette sur la souris).
 */
export function useChapterEditorZoom({
  expandedPanelId,
  scrollContainerRef,
  zoomFrameRef,
  initialZoom = 0.5,
}: UseChapterEditorZoomParams): {
  zoomLevel: number;
  zoomRef: MutableRefObject<number>;
  applyChapterEditorZoom: (nextRaw: number, pivotFrom: ChapterEditorZoomPivotSource) => void;
} {
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  const zoomRef = useRef(initialZoom);
  const pivotPendingRef = useRef<ChapterEditorZoomPivot | null>(null);

  useEffect(() => {
    zoomRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    if (!expandedPanelId) pivotPendingRef.current = null;
  }, [expandedPanelId]);

  useLayoutEffect(() => {
    if (!expandedPanelId) return;
    const pivot = pivotPendingRef.current;
    if (!pivot) return;
    pivotPendingRef.current = null;

    const scroll = scrollContainerRef.current;
    const frame = zoomFrameRef.current;
    if (!scroll || !frame) return;

    const fr1 = frame.getBoundingClientRect();
    if (fr1.width < 8 || fr1.height < 8) return;

    const vxExpected = fr1.left + pivot.rx * fr1.width;
    const vyExpected = fr1.top + pivot.ry * fr1.height;

    scroll.scrollLeft = pivot.scrollLeft + (vxExpected - pivot.anchorClientX);
    scroll.scrollTop = pivot.scrollTop + (vyExpected - pivot.anchorClientY);
  }, [expandedPanelId, zoomLevel, scrollContainerRef, zoomFrameRef]);

  const applyChapterEditorZoom = useCallback(
    (nextRaw: number, pivotFrom: ChapterEditorZoomPivotSource) => {
      const prev = clampChapterEditorZoom(zoomRef.current);
      const next = clampChapterEditorZoom(nextRaw);
      if (next === prev) return;

      const scroll = scrollContainerRef.current;
      const frame = zoomFrameRef.current;

      if (expandedPanelId && scroll && frame) {
        pivotPendingRef.current =
          pivotFrom === "buttons"
            ? capturePivotViewportCenter(scroll, frame)
            : capturePivotAtMouse(scroll, frame, pivotFrom.clientX, pivotFrom.clientY);
      } else {
        pivotPendingRef.current = null;
      }

      zoomRef.current = next;
      setZoomLevel(next);
    },
    [expandedPanelId, scrollContainerRef, zoomFrameRef],
  );

  useEffect(() => {
    if (!expandedPanelId) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const step = 0.05;
      applyChapterEditorZoom(zoomRef.current + (e.deltaY > 0 ? -step : step), {
        clientX: e.clientX,
        clientY: e.clientY,
      });
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, [expandedPanelId, applyChapterEditorZoom]);

  return { zoomLevel, zoomRef, applyChapterEditorZoom };
}
