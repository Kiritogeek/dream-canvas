# Plan d’implémentation — NarraMind complet & évolutif

> Objectif : système **utilisable** pour petits et gros projets, aligné sur `Produit/NarraMind.md` §10–§11. Ce document est la **checklist de code** ; la vision produit reste dans `NarraMind.md`.
>
> **Phases numérotées 0 → 6** (7 blocs au total). **Prochaine livraison cible : Phase 2 / 7** — garde-fous prompt (gros projets).  
> **Branche Git `feat/narramind-persist-alertes`** : isole la **phase 1** (persistance `narramind_alerts` + EF + client) pour **PR / merge** sans mélanger d’autres chantiers ; à merger avant l’UI Ariane (phase 4) qui consomme la table.

---

## Phase 0 / 7 — Prérequis & conventions

- [ ] **Constante front** pour le nom affiché de l’assistance (`ARIANE_DISPLAY_NAME` — déjà dans `src/constants/ariane.ts`) ; futurs textes « cohérence » importent depuis là.
- [ ] **Ne pas renommer** les slugs `free` / `pro` en base sans migration dédiée ; les **libellés** « Amateur » / « Artiste » sont purement UI (`TIER_CONFIG` / `planDisplayName`).

---

## Phase 1 / 7 — Persistance des alertes (bloquant pour l’UI Ariane) ✅

| # | Tâche | Détail |
|---|--------|--------|
| 1.1 | Migration `narramind_alerts` | Colonnes : `id`, `user_id`, `project_id`, `chapter_id`, `severity`, `title`, `explanation`, `anchor` JSONB, `status` (`active` \| `dismissed` \| `resolved`), `dedupe_key`, `created_at`, `updated_at`. RLS : `auth.uid() = user_id`. Index `(project_id, status)`, `(chapter_id)`. Fichier : `20260430140000_narramind_alerts.sql`. |
| 1.2 | Types Supabase | Étendu `src/integrations/supabase/types.ts` (table `narramind_alerts`). |
| 1.3 | EF `narramind-update` | Après normalisation : upsert `narramind_alerts` (`dedupe_key` = hash stable du contenu) ; alertes actives non revues au run → `resolved`. PATCH `narramind_anomalies` = **snapshot** du run (plus tableau vide). |
| 1.4 | Service / hook | `src/services/narramindAlerts.ts` + `src/hooks/useNarramindAlerts.ts` : liste par `projectId` / `chapterId`, mutations résoudre / ignorer. |

**Définition de done** : après un run EF, les alertes sont **lisibles depuis la BDD** pour un utilisateur authentifié.

---

## Phase 2 / 7 — Garde-fous prompt (gros projets) — **prochaine**

| # | Tâche | Détail |
|---|--------|--------|
| 2.1 | Budget **assets** | Troncature / tri : par ex. cap caractères total ; priorité assets avec lore non vide ou récemment modifiés (si métadonnée dispo) ou ordre alphabétique stable. |
| 2.2 | Budget **memory_entities** | Idem : cap + priorité `last_seen_chapter` proche du chapitre courant. |
| 2.3 | **universe_lore** | Cap doux (ex. derniers N caractères ou sections) + log si tronqué (métrique). |
| 2.4 | Tests manuels | Projet avec ~100 assets : pas de 502 / JSON invalide. |

**Définition de done** : EF reste stable avec contexte **large**.

---

## Phase 3 / 7 — Mémoire longue (qualité détection)

| # | Tâche | Détail |
|---|--------|--------|
| 3.1 | **Méga-résumé projet** | Nouveau champ `projects.narra_summary` ou table `project_narra_digest` (texte + `updated_at`). |
| 3.2 | Mise à jour digest | Soit dans `narramind-update` tous les N chapitres, soit EF / job dédié `narramind-compress` déclenché quand `needs_compression`. |
| 3.3 | Prompt | Injecter le méga-résumé **avant** la fenêtre des résumés chapitre. |
| 3.4 | Compression **memory_summaries** | Fusion des plus anciens en résumés « arc » ou liste d’**invariants** (texte court) pour libérer du volume tout en gardant les faits contradictoires critiques. |

**Définition de done** : sur un projet **long**, faux négatifs réduits sur des faits **anciens mais stables** (à valider sur scénario test).

---

## Phase 4 / 7 — UI Ariane (personnage + bulles)

| # | Tâche | Détail |
|---|--------|--------|
| 4.1 | Composants | Avatar / pictogramme fil (SVG), bulle réutilisable `variant: "onboarding" \| "continuity"`. |
| 4.2 | Éditeur scénario | Panneau ou drawer : liste alertes actives, filtres sévérité, actions résoudre / ignorer, scroll vers `anchor`. |
| 4.3 | Onboarding global | Parcours première visite (dashboard ou modal) — **même** composant Ariane, copy `NarraMind-Guide-Personnage.md`. |
| 4.4 | Accessibilité | Clavier, contrastes, pas d’animation exclusive de la couleur. |

**Définition de done** : un auteur **voit** et **traite** des alertes sans lire la console réseau.

---

## Phase 5 / 7 — Coûts & quotas

| # | Tâche | Détail |
|---|--------|--------|
| 5.1 | Quotas NarraMind | Plafond d’appels / mois par plan (table `usage` étendue ou action dédiée `narramind_update`) — aligné business Amateur / Artiste. |
| 5.2 | UI | Message clair quand quota texte atteint (comme images). |

---

## Phase 6 / 7 — Durcissement & observabilité

| # | Tâche | Détail |
|---|--------|--------|
| 6.1 | Dédoublonnage alertes | Affinage `dedupe_key` côté EF. |
| 6.2 | Tests | Vitest sur helpers (normalisation anchor, build prompt tronqué) si isolables. |
| 6.3 | Dashboard interne (optionnel) | Agréger `narramind_metrics` pour Louis. |

---

## Ordre recommandé

`1 → 2 → 4 (MVP UI) → 3 → 5 → 6`

---

## Tiers prix — « troisième plan » (hors scope immédiat du code ci-dessus)

**Oui, un troisième plan est possible** (ex. « Studio », « Éditeur ») : il impose migration `profiles_plan_check` (`'free' \| 'pro' \| 'studio'`), mise à jour **stripe-webhook**, **create-checkout-session**, **admin-set-plan**, `UserPlan` + `TIER_CONFIG`, tous les `plan === "pro"` métier (gates features), et **prix Stripe** + page Plans. Prévoir **rétrocompatibilité** des utilisateurs existants.

Document produit : à tracer dans `05_Business_Model_Canvas.md` / roadmap avant migration DB.

---

*Créé : avril 2026 — DreamWeave.*
