// Service layer — Appels IA Scénario & IA Chapitre
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────

export interface ScenarioAIRequest {
  mode: "scenario";
  prompt: string;
  existing_content?: string;
  project_description?: string;
  next_chapter_number?: number;
}

export interface ChapterAIRequest {
  mode: "chapter";
  prompt: string;
  chapter_title: string;
  chapter_content: string;
  chapter_number?: number;
}

export interface PanelsAIRequest {
  mode: "panels";
  chapter_title: string;
  chapter_content: string;
  chapter_number?: number;
  target_panel_count?: number;
}

export interface DetectBlocksRequest {
  mode: "detect_blocks";
  chapter_content: string;
  chapter_title?: string;
  chapter_number?: number;
  target_panel_count?: number;
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

export type AIRequest =
  | ScenarioAIRequest
  | ChapterAIRequest
  | PanelsAIRequest
  | DetectBlocksRequest
  | AiSummaryRequest
  | SuggestBlockPromptRequest;

export interface AIResponse {
  text: string;
  mode: "scenario" | "chapter";
  model: string;
}

export interface PanelsAIResponse {
  panels: Array<{ description: string; context?: { lieu?: string; scene?: string; personnages?: string } }>;
  mode: "panels";
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

// ── Message d'erreur utilisateur pour 401 ───────────────────────

const MSG_401 =
  "Session expirée ou invalide. Déconnectez-vous puis reconnectez-vous pour utiliser l'IA.";

// ── Helper interne : appel Edge Function ────────────────────────

async function callEdgeFunction<T>(payload: AIRequest): Promise<T> {
  // Forcer le rafraîchissement du token puis relire la session (évite 401)
  await supabase.auth.refreshSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session?.access_token) {
    throw new Error(MSG_401);
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-scenario-ai`;

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

  if (!res.ok) {
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
    const msg = detailsField ? `${errorField} — ${detailsField}` : errorField;
    throw new Error(msg || `Erreur serveur (${res.status})`);
  }

  return resBody as T;
}

// ── Appels publics ────────────────────────────────────────────

export async function callScenarioAI(
  payload: ScenarioAIRequest | ChapterAIRequest
): Promise<AIResponse> {
  return callEdgeFunction<AIResponse>(payload);
}

/** Découpage chapitre textuel en panels (IA). Retourne la liste des panels avec description et contexte. */
export async function callSplitChapterIntoPanels(
  payload: PanelsAIRequest
): Promise<PanelsAIResponse> {
  return callEdgeFunction<PanelsAIResponse>(payload);
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
