import { useState, useRef, useCallback, memo } from "react";
import { Plus, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import type { Panel, PanelBlock } from "@/types";
import { getPanelHeight, RESIZE_HANDLE_CORNER_PX, RESIZE_HANDLE_EDGE_PX } from "@/services/panels";
import { useDragBlock } from "@/hooks/useDragBlock";
import type { DragHandlers } from "@/hooks/useDragBlock";
import { useResizeBlock } from "@/hooks/useResizeBlock";
import type { ResizingState } from "@/hooks/useResizeBlock";

interface ImageBlockLayerProps {
  panel: Panel;
  panels: Panel[];
  blocks: PanelBlock[];
  canvasRefByPanel: React.RefObject<Record<string, HTMLDivElement | null>>;
  zoomRef: React.RefObject<number>;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onMoveCommit: (panelId: string, blockId: string, x: number, y: number) => void;
  onResizeCommit: (panelId: string, blockId: string, draft: { x: number; y: number; width: number; height: number }) => void;
  onDelete: (block: PanelBlock) => void;
  onAddBlock: (x?: number, y?: number) => void;
  isUpdating: boolean;
  generatingBlockId?: string | null;
}

type ImageBlockResizingState = ResizingState & { blockId: string };

interface ImageBlockItemProps {
  block: PanelBlock;
  panelId: string;
  panelHeight: number;
  isSelected: boolean;
  isGenerating: boolean;
  isResizingThis: boolean;
  resizeDraft: { x: number; y: number; width: number; height: number } | null;
  isResizingRef: React.RefObject<boolean>;
  resizingBlockElRef: React.RefObject<HTMLDivElement | null>;
  onDragPointerDown: DragHandlers["onPointerDown"];
  onSelect: (id: string | null) => void;
  onResizeStart: (ev: React.PointerEvent<HTMLElement>, block: PanelBlock, edge: ResizingState["edge"]) => void;
  blockIndex: number;
}

const ImageBlockItem = memo(function ImageBlockItem({
  block,
  panelId,
  panelHeight,
  isSelected,
  isGenerating,
  isResizingThis,
  resizeDraft,
  isResizingRef,
  resizingBlockElRef,
  onDragPointerDown,
  onSelect,
  onResizeStart,
  blockIndex,
}: ImageBlockItemProps) {
  const useResizeDraftHere = isResizingThis && resizeDraft != null && isResizingRef.current;
  const rawGeom = useResizeDraftHere ? resizeDraft : { x: block.x, y: block.y, width: block.width, height: block.height };
  const geom = { x: Math.round(rawGeom.x), y: Math.round(rawGeom.y), width: Math.round(rawGeom.width), height: Math.round(rawGeom.height) };

  return (
    <div
      ref={isResizingThis ? (el) => { if (el) resizingBlockElRef.current = el; } : undefined}
      draggable={false}
      onPointerDown={!isResizingThis ? (e) => onDragPointerDown(e, panelId, block.id, block.x, block.y, block.width, block.height, panelHeight) : undefined}
      onClick={(e) => { e.stopPropagation(); onSelect(block.id); }}
      className={`group absolute overflow-visible bg-black border shadow-sm transition-[box-shadow,filter,ring] duration-150 cursor-grab active:cursor-grabbing ${isSelected ? "border-transparent brightness-[1.02]" : "border-border/80 ring-1 ring-inset ring-black/25 dark:ring-white/25 hover:ring-[3px] hover:ring-primary/55"}`}
      style={{
        left: geom.x,
        top: geom.y,
        width: geom.width,
        height: geom.height,
        zIndex: isSelected ? 99999 : (block.zIndex ?? 0) + 1000,
        ...(block.hidden ? { opacity: 0, pointerEvents: "none" } : {}),
      }}
      title={block.name ?? `Case ${blockIndex + 1}`}
    >
      <div className="w-full h-full overflow-hidden pointer-events-none">
        {block.image_url ? (
          <ImageWithFallback src={block.image_url} alt="" className="w-full h-full object-fill" />
        ) : (
          <div className="w-full h-full bg-muted/50 relative">
            <div className="absolute top-1.5 right-1.5 text-[10px] text-muted-foreground/40 tabular-nums">
              {Math.round(geom.width)} × {Math.round(geom.height)}
            </div>
          </div>
        )}
      </div>
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
          onPointerDown={(e) => onResizeStart(e, block, edge)}
          aria-label="Redimensionner"
        />
      ))}
      {isSelected && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[25] transition-[box-shadow] duration-150"
          style={{ boxShadow: "inset 0 0 0 4px hsl(var(--primary))" }}
        />
      )}
      {isGenerating && (
        <div className="pointer-events-none absolute inset-0 z-[35] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-10 h-10">
              <svg className="animate-spin absolute inset-0" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="16" stroke={`url(#dw-spin-grad-${block.id})`} strokeWidth="3" strokeLinecap="round" strokeDasharray="60 40" />
                <defs>
                  <linearGradient id={`dw-spin-grad-${block.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--primary) / 0.2)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" fill="hsl(var(--primary))" strokeWidth="0" />
                </svg>
              </div>
            </div>
            <span className="text-[11px] font-medium text-primary/80 tracking-wide">Génération…</span>
          </div>
        </div>
      )}
    </div>
  );
});

export function ImageBlockLayer({
  panel,
  panels,
  blocks,
  canvasRefByPanel,
  zoomRef,
  selectedBlockId,
  onSelectBlock,
  onMoveCommit,
  onResizeCommit,
  onDelete: _onDelete,
  onAddBlock,
  isUpdating,
  generatingBlockId,
}: ImageBlockLayerProps) {
  const ghostRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  const isResizingRef = useRef(false);
  const resizingBlockElRef = useRef<HTMLDivElement | null>(null);
  const [resizingState, setResizingState] = useState<ImageBlockResizingState | null>(null);
  const [resizeDraft, setResizeDraft] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const resizeDraftRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const saveResizeRef = useRef<((draft: { x: number; y: number; width: number; height: number }) => void) | null>(null);
  const lastResizeMouseRef = useRef<{ x: number; y: number } | null>(null);
  const resizeCaptureTargetRef = useRef<HTMLElement | null>(null);

  // Stable wrappers — keep refs current without recreating callbacks
  const onSelectBlockRef = useRef(onSelectBlock);
  onSelectBlockRef.current = onSelectBlock;
  const stableOnSelect = useCallback((id: string | null) => onSelectBlockRef.current(id), []);

  const onMoveCommitRef = useRef(onMoveCommit);
  onMoveCommitRef.current = onMoveCommit;
  const stableOnMoveCommit = useCallback((panelId: string, blockId: string, x: number, y: number) => {
    onMoveCommitRef.current(panelId, blockId, x, y);
  }, []);

  const onResizeCommitRef = useRef(onResizeCommit);
  onResizeCommitRef.current = onResizeCommit;

  const stableOnResizeStart = useCallback((ev: React.PointerEvent<HTMLElement>, block: PanelBlock, edge: ResizingState["edge"]) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    isResizingRef.current = true;
    resizeCaptureTargetRef.current = ev.currentTarget;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    setResizingState({ panelId: panel.id, blockId: block.id, edge, start: { x: block.x, y: block.y, w: block.width, h: block.height }, startMouse: { x: ev.clientX, y: ev.clientY } });
    const initial = { x: block.x, y: block.y, width: block.width, height: block.height };
    setResizeDraft(initial);
    resizeDraftRef.current = initial;
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
      resizingBlockElRef.current = null;
      isResizingRef.current = false;
      onResizeCommitRef.current(panel.id, block.id, roundedDraft);
    };
  }, [panel.id]);

  const dragImageBlock = useDragBlock({
    canvasRefByPanel,
    ghostRefByPanel,
    isResizingRef,
    zoomRef,
    onCommit: stableOnMoveCommit,
  });

  useResizeBlock({
    resizingState,
    captureTargetRef: resizeCaptureTargetRef,
    elementRef: resizingBlockElRef,
    draftRef: resizeDraftRef,
    lastMouseRef: lastResizeMouseRef,
    saveCallbackRef: saveResizeRef,
    canvasRefByPanel,
    panels,
    onDraft: setResizeDraft,
    onCommit: () => {},
    onCancel: () => {
      resizingBlockElRef.current = null;
      setResizingState(null);
      setResizeDraft(null);
      resizeDraftRef.current = null;
      lastResizeMouseRef.current = null;
      resizeCaptureTargetRef.current = null;
      isResizingRef.current = false;
    },
  });

  const panelHeight = getPanelHeight(panel);

  return (
    <>
      {blocks.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 text-center p-6 text-muted-foreground text-sm pointer-events-auto">
            <Square className="h-10 w-10 opacity-50" />
            <p>Aucun bloc. Glissez un bloc depuis la bibliothèque (gauche) ou ajoutez un premier bloc.</p>
            <Button size="sm" variant="outline" onClick={() => onAddBlock()} disabled={isUpdating}>
              <Plus className="h-4 w-4 mr-1.5" /> Ajouter un bloc
            </Button>
          </div>
        </div>
      ) : (
        blocks.map((block, blockIndex) => {
          const isThisResizing = resizingState?.panelId === panel.id && resizingState?.blockId === block.id;
          return (
            <ImageBlockItem
              key={block.id}
              block={block}
              panelId={panel.id}
              panelHeight={panelHeight}
              isSelected={selectedBlockId === block.id}
              isGenerating={generatingBlockId === block.id}
              isResizingThis={isThisResizing}
              resizeDraft={isThisResizing ? resizeDraft : null}
              isResizingRef={isResizingRef}
              resizingBlockElRef={resizingBlockElRef}
              onDragPointerDown={dragImageBlock.onPointerDown}
              onSelect={stableOnSelect}
              onResizeStart={stableOnResizeStart}
              blockIndex={blockIndex}
            />
          );
        })
      )}
      {/* Ghost de drag : position mis à jour uniquement en JS (temps réel, aucun re-render) */}
      <div
        ref={(el) => { if (el) ghostRefByPanel.current[panel.id] = el; }}
        aria-hidden
        className="pointer-events-none absolute rounded-lg border-2 border-primary bg-background/95 shadow-lg box-border"
        style={{ display: "none", left: 0, top: 0, width: 0, height: 0, zIndex: 99999 }}
      />
    </>
  );
}
