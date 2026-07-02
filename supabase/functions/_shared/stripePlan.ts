// Résolution du plan DreamWeave depuis un événement Stripe.
// Price ID = source de vérité (ce qui a réellement été facturé) ;
// métadonnées en fallback pour les abonnements anciens sans Price ID reconnu.
//
// Retourne null si aucun des deux ne matche : l'appelant DOIT traiter ce cas
// comme une erreur (jamais écrire un plan deviné dans profiles.plan).
// Décision Louis 2026-07-02 : plan irrésoluble → 500 → retry Stripe (~3 jours),
// le plan existant du profil reste intact le temps de corriger la config.

export type StripePlan = "libre" | "createur" | "studio";

export function planFromMetaOrPrice(
  metaPlan: string | undefined,
  priceId: string,
  createurPriceId: string,
  studioPriceId: string,
): StripePlan | null {
  // Le garde `priceId &&` évite qu'un priceId vide matche un Price ID env non configuré ("" === "")
  if (priceId && priceId === studioPriceId) return "studio";
  if (priceId && priceId === createurPriceId) return "createur";
  if (metaPlan === "studio") return "studio";
  if (metaPlan === "createur") return "createur";
  return null;
}
