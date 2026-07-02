import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isArianeTabTourComplete,
  dismissArianeTabTour,
  clearArianeTabTourCompletion,
  clearArianeTabToursForUser,
  isMenuNewDismissed,
  dismissMenuNew,
  isJourneyFinalDismissed,
  dismissJourneyFinal,
  resetProgressiveOnboardingSimulation,
  bindForcedProgressiveProjectAfterCreate,
} from "@/lib/progressiveOnboardingStorage";
import {
  ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY,
  ARIANE_STYLE_ONBOARDING_NEXT_CREATE_SESSION_KEY,
  ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY,
  ARIANE_FORCED_PROGRESSIVE_PENDING,
} from "@/constants/ariane";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isArianeTabTourComplete / dismiss / clear", () => {
  it("faux par défaut quand la clé est absente", () => {
    expect(isArianeTabTourComplete("u1", "p1", "scenario")).toBe(false);
  });

  it("vrai après dismiss, avec clé composée user + projet + étape", () => {
    dismissArianeTabTour("u1", "p1", "assets");
    expect(localStorage.getItem("dw.ariane_tab_tour_v1_u1_p1_assets")).toBe("1");
    expect(isArianeTabTourComplete("u1", "p1", "assets")).toBe(true);
    // Isolation : autre étape / autre projet / autre user non affectés
    expect(isArianeTabTourComplete("u1", "p1", "scenario")).toBe(false);
    expect(isArianeTabTourComplete("u1", "p2", "assets")).toBe(false);
    expect(isArianeTabTourComplete("u2", "p1", "assets")).toBe(false);
  });

  it("faux pour une valeur corrompue différente de '1'", () => {
    localStorage.setItem("dw.ariane_tab_tour_v1_u1_p1_universe", "0");
    expect(isArianeTabTourComplete("u1", "p1", "universe")).toBe(false);
    localStorage.setItem("dw.ariane_tab_tour_v1_u1_p1_universe", "true");
    expect(isArianeTabTourComplete("u1", "p1", "universe")).toBe(false);
  });

  it("clearArianeTabTourCompletion retire la complétion", () => {
    dismissArianeTabTour("u1", "p1", "edition");
    clearArianeTabTourCompletion("u1", "p1", "edition");
    expect(isArianeTabTourComplete("u1", "p1", "edition")).toBe(false);
  });

  it("retourne true (fail-safe) si localStorage.getItem jette", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage indisponible");
    });
    expect(isArianeTabTourComplete("u1", "p1", "scenario")).toBe(true);
  });
});

describe("clearArianeTabToursForUser", () => {
  it("supprime uniquement les tours de l'utilisateur ciblé", () => {
    dismissArianeTabTour("u1", "p1", "scenario");
    dismissArianeTabTour("u1", "p2", "assets");
    dismissArianeTabTour("u2", "p1", "scenario");
    localStorage.setItem("dw.autre_cle", "garde-moi");

    clearArianeTabToursForUser("u1");

    expect(isArianeTabTourComplete("u1", "p1", "scenario")).toBe(false);
    expect(isArianeTabTourComplete("u1", "p2", "assets")).toBe(false);
    expect(isArianeTabTourComplete("u2", "p1", "scenario")).toBe(true);
    expect(localStorage.getItem("dw.autre_cle")).toBe("garde-moi");
  });
});

describe("menu New", () => {
  it("faux par défaut, vrai après dismiss, clé par user + étape", () => {
    expect(isMenuNewDismissed("u1", "assets")).toBe(false);
    dismissMenuNew("u1", "assets");
    expect(localStorage.getItem("dw.menu_new_seen_v1_u1_assets")).toBe("1");
    expect(isMenuNewDismissed("u1", "assets")).toBe(true);
    expect(isMenuNewDismissed("u1", "universe")).toBe(false);
  });
});

describe("journey final", () => {
  it("faux par défaut, vrai après dismiss", () => {
    expect(isJourneyFinalDismissed("u1")).toBe(false);
    dismissJourneyFinal("u1");
    expect(localStorage.getItem("dw.ariane_journey_final_v1_u1")).toBe("1");
    expect(isJourneyFinalDismissed("u1")).toBe(true);
  });
});

describe("resetProgressiveOnboardingSimulation", () => {
  it("ne fait rien si userId est undefined", () => {
    dismissJourneyFinal("u1");
    resetProgressiveOnboardingSimulation(undefined);
    expect(isJourneyFinalDismissed("u1")).toBe(true);
    expect(sessionStorage.getItem(ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY)).toBeNull();
  });

  it("réinitialise badges, overlays, tab tours et amorce les clés de session", () => {
    dismissJourneyFinal("u1");
    dismissMenuNew("u1", "assets");
    dismissMenuNew("u1", "universe");
    dismissMenuNew("u1", "scenario");
    dismissMenuNew("u1", "edition");
    dismissArianeTabTour("u1", "p1", "scenario");
    localStorage.setItem("dw.ariane_onboarding_v1_dismissed_u1", "1");
    localStorage.setItem("dw.ariane_style_onboarding_v1_dismissed_u1", "1");
    sessionStorage.setItem(ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY, "p1");

    resetProgressiveOnboardingSimulation("u1");

    expect(isJourneyFinalDismissed("u1")).toBe(false);
    expect(isMenuNewDismissed("u1", "assets")).toBe(false);
    expect(isMenuNewDismissed("u1", "edition")).toBe(false);
    expect(isArianeTabTourComplete("u1", "p1", "scenario")).toBe(false);
    expect(localStorage.getItem("dw.ariane_onboarding_v1_dismissed_u1")).toBeNull();
    expect(localStorage.getItem("dw.ariane_style_onboarding_v1_dismissed_u1")).toBeNull();
    expect(sessionStorage.getItem(ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY)).toBeNull();
    expect(sessionStorage.getItem(ARIANE_STYLE_ONBOARDING_NEXT_CREATE_SESSION_KEY)).toBe("1");
    expect(sessionStorage.getItem(ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY)).toBe(
      ARIANE_FORCED_PROGRESSIVE_PENDING
    );
  });
});

describe("bindForcedProgressiveProjectAfterCreate", () => {
  it("remplace 'pending' par l'id du projet créé", () => {
    sessionStorage.setItem(ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY, ARIANE_FORCED_PROGRESSIVE_PENDING);
    bindForcedProgressiveProjectAfterCreate("proj-42");
    expect(sessionStorage.getItem(ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY)).toBe("proj-42");
  });

  it("ne touche pas la clé si elle ne vaut pas 'pending'", () => {
    sessionStorage.setItem(ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY, "proj-existant");
    bindForcedProgressiveProjectAfterCreate("proj-42");
    expect(sessionStorage.getItem(ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY)).toBe("proj-existant");
  });

  it("ne crée pas la clé si elle est absente", () => {
    bindForcedProgressiveProjectAfterCreate("proj-42");
    expect(sessionStorage.getItem(ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY)).toBeNull();
  });
});
