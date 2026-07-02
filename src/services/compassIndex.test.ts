import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  triggerCompassIndex,
  triggerCompassPropose,
  fetchCompassProposals,
  fetchActiveLoreAssetProposals,
} from "@/services/compassIndex";

const { refreshSession, getSession, from } = vi.hoisted(() => ({
  refreshSession: vi.fn(),
  getSession: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { refreshSession, getSession }, from },
}));

const COMPASS_URL = "https://test.supabase.co/functions/v1/narramind-compass";

const fetchMock = vi.fn();

function mockSession(token: string | null = "jwt-test") {
  getSession.mockResolvedValue({
    data: { session: token !== null ? { access_token: token } : null },
  });
}

function httpResponse(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

function sentRequest() {
  const [url, init] = fetchMock.mock.calls[0];
  return { url, init, body: JSON.parse(init.body) };
}

function mockFromChain(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue(result),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  from.mockReturnValue(builder);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  vi.stubGlobal("fetch", fetchMock);
  refreshSession.mockResolvedValue({ data: {}, error: null });
  mockSession();
  fetchMock.mockResolvedValue(httpResponse(200));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── triggerCompassIndex ───────────────────────────────────────────

describe("triggerCompassIndex", () => {
  it("envoie le payload index complet avec Authorization et apikey", async () => {
    await triggerCompassIndex("proj-1", "chapter", "src-1", "Kira explore la cité.", "synopsis");

    const { url, init, body } = sentRequest();
    expect(url).toBe(COMPASS_URL);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer jwt-test",
      apikey: "test-publishable-key",
    });
    expect(body).toEqual({
      mode: "index",
      project_id: "proj-1",
      source_type: "chapter",
      source_id: "src-1",
      content: "Kira explore la cité.",
      section_key: "synopsis",
    });
  });

  it("omet section_key quand non fourni", async () => {
    await triggerCompassIndex("proj-1", "chapter", "src-1", "Contenu");

    expect(sentRequest().body).not.toHaveProperty("section_key");
  });

  it("ignore un contenu vide ou blanc sans toucher session ni réseau", async () => {
    await triggerCompassIndex("proj-1", "chapter", "src-1", "");
    await triggerCompassIndex("proj-1", "chapter", "src-1", "   ");

    expect(refreshSession).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retourne silencieusement sans réseau quand pas de session", async () => {
    mockSession(null);

    await expect(
      triggerCompassIndex("proj-1", "chapter", "src-1", "Contenu")
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ne throw jamais quand fetch échoue (fire-and-forget)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      triggerCompassIndex("proj-1", "chapter", "src-1", "Contenu")
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it("ne throw jamais quand refreshSession échoue", async () => {
    refreshSession.mockRejectedValue(new Error("refresh down"));

    await expect(
      triggerCompassIndex("proj-1", "chapter", "src-1", "Contenu")
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── triggerCompassPropose ─────────────────────────────────────────

describe("triggerCompassPropose", () => {
  it("envoie le payload propose avec proposal_type lore_asset", async () => {
    await triggerCompassPropose("proj-1", "Un passeur mystérieux apparaît.", "src-2");

    const { url, init, body } = sentRequest();
    expect(url).toBe(COMPASS_URL);
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer jwt-test",
      apikey: "test-publishable-key",
    });
    expect(body).toEqual({
      mode: "propose",
      project_id: "proj-1",
      context_text: "Un passeur mystérieux apparaît.",
      proposal_type: "lore_asset",
      source_id: "src-2",
    });
  });

  it("ignore un contexte vide sans toucher session ni réseau", async () => {
    await triggerCompassPropose("proj-1", "   ");

    expect(refreshSession).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retourne silencieusement sans réseau quand pas de session", async () => {
    mockSession(null);

    await expect(triggerCompassPropose("proj-1", "Contexte")).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ne throw jamais quand fetch échoue (fire-and-forget)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(triggerCompassPropose("proj-1", "Contexte")).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

// ── fetchCompassProposals ─────────────────────────────────────────

describe("fetchCompassProposals", () => {
  it("envoie le payload propose et retourne les propositions", async () => {
    const proposals = [{ id: "prop-1", title: "Le passeur", proposal_type: "narrative_direction" }];
    fetchMock.mockResolvedValue(httpResponse(200, { proposals }));

    await expect(
      fetchCompassProposals("proj-1", "narrative_direction", "Contexte du chapitre", "src-3")
    ).resolves.toEqual(proposals);

    const { url, init, body } = sentRequest();
    expect(url).toBe(COMPASS_URL);
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer jwt-test",
      apikey: "test-publishable-key",
    });
    expect(body).toEqual({
      mode: "propose",
      project_id: "proj-1",
      context_text: "Contexte du chapitre",
      proposal_type: "narrative_direction",
      source_id: "src-3",
    });
  });

  it("retourne [] quand la réponse ne contient pas proposals", async () => {
    fetchMock.mockResolvedValue(httpResponse(200, {}));

    await expect(fetchCompassProposals("proj-1", "lore_asset", "Contexte")).resolves.toEqual([]);
  });

  it("retourne [] sans appel réseau quand pas de session", async () => {
    mockSession(null);

    await expect(fetchCompassProposals("proj-1", "lore_asset", "Contexte")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throw CompassPropose error {status} sur non-2xx", async () => {
    fetchMock.mockResolvedValue(httpResponse(429, { error: "rate limited" }));

    await expect(fetchCompassProposals("proj-1", "lore_asset", "Contexte")).rejects.toThrow(
      "CompassPropose error 429"
    );
  });
});

// ── fetchActiveLoreAssetProposals ─────────────────────────────────

describe("fetchActiveLoreAssetProposals", () => {
  it("lit compass_proposals filtré sur project_id + lore_asset + active, tri décroissant", async () => {
    const rows = [{ id: "prop-1", title: "Le passeur" }];
    const builder = mockFromChain({ data: rows, error: null });

    await expect(fetchActiveLoreAssetProposals("proj-1")).resolves.toEqual(rows);

    expect(from).toHaveBeenCalledWith("compass_proposals");
    expect(builder.eq.mock.calls).toEqual([
      ["project_id", "proj-1"],
      ["proposal_type", "lore_asset"],
      ["status", "active"],
    ]);
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("retourne [] quand data est null", async () => {
    mockFromChain({ data: null, error: null });

    await expect(fetchActiveLoreAssetProposals("proj-1")).resolves.toEqual([]);
  });

  it("propage l'erreur Supabase (RLS, réseau)", async () => {
    const dbError = new Error("permission denied for table compass_proposals");
    mockFromChain({ data: null, error: dbError });

    await expect(fetchActiveLoreAssetProposals("proj-1")).rejects.toBe(dbError);
  });
});
