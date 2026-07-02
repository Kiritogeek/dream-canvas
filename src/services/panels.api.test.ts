import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import type { Panel, PanelOutlineItem, Project } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPanels,
  createPanel,
  updatePanel,
  deletePanel,
  createPanelsFromOutline,
  replacePanelsFromOutline,
  generatePanelBlockImage,
  type GenerateBlockImageParams,
} from "@/services/panels";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      refreshSession: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/generationLogger", () => ({
  logGenerationInfo: vi.fn(),
  logGenerationFailure: vi.fn(),
}));

type QueryResult = { data?: unknown; error?: unknown };

type QueryBuilder = {
  select: Mock;
  eq: Mock;
  order: Mock;
  insert: Mock;
  update: Mock;
  delete: Mock;
  single: Mock;
  then: (
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => Promise<unknown>;
};

// Chaque méthode retourne le builder (chaînage) ; `then` rend le builder awaitable
// à n'importe quel point de la chaîne, comme le vrai PostgrestBuilder.
function queryBuilder(result: QueryResult): QueryBuilder {
  const builder: QueryBuilder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return builder;
}

const fromMock = supabase.from as unknown as Mock;
const refreshSessionMock = supabase.auth.refreshSession as unknown as Mock;
const getSessionMock = supabase.auth.getSession as unknown as Mock;

const dbError = { code: "42501", message: "permission denied" };

function panelRow(extra?: Record<string, unknown>): Panel {
  return {
    id: "p1",
    chapter_id: "ch-1",
    panel_number: 1,
    layout: { blocks: [] },
    ...extra,
  } as unknown as Panel;
}

const outline: PanelOutlineItem[] = [
  { description: "Ouverture : ruelle sous la pluie" },
  { description: "Duel sur le toit", context: { lieu: "Toit", personnages: "Kai, Ren" } },
  { description: "Chute au ralenti" },
];

beforeEach(() => {
  vi.resetAllMocks();
});

// ── fetchPanels ───────────────────────────────────────────────────

describe("fetchPanels", () => {
  it("interroge chapter_canvases filtré par chapitre et trié par panel_number croissant", async () => {
    const rows = [panelRow({ id: "p1", panel_number: 1 }), panelRow({ id: "p2", panel_number: 2 })];
    const builder = queryBuilder({ data: rows, error: null });
    fromMock.mockReturnValueOnce(builder);

    const result = await fetchPanels("ch-1");

    expect(result).toEqual(rows);
    expect(fromMock).toHaveBeenCalledWith("chapter_canvases");
    expect(builder.select).toHaveBeenCalledWith("*");
    expect(builder.eq).toHaveBeenCalledWith("chapter_id", "ch-1");
    expect(builder.order).toHaveBeenCalledWith("panel_number", { ascending: true });
  });

  it("retourne [] quand data est null", async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: null }));
    await expect(fetchPanels("ch-1")).resolves.toEqual([]);
  });

  it("throw l'erreur Supabase telle quelle", async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: dbError }));
    await expect(fetchPanels("ch-1")).rejects.toBe(dbError);
  });
});

// ── createPanel ───────────────────────────────────────────────────

describe("createPanel", () => {
  it("insère avec le panel_number fourni sans relire les panels existants", async () => {
    const created = panelRow({ id: "p9", panel_number: 9 });
    const builder = queryBuilder({ data: created, error: null });
    fromMock.mockReturnValueOnce(builder);

    const result = await createPanel("ch-1", "user-1", 9);

    expect(result).toEqual(created);
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(builder.insert).toHaveBeenCalledWith({
      chapter_id: "ch-1",
      user_id: "user-1",
      panel_number: 9,
      layout: { blocks: [] },
    });
  });

  it("calcule le numéro suivant à partir du max existant (pas du nombre de lignes)", async () => {
    const existing = [panelRow({ id: "a", panel_number: 2 }), panelRow({ id: "b", panel_number: 7 })];
    const insertBuilder = queryBuilder({ data: panelRow({ id: "c", panel_number: 8 }), error: null });
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: existing, error: null }))
      .mockReturnValueOnce(insertBuilder);

    await createPanel("ch-1", "user-1");

    expect(insertBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({ panel_number: 8 }));
  });

  it("premier panel d'un chapitre vide → panel_number 1", async () => {
    const insertBuilder = queryBuilder({ data: panelRow({ panel_number: 1 }), error: null });
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(insertBuilder);

    await createPanel("ch-1", "user-1");

    expect(insertBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({ panel_number: 1 }));
  });

  it("panelNumber < 1 est ignoré et recalculé depuis l'existant", async () => {
    const insertBuilder = queryBuilder({ data: panelRow({ panel_number: 4 }), error: null });
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [panelRow({ panel_number: 3 })], error: null }))
      .mockReturnValueOnce(insertBuilder);

    await createPanel("ch-1", "user-1", 0);

    expect(insertBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({ panel_number: 4 }));
  });

  it("throw si l'insert échoue (collision d'unicité sur panel_number)", async () => {
    const conflict = { code: "23505", message: "duplicate key value violates unique constraint" };
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: conflict }));

    await expect(createPanel("ch-1", "user-1", 3)).rejects.toBe(conflict);
  });
});

// ── updatePanel ───────────────────────────────────────────────────

describe("updatePanel", () => {
  it("met à jour la ligne ciblée par id et retourne la ligne modifiée", async () => {
    const updated = panelRow({ id: "p1", prompt: "nouveau prompt" });
    const builder = queryBuilder({ data: updated, error: null });
    fromMock.mockReturnValueOnce(builder);

    const result = await updatePanel("p1", { prompt: "nouveau prompt" });

    expect(result).toEqual(updated);
    expect(fromMock).toHaveBeenCalledWith("chapter_canvases");
    expect(builder.update).toHaveBeenCalledWith({ prompt: "nouveau prompt" });
    expect(builder.eq).toHaveBeenCalledWith("id", "p1");
    expect(builder.single).toHaveBeenCalled();
  });

  it("throw l'erreur Supabase telle quelle", async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: dbError }));
    await expect(updatePanel("p1", { prompt: "x" })).rejects.toBe(dbError);
  });
});

// ── deletePanel ───────────────────────────────────────────────────

describe("deletePanel", () => {
  it("supprime la ligne ciblée par id", async () => {
    const builder = queryBuilder({ error: null });
    fromMock.mockReturnValueOnce(builder);

    await expect(deletePanel("p1")).resolves.toBeUndefined();

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "p1");
  });

  it("throw l'erreur Supabase telle quelle", async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ error: dbError }));
    await expect(deletePanel("p1")).rejects.toBe(dbError);
  });
});

// ── createPanelsFromOutline ───────────────────────────────────────

describe("createPanelsFromOutline", () => {
  it("outline vide → [] sans aucun appel réseau", async () => {
    await expect(createPanelsFromOutline("ch-1", [], "user-1")).resolves.toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("mappe chaque item vers une ligne numérotée 1..n avec layout vide", async () => {
    const rows = outline.map((_o, i) => panelRow({ id: `p${i + 1}`, panel_number: i + 1 }));
    const builder = queryBuilder({ data: rows, error: null });
    fromMock.mockReturnValueOnce(builder);

    const result = await createPanelsFromOutline("ch-1", outline, "user-1");

    expect(result).toEqual(rows);
    expect(builder.insert).toHaveBeenCalledWith([
      { chapter_id: "ch-1", user_id: "user-1", panel_number: 1, layout: { blocks: [] } },
      { chapter_id: "ch-1", user_id: "user-1", panel_number: 2, layout: { blocks: [] } },
      { chapter_id: "ch-1", user_id: "user-1", panel_number: 3, layout: { blocks: [] } },
    ]);
    expect(builder.order).toHaveBeenCalledWith("panel_number", { ascending: true });
  });

  it("retourne [] quand l'insert ne renvoie pas de data", async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: null }));
    await expect(createPanelsFromOutline("ch-1", outline, "user-1")).resolves.toEqual([]);
  });

  it("throw si l'insert échoue", async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: dbError }));
    await expect(createPanelsFromOutline("ch-1", outline, "user-1")).rejects.toBe(dbError);
  });
});

// ── replacePanelsFromOutline ──────────────────────────────────────

describe("replacePanelsFromOutline", () => {
  it("supprime les panels du chapitre puis insère ceux de l'outline", async () => {
    const rows = outline.map((_o, i) => panelRow({ id: `p${i + 1}`, panel_number: i + 1 }));
    const deleteBuilder = queryBuilder({ error: null });
    const insertBuilder = queryBuilder({ data: rows, error: null });
    fromMock.mockReturnValueOnce(deleteBuilder).mockReturnValueOnce(insertBuilder);

    const result = await replacePanelsFromOutline("ch-1", outline, "user-1");

    expect(result).toEqual(rows);
    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith("chapter_id", "ch-1");
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      outline.map((_o, i) => ({
        chapter_id: "ch-1",
        user_id: "user-1",
        panel_number: i + 1,
        layout: { blocks: [] },
      }))
    );
  });

  it("throw si le delete échoue — aucun insert tenté, les panels existants sont préservés", async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ error: dbError }));

    await expect(replacePanelsFromOutline("ch-1", outline, "user-1")).rejects.toBe(dbError);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  // BUG: delete puis insert sans transaction — si l'insert échoue, le delete est déjà parti
  // et le chapitre reste vide (perte de données). À corriger par une RPC Postgres transactionnelle.
  // Tracé au backlog ; code mort aujourd'hui (useReplacePanelsFromOutline exporté mais jamais consommé).
  it("BUG connu : delete-then-insert non transactionnel — perte des panels si l'insert échoue", async () => {
    const insertError = { code: "23505", message: "duplicate key value violates unique constraint" };
    const deleteBuilder = queryBuilder({ error: null });
    const insertBuilder = queryBuilder({ data: null, error: insertError });
    fromMock.mockReturnValueOnce(deleteBuilder).mockReturnValueOnce(insertBuilder);

    await expect(replacePanelsFromOutline("ch-1", outline, "user-1")).rejects.toBe(insertError);

    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith("chapter_id", "ch-1");
    expect(insertBuilder.insert).toHaveBeenCalled();
  });
});

// ── generatePanelBlockImage ───────────────────────────────────────

describe("generatePanelBlockImage", () => {
  function params(extra?: Partial<GenerateBlockImageParams>): GenerateBlockImageParams {
    return {
      panelId: "panel-1",
      blockId: "block-1",
      width: 512,
      height: 640,
      prompt: "Héros sous la pluie, plan large",
      project: { id: "proj-1" } as Project,
      ...extra,
    };
  }

  function stubFetch(response: {
    ok: boolean;
    status?: number;
    statusText?: string;
    json?: () => Promise<unknown>;
  }): Mock {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status ?? 200,
      statusText: response.statusText ?? "",
      json: response.json ?? (async () => ({})),
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "pk-test");
    refreshSessionMock.mockResolvedValue({ data: {}, error: null });
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "jwt-abc" } } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("appelle l'Edge Function avec le JWT et retourne image_url", async () => {
    const fetchMock = stubFetch({
      ok: true,
      json: async () => ({ image_url: "https://cdn.test/img.png" }),
    });

    const result = await generatePanelBlockImage(params());

    expect(result).toEqual({ image_url: "https://cdn.test/img.png" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://test.supabase.co/functions/v1/generate-panel-image");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer jwt-abc");
    expect(headers.apikey).toBe("pk-test");
    expect(JSON.parse(init.body as string)).toMatchObject({
      panel_id: "panel-1",
      block_id: "block-1",
      width: 512,
      height: 640,
      prompt: "Héros sous la pluie, plan large",
    });
  });

  it("omet les champs optionnels vides du payload", async () => {
    const fetchMock = stubFetch({ ok: true, json: async () => ({ image_url: "u" }) });

    await generatePanelBlockImage(params({ blockAssetImageUrls: [], blockAssetNames: [], effects: [] }));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).not.toHaveProperty("block_asset_image_urls");
    expect(body).not.toHaveProperty("block_asset_names");
    expect(body).not.toHaveProperty("effects");
    expect(body).not.toHaveProperty("context_chapter");
    expect(body).not.toHaveProperty("previous_image_url");
  });

  it("throw sans appeler fetch si la session est absente", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const fetchMock = stubFetch({ ok: true });

    await expect(generatePanelBlockImage(params())).rejects.toThrow(
      "Session expirée ou invalide. Reconnectez-vous pour générer."
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throw « Réponse invalide : image_url manquant » si la réponse ok n'a pas d'image_url", async () => {
    stubFetch({ ok: true, json: async () => ({ status: "done" }) });

    await expect(generatePanelBlockImage(params())).rejects.toThrow(
      "Réponse invalide : image_url manquant"
    );
  });

  it("propage le request_id (trimé) dans le message d'erreur HTTP", async () => {
    stubFetch({
      ok: false,
      status: 429,
      json: async () => ({ error: "Quota dépassé", request_id: "  req-42  " }),
    });

    await expect(generatePanelBlockImage(params())).rejects.toThrow(
      "Quota dépassé (request_id: req-42)"
    );
  });

  it("erreur HTTP sans request_id → message d'erreur brut", async () => {
    stubFetch({ ok: false, status: 429, json: async () => ({ error: "Quota dépassé" }) });

    await expect(generatePanelBlockImage(params())).rejects.toThrow(/^Quota dépassé$/);
  });

  it("ignore un request_id composé uniquement d'espaces", async () => {
    stubFetch({ ok: false, status: 500, json: async () => ({ error: "Boom", request_id: "   " }) });

    await expect(generatePanelBlockImage(params())).rejects.toThrow(/^Boom$/);
  });

  it("retombe sur body.message quand error est absent", async () => {
    stubFetch({ ok: false, status: 400, json: async () => ({ message: "Prompt requis" }) });

    await expect(generatePanelBlockImage(params())).rejects.toThrow(/^Prompt requis$/);
  });

  it("retombe sur « Erreur <status> » si le corps d'erreur est illisible et statusText vide", async () => {
    stubFetch({
      ok: false,
      status: 500,
      statusText: "",
      json: async () => {
        throw new Error("invalid json");
      },
    });

    await expect(generatePanelBlockImage(params())).rejects.toThrow(/^Erreur 500$/);
  });
});
