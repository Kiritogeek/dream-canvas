declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

const AI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const AI_MODEL = "gemini-2.5-flash";
const AI_FALLBACK_MODEL = "gemini-2.0-flash";
const AI_TIMEOUT_MS = 60_000;

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
  return Math.ceil(text.length / 4);
}

async function verifyUserFromToken(
  authHeader: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;
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

Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN")?.trim();
  if (!allowedOrigin) {
    return jsonResponse(
      { error: "ALLOWED_ORIGIN non configurée." },
      500
    );
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders() });
  }

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return jsonResponse({ error: "GEMINI_API_KEY non configurée." }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "Config Supabase manquante." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization manquante." }, 401);
    }

    const userId = await verifyUserFromToken(authHeader, supabaseUrl, serviceKey);
    if (!userId) {
      return jsonResponse({ error: "JWT invalide ou expiré." }, 401);
    }

    let body: { project_id?: string; chapter_id?: string; user_id?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return jsonResponse({ error: "Body JSON invalide." }, 400);
    }

    const { project_id, chapter_id } = body;
    if (!project_id || !chapter_id) {
      return jsonResponse(
        { error: '"project_id" et "chapter_id" sont requis.' },
        400
      );
    }

    const dbHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    // 1. Récupérer le chapitre
    const chapterRes = await fetch(
      `${supabaseUrl}/rest/v1/scenario_chapters?id=eq.${chapter_id}&select=*`,
      { headers: dbHeaders }
    );
    if (!chapterRes.ok) {
      return jsonResponse({ error: "Impossible de récupérer le chapitre." }, 502);
    }
    const chapters = await chapterRes.json() as Array<{
      id: string;
      chapter_number: number;
      title: string;
      content: string | null;
    }>;
    if (!chapters.length) {
      return jsonResponse({ error: "Chapitre introuvable." }, 404);
    }
    const chapter = chapters[0];

    // 2. Récupérer les assets du projet
    const assetsRes = await fetch(
      `${supabaseUrl}/rest/v1/assets?project_id=eq.${project_id}&select=id,name,asset_type,prompt,lore`,
      { headers: dbHeaders }
    );
    const assets = assetsRes.ok
      ? (await assetsRes.json() as Array<{
          id: string;
          name: string;
          asset_type: string;
          prompt: string | null;
          lore: string | null;
        }>)
      : [];

    // 3. Récupérer les entités existantes
    const entitiesRes = await fetch(
      `${supabaseUrl}/rest/v1/memory_entities?project_id=eq.${project_id}&select=*`,
      { headers: dbHeaders }
    );
    const existingEntities = entitiesRes.ok ? await entitiesRes.json() : [];

    // 4. Construire les prompts
    const assetsContext = assets
      .map((a) => {
        const base = `- ${a.name} (${a.asset_type}) : ${a.prompt ?? "(sans description)"}`;
        return a.lore ? `${base}\n  LORE: ${a.lore}` : base;
      })
      .join("\n") || "(aucun asset)";

    const systemPrompt = `Tu es NarraMind, un système de mémoire narrative.

ASSETS DU PROJET (avec leur LORE) :
${assetsContext}

FICHES ENTITÉS EXISTANTES :
${JSON.stringify(existingEntities)}

NOUVEAU CHAPITRE ${chapter.chapter_number} — ${chapter.title} :
${chapter.content ?? "(vide)"}

TÂCHE : Retourne un JSON avec :
1. "entities_to_update": liste des fiches entités à créer ou mettre à jour
2. "chapter_summary": résumé du chapitre en 60-80 tokens maximum
3. "anomalies": liste des incohérences détectées vs le LORE

Format JSON STRICT :
{
  "entities_to_update": [
    {
      "name": "string",
      "entity_type": "character|background|object",
      "traits": ["string"],
      "relations": [{"with": "string", "type": "string"}],
      "lore_summary": "string",
      "last_seen_chapter": number,
      "first_seen_chapter": number
    }
  ],
  "chapter_summary": "string",
  "anomalies": ["string"]
}`;

    // 5. Appel Gemini
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let aiResult: {
      entities_to_update: Array<{
        name: string;
        entity_type: string;
        traits: string[];
        relations: Array<{ with: string; type: string }>;
        lore_summary: string;
        last_seen_chapter: number;
        first_seen_chapter: number;
      }>;
      chapter_summary: string;
      anomalies: string[];
    };

    const buildGeminiBody = (model: string) =>
      JSON.stringify({
        model,
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });

    const parseGeminiResponse = async (res: Response): Promise<string | null> => {
      const aiJson = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return aiJson.choices?.[0]?.message?.content?.trim() ?? null;
    };

    try {
      let aiRes = await fetch(AI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${geminiKey}`,
        },
        body: buildGeminiBody(AI_MODEL),
        signal: controller.signal,
      });

      // Fallback sur gemini-2.0-flash uniquement si le modèle est surchargé (503)
      // Ne pas retenter sur 429 : quota partagé, retenter immédiatement ne sert à rien
      if (aiRes.status === 503) {
        aiRes = await fetch(AI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${geminiKey}`,
          },
          body: buildGeminiBody(AI_FALLBACK_MODEL),
          signal: controller.signal,
        });
      }

      clearTimeout(timeout);

      if (!aiRes.ok) {
        if (aiRes.status === 429) {
          return jsonResponse(
            { error: "Limite Gemini atteinte. Réessayez dans 1-2 minutes." },
            429
          );
        }
        const rawErr = await aiRes.text();
        return jsonResponse(
          { error: `Gemini erreur ${aiRes.status}`, details: rawErr.slice(0, 200) },
          502
        );
      }

      const rawText = await parseGeminiResponse(aiRes);
      if (!rawText) {
        return jsonResponse({ error: "Gemini n'a pas retourné de texte." }, 502);
      }

      // Extraction robuste du JSON
      let jsonStr = rawText;
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      const start = jsonStr.indexOf("{");
      if (start >= 0) jsonStr = jsonStr.slice(start);

      aiResult = JSON.parse(jsonStr) as typeof aiResult;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        return jsonResponse({ error: "Timeout appel Gemini." }, 504);
      }
      return jsonResponse(
        { error: "Impossible de parser la réponse Gemini.", details: String(err) },
        502
      );
    }

    const entitiesToUpdate = Array.isArray(aiResult.entities_to_update)
      ? aiResult.entities_to_update
      : [];
    const chapterSummary = aiResult.chapter_summary ?? "";
    const anomalies = Array.isArray(aiResult.anomalies) ? aiResult.anomalies : [];

    // 6. Upsert des entités
    for (const entity of entitiesToUpdate) {
      const tokenEstimate = estimateTokens(JSON.stringify(entity));
      await fetch(`${supabaseUrl}/rest/v1/memory_entities`, {
        method: "POST",
        headers: {
          ...dbHeaders,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          project_id,
          user_id: userId,
          name: entity.name,
          entity_type: entity.entity_type,
          traits: entity.traits ?? [],
          relations: entity.relations ?? [],
          lore_summary: entity.lore_summary ?? null,
          last_seen_chapter: entity.last_seen_chapter ?? chapter.chapter_number,
          first_seen_chapter: entity.first_seen_chapter ?? chapter.chapter_number,
          token_estimate: tokenEstimate,
          updated_at: new Date().toISOString(),
        }),
      });
    }

    // 7. Insérer le résumé
    const summaryTokens = estimateTokens(chapterSummary);
    await fetch(`${supabaseUrl}/rest/v1/memory_summaries`, {
      method: "POST",
      headers: { ...dbHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        project_id,
        user_id: userId,
        chapter_id,
        chapter_number: chapter.chapter_number,
        summary: chapterSummary,
        token_estimate: summaryTokens,
      }),
    });

    // 8. Calculer le total tokens pour détecter la compression nécessaire
    const allSummariesRes = await fetch(
      `${supabaseUrl}/rest/v1/memory_summaries?project_id=eq.${project_id}&select=token_estimate`,
      { headers: dbHeaders }
    );
    const allSummaries = allSummariesRes.ok
      ? (await allSummariesRes.json() as Array<{ token_estimate: number }>)
      : [];
    const totalSummaryTokens = allSummaries.reduce((acc, s) => acc + (s.token_estimate ?? 0), 0);

    const allEntitiesRes = await fetch(
      `${supabaseUrl}/rest/v1/memory_entities?project_id=eq.${project_id}&select=token_estimate`,
      { headers: dbHeaders }
    );
    const allEntities = allEntitiesRes.ok
      ? (await allEntitiesRes.json() as Array<{ token_estimate: number }>)
      : [];
    const totalEntityTokens = allEntities.reduce((acc, e) => acc + (e.token_estimate ?? 0), 0);

    const totalContextTokens = totalSummaryTokens + totalEntityTokens;
    const needsCompression = totalSummaryTokens > 800;

    // 9. Log métriques (fire-and-forget)
    fetch(`${supabaseUrl}/rest/v1/narramind_metrics`, {
      method: "POST",
      headers: { ...dbHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        project_id,
        chapter_number: chapter.chapter_number,
        mode: "narramind_v1",
        context_tokens: totalContextTokens,
        response_tokens: estimateTokens(JSON.stringify(aiResult)),
        chapters_in_context: allSummaries.length,
        duration_ms: 0,
      }),
    }).catch(() => {});

    return jsonResponse(
      {
        success: true,
        summary: chapterSummary,
        entities_updated: entitiesToUpdate.length,
        anomalies,
        total_context_tokens: totalContextTokens,
        needs_compression: needsCompression,
      },
      200
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: "Erreur serveur.", details: msg }, 500);
  }
});
