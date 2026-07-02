import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { composeChapterLayout } from "@/services/composeChapterLayout";

const { refreshSession, getSession } = vi.hoisted(() => ({
  refreshSession: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { refreshSession, getSession } },
}));

const fetchMock = vi.fn();

function mockSession(token: string | null = "jwt-test") {
  getSession.mockResolvedValue({
    data: { session: token !== null ? { access_token: token } : null },
  });
}

function httpResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json:
      body === undefined
        ? () => Promise.reject(new SyntaxError("Unexpected token"))
        : () => Promise.resolve(body),
  };
}

function sentRequest() {
  const [url, init] = fetchMock.mock.calls[0];
  return { url, init, body: JSON.parse(init.body) };
}

const minimalParams = {
  chapterId: "chap-1",
  panelsOutline: [{ panel_number: 1, description: "Kira arrive en ville" }],
};

const successBody = {
  canvas_id: "canvas-1",
  blocks_count: 4,
  bubbles_count: 2,
  panel_height: 6400,
  model_used: "gemini-2.5-flash",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  vi.stubGlobal("fetch", fetchMock);
  refreshSession.mockResolvedValue({ data: {}, error: null });
  mockSession();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("composeChapterLayout — nominal", () => {
  it("mappe la réponse snake_case vers le résultat camelCase", async () => {
    fetchMock.mockResolvedValue(httpResponse(200, successBody));

    await expect(composeChapterLayout(minimalParams)).resolves.toEqual({
      canvasId: "canvas-1",
      blocksCount: 4,
      bubblesCount: 2,
      panelHeight: 6400,
      modelUsed: "gemini-2.5-flash",
    });
  });

  it("appelle compose-chapter-layout en POST avec Authorization et apikey", async () => {
    fetchMock.mockResolvedValue(httpResponse(200, successBody));

    await composeChapterLayout(minimalParams);

    const { url, init } = sentRequest();
    expect(url).toBe("https://test.supabase.co/functions/v1/compose-chapter-layout");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer jwt-test",
      apikey: "test-publishable-key",
    });
  });

  it("rafraîchit la session avant l'appel réseau", async () => {
    fetchMock.mockResolvedValue(httpResponse(200, successBody));

    await composeChapterLayout(minimalParams);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(refreshSession.mock.invocationCallOrder[0]).toBeLessThan(
      fetchMock.mock.invocationCallOrder[0]
    );
  });
});

describe("composeChapterLayout — payload", () => {
  it("n'envoie que chapter_id et panels_outline pour des params minimaux", async () => {
    fetchMock.mockResolvedValue(httpResponse(200, successBody));

    await composeChapterLayout(minimalParams);

    expect(sentRequest().body).toEqual({
      chapter_id: "chap-1",
      panels_outline: [{ panel_number: 1, description: "Kira arrive en ville" }],
    });
  });

  it("transmet tous les champs optionnels fournis en snake_case", async () => {
    fetchMock.mockResolvedValue(httpResponse(200, successBody));
    const panelsOutline = [
      {
        panel_number: 1,
        block_number: 2,
        description: "Plan large du marché",
        text_excerpt: "La foule gronde.",
        locked: true,
        scene_type: "action",
        shot_type: "wide",
        effects: ["speed_lines"],
      },
    ];
    const existingBlocks = [{ prompt: "Kira de dos", image_url: "https://img/x.png", name: "B1" }];

    await composeChapterLayout({
      chapterId: "chap-1",
      panelsOutline,
      projectStyle: "manga-noir",
      characters: ["Kira", "Le Marchand"],
      chapterTitle: "Le marché flottant",
      chapterSynopsis: "Kira cherche un passeur.",
      chapterScenarioContent: "Contenu prose du chapitre",
      existingBlocks,
    });

    expect(sentRequest().body).toEqual({
      chapter_id: "chap-1",
      panels_outline: panelsOutline,
      project_style: "manga-noir",
      characters: ["Kira", "Le Marchand"],
      chapter_title: "Le marché flottant",
      chapter_synopsis: "Kira cherche un passeur.",
      chapter_scenario_content: "Contenu prose du chapitre",
      existing_blocks: existingBlocks,
    });
  });

  it("omet characters et existing_blocks quand les tableaux sont vides", async () => {
    fetchMock.mockResolvedValue(httpResponse(200, successBody));

    await composeChapterLayout({ ...minimalParams, characters: [], existingBlocks: [] });

    const { body } = sentRequest();
    expect(body).not.toHaveProperty("characters");
    expect(body).not.toHaveProperty("existing_blocks");
  });

  it("omet project_style quand projectStyle est null", async () => {
    fetchMock.mockResolvedValue(httpResponse(200, successBody));

    await composeChapterLayout({ ...minimalParams, projectStyle: null });

    expect(sentRequest().body).not.toHaveProperty("project_style");
  });
});

describe("composeChapterLayout — erreurs", () => {
  it("jette Session expirée sans appel réseau quand pas de token", async () => {
    mockSession(null);

    await expect(composeChapterLayout(minimalParams)).rejects.toThrow(
      "Session expirée — reconnectez-vous."
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("non-2xx avec error string → message de l'Edge Function", async () => {
    fetchMock.mockResolvedValue(httpResponse(422, { error: "panels_outline vide" }));

    const err = await composeChapterLayout(minimalParams).catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("panels_outline vide");
  });

  it("non-2xx avec error non-string → retombe sur message", async () => {
    fetchMock.mockResolvedValue(
      httpResponse(500, { error: { code: 13 }, message: "Composition impossible" })
    );

    const err = await composeChapterLayout(minimalParams).catch((e) => e);

    expect(err.message).toBe("Composition impossible");
  });

  it("non-2xx avec corps non-JSON → Erreur {status}", async () => {
    fetchMock.mockResolvedValue(httpResponse(500));

    const err = await composeChapterLayout(minimalParams).catch((e) => e);

    expect(err.message).toBe("Erreur 500");
  });

  it("propage l'erreur quand le réseau est down", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(composeChapterLayout(minimalParams)).rejects.toThrow("Failed to fetch");
  });
});
