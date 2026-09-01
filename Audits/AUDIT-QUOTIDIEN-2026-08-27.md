# 🔍 Audit Quotidien DreamWeave — 2026-08-27

*Audit automatisé complet. Branche courante · commit `b4095a4` (2026-08-24, 23:07) · read-only. Sources benchmark : juillet–août 2026 uniquement (< 30 jours), sauf mention contraire signalée. Exécuté sans supervision (tâche planifiée) — aucune modification de code effectuée.*

**Point de départ notable :** `git log b4095a4..HEAD -- src/ supabase/` est **vide** — c'est le **quatrième cycle consécutif** (08-23, 08-25, et aujourd'hui) sans le moindre commit touchant le code applicatif. `npx tsc --noEmit --project tsconfig.app.json` a été ré-exécuté directement pour ce cycle plutôt que supposé inchangé : **110 erreurs, comptage et répartition par fichier identiques à l'octet près** (`LoreGraphView.tsx` 24, `ChapterDetail.tsx` 19, `panels.ts` 7, `useArianeLoreProposals.ts` 7, `useDragBlock.ts` 6, `narramindMissingAssetsService.ts` 3). Le code cassé `setDragPreview` dans `ChapterDetail.tsx` reste présent (13 occurrences confirmées ce cycle). Sauf mention contraire, les constats des sections 2 à 4 sont donc identiques ligne à ligne aux deux cycles précédents — seule la section 1 (benchmark, sensible au temps) apporte une actualité neuve.

---

## 1. 🔍 Benchmark & Competitive Intelligence

**Financement adjacent au secteur — Stability AI lève 76 M$ en Série B.** Tour mené avec Universal Music Group, Sony Music Group, Warner Music Group, EA, AMD Ventures et Pacific Alliance Ventures, portant le financement total à 232 M$. Pas un concurrent direct sur la création de webtoon, mais un signal sur l'infrastructure de génération d'image (même segment que FAL.ai/FLUX utilisé par DreamWeave) — les fonds sont annoncés pour la « production créative ».
Source : [TechCrunch, 2026-08-25](https://techcrunch.com/2026/08/25/stability-ai-maker-of-image-generator-stable-diffusion-raises-76-million-in-fresh-funding/)

**Couverture datée quasi inexistante sur les concurrents directs ce cycle.** Recherches ciblées (Komiko, Anifusion, ComicsMaker, LlamaGen, MangaMaker, ComicPad, Tooning, Elser AI, OctoComics) : aucun lancement, mise à jour produit ou levée de fonds daté et vérifiable dans la fenêtre du 28 juillet au 27 août 2026. Le paysage reste dominé par du contenu SEO/affilié non daté, écarté conformément à la règle des 30 jours plutôt que présenté comme actualité fraîche.

**Une rumeur de fermeture Dashtoon Studio circule mais reste non confirmée par une source datée pour ce cycle précis** (le cycle du 08-25 citait la page produit officielle comme preuve d'un arrêt au 15/08 ; non re-vérifiée aujourd'hui, budget de recherche concentré sur la fenêtre stricte). À traiter comme acquis du cycle précédent plutôt que reconfirmé ce jour.

**Sentiment communautaire :** comme aux trois cycles précédents (08-13, 08-23, 08-25), aucun fil Reddit/Product Hunt/X daté et vérifiable ce mois-ci sur un outil webtoon/manga IA nommé. Limite de recherche identique et persistante — à noter comme angle mort structurel de ce protocole d'audit plutôt qu'un signal produit en soi.

**Conclusion benchmark :** rien de nouveau ce cycle ne menace directement le créneau de DreamWeave (production solo assistée, cohérence de style, sans compétence d'illustration). Le seul mouvement daté concerne l'infrastructure de génération d'image en amont (Stability AI), pas la couche application. À surveiller au prochain cycle : confirmation indépendante de la fermeture Dashtoon Studio, tout lancement Komiko/Anifusion/Jenova avec des chiffres vérifiables.

---

## 2. 🛠️ Technical Audit

| Axe | Score /10 | Justification |
|---|---|---|
| **Qualité du code** | **4** *(stable depuis 08-23)* | `tsc --noEmit` confirme à nouveau **110 erreurs sur 31 fichiers**, ré-exécuté et vérifié pour ce cycle (pas supposé). `LoreGraphView.tsx` (24 erreurs — mismatches de types génériques React Flow) et `ChapterDetail.tsx` (19 erreurs) concentrent 39 % du total à eux deux. `panels.ts` (7 erreurs `TS2352`, casts `Json → PanelLayout/ColorBlock/SpeechBubble` explicitement qualifiés de « probablement erronés » par le compilateur) reste non traité. |
| **Architecture** | **6** | Couches `types → integrations → services → hooks → components → pages` toujours respectées à l'échelle du repo. Les deux fichiers concentrant le plus d'erreurs TS sont aussi les deux plus gros fichiers du repo (`ChapterDetail.tsx` 3174 lignes, `LoreGraphView.tsx` 2196 lignes) — corrélation taille/dette qui n'est pas un hasard architectural. |
| **Performance & scalabilité** | **6** | Pas de nouvelle mesure runtime ce cycle (audit lecture seule). Risque déjà identifié à deux reprises et toujours non mitigé : `chapter_canvases` autorise jusqu'à 100 000 px de hauteur sans virtualisation visible dans `ImageBlockLayer`/`ColorBlockLayer`/`BubbleLayer`. |
| **Sécurité** | **5** *(stable depuis 08-25)* | Les **trois mécanismes de détection admin** identifiés le 08-25 sont reconfirmés ce cycle, et un troisième point d'usage a été localisé : `ARIANE_ONBOARDING_ADMIN_EMAIL` (`src/constants/ariane.ts:5`), `ADMIN_EMAIL` codé en dur et dupliqué dans **trois** Edge Functions (`admin-get-kpis/index.ts:8`, `admin-set-plan/index.ts:9`, `admin-user-action/index.ts:8` — une de plus que la paire citée le 08-25), et `VITE_ADMIN_EMAIL` (`Plans.tsx:127-128`). Toujours trois sources de vérité distinctes pour « est-ce un admin ». `verify_jwt = false` au niveau gateway pour les 14 fonctions, chaque fonction revérifiant manuellement — inchangé. |
| **Dette technique** | **3** *(stable depuis 08-25)* | **Quatrième cycle consécutif sans mouvement sur la régression TypeScript.** Le code cassé `setDragPreview` (`ChapterDetail.tsx`, 13 occurrences confirmées ce cycle, `TS2304: Cannot find name`) reste dans la zone protégée du canvas éditeur, en attente d'arbitrage de Louis. Les null-deref sur `canvasRefByPanel.current` (`useDragBlock.ts`, `useResizeBlock.ts`, `useKeyboardShortcuts.ts`) restent des erreurs de compilation actives (`TS18047`), pas de simples risques de style. |

**Moyenne technique ≈ 4,8/10, stable depuis le 08-25.** Le point le plus urgent reste inchangé pour la quatrième fois : **le build ne compile toujours pas (110 erreurs, 0 correction en au moins 5 jours** depuis le dernier commit touchant `src/`/`supabase/`, `e9a57a7` du 2026-08-22**)**.

---

## 3. 📦 Product Audit

Positionnement « tout gratuit, différenciation par crédits uniquement » toujours confirmé dans le code : `TIER_CONFIG` (`src/types/index.ts:25-62`) fixe `allowReferenceImages`, `allowScenarioAI` et `allowFullExport` à `true` sur les trois plans ; seul `maxGenerationsPerMonth` (20/100/250) varie réellement. `allowLongMemory` reste différencié dans le type (`false/false/true`) mais **confirmé mort pour la quatrième fois consécutive** — lu uniquement par `test/tierConfigSync.test.ts:17-18`.

**Scaffolding de tier-gating mort, inchangé** : badge « PRO » et paywall dans `EditorLeftSidebar.tsx:189-224` (tracé jusqu'à `canUseCases = TIER_CONFIG[plan].allowScenarioAI`, toujours vrai) ; `canUseReferenceImages` dans `StyleManager.tsx` ; cap `filArianeLimit` dans `ArianeContinuityPanel.tsx`, alimenté par une valeur toujours `null`. Branches JSX mortes sans risque fonctionnel immédiat, mais piège pour un futur contributeur.

**Menu Univers — écart roadmap toujours ouvert, quatrième cycle consécutif.** Chaîne vérifiée à nouveau : `ProjectDetail.tsx` lazy-charge et rend réellement `UniverseSection` → `LoreGraphView.tsx` (2196 lignes) → `LoreNodeSheet.tsx` (806 lignes) → `LoreUniversProposalsSheet.tsx` (512 lignes) + `CompassSuggestionsPanel.tsx` (135 lignes), soit ~3649 lignes navigables et non mortes — contredisant toujours la roadmap CLAUDE.md qui marque « Univers v1 🔴 » comme non démarré.

> 📝 **Note pour le Mémoire** (`Produit/Memoire_DreamWeave.md`) : ce constat revient pour la **quatrième fois consécutive** (08-13, 08-23, 08-25, 08-27) sans arbitrage. Recommandation inchangée : trancher avant rédaction de la section Fonctionnalités.

---

## 4. 🎨 UX / UI Audit

Navigation cohérente, routes protégées sans route orpheline observée. `useAssetGeneration.ts` bloque toujours proprement la génération sans style défini (toast clair). `QuotaReachedDialog.tsx:41` reste **sans `.glass`** (`<DialogContent className="max-w-sm text-center">`, contre `.glass` sur la quasi-totalité des ~40 autres `DialogContent` de l'app) — un des seuls écrans non stylés selon le design system est précisément le moment de friction monétisation le plus sensible du parcours Libre, deux cycles sans correction.

**Violation « zéro em-dash » toujours structurelle.** Le cycle 08-25 avait recensé ~40 occurrences réelles en copy utilisateur (hors placeholders admin, commentaires, tests), concentrées dans `src/lib/arianeTabTourSteps.ts` (7 occurrences — le tour d'onboarding, vu par tout nouvel utilisateur) et dans des messages d'erreur/toast. Code inchangé ce cycle ⇒ constat identique. Un balayage brut (moins filtré, incluant commentaires et tests) confirme la persistance du pattern à grande échelle. Confirmation que le problème est structurel : aucun garde-fou automatisé n'a jamais bloqué ces occurrences.

Hex codés en dur : toujours présents dans la zone canvas gelée (probablement du contenu utilisateur, pas une violation) mais aussi dans `pages/Landing.tsx` et `pages/Auth.tsx` — surfaces marketing/auth où les tokens du design system devraient s'appliquer, point non tranché depuis le 08-25.

**Comparaison marché :** rien de neuf ce cycle sur le feedback UX concurrent (section 1 pauvre en couverture datée).

---

## 5. 💡 Improvement Suggestions

### 🗑️ Removals
- **Supprimer le scaffolding de tier-gating mort** (`EditorLeftSidebar.tsx:189-224`, `StyleManager.tsx`, `ArianeContinuityPanel.tsx`) — inchangé depuis trois cycles.
- **Trancher `allowLongMemory`** — mort confirmé pour la quatrième fois. Soit le retirer de `TIER_CONFIG`, soit documenter « réservé, non livré » pour couper court à la question à chaque cycle.
- **Unifier les trois mécanismes de détection admin** (`ARIANE_ONBOARDING_ADMIN_EMAIL`, `ADMIN_EMAIL` dupliqué dans **trois** Edge Functions, `VITE_ADMIN_EMAIL`) en une source unique (rôle/claim plutôt que comparaison d'email en dur).

### ⚡ Optimizations
- **P0 — Toujours en attente : résoudre la régression TypeScript** (110 erreurs, 0 mouvement depuis au moins 5 jours). Le point de blocage principal (`setDragPreview` non déclaré, zone protégée du canvas) nécessite l'accord explicite de Louis — cf. section 6.
- **Mettre en place un lint/CI anti-em-dash** — une correction manuelle ne tiendra pas face à un problème structurel de cette ampleur. Prioriser `arianeTabTourSteps.ts` (onboarding) si un premier passage manuel est fait en attendant.
- **Ajouter `.glass` à `QuotaReachedDialog.tsx`** — correction d'une ligne, trois cycles sans correction, sur l'écran de friction monétisation le plus visible du plan Libre.
- **Synchroniser les types Supabase générés** (`narramind_missing_assets`, cause encore 3 erreurs TS actives dans `narramindMissingAssetsService.ts`).

### ➕ Additions
- **Réconcilier la roadmap sur le statut réel du menu Univers** — quatrième cycle consécutif sans arbitrage (~3649 lignes substantiellement livrées vs roadmap « non démarré »).
- **Documenter une politique de disclosure IA** dans l'export final — argument de confiance différenciant, cohérent avec la sensibilité du marché à la non-déclaration d'usage IA notée aux cycles précédents.

---

## 6. 🚀 Launch Status

**Contexte :** exécution locale et/ou Vercel, pas encore annoncé publiquement.

**Bloquant technique majeur — inchangé depuis le 08-23, toujours aucune action prise :**
- **Le projet ne compile toujours pas proprement : 110 erreurs TypeScript, 0 correction depuis au moins 5 jours** (dernier commit touchant `src/`/`supabase/` : `e9a57a7`, 2026-08-22 — reconfirmé ce cycle via `git log`).
- **Code cassé dans la zone protégée du canvas éditeur** : `ChapterDetail.tsx` appelle `setDragPreview` sans déclaration `useState` correspondante (13 occurrences). Conformément à la règle « Zone protégée — Canvas Éditeur » du CLAUDE.md, ceci reste à signaler explicitement à Louis avant toute correction : (1) **impact** — échec silencieux ou erreur runtime probable lors du drag d'un bloc image/couleur ; (2) **conséquence** — régression potentielle sur la composition de case, fonctionnalité cœur ; (3) **alternative** — déclarer le state setter manquant est le correctif le plus direct, mais nécessite l'accord explicite de Louis dans le message courant avant tout edit dans cette zone. **Quatrième signalement, toujours en attente d'arbitrage.**

**Autres points de vigilance (non bloquants) :** triple mécanisme de détection admin (désormais trois Edge Functions concernées, pas deux) ; violation « zéro em-dash » sur ~40 occurrences réelles incluant l'onboarding ; `QuotaReachedDialog.tsx` non stylé `.glass` ; types Supabase désynchronisés.

**Checklist de lancement priorisée :**

1. **P0** — Diagnostiquer et corriger la régression TypeScript (110 erreurs). Commencer par `LoreGraphView.tsx` et `ChapterDetail.tsx` (43 erreurs à eux deux).
2. **P0** — Signaler à Louis le code cassé `setDragPreview` dans la zone protégée avant toute correction — quatrième signalement, en attente d'arbitrage.
3. **P1** — Clarifier les trois mécanismes de détection admin (intentionnel ou dérive) et unifier si dérive confirmée.
4. **P1** — Régénérer/synchroniser les types Supabase (`narramind_missing_assets`).
5. **P1** — Mettre en place un garde-fou automatisé anti-em-dash.
6. **P1** — Ajouter `.glass` à `QuotaReachedDialog.tsx`.
7. **P2** — Supprimer le scaffolding tier-gating mort.
8. **P2** — Trancher `allowLongMemory`.
9. **P2** — Réconcilier la roadmap sur le statut réel du menu Univers.

**Quatrième cycle consécutif avec un bloquant dur non résolu : le build ne passe toujours pas proprement, et rien n'a bougé en au moins 5 jours.** À traiter avant toute autre priorité, y compris marketing.

---

## 7. 📣 Marketing Plan

Aucune présence publique nouvelle identifiée depuis le 08-25 (pas de compte social, pas de landing page d'acquisition séparée, pas de waitlist visible dans le repo). Plan inchangé.

| Tâche | Priorité | Effort |
|---|---|---|
| Créer le compte Instagram DreamWeave (visuel-first) | Haute | Rapide |
| Créer un compte X/Twitter pour suivre la conversation créateurs webtoon/IA | Haute | Rapide |
| Écrire une landing page d'acquisition dédiée (séparée de l'app) | Haute | Moyen |
| Lancer une waitlist avec incitatif (crédits bonus au lancement) | Haute | Rapide |
| Engager 5-10 créateurs webtoon amateurs (Reddit, Discords manga/webtoon) pour accès anticipé | Haute | Moyen |
| Produire une vidéo teaser concept (pipeline Style → Assets → Scénario → Édition) | Moyenne | Moyen |
| Rédiger 2-3 posts sur la différenciation « tout gratuit, volume de crédits uniquement » | Moyenne | Rapide |
| Préparer un post de lancement Product Hunt | Moyenne | Moyen |
| Documenter un cas d'usage complet (« de zéro à un chapitre publié ») | Basse | Long |
| Surveiller mensuellement l'actualité concurrentielle (WEBTOON, Komiko, Anifusion, Jenova, infra type Stability AI) | Basse | Rapide (récurrent) |

**Recommandation de séquencement inchangée :** ne pas accélérer sur le marketing avant la résolution du bloquant technique P0 — un lancement de waitlist/teaser sur un build qui ne compile pas proprement depuis au moins 5 jours serait prématuré.

---

## TL;DR

- **🔴 Quatrième cycle consécutif sans le moindre changement de code applicatif** (seuls des commits mémoire/soutenance depuis le 08-22) — **le build ne compile toujours pas (110 erreurs TypeScript, réexécuté et reconfirmé ce jour)**, avec le code cassé `setDragPreview` toujours présent dans la zone protégée du canvas éditeur, en attente d'arbitrage de Louis.
- **Score technique moyen ≈4,8/10, stable depuis le 08-25.**
- **Sécurité : le triple mécanisme de détection admin s'étend à une troisième Edge Function** (`admin-user-action`, en plus de `admin-get-kpis` et `admin-set-plan`) — toujours à clarifier avec Louis.
- **Violation « zéro em-dash » toujours structurelle (~40 occurrences réelles confirmées au 08-25, inchangées)**, concentrée notamment dans le tour d'onboarding — un lint automatisé reste la seule solution durable.
- **Écart roadmap/code sur le menu Univers non tranché pour la quatrième fois consécutive** (~3649 lignes substantiellement livrées, roadmap marquant « non démarré ») — pertinent pour le Mémoire de fin d'études.
- **Benchmark calme ce cycle** : seul mouvement daté est une levée de fonds Stability AI (infrastructure amont, pas un concurrent direct) — aucune pression de marché nouvelle ne justifie de sauter l'étape P0 (build cassé) pour accélérer le marketing.

---

*Rapport généré automatiquement par la tâche planifiée `dreamweave-daily-audit`. Aucune action d'écriture effectuée (lecture seule). Mise à jour du wiki Obsidian non effectuée cette session (dossier vault non accessible depuis cet environnement) — à reporter à une session sur la machine principale de Louis si les décisions de ce cycle doivent y être consignées. Prochain cycle : vérifier si la régression TypeScript a enfin été traitée (5 cycles sans mouvement si rien ne bouge d'ici le prochain audit), et si le triple mécanisme admin a été clarifié.*
