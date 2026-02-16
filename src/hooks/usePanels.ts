// React Query hooks — Panels (édition chapitre visuel, découpage, génération par bloc)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as panelsService from "@/services/panels";
import { callSplitChapterIntoPanels } from "@/services/scenarioAI";
import type { Panel, PanelOutlineItem, Project } from "@/types";
import type { PanelsAIRequest } from "@/services/scenarioAI";

const keys = {
  list: (chapterId: string) => ["panels", chapterId] as const,
};

/** Liste des panels d'un chapitre (ordre panel_number). */
export function usePanels(chapterId: string | undefined) {
  return useQuery({
    queryKey: keys.list(chapterId!),
    queryFn: () => panelsService.fetchPanels(chapterId!),
    enabled: !!chapterId,
  });
}

/** Créer un panel vide (l'utilisateur est libre du nombre de panels). */
export function useCreatePanel(chapterId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (panelNumber?: number) =>
      panelsService.createPanel(chapterId, user!.id, panelNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(chapterId) });
    },
  });
}

/** Suggestion IA : liste de panels à partir du chapitre textuel (optionnel). */
export function useSplitChapterIntoPanels() {
  return useMutation({
    mutationFn: (payload: PanelsAIRequest) => callSplitChapterIntoPanels(payload),
  });
}

/** Créer les panels à partir d'une suggestion (outline IA ou importée). */
export function useCreatePanelsFromOutline(chapterId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (outline: PanelOutlineItem[]) =>
      panelsService.createPanelsFromOutline(chapterId, outline, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(chapterId) });
    },
  });
}

/** Remplacer les panels du chapitre par ceux de l'outline. */
export function useReplacePanelsFromOutline(chapterId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (outline: PanelOutlineItem[]) =>
      panelsService.replacePanelsFromOutline(chapterId, outline, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(chapterId) });
    },
  });
}

/** Mettre à jour un panel (layout, prompt, etc.). */
export function useUpdatePanel(chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof panelsService.updatePanel>[1] }) =>
      panelsService.updatePanel(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: keys.list(chapterId) });
    },
  });
}

/** Supprimer un panel. */
export function useDeletePanel(chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => panelsService.deletePanel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(chapterId) });
    },
  });
}

/** Payload pour la génération d'image d'un bloc (dimensions = bloc). */
export interface GeneratePanelImageVariables {
  panel: { id: string; prompt: string };
  block: { id: string; width: number; height: number };
  project: Project;
  contextChapter?: string | null;
}

/** Génération d'image par bloc (dimensions du bloc envoyées à l'API). */
export function useGeneratePanelImage(chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: GeneratePanelImageVariables) =>
      panelsService.generatePanelBlockImage({
        panelId: vars.panel.id,
        blockId: vars.block.id,
        width: vars.block.width,
        height: vars.block.height,
        prompt: vars.panel.prompt,
        project: vars.project,
        contextChapter: vars.contextChapter,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(chapterId) });
    },
  });
}
