import { getCorsHeaders, makeJsonResponse, isAllowedOriginConfigured } from "../_shared/cors.ts";

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

const GEMINI_EMBEDDING_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";
const GEMINI_FLASH_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_FLASH_MODEL = "gemini-2.0-flash";
const GEMINI_FLASH_FALLBACK = "gemini-2.5-flash";
const CONTENT_MAX_CHARS = 2_000;

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
      headers: { Authorization: `Bearer ${token}`, apikey: apiKey },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return typeof user?.id === "string" ? user.id : null;
  } catch {
    return null;
  }
}

async function getEmbedding(
  geminiKey: string,
  content: string
): Promise<number[] | null> {
  try {
    const truncated = content.slice(0, CONTENT_MAX_CHARS);
    const res = await fetch(`${GEMINI_EMBEDDING_URL}?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: truncated }] },
      }),
    });
    if (!res.ok) {
      console.error("[narramind-compass] Embedding API error", res.status, await res.text());
      return null;
    }
    const data = await res.json() as { embedding?: { values?: number[] } };
    const values = data?.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) return null;
    return values;
  } catch (err) {
    console.error("[narramind-compass] getEmbedding error", err);
    return null;
  }
}

function extractJsonObject(text: string): unknown | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

async function handleIndex(
  body: Record<string, unknown>,
  userId: string,
  supabaseUrl: string,
  serviceKey: string,
  geminiKey: string,
  jsonResponse: (b: object, s: number) => Response
): Promise<Response> {
  const { project_id, source_type, source_id, content, section_key } = body as {
    project_id?: string;
    source_type?: string;
    source_id?: string;
    content?: string;
    section_key?: string;
  };

  if (!project_id || !source_type || !source_id || !content) {
    return jsonResponse({ error: "Champs requis : project_id, source_type, source_id, content." }, 400);
  }

  const dbHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  // Vérifier ownership du projet
  const projRes = await fetch(
    `${supabaseUrl}/rest/v1/projects?id=eq.${project_id}&user_id=eq.${userId}&select=id`,
    { headers: dbHeaders }
  );
  if (!projRes.ok) return jsonResponse({ success: false, error: "Erreur vérification projet." }, 200);
  const projRows = await projRes.json() as Array<{ id: string }>;
  if (!projRows.length) return jsonResponse({ success: false, error: "Projet introuvable ou accès refusé." }, 200);

  const embedding = await getEmbedding(geminiKey, content);
  if (!embedding) {
    return jsonResponse({ success: false, error: "Embedding indisponible (rate limit ou erreur Gemini)." }, 200);
  }

  const truncatedContent = content.slice(0, CONTENT_MAX_CHARS);
  const now = new Date().toISOString();

  // Upsert dans project_embeddings via RPC SQL direct (vecteur via REST PostgREST)
  // PostgREST ne supporte pas le type vector directement — on utilise rpc ou raw SQL via pg_net n'est pas dispo.
  // Pattern : upsert avec le vecteur en tant que chaîne de format pgvector '[v1,v2,...]'
  const embeddingStr = `[${embedding.join(",")}]`;

  // Construire la clé d'upsert : ON CONFLICT (project_id, source_type, source_id, COALESCE(section_key, ''))
  // PostgREST upsert via ?on_conflict= nécessite les colonnes exactes, mais COALESCE ne fonctionne pas directement.
  // Stratégie : DELETE + INSERT pour garantir l'unicité (safe pour fire-and-forget).
  const sectionKeyVal = section_key ?? null;
  const sectionFilter = sectionKeyVal
    ? `&section_key=eq.${encodeURIComponent(sectionKeyVal)}`
    : `&section_key=is.null`;

  const delRes = await fetch(
    `${supabaseUrl}/rest/v1/project_embeddings?project_id=eq.${project_id}&source_type=eq.${source_type}&source_id=eq.${source_id}${sectionFilter}`,
    { method: "DELETE", headers: { ...dbHeaders, Prefer: "return=minimal" } }
  );
  if (!delRes.ok) {
    console.error("[narramind-compass] DELETE embeddings failed", await delRes.text());
  }

  const insertRes = await fetch(`${supabaseUrl}/rest/v1/project_embeddings`, {
    method: "POST",
    headers: { ...dbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({
      project_id,
      user_id: userId,
      source_type,
      source_id,
      section_key: sectionKeyVal,
      content: truncatedContent,
      embedding: embeddingStr,
      updated_at: now,
    }),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    console.error("[narramind-compass] INSERT embeddings failed", errText);
    return jsonResponse({ success: false, error: "Erreur persistance embedding." }, 200);
  }

  return jsonResponse({ success: true, source_id, source_type }, 200);
}

async function logCompassMetrics(
  supabaseUrl: string,
  serviceKey: string,
  projectId: string,
  proposalType: string,
  fragments: Array<{ similarity: number; source_type: string; source_id: string }>,
  proposalsCount: number,
  durationMs: number
): Promise<void> {
  const scores = fragments.map(f => ({ source_type: f.source_type, source_id: f.source_id, cos_sim: f.similarity }));
  void fetch(`${supabaseUrl}/rest/v1/narramind_metrics`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      project_id: projectId,
      mode: "compass_propose",
      compass_mode: proposalType,
      fragments_retrieved: scores,
      cos_sim_min: Math.min(...fragments.map(f => f.similarity)),
      cos_sim_max: Math.max(...fragments.map(f => f.similarity)),
      proposals_count: proposalsCount,
      duration_ms: durationMs,
    }),
  }).catch(() => {});
}

async function handlePropose(
  body: Record<string, unknown>,
  userId: string,
  supabaseUrl: string,
  serviceKey: string,
  geminiKey: string,
  jsonResponse: (b: object, s: number) => Response
): Promise<Response> {
  const startMs = Date.now();
  const { project_id, context_text, proposal_type, source_id } = body as {
    project_id?: string;
    context_text?: string;
    proposal_type?: string;
    source_id?: string;
  };

  if (!project_id || !context_text || !proposal_type) {
    return jsonResponse({ error: "Champs requis : project_id, context_text, proposal_type." }, 400);
  }

  const dbHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  // Vérifier ownership du projet
  const projRes = await fetch(
    `${supabaseUrl}/rest/v1/projects?id=eq.${project_id}&user_id=eq.${userId}&select=id`,
    { headers: dbHeaders }
  );
  if (!projRes.ok) return jsonResponse({ success: false, error: "Erreur vérification projet." }, 200);
  const projRows = await projRes.json() as Array<{ id: string }>;
  if (!projRows.length) return jsonResponse({ success: false, error: "Projet introuvable ou accès refusé." }, 200);

  // Vectoriser le contexte
  const contextEmbedding = await getEmbedding(geminiKey, context_text);
  if (!contextEmbedding) {
    return jsonResponse({ success: false, error: "Embedding contexte indisponible." }, 200);
  }

  // Recherche sémantique via match_embeddings() — similarité cosinus pgvector
  const COS_SIM_THRESHOLD = 0.65;
  let similarFragments: Array<{ source_type: string; source_id: string; section_key: string | null; content: string; similarity: number }> = [];

  try {
    const embeddingStr = `[${contextEmbedding.join(",")}]`;
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_embeddings`, {
      method: "POST",
      headers: { ...dbHeaders },
      body: JSON.stringify({
        query_embedding: embeddingStr,
        match_project_id: project_id,
        match_user_id: userId,
        match_count: 5,
      }),
    });

    if (rpcRes.ok) {
      const rows = await rpcRes.json() as typeof similarFragments;
      similarFragments = (rows ?? []).filter(f => f.similarity >= COS_SIM_THRESHOLD);
    } else {
      console.error("[narramind-compass] match_embeddings RPC error", rpcRes.status, await rpcRes.text());
    }
  } catch (err) {
    console.error("[narramind-compass] Similarity search error", err);
  }

  // Garde-fou agentique : aucun fragment pertinent → Ariane ne propose rien
  if (!similarFragments.length) {
    return jsonResponse({ success: true, proposals: [], reason: "no_relevant_context" }, 200);
  }

  // Construire le prompt Gemini Flash
  const contextBlock = similarFragments.length > 0
    ? similarFragments
        .map((f, i) => `[Fragment ${i + 1} — ${f.source_type}]\n${f.content}`)
        .join("\n\n")
    : "(aucun fragment disponible)";

  const systemPrompt = `Tu es Ariane, co-pilote créatif d'un auteur de webtoon.
Tu proposes des suggestions pour enrichir son univers.
Règles absolues :
- Langage auteur uniquement : personnages, lieux, événements. Jamais de jargon technique.
- Les suggestions "extracted" doivent être des faits réels tirés du texte fourni.
- Les suggestions "generated" utilisent "tu pourrais", "une piste", "peut-être" — jamais affirmatif.
- Maximum 4 suggestions au total (2 extracted + 2 generated).
Retourne UNIQUEMENT du JSON valide selon ce schéma :
{ "proposals": [ { "origin": "extracted"|"generated", "title": "...", "content": "..." } ] }

Contexte narratif actuel :
${context_text.slice(0, 800)}

Fragments similaires issus du projet :
${contextBlock}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  let rawText: string | null = null;
  try {
    const buildBody = (model: string) =>
      JSON.stringify({
        model,
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.4,
        max_tokens: 1_200,
        response_format: { type: "json_object" },
      });

    let aiRes = await fetch(GEMINI_FLASH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${geminiKey}`,
      },
      body: buildBody(GEMINI_FLASH_MODEL),
      signal: controller.signal,
    });

    if (aiRes.status === 429 || aiRes.status === 503) {
      aiRes = await fetch(GEMINI_FLASH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${geminiKey}`,
        },
        body: buildBody(GEMINI_FLASH_FALLBACK),
        signal: controller.signal,
      });
    }

    clearTimeout(timeout);

    if (!aiRes.ok) {
      return jsonResponse({ success: false, error: `Gemini Flash indisponible (${aiRes.status}).` }, 200);
    }

    const aiJson = await aiRes.json() as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const choice = aiJson.choices?.[0]?.message?.content;
    rawText = typeof choice === "string" ? choice.trim() : null;
  } catch (err) {
    clearTimeout(timeout);
    console.error("[narramind-compass] Gemini Flash error", err);
    return jsonResponse({ success: false, error: "Erreur appel Gemini Flash." }, 200);
  }

  if (!rawText) {
    return jsonResponse({ success: false, error: "Gemini Flash n'a retourné aucun texte." }, 200);
  }

  const parsed = extractJsonObject(rawText);
  const rawProposals = (parsed as Record<string, unknown> | null)?.proposals;
  const proposals = Array.isArray(rawProposals)
    ? (rawProposals as Array<{ origin?: string; title?: string; content?: string }>).filter(
        (p) => typeof p?.title === "string" && typeof p?.content === "string"
      )
    : [];

  // Upsert dans compass_proposals
  const persisted: Array<{ origin: string; title: string; content: string }> = [];

  for (const p of proposals.slice(0, 4)) {
    const origin = p.origin === "extracted" || p.origin === "generated" ? p.origin : "generated";
    const title = (p.title ?? "").trim();
    const content = (p.content ?? "").trim();
    if (!title || !content) continue;

    const dedupeKey = await sha256Hex(`${project_id}:${proposal_type}:${title}`);

    const row = {
      project_id,
      user_id: userId,
      source_id: source_id ?? null,
      proposal_type,
      origin,
      title,
      content,
      prefill_data: null,
      status: "active",
      dedupe_key: dedupeKey,
      source_fragments: similarFragments.map(f => ({
        source_type: f.source_type,
        source_id: f.source_id,
        cos_sim: f.similarity,
        excerpt: f.content.slice(0, 100),
      })),
    };

    const upsertRes = await fetch(
      `${supabaseUrl}/rest/v1/compass_proposals?on_conflict=project_id,dedupe_key`,
      {
        method: "POST",
        headers: { ...dbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(row),
      }
    );
    if (!upsertRes.ok) {
      console.error("[narramind-compass] upsert proposal failed", await upsertRes.text());
      continue;
    }
    persisted.push({ origin, title, content });
  }

  void logCompassMetrics(supabaseUrl, serviceKey, project_id, proposal_type, similarFragments, persisted.length, Date.now() - startMs);

  return jsonResponse({ success: true, proposals: persisted }, 200);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const jsonResponse = makeJsonResponse(origin);

  if (!isAllowedOriginConfigured()) {
    return jsonResponse({ error: "ALLOWED_ORIGIN non configurée." }, 500);
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) return jsonResponse({ error: "GEMINI_API_KEY non configurée." }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return jsonResponse({ error: "Config Supabase manquante." }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authorization manquante." }, 401);

    const userId = await verifyUserFromToken(authHeader, supabaseUrl, serviceKey);
    if (!userId) return jsonResponse({ error: "JWT invalide ou expiré." }, 401);

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "Body JSON invalide." }, 400);
    }

    const mode = body.mode as string | undefined;

    if (mode === "index") {
      return await handleIndex(body, userId, supabaseUrl, serviceKey, geminiKey, jsonResponse);
    }

    if (mode === "propose") {
      return await handlePropose(body, userId, supabaseUrl, serviceKey, geminiKey, jsonResponse);
    }

    return jsonResponse({ error: `Mode inconnu : ${mode ?? "(vide)"}. Valeurs acceptées : index, propose.` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: "Erreur serveur.", details: msg }, 500);
  }
});
