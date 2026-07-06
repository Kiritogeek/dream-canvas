import { describe, it, expect } from "vitest";
import { buildSuggestAssetPrompt } from "./suggest-asset-prompt";

describe("buildSuggestAssetPrompt", () => {
  it("traduit le type technique en libellé français", () => {
    expect(buildSuggestAssetPrompt({ assetName: "Kael", assetType: "character" }))
      .toContain("TYPE D'ASSET : personnage");
    expect(buildSuggestAssetPrompt({ assetName: "Forêt", assetType: "background" }))
      .toContain("TYPE D'ASSET : décor");
    expect(buildSuggestAssetPrompt({ assetName: "Épée", assetType: "object" }))
      .toContain("TYPE D'ASSET : objet");
  });

  it("inclut toujours le nom et la consigne finale", () => {
    const p = buildSuggestAssetPrompt({ assetName: "Kael", assetType: "character" });
    expect(p).toContain("NOM : Kael");
    expect(p).toMatch(/Génère le prompt de génération d'image pour cet asset :$/);
  });

  it("n'ajoute les sections optionnelles que si non vides", () => {
    const bare = buildSuggestAssetPrompt({ assetName: "Kael", assetType: "character" });
    expect(bare).not.toContain("STYLE VISUEL");
    expect(bare).not.toContain("CONTEXTE / LORE");
    expect(bare).not.toContain("DESCRIPTION ACTUELLE");

    const full = buildSuggestAssetPrompt({
      assetName: "Kael",
      assetType: "character",
      styleDescription: "manga shōnen",
      lore: "Ancien garde royal",
      currentDescription: "cheveux noirs",
    });
    expect(full).toContain("STYLE VISUEL DU PROJET : manga shōnen");
    expect(full).toContain("CONTEXTE / LORE : Ancien garde royal");
    expect(full).toContain("DESCRIPTION ACTUELLE À ENRICHIR : cheveux noirs");
  });

  it("ignore les chaînes vides ou en espaces (trim)", () => {
    const p = buildSuggestAssetPrompt({
      assetName: "Kael",
      assetType: "character",
      styleDescription: "   ",
      lore: "",
    });
    expect(p).not.toContain("STYLE VISUEL");
    expect(p).not.toContain("CONTEXTE / LORE");
  });

  it("garde le type brut inconnu tel quel", () => {
    expect(buildSuggestAssetPrompt({ assetName: "X", assetType: "creature" }))
      .toContain("TYPE D'ASSET : creature");
  });
});
