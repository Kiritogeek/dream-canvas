// React Query hooks — Chapitres webtoon (table chapters)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as chapterService from "@/services/chapters";

const keys = {
  list: (projectId: string) => ["chapters", projectId] as const,
  detail: (chapterId: string) => ["chapter", chapterId] as const,
};

/** Liste des chapitres visuels d'un projet */
export function useChapters(projectId: string | undefined) {
  return useQuery({
    queryKey: keys.list(projectId!),
    queryFn: () => chapterService.fetchChapters(projectId!),
    enabled: !!projectId,
  });
}

/** Un chapitre par id */
export function useChapter(chapterId: string | undefined) {
  return useQuery({
    queryKey: keys.detail(chapterId!),
    queryFn: () => chapterService.fetchChapter(chapterId!),
    enabled: !!chapterId,
  });
}

/** Créer un chapitre */
export function useCreateChapter(projectId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (params: {
      title: string;
      chapter_number: number;
      synopsis?: string;
      linked_scenario_chapter_id?: string | null;
    }) =>
      chapterService.createChapter({
        project_id: projectId,
        user_id: user!.id,
        title: params.title,
        chapter_number: params.chapter_number,
        synopsis: params.synopsis ?? null,
        linked_scenario_chapter_id: params.linked_scenario_chapter_id ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(projectId) });
    },
  });
}

/** Mettre à jour un chapitre */
export function useUpdateChapter(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof chapterService.updateChapter>[1] }) =>
      chapterService.updateChapter(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: keys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: keys.detail(id) });
    },
  });
}

/** Supprimer un chapitre */
export function useDeleteChapter(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => chapterService.deleteChapter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(projectId) });
    },
  });
}

/** Réordonner les chapitres */
export function useReorderChapters(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chapters: { id: string; chapter_number: number }[]) =>
      chapterService.reorderChapters(chapters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(projectId) });
    },
  });
}
