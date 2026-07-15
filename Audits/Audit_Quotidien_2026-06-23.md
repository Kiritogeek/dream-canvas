# 🛰️ DreamWeave — Audit quotidien

**Date :** mardi 23 juin 2026
**Type :** audit automatisé complet (benchmark + technique + produit + UX + lancement + marketing)
**Périmètre code :** branche locale, `~41 700` lignes TS/TSX, 14 Edge Functions, 42 migrations, 4 fichiers de test.

---

## 1. 🔍 Benchmark & Veille concurrentielle

> Fenêtre stricte appliquée : **24 mai → 23 juin 2026**. Toute source non datable dans le mois a été rejetée. Comme la veille du 22/06, le signal récent reste concentré sur la **couche modèle d'image**, pas sur les produits webtoon dédiés (silencieux en juin).

### Mouvement daté des 30 derniers jours

| Acteur | Nouveauté (datée) | Source | Date |
|---|---|---|---|
| **ComicPad — « Best AI Comic Generators (June 2026) »** | Comparatif first-party de 10 outils (Dashtoon, Midjourney V8.1 + Niji 7, ComicsMaker.ai…) sur cohérence perso, prix, export. Confirme que les générateurs d'image purs s'arrêtent à l'image et ne gèrent ni cases ni bulles ni mise en page. Auto-classement intéressé → à lire avec recul. | https://www.comicpad.app/best-ai-comic-generators | **juin 2026** |
| **Anifusion** | Plan Créateur à **9 $/mois**, export en calques (finition Photoshop / Clip Studio), cohérence perso par **LoRA** sur séries longues, panel templates + character sheets. Données « vérifiées juin 2026 » (agrégateurs). | https://anifusion.ai/articles/best-ai-comic-generator-2026/ | **juin 2026** |
| **WEBTOON × Genies** | Avatars IA 3D interactifs (chat personnage, opt-in, ne s'entraîne pas sur l'art des créateurs), monétisation, lancement « cet été » avec 6 titres pilotes. | https://www.comicsbeat.com/webtoon-teams-up-with-ai-avatar-platform-genies/ | annoncé fin avr. 2026 (contexte) |
| **WEBTOON Canvas — programmes créateurs 2026** | Extension des outils de paiement / dashboard de monétisation pour les créateurs indé. | https://aidirectory.com/news/webtoon-expands-canvas-creator-programs-2026-monetization-dashboard-residency | 2026 (à recouper) |

### Concurrents dédiés — silence produit confirmé en juin

- **Dashtoon** reste le concurrent direct le plus sérieux : seul à offrir la boucle complète **créer → publier → monétiser** (rev-share). **Aucune annonce de feature confirmable** sur les 30 derniers jours.
- **Anifusion / ComicsMaker.ai** : seules des fiches d'agrégateurs « vérifié juin 2026 » (prix, LoRA), pas d'annonce first-party. Signal faible.

### Sentiment communauté (30 j)

- **Sentiment anti-IA persistant** chez créateurs et lecteurs webtoon. Reproches récurrents directement pertinents pour nous : « bad continuity », « static faces », « wrong facial expressions », lettrage faible — la communauté **repère vite** le travail IA bâclé et **ne pardonne pas** toujours. Source : https://aitribune.net/2026/05/08/ai-webtoon-in-2026/ (8 mai 2026).
- **« Reverse-halo » documenté** : la note de plaisir des lecteurs **chute quand l'implication de l'IA est révélée**, ce qui pousse à une « invisibilité stratégique » (créateurs qui taisent l'usage IA). Cas cité : un studio forcé de redessiner des épisodes après détection de fonds IA-polish.
- **Étude académique** (CHI 2026) : seulement **18,3 %** des artistes webtoon ont utilisé l'IA générative, **36,1 %** comptent le faire — contre **63,8 %** des entreprises du secteur. Fracture nette créateurs vs studios. Source : https://dl.acm.org/doi/10.1145/3772318.3790343
- **Corée — labellisation IA obligatoire** du contenu (AI Act). Sujet de conformité et de confiance à anticiper. Source : https://thenewpublishingstandard.com/2026/01/28/korea-ai-act-webtoon-creators/ (contexte, hors fenêtre).

### 📌 Signal de fond (stable depuis le 22/06)

1. La dynamique du mois reste **la qualité d'image** (Midjourney V8.1 / Niji 7), **pas** une menace de workflow.
2. **Le gap des concurrents demeure notre moat** : aucun générateur d'image, même mis à jour, ne gère cases + bulles + canvas vertical. Notre couche composition est différenciante.
3. La seule menace structurelle est **Dashtoon** (même boucle créer→publier→monétiser). C'est là que se situe notre retard produit.
4. Nouveau cette semaine : le **risque de confiance** (reverse-halo + labellisation Corée) se précise comme un sujet produit à part entière, pas seulement marketing.

---

## 2. 🛠️ Audit technique

| Axe | Note /10 | Justification |
|---|---|---|
| **Qualité du code** | **8,5** | `tsc --noEmit` : **0 erreur**. **Zéro `any`** dans `src/`, **0 TODO/FIXME/HACK**, **8 `console.log`** seulement. ESLint : **5 warnings** (tous `react-refresh/only-export-components` dans `src/components/ui/`). Conventions respectées. Bémols : **27 `eslint-disable`** et 3 fichiers > 1 500 l. (`ChapterDetail.tsx` 2 501 l., `LoreGraphView.tsx` 2 244 l., `SpeechBubbleEditor.tsx` 1 543 l.). Couverture de tests faible : **4 fichiers de test** pour ~290 sources (≈ 1,4 %). |
| **Architecture globale** | **8** | Séparation nette `types → integrations → services → hooks → components → pages`, conforme au workflow déclaré. State serveur isolé via React Query (`staleTime` 30 s, `retry` 1). Lazy-loading des 9 pages via `lazyWithReload` (`App.tsx`). 14 Edge Functions à responsabilité unique + `_shared/`. RLS par `user_id`. Bémols : pages-monolithes (`ChapterDetail`, `ScenarioChapterEditor` ~2 000 l.) + 2 composants orphelins (`LoreFriseView.tsx`, `TestSection.tsx`). |
| **Perf & scalabilité** | **7** | **241 `useMemo`/`useCallback`** → mémoïsation sérieuse ; **1 seule** animation sur `top/left` (quasi-respect règle `transform`/`opacity`). Bundle `dist` 3,8 Mo **mais PNG de 1,2 Mo non optimisé** embarqué (`Ariane_Nero…png`) = 31 % du poids inutile. Pas de `manualChunks` dans `vite.config.ts` → ReactFlow/Recharts dans le chunk principal. **0 `React.memo`** sur les layers canvas lourds (`BubbleLayer` 792 l.) malgré re-rendus fréquents en drag. Pas de virtualisation des listes (risque sur très longs chapitres, cas limite). |
| **Sécurité** | **8,5** | **Aucune fuite `service_role` côté client** (grep `src/` = 0). CORS via **allowlist** (`_shared/cors.ts`), pas de wildcard. Auth PKCE, JWT en session Supabase (pas en localStorage). Edge Functions vérifient `Authorization`/`getUser` avant usage du service role (`admin-set-plan` double-garde par email admin). RLS dans 13 migrations. XSS : sanitisation des bulles (`bubbleHtmlSanitize.ts`), aucun `dangerouslySetInnerHTML`. Points d'attention : **audit RLS exhaustif** table par table + **rate-limiting** des Edge Functions de génération (vecteur DoS / coût FAL.ai) non vérifiés. |
| **Dette technique** | **7** | Dette « sale » faible (0 TODO/FIXME, 0 `@ts-ignore`, types propres). Dette **structurelle** : fichiers géants, **couverture de tests mince**, **code mort** (`LoreFriseView.tsx` 419 l. orpheline ; `TestSection.tsx` 672 l. ambigu). Dépendances à jour (React 18.3.1, RQ 5.83, Zod 3.25). Gérable mais concentrée sur les zones chaudes (éditeur, lore). |

> ⚠️ `npm test` n'a **pas pu s'exécuter dans le sandbox** (module natif `rollup` manquant — limite d'environnement, pas un défaut du code). `tsc` passe à 0 erreur. **À rejouer en local / CI avant prod.**

**Note moyenne technique : 7,8/10** — produit techniquement sain, freins sur les tests, le poids du bundle et 2-3 fichiers monolithes.

---

## 3. 📦 Audit produit

**Cohérence features ↔ positionnement : forte.** Le parcours promis (Style → Assets → Scénario → Éditeur) est entièrement codé (`StyleManager`, `AssetLibrary`, `ScenarioSection`, `ChapterDetail`). La stratégie « tout gratuit, différenciation par le volume de crédits » est fidèlement implémentée : `TIER_CONFIG` et `Plans.tsx` alignés sur 20 / 100 / 250 crédits et 0 / 12,99 / 29,99 €, FLUX.2 Pro pour tous les tiers, seule exception Studio = `allowLongMemory`.

**Incohérences détectées (inchangées depuis le 22/06, non encore traitées) :**

1. **`LoreFriseView.tsx` (419 l.) orpheline** — jamais rendue par `UniverseSection`, et **en contradiction directe avec l'ADN du menu Univers** (« pas de timeline / frise »). Code mort **et** dérive produit → à supprimer.
2. **`TestSection.tsx` (672 l.)** monté dans `ProjectDetail` : artefact de dev / bac à sable potentiellement exposé en prod → à clarifier ou retirer.
3. **Statut Univers v1 encore 🔴 dans la roadmap** alors que beaucoup de surface lore est déjà codée (`LoreGraphView`, `LoreNodeSheet`, `CompassSuggestionsPanel`, proposals Ariane). État réel plus avancé que le statut affiché → resynchroniser.

**Features sous-utilisées / redondantes :** le doublon « multi-vues » est bien retiré au profit du Sheet System (RAS). Risque inverse : **richesse Ariane/Compass** (≈ 8 hooks, plusieurs panneaux) pour une feature encore v1 — vérifier que la valeur perçue justifie la surface de maintenance.

**Manque produit vs positionnement marché :** la promesse « de l'histoire au webtoon publié » s'arrête aujourd'hui à l'**export de chapitre**. La **boucle de publication / monétisation** (le cœur de Dashtoon) est absente — écart à assumer ou à combler explicitement.

---

## 4. 🎨 Audit UX / UI

**Fluidité des parcours.** Tunnel principal cohérent et linéaire (Style → Assets → Scénario → Éditeur), renforcé par l'onboarding progressif premier projet (menus débloqués étape par étape, badges « New ») et Ariane (`ArianeTabTourOverlay`, `ArianeOnboardingCard`). Garde-fous quota côté UX (`QuotaReachedDialog`, `canGenerate()` avant FAL.ai) : l'utilisateur Libre est cadré sans cul-de-sac.

**Cohérence design system.** Respect global de la charte : tokens HSL, glassmorphisme, Quicksand/Nunito, quasi-absence d'animations interdites (1 occurrence `top/left`). Les 27 `eslint-disable` et les fichiers UI géants sont le principal risque de dérive à terme.

**Points de friction identifiés.**
- **Éditeur dense** : `ChapterDetail` concentre canvas + blocs + bulles + sidebar + scénario. Charge cognitive élevée pour un primo-créateur sur écran moyen.
- **Asset lourd au chargement** : le PNG 1,2 Mo dans le bundle allonge le premier rendu sur connexion lente.
- **Dashboard noté « À revoir »** dans `UX.md` — point de réentrée principal pas encore stabilisé.

**Comparaison aux standards concurrents (§1).** Là où Midjourney/Niji et Anifusion s'arrêtent à l'image (ou exigent Photoshop/Clip Studio en aval), DreamWeave offre la **composition complète intégrée** (cases, bulles, canvas vertical) — avantage UX net, confirmé par le reproche communautaire récurrent « no panel/bubble tools ». Le retard se situe sur la **boucle publication/monétisation** native de Dashtoon.

---

## 5. 💡 Suggestions d'amélioration

### 🗑️ Retraits

- **Supprimer `LoreFriseView.tsx`** — orphelin + contraire à l'ADN « pas de timeline/frise ». Gain : −419 l. + cohérence produit.
- **Clarifier / retirer `TestSection.tsx`** s'il s'agit d'un reliquat de dev exposé en prod.
- **Sortir le PNG 1,2 Mo du bundle** (servir depuis Storage ou compresser en WebP). Gain perf immédiat.

### ⚡ Optimisations

- **Découper `ChapterDetail.tsx` (2 501 l.) et `LoreGraphView.tsx` (2 244 l.)** en sous-composants + hooks. ⚠️ Sans toucher à la **zone canvas freezée** (blocs image / couleur / bulles) — toute modif de cette zone doit être signalée à Louis avant implémentation.
- **Augmenter la couverture de tests** sur les zones chaudes (éditeur, quotas, génération) : 4 tests / ~290 sources est le maillon faible.
- **Mémoïser les layers canvas** (`React.memo` sur `BubbleLayer`, `ColorBlockLayer`, `ImageBlockLayer`) pour réduire les re-rendus en drag/resize — sans changer le comportement freezé.
- **Audit RLS exhaustif** table par table + **rate-limiting** des Edge Functions de génération avant lancement public.
- **`manualChunks` Vite** pour isoler ReactFlow / Recharts → meilleur LCP.

### ➕ Ajouts (appuyés par le benchmark daté de juin 2026)

- **Boucle d'export → publication renforcée** — c'est LE différenciateur de Dashtoon (créer → publier → monétiser). Source : ComicPad « Best AI Comic Generators (June 2026) », https://www.comicpad.app/best-ai-comic-generators (juin 2026).
- **Label « créé avec assistance IA » optionnel/automatique** — réponse au « reverse-halo » et à la labellisation obligatoire Corée. Sources : https://aitribune.net/2026/05/08/ai-webtoon-in-2026/ (8 mai 2026) ; https://dl.acm.org/doi/10.1145/3772318.3790343 (CHI 2026).
- **Export en calques (layered export)** comme Anifusion, pour les créateurs qui veulent finir dans Photoshop/Clip Studio — abaisse la barrière des semi-pros. Source : https://anifusion.ai/articles/best-ai-comic-generator-2026/ (juin 2026).
- **Renfort cohérence faciale / expressions** — le reproche n°1 de la communauté envers l'IA (« static faces », « wrong expressions »). Le Sheet System (4 angles) est un bon socle ; capitaliser dessus comme argument anti-slop. Source : https://aitribune.net/2026/05/08/ai-webtoon-in-2026/ (8 mai 2026).

---

## 6. 🚀 État de lancement

**Contexte :** tourne en local + build Vercel (`vercel.json`, `dist` présent), CI GitHub Actions câblée, **non annoncé publiquement**.

**Bloquants / étapes restantes :**

- 🔴 **Confirmer la suite de tests en CI** (n'a pas pu tourner dans le sandbox) — non négociable avant prod.
- 🔴 **Audit RLS exhaustif** sur toutes les tables sensibles + vérifier le **rate-limiting** des Edge Functions de génération (coût FAL.ai / DoS).
- 🟠 **Nettoyage code mort** (`LoreFriseView`, `TestSection`) + PNG 1,2 Mo hors bundle.
- 🟠 **Resynchroniser le statut Univers v1** (roadmap vs code réel) + stabiliser le Dashboard noté « À revoir ».
- 🟢 **Stripe** (checkout + portal + webhook) déjà câblé — vérifier en mode **live** avec clés prod + tester un cycle abonnement/annulation réel.

### ✅ Checklist de lancement priorisée

| # | Étape | Priorité | Effort |
|---|---|---|---|
| 1 | Faire passer `npm test` + lint + build en CI (vert sur `main`) | 🔴 Haute | Rapide |
| 2 | Audit RLS table par table + activer rate-limiting génération | 🔴 Haute | Moyen |
| 3 | Vérifier Stripe en live (clés prod, webhook signé, cycle complet) | 🔴 Haute | Moyen |
| 4 | Supprimer code mort + sortir le PNG du bundle | 🟠 Moyenne | Rapide |
| 5 | Resynchroniser roadmap Univers v1 + figer le Dashboard | 🟠 Moyenne | Rapide |
| 6 | Page légale (CGU, confidentialité, mention IA) + politique de contenu | 🟠 Moyenne | Moyen |
| 7 | Monitoring / observabilité prod (erreurs, quotas, coût FAL.ai) | 🟢 Basse | Moyen |
| 8 | Préparer waitlist + landing d'acquisition (cf. §7) | 🟢 Basse | Moyen |

**Verdict :** **pas prêt pour un lancement public**, mais proche. Les bloquants sont du durcissement (tests CI, RLS, Stripe live), pas des trous fonctionnels. Estimation : prêt après traitement des 3 items 🔴.

---

## 7. 📣 Plan marketing

**Posture actuelle :** produit non annoncé, pas de présence sociale identifiée, landing existante mais orientée produit (pas acquisition). Le moat (composition cases + bulles + canvas, vs simples générateurs d'image) n'est pas encore raconté publiquement.

### Tâches actionnables

| Tâche | Priorité | Effort |
|---|---|---|
| Écrire une **landing d'acquisition** orientée bénéfice (« de ton histoire au webtoon publié, sans savoir dessiner ») avec démo avant/après | 🔴 Haute | Moyen |
| Lancer une **waitlist** (capture email + accès anticipé) | 🔴 Haute | Rapide |
| Créer le **compte Instagram + TikTok** DreamWeave (format vertical = ADN webtoon) | 🔴 Haute | Rapide |
| Produire un **teaser vidéo concept** (15-30 s : prompt → asset → case → bulle → chapitre) | 🔴 Haute | Moyen |
| Positionner explicitement le **moat composition** (« les générateurs d'image n'ont ni cases ni bulles ») dans tous les supports | 🔴 Haute | Rapide |
| Préparer un angle **« IA assumée + qualité »** (anti reverse-halo) : transparence + cohérence faciale via Sheet System | 🟠 Moyenne | Rapide |
| Page **comparatif** DreamWeave vs Dashtoon / Anifusion / Midjourney | 🟠 Moyenne | Moyen |
| Lancer un **Discord créateurs** (communauté + feedback + démos) | 🟠 Moyenne | Moyen |
| Préparer un **Product Hunt** (assets, hunters, jour J) | 🟠 Moyenne | Moyen |
| Série de **tutoriels courts** (création d'un chapitre de A à Z) pour SEO/YouTube | 🟢 Basse | Long |
| **Partenariats micro-influenceurs** webtoon/manga (FR + EN) | 🟢 Basse | Long |
| **Newsletter** « coulisses + roadmap » pour la waitlist | 🟢 Basse | Rapide |

> ⚠️ Levier de différenciation marketing n°1 : **DreamWeave compose, les autres se contentent de générer l'image.** C'est confirmé par la veille de juin (ComicPad, reproches communautaires). À mettre au centre du récit.

---

## TL;DR

- **Technique solide (~7,8/10)** : 0 erreur TS, 0 `any`, sécurité et architecture saines. Freins : couverture de tests ~1,4 %, PNG 1,2 Mo dans le bundle, et 2-3 fichiers monolithes (`ChapterDetail` 2 501 l.).
- **Le moat tient** : la veille de juin confirme qu'aucun générateur d'image (Midjourney V8.1, Niji 7, Anifusion) ne gère cases + bulles + canvas vertical. Notre couche composition reste différenciante ; **Dashtoon** est le seul vrai rival (boucle publier→monétiser).
- **3 dettes produit non traitées** depuis hier : `LoreFriseView` (orphelin, contraire à l'ADN Univers) et `TestSection` à retirer, statut Univers v1 à resynchroniser.
- **Pas prêt pour le public, mais proche** : 3 bloquants 🔴 = tests CI verts, audit RLS + rate-limiting, Stripe en live. Aucun trou fonctionnel majeur.
- **Marketing à amorcer de zéro** : prioriser landing d'acquisition + waitlist + comptes verticaux (IG/TikTok) + teaser, en plaçant « on compose, les autres génèrent » au centre du récit — et anticiper le sujet confiance/labellisation IA (reverse-halo).

---
*Sources benchmark (juin 2026, sauf contexte signalé) : ComicPad « Best AI Comic Generators June 2026 », Anifusion (vérifié juin 2026), The AI Tribune (8 mai 2026), CHI 2026 / ACM, ComicsBeat (Webtoon × Genies), AIDirectory (Canvas 2026), TNPS (AI Act Corée).*
