import {
  getPanelLayout,
  getPanelSpeechBubbles,
  getPanelColorBlocks,
} from "@/services/panels";
import type { Panel, PanelLayout, SpeechBubble, ColorBlock } from "@/types";

export type PanelCanvasSnapshot = {
  layout: PanelLayout;
  speech_bubbles: SpeechBubble[];
  color_blocks: ColorBlock[];
};

export const MAX_PANEL_CANVAS_UNDO = 50;

export type PanelCanvasUndoEntry = {
  past: PanelCanvasSnapshot[];
  future: PanelCanvasSnapshot[];
};

export function snapshotPanelCanvas(panel: Panel): PanelCanvasSnapshot {
  return {
    layout: structuredClone(getPanelLayout(panel)),
    speech_bubbles: structuredClone(getPanelSpeechBubbles(panel)),
    color_blocks: structuredClone(getPanelColorBlocks(panel)),
  };
}

export function getOrCreateUndoEntry(
  stacks: Map<string, PanelCanvasUndoEntry>,
  panelId: string,
): PanelCanvasUndoEntry {
  let e = stacks.get(panelId);
  if (!e) {
    e = { past: [], future: [] };
    stacks.set(panelId, e);
  }
  return e;
}

/** Enregistre l'état courant avant une mutation utilisateur ; vide la pile « redo ». */
export function pushCanvasUndoSnapshot(
  stacks: Map<string, PanelCanvasUndoEntry>,
  panelId: string,
  panelNow: Panel,
): void {
  const entry = getOrCreateUndoEntry(stacks, panelId);
  entry.past.push(snapshotPanelCanvas(panelNow));
  while (entry.past.length > MAX_PANEL_CANVAS_UNDO) {
    entry.past.shift();
  }
  entry.future = [];
}
