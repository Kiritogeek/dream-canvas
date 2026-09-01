# 🔍 Audit Quotidien DreamWeave — 2026-07-24

*Audit automatisé complet. Branche `pre-production` · commit `ee49cac` (2026-07-17) · read-only. Le commit est identique à celui audité le 22/07 — aucun changement de code depuis lors. Sources benchmark : 24 juin – 24 juillet 2026 uniquement (< 30 jours), sauf mention contraire signalée.*

---

## 1. 🔍 Benchmark & Competitive Intelligence

> Fenêtre de recherche : 24 juin – 24 juillet 2026. Sources non datables dans cette fenêtre écartées explicitement (voir en fin de section).

### Le signal qui persiste : le silence des « pure players » IA occidentaux

Deuxième jour consécutif de recherche ciblée sur ComicsMaker.ai, Dashtoon, Scenario.gg, COMICPAD et Jenova : aucune annonce datée dans la fenêtre n'a pu être localisée pour ces cinq outils. Les résultats renvoient vers du contenu evergreen non daté ou antérieur à la fenêtre (levée Dashtoon Série A en août 2025, page « create » de Dashtoon documentée le 26 avril 2026). COMICPAD affiche une mention « verified July 14, 2026 » sur une page comparative tierce, mais c'est une date de vérification éditoriale du site, pas une annonce produit — rejetée comme source.

**Lecture pour DreamWeave :** ce silence prolongé (2 jours d'audit consécutifs) suggère que ces acteurs communiquent peu ou marketent en continu sans cycle d'annonces identifiable. L'enjeu compétitif se joue davantage face aux plateformes coréennes (Naver WEBTOON, Kaon AI) qu'aux outils IA occidentaux, plus discrets.

### Naver WEBTOON et Kaon AI restent les deux dossiers les plus solides du mois

**byUs**, le service de chat narratif IA de Naver WEBTOON (lancé 1er juillet, IP « creator-approved » uniquement), reste l'annonce la mieux sourcée de la période, avec une couverture continue jusqu'au 11 juillet.
Source : [Anime News Network, 2026-07-11](https://www.animenewsnetwork.com/news/2026-07-11/webtoon-launches-ai-story-chat-service-byus-featuring-creator-approved-webtoon-ip/.239448)

Détail additionnel sur Kaon AI (60 M$ levés le 8 juillet) : son produit Emochi revendique 2 millions d'utilisateurs quotidiens, 45 M$ d'ARR et une durée de session moyenne de 150 minutes/jour — un niveau d'engagement bien au-delà des outils de création webtoon classiques.
Source : [SiliconANGLE, 2026-07-08](https://siliconangle.com/2026/07/08/kaon-ai-raises-60m-build-next-generation-ai-driven-interactive-entertainment/)

**Lecture pour DreamWeave :** ces deux dossiers confirment que la traction IA côté webtoon se concentre sur le *contenu conversationnel/interactif* (chat avec personnages), pas sur l'*outil de production* pour créateurs solo. Le positionnement outil-de-création de DreamWeave reste distinct — pas de dérive de scope à anticiper, mais un rappel utile que « Univers/Ariane » doit rester un outil de cartographie/enrichissement, pas glisser vers du divertissement conversationnel.

### Nouveau signal : le Comic-Con de San Diego remet la vitesse de production sur le devant de la scène

Le programme officiel du SDCC (annoncé le 13 juillet, événement du 23 au 26 juillet) inclut un panel directement pertinent : **« From 0 to 50: Pro Tips for High-Speed Webtoon Production and Studio Workflow »** (samedi 25 juillet — donc demain), où les artistes taïwanais PAJI et Kane doivent détailler comment produire jusqu'à 50 planches couleur/semaine avec une petite équipe.
Source : [Anime News Network, 2026-07-13](https://www.animenewsnetwork.com/news/2026-07-13/san-diego-comic-con-2026-to-feature-webtoon-creator-panels-industry-deep-dives/.239516)

**Lecture pour DreamWeave :** ce panel valide, côté marché anglophone et sans même mentionner l'IA, que la cadence de production webtoon est un goulot d'étranglement reconnu par l'industrie. Argument de positionnement réutilisable : DreamWeave ne vend pas « l'IA » comme feature en soi, mais la résolution de ce problème de cadence — le retour de ce panel (dès le 25/07) est à surveiller pour du contenu marketing réactif.

### Sources rejetées explicitement (hors fenêtre)

Manifeste français #ComicsSansIA (8-9 janvier 2026), interdiction de l'art IA au Comic-Con Art Show (décision de janvier 2026), programme de traduction IA WEBTOON CANVAS (26 mars 2026) — pistes pertinentes mais sans développement daté dans la fenêtre du 24/06-24/07, donc écartées.

### Sentiment communautaire

Aucun signal Reddit, Product Hunt, Discord ou X daté précisément dans la fenêtre n'a pu être identifié pour les outils cibles. Les critiques récurrentes remontées par la recherche généraliste (continuité visuelle instable, expressions faciales figées, absence de génération de script chez ComicsMaker.ai, exclusivité du tier gratuit Dashtoon) sont non datées ou antérieures à la fenêtre — écartées conformément à la règle de sourcing stricte plutôt que présentées comme finding du mois. À creuser dans un prochain audit avec des requêtes `site:reddit.com`/Product Hunt ciblées sur les lancements mi-2026.

---

## 2. 🛠️ Technical Audit

| Axe | Score /10 | Justification |
|---|---|---|
| **Qualité du code** | **7,5** | 207 fichiers `.ts`/`.tsx` (47 262 lignes). `grep TODO\|FIXME\|HACK\|XXX` → 0 résultat. `grep ": any\|as any"` → 0 résultat. `npx tsc --noEmit` → 0 erreur. Point faible : complexité concentrée dans quelques god-files — `src/pages/ChapterDetail.tsx` (3174 lignes), `src/components/project/LoreGraphView.tsx` (2196 lignes), `src/pages/ScenarioChapterEditor.tsx` (1937 lignes). 8 `console.log` résiduels (non bloquant). |
| **Architecture** | **7** | Flux `types → integrations/supabase → services → hooks → components → pages` respecté, 14 Edge Functions isolées par responsabilité. Point de dette structurel : `TIER_CONFIG` est **dupliqué** entre `src/types/index.ts` (client) et `supabase/functions/_shared/tierConfig.ts` (serveur Deno, qui ne peut pas importer du code client). Un test dédié `src/test/tierConfigSync.test.ts` compare champ à champ les deux objets — bon garde-fou, mais la duplication reste une fragilité structurelle à surveiller à chaque évolution de tier. |
| **Performance & scalabilité** | **7** | Migration `20260627120000_audit_hardening_rls_indexes.sql` ajoute des index manquants sur les FK filtrées fréquemment (`idx_assets_project`, `idx_chapters_project`, `idx_chapter_canvases_chapter`). `consume_image_credit()` (`20260627130000_atomic_credit_consumption.sql`) utilise `pg_advisory_xact_lock` pour sérialiser la consommation de crédits et éviter le dépassement de quota en cas de requêtes concurrentes. Le canvas chapitre (jusqu'à 100 000px) reste un point de vigilance mémoire/rendu non mesurable statiquement — aucune preuve de virtualisation trouvée, comme lors des audits précédents. |
| **Sécurité** | **8,5** | RLS activée sur 49 fichiers de migration, 12 contiennent explicitement `ROW LEVEL SECURITY`. `grep service_role` confirme une absence totale dans `src/` (uniquement dans les Edge Functions, où c'est attendu). Durcissement récent vérifié : `WITH CHECK (auth.uid() = user_id)` ajouté sur `projects`, `assets`, `chapters`, `chapter_canvases`, `scenario_chapters`, `scenario_versions`, correction d'une policy `narramind_missing_assets` sans `WITH CHECK`. `profiles.plan` verrouillé côté client par deux migrations dédiées (`20260702120000`, `20260702130000`), cohérent avec la règle « seul `stripe-webhook` peut modifier le plan ». |
| **Dette technique** | **6,5** | Zéro TODO/FIXME, mais trois dettes concrètes : (1) duplication `TIER_CONFIG` (voir Architecture) ; (2) `allowLongMemory` toujours déclaré mais **non consommé nulle part** en dehors du test de sync — flag mort confirmé pour la 3ᵉ fois consécutive ; (3) 119 couleurs hex codées en dur dans `src/**/*.tsx`, majoritairement légitimes (icônes SVG, `<input type="color">` des color pickers) mais qui violent littéralement la règle « ne jamais hardcoder de couleurs » sans distinction de contexte dans le linting actuel. |

**Moyenne technique ≈ 7,3/10.** Base saine et stable (0 `any`, 0 TODO, RLS activement durcie ces dernières semaines) : la dette est concentrée et identifiée plutôt que diffuse. Aucune régression depuis le 22/07 (code inchangé) ; les points de vigilance restent la duplication `TIER_CONFIG`, la taille de `ChapterDetail.tsx`/`LoreGraphView.tsx`/`ScenarioChapterEditor.tsx`, et la scalabilité non prouvée du canvas long.

---

## 3. 📦 Product Audit

**Cohérence tiers/positionnement : confirmée.** `src/types/index.ts` (lignes 25-62) montre le modèle exact documenté : Libre (20 crédits, 0€), Créateur (100 crédits, 12,99€), Studio (250 crédits, 29,99€), avec `allowReferenceImages`/`allowScenarioAI`/`allowFullExport` identiques sur les trois tiers et `model: "flux-2-pro"` partout. `allowLongMemory` reste un flag mort (non consommé), comme documenté dans CLAUDE.md.

**Menu Univers : implémentation substantielle et fidèle à l'ADN v1.** `LoreGraphView.tsx` (2196 lignes, `@xyflow/react`) porte la cartographie ; `useLoreNodes`/`useLoreEdges` gèrent la saisie ; `useArianeLoreProposals.ts` (1105 lignes) + `LoreUniversProposalsSheet` portent le pilier « amélioration continue » adossé à NarraMind Compass. Point à surveiller sans être un problème aujourd'hui : une fonction `computeChronoLayout()` (~ligne 695) propose un mode de layout « Chronologique — axe X = timeline des Événements » — c'est un mode de disposition du graphe parmi d'autres (comme « Hub & Spoke »), pas une feature timeline dédiée, donc formellement conforme à la règle « Univers ≠ frise chronologique ». Le vocabulaire interne (« timeline », « Chronologique ») mérite néanmoins d'être suivi pour éviter une dérive future vers une visualisation temporelle dédiée hors scope v1.

**Sheet System bien intégré au flux réel** : `image_url_sheet` référencé dans `BlockToolbar.tsx`, `CharacterViewDialog.tsx`, `ScenarioTextHighlighter.tsx`, `ChapterDetail.tsx` et `services/storage.ts` — pas un champ isolé.

**Écarts doc/code** : aucun nouvel écart détecté au-delà du statut connu de `allowLongMemory`. Pas de trace de pipeline de publication vers plateformes de lecture externes (confirmé aussi côté UX ci-dessous).

> 📝 **Impact Mémoire** : aucune nouvelle décision structurante aujourd'hui (code inchangé depuis le 22/07). Point pertinent pour le mémoire : le statut de `allowLongMemory` illustre une démarche de gouvernance produit — feature vendue commercialement puis retirée de l'offre le 27/06 après audit, plutôt que développée précipitamment pour honorer une promesse commerciale.
> **Section concernée** : Modèle économique / Gouvernance produit.
> **Proposition** : « L'audit du 27/06/2026 a révélé un écart entre l'offre commerciale (mémoire narrative longue, priorité FAL.ai) et l'implémentation réelle. Décision : retrait immédiat de ces promesses plutôt que développement précipité, avec conservation du flag technique `allowLongMemory` pour une implémentation future si jugée prioritaire — exemple de discipline produit à documenter dans le mémoire. »

---

## 4. 🎨 UX / UI Audit

**Parcours principal fluide** : `ProjectDetail.tsx` structure le parcours en `TabsContent` (`style`, `assets`, `scenario`, `edition`, `parametres`, `test`), conforme à l'enchaînement Style → Assets → Scénario → Éditeur.

**Design system majoritairement respecté** : 108 fichiers utilisent `.glass`, 114 occurrences de `gradient-primary`/`text-gradient`. Aucune occurrence réelle d'Inter (les seuls matchs `grep` sont des faux positifs `setInterval`/`refetchInterval`). Zéro copy AI-slop (« seamless/unleash/next-gen/revolutionize/game-changing/cutting-edge »).

**⚠️ Violation confirmée de la règle « zéro tolérance em-dash »** : contrairement à la lecture de l'audit du 22/07 (qui concluait que les em-dash étaient quasi exclusivement en commentaires de code), l'audit d'aujourd'hui identifie des occurrences dans du **copy utilisateur réel affiché** : `src/components/ariane/ArianeOnboardingCard.tsx:355`, `src/components/ariane/ArianeContinuityPanel.tsx:182` et `:294`, `src/components/admin/PlanDistributionChart.tsx:78`, `src/components/admin/GlobalKPICards.tsx:154`, `src/components/admin/UserDetailDrawer.tsx:214`. Une partie des 273 occurrences totales reste légitime (placeholders `"—"` pour valeur absente dans les tableaux admin), mais les six citées sont de la ponctuation de phrase — un AI-tell explicitement interdit par `.claude/skills/taste-skill/SKILL.md`. **Nouveau finding, à corriger.**

**Points de friction** : couverture correcte des états vides (35 fichiers). En revanche, le composant `Skeleton` n'est utilisé que dans **1 seul fichier** (`GlobalKPICards.tsx`, dashboard admin) — le parcours créateur principal (bibliothèque d'assets, scénario, édition) semble reposer sur des spinners génériques (`Loader2`) plutôt que des skeletons progressifs, ce qui dessert légèrement la promesse « génération en quelques secondes ».

**Comparaison au benchmark (section 1)** : confirmation que l'absence de pipeline de publication vers des plateformes de lecture externes (Webtoon, Tapas, LINE) reste d'actualité (`grep` sur `src/` et `supabase/functions/` → 0 résultat), écart déjà signalé lors des audits précédents face à Dashtoon/COMICPAD, non résorbé.

---

## 5. 💡 Improvement Suggestions

### 🗑️ Removals
- **Trancher `allowLongMemory`** (implémenter ou retirer de `TIER_CONFIG` + `tierConfigSync.test.ts`) — flag mort confirmé pour la 3ᵉ fois consécutive, dette qui ne se résorbe pas d'elle-même.
- **Auditer les fonctions `SECURITY DEFINER` plus anciennes** pour confirmer `SET search_path = public` partout (patch appliqué à `match_embeddings`, statut ailleurs non reconfirmé aujourd'hui — recommandation reconduite).

### ⚡ Optimizations
- **Corriger les 6 violations em-dash identifiées** dans du copy utilisateur réel (`ArianeOnboardingCard.tsx`, `ArianeContinuityPanel.tsx` ×2, `PlanDistributionChart.tsx`, `GlobalKPICards.tsx`, `UserDetailDrawer.tsx`) — règle « zéro tolérance » du design system, correction rapide et peu risquée.
- **Dédupliquer ou fiabiliser `TIER_CONFIG`** (client vs `_shared/tierConfig.ts` serveur) — le test de sync protège aujourd'hui, mais une source unique générée réduirait le risque à zéro plutôt que de le détecter après coup.
- **Étendre les skeleton loaders** au parcours créateur principal (bibliothèque d'assets, scénario, édition), aujourd'hui limités au dashboard admin — améliore la perception de vitesse.
- **Virtualiser le canvas de l'éditeur** (windowing des blocs/bulles hors viewport) — risque de scalabilité confirmé une nouvelle fois, aucune preuve de virtualisation trouvée. **⚠️ Zone canvas freezée : nécessite l'accord explicite de Louis avant toute implémentation.**
- **Découper les 3 god-files** : `ChapterDetail.tsx` (3174 lignes), `LoreGraphView.tsx` (2196 lignes), `ScenarioChapterEditor.tsx` (1937 lignes).
- **File d'attente asynchrone pour la génération d'asset** (pipeline séquentiel actuel, 30-90s/génération d'après les audits précédents) pour rapprocher l'expérience de la promesse « génération en secondes ».

### ➕ Additions
- **Pipeline d'export/publication vers plateformes de lecture** (Webtoon, Tapas, LINE) — écart confirmé une nouvelle fois face à Dashtoon/COMICPAD, non résorbé depuis plusieurs audits.
- **Contenu marketing réactif au panel SDCC « High-Speed Webtoon Production »** (25 juillet) — opportunité d'aligner le messaging DreamWeave sur un problème de cadence de production validé par l'industrie indépendamment de l'IA. Source : [Anime News Network, 2026-07-13](https://www.animenewsnetwork.com/news/2026-07-13/san-diego-comic-con-2026-to-feature-webtoon-creator-panels-industry-deep-dives/.239516).
- **Explorer un mode exploration/dialogue d'univers côté lecteur**, adossé au menu Univers déjà câblé — le marché continue de valider ce format via Naver byUs. *(À cadrer strictement contre l'ADN Univers v1 — cartographie + amélioration, PAS timeline/planification/conversationnel type Kaon AI.)*

---

## 6. 🚀 Launch Status

**Contexte** : tourne en local et/ou sur Vercel, pas encore annoncé publiquement. Code inchangé depuis le 22/07 — les scores techniques restent stables (sécurité 8,5/10, architecture 7/10). Aucune régression, mais aucun progrès non plus sur les blocages connus.

**Bloqueurs identifiés :**
- **Go-to-market (P0)** : aucune présence publique identifiée dans cette recherche (pas de landing détectée, pas de compte réseaux). Bloqueur principal, inchangé.
- **Technique (P1)** : scalabilité du canvas long non validée sous charge réelle ; pipeline de génération d'asset séquentiel (30-90s) ; duplication `TIER_CONFIG` client/serveur.
- **Produit/Polish (P2)** : `allowLongMemory` toujours non tranché ; **nouvelle violation em-dash identifiée dans du copy réel** (6 occurrences, correction rapide) ; skeleton loaders quasi absents du parcours créateur.

**Checklist de lancement priorisée :**
1. **[P0]** Landing d'acquisition + waitlist en ligne — rien ne bouge tant que ce point n'est pas traité.
2. **[P0]** Test de charge du canvas éditeur sur chapitre long (dizaines de blocs/bulles).
3. **[P0]** Vérifier vars d'env prod (Supabase/FAL.ai/Stripe) + webhook Stripe en mode live.
4. **[P1]** Corriger les 6 violations em-dash dans le copy réel (rapide, faible risque).
5. **[P1]** Trancher `allowLongMemory` (implémenter ou retirer du type).
6. **[P1]** File d'attente asynchrone pour la génération d'asset.
7. **[P2]** Découpage des 3 god-files (`ChapterDetail.tsx`, `LoreGraphView.tsx`, `ScenarioChapterEditor.tsx`) ; couverture de tests élargie.
8. **[P2]** Pipeline d'export/publication vers plateformes de lecture (écart vs Dashtoon/COMICPAD, non résorbé).

---

## 7. 📣 Marketing Plan

**Posture actuelle** : aucune présence publique identifiée. Priorité inchangée : construire une audience avant lancement, créneau « crée ton webtoon sans savoir dessiner », cible créateurs FR d'abord.

| Tâche | Priorité | Effort |
|---|---|---|
| Landing d'acquisition + waitlist (capture email, démo visuelle Style→Assets→Scénario→Éditeur) | **Haute** | Medium |
| Créer les comptes réseaux (Instagram + TikTok + X) | **Haute** | Quick |
| Teaser vidéo de concept (30-45s : « d'une idée à un chapitre webtoon en quelques minutes ») | **Haute** | Medium |
| Positionner **cohérence de personnage / Sheet System** au centre du messaging (critère d'achat #1 du marché) | **Haute** | Quick |
| Contenu réactif au panel SDCC « High-Speed Webtoon Production » (25/07) — angle « cadence de production », pas « IA » | Moyenne | Quick |
| Préparer un lancement Product Hunt (assets, tagline, commentaires early) | Moyenne | Medium |
| Série de posts « build in public » (avancées, coulisses IA) | Moyenne | Long |
| Cibler les communautés créateurs FR (Discord webtoon/manga, r/webtoons) sans approche spam | Moyenne | Medium |
| SEO de contenu : « comment créer un webtoon sans dessiner » | Basse | Long |

---

## 📌 TL;DR

- **Code inchangé depuis le 22/07** (commit `ee49cac`) — scores techniques stables (~7,3/10 en moyenne, sécurité 8,5/10 et architecture 7/10 restent les points forts). Aucune régression, mais les blocages connus (canvas non virtualisé, `TIER_CONFIG` dupliqué, `allowLongMemory` mort) persistent sans arbitrage.
- **Nouveau finding notable** : violation confirmée de la règle « zéro tolérance em-dash » dans du copy utilisateur réel (6 occurrences précises, hors placeholders légitimes) — contredit la lecture plus optimiste de l'audit du 22/07, correction rapide à planifier.
- **Concurrence directe toujours silencieuse** (2ᵉ jour consécutif sans annonce datée pour ComicsMaker.ai/Dashtoon/Scenario.gg/COMICPAD/Jenova) ; Naver WEBTOON (byUs) et Kaon AI (60M$, forte traction conversationnelle) restent les dossiers coréens les plus solides, sur un créneau distinct (contenu conversationnel) de celui de DreamWeave (outil de production).
- **Signal marché à exploiter** : panel SDCC du 25/07 sur la production webtoon à haute cadence — valide, indépendamment de l'IA, le problème que DreamWeave résout. Angle marketing réactif à préparer.
- **Aucune présence publique détectée** — le gap go-to-market reste le bloqueur P0 numéro un avant tout lancement. Prochaines actions : (1) landing + waitlist, (2) correction em-dash, (3) test de charge canvas, (4) trancher `allowLongMemory`.
