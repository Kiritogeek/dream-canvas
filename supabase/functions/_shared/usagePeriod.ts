// Fenêtre d'usage mensuel — source de vérité UNIQUE partagée par
// generate-asset-image et generate-panel-image (et alignée sur le client
// src/hooks/useUserPlan.ts:computeUsagePeriodStart).
//
// Pour un abonné payant, la fenêtre est ancrée sur le jour d'anniversaire de
// facturation (billing_period_start). Sinon (plan libre, billing_period_start
// null), elle retombe sur le 1er du mois calendaire.
//
// NB volontaire : new Date(year, month, billingDay) reporte les jours > nb de
// jours du mois (ex. 31 en février → début mars). Comportement conservé tel quel
// pour rester identique à l'implémentation historique de generate-panel-image.
export function computeUsagePeriodStart(
  billingPeriodStart: string | null,
  now: Date = new Date(),
): Date {
  if (billingPeriodStart) {
    const billingDay = new Date(billingPeriodStart).getDate();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), billingDay);
    return thisMonthStart <= now
      ? thisMonthStart
      : new Date(now.getFullYear(), now.getMonth() - 1, billingDay);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Prochaine date de renouvellement / reset de quota — miroir de
// computeUsagePeriodStart (consommé par le client, src/hooks/useUserPlan.ts).
export function computeNextResetDate(
  billingPeriodStart: string | null,
  now: Date = new Date(),
): Date {
  if (billingPeriodStart) {
    const billingDay = new Date(billingPeriodStart).getDate();
    const thisMonthReset = new Date(now.getFullYear(), now.getMonth(), billingDay);
    return thisMonthReset > now
      ? thisMonthReset
      : new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}
