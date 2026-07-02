// Parsing robuste du JSON retourné par les LLM — partagé par
// generate-scenario-ai et narramind-compass. Fonctions pures string→string
// (aucune API Deno), testables sous Vitest sans runtime Deno.

// ── Extraction robuste d'un objet JSON depuis une réponse LLM ───
// WHY : même avec response_format, Gemini peut occasionnellement entourer
// le JSON de fences markdown (```json ... ```) ou ajouter du texte. Cette
// fonction extrait le premier objet JSON balanced du texte reçu.
export function extractJsonObject(raw: string): string {
  let s = raw.trim();
  // Enlever les fences markdown éventuels
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  // Trouver le premier { et son } correspondant (équilibrage des accolades
  // en ignorant les chaînes JSON).
  const start = s.indexOf("{");
  if (start < 0) return s;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  // Pas équilibré : retourner depuis le premier { (tryClosePanelsJson tentera de réparer)
  return s.slice(start);
}

// ── Réparer un JSON panels tronqué (fermeture des chaînes/objets) ─
export function tryClosePanelsJson(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return trimmed;
  // Si déjà valide, retour tel quel
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // ignore
  }
  // Tronqué souvent en milieu de chaîne : fermer " puis }} ] }
  const suffixes = ['"}}]}', '"}]}', '"]}', '"}'];
  for (const suf of suffixes) {
    try {
      const closed = trimmed + suf;
      JSON.parse(closed);
      return closed;
    } catch {
      // continue
    }
  }
  return trimmed;
}
