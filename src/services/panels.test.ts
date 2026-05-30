import { describe, it, expect } from "vitest";
import type { Panel } from "@/types";
import {
  PANEL_HEIGHT_DEFAULT,
  PANEL_HEIGHT_MIN,
  PANEL_HEIGHT_MAX,
  getPanelBlocks,
  getPanelLayout,
  getPanelColorBlocks,
  getPanelSpeechBubbles,
  getPanelHeight,
  estimatePanelCount,
} from "@/services/panels";

function panel(extra?: Record<string, unknown>): Panel {
  return { id: "p1", layout: { blocks: [] }, speech_bubbles: [], color_blocks: [] as unknown, ...extra } as Panel;
}

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `mot${i}`).join(" ");
}

// ── getPanelBlocks ────────────────────────────────────────────────

describe("getPanelBlocks", () => {
  it("retourne [] pour null", () => expect(getPanelBlocks(null)).toEqual([]));
  it("retourne [] pour undefined", () => expect(getPanelBlocks(undefined)).toEqual([]));
  it("retourne [] si layout est null", () => expect(getPanelBlocks(panel({ layout: null }))).toEqual([]));
  it("retourne [] si layout est une string", () => expect(getPanelBlocks(panel({ layout: "invalid" }))).toEqual([]));
  it("retourne [] si layout.blocks est null", () => expect(getPanelBlocks(panel({ layout: { blocks: null } }))).toEqual([]));
  it("retourne [] si layout.blocks est absent", () => expect(getPanelBlocks(panel({ layout: {} }))).toEqual([]));
  it("retourne le tableau de blocs existant", () => {
    const block = { id: "b1", x: 0, y: 0, width: 100, height: 100, name: "B", prompt: null, image_url: null };
    expect(getPanelBlocks(panel({ layout: { blocks: [block] } }))).toEqual([block]);
  });
  it("préserve l'ordre des blocs", () => {
    const b1 = { id: "b1", x: 0, y: 0, width: 1, height: 1, name: "A", prompt: null, image_url: null };
    const b2 = { id: "b2", x: 10, y: 10, width: 1, height: 1, name: "B", prompt: null, image_url: null };
    expect(getPanelBlocks(panel({ layout: { blocks: [b1, b2] } }))).toEqual([b1, b2]);
  });
});

// ── getPanelLayout ────────────────────────────────────────────────

describe("getPanelLayout", () => {
  it("retourne { blocks: [] } pour null", () => expect(getPanelLayout(null)).toEqual({ blocks: [] }));
  it("retourne { blocks: [] } pour undefined", () => expect(getPanelLayout(undefined)).toEqual({ blocks: [] }));
  it("retourne { blocks: [] } si layout est null", () => expect(getPanelLayout(panel({ layout: null }))).toEqual({ blocks: [] }));
  it("retourne le layout complet si valide", () => {
    const layout = { blocks: [], panelHeight: 3000 };
    expect(getPanelLayout(panel({ layout }))).toEqual(layout);
  });
});

// ── getPanelColorBlocks ───────────────────────────────────────────

describe("getPanelColorBlocks", () => {
  it("retourne [] pour null", () => expect(getPanelColorBlocks(null)).toEqual([]));
  it("retourne [] pour undefined", () => expect(getPanelColorBlocks(undefined)).toEqual([]));
  it("retourne [] si color_blocks est null", () => expect(getPanelColorBlocks(panel({ color_blocks: null }))).toEqual([]));
  it("retourne [] si color_blocks est une string", () => expect(getPanelColorBlocks(panel({ color_blocks: "invalid" }))).toEqual([]));
  it("retourne [] si color_blocks est un objet non-tableau", () => expect(getPanelColorBlocks(panel({ color_blocks: {} }))).toEqual([]));
  it("retourne le tableau de blocs couleur", () => {
    const cb = { id: "c1", x: 0, y: 0, width: 100, height: 100, fill: { type: "solid", color: "#fff" } };
    expect(getPanelColorBlocks(panel({ color_blocks: [cb] }))).toEqual([cb]);
  });
});

// ── getPanelSpeechBubbles ─────────────────────────────────────────

describe("getPanelSpeechBubbles", () => {
  it("retourne [] pour null", () => expect(getPanelSpeechBubbles(null)).toEqual([]));
  it("retourne [] pour undefined", () => expect(getPanelSpeechBubbles(undefined)).toEqual([]));
  it("retourne [] si speech_bubbles est null", () => expect(getPanelSpeechBubbles(panel({ speech_bubbles: null }))).toEqual([]));
  it("retourne [] si speech_bubbles est un nombre", () => expect(getPanelSpeechBubbles(panel({ speech_bubbles: 42 }))).toEqual([]));
  it("retourne les bulles existantes", () => {
    const b = { id: "bub1", x: 5, y: 5, width: 200, height: 80, text: "Bonjour", style: "speech" };
    expect(getPanelSpeechBubbles(panel({ speech_bubbles: [b] }))).toEqual([b]);
  });
});

// ── getPanelHeight ────────────────────────────────────────────────

describe("getPanelHeight", () => {
  it("retourne PANEL_HEIGHT_DEFAULT pour null", () => expect(getPanelHeight(null)).toBe(PANEL_HEIGHT_DEFAULT));
  it("retourne PANEL_HEIGHT_DEFAULT pour undefined", () => expect(getPanelHeight(undefined)).toBe(PANEL_HEIGHT_DEFAULT));
  it("retourne PANEL_HEIGHT_DEFAULT si layout est null", () => expect(getPanelHeight(panel({ layout: null }))).toBe(PANEL_HEIGHT_DEFAULT));
  it("retourne PANEL_HEIGHT_DEFAULT si panelHeight absent", () => expect(getPanelHeight(panel({ layout: { blocks: [] } }))).toBe(PANEL_HEIGHT_DEFAULT));
  it("retourne la valeur si dans les bornes", () => expect(getPanelHeight(panel({ layout: { blocks: [], panelHeight: 3000 } }))).toBe(3000));
  it("clamp à PANEL_HEIGHT_MIN si trop petit", () => expect(getPanelHeight(panel({ layout: { blocks: [], panelHeight: 100 } }))).toBe(PANEL_HEIGHT_MIN));
  it("clamp à PANEL_HEIGHT_MAX si trop grand", () => expect(getPanelHeight(panel({ layout: { blocks: [], panelHeight: 200_000 } }))).toBe(PANEL_HEIGHT_MAX));
  it("accepte exactement PANEL_HEIGHT_MIN", () => expect(getPanelHeight(panel({ layout: { blocks: [], panelHeight: PANEL_HEIGHT_MIN } }))).toBe(PANEL_HEIGHT_MIN));
  it("accepte exactement PANEL_HEIGHT_MAX", () => expect(getPanelHeight(panel({ layout: { blocks: [], panelHeight: PANEL_HEIGHT_MAX } }))).toBe(PANEL_HEIGHT_MAX));
});

// ── estimatePanelCount ────────────────────────────────────────────

describe("estimatePanelCount", () => {
  it("retourne 0 pour null", () => expect(estimatePanelCount(null)).toBe(0));
  it("retourne 0 pour undefined", () => expect(estimatePanelCount(undefined)).toBe(0));
  it("retourne 0 pour chaîne vide", () => expect(estimatePanelCount("")).toBe(0));
  it("retourne 0 pour espaces seuls", () => expect(estimatePanelCount("   ")).toBe(0));
  it("retourne 0 sous le seuil de 30 mots", () => expect(estimatePanelCount(words(29))).toBe(0));
  it("retourne au moins 1 dès 30 mots", () => expect(estimatePanelCount(words(30))).toBe(1));
  it("estime ~1 case par 45 mots", () => expect(estimatePanelCount(words(450))).toBe(10));
  it("ne plafonne pas pour les longs textes", () => expect(estimatePanelCount(words(2000))).toBe(44));
  it("priorise targetPerChapter quand fourni", () => expect(estimatePanelCount(words(2000), 12)).toBe(12));
  it("ignore targetPerChapter <= 0 et retombe sur l'estimation par mots", () => expect(estimatePanelCount(words(450), 0)).toBe(10));
});
