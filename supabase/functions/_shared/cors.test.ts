import { describe, it, expect, vi, afterEach } from "vitest";
import { getCorsHeaders, makeJsonResponse, isAllowedOriginConfigured } from "./cors";

function stubAllowedOrigin(value: string | undefined) {
  vi.stubGlobal("Deno", {
    env: { get: (key: string) => (key === "ALLOWED_ORIGIN" ? value : undefined) },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getCorsHeaders", () => {
  it("origin de la requête autorisée → renvoyée dans Allow-Origin", () => {
    stubAllowedOrigin("https://dreamweave.app");
    expect(getCorsHeaders("https://dreamweave.app")["Access-Control-Allow-Origin"]).toBe(
      "https://dreamweave.app",
    );
  });

  it("origin non listée → retombe sur la première origin configurée, jamais l'origin appelante", () => {
    stubAllowedOrigin("https://dreamweave.app,https://preview.dreamweave.app");
    expect(getCorsHeaders("https://attaquant.evil")["Access-Control-Allow-Origin"]).toBe(
      "https://dreamweave.app",
    );
  });

  it("origin absente (null) → première origin configurée", () => {
    stubAllowedOrigin("https://dreamweave.app,https://preview.dreamweave.app");
    expect(getCorsHeaders(null)["Access-Control-Allow-Origin"]).toBe("https://dreamweave.app");
  });

  it("origin absente (undefined) → première origin configurée", () => {
    stubAllowedOrigin("https://dreamweave.app");
    expect(getCorsHeaders()["Access-Control-Allow-Origin"]).toBe("https://dreamweave.app");
  });

  it("liste multi-origins avec espaces → match après trim", () => {
    stubAllowedOrigin(" https://dreamweave.app , https://preview.dreamweave.app ");
    expect(getCorsHeaders("https://preview.dreamweave.app")["Access-Control-Allow-Origin"]).toBe(
      "https://preview.dreamweave.app",
    );
  });

  it("ALLOWED_ORIGIN non configurée → aucun header Allow-Origin (deny par défaut)", () => {
    stubAllowedOrigin(undefined);
    const headers = getCorsHeaders("https://dreamweave.app");
    expect(headers).not.toHaveProperty("Access-Control-Allow-Origin");
  });

  it("ALLOWED_ORIGIN vide ou espaces → traité comme non configuré", () => {
    stubAllowedOrigin("   ");
    expect(getCorsHeaders("https://dreamweave.app")).not.toHaveProperty(
      "Access-Control-Allow-Origin",
    );
  });

  it("headers communs toujours présents (Allow-Headers + Vary: Origin), même sans config", () => {
    stubAllowedOrigin(undefined);
    expect(getCorsHeaders(null)).toEqual({
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Vary": "Origin",
    });
  });
});

describe("makeJsonResponse", () => {
  it("sérialise le body avec le status, Content-Type JSON et les headers CORS", async () => {
    stubAllowedOrigin("https://dreamweave.app");
    const json = makeJsonResponse("https://dreamweave.app");
    const res = json({ error: "quota atteint" }, 429);
    expect(res.status).toBe(429);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://dreamweave.app");
    expect(res.headers.get("Vary")).toBe("Origin");
    expect(await res.json()).toEqual({ error: "quota atteint" });
  });

  it("origin refusée → la réponse porte la première origin configurée", () => {
    stubAllowedOrigin("https://dreamweave.app,https://preview.dreamweave.app");
    const res = makeJsonResponse("https://attaquant.evil")({ ok: true }, 200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://dreamweave.app");
  });
});

describe("isAllowedOriginConfigured", () => {
  it("valeur non vide → true", () => {
    stubAllowedOrigin("https://dreamweave.app");
    expect(isAllowedOriginConfigured()).toBe(true);
  });

  it("variable absente → false", () => {
    stubAllowedOrigin(undefined);
    expect(isAllowedOriginConfigured()).toBe(false);
  });

  it("espaces seuls → false", () => {
    stubAllowedOrigin("   ");
    expect(isAllowedOriginConfigured()).toBe(false);
  });
});
