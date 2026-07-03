import { useState, useRef, useCallback, memo } from "react";
import { RotateCw } from "lucide-react";

import type { Panel, SfxBlock } from "@/types";
import { getPanelHeight, RESIZE_HANDLE_CORNER_PX, RESIZE_HANDLE_EDGE_PX } from "@/services/panels";
import { useDragBlock } from "@/hooks/useDragBlock";
import type { DragHandlers } from "@/hooks/useDragBlock";
import { useResizeBlock } from "@/hooks/useResizeBlock";
import type { ResizingState } from "@/hooks/useResizeBlock";
import { SfxVisual } from "@/components/chapter/SfxVisual";

interface SfxLayerProps {
  panel: Panel;
  panels: Panel[];
  sfxBlocks: SfxBlock[];
  canvasRefByPanel: React.RefObject<Record<string, HTMLDivElement | null>>;
  zoomRef: React.RefObject<number>;
  selectedSfxId: string | null;
  onSelectSfx: (id: string | null) => void;
  onMoveCommit: (panelId: string, sfxId: string, x: number, y: number) => void;
  onResizeCommit: (panelId: string, sfxId: string, draft: { x: number; y: number; width: number; height: number }) => void;
  onRotateCommit: (panelId: string, sfxId: string, rotation: number) => void;
}

type SfxResizingState = ResizingState & { sfxId: string };

/** Snap de la rotation aux angles clés (multiples de 15°) à ±4° près. */
function snapRotation(deg: number): number {
  const rounded = Math.round(deg);
  const nearest15 = Math.round(rounded / 15) * 15;
  return Math.abs(rounded - nearest15) <= 4 ? nearest15 : rounded;
}

interface SfxItemProps {
  sfx: SfxBlock;
  panelId: string;
  panelHeight: number;
  isSelected: boolean;
  isResizingThis: boolean;
  resizeDraft: { x: number; y: number; width: number; height: number } | null;
  rotationDraft: number | null;
  isResizingRef: React.RefObject<boolean>;
  resizingSfxElRef: React.RefObject<HTMLDivElement | null>;
  canvasRefByPanel: React.RefObject<Record<string, HTMLDivElement | null>>;
  onDragPointerDown: DragHandlers["onPointerDown"];
  onSelect: (id: string | null) => void;
  onResizeStart: (ev: React.PointerEvent<HTMLElement>, sfx: SfxBlock, edge: ResizingState["edge"]) => void;
  onRotateDraft: (sfxId: string, deg: number | null) => void;
  onRotateCommit: (panelId: string, sfxId: string, rotation: number) => void;
}

const SfxItem = memo(function SfxItem({
  sfx,
  panelId,
  panelHeight,
  isSelected,
  isResizingThis,
  resizeDraft,
  rotationDraft,
  isResizingRef,
  resizingSfxElRef,
  canvasRefByPanel,
  onDragPointerDown,
  onSelect,
  onResizeStart,
  onRotateDraft,
  onRotateCommit,
}: SfxItemProps) {
  const geom = isResizingThis && resizeDraft
    ? { x: Math.round(resizeDraft.x), y: Math.round(resizeDraft.y), width: Math.round(resizeDraft.width), height: Math.round(resizeDraft.height) }
    : { x: Math.round(sfx.x), y: Math.round(sfx.y), width: Math.round(sfx.width), height: Math.round(sfx.height) };
  const liveRotation = rotationDraft ?? sfx.rotation;

  const handleRotatePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    if (!canvasRefByPanel.current[panelId]) return;
    const cx = sfx.x + sfx.width / 2;
    const cy = sfx.y + sfx.height / 2;
    let lastDeg = sfx.rotation;

    const onMove = (ev: PointerEvent) => {
      const canvasEl = canvasRefByPanel.current[panelId];
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const scale = canvasEl.offsetWidth > 0 ? rect.width / canvasEl.offsetWidth : 1;
      const mx = (ev.clientX - rect.left) / scale;
      const my = (ev.clientY - rect.top) / scale;
      const deg = (Math.atan2(my - cy, mx - cx) * 180) / Math.PI + 90;
      const normalized = ((deg + 540) % 360) - 180;
      lastDeg = snapRotation(normalized);
      onRotateDraft(sfx.id, lastDeg);
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      onRotateDraft(sfx.id, null);
      onRotateCommit(panelId, sfx.id, lastDeg);
    };
    document.addEventListener("pointermove", onMove, { capture: true, passive: true });
    document.addEventListener("pointerup", onUp, true);
  };

  return (
    <div
      ref={isResizingThis ? (el) => { if (el) resizingSfxElRef.current = el; } : undefined}
      className={`group absolute cursor-grab active:cursor-grabbing ${isSelected ? "" : "hover:ring-2 hover:ring-primary/50"}`}
      style={{
        left: geom.x,
        top: geom.y,
        width: geom.width,
        height: geom.height,
        // Un SFX (onomatopée) se peint TOUJOURS au-dessus des cases : bande +6000,
        // au-dessus des images (+1000) et du système (+3000), sous les bulles (+10000).
        zIndex: isSelected ? 99999 : (sfx.zIndex ?? 0) + 6000,
        overflow: "visible",
        ...(sfx.hidden ? { opacity: 0, pointerEvents: "none" } : {}),
        ...(isSelected ? { outline: "2px dashed hsl(var(--primary))", outlineOffset: "2px" } : {}),
      }}
      onPointerDown={!isResizingThis && !isResizingRef.current ? (e) => {
        onDragPointerDown(e, panelId, sfx.id, sfx.x, sfx.y, sfx.width, sfx.height, panelHeight);
      } : undefined}
      onClick={(e) => { e.stopPropagation(); onSelect(sfx.id); }}
    >
      <SfxVisual sfx={{ ...sfx, rotation: liveRotation }} />
      {isSelected && (
        <button
          type="button"
          title={`Rotation : ${Math.round(liveRotation)}°`}
          aria-label="Pivoter le SFX"
          onPointerDown={handleRotatePointerDown}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1/2 -translate-x-1/2 -top-9 h-7 w-7 rounded-full border border-primary/70 bg-background text-primary shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-primary/10"
          style={{ zIndex: 100000 }}
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
      )}
      {[
        { edge: "r" as const, style: { right: 0, top: 0, bottom: 0, width: RESIZE_HANDLE_EDGE_PX }, cursor: "ew-resize" },
        { edge: "b" as const, style: { bottom: 0, left: 0, right: 0, height: RESIZE_HANDLE_EDGE_PX }, cursor: "ns-resize" },
        { edge: "l" as const, style: { left: 0, top: 0, bottom: 0, width: RESIZE_HANDLE_EDGE_PX }, cursor: "ew-resize" },
        { edge: "t" as const, style: { top: 0, left: 0, right: 0, height: RESIZE_HANDLE_EDGE_PX }, cursor: "ns-resize" },
        { edge: "tl" as const, style: { left: 0, top: 0, width: RESIZE_HANDLE_CORNER_PX, height: RESIZE_HANDLE_CORNER_PX }, cursor: "nwse-resize" },
        { edge: "tr" as const, style: { right: 0, top: 0, width: RESIZE_HANDLE_CORNER_PX, height: RESIZE_HANDLE_CORNER_PX }, cursor: "nesw-resize" },
        { edge: "br" as const, style: { right: 0, bottom: 0, width: RESIZE_HANDLE_CORNER_PX, height: RESIZE_HANDLE_CORNER_PX }, cursor: "nwse-resize" },
        { edge: "bl" as const, style: { left: 0, bottom: 0, width: RESIZE_HANDLE_CORNER_PX, height: RESIZE_HANDLE_CORNER_PX }, cursor: "nesw-resize" },
      ].map(({ edge, style, cursor }) => (
        <div
          key={edge}
          className="absolute z-10 rounded-sm transition-colors hover:bg-primary/30"
          style={{ ...style, cursor }}
          onPointerDown={(ev) => onResizeStart(ev, sfx, edge)}
          aria-label="Redimensionner"
        />
      ))}
    </div>
  );
});

export function SfxLayer({
  panel,
  panels,
  sfxBlocks,
  canvasRefByPanel,
  zoomRef,
  selectedSfxId,
  onSelectSfx,
  onMoveCommit,
  onResizeCommit,
  onRotateCommit,
}: SfxLayerProps) {
  const ghostRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  const isResizingSfxRef = useRef(false);
  const resizingSfxElRef = useRef<HTMLDivElement | null>(null);
  const [resizingSfxState, setResizingSfxState] = useState<SfxResizingState | null>(null);
  const [resizeSfxDraft, setResizeSfxDraft] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const resizeSfxDraftRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const saveResizeSfxRef = useRef<((draft: { x: number; y: number; width: number; height: number }) => void) | null>(null);
  const lastResizeSfxMouseRef = useRef<{ x: number; y: number } | null>(null);
  const resizeSfxCaptureTargetRef = useRef<HTMLElement | null>(null);
  const [rotationDrafts, setRotationDrafts] = useState<Record<string, number>>({});

  const onSelectSfxRef = useRef(onSelectSfx);
  onSelectSfxRef.current = onSelectSfx;
  const stableOnSelect = useCallback((id: string | null) => onSelectSfxRef.current(id), []);

  const onMoveCommitRef = useRef(onMoveCommit);
  onMoveCommitRef.current = onMoveCommit;
  const stableOnMoveCommit = useCallback((panelId: string, sfxId: string, x: number, y: number) => {
    onMoveCommitRef.current(panelId, sfxId, x, y);
  }, []);

  const onResizeCommitRef = useRef(onResizeCommit);
  onResizeCommitRef.current = onResizeCommit;

  const onRotateCommitRef = useRef(onRotateCommit);
  onRotateCommitRef.current = onRotateCommit;
  const stableOnRotateCommit = useCallback((panelId: string, sfxId: string, rotation: number) => {
    onRotateCommitRef.current(panelId, sfxId, rotation);
  }, []);

  const stableOnRotateDraft = useCallback((sfxId: string, deg: number | null) => {
    setRotationDrafts((prev) => {
      if (deg === null) {
        if (!(sfxId in prev)) return prev;
        const next = { ...prev };
        delete next[sfxId];
        return next;
      }
      if (prev[sfxId] === deg) return prev;
      return { ...prev, [sfxId]: deg };
    });
  }, []);

  const stableOnResizeStart = useCallback((ev: React.PointerEvent<HTMLElement>, sfx: SfxBlock, edge: ResizingState["edge"]) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    isResizingSfxRef.current = true;
    resizeSfxCaptureTargetRef.current = ev.currentTarget;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    setResizingSfxState({ panelId: panel.id, sfxId: sfx.id, edge, start: { x: sfx.x, y: sfx.y, w: sfx.width, h: sfx.height }, startMouse: { x: ev.clientX, y: ev.clientY } });
    setResizeSfxDraft({ x: sfx.x, y: sfx.y, width: sfx.width, height: sfx.height });
    resizeSfxDraftRef.current = { x: sfx.x, y: sfx.y, width: sfx.width, height: sfx.height };
    saveResizeSfxRef.current = (draft) => {
      const roundedDraft = {
        x: Math.round(draft.x), y: Math.round(draft.y),
        width: Math.round(draft.width), height: Math.round(draft.height)
      };
      setResizingSfxState(null);
      setResizeSfxDraft(null);
      resizeSfxDraftRef.current = null;
      lastResizeSfxMouseRef.current = null;
      resizeSfxCaptureTargetRef.current = null;
      resizingSfxElRef.current = null;
      isResizingSfxRef.current = false;
      onResizeCommitRef.current(panel.id, sfx.id, roundedDraft);
    };
  }, [panel.id]);

  const dragSfx = useDragBlock({
    canvasRefByPanel,
    ghostRefByPanel,
    isResizingRef: isResizingSfxRef,
    zoomRef,
    onCommit: stableOnMoveCommit,
  });

  useResizeBlock({
    resizingState: resizingSfxState,
    captureTargetRef: resizeSfxCaptureTargetRef,
    elementRef: resizingSfxElRef,
    draftRef: resizeSfxDraftRef,
    lastMouseRef: lastResizeSfxMouseRef,
    saveCallbackRef: saveResizeSfxRef,
    canvasRefByPanel,
    panels,
    minW: 80,
    minH: 50,
    onDraft: setResizeSfxDraft,
    onCommit: () => {},
    onCancel: () => {
      setResizingSfxState(null);
      setResizeSfxDraft(null);
      resizeSfxDraftRef.current = null;
      lastResizeSfxMouseRef.current = null;
      resizeSfxCaptureTargetRef.current = null;
      resizingSfxElRef.current = null;
      isResizingSfxRef.current = false;
    },
  });

  const panelHeight = getPanelHeight(panel);

  return (
    <>
      {sfxBlocks.map((sfx) => {
        const isResizingThis = resizingSfxState?.panelId === panel.id && resizingSfxState?.sfxId === sfx.id;
        return (
          <SfxItem
            key={sfx.id}
            sfx={sfx}
            panelId={panel.id}
            panelHeight={panelHeight}
            isSelected={selectedSfxId === sfx.id}
            isResizingThis={isResizingThis}
            resizeDraft={isResizingThis ? resizeSfxDraft : null}
            rotationDraft={rotationDrafts[sfx.id] ?? null}
            isResizingRef={isResizingSfxRef}
            resizingSfxElRef={resizingSfxElRef}
            canvasRefByPanel={canvasRefByPanel}
            onDragPointerDown={dragSfx.onPointerDown}
            onSelect={stableOnSelect}
            onResizeStart={stableOnResizeStart}
            onRotateDraft={stableOnRotateDraft}
            onRotateCommit={stableOnRotateCommit}
          />
        );
      })}
      <div
        ref={(el) => { if (el) ghostRefByPanel.current[panel.id] = el; }}
        aria-hidden
        className="pointer-events-none absolute rounded-lg border-2 border-primary shadow-lg box-border"
        style={{ display: "none", left: 0, top: 0, width: 0, height: 0, zIndex: 99999 }}
      />
    </>
  );
}
