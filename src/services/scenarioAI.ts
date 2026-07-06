// Service layer — Appels IA Scénario & IA Chapitre
import { supabase } from "@/integrations/supabase/client";
import { logGenerationFailure, logGenerationInfo } from "@/lib/generationLogger";
import type { NarrativeCoherenceAlert } from "@/types";

// ── Types ─────────────────────────────────────────────────────

export interface ScenarioAIRequest {
  mode: "scenario";
  prompt: string;
  existing_content?: string;
  project_description?: string;
  next_chapter_number?: number;
  project_id?: string;
}

export interface ChapterAIRequest {
  mode: "chapter";
  prompt: string;
  chapter_title: string;
  chapter_content: string;
  chapter_number?: number;
  project_id?: string;
}

/** Densité de texte du découpage — module les plafonds de bulles par case. */
export type DetectBlocksDensity = "aere" | "standard" | "dense";

export interface DetectBlocksRequest {
  mode: "detect_blocks";
  chapter_content: string;
  chapter_title?: string;
  chapter_number?: number;
  target_panel_count?: number;
  /** Contexte assets du projet (nom + type) pour que l'IA utilise les noms exacts dans les descriptions */
  assets_context?: string;
  /** Lore de l'univers pour la cohérence narrative */
  universe_lore?: string;
  text_density?: DetectBlocksDensity;
  /** Genre du PROJET (texte libre FR : Fantasy, Action, Romance…) — calibre cases/SFX. */
  genre?: string;
  /** Tonalité du PROJET (Épique, Sombre, Humoristique…) — biaise registre/palette/rythme. */
  tone?: string;
  /** false = le type revelation_system est retiré de la grammaire (genres non-RPG). */
  allow_system_windows?: boolean;
}

export interface AiSummaryRequest {
  mode: "ai_summary";
  chapter_content: string;
  chapter_title?: string;
  chapter_number?: number;
}

export interface SuggestBlockPromptRequest {
  mode: "suggest_block_prompt";
  chapter_content: string;
  previous_summaries?: string;
  previous_prompts?: string[];
}

export interface SuggestAssetPromptRequest {
  mode: "suggest_asset_prompt";
  asset_name: string;
  asset_type: string;
  /** Style visuel du projet (project.style_template) pour cohérence. */
  style_description?: string;
  /** LORE / contexte scénario de l'asset. */
  context_excerpt?: string;
  /** Description déjà saisie à enrichir plutôt qu'à remplacer. */
  current_description?: string;
}

export interface NarrativeDirectionsRequest {
  mode: "narrative_directions";
  project_id: string;
  chapter_number?: number;
}

export interface NarrativeDirection {
  title: string;
  body: string;
}

export interface NarrativeDirectionsResponse {
  directions: NarrativeDirection[];
  mode: "narrative_directions";
  model: string;
}

export type AIRequest =
  | ScenarioAIRequest
  | ChapterAIRequest
  | DetectBlocksRequest
  | AiSummaryRequest
  | SuggestBlockPromptRequest
  | SuggestAssetPromptRequest
  | NarrativeDirectionsRequest;

export interface AIResponse {
  text: string;
  mode: "scenario" | "chapter";
  model: string;
}

export interface DetectBlocksResponse {
  blocks: Array<{ panel_number: number; description: string; text_excerpt: string }>;
  mode: "detect_blocks";
  model: string;
}

export interface AiSummaryResponse {
  text: string;
  mode: "ai_summary";
  model: string;
}

export interface SuggestBlockPromptResponse {
  text: string;
  mode: "suggest_block_prompt";
  model: string;
}

export interface SuggestAssetPromptResponse {
  text: string;
  mode: "suggest_asset_prompt";
  model: string;
}

// ── Message d'erreur utilisateur pour 401 ───────────────────────

const MSG_401 =
  "Session expirée ou invalide. Déconnectez-vous puis reconnectez-vous pour utiliser l'IA.";

// 503 = surcharge transitoire du serveur IA (Gemini aux heures de pointe) :
// on réessaie brièvement avant d'abandonner — indispensable pour le découpage
// multi-parties où un seul 503 tuerait toute la chaîne. 429 (quota quotidien)
// n'est jamais réessayé : ça ne se résout pas en quelques secondes.
const TRANSIENT_503_DELAYS_MS: number[] =
  import.meta.env.MODE === "test" ? [0, 0] : [2_000, 5_000];

// ── Helper interne : appel Edge Function ────────────────────────

async function callEdgeFunction<T>(payload: AIRequest): Promise<T> {
  logGenerationInfo("scenario-ai:start", {
    mode: payload.mode,
    prompt_chars: "prompt" in payload && payload.prompt ? payload.prompt.length : 0,
    chapter_content_chars:
      "chapter_content" in payload && payload.chapter_content
        ? payload.chapter_content.length
        : 0,
  });

  // Forcer le rafraîchissement du token puis relire la session (évite 401)
  await supabase.auth.refreshSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session?.access_token) {
    throw new Error(MSG_401);
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-scenario-ai`;

  const doFetch = async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
      },
      body: JSON.stringify(payload),
    });
    const resBody = await res.json().catch(() => ({}));
    return { res, resBody };
  };

  let { res, resBody } = await doFetch();
  for (let attempt = 0; res.status === 503 && attempt < TRANSIENT_503_DELAYS_MS.length; attempt++) {
    logGenerationInfo("scenario-ai:retry-503", { mode: payload.mode, attempt: attempt + 1 });
    await new Promise((r) => setTimeout(r, TRANSIENT_503_DELAYS_MS[attempt]));
    ({ res, resBody } = await doFetch());
  }

  if (!res.ok) {
    logGenerationFailure(
      "scenario-ai:http-error",
      {
        mode: payload.mode,
        status: res.status,
      },
      resBody
    );
    if (res.status === 401) {
      throw new Error(MSG_401);
    }
    // 429 = limite quotidienne / TPM Groq atteinte. Toujours afficher le
    // message court de l'Edge Function plutôt que le JSON Groq brut.
    if (res.status === 429 || resBody?.rateLimited) {
      throw new Error(
        resBody?.error ??
          "Limite quotidienne IA atteinte. Réessayez dans quelques heures."
      );
    }
    const errorField = typeof resBody?.error === "string" ? resBody.error : res.statusText;
    const detailsField = typeof resBody?.details === "string" ? resBody.details : null;
    const requestId =
      typeof resBody?.request_id === "string" && resBody.request_id.trim()
        ? resBody.request_id.trim()
        : null;
    const msg = detailsField ? `${errorField} — ${detailsField}` : errorField;
    const withRequestId = requestId ? `${msg} (request_id: ${requestId})` : msg;
    throw new Error(withRequestId || `Erreur serveur (${res.status})`);
  }

  return resBody as T;
}

// ── Appels publics ────────────────────────────────────────────

export async function callScenarioAI(
  payload: ScenarioAIRequest | ChapterAIRequest
): Promise<AIResponse> {
  return callEdgeFunction<AIResponse>(payload);
}


/** Détecte les blocs (panels suggérés) dans un chapitre en prose. */
export async function callDetectBlocks(
  payload: DetectBlocksRequest
): Promise<DetectBlocksResponse> {
  return callEdgeFunction<DetectBlocksResponse>(payload);
}

/** Génère un résumé ultra-compact (~100 mots) d'un chapitre pour alimenter l'IA. */
export async function callGenerateAiSummary(
  payload: AiSummaryRequest
): Promise<AiSummaryResponse> {
  return callEdgeFunction<AiSummaryResponse>(payload);
}

/** Suggère un prompt image pour un bloc vide dans l'éditeur. */
export async function callSuggestBlockPrompt(
  payload: SuggestBlockPromptRequest
): Promise<SuggestBlockPromptResponse> {
  return callEdgeFunction<SuggestBlockPromptResponse>(payload);
}

/**
 * Décrit un asset (personnage/décor/objet) via l'IA scénario pour pré-remplir
 * un prompt riche et éditable. Ne consomme aucun crédit image (génération de texte).
 */
export async function callSuggestAssetPrompt(
  payload: SuggestAssetPromptRequest
): Promise<SuggestAssetPromptResponse> {
  return callEdgeFunction<SuggestAssetPromptResponse>(payload);
}

/** Génère des directions narratives basées sur le Lore + scénario du projet. */
export async function generateNarrativeDirections(
  projectId: string,
  chapterNumber?: number
): Promise<NarrativeDirectionsResponse> {
  return callEdgeFunction<NarrativeDirectionsResponse>({
    mode: "narrative_directions",
    project_id: projectId,
    chapter_number: chapterNumber,
  });
}

// ── NarraMind Update ──────────────────────────────────────────

export interface NarraMindUpdateResponse {
  success: boolean;
  summary: string;
  entities_updated: number;
  /** Détectées par le LLM — non persistées sur `scenario_chapters` (colonne vidée). */
  anomalies: NarrativeCoherenceAlert[];
  narramind_checked_at?: string;
  total_context_tokens: number;
  needs_compression: boolean;
}

export async function triggerNarraMindUpdate(
  projectId: string,
  chapterId: string
): Promise<NarraMindUpdateResponse> {
  await supabase.auth.refreshSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;
  if (!session?.access_token) throw new Error("Session expirée.");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narramind-update`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    },
    body: JSON.stringify({ project_id: projectId, chapter_id: chapterId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const b = body as { error?: string; details?: string; finish_reason?: string };
    const parts = [b.error, b.details].filter((x): x is string => !!x?.trim());
    if (b.finish_reason) parts.push(`Arrêt : ${b.finish_reason}`);
    throw new Error(parts.join(" — ").trim() || `Erreur ${res.status}`);
  }
  return body as NarraMindUpdateResponse;
}

