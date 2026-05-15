# Audit Sécurité & QA — Intégration Stripe
**Date :** 15/05/2026  
**Scope :** Activation Stripe (Chantier 5) — 4 fichiers modifiés  
**Statut final :** ✅ PASS — 3 problèmes corrigés avant push

---

## Fichiers audités

- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `src/hooks/useUserPlan.ts`
- `src/pages/Plans.tsx`

---

## Problèmes détectés et corrigés

### 🔴 [SÉCURITÉ] Priorité métadonnées > Price ID dans le webhook
**Fichier :** `stripe-webhook/index.ts` — `planFromMetaOrPrice()`  
**Problème :** La fonction priorisait les métadonnées Stripe sur le Price ID réel. Un attaquant avec accès au dashboard Stripe aurait pu modifier les métadonnées d'un abonnement pour changer le plan attribué sans payer le bon tarif.  
**Fix :** Inversion de priorité — Price ID d'abord (ce qui a réellement été facturé), métadonnées en fallback pour les anciens abonnements.

### 🐛 [BUG] Modal succès affichait le mauvais plan
**Fichier :** `Plans.tsx` + `create-checkout-session/index.ts`  
**Problème :** La modal post-paiement affichait `planDisplayName(plan)` où `plan` = plan actuel avant webhook (potentiellement "Libre"). L'utilisateur voyait "Bienvenue dans le plan Libre !" après avoir payé.  
**Fix :** `success_url` inclut maintenant `?plan=createur` ou `?plan=studio`. Plans.tsx lit ce paramètre pour afficher le bon nom dans la modal.

### ⚠️ [VALIDATION] Plan non validé côté serveur
**Fichier :** `create-checkout-session/index.ts`  
**Problème :** Un body `{ plan: "valeur_inconnue" }` defaultait silencieusement vers "createur" sans erreur.  
**Fix :** Retourne HTTP 400 si `plan` n'est ni "createur" ni "studio".

---

## Faux positifs rejetés

| Finding | Raison du rejet |
|---------|----------------|
| Rate limiting checkout | DoS exclu du scope |
| JWT via anon key | Pattern standard Supabase, pas de vulnérabilité |
| Customer/user binding webhook | Protégé par signature Stripe — seul Stripe peut envoyer des webhooks valides |
| Idempotency key | Problème UX, pas sécurité |
| TypeScript unsafe cast ligne 153 | Code smell, non exploitable |

---

## Résultats finaux

```
npx tsc --noEmit  → 0 erreur
npm test --run    → 9/9 tests passent
```

---

## Configuration Stripe activée

| Élément | Valeur |
|---------|--------|
| Compte | DreamWeave (live) |
| Créateur Price ID | `price_1TXHSBCSTxZkF5TFeAHJCjKa` |
| Studio Price ID | `price_1TXHSXCSTxZkF5TFDfsGNUrW` |
| Webhook | `dreamweave-webhook` — 4 events |
| Customer Portal | Annulation fin de période + changement d'offre |
