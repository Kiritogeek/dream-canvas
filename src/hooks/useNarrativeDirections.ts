import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateNarrativeDirections, type NarrativeDirection } from "@/services/scenarioAI";
import { useAuth } from "@/hooks/useAuth";

export function useNarrativeDirections(projectId: string) {
  const { user } = useAuth();
  const [directions, setDirections] = useState<NarrativeDirection[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: pendingProposalsCount = 0 } = useQuery({
    queryKey: ["lore-proposals-count", projectId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("compass_proposals")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("proposal_type", "lore_asset")
        .eq("status", "active");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!projectId && !!user,
  });

  const { data: loreStats = { total: 0, withDescription: 0 } } = useQuery({
    queryKey: ["lore-stats", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lore_nodes")
        .select("description")
        .eq("project_id", projectId);
      if (error) throw error;
      const nodes = data ?? [];
      return {
        total: nodes.length,
        withDescription: nodes.filter((n) => (n.description as string | null)?.trim()).length,
      };
    },
    enabled: !!projectId && !!user,
  });

  const generate = useCallback(async (chapterNumber?: number) => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateNarrativeDirections(projectId, chapterNumber);
      setDirections(result.directions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  }, [projectId]);

  const reset = useCallback(() => {
    setDirections([]);
    setError(null);
  }, []);

  return {
    directions,
    isGenerating,
    error,
    pendingProposalsCount,
    loreStats,
    generate,
    reset,
  };
}
