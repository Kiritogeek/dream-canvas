import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  getPanelLayout,
  getPanelHeight,
  getPanelColorBlocks,
  getPanelSpeechBubbles,
  getPanelBlocks,
  DEFAULT_BLOCK_WIDTH,
  DEFAULT_BLOCK_HEIGHT,
  DEFAULT_COLOR_BLOCK_FILL,
} from "@/services/panels";
import { DEFAULT_SPEECH_BUBBLE_WIDTH, DEFAULT_SPEECH_BUBBLE_HEIGHT } from "@/types";
import type { Panel, PanelBlock, ColorBlock, SpeechBubble } from "@/types";
import type { Json } from "@/integrations/supabase/types";

type CanvasElementDeleteIntent =
  | { panelId: string; kind: "image"; blockId: string }
  | { panelId: string; kind: "color"; colorBlockId: string }
  | { panelId: string; kind: "bubble"; bubbleId: string };

interface UseKeyboardShortcutsParams {
  expandedPanelId: string | null;
  panels: Panel[];
  selectedBlockIdInModal: { panelId: string; blockId: string } | null;
  selectedColorBlockIdInModal: { panelId: string; colorBlockId: string } | null;
  selectedSpeechBubbleIdInModal: { panelId: string; bubbleId: string } | null;
  canvasRefByPanel: React.RefObject<Record<string, HTMLDivElement | null>>;
  panelEditorCanvasScrollRef: React.RefObject<HTMLDivElement | null>;
  updatePanelMutation: UseMutationResult<unknown, Error, { id: string; updates: Record<string, Json> }, unknown>;
  undoPanelCanvas: (panelId: string) => boolean;
  redoPanelCanvas: (panelId: string) => boolean;
  recordCanvasUndoBeforeChange: (panelId: string) => void;
  setSelectedBlockIdInModal: (v: { panelId: string; blockId: string } | null) => void;
  setSelectedColorBlockIdInModal: (v: { panelId: string; colorBlockId: string } | null) => void;
  setSelectedSpeechBubbleIdInModal: (v: { panelId: string; bubbleId: string } | null) => void;
  setCanvasDeleteIntent: (v: CanvasElementDeleteIntent | null) => void;
  PANEL_WIDTH: number;
  canvasPlacementFromViewportCenter: (
    canvasEl: HTMLDivElement | null,
    scrollEl: HTMLDivElement | null,
    panelWidth: number,
    panelLogicalHeight: number,
    itemWidth: number,
    itemHeight: number,
  ) => { x: number; y: number };
}

export function useKeyboardShortcuts({
  expandedPanelId,
  panels,
  selectedBlockIdInModal,
  selectedColorBlockIdInModal,
  selectedSpeechBubbleIdInModal,
  canvasRefByPanel,
  panelEditorCanvasScrollRef,
  updatePanelMutation,
  undoPanelCanvas,
  redoPanelCanvas,
  recordCanvasUndoBeforeChange,
  setSelectedBlockIdInModal,
  setSelectedColorBlockIdInModal,
  setSelectedSpeechBubbleIdInModal,
  setCanvasDeleteIntent,
  PANEL_WIDTH,
  canvasPlacementFromViewportCenter,
}: UseKeyboardShortcutsParams) {
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
      if (!expandedPanelId) return;

      const panel = panels.find((p) => p.id === expandedPanelId);
      if (!panel) return;
      const layout = getPanelLayout(panel);
      const panelH = getPanelHeight(panel);

      if (e.key === "Escape") {
        setSelectedBlockIdInModal(null);
        setSelectedColorBlockIdInModal(null);
        setSelectedSpeechBubbleIdInModal(null);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "z" && !e.altKey) {
        e.preventDefault();
        if (e.shiftKey) redoPanelCanvas(expandedPanelId);
        else undoPanelCanvas(expandedPanelId);
        return;
      }

      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        const w = DEFAULT_BLOCK_WIDTH;
        const h = DEFAULT_BLOCK_HEIGHT;
        const { x, y } = canvasPlacementFromViewportCenter(
          canvasRefByPanel.current[panel.id] ?? null,
          panelEditorCanvasScrollRef.current,
          PANEL_WIDTH,
          panelH,
          w,
          h,
        );
        const newBlock: PanelBlock = {
          id: crypto.randomUUID(),
          x, y, width: w, height: h,
          name: `Case ${layout.blocks.length + 1}`,
          prompt: null, image_url: null,
        };
        recordCanvasUndoBeforeChange(panel.id);
        updatePanelMutation.mutate(
          { id: panel.id, updates: { layout: { ...layout, blocks: [...layout.blocks, newBlock] } as unknown as Json } },
          {
            onSuccess: () => {
              setSelectedBlockIdInModal({ panelId: panel.id, blockId: newBlock.id });
              toast({ title: "Case ajoutée", description: "Raccourci B" });
            },
            onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
          }
        );
        return;
      }

      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        const w = 300,
          h = 300;
        const { x, y } = canvasPlacementFromViewportCenter(
          canvasRefByPanel.current[panel.id] ?? null,
          panelEditorCanvasScrollRef.current,
          PANEL_WIDTH,
          panelH,
          w,
          h,
        );
        const colorBlocks = getPanelColorBlocks(panel);
        const newCb: ColorBlock = {
          id: crypto.randomUUID(),
          x, y, width: w, height: h,
          fill: { ...DEFAULT_COLOR_BLOCK_FILL },
        };
        recordCanvasUndoBeforeChange(panel.id);
        updatePanelMutation.mutate(
          { id: panel.id, updates: { color_blocks: [...colorBlocks, newCb] as unknown as Json } },
          {
            onSuccess: () => {
              setSelectedColorBlockIdInModal({ panelId: panel.id, colorBlockId: newCb.id });
              toast({ title: "Bloc couleur ajouté", description: "Raccourci C" });
            },
            onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
          }
        );
        return;
      }

      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        const w = DEFAULT_SPEECH_BUBBLE_WIDTH;
        const h = DEFAULT_SPEECH_BUBBLE_HEIGHT;
        const { x, y } = canvasPlacementFromViewportCenter(
          canvasRefByPanel.current[panel.id] ?? null,
          panelEditorCanvasScrollRef.current,
          PANEL_WIDTH,
          panelH,
          w,
          h,
        );
        const bubbles = getPanelSpeechBubbles(panel);
        const newBubble: SpeechBubble = {
          id: crypto.randomUUID(),
          type: "text",
          text: "",
          position: { x, y },
          width: w,
          height: h,
          style: {},
        };
        recordCanvasUndoBeforeChange(panel.id);
        updatePanelMutation.mutate(
          { id: panel.id, updates: { speech_bubbles: [...bubbles, newBubble] as unknown as Json } },
          {
            onSuccess: () => {
              setSelectedSpeechBubbleIdInModal({ panelId: panel.id, bubbleId: newBubble.id });
              toast({ title: "Bulle ajoutée", description: "Raccourci D" });
            },
            onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
          }
        );
        return;
      }

      if (e.key !== "Delete" && e.key !== "Backspace") return;

      if (selectedBlockIdInModal?.panelId === expandedPanelId && selectedBlockIdInModal.blockId) {
        const blocks = getPanelBlocks(panel);
        const block = blocks.find((b) => b.id === selectedBlockIdInModal.blockId);
        if (block) {
          e.preventDefault();
          setCanvasDeleteIntent({ panelId: panel.id, kind: "image", blockId: block.id });
        }
      } else if (selectedColorBlockIdInModal?.panelId === expandedPanelId && selectedColorBlockIdInModal.colorBlockId) {
        const colorBlocks = getPanelColorBlocks(panel);
        const cb = colorBlocks.find((c) => c.id === selectedColorBlockIdInModal.colorBlockId);
        if (cb) {
          e.preventDefault();
          setCanvasDeleteIntent({ panelId: panel.id, kind: "color", colorBlockId: cb.id });
        }
      } else if (selectedSpeechBubbleIdInModal?.panelId === expandedPanelId && selectedSpeechBubbleIdInModal.bubbleId) {
        const speechBubbles = getPanelSpeechBubbles(panel);
        const bubble = speechBubbles.find((b) => b.id === selectedSpeechBubbleIdInModal.bubbleId);
        if (bubble) {
          e.preventDefault();
          setCanvasDeleteIntent({ panelId: panel.id, kind: "bubble", bubbleId: bubble.id });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    expandedPanelId,
    selectedBlockIdInModal,
    selectedColorBlockIdInModal,
    selectedSpeechBubbleIdInModal,
    panels,
    updatePanelMutation,
    toast,
    undoPanelCanvas,
    redoPanelCanvas,
    recordCanvasUndoBeforeChange,
    canvasRefByPanel,
    panelEditorCanvasScrollRef,
    setSelectedBlockIdInModal,
    setSelectedColorBlockIdInModal,
    setSelectedSpeechBubbleIdInModal,
    setCanvasDeleteIntent,
    PANEL_WIDTH,
    canvasPlacementFromViewportCenter,
  ]);
}
