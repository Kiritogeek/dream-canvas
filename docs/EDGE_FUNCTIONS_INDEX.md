# Index des Supabase Edge Functions (DreamWeave)

Point d'entrée : `supabase/functions/<slug>/`. Build / déploy : suivre [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) et la CLI Supabase.

> **14 Edge Functions** au total. Cartographie des flux (quelle feature appelle quelle fonction, quelles tables sont écrites) : `Produit/02_Architecture_Technique.md` §6.3. Détail des payloads : `Produit/09_Specifications_API.md` §3.

## Génération d'images (FAL.ai — FLUX.2 Pro tous tiers)

| Fonction (`/functions/v1/...`) | Rôle | Appelée par (frontend) |
|---|---|---|
| `generate-asset-image` | Génère l'image d'un asset + la sheet composite 4 angles (personnages), upload Storage, met à jour l'asset, log usage. | `services/assets.ts` |
| `generate-panel-image` | Génère l'image **d'un bloc** du canvas chapitre (dimensions du bloc, plafonnées à 1024px), injecte les sheets d'assets comme références. | `services/panels.ts` |
| `generate-style-template-images` | Génère les 9 images d'exemple des templates de style (Storage `template-style-img/`). Protégée par token admin. | one-shot (admin) |
| `generate-landing-showcase` | Génère les images hero de la landing page. | one-shot (admin) |

## IA texte & narrative (Gemini Flash primaire + Groq Llama 3.3 70B fallback)

| Fonction | Rôle | Appelée par |
|---|---|---|
| `generate-scenario-ai` | IA Scénario (génère un chapitre), IA Chapitre (réécriture), IA Panel, et **découpage chapitre → `panels_outline`** (mode `panels`). | `services/scenarioAI.ts`, `hooks/useArianeLoreProposals.ts` |
| `compose-chapter-layout` | Reçoit `panels_outline`, **Gemini 2.5-flash** groupe/compose les scènes (le serveur calcule la géométrie : positions, tailles, shapes), upsert dans `chapter_canvases.layout`. | `services/composeChapterLayout.ts` |
| `narramind-update` | Mémoire narrative : entités (`memory_entities`), résumés glissants (`memory_summaries`), détection d'anomalies → réponse HTTP (alertes persistées dans `narramind_alerts`). | `hooks/useNarraMindDebounce.ts` |
| `narramind-compass` | Compass : mode `index` (vectorise via Gemini `text-embedding-004` 768D → `project_embeddings`) ; mode `propose` (recherche pgvector → Gemini Flash → `compass_proposals`). | `services/compassIndex.ts`, `hooks/useArianeLoreProposals.ts` |

## Paiement (Stripe — API REST v1, sans SDK npm)

| Fonction | Rôle | Appelée par |
|---|---|---|
| `create-checkout-session` | Crée une session Stripe Checkout (abonnement mensuel Créateur / Studio). | `hooks/useUserPlan.ts` |
| `create-portal-session` | Crée un lien Stripe Customer Portal (gestion / annulation abonnement). | `hooks/useUserPlan.ts` |
| `stripe-webhook` | Traite les événements Stripe (`customer.subscription.created/updated/deleted`) → met à jour `profiles.plan` via `service_role`. Seule entrée autorisée à modifier le plan. | Stripe (webhook) |

## Administration (réservées admin — `service_role`)

| Fonction | Rôle | Appelée par |
|---|---|---|
| `admin-get-kpis` | Récupère les KPIs produit pour le dashboard admin (page `Pilotage.tsx`). | `services/adminService.ts` |
| `admin-set-plan` | Change manuellement le plan d'un utilisateur. | `services/adminService.ts` |
| `admin-user-action` | Actions admin sur un utilisateur (gestion compte). | `services/adminService.ts` |

---

**Secrets** à configurer dans le dashboard Supabase (jamais dans le bundle `VITE_*`) : `FAL_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGIN`. Détail par fonction : `Produit/02_Architecture_Technique.md` §2.8.

Code partagé : `supabase/functions/_shared/`.

*Dernière mise à jour : 13 juin 2026 — passage de 10 à 14 fonctions listées (ajout `admin-get-kpis`, `admin-user-action`, `compose-chapter-layout`, `narramind-compass`), regroupement par domaine, colonne « appelée par » (frontend → EF), correction modèles (FLUX.2 Pro tous tiers, Gemini primaire).*
