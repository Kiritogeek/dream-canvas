import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNarraMindAlerts } from "@/hooks/useNarramindAlerts";
import type { CompassProposal } from "@/types";

export function useArianeSidebarNotifs(projectId: string | undefined) {
  const { user } = useAuth();

  // Partage le cache avec useArianeLoreProposals (même query key)
  const { data: loreProposals } = useQuery({
    queryKey: ["lore-proposals", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compass_proposals")
        .select("*")
        .eq("project_id", projectId!)
        .in("proposal_type", ["lore_asset", "lore_chapter_update", "lore_connection"])
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompassProposal[];
    },
    enabled: !!user && !!projectId,
    staleTime: 30_000,
  });

  const { data: scenarioAlerts } = useNarraMindAlerts(projectId);

  return {
    hasUniverseNotif: (loreProposals?.length ?? 0) > 0,
    hasScenarioNotif: (scenarioAlerts?.length ?? 0) > 0,
  };
}
