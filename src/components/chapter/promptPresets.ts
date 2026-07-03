/**
 * Presets de prompt image — vocabulaire FLUX extrait de la grammaire visuelle webtoon
 * (References/visual-grammar.md). Chaque chip ajoute ses keywords au prompt du bloc.
 */
export interface PromptPresetChip {
  label: string;
  keywords: string;
}

export interface PromptPresetGroup {
  label: string;
  chips: PromptPresetChip[];
}

export const PROMPT_PRESET_GROUPS: PromptPresetGroup[] = [
  {
    label: "Cadrage",
    chips: [
      { label: "Gros plan",       keywords: "extreme close-up face, expressive manga face" },
      { label: "Plan moyen",      keywords: "medium shot, waist up" },
      { label: "Plan large",      keywords: "wide establishing shot, full environment, atmospheric depth" },
      { label: "Plongée",         keywords: "high angle shot, looking down" },
      { label: "Contre-plongée",  keywords: "low angle dramatic shot, looking upward" },
      { label: "Par-dessus l'épaule", keywords: "over the shoulder shot, two-shot dialogue" },
      { label: "Caméra penchée",  keywords: "dutch angle, tilted camera 20 degrees, dynamic diagonal composition" },
    ],
  },
  {
    label: "Éclairage",
    chips: [
      { label: "Rim light",     keywords: "rim light silhouette, heroic backlight glow" },
      { label: "Contre-jour",   keywords: "strong backlight, menacing silhouette, deep shadow" },
      { label: "Douce",         keywords: "soft diffused lighting, gentle warm tones" },
      { label: "Dramatique",    keywords: "high contrast dramatic lighting, single light source, deep shadow contrast" },
      { label: "Néon nuit",     keywords: "neon night lighting, cool blue and purple glow" },
      { label: "Sépia souvenir", keywords: "soft warm sepia grade, nostalgic overexposed memory light" },
    ],
  },
  {
    label: "Ambiance",
    chips: [
      { label: "Braises",     keywords: "floating embers, glowing particles" },
      { label: "Pluie",       keywords: "heavy rain streaks, wet atmosphere" },
      { label: "Pétales",     keywords: "drifting flower petals in the air" },
      { label: "Fumée",       keywords: "smoke wisps, drifting haze" },
      { label: "Éclairs",     keywords: "crackling energy arcs, electric sparks" },
      { label: "Poussière",   keywords: "dust cloud, debris particles" },
      { label: "Speed lines", keywords: "radial speed lines, burst lines from center, kinetic energy" },
    ],
  },
];

/** Ajoute les keywords d'un chip au prompt (séparés par une virgule propre). */
export function appendPromptKeywords(prompt: string, keywords: string): string {
  const trimmed = prompt.trimEnd();
  if (!trimmed) return keywords;
  if (trimmed.toLowerCase().includes(keywords.toLowerCase())) return prompt;
  const sep = /[,.!?…]$/.test(trimmed) ? " " : ", ";
  return `${trimmed}${sep}${keywords}`;
}
