import { describe, it, expect } from "vitest";
import { computeUsagePeriodStart } from "./usagePeriod";

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
