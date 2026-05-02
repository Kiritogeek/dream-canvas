import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as service from "@/services/narramindMissingAssetsService";

export function useNarramindMissingAssets(projectId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["narramind-missing-assets", projectId],
    queryFn: () => service.fetchNarramindMissingAssets(projectId!),
    enabled: !!user && !!projectId,
    staleTime: 15_000,
  });
}

export function useDismissNarramindMissingAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.setNarramindMissingAssetStatus(id, "dismissed"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["narramind-missing-assets"] });
    },
  });
}
