// Service layer — Appels IA Scénario & IA Chapitre
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────

export interface ScenarioAIRequest {
  mode: "scenario";
  prompt: string;
  existing_content?: string;
  project_description?: string;
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

export type AIRequest = ScenarioAIRequest | ChapterAIRequest | PanelsAIRequest;

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

// ── Message d'erreur utilisateur pour 401 ───────────────────────

const MSG_401 =
  "Session expirée ou invalide. Déconnectez-vous puis reconnectez-vous pour utiliser l'IA.";

// ── Appel Edge Function ───────────────────────────────────────

export async function callScenarioAI(
  payload: AIRequest
): Promise<AIResponse> {
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
    const details = resBody?.details ?? resBody?.error ?? res.statusText;
    const msg =
      typeof details === "string"
        ? details
        : typeof details === "object" && details !== null
          ? (details as { message?: string }).message ?? JSON.stringify(details)
          : String(details);
    throw new Error(msg || `Erreur serveur (${res.status})`);
  }

  return resBody as AIResponse;
}

/** Découpage chapitre textuel en panels (IA). Retourne la liste des panels avec description et contexte. */
export async function callSplitChapterIntoPanels(
  payload: PanelsAIRequest
): Promise<PanelsAIResponse> {
  // Forcer le rafraîchissement du token puis relire la session (évite 401)
  await supabase.auth.refreshSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session?.access_token) {
    throw new Error(MSG_401);
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-scenario-ai`;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey,
    },
    body: JSON.stringify(payload),
  });

  const resBody = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(MSG_401);
    }
    const details = resBody?.details ?? resBody?.error ?? res.statusText;
    const msg =
      typeof details === "string"
        ? details
        : typeof details === "object" && details !== null
          ? (details as { message?: string }).message ?? JSON.stringify(details)
          : String(details);
    throw new Error(msg || `Erreur serveur (${res.status})`);
  }

  return resBody as PanelsAIResponse;
}
