# Plan d'action — Suite de l'audit 2026-07-02

> Session du 2026-07-02 (machine lbasnier, sans accès Supabase CLI/Dashboard) : audit complet multi-agents du projet, merge `pre-production` → `main` (fast-forward `f79b80d`, poussé), et migration RLS `profiles` commitée sur `pre-production` (`ca6c9ef`).
> Convention : 🟣 = action Claude (code), 🔵 = action Louis (deploy/décision).

---

## ✅ Fait cette session
- `pre-production` mergée dans `main` et poussée (les correctifs sécurité du 27/06 sont maintenant sur la branche par défaut).
- Toolchain re-validée après merge : `tsc` 0 erreur, 61/61 tests, `npm audit` 0 vulnérabilité (le lockfile pre-production avait purgé les 9 CVE de l'ancien main).
- 🟣 Nouvelle migration `supabase/migrations/20260702120000_profiles_lock_sensitive_columns.sql` : la policy UPDATE de `profiles` verrouille désormais `billing_period_start`, `stripe_customer_id`, `excluded_from_stats` et `email` (en plus de `plan`). Fermait le contournement de quota par repositionnement de `billing_period_start` (fenêtre de quota de `generate-panel-image`). QA adversariale : PASS.

---

## 🔴 Phase 1 — À faire en priorité (prochaine session, PC avec accès Supabase)

- 🔵 **Appliquer la migration `20260702120000_profiles_lock_sensitive_columns.sql`** (Dashboard SQL Editor, ou `supabase db push`). Idempotente et re-jouable. Tant qu'elle n'est pas appliquée, le contournement de quota reste possible en prod.
  - **Validation** : connecté en user normal, `supabase.from('profiles').update({ billing_period_start: new Date().toISOString() })` doit échouer (RLS) ; la modification du pseudo dans /profile doit continuer de fonctionner (y compris pour un compte Libre sans abonnement).
- 🔵 **Vérifier que les migrations du 27/06 sont toutes appliquées** en prod : `20260627120000` est confirmée appliquée (PLAN-ACTION-2026-06-27 Phase 0), mais confirmer aussi `20260627130000` (RPC `consume_image_credit` — sans elle le quota atomique est fail-open) et `20260627140000` (contrainte unique `chapter_canvases`).
- 🔵 **Autoriser le merge de `pre-production` dans `main`** (1 commit d'avance : la migration RLS) — Claude peut le faire, push `main` = accord explicite requis.
- 🔵 Corriger l'identité git sur la machine lbasnier : `git config --global user.email` (le commit `ca6c9ef` est parti avec `lbasnier@naxos.loc`).

---

## 🟠 Phase 2 — Backlog issu de l'audit 2026-07-02 (confirmé par vérification adversariale)

### Sécurité / robustesse
- 🟣 `stripe-webhook` : fallback plan inconnu → `'createur'` (index.ts:73) à passer à `'libre'` ou erreur ; supprimer le code mort `line_items` (jamais présent dans un payload webhook). Extraire `planFromMetaOrPrice` en `_shared` + tests Deno.
- 🟣 Policy INSERT de `profiles` : verrouiller `plan` aussi à l'INSERT (théorique — chemin inatteignable tant qu'aucune policy DELETE client n'existe, noté par la QA du 02/07).
- 🟣 `replacePanelsFromOutline` (`src/services/panels.ts`) : delete-then-insert non transactionnel — code mort aujourd'hui, à passer en RPC Postgres AVANT tout câblage du hook `useReplacePanelsFromOutline`.
- 🟣 Remplacer `sanitizeBubbleHtml` (regex maison) par DOMPurify avant toute feature de partage/publication de chapitre.
- 🔵 Purger `.env` de l'historique git (`git filter-repo`) si le repo doit devenir public — clés publiques uniquement, non urgent.

### Tests (priorité argent > quotas > perte de données)
- 🟣 Tests `canGenerate()` + export/test de `computeUsagePeriodStart`/`computeNextResetDate` (cas jours 29-31, année, null).
- 🟣 Tests Deno `stripe-webhook` (transitions active/past_due/deleted, price ID vs metadata).
- 🟣 Extraire + tester les classificateurs d'erreurs de `useAuth.tsx` (~150 l. de string-matching qui gardent l'inscription/connexion).
- 🟣 Extraire `extractJsonObject`/`tryClosePanelsJson` de `generate-scenario-ai` vers `_shared/llmJson.ts` + tests (dupliqué non testé dans `narramind-compass`).

### Documentation
- 🟣 CLAUDE.md : 4 chemins Obsidian `C:/Users/kirit/...` morts (machine lbasnier) — rapatrier la roadmap dans le repo ou centraliser le chemin ; `.claude/Session.md` et `Fin-de-session.md` référencés mais absents du repo.
- 🟣 README : liens morts `./SUPABASE_SETUP.md` et `./CONTRIBUTING.md` (fichiers dans `docs/`).
- 🟣 EDGE_FUNCTIONS_INDEX : mode `panels` → `detect_blocks` ; plafond image 800/1024px → 1440px réel.
- 🟣 package.json : renommer `vite_react_shadcn_ts` 0.0.0 → `dreamweave`.

### Refactoring (non urgent)
- 🟣 Helper unique `invokeEdgeFunction()` côté client (boilerplate refreshSession+fetch copié ~12 fois, 3 call sites sans header `apikey`).
- 🟣 Poursuivre le découpage de `ChapterDetail.tsx` (2 501 l.) et `LoreGraphView.tsx` (2 244 l.).

### Produit (rappel roadmap)
- Mode Auto : chaîner la génération d'images bloc par bloc après `compose-chapter-layout` (dernier maillon P0).
- Clore officiellement Univers v1 (réconcilier spec `lore_entries` vs code `lore_nodes`) et déclarer la priorité suivante.
- CGU + politique de confidentialité (obligatoire avec Stripe) — item P0 disparu des checklists depuis le 13/06.
- `public/og-image.png` 1200×630 à déposer (tags OG déjà codés le 27/06).
