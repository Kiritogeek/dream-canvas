// React Query hooks — Panels + découpage IA
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as panelsService from "@/services/panels";
import { callSplitChapterIntoPanels } from "@/services/scenarioAI";
import { updateScenarioChapter } from "@/services/scenarioChapters";
import type { PanelOutlineItem } from "@/types";

const keys = {
  list: (chapterId: string) => ["panels", chapterId] as const,
};

/** Liste des panels d'un chapitre */
export function usePanels(chapterId: string | undefined) {
  return useQuery({
    queryKey: keys.list(chapterId!),
    queryFn: () => panelsService.fetchPanelsByChapter(chapterId!),
    enabled: !!chapterId,
  });
}

/** Découpage IA : chapitre texte → liste de panels (sans créer les enregistrements) */
export function useSplitChapterIntoPanels() {
  return useMutation({
    mutationFn: (params: {
      chapter_title: string;
      chapter_content: string;
      chapter_number?: number;
      target_panel_count?: number;
    }) =>
      callSplitChapterIntoPanels({
        mode: "panels",
        chapter_title: params.chapter_title,
        chapter_content: params.chapter_content,
        chapter_number: params.chapter_number,
        target_panel_count: params.target_panel_count,
      }),
  });
}

/** Créer les panels à partir d'un outline (liste descriptions + contexte) */
export function useCreatePanelsFromOutline(chapterId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (outline: PanelOutlineItem[]) =>
      panelsService.createPanelsFromOutline(chapterId, user!.id, outline),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(chapterId) });
    },
  });
}

/** Remplacer tous les panels du chapitre par un outline (supprime puis crée) */
export function useReplacePanelsFromOutline(chapterId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (outline: PanelOutlineItem[]) =>
      panelsService.replacePanelsFromOutline(chapterId, user!.id, outline),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(chapterId) });
    },
  });
}

/** Mettre à jour un panel (ex. description / prompt) */
export function useUpdatePanel(chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Parameters<typeof panelsService.updatePanel>[1];
    }) => panelsService.updatePanel(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(chapterId) });
    },
  });
}

/** Supprimer un panel */
export function useDeletePanel(chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (panelId: string) => panelsService.deletePanel(panelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(chapterId) });
    },
  });
}

/** Génération d'image pour un panel (Edge Function generate-panel-image) */
export function useGeneratePanelImage(chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      panel: { id: string; prompt: string | null };
      project: { id: string; style_template?: string | null; style_image_urls?: string[] | null };
    }) =>
      panelsService.generatePanelImage({
        panel_id: params.panel.id,
        prompt: (params.panel.prompt ?? "").trim(),
        style_template: params.project.style_template ?? undefined,
        style_image_urls: params.project.style_image_urls ?? undefined,
        project_id: params.project.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(chapterId) });
      queryClient.invalidateQueries({ queryKey: ["monthlyUsage"] });
    },
  });
}
