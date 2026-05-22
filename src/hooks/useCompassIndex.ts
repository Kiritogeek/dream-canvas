import { useCallback } from "react";
import { triggerCompassIndex, type CompassSourceType } from "@/services/compassIndex";

export function useCompassIndex() {
  const indexContent = useCallback(
    (
      projectId: string,
      sourceType: CompassSourceType,
      sourceId: string,
      content: string,
      sectionKey?: string
    ) => {
      // Fire-and-forget — pas de await, pas de state
      void triggerCompassIndex(projectId, sourceType, sourceId, content, sectionKey);
    },
    []
  );

  return { indexContent };
}
