declare const Deno: { env: { get: (key: string) => string | undefined } };

export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const raw = Deno.env.get("ALLOWED_ORIGIN")?.trim() ?? "";
  const allowed = raw.split(",").map((o) => o.trim()).filter(Boolean);
  const matched =
    requestOrigin && allowed.includes(requestOrigin)
      ? requestOrigin
      : (allowed[0] ?? "");
  return {
    ...(matched ? { "Access-Control-Allow-Origin": matched } : {}),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

export function makeJsonResponse(requestOrigin: string | null) {
  return (body: object, status: number): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        ...getCorsHeaders(requestOrigin),
        "Content-Type": "application/json",
      },
    });
}

export function isAllowedOriginConfigured(): boolean {
  return !!(Deno.env.get("ALLOWED_ORIGIN")?.trim());
}
