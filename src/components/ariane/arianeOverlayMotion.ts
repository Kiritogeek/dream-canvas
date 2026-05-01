/** Paramètres d’animation communs aux overlays Ariane (référence : premier onboarding tableau de bord), légèrement allongés pour un rendu fluide. */

export const ARIANE_SHELL_EASE = [0.22, 1, 0.36, 1] as const;

export const ARIANE_TEXT_EASE = [0.25, 0.9, 0.35, 1] as const;

export const ARIANE_OVERLAY_ENTER_S = 0.38;

export const ARIANE_OVERLAY_EXIT_S = 0.52;

export const ARIANE_BACKDROP_ENTER_S = 0.4;

/** Délai avant apparition stagger du texte bulle — synchronisée avec entrée enveloppe bulle/personnage. */
export const ARIANE_BUBBLE_CONTENT_REVEAL_DELAY_MS = 380;

/** Après stagger texte visible : focus bouton principal. */
export const ARIANE_FOCUS_AFTER_REVEAL_MS = 1540;

export const ARIANE_BUBBLE_TEXT_STAGGER_CHILD_S = 0.16;

export const ARIANE_BUBBLE_TEXT_DELAY_CHILDREN_S = 0.08;

export const ARIANE_BUBBLE_TEXT_ITEM_DURATION_S = 0.82;

/** Décal vertical entrée lignes bulle — volontairement faible pour limiter les « sauts ». */
export const ARIANE_BUBBLE_TEXT_Y_OFFSET_PX = 10;

/** Signature « Ariane » coin haut gauche. */
export const ARIANE_SIGNATURE_ENTER_TRANSITION = {
  duration: 0.44,
  delay: 0.06,
  ease: ARIANE_SHELL_EASE,
} as const;

/** Colonne personnage. */
export const ARIANE_CHARACTER_ENTER_TRANSITION = {
  duration: 0.52,
  delay: 0.09,
  ease: ARIANE_SHELL_EASE,
} as const;

/** Enveloppe bulle SVG + zone scroll (sans remount par étape dans le tour onglets). */
export const ARIANE_BUBBLE_BOX_ENTER_INITIAL = {
  opacity: 0,
  scale: 0.992,
} as const;

export const ARIANE_BUBBLE_BOX_ENTER_TRANSITION = {
  duration: 0.46,
  delay: 0.11,
  ease: ARIANE_SHELL_EASE,
} as const;

/** Changement d’étape dans ArianeTabTourOverlay (contenu interne uniquement). */
export const ARIANE_TAB_STEP_CONTENT_INITIAL = { opacity: 0, y: 12 };

export const ARIANE_TAB_STEP_CONTENT_TRANSITION = {
  duration: 0.46,
  ease: ARIANE_SHELL_EASE,
} as const;

export const ARIANE_BACKDROP_ENTER_TRANSITION = {
  duration: ARIANE_BACKDROP_ENTER_S,
  ease: ARIANE_SHELL_EASE,
} as const;

export function arianeShellRootTransition(exiting: boolean) {
  return {
    duration: exiting ? ARIANE_OVERLAY_EXIT_S : ARIANE_OVERLAY_ENTER_S,
    ease: ARIANE_SHELL_EASE,
  };
}

export const arianeBubbleTextVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: ARIANE_BUBBLE_TEXT_STAGGER_CHILD_S,
      delayChildren: ARIANE_BUBBLE_TEXT_DELAY_CHILDREN_S,
    },
  },
};

export const arianeBubbleTextItem = {
  hidden: {
    opacity: 0,
    y: ARIANE_BUBBLE_TEXT_Y_OFFSET_PX,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ARIANE_BUBBLE_TEXT_ITEM_DURATION_S,
      ease: ARIANE_TEXT_EASE,
    },
  },
};
