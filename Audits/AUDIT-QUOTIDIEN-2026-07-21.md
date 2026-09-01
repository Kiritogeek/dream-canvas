# 🔍 Audit Quotidien DreamWeave — 2026-07-21

*Audit automatisé complet. Branche `pre-production` · commit `ee49cac` · read-only. Sources benchmark : juillet 2026 uniquement (< 30 jours), sauf mention contraire signalée.*

---

## 1. 🔍 Benchmark & Competitive Intelligence

> Toutes les sources ci-dessous sont datées de juillet 2026 (ou explicitement signalées). Les sources plus anciennes ont été écartées.

### Le mouvement majeur du mois : Naver WEBTOON entre dans l'IA générative narrative

**byUs — AI Story Chat (lancé le 1er juillet 2026).** Naver WEBTOON a lancé *byUs*, un service de « story chat » IA qui permet aux lecteurs de devenir le protagoniste d'une histoire en dialoguant avec des personnages issus d'IP webtoon **approuvées par les créateurs**. Deux formats : *original stories* (démarre sur l'univers officiel de l'œuvre) et *fan stories*. Premier titre : *The Job Change Log*. Fonctions d'immersion : réponses suggérées, auto-play, snapshots, special cuts. Point stratégique clé : **seules les IP validées par les auteurs sont incluses**, pour éviter les controverses copyright/contenu explicite des générateurs non licenciés.
Source : [Anime News Network, 2026-07-11](https://www.animenewsnetwork.com/news/2026-07-11/webtoon-launches-ai-story-chat-service-byus-featuring-creator-approved-webtoon-ip/.239448) · [Korea JoongAng Daily, 2026-07-01](https://www.koreajoongangdaily.com/entertainment/naver-webtoons-new-ai-service-lets-fans-write-themselves-into-the-story/12749315) · [Malay Mail, 2026-07-01](https://www.malaymail.com/amp/news/life/2026/07/01/naver-webtoon-launches-ai-story-chat-that-lets-fans-step-into-creatorapproved-webtoon-worlds/225948)

**Lecture pour DreamWeave :** le leader du marché mise sur l'IA *côté consommation* (lecteurs qui prolongent des univers), pas sur l'IA *côté production* pour créateurs indépendants. C'est une confirmation que le créneau de DreamWeave (production assistée pour créateurs sans compétence en illustration) reste distinct, mais aussi un signal que le thème « prolonger/explorer un univers narratif » — précisément l'ADN du menu **Univers** de DreamWeave — est validé par le marché.

### Concurrents directs (production assistée)

**Dashtoon** — meilleur score global d'un benchmark de générateurs de comics testés en juillet 2026 (8,6/10). Force principale : **cohérence des personnages via entraînement de modèle custom** (préserve couleur des yeux, cicatrices, coiffures sur des centaines de cases). Mode script→comic, suite d'édition (inpainting, magic eraser, auto-coloring), pipeline de publication intégré.
Source : [COMICPAD — Best AI Comic Generators, July 2026](https://www.comicpad.app/best-ai-comic-generators)

**COMICPAD** — générateur gratuit de webtoons verticaux 800×1280 (format CANVAS), personnages cohérents, 6 styles, publication vers WEBTOON/Tapas/GlobalComix. A livré au **Q2 2026** *Regenerate Page* et *Extend Comic*, plus un palier *Custom* allant jusqu'à des comics de 21–400 pages en une seule génération (prompt de 20 000 caractères). Se classe #2 de son propre benchmark, derrière Dashtoon.
Source : [COMICPAD — AI Comic Generator, 2026](https://www.comicpad.app/ai-comic-generator)

**Jenova Webtoon Creator** — moteur de storytelling vertical qui convertit scripts et outlines en épisodes couleur optimisés scroll, avec cohérence personnages, exports « platform-ready » et **mémoire persistante qui suit le projet à travers les sessions et les saisons**. Offres payantes à partir de **20 $/mois**.
Source : [Jenova — AI Webtoon Creator, 2026](https://www.jenova.ai/en/resources/ai-webtoon-creator)

**Elser / ComicsMaker.ai** — positionnés sur la cohérence extrême : Elser revendique +30 % de cohérence personnage sur 180+ scènes ; ComicsMaker.ai propose l'entraînement LoRA sur 15–30 images d'un personnage.
Source : [Mage — Best AI Comic Generators 2026, Ranked](https://blog.mage.space/article/best-ai-comic-generators-2026/bf9d1669-438a-49ee-8a60-68f2e7710601)

### Tendance de fond marché & techno

Le marché des comics générés par IA est passé de **1,52 Md$ (2025) à 2,01 Md$ (2026), soit +32,1 %**, tiré par une avancée précise : les *identity embeddings* qui gardent les personnages identiques sur des dizaines de cases. **FLUX Kontext** supporte jusqu'à **10 images de référence** et maintient **90–95 % de fidélité de personnage** (vêtements, structure faciale, accessoires, petits props).
Source : [SiliconFlow — Best Open Source Models for Comics and Manga, 2026](https://www.siliconflow.com/articles/en/best-open-source-models-for-comics-and-manga) · [Fastio — 8 Best AI Comic Generators 2026](https://fast.io/resources/best-ai-comic-generators-2026/)

**Sentiment communautaire :** la cohérence des personnages reste le sujet #1 et le point de friction historique — passée de « quasi impossible » à « réellement exploitable » fin 2025 / début 2026. C'est le critère d'achat dominant pour les créateurs de webtoons (continuité sur des dizaines/centaines de cases). *(Les fils Reddit/Discord spécifiques n'ont pas pu être datés au mois courant et sont donc écartés de ce rapport ; le signal provient d'articles de synthèse datés 2026.)*

**Synthèse benchmark → implication produit :** trois des quatre concurrents directs vendent la cohérence de personnage comme argument #1, et deux d'entre eux exploitent le multi-référence (FLUX Kontext, LoRA). Le **Sheet System** de DreamWeave (fiche composite 4 angles) est exactement une réponse à ce besoin — mais il faut vérifier que le pipeline exploite bien le multi-référence de FLUX au moment de générer les cases, sinon l'avantage reste théorique.

---

## 2. 🛠️ Technical Audit

| Axe | Score /10 | Justification (fichiers cités) |
|---|---|---|
| **Qualité du code** | **8,5** | 0 `any` dans `src/`, 0 TODO/FIXME/HACK, ESLint flat config + husky/lint-staged `--max-warnings 0`, 26 fichiers de test ciblant la logique critique (`panels.api.test.ts`, `tierConfigSync.test.ts`). Bémol : god-components — `src/pages/ChapterDetail.tsx` **3174 lignes / 30 `useState`**, `LoreGraphView.tsx` 2196, `ScenarioChapterEditor.tsx` 1937. |
| **Architecture** | **9** | Couches strictes `types → integrations → services → hooks → components → pages` respectées. React Query centralisé (`App.tsx`), `_shared/` factorise `tierConfig.ts`/`stripePlan.ts` réutilisé côté front via `@fn-shared` (source unique de vérité tiers/prix). 15 Edge Functions découpées par domaine. |
| **Performance & scalabilité** | **7** | Lazy loading de toutes les routes (`lazyWithReload` gère les chunks périmés), `manualChunks` isolant reactflow/recharts/html2canvas. **Risque : le modèle `chapter_canvases` mono-ligne (jusqu'à 800×100 000 px) sans virtualisation** — aucun windowing/react-window/IntersectionObserver ; coût de rendu linéaire non borné sur longs chapitres. `ChapterDetail` à 30 `useState` = risque de re-renders en cascade. |
| **Sécurité** | **9** | RLS systématique `auth.uid() = user_id`, durcie (`20260627120000_audit_hardening_rls_indexes.sql` : `WITH CHECK` sur UPDATE, `SET search_path` sur SECURITY DEFINER). 0 fuite `service_role` côté client. PKCE + clé anon. Webhook Stripe : vérif de signature obligatoire, `profiles.plan` écrit en service_role uniquement. Crédit consommé atomiquement (`consume_image_credit` + advisory lock). |
| **Dette technique** | **7,5** | Dette de code faible, dette surtout documentaire : `allowLongMemory` = config morte (dans `TIER_CONFIG`, testée, **consommée nulle part**) ; drift doc **« 14 Edge Functions » alors qu'il y en a 15** (`generate-cover-image` livrée, non documentée) ; 2 worktrees `prunable` non nettoyés ; pas de `.gitattributes` (churn CRLF/LF sur montage Windows→Linux) ; 43 fichiers d'audit jamais consolidés. |

**Moyenne technique ≈ 8,2/10.** Points forts nets : sécurité et architecture. Point de vigilance principal : la scalabilité du **cœur produit** (l'éditeur canvas).

**Quick facts :** 47 262 lignes `src/` · 86 composants `.tsx` · 32 hooks · 17 services · 15 Edge Functions · 49 migrations SQL · 71 dépendances (47 runtime + 24 dev) · `tsconfig.app.json` `strict: true` · Vitest + coverage v8.

---

## 3. 📦 Product Audit

**Cohérence features ↔ positionnement : élevée.** Le flux **Style → Assets → Scénario → Éditeur** est intégralement matérialisé (`StyleManager`, `AssetLibrary`, `ScenarioSection`/`ScenarioChapterEditor`, `ChapterDetail`) et les onglets de `ProjectDetail` suivent l'ordre. Le modèle « tout gratuit, différenciation par crédits » est **respecté dans le code** : `TIER_CONFIG` confirme toutes les features à `true`/illimité sur les trois plans, seul `maxGenerationsPerMonth` varie (20/100/250), `model: "flux-2-pro"` identique partout, prix 0 / 12,99 / 29,99 €.

**Incohérences promis/livré :**

1. **Univers v1 : statut faux dans la doc.** CLAUDE.md et le roadmap marquent Univers v1 **🔴 (non fait)**. Or le code montre une implémentation substantielle et câblée : `UniverseSection.tsx` (onglet `universe`), `LoreGraphView.tsx` (2196 l., graph @xyflow), propositions Ariane (`useArianeLoreProposals` 1105 l.), Compass (`narramind-compass` index/propose, pgvector, `project_embeddings`, `compass_proposals`). Les deux piliers de l'ADN Univers (cartographie + amélioration continue via Ariane) sont présents. Le statut devrait être **🟡 partiellement livré**, pas 🔴.
2. **`allowLongMemory`** correctement retiré de l'offre commerciale (bonne décision anti-survente) mais laissé dans le type avec `studio: true` → promesse résiduelle non tenue.
3. **`generate-cover-image` / `CoverEditor`** livrés mais absents de toute documentation produit.

**Features potentiellement sur-dimensionnées :** l'écosystème NarraMind (mémoire `narramind-update` 1400 l., Compass RAG, métriques) est très riche pour un produit encore pré-prod — risque de sur-ingénierie par rapport au besoin utilisateur validé. `TestSection` (672 l.) = panneau debug admin en prod (lazy, réservé à un email).

> 📝 **Impact Mémoire** : décalage statut/réel sur Univers v1 (marqué 🔴 mais largement câblé) et compteur d'Edge Functions obsolète (14 → 15).
> **Section concernée** : Fonctionnalités / Architecture technique.
> **Proposition** : « L'Univers v1 (cartographie par graphe de lore + assistance Ariane via RAG pgvector/Compass) est implémenté et intégré à l'éditeur de projet ; le back-end compte 15 Edge Functions (ajout de `generate-cover-image`). »

---

## 4. 🎨 UX / UI Audit

**Fluidité des parcours : bonne.** Onboarding progressif explicite (`useProgressiveMenuGate`, `PROGRESSIVE_TOUR_TABS`, `ArianeOnboardingCard`) qui déverrouille les onglets au fur et à mesure. Auth PKCE + Google OAuth, vérification email dédiée, reset password. Cas limites gérés : `QuotaReachedDialog`, notif « assets manquants » dans le fil Scénario, `ChunkErrorFallback` (« Nouvelle version disponible / Recharger »).

**Cohérence design system : forte.** `.impeccable.md` + `taste-skill` imposent un cadre strict (tokens HSL lavande/pêche/mint, glassmorphisme, Quicksand+Nunito, anti-em-dash). `tailwind.config.ts` mappe tout sur `hsl(var(--…))`, aucune couleur brute dans les classes utilitaires. Les 49 hex « hardcodés » relevés sont légitimes (dégradés SVG des icônes Ariane, palettes du color-picker utilisateur) — pas de dérive.

**Points de friction :**
- **Éditeur = charge cognitive et technique élevée** — `ChapterDetail` orchestre blocs image, color-blocks, bulles, SFX, undo/redo, génération IA par bloc, export ; risque de latence sur longs canvas (pas de virtualisation) qui peut casser le « mode flow » visé.
- **Zone canvas freezée** (CLAUDE.md) : stabilité assurée mais vélocité d'amélioration UX bridée sur le cœur du produit.
- **Statut Univers trompeur** dans le roadmap : un contributeur pourrait recommencer un travail déjà fait.

**Comparaison aux standards concurrents (section 1) :** Dashtoon et COMICPAD misent sur un pipeline **création → publication intégré** (export direct WEBTOON/Tapas/GlobalComix). DreamWeave a l'export de chapitre mais **pas de pipeline de publication vers les plateformes de lecture** — c'est le principal écart UX/produit vs les leaders. À l'inverse, DreamWeave devance la plupart des concurrents sur la **structuration narrative** (Scénario IA + Univers/lore + découpage cases), là où les concurrents restent surtout « texte → cases ».

---

## 5. 💡 Improvement Suggestions

### 🗑️ Removals
- **Retirer `allowLongMemory` du type `TIER_CONFIG`** (et son test de sync) tant que la feature n'est pas implémentée — évite de typer une promesse non livrée. *(Dette interne, pas de source requise.)*
- **Consolider les 43 fichiers `Audits/`** en un index unique + archive — l'historique quotidien redondant alourdit le repo.
- **Réévaluer l'ampleur de NarraMind** avant lancement : geler les sous-modules non exposés à l'utilisateur (métriques internes) pour réduire la surface de maintenance en pré-lancement.

### ⚡ Optimizations
- **Virtualiser le canvas de l'éditeur** (windowing des blocs/bulles hors viewport) — corrige le principal risque de scalabilité identifié en section 2. **⚠️ Zone canvas freezée : nécessite l'accord explicite de Louis avant toute implémentation** (impact potentiel sur `ImageBlockLayer`, `BubbleLayer`, `useDragBlock`).
- **Découper `ChapterDetail.tsx` (3174 l.)** en sous-composants/hook custom pour réduire les re-renders et la charge de maintenance.
- **Exploiter le multi-référence de FLUX Kontext (jusqu'à 10 images, 90–95 % de fidélité)** pour renforcer le Sheet System — la cohérence personnage est l'argument d'achat #1 du marché. Source : [SiliconFlow, 2026](https://www.siliconflow.com/articles/en/best-open-source-models-for-comics-and-manga).
- **Corriger les drifts doc** : statut Univers 🔴→🟡, compteur EF 14→15, documenter `generate-cover-image`/`CoverEditor` ; ajouter `.gitattributes` ; nettoyer les 2 worktrees prunable.

### ➕ Additions
- **Pipeline de publication / export vers plateformes de lecture** (format vertical 800×1280 CANVAS-ready) — c'est le standard livré par Dashtoon et COMICPAD, et l'écart UX principal. Source : [COMICPAD — AI Webtoon Maker, 2026](https://www.comicpad.app/ai-webtoon-maker).
- **Fonction « Extend / Regenerate » à l'échelle du chapitre** (équivalent *Extend Comic* / *Regenerate Page* livrés par COMICPAD au Q2 2026). Source : [COMICPAD — AI Comic Generator, 2026](https://www.comicpad.app/ai-comic-generator).
- **Explorer un mode « story chat / exploration d'univers »** côté lecteur, adossé au menu Univers déjà câblé — le marché vient de valider ce format (Naver byUs, 1er juillet 2026). Source : [Anime News Network, 2026-07-11](https://www.animenewsnetwork.com/news/2026-07-11/webtoon-launches-ai-story-chat-service-byus-featuring-creator-approved-webtoon-ip/.239448). *(Note : à cadrer strictement contre l'ADN Univers v1 — cartographie + amélioration, PAS timeline.)*

---

## 6. 🚀 Launch Status

**Contexte :** tourne en local et/ou sur Vercel (`vercel.json` présent), pas encore annoncé publiquement. Base technique solide (sécurité 9/10, architecture 9/10), Stripe livré, RLS durcie.

**Bloqueurs identifiés :**
- **Technique (P1) :** scalabilité du canvas long non validée sous charge (pas de virtualisation) — à tester avant d'exposer à des utilisateurs réels générant de longs chapitres.
- **Produit (P2) :** `allowLongMemory` typé mais non livré ; drifts documentaires ; pas de pipeline de publication.
- **Go-to-market (P0) :** aucune présence publique (waitlist, landing d'acquisition, réseaux) — voir section 7.

**Checklist de lancement priorisée :**
1. **[P0]** Test de charge du canvas éditeur sur chapitre long (dizaines de blocs/bulles) + valider FLUX.2 Pro sous quota concurrent.
2. **[P0]** Vérifier vars d'env prod Supabase/FAL.ai/Stripe + webhook Stripe en mode live (pas test).
3. **[P0]** Landing d'acquisition + waitlist en ligne (capture email).
4. **[P1]** Corriger les drifts doc (statut Univers, EF 14→15) et trancher `allowLongMemory`.
5. **[P1]** Politique de confidentialité + CGU + mentions légales (obligatoire pour paiement en prod, cible FR).
6. **[P2]** Nettoyage repo (`.gitattributes`, worktrees, consolidation audits).
7. **[P2]** Pipeline d'export/publication vers plateformes de lecture.
8. **[P2]** Monitoring/erreurs prod (Sentry ou équivalent) + analytics produit.

---

## 7. 📣 Marketing Plan

**Posture actuelle :** aucune présence publique identifiée. Le produit est mûr techniquement mais invisible commercialement. Priorité absolue : construire une audience *avant* le lancement, sur le créneau « crée ton webtoon sans savoir dessiner », cible créateurs FR d'abord.

| Tâche | Priorité | Effort |
|---|---|---|
| Publier une **landing d'acquisition + waitlist** (capture email, promesse claire, démo visuelle du parcours Style→Assets→Scénario→Éditeur) | **Haute** | Medium |
| Créer les **comptes réseaux** (Instagram + TikTok + X) — le format webtoon est visuel, TikTok/IG Reels = canal naturel | **Haute** | Quick |
| Produire un **teaser vidéo de concept** (30–45 s : « d'une idée à un chapitre webtoon en quelques minutes ») | **Haute** | Medium |
| Préparer un **lancement Product Hunt** (assets, tagline, premiers commentaires, jour de la semaine optimisé) | Moyenne | Medium |
| Série de **posts « build in public »** (avancées, coulisses IA, avant/après génération) pour créer une communauté early | Moyenne | Long |
| Se positionner sur la **cohérence de personnage (Sheet System)** dans tout le messaging — c'est le critère d'achat #1 du marché (benchmark section 1) | **Haute** | Quick |
| Cibler les **communautés créateurs FR** (Discord webtoon/manga, r/webtoons, groupes Facebook) avec une approche non-spam (partage de valeur) | Moyenne | Medium |
| Programme de **beta fermée / early access** via la waitlist (crée de la rareté + boucle de feedback) | Moyenne | Medium |
| **SEO de contenu** : articles « comment créer un webtoon sans dessiner » — les concurrents (COMICPAD, Jenova) dominent déjà ce terrain, rattrapage nécessaire | Basse | Long |

---

## 📌 TL;DR

- **Marché en forte croissance (+32,1 %, 2,01 Md$ en 2026)** et le leader Naver WEBTOON vient de lancer *byUs* (1er juillet) sur l'exploration d'univers narratif par IA — ce qui **valide l'ADN du menu Univers** de DreamWeave. Le créneau « production assistée pour créateurs » reste distinct et ouvert.
- **La cohérence de personnage est LE critère d'achat #1** (Dashtoon, Elser, ComicsMaker en font leur argument principal ; FLUX Kontext atteint 90–95 % de fidélité en multi-référence). Le **Sheet System doit devenir le cœur du messaging** — et exploiter le multi-référence FLUX au niveau technique.
- **Techniquement solide (≈ 8,2/10)** : sécurité et architecture excellentes (9/10). **Seul vrai risque : la scalabilité du canvas éditeur** (mono-ligne jusqu'à 100 000 px, sans virtualisation) — à tester avant lancement. ⚠️ Optimisation en zone freezée → accord de Louis requis.
- **Dette surtout documentaire** : Univers v1 marqué 🔴 alors qu'il est largement livré (→ 🟡), compteur Edge Functions 14→15, `allowLongMemory` mort à trancher. **Impact Mémoire signalé.**
- **Prochaines actions prioritaires :** (1) test de charge canvas + config prod ; (2) landing + waitlist en ligne ; (3) messaging centré cohérence personnage ; (4) écart produit à combler : pipeline de publication vers plateformes de lecture.
