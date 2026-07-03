import { useState, useRef, useCallback, memo } from "react";

import type { Panel, SystemBlock } from "@/types";
import { getPanelHeight, RESIZE_HANDLE_CORNER_PX, RESIZE_HANDLE_EDGE_PX } from "@/services/panels";
import { useDragBlock } from "@/hooks/useDragBlock";
import type { DragHandlers } from "@/hooks/useDragBlock";
import { useResizeBlock } from "@/hooks/useResizeBlock";
import type { ResizingState } from "@/hooks/useResizeBlock";
import { SystemBlockVisual } from "@/components/chapter/SystemBlockVisual";

interface SystemBlockLayerProps {
  panel: Panel;
  panels: Panel[];
  systemBlocks: SystemBlock[];
  canvasRefByPanel: React.RefObject<Record<string, HTMLDivElement | null>>;
  zoomRef: React.RefObject<number>;
  selectedSystemBlockId: string | null;
  onSelectSystemBlock: (id: string | null) => void;
  onMoveCommit: (panelId: string, systemBlockId: string, x: number, y: number) => void;
  onResizeCommit: (panelId: string, systemBlockId: string, draft: { x: number; y: number; width: number; height: number }) => void;
}

type SystemBlockResizingState = ResizingState & { systemBlockId: string };

interface SystemBlockItemProps {
  sb: SystemBlock;
  panelId: string;
  panelHeight: number;
  isSelected: boolean;
  isResizingThis: boolean;
  resizeDraft: { x: number; y: number; width: number; height: number } | null;
  isResizingRef: React.RefObject<boolean>;
  resizingElRef: React.RefObject<HTMLDivElement | null>;
  onDragPointerDown: DragHandlers["onPointerDown"];
  onSelect: (id: string | null) => void;
  onResizeStart: (ev: React.PointerEvent<HTMLElement>, sb: SystemBlock, edge: ResizingState["edge"]) => void;
}

const SystemBlockItem = memo(function SystemBlockItem({
  sb,
  panelId,
  panelHeight,
  isSelected,
  isResizingThis,
  resizeDraft,
  isResizingRef,
  resizingElRef,
  onDragPointerDown,
  onSelect,
  onResizeStart,
}: SystemBlockItemProps) {
  const geom = isResizingThis && resizeDraft
    ? { x: Math.round(resizeDraft.x), y: Math.round(resizeDraft.y), width: Math.round(resizeDraft.width), height: Math.round(resizeDraft.height) }
    : { x: Math.round(sb.x), y: Math.round(sb.y), width: Math.round(sb.width), height: Math.round(sb.height) };

  return (
    <div
      ref={isResizingThis ? (el) => { if (el) resizingElRef.current = el; } : undefined}
      className={`group absolute cursor-grab active:cursor-grabbing ${isSelected ? "" : "hover:ring-2 hover:ring-primary/50"}`}
      style={{
        left: geom.x,
        top: geom.y,
        width: geom.width,
        height: geom.height,
        // Fenêtre système au-dessus des cases (+1000), sous les SFX (+6000) et les bulles (+10000).
        zIndex: isSelected ? 99999 : (sb.zIndex ?? 0) + 3000,
        overflow: "visible",
        ...(sb.hidden ? { opacity: 0, pointerEvents: "none" } : {}),
        ...(isSelected ? { outline: "2px dashed hsl(var(--primary))", outlineOffset: "3px" } : {}),
      }}
      onPointerDown={!isResizingThis && !isResizingRef.current ? (e) => {
        onDragPointerDown(e, panelId, sb.id, sb.x, sb.y, sb.width, sb.height, panelHeight);
      } : undefined}
      onClick={(e) => { e.stopPropagation(); onSelect(sb.id); }}
    >
      <SystemBlockVisual block={sb} />
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
          onPointerDown={(ev) => onResizeStart(ev, sb, edge)}
          aria-label="Redimensionner"
        />
      ))}
    </div>
  );
});

export function SystemBlockLayer({
  panel,
  panels,
  systemBlocks,
  canvasRefByPanel,
  zoomRef,
  selectedSystemBlockId,
  onSelectSystemBlock,
  onMoveCommit,
  onResizeCommit,
}: SystemBlockLayerProps) {
  const ghostRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  const isResizingRef = useRef(false);
  const resizingElRef = useRef<HTMLDivElement | null>(null);
  const [resizingState, setResizingState] = useState<SystemBlockResizingState | null>(null);
  const [resizeDraft, setResizeDraft] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const resizeDraftRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const saveResizeRef = useRef<((draft: { x: number; y: number; width: number; height: number }) => void) | null>(null);
  const lastResizeMouseRef = useRef<{ x: number; y: number } | null>(null);
  const resizeCaptureTargetRef = useRef<HTMLElement | null>(null);

  const onSelectRef = useRef(onSelectSystemBlock);
  onSelectRef.current = onSelectSystemBlock;
  const stableOnSelect = useCallback((id: string | null) => onSelectRef.current(id), []);

  const onMoveCommitRef = useRef(onMoveCommit);
  onMoveCommitRef.current = onMoveCommit;
  const stableOnMoveCommit = useCallback((panelId: string, systemBlockId: string, x: number, y: number) => {
    onMoveCommitRef.current(panelId, systemBlockId, x, y);
  }, []);

  const onResizeCommitRef = useRef(onResizeCommit);
  onResizeCommitRef.current = onResizeCommit;

  const stableOnResizeStart = useCallback((ev: React.PointerEvent<HTMLElement>, sb: SystemBlock, edge: ResizingState["edge"]) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    isResizingRef.current = true;
    resizeCaptureTargetRef.current = ev.currentTarget;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    setResizingState({ panelId: panel.id, systemBlockId: sb.id, edge, start: { x: sb.x, y: sb.y, w: sb.width, h: sb.height }, startMouse: { x: ev.clientX, y: ev.clientY } });
    setResizeDraft({ x: sb.x, y: sb.y, width: sb.width, height: sb.height });
    resizeDraftRef.current = { x: sb.x, y: sb.y, width: sb.width, height: sb.height };
    saveResizeRef.current = (draft) => {
      const roundedDraft = {
        x: Math.round(draft.x), y: Math.round(draft.y),
        width: Math.round(draft.width), height: Math.round(draft.height)
      };
      setResizingState(null);
      setResizeDraft(null);
      resizeDraftRef.current = null;
      lastResizeMouseRef.current = null;
      resizeCaptureTargetRef.current = null;
      resizingElRef.current = null;
      isResizingRef.current = false;
      onResizeCommitRef.current(panel.id, sb.id, roundedDraft);
    };
  }, [panel.id]);

  const dragSystemBlock = useDragBlock({
    canvasRefByPanel,
    ghostRefByPanel,
    isResizingRef,
    zoomRef,
    onCommit: stableOnMoveCommit,
  });

  useResizeBlock({
    resizingState,
    captureTargetRef: resizeCaptureTargetRef,
    elementRef: resizingElRef,
    draftRef: resizeDraftRef,
    lastMouseRef: lastResizeMouseRef,
    saveCallbackRef: saveResizeRef,
    canvasRefByPanel,
    panels,
    minW: 220,
    minH: 64,
    onDraft: setResizeDraft,
    onCommit: () => {},
    onCancel: () => {
      setResizingState(null);
      setResizeDraft(null);
      resizeDraftRef.current = null;
      lastResizeMouseRef.current = null;
      resizeCaptureTargetRef.current = null;
      resizingElRef.current = null;
      isResizingRef.current = false;
    },
  });

  const panelHeight = getPanelHeight(panel);

  return (
    <>
      {systemBlocks.map((sb) => {
        const isResizingThis = resizingState?.panelId === panel.id && resizingState?.systemBlockId === sb.id;
        return (
          <SystemBlockItem
            key={sb.id}
            sb={sb}
            panelId={panel.id}
            panelHeight={panelHeight}
            isSelected={selectedSystemBlockId === sb.id}
            isResizingThis={isResizingThis}
            resizeDraft={isResizingThis ? resizeDraft : null}
            isResizingRef={isResizingRef}
            resizingElRef={resizingElRef}
            onDragPointerDown={dragSystemBlock.onPointerDown}
            onSelect={stableOnSelect}
            onResizeStart={stableOnResizeStart}
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
