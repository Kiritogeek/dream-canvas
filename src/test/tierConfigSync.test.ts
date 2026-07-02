// Invariant économique non négociable (CLAUDE.md) : les quotas de crédits doivent
// rester identiques entre le frontend (src/types TIER_CONFIG) et les Edge Functions
// (_shared/tierConfig TIER_LIMITS). Une divergence = quota affiché ≠ quota appliqué.
import { describe, it, expect } from "vitest";
import { TIER_CONFIG, type UserPlan } from "@/types";
import { TIER_LIMITS } from "@fn-shared/tierConfig";

const PLANS: UserPlan[] = ["libre", "createur", "studio"];

describe("Synchronisation TIER_CONFIG (frontend) ↔ TIER_LIMITS (Edge Functions)", () => {
  it.each(PLANS)("maxGenerationsPerMonth identique — %s", (plan) => {
    expect(TIER_LIMITS[plan].maxGenerationsPerMonth).toBe(
      TIER_CONFIG[plan].maxGenerationsPerMonth,
    );
  });

  it.each(PLANS)("allowLongMemory identique — %s", (plan) => {
    expect(TIER_LIMITS[plan].allowLongMemory).toBe(TIER_CONFIG[plan].allowLongMemory);
  });

  it.each(PLANS)("model identique — %s", (plan) => {
    expect(TIER_LIMITS[plan].model).toBe(TIER_CONFIG[plan].model);
  });

  it.each(PLANS)("allowReferenceImages identique — %s", (plan) => {
    expect(TIER_LIMITS[plan].allowReferenceImages).toBe(TIER_CONFIG[plan].allowReferenceImages);
  });

  it("mêmes plans déclarés des deux côtés", () => {
    expect(Object.keys(TIER_LIMITS).sort()).toEqual(Object.keys(TIER_CONFIG).sort());
  });

  it("valeurs attendues (20 / 100 / 250)", () => {
    expect(TIER_LIMITS.libre.maxGenerationsPerMonth).toBe(20);
    expect(TIER_LIMITS.createur.maxGenerationsPerMonth).toBe(100);
    expect(TIER_LIMITS.studio.maxGenerationsPerMonth).toBe(250);
  });
});
