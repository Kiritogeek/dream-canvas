import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { triggerNarraMindUpdate } from "@/services/scenarioAI";

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 5 * 60 * 1000;

export function useNarraMindDebounce() {
  const qc = useQueryClient();

  const schedule = useCallback(
    (projectId: string, chapterId: string) => {
      const existing = pendingTimers.get(projectId);
      if (existing) clearTimeout(existing);

      console.debug(`[NarraMind] Timer démarré — fire dans ${DEBOUNCE_MS / 1000}s (project=${projectId})`);

      const timer = setTimeout(() => {
        pendingTimers.delete(projectId);
        console.debug(`[NarraMind] Appel Edge Function narramind-update (project=${projectId}, chapter=${chapterId})`);
        void triggerNarraMindUpdate(projectId, chapterId)
          .then((res) => {
            console.debug("[NarraMind] Succès →", res);
            void qc.invalidateQueries({ queryKey: ["narramind-alerts", projectId] });
          })
          .catch((err: unknown) => {
            console.error("[NarraMind] Erreur Edge Function →", err);
          });
      }, DEBOUNCE_MS);

      pendingTimers.set(projectId, timer);
    },
    [qc]
  );

  return { schedule };
}
