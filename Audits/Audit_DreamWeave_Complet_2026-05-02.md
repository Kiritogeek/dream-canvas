# 🔍 Audit Technique Complet — DreamWeave  
📅 Date : 2026-05-02  
👤 Auteur : Audit Assistant (revue de code + outils)  
🎯 Objectif : Évaluer la qualité globale du projet (code, sécurité, architecture, performance, maintenabilité)

---

# 🧠 1. Vue d’ensemble

## 📌 Contexte
- **Description rapide du projet** : plateforme web de création de webtoons assistée par IA (personnages, décors, panels, scénario, éditeur de chapitre avec canvas, bulles, blocs couleur, Stripe, NarraMind, etc.).
- **Stack technique** : React 18 + TypeScript strict + Vite 7, shadcn/ui + Tailwind 3, TanStack Query 5, React Router 6 (lazy), Supabase (PostgreSQL, Auth PKCE, Storage, Edge Functions Deno), intégrations FAL.ai / Stripe selon les docs produit.
- **Environnement (dev / prod)** : SPA statique (`vite build` → `dist/`). Dev : Vite sur `127.0.0.1:8080` (config explicite pour HMR). Prod : hébergement type Vercel / statique + projet Supabase distant.

## 🎯 Objectifs de l’audit
- [x] Identifier les failles de sécurité (y compris chaîne d’outillage)
- [x] Améliorer la qualité du code
- [x] Optimiser les performances (constat + pistes)
- [x] Réduire la dette technique
- [x] Clarifier l’architecture

---

# 🏗️ 2. Architecture

## 🔎 Analyse
- **Structure des dossiers** : cohérente — `src/pages`, `src/components`, `src/hooks`, `src/services`, `src/integrations/supabase`, `supabase/migrations`, `supabase/functions`. Alias `@` et `@fn-shared` (partagé fonctions) bien pensé.
- **Séparation des responsabilités** : bonne intention (hooks de data, composants chapitre découpés `*Layer`, Edge Functions par domaine). **Mais** une page centrale `ChapterDetail.tsx` concentre navigation d’état, zoom, undo, sélection, mutations — risque de « god component ».
- **Patterns** : pas de Clean Architecture stricte ; plutôt **feature-oriented** + **BFF léger via Edge Functions** pour l’IA et le billing. TanStack Query comme couche cache/Serveur-état client.
- **Couplage** : modéré — typage Supabase généré (`Database`) ; couplage fort naturel entre UI chapitre et modèle `Panel` / layouts JSON.
- **Scalabilité** : bonne pour plus de features côté Edge + tables Supabase ; réduction de la dette sur `ChapterDetail` et extraction de sous-hooks améliorerait la vélocité d’équipe.

## 🚨 Problèmes identifiés
- Fichier **`ChapterDetail.tsx` ~2350+ lignes** : difficile à tester, à revue, et à faire évoluer sans régressions.
- Absence de pipeline CI visible (`.github/workflows` absent) alors que le pré-commit local fait `tsc` + `lint-staged` — le comportement n’est pas garanti à distance.
- Dépendance **dev** `lovable-tagger` en dev-only : acceptable, mais à surveiller (surface d’outillage).

## ✅ Actions recommandées
- [ ] Découper `ChapterDetail` : hooks `useChapterCanvasEditor`, `useChapterZoom`, `usePanelEditorSelection`, etc., + composants de layout modale.
- [ ] Ajouter **CI GitHub Actions** (au minimum : `npm ci`, `npm run build`, `npm test`, `npm run lint`).
- [ ] Documenter en 1 page le **flux données** chapitre ↔ Supabase ↔ canvas (schéma léger dans `Produit/` ou `docs/` si vous le souhaitez hors template produit existant).

---

# 💻 3. Qualité du Code

## 🔎 Analyse
- **Lisibilité** : globalement bonne TypeScript, commentaires utiles sur les zones complexes (canvas, zoom).
- **Conventions** : ESLint 9 + `typescript-eslint`, `lint-staged` avec `--max-warnings 0` — disciplinant.
- **Complexité** : plusieurs handlers longs et effets imbriqués dans les grosses pages.
- **Duplication** : patterns répétés entre layers (drag/resize/select) mais partiellement factorisés via hooks (`useDragBlock`, etc.).
- **Nommage** : clair dans l’ensemble ; quelques préfixes projet (`DreamWeave*`) bien identifiables.

## 🚨 Problèmes identifiés
- **Hotspot volumétrique** : `ChapterDetail.tsx` hors norme pour la maintenabilité.
- Risque de **régressions** sur l’éditeur canvas sans tests de non-régression automatisés.

## ✅ Actions recommandées
- [ ] ESLint / Prettier : déjà ESLint strict ; prévoir Prettier officiel ou `eslint-config-prettier` si formatage diverge selon IDE.
- [ ] Refactor ciblé des blocs anonymes `(function () {})()` dans JSX du chapitre en sous-composants nommés.
- [ ] Renforcer les types aux frontières JSON (`layout`, `speech_bubbles`) avec validateurs runtime (ex. **Zod** déjà présent — opportunité sous-utilisée côté client).

---

# 🧹 4. Dead Code & Nettoyage

## 🔎 Analyse
- Pas d’audit **ts-prune / knip / depcheck** exécuté dans ce rapport ; forte probabilité de **petits fichiers helpers** ou imports inutilisés après itérations.
- Dépôt peut contenir des arborescences **`.claude/worktrees`** en local — à exclure du versioning (vérif `.gitignore` si besoin).
- Dépendances : `caniuse-lite` explicitement dans `dependencies` — souvent plutôt une transitive ; à revoir si non requis directement.

## 🚨 Problèmes identifiés
- Couverture de détection automatique du code mort **non intégrée** au projet.

## ✅ Actions recommandées
- [ ] Introduire un passage CI ou script npm : **`knip`** ou **`ts-prune`** sur `src/`.
- [ ] Lancer **`depcheck`** et retirer les deps non utilisées.
- [ ] Vérifier `caniuse-lite` : déplacer ou supprimer si inutile en direct.

---

# 🔐 5. Sécurité

## 🔎 Analyse
- **Secrets** : clés publiques `VITE_*` uniquement dans le bundle client (attendu). Edge Functions pour logique sensible (clés serveur non exposées au navigateur, si configurées côté Supabase secrets).
- **Auth** : Supabase Auth, `flowType: "pkce"`, refresh token ; routes protégées via `ProtectedRoute`.
- **Autorisation** : migrations montrent **RLS** systématique sur entités métier (`profiles`, `projects`, `assets`, `chapters`, `panels`/canvases, etc.) avec politiques `auth.uid() = user_id`.
- **XSS** : bulles utilisent `sanitizeBubbleHtml` + contrôle `dangerouslySetInnerHTML` / `innerHTML` — bon réflexe ; à maintenir (revue à chaque évolution du sanitizer).
- **Dépendances** : `npm audit` signale **12 vulnérabilités** (dont Vite 7.0–7.3.1, Rollup 4.x, lodash, postcss, transitive jsdom…) — plusieurs corrigeables via `npm audit fix` ; certaines pertinentes **surtout en dev server / build**, pas en runtime navigateur utilisateur final.

## 🚨 Problèmes identifiés
- Chaîne **`vite` / `rollup`** en versions signalées vulnérables par l’outil d’audit (à mettre à jour pour limiter risques lors du développement / builds).
- **Edge Functions** (IA, Stripe) : nécessitent revue systématique des en-têtes, validation des payloads, quotas et erreurs pour éviter abus ou fuite coûts — hors scope ligne par ligne dans cet audit ponctuel.
- Absence de **rate limiting** visible côté client (normal) — doit être garanti **côté Supabase / API** où pertinent.

## ✅ Actions recommandées
- [ ] Appliquer `npm audit fix` puis monter les versions **`vite`** / **`rollup`** dans la branche suivant les advisory.
- [ ] Mettre **`jsdom`** à jour (Vitest) — attention breaking change selon rapport audit.
- [ ] Passage **checklist OWASP** sur les fonctions critiques (upload, paiement, génération d’images).
- [ ] Vérifier sur chaque nouvelle table : **RLS + policies** + tests SQL minimaux si possible.

---

# ⚡ 6. Performance

## 🔎 Analyse
- **Chargement** : lazy routes dans `App.tsx` + Suspense avec loader — bon pattern.
- **Données** : React Query `staleTime: 30s`, `retry: 1` — équilibré pour du dashboard.
- **Canvas chapitre** : zoom, layers multiples, `html2canvas` pour export — charge CPU/GPU possible sur machines modestes.
- **Images** : dépend du stockage Supabase / URLs ; pas d’audit Lighthouse intégré ici.
- **Bundle** : non mesuré dans ce rapport — recommandation d’`rollup-plugin-visualizer` ou rapport Vite build.

## 🚨 Problèmes identifiés
- Page **ChapterDetail** dense : risque de re-renders si état non optimisé (à profiler avec React DevTools).
- Pas de politique documentée de **virtualisation** pour listes longues (assets, historique) si elles grossissent.

## ✅ Actions recommandées
- [ ] Analyser le bundle (`vite build --analyze` ou plugin dédié).
- [ ] Mémoïser / scinder l’état canvas pour limiter les re-renders des barres d’outils.
- [ ] Lazy-load des sous-panneaux lourds de l’éditeur si besoin.

---

# 🧪 7. Tests

## 🔎 Analyse
- **Vitest** + Testing Library présents en devDependencies.
- En pratique : essentiellement **`src/test/example.test.ts`** (smoke test trivial).
- **Aucune** couverture significative sur logique métier (layouts, undo, historique canvas, mutations, hooks).

## 🚨 Problèmes identifiés
- Dette **critique** sur la confiance aux régressions pour l’éditeur de chapitre.

## ✅ Actions recommandées
- [ ] Tests unitaires sur **pur functions** : `panelCanvasUndo`, parsers `layout`, utilitaires chapitre.
- [ ] Tests d’intégration ciblés sur **un flux** : ouverture chapitre + sélection bloc (React Testing Library).
- [ ] CI avec **`npm test`** obligatoire sur PR.

---

# 📦 8. Dépendances & Build

## 🔎 Analyse
- Stack **récente** (Vite 7, React 18, TS 5.8).
- Volumes importants de **Radix** (attendu avec shadcn).
- **npm audit** : vulnérabilités à traiter (voir §5).
- Build : Vite standard, pas de monorepo.

## 🚨 Problèmes identifiés
- Vulnérabilités outillage (Vite, Rollup, transitive dev).
- `package.json` name générique `vite_react_shadcn_ts` — cosmétique mais peu professionnel pour publication.

## ✅ Actions recommandées
- [ ] Renommer le package en `dreamweave` ou `dream-canvas` pour cohérence.
- [ ] Plan de montée de version trimestrielle + `npm audit` en CI.

---

# 🚀 9. DevOps & Déploiement

## 🔎 Analyse
- **Pre-commit** (Husky) : `tsc --noEmit` + `lint-staged` (ESLint) — excellent garde-fou **local**.
- **Pas de workflows GitHub Actions** détectés dans le dépôt au moment de l’audit.
- Logs / monitoring : non vérifiés dans le code (Sentry, etc.) — à confirmer côté hébergeur.
- Rollback : typique Vercel / déploiement statique + migrations Supabase versionnées.

## 🚨 Problèmes identifiés
- Absence de **CI distante** = risque de merge sans build/test.

## ✅ Actions recommandées
- [ ] Pipeline minimal sur `main` / PRs.
- [ ] Documenter déploiement Supabase (migrations ordonnées, `supabase db push` / review).
- [ ] Optionnel : Sentry ou équivalent sur le front.

---

# 📚 10. Documentation

## 🔎 Analyse
- **README** : clair (stack, setup, liens Supabase).
- **Produit/** : riche (architecture, sécurité infra, modèle de données, roadmap, UX, NarraMind).
- **SUPABASE_SETUP.md** référencé pour onboarding backend.

## 🚨 Problèmes identifiés
- Doc **API Edge Functions** fragmentée entre fichiers Deno — acceptable mais index global manquant si beaucoup de fonctions.
- Onboarding **développeur** : pourrait résumer en une page « premier PR » (build, lint, test, migrations).

## ✅ Actions recommandées
- [ ] Fichier `CONTRIBUTING.md` court (commandes, conventions branches, hooks).
- [ ] Table des Edge Functions + rôles + secrets requis.

---

# 🧭 11. Plan d’action priorisé

## 🔴 Critique (immédiat)
- Corriger / planifier la remédiation **npm audit** sur la chaîne **Vite / Rollup** (dev & build).
- Ne pas exposer de secrets serveur dans le client ; vérifier chaque nouvelle variable `VITE_*`.

## 🟠 Important (court terme)
- Introduire **CI** (build + lint + test).
- Enrichir les **tests** au-delà de l’exemple Vitest.
- Découper **`ChapterDetail.tsx`** (maintenabilité + bugs).

## 🟢 Amélioration (long terme)
- Validation runtime des JSON **layout / bulles** avec Zod.
- Analyse bundle + perf canvas (mémo, interactions).
- Outils **knip/depcheck** en routine.

---

# 📊 12. Score global

| Catégorie        | Score /10 | Commentaire rapide |
|------------------|----------:|---------------------|
| Architecture     | **8**     | Stack saine ; god page à traiter |
| Code Quality     | **7**     | TS + ESLint solides ; fichiers trop gros |
| Sécurité         | **7**     | RLS + PKCE + sanitization ; audit npm à traiter |
| Performance      | **7**     | Lazy routes ; canvas lourd à surveiller |
| Tests            | **3**     | Quasi absent malgré Vitest |
| Documentation    | **8**     | README + Produit/ très fournis |

## 🧾 Score total : **40 / 60**

*(Somme des six critères — objectif atteindre ≥ 45 après CI, tests ciblés, et réduction des vulnérabilités outillage.)*

---

# ✅ 13. Suite à l’audit — Actions, bénéfices et impact utilisateur

Déclinaison opérationnelle du **plan d’action (§11)** pour **DreamWeave**, audit du **2026-05-02**. Chaque action est reliée à ce qu’elle améliore côté technique, au **pourquoi**, et à l’**impact** pour l’utilisateur final (direct = perceptible dans l’app ; indirect = stabilité / sécurité / vélocité d’équipe sur le long terme).

## Légende impact

| Type | Définition |
|------|------------|
| **Direct** | Comportement, performance ou fiabilité perceptible dans l’app (fluidité, moins de bugs, temps de réponse…). |
| **Indirect** | Pas toujours visible immédiatement : moins de régressions à chaque release, meilleure sécurité, coûts maîtrisés ; l’utilisateur en profite par un produit **plus stable** et des évolutions **plus régulières**. |

## Indicateurs de suivi (à cocher lors des revues)

| Statut | Signification |
|--------|----------------|
| [ ] | Non démarré |
| [~] | En cours |
| [x] | Fait |

---

### 🔴 Critique (immédiat)

| Statut | Action | Ce que ça améliore / Pourquoi | Impact utilisateur |
|:------:|--------|-------------------------------|---------------------|
| [~] | Remédiation **`npm audit`** : mettre à jour **Vite / Rollup** et dépendances transmises corrigeantes (puis **`npm audit fix`** prudent + tests régressifs build) | `npm audit fix` sans `--force` appliqué (18 packages) — **restent 3 low** (chaîne transitive **jsdom** ; correctif prévu `--force`/montée majeure). Réévaluer Vite après prochain advisory. | **Indirect** majeur une fois terminé.**Direct** limité tant que des low subsistent mais surface réduite. |
| [~] | **Pas de secrets serveur en `VITE_*`** ; clés IA / Stripe / internes uniquement via **Secrets Supabase** et **Edge Functions** | `.env.example` sur des placeholders + rappels dans CONTRIBUTING ; **rotation** des clés côté Supabase si exposition passée dans l’historique git. | **Indirect** préservation confiance données / paiement. |

---

### 🟠 Important (court terme)

| Statut | Action | Ce que ça améliore / Pourquoi | Impact utilisateur |
|:------:|--------|-------------------------------|---------------------|
| [x] | **CI distante** (ex. GitHub Actions) sur PR : `npm ci`, `npm run lint`, `npm run build`, `npm test` | `.github/workflows/ci.yml` — lint, `tsc`, tests, build avec `VITE_*` factices. | **Indirect** régressions mieux interceptées après activation sur GitHub. |
| [~] | **Tests Vitest** (chemins critiques) | `panelCanvasUndo` + `parseLayoutRect` + smoke ; suite : flux éditeur. | **Indirect** refactor plus sûr ; **direct** moins de régressions canvas. |
| [~] | **Découper `ChapterDetail.tsx`** | `useChapterEditorZoom` extrait ; suite : autres hooks et sous-composants. | **Indirect** livraisons plus rapides ; **direct** éditeur plus stable dans le temps. |

---

### 🟢 Amélioration (long terme)

| Statut | Action | Ce que ça améliore / Pourquoi | Impact utilisateur |
|:------:|--------|-------------------------------|---------------------|
| [ ] | **Validation runtime** (ex. **Zod**) des JSON `layout` / bulles / blocs avant rendu éditeur | Données invalides (migration, copier-coller, bug réseau) → erreurs **explicites** ou dégradation contrôlée au lieu d’un écran figé ou de corruptions silencieuses. | **Direct** en cas d’incident : message compréhensible ou récupération possible.**Indirect** : support et debug plus rapides. |
| [ ] | **Analyse bundle** + **perf canvas** (Profiler React, re-renders, virtualisation des listes lourdes, lazy des panneaux secondaires) | Réduit travail CPU/GPU sur machines modestes et temps avant interaction utile. | **Direct** : **scroll, zoom, export** plus fluides sur les **gros chapitres**. |
| [ ] | **`knip` / `depcheck`**, suppression **code mort** et deps inutiles | Moins de confusion, moins de risque d’importer d’anciens chemins ; installs plus propres. | **Indirect** : équipe plus réactive sur les bugs utilisateur ; base de code plus saine. |

---

### Documentation & onboarding (transversal)

| Statut | Action | Ce que ça améliore / Pourquoi | Impact utilisateur |
|:------:|--------|-------------------------------|---------------------|
| [x] | **`CONTRIBUTING.md`** + **index Edge Functions** | **`CONTRIBUTING.md`** à la racine ; **`docs/EDGE_FUNCTIONS_INDEX.md`** ; lien README section « CI & contribution ». |

---

## Journal post-audit (implémentation outil / automate)

_Tranche suivante mise en place après le rapport initial — à garder comme trace._

- `eslint.config.js` : ignore `.claude/**` (réduit faux positifs hors code produit).
- `.gitignore` : `.claude` (worktrees locales).
- Dépendances : `npm audit fix` sans `--force` (reste analyse jsdom/transitives low).

---

# 🧠 Conclusion

DreamWeave repose sur une **stack moderne et cohérente** (React, Vite, Supabase, Edge Functions) avec une **documentation produit solide** et des **garde-fous locaux** (TypeScript strict, ESLint en pré-commit, RLS côté base). Les principaux risques portent sur la **concentration de logique dans `ChapterDetail`**, la **faible couverture de tests**, et les **vulnérabilités signalées par npm audit** sur l’outillage de build — à adresser rapidement pour sécuriser le pipeline de développement. La priorisation recommandée : **CI + correctifs dépendances + découpage de l’éditeur chapitre + premiers tests sur utilitaires et undo canvas**.

**Suivi** : les engagements détaillés (bénéfices + impact utilisateur) sont dans le **§13** ; mettre à jour les cases « Statut » à chaque revue d’audit ou sprint review.

---

# 📌 Notes

- Revue effectuée sur l’état du dépôt à la date indiquée ; les scores sont **indicatifs** et doivent être recalculés après mise en œuvre des actions.
- Gabarit réutilisable : `Audits/Audit_Instruction.md` (y compris la structure §13). Fichier livrable par audit : `Audits/Audit_*_Complet_YYYY-MM-DD.md`.
