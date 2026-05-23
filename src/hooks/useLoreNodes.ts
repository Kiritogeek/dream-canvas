import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as loreService from "@/services/loreNodes";
import type { LoreNodeInsert, LoreNodeUpdate } from "@/types";

const NODES_KEY = (projectId: string) => ["lore_nodes", projectId];

export function useLoreNodes(projectId: string) {
  return useQuery({
    queryKey: NODES_KEY(projectId),
    queryFn: () => loreService.fetchLoreNodes(projectId),
    staleTime: 60_000,
    enabled: !!projectId,
  });
}

export function useCreateLoreNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoreNodeInsert) => loreService.createLoreNode(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: NODES_KEY(variables.project_id) });
    },
  });
}

export function useUpdateLoreNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; projectId: string; updates: LoreNodeUpdate }) =>
      loreService.updateLoreNode(id, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: NODES_KEY(variables.projectId) });
    },
  });
}

export function useBatchUpdateLoreNodePositions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { projectId: string; nodes: { id: string; pos_x: number; pos_y: number }[] }) =>
      loreService.batchUpdateLoreNodePositions(vars.nodes),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: NODES_KEY(variables.projectId) });
    },
  });
}

export function useDeleteLoreNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) => loreService.deleteLoreNode(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: NODES_KEY(variables.projectId) });
    },
  });
}
