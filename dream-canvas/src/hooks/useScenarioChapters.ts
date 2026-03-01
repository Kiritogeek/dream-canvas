// React Query hooks — Scenario chapters & versions
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as scenarioService from "@/services/scenarioChapters";
import type {
  ScenarioChapterInsert,
  ScenarioChapterUpdate,
  ScenarioVersionInsert,
} from "@/types";

// ── Query keys ───────────────────────────────────────────────

const keys = {
  chapters: (projectId: string) => ["scenario-chapters", projectId] as const,
  chapter: (id: string) => ["scenario-chapter", id] as const,
  versions: (projectId: string) => ["scenario-versions", projectId] as const,
  chapterVersions: (chapterId: string) =>
    ["scenario-versions", "chapter", chapterId] as const,
  pendingVersion: (projectId: string, chapterId?: string) =>
    ["scenario-versions", "pending", projectId, chapterId ?? "__full"] as const,
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
      projectId,
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

/** Suppression d'un chapitre de scénario */
export function useDeleteScenarioChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
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
      projectId,
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

// ── Scenario versions ────────────────────────────────────────

/** Toutes les versions d'un projet */
export function useScenarioVersions(projectId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.versions(projectId!),
    queryFn: () => scenarioService.fetchScenarioVersions(projectId!),
    enabled: !!user && !!projectId,
    staleTime: 30_000,
  });
}

/** Versions d'un chapitre de scénario */
export function useChapterVersions(chapterId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.chapterVersions(chapterId!),
    queryFn: () => scenarioService.fetchChapterVersions(chapterId!),
    enabled: !!user && !!chapterId,
    staleTime: 30_000,
  });
}

/** Version en attente (pending) pour un chapitre ou le scénario complet */
export function usePendingVersion(
  projectId: string | undefined,
  chapterId?: string
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.pendingVersion(projectId!, chapterId),
    queryFn: () =>
      scenarioService.fetchPendingVersion(projectId!, chapterId),
    enabled: !!user && !!projectId,
    staleTime: 10_000,
  });
}

/** Créer une version (résultat IA ou sauvegarde manuelle) */
export function useCreateScenarioVersion() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (
      data: Pick<
        ScenarioVersionInsert,
        "project_id" | "scenario_chapter_id" | "content" | "version_type"
      >
    ) =>
      scenarioService.createScenarioVersion({
        ...data,
        user_id: user!.id,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: keys.versions(variables.project_id),
      });
      if (variables.scenario_chapter_id) {
        qc.invalidateQueries({
          queryKey: keys.chapterVersions(variables.scenario_chapter_id),
        });
      }
      qc.invalidateQueries({
        queryKey: keys.pendingVersion(
          variables.project_id,
          variables.scenario_chapter_id ?? undefined
        ),
      });
    },
  });
}

/** Accepter une version */
export function useAcceptScenarioVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      versionId,
    }: {
      versionId: string;
      projectId: string;
      chapterId?: string;
    }) => scenarioService.acceptScenarioVersion(versionId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: keys.versions(variables.projectId),
      });
      if (variables.chapterId) {
        qc.invalidateQueries({
          queryKey: keys.chapterVersions(variables.chapterId),
        });
        qc.invalidateQueries({
          queryKey: keys.chapter(variables.chapterId),
        });
      }
      qc.invalidateQueries({
        queryKey: keys.pendingVersion(
          variables.projectId,
          variables.chapterId
        ),
      });
      qc.invalidateQueries({
        queryKey: keys.chapters(variables.projectId),
      });
    },
  });
}

/** Rejeter une version */
export function useRejectScenarioVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      versionId,
    }: {
      versionId: string;
      projectId: string;
      chapterId?: string;
    }) => scenarioService.rejectScenarioVersion(versionId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: keys.versions(variables.projectId),
      });
      if (variables.chapterId) {
        qc.invalidateQueries({
          queryKey: keys.chapterVersions(variables.chapterId),
        });
      }
      qc.invalidateQueries({
        queryKey: keys.pendingVersion(
          variables.projectId,
          variables.chapterId
        ),
      });
    },
  });
}
