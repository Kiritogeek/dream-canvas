import { describe, it, expect } from "vitest";
import {
  getPanelSfxBlocks,
  getPanelSystemBlocks,
  makeSfxBlockFromPreset,
  makeSystemBlock,
  insertVerticalBreathing,
  SFX_PRESETS,
  WEBTOON_CASE_PRESETS,
  NARRATIVE_COLOR_PRESETS,
  BREATHING_PRESETS,
  PANEL_HEIGHT_MAX,
} from "@/services/panels";
import { SYSTEM_BLOCK_VARIANT_CONFIG } from "@/types";
import type { Panel, PanelLayout, ColorBlock, SpeechBubble } from "@/types";

const panelWith = (layout: unknown): Panel => ({ layout } as unknown as Panel);

describe("getPanelSfxBlocks", () => {
  it("retourne [] pour un panel null ou sans layout", () => {
    expect(getPanelSfxBlocks(null)).toEqual([]);
    expect(getPanelSfxBlocks(undefined)).toEqual([]);
    expect(getPanelSfxBlocks(panelWith(null))).toEqual([]);
  });

  it("retourne [] quand sfxBlocks est absent ou malformé", () => {
    expect(getPanelSfxBlocks(panelWith({ blocks: [] }))).toEqual([]);
    expect(getPanelSfxBlocks(panelWith({ blocks: [], sfxBlocks: "oops" }))).toEqual([]);
  });

  it("retourne les blocs SFX du layout", () => {
    const sfx = [{ id: "s1", x: 0, y: 0, width: 100, height: 50, text: "BAM", fontFamily: "x", fontSize: 40, color: "#fff", strokeColor: "#000", strokeWidth: 4, rotation: 0 }];
    expect(getPanelSfxBlocks(panelWith({ blocks: [], sfxBlocks: sfx }))).toEqual(sfx);
  });
});

describe("getPanelSystemBlocks", () => {
  it("retourne [] pour un panel null ou un layout sans systemBlocks", () => {
    expect(getPanelSystemBlocks(null)).toEqual([]);
    expect(getPanelSystemBlocks(panelWith({ blocks: [] }))).toEqual([]);
  });

  it("retourne les fenêtres système du layout", () => {
    const sys = [{ id: "w1", x: 0, y: 0, width: 400, height: 200, variant: "quest", title: "QUÊTE", body: "x", accentColor: "#fbbf24" }];
    expect(getPanelSystemBlocks(panelWith({ blocks: [], systemBlocks: sys }))).toEqual(sys);
  });
});

describe("makeSfxBlockFromPreset", () => {
  it("applique le preset demandé avec position et zIndex", () => {
    const preset = SFX_PRESETS[1];
    const sfx = makeSfxBlockFromPreset(preset.id, 40, 80, 30);
    expect(sfx.text).toBe(preset.text);
    expect(sfx.fontFamily).toBe(preset.fontFamily);
    expect(sfx.color).toBe(preset.color);
    expect(sfx.x).toBe(40);
    expect(sfx.y).toBe(80);
    expect(sfx.zIndex).toBe(30);
    expect(sfx.id).toBeTruthy();
  });

  it("retombe sur le premier preset si l'id est inconnu", () => {
    const sfx = makeSfxBlockFromPreset("inexistant", 0, 0, 10);
    expect(sfx.text).toBe(SFX_PRESETS[0].text);
  });

  it("n'inclut la lueur que si le preset en a une", () => {
    const withGlow = SFX_PRESETS.find((p) => p.glowColor)!;
    const without = SFX_PRESETS.find((p) => !p.glowColor)!;
    expect(makeSfxBlockFromPreset(withGlow.id, 0, 0, 0).glowColor).toBe(withGlow.glowColor);
    expect(makeSfxBlockFromPreset(without.id, 0, 0, 0).glowColor).toBeUndefined();
  });

  it("génère des ids uniques", () => {
    const a = makeSfxBlockFromPreset(undefined, 0, 0, 0);
    const b = makeSfxBlockFromPreset(undefined, 0, 0, 0);
    expect(a.id).not.toBe(b.id);
  });
});

describe("makeSystemBlock", () => {
  it("initialise titre, accent et corps d'exemple selon la variante", () => {
    const block = makeSystemBlock("levelup", 10, 20, 40);
    expect(block.title).toBe(SYSTEM_BLOCK_VARIANT_CONFIG.levelup.defaultTitle);
    expect(block.accentColor).toBe(SYSTEM_BLOCK_VARIANT_CONFIG.levelup.accent);
    expect(block.body.length).toBeGreaterThan(0);
    expect(block.variant).toBe("levelup");
    expect(block.showIcon).toBe(true);
    expect(block.zIndex).toBe(40);
  });

  it("couvre les 5 variantes du config", () => {
    (Object.keys(SYSTEM_BLOCK_VARIANT_CONFIG) as Array<keyof typeof SYSTEM_BLOCK_VARIANT_CONFIG>).forEach((variant) => {
      const block = makeSystemBlock(variant, 0, 0, 0);
      expect(block.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(block.title.length).toBeGreaterThan(0);
    });
  });
});

describe("presets webtoon", () => {
  it("les hauteurs de cases suivent la grille 400px (+ letterbox)", () => {
    const heights = WEBTOON_CASE_PRESETS.map((p) => p.height);
    expect(heights).toContain(400);
    expect(heights).toContain(800);
    expect(heights).toContain(1200);
    expect(heights).toContain(1600);
    WEBTOON_CASE_PRESETS.forEach((p) => expect(p.width).toBe(800));
  });

  it("les fonds narratifs sont des hex valides", () => {
    NARRATIVE_COLOR_PRESETS.forEach((p) => expect(p.color).toMatch(/^#[0-9a-f]{6}$/i));
  });

  it("les respirations couvrent la gamme 120→700px en croissant", () => {
    const gaps = BREATHING_PRESETS.map((p) => p.gap);
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
    expect(gaps[0]).toBe(120);
    expect(gaps[gaps.length - 1]).toBe(700);
  });
});

describe("insertVerticalBreathing", () => {
  const layout: PanelLayout = {
    panelHeight: 5000,
    blocks: [
      { id: "b1", x: 0, y: 100, width: 800, height: 400, prompt: null },
      { id: "b2", x: 0, y: 1000, width: 800, height: 400, prompt: null },
    ],
    sfxBlocks: [{ id: "s1", x: 10, y: 1200, width: 300, height: 140, text: "BAM", fontFamily: "x", fontSize: 40, color: "#fff", strokeColor: "#000", strokeWidth: 4, rotation: 0 }],
    systemBlocks: [{ id: "w1", x: 0, y: 300, width: 400, height: 200, variant: "quest", title: "Q", body: "x", accentColor: "#fbbf24" }],
  };
  const colorBlocks: ColorBlock[] = [{ id: "c1", x: 0, y: 900, width: 800, height: 300, fill: { type: "solid", color: "#000000" } }];
  const speechBubbles: SpeechBubble[] = [
    { id: "sp1", type: "speech", text: "hey", position: { x: 10, y: 950 } },
    { id: "sp2", type: "speech", text: "ho", position: { x: 10, y: 200 } },
  ];

  it("décale uniquement les éléments dont le bord haut est sous la ligne", () => {
    const next = insertVerticalBreathing({ layout, colorBlocks, speechBubbles }, 800, 250);
    expect(next.layout.blocks.find((b) => b.id === "b1")!.y).toBe(100);
    expect(next.layout.blocks.find((b) => b.id === "b2")!.y).toBe(1250);
    expect(next.layout.sfxBlocks![0].y).toBe(1450);
    expect(next.layout.systemBlocks![0].y).toBe(300);
    expect(next.colorBlocks[0].y).toBe(1150);
    expect(next.speechBubbles.find((b) => b.id === "sp1")!.position.y).toBe(1200);
    expect(next.speechBubbles.find((b) => b.id === "sp2")!.position.y).toBe(200);
  });

  it("agrandit la hauteur du canvas du même écart, clampée au max", () => {
    const next = insertVerticalBreathing({ layout, colorBlocks, speechBubbles }, 800, 250);
    expect(next.layout.panelHeight).toBe(5250);
    const nearMax = insertVerticalBreathing({ layout: { ...layout, panelHeight: PANEL_HEIGHT_MAX - 100 }, colorBlocks, speechBubbles }, 800, 700);
    expect(nearMax.layout.panelHeight).toBe(PANEL_HEIGHT_MAX);
  });

  it("ne mute pas le snapshot d'entrée et gère un layout sans clés SFX/système", () => {
    const bare: PanelLayout = { blocks: [{ id: "b1", x: 0, y: 500, width: 800, height: 400, prompt: null }] };
    const next = insertVerticalBreathing({ layout: bare, colorBlocks: [], speechBubbles: [] }, 0, 120);
    expect(next.layout.blocks[0].y).toBe(620);
    expect(bare.blocks[0].y).toBe(500);
    expect(next.layout.sfxBlocks).toBeUndefined();
    expect(next.layout.systemBlocks).toBeUndefined();
  });
});
