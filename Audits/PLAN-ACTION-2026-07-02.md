# Plan d'action — Suite de l'audit 2026-07-02

> Session du 2026-07-02 (machine lbasnier, sans accès Supabase CLI/Dashboard) : audit complet multi-agents, merge `pre-production` → `main`, puis 7 commits de correctifs sur `pre-production`.
> Convention : 🟣 = action Claude (code), 🔵 = action Louis (deploy/décision).

---

## 🌙 CHECKLIST CE SOIR (Louis, PC principal) — dans cet ordre

### A. Déploiement (~15 min)

- [ ] **1. Appliquer les 2 migrations du 02/07** — Dashboard SQL Editor (ou `supabase db push`) :
  - `supabase/migrations/20260702120000_profiles_lock_sensitive_columns.sql` (verrou UPDATE — ferme le contournement de quota)
  - `supabase/migrations/20260702130000_profiles_lock_plan_on_insert.sql` (verrou INSERT — défense en profondeur)
  - Idempotentes, re-jouables sans risque.
- [ ] **2. Vérifier les migrations du 27/06** : `20260627120000` est confirmée appliquée, mais vérifier `20260627130000` (RPC `consume_image_credit` — sans elle le quota atomique est fail-open) et `20260627140000` (contrainte unique `chapter_canvases`). Test rapide dans SQL Editor : `SELECT proname FROM pg_proc WHERE proname = 'consume_image_credit';` → 1 ligne attendue.
- [ ] **3. Redéployer `stripe-webhook`** : `supabase functions deploy stripe-webhook --use-api` (AVG Web Shield coupé). Le fix « plan irrésoluble = erreur + retry » n'est actif qu'après.

### B. Validations (~10 min)

- [ ] **4. Valider le verrou RLS** : connecté en user normal (console navigateur), `supabase.from('profiles').update({ billing_period_start: new Date().toISOString() }).eq('user_id', '<ton-user-id>')` → doit échouer ; changer son pseudo dans /profile → doit marcher (tester aussi avec un compte Libre sans abonnement).
- [ ] **5. Valider le webhook** : dashboard Stripe → renvoyer un `customer.subscription.updated` d'un abonné réel → le plan reste correct. (Un événement avec price ID + metadata inconnus doit finir en échec 500 visible dans Stripe, jamais écrire `createur`.)

### C. Git (~2 min)

- [ ] **6. Dire à Claude « pousse sur main »** (ou le faire toi-même : `git checkout main && git merge pre-production && git push origin main` — fast-forward, 7 commits). Vercel redéploiera le front avec le fix quotas client/serveur unifié.
- [ ] **7. (Si tu repasses sur le PC bureau lbasnier)** : `git config --global user.email "louis.basnier@naxos.fr"` — les commits du 02/07 sont partis avec `lbasnier@naxos.loc`.

### D. Session de test A→Z (le gros morceau)

- [ ] **8. Itérer sur le produit de bout en bout** : inscription → projet → style → assets → scénario → chapitre → édition → export.
- [ ] **9. Consigner CHAQUE friction** dans `docs/feedback/` (même format que `12_Retour_Utilisateur_Jeremy.md`) — ça alimentera le chantier onboarding/UI (`docs/specs/onboarding-progressif-et-fluidite-ui.md`) avec du réel.
- [ ] **10. Garder un œil sur** : le parcours des onglets (quel ordre tu suivrais naturellement ? où hésites-tu ?) — c'est la matière première de l'onboarding par actions débloquantes que tu veux.

---

## ✅ Fait le 02/07 (7 commits sur `pre-production`)

1. `ca6c9ef` — Migration verrou UPDATE `profiles` (P1 sécurité : billing_period_start/stripe_customer_id/excluded_from_stats/email). QA PASS.
2. `835d840` — Ce plan d'action.
3. `e874e9d` — `stripe-webhook` : plan irrésoluble → throw → 500 → retry Stripe (fini le fallback silencieux `createur`) ; `planFromMetaOrPrice` extraite en `_shared/stripePlan.ts` + 9 tests ; code mort `line_items` supprimé. QA PASS 7/7.
4. `4b2a54b` — Vision onboarding/UI consignée (`docs/specs/onboarding-progressif-et-fluidite-ui.md`) ; CLAUDE.md plafond panel 1440px ; package.json → `dreamweave` 1.0.0.
5. `bd46224` — CLAUDE.md : note vault Obsidian = PC principal uniquement (les autres machines sautent les protocoles wiki proprement).
6. `44a6b42` — Quotas source unique : `useUserPlan` importe `computeUsagePeriodStart`/`computeNextResetDate` depuis `@fn-shared/usagePeriod` (fin structurelle de la divergence client/serveur) + 5 tests ; migration verrou INSERT `profiles`.
7. **Blitz couverture (10 agents + QA)** : 75 → **503 tests** (28 fichiers). Couverture branches 37 % → 80 %, fonctions 12 % → 45 %, `src/lib` 71 % lignes. Extractions comportement-identique : `authErrors.ts` (classificateurs auth, 43 tests matrice complète), `_shared/llmJson.ts` (parsing JSON LLM dédoublonné de `generate-scenario-ai` + `narramind-compass`, 21 tests). **Bug P1 réel trouvé ET corrigé : bypass XSS de `sanitizeBubbleHtml`** (balise non terminée traversait intacte → `&lt;` inerte, 3 tests). Clean invisible : console.debug gardés (fuite email en prod supprimée), 0 warning ESLint, `pure: console.log/debug/info` au build prod, ~9 morceaux de code mort supprimés (composant, fonctions, types, constantes). QA finale : PASS, tsc 0, lint 0, build OK.

Et en amont : merge `pre-production` → `main` poussé (`f79b80d`), toolchain re-validée (75/75 tests, tsc 0 erreur, npm audit 0 vulnérabilité, build OK).

---

## 🟠 Backlog restant (sessions suivantes, avec plus de crédits)

### Sécurité / robustesse
- 🟣 `replacePanelsFromOutline` (`src/services/panels.ts`) : delete-then-insert non transactionnel — code mort (hooks orphelins re-confirmés), défaut désormais PROUVÉ par test ; à passer en RPC Postgres AVANT tout câblage Mode Auto.
- 🟣 DOMPurify optionnel : `sanitizeBubbleHtml` est maintenant durci (bypass P1 corrigé) et verrouillé par 24 tests adversariaux — DOMPurify reste la reco si le partage public de chapitres arrive.
- 🔵 Purger `.env` de l'historique git (`git filter-repo`) si le repo doit devenir public — clés publiques uniquement, non urgent.

### Tests restants
- 🟣 Tests `stripe-webhook` transitions du handler (active/past_due/deleted) — `planFromMetaOrPrice`, quota, ownership, cors, llmJson désormais couverts.
- ✅ ~~canGenerate~~, ~~classificateurs useAuth~~, ~~extraction llmJson~~ — faits le 02/07 (blitz).

### Bugs P2 signalés par le blitz (à trancher, aucun urgent)
- `authErrors` : tout 422 au signUp est classé USER_ALREADY_EXISTS (y compris weak_password) — comportement historique conservé, à affiner.
- `scenarioChapters` : sévérité d'alerte NarraMind perdue quand l'alerte n'a qu'une explication (documenté par `it.fails`) ; `parseChapterAssets` partage le tableau de `EMPTY_CHAPTER_ASSETS` (copie superficielle).
- `scenarioAI` : réponse 200 non-JSON → objet vide silencieux ; message 5xx avec espace en tête si `request_id` seul.
- `assets` : extension de fichier mal dérivée pour un nom sans point (fallback mort).
- `TestSection` toujours routé en prod (garde email admin en dur) — décision Louis.
- `deleteStyleImage` jamais appelé → images de style orphelines dans le bucket Storage (fuite lente).

### Refactoring (non urgent)
- 🟣 Helper unique `invokeEdgeFunction()` côté client (boilerplate refreshSession+fetch copié ~12 fois, 3 call sites sans header `apikey`).
- 🟣 Poursuivre le découpage de `ChapterDetail.tsx` (2 501 l.) et `LoreGraphView.tsx` (2 244 l.).

### Produit (rappel roadmap)
- **Chantier UX/UI prioritaire de Louis** : onboarding par actions débloquantes + fluidité — spec dans `docs/specs/onboarding-progressif-et-fluidite-ui.md`, à affiner avec le feedback de la session de test de ce soir.
- Mode Auto : chaîner la génération d'images bloc par bloc après `compose-chapter-layout` (dernier maillon P0).
- Clore officiellement Univers v1 (réconcilier spec `lore_entries` vs code `lore_nodes`) et déclarer la priorité suivante.
- CGU + politique de confidentialité (obligatoire avec Stripe) — item P0 disparu des checklists depuis le 13/06.
- `public/og-image.png` 1200×630 à déposer (tags OG déjà codés le 27/06).
