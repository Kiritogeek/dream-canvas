import { describe, it, expect } from "vitest";
import {
  getPanelSfxBlocks,
  getPanelSystemBlocks,
  makeSfxBlockFromPreset,
  makeSystemBlock,
  SFX_PRESETS,
  WEBTOON_CASE_PRESETS,
  NARRATIVE_COLOR_PRESETS,
} from "@/services/panels";
import { SYSTEM_BLOCK_VARIANT_CONFIG } from "@/types";
import type { Panel } from "@/types";

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
});
