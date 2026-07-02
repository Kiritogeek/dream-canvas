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
