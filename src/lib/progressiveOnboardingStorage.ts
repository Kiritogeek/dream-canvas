import {
  ARIANE_FORCED_PROGRESSIVE_PENDING,
  ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY,
  ARIANE_STYLE_ONBOARDING_NEXT_CREATE_SESSION_KEY,
  ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY,
} from "@/constants/ariane";

export type ProgressiveMenuStep = "scenario" | "assets" | "universe" | "edition";

const tabTourKey = (userId: string, projectId: string, step: ProgressiveMenuStep) =>
  `dw.ariane_tab_tour_v1_${userId}_${projectId}_${step}`;

export function isArianeTabTourComplete(
  userId: string,
  projectId: string,
  step: ProgressiveMenuStep
): boolean {
  try {
    return localStorage.getItem(tabTourKey(userId, projectId, step)) === "1";
  } catch {
    return true;
  }
}

export function dismissArianeTabTour(userId: string, projectId: string, step: ProgressiveMenuStep): void {
  try {
    localStorage.setItem(tabTourKey(userId, projectId, step), "1");
  } catch {
    /* ignore */
  }
}

export function clearArianeTabTourCompletion(userId: string, projectId: string, step: ProgressiveMenuStep): void {
  try {
    localStorage.removeItem(tabTourKey(userId, projectId, step));
  } catch {
    /* ignore */
  }
}

export function clearArianeTabToursForUser(userId: string): void {
  if (typeof window === "undefined") return;
  const prefix = `dw.ariane_tab_tour_v1_${userId}_`;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

const menuNewKey = (userId: string, step: ProgressiveMenuStep) =>
  `dw.menu_new_seen_v1_${userId}_${step}`;

const journeyFinalKey = (userId: string) => `dw.ariane_journey_final_v1_${userId}`;

export function isMenuNewDismissed(userId: string, step: ProgressiveMenuStep): boolean {
  try {
    return localStorage.getItem(menuNewKey(userId, step)) === "1";
  } catch {
    return true;
  }
}

export function dismissMenuNew(userId: string, step: ProgressiveMenuStep): void {
  try {
    localStorage.setItem(menuNewKey(userId, step), "1");
  } catch {
    /* ignore */
  }
}

export function isJourneyFinalDismissed(userId: string): boolean {
  try {
    return localStorage.getItem(journeyFinalKey(userId)) === "1";
  } catch {
    return true;
  }
}

export function dismissJourneyFinal(userId: string): void {
  try {
    localStorage.setItem(journeyFinalKey(userId), "1");
  } catch {
    /* ignore */
  }
}

/** Recette : remet les badges « New », l’overlay final, et les clés d’onboarding Ariane stockées côté client. */
export function resetProgressiveOnboardingSimulation(userId: string | undefined): void {
  if (!userId || typeof window === "undefined") return;
  try {
    localStorage.removeItem(journeyFinalKey(userId));
    for (const step of ["scenario", "assets", "universe", "edition"] as const) {
      localStorage.removeItem(menuNewKey(userId, step));
    }
    localStorage.removeItem("dw.ariane_onboarding_v1_dismissed");
    localStorage.removeItem("dw.ariane_style_onboarding_v1_dismissed");
    clearArianeTabToursForUser(userId);
    sessionStorage.removeItem(ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY);
    sessionStorage.setItem(ARIANE_STYLE_ONBOARDING_NEXT_CREATE_SESSION_KEY, "1");
    sessionStorage.setItem(ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY, ARIANE_FORCED_PROGRESSIVE_PENDING);
  } catch {
    /* ignore */
  }
}

/** Après création d’un projet : si la recette attendait un projet, attache l’id pour le menu progressif. */
export function bindForcedProgressiveProjectAfterCreate(createdProjectId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY) === ARIANE_FORCED_PROGRESSIVE_PENDING) {
      sessionStorage.setItem(ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY, createdProjectId);
    }
  } catch {
    /* ignore */
  }
}
