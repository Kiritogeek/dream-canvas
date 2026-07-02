import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  callScenarioAI,
  callDetectBlocks,
  callGenerateAiSummary,
  callSuggestBlockPrompt,
  generateNarrativeDirections,
  triggerNarraMindUpdate,
} from "@/services/scenarioAI";

const { refreshSession, getSession } = vi.hoisted(() => ({
  refreshSession: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { refreshSession, getSession } },
}));

const MSG_401 =
  "Session expirée ou invalide. Déconnectez-vous puis reconnectez-vous pour utiliser l'IA.";

const fetchMock = vi.fn();

function mockSession(token: string | null = "jwt-test") {
  getSession.mockResolvedValue({
    data: { session: token !== null ? { access_token: token } : null },
  });
}

function httpResponse(status: number, body?: unknown, statusText = "") {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
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

const scenarioPayload = {
  mode: "scenario" as const,
  prompt: "Un héros découvre une cité engloutie",
  project_id: "proj-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  vi.stubGlobal("fetch", fetchMock);
  refreshSession.mockResolvedValue({ data: {}, error: null });
  mockSession();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── 200 nominal ───────────────────────────────────────────────────

describe("callScenarioAI — 200 nominal", () => {
  it("retourne la réponse parsée de l'Edge Function", async () => {
    const response = { text: "Chapitre 1 : La cité", mode: "scenario", model: "gemini-2.5-flash" };
    fetchMock.mockResolvedValue(httpResponse(200, response));

    await expect(callScenarioAI(scenarioPayload)).resolves.toEqual(response);
  });

  it("appelle generate-scenario-ai en POST avec Authorization et apikey", async () => {
    fetchMock.mockResolvedValue(httpResponse(200, { text: "ok", mode: "scenario", model: "m" }));

    await callScenarioAI(scenarioPayload);

    const { url, init } = sentRequest();
    expect(url).toBe("https://test.supabase.co/functions/v1/generate-scenario-ai");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer jwt-test",
      apikey: "test-publishable-key",
    });
  });

  it("rafraîchit la session avant l'appel réseau", async () => {
    fetchMock.mockResolvedValue(httpResponse(200, { text: "ok", mode: "scenario", model: "m" }));

    await callScenarioAI(scenarioPayload);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(refreshSession.mock.invocationCallOrder[0]).toBeLessThan(
      fetchMock.mock.invocationCallOrder[0]
    );
  });

  it("envoie le payload scenario tel quel (mode + project_id inclus)", async () => {
    fetchMock.mockResolvedValue(httpResponse(200, { text: "ok", mode: "scenario", model: "m" }));

    await callScenarioAI(scenarioPayload);

    expect(sentRequest().body).toEqual({
      mode: "scenario",
      prompt: "Un héros découvre une cité engloutie",
      project_id: "proj-1",
    });
  });

  it("envoie le payload chapter complet", async () => {
    fetchMock.mockResolvedValue(httpResponse(200, { text: "ok", mode: "chapter", model: "m" }));
    const chapterPayload = {
      mode: "chapter" as const,
      prompt: "Continue la scène du marché",
      chapter_title: "Le marché flottant",
      chapter_content: "Kira se faufile entre les étals...",
      chapter_number: 3,
      project_id: "proj-1",
    };

    await callScenarioAI(chapterPayload);

    expect(sentRequest().body).toEqual(chapterPayload);
  });
});

// ── Session absente ───────────────────────────────────────────────

describe("callScenarioAI — session absente", () => {
  it("jette MSG_401 sans appel réseau quand aucune session", async () => {
    mockSession(null);

    const err = await callScenarioAI(scenarioPayload).catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(MSG_401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("jette MSG_401 quand access_token est vide", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "" } } });

    await expect(callScenarioAI(scenarioPayload)).rejects.toThrow(MSG_401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── Mapping des erreurs HTTP ──────────────────────────────────────

describe("callScenarioAI — mapping des erreurs HTTP", () => {
  it("401 → MSG_401 exact, sans fuite du corps brut", async () => {
    fetchMock.mockResolvedValue(httpResponse(401, { error: "JWT expired", code: 401 }));

    const err = await callScenarioAI(scenarioPayload).catch((e) => e);

    expect(err.message).toBe(MSG_401);
  });

  it("429 → message court de l'Edge Function", async () => {
    fetchMock.mockResolvedValue(
      httpResponse(429, { error: "Limite quotidienne IA atteinte (50/jour).", rateLimited: true })
    );

    const err = await callScenarioAI(scenarioPayload).catch((e) => e);

    expect(err.message).toBe("Limite quotidienne IA atteinte (50/jour).");
  });

  it("429 sans corps exploitable → message court par défaut", async () => {
    fetchMock.mockResolvedValue(httpResponse(429));

    const err = await callScenarioAI(scenarioPayload).catch((e) => e);

    expect(err.message).toBe("Limite quotidienne IA atteinte. Réessayez dans quelques heures.");
  });

  it("flag rateLimited sur un autre statut → message court aussi", async () => {
    fetchMock.mockResolvedValue(
      httpResponse(400, { rateLimited: true, error: "TPM Groq atteint. Réessayez dans 1 minute." })
    );

    const err = await callScenarioAI(scenarioPayload).catch((e) => e);

    expect(err.message).toBe("TPM Groq atteint. Réessayez dans 1 minute.");
  });

  it("5xx avec request_id → request_id dans le message", async () => {
    fetchMock.mockResolvedValue(
      httpResponse(500, {
        error: "Erreur interne",
        details: "Gemini timeout",
        request_id: "req_abc123",
      })
    );

    const err = await callScenarioAI(scenarioPayload).catch((e) => e);

    expect(err.message).toBe("Erreur interne — Gemini timeout (request_id: req_abc123)");
  });

  it("5xx avec error seul → message brut sans décor", async () => {
    fetchMock.mockResolvedValue(httpResponse(500, { error: "Erreur interne" }));

    const err = await callScenarioAI(scenarioPayload).catch((e) => e);

    expect(err.message).toBe("Erreur interne");
  });

  it("5xx avec error non-string → statusText en secours", async () => {
    fetchMock.mockResolvedValue(
      httpResponse(503, { error: 42, request_id: "req_z9" }, "Service Unavailable")
    );

    const err = await callScenarioAI(scenarioPayload).catch((e) => e);

    expect(err.message).toBe("Service Unavailable (request_id: req_z9)");
  });

  it("request_id composé d'espaces → ignoré", async () => {
    fetchMock.mockResolvedValue(httpResponse(500, { error: "Erreur interne", request_id: "   " }));

    const err = await callScenarioAI(scenarioPayload).catch((e) => e);

    expect(err.message).toBe("Erreur interne");
  });

  it("5xx corps non-JSON et statusText vide → Erreur serveur (status)", async () => {
    fetchMock.mockResolvedValue(httpResponse(500));

    const err = await callScenarioAI(scenarioPayload).catch((e) => e);

    expect(err.message).toBe("Erreur serveur (500)");
  });
});

// ── Réseau ────────────────────────────────────────────────────────

describe("callScenarioAI — réseau", () => {
  it("propage l'erreur quand le réseau est down", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(callScenarioAI(scenarioPayload)).rejects.toThrow("Failed to fetch");
  });

  it("200 avec corps non-JSON → objet vide, pas de crash", async () => {
    fetchMock.mockResolvedValue(httpResponse(200));

    await expect(callScenarioAI(scenarioPayload)).resolves.toEqual({});
  });
});

// ── Modes exposés ─────────────────────────────────────────────────

describe("modes exposés", () => {
  it("callDetectBlocks envoie mode detect_blocks avec le contexte complet", async () => {
    const response = {
      blocks: [{ panel_number: 1, description: "Kira sur le toit", text_excerpt: "Elle saute." }],
      mode: "detect_blocks",
      model: "m",
    };
    fetchMock.mockResolvedValue(httpResponse(200, response));
    const payload = {
      mode: "detect_blocks" as const,
      chapter_content: "Elle saute de toit en toit sous la pluie.",
      chapter_title: "Pluie",
      chapter_number: 2,
      target_panel_count: 8,
      assets_context: "Kira (character)",
      universe_lore: "Cité flottante de Nérée",
    };

    await expect(callDetectBlocks(payload)).resolves.toEqual(response);
    expect(sentRequest().body).toEqual(payload);
  });

  it("callGenerateAiSummary envoie mode ai_summary", async () => {
    const response = { text: "Résumé compact", mode: "ai_summary", model: "m" };
    fetchMock.mockResolvedValue(httpResponse(200, response));
    const payload = {
      mode: "ai_summary" as const,
      chapter_content: "Long chapitre...",
      chapter_number: 1,
    };

    await expect(callGenerateAiSummary(payload)).resolves.toEqual(response);
    expect(sentRequest().body).toEqual(payload);
  });

  it("callSuggestBlockPrompt envoie mode suggest_block_prompt", async () => {
    const response = { text: "Plan large de la cité", mode: "suggest_block_prompt", model: "m" };
    fetchMock.mockResolvedValue(httpResponse(200, response));
    const payload = {
      mode: "suggest_block_prompt" as const,
      chapter_content: "Le chapitre en prose",
      previous_prompts: ["Gros plan sur Kira"],
    };

    await expect(callSuggestBlockPrompt(payload)).resolves.toEqual(response);
    expect(sentRequest().body).toEqual(payload);
  });

  it("generateNarrativeDirections construit le payload depuis les arguments", async () => {
    const response = {
      directions: [{ title: "La trahison", body: "Et si..." }],
      mode: "narrative_directions",
      model: "m",
    };
    fetchMock.mockResolvedValue(httpResponse(200, response));

    await expect(generateNarrativeDirections("proj-9", 4)).resolves.toEqual(response);
    expect(sentRequest().body).toEqual({
      mode: "narrative_directions",
      project_id: "proj-9",
      chapter_number: 4,
    });
  });

  it("generateNarrativeDirections omet chapter_number quand non fourni", async () => {
    fetchMock.mockResolvedValue(
      httpResponse(200, { directions: [], mode: "narrative_directions", model: "m" })
    );

    await generateNarrativeDirections("proj-9");

    expect(sentRequest().body).toEqual({ mode: "narrative_directions", project_id: "proj-9" });
  });
});

// ── triggerNarraMindUpdate ────────────────────────────────────────

describe("triggerNarraMindUpdate", () => {
  it("appelle narramind-update avec Authorization + apikey et retourne la réponse", async () => {
    const response = {
      success: true,
      summary: "Résumé",
      entities_updated: 2,
      anomalies: [],
      total_context_tokens: 1200,
      needs_compression: false,
    };
    fetchMock.mockResolvedValue(httpResponse(200, response));

    await expect(triggerNarraMindUpdate("proj-1", "chap-1")).resolves.toEqual(response);

    const { url, init, body } = sentRequest();
    expect(url).toBe("https://test.supabase.co/functions/v1/narramind-update");
    expect(init.headers.Authorization).toBe("Bearer jwt-test");
    expect(init.headers.apikey).toBe("test-publishable-key");
    expect(body).toEqual({ project_id: "proj-1", chapter_id: "chap-1" });
  });

  it("jette Session expirée sans appel réseau quand pas de session", async () => {
    mockSession(null);

    await expect(triggerNarraMindUpdate("proj-1", "chap-1")).rejects.toThrow("Session expirée.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("compose le message d'erreur avec error, details et finish_reason", async () => {
    fetchMock.mockResolvedValue(
      httpResponse(500, {
        error: "Génération interrompue",
        details: "Contexte trop long",
        finish_reason: "length",
      })
    );

    const err = await triggerNarraMindUpdate("proj-1", "chap-1").catch((e) => e);

    expect(err.message).toBe("Génération interrompue — Contexte trop long — Arrêt : length");
  });

  it("retombe sur Erreur {status} quand le corps est vide", async () => {
    fetchMock.mockResolvedValue(httpResponse(502, {}));

    const err = await triggerNarraMindUpdate("proj-1", "chap-1").catch((e) => e);

    expect(err.message).toBe("Erreur 502");
  });
});
