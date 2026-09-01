# Audit quotidien DreamWeave — 2026-08-12

**Méthode** : recherche web (sources datées août 2026 uniquement) + lecture directe du code source (`tsc --noEmit`, `git log`, grep ciblé) via deux passes indépendantes. Dernier commit HEAD au moment de l'audit : `8a3c92a` (2026-08-11), identique à l'audit de la veille — aucun changement de code depuis `AUDIT-QUOTIDIEN-2026-08-11.md`. Les scores et constats techniques ci-dessous sont donc une **revérification indépendante**, pas une simple redite.

---

## 1. 🔍 Benchmark & Competitive Intelligence

**Note de fiabilité** : peu de sources datées strictement entre le 13/07 et le 12/08/2026 ont pu être confirmées, en particulier côté sentiment communautaire (Reddit/Discord/X) — aucun post daté dans la fenêtre n'a pu être vérifié malgré plusieurs recherches ciblées. Les résultats non datables ont été écartés plutôt que forcés dans le rapport.

### Mouvements concurrents

**WEBTOON Entertainment — résultats T2 2026 et virage IA**
[Communiqué GlobeNewswire](https://www.globenewswire.com/news-release/2026/08/10/3342271/0/en/webtoon-entertainment-inc-reports-second-quarter-2026-financial-results.html) — 10/08/2026
Revenus en baisse de 2,8 % YoY (338,5 M$), perte nette de 14,6 M$. Le CEO Junkoo Kim positionne l'IA comme levier d'engagement (chat interactif « byUs », traduction auto, animation courte) — pas comme outil de création pour les artistes. Axe différent de celui de DreamWeave (génération d'assets/cases), donc pas de recouvrement direct.

**Forbes — tensions IA chez WEBTOON**
[Analyse Forbes](https://www.forbes.com/sites/robsalkowitz/2026/08/11/webtoons-growth-is-slowing-but-its-ambitions-are-growing/) — 11/08/2026
L'article avance que l'IA est perçue comme « toxique » par une part croissante de créateurs et lecteurs Gen-Z chez WEBTOON, et que le coût réputationnel pourrait dépasser le bénéfice. Signal à surveiller pour le positionnement marketing de DreamWeave (voir §5 et §7).

**Dashtoon — nouvelle levée en discussion (10-12 M$)**
[BW Disrupt](https://www.bwdisrupt.com/article/dashtoon-likely-to-bag-10-12-mn-from-new-existing-in-523697) — 06/08/2026
Concurrent direct le plus proche fonctionnellement (script → BD avec cohérence de personnages + app de publication intégrée, ~465 employés). Confirme l'appétit investisseur pour la catégorie. À surveiller de près sur les 2-3 prochaines semaines pour une éventuelle annonce feature liée à ce financement.

**Komiko — mise à jour app (confiance faible, source agrégateur)**
[SaaSWorthy](https://www.saasworthy.com/product/komiko-ai) — mise à jour datée 24/07/2026
Outil comparable au workflow assets + cases de DreamWeave (création de personnages, canvas infini, colorisation manga, in-betweening). Source de moindre confiance (page agrégateur, pas un article de presse daté).

### Sentiment communautaire

**Seule source datée disponible** : le même article Forbes du 11/08/2026 caractérise (de seconde main, pas de citation brute Reddit/X) une bascule de perception chez une partie des créateurs/lecteurs Gen-Z vers une méfiance envers l'IA en création de contenu.

**Écart honnête** : aucune source primaire (Reddit, Product Hunt, Discord, X) datée dans la fenêtre n'a pu être confirmée malgré ~10 requêtes distinctes. Ne pas sur-interpréter l'absence de signal comme absence de sujet — probable angle mort de couverture plutôt que non-sujet.

### Implication pour DreamWeave

Le mastodonte du marché (WEBTOON) investit son capital IA sur l'engagement/monétisation, pas sur la création assistée pour non-illustrateurs — le créneau de DreamWeave reste relativement dégagé de ce côté. Dashtoon reste le concurrent structurel le plus proche et continue de lever. Le signal Forbes sur la méfiance IA Gen-Z justifie de continuer la ligne éditoriale anti-slop déjà actée dans `.impeccable.md`/taste-skill (« assisté par IA, toujours votre histoire » plutôt que « généré par IA »).

---

## 2. 🛠️ Technical Audit

| Axe | Score /10 | Justification |
|---|---|---|
| Qualité du code | 8/10 | `tsc --noEmit` → 0 erreur. 0 `TODO`/`FIXME`/`HACK` dans `src/` et `supabase/functions/`. 8 `console.log` trouvés, tous gardés par `import.meta.env.DEV` dans `EmailVerification.tsx` (pas de fuite prod). 0 `any` non justifié. 26 fichiers de tests Vitest. Points faibles : 3 god-files (`ChapterDetail.tsx` 3174 lignes, `LoreGraphView.tsx` 2196 lignes, `ScenarioChapterEditor.tsx` 1937 lignes). |
| Architecture globale | 8/10 | Flux `types → supabase → services → hooks → components → pages` respecté et vérifiable. Dette structurelle confirmée : `TIER_CONFIG` dupliqué entre `src/types/index.ts:25-62` (client) et `supabase/functions/_shared/tierConfig.ts:17-36` (Deno), protégé seulement par un test de sync. Le commentaire d'en-tête de `_shared/tierConfig.ts:6` promet encore la « mémoire narrative longue » Studio, contredisant le retrait commercial du 27/06/2026 — dérive côté code serveur, pas que doc. |
| Performance & scalabilité | 7/10 | `ImageWithFallback.tsx` a `lazy = true` par défaut (fix historique bien appliqué). `ChapterDetail.tsx` : 30 `useState`/17 `useRef` mais aussi 32 `useCallback`/`useMemo` — discipline de mémoïsation réelle malgré la taille du fichier. Aucune preuve de virtualisation du canvas chapitre (jusqu'à 100 000 px) — risque de scalabilité non validé sous charge réelle, inchangé depuis plusieurs cycles d'audit. |
| Sécurité | 9/10 | Aucune fuite de `service_role` côté client (0 occurrence dans `src/`). `generate-asset-image/index.ts` vérifie le JWT via l'API Auth Supabase avant tout accès (401 si absent/invalide). RLS storage : `INSERT`/`DELETE` correctement scopés par `auth.uid()`, mais le `SELECT` du bucket `dreamweave` est ouvert à tout utilisateur authentifié sans vérification de chemin — point mineur, jamais explicitement validé comme intentionnel. |
| Dette technique | 7,5/10 | `allowLongMemory` défini dans `TIER_CONFIG` (×2 copies) sans aucune consommation applicative — flag mort. Dérive documentaire précise : CLAUDE.md et `EDGE_FUNCTIONS_INDEX.md` annoncent 14 Edge Functions, le repo en contient 15 (`generate-cover-image`, créée le 13/07, absente des deux documents). 126 couleurs hex en dur, dont 4 dégradés hors contexte de personnalisation utilisateur (`DashboardHome.tsx:42-45`, couvertures de genre — devrait passer par tokens HSL). |

**Moyenne : ≈ 7,9/10** — stable vs audit du 11/08 (cohérent avec l'absence de commit).

`npx vitest run` a échoué dans le sandbox d'audit (`EPIPE` esbuild) — problème d'environnement d'exécution isolé, pas un bug projet ; `tsc --noEmit` reste le signal fiable obtenu.

---

## 3. 📦 Product Audit

**Cohérence tiers/positionnement — confirmée.** `TIER_CONFIG` : `allowReferenceImages`, `allowScenarioAI`, `allowFullExport` sont `true` sur les trois tiers, `model: "flux-2-pro"` identique partout — seule différenciation réelle : volume de crédits (20/100/250). Conforme à la stratégie « tout gratuit » actée le 2026-05-30.

**Incohérence promesse/livraison.** `allowLongMemory: true` reste défini pour Studio dans les deux copies de `TIER_CONFIG` sans être lu nulle part dans la logique produit, **et** le commentaire du fichier Edge Function côté serveur promet encore explicitement cette feature — une future contribution pourrait s'appuyer dessus par erreur.

**Menu Univers — plus avancé que son statut roadmap ne l'indique.** `UniverseSection` est câblé comme onglet actif dans `ProjectDetail.tsx` (inclus dans le tour progressif), s'appuyant sur `LoreGraphView.tsx` (2196 lignes) — conforme aux deux piliers (cartographie + amélioration continue Ariane). Le statut CLAUDE.md « Univers v1 🔴 » ne reflète pas cette implémentation réelle, écart signalé sur plusieurs audits consécutifs sans correction.

**Régression de scope assumée et tracée.** `AUTO_COMPOSITION_ENABLED = false` dans `ScenarioCasesPanel.tsx:35-38`, commenté « masquée à la demande de Louis (2026-07-19) ». Code conservé derrière un flag plutôt que supprimé — choix produit défendable, mais en zone grise depuis plus de trois semaines sans decision de réactivation ou retrait définitif.

**Redondance/sous-utilisation** : rien de nouveau vs les audits précédents.

---

## 4. 🎨 UX / UI Audit

**Fluidité du parcours** : Style → Assets → Univers → Scénario → Édition structuré en onglets avec gating progressif cohérent, aucune route morte identifiée.

**Violations design system confirmées :**

1. **Em-dash en copy utilisateur** (interdit absolu selon `.impeccable.md`, non corrigé depuis le 24/07) :
   - `ArianeOnboardingCard.tsx:355`
   - `ArianeContinuityPanel.tsx:182` et `:294`
   Ces trois occurrences sont dans les composants Ariane — la vitrine qualité du produit — ce qui aggrave le signal de dette non traitée.

2. **Couleurs hardcodées hors contexte de personnalisation** : `DashboardHome.tsx:42-45`, 4 dégradés hex pour couvertures de genre, en zone de chrome/layout (pas un color-picker utilisateur, donc pas justifiable comme les presets de `src/components/chapter/`).

**Points positifs vérifiés** : aucune trace de police Inter (Quicksand/Nunito respectées), `ImageWithFallback.tsx` gère loading state et fallback proprement (pas de carte blanche plate).

**Friction identifiée** : `ChapterDetail.tsx` (3174 lignes, zone canvas **protégée** — toute modification nécessite l'accord explicite de Louis) reste un god-component, facteur de friction pour la maintenabilité future sans être un problème utilisateur direct. La composition auto masquée ne donne aucune explication UI à un testeur qui l'aurait connue avant le 19/07.

**Comparaison concurrentielle** : les concurrents identifiés en §1 (Dashtoon, Komiko) misent fortement sur la cohérence de personnages et un canvas infini — DreamWeave couvre déjà ces deux axes (Sheet System, canvas chapitre) ; pas d'écart fonctionnel béant identifié par rapport au marché sur cette base limitée d'information.

---

## 5. 💡 Improvement Suggestions

**🗑️ Removals**
- Trancher `allowLongMemory` : soit l'implémenter, soit le retirer de `TIER_CONFIG` (×2) et du commentaire trompeur dans `_shared/tierConfig.ts:6`. Justification : flag mort qui contredit une décision commerciale déjà actée (retrait du 27/06/2026), risque de confusion pour un futur contributeur.
- Décider du sort de `AUTO_COMPOSITION_ENABLED` : réactiver, retirer le code, ou documenter formellement le critère de réactivation. Trois semaines en zone grise sans décision.

**⚡ Optimizations**
- Corriger les 3 violations em-dash dans les composants Ariane (`ArianeOnboardingCard.tsx:355`, `ArianeContinuityPanel.tsx:182,294`) — correction triviale, règle zéro-tolérance déjà actée, non traitée depuis 3+ semaines.
- Migrer les 4 dégradés hex de `DashboardHome.tsx:42-45` vers des tokens HSL.
- Corriger la dérive documentaire Edge Functions (14 → 15 fonctions, ajouter `generate-cover-image` à `EDGE_FUNCTIONS_INDEX.md` et CLAUDE.md).
- Mettre à jour le statut roadmap Univers v1 (🔴 → reflet de l'implémentation réelle).
- Valider explicitement (ou restreindre) la policy `SELECT` ouverte du bucket `dreamweave`.
- *(nécessite l'accord explicite de Louis — zone canvas freezée)* Étudier la virtualisation du canvas chapitre, aucune preuve de windowing trouvée pour un canvas pouvant atteindre 100 000 px.

**➕ Additions**
- Positionnement marketing « assisté par IA, toujours votre histoire » plutôt que « généré par IA », en écho direct au signal Forbes du 11/08 sur la méfiance IA croissante chez les créateurs/lecteurs Gen-Z ([source](https://www.forbes.com/sites/robsalkowitz/2026/08/11/webtoons-growth-is-slowing-but-its-ambitions-are-growing/)). Cohérent avec les règles anti-slop déjà en place dans `.impeccable.md`.
- Surveiller l'issue de la levée Dashtoon (10-12 M$, en discussion début août — [source](https://www.bwdisrupt.com/article/dashtoon-likely-to-bag-10-12-mn-from-new-existing-in-523697)) pour anticiper une éventuelle annonce feature dans les 2-3 prochaines semaines.

---

## 6. 🚀 Launch Status

**Contexte** : exécution locale et/ou Vercel, pas d'annonce publique. Aucun changement de code depuis le 11/08 (`8a3c92a`).

**Bloquants techniques identifiés** : aucun P0. `tsc --noEmit` propre, sécurité JWT/RLS correcte aux points vérifiés, modèle tarifaire cohérent avec le code.

**Bloquants à traiter avant annonce publique (P1)** :
1. Violations em-dash dans les composants Ariane (vitrine produit — mauvaise image si vu par un early user)
2. Décision `allowLongMemory` (cohérence promesse commerciale)

**Checklist de lancement priorisée** :
1. P1 — Corriger les 3 em-dash Ariane (< 30 min, aucun risque)
2. P1 — Trancher `allowLongMemory` (impacte doc commerciale + code serveur)
3. P2 — Corriger dérive doc Edge Functions (14→15) et statut roadmap Univers
4. P2 — Décider du sort de la composition auto masquée
5. P2 — Migrer couleurs hardcodées `DashboardHome.tsx`
6. P3 — Valider policy RLS storage `SELECT`
7. Avant annonce publique : valider `npm test` dans un environnement CI propre (l'échec observé aujourd'hui est un problème de sandbox d'audit, à re-vérifier en environnement normal)

Aucun blocage produit majeur identifié — le principal frein au lancement public semble être une question de séquencement/décision (les items P1/P2 ci-dessus) plutôt qu'un problème technique de fond.

---

## 7. 📣 Marketing Plan

| Tâche | Priorité | Effort |
|---|---|---|
| Créer le compte Instagram DreamWeave | Medium | Quick |
| Rédiger une landing page orientée acquisition, avec un positionnement « assisté par IA, toujours votre histoire » (voir §5) | High | Medium |
| Lancer une waitlist avec incitation (crédits bonus au lancement) | High | Quick |
| Produire une vidéo teaser concept (Style → Assets → Scénario → Chapitre en accéléré) | Medium | Medium |
| Préparer un post de lancement Product Hunt, en s'appuyant sur le Sheet System et la cohérence de personnages comme différenciateurs face à Dashtoon/Komiko | High | Medium |
| Rédiger 2-3 posts Reddit ciblés (r/webtoons, r/comicbookcreation) présentant l'outil sans posture « IA générative brute », en ligne avec le signal de méfiance Gen-Z identifié en §1 | Medium | Quick |
| Documenter un comparatif honnête DreamWeave vs Dashtoon/Komiko (usage interne, prépare les réponses aux objections) | Low | Quick |

---

## TL;DR

- Aucun changement de code depuis l'audit du 11/08 (`8a3c92a`) — cet audit revérifie indépendamment et confirme le score technique (~7,9/10), sans régression ni nouveauté majeure.
- Deux items P1 non techniques bloquent une image cohérente au lancement : 3 violations em-dash dans les composants Ariane (règle zéro-tolérance) et le flag mort `allowLongMemory` qui contredit une décision commerciale déjà actée.
- Aucun bloquant P0 : sécurité JWT/RLS correcte, `tsc --noEmit` propre, modèle tarifaire cohérent avec le code livré.
- Marché : WEBTOON investit son IA sur l'engagement (pas la création), laissant le créneau DreamWeave dégagé ; Dashtoon reste le concurrent structurel le plus proche et continue de lever des fonds (10-12 M$ en discussion, août 2026).
- Signal à intégrer au positionnement : Forbes (11/08/2026) documente une montée de la méfiance envers l'IA chez les créateurs/lecteurs Gen-Z — justifie une ligne marketing « assisté par IA, toujours votre histoire ».
- Prochaine étape concrète recommandée : traiter les deux P1 (em-dash + `allowLongMemory`), puis lancer la landing page + waitlist en priorité Marketing.

📝 **Impact Mémoire** : aucun changement d'architecture, de feature livrée ou de positionnement depuis le dernier commit — pas de mise à jour de `Produit/Memoire_DreamWeave.md` nécessaire pour cette session. Les deux corrections de documentation interne identifiées (drift Edge Functions 14→15, commentaire `allowLongMemory` trompeur côté serveur) ne sont pas des décisions produit nouvelles.
