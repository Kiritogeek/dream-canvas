import { describe, it, expect } from "vitest";
import { computeUsagePeriodStart, computeNextResetDate } from "./usagePeriod";

describe("computeUsagePeriodStart", () => {
  it("billing null (plan libre) → 1er du mois calendaire", () => {
    const now = new Date(2026, 5, 20); // 20 juin 2026
    expect(computeUsagePeriodStart(null, now)).toEqual(new Date(2026, 5, 1));
  });

  it("anniversaire déjà atteint ce mois → ancre ce mois-ci", () => {
    const now = new Date(2026, 5, 20); // 20 juin
    const billing = new Date(2026, 0, 15).toISOString(); // abonné le 15
    expect(computeUsagePeriodStart(billing, now)).toEqual(new Date(2026, 5, 15));
  });

  it("anniversaire pas encore atteint ce mois → bascule au mois précédent", () => {
    const now = new Date(2026, 5, 10); // 10 juin
    const billing = new Date(2026, 0, 15).toISOString(); // abonné le 15
    expect(computeUsagePeriodStart(billing, now)).toEqual(new Date(2026, 4, 15));
  });

  it("jour exact d'anniversaire → ancre ce mois-ci (>= now inclus)", () => {
    const now = new Date(2026, 5, 15);
    const billing = new Date(2026, 0, 15).toISOString();
    expect(computeUsagePeriodStart(billing, now)).toEqual(new Date(2026, 5, 15));
  });
});

// Jours d'anniversaire 29-31 : new Date(year, month, 31) déborde sur le mois
// suivant quand le mois est plus court — report volontaire documenté dans le NB
// en tête de usagePeriod.ts, verrouillé tel quel ici.
describe("computeUsagePeriodStart — billingDay 29-31 (rollover JS volontaire)", () => {
  it("billingDay 31 dans un mois de 30 jours (juin) → ancre le 31 du mois précédent", () => {
    const now = new Date(2026, 5, 20); // 20 juin 2026
    const billing = new Date(2026, 0, 31).toISOString(); // abonné le 31
    expect(computeUsagePeriodStart(billing, now)).toEqual(new Date(2026, 4, 31)); // 31 mai
  });

  it("billingDay 31 en février non bissextile → ancre le 31 janvier", () => {
    const now = new Date(2026, 1, 15); // 15 février 2026
    const billing = new Date(2026, 0, 31).toISOString();
    expect(computeUsagePeriodStart(billing, now)).toEqual(new Date(2026, 0, 31));
  });

  it("billingDay 30 en février → ancre le 30 janvier", () => {
    const now = new Date(2026, 1, 20); // 20 février 2026
    const billing = new Date(2025, 10, 30).toISOString(); // abonné le 30
    expect(computeUsagePeriodStart(billing, now)).toEqual(new Date(2026, 0, 30));
  });

  it("billingDay 29 en février bissextile → ancre exactement le 29 février", () => {
    const now = new Date(2028, 2, 10); // 10 mars 2028 (2028 bissextile)
    const billing = new Date(2028, 0, 29).toISOString();
    expect(computeUsagePeriodStart(billing, now)).toEqual(new Date(2028, 1, 29));
  });

  it("billingDay 29 en février non bissextile → reporté au 1er mars", () => {
    const now = new Date(2026, 2, 15); // 15 mars 2026
    const billing = new Date(2026, 0, 29).toISOString();
    // new Date(2026, 1, 29) déborde → 1er mars (février 2026 = 28 jours)
    expect(computeUsagePeriodStart(billing, now)).toEqual(new Date(2026, 2, 1));
  });

  it("début mars, billingDay 31 → le report produit un start postérieur à now (comportement historique verrouillé)", () => {
    const now = new Date(2026, 2, 2); // 2 mars 2026
    const billing = new Date(2026, 0, 31).toISOString();
    // new Date(2026, 1, 31) déborde → 3 mars, après now : conséquence assumée du NB
    expect(computeUsagePeriodStart(billing, now)).toEqual(new Date(2026, 2, 3));
  });
});

describe("computeNextResetDate", () => {
  it("billing null (plan libre) → 1er du mois suivant", () => {
    const now = new Date(2026, 5, 20); // 20 juin 2026
    expect(computeNextResetDate(null, now)).toEqual(new Date(2026, 6, 1));
  });

  it("anniversaire pas encore passé ce mois → reset ce mois-ci", () => {
    const now = new Date(2026, 5, 10); // 10 juin
    const billing = new Date(2026, 0, 15).toISOString(); // abonné le 15
    expect(computeNextResetDate(billing, now)).toEqual(new Date(2026, 5, 15));
  });

  it("anniversaire déjà passé ce mois → reset le mois suivant", () => {
    const now = new Date(2026, 5, 20); // 20 juin
    const billing = new Date(2026, 0, 15).toISOString();
    expect(computeNextResetDate(billing, now)).toEqual(new Date(2026, 6, 15));
  });

  it("jour exact d'anniversaire (minuit passé) → reset le mois suivant, cohérent avec periodStart qui ancre ce mois-ci", () => {
    const now = new Date(2026, 5, 15, 10, 0); // 15 juin 10h
    const billing = new Date(2026, 0, 15).toISOString();
    expect(computeNextResetDate(billing, now)).toEqual(new Date(2026, 6, 15));
    expect(computeUsagePeriodStart(billing, now)).toEqual(new Date(2026, 5, 15));
  });

  it("décembre → bascule d'année (rollover JS du mois 12)", () => {
    const now = new Date(2026, 11, 20); // 20 décembre
    const billing = new Date(2026, 0, 15).toISOString();
    expect(computeNextResetDate(billing, now)).toEqual(new Date(2027, 0, 15));
  });
});

describe("computeNextResetDate — billingDay 29-31 (rollover JS volontaire)", () => {
  it("billingDay 31 en juin (30 jours) → reset reporté au 1er juillet", () => {
    const now = new Date(2026, 5, 20); // 20 juin 2026
    const billing = new Date(2026, 0, 31).toISOString();
    expect(computeNextResetDate(billing, now)).toEqual(new Date(2026, 6, 1));
  });

  it("billingDay 31 en février non bissextile → reset reporté au 3 mars", () => {
    const now = new Date(2026, 1, 15); // 15 février 2026
    const billing = new Date(2026, 0, 31).toISOString();
    expect(computeNextResetDate(billing, now)).toEqual(new Date(2026, 2, 3));
  });

  it("31 janvier passé, billingDay 31 → le reset saute février et tombe le 3 mars", () => {
    const now = new Date(2026, 0, 31, 10, 0); // 31 janvier 10h
    const billing = new Date(2026, 0, 31).toISOString();
    // new Date(2026, 1, 31) déborde → 3 mars : la période janvier-février dure ~31 jours
    expect(computeNextResetDate(billing, now)).toEqual(new Date(2026, 2, 3));
  });

  it("billingDay 29 en février bissextile → reset le 29 février exact", () => {
    const now = new Date(2028, 1, 20); // 20 février 2028 (bissextile)
    const billing = new Date(2028, 0, 29).toISOString();
    expect(computeNextResetDate(billing, now)).toEqual(new Date(2028, 1, 29));
  });
});
