import { describe, it, expect } from "vitest";
import { parseProjectMeta, buildProjectDescription, stripProjectMetaTags } from "@/lib/projectMeta";

describe("parseProjectMeta", () => {
  it("extrait genre, tonalité et synopsis d'une description taguée", () => {
    expect(parseProjectMeta("[Tags: Fantasy][Tone: Épique] Billy part à l'aventure")).toEqual({
      genre: "Fantasy",
      tone: "Épique",
      synopsis: "Billy part à l'aventure",
    });
  });

  it("gère l'absence de tags (tout est synopsis)", () => {
    expect(parseProjectMeta("Un simple pitch")).toEqual({ genre: "", tone: "", synopsis: "Un simple pitch" });
  });

  it("gère genre seul, tonalité seule, et description vide/null", () => {
    expect(parseProjectMeta("[Tags: Action] Boom")).toEqual({ genre: "Action", tone: "", synopsis: "Boom" });
    expect(parseProjectMeta("[Tone: Sombre]")).toEqual({ genre: "", tone: "Sombre", synopsis: "" });
    expect(parseProjectMeta(null)).toEqual({ genre: "", tone: "", synopsis: "" });
    expect(parseProjectMeta(undefined)).toEqual({ genre: "", tone: "", synopsis: "" });
  });
});

describe("buildProjectDescription", () => {
  it("reconstruit la description taguée", () => {
    expect(buildProjectDescription({ genre: "Fantasy", tone: "Épique", synopsis: "Billy" })).toBe("[Tags: Fantasy][Tone: Épique] Billy");
  });

  it("omet les tags vides et retourne null si tout est vide", () => {
    expect(buildProjectDescription({ genre: "", tone: "", synopsis: "Juste un pitch" })).toBe("Juste un pitch");
    expect(buildProjectDescription({ genre: "Action", tone: "", synopsis: "" })).toBe("[Tags: Action]");
    expect(buildProjectDescription({ genre: "", tone: "", synopsis: "" })).toBeNull();
    expect(buildProjectDescription({ genre: "  ", tone: "  ", synopsis: "  " })).toBeNull();
  });

  it("round-trip parse ∘ build préserve les données", () => {
    const meta = { genre: "Romance", tone: "Romantique", synopsis: "Deux âmes" };
    expect(parseProjectMeta(buildProjectDescription(meta))).toEqual(meta);
  });
});

describe("stripProjectMetaTags", () => {
  it("retourne le synopsis sans les tags", () => {
    expect(stripProjectMetaTags("[Tags: SF][Tone: Sombre] Dans le futur")).toBe("Dans le futur");
  });
});
