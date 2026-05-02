import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { triggerNarraMindUpdate } from "@/services/scenarioAI";

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 5 * 60 * 1000;

export function useNarraMindDebounce() {
  const qc = useQueryClient();
  const scheduledKeysRef = useRef<Set<string>>(new Set());

  const schedule = useCallback(
    (projectId: string, chapterId: string) => {
      const key = projectId;
      const existing = pendingTimers.get(key);
      if (existing) clearTimeout(existing);

      scheduledKeysRef.current.add(key);

      const timer = setTimeout(() => {
        pendingTimers.delete(key);
        scheduledKeysRef.current.delete(key);
        void triggerNarraMindUpdate(projectId, chapterId)
          .then(() => {
            void qc.invalidateQueries({ queryKey: ["narramind-alerts", projectId] });
          })
          .catch(() => {});
      }, DEBOUNCE_MS);

      pendingTimers.set(key, timer);
    },
    [qc]
  );

  useEffect(() => {
    const keys = scheduledKeysRef.current;
    return () => {
      for (const key of keys) {
        const t = pendingTimers.get(key);
        if (t) {
          clearTimeout(t);
          pendingTimers.delete(key);
        }
      }
      keys.clear();
    };
  }, []);

  return { schedule };
}
