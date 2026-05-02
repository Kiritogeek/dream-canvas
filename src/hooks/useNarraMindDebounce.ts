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

      const timer = setTimeout(() => {
        pendingTimers.delete(projectId);
        void triggerNarraMindUpdate(projectId, chapterId)
          .then(() => {
            void qc.invalidateQueries({ queryKey: ["narramind-alerts", projectId] });
          })
          .catch(() => {});
      }, DEBOUNCE_MS);

      pendingTimers.set(projectId, timer);
    },
    [qc]
  );

  return { schedule };
}
