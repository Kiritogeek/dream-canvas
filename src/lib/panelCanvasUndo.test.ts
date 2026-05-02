import { describe, it, expect, beforeEach } from "vitest";
import type { Panel } from "@/types";
import {
  MAX_PANEL_CANVAS_UNDO,
  getOrCreateUndoEntry,
  pushCanvasUndoSnapshot,
  snapshotPanelCanvas,
} from "@/lib/panelCanvasUndo";

/** Panel minimal pour tests (colonnes ignorées si absentes). */
function minimalPanel(extra?: Partial<Panel>): Panel {
  return {
    id: "test-panel-id",
    layout: { blocks: [] },
    speech_bubbles: [],
    color_blocks: [],
    ...extra,
  } as Panel;
}

describe("panelCanvasUndo", () => {
  let stacks: Map<string, import("@/lib/panelCanvasUndo").PanelCanvasUndoEntry>;

  beforeEach(() => {
    stacks = new Map();
  });

  it("getOrCreateUndoEntry crée puis réutilise une entrée par panelId", () => {
    const a = getOrCreateUndoEntry(stacks, "p1");
    expect(a.past).toHaveLength(0);
    expect(a.future).toHaveLength(0);
    expect(getOrCreateUndoEntry(stacks, "p1")).toBe(a);

    const b = getOrCreateUndoEntry(stacks, "p2");
    expect(b).not.toBe(a);
    expect(stacks.size).toBe(2);
  });

  it("pushCanvasUndoSnapshot ajoute un snapshot et vide future", () => {
    const panel = minimalPanel();
    const entry = getOrCreateUndoEntry(stacks, "p1");
    entry.future.push(snapshotPanelCanvas(panel));

    pushCanvasUndoSnapshot(stacks, "p1", panel);

    expect(entry.future).toHaveLength(0);
    expect(entry.past).toHaveLength(1);
    expect(entry.past[0].layout.blocks).toEqual([]);
  });

  it("pile past limitée à MAX_PANEL_CANVAS_UNDO entrées", () => {
    const panel = minimalPanel();
    const entry = getOrCreateUndoEntry(stacks, "p1");

    for (let i = 0; i < MAX_PANEL_CANVAS_UNDO + 7; i += 1) {
      pushCanvasUndoSnapshot(stacks, "p1", panel);
    }

    expect(entry.past.length).toBe(MAX_PANEL_CANVAS_UNDO);
  });

  it("snapshotPanelCanvas produit une copie du layout modifiable sans muter la source", () => {
    const panel = minimalPanel({
      layout: {
        blocks: [
          {
            id: "b1",
            x: 1,
            y: 2,
            width: 3,
            height: 4,
            name: "x",
            prompt: null,
            image_url: null,
          },
        ],
      },
    });

    const snap = snapshotPanelCanvas(panel);
    expect(snap.layout.blocks).toHaveLength(1);

    snap.layout.blocks[0].x = 999;

    const src = panel.layout as { blocks: { x: number }[] };
    expect(src.blocks[0].x).toBe(1);
  });
});
