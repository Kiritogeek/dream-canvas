# 🔎 Audit Quotidien DreamWeave — 2026-07-13

> Audit automatisé (tâche planifiée). Exécuté sans Louis présent — choix raisonnables pris de façon autonome et signalés.

---

## 1. 🔍 Benchmark & Veille concurrentielle

**Note de méthode importante.** La consigne exige des sources datées du **mois courant (juillet 2026) uniquement**. La quasi-totalité des pages « comparatif d'outils » remontées (Anifusion, Jenova, COMICPAD, Fastio, etc.) sont des pages evergreen datées mars/avril 2026 — **hors fenêtre de 30 jours**, donc écartées comme sources primaires et citées seulement en contexte. Deux faits sont réellement datés de juillet 2026 et servent de base au benchmark de ce jour.

### Faits datés du mois courant (retenus)

**WEBTOON lance « byUs », un service de story-chat IA — 1er / 11 juillet 2026**
Naver WEBTOON a lancé le 1er juillet 2026 *byUs*, un service IA où le lecteur devient protagoniste d'un webtoon (IP approuvées par les créateurs) et fait avancer l'histoire en conversant avec les personnages. Deux modes : *Original Stories* et *Fan Stories* (UGC). Disponible en Corée d'abord.
- Source : [Anime News Network — 2026-07-11](https://www.animenewsnetwork.com/news/2026-07-11/webtoon-launches-ai-story-chat-service-byus-featuring-creator-approved-webtoon-ip/.239448)
- Source : [Korea JoongAng Daily](https://www.koreajoongangdaily.com/entertainment/naver-webtoons-new-ai-service-lets-fans-write-themselves-into-the-story/12749315)
- **Lecture DreamWeave** : le leader du marché pousse l'IA côté **consommation** (lecteur-acteur), pas côté **production** d'œuvres originales. Le créneau de DreamWeave — outil d'**auteur** générant une œuvre cohérente — reste distinct et non attaqué frontalement par ce lancement.

**WEBTOON × Genies — feature « Character Chat » (avatars IA), 2026**
Partenariat WEBTOON / Genies pour du chat personnage à base d'avatars IA. Confirme la même tendance : l'IA sert l'**engagement lecteur**, pas la création d'épisodes.
- Source : [Variety — 2026](https://variety.com/2026/gaming/news/webtoon-entertainment-genies-ai-1236729996/) *(année confirmée, mois non précisé — contexte, non primaire)*

### Contexte concurrentiel (sources evergreen, hors fenêtre — non primaires)

Paysage des outils de **création** IA (concurrents directs de DreamWeave) : **Anifusion**, **Dashtoon**, **LlamaGen**, **Jenova Webtoon Creator**, **COMICPAD**, **GenToon**, **Komiko**, **ComicsMaker.ai**. Fonctions désormais standard du marché : cohérence de personnage (identity embedding 1-3 images / LoRA 5-10 images), génération de cases, placement auto de bulles, presets d'export (LINE Webtoon 800px, Tapas, Lezhin), et agent scénario intégré.

Repères de prix (pour situer la grille DreamWeave 0 / 12,99 / 29,99 €) :
- **Anifusion** : 9,99–49,99 $/mois, 100 crédits gratuits à l'inscription.
- **Dashtoon** : free tier 100 images/jour, packs one-time ~27 $, abo ~10 $/mois.
- **Jenova Webtoon Creator** : gratuit limité, payant dès 20 $/mois.
- **LlamaGen** : 1 000 crédits gratuits (~6-7 cases).

Sentiment communauté (analyses 2026, non datées juillet) : sur Reddit/Webtoon Canvas, les lecteurs repèrent et sanctionnent vite le « low-effort AI » — reproches récurrents : *bad continuity*, *static faces*, *wrong expressions*, lettrage faible. La cohérence multi-épisodes et la qualité du lettrage/bulles sont les vrais différenciateurs perçus.
- Sources : [Anifusion — comparatifs 2026](https://anifusion.ai/articles/best-manga-creator-2026/), [Jenova Webtoon Creator](https://www.jenova.ai/en/resources/ai-webtoon-creator), [The AI Tribune — 2026-05-08](https://aitribune.net/2026/05/08/ai-webtoon-in-2026/)

**Taille de marché** : webtoon estimé 14,44 Md$ en 2026 → 60,25 Md$ projeté 2031 (CAGR ~33 %, Mordor Intelligence, cité par plusieurs sources).

> ⚠️ **Fiabilité section 1 : moyenne.** Peu de sources strictement datées juillet 2026 étaient disponibles côté outils de création. Le seul mouvement majeur daté du mois est le lancement *byUs* de WEBTOON (côté lecteur). Recommandation : au prochain run, cibler des requêtes datées (Product Hunt « this week », changelogs concurrents) pour renforcer la fraîcheur.

---

## 2. 🛠️ Audit technique

*(Read-only. 173 fichiers TS/TSX, ~41,7k LOC dans `src/`, 14 Edge Functions, 42 migrations SQL. `npx tsc --noEmit` = **0 erreur**.)*

| Axe | Score /10 | Justification |
|---|---|---|
| **Qualité du code** | **8** | `tsc --noEmit` passe à **0 erreur**. **Zéro `: any` / `as any`** dans tout `src/`, seulement 8 `console.log`, 0 TODO/FIXME. Bémol : **21 suppressions `react-hooks/exhaustive-deps`** (dont 7 dans `ChapterDetail.tsx`) masquent des risques de dépendances (27 suppressions lint au total). |
| **Architecture globale** | **8** | Layering propre et respecté : `types → integrations → services(18) → hooks(30) → components(89) → pages(13)`. 14 Edge Functions mono-responsabilité avec `_shared/` (cors, tierConfig, prompts). Risque : plusieurs « god-files » concentrent la logique au lieu de la décomposer. |
| **Performance & scalabilité** | **7** | Budget mémo correct : 81 `useMemo`, 168 `useCallback`, renderers canvas chauds en `memo` (`ImageBlockLayer.tsx:80`, `ColorBlockLayer.tsx:41`). **Une seule** animation non-transform (`LoreGraphView.tsx:919`, `stroke-width`). Point chaud : `ChapterDetail.tsx` (2501 LOC, 66 hooks) ; canvas jusqu'à 100 000px sans virtualisation évidente. |
| **Sécurité** | **6** | Modèle sain : Edge Functions valident le token (anon-key client), `stripe-webhook` vérifie la signature, fonctions admin gate sur email (403), **0 `service_role` côté client**, RLS cohérente. **Fuite réelle : `.env` est committé dans git** (malgré `.gitignore`) → expose les clés `VITE_SUPABASE_*` (anon, publiques par design) + `VITE_ADMIN_EMAIL`. |
| **Dette technique** | **6** | Peu de « rot » (0 any, 0 TODO, tsc clean) mais dette **structurelle** concentrée : 6 fichiers > 900 LOC, une page de 2501 LOC, 154 couleurs hardcodées vs design system, `.env` committé, couverture de tests faible (4 fichiers de test). |

### Métriques clés

- **TypeScript** : 0 erreur (intégrité de type confirmée).
- **Tests** : `npm test` (Vitest) **non exécutable dans le sandbox Linux** — `node_modules` installé pour win32, binaires natifs rollup/esbuild incompatibles. Ce n'est **pas un défaut de code** ; à relancer sur la machine Windows. Couverture fine : **4 fichiers de test** pour 173 fichiers source.
- **Plus gros fichiers** : `ChapterDetail.tsx` (2501), `LoreGraphView.tsx` (2244), `ScenarioChapterEditor.tsx` (2042), `SpeechBubbleEditor.tsx` (1543), `ScenarioTextHighlighter.tsx` (1239).
- **TODO/FIXME/HACK** : 0. **`: any`** : 0. **Suppressions lint** : 27 (dont 21 `exhaustive-deps`).
- **Couleurs hardcodées** (`#rrggbb`/`rgb()`) dans components+pages : **154** occurrences (beaucoup légitimes en SVG, mais `Auth.tsx`/`Landing.tsx`/`ProjectDetail.tsx`/`ChapterDetail.tsx` méritent un passage de conformité tokens).
- **Dépendances** : 52 runtime + 26 dev, versions à jour. Seuls risques mineurs : `html2canvas@1.4.1` (non maintenu), `lovable-tagger`.

### Sécurité — détail

- 🔴 **`.env` tracké dans git** → à `git rm --cached .env` + rotation si un secret non-`VITE_` y a déjà figuré. Impact limité (clés anon publiques + RLS = vraie barrière) mais mauvaise pratique + fuite de l'email admin.
- 🟢 **0 `service_role`** côté client ; il ne vit que dans les Edge Functions.
- 🟢 **Gate admin** côté serveur (403 si email ≠ ADMIN_EMAIL) ; le client n'utilise `VITE_ADMIN_EMAIL` que pour révéler l'UI, jamais comme barrière de sécurité — défense en profondeur correcte.
- 🟡 Email admin `kiritogeek@gmail.com` dupliqué en dur dans 3 Edge Functions (fragile, pas une vulnérabilité).

### Top dette technique (par sévérité)

1. 🔴 `.env` committé (untrack + rotation).
2. 🟠 `ChapterDetail.tsx` — 2501 LOC / 66 hooks (point chaud re-render + maintenabilité ; zone canvas « freezée » → refactor coûteux).
3. 🟠 Tests automatisés minces (4 fichiers ; aucune couverture de l'éditeur canvas/bulles au-delà de `panelCanvasUndo`/`panels`).
4. 🟠 `LoreGraphView.tsx` (2244 LOC, 3 `exhaustive-deps` désactivés).
5. 🟡 21 suppressions `exhaustive-deps` = autant de bugs de stale-closure latents.
6. 🟡 154 couleurs hardcodées vs tokens.
7. 🟡 `ScenarioChapterEditor.tsx` (2042) / `SpeechBubbleEditor.tsx` (1543) à décomposer.
8. 🟢 ADMIN_EMAIL dupliqué + `html2canvas` non maintenu.

---

## 3. 📦 Audit produit

**Cohérence positionnement ↔ features livrées : élevée.** La promesse — « générer des visuels cohérents en secondes, sans compétences d'illustration » — est tenue par les briques présentes : Style System, Sheet System (fiche 4 angles), Assets, Scénario IA (Groq/Gemini), découpage → cases, éditeur de composition (blocs image/couleur/bulles), export chapitre, mémoire narrative NarraMind + Compass vectoriel. Le parcours **Style → Assets → Scénario → Éditeur** est complet et linéaire.

**Cohérence du modèle « tout gratuit ».** La décision « toutes les features sur tous les plans, différenciation par volume de crédits » (actée 2026-05-30) est solide face au marché : les concurrents facturent les mêmes fonctions en gating, DreamWeave se différencie par le volume (20 / 100 / 250 crédits) façon Spotify. Cohérent et défendable. Seules exclusivités Studio : mémoire longue + priorité FAL.ai.

**Incohérences / risques produit.**
- **Univers v1 (cartographie + Ariane) est la seule brique roadmap non terminée** (🔴), or l'ADN « bâtir son Univers grâce au scénario » est un argument différenciant fort face aux concurrents qui n'ont pas de couche lore structurée. C'est le bon prochain chantier.
- **Deux vues Lore coexistent** : `LoreGraphView.tsx` (2244 LOC) **et** `LoreFriseView.tsx`. Or l'ADN Univers exclut explicitement « timeline / frise / visualisation temporelle ». La *Frise* est potentiellement en contradiction avec la règle fondatrice — **à statuer** (garder graph seul ?).
- **Ariane** est très présente (14 composants `ariane/*` + modales) : richesse d'onboarding, mais risque de surcharge d'accompagnement pour un produit encore pré-lancement sans base d'utilisateurs pour valider l'utilité réelle.

**Features potentiellement sous-utilisées / redondantes** : `LoreFriseView` (vs graph), `TestSection.tsx` (résidu de dev ?), abondance de cartes d'onboarding Ariane (`ArianeOnboardingCard`, `ArianeStyleOnboardingCard`, `ArianeTabTourOverlay`, `ArianeJourneyCompleteCard`).

---

## 4. 🎨 Audit UX / UI

**Fluidité des parcours.** Le flux principal est cohérent et bien découpé (pages lazy-loadées, sidebar éditeur, panneaux droite/gauche). L'éditeur canvas est l'écran le plus lourd (2501 LOC) : UX riche mais surface de risque de lag maximale — la mémoïsation en place limite les re-renders, à surveiller sur canvas très hauts.

**Cohérence visuelle & design system.** Direction assumée (glassmorphisme, `.glass`, `gradient-primary`, tokens HSL, Quicksand + Nunito) documentée dans `.impeccable.md` + taste-skill. Bonne discipline anti-AI-slop. **Friction** : 154 couleurs hardcodées et l'apparition de `Auth.tsx`/`Landing.tsx` dans la liste indiquent des écarts ponctuels aux tokens à corriger avant lancement public (l'inconsistance se voit surtout sur la landing, vitrine d'acquisition).

**Points de friction identifiés.**
- Densité d'onboarding Ariane potentiellement intrusive (plusieurs overlays/cartes).
- Canvas jusqu'à 100 000px sans virtualisation → risque de scroll lourd sur longs chapitres.
- Coexistence Graph/Frise dans Univers = charge cognitive + message produit flou.

**Comparaison aux standards concurrents (section 1).** Les concurrents (GenToon, Dashtoon, Anifusion) mettent en avant : placement **auto** de bulles (12 types), cohérence perso 1-clic, presets d'export multi-plateformes (LINE/Tapas/Lezhin). DreamWeave a bulles + cases + export chapitre, mais **le placement auto de bulles et les presets d'export multi-plateformes ne sont pas mis en avant** — écart UX à combler pour rester au niveau. Point fort DreamWeave vs concurrents : la couche **scénario + mémoire narrative (NarraMind/Compass)** est plus profonde que la moyenne du marché.

---

## 5. 💡 Suggestions d'amélioration

### 🗑️ Retraits
- **`LoreFriseView` / vue Frise** — en tension avec l'ADN Univers (« ce n'est PAS une timeline/frise »). Trancher : conserver le **graph seul**. Retire ~1 composant + réduit la charge cognitive.
- **`TestSection.tsx`** — vérifier si résidu de dev à supprimer avant lancement public.
- **Alléger l'onboarding Ariane** — fusionner plusieurs cartes/overlays en un flux unique ; garder l'accompagnement, réduire le nombre de surfaces.

### ⚡ Optimisations
- **Décomposer `ChapterDetail.tsx` (2501 LOC / 66 hooks)** — extraire hooks/panneaux (hors zone canvas freezée) pour réduire les re-renders et la dette. Prioritaire.
- **Résorber les 21 `exhaustive-deps` désactivés** — chacun = bug latent.
- **Passage conformité tokens** sur les 154 couleurs hardcodées, en priorité `Landing.tsx` + `Auth.tsx` (vitrine).
- **Virtualiser le canvas** sur chapitres très hauts (mesurer le nombre de nœuds DOM d'abord).
- **Couverture de tests** sur l'éditeur canvas/bulles (zone freezée = régressions coûteuses).

### ➕ Ajouts (appuyés sur le benchmark daté)
- **Placement auto de bulles** — standard concurrent (GenToon : 12 types auto-placés). Aligne DreamWeave sur l'attente marché. *Source : [Jenova Webtoon Creator](https://www.jenova.ai/en/resources/ai-webtoon-creator) — placement/dialogue intégré comme standard.*
- **Presets d'export multi-plateformes** (LINE Webtoon 800px / Tapas / Lezhin) — les concurrents en font un argument. *Source : [Jenova — presets LINE 800px, Tapas, Lezhin](https://www.jenova.ai/en/resources/ai-webtoon-generator).*
- **Finaliser Univers v1** (cartographie + Ariane scan scénario → fiches lore) — différenciateur : les concurrents n'ont pas de couche lore structurée branchée sur le scénario. *Contexte : sentiment communauté valorise la cohérence multi-épisodes ([The AI Tribune, 2026-05-08](https://aitribune.net/2026/05/08/ai-webtoon-in-2026/)).*
- **Renforcer la cohérence de personnage comme argument #1** — c'est LE reproche communauté (static faces, bad continuity). Le Sheet System 4 angles est déjà un atout ; le marketer explicitement. *Source : [The AI Tribune, 2026-05-08](https://aitribune.net/2026/05/08/ai-webtoon-in-2026/).*

---

## 6. 🚀 Statut de lancement

**Contexte** : tourne en local et/ou Vercel, non annoncé publiquement. Stripe ✅, plans ✅, scénario/éditeur/sheet ✅. Univers v1 🔴 en cours.

**Blockers identifiés.**
- 🔴 **`.env` committé** — à corriger **avant** tout dépôt public (untrack + rotation).
- 🟠 **Suite de tests non vérifiée** ce jour (env sandbox) — relancer `npm test` sur Windows pour confirmer 0 régression avant lancement.
- 🟠 **Univers v1 incomplet** — décider si lancement se fait avec ou sans (peut être post-lancement).
- 🟡 **Conformité tokens landing/auth** — polish vitrine avant acquisition.

**Checklist de lancement priorisée.**
1. **[P0]** `git rm --cached .env` + rotation clés + vérifier `.gitignore` effectif.
2. **[P0]** `npm test` vert sur Windows + `tsc --noEmit` (déjà 0).
3. **[P0]** Polish landing : conformité tokens, copy anti-slop, hero.
4. **[P1]** Décision Univers v1 : in / out du lancement.
5. **[P1]** Trancher Graph vs Frise (aligner ADN Univers).
6. **[P1]** QA parcours complet Style → Assets → Scénario → Éditeur → Export sur données vides + quota atteint + plan Libre.
7. **[P2]** Décomposer `ChapterDetail.tsx` + résorber `exhaustive-deps`.
8. **[P2]** Presets export multi-plateformes + placement auto bulles (parité marché).

---

## 7. 📣 Plan marketing

Posture actuelle : produit prêt fonctionnellement, **aucune présence publique**. Priorité = construire une audience d'attente avant l'ouverture.

| Tâche | Priorité | Effort |
|---|---|---|
| Écrire/finaliser la landing orientée acquisition (cohérence perso = message #1) | **Haute** | Moyen |
| Lancer une **waitlist** (email capture sur la landing) | **Haute** | Rapide |
| Créer le compte **Instagram** DreamWeave (+ réserver TikTok/X/YouTube) | **Haute** | Rapide |
| Teaser vidéo concept (30-60s : d'un prompt à une case cohérente) | **Haute** | Moyen |
| Préparer un **lancement Product Hunt** (assets, hunters, jour J) | Moyenne | Moyen |
| Contenu « behind-the-scenes » régulier (build in public, X/Threads) | Moyenne | Moyen (récurrent) |
| Démo « cohérence de personnage » face aux reproches communauté (static faces) | Moyenne | Rapide |
| Présence Reddit (r/webtoons, r/manga, r/comics) — utile, non promo | Moyenne | Moyen |
| Partenariats micro-créateurs webtoon FR pour beta feedback | Basse | Long |
| Presets export LINE/Tapas comme argument marketing dès dispo | Basse | Rapide |

> Angle différenciant à marteler partout : **cohérence de personnage + couche scénario/lore** — précisément les deux points faibles reprochés à l'IA par la communauté ([The AI Tribune, 2026-05-08](https://aitribune.net/2026/05/08/ai-webtoon-in-2026/)).

---

## ✅ TL;DR

- **Technique solide** : `tsc` 0 erreur, 0 `any`, layering propre, auth/RLS/Stripe sains. Note globale ~7/10. Dette concentrée sur quelques god-files (`ChapterDetail.tsx` 2501 LOC) + tests minces.
- **🔴 Blocker lancement #1 : `.env` committé dans git** → untrack + rotation avant tout dépôt public. Tests à revérifier sur Windows.
- **Marché juillet 2026** : le seul mouvement majeur daté est *byUs* de WEBTOON (IA côté **lecteur**, pas création) → le créneau **outil d'auteur** de DreamWeave reste libre. Peu de sources strictement datées du mois côté concurrents.
- **Produit cohérent** avec sa promesse ; à trancher : **Graph vs Frise** dans Univers (la Frise contredit l'ADN), et finaliser **Univers v1** comme différenciateur.
- **Marketing = priorité #1 avant lancement** : landing + waitlist + Instagram + teaser. Angle : **cohérence de personnage + lore**, les deux faiblesses que la communauté reproche à l'IA.

---

> 📝 **Impact Mémoire** : le paysage concurrentiel de juillet 2026 (WEBTOON byUs, positionnement IA « côté lecteur » des acteurs majeurs) et la grille de prix des concurrents (Anifusion 9,99–49,99 $, Dashtoon ~10 $) peuvent enrichir la section concurrence/positionnement du mémoire.
> **Section concernée** : Modèle économique / Concurrence.
> **Proposition** : ajouter un paragraphe notant que les leaders (WEBTOON/Naver) investissent l'IA côté **engagement lecteur** (byUs, character chat) tandis que les outils de **création** (Anifusion, Dashtoon, GenToon) se disputent le créneau auteur en gating de features — DreamWeave se différenciant par le modèle « tout gratuit, différenciation par volume de crédits ».

*Audit généré automatiquement le 2026-07-13. Choix autonomes : sources evergreen conservées en contexte faute de sources strictement datées juillet ; `npm test` non exécuté (incompatibilité sandbox Linux) — à relancer sur Windows.*
