import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Json } from "@/integrations/supabase/types";
import type { ChapterAssetsState } from "@/types";
import {
  parseNarrativeCoherenceAlerts,
  parseNarraMindAnomalies,
  findExcerptRangeInText,
  contentContainsAssetName,
  normalizeEntityName,
  extractSceneHeaderEntities,
  replaceAssetNameInContent,
  parseChapterAssets,
  fetchChapterAssets,
  updateChapterAssets,
} from "@/services/scenarioChapters";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: fromMock },
}));

type QueryResult = { data?: unknown; error?: unknown };

function supabaseChain(result: QueryResult) {
  const chain = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(async () => result),
  };
  chain.select.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  fromMock.mockReset();
});

// ── parseNarrativeCoherenceAlerts ─────────────────────────────────

describe("parseNarrativeCoherenceAlerts", () => {
  it("retourne [] pour null", () => expect(parseNarrativeCoherenceAlerts(null)).toEqual([]));
  it("retourne [] pour undefined", () => expect(parseNarrativeCoherenceAlerts(undefined)).toEqual([]));
  it("retourne [] pour un non-tableau", () => {
    expect(parseNarrativeCoherenceAlerts("texte")).toEqual([]);
    expect(parseNarrativeCoherenceAlerts(42)).toEqual([]);
    expect(parseNarrativeCoherenceAlerts({ title: "T" })).toEqual([]);
  });

  it("convertit les entrées legacy (strings) en alertes avec id legacy-N", () => {
    expect(parseNarrativeCoherenceAlerts(["  Anomalie A  ", "Anomalie B"])).toEqual([
      { id: "legacy-0", title: "Anomalie A", explanation: "" },
      { id: "legacy-1", title: "Anomalie B", explanation: "" },
    ]);
  });

  it("ignore les strings vides ou blanches", () => {
    expect(parseNarrativeCoherenceAlerts(["", "   ", "ok"])).toEqual([
      { id: "legacy-0", title: "ok", explanation: "" },
    ]);
  });

  it("ignore les entrées ni string ni objet (nombre, tableau, null)", () => {
    expect(parseNarrativeCoherenceAlerts([42, [], null, true])).toEqual([]);
  });

  it("mappe un objet complet (id, title, explanation, severity)", () => {
    expect(
      parseNarrativeCoherenceAlerts([
        { id: " a1 ", title: " Titre ", explanation: " Détail ", severity: "warning" },
      ])
    ).toEqual([{ id: "a1", title: "Titre", explanation: "Détail", severity: "warning" }]);
  });

  it("accepte les trois sévérités valides", () => {
    const alerts = parseNarrativeCoherenceAlerts([
      { title: "A", severity: "info" },
      { title: "B", severity: "warning" },
      { title: "C", severity: "critical" },
    ]);
    expect(alerts.map((a) => a.severity)).toEqual(["info", "warning", "critical"]);
  });

  it("omet une sévérité inconnue", () => {
    const [alert] = parseNarrativeCoherenceAlerts([{ title: "A", severity: "haute" }]);
    expect(alert.severity).toBeUndefined();
  });

  it("retombe sur message pour le titre, puis detail/description pour l'explication", () => {
    expect(
      parseNarrativeCoherenceAlerts([
        { message: "Depuis message", detail: "Depuis detail" },
        { title: "T", description: "Depuis description" },
      ])
    ).toEqual([
      { id: "gen-0", title: "Depuis message", explanation: "Depuis detail" },
      { id: "gen-1", title: "T", explanation: "Depuis description" },
    ]);
  });

  it("génère l'id gen-N sur l'index de SORTIE (les entrées ignorées ne comptent pas)", () => {
    expect(parseNarrativeCoherenceAlerts([42, { title: "" }, { title: "B" }])).toEqual([
      { id: "gen-0", title: "B", explanation: "" },
    ]);
  });

  it("ignore un objet sans titre ni explication", () => {
    expect(parseNarrativeCoherenceAlerts([{ severity: "critical" }, {}])).toEqual([]);
  });

  it("sans titre, explication courte (≤100) → promue en titre, explication vidée", () => {
    const e = "x".repeat(100);
    expect(parseNarrativeCoherenceAlerts([{ explanation: e }])).toEqual([
      { id: "gen-0", title: e, explanation: "" },
    ]);
  });

  it("sans titre, explication longue (>100) → titre tronqué à 97 + …, explication conservée", () => {
    const e = "x".repeat(101);
    const [alert] = parseNarrativeCoherenceAlerts([{ id: "k", explanation: e }]);
    expect(alert).toEqual({ id: "k", title: `${"x".repeat(97)}…`, explanation: e });
    expect(alert.title).toHaveLength(98);
  });

  // BUG: la sévérité est normalisée (ligne const sev = ...) mais jamais attachée dans la
  // branche « explication sans titre », alors que l'anchor y est bien propagée.
  it.fails("BUG — conserve la sévérité quand l'alerte n'a qu'une explication", () => {
    const [alert] = parseNarrativeCoherenceAlerts([
      { explanation: "Incohérence de lieu", severity: "critical" },
    ]);
    expect(alert.severity).toBe("critical");
  });

  it("propage l'anchor excerpt valide (texte trimé) sur une alerte titrée", () => {
    const [alert] = parseNarrativeCoherenceAlerts([
      { title: "T", anchor: { type: "excerpt", text: "  un passage  " } },
    ]);
    expect(alert.anchor).toEqual({ type: "excerpt", text: "un passage" });
  });

  it("propage l'anchor aussi dans la branche explication sans titre", () => {
    const [alert] = parseNarrativeCoherenceAlerts([
      { explanation: "e".repeat(120), anchor: { type: "excerpt", text: "extrait" } },
    ]);
    expect(alert.anchor).toEqual({ type: "excerpt", text: "extrait" });
  });

  it("ignore un anchor invalide (type inconnu, non-objet, texte trop court)", () => {
    const alerts = parseNarrativeCoherenceAlerts([
      { title: "A", anchor: { type: "line", text: "abc" } },
      { title: "B", anchor: "excerpt" },
      { title: "C", anchor: ["excerpt"] },
      { title: "D", anchor: { type: "excerpt", text: " x " } },
    ]);
    expect(alerts.map((a) => a.anchor)).toEqual([undefined, undefined, undefined, undefined]);
  });

  it("tronque un anchor de plus de 2000 caractères à 1997 + …", () => {
    const [alert] = parseNarrativeCoherenceAlerts([
      { title: "T", anchor: { type: "excerpt", text: "a".repeat(2001) } },
    ]);
    expect(alert.anchor?.text).toBe(`${"a".repeat(1997)}…`);
    expect(alert.anchor?.text).toHaveLength(1998);
  });

  it("garde intact un anchor de exactement 2000 caractères", () => {
    const [alert] = parseNarrativeCoherenceAlerts([
      { title: "T", anchor: { type: "excerpt", text: "a".repeat(2000) } },
    ]);
    expect(alert.anchor?.text).toHaveLength(2000);
  });
});

// ── parseNarraMindAnomalies ───────────────────────────────────────

describe("parseNarraMindAnomalies", () => {
  it("retourne [] pour null", () => expect(parseNarraMindAnomalies(null)).toEqual([]));
  it("joint titre et explication avec un tiret cadratin", () => {
    expect(parseNarraMindAnomalies([{ title: "T", explanation: "E" }])).toEqual(["T — E"]);
  });
  it("titre seul quand l'explication est vide", () => {
    expect(parseNarraMindAnomalies(["legacy", { title: "T" }])).toEqual(["legacy", "T"]);
  });
});

// ── findExcerptRangeInText ────────────────────────────────────────

describe("findExcerptRangeInText", () => {
  it("trouve la première occurrence exacte", () => {
    expect(findExcerptRangeInText("aa bb aa", "aa")).toEqual({ start: 0, end: 2 });
  });
  it("trime l'extrait avant recherche", () => {
    expect(findExcerptRangeInText("abcdef", "  cd  ")).toEqual({ start: 2, end: 4 });
  });
  it("retombe sur une recherche insensible à la casse", () => {
    expect(findExcerptRangeInText("Bonjour Léa", "bonjour")).toEqual({ start: 0, end: 7 });
  });
  it("retourne null si extrait < 2 caractères après trim", () => {
    expect(findExcerptRangeInText("abcdef", "c")).toBeNull();
    expect(findExcerptRangeInText("abcdef", "  a  ")).toBeNull();
  });
  it("retourne null si introuvable", () => {
    expect(findExcerptRangeInText("abcdef", "zz")).toBeNull();
  });
});

// ── contentContainsAssetName ──────────────────────────────────────

describe("contentContainsAssetName", () => {
  it("détecte le nom comme mot entier, insensible à la casse", () => {
    expect(contentContainsAssetName("léa entre en scène", "Léa")).toBe(true);
    expect(contentContainsAssetName("Voici TOM.", "tom")).toBe(true);
  });
  it("refuse un nom vide ou blanc", () => {
    expect(contentContainsAssetName("Léa", "")).toBe(false);
    expect(contentContainsAssetName("Léa", "   ")).toBe(false);
  });
  it("ne matche pas à l'intérieur d'un mot", () => {
    expect(contentContainsAssetName("La tomate mûrit", "Tom")).toBe(false);
    expect(contentContainsAssetName("Tomé arrive", "Tom")).toBe(false);
  });
  it("le tiret est une frontière interdite (noms composés protégés)", () => {
    expect(contentContainsAssetName("Léa-Marie entre", "Léa")).toBe(false);
    expect(contentContainsAssetName("Léa-Marie entre", "Marie")).toBe(false);
    expect(contentContainsAssetName("Léa-Marie entre", "Léa-Marie")).toBe(true);
  });
  it("échappe les caractères spéciaux regex du nom", () => {
    expect(contentContainsAssetName("voici M+ !", "M+")).toBe(true);
    expect(contentContainsAssetName("voici Dr. X !", "Dr. X")).toBe(true);
    expect(contentContainsAssetName("voici MA !", "M+")).toBe(false);
  });
});

// ── normalizeEntityName ───────────────────────────────────────────

describe("normalizeEntityName", () => {
  it("supprime accents, casse et espaces de bord", () => {
    expect(normalizeEntityName("  Éléa  ")).toBe("elea");
    expect(normalizeEntityName("ÇÀ VA")).toBe("ca va");
  });
  it("conserve les espaces internes", () => {
    expect(normalizeEntityName("Ruelle Sombre")).toBe("ruelle sombre");
  });
});

// ── extractSceneHeaderEntities ────────────────────────────────────

describe("extractSceneHeaderEntities", () => {
  it("retourne [] pour un contenu vide ou blanc", () => {
    expect(extractSceneHeaderEntities("")).toEqual([]);
    expect(extractSceneHeaderEntities("   ")).toEqual([]);
  });

  it("extrait les personnages d'un en-tête, parenthèses retirées", () => {
    expect(extractSceneHeaderEntities("> Personnages : Léa, Tom (le frère de Léa)")).toEqual([
      { name: "Léa", type: "character" },
      { name: "Tom", type: "character" },
    ]);
  });

  it("extrait uniquement le premier segment du Lieu", () => {
    expect(extractSceneHeaderEntities("> Lieu : Ruelle (sombre), nuit, pluie")).toEqual([
      { name: "Ruelle", type: "background" },
    ]);
  });

  it("les en-têtes sont insensibles à la casse", () => {
    expect(extractSceneHeaderEntities("> personnages : Léa\n> LIEU : Toit du lycée")).toEqual([
      { name: "Léa", type: "character" },
      { name: "Toit du lycée", type: "background" },
    ]);
  });

  it("ignore les lignes sans chevron de citation", () => {
    expect(extractSceneHeaderEntities("Personnages : Léa\nLieu : Toit")).toEqual([]);
  });

  it("déduplique par nom insensible casse/accents en gardant la première forme", () => {
    expect(
      extractSceneHeaderEntities("> Personnages : Léa, LEA\n> Personnages : lea, Tom")
    ).toEqual([
      { name: "Léa", type: "character" },
      { name: "Tom", type: "character" },
    ]);
  });

  it("le même nom peut exister en personnage ET en lieu", () => {
    expect(extractSceneHeaderEntities("> Personnages : Ombre\n> Lieu : Ombre")).toEqual([
      { name: "Ombre", type: "character" },
      { name: "Ombre", type: "background" },
    ]);
  });

  it("filtre les noms trop courts (<2) ou trop longs (>60)", () => {
    const long = "N".repeat(61);
    expect(extractSceneHeaderEntities(`> Personnages : A, Bo, ${long}`)).toEqual([
      { name: "Bo", type: "character" },
    ]);
  });

  it("ignore un segment devenu vide après retrait des parenthèses", () => {
    expect(extractSceneHeaderEntities("> Personnages : (rires), Léa")).toEqual([
      { name: "Léa", type: "character" },
    ]);
  });
});

// ── replaceAssetNameInContent ─────────────────────────────────────

describe("replaceAssetNameInContent", () => {
  it("remplace toutes les occurrences en mot entier, insensible à la casse", () => {
    expect(replaceAssetNameInContent("Léa parle. léa rit.", "Léa", "Mia")).toBe(
      "Mia parle. Mia rit."
    );
  });
  it("ne touche pas aux noms composés par tiret", () => {
    expect(replaceAssetNameInContent("Léa-Marie et Léa", "Léa", "Mia")).toBe("Léa-Marie et Mia");
  });
  it("ne remplace pas une sous-chaîne interne à un mot", () => {
    expect(replaceAssetNameInContent("La tomate de Tom", "Tom", "Max")).toBe("La tomate de Max");
  });
  it("ancien nom vide → contenu inchangé", () => {
    expect(replaceAssetNameInContent("Léa parle", "  ", "Mia")).toBe("Léa parle");
  });
  it("échappe les caractères spéciaux regex de l'ancien nom", () => {
    expect(replaceAssetNameInContent("voici M+ !", "M+", "Néo")).toBe("voici Néo !");
  });
});

// ── parseChapterAssets ────────────────────────────────────────────

describe("parseChapterAssets", () => {
  it("retourne l'état vide pour null, undefined, tableau ou scalaire", () => {
    const empty = { validated: false, items: [] };
    expect(parseChapterAssets(null)).toEqual(empty);
    expect(parseChapterAssets(undefined)).toEqual(empty);
    expect(parseChapterAssets([])).toEqual(empty);
    expect(parseChapterAssets("x")).toEqual(empty);
    expect(parseChapterAssets(7)).toEqual(empty);
  });

  it("validated n'est vrai que pour le booléen true strict", () => {
    expect(parseChapterAssets({ validated: true, items: [] }).validated).toBe(true);
    expect(parseChapterAssets({ validated: "true", items: [] }).validated).toBe(false);
    expect(parseChapterAssets({ items: [] }).validated).toBe(false);
  });

  it("items non-tableau → []", () => {
    expect(parseChapterAssets({ validated: true, items: "x" }).items).toEqual([]);
  });

  it("ignore les items invalides (non-objet, sans asset_id string)", () => {
    expect(
      parseChapterAssets({
        items: [null, "x", [], { status: "added" }, { asset_id: 42 }, { asset_id: "a1" }],
      }).items
    ).toEqual([{ asset_id: "a1", status: "auto" }]);
  });

  it("statut inconnu retombe sur auto, statuts valides conservés", () => {
    const { items } = parseChapterAssets({
      items: [
        { asset_id: "a", status: "added" },
        { asset_id: "b", status: "removed" },
        { asset_id: "c", status: "skipped" },
        { asset_id: "d", status: "bizarre" },
      ],
    });
    expect(items.map((i) => i.status)).toEqual(["added", "removed", "skipped", "auto"]);
  });

  it("linked_alias trimé, omis si vide ou non-string", () => {
    const { items } = parseChapterAssets({
      items: [
        { asset_id: "a", status: "added", linked_alias: "  le héros  " },
        { asset_id: "b", status: "added", linked_alias: "   " },
        { asset_id: "c", status: "added", linked_alias: 42 },
      ] as unknown as Json,
    });
    expect(items[0].linked_alias).toBe("le héros");
    expect("linked_alias" in items[1]).toBe(false);
    expect("linked_alias" in items[2]).toBe(false);
  });
});

// ── fetchChapterAssets / updateChapterAssets (client Supabase mocké) ──

describe("fetchChapterAssets", () => {
  it("parse la colonne chapter_assets retournée", async () => {
    fromMock.mockReturnValue(
      supabaseChain({
        data: { chapter_assets: { validated: true, items: [{ asset_id: "a1", status: "added" }] } },
        error: null,
      })
    );
    await expect(fetchChapterAssets("ch1")).resolves.toEqual({
      validated: true,
      items: [{ asset_id: "a1", status: "added" }],
    });
    expect(fromMock).toHaveBeenCalledWith("scenario_chapters");
  });

  it("colonne absente → état vide", async () => {
    fromMock.mockReturnValue(supabaseChain({ data: { chapter_assets: null }, error: null }));
    await expect(fetchChapterAssets("ch1")).resolves.toEqual({ validated: false, items: [] });
  });

  it("propage l'erreur Supabase", async () => {
    fromMock.mockReturnValue(supabaseChain({ data: null, error: new Error("RLS refusée") }));
    await expect(fetchChapterAssets("ch1")).rejects.toThrow("RLS refusée");
  });
});

describe("updateChapterAssets", () => {
  it("écrit l'état puis renvoie la valeur serveur re-normalisée", async () => {
    const chain = supabaseChain({
      data: {
        chapter_assets: {
          validated: "corrompu",
          items: [{ asset_id: "a1", status: "statut-inconnu" }, { status: "added" }],
        },
      },
      error: null,
    });
    fromMock.mockReturnValue(chain);

    const state: ChapterAssetsState = { validated: true, items: [{ asset_id: "a1", status: "added" }] };
    await expect(updateChapterAssets("ch1", state)).resolves.toEqual({
      validated: false,
      items: [{ asset_id: "a1", status: "auto" }],
    });
    expect(chain.update).toHaveBeenCalledWith({ chapter_assets: state });
    expect(chain.eq).toHaveBeenCalledWith("id", "ch1");
  });

  it("propage l'erreur Supabase", async () => {
    fromMock.mockReturnValue(supabaseChain({ data: null, error: new Error("timeout") }));
    await expect(
      updateChapterAssets("ch1", { validated: false, items: [] })
    ).rejects.toThrow("timeout");
  });
});
