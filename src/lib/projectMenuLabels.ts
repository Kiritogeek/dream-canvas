/** Libellés menu projet (sidebar) — aligner onboarding et navigation. */
export const PROJECT_MENU_LABEL = {
  style: "Style",
  scenario: "Scénario",
  assets: "Assets",
  universe: "Univers",
  edition: "Édition",
} as const;

export type ProjectMenuKey = keyof typeof PROJECT_MENU_LABEL;
