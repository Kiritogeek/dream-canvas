# Index des Supabase Edge Functions (DreamWeave)

Point d’entrée : `supabase/functions/<slug>/`. Build / déploy : suivre [`SUPABASE_SETUP.md`](../SUPABASE_SETUP.md) et la CLI Supabase.

| Fonction (`/functions/v1/...`) | Rôle succinct |
|-----------------------------------|---------------|
| `generate-asset-image` | Génération d’images d’assets (personnages, décors, objets). |
| `generate-panel-image` | Génération image par bloc / panel sur le canvas chapitre. |
| `generate-scenario-ai` | IA scénario (suggestions, détection cas, narra résumés, etc.). |
| `generate-style-template-images` | Images associées aux templates de style. |
| `generate-landing-showcase` | Showcase landing. |
| `narramind-update` | Mise à jour / enrichissement NarraMind. |
| `create-checkout-session` | Stripe checkout. |
| `create-portal-session` | Stripe customer portal. |
| `stripe-webhook` | Webhooks Stripe. |
| `admin-set-plan` | Ajustement de plan (protégée côté Edge + usage `VITE_ADMIN_EMAIL` côté client uniquement comme garde UX). |

**Secrets** à configurer dans le dashboard Supabase (ou fichiers Deno `--env-file`) selon la fonction : clés Stripe, FAL.ai, autres — **pas** dans le bundle `VITE_*`.

Code partagé : `supabase/functions/_shared/`.
