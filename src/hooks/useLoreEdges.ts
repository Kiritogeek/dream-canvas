import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as loreService from "@/services/loreNodes";
import type { LoreEdgeInsert } from "@/types";

const EDGES_KEY = (projectId: string) => ["lore_edges", projectId];
const NODES_KEY = (projectId: string) => ["lore_nodes", projectId];

export function useLoreEdges(projectId: string) {
  return useQuery({
    queryKey: EDGES_KEY(projectId),
    queryFn: () => loreService.fetchLoreEdges(projectId),
    staleTime: 60_000,
    enabled: !!projectId,
  });
}

export function useCreateLoreEdge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoreEdgeInsert) => loreService.createLoreEdge(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: EDGES_KEY(variables.project_id) });
      queryClient.invalidateQueries({ queryKey: NODES_KEY(variables.project_id) });
    },
  });
}

export function useUpdateLoreEdge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; projectId: string; updates: { label?: string | null } }) =>
      loreService.updateLoreEdge(id, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: EDGES_KEY(variables.projectId) });
    },
  });
}

export function useDeleteLoreEdge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) => loreService.deleteLoreEdge(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: EDGES_KEY(variables.projectId) });
    },
  });
}
