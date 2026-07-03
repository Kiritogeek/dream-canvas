import { describe, it, expect } from "vitest";
import { buildSfxTextShadow, hexToRgba } from "@/components/chapter/sfxSystemStyle";
import { appendPromptKeywords } from "@/components/chapter/promptPresets";

describe("buildSfxTextShadow", () => {
  it("génère 16 ombres directionnelles pour le contour", () => {
    const shadow = buildSfxTextShadow({ strokeColor: "#000000", strokeWidth: 4 });
    expect(shadow.split(", ").length).toBe(16);
    expect(shadow).toContain("#000000");
  });

  it("retourne une chaîne vide sans contour ni lueur", () => {
    expect(buildSfxTextShadow({ strokeColor: "#000", strokeWidth: 0 })).toBe("");
  });

  it("ajoute 2 ombres de lueur quand glow actif", () => {
    const shadow = buildSfxTextShadow({ strokeColor: "#000", strokeWidth: 0, glowColor: "#f97316", glowBlur: 10 });
    const parts = shadow.split(", ");
    expect(parts.length).toBe(2);
    expect(parts[0]).toBe("0 0 10px #f97316");
    expect(parts[1]).toBe("0 0 20px #f97316");
  });

  it("combine contour et lueur", () => {
    const shadow = buildSfxTextShadow({ strokeColor: "#111", strokeWidth: 2, glowColor: "#fff", glowBlur: 6 });
    expect(shadow.split(", ").length).toBe(18);
  });
});

describe("hexToRgba", () => {
  it("convertit un hex 6 chiffres en rgba", () => {
    expect(hexToRgba("#22d3ee", 0.5)).toBe("rgba(34, 211, 238, 0.5)");
    expect(hexToRgba("#000000", 1)).toBe("rgba(0, 0, 0, 1)");
  });

  it("retourne la valeur brute si le format est inattendu", () => {
    expect(hexToRgba("red", 0.5)).toBe("red");
    expect(hexToRgba("#fff", 0.5)).toBe("#fff");
  });
});

describe("appendPromptKeywords", () => {
  it("remplit un prompt vide avec les keywords seuls", () => {
    expect(appendPromptKeywords("", "radial speed lines")).toBe("radial speed lines");
    expect(appendPromptKeywords("   ", "radial speed lines")).toBe("radial speed lines");
  });

  it("ajoute avec virgule sur un prompt existant", () => {
    expect(appendPromptKeywords("héros qui court", "motion blur")).toBe("héros qui court, motion blur");
  });

  it("n'ajoute pas de virgule après une ponctuation finale", () => {
    expect(appendPromptKeywords("héros qui court.", "motion blur")).toBe("héros qui court. motion blur");
  });

  it("ne duplique pas des keywords déjà présents (insensible à la casse)", () => {
    const prompt = "scène, Motion Blur";
    expect(appendPromptKeywords(prompt, "motion blur")).toBe(prompt);
  });
});
