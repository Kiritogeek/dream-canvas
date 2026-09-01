# 🔍 Audit Quotidien DreamWeave — 2026-07-22

*Audit automatisé complet. Branche `pre-production` · commit `ee49cac` · read-only. Sources benchmark : juin-juillet 2026 uniquement (< 30 jours), sauf mention contraire signalée.*

---

## 1. 🔍 Benchmark & Competitive Intelligence

> Fenêtre de recherche : 22 juin – 22 juillet 2026. Les sources non datables dans cette fenêtre ont été écartées (plusieurs pistes concurrentes pertinentes — localisation IA WEBTOON, partenariat WEBTOON x Genies — ont été rejetées car antérieures à la fenêtre).

### Le mouvement du mois : Naver WEBTOON confirme son virage IA côté consommation

**byUs — AI Story Chat**, lancé début juillet, laisse les lecteurs dialoguer avec des personnages et co-développer des histoires (modes « original » et « fan story ») mais **uniquement sur IP approuvées par les créateurs** — positionnement explicite contre les controverses copyright/contenu explicite des générateurs non licenciés.
Source : [Anime News Network, 2026-07-11](https://www.animenewsnetwork.com/news/2026-07-11/webtoon-launches-ai-story-chat-service-byus-featuring-creator-approved-webtoon-ip/.239448) · [Malay Mail, 2026-07-01](https://www.malaymail.com/amp/news/life/2026/07/01/naver-webtoon-launches-ai-story-chat-that-lets-fans-step-into-creatorapproved-webtoon-worlds/225948)

Reporting confirme que l'expansion des fonctions IA sociales/personnages (Character Chat) est une priorité stratégique affichée pour Naver WEBTOON.
Source : [Sedaily, 2026-06-20](https://en.sedaily.com/technology/2026/06/20/naver-webtoon-joins-ai-chat-race-after-character-chat)

**Lecture pour DreamWeave :** le leader du marché mise sur l'IA côté *lecture/exploration d'univers*, pas sur la *production* pour créateurs indépendants — le créneau de DreamWeave reste distinct. Mais le thème « explorer/prolonger un univers narratif » est validé par le marché, ce qui recoupe exactement l'ADN du menu Univers de DreamWeave (cartographie + amélioration continue).

### Normalisation institutionnelle de l'IA webtoon

La ville d'Icheon (Corée) a lancé un **concours officiel de webtoons générés par IA** (soumissions 8 juillet – 14 août, 20 cases max, sujet : une figure historique locale) — signe que la création IA de webtoons entre dans des cadres institutionnels/civiques, pas seulement startups.
Source : [Anime News Network, 2026-07-11](https://www.animenewsnetwork.com/news/2026-07-11/icheon-city-government-launches-ai-generated-webtoon-contest/.239518)

### Financement adjacent

**Kaon AI (Emochi/FlowGPT)** a levé **60 M$ en Série C** pour sa plateforme de storytelling/chat IA (2 M DAU, 45 M$ ARR), menée par B Capital. Pas un concurrent direct (pas de génération d'images comic), mais confirme l'appétit investisseur pour l'IA narrative/personnages — un espace adjacent au menu Univers de DreamWeave.
Source : [SiliconAngle, 2026-07-08](https://siliconangle.com/2026/07/08/kaon-ai-raises-60m-build-next-generation-ai-driven-interactive-entertainment/)

### Concurrents directs (production assistée) — gap de sourcing signalé

Aucune annonce datable dans la fenêtre courante n'a été trouvée pour les concurrents de production directe habituels (ComicsMaker.ai, Dashtoon, Scenario.gg, COMICPAD, Jenova). Le contenu « 2026 » disponible sur ces outils est soit du marketing evergreen non daté, soit antérieur à la fenêtre (ex. dernière MAJ substantielle ComicsMaker.ai tracée au 7 mai 2026). **Gap honnête plutôt que remplissage avec du contenu daté** — à surveiller la semaine prochaine.

### Sentiment communautaire

Aucun fil Reddit/Product Hunt/X daté et spécifique aux concurrents nommés n'a pu être identifié dans la fenêtre courante (recherches `site:reddit.com` et Product Hunt infructueuses sur des posts individuellement datés). Le signal généraliste (non daté avec précision) confirme que la **cohérence des personnages** reste la frustration #1, avec un sentiment glissant de « quasi impossible » à « exploitable » grâce aux avancées LoRA/référence-image de fin 2025-2026 — cohérent avec les audits précédents mais non citable comme finding du mois strict.

---

## 2. 🛠️ Technical Audit

| Axe | Score /10 | Justification (fichiers cités) |
|---|---|---|
| **Qualité du code** | **7,5** | 0 `any` dans `src/` (grep), 0 TODO/FIXME/HACK — hygiène réelle, cohérente avec la règle « commenter seulement si le WHY est non-évident » (ex. commentaire sur les clés additives `sfxBlocks`/`systemBlocks` dans `PanelLayout`, `types/index.ts`). Point faible : `src/pages/ChapterDetail.tsx` (3174 lignes) reste un composant god-object mêlant état, drag, dialogues, undo/redo et rendu — l'absence d'abstraction prématurée a dérivé vers une absence d'abstraction tout court sur l'éditeur principal. Les littéraux hex trouvés dans `DreamWeaveColorPicker.tsx` (`#ffffff`, `#ef4444`, dégradés de teinte) sont légitimes — contenu du color-picker, pas du chrome UI codé en dur. |
| **Architecture** | **8** | Couches `types → integrations → services → hooks → components → pages` réelles et respectées : `types/index.ts` ré-exporte proprement les types générés Supabase ; `services/panels.ts` reste pur (aucun React) ; `useUserPlan.ts` importe `computeUsagePeriodStart` depuis un module partagé (`@fn-shared/usagePeriod`) **également utilisé côté serveur** — garantit que le quota affiché correspond au quota appliqué, un vrai bon pattern de cohérence cross-boundary. `App.tsx` lazy-load toutes les routes via `lazyWithReload`, qui récupère gracieusement des chunks périmés post-déploiement. Déduction : `ChapterDetail.tsx` absorbe trop d'orchestration qui devrait vivre dans des hooks dédiés. |
| **Performance & scalabilité** | **6,5** | React Query configuré avec des `staleTime` sensés (30s global, 60s plan, 30s usage) — évite les tempêtes de refetch. Risque réel confirmé : `chapter_canvases` stocke une ligne JSONB par chapitre pouvant contenir des centaines de blocs/bulles pour un canvas jusqu'à 100 000px (`PANEL_HEIGHT_MAX`) — **aucune preuve de virtualisation** pour les blocs hors écran. La génération d'image est **séquentielle** (`generate-asset-image` : génération du visage bloquante, puis `waitForFaceUrl` poll jusqu'à 5x avant la génération de la fiche) — pas de file d'attente serveur, 30-90s par génération d'après `useAssetGeneration.ts`. Point positif : réservation de crédit atomique (`reserveImageCredit`/`refundImageCredit`, migration `20260627130000_atomic_credit_consumption.sql`). `createPanel` appelle `fetchPanels` juste pour calculer le prochain `panel_number` — aller-retour évitable à chaque création de case. |
| **Sécurité** | **8,5** | RLS prise au sérieux et durcie de façon itérative : `20260627120000_audit_hardening_rls_indexes.sql` ajoute `WITH CHECK (auth.uid() = user_id)` sur les policies UPDATE (empêche la réassignation de `user_id`), et corrige `narramind_missing_assets` qui avait un `FOR ALL` sans `WITH CHECK`. `profiles.plan` verrouillé par migrations dédiées (`20260702120000`, `20260702130000`) — seul `stripe-webhook` (service role) peut le modifier, confirmé : `useUserPlan.ts` ne l'écrit jamais côté client. `stripe-webhook/index.ts` vérifie la signature via `constructEventAsync` avant tout traitement, et documente explicitement « ne jamais écrire un plan deviné ». `generate-asset-image/index.ts` vérifie le JWT via `/auth/v1/user`, contrôle `asset.user_id !== userId` et `projRow.user_id !== userId` (anti-IDOR même avec accès service-role à la DB). 0 occurrence de `service_role`/`SUPABASE_SERVICE_ROLE_KEY` dans `src/`. Point de vigilance : validation des payloads Edge Functions plutôt superficielle (présence/format UUID, pas de contrôle de longueur/contenu de prompt au-delà des filtres FAL) ; `match_embeddings` a nécessité un patch tardif `SET search_path = public`, suggérant que d'anciennes fonctions `SECURITY DEFINER` mériteraient une vérification ponctuelle. |
| **Dette technique** | **6,5** | `allowLongMemory` confirmé mort — défini dans `TIER_CONFIG`, testé (`tierConfigSync.test.ts`) mais **consommé nulle part**, cohérent avec la décision d'audit du 2026-06-27. Couverture de tests faible : **un seul** fichier de test trouvé dans `src/test/` — aucun test sur les hooks, services, ou la logique de layout du canvas (`insertVerticalBreathing`, clamps de hauteur), un vrai risque vu la complexité de cette logique. `ChapterDetail.tsx` (3174 lignes) est le plus gros poste de dette — accumulation continue (undo/redo, SFX, blocs système) sans plan de refactor, d'autant que la zone canvas est freezée et ne peut pas être retouchée incidemment. Le renommage historique `panels` → `chapter_canvases` laisse une incohérence résiduelle : le type `Panel` (`types/index.ts`) est un alias de `Tables<"chapter_canvases">`, un décalage nom-de-type/nom-de-table qui subsiste dans tout le code consommateur. |

**Moyenne technique ≈ 7,5/10.** Sécurité et architecture restent les points forts. Le risque principal reste, comme lors des audits précédents, la scalabilité du canvas éditeur (cœur produit) — non résolu depuis les audits de la semaine passée.

---

## 3. 📦 Product Audit

**Cohérence features ↔ positionnement : élevée.** `TIER_CONFIG` (`types/index.ts`) confirme le modèle « tout gratuit, différenciation par crédits » dans le code : `allowReferenceImages`, `allowScenarioAI`, `allowFullExport` identiques sur les trois plans, `model: "flux-2-pro"` partout, seul `maxGenerationsPerMonth` varie (20/100/250).

**Univers v1 : implémentation substantielle, loin du stade de stub.** `LoreGraphView.tsx` est une implémentation React Flow complète (nœuds custom par `LoreNodeType`, connexions drag-to-connect, `useLoreNodes`/`useLoreEdges`, `LoreNodeSheet`), avec `useArianeLoreProposals` et `LoreUniversProposalsSheet` câblant le flux de propositions Ariane, adossé à NarraMind Compass (`compass_proposals`, `useCompassProposals.ts`, `useCompassIndex.ts`). Dans `ProjectDetail.tsx`, un commentaire confirme que l'onglet Univers n'est jamais l'onglet par défaut (lazy-loadé), cohérent avec l'intention produit. Aucune UI de type timeline trouvée — respecte bien la règle « Univers ≠ frise chronologique ».

**Sheet System bien câblé de bout en bout** : `image_url_sheet`, `image_url_profile_left/right`, `image_url_back` référencés dans les types, `AssetCard.tsx` et `CharacterViewDialog.tsx` — pas une promesse en l'air.

**Écart doc/code à signaler :** le modèle de types pour les blocs (blocs SFX, blocs système avec variantes façon notification RPG, 13 types de bulles, 9 formes de clip-path) est nettement plus large que la description CLAUDE.md (« blocs image + blocs couleur + bulles »). Les blocs SFX et système sont entièrement modélisés et rendus (`SfxLayer.tsx`, `SystemBlockLayer.tsx`) mais absents de la doc — soit du scope creep non documenté, soit une doc en retard sur l'éditeur livré.

> 📝 **Impact Mémoire** : le menu Univers (cartographie par graphe de lore + Ariane/Compass) est confirmé fonctionnellement livré et intégré, pas au stade de stub — cohérent avec les constats des audits précédents. À date, la doc produit ne mentionne toujours pas les blocs SFX et blocs système de l'éditeur, pourtant entièrement implémentés.
> **Section concernée** : Fonctionnalités / Éditeur.
> **Proposition** : « L'éditeur de case prend en charge, en plus des blocs image/couleur/bulles, des blocs SFX et des blocs système (notifications façon RPG), déjà en production. »

---

## 4. 🎨 UX / UI Audit

**Parcours principal structuré et gardé.** `ProjectDetail.tsx` utilise un seul composant `Tabs` avec un objet `accessible[]` qui bloque l'accès à un onglet tant que les prérequis ne sont pas remplis — empêche un utilisateur d'atterrir dans l'Éditeur sans style ni assets, un bon réflexe anti-friction pour des créateurs sans compétence illustration.

**Discipline design system confirmée par grep.** Les classes `.glass`/`gradient-primary`/`text-gradient` sont réellement utilisées (11 occurrences rien que dans `ScenarioSection.tsx`), aucun pattern `bg-[#...]`/`from-[#...]` hex-en-dur dans les classes Tailwind, `Inter` absent de tout `src/`. `tailwind.config.ts` mappe correctement `font-display` → Quicksand et `font-body` → Nunito. Les hex littéraux trouvés (23 fichiers `.tsx`) sont légitimes : valeurs par défaut de contenu canvas (remplissage de bloc couleur, couleurs de bulles), pas du chrome UI. Aucune occurrence de "Seamless/Unleash/Next-Gen/Revolutionize" (ni équivalents FR) dans `src/`. Les occurrences d'em-dash relevées (49 fichiers) sont quasi exclusivement dans des commentaires de code, pas dans du copy utilisateur affiché — la règle anti-em-dash semble tenue sur l'échantillon vérifié, sans balayage exhaustif de toutes les chaînes.

**Points de friction :**
- **États vides/chargement minimalistes.** `AssetLibrary.tsx` n'a que 2 chaînes d'état vide et des spinners (`Loader2`) sans skeleton loader — fonctionnel mais frustre potentiellement la promesse « génération en quelques secondes » en ne montrant pas de retour progressif.
- **`canGenerate()` bien vérifié avant tout appel FAL.ai** (`useAssetGeneration.ts`), conforme à la checklist non-négociable de CLAUDE.md.
- **Couplage fort dans `ProjectDetail.tsx`** : tout le workspace projet vit derrière un seul `Tabs`, avec du state remonté (`generatingAssetId`, `pendingAssetName`, `pendingAssetType` passés en props à `AssetLibrary`) — pratique pour partager l'état, mais complique le test isolé des sections et la granularité du lazy-loading à mesure que l'éditeur grossit.
- **Zone canvas freezée** : stabilité assurée, mais toute amélioration UX du cœur produit (drag, bulles, blocs) reste bloquée sans accord explicite de Louis.

**Comparaison au benchmark (section 1) :** aucun concurrent de production directe n'a pu être vérifié avec une source datée ce mois-ci pour comparer précisément le pipeline UX — signal cohérent avec les audits précédents qui identifiaient l'absence de pipeline de publication vers plateformes de lecture (WEBTOON/Tapas/GlobalComix) comme écart principal face à Dashtoon/COMICPAD. Rien dans cette fenêtre n'indique que cet écart s'est résorbé.

---

## 5. 💡 Improvement Suggestions

### 🗑️ Removals
- **Retirer `allowLongMemory` du type `TIER_CONFIG`** (et son test de sync) tant que la feature n'est pas implémentée — dette de code confirmée à nouveau ce jour. *(Dette interne, pas de source requise.)*
- **Auditer les fonctions `SECURITY DEFINER` plus anciennes** pour vérifier la présence de `SET search_path = public` (patch appliqué à `match_embeddings` mais pas confirmé ailleurs).

### ⚡ Optimizations
- **Virtualiser le canvas de l'éditeur** (windowing des blocs/bulles hors viewport) — risque de scalabilité confirmé une nouvelle fois (canvas jusqu'à 100 000px, aucune preuve de virtualisation). **⚠️ Zone canvas freezée : nécessite l'accord explicite de Louis avant toute implémentation.**
- **Découper `ChapterDetail.tsx` (3174 lignes)** en sous-composants/hooks dédiés.
- **Réduire la latence de génération d'asset** : passer d'un pipeline séquentiel (`waitForFaceUrl` poll jusqu'à 5x, 30-90s) à une file d'attente asynchrone avec notification, pour rapprocher l'expérience de la promesse « génération en secondes ».
- **Éviter l'appel `fetchPanels` redondant dans `createPanel`** (calcul du `panel_number` uniquement).

### ➕ Additions
- **Explorer un mode exploration/dialogue d'univers côté lecteur**, adossé au menu Univers déjà câblé (graphe de lore + Ariane) — le marché vient de valider ce format via Naver byUs (1er juillet 2026). Source : [Anime News Network, 2026-07-11](https://www.animenewsnetwork.com/news/2026-07-11/webtoon-launches-ai-story-chat-service-byus-featuring-creator-approved-webtoon-ip/.239448). *(À cadrer strictement contre l'ADN Univers v1 — cartographie + amélioration, PAS timeline/planification.)*
- **Documenter et exposer publiquement `generate-cover-image`/`CoverEditor`** s'ils sont bien livrés (à confirmer — non couverts par l'agent produit de ce jour, à vérifier dans l'audit de demain).
- **Étudier un format concours/showcase communautaire** dans l'esprit du concours webtoon IA d'Icheon (8 juillet – 14 août) — un signal que ce type d'initiative génère de l'engagement mainstream. Source : [Anime News Network, 2026-07-11](https://www.animenewsnetwork.com/news/2026-07-11/icheon-city-government-launches-ai-generated-webtoon-contest/.239518).

---

## 6. 🚀 Launch Status

**Contexte :** tourne en local et/ou sur Vercel, pas encore annoncé publiquement. Sécurité (8,5/10) et architecture (8/10) solides ; scalabilité de l'éditeur (6,5/10) reste le point de vigilance principal, non résolu depuis les audits précédents.

**Bloqueurs identifiés :**
- **Technique (P1) :** scalabilité du canvas long non validée sous charge réelle (pas de virtualisation confirmée) ; pipeline de génération d'asset séquentiel (30-90s par génération).
- **Produit (P2) :** `allowLongMemory` toujours typé mais non livré ; blocs SFX/système non documentés côté produit.
- **Go-to-market (P0) :** aucune présence publique identifiée dans cette recherche (pas de landing, pas de compte réseaux détecté).

**Checklist de lancement priorisée :**
1. **[P0]** Test de charge du canvas éditeur sur chapitre long (dizaines de blocs/bulles).
2. **[P0]** Vérifier vars d'env prod (Supabase/FAL.ai/Stripe) + webhook Stripe en mode live.
3. **[P0]** Landing d'acquisition + waitlist en ligne.
4. **[P1]** Trancher `allowLongMemory` (implémenter ou retirer du type) ; documenter blocs SFX/système.
5. **[P1]** File d'attente asynchrone pour la génération d'asset (réduire la latence perçue).
6. **[P2]** Découpage de `ChapterDetail.tsx` ; couverture de tests sur hooks/services critiques.
7. **[P2]** Pipeline d'export/publication vers plateformes de lecture (écart vs Dashtoon/COMICPAD, non résorbé).

---

## 7. 📣 Marketing Plan

**Posture actuelle :** aucune présence publique identifiée dans cette recherche. Priorité : construire une audience avant le lancement public, sur le créneau « crée ton webtoon sans savoir dessiner », cible créateurs FR d'abord.

| Tâche | Priorité | Effort |
|---|---|---|
| Landing d'acquisition + waitlist (capture email, démo visuelle Style→Assets→Scénario→Éditeur) | **Haute** | Medium |
| Créer les comptes réseaux (Instagram + TikTok + X) — format webtoon = naturellement visuel | **Haute** | Quick |
| Teaser vidéo de concept (30-45s : « d'une idée à un chapitre webtoon en quelques minutes ») | **Haute** | Medium |
| Positionner le **Sheet System / cohérence de personnage** au centre du messaging (critère d'achat #1 du marché selon les audits précédents) | **Haute** | Quick |
| Préparer un lancement Product Hunt (assets, tagline, commentaires early) | Moyenne | Medium |
| Explorer un format concours/showcase communautaire (inspiré du concours Icheon, juillet 2026) | Moyenne | Medium |
| Série de posts « build in public » (avancées, coulisses IA) | Moyenne | Long |
| Cibler les communautés créateurs FR (Discord webtoon/manga, r/webtoons) sans approche spam | Moyenne | Medium |
| SEO de contenu : « comment créer un webtoon sans dessiner » | Basse | Long |

---

## 📌 TL;DR

- **Aucune évolution de posture concurrentielle majeure vs l'audit du 21/07** : Naver WEBTOON confirme son virage IA côté lecteur (byUs, 1er juillet) et la ville d'Icheon lance un concours IA officiel (8 juillet) — deux signaux de normalisation mainstream de l'IA webtoon, sans nouveau concurrent direct daté ce mois-ci sur la production assistée.
- **Techniquement stable (~7,5/10)** : sécurité et architecture restent les points forts (8-8,5/10). **Le risque de scalabilité du canvas éditeur persiste** — non résolu depuis les audits précédents, toujours sans virtualisation confirmée. ⚠️ Toute optimisation touche la zone freezée → accord de Louis requis.
- **Univers v1 confirmé fonctionnellement livré** (cartographie + Ariane/Compass) — cohérent avec les constats antérieurs. Nouveau point : les **blocs SFX/système de l'éditeur ne sont toujours pas documentés** côté produit malgré une implémentation complète.
- **Aucune présence publique détectée** — le gap go-to-market reste le bloqueur principal avant tout lancement. Landing + waitlist restent la priorité absolue.
- **Prochaines actions :** (1) landing + waitlist ; (2) test de charge canvas ; (3) messaging centré cohérence personnage/Sheet System ; (4) trancher `allowLongMemory` et documenter les blocs SFX/système.
