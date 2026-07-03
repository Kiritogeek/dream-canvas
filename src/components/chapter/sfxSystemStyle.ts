// Helpers de style partagés SFX / fenêtres système (séparés des composants pour react-refresh).
import type { SfxBlock } from "@/types";

/**
 * Contour simulé par text-shadows multi-directionnels : html2canvas (export ZIP)
 * ne rend pas -webkit-text-stroke, mais rend text-shadow. 16 directions = contour lisse.
 */
export function buildSfxTextShadow(sfx: Pick<SfxBlock, "strokeColor" | "strokeWidth" | "glowColor" | "glowBlur">): string {
  const shadows: string[] = [];
  const r = Math.max(0, sfx.strokeWidth);
  if (r > 0) {
    const STEPS = 16;
    for (let i = 0; i < STEPS; i++) {
      const angle = (2 * Math.PI * i) / STEPS;
      const dx = (Math.cos(angle) * r).toFixed(2);
      const dy = (Math.sin(angle) * r).toFixed(2);
      shadows.push(`${dx}px ${dy}px 0 ${sfx.strokeColor}`);
    }
  }
  if (sfx.glowColor && (sfx.glowBlur ?? 0) > 0) {
    shadows.push(`0 0 ${sfx.glowBlur}px ${sfx.glowColor}`);
    shadows.push(`0 0 ${(sfx.glowBlur ?? 0) * 2}px ${sfx.glowColor}`);
  }
  return shadows.join(", ");
}

/** hex #rrggbb → rgba(r,g,b,a). Retourne le hex brut si le format est inattendu. */
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
