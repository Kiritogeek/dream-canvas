import { describe, it, expect } from "vitest";
import type { Json } from "@/integrations/supabase/types";
import { parseLayoutRect } from "@/services/chapterCanvasImageHistory";

describe("parseLayoutRect", () => {
  it("retourne null pour null ou non objet", () => {
    expect(parseLayoutRect(null)).toBeNull();
    expect(parseLayoutRect("x" as unknown as Json)).toBeNull();
    expect(parseLayoutRect([] as unknown as Json)).toBeNull();
  });

  it("retourne null si un champ nombre manque ou n’est pas fini", () => {
    expect(parseLayoutRect({ x: 1, y: 2 } as Json)).toBeNull();
    expect(parseLayoutRect({ x: "1", y: 2, width: 3, height: 4 } as unknown as Json)).toBeNull();
    expect(parseLayoutRect({ x: NaN, y: 0, width: 1, height: 1 } as Json)).toBeNull();
  });

  it("retourne null si largeur ou hauteur ≤ 0", () => {
    expect(parseLayoutRect({ x: 0, y: 0, width: 0, height: 10 } as Json)).toBeNull();
    expect(parseLayoutRect({ x: 0, y: 0, width: 10, height: -1 } as Json)).toBeNull();
  });

  it("extrait les nombres valides", () => {
    expect(parseLayoutRect({ x: 12, y: -3, width: 100.5, height: 200 } as Json)).toEqual({
      x: 12,
      y: -3,
      width: 100.5,
      height: 200,
    });
  });
});
