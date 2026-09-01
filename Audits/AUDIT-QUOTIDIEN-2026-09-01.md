# Audit Quotidien DreamWeave — 2026-09-01

*Cycle automatisé. Comparaison avec le cycle précédent : `Audits/AUDIT-QUOTIDIEN-2026-08-27.md` (2026-08-27).*

---

## 1. 🔍 Benchmark & Competitive Intelligence

Fenêtre stricte appliquée : sources datées entre le 2 août et le 1er septembre 2026 uniquement. Beaucoup de résultats de recherche étaient des contenus SEO non datés ou des actualités hors fenêtre — écartés.

### A. Lancements / fonctionnalités concurrentes
Aucun lancement de fonctionnalité daté dans la fenêtre n'a pu être confirmé chez un concurrent direct (les annonces WEBTOON « byUs »/Genies sont réelles mais datent de début juillet ou avant — hors fenêtre, écartées). **Catégorie pauvre ce cycle.**

### B. Mouvements business / financement
- **[Dashtoon Studio a fermé](https://dashtoon.com/create)** — confirmé en ligne, fermeture au **15 août 2026**. Dashtoon (lié Peak XV, 13M$ levés en Series A), l'un des concurrents directs les mieux financés sur la création de comics/manhwa par IA, a fermé son produit de création et redirige ses utilisateurs vers **Frameo.ai**, le nouvel outil vidéo IA de sa maison mère renommée Dashverse Corp ([source](https://dashverse.ai/)). Signal : un concurrent direct bien financé sort entièrement du marché « prompt-to-comic » pour pivoter vers la vidéo IA — à surveiller comme indicateur (positif : moins de concurrence directe ; négatif : le modèle économique « générateur de comics IA » autonome pourrait être difficile à viabiliser).
- **[Webtoon's Growth Is Slowing As Its Ambitions Are Growing — Forbes](https://www.forbes.com/sites/robsalkowitz/2026/08/11/webtoons-growth-is-slowing-but-its-ambitions-are-growing/)** — **11 août 2026**. WEBTOON Entertainment (plateforme de distribution dominante, pas un concurrent direct mais le débouché principal des créateurs DreamWeave) affiche une croissance T3 quasi plate (MAU +0,5 % à 156M) et mise explicitement sur l'outillage IA + IP propriétaire (Marvel, Paramount) pour relancer la croissance. Signal de maturité de marché à noter, sans lien direct pricing/feature.

### C. Sentiment communautaire
**Aucun post Reddit, Product Hunt, X/Twitter daté dans la fenêtre n'a pu être localisé.** Les caractérisations habituelles (« continuité IA faible, visages statiques, lettrage IA imparfait ») ne proviennent que d'agrégateurs non datés ou d'incidents hors fenêtre (WIT Studio avril 2026, post Boichi décembre 2025, concours webtoon IA Icheon 11 juillet 2026) — écartés. **Silence qui ne doit pas être interprété comme absence de sentiment réel : à re-creuser dans quelques semaines.**

**Conclusion benchmark :** le seul signal daté solide ce mois-ci est la fermeture de Dashtoon (15/08) combinée au ralentissement WEBTOON (11/08) — aucune pression concurrentielle nouvelle ne justifie d'accélérer le marketing avant de traiter le blocant technique P0 (section 6).

---

## 2. 🛠️ Technical Audit

| Axe | Score /10 | Justification |
|---|---|---|
| Qualité de code | 5/10 | `npx eslint . --max-warnings 0` passe sans erreur (bon signal). Mais le linter ne fait pas de type-checking : le fichier `ChapterDetail.tsx` contient un bug réel non détecté par ESLint (`setDragPreview` appelé 13 fois, jamais déclaré — `TS2304: Cannot find name`). Scaffolding mort maintenu (`canUseCases`, `canUseReferenceImages` dans `EditorLeftSidebar.tsx`/`StyleManager.tsx`, toujours `true` en dur). |
| Architecture globale | 6,5/10 | Séparation claire `types → integrations → services → hooks → components → pages` respectée. 14 Edge Functions bien délimitées par responsabilité. Mais 3 mécanismes de détection admin distincts (`ADMIN_EMAIL` dupliqué en dur dans 3 Edge Functions + `ARIANE_ONBOARDING_ADMIN_EMAIL` côté client + `VITE_ADMIN_EMAIL` en variable d'env) — dérive architecturale non arbitrée depuis au moins 5 cycles. |
| Performance & scalabilité | 6/10 (non ré-audité en profondeur ce cycle) | Lazy-loading des pages en place (`App.tsx`), React Query pour le cache serveur. Point de vigilance structurel : `LoreGraphView.tsx` (2196 lignes) est un composant volumineux, risque de re-render coûteux sur le graph Univers à mesure que le contenu grandit — à confirmer par le Performance Auditor plutôt qu'estimé ici. |
| Sécurité | 6/10 | RLS `auth.uid() = user_id` en place sur toutes les tables (non contournée), aucune fuite de `SERVICE_ROLE` côté client confirmée (`grep` src/ → 0 résultat). Mais l'autorisation admin repose sur une **comparaison d'email en dur** (`admin-set-plan/index.ts:9,38` : `if (userData?.email !== ADMIN_EMAIL) return json({ error: "Accès refusé" }, 403, ...)`) plutôt qu'un rôle/claim — fragile (rotation d'email = perte d'accès admin, aucune séparation des privilèges), dupliqué 3 fois avec risque de désynchronisation. |
| Dette technique | 3/10 | **Nouveau constat critique ce cycle** (voir section 6) : le job CI `Typecheck: npx tsc --noEmit` ne vérifie en réalité **aucun fichier** — `tsconfig.json` racine est un tsconfig « solution » (`"files": []` + `references`), et `tsc --noEmit` sans `--build` ni `-p` ignore les projets référencés. Résultat : la CI est verte depuis le début alors que **110 erreurs réelles** existent (confirmées via `npx tsc --noEmit -p tsconfig.app.json`), inchangées au chiffre près depuis le 08-27 (10 jours, 0 commit sur `src/`/`supabase/` depuis `e9a57a7` le 22/08). C'est la cause racine probable de la persistance du bug sur 5+ cycles : rien ne bloque jamais réellement le merge. |

**Score technique moyen : 5,3/10** (vs ≈4,8/10 au 08-25/08-27 — légère hausse portée par la découverte que le lint est propre, contrebalancée par le nouveau constat sur la CI cassée).

---

## 3. 📦 Product Audit

Le positionnement « tout gratuit, différenciation par volume de crédits uniquement » est confirmé dans le code : `TIER_CONFIG` (`src/types/index.ts:25-62`) fixe toutes les features à `true` sur les trois plans, seul `maxGenerationsPerMonth` (20/100/250) varie.

- **`allowLongMemory` (persiste, non tranché)** — toujours `false/false/true`, consommé uniquement par un test de cohérence interne (`tierConfigSync.test.ts`), jamais fonctionnellement. Élément nouveau : `Produit/04_User_Stories_Parcours.md:352` documente déjà en interne que la mémoire longue est repassée en Backlog — la doc produit interne est à jour, seuls le champ de code (non retiré) et `CLAUDE.md` (mention encore présente) ne suivent pas.
- **Scaffolding de tier-gating mort — inchangé** depuis au moins 4 cycles (`EditorLeftSidebar.tsx:189-220`, `StyleManager.tsx:59,479,491,580`).
- **Menu Univers — écart roadmap toujours ouvert, empreinte réelle réévaluée à la hausse.** `LoreGraphView` + `LoreNodeSheet` + `LoreUniversProposalsSheet` + `CompassSuggestionsPanel` = 3649 lignes (identique au 08-27) ; en élargissant aux hooks/services associés (`useArianeLoreProposals.ts` 1105 lignes, `useLoreNodes.ts`, `useLoreEdges.ts`, `services/loreNodes.ts`), l'empreinte réelle grimpe à **4834 lignes**, non morte. `CLAUDE.md` marque toujours « Univers v1 🔴 » non démarré, alors que `Produit/NarraMind-Compass.md:43` documente correctement en interne que l'implémentation respecte les deux piliers stricts (cartographie + amélioration continue Ariane) sans dérive vers une timeline. **L'écart de documentation est donc plus visible que jamais : doc produit interne correcte vs roadmap officielle obsolète dans `CLAUDE.md`.**
- Pas de fonctionnalité réellement redondante identifiée ce cycle ; `TestSection.tsx` (672 lignes) est un panneau de debug admin correctement isolé du bundle utilisateur normal, à surveiller uniquement pour non-fuite en prod.

---

## 4. 🎨 UX / UI Audit

- **`QuotaReachedDialog.tsx` — persiste, non stylé `.glass`.** Cinquième cycle sans correction sur l'écran de friction monétisation le plus visible du plan Libre (`className="max-w-sm text-center"`, ligne 41).
- **Triple mécanisme admin — persiste à l'identique**, désormais confirmé sur 3 Edge Functions (`admin-get-kpis`, `admin-set-plan`, `admin-user-action`) + 1 constante client (`src/constants/ariane.ts:5`, consommée dans `DashboardLayout.tsx`, `Dashboard.tsx`, `Pilotage.tsx`, `ProjectDetail.tsx`) + 1 variable d'env (`VITE_ADMIN_EMAIL` dans `Plans.tsx:127-128`).
- **Em-dash — persiste, comptage affiné à la hausse.** 421 occurrences brutes de « — » dans `src/**/*.{ts,tsx}` ; après filtrage (hors tests, commentaires, placeholders de tableaux admin), **~51 occurrences en copy utilisateur réelle** (vs ~40 estimées au 08-27 — écart probablement méthodologique, pas une régression, aucun commit `src/` n'étant intervenu). Concentration confirmée dans `src/lib/arianeTabTourSteps.ts` (onboarding) et des composants Ariane (`ArianeContinuityPanel.tsx`, `ArianeOnboardingCard.tsx`). Toujours aucun garde-fou lint/CI.
- Parcours Style → Assets → Univers → Scénario → Édition reste cohérent dans `ProjectDetail.tsx`, aucune régression de navigation observée ce cycle.
- **Comparaison benchmark (section 1) :** aucun concurrent n'a livré de nouveauté UX datée ce mois-ci à comparer — pas de risque de retard relatif identifié sur cette fenêtre.

---

## 5. 💡 Improvement Suggestions

### 🗑️ Removals
- **Supprimer le scaffolding de tier-gating mort** (`EditorLeftSidebar.tsx:189-220`, `StyleManager.tsx`) — inchangé depuis quatre cycles.
- **Trancher `allowLongMemory`** — la doc produit interne (`Produit/04_User_Stories_Parcours.md:352`) a déjà acté l'abandon fonctionnel ; il ne reste qu'à retirer le champ de `TIER_CONFIG`/`types/index.ts` et la mention dans `CLAUDE.md` pour que le code suive la décision déjà prise.
- **Unifier les trois mécanismes de détection admin** en une source unique (rôle/claim Supabase plutôt que comparaison d'email en dur, dupliquée dans 3 Edge Functions + 1 constante client + 1 var d'env).

### ⚡ Optimizations
- **P0 — Corriger la CI : le job "Typecheck" ne vérifie rien.** `npx tsc --noEmit` sur le `tsconfig.json` racine (`"files": []` + `references`) ne compile aucun fichier en mode non-`--build`. Remplacer par `npx tsc --noEmit -p tsconfig.app.json` (ou `tsc --build`) dans `.github/workflows/ci.yml`. **Sans ce correctif, aucun futur correctif TypeScript ne sera jamais réellement vérifié par la CI — c'est probablement la cause racine de la persistance du bug P0 ci-dessous sur 5+ cycles.**
- **P0 — Toujours en attente : 110 erreurs TypeScript réelles**, inchangées au chiffre près depuis 10 jours (dernier commit `src/`/`supabase/` : `e9a57a7`, 22/08). Concentration : `LoreGraphView.tsx` (24), `ChapterDetail.tsx` (19, dont le bug `setDragPreview`), `panels.ts` (7), `useArianeLoreProposals.ts` (7), `useDragBlock.ts` (6).
- **Mettre en place un lint/CI anti-em-dash** — comptage affiné à ~51 occurrences réelles ; prioriser `arianeTabTourSteps.ts` (onboarding, le point de contact le plus visible pour un nouvel utilisateur).
- **Ajouter `.glass` à `QuotaReachedDialog.tsx`** — correctif d'une ligne, cinquième cycle sans action.

### ➕ Additions
- **Réconcilier `CLAUDE.md` sur le statut réel du menu Univers** — la documentation produit interne (`Produit/NarraMind-Compass.md`) est déjà correcte ; seul le roadmap tracker de `CLAUDE.md` reste faux (« non démarré » pour ~4834 lignes livrées conformes aux deux piliers). Pertinent pour le Mémoire de fin d'études (positionnement produit réel vs déclaré).
- **Documenter une politique de disclosure IA** dans l'export final — argument de confiance différenciant dans un marché où un concurrent bien financé (Dashtoon) vient de fermer son produit de création IA, ce qui pourrait nourrir une inquiétude créateurs sur la pérennité des outils IA.

---

## 6. 🚀 Launch Status

**Contexte :** exécution locale et/ou Vercel, pas encore annoncé publiquement.

**Bloquant technique majeur — inchangé depuis le 08-22, aggravé par une découverte ce cycle :**
- Le projet ne compile toujours pas proprement : **110 erreurs TypeScript, 0 correction depuis au moins 10 jours** (dernier commit touchant `src/`/`supabase/` : `e9a57a7`, 2026-08-22).
- **Découverte de ce cycle : la CI ne peut techniquement pas détecter ce problème.** Le job `Typecheck` de `.github/workflows/ci.yml` exécute `npx tsc --noEmit` contre le `tsconfig.json` racine, qui est un tsconfig « solution » vide (`"files": []`) délégant à des projets référencés (`tsconfig.app.json`, `tsconfig.node.json`) — non résolus sans `--build`. La commande retourne donc systématiquement 0 erreur, quel que soit l'état réel du code. **La CI est verte par construction, pas parce que le code est sain.**
- **Code cassé dans la zone protégée du canvas éditeur** : `ChapterDetail.tsx` appelle `setDragPreview` sans déclaration correspondante (13 occurrences, confirmé par TS2304 dans `tsconfig.app.json`). Conformément à la règle « Zone protégée — Canvas Éditeur » du CLAUDE.md, ceci reste à signaler explicitement à Louis avant toute correction : (1) **impact** — échec silencieux ou erreur runtime probable lors du drag d'un bloc image/couleur ; (2) **conséquence** — régression potentielle sur la composition de case, fonctionnalité cœur ; (3) **alternative** — déclarer le state manquant (`const [dragPreview, setDragPreview] = useState(...)`) est le correctif le plus direct, mais nécessite l'accord explicite de Louis dans le message courant avant tout edit dans cette zone. **Cinquième signalement, toujours en attente d'arbitrage.**

**Autres points de vigilance (non bloquants) :** triple mécanisme de détection admin basé sur comparaison d'email en dur (sécurité/maintenabilité) ; ~51 occurrences réelles d'em-dash en copy utilisateur ; `QuotaReachedDialog.tsx` non stylé `.glass` ; `allowLongMemory` déjà abandonné en doc produit mais pas retiré du code.

**Checklist de lancement priorisée :**

1. **P0** — Corriger le job CI Typecheck (`-p tsconfig.app.json` ou `--build`) pour qu'il vérifie réellement le code — sans ce correctif, tout autre correctif TypeScript restera invisible à la CI.
2. **P0** — Signaler à Louis le code cassé `setDragPreview` dans la zone protégée avant toute correction — cinquième signalement, en attente d'arbitrage.
3. **P0** — Diagnostiquer et corriger les 110 erreurs TypeScript. Commencer par `LoreGraphView.tsx` et `ChapterDetail.tsx` (43 erreurs à eux deux).
4. **P1** — Clarifier les trois mécanismes de détection admin et unifier vers un rôle/claim Supabase.
5. **P1** — Mettre en place un garde-fou automatisé anti-em-dash.
6. **P1** — Ajouter `.glass` à `QuotaReachedDialog.tsx`.
7. **P2** — Retirer `allowLongMemory` du code (déjà abandonné en doc produit) et de `CLAUDE.md`.
8. **P2** — Supprimer le scaffolding tier-gating mort.
9. **P2** — Réconcilier `CLAUDE.md` sur le statut réel du menu Univers (~4834 lignes livrées vs « non démarré »).

**Cinquième cycle consécutif avec un bloquant dur non résolu, et la cause racine de cette stagnation est désormais identifiée : la CI ne vérifie rien.** Corriger le pipeline (item 1) avant même de corriger les erreurs elles-mêmes, sinon toute correction future restera aussi invisible que les 110 erreurs actuelles.

---

## 7. 📣 Marketing Plan

Aucune présence publique nouvelle identifiée depuis le 08-25 (pas de compte social, pas de landing page d'acquisition séparée, pas de waitlist visible dans le repo). Plan inchangé, mis à jour avec le signal benchmark de ce cycle.

| Tâche | Priorité | Effort |
|---|---|---|
| Créer le compte Instagram DreamWeave (visuel-first) | Haute | Rapide |
| Créer un compte X/Twitter pour suivre la conversation créateurs webtoon/IA | Haute | Rapide |
| Écrire une landing page d'acquisition dédiée (séparée de l'app) | Haute | Moyen |
| Lancer une waitlist avec incitatif (crédits bonus au lancement) | Haute | Rapide |
| Engager 5-10 créateurs webtoon amateurs (Reddit, Discords manga/webtoon) pour accès anticipé | Haute | Moyen |
| Produire une vidéo teaser concept (pipeline Style → Assets → Scénario → Édition) | Moyenne | Moyen |
| Rédiger 2-3 posts sur la différenciation « tout gratuit, volume de crédits uniquement » — argument renforcé par la fermeture de Dashtoon (produit IA payant qui a fermé) | Moyenne | Rapide |
| Préparer un post de lancement Product Hunt | Moyenne | Moyen |
| Documenter un cas d'usage complet (« de zéro à un chapitre publié ») | Basse | Long |
| Surveiller mensuellement l'actualité concurrentielle (WEBTOON, Dashtoon/Dashverse, Komiko, Anifusion, Jenova) | Basse | Rapide (récurrent) |

**Recommandation de séquencement inchangée :** ne pas accélérer sur le marketing avant la résolution des bloquants techniques P0 — un lancement de waitlist/teaser sur un build dont la CI ne détecte même pas les erreurs réelles depuis 10 jours serait prématuré.

---

## TL;DR

- **🔴 Cinquième cycle consécutif sans changement de code applicatif** (seuls des commits mémoire/soutenance depuis le 08-22, 10 jours) — **110 erreurs TypeScript réelles inchangées**, dont le bug `setDragPreview` dans la zone protégée du canvas éditeur, en attente d'arbitrage de Louis pour la cinquième fois.
- **🆕 Découverte critique de ce cycle : le job CI « Typecheck » ne vérifie en réalité aucun fichier** (bug de configuration `tsconfig.json` racine, exécute `tsc --noEmit` sans `-p`/`--build`). C'est probablement la raison pour laquelle les 110 erreurs n'ont jamais bloqué de merge et persistent depuis si longtemps. Correctif proposé : `.github/workflows/ci.yml` → `npx tsc --noEmit -p tsconfig.app.json`.
- **Score technique moyen ≈5,3/10** (le lint est propre, mais la dette et la CI cassée pèsent lourd).
- **Écart roadmap/code sur le menu Univers plus documenté que jamais** : la doc produit interne (`Produit/NarraMind-Compass.md`) confirme une implémentation conforme aux deux piliers (~4834 lignes avec hooks/services), pendant que `CLAUDE.md` affiche toujours « non démarré » — pertinent pour le Mémoire de fin d'études (écart déclaratif).
- **Benchmark : signal net mais isolé** — Dashtoon (concurrent direct bien financé) a fermé son produit de création IA le 15/08 et pivoté vers la vidéo IA ; WEBTOON affiche une croissance quasi plate (11/08). Aucune pression concurrentielle nouvelle ne justifie d'accélérer le marketing avant de traiter les bloquants P0.

---

*Rapport généré automatiquement par la tâche planifiée `dreamweave-daily-audit`. Aucune action d'écriture effectuée (lecture seule). Mise à jour du wiki Obsidian non effectuée cette session (dossier vault non accessible depuis cet environnement) — à reporter à une session sur la machine principale de Louis si les décisions de ce cycle doivent y être consignées. Prochain cycle : vérifier si (1) le job CI Typecheck a été corrigé, (2) la régression TypeScript a enfin été traitée (6e cycle sans mouvement sinon), (3) le triple mécanisme admin a été clarifié.*
