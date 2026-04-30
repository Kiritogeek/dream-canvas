declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

const AI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const AI_MODEL = "gemini-2.0-flash";
const AI_FALLBACK_MODEL = "gemini-2.5-flash";
const AI_TIMEOUT_MS = 60_000;
/** Sortie JSON souvent > 1500 tokens (entités + anomalies) — troncature = JSON invalide. */
const NARRAMIND_MAX_OUTPUT_TOKENS = 8192;

/** Budget max (estimation ~tokens) pour le bloc « résumés chapitres précédents » — reste du prompt inchangé. */
const PREV_SUMMARIES_CONTEXT_TOKEN_BUDGET = 2200;
/** Troncature d'un seul résumé pour éviter qu'un chapitre ne monopolise le budget. */
const PREV_SUMMARY_MAX_CHARS = 420;
/** Limite de lignes candidates (les plus récents avant le chapitre courant). */
const PREV_SUMMARIES_FETCH_CAP = 24;

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

function getOpenAIMessageContent(message: { content?: unknown } | undefined): string {
  const c = message?.content;
  if (typeof c === "string") return c.trim();
  if (Array.isArray(c)) {
    return (c as Array<{ text?: string }>)
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();
  }
  return "";
}

function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function tryParseNarraMindAiJson(rawText: string): unknown | null {
  const tryOne = (s: string) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      return null;
    }
  };

  const t = rawText.trim();
  let p = tryOne(t);
  if (p) return p;

  const fencedOuter = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedOuter) {
    p = tryOne(fencedOuter[1].trim());
    if (p) return p;
  }

  const stripped = t.replace(/```(?:json)?\s*([\s\S]*?)```/gi, "$1").trim();
  if (stripped !== t) {
    p = tryOne(stripped);
    if (p) return p;
  }

  const brace0 = t.indexOf("{");
  const fromBrace = brace0 >= 0 ? t.slice(brace0) : t;
  p = tryOne(fromBrace);
  if (p) return p;

  const balanced = extractBalancedJsonObject(rawText);
  if (balanced) {
    p = tryOne(balanced);
    if (p) return p;
  }

  const s = rawText.indexOf("{");
  const e = rawText.lastIndexOf("}");
  if (s >= 0 && e > s) {
    p = tryOne(rawText.slice(s, e + 1));
    if (p) return p;
  }

  return null;
}

type AnomalySeverity = "info" | "warning" | "critical";

interface NormalizedAnomaly {
  id: string;
  title: string;
  explanation: string;
  severity?: AnomalySeverity;
  anchor?: { type: "excerpt"; text: string };
}

function parseAnchorField(raw: unknown): { type: "excerpt"; text: string } | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const a = raw as Record<string, unknown>;
  if (a.type !== "excerpt") return undefined;
  const text = typeof a.text === "string" ? a.text.trim() : "";
  if (text.length < 2) return undefined;
  if (text.length > 2000) return { type: "excerpt", text: text.slice(0, 1997) + "…" };
  return { type: "excerpt", text };
}

function normalizeSeverity(v: unknown): AnomalySeverity | undefined {
  if (v === "info" || v === "warning" || v === "critical") return v;
  return undefined;
}

/** Construit le bloc résumés antérieurs : ordre chronologique affiché, remplissage depuis les chapitres les plus récents jusqu'au budget. */
function buildPreviousSummariesContextForPrompt(
  rows: Array<{ chapter_number: number; summary: string | null }>,
  currentChapterNumber: number
): { text: string; included: number; estimatedTokens: number } {
  const byChapter = new Map<number, { chapter_number: number; summary: string | null }>();
  for (const r of rows) {
    if (r.chapter_number >= currentChapterNumber) continue;
    if (!byChapter.has(r.chapter_number)) byChapter.set(r.chapter_number, r);
  }
  const candidates = [...byChapter.values()]
    .filter((r) => (r.summary ?? "").trim().length > 0)
    .sort((a, b) => b.chapter_number - a.chapter_number);

  const header =
    "RÉSUMÉS CHAPITRES PRÉCÉDENTS (fenêtre récente, tronquée pour limiter la taille du prompt — utiliser uniquement pour contradictions avec des faits déjà posés ; pas pour critiquer le mystère ou l'ellipse) :\n";
  const headerTok = estimateTokens(header);
  let budgetLeft = Math.max(0, PREV_SUMMARIES_CONTEXT_TOKEN_BUDGET - headerTok);
  const lines: string[] = [];

  for (const r of candidates) {
    let s = (r.summary ?? "").replace(/\s+/g, " ").trim();
    if (s.length > PREV_SUMMARY_MAX_CHARS) {
      s = `${s.slice(0, PREV_SUMMARY_MAX_CHARS - 1)}…`;
    }
    const line = `Chapitre ${r.chapter_number} : ${s}`;
    const lineTok = estimateTokens(`${line}\n`);
    if (lineTok > budgetLeft) break;
    lines.push(line);
    budgetLeft -= lineTok;
  }

  if (lines.length === 0) {
    return { text: "", included: 0, estimatedTokens: 0 };
  }
  lines.reverse();
  const text = header + lines.join("\n");
  return {
    text,
    included: lines.length,
    estimatedTokens: estimateTokens(text),
  };
}

function normalizeAnomaliesInput(raw: unknown[]): NormalizedAnomaly[] {
  const out: NormalizedAnomaly[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const t = item.trim();
      if (t) out.push({ id: crypto.randomUUID(), title: t, explanation: "" });
      continue;
    }
    if (item != null && typeof item === "object" && !Array.isArray(item)) {
      const o = item as Record<string, unknown>;
      const titleRaw =
        typeof o.title === "string"
          ? o.title.trim()
          : typeof o.message === "string"
            ? o.message.trim()
            : "";
      const explanationRaw =
        typeof o.explanation === "string"
          ? o.explanation.trim()
          : typeof o.detail === "string"
            ? o.detail.trim()
            : typeof o.description === "string"
              ? o.description.trim()
              : "";
      const idStr = typeof o.id === "string" && o.id.trim() ? o.id.trim() : crypto.randomUUID();
      const sev = normalizeSeverity(o.severity);

      if (!titleRaw && explanationRaw) {
        const id =
          typeof o.id === "string" && o.id.trim() ? o.id.trim() : crypto.randomUUID();
        const anch = parseAnchorField(o.anchor);
        if (explanationRaw.length <= 100) {
          const row: NormalizedAnomaly = { id, title: explanationRaw, explanation: "" };
          if (anch) row.anchor = anch;
          out.push(row);
        } else {
          const row: NormalizedAnomaly = {
            id,
            title: `${explanationRaw.slice(0, 97)}…`,
            explanation: explanationRaw,
          };
          if (anch) row.anchor = anch;
          out.push(row);
        }
        continue;
      }
      if (titleRaw) {
        const row: NormalizedAnomaly = {
          id: idStr,
          title: titleRaw,
          explanation: explanationRaw,
        };
        if (sev) row.severity = sev;
        const anch = parseAnchorField(o.anchor);
        if (anch) row.anchor = anch;
        out.push(row);
      }
    }
  }
  return out;
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

    // 1. Récupérer le chapitre + universe_lore du projet
    const [chapterRes, projectRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/scenario_chapters?id=eq.${chapter_id}&select=*`,
        { headers: dbHeaders }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/projects?id=eq.${project_id}&select=universe_lore`,
        { headers: dbHeaders }
      ),
    ]);
    if (!chapterRes.ok) {
      return jsonResponse({ error: "Impossible de récupérer le chapitre." }, 502);
    }
    const chapters = await chapterRes.json() as Array<{
      id: string;
      user_id: string;
      project_id: string;
      chapter_number: number;
      title: string;
      content: string | null;
    }>;
    if (!chapters.length) {
      return jsonResponse({ error: "Chapitre introuvable." }, 404);
    }
    const chapter = chapters[0];
    if (chapter.user_id !== userId) {
      return jsonResponse({ error: "Accès refusé." }, 403);
    }
    if (chapter.project_id !== project_id) {
      return jsonResponse(
        { error: "Le chapitre n'appartient pas à ce projet." },
        400
      );
    }
    const projects = projectRes.ok
      ? (await projectRes.json() as Array<{ universe_lore: string | null }>)
      : [];
    const universeLore = projects[0]?.universe_lore ?? null;

    const prevChapterNum = chapter.chapter_number;
    const summariesListUrl =
      `${supabaseUrl}/rest/v1/memory_summaries?project_id=eq.${project_id}` +
      `&chapter_number=lt.${prevChapterNum}&select=chapter_number,summary` +
      `&order=chapter_number.desc&limit=${PREV_SUMMARIES_FETCH_CAP}`;

    const [assetsRes, entitiesRes, prevSummariesRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/assets?project_id=eq.${project_id}&select=id,name,asset_type,prompt,lore`,
        { headers: dbHeaders }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/memory_entities?project_id=eq.${project_id}&select=*`,
        { headers: dbHeaders }
      ),
      fetch(summariesListUrl, { headers: dbHeaders }),
    ]);

    const assets = assetsRes.ok
      ? (await assetsRes.json() as Array<{
          id: string;
          name: string;
          asset_type: string;
          prompt: string | null;
          lore: string | null;
        }>)
      : [];

    const existingEntities = entitiesRes.ok ? await entitiesRes.json() : [];
    const prevSummaryRows = prevSummariesRes.ok
      ? (await prevSummariesRes.json() as Array<{ chapter_number: number; summary: string | null }>)
      : [];
    const prevSummariesCtx = buildPreviousSummariesContextForPrompt(
      prevSummaryRows,
      chapter.chapter_number
    );

    // 4. Construire les prompts
    const assetsContext = assets
      .map((a) => {
        const base = `- ${a.name} (${a.asset_type}) : ${a.prompt ?? "(sans description)"}`;
        return a.lore ? `${base}\n  LORE: ${a.lore}` : base;
      })
      .join("\n") || "(aucun asset)";

    const systemPrompt = `Tu es NarraMind, un système de mémoire narrative.
${universeLore ? `\nLORE DU MONDE :\n${universeLore}\n` : ""}${prevSummariesCtx.text ? `\n${prevSummariesCtx.text}\n` : ""}
ASSETS DU PROJET (avec leur LORE) :
${assetsContext}

FICHES ENTITÉS EXISTANTES :
${JSON.stringify(existingEntities)}

NOUVEAU CHAPITRE ${chapter.chapter_number} — ${chapter.title} :
${chapter.content ?? "(vide)"}


TÂCHE : Retourne un JSON avec :
1. "entities_to_update": liste des fiches entités à créer ou mettre à jour
2. "chapter_summary": résumé du chapitre en 60-80 tokens maximum
3. "anomalies": uniquement les CONTRADICTIONS EXPLICITES avec le LORE DU MONDE, les LORE des assets, les faits des FICHES ENTITÉS, ou les faits posés dans les RÉSUMÉS CHAPITRES PRÉCÉDENTS ci-dessus lorsqu'ils sont présents (résumés partiels et fenêtre récente : ne pas exiger qu'un détail absent des résumés soit une anomalie). Préfère un tableau d'objets avec titre et explication ; tu peux utiliser une chaîne courte seulement si une seule phrase suffit. Si aucune contradiction : [].

RÈGLES STRICTES POUR "anomalies" (légitime = ne PAS alerter) :
- Mystère, suspense, révélation différée, ellipses, éléments « étranges » ou nouveaux dans le chapitre tant que le texte ne les présente pas comme déjà fixés ailleurs : ce n'est PAS une anomalie. Ex. un lieu ou un objet que le POV découvre soudainement sans explication immédiate, si rien dans le lore interdit cette découverte.
- Un personnage qui doute (« je ne l'avais jamais remarqué ») ou une ambiguïté volontaire : PAS une anomalie.
- Conseil de relecture générique (« c'est abrupt », « manque de motivation ») sans citation d'un fait ou d'un lore contredit : PAS une anomalie.
- Alerter seulement si tu peux formuler : « Le chapitre affirme X alors que le lore / les entités établissent Y. »

Chaque objet anomalie :
- "title" : libellé court (environ 80 caractères max), langage **histoire** uniquement
- "explanation" : phrase(s) claires pour un auteur : qui / quoi contredit quoi dans **l'univers** (personnages, lieux, événements déjà posés). Courtes citations du texte du chapitre ou du lore autorisées.
- "severity" optionnel : "info" | "warning" | "critical"
- "anchor" optionnel : { "type": "excerpt", "text": "copie exacte et courte d'un passage du chapitre ci-dessus (pour retrouver l'endroit dans le texte)" }

Rédaction "title" et "explanation" pour l'auteur — **interdit** :
- Tout terme ou artefact **technique** ou **outil / base de données** : « asset », « entité », « fiche », « JSON », noms de champs (ex. first_seen_chapter, last_seen_chapter, entity_type, traits, relations, project_id, etc.).
- Toute référence au **format interne** ou aux clés du JSON que tu produis.
Exemple **interdit** : « Contradiction avec first_seen_chapter: 2 ».
Exemple **correct** : « Le texte dit que Kael n'a jamais nagé vers l'épave, alors qu'au chapitre précédent il s'y dirige déjà à la nage. »

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
  "anomalies": [
    {
      "title": "string",
      "explanation": "string",
      "severity": "warning",
      "anchor": { "type": "excerpt", "text": "string" }
    }
  ]
}`;

    console.log("[narramind-update] context previous_summaries", {
      chapter_number: chapter.chapter_number,
      prev_summaries_included: prevSummariesCtx.included,
      prev_summaries_estimated_tokens: prevSummariesCtx.estimatedTokens,
      prev_summaries_token_budget: PREV_SUMMARIES_CONTEXT_TOKEN_BUDGET,
    });

    // 5. Appel LLM (Gemini primaire → Gemini fallback → Groq urgence)
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
      anomalies: unknown;
    };

    const buildGeminiBody = (model: string) =>
      JSON.stringify({
        model,
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.1,
        max_tokens: NARRAMIND_MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
      });

    const buildGroqBody = () =>
      JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.1,
        max_tokens: NARRAMIND_MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
      });

    let rawText: string | null = null;
    let aiFinishReason: string | null = null;
    const aiStart = Date.now();

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

      // Fallback Gemini alternatif sur 429/503
      if (aiRes.status === 503 || aiRes.status === 429) {
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

      // Fallback Groq si les deux Gemini sont indisponibles
      if (!aiRes.ok) {
        const groqKey = Deno.env.get("GROQ_API_KEY");
        if (groqKey) {
          aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            body: buildGroqBody(),
            signal: controller.signal,
          });
        }
      }

      clearTimeout(timeout);

      if (!aiRes.ok) {
        const rawErr = await aiRes.text();
        return jsonResponse(
          { error: `Modèles IA indisponibles (${aiRes.status})`, details: rawErr.slice(0, 200) },
          502
        );
      }

      const aiJson = await aiRes.json() as {
        choices?: Array<{
          message?: { content?: unknown };
          finish_reason?: string;
          native_finish_reason?: string;
        }>;
      };
      const choice0 = aiJson.choices?.[0];
      rawText = getOpenAIMessageContent(choice0?.message) || null;
      const finishReason =
        choice0?.finish_reason ?? choice0?.native_finish_reason ?? null;
      aiFinishReason = finishReason;

      if (!rawText) {
        return jsonResponse(
          {
            error: "L'IA n'a pas retourné de texte.",
            finish_reason: finishReason,
          },
          502
        );
      }

      console.log("[narramind-update] gemini response", {
        finish_reason: finishReason,
        raw_chars: rawText.length,
        raw_tail: rawText.slice(-120),
      });

      type AiResult = typeof aiResult;
      const parsedUnknown = tryParseNarraMindAiJson(rawText);
      const parsed =
        parsedUnknown !== null && typeof parsedUnknown === "object"
          ? (parsedUnknown as AiResult)
          : null;

      if (!parsed) {
        throw new Error(
          `JSON invalide (finish_reason=${finishReason ?? "?"}). Début : ${rawText.slice(0, 280)}`
        );
      }
      aiResult = parsed;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        return jsonResponse({ error: "Timeout appel Gemini." }, 504);
      }
      return jsonResponse(
        {
          error: "Réponse IA illisible (JSON). Réessayez ou raccourcissez le contexte.",
          details: String(err),
          finish_reason: aiFinishReason,
          raw: rawText?.slice(0, 800) ?? "null",
        },
        502
      );
    }

    const aiDuration = Date.now() - aiStart;

    const entitiesToUpdate = Array.isArray(aiResult.entities_to_update)
      ? aiResult.entities_to_update
      : [];
    const chapterSummary = aiResult.chapter_summary ?? "";
    const rawAnomalies = Array.isArray(aiResult.anomalies) ? aiResult.anomalies : [];
    const anomalies = normalizeAnomaliesInput(rawAnomalies);

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

    // 8. Calculer le total tokens depuis les données déjà connues (évite double requête)
    const totalSummaryTokensNew = summaryTokens;
    const totalEntityTokensNew = entitiesToUpdate.reduce(
      (acc, e) => acc + estimateTokens(JSON.stringify(e)), 0
    );

    // Requêtes pour le total cumulatif réel (toutes sessions confondues)
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
    // Fallback sur les tokens de cette session si les requêtes retournent 0
    const contextTokensToLog = totalContextTokens > 0
      ? totalContextTokens
      : totalSummaryTokensNew + totalEntityTokensNew;
    const needsCompression = totalSummaryTokens > 800;

    // 9. Log métriques (fire-and-forget)
    fetch(`${supabaseUrl}/rest/v1/narramind_metrics`, {
      method: "POST",
      headers: { ...dbHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        project_id,
        chapter_number: chapter.chapter_number,
        mode: "narramind_v1",
        context_tokens: contextTokensToLog,
        response_tokens: estimateTokens(JSON.stringify(aiResult)),
        chapters_in_context: allSummaries.length,
        anomalies_detected: anomalies.length,
        duration_ms: aiDuration,
      }),
    }).catch(() => {});

    const checkedAt = new Date().toISOString();
    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/scenario_chapters?id=eq.${chapter_id}&user_id=eq.${userId}`,
      {
        method: "PATCH",
        headers: { ...dbHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({
          narramind_anomalies: [],
          narramind_checked_at: checkedAt,
        }),
      }
    );
    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error("narramind-update: PATCH scenario_chapters failed", errText);
    }

    return jsonResponse(
      {
        success: true,
        summary: chapterSummary,
        entities_updated: entitiesToUpdate.length,
        anomalies,
        narramind_checked_at: checkedAt,
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
