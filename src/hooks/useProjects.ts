// React Query hooks — Projets
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as projectService from "@/services/projects";
import type { ProjectUpdate } from "@/types";

/** Liste de tous les projets de l'utilisateur */
export function useProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["projects"],
    queryFn: projectService.fetchProjects,
    enabled: !!user,
    staleTime: 30_000, // 30s
  });
}

/** Projets récents (dashboard) */
export function useRecentProjects(limit = 6) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["projects", "recent", limit],
    queryFn: () => projectService.fetchRecentProjects(limit),
    enabled: !!user,
    staleTime: 30_000,
  });
}

/** Détail d'un projet */
export function useProject(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.fetchProject(id!),
    enabled: !!user && !!id,
    staleTime: 60_000,
  });
}

/** Création de projet */
export function useCreateProject() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: { title: string; description: string | null }) =>
      projectService.createProject({
        ...data,
        user_id: user!.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/** Mise à jour de projet */
export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ProjectUpdate }) =>
      projectService.updateProject(id, updates),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["project", variables.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/** Suppression de projet */
export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectService.deleteProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/** Compteur de projets */
export function useProjectCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["projects", "count"],
    queryFn: projectService.countProjects,
    enabled: !!user,
    staleTime: 60_000,
  });
}
