import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("concatène des classes simples", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("ignore les valeurs falsy (false, null, undefined, chaîne vide)", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("aplatit les tableaux", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("applique les clés vraies d'un objet conditionnel", () => {
    expect(cn({ active: true, disabled: false }, "base")).toBe("active base");
  });

  it("gère les entrées imbriquées (tableau + objet)", () => {
    expect(cn("foo", ["bar", { baz: true }])).toBe("foo bar baz");
  });

  it("retourne une chaîne vide sans argument", () => {
    expect(cn()).toBe("");
  });

  it("résout les conflits Tailwind de padding (dernier gagne)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("résout les conflits Tailwind de couleur (dernier gagne)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("préserve les classes non conflictuelles autour d'un merge", () => {
    expect(cn("rounded", "px-2", "px-4", "shadow")).toBe("rounded px-4 shadow");
  });

  it("laisse passer une classe conditionnelle en conflit correctement", () => {
    const large = true;
    const small = false;
    expect(cn("p-2", large && "p-8", small && "p-4")).toBe("p-8");
  });
});
