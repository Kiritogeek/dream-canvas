import { describe, it, expect } from "vitest";
import {
  splitChapterForDetection,
  DETECT_CHUNK_THRESHOLD_CHARS,
  DETECT_CHUNK_TARGET_CHARS,
} from "./chapterChunking";

const para = (n: number, ch = "a") => ch.repeat(n);

describe("splitChapterForDetection", () => {
  it("chapitre court → une seule partie, intacte", () => {
    const content = "Un paragraphe.\n\nUn autre.";
    expect(splitChapterForDetection(content)).toEqual([content]);
  });

  it("le seuil est strict : juste en dessous → 1 partie", () => {
    const content = para(DETECT_CHUNK_THRESHOLD_CHARS - 10);
    expect(splitChapterForDetection(content)).toHaveLength(1);
  });

  it("chapitre long → parties bornées par la cible", () => {
    const paragraphs = Array.from({ length: 12 }, (_, i) => para(2_000, String.fromCharCode(97 + i)));
    const parts = splitChapterForDetection(paragraphs.join("\n\n"));
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) {
      expect(p.length).toBeLessThanOrEqual(DETECT_CHUNK_TARGET_CHARS * 1.4);
    }
  });

  it("aucun texte perdu (hors espaces de jonction)", () => {
    const paragraphs = Array.from({ length: 10 }, (_, i) => `Paragraphe ${i} ${para(1_800)}`);
    const content = paragraphs.join("\n\n");
    const parts = splitChapterForDetection(content);
    const rejoined = parts.join("\n\n");
    // Chaque paragraphe complet se retrouve dans le résultat.
    for (const p of paragraphs) expect(rejoined).toContain(p);
  });

  it("coupe aux frontières de paragraphes (pas au milieu)", () => {
    const paragraphs = Array.from({ length: 8 }, (_, i) => `P${i} ${para(2_500)}`);
    const parts = splitChapterForDetection(paragraphs.join("\n\n"));
    for (const part of parts) {
      // Chaque partie commence au début d'un paragraphe connu.
      expect(paragraphs.some((p) => part.startsWith(p.slice(0, 10)))).toBe(true);
    }
  });

  it("paragraphe monstre sans sauts de ligne → coupé aux phrases", () => {
    const sentence = "Le chasseur avança prudemment dans le noir. ";
    const monster = sentence.repeat(400); // ~18 000 chars d'un bloc
    const parts = splitChapterForDetection(monster);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) {
      expect(p.length).toBeLessThanOrEqual(DETECT_CHUNK_TARGET_CHARS + sentence.length);
      // On coupe après une phrase complète, pas au milieu d'un mot.
      expect(p.trim()).toMatch(/[.!?…]["»']?$/);
    }
  });

  it("dernière partie minuscule fusionnée avec la précédente", () => {
    const content = [para(7_000), para(7_000, "b"), para(500, "c")].join("\n\n");
    const parts = splitChapterForDetection(content);
    expect(parts[parts.length - 1]).toContain("c".repeat(500));
    expect(parts[parts.length - 1].length).toBeGreaterThan(2_000);
  });
});
