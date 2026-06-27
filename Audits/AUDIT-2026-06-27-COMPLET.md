# DreamWeave — Audit Complet du 27 juin 2026

**Méthode :** code à jour (pull `origin/main`, HEAD `23a63b5`) + chaîne d'outils exécutée réellement + 8 auditeurs spécialisés (Opus 4.8) en parallèle sur le code source + vérification adversariale des findings critiques/élevés (relecture indépendante du code).
**Couverture :** 173 fichiers TS/TSX (41 313 LOC), 14 Edge Functions Deno, 42 migrations SQL.
**Bilan brut :** 61 findings ; 12 critiques/élevés re-vérifiés → **8 confirmés, 4 recalibrés, 0 réfuté**.

---

## 0. TL;DR

Le code est **techniquement sain** (0 erreur TS, 0 erreur lint, 51/51 tests verts, build OK) et l'architecture est propre. Mais l'audit révèle **2 vulnérabilités de sécurité critiques** (IDOR cross-tenant) et plusieurs incohérences produit/économiques à solder avant tout lancement public.

| # | Sévérité | Finding | Effort |
|---|----------|---------|--------|
| 1 | 🔴 **CRITICAL** | IDOR `generate-scenario-ai` : `project_id` non vérifié → fuite lore/mémoire/**scénario intégral** d'autrui | quick |
| 2 | 🔴 **CRITICAL** | IDOR `compose-chapter-layout` : `chapter_id` non vérifié → **écrasement/destruction** du canvas d'un autre user | quick |
| 3 | 🟠 HIGH | Différenciateurs Studio facturés (mémoire longue + priorité FAL) **non implémentés** | medium |
| 4 | 🟠 HIGH | Fenêtre de quota divergente : `generate-asset-image` (mois calendaire) ≠ UI + `generate-panel-image` (anniversaire) | quick |
| 5 | 🟠 HIGH | ReactFlow (~120 kB gzip) chargé sur **chaque** page projet même sans ouvrir l'onglet Univers | quick |

**Avant lancement public :** corriger #1 et #2 est **non négociable** (RGPD / fuite de propriété intellectuelle des utilisateurs).

---

## 1. Vérité-terrain (outillage, mesuré le 27/06)

| Vérification | Résultat |
|---|---|
| `tsc --noEmit` | ✅ **0 erreur** (les 92 erreurs `LoreGraphView` du 17/06 sont **soldées**) |
| `eslint .` | ✅ 0 erreur, 5 warnings mineurs (react-refresh ×4 sur primitives ui, 1 unused var `use-toast.ts`) |
| `vitest run` | ✅ 51/51 — mais **4 fichiers seulement** (panels/undo/canvas history) pour 41 k LOC |
| `vite build` | ✅ OK 8.56 s |
| `npm audit` (prod) | ⚠️ 3 vulnérabilités : `ws` (HIGH, transitive), `react-router`/`-dom` 6.30.x (MODERATE, open redirect GHSA-2j2x-hqr9-3h42) |
| CI `.github/workflows/ci.yml` | ✅ lint + tsc + test + build sur push/PR ; risque rollup-linux du 17/06 **mitigé** (lockfile v3 liste le binaire) |

**Bundles (raw / gzip) :** `index` 490/150 kB · `Pilotage` 443/119 kB (recharts) · `ProjectDetail` 425/123 kB (ReactFlow) · `exportPanel` 302/79 kB (html2canvas+jszip). **Aucun `manualChunks`** dans `vite.config.ts`.

---

## 2. 🔴 CRITIQUES (à corriger immédiatement)

### C1 — IDOR cross-tenant dans `generate-scenario-ai` (fuite de données)
**`supabase/functions/generate-scenario-ai/index.ts`** — `verifyUserFromToken` extrait `userId` (l.449) mais **il n'est jamais comparé au propriétaire de `body.project_id`**. Vérifié par grep : `0` occurrence de `user_id=eq` / `projects?id=eq` / `403` dans tout le fichier. La fonction lit ensuite en **service role** (bypass RLS) :
- `lore_nodes` (l.379, modes scenario/chapter)
- `memory_entities` + `memory_summaries` (l.597-606, mode narramind)
- `lore_edges`, `compass_proposals`, `scenario_chapters` (l.640-645, narrative_directions)
- **`scenario_chapters.content` intégral** (l.775-778, mode baseline) — injecté quasi-verbatim dans le system prompt.

**Impact :** tout utilisateur authentifié envoie le `project_id` d'autrui et exfiltre, via la sortie IA, le lore complet, la mémoire narrative et **le contenu intégral des chapitres** d'un projet tiers. Écrit aussi des `narramind_metrics` taguées avec un `project_id` qui n'est pas le sien.
**Preuve du pattern correct existant :** `narramind-compass` (l.126/131/245/250) et `narramind-update` (l.1299) **font déjà** ce contrôle. `generate-scenario-ai` est la seule à l'omettre.
**Correctif (quick) :** juste après `verifyUserFromToken`, avant toute lecture service-role :
```ts
if (body.project_id) {
  const own = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${body.project_id}&user_id=eq.${userId}&select=id`,
    { headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` } });
  const rows = own.ok ? await own.json() : [];
  if (!rows.length) return jsonResponse({ error: "Accès refusé." }, 403);
}
```

### C2 — IDOR dans `compose-chapter-layout` (destruction de données)
**`supabase/functions/compose-chapter-layout/index.ts`** — `chapter_id` (body) jamais vérifié contre `userId` (grep : `0` contrôle). `getOrCreateCanvas` lit `chapter_canvases?chapter_id=eq.${chapterId}` en service role (l.637) et retourne le canvas existant **quel qu'en soit le propriétaire** ; `updateCanvas` PATCH `chapter_canvases?id=eq.${canvasId}` (l.680) sans filtre `user_id`.
**Impact :** un utilisateur authentifié, avec le `chapter_id` (UUID) d'autrui + un `panels_outline` non vide, **écrase silencieusement le layout + les bulles** du chapitre d'un autre — perte de travail irréversible. IDOR en écriture.
**Correctif (quick) :** avant `getOrCreateCanvas`, lire `chapters?id=eq.{chapter_id}&select=project_id,projects(user_id)` et refuser 403 si `projects.user_id !== userId` ; en défense en profondeur, ajouter `&user_id=eq.${userId}` au SELECT et au PATCH.

> ⚠️ **Audit de surface conseillé** : les 12 autres Edge Functions opèrent aussi en service role. `narramind-compass`/`narramind-update` sont OK ; vérifier systématiquement `generate-panel-image`, `generate-asset-image`, etc. qu'un contrôle d'ownership existe avant chaque accès service-role piloté par un id du body.

---

## 3. 🟠 ÉLEVÉS

### H1 — Différenciateurs Studio facturés mais non implémentés *(confirmé high)*
`Plans.tsx:107-120` vend **« Mémoire narrative longue »** et **« Priorité traitement FAL.ai »** comme exclusivités Studio (29,99 €), et `CLAUDE.md` les décrit comme les « seules exceptions Studio ». Or :
- `narramind-update` **ne lit jamais le plan** (`0` grep `select=plan` / `allowLongMemory`) → la mémoire longue s'exécute à l'identique pour libre/createur/studio.
- `allowLongMemory` n'est lu **nulle part** (4 définitions seulement, aucune consommation).
- **Aucune** logique de priorité FAL (`0` grep `priority|queue` dans les EF).

**Impact :** Studio ne livre rien de plus que Créateur hors volume de crédits → **feature facturée non délivrée** (risque commercial + crédibilité mémoire).
**Décision produit (Louis) :** **(A)** retirer ces 2 lignes de `Plans.tsx` + `CLAUDE.md` + mémoire (cohérent avec « tout gratuit, différenciation = crédits ») — **recommandé** ; ou **(B)** implémenter réellement le gating (contredit l'ADN « tout gratuit »).

### H2 — Fenêtre de quota divergente serveur/UI *(confirmé ; calibré high↔medium)*
`generate-asset-image` compte au **1er du mois calendaire** (`select=plan` seul, ignore `billing_period_start`, l.604) ; `generate-panel-image` (l.735-745) **et** l'UI `useUserPlan.ts` (l.41-50) comptent au **jour d'anniversaire d'abonnement**. Même table `usage`, même quota, **deux fenêtres**.
**Impact :** pour un abonné payant dont le jour de facturation ≠ 1, le compteur d'assets diverge de l'affichage : blocage prématuré ou dépassement du quota affiché. (Limité aux payants à anniversaire non-1er ; libre = `null` → les deux retombent au 1er, cohérent. D'où la calibration medium par 2 vérificateurs sur 3.)
**Correctif (quick) :** extraire `computeUsagePeriodStart(profile)` dans `supabase/functions/_shared/`, l'utiliser dans les **deux** EF (ajouter `billing_period_start` au select de `generate-asset-image`). Corriger le commentaire trompeur l.710 de `generate-panel-image`.

### H3 — ReactFlow chargé statiquement sur chaque page projet *(confirmé high, vérifié au build)*
Chaîne d'imports **statiques** : `ProjectDetail.tsx:23` → `UniverseSection` → `LoreGraphView.tsx:22` (`@xyflow/react`). L'onglet par défaut est `style`/`edition`, **jamais** `universe` (l.74-82). Pourtant tout utilisateur ouvrant un projet télécharge/parse le chunk `ProjectDetail` de **122,5 kB gzip** (quasi tout = ReactFlow + les 2 244 LOC de `LoreGraphView`).
**Correctif (quick) :** `const UniverseSection = lazy(() => import("@/components/project/UniverseSection"))` + `<Suspense>` rendu uniquement si `activeTab === "universe"`. Le lazy-load ne change **pas** le comportement runtime (zone canvas non impactée). Vérifier le même pattern pour `ScenarioSection`/`EditionSection`/`AssetLibrary`.

---

## 4. 🟡 MOYENS

**Sécurité / BDD**
- **Race condition quota** (check-then-act non atomique) : `generate-asset-image`/`-panel-image` comptent puis insèrent `usage` **après** l'appel FAL (~100 s). N requêtes concurrentes près de la limite → dépassement + surcoût FAL (exploitable sur Libre). → RPC Postgres atomique, ou ligne `usage` « réservation » avant l'appel FAL.
- **Policies `UPDATE` sans `WITH CHECK`** sur `projects/assets/chapters/chapter_canvases/scenario_chapters` → ajouter `WITH CHECK (auth.uid() = user_id)` (les tables récentes `compass_*`/`memory_*` le font déjà).
- **`narramind_missing_assets` policy `FOR ALL` sans `WITH CHECK`** (migration 20260503100000:20) → INSERT cross-user non bloqué.
- **`chapter_canvases` sans contrainte `UNIQUE(chapter_id)`** alors que l'invariant « 1 canvas par chapitre » est supposé partout → risque de doublons « multiple rows ». ⚠️ touche la zone canvas → signaler avant fix.
- **FK fréquemment filtrées non indexées** (`assets.project_id`, `chapters.project_id`, `chapter_canvases.chapter_id`) *(recalibré high→medium)* → problème de **scalabilité** + coût des `ON DELETE CASCADE`. Migration additive `CREATE INDEX IF NOT EXISTS` sans risque.

**Produit / coûts**
- **Génération personnage = 2 appels FLUX.2 Pro / 1 crédit** *(recalibré high→medium)* — choix Sheet System assumé (la sheet réutilise la face). À **documenter** dans le mémoire (le coût FAL d'un personnage ≈ 2× un décor) plutôt qu'à « corriger ».
- **`generate-scenario-ai` & `compose-chapter-layout` ne consomment aucun crédit** — défendable (CLAUDE.md liste asset/sheet/bloc), mais scénario IA gratuit illimité = coût Gemini non maîtrisé. Décision à acter explicitement.
- **`checkout.session.completed` lit `line_items` non expandé** (`stripe-webhook` l.156) → toujours `""`, dépend silencieusement du fallback `metadata.plan`. Le commentaire « Price ID = source de vérité » est inopérant pour cet event (rattrapé par `subscription.updated`).

**Qualité / dette**
- **Dead code confirmé** (signalé depuis 3 audits) : `LoreFriseView.tsx` (419 L, timeline interdite par spec Univers) · slice **`ScenarioVersions`** complet (types+service+hooks, ~240 L, aucune UI) · **`SpeechBubbleEditor.tsx`** (1 543 L, jamais importé, thème sombre hardcodé hors tokens) · guard `maxProjects` (toujours `null`) · `filArianeLimit` + booléens feature-gate (`allowScenarioAI`/`allowFullExport`/`allowReferenceImages`) tous neutralisés.
- **Duplication optimistic-update** (~10 handlers quasi identiques) dans `ChapterDetail.tsx` → hook `useOptimisticPanelMutation` à comportement identique. ⚠️ zone canvas → signaler avant.
- **~40 casts `as unknown as Json`** à l'écriture (lecture typée mais écriture non vérifiée) → sérialiseurs symétriques dans `services/panels.ts`.
- **God components** : `LoreGraphView` (2 244 L, 74 hooks), `ScenarioChapterEditor` (1 766 L) → extraction de hooks (hors zone protégée, passer par QA).

**Performance**
- **18 familles Google Fonts** dans un `<link rel=stylesheet>` render-blocking (`index.html:15`) — Quicksand+Nunito suffisent au-dessus de la ligne de flottaison ; les 16 polices de bulles → chargement non bloquant/à la demande.
- **`ScenarioTextHighlighter`** : rendu O(N×longueur) non mémoïsé (`l.717,854-863`) → jank sur longs scénarios.
- **Export chapitre** : canvas unique pleine hauteur (jusqu'à 100 000px ≈ 320 Mo) + `Promise.all` de tous les panels → risque OOM/freeze. Rendu séquentiel + progression « panel X/N ».
- **Pas de `manualChunks`** : isoler `@xyflow/react`, `recharts`, `html2canvas`+`jszip`, `@radix-ui/*` (cache vendor stable).
- **`refreshSession()` absent** avant `invoke` dans `useArianeLoreProposals.ts` (l.338,781,866) → 401 silencieux sur session longue.
- **`narramind-compass`** : upsert embedding = DELETE+INSERT non transactionnel (l.154-162) → trou d'index RAG si l'INSERT échoue.

**UX / Design**
- **Em-dash `—` dans des chaînes UI visibles** (interdit anti-slop « zéro tolérance ») : toasts/titres/placeholders (`LoreGraphView:1349,2177`, `BlockToolbar:352`, `ScenarioSection:836`…). → remplacer + règle ESLint anti-régression.
- **Graphe Univers (ReactFlow) sans skeleton/Suspense** → zone vide pendant le mount sur l'écran le plus lourd.

**Tests** (couverture la plus faible, score 4,5/10)
- Aucun test sur : calcul de période de quota, `canGenerate` (`useAssetGeneration.ts:64-78`), synchro des **2 `TIER_CONFIG`**, mapping plan/price du webhook Stripe, `extractJsonObject`/`tryClosePanelsJson` (recalibré high→medium, scope `detect_blocks`/`narrative_directions`).
- `vitest.config.ts` : pas de `coverage`, pas d'alias `@fn-shared`, `include` limité à `src/**` → logique Edge Functions structurellement non testable.
- Priorité tests : (1) sync `TIER_CONFIG` — quick, protège un invariant non négociable ; (2) `computeUsagePeriodStart` ; (3) `canGenerate` ; (4) parsing JSON LLM ; (5) mapping Stripe.

---

## 5. ⚪ FAIBLES / INFO

- **`.env` commité** (commit `be021fd`) — anon key uniquement (publique par nature) + email admin → `git rm --cached .env`, garder `.env.example`.
- **Bucket Storage `dreamweave` public** + policy SELECT non scopée au propriétaire → assets accessibles par URL publique (choix d'archi à documenter, ou bucket privé + URLs signées).
- **Interpolation PostgREST non échappée** dans les fonctions admin (`encodeURIComponent` + whitelist `plan` manquants) — risque limité (guard admin).
- **Fallback service_role comme `apikey`** vers `/auth/v1/user` si `SUPABASE_ANON_KEY` absente (anti-pattern, non exploitable à distance).
- **Détails d'exception renvoyés au client** (FAL/Gemini/PostgREST bruts) → message générique + `request_id`.
- **OG/Twitter `= /favicon.svg`** + `twitter:card=summary` (`index.html:20-24`) → aperçus de partage cassés ; créer `og-image.png` 1200×630 + `summary_large_image` **avant Product Hunt**.
- **`sr-only "Close"`** en anglais (`dialog.tsx:49`, `sheet.tsx:62`) → « Fermer ».
- **`TestSection`** importé statiquement dans le bundle prod (gate client-side `kiritogeek@gmail.com`) → `React.lazy` ou `import.meta.env.DEV`.
- **`match_embeddings` sans `SET search_path`** (durcissement linter Supabase).
- **Index vectoriel ivfflat/hnsw absent** sur `project_embeddings` *(recalibré high→low)* — le filtre `project_id` (btree) limite déjà le scan à un projet (cardinalité faible) ; optimisation différée, pas un défaut actuel.
- **Migration `lore_world_sections`** ajoute 5 colonnes immédiatement droppées par la suivante (bruit migratoire, sans impact runtime).
- `<img>` sans `width/height` intrinsèques (`ImageWithFallback`) → CLS possible dans les grilles.
- Animations sur `width`/`transition-all` (41 occurrences) contre la règle « transform + opacity uniquement ».

---

## 6. Scores par dimension

| Dimension | Score | Synthèse |
|---|:---:|---|
| Sécurité | **7/10** | RLS solide, webhook Stripe signé, plan immuable côté client — **mais 2 IDOR critiques** en service role |
| Architecture / Qualité | **6,5/10** | Couches respectées, erreurs aux frontières matures — dette dead code + god components |
| Performance | **6/10** | React Query bien tuné — ReactFlow non splitté, 18 fonts bloquantes, export non virtualisé |
| Produit / Tiers | **6,5/10** | Quotas 20/100/250 alignés, Stripe cohérent — différenciateurs Studio fantômes + période divergente |
| Base de données | **6,5/10** | RLS 100 % tables, CASCADE corrects — index FK manquants, `WITH CHECK` partiels, invariant canvas non contraint |
| UX / Design | **6,5/10** | Tokens/glassmorphisme/FR solides — em-dash récurrent, graphe sans skeleton |
| IA / Edge Functions | **6/10** | Timeouts/fallbacks robustes — IDOR + comptage crédits incohérent + EF hors tsc |
| Tests / CI | **4,5/10** | CI complète — couverture ~0 % sur la logique métier risquée |

---

## 7. Plan d'action priorisé

**P0 — avant tout lancement public**
1. 🔴 Fix IDOR `generate-scenario-ai` (C1) — ownership check.
2. 🔴 Fix IDOR `compose-chapter-layout` (C2) — ownership check + filtres défensifs.
3. 🟠 Trancher H1 (différenciateurs Studio) : aligner `Plans.tsx`/CLAUDE.md/mémoire OU implémenter.
4. 🟠 Fix H2 (fenêtre de quota) — `_shared/computeUsagePeriodStart`.
5. ⚪ OG/Twitter meta tags (`og-image.png` 1200×630).
6. `npm audit fix` (ws + react-router).

**P1 — qualité / robustesse**
7. 🟠 Lazy-load `UniverseSection` (H3) + `manualChunks`.
8. 🟡 Race condition quota (réservation `usage` avant FAL).
9. 🟡 `WITH CHECK` sur les policies UPDATE + `narramind_missing_assets`.
10. 🟡 Index FK (`assets`/`chapters`/`chapter_canvases`).
11. 🟡 Tests invariants : sync `TIER_CONFIG`, `computeUsagePeriodStart`, `canGenerate`.
12. 🟡 `refreshSession()` dans `useArianeLoreProposals`.

**P2 — dette / polish**
13. Supprimer dead code (`LoreFriseView`, `ScenarioVersions`, `SpeechBubbleEditor`, guards morts).
14. Em-dash UI + règle ESLint.
15. 18 fonts → chargement différé ; export chapitre séquentiel + progression.
16. `vitest.config` coverage + alias `@fn-shared` ; extraire god components (via QA).

---

## 8. 📝 Impact Mémoire de fin d'études

> **Ce qui change :** l'audit identifie (a) 2 failles de sécurité critiques (IDOR cross-tenant) dans 2 Edge Functions, (b) deux différenciateurs Studio annoncés mais non implémentés, (c) une asymétrie de coût FAL (personnage = 2 générations / 1 crédit) et une divergence de fenêtre de quota.
> **Sections concernées :** Architecture technique (sécurité Edge Functions / RLS) · Modèle économique (différenciation des plans, définition du « crédit »).
> **Proposition d'intégration dans `Produit/Memoire_DreamWeave.md` :**
> - *Sécurité* : « La sécurité multi-tenant repose sur la RLS Postgres (`auth.uid() = user_id`) ; les Edge Functions opérant en service role doivent répliquer ce contrôle d'appartenance explicitement. Un audit du 27/06/2026 a révélé puis corrigé deux IDOR (`generate-scenario-ai`, `compose-chapter-layout`) où ce contrôle manquait. »
> - *Modèle économique* : clarifier que la différenciation des plans est **uniquement volumétrique** (20/100/250 crédits) — supprimer la mention « mémoire longue » / « priorité FAL » tant qu'elles ne sont pas implémentées — et documenter qu'une génération de personnage = 2 appels FLUX.2 Pro (face + sheet 4 angles) pour 1 crédit.

---

## 9. Méthodologie

Audit multi-agents (20 sous-agents Opus 4.8, ~1,19 M tokens, 333 appels d'outils, 7 min) : 8 auditeurs spécialisés lisant le code réel (preuves `fichier:ligne`), puis vérification adversariale indépendante des 12 findings critiques/élevés (relecture du code, verdict confirmed/partial/refuted + recalibration de sévérité). Les severités de ce rapport reflètent les **sévérités corrigées** après vérification. Les 2 IDOR critiques ont été re-confirmés manuellement par grep.
