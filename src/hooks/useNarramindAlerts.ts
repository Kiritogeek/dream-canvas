import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as narramindAlertsService from "@/services/narramindAlerts";
import type { NarraMindAlertStatus } from "@/types";

export function useNarraMindAlerts(
  projectId: string | undefined,
  options?: { chapterId?: string; statuses?: NarraMindAlertStatus[] }
) {
  const { user } = useAuth();
  const chapterId = options?.chapterId;
  const statuses = options?.statuses ?? ["active"];

  return useQuery({
    queryKey: ["narramind-alerts", projectId, chapterId ?? "all", statuses],
    queryFn: () =>
      narramindAlertsService.fetchNarraMindAlerts({
        projectId: projectId!,
        chapterId,
        statuses,
      }),
    enabled: !!user && !!projectId,
    staleTime: 15_000,
  });
}

export function useSetNarraMindAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rowId,
      status,
    }: {
      rowId: string;
      status: "resolved" | "dismissed";
    }) => narramindAlertsService.setNarraMindAlertStatus(rowId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["narramind-alerts"] });
    },
  });
}
