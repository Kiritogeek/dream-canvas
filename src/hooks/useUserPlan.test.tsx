// Chemin argent — le quota affiché par useUserPlan doit refléter exactement
// ce que le serveur applique : plan BDD → TIER_CONFIG, fenêtre d'usage →
// @fn-shared/usagePeriod (mêmes fonctions que les Edge Functions).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useUserPlan } from "@/hooks/useUserPlan";
import { TIER_CONFIG } from "@/types";
import { computeUsagePeriodStart, computeNextResetDate } from "@fn-shared/usagePeriod";

const mocks = vi.hoisted(() => ({
  fromMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  getSessionMock: vi.fn(),
  auth: { user: { id: "user-1" } as { id: string } | null },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.fromMock,
    auth: {
      refreshSession: mocks.refreshSessionMock,
      getSession: mocks.getSessionMock,
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.auth.user }),
}));

interface DbState {
  profile?: { plan: string; billing_period_start: string | null } | null;
  profileError?: { message: string } | null;
  usageCount?: number | null;
  usageError?: { message: string } | null;
}

function mockDb({ profile = null, profileError = null, usageCount = 0, usageError = null }: DbState) {
  const gteValues: string[] = [];
  mocks.fromMock.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: profile, error: profileError }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: async (_column: string, value: string) => {
              gteValues.push(value);
              return { count: usageCount, error: usageError };
            },
          }),
        }),
      }),
    };
  });
  return { gteValues };
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useUserPlan(), { wrapper });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.user = { id: "user-1" };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ── Mapping plan BDD → TIER_CONFIG ────────────────────────────────

describe("useUserPlan — mapping plan", () => {
  it("plan inconnu en BDD → replié sur libre (20 crédits)", async () => {
    mockDb({ profile: { plan: "premium", billing_period_start: null }, usageCount: 3 });
    const { result } = setup();

    await waitFor(() =>
      expect(result.current.usageInfo).toEqual({ count: 3, limit: 20, plan: "libre" }),
    );
    expect(result.current.limits).toEqual(TIER_CONFIG.libre);
  });

  it.each([
    ["createur", 100],
    ["studio", 250],
  ] as const)("plan %s → limite TIER_CONFIG (%i)", async (plan, limit) => {
    mockDb({ profile: { plan, billing_period_start: null }, usageCount: 7 });
    const { result } = setup();

    await waitFor(() =>
      expect(result.current.usageInfo).toEqual({ count: 7, limit, plan }),
    );
    expect(result.current.limits).toEqual(TIER_CONFIG[plan]);
  });

  it("erreur lecture profiles → replié sur libre (fail-safe)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockDb({ profileError: { message: "RLS denied" }, usageCount: 2 });
    const { result } = setup();

    await waitFor(() =>
      expect(result.current.usageInfo).toEqual({ count: 2, limit: 20, plan: "libre" }),
    );
  });

  it("profil inexistant (maybeSingle → null) → libre", async () => {
    mockDb({ profile: null, usageCount: 0 });
    const { result } = setup();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plan).toBe("libre");
    expect(result.current.usageInfo.limit).toBe(20);
  });
});

// ── usageInfo.count ───────────────────────────────────────────────

describe("useUserPlan — comptage usage", () => {
  it("erreur lecture usage → count 0 (n'affiche jamais un quota cassé)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockDb({
      profile: { plan: "createur", billing_period_start: null },
      usageError: { message: "boom" },
    });
    const { result } = setup();

    await waitFor(() =>
      expect(result.current.usageInfo).toEqual({ count: 0, limit: 100, plan: "createur" }),
    );
  });

  it("count null renvoyé par Supabase → 0", async () => {
    mockDb({ profile: { plan: "libre", billing_period_start: null }, usageCount: null });
    const { result } = setup();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.usageInfo.count).toBe(0);
  });
});

// ── Fenêtre d'usage — même source que les Edge Functions ──────────

describe("useUserPlan — fenêtre d'usage (@fn-shared/usagePeriod)", () => {
  it("abonné payant : la requête usage filtre depuis computeUsagePeriodStart(billing_period_start)", async () => {
    const billing = "2026-06-15T10:00:00.000Z";
    const { gteValues } = mockDb({
      profile: { plan: "createur", billing_period_start: billing },
      usageCount: 5,
    });
    const { result } = setup();

    const expected = computeUsagePeriodStart(billing).toISOString();
    await waitFor(() => expect(gteValues).toContain(expected));
    expect(result.current.nextResetDate).toEqual(computeNextResetDate(billing));
  });

  it("plan libre (billing null) : fenêtre = computeUsagePeriodStart(null) et reset = computeNextResetDate(null)", async () => {
    const { gteValues } = mockDb({ profile: { plan: "libre", billing_period_start: null } });
    const { result } = setup();

    await waitFor(() =>
      expect(gteValues).toContain(computeUsagePeriodStart(null).toISOString()),
    );
    expect(result.current.nextResetDate).toEqual(computeNextResetDate(null));
  });
});

// ── Sans utilisateur ──────────────────────────────────────────────

describe("useUserPlan — sans utilisateur connecté", () => {
  it("aucune requête BDD, valeurs par défaut libre 0/20", () => {
    mocks.auth.user = null;
    mockDb({});
    const { result } = setup();

    expect(result.current.plan).toBe("libre");
    expect(result.current.usageInfo).toEqual({ count: 0, limit: 20, plan: "libre" });
    expect(result.current.isLoading).toBe(false);
    expect(mocks.fromMock).not.toHaveBeenCalled();
  });
});

// ── Actions Stripe (chemin paiement) ──────────────────────────────

describe("useUserPlan — actions Stripe", () => {
  it("goToCheckout sans session Supabase → jette avant tout appel réseau", async () => {
    mockDb({ profile: { plan: "libre", billing_period_start: null } });
    mocks.refreshSessionMock.mockResolvedValue({});
    mocks.getSessionMock.mockResolvedValue({ data: { session: null } });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = setup();

    await expect(result.current.goToCheckout("createur")).rejects.toThrow(
      "Session Supabase introuvable",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("goToCheckout : appelle create-checkout-session avec le JWT et le plan, jette si l'API échoue", async () => {
    mockDb({ profile: { plan: "libre", billing_period_start: null } });
    mocks.refreshSessionMock.mockResolvedValue({});
    mocks.getSessionMock.mockResolvedValue({
      data: { session: { access_token: "tok-123" } },
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = setup();

    await expect(result.current.goToCheckout("studio")).rejects.toThrow(
      "Erreur création session Stripe",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/functions/v1/create-checkout-session"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer tok-123" }),
        body: JSON.stringify({ plan: "studio" }),
      }),
    );
  });

  it("goToPortal sans session Supabase → jette", async () => {
    mockDb({ profile: { plan: "studio", billing_period_start: null } });
    mocks.refreshSessionMock.mockResolvedValue({});
    mocks.getSessionMock.mockResolvedValue({ data: { session: null } });
    const { result } = setup();

    await expect(result.current.goToPortal()).rejects.toThrow(
      "Session Supabase introuvable",
    );
  });
});
