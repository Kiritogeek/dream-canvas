// React Query hooks — Scenario chapters
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as scenarioService from "@/services/scenarioChapters";
import type {
  ScenarioChapterInsert,
  ScenarioChapterUpdate,
  ChapterAssetsState,
} from "@/types";

// ── Query keys ───────────────────────────────────────────────

const keys = {
  chapters: (projectId: string) => ["scenario-chapters", projectId] as const,
  chapter: (id: string) => ["scenario-chapter", id] as const,
  chapterAssets: (chapterId: string) => ["chapter-assets", chapterId] as const,
};

// ── Scenario chapters ────────────────────────────────────────

/** Liste des chapitres de scénario d'un projet */
export function useScenarioChapters(projectId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.chapters(projectId!),
    queryFn: () => scenarioService.fetchScenarioChapters(projectId!),
    enabled: !!user && !!projectId,
    staleTime: 30_000,
  });
}

/** Détail d'un chapitre de scénario */
export function useScenarioChapter(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.chapter(id!),
    queryFn: () => scenarioService.fetchScenarioChapter(id!),
    enabled: !!user && !!id,
    staleTime: 30_000,
  });
}

/** Création d'un chapitre de scénario */
export function useCreateScenarioChapter() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (
      data: Pick<
        ScenarioChapterInsert,
        "project_id" | "title" | "chapter_number" | "content"
      >
    ) =>
      scenarioService.createScenarioChapter({
        ...data,
        user_id: user!.id,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: keys.chapters(variables.project_id),
      });
    },
  });
}

/** Mise à jour d'un chapitre de scénario */
export function useUpdateScenarioChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      projectId: _projectId,
      updates,
    }: {
      id: string;
      projectId: string;
      updates: ScenarioChapterUpdate;
    }) => scenarioService.updateScenarioChapter(id, updates),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: keys.chapters(variables.projectId),
      });
      qc.invalidateQueries({
        queryKey: keys.chapter(variables.id),
      });
    },
  });
}

/** Validation (verrou) d'un chapitre de scénario */
export function useValidateChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) =>
      scenarioService.updateScenarioChapter(id, {
        validated: true,
        validated_at: new Date().toISOString(),
      }),
    onSuccess: (data, variables) => {
      // Mise à jour immédiate du cache — l'UI réagit sans attendre le refetch réseau
      qc.setQueryData(keys.chapter(variables.id), data);
      qc.invalidateQueries({ queryKey: keys.chapters(variables.projectId) });
    },
  });
}

/** Déverrouillage d'un chapitre de scénario */
export function useUnvalidateChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) =>
      scenarioService.updateScenarioChapter(id, {
        validated: false,
        validated_at: null,
      }),
    onSuccess: (data, variables) => {
      qc.setQueryData(keys.chapter(variables.id), data);
      qc.invalidateQueries({ queryKey: keys.chapters(variables.projectId) });
    },
  });
}

// ── Curation des assets de chapitre (étape 2) ────────────────

/** Lit la colonne `chapter_assets` (décisions de curation). */
export function useChapterAssets(chapterId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.chapterAssets(chapterId!),
    queryFn: () => scenarioService.fetchChapterAssets(chapterId!),
    enabled: !!user && !!chapterId,
    staleTime: 30_000,
  });
}

/** Écrit l'état complet de curation des assets d'un chapitre. */
export function useUpdateChapterAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      chapterId,
      state,
    }: {
      chapterId: string;
      projectId: string;
      state: ChapterAssetsState;
    }) => scenarioService.updateChapterAssets(chapterId, state),
    onSuccess: (data, variables) => {
      qc.setQueryData(keys.chapterAssets(variables.chapterId), data);
      qc.invalidateQueries({ queryKey: keys.chapter(variables.chapterId) });
    },
  });
}

/** Verrouille l'étape assets (`chapter_assets.validated = true`). */
export function useValidateChapterAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      chapterId,
      state,
    }: {
      chapterId: string;
      projectId: string;
      state: ChapterAssetsState;
    }) =>
      scenarioService.updateChapterAssets(chapterId, {
        ...state,
        validated: true,
      }),
    onSuccess: (data, variables) => {
      qc.setQueryData(keys.chapterAssets(variables.chapterId), data);
      qc.invalidateQueries({ queryKey: keys.chapter(variables.chapterId) });
    },
  });
}

/** Déverrouille l'étape assets (`chapter_assets.validated = false`). */
export function useUnvalidateChapterAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      chapterId,
      state,
    }: {
      chapterId: string;
      projectId: string;
      state: ChapterAssetsState;
    }) =>
      scenarioService.updateChapterAssets(chapterId, {
        ...state,
        validated: false,
      }),
    onSuccess: (data, variables) => {
      qc.setQueryData(keys.chapterAssets(variables.chapterId), data);
      qc.invalidateQueries({ queryKey: keys.chapter(variables.chapterId) });
    },
  });
}

/** Suppression d'un chapitre de scénario */
export function useDeleteScenarioChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId: _projectId }: { id: string; projectId: string }) =>
      scenarioService.deleteScenarioChapter(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: keys.chapters(variables.projectId),
      });
    },
  });
}

/** Réordonnancement des chapitres de scénario */
export function useReorderScenarioChapters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId: _projectId,
      chapters,
    }: {
      projectId: string;
      chapters: { id: string; chapter_number: number }[];
    }) => scenarioService.reorderScenarioChapters(chapters),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: keys.chapters(variables.projectId),
      });
    },
  });
}
