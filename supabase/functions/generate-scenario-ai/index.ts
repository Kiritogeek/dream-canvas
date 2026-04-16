// Edge Function: IA Scénario & IA Chapitre via Groq (Llama 3.3 70B)
// Secrets requis :
//   - GROQ_API_KEY (Supabase → Edge Functions → Secrets)
//
// Deux modes :
//   "scenario" → IA Scénario (scénariste, au service de l'UTILISATEUR)
//   "chapter"  → IA Chapitre (éditeur, au service du LECTEUR)

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

import {
  SCENARIO_SYSTEM_PROMPT,
  buildScenarioPrompt,
} from "./system-prompts/scenario.ts";
import {
  CHAPTER_SYSTEM_PROMPT,
  buildChapterPrompt,
} from "./system-prompts/chapter.ts";
import {
  PANELS_SYSTEM_PROMPT,
  buildPanelsPrompt,
} from "./system-prompts/panels.ts";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_TIMEOUT_MS = 120_000;
// Limite TPM observée côté org Groq (capture utilisateur : 12k).
// On garde une marge pour éviter les rejets "Request too large".
const GROQ_TPM_LIMIT = 12_000;
const GROQ_SAFE_INPUT_TOKENS = 8_500;
const GROQ_MIN_OUTPUT_TOKENS = 512;
const GROQ_MAX_OUTPUT_TOKENS = 3_072;

// ── CORS ──────────────────────────────────────────────────────

function getCorsHeaders(): Record<string, string> {
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN")?.trim();
  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
  });
}

function estimateTokens(text: string): number {
  // Approximation conservative pour FR/EN (4 chars ≈ 1 token).
  return Math.ceil(text.length / 4);
}

function shrinkTextByTokens(text: string, maxTokens: number): string {
  if (maxTokens <= 0) return "";
  const estimated = estimateTokens(text);
  if (estimated <= maxTokens) return text;
  const maxChars = Math.max(0, maxTokens * 4);
  return text.slice(0, maxChars);
}

function clampOutputTokens(inputTokens: number): number {
  const remaining = GROQ_TPM_LIMIT - inputTokens;
  const safeRemaining = Math.max(0, remaining - 500);
  return Math.max(
    GROQ_MIN_OUTPUT_TOKENS,
    Math.min(GROQ_MAX_OUTPUT_TOKENS, safeRemaining)
  );
}

// ═══════════════════════════════════════════════════════════════
// VÉRIFICATION JWT
// ═══════════════════════════════════════════════════════════════

async function verifyUserFromToken(
  authHeader: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;

    // L'endpoint /auth/v1/user attend la clé ANON pour valider un JWT utilisateur
    // (la service_role peut échouer selon la config Supabase)
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = anonKey || serviceKey;

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: apiKey,
      },
    });

    if (!res.ok) return null;
    const user = await res.json();
    return typeof user?.id === "string" ? user.id : null;
  } catch {
    return null;
  }
}

// ── Réparer un JSON panels tronqué (fermeture des chaînes/objets) ─
function tryClosePanelsJson(raw: string): string {
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

// ═══════════════════════════════════════════════════════════════
// APPEL GROQ (LLAMA 3.3 70B)
// ═══════════════════════════════════════════════════════════════

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  groqKey: string
): Promise<{ text: string } | { error: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const systemTokens = estimateTokens(systemPrompt);
    const userTokens = estimateTokens(userPrompt);
    const totalInputTokens = systemTokens + userTokens;
    const outputTokens = clampOutputTokens(totalInputTokens);

    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: outputTokens,
        top_p: 0.9,
      }),
      signal: controller.signal,
    });

    const raw = await res.text();

    if (!res.ok) {
      console.error("[generate-scenario-ai] Groq erreur:", res.status, raw.slice(0, 300));
      return {
        error: `Groq erreur ${res.status}: ${raw.slice(0, 200)}`,
      };
    }

    let json: {
      choices?: Array<{ message?: { content?: string } }>;
    };
    try {
      json = JSON.parse(raw);
    } catch {
      return { error: "Réponse invalide de Groq" };
    }

    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { error: "Groq n'a pas retourné de texte" };
    }

    return { text };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Timeout : la génération a pris trop de temps." };
    }
    return {
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN")?.trim();
  if (!allowedOrigin) {
    return jsonResponse(
      {
        error:
          "ALLOWED_ORIGIN non configurée. Configurez ce secret pour autoriser les requêtes CORS.",
      },
      500
    );
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders() });
  }

  try {
    // 1. Vérification GROQ_API_KEY
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return jsonResponse(
        {
          error:
            "GROQ_API_KEY non configurée. Supabase → Edge Functions → Secrets → ajouter GROQ_API_KEY.",
        },
        500
      );
    }

    // 2. Vérification Supabase config
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "Config Supabase manquante" }, 500);
    }

    // 3. Vérification JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization manquante" }, 401);
    }

    const userId = await verifyUserFromToken(
      authHeader,
      supabaseUrl,
      serviceKey
    );
    if (!userId) {
      return jsonResponse({ error: "JWT invalide ou expiré" }, 401);
    }

    // 4. Parse body
    let body: {
      mode?: "scenario" | "chapter" | "panels";
      prompt?: string;
      num_chapters?: number;
      existing_content?: string;
      project_description?: string;
      chapter_title?: string;
      chapter_content?: string;
      chapter_number?: number;
      target_panel_count?: number;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return jsonResponse({ error: "Body JSON invalide" }, 400);
    }

    const { mode, prompt } = body;
    if (!mode || !["scenario", "chapter", "panels"].includes(mode)) {
      return jsonResponse(
        { error: 'Le champ "mode" est requis ("scenario", "chapter" ou "panels").' },
        400
      );
    }
    if (mode !== "panels" && !prompt?.trim()) {
      return jsonResponse(
        { error: "Le champ \"prompt\" est requis (votre instruction)." },
        400
      );
    }

    // 5. Construire system + user prompt selon le mode
    let systemPrompt: string;
    let userPrompt: string;
    let inputWasTrimmed = false;

    if (mode === "scenario") {
      systemPrompt = SCENARIO_SYSTEM_PROMPT;
      const scenarioContext = body.existing_content?.trim();
      const safeExistingContent = scenarioContext
        ? shrinkTextByTokens(scenarioContext, 4_000)
        : undefined;
      inputWasTrimmed = safeExistingContent !== scenarioContext;
      userPrompt = buildScenarioPrompt(prompt!, {
        existingContent: safeExistingContent,
        projectDescription: body.project_description,
      });
    } else if (mode === "chapter") {
      if (!body.chapter_content?.trim()) {
        return jsonResponse(
          {
            error:
              "Le champ \"chapter_content\" est requis pour le mode chapitre (contenu intégral du chapitre à réviser).",
          },
          400
        );
      }
      systemPrompt = CHAPTER_SYSTEM_PROMPT;
      const chapterContent = body.chapter_content.trim();
      const safeChapterContent = shrinkTextByTokens(chapterContent, 6_500);
      inputWasTrimmed = safeChapterContent !== chapterContent;
      userPrompt = buildChapterPrompt(prompt!, {
        chapterTitle: body.chapter_title ?? "Sans titre",
        chapterContent: safeChapterContent,
        chapterNumber: body.chapter_number,
      });
    } else {
      // mode === "panels"
      if (!body.chapter_content?.trim()) {
        return jsonResponse(
          {
            error:
              "Le champ \"chapter_content\" est requis pour le mode panels (contenu du chapitre à découper).",
          },
          400
        );
      }
      systemPrompt = PANELS_SYSTEM_PROMPT;
      const chapterContent = body.chapter_content.trim();
      const safeChapterContent = shrinkTextByTokens(chapterContent, 6_000);
      inputWasTrimmed = safeChapterContent !== chapterContent;
      userPrompt = buildPanelsPrompt({
        chapterTitle: body.chapter_title ?? "Sans titre",
        chapterContent: safeChapterContent,
        chapterNumber: body.chapter_number,
        targetPanelCount: body.target_panel_count,
      });
    }

    const systemTokens = estimateTokens(systemPrompt);
    const userTokens = estimateTokens(userPrompt);
    const totalInputTokens = systemTokens + userTokens;
    if (totalInputTokens > GROQ_SAFE_INPUT_TOKENS) {
      // Deuxième passe de sécurité si les prompts construits sont encore trop longs.
      const allowedUserTokens = Math.max(
        1_000,
        GROQ_SAFE_INPUT_TOKENS - systemTokens
      );
      const shrunkUserPrompt = shrinkTextByTokens(userPrompt, allowedUserTokens);
      inputWasTrimmed = inputWasTrimmed || shrunkUserPrompt !== userPrompt;
      userPrompt = shrunkUserPrompt;
    }

    // 6. Appel Groq
    console.log(
      `[generate-scenario-ai] mode=${mode}, user=${userId}, prompt_length=${userPrompt.length}, trimmed=${inputWasTrimmed}`
    );

    const result = await callGroq(systemPrompt, userPrompt, groqKey);

    if ("error" in result) {
      return jsonResponse(
        { error: "Échec génération IA", details: result.error },
        502
      );
    }

    // Mode panels : parser le JSON et retourner { panels }
    if (mode === "panels") {
      const cleaned = result.text.replace(/^[\s\S]*?\{/, "{").trim();
      let parsed: { panels?: Array<{ description: string; context?: { lieu?: string; scene?: string; personnages?: string } }> };

      try {
        // Tenter parse direct
        const closed = tryClosePanelsJson(cleaned);
        parsed = JSON.parse(closed) as typeof parsed;
      } catch {
        // Réponse tronquée ou invalide : message clair (sans renvoyer le JSON brut)
        return jsonResponse(
          {
            error:
              "La réponse de l'IA est tronquée ou invalide. Réessayez avec un chapitre plus court ou une cible de panels plus faible.",
          },
          502
        );
      }
      const panels = Array.isArray(parsed.panels) ? parsed.panels : [];
      return jsonResponse(
        { panels, mode, model: GROQ_MODEL },
        200
      );
    }

    return jsonResponse(
      {
        text: result.text,
        mode,
        model: GROQ_MODEL,
      },
      200
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-scenario-ai] Exception:", msg);
    return jsonResponse({ error: "Erreur serveur", details: msg }, 500);
  }
});
