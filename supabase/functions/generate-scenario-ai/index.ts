// Edge Function: IA Scénario & IA Chapitre via Google Gemini Flash
// Secrets requis :
//   - GEMINI_API_KEY (Supabase → Edge Functions → Secrets)
//
// Gemini expose un endpoint OpenAI-compatible, ce qui permet de réutiliser
// le même format body/parsing qu'auparavant sans adaptation.
//
// Modes supportés :
//   "scenario"             → IA Scénario (scénariste, au service de l'UTILISATEUR)
//   "chapter"              → IA Chapitre (éditeur, au service du LECTEUR)
//   "panels"               → Découpage panels (JSON)
//   "detect_blocks"        → Détection de blocs visuels (JSON)
//   "ai_summary"           → Résumé de chapitre
//   "suggest_block_prompt" → Suggestion de prompt pour un bloc

import { getCorsHeaders, makeJsonResponse, isAllowedOriginConfigured } from "../_shared/cors.ts";

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
import {
  DETECT_BLOCKS_SYSTEM_PROMPT,
  buildDetectBlocksPrompt,
} from "./system-prompts/detect-blocks.ts";
import {
  AI_SUMMARY_SYSTEM_PROMPT,
  buildAiSummaryPrompt,
} from "./system-prompts/ai-summary.ts";
import {
  SUGGEST_PROMPT_SYSTEM_PROMPT,
  buildSuggestPromptPrompt,
} from "./system-prompts/suggest-prompt.ts";
import { NARRATIVE_DIRECTIONS_SYSTEM_PROMPT } from "./system-prompts/narrative-directions.ts";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const AI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
// WHY : `gemini-1.5-flash` a été déprécié par Google en septembre 2025 et
// renvoie 404 sur l'endpoint v1beta. `gemini-2.5-flash` est le successeur
// recommandé (rapide, économique, fenêtre contextuelle 1M tokens).
const AI_MODEL = "gemini-2.5-flash";
// Fallback si le modèle principal renvoie 429 (rate limit / quota épuisé).
// `gemini-2.5-flash-lite` a un quota free tier ~3x plus généreux.
const AI_FALLBACK_MODEL = "gemini-2.5-flash-lite";
const AI_TIMEOUT_MS = 60_000;
const AI_MAX_OUTPUT_TOKENS = 8_192;


function clip(value: string, max = 1000): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
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
// APPEL IA (GEMINI FLASH — endpoint OpenAI-compatible)
// ═══════════════════════════════════════════════════════════════

type AIResult =
  | { text: string; modelUsed: string }
  | { error: string; status?: number; rateLimited?: boolean };

async function callAIOnce(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  jsonMode = false,
  requestId?: string
): Promise<AIResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      // WHY : pour les modes structurés (detect_blocks, panels), une
      // température basse + top_p resserré réduit drastiquement le risque
      // de réponse hors-format. Pour les modes créatifs on garde 0.8.
      temperature: jsonMode ? 0.2 : 0.8,
      max_tokens: AI_MAX_OUTPUT_TOKENS,
      top_p: jsonMode ? 0.5 : 0.9,
    };
    if (jsonMode) {
      // Gemini supporte response_format via l'endpoint OpenAI-compatible.
      // Force la sortie en JSON valide, sans fence markdown ni préambule.
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error("[generate-scenario-ai] Gemini error", {
        request_id: requestId,
        model,
        status: res.status,
        raw: clip(raw, 300),
      });
      return {
        error: `Gemini erreur ${res.status}: ${clip(raw, 200)}`,
        status: res.status,
        rateLimited: res.status === 429 || res.status === 503,
      };
    }
    let json: { choices?: Array<{ message?: { content?: string } }> };
    try {
      json = JSON.parse(raw);
    } catch {
      return { error: "Réponse invalide de Gemini" };
    }
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) return { error: "Gemini n'a pas retourné de texte" };
    return { text, modelUsed: model };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Timeout." };
    }
    return { error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  jsonMode = false,
  requestId?: string
): Promise<AIResult> {
  const primary = await callAIOnce(
    AI_MODEL,
    systemPrompt,
    userPrompt,
    apiKey,
    jsonMode,
    requestId
  );
  if ("text" in primary) return primary;

  // WHY : sur 429 (quota épuisé) ou 503 (surcharge temporaire), on bascule
  // automatiquement sur le modèle lite — quota plus généreux, moins sollicité.
  if (primary.rateLimited) {
    console.warn(
      `[generate-scenario-ai] ${AI_MODEL} indisponible (${primary.status}), fallback → ${AI_FALLBACK_MODEL}`
    );
    const fallback = await callAIOnce(
      AI_FALLBACK_MODEL,
      systemPrompt,
      userPrompt,
      apiKey,
      jsonMode,
      requestId
    );
    if ("text" in fallback) return fallback;
    if (fallback.rateLimited) {
      const msg =
        primary.status === 503
          ? "Serveur IA surchargé (forte demande), même en mode lite. Réessayez dans quelques minutes."
          : "Limite quotidienne Gemini atteinte sur les deux modèles. Réessayez dans quelques heures.";
      return {
        error: msg,
        status: primary.status ?? 429,
        rateLimited: true,
      };
    }
    return fallback;
  }
  return primary;
}

// ── Extraction robuste d'un objet JSON depuis une réponse LLM ───
// WHY : même avec response_format, Gemini peut occasionnellement entourer
// le JSON de fences markdown (```json ... ```) ou ajouter du texte. Cette
// fonction extrait le premier objet JSON balanced du texte reçu.
function extractJsonObject(raw: string): string {
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

// ═══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get("origin");
  const jsonResponse = makeJsonResponse(origin);

  if (!isAllowedOriginConfigured()) {
    return jsonResponse(
      { error: "ALLOWED_ORIGIN non configurée. Configurez ce secret Supabase." },
      500
    );
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    // 1. Vérification GEMINI_API_KEY
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return jsonResponse(
        {
          error:
            "GEMINI_API_KEY non configurée. Supabase → Edge Functions → Secrets → ajouter GEMINI_API_KEY.",
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
      mode?: "scenario" | "chapter" | "panels" | "detect_blocks" | "ai_summary" | "suggest_block_prompt" | "baseline" | "narramind" | "narrative_directions";
      prompt?: string;
      num_chapters?: number;
      existing_content?: string;
      project_description?: string;
      next_chapter_number?: number;
      chapter_title?: string;
      chapter_content?: string;
      chapter_number?: number;
      project_id?: string;
      target_panel_count?: number;
      previous_summaries?: string;
      previous_prompts?: string[];
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return jsonResponse({ error: "Body JSON invalide" }, 400);
    }

    const { mode, prompt } = body;
    if (
      !mode ||
      !["scenario", "chapter", "panels", "detect_blocks", "ai_summary", "suggest_block_prompt", "baseline", "narramind", "narrative_directions"].includes(mode)
    ) {
      return jsonResponse({ error: 'Le champ "mode" est requis.' }, 400);
    }
    if (
      !["panels", "detect_blocks", "ai_summary", "suggest_block_prompt", "baseline", "narramind", "narrative_directions"].includes(mode) &&
      !prompt?.trim()
    ) {
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
        nextChapterNumber: body.next_chapter_number,
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
    } else if (mode === "panels") {
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
    } else if (mode === "detect_blocks") {
      if (!body.chapter_content?.trim()) {
        return jsonResponse({ error: '"chapter_content" requis pour detect_blocks.' }, 400);
      }
      systemPrompt = DETECT_BLOCKS_SYSTEM_PROMPT;
      // Gemini Flash dispose d'un large budget de tokens : on peut confier
      // davantage de contexte pour un découpage plus fidèle.
      const safeContent = shrinkTextByTokens(body.chapter_content.trim(), 4_000);
      inputWasTrimmed = safeContent !== body.chapter_content.trim();
      userPrompt = buildDetectBlocksPrompt({
        chapterTitle: body.chapter_title ?? "Sans titre",
        chapterContent: safeContent,
        chapterNumber: body.chapter_number,
        targetPanelCount: body.target_panel_count,
        assetsContext: typeof body.assets_context === "string" ? body.assets_context : undefined,
        universeLore: typeof body.universe_lore === "string" ? body.universe_lore : undefined,
      });
    } else if (mode === "ai_summary") {
      if (!body.chapter_content?.trim()) {
        return jsonResponse({ error: '"chapter_content" requis pour ai_summary.' }, 400);
      }
      systemPrompt = AI_SUMMARY_SYSTEM_PROMPT;
      const safeContent = shrinkTextByTokens(body.chapter_content.trim(), 4_000);
      inputWasTrimmed = safeContent !== body.chapter_content.trim();
      userPrompt = buildAiSummaryPrompt({
        chapterTitle: body.chapter_title ?? "Sans titre",
        chapterContent: safeContent,
        chapterNumber: body.chapter_number,
      });
    } else if (mode === "suggest_block_prompt") {
      if (!body.chapter_content?.trim()) {
        return jsonResponse({ error: '"chapter_content" requis pour suggest_block_prompt.' }, 400);
      }
      systemPrompt = SUGGEST_PROMPT_SYSTEM_PROMPT;
      const safeContent = shrinkTextByTokens(body.chapter_content.trim(), 3_000);
      inputWasTrimmed = safeContent !== body.chapter_content.trim();
      const safeSummaries = body.previous_summaries
        ? shrinkTextByTokens(body.previous_summaries.trim(), 1_500)
        : undefined;
      userPrompt = buildSuggestPromptPrompt({
        chapterContent: safeContent,
        previousSummaries: safeSummaries,
        previousPrompts: body.previous_prompts,
      });
    } else if (mode === "narramind") {
      if (!body.project_id) {
        return jsonResponse({ error: '"project_id" requis pour le mode narramind.' }, 400);
      }

      const entitiesRes = await fetch(
        `${supabaseUrl}/rest/v1/memory_entities?project_id=eq.${body.project_id}&select=name,entity_type,traits,relations,lore_summary,last_seen_chapter&order=last_seen_chapter.desc`,
        { headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` } }
      );
      const entities = entitiesRes.ok ? await entitiesRes.json() : [];

      const summariesRes = await fetch(
        `${supabaseUrl}/rest/v1/memory_summaries?project_id=eq.${body.project_id}&select=chapter_number,summary&order=chapter_number.asc`,
        { headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` } }
      );
      const summaries = summariesRes.ok ? await summariesRes.json() : [];

      const entitiesContext = (entities as Array<{ name: string; entity_type: string; traits: string[]; lore_summary?: string; last_seen_chapter?: number }>)
        .map(e => `${e.name} (${e.entity_type}) — Traits: ${e.traits?.join(', ')}${e.lore_summary ? ` — LORE: ${e.lore_summary}` : ''} — Dernière app: chap.${e.last_seen_chapter ?? '?'}`)
        .join('\n') || '(aucune entité)';

      const summariesContext = (summaries as Array<{ chapter_number: number; summary: string }>)
        .map(s => `Chap.${s.chapter_number}: ${s.summary}`)
        .join('\n') || '(aucun résumé)';

      systemPrompt = `Tu es un scénariste de webtoon expert en cohérence narrative.

ENTITÉS DE L'UNIVERS :
${entitiesContext}

RÉSUMÉ DES CHAPITRES PRÉCÉDENTS :
${summariesContext}

RÈGLES ABSOLUES :
- Respecte le LORE de chaque entité (pouvoirs, limites, personnalité)
- Ne contredis jamais les événements déjà établis dans les résumés
- Si un personnage a un LORE précis, fais-le respecter

Écris le chapitre demandé.`;
      userPrompt = prompt?.trim() ?? 'Écris le prochain chapitre.';
    } else if (mode === "narrative_directions") {
      if (!body.project_id) {
        return jsonResponse({ error: '"project_id" requis pour narrative_directions.' }, 400);
      }

      const headers = { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` };
      const base = `${supabaseUrl}/rest/v1`;

      const [nodesRes, edgesRes, proposalsRes, chaptersRes] = await Promise.all([
        fetch(`${base}/lore_nodes?project_id=eq.${body.project_id}&select=id,name,type,description&order=type.asc`, { headers }),
        fetch(`${base}/lore_edges?project_id=eq.${body.project_id}&select=from_node_id,to_node_id,label`, { headers }),
        fetch(`${base}/compass_proposals?project_id=eq.${body.project_id}&proposal_type=eq.lore_asset&status=eq.active&select=title`, { headers }),
        fetch(`${base}/scenario_chapters?project_id=eq.${body.project_id}&select=chapter_number,title,content,ai_summary&order=chapter_number.desc&limit=5`, { headers }),
      ]);

      type LoreNodeRow = { id: string; name: string; type: string; description: string | null };
      type LoreEdgeRow = { from_node_id: string; to_node_id: string; label: string | null };
      type ProposalRow = { title: string };
      type ChapterRow = { chapter_number: number; title: string; content: string | null; ai_summary: string | null };

      const nodes: LoreNodeRow[]   = nodesRes.ok     ? await nodesRes.json()     : [];
      const edges: LoreEdgeRow[]   = edgesRes.ok     ? await edgesRes.json()     : [];
      const proposals: ProposalRow[] = proposalsRes.ok ? await proposalsRes.json() : [];
      const chaptersRaw: ChapterRow[] = chaptersRes.ok ? await chaptersRes.json()  : [];
      const chapters = [...chaptersRaw].sort((a, b) => a.chapter_number - b.chapter_number);

      // Map id → name pour les connexions
      const nodeById = new Map(nodes.map((n) => [n.id, n.name]));

      // Groupe par type
      const byType: Record<string, LoreNodeRow[]> = {};
      for (const n of nodes) {
        if (!byType[n.type]) byType[n.type] = [];
        byType[n.type].push(n);
      }

      const TYPE_LABEL: Record<string, string> = {
        character: "Personnages",
        location: "Lieux",
        object: "Objets",
        event: "Événements",
      };

      const loreSection = Object.entries(byType)
        .map(([type, list]) => {
          const label = TYPE_LABEL[type] ?? type;
          const items = list.map((n) =>
            `  - ${n.name}${n.description?.trim() ? ` : "${clip(n.description.trim(), 200)}"` : " (aucune description)"}`
          ).join("\n");
          return `${label} :\n${items}`;
        })
        .join("\n\n") || "(Univers vide — aucun élément cartographié)";

      const connectionsSection = edges.length > 0
        ? edges
            .map((e) => `  - ${nodeById.get(e.from_node_id) ?? "?"} ↔ ${nodeById.get(e.to_node_id) ?? "?"}${e.label ? ` (${e.label})` : ""}`)
            .join("\n")
        : "  (aucune connexion)";

      const pendingSection = proposals.length > 0
        ? proposals.map((p) => `  - ${p.title}`).join("\n")
        : "  (aucun)";

      const chaptersSection = chapters.length > 0
        ? chapters.map((c) => {
            const summary = c.ai_summary?.trim();
            const content = c.content?.trim();
            const body = summary
              ? `Résumé : ${clip(summary, 300)}`
              : content
                ? clip(content, 400)
                : "(vide)";
            return `Chapitre ${c.chapter_number} — ${c.title}\n${body}`;
          }).join("\n\n---\n\n")
        : "(aucun chapitre écrit)";

      systemPrompt = NARRATIVE_DIRECTIONS_SYSTEM_PROMPT;
      userPrompt = `UNIVERS CARTOGRAPHIÉ :
${loreSection}

CONNEXIONS :
${connectionsSection}

ÉLÉMENTS DÉTECTÉS DANS LE SCÉNARIO MAIS PAS ENCORE DANS L'UNIVERS :
${pendingSection}

SCÉNARIO (derniers chapitres) :
${chaptersSection}

Génère 4 directions narratives pour la suite de cette histoire.`;

    } else {
      // mode === "baseline"
      if (!body.project_id) {
        return jsonResponse({ error: '"project_id" requis pour le mode baseline.' }, 400);
      }
      const { data: allChapters } = await fetch(
        `${supabaseUrl}/rest/v1/scenario_chapters?project_id=eq.${body.project_id}&select=chapter_number,title,content&order=chapter_number.asc`,
        { headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` } }
      ).then((r) => r.json()).then((data) => ({ data })).catch(() => ({ data: [] }));

      const rawContext = (allChapters as Array<{ chapter_number: number; title: string; content: string | null }> ?? [])
        .map((c) => `CHAPITRE ${c.chapter_number} — ${c.title}\n${c.content ?? ""}`)
        .join("\n\n---\n\n");

      systemPrompt = `Tu es un scénariste de webtoon.
Voici l'intégralité du scénario écrit jusqu'ici :

${rawContext || "(aucun chapitre existant)"}

Maintenant, écris le chapitre suivant en respectant les personnages, décors et événements déjà établis.`;
      userPrompt = prompt?.trim() ?? "Écris le prochain chapitre.";
    }

    // 6. Appel IA
    const startTime = Date.now();
    const contextTokenEstimate = estimateTokens(systemPrompt + userPrompt);

    console.log("[generate-scenario-ai] request context", {
      request_id: requestId,
      mode,
      user_id: userId,
      user_prompt_length: userPrompt.length,
      input_trimmed: inputWasTrimmed,
      context_tokens_estimate: contextTokenEstimate,
    });

    // Activer le mode JSON strict pour les modes structurés
    const jsonMode = mode === "panels" || mode === "detect_blocks" || mode === "narrative_directions";
    const result = await callAI(systemPrompt, userPrompt, geminiKey, jsonMode, requestId);

    if ("error" in result) {
      // Propager le 429 tel quel (rate limit / quota Gemini épuisé) pour
      // que le client affiche un message dédié.
      if (result.rateLimited) {
        const is503 = result.status === 503;
        return jsonResponse(
          {
            error: is503
              ? "Serveur IA momentanément surchargé (forte demande). Réessayez dans quelques minutes."
              : "Limite quotidienne IA atteinte. Le quota Gemini se réinitialise toutes les 24h. Réessayez plus tard.",
            details: result.error,
            rateLimited: true,
            request_id: requestId,
          },
          is503 ? 503 : 429
        );
      }
      return jsonResponse(
        { error: "Échec génération IA", details: result.error, request_id: requestId },
        502
      );
    }

    // Logging métriques NarraMind (modes baseline + scenario + narramind — pas les modes JSON)
    if ((mode === "baseline" || mode === "scenario" || mode === "narramind") && body.project_id) {
      const responseTokenEstimate = estimateTokens(result.text);
      const durationMs = Date.now() - startTime;
      const summariesContextForCount = mode === "narramind" ? systemPrompt : null;
      fetch(`${supabaseUrl}/rest/v1/narramind_metrics`, {
        method: "POST",
        headers: {
          apikey: serviceKey!,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          project_id: body.project_id,
          chapter_number: body.chapter_number ?? null,
          mode: mode === "baseline" ? "baseline_raw" : mode,
          context_tokens: contextTokenEstimate,
          response_tokens: responseTokenEstimate,
          chapters_in_context: mode === "baseline"
            ? (systemPrompt.match(/\nCHAPITRE \d+/g)?.length ?? 0)
            : mode === "narramind"
              ? (summariesContextForCount?.match(/\nChap\.\d+/g)?.length ?? 0)
              : null,
          duration_ms: durationMs,
        }),
      }).catch(() => {}); // fire-and-forget — ne doit pas bloquer la réponse
    }

    // Mode panels : parser le JSON et retourner { panels }
    if (mode === "panels") {
      const cleaned = extractJsonObject(result.text);
      let parsed: { panels?: Array<{ description: string; context?: { lieu?: string; scene?: string; personnages?: string } }> };

      try {
        const closed = tryClosePanelsJson(cleaned);
        parsed = JSON.parse(closed) as typeof parsed;
      } catch (parseErr) {
        console.error(
          "[generate-scenario-ai] panels parse failed:",
          (parseErr as Error).message,
          "raw:",
          result.text.slice(0, 500)
        );
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
        { panels, mode, model: result.modelUsed, request_id: requestId },
        200
      );
    }

    // Mode detect_blocks : parser le JSON et retourner { blocks }
    if (mode === "detect_blocks") {
      const cleaned = extractJsonObject(result.text);
      let parsed: {
        blocks?: Array<{ panel_number: number; description: string; text_excerpt: string }>;
      };
      try {
        const closed = tryClosePanelsJson(cleaned);
        parsed = JSON.parse(closed) as typeof parsed;
      } catch (parseErr) {
        // Logger la réponse brute pour pouvoir diagnostiquer (visible dans
        // les logs Supabase Edge Functions, pas exposé au client).
        console.error(
          "[generate-scenario-ai] detect_blocks parse failed:",
          (parseErr as Error).message,
          "raw:",
          result.text.slice(0, 500)
        );
        return jsonResponse(
          {
            error:
              "L'IA n'a pas pu produire un découpage valide. Réessayez (le chapitre est peut-être trop court ou trop ambigu).",
          },
          502
        );
      }
      const blocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
      if (blocks.length === 0) {
        console.warn(
          "[generate-scenario-ai] detect_blocks returned 0 blocks, raw:",
          result.text.slice(0, 500)
        );
      }
      return jsonResponse({ blocks, mode, model: result.modelUsed, request_id: requestId }, 200);
    }

    // Mode narrative_directions : parser le JSON et retourner { directions }
    if (mode === "narrative_directions") {
      const cleaned = extractJsonObject(result.text);
      let parsed: { directions?: Array<{ title: string; body: string }> };
      try {
        parsed = JSON.parse(cleaned) as typeof parsed;
      } catch {
        return jsonResponse({ error: "Ariane n'a pas pu générer des directions valides. Réessayez." }, 502);
      }
      const directions = Array.isArray(parsed.directions) ? parsed.directions : [];
      return jsonResponse({ directions, mode, model: result.modelUsed, request_id: requestId }, 200);
    }

    // Modes texte : scenario, chapter, ai_summary, suggest_block_prompt
    return jsonResponse(
      {
        text: result.text,
        mode,
        model: result.modelUsed,
        request_id: requestId,
      },
      200
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-scenario-ai] Exception", {
      request_id: requestId,
      message: msg,
    });
    return jsonResponse({ error: "Erreur serveur", details: msg, request_id: requestId }, 500);
  }
});
