/**
 * Message lisible depuis l'erreur de supabase.functions.invoke().
 * Le SDK utilise souvent le libellé générique « Edge Function returned a non-2xx status code »
 * alors que le corps JSON contient error / details.
 */
export async function messageFromFunctionsInvokeError(
  error: unknown
): Promise<string> {
  if (!(error && typeof error === "object")) {
    return String(error);
  }

  const err = error as Error & { name?: string; context?: unknown };

  const ctx = err.context;
  if (ctx instanceof Response) {
    const text = await ctx.clone().text();
    if (text.trim()) {
      try {
        const json = JSON.parse(text) as {
          details?: unknown;
          error?: unknown;
          message?: unknown;
        };
        const piece = json.details ?? json.error ?? json.message;
        if (typeof piece === "string" && piece.trim()) return piece.trim();
        if (piece !== undefined && piece !== null)
          return typeof piece === "object"
            ? JSON.stringify(piece)
            : String(piece);
      } catch {
        /* pas du JSON */
      }
      return text.length > 800 ? `${text.slice(0, 800)}…` : text;
    }
  }

  if (typeof err.message === "string" && err.message.trim()) {
    return err.message.trim();
  }

  return "Erreur lors de l'appel à la fonction edge.";
}
