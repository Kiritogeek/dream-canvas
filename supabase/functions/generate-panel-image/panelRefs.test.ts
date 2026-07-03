import { describe, it, expect } from "vitest";
import { buildReferencePlan, buildAnatomyHint } from "./panelRefs";

describe("buildReferencePlan", () => {
  it("privilégie block_assets (paires alignées) quand présent", () => {
    const plan = buildReferencePlan({
      blockAssets: [
        { name: "Kael", url: "https://x/kael.png" },
        { name: "Mira", url: "https://x/mira.png" },
        { name: "Sans image" },
      ],
      blockAssetNames: ["ignoré"],
      blockAssetImageUrls: ["https://x/ignore.png"],
      styleImageUrls: [],
      previousImageUrl: null,
      maxRefs: 5,
    });
    expect(plan.identityPairs).toEqual([
      { name: "Kael", url: "https://x/kael.png" },
      { name: "Mira", url: "https://x/mira.png" },
    ]);
    expect(plan.textOnlyAssetNames).toEqual(["Sans image"]);
    expect(plan.imageUrls).toEqual(["https://x/kael.png", "https://x/mira.png"]);
  });

  it("rétrocompat : apparie names et urls par index", () => {
    const plan = buildReferencePlan({
      blockAssetNames: ["Kael", "Mira", "Orphelin"],
      blockAssetImageUrls: ["https://x/kael.png", "https://x/mira.png"],
      styleImageUrls: [],
      previousImageUrl: null,
      maxRefs: 5,
    });
    expect(plan.identityPairs.map((p) => p.name)).toEqual(["Kael", "Mira"]);
    expect(plan.textOnlyAssetNames).toEqual(["Orphelin"]);
  });

  it("réserve le slot continuité et tronque les paires ensemble", () => {
    const pairs = Array.from({ length: 6 }, (_, i) => ({ name: `A${i}`, url: `https://x/${i}.png` }));
    const plan = buildReferencePlan({
      blockAssets: pairs,
      styleImageUrls: ["https://x/style.png"],
      previousImageUrl: "https://x/prev.png",
      maxRefs: 5,
    });
    expect(plan.identityPairs.length).toBe(4);
    expect(plan.textOnlyAssetNames).toEqual(["A4", "A5"]);
    expect(plan.styleRefsUsed).toEqual([]);
    expect(plan.imageUrls[plan.imageUrls.length - 1]).toBe("https://x/prev.png");
    expect(plan.imageUrls.length).toBe(5);
  });

  it("plafonne le style à 2 images même avec du budget libre", () => {
    const plan = buildReferencePlan({
      blockAssets: [],
      styleImageUrls: ["https://x/s1.png", "https://x/s2.png", "https://x/s3.png"],
      previousImageUrl: null,
      maxRefs: 5,
    });
    expect(plan.styleRefsUsed).toEqual(["https://x/s1.png", "https://x/s2.png"]);
    expect(plan.imageUrls).toEqual(["https://x/s1.png", "https://x/s2.png"]);
  });
});

describe("buildAnatomyHint", () => {
  it("plans larges : mains et pieds", () => {
    expect(buildAnatomyHint("long_shot")).toContain("hands and feet");
    expect(buildAnatomyHint("wide shot")).toContain("hands and feet");
  });

  it("close-ups : anatomie faciale", () => {
    expect(buildAnatomyHint("extreme_close_up")).toContain("facial");
  });

  it("scènes sans personnage proche : aucun hint", () => {
    expect(buildAnatomyHint(undefined, "establishing")).toBe("");
    expect(buildAnatomyHint("", "revelation_system")).toBe("");
  });

  it("inférence depuis scene_type quand shot_type absent, sinon défaut", () => {
    expect(buildAnatomyHint(undefined, "action_melee")).toContain("hands and feet");
    expect(buildAnatomyHint(undefined, "dialogue")).toContain("facial");
    expect(buildAnatomyHint(undefined, "action_impact")).toContain("well-formed hands");
  });
});
