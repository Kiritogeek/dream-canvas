import { describe, it, expect } from "vitest";
import { messageFromFunctionsInvokeError } from "@/lib/edgeFunctionInvokeError";

function errorWithResponse(body: string, init?: ResponseInit): Error & { context: Response } {
  const err = new Error("Edge Function returned a non-2xx status code") as Error & { context: Response };
  err.context = new Response(body, init);
  return err;
}

describe("messageFromFunctionsInvokeError — entrées non-objet", () => {
  it("retourne String(error) pour une chaîne", async () => {
    expect(await messageFromFunctionsInvokeError("boom")).toBe("boom");
  });

  it('retourne "null" pour null', async () => {
    expect(await messageFromFunctionsInvokeError(null)).toBe("null");
  });

  it('retourne "undefined" pour undefined', async () => {
    expect(await messageFromFunctionsInvokeError(undefined)).toBe("undefined");
  });

  it("retourne String(error) pour un nombre", async () => {
    expect(await messageFromFunctionsInvokeError(42)).toBe("42");
  });
});

describe("messageFromFunctionsInvokeError — corps JSON du Response", () => {
  it("extrait details en priorité sur error et message", async () => {
    const err = errorWithResponse(JSON.stringify({ details: "D", error: "E", message: "M" }), { status: 500 });
    expect(await messageFromFunctionsInvokeError(err)).toBe("D");
  });

  it("retombe sur error quand details est absent", async () => {
    const err = errorWithResponse(JSON.stringify({ error: "E", message: "M" }));
    expect(await messageFromFunctionsInvokeError(err)).toBe("E");
  });

  it("retombe sur message quand details et error sont absents", async () => {
    const err = errorWithResponse(JSON.stringify({ message: "M" }));
    expect(await messageFromFunctionsInvokeError(err)).toBe("M");
  });

  it("ajoute request_id quand présent", async () => {
    const err = errorWithResponse(JSON.stringify({ error: "Quota dépassé", request_id: "req_123" }));
    expect(await messageFromFunctionsInvokeError(err)).toBe("Quota dépassé (request_id: req_123)");
  });

  it("ignore un request_id vide / espaces", async () => {
    const err = errorWithResponse(JSON.stringify({ error: "E", request_id: "   " }));
    expect(await messageFromFunctionsInvokeError(err)).toBe("E");
  });

  it("sérialise un piece objet en JSON", async () => {
    const err = errorWithResponse(JSON.stringify({ error: { code: 1 } }));
    expect(await messageFromFunctionsInvokeError(err)).toBe('{"code":1}');
  });

  it("sérialise un piece objet + request_id", async () => {
    const err = errorWithResponse(JSON.stringify({ error: { code: 1 }, request_id: "r1" }));
    expect(await messageFromFunctionsInvokeError(err)).toBe('{"code":1} (request_id: r1)');
  });

  it("convertit un piece numérique en chaîne", async () => {
    const err = errorWithResponse(JSON.stringify({ error: 42 }));
    expect(await messageFromFunctionsInvokeError(err)).toBe("42");
  });

  it("retourne le texte brut si le JSON ne contient ni details/error/message", async () => {
    const err = errorWithResponse(JSON.stringify({ foo: "bar" }));
    expect(await messageFromFunctionsInvokeError(err)).toBe('{"foo":"bar"}');
  });
});

describe("messageFromFunctionsInvokeError — corps non-JSON du Response", () => {
  it("retourne le texte brut", async () => {
    const err = errorWithResponse("Internal Server Error", { status: 500 });
    expect(await messageFromFunctionsInvokeError(err)).toBe("Internal Server Error");
  });

  it("tronque à 800 caractères + ellipse", async () => {
    const long = "x".repeat(1000);
    const out = await messageFromFunctionsInvokeError(errorWithResponse(long));
    expect(out).toBe(`${"x".repeat(800)}…`);
    expect(out.length).toBe(801);
  });
});

describe("messageFromFunctionsInvokeError — repli message / défaut", () => {
  it("utilise err.message si le Response est vide", async () => {
    const err = errorWithResponse("   ");
    err.message = "message de repli";
    expect(await messageFromFunctionsInvokeError(err)).toBe("message de repli");
  });

  it("utilise err.message quand il n'y a pas de context Response", async () => {
    expect(await messageFromFunctionsInvokeError(new Error("boom réseau"))).toBe("boom réseau");
  });

  it("retourne le message générique pour un objet sans message ni context", async () => {
    expect(await messageFromFunctionsInvokeError({})).toBe("Erreur lors de l'appel à la fonction edge.");
  });
});
