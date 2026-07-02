import { describe, it, expect } from "vitest";
import { extractJsonObject, tryClosePanelsJson } from "./llmJson";

describe("extractJsonObject", () => {
  it("objet JSON pur → retourné tel quel", () => {
    expect(extractJsonObject('{"blocks":[]}')).toBe('{"blocks":[]}');
  });

  it("fences markdown ```json → fences retirés, objet extrait", () => {
    const raw = '```json\n{"blocks":[{"panel_number":1}]}\n```';
    expect(extractJsonObject(raw)).toBe('{"blocks":[{"panel_number":1}]}');
  });

  it("fence sans langage (```) → également retiré", () => {
    expect(extractJsonObject('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("texte avant et après l'objet → seul l'objet équilibré est retourné", () => {
    const raw = 'Voici le découpage : {"blocks":[]} Bonne lecture !';
    expect(extractJsonObject(raw)).toBe('{"blocks":[]}');
  });

  it("accolades à l'intérieur des chaînes → ignorées par l'équilibrage", () => {
    const raw = 'ok {"description":"une case {dramatique} au sommet","n":1} fin';
    expect(extractJsonObject(raw)).toBe(
      '{"description":"une case {dramatique} au sommet","n":1}'
    );
  });

  it("guillemets échappés et antislash échappé → la chaîne est suivie correctement", () => {
    const raw = '{"text":"il dit \\"go\\" puis \\\\"} et du bruit après';
    const extracted = extractJsonObject(raw);
    expect(extracted).toBe('{"text":"il dit \\"go\\" puis \\\\"}');
    expect(JSON.parse(extracted)).toEqual({ text: 'il dit "go" puis \\' });
  });

  it("double objet → seul le premier est extrait", () => {
    expect(extractJsonObject('{"a":1} {"b":2}')).toBe('{"a":1}');
  });

  it("tableau sans objet (aucun {) → entrée retournée trimée telle quelle", () => {
    expect(extractJsonObject("  [1,2,3]  ")).toBe("[1,2,3]");
  });

  it("tableau d'objets → extrait le premier objet interne, pas le tableau", () => {
    expect(extractJsonObject('[{"a":1},{"b":2}]')).toBe('{"a":1}');
  });

  it("entrée vide → chaîne vide", () => {
    expect(extractJsonObject("")).toBe("");
  });

  it("texte sans aucun JSON → texte trimé retourné (le parse échouera en aval)", () => {
    expect(extractJsonObject("  aucun json ici  ")).toBe("aucun json ici");
  });

  it("JSON tronqué (non équilibré) → retourne tout depuis le premier { pour réparation aval", () => {
    const raw = 'préambule {"blocks":[{"description":"coupé en pleine chaî';
    expect(extractJsonObject(raw)).toBe(
      '{"blocks":[{"description":"coupé en pleine chaî'
    );
  });
});

describe("tryClosePanelsJson", () => {
  it("JSON déjà valide → retourné tel quel (trimé)", () => {
    expect(tryClosePanelsJson(' {"blocks":[]} ')).toBe('{"blocks":[]}');
  });

  it("ne commence pas par { → retourné trimé sans tentative de réparation", () => {
    expect(tryClosePanelsJson("  [1,2,3  ")).toBe("[1,2,3");
  });

  it("tronqué en pleine chaîne dans blocks[] → réparé (suffixe \"}]})", () => {
    const raw = '{"blocks":[{"panel_number":1,"description":"une case coup';
    expect(JSON.parse(tryClosePanelsJson(raw))).toEqual({
      blocks: [{ panel_number: 1, description: "une case coup" }],
    });
  });

  it("tronqué dans un objet imbriqué plus profond → réparé (suffixe \"}}]})", () => {
    const raw = '{"blocks":[{"meta":{"note":"abc';
    expect(JSON.parse(tryClosePanelsJson(raw))).toEqual({
      blocks: [{ meta: { note: "abc" } }],
    });
  });

  it("tronqué dans un tableau de chaînes → réparé (suffixe \"]})", () => {
    const raw = '{"tags":["a","b';
    expect(JSON.parse(tryClosePanelsJson(raw))).toEqual({ tags: ["a", "b"] });
  });

  it("tronqué dans une valeur simple → réparé (suffixe \"})", () => {
    const raw = '{"title":"chapitre coup';
    expect(JSON.parse(tryClosePanelsJson(raw))).toEqual({
      title: "chapitre coup",
    });
  });

  it("tronqué hors chaîne (après un guillemet fermant) → irréparable, retourné tel quel", () => {
    const raw = '{"blocks":[{"description":"finie"';
    expect(tryClosePanelsJson(raw)).toBe(raw);
  });

  it("entrée vide → chaîne vide", () => {
    expect(tryClosePanelsJson("")).toBe("");
  });

  it("pipeline detect_blocks : fence + troncature en pleine chaîne → extraction puis réparation parseable", () => {
    const raw = '```json\n{"blocks":[{"panel_number":2,"description":"la chute du hér';
    const repaired = tryClosePanelsJson(extractJsonObject(raw));
    expect(JSON.parse(repaired)).toEqual({
      blocks: [{ panel_number: 2, description: "la chute du hér" }],
    });
  });
});
