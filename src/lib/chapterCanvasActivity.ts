import type { ColorBlockFill } from "@/types";

/** Résumé pour palettes / historique local de couleur sur le canvas. */
export function formatColorFillShort(fill: ColorBlockFill): string {
  if (fill.type === "solid") return fill.color;
  return `${fill.from} → ${fill.to}`;
}
