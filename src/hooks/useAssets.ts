// React Query hooks — Assets
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as assetService from "@/services/assets";
import type { Asset, AssetInsert, AssetUpdate } from "@/types";

/** Liste des assets d'un projet */
export function useAssets(projectId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["assets", projectId],
    queryFn: () => assetService.fetchAssets(projectId!),
    enabled: !!user && !!projectId,
    staleTime: 30_000,
  });
}

/** Création d'asset */
export function useCreateAsset() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (
      data: Pick<AssetInsert, "project_id" | "name" | "asset_type" | "prompt">
    ) =>
      assetService.createAsset({
        ...data,
        user_id: user!.id,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["assets", variables.project_id] });
      qc.invalidateQueries({ queryKey: ["assets", "count"] });
    },
  });
}

/** Mise à jour d'un asset (nom, prompt, etc.) */
export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId: _projectId, updates }: { id: string; projectId: string; updates: AssetUpdate }) =>
      assetService.updateAsset(id, updates),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["assets", variables.projectId] });
    },
  });
}

/** Suppression d'asset (avec nettoyage Storage) */
export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (asset: Asset) => assetService.deleteAsset(asset),
    onSuccess: (_data, asset) => {
      qc.invalidateQueries({ queryKey: ["assets", asset.project_id] });
      qc.invalidateQueries({ queryKey: ["assets", "count"] });
    },
  });
}

/** Compteur d'assets */
export function useAssetCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["assets", "count"],
    queryFn: assetService.countAssets,
    enabled: !!user,
    staleTime: 60_000,
  });
}
