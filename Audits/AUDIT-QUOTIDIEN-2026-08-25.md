# 🔍 Audit Quotidien DreamWeave — 2026-08-25

*Audit automatisé complet. Branche `pre-production` · commit `b4095a4` (2026-08-24, 23:07) · read-only. Sources benchmark : juillet–août 2026 uniquement (< 30 jours), sauf mention contraire signalée. Exécuté sans supervision (tâche planifiée) — aucune modification de code effectuée.*

**Point de départ notable :** `git log b4095a4 -- src/ supabase/` depuis le commit de référence du dernier audit (`e9a57a7`, 2026-08-22) est **vide**. Les seuls commits entre les deux cycles concernent le mémoire de fin d'études et les présentations de soutenance (PPTX/PDF/HTML) — **aucun code applicatif n'a changé depuis l'audit du 08-23**. Les constats techniques ci-dessous sont donc, sans surprise, identiques ligne à ligne à ceux du cycle précédent. Note technique : `git status`/`git diff` sur ce checkout sont pollués par ~458 fichiers marqués `M` à cause d'une normalisation de fins de ligne (CRLF/LF) sans rapport avec du vrai contenu modifié (vérifié sur `Audits/AUDIT-016-04-26.md` : diff de 340 lignes qui est en réalité un no-op) — ce signal n'a pas été utilisé pour la détection de changement, la lecture directe des fichiers a servi de source de vérité.

---

## 1. 🔍 Benchmark & Competitive Intelligence

**Un concurrent direct ferme boutique.** **Dashtoon Studio** (l'outil de création BD/webtoon collaboratif de Dashtoon, cité aux deux cycles précédents comme concurrent direct) **cesse son activité le 15 août 2026** : création de nouvelles séries désactivée sur la page produit officielle, les utilisateurs sont invités à télécharger leur travail et à migrer vers **Frameo**, un nouveau studio vidéo générative positionné dans l'écosystème Dashverse (aux côtés de DashReels, ShortFree et Dashtoon lecture). C'est un pivot de consolidation côté Dashverse — le pari BD/webtoon spécialisé cède la place à de la vidéo générative courte, pas un signal de reprise de terrain sur le créneau précis de DreamWeave. À noter pour Louis : un concurrent nommé aux deux derniers audits disparaît du paysage, ce qui allège d'autant le benchmark direct.
Source : [Dashtoon Studio — page produit officielle](https://dashtoon.com/create) (avis de fermeture actif au 15/08/2026, consulté le 25/08/2026)

**WEBTOON Entertainment (Nasdaq : WBTN) — résultats Q2 2026 publiés le 10/08, pression continue sur la croissance.** Chiffre d'affaires 338,5 M$ (-2,8 % ; +5,2 % à change constant), perte nette creusée à 14,6 M$ (contre 3,9 M$ un an plus tôt), guidance Q3 dégradée (+0,7 % à +3,3 % croissance change constant). Signal stratégique daté du 06/08 : accord d'investissement dans **RI Games Holdings** (jusqu'à 9 000 actions, ~150 Md KRW) pour se doter d'un pipeline de développement de jeux à partir d'IP webcomics à forte notoriété — confirme la même trajectoire notée aux cycles précédents (pari sur l'IP propre et l'extension multi-format plutôt que sur la croissance MAU organique, quasi à l'arrêt).
Sources : [WEBTOON Entertainment — résultats Q2 2026, GlobeNewswire, 2026-08-10](https://www.globenewswire.com/news-release/2026/08/10/3342271/0/en/webtoon-entertainment-inc-reports-second-quarter-2026-financial-results.html) · [Accord RI Games, StockTitan, 2026-08](https://www.stocktitan.net/sec-filings/WBTN/8-k-webtoon-entertainment-inc-reports-material-event-e15af0016115.html)

**Sentiment communautaire :** comme aux deux cycles précédents, aucun fil Reddit/Product Hunt/X daté et vérifiable ce mois-ci sur un outil webtoon/manga IA nommé — recherches ciblées infructueuses (limite identique au 08-13 et au 08-23). La fermeture de Dashtoon Studio n'a pas généré de couverture presse datée trouvée au-delà de l'avis officiel sur leur propre site.

**Conclusion benchmark :** aucune menace nouvelle sur le créneau précis de DreamWeave (production assistée solo, cohérence de style, sans compétence d'illustration) — au contraire, un concurrent direct nommé se retire du segment BD/webtoon spécialisé pour pivoter vers la vidéo générative. À surveiller : tout lancement Komiko/Anifusion/Jenova daté avec des chiffres vérifiables (le paysage actuel reste dominé par du contenu marketing non daté, écarté conformément à la règle des 30 jours), et la trajectoire IP/gaming de WEBTOON.

---

## 2. 🛠️ Technical Audit

| Axe | Score /10 | Justification |
|---|---|---|
| **Qualité du code** | **4** *(stable, 08-23)* | `npx tsc --noEmit --project tsconfig.app.json` échoue toujours avec **110 erreurs sur 31 fichiers, comptage et localisations identiques au cycle du 08-23** (aucun code applicatif modifié entretemps). Pires fichiers inchangés : `LoreGraphView.tsx` (24 erreurs, mismatches de types génériques React Flow lignes 1303, 1375, 2000-2024), `ChapterDetail.tsx` (19 erreurs), `useArianeLoreProposals.ts` (7), `panels.ts` (7, désormais explicitement des `TS2352` — TypeScript qualifie lui-même les casts `Json → PanelLayout/ColorBlock/SpeechBubble` de « conversions probablement erronées », pas seulement une convention à risque). |
| **Architecture** | **6** | Couches `types → integrations → services → hooks → components → pages` toujours respectées. Deux fichiers portent une complexité disproportionnée : `ChapterDetail.tsx` (3174 lignes, 19 erreurs TS) et `LoreGraphView.tsx` (2196 lignes, 24 erreurs TS) — croissance organique sans discipline de types. |
| **Performance & scalabilité** | **6** | Aucune nouvelle mesure ce cycle (audit lecture seule, pas de profiling runtime). Risque déjà identifié et toujours non mitigé : `chapter_canvases` autorise jusqu'à 100 000 px de hauteur sans virtualisation dans `ImageBlockLayer`/`ColorBlockLayer`/`BubbleLayer`. |
| **Sécurité** | **5** ⬇️ *(8 le 08-23 — révision à la baisse, pas une régression : nouveaux éléments trouvés ce cycle)* | RLS `auth.uid() = user_id` documentée dans CLAUDE.md sur les tables cœur, non re-vérifiée par requête SQL directe ce cycle. **Découverte de ce cycle : trois mécanismes différents de détection admin coexistent** — `ARIANE_ONBOARDING_ADMIN_EMAIL` (constante hardcodée, `src/constants/ariane.ts:5`, utilisée dans `DashboardLayout.tsx`, `Dashboard.tsx`, `Pilotage.tsx`, `ProjectDetail.tsx`), `ADMIN_EMAIL` hardcodé en dur et dupliqué dans deux Edge Functions (`admin-set-plan/index.ts:9`, `admin-get-kpis/index.ts:8`), et un **troisième mécanisme distinct** dans `Plans.tsx:126-128` basé sur la variable d'environnement `VITE_ADMIN_EMAIL` — trois sources de vérité différentes pour « est-ce un admin », à clarifier avec Louis (staging/prod intentionnel, ou dérive). `verify_jwt = false` au niveau gateway pour les 14 fonctions (confirmé dans `supabase/config.toml`), chaque fonction revérifiant manuellement via `/auth/v1/user` — toujours sans filet de sécurité au niveau gateway. |
| **Dette technique** | **3** ⬇️ *(4 le 08-23)* | **Aucune correction n'a été tentée sur la régression TypeScript depuis au moins 3 jours (0 mouvement entre le 08-22 et aujourd'hui)**. Le code cassé `setDragPreview` dans `ChapterDetail.tsx` (14 occurrences, lignes 1477 à 1669, `TS2304: Cannot find name 'setDragPreview'`, aucune déclaration `useState` trouvée dans les 3174 lignes du fichier) reste tel quel — zone protégée du canvas éditeur, correction bloquée en attente d'accord explicite de Louis. Nouveau ce cycle : les risques de null-deref sur `canvasRefByPanel.current` (`useDragBlock.ts:59,94,129`, `useResizeBlock.ts:69`, `useKeyboardShortcuts.ts:116,148,180`) sont désormais des **erreurs de compilation actives** (`TS18047: possibly 'null'`), pas seulement un risque latent — ce ne sont pas des observations de style, `tsc --noEmit` échoue réellement dessus. Un CI qui exécuterait ce check serait rouge dès aujourd'hui. |

**Moyenne technique ≈ 4,8/10, en baisse par rapport au 08-23 (≈6/10).** La baisse reflète surtout un examen plus approfondi ce cycle (triple mécanisme admin découvert, sévérité des erreurs TS reclassée de « risque » à « échec de compilation confirmé ») plutôt qu'une dégradation du code lui-même, qui n'a pas bougé. Le point le plus urgent reste inchangé : **le build ne compile toujours pas (110 erreurs, 0 correction en 3 jours)**, avec du code cassé dans la zone protégée du canvas.

---

## 3. 📦 Product Audit

Le positionnement « tout gratuit, différenciation par crédits uniquement » reste confirmé dans le code : `TIER_CONFIG` (`src/types/index.ts:25-62`) fixe `allowReferenceImages`, `allowScenarioAI` et `allowFullExport` à `true` sur les trois plans ; seul `maxGenerationsPerMonth` (20/100/250) diffère réellement. `allowLongMemory` reste différencié dans le type (`false/false/true`) mais confirmé mort pour la troisième fois consécutive — lu uniquement par `test/tierConfigSync.test.ts:17-18`, consommé nulle part ailleurs.

**Le scaffolding de tier-gating mort n'a pas bougé** (normal, aucun code modifié) : badge « PRO » et texte de paywall dans `EditorLeftSidebar.tsx:189-224` (tracé jusqu'à `ChapterDetail.tsx:272` : `canUseCases = TIER_CONFIG[plan].allowScenarioAI`, toujours vrai) ; `canUseReferenceImages` dans `StyleManager.tsx:59,479,491,580` ; cap `filArianeLimit` dans `ArianeContinuityPanel.tsx:120-131,294`, alimenté par `ProjectDetail.tsx:675` (`filArianeLimit={TIER_CONFIG[userPlan].filArianeLimit}`, toujours `null`). Ce sont des branches JSX mortes, sans risque fonctionnel immédiat, mais un piège pour un futur contributeur qui retoucherait `TIER_CONFIG`.

**Menu Univers — statut re-confirmé, écart roadmap toujours ouvert.** `ProjectDetail.tsx:55-56` lazy-charge `UniverseSection`, `:426` déclare l'onglet `universe` réel, `:456` le rend quand actif. Chaîne complète vérifiée : `UniverseSection.tsx` → `LoreGraphView.tsx` (2196 lignes, graph nœuds/arêtes, dialogs lignes 328/528/1132/1227) → `LoreNodeSheet.tsx` (806 lignes) → `LoreUniversProposalsSheet.tsx` (512 lignes) + `CompassSuggestionsPanel.tsx` (135 lignes). ~3649 lignes au total, réellement navigable (pas du code mort), contredisant toujours la roadmap CLAUDE.md qui marque « Univers v1 🔴 » comme non démarré. Point positif UX noté ce cycle : l'onglet Univers n'est explicitement jamais l'onglet par défaut (commentaire `ProjectDetail.tsx:54`), donc aucun impact sur le chemin critique même si l'écart roadmap doit être tranché.

> 📝 **Note pour le Mémoire** (`Produit/Memoire_DreamWeave.md`) : ce constat revient pour la troisième fois consécutive (08-13, 08-23, 08-25) sans arbitrage. Recommandation : trancher avant rédaction de la section Fonctionnalités, sans attendre un futur cycle d'audit.

---

## 4. 🎨 UX / UI Audit

Navigation cohérente (`App.tsx:104-184`), routes protégées sans route orpheline observée. `useAssetGeneration.ts:20-41` bloque la génération avec un toast clair si aucun style n'est défini — bonne validation en amont, conforme à la convention « validation aux frontières » du CLAUDE.md. `QuotaReachedDialog.tsx` reste correctement scopé par plan dans son copy (CTA « Passer au plan Créateur/Studio »).

**Violation « zéro em-dash » — ampleur réelle bien plus large que documenté aux cycles précédents.** Les deux audits parallèles de ce cycle ont recensé indépendamment **~40 occurrences réelles en copy utilisateur** (hors placeholders `—` pour valeur vide dans les tableaux admin, hors commentaires code, hors fichiers de test) — pas seulement les 6 emplacements cités le 08-23 qui restent d'ailleurs identiques (aucun code modifié). Concentration notable dans **`src/lib/arianeTabTourSteps.ts` (7 occurrences, lignes 22, 30, 47, 61, 71, 84, 108)** — le tour guidé d'onboarding, donc vu par tout nouveau utilisateur —, dans les messages d'erreur/toast (`composeChapterLayout.ts:40`, `cover.ts:12`, `scenarioAI.ts:212,309`, `scenarioChapters.ts:102`), et dans `LoreGraphView.tsx`/`LoreNodeSheet.tsx`/`ScenarioSection.tsx` (menu Univers et scénario). La règle « zéro tolérance » n'a manifestement jamais été appliquée par un garde-fou automatisé — confirmation forte qu'une correction manuelle ponctuelle ne suffira pas.

**`QuotaReachedDialog.tsx:41` toujours sans `.glass`**, inchangé — `<DialogContent className="max-w-sm text-center">` contre `.glass` sur la quasi-totalité des ~40 autres `DialogContent`/`AlertDialogContent` de l'app (seules exceptions légitimes : `Plans.tsx:220`, `ScenarioChapterEditor.tsx:1837`, et `LoreNodeSheet.tsx:400` qui utilise une variante délibérée `bg-popover border-white/10`). Un des seuls trois écrans non stylés `.glass` de toute l'app est précisément le moment de friction monétisation le plus sensible du parcours Libre.

Hex codés en dur : présents dans plusieurs fichiers de la zone canvas gelée (couleurs de bulles/blocs/SFX — probablement des couleurs de contenu choisies par l'utilisateur, pas une violation de design token) mais aussi dans `pages/Landing.tsx` et `pages/Auth.tsx`, deux surfaces marketing/auth où les tokens du design system devraient s'appliquer — point à vérifier plus finement (non conclu ce cycle, budget d'agent limité).

**Comparaison marché :** rien de nouveau ce mois-ci sur le feedback UX pendant génération (section 1 pauvre en couverture datée). Le retrait de Dashtoon Studio du segment BD spécialisé réduit d'un cran la pression de benchmark UX direct.

---

## 5. 💡 Improvement Suggestions

### 🗑️ Removals

**Supprimer le scaffolding de tier-gating mort** (`EditorLeftSidebar.tsx:189-224`, `StyleManager.tsx:59,479,491,580`, `ArianeContinuityPanel.tsx:120-131,294`) — inchangé depuis deux cycles, toujours recommandé.

**Trancher `allowLongMemory`** — confirmé mort pour la troisième fois consécutive (08-13, 08-23, 08-25). Suggestion concrète : soit le retirer de `TIER_CONFIG` et du test de parité, soit documenter explicitement « réservé, non livré » dans `types/index.ts` pour couper court à la question à chaque cycle.

**Unifier les trois mécanismes de détection admin** en un seul (rôle/claim plutôt que comparaison d'email en dur) — `ARIANE_ONBOARDING_ADMIN_EMAIL`, `ADMIN_EMAIL` (dupliqué dans deux Edge Functions), et `VITE_ADMIN_EMAIL` (`Plans.tsx`) sont trois sources de vérité distinctes pour la même question. À clarifier avec Louis : intentionnel (env de staging) ou dérive à corriger.

### ⚡ Optimizations

**P0 — Toujours en attente : résoudre la régression TypeScript (110 erreurs, 0 mouvement en 3 jours).** Rien n'a changé depuis le 08-23. Le point de blocage principal (`setDragPreview` non déclaré, zone protégée du canvas) nécessite l'accord explicite de Louis avant correction — cf. section 6.

**Mettre en place un lint/CI anti-em-dash.** Ce cycle confirme que le problème est structurel (~40 occurrences réelles, jamais bloquées par un garde-fou) plutôt que ponctuel — une correction manuelle ne tiendra pas. Prioriser `arianeTabTourSteps.ts` (onboarding, plus haute visibilité) si un premier passage manuel est fait en attendant le lint automatisé.

**Ajouter `.glass` à `QuotaReachedDialog.tsx`** — correction d'une ligne, toujours en attente depuis deux cycles, sur l'écran de friction monétisation le plus visible du plan Libre.

**Synchroniser les types Supabase générés** (`narramind_missing_assets` absent de l'union, cause 3 erreurs TS actives dans `narramindMissingAssetsService.ts`).

**Auditer la scalabilité du canvas** (`chapter_canvases` jusqu'à 100 000 px, pas de virtualisation) — **zone protégée, accord explicite de Louis requis avant toute modification.**

### ➕ Additions

**Réconcilier la roadmap sur le statut réel du menu Univers** — troisième cycle consécutif où l'écart roadmap/code (~3649 lignes substantiellement livrées, roadmap marquant « non démarré ») n'est pas tranché. Recommandation : le faire avant le prochain cycle plutôt que de le laisser resurgir une quatrième fois.

**Documenter le raisonnement produit derrière la sortie de Dashtoon Studio du segment BD spécialisé** (pivot vers vidéo générative via Frameo) — pas une action produit immédiate, mais un signal de marché à garder en tête : le segment « BD/webtoon IA pur » se dépeuple d'un acteur financé, ce qui peut jouer en positionnement (« DreamWeave reste concentré sur son créneau ») dans une future communication marketing.

---

## 6. 🚀 Launch Status

**Contexte :** exécution locale et/ou Vercel, pas encore annoncé publiquement.

**Bloquant technique majeur — inchangé depuis le 08-23, aucune action prise :**
- **Le projet ne compile toujours pas proprement : 110 erreurs TypeScript, 0 correction en au moins 3 jours** (dernier commit touchant `src/`/`supabase/` : `e9a57a7`, 2026-08-22).
- **Code cassé dans la zone protégée du canvas éditeur** : `ChapterDetail.tsx` appelle `setDragPreview` à 14 endroits sans déclaration `useState` correspondante. Conformément à la règle « Zone protégée — Canvas Éditeur » du CLAUDE.md, ceci reste à signaler explicitement à Louis avant toute correction : (1) impact — échec silencieux ou erreur runtime probable lors du drag d'un bloc image/couleur ; (2) conséquence — régression potentielle sur une fonctionnalité cœur (composition de case) ; (3) alternative — déclarer le state setter manquant est le correctif le plus direct, mais nécessite l'accord explicite de Louis dans le message courant avant tout edit dans cette zone.
- Nouvelle donnée ce cycle qui aggrave la sévérité perçue : les risques de null-deref (`canvasRefByPanel.current` dans `useDragBlock.ts`/`useResizeBlock.ts`/`useKeyboardShortcuts.ts`) et les casts non sûrs (`panels.ts`) sont désormais des erreurs de compilation actives (`TS18047`, `TS2352`), pas de simples observations de style — tout gate CI basé sur `tsc --noEmit` serait rouge dès aujourd'hui.

**Autres points de vigilance (non bloquants, mais à traiter) :**
- Triple mécanisme de détection admin (nouveau constat ce cycle) — à clarifier avec Louis.
- Violation « zéro em-dash » sur une surface bien plus large que documenté (~40 occurrences réelles, dont l'onboarding).
- `QuotaReachedDialog.tsx` non stylé `.glass` — friction visuelle au moment clé du parcours Libre, deux cycles sans correction.
- Types Supabase désynchronisés (`narramind_missing_assets`).

**Checklist de lancement priorisée :**

1. **P0** — Diagnostiquer et corriger la régression TypeScript (110 erreurs, stagnante depuis 3 jours). Commencer par `ChapterDetail.tsx` et `LoreGraphView.tsx` (43 erreurs à eux deux).
2. **P0** — Signaler à Louis le code cassé `setDragPreview` dans la zone protégée du canvas avant toute correction (règle CLAUDE.md non négociable) — signalé pour la troisième fois, en attente d'arbitrage.
3. **P1** — Clarifier les trois mécanismes de détection admin avec Louis (intentionnel ou dérive) et unifier si dérive confirmée.
4. **P1** — Régénérer/synchroniser les types Supabase.
5. **P1** — Mettre en place un garde-fou automatisé anti-em-dash — la correction manuelle ne tient clairement pas, ampleur confirmée bien plus large ce cycle.
6. **P1** — Ajouter `.glass` à `QuotaReachedDialog.tsx`.
7. **P2** — Supprimer le scaffolding tier-gating mort.
8. **P2** — Trancher `allowLongMemory`.
9. **P2** — Réconcilier la roadmap sur le statut réel du menu Univers (troisième cycle consécutif sans arbitrage).

**Comme au 08-23, ce cycle a un bloquant dur non résolu : le build ne passe toujours pas proprement, et rien n'a bougé en 3 jours.** À traiter avant toute autre priorité, y compris marketing — d'autant plus que le marché ne presse pas dans l'urgence ce cycle-ci (retrait de Dashtoon Studio du segment).

---

## 7. 📣 Marketing Plan

Aucune présence publique nouvelle identifiée depuis le 08-23 (pas de compte social, pas de landing page d'acquisition séparée, pas de waitlist visible dans le repo). Le plan reste valable, avec un ajustement de contexte : le retrait de Dashtoon Studio allège légèrement la pression concurrentielle immédiate, ce qui ne change pas la priorité (résoudre le build avant tout effort marketing) mais peut légèrement détendre le calendrier.

| Tâche | Priorité | Effort |
|---|---|---|
| Créer le compte Instagram DreamWeave (visuel-first) | Haute | Rapide |
| Créer un compte X/Twitter pour suivre la conversation créateurs webtoon/IA | Haute | Rapide |
| Écrire une landing page d'acquisition dédiée (séparée de l'app) | Haute | Moyen |
| Lancer une waitlist avec incitatif (crédits bonus au lancement) | Haute | Rapide |
| Produire une vidéo teaser concept (pipeline Style → Assets → Scénario → Édition) | Moyenne | Moyen |
| Rédiger 2-3 posts sur la différenciation « tout gratuit, volume de crédits uniquement » | Moyenne | Rapide |
| Engager 5-10 créateurs webtoon amateurs (Reddit r/webtoons, Discords manga/webtoon) pour accès anticipé | Haute | Moyen |
| Préparer un post de lancement Product Hunt | Moyenne | Moyen |
| Documenter un cas d'usage complet (« de zéro à un chapitre publié ») | Basse | Long |
| Surveiller mensuellement l'actualité concurrentielle (WEBTOON, Komiko, Anifusion, Jenova) | Basse | Rapide (récurrent) |

**Recommandation de séquencement inchangée :** ne pas accélérer sur le marketing avant la résolution du bloquant technique P0 (section 6) — un lancement de waitlist/teaser sur un build qui ne compile pas proprement depuis 3 jours serait prématuré, indépendamment de l'accalmie concurrentielle observée ce cycle.

---

## TL;DR

- **🔴 Aucun code applicatif n'a changé depuis le 08-23** (seuls des commits mémoire/soutenance) — **le build ne compile toujours pas (110 erreurs TypeScript, 0 correction en 3 jours)**, avec le code cassé `setDragPreview` toujours présent dans la zone protégée du canvas éditeur, en attente d'arbitrage de Louis.
- **Score technique moyen ≈4,8/10** (vs ≈6/10 le 08-23) — baisse due à un examen plus approfondi (pas une dégradation du code) : les null-deref et casts non sûrs sont maintenant des erreurs de compilation confirmées, pas de simples risques.
- **Nouvelle découverte sécurité : trois mécanismes différents de détection admin coexistent** (`ARIANE_ONBOARDING_ADMIN_EMAIL`, `ADMIN_EMAIL` dupliqué dans 2 Edge Functions, `VITE_ADMIN_EMAIL` dans `Plans.tsx`) — à clarifier avec Louis.
- **Violation « zéro em-dash » bien plus large que documenté : ~40 occurrences réelles**, concentrées notamment dans le tour d'onboarding (`arianeTabTourSteps.ts`) — confirme le besoin d'un lint automatisé plutôt que de corrections manuelles.
- **Écart roadmap/code sur le menu Univers non tranché pour la troisième fois consécutive** (~3649 lignes substantiellement livrées, roadmap marquant « non démarré ») — pertinent pour le Mémoire de fin d'études.
- **Signal de marché favorable : Dashtoon Studio (concurrent direct cité aux 2 derniers cycles) ferme et pivote vers la vidéo générative (Frameo)** — allège la pression concurrentielle immédiate sans changer la priorité : résoudre le build avant le marketing.

---

*Rapport généré automatiquement par la tâche planifiée `dreamweave-daily-audit`. Aucune action d'écriture effectuée (lecture seule). Mise à jour du wiki Obsidian non effectuée cette session (dossier vault non accessible depuis cet environnement) — à reporter à une session sur la machine principale de Louis si les décisions de ce cycle doivent y être consignées. Prochain cycle : vérifier si la régression TypeScript a enfin été traitée (4 cycles sans mouvement si rien ne bouge d'ici le 08-27), et si le triple mécanisme admin a été clarifié.*
