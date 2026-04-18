// React Query hook — IA Scénario & IA Chapitre
import { useMutation } from "@tanstack/react-query";
import {
  callScenarioAI,
  type ScenarioAIRequest,
  type ChapterAIRequest,
  type AIResponse,
} from "@/services/scenarioAI";

type ScenarioOrChapterRequest = ScenarioAIRequest | ChapterAIRequest;

/**
 * Mutation pour appeler l'IA (mode "scenario" ou "chapter").
 * Retourne le texte généré dans `data.text`.
 *
 * Usage :
 *   const ai = useScenarioAI();
 *   ai.mutate({ mode: "scenario", prompt: "..." });
 *   ai.mutate({ mode: "chapter", prompt: "...", chapter_title: "...", chapter_content: "..." });
 */
export function useScenarioAI() {
  return useMutation<AIResponse, Error, ScenarioOrChapterRequest>({
    mutationFn: callScenarioAI,
  });
}
