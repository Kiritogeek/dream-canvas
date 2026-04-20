type Primitive = string | number | boolean | null | undefined;

function sanitizeValue(value: unknown): unknown {
  if (value == null) return value as Primitive;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeValue(v);
    }
    return out;
  }
  return String(value);
}

export function logGenerationFailure(
  scope: string,
  context: Record<string, unknown>,
  error: unknown
): void {
  const err =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack ?? "",
        }
      : { message: String(error) };

  console.error(`[DreamWeave][${scope}] Generation failed`, {
    context: sanitizeValue(context),
    error: sanitizeValue(err),
    at: new Date().toISOString(),
  });
}

export function logGenerationInfo(
  scope: string,
  context: Record<string, unknown>
): void {
  if (!import.meta.env.DEV) return;
  console.info(`[DreamWeave][${scope}]`, sanitizeValue(context));
}
