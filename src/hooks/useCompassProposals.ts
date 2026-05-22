import { useState, useCallback } from "react";
import { fetchCompassProposals, type CompassProposal } from "@/services/compassIndex";
import { supabase } from "@/integrations/supabase/client";

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
