import type { ReactNode } from "react";

/**
 * Gras minimal pour les onboarding : segments entourés de ** ainsi **.
 */
export function onboardingParagraphLine(text: string): ReactNode {
  const chunks = text.split(/(\*\*[^*]+\*\*)/).filter(Boolean);
  if (chunks.length === 1) return chunks[0];
  return chunks.map((chunk, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(chunk);
    if (m) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {m[1]}
        </strong>
      );
    }
    return chunk;
  });
}
