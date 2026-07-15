# 🛰️ DreamWeave — Audit quotidien

**Date :** lundi 22 juin 2026
**Type :** audit automatisé complet (benchmark + technique + produit + UX + lancement + marketing)
**Périmètre code :** branche locale, `~41 700` lignes TS/TSX, 14 Edge Functions, 42 migrations.

---

## 1. 🔍 Benchmark & Veille concurrentielle

> Fenêtre stricte appliquée : **23 mai → 22 juin 2026**. Toute source non datable dans le mois a été rejetée. Le signal récent est concentré sur la **couche modèle** (Midjourney), pas sur les produits webtoon dédiés, qui ont été silencieux en juin.

### Mouvement réel des 30 derniers jours : la couche modèle

| Acteur | Nouveauté (datée) | Source | Date |
|---|---|---|---|
| **Midjourney V8.1** | Promu **modèle par défaut** : rendu ~4 s SD / 12 s HD, meilleur rendu du texte, meilleure adhérence au prompt, HD 2x taille / 4x résolution vs V7. | https://releasebot.io/updates/midjourney | **11 juin 2026** |
| **Midjourney Draft mode** | 24 images basse-déf par job à moitié du coût d'heures rapides, puis « Vary » vers la pleine qualité ; flag `--preview`. | https://releasebot.io/updates/midjourney | **16 juin 2026** |
| **ComicPad — « Best AI Comic Generators (June 2026) »** | Comparatif daté de 10 outils (Dashtoon, Midjourney V8.1 + Niji 7, ComicsMaker.ai…) sur cohérence perso, prix, export. Auto-classement intéressé, à lire avec recul. | https://www.comicpad.app/best-ai-comic-generators | **juin 2026** |

### Concurrents dédiés — silence produit en juin

- **Dashtoon** reste le concurrent direct le plus sérieux (boucle complète création → publication → monétisation, rev-share 50 %), mais **aucune annonce de feature confirmable** sur les 30 derniers jours. Données fraîches uniquement via bases (Tracxn, PitchBook — snapshots, pas de news produit).
- **Anifusion / ComicsMaker.ai** : seuls des « vérifié juin 2026 » d'agrégateurs de reviews (prix, training LoRA), pas d'annonce first-party. Signal faible.

### Contexte plateforme (hors fenêtre stricte — fin avril)

- **WEBTOON × Genies** : avatars IA 3D interactifs (chat personnage, opt-in, monétisation), lancement « cet été ». Annoncé **27 avril 2026** — https://variety.com/2026/gaming/news/webtoon-entertainment-genies-ai-1236729996/ . Hors fenêtre, signalé comme contexte.
- **WEBTOON CANVAS** : traduction IA + labellisation obligatoire du contenu IA (26 mars 2026).

### Sentiment communauté (30 j)

- Réaction **mitigée** à Midjourney V8.1/Niji 7 sur r/midjourney et X : de « le texte marche enfin » à « vous avez tué l'âme de V7 ». Reproche récurrent **directement pertinent pour nous** : Midjourney « n'a toujours ni cases, ni bulles, ni mise en page ».
- **Sentiment anti-IA persistant** chez les créateurs webtoon (pic début mai) : boycott côté Naver, « reverse-halo » mesuré (la note de plaisir des lecteurs chute quand l'implication de l'IA est révélée). Risque de positionnement à garder en tête.

### 📌 Signal de fond

1. La seule news solide du mois est **la montée en qualité d'image de Midjourney** — pas une menace de workflow.
2. **Le gap des concurrents reste exactement notre moat** : aucun modèle d'image, même mis à jour, ne gère cases + bulles + canvas vertical. Notre couche composition est différenciante.
3. La menace structurelle unique vient de **Dashtoon**, seul à viser la même boucle « créer → publier → monétiser ».

---

## 2. 🛠️ Audit technique

| Axe | Note /10 | Justification |
|---|---|---|
| **Qualité du code** | **8,5** | `tsc --noEmit` : **0 erreur**. **Zéro `any`** dans tout `src/`. Seulement **8 `console.log`**, **0 TODO/FIXME/HACK**. Conventions respectées (hooks `useX`, services `camelCase`, types centralisés `types/index.ts`). Bémol : **27 `eslint-disable`/`@ts-ignore`** à surveiller, et des fichiers très volumineux (`ChapterDetail.tsx` 2 501 l., `LoreGraphView.tsx` 2 244 l., `SpeechBubbleEditor.tsx` 1 543 l.) qui dépassent le seuil de maintenabilité confortable. |
| **Architecture globale** | **8** | Séparation nette `types → integrations → services → hooks → components → pages`, conforme au workflow déclaré. State serveur isolé via React Query. Lazy-loading des pages bien implémenté (`lazyWithReload` dans `App.tsx`). RLS stricte par `user_id`. Bémol : quelques pages-monolithes (`ChapterDetail`, `ScenarioChapterEditor` 2 042 l.) concentrent trop de responsabilités ; candidates à un découpage en sous-composants/hooks. |
| **Perf & scalabilité** | **7** | **241 `useMemo`/`useCallback`** → mémoïsation prise au sérieux ; **1 seule** animation sur `top/left/width/height` (quasi-respect de la règle `transform`/`opacity`). Bundle `dist` raisonnable (3,8 Mo) **mais** un **PNG de 1,2 Mo non optimisé** (`Ariane_Nero_AI_Background_Remover…png`) embarqué dans le build = poids inutile. Chunk `ChapterDetail` à 157 Ko. Seulement **3 `React.memo`** pour des arbres de composants canvas lourds : marge de gain sur les listes/layers. |
| **Sécurité** | **8,5** | **Aucune fuite de `service_role` côté client** (grep `src/` = 0). CORS via **allowlist** (`_shared/cors.ts`), pas de wildcard `*`. Les 15 fichiers Edge vérifient `Authorization`/`getUser` avant d'utiliser le service role pour les lectures cross-user — pattern correct. `.env.example` documente explicitement « jamais la service_role ». RLS présente dans 13 fichiers de migration. Point d'attention : valider que **chaque** table sensible a bien une policy active (audit RLS exhaustif recommandé, non vérifiable à 100 % depuis le code seul). |
| **Dette technique** | **7** | Faible dette « sale » (0 TODO/FIXME, types propres). Mais dette **structurelle** : fichiers géants à refactorer, **couverture de tests mince** (4 fichiers `*.test.ts` pour ~290 fichiers source) et **code mort résiduel** (voir §3 : `LoreFriseView.tsx` orpheline, `TestSection.tsx`). La dette est gérable mais s'accumule sur les zones les plus chaudes (éditeur, lore). |

> ⚠️ `npm test` n'a **pas pu s'exécuter dans le sandbox** (module natif `rollup` manquant — limite d'environnement, pas un défaut du code). `tsc` passe à 0 erreur. À rejouer en local pour confirmer la non-régression.

---

## 3. 📦 Audit produit

**Cohérence features ↔ positionnement : forte.** Le parcours promis (Style → Assets → Scénario → Éditeur) est entièrement présent dans le code (`StyleManager`, `AssetLibrary`, `ScenarioSection`, `ChapterDetail`). La stratégie « tout gratuit, différenciation par le volume de crédits » est fidèlement implémentée : `Plans.tsx` affiche bien 20 / 100 / 250 crédits et 0 / 12,99 / 29,99 €, alignés sur `TIER_CONFIG`.

**Incohérences détectées :**

1. **`LoreFriseView.tsx` (419 l.) est orpheline** — `UniverseSection` ne rend que `LoreGraphView`, jamais la frise. Or l'ADN du menu Univers interdit explicitement la notion de **timeline / frise**. Ce composant est à la fois **code mort** et en **contradiction directe avec la règle fondatrice**. À supprimer.
2. **`TestSection.tsx` (672 l.)** est monté dans `ProjectDetail` : nom et taille suggèrent un artefact de dev / bac à sable exposé en prod. À clarifier (retirer ou renommer si c'est une vraie feature).
3. **Univers v1 encore marqué 🔴 dans la roadmap** alors que beaucoup de surface lore est déjà codée (`LoreGraphView`, `LoreNodeSheet`, `CompassSuggestionsPanel`, proposals Ariane). L'état réel semble plus avancé que le statut affiché — à resynchroniser.

**Features sous-utilisées / redondantes :** le doublon historique « multi-vues » est bien retiré au profit du Sheet System. RAS de ce côté. Le risque inverse existe : **richesse Ariane/Compass importante** (≈ 8 hooks, plusieurs panneaux) pour une feature encore en v1 — vérifier que la valeur perçue justifie la surface de maintenance.

---

## 4. 🎨 Audit UX / UI

**Fluidité des parcours.** Le tunnel principal est cohérent et linéaire (Style → Assets → Scénario → Éditeur), renforcé par l'onboarding Ariane (`ArianeTabTourOverlay`, `ArianeOnboardingCard`) et un fil d'Ariane complet. Bon point : garde-fous quota côté UX (`QuotaReachedDialog`, vérif `canGenerate()` avant FAL.ai) — l'utilisateur Libre est cadré sans cul-de-sac.

**Cohérence design system.** Respect global de la charte : tokens HSL, glassmorphisme, polices Quicksand/Nunito, quasi-absence d'animations interdites (1 seule occurrence `top/left`). Les `eslint-disable` (27) et les fichiers UI géants sont le principal risque de dérive visuelle à terme.

**Points de friction identifiés.**
- **Éditeur dense** : `ChapterDetail` concentre canvas + blocs + bulles + sidebar + scénario. Sur un écran moyen, la charge cognitive est élevée ; risque de surcharge pour un primo-créateur.
- **Asset lourd au chargement** : le PNG 1,2 Mo dans le bundle peut allonger le premier rendu sur connexion lente.
- **Statut Univers ambigu** (frise morte vs graph) : risque d'incohérence si la frise réapparaît un jour dans l'UI.

**Comparaison aux standards concurrents (§1).** Là où Midjourney/Niji s'arrêtent à l'image, DreamWeave offre la **composition complète** (cases, bulles, canvas vertical) — avantage UX net et confirmé par le reproche communautaire récurrent « no panel/bubble tools ». Le retard se situe sur la **boucle de publication/monétisation** que Dashtoon propose nativement, absente ici.

---

## 5. 💡 Suggestions d'amélioration

### 🗑️ Retraits

- **Supprimer `LoreFriseView.tsx`** (orphelin + contraire à l'ADN « pas de timeline/frise » du menu Univers). Gain : −419 lignes, cohérence produit.
- **Clarifier/retirer `TestSection.tsx`** s'il s'agit d'un reliquat de dev exposé en prod.
- **Sortir le PNG 1,2 Mo du bundle** (le servir depuis Storage / le compresser en WebP). Gain perf immédiat.

### ⚡ Optimisations

- **Découper `ChapterDetail.tsx` (2 501 l.) et `LoreGraphView.tsx` (2 244 l.)** en sous-composants + hooks dédiés — sans toucher à la zone canvas freezée (blocs/couleur/bulles), à signaler avant toute modif de cette zone.
- **Augmenter la couverture de tests** sur les zones chaudes (éditeur, quotas, génération) : 4 fichiers de test pour ~290 sources, c'est le maillon faible de la dette.
- **Mémoïser les layers canvas** (seulement 3 `React.memo`) pour réduire les re-rendus sur drag/resize.
- **Audit RLS exhaustif** table par table avant lancement public.

### ➕ Ajouts (appuyés par le benchmark daté)

- **Boucle d'export/publication renforcée** — c'est le différenciateur de Dashtoon (boucle créer→publier→monétiser). Source : ComicPad « Best AI Comic Generators (June 2026) », https://www.comicpad.app/best-ai-comic-generators (juin 2026).
- **Anticiper la labellisation IA** (mention « créé avec assistance IA » optionnelle/automatique). Le « reverse-halo » et la labellisation obligatoire côté Corée (WEBTOON, 26/03/2026) en font un sujet de confiance utilisateur. Sources : https://www.comicpad.app/best-ai-comic-generators (juin 2026) ; contexte WEBTOON https://variety.com/2026/gaming/news/webtoon-entertainment-genies-ai-1236729996/ (27/04/2026).
- **Veille modèle image** : suivre Midjourney V8.1 (par défaut depuis le 11/06/2026) comme référence de qualité visuelle pour calibrer FLUX.2 Pro. Source : https://releasebot.io/updates/midjourney (11 & 16 juin 2026).

---

## 6. 🚀 État de lancement

**Contexte :** tourne en local + build Vercel (`vercel.json`, `dist` présent), non annoncé publiquement.

**Bloquants / étapes restantes :**

- 🔴 **Confirmer la suite de tests en CI** (n'a pas pu tourner dans le sandbox) — non négociable avant prod.
- 🔴 **Audit RLS exhaustif** sur toutes les tables sensibles.
- 🟠 **Nettoyage code mort** (`LoreFriseView`, `TestSection`) + asset 1,2 Mo hors bundle.
- 🟠 **Resynchroniser le statut Univers v1** (roadmap vs code réel).
- 🟢 Stripe (checkout + portal + webhook) déjà câblé — vérifier en mode live + clés prod.

**Checklist priorisée :**

1. `npm test` vert en CI + `tsc` 0 erreur (vérifié) — **P0**
2. Audit RLS table par table — **P0**
3. Test bout-en-bout du flux paiement Stripe en live — **P0**
4. Retrait code mort + optimisation asset lourd — **P1**
5. Resync roadmap/statut Univers — **P1**
6. Page de capture (waitlist) + analytics avant annonce — **P1**
7. Politique de labellisation IA / mentions légales — **P2**

---

## 7. 📣 Plan marketing

| Tâche | Priorité | Effort |
|---|---|---|
| Lancer une **waitlist** (capture email) sur la landing avant annonce | **Haute** | Court |
| Écrire une **landing orientée acquisition** (promesse « webtoon cohérent en secondes, sans savoir dessiner ») | **Haute** | Moyen |
| Créer le **compte Instagram + TikTok** DreamWeave (format vertical = ADN webtoon) | **Haute** | Court |
| Publier une **vidéo teaser concept** (génération asset → case → bulle en 30 s) | **Haute** | Moyen |
| Préparer un **lancement Product Hunt** (le créneau produit dédié était vide en juin = fenêtre ouverte) | Moyenne | Moyen |
| Saisir le **gap « pas de cases/bulles » de Midjourney** comme angle de comm comparatif | Moyenne | Court |
| Présence ciblée **Reddit (r/webtoons, r/manga, r/StableDiffusion)** + Discord créateurs | Moyenne | Long |
| Programme **créateurs early-access** (10–20 webtooneurs, témoignages avant/après) | Moyenne | Long |
| Kit **SEO / blog** (« créer un webtoon avec l'IA ») pour capter le trafic des listicles | Basse | Long |

---

## 📌 TL;DR

- **Aucun lancement concurrent dédié confirmable en juin** : la seule news solide est **Midjourney V8.1 par défaut (11/06)** qui relève la barre de qualité image — mais aucun modèle ne gère cases/bulles/canvas, **notre moat reste intact**. Seul **Dashtoon** menace structurellement (boucle créer→publier→monétiser).
- **Code sain** : `tsc` 0 erreur, 0 `any`, 0 TODO, sécurité solide (pas de fuite service_role, CORS allowlist, JWT vérifié dans les Edge Functions). Notes 7–8,5/10 sur tous les axes.
- **Dette structurelle** à traiter avant prod : fichiers géants (`ChapterDetail` 2 501 l.), **tests trop peu nombreux** (4 fichiers), et **code mort** (`LoreFriseView` orpheline **et contraire à l'ADN Univers**, `TestSection` exposé).
- **Bloquants lancement P0** : confirmer les tests en CI, audit RLS exhaustif, test Stripe en live.
- **Actions marketing immédiates** : waitlist + landing acquisition + compte vertical (Insta/TikTok) + teaser, en exploitant le créneau Product Hunt vide et le gap « pas de cases/bulles » des modèles d'image.

---

> 📝 **Impact Mémoire** : cet audit confirme deux points stratégiques pour `Produit/Memoire_DreamWeave.md` — (1) la **différenciation par la couche composition** (cases/bulles/canvas) face aux modèles d'image purs reste valide et documentée par le benchmark de juin 2026 ; (2) **Dashtoon** doit être nommé comme concurrent direct principal (boucle de monétisation).
> **Section concernée** : Concurrence / Différenciation.
> **Proposition** : ajouter un paragraphe « Veille concurrentielle (juin 2026) : les modèles d'image (Midjourney V8.1) progressent mais ne couvrent pas la composition narrative ; DreamWeave se différencie par sa couche cases/bulles/canvas vertical. Concurrent direct le plus proche : Dashtoon, qui possède la boucle complète création→publication→monétisation que DreamWeave devra adresser. »

*Rapport généré automatiquement — audit quotidien DreamWeave du 22 juin 2026.*
