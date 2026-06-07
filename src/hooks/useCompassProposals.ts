import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCompassProposals,
  fetchActiveLoreAssetProposals,
  type CompassProposal,
} from "@/services/compassIndex";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Propositions lore_asset actives du projet (lecture BDD, React Query).
 * Alimente la section « À créer » du panneau de curation d'assets.
 */
export function useActiveLoreAssetProposals(projectId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["compass-proposals", "lore_asset", projectId],
    queryFn: () => fetchActiveLoreAssetProposals(projectId!),
    enabled: !!user && !!projectId,
    staleTime: 30_000,
  });
}

export function useCompassProposals(projectId: string) {
  const [proposals, setProposals] = useState<CompassProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(
    async (
      contextText: string,
      proposalType: "lore_world" | "lore_asset" | "narrative_direction" | "asset_prefill",
      sourceId?: string
    ) => {
      if (!contextText.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const results = await fetchCompassProposals(projectId, proposalType, contextText, sourceId);
        setProposals(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors du chargement des suggestions.");
      } finally {
        setLoading(false);
      }
    },
    [projectId]
  );

  const dismissProposal = useCallback(async (proposalId: string) => {
    await supabase.from("compass_proposals").update({ status: "dismissed" }).eq("id", proposalId);
    setProposals((prev) => prev.filter((p) => p.id !== proposalId));
  }, []);

  const acceptProposal = useCallback(async (proposalId: string) => {
    await supabase.from("compass_proposals").update({ status: "accepted" }).eq("id", proposalId);
    setProposals((prev) => prev.filter((p) => p.id !== proposalId));
  }, []);

  const reset = useCallback(() => {
    setProposals([]);
    setError(null);
  }, []);

  return { proposals, loading, error, fetchProposals, dismissProposal, acceptProposal, reset };
}
