import { describe, it, expect } from "vitest";
import { planFromMetaOrPrice } from "./stripePlan";

const CREATEUR = "price_createur_123";
const STUDIO = "price_studio_456";

describe("planFromMetaOrPrice", () => {
  it("price ID studio reconnu → studio, même si les métadonnées disent autre chose", () => {
    expect(planFromMetaOrPrice("createur", STUDIO, CREATEUR, STUDIO)).toBe("studio");
  });

  it("price ID createur reconnu → createur", () => {
    expect(planFromMetaOrPrice(undefined, CREATEUR, CREATEUR, STUDIO)).toBe("createur");
  });

  it("price ID inconnu + metadata studio → studio (fallback abonnements anciens)", () => {
    expect(planFromMetaOrPrice("studio", "price_inconnu", CREATEUR, STUDIO)).toBe("studio");
  });

  it("price ID absent + metadata createur → createur (cas checkout.session.completed)", () => {
    expect(planFromMetaOrPrice("createur", "", CREATEUR, STUDIO)).toBe("createur");
  });

  it("price ID inconnu + métadonnées absentes → null (jamais de plan deviné)", () => {
    expect(planFromMetaOrPrice(undefined, "price_inconnu", CREATEUR, STUDIO)).toBeNull();
  });

  it("metadata 'libre' → null (un abonnement payant ne peut pas être libre)", () => {
    expect(planFromMetaOrPrice("libre", "", CREATEUR, STUDIO)).toBeNull();
  });

  it("metadata inattendue → null", () => {
    expect(planFromMetaOrPrice("pro", "", CREATEUR, STUDIO)).toBeNull();
  });

  it("Price IDs env non configurés (vides) : un priceId vide ne matche pas '' === ''", () => {
    expect(planFromMetaOrPrice(undefined, "", "", "")).toBeNull();
  });

  it("Price IDs env non configurés mais metadata valide → la metadata rattrape", () => {
    expect(planFromMetaOrPrice("studio", "price_x", "", "")).toBe("studio");
  });
});
