import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNarraMindAlerts } from "@/hooks/useNarramindAlerts";
import { useNarramindMissingAssets } from "@/hooks/useNarramindMissingAssets";
import type { CompassProposal } from "@/types";

export function useArianeSidebarNotifs(projectId: string | undefined) {
  const { user } = useAuth();

  // Partage le cache avec useArianeLoreProposals (même query key + même queryFn)
  const { data: loreProposals } = useQuery({
    queryKey: ["lore-proposals", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compass_proposals")
        .select("*")
        .eq("project_id", projectId!)
        .in("proposal_type", ["lore_asset", "lore_chapter_update", "lore_connection", "lore_event"])
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompassProposal[];
    },
    enabled: !!user && !!projectId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const { data: scenarioAlerts } = useNarraMindAlerts(projectId);
  const { data: missingAssets } = useNarramindMissingAssets(projectId);

  return {
    hasUniverseNotif: (loreProposals?.length ?? 0) > 0,
    hasScenarioNotif: (scenarioAlerts?.length ?? 0) > 0 || (missingAssets?.length ?? 0) > 0,
  };
}
