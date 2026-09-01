# 🔍 Audit Quotidien DreamWeave — 2026-08-23

*Audit automatisé complet. Branche `pre-production` · commit `e9a57a7` (2026-08-22) · read-only. Sources benchmark : juillet–août 2026 uniquement (< 30 jours), sauf mention contraire signalée. Exécuté sans supervision (tâche planifiée) — aucune modification de code effectuée.*

---

## 1. 🔍 Benchmark & Competitive Intelligence

Comme au cycle précédent (2026-08-13), le mois reste pauvre en actualité datée sur les concurrents directs de production (Dashtoon, Komiko, Anifusion, Elser AI, Jenova...) : leur activité publique dans la fenêtre du 24/07 au 23/08 se limite à du contenu marketing non daté, écarté conformément à la règle des 30 jours. Trois signaux de marché confirmés et datés cette fois-ci :

**WEBTOON Entertainment (Nasdaq: WBTN) — le virage IA s'accélère côté distribution/IP.** Résultats Q2 2026 (call du 10/08, transcript publié 17-18/08) : l'outil **CutCut** (animation courte IA à partir d'IP officielle) a généré +136 % de nouveau contenu Canvas et +188 % de créateurs participants en une semaine ; extension de **BIAS-ON** (chat narratif IA, ex-byUs) au Japon ; bêta d'auto-traduction IA étendue aux créateurs Canvas. Toile de fond : croissance MAU quasi nulle (+0,5 % YoY, 156M MAU), d'où le pari IA + IP propre comme relais de croissance.
Sources : [The Motley Fool, 2026-08-17](https://www.fool.com/earnings/call-transcripts/2026/08/17/webtoon-wbtn-q2-2026-earnings-call-transcript/) · [Forbes, 2026-08-11](https://www.forbes.com/sites/robsalkowitz/2026/08/11/webtoons-growth-is-slowing-but-its-ambitions-are-growing/)

**San Diego Comic-Con applique concrètement son interdiction de l'art IA (édition 2026, fin juillet).** Règle appliquée à l'art show du salon : tout art « partiellement ou totalement » généré par IA est refusé. Signal de sentiment communautaire le plus solide de ce cycle : la défiance envers l'art IA reste vive dans une partie de la communauté créative BD/comics, même pour un usage partiel.
Source : [CGTN, 2026-07-25](https://newsus.cgtn.com/news/2026-07-25/San-Diego-Comic-Con-prohibits-AI-generated-art-1P31Xrh0Rhu/p.html)

**Midjourney — itération rapide sur le modèle et le workspace web.** V8.2 livré le 24/07 (rendu plus « bold »/personnalisé) et refonte notable de l'alpha web (réorganisation des projets/dossiers, restauration Upscale/Zoom/Vary) publiée le 20/08. Pas un concurrent direct du pipeline DreamWeave, mais un rappel que la barre qualité/organisation-projet des outils de génération d'images grand public continue de monter.
Source : [Midjourney changelog, 2026-08-20](https://updates.midjourney.com/changelog-8-20-26/)

**Sentiment communautaire :** toujours aucun fil Reddit/Product Hunt/X daté et vérifiable ce mois-ci sur des outils webtoon/manga IA nommés (recherches ciblées infructueuses — même limite qu'au 08-13). Le ban SDCC ci-dessus reste le seul proxy fiable de sentiment créateur pour ce cycle.

**Conclusion benchmark :** aucune menace nouvelle sur le créneau précis de DreamWeave (production assistée solo, cohérence de style, sans compétence d'illustration). À surveiller : tout lancement Dashtoon/Komiko/Jenova daté, et la trajectoire de défiance anti-IA illustrée par SDCC (pertinent si DreamWeave communique un jour vers des publics BD traditionnels).

---

## 2. 🛠️ Technical Audit

| Axe | Score /10 | Justification |
|---|---|---|
| **Qualité du code** | **5** ⬇️ *(8 le 08-13)* | Discipline de commentaires toujours respectée (WHY pas WHAT dans `types/index.ts`, `useUserPlan.ts`, `stripe-webhook/index.ts`), 0 `any` significatif. **Mais `npx tsc --noEmit --project tsconfig.app.json` échoue avec 110 erreurs sur 29 fichiers**, contre 0 erreur au dernier cycle — régression majeure survenue entre le 13 et le 22/08. Pires fichiers : `LoreGraphView.tsx` (24 erreurs), `ChapterDetail.tsx` (19 erreurs), `useArianeLoreProposals.ts` (7), `panels.ts` (7). |
| **Architecture** | **7** | Couches `types → integrations → services → hooks → components → pages` toujours respectées, `_shared/` mutualisé côté Edge Functions (`quota.ts`, `tierConfig.ts`, `cors.ts`, `stripePlan.ts`). `TIER_CONFIG` dupliqué `types/index.ts` / `_shared/tierConfig.ts`, mitigé par un test de parité mais reste deux sources de vérité. God-components confirmés : `ChapterDetail.tsx` (~165 Ko) et `ScenarioChapterEditor.tsx` (~84 Ko). |
| **Performance & scalabilité** | **6** | React Query bien configuré (`staleTime` 30-60s), tous les routes lazy-loadées via `React.lazy` + garde anti-écran-blanc sur chunk-error. Risque confirmé et non mitigé : `ImageBlockLayer.tsx`, `ColorBlockLayer.tsx`, `BubbleLayer.tsx` font un `.map()` inconditionnel sur tous les blocs, sans virtualisation, alors que `PANEL_HEIGHT_MAX` autorise jusqu'à 100 000 px de canvas. `useMemo`/`useCallback` présents mais inconsistants (39 occurrences sur 9 fichiers, pas systématique). |
| **Sécurité** | **8** | RLS activée et durcie sur toutes les tables cœur (`profiles`, `projects`, `assets`, `chapters`, `chapter_canvases`, `scenario_chapters`, `compass_proposals`, `lore_nodes`), migration dédiée `20260627120000_audit_hardening_rls_indexes.sql`. Consommation crédit atomique (`consume_image_credit`, `pg_advisory_xact_lock`, `SECURITY DEFINER`, `service_role` uniquement) — `canGenerate()` côté client correctement traité comme UX seule, pas comme rempart. `stripe-webhook` vérifie la signature Stripe et refuse d'écrire un plan « deviné ». Point de vigilance : chaque Edge Function tourne avec `verify_jwt = false` au niveau gateway (contournement documenté d'un souci d'algorithme JWT ES256) et revérifie manuellement via `/auth/v1/user` — solide dans les fonctions vérifiées mais sans filet de sécurité au niveau gateway si une future fonction oublie ce check. Deux fonctions admin (`admin-set-plan`, `admin-get-kpis`) gatent sur un email hardcodé plutôt qu'un rôle. |
| **Dette technique** | **4** ⬇️ *(6 le 08-13)* | La régression TypeScript (voir ci-dessus) est le point le plus grave : **`ChapterDetail.tsx` contient des appels à `setDragPreview` (lignes 1477, 1540, 1547, 1550, 1581, 1592, 1602, 1610, 1619, 1627, 1635, 1654, 1662, 1669) qui référencent un state setter non déclaré dans le fichier — code actuellement non compilable, situé dans la zone protégée du canvas éditeur (drag de blocs image/couleur)**. S'y ajoutent : casts `Json → PanelLayout/ColorBlock/SpeechBubble` non sûrs dans `panels.ts` (lignes 18, 143, 184, 210, 217, 224, 231), types Supabase générés désynchronisés du schéma réel (`narramindMissingAssetsService.ts` référence une table `narramind_missing_assets` absente de l'union générée), risques de null-deref non gardés dans `useDragBlock.ts`/`useResizeBlock.ts`/`useKeyboardShortcuts.ts` (`canvasRefByPanel.current` possibly null), et `allowLongMemory` toujours mort (confirmé, voir section Produit). |

**Moyenne technique ≈ 6/10, en baisse par rapport au 08-13 (≈7,6/10).** Le point le plus urgent de ce cycle : le projet ne compile plus proprement (110 erreurs TS, 0 au dernier audit), avec du code cassé (`setDragPreview`) précisément dans la zone gelée du canvas éditeur — cf. section 6 pour la marche à suivre (signalement obligatoire à Louis avant toute correction, conformément à la règle « Zone protégée » du CLAUDE.md).

---

## 3. 📦 Product Audit

Le positionnement « tout gratuit, différenciation par crédits uniquement » est confirmé dans les données : `TIER_CONFIG` (`src/types/index.ts:25-62`) fixe `allowReferenceImages`, `allowScenarioAI` et `allowFullExport` à `true` sur les trois plans, et `filArianeLimit: null` partout — seul `maxGenerationsPerMonth` (20/100/250) diffère.

**Mais le code garde une dette de scaffolding tier-gating pré-2026-05-30, en contradiction avec la stratégie actuelle** : `EditorLeftSidebar.tsx:189-224` affiche encore un badge « PRO » et le texte « Réservé au plan Créateur : cliquez pour vous abonner » derrière `canUseCases` (actuellement toujours vrai, donc mort, mais le chemin UI de paywall est entièrement câblé) ; `StyleManager.tsx:59,479,491,580` branche encore sur `canUseReferenceImages` ; `ArianeContinuityPanel.tsx:120-131,294` contient toujours une logique et un texte « plan Libre limité à {filArianeLimit} alertes » alors que `filArianeLimit` est `null` pour tous les plans. C'est une mine à retardement pour un futur contributeur — à supprimer plutôt qu'à laisser neutralisée par des valeurs de config permissives.

`allowLongMemory` est confirmé mort une nouvelle fois : déclaré dans `types/index.ts:18,32,44,56` et dupliqué dans `_shared/tierConfig.ts`, il n'est lu que par le test de parité `tierConfigSync.test.ts` — aucune feature ne le consomme dans `src/` ni `supabase/functions/`.

**Découverte notable de ce cycle — écart doc/réalité sur le menu Univers.** La roadmap (`CLAUDE.md`) marque « Univers v1 (cartographie + Ariane) 🔴 » comme non démarré. Or le code montre une implémentation substantielle : `ProjectDetail.tsx` lazy-charge `UniverseSection` et expose un onglet `universe` réel ; `LoreGraphView.tsx` (2196 lignes, graph de nœuds/arêtes complet) ; `LoreNodeSheet.tsx` (806 lignes, édition d'entités) ; `LoreUniversProposalsSheet.tsx` (512 lignes) et `CompassSuggestionsPanel.tsx` (135 lignes) pour les propositions Ariane. Soit la roadmap est obsolète, soit ce travail a été fait hors roadmap — à réconcilier avec Louis avant toute planification future du menu Univers.

Côté migration multi-vues → Sheet System, aucun résidu d'UI de génération de vues séparées n'a été trouvé ; les colonnes historiques `image_url_profile_left/right`, `image_url_back` ne servent plus que de fallback de lecture pour des assets créés avant le Sheet System (`ChapterDetail.tsx:216-218`, `BlockToolbar.tsx:272`, `EditorRightPanel.tsx:48`) — compatibilité descendante raisonnable, pas une vraie dette.

> 📝 **Note pour le Mémoire** (`Produit/Memoire_DreamWeave.md`) : l'écart entre le statut roadmap « Univers non démarré » et l'implémentation réelle (graph, node sheets, propositions Ariane) mérite d'être clarifié avant rédaction de la section Fonctionnalités — soit la roadmap doit être mise à jour, soit le mémoire doit refléter un état d'avancement plus réel du menu Univers que « à venir ».

---

## 4. 🎨 UX / UI Audit

La navigation reste cohérente avec le parcours annoncé : `App.tsx:105-183` route vers un `ProjectDetail.tsx` unique hébergeant Style/Assets/Scénario/Univers/Édition en onglets, sans fragmentation. Le feedback quota est clair : `AssetLibrary.tsx:276,289` affiche un compteur `count/limite` en direct, et `QuotaReachedDialog.tsx` donne une date de reset explicite et un CTA d'upgrade correctement scopé par plan.

**Violations du design system, toujours présentes voire déplacées :** la règle zéro em-dash reste violée dans du copy utilisateur réel, mais dans des fichiers différents de ceux signalés le 08-13 (`StyleManager.tsx`/`EditionSection.tsx` avaient été identifiés alors) — cette fois : `useAssetGeneration.ts:34` (toast), `ChapterDetail.tsx:1962` (toast) et `:2503` (tooltip de redimensionnement), `ProjectDetail.tsx:429` (titre d'onglet) et `:652` (aria-label), `ArianeContinuityPanel.tsx:294` (message de cap). Six occurrences confirmées ce cycle — la règle « zéro tolérance » n'est manifestement pas appliquée de façon systématique (lint/CI), sinon elle ne réapparaîtrait pas ailleurs après correction supposée du cycle précédent.

**Nouveau point concret :** `QuotaReachedDialog.tsx:41` utilise `<DialogContent className="max-w-sm text-center">` sans classe `.glass`, alors que tous les autres `DialogContent` de l'app l'ajoutent explicitement (`StyleManager.tsx:632`, `AssetLibrary.tsx:422,625`, `ChapterDetail.tsx:3033`). Le composant `ui/dialog.tsx:40` a un style shadcn par défaut plat (`bg-background p-6 shadow-lg`) — la modale de quota atteint, un moment de friction réel pour les utilisateurs Libre, rend donc en carte plate non stylée, à l'encontre de la règle « carte plate blanche → toujours `.glass` ».

Aucune occurrence trouvée de police Inter, de copy AI-slop (« Seamless », « Unleash »...), ni d'animation sur `top/left/width/height` (les `top-[50%]/left-[50%]` observés sont du centrage Radix statique combiné à `translate`, pas des propriétés animées). Quelques hex codés en dur restent dans `ChapterDetail.tsx:1598,1623,1811,2812` (`#ffffff`, `#0a0a12`) — mineur, à uniformiser vers les tokens HSL.

**Comparaison marché :** benchmark UX daté toujours indisponible ce mois-ci (section 1). Point structurel à creuser au prochain cycle : feedback perçu pendant la génération FLUX.2 Pro, un axe où les concurrents historiques investissent (non re-vérifié ce cycle, faute de captures d'écran du flux réel).

---

## 5. 💡 Improvement Suggestions

### 🗑️ Removals

**Supprimer le scaffolding de tier-gating mort.** Badge « PRO » et texte de paywall dans `EditorLeftSidebar.tsx:189-224`, branches `canUseReferenceImages` dans `StyleManager.tsx`, logique de cap `filArianeLimit` dans `ArianeContinuityPanel.tsx:120-131,294` — tout est aujourd'hui neutralisé par une config permissive mais reste un piège pour un futur contributeur qui toucherait `TIER_CONFIG`.

**Trancher `allowLongMemory` : supprimer ou documenter « réservé, non livré ».** Confirmé mort pour la deuxième fois consécutive (08-13 et 08-23).

**Ré-auditer `TestSection.tsx`** (gating admin par email hardcodé côté client, signalé au 08-13) — non re-vérifié ce cycle, à confirmer/traiter avant la prochaine annonce publique.

### ⚡ Optimizations

**P0 — Résoudre la régression TypeScript (0 → 110 erreurs).** Voir section 6 : commence par isoler la cause du saut, en particulier le code cassé dans la zone protégée du canvas.

**Mettre en place un lint/CI qui bloque les em-dash en copy UI.** La règle « zéro tolérance » réapparaît violée à un endroit différent à chaque cycle (08-13 : `StyleManager.tsx`/`EditionSection.tsx` ; 08-23 : 6 autres emplacements) — une correction manuelle ponctuelle ne suffit pas, il faut un garde-fou automatisé (grep en pre-commit ou hook `PostToolUse`, sur le modèle du `.claude/scripts/perf-audit.sh` déjà existant).

**Ajouter `.glass` à `QuotaReachedDialog.tsx`.** Correction d'une ligne, impact direct sur la perception qualité au moment précis où un utilisateur Libre touche sa limite.

**Synchroniser `src/integrations/supabase/types.ts` avec le schéma réel** (table `narramind_missing_assets` référencée mais absente de l'union générée) — régénérer les types Supabase.

**Ajouter une validation runtime (Zod) à la frontière JSONB dans `panels.ts`** au lieu des casts `as` non sûrs sur `layout`/`color_blocks`/`speech_bubbles`.

**Auditer la scalabilité du canvas `chapter_canvases`** (jusqu'à 100 000 px, aucune virtualisation dans `ImageBlockLayer`/`ColorBlockLayer`/`BubbleLayer`) — **zone protégée, accord explicite de Louis requis avant toute modification.**

**Remplacer l'email admin hardcodé par un rôle/claim** dans `admin-set-plan` et `admin-get-kpis`, pour ne pas dépendre d'une modification de code à chaque ajout d'admin.

### ➕ Additions

**Réconcilier la roadmap sur le statut réel du menu Univers** avant toute planification de « Univers v2 » — le travail marqué non-démarré est en réalité substantiellement livré.

**Surveiller le virage IA de WEBTOON côté distribution/IP** (sources datées ci-dessus) — aucune action requise, créneau distinct, mais tendance de fond confirmée pour la deuxième fois consécutive.

**Anticiper la défiance anti-IA illustrée par SDCC** si DreamWeave communique un jour vers des publics BD/comics traditionnels au-delà des créateurs webtoon déjà convaincus par l'IA — pas une priorité produit, mais un facteur de positionnement marketing à garder en tête (source datée : CGTN, 25/07).

---

## 6. 🚀 Launch Status

**Contexte :** exécution locale et/ou Vercel, pas encore annoncé publiquement.

**Bloquant technique majeur identifié ce cycle :**
- **Le projet ne compile plus proprement : 110 erreurs TypeScript (`tsc --noEmit`), contre 0 au cycle du 08-13.** Régression survenue entre les deux audits.
- **Code cassé dans la zone protégée du canvas éditeur** : `ChapterDetail.tsx` appelle `setDragPreview` à 14 endroits (lignes listées section 2) sans que ce state setter soit déclaré — impacte potentiellement le drag des blocs image/couleur. Conformément à la règle « Zone protégée — Canvas Éditeur » du CLAUDE.md, **ceci doit être signalé explicitement à Louis avant toute correction**, avec : (1) impact exact — probable échec silencieux ou erreur runtime lors du drag d'un bloc image/couleur si le code atteint ce chemin malgré l'échec de compilation ; (2) conséquence — régression UX sur une fonctionnalité cœur (composition de case) ; (3) alternative — déclarer le state setter manquant (probablement un oubli de refactor) est le correctif le plus direct, mais nécessite l'accord de Louis avant tout edit dans cette zone.

**Autres points de vigilance (non bloquants pour un lancement, mais à traiter) :**
- Scaffolding de tier-gating mort (section 5) — pas dangereux fonctionnellement, mais fragile si `TIER_CONFIG` est retouché un jour.
- Types Supabase désynchronisés (`narramind_missing_assets`) — reflète un drift schéma/code qui peut cacher d'autres écarts non détectés.
- Em-dash en copy UI production — violation « zéro tolérance » toujours active, à un endroit différent qu'au cycle précédent.
- `QuotaReachedDialog.tsx` non stylé `.glass` — friction visuelle à un moment clé du parcours Libre.

**Checklist de lancement priorisée :**

1. **P0** — Diagnostiquer et corriger la régression TypeScript (110 erreurs). Commencer par `ChapterDetail.tsx` et `LoreGraphView.tsx` (43 erreurs à eux deux).
2. **P0** — Signaler à Louis le code cassé `setDragPreview` dans la zone protégée du canvas avant toute correction (règle CLAUDE.md non négociable).
3. **P1** — Régénérer/synchroniser les types Supabase (`narramind_missing_assets` et vérifier s'il y a d'autres tables manquantes).
4. **P1** — Mettre en place un garde-fou automatisé anti-em-dash (la correction manuelle ponctuelle ne tient pas d'un cycle à l'autre).
5. **P1** — Ajouter `.glass` à `QuotaReachedDialog.tsx`.
6. **P2** — Supprimer le scaffolding tier-gating mort (`EditorLeftSidebar.tsx`, `StyleManager.tsx`, `ArianeContinuityPanel.tsx`).
7. **P2** — Trancher `allowLongMemory` (suppression ou documentation « réservé »).
8. **P2** — Réconcilier la roadmap sur le statut réel du menu Univers.
9. **P2** — Remplacer l'email admin hardcodé par un rôle ; ré-auditer `TestSection.tsx`.

Contrairement au cycle du 08-13 (aucun bloquant dur), **ce cycle a un vrai bloquant dur : le build ne passe pas proprement**. À traiter avant toute autre priorité, y compris marketing.

---

## 7. 📣 Marketing Plan

Aucune présence publique nouvelle identifiée depuis le 08-13 (pas de compte social, pas de landing page d'acquisition séparée, pas de waitlist visible dans le repo). Le plan reste globalement valable :

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
| Surveiller mensuellement l'actualité concurrentielle (Dashtoon, ComicPad, Jenova, WEBTOON) | Basse | Rapide (récurrent) |

**Recommandation de séquencement :** ne pas accélérer sur le marketing avant la résolution du bloquant technique P0 (section 6) — un lancement de waitlist/teaser sur un build qui ne compile pas proprement serait prématuré.

---

## TL;DR

- **🔴 Régression technique majeure : le build ne compile plus (110 erreurs TypeScript, contre 0 le 08-13)**, avec du code cassé (`setDragPreview` non déclaré) précisément dans la zone protégée du canvas éditeur — à signaler à Louis avant toute correction, conformément au CLAUDE.md.
- **Score technique moyen en baisse (≈6/10 vs ≈7,6/10 le 08-13)** — sécurité toujours solide (8/10, RLS durcie, crédits atomiques), mais qualité de code et dette technique ont chuté.
- **Découverte produit notable : le menu Univers (Cartographie + Ariane) est substantiellement implémenté** alors que la roadmap le marque « non démarré 🔴 » — écart à réconcilier, potentiellement pertinent pour le Mémoire de fin d'études.
- **Dette de configuration confirmée deux cycles de suite** : `allowLongMemory` mort, scaffolding de tier-gating pré-« tout gratuit » toujours présent (badges PRO, caps Ariane) bien que neutralisé.
- **Violations UX « zéro tolérance » récurrentes mais mobiles** (em-dash trouvés à des emplacements différents à chaque cycle) — signe qu'une correction manuelle ponctuelle ne suffit pas ; recommandation : lint automatisé.
- **Benchmark concurrentiel toujours pauvre en actualité directe**, mais deux signaux datés confirmés : virage IA de WEBTOON côté distribution/IP, et application concrète du ban IA à SDCC 2026 (signal de défiance communautaire).

---

*Rapport généré automatiquement par la tâche planifiée `dreamweave-daily-audit`. Aucune action d'écriture effectuée (lecture seule). Mise à jour du wiki Obsidian non effectuée cette session (dossier vault non accessible depuis cet environnement) — à reporter à une session sur la machine principale de Louis si les décisions de ce cycle doivent y être consignées. Prochain cycle : vérifier si la régression TypeScript a été corrigée, ré-auditer `TestSection.tsx`.*
