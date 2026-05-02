import { useState, useRef } from "react";
import { Trash2 } from "lucide-react";
import type { Panel, ColorBlock, ColorBlockFill } from "@/types";
import { getPanelHeight, RESIZE_HANDLE_CORNER_PX, RESIZE_HANDLE_EDGE_PX } from "@/services/panels";
import { useDragBlock } from "@/hooks/useDragBlock";
import { useResizeBlock } from "@/hooks/useResizeBlock";
import type { ResizingState } from "@/hooks/useResizeBlock";

interface ColorBlockLayerProps {
  panel: Panel;
  panels: Panel[];
  colorBlocks: ColorBlock[];
  canvasRefByPanel: React.RefObject<Record<string, HTMLDivElement | null>>;
  zoomRef: React.RefObject<number>;
  selectedColorBlockId: string | null;
  onSelectColorBlock: (id: string | null) => void;
  onMoveCommit: (panelId: string, colorBlockId: string, x: number, y: number) => void;
  onResizeCommit: (panelId: string, colorBlockId: string, draft: { x: number; y: number; width: number; height: number }) => void;
  onDelete: (colorBlock: ColorBlock) => void;
  onColorChange: (colorBlock: ColorBlock, fill: ColorBlockFill) => void;
}

type ColorBlockResizingState = ResizingState & { colorBlockId: string };

export function ColorBlockLayer({
  panel,
  panels,
  colorBlocks,
  canvasRefByPanel,
  zoomRef,
  selectedColorBlockId,
  onSelectColorBlock,
  onMoveCommit,
  onResizeCommit,
  onDelete,
  onColorChange: _onColorChange,
}: ColorBlockLayerProps) {
  const ghostRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  const isResizingColorBlockRef = useRef(false);
  const resizingColorBlockElRef = useRef<HTMLDivElement | null>(null);
  const [resizingColorBlockState, setResizingColorBlockState] = useState<ColorBlockResizingState | null>(null);
  const [resizeColorBlockDraft, setResizeColorBlockDraft] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const resizeColorBlockDraftRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const saveResizeColorBlockRef = useRef<((draft: { x: number; y: number; width: number; height: number }) => void) | null>(null);
  const lastResizeColorBlockMouseRef = useRef<{ x: number; y: number } | null>(null);
  const resizeColorBlockCaptureTargetRef = useRef<HTMLElement | null>(null);

  const dragColorBlock = useDragBlock({
    canvasRefByPanel,
    ghostRefByPanel,
    isResizingRef: isResizingColorBlockRef,
    zoomRef,
    onCommit: onMoveCommit,
  });

  useResizeBlock({
    resizingState: resizingColorBlockState,
    captureTargetRef: resizeColorBlockCaptureTargetRef,
    elementRef: resizingColorBlockElRef,
    draftRef: resizeColorBlockDraftRef,
    lastMouseRef: lastResizeColorBlockMouseRef,
    saveCallbackRef: saveResizeColorBlockRef,
    canvasRefByPanel,
    panels,
    onDraft: setResizeColorBlockDraft,
    onCommit: () => {},
    onCancel: () => {
      setResizingColorBlockState(null);
      setResizeColorBlockDraft(null);
      resizeColorBlockDraftRef.current = null;
      lastResizeColorBlockMouseRef.current = null;
      resizeColorBlockCaptureTargetRef.current = null;
      resizingColorBlockElRef.current = null;
      isResizingColorBlockRef.current = false;
    },
  });

  return (
    <>
      {colorBlocks.map((cb) => {
        const isResizingThis = resizingColorBlockState?.panelId === panel.id && resizingColorBlockState?.colorBlockId === cb.id;
        const geom = isResizingThis && resizeColorBlockDraft
          ? { x: Math.round(resizeColorBlockDraft.x), y: Math.round(resizeColorBlockDraft.y), width: Math.round(resizeColorBlockDraft.width), height: Math.round(resizeColorBlockDraft.height) }
          : { x: Math.round(cb.x), y: Math.round(cb.y), width: Math.round(cb.width), height: Math.round(cb.height) };
        const isSelected = selectedColorBlockId === cb.id;
        const bgStyle = cb.fill.type === "solid"
          ? { backgroundColor: cb.fill.color }
          : { background: `linear-gradient(${cb.fill.angle ?? 90}deg, ${cb.fill.from}, ${cb.fill.to})` };
        return (
          <div
            key={cb.id}
            ref={isResizingThis ? (el) => { if (el) resizingColorBlockElRef.current = el; } : undefined}
            className={`group absolute overflow-visible border shadow-sm transition-[box-shadow,outline,outline-offset,filter,ring] duration-150 cursor-grab active:cursor-grabbing ${isSelected ? "border-transparent brightness-[1.02]" : "border-border/80 ring-1 ring-inset ring-black/25 dark:ring-white/25 hover:ring-[3px] hover:ring-primary/55"}`}
            style={{
              left: geom.x,
              top: geom.y,
              width: geom.width,
              height: geom.height,
              ...bgStyle,
              zIndex: isSelected ? 50 : 0,
              ...(isSelected
                ? {
                    outline: "4px solid hsl(var(--primary))",
                    outlineOffset: "-4px",
                  }
                : {}),
            }}
            onPointerDown={!isResizingThis && !isResizingColorBlockRef.current ? (e) => {
              const ghost = ghostRefByPanel.current[panel.id];
              if (ghost) {
                if (cb.fill.type === "solid") {
                  ghost.style.backgroundColor = cb.fill.color;
                  ghost.style.background = "";
                } else {
                  ghost.style.background = `linear-gradient(${cb.fill.angle ?? 90}deg, ${cb.fill.from}, ${cb.fill.to})`;
                  ghost.style.backgroundColor = "";
                }
              }
              dragColorBlock.onPointerDown(e, panel.id, cb.id, cb.x, cb.y, cb.width, cb.height, getPanelHeight(panel));
            } : undefined}
            onClick={(e) => { e.stopPropagation(); onSelectColorBlock(cb.id); }}
          >
            <>
              <button
                type="button"
                className="absolute bottom-[25%] left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-md bg-destructive/90 text-destructive-foreground opacity-0 shadow-md transition-opacity hover:bg-destructive group-hover:opacity-100"
                title="Supprimer le bloc de couleur"
                onPointerDown={(ev) => ev.stopPropagation()}
                onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); onDelete(cb); }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
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
                    onPointerDown={(ev) => {
                      if (ev.button !== 0) return;
                      ev.preventDefault();
                      ev.stopPropagation();
                      isResizingColorBlockRef.current = true;
                      resizeColorBlockCaptureTargetRef.current = ev.currentTarget as HTMLElement;
                      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
                      setResizingColorBlockState({ panelId: panel.id, colorBlockId: cb.id, edge, start: { x: cb.x, y: cb.y, w: cb.width, h: cb.height }, startMouse: { x: ev.clientX, y: ev.clientY } });
                      setResizeColorBlockDraft({ x: cb.x, y: cb.y, width: cb.width, height: cb.height });
                      resizeColorBlockDraftRef.current = { x: cb.x, y: cb.y, width: cb.width, height: cb.height };
                      saveResizeColorBlockRef.current = (draft) => {
                        const roundedDraft = {
                          x: Math.round(draft.x), y: Math.round(draft.y),
                          width: Math.round(draft.width), height: Math.round(draft.height)
                        };
                        setResizingColorBlockState(null);
                        setResizeColorBlockDraft(null);
                        resizeColorBlockDraftRef.current = null;
                        lastResizeColorBlockMouseRef.current = null;
                        resizeColorBlockCaptureTargetRef.current = null;
                        resizingColorBlockElRef.current = null;
                        isResizingColorBlockRef.current = false;
                        onResizeCommit(panel.id, cb.id, roundedDraft);
                      };
                    }}
                    aria-label="Redimensionner"
                  />
              ))}
            </>
          </div>
        );
      })}
      {/* Ghost de drag pour blocs de couleur : position mis à jour uniquement en JS (temps réel, aucun re-render) */}
      <div
        ref={(el) => { if (el) ghostRefByPanel.current[panel.id] = el; }}
        aria-hidden
        className="pointer-events-none absolute z-50 rounded-lg border-2 border-primary shadow-lg box-border"
        style={{ display: "none", left: 0, top: 0, width: 0, height: 0 }}
      />
    </>
  );
}
