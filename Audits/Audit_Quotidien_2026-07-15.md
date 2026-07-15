# 🔎 Audit Quotidien DreamWeave — 2026-07-15

> Audit automatisé (tâche planifiée). Exécuté sans Louis présent — choix raisonnables pris de façon autonome et signalés. Read-only sur le code, aucun fichier applicatif modifié.

---

## 1. 🔍 Benchmark & Veille concurrentielle

**Note de méthode.** La consigne exige des sources datées du **mois courant uniquement** (fenêtre 15 juin → 15 juillet 2026). Comme au run précédent, l'essentiel des pages « comparatif d'outils » (Anifusion, Jenova, COMICPAD, Fastio) sont *evergreen* et régénérées en continu : elles portent un tampon « juillet 2026 » mais ne constituent pas des faits datés du mois. Elles sont conservées **en contexte**, pas comme sources primaires. Les faits réellement datés du mois retenus ci-dessous.

### Faits datés de la fenêtre courante (retenus)

**Midjourney V8.1 devient le modèle par défaut — 11 juin 2026.**
Sortie photoréaliste plus nette, meilleure adhérence au prompt, et surtout comportement `--cref`/`--ow` (character reference) amélioré vs V7. La cohérence de personnage — le nerf de la guerre du secteur — progresse encore chez le principal générateur grand public.
- Source : [PromptsEra — Midjourney Consistent Characters 2026](https://promptsera.com/midjourney-consistent-characters/)
- **Lecture DreamWeave** : le fossé « cohérence » se referme côté outils généralistes. L'avantage de DreamWeave ne peut pas rester « on génère des persos cohérents » seul ; il doit s'appuyer sur la **couche scénario + lore + pipeline case/bulle intégré**, que Midjourney n'offre pas.

**Comparatifs « juillet 2026 » — Dashtoon et COMICPAD en tête de catégorie.**
Sur les bancs d'essai republiés ce mois-ci : Dashtoon (~8,6/10) domine sur la cohérence de personnage + écosystème create-to-publish (levée Série A de 13 M$ en août 2025) ; COMICPAD (~8,5/10) mise sur la vitesse prompt→BD multi-pages et un tier « Custom » 21–400 pages.
- Source : [COMICPAD — Best AI Comic Generator (July 2026)](https://www.comicpad.app/best-ai-comic-generators)
- Source : [Fastio — Best AI Comic Generators 2026](https://fast.io/resources/best-ai-comic-generators-2026/)

**WEBTOON « byUs » — IA côté lecteur (rappel, 1–11 juillet 2026).**
Toujours dans la fenêtre : Naver WEBTOON pousse l'IA côté **consommation** (lecteur-acteur, character chat), pas côté **production** d'œuvres originales. Le créneau outil-d'auteur de DreamWeave reste non attaqué frontalement.
- Source : [Anime News Network — 2026-07-11](https://www.animenewsnetwork.com/news/2026-07-11/webtoon-launches-ai-story-chat-service-byus-featuring-creator-approved-webtoon-ip/.239448)

### Contexte marché & communauté (evergreen — non primaire)

- **Cohérence multi-personnages** : FLUX (PuLID) reste techniquement en tête sur les scènes de groupe (~92 % de cohérence faciale citée, vs Midjourney ~65 %). Valide le choix FLUX.2 Pro de DreamWeave. Source : [ToonyStory — Best AI for Character Consistency 2026](https://toonystory.com/blog/best-ai-for-character-consistency-2026).
- **Sentiment communauté** : les lecteurs sanctionnent vite le « low-effort AI » — *bad continuity, static faces, wrong expressions*, lettrage faible. La **qualité des bulles/lettrage** et la **cohérence inter-épisodes** sont les vrais différenciateurs perçus. Source : [The AI Tribune — 2026-05-08](https://aitribune.net/2026/05/08/ai-webtoon-in-2026/) *(hors fenêtre 30 j — contexte seulement)*.
- **Réglementaire** : labellisation IA désormais requise pour les séries monétisées (WEBTOON Canvas) et AI Basic Act coréen. À anticiper dans l'export/CGU.
- **Taille de marché** : ~14,44 Md$ (2026) → 60,25 Md$ (2031), CAGR ~33 %.

> ⚠️ **Fiabilité section 1 : moyenne.** Peu de sources strictement datées du mois côté outils de création ; le mouvement majeur reste *byUs* (côté lecteur) + le passage de Midjourney en V8.1. Recommandation récurrente : cibler changelogs concurrents + Product Hunt « this week » au prochain run.

---

## 2. 🛠️ Audit technique

*Read-only. ~47 200 LOC dans `src/`, 15 Edge Functions (+`_shared`), 49 migrations SQL, 35 fichiers de test. `npx tsc --noEmit` = **0 erreur**, `eslint .` = **0 erreur**.*

| Axe | Score /10 | Justification |
|---|---|---|
| **Qualité du code** | **8,5** | `tsc` et `eslint` passent à **0 erreur** sur 47k LOC. **0 `any` / `@ts-ignore` / `@ts-nocheck`**, **0 TODO/FIXME/HACK**, 8 `console.log` (strippés en prod via `esbuild.pure`). Logique critique testée (`tierConfigSync`, `bubbleHtmlSanitize`, `panelCanvasUndo`, `composeChapterLayout`). Bémol : god-components — `ChapterDetail.tsx` **3 174 LOC / 30 `useState` + 7 `useEffect`**, `LoreGraphView.tsx` (2 196), `ScenarioChapterEditor.tsx` (1 937). |
| **Architecture globale** | **8,5** | Layering propre et respecté (`types → integrations → services → hooks → components → pages`). `TIER_CONFIG` dédupliqué client/edge avec test anti-drift (`tierConfigSync.test.ts`) — garde-fou intelligent. 15 Edge Functions mono-responsabilité, prompts système isolés en fichiers. Bémol : **drift doc** (CLAUDE.md dit 14 fonctions, il y en a **15** ; `generate-cover-image` non documentée) + 4 handlers edge > 1 000 LOC peu modularisés. |
| **Performance & scalabilité** | **8** | Code-splitting par route (`lazyWithReload` + `<Suspense>`), vendor-chunking délibéré (`@xyflow`, `recharts`+`d3`, `html2canvas`+`jszip`, `@radix-ui`). 240 `useMemo`/`useCallback`, renderers canvas en `memo`. Hook statique `.claude/scripts/perf-audit.sh`. **Plafond réel** : `chapter_canvases.layout` = **1 seul JSONB par chapitre**, 800px × jusqu'à **100 000px**, lu/écrit en bloc à chaque save — pas de persistance incrémentale ni de virtualisation évidente. |
| **Sécurité** | **9** | **`.env` désormais untrack** (seul `.env.example` suivi ; `.env*` gitignorés) — **le blocker #1 du 13/07 est résolu.** **0 `service_role` côté client**, `stripe-webhook` vérifie la signature (`constructEventAsync` + `STRIPE_WEBHOOK_SECRET`, 400 si header absent), RLS `auth.uid()` cohérente. Les 2 seuls `dangerouslySetInnerHTML` passent par `sanitizeBubbleHtml()` (testé anti-XSS), 0 `eval`. Réserve : audit exhaustif `pg_policies` par table non réalisé (recommandé une fois). |
| **Dette technique** | **7,5** | Très peu de « rot » (0 any, 0 TODO, tsc/eslint clean). Dette **structurelle** : flag mort `allowLongMemory` (défini + testé mais **consommé nulle part**), **84 couleurs hex hardcodées** (majorité légitimes en canvas/SVG, mais fuites réelles dans `Landing.tsx`/`Auth.tsx`/`ProjectDetail.tsx`), concentration en god-files 3k LOC, drift doc 14↔15 fonctions. |

### Métriques clés (données dures)

- **TypeScript** : 0 erreur. **ESLint** : 0 erreur.
- **Volume** : ~47 177 LOC `src/`, ~11 171 LOC Edge Functions, 15 fonctions déployables, 49 migrations.
- **Tests** : **35 fichiers** (26 `src/`, 9 edge) — nette amélioration vs les « 4 fichiers » relevés le 13/07. `npm test` **non exécuté dans le sandbox** (esbuild `EPIPE` sur le FS monté — défaut d'environnement, pas de code) → **à revérifier sur la machine Windows**.
- **Plus gros fichiers** : `ChapterDetail.tsx` (3 174), `LoreGraphView.tsx` (2 196), `ScenarioChapterEditor.tsx` (1 937).
- **Marqueurs dette** : 0 TODO/FIXME/HACK, 0 `any`.

> **Évolution vs 13/07** : sécurité **6 → 9** (`.env` untrack). Qualité 8 → 8,5, tests 4 → 35 fichiers. Le score global monte à **~8,3/10** (vs ~7).

---

## 3. 📦 Audit produit

**Cohérence promesse ↔ livré : bonne.** La promesse (« générer des visuels cohérents en secondes, sans compétence d'illustration ») est tenue : pipeline Style → Assets → Scénario → Éditeur complet, Sheet System (4 angles), FLUX.2 Pro pour tous les tiers, export chapitre. Le positionnement « tout gratuit, différenciation par volume de crédits » (20/100/250) est appliqué de bout en bout — vérifié par `TIER_CONFIG` + test anti-drift.

**Incohérences / risques de sur-promesse :**

- **`allowLongMemory` fantôme** : le flag « mémoire narrative longue » existe dans la config (true pour `studio`) mais n'est **branché nulle part**. Cohérent avec la décision du 27/06 de le retirer de l'offre commerciale, mais il reste dans le code comme surface morte → à **implémenter ou supprimer** (avec son test de sync).
- **Univers v1 = seule brique roadmap non finalisée** (cartographie + Ariane). C'est le différenciateur clé (couche lore/scénario, précisément ce que les généralistes n'ont pas) — mais aussi le chantier ouvert. À trancher : cohérence avec l'ADN « graph, pas frise/timeline » (règle fondatrice CLAUDE.md).

**Sous-utilisé / redondant :** documentation produit très dense (`Produit/` ~30 fichiers, plusieurs audits quasi quotidiens) — utile mais coût de maintenance croissant ; risque de drift (déjà visible : 14↔15 fonctions). Consolidation recommandée.

---

## 4. 🎨 Audit UX / UI

- **Fluidité des parcours** : le parcours cœur (Style → Assets → Scénario → Éditeur) est linéaire et cohérent, avec fil d'Ariane complet. L'éditeur canvas (blocs image/couleur/bulles) est la pièce maîtresse — zone freezée, stable.
- **Cohérence design system** : glassmorphisme assumé, tokens HSL + classes custom (`.glass`, `.gradient-primary`), fonts Quicksand/Nunito, règles anti-slop formalisées (`.impeccable.md`, taste-skill). Bémol mesurable : **84 hex hardcodés**, dont un sous-ensemble dans `Landing.tsx`/`Auth.tsx`/`ProjectDetail.tsx` = entorses réelles aux tokens.
- **Points de friction** : (1) chapitres très longs → JSONB monolithique = latence de save potentielle ; (2) `ChapterDetail.tsx` 30 `useState` → risque de re-renders en cascade pendant le drag malgré la mémo ; (3) pas de placement **auto** de bulles ni presets d'export multi-plateformes (LINE 800px, Tapas, Lezhin) — devenus **standard marché** (COMICPAD, Anifusion, Dashtoon).
- **Vs standards concurrents** : parité sur génération cohérente + éditeur ; **retard** sur auto-lettrage et presets export ; **avance** potentielle sur la couche scénario/lore intégrée (si Univers v1 livré).

---

## 5. 💡 Suggestions d'amélioration

### 🗑️ À retirer
- **Flag `allowLongMemory`** + son test de sync s'il n'est pas implémenté sous 1 sprint (surface morte qui vend une feature absente).
- **Consolider la doc produit** : archiver les audits > 30 j, fusionner les specs redondantes (`NarraMind*.md` multiples) — réduire le drift.

### ⚡ À optimiser
- **Décomposer `ChapterDetail.tsx`** (3 174 LOC / 30 `useState`) en reducer canvas + hooks extraits — plus gros levier qualité/perf. ⚠️ Zone freezée → **valider avec Louis avant** (impacts blocs/bulles).
- **Persistance incrémentale du canvas** : sortir du modèle « 1 JSONB lu/écrit en bloc jusqu'à 100 000px » (sauvegarde partielle / virtualisation) avant que les longs chapitres deviennent courants.
- **Sweep tokens** : basculer les hex de `Landing.tsx`/`Auth.tsx`/`ProjectDetail.tsx` vers HSL (laisser les color-pickers canvas).
- **Réconcilier la doc** : passer CLAUDE.md + `EDGE_FUNCTIONS_INDEX.md` à 15 fonctions, documenter `generate-cover-image`.

### ➕ À ajouter (appuyé sur benchmark daté)
- **Placement auto de bulles + presets d'export multi-plateformes** (LINE Webtoon 800px, Tapas, Lezhin) — devenus standard chez Dashtoon/COMICPAD/Anifusion. Source datée : [COMICPAD — juillet 2026](https://www.comicpad.app/best-ai-comic-generators).
- **Démo « cohérence de personnage » comme arme marketing** : Midjourney V8.1 (11/06/2026) rapproche les généralistes ; DreamWeave doit prouver sa cohérence **inter-cases/inter-épisodes** + lettrage propre, précisément les reproches communauté. Sources : [PromptsEra](https://promptsera.com/midjourney-consistent-characters/), [ToonyStory](https://toonystory.com/blog/best-ai-for-character-consistency-2026).
- **Étiquetage IA à l'export** (label + mention CGU) pour anticiper les règles WEBTOON Canvas / AI Basic Act coréen.

---

## 6. 🚀 État de lancement

**Contexte** : fonctionnel en local + Vercel, non annoncé publiquement.

**Évolution majeure depuis le 13/07** : le **blocker sécurité #1 (`.env` committé) est résolu** — `.env` n'est plus tracké. Plus de secret exposé dans l'historique courant (recommandation résiduelle : vérifier l'historique git et faire une rotation si un secret non-`VITE_` y a figuré).

**Blockers / étapes restantes :**

1. 🟡 **Revérifier `npm test` sur Windows** (non exécutable en sandbox) — confirmer 0 régression avant dépôt public.
2. 🟡 **Univers v1** (cartographie + Ariane) — différenciateur clé encore ouvert ; décider si bloquant pour un lancement « v1 » ou repoussé post-lancement.
3. 🟡 **Aucune présence publique / marketing** — vrai frein à l'acquisition (voir §7).
4. 🟢 Réconcilier doc (14↔15 fonctions) — non bloquant.

**Checklist priorisée avant lancement public :**

1. **[P0]** Revérifier `npm test` + build prod sur Windows (0 régression).
2. **[P0]** Vérif historique git pour secrets ; rotation si besoin.
3. **[P0]** Landing orientée acquisition + **waitlist** (email capture).
4. **[P1]** Trancher le périmètre v1 : avec ou sans Univers v1.
5. **[P1]** Créer présence sociale (Instagram + réserver TikTok/X/YouTube) + teaser vidéo.
6. **[P2]** Presets export multi-plateformes + auto-bulles (parité marché).
7. **[P2]** Sweep tokens + réconciliation doc.

---

## 7. 📣 Plan marketing

Posture inchangée : produit prêt fonctionnellement, **aucune présence publique**. Priorité = construire une audience d'attente avant l'ouverture. Angle à marteler : **cohérence de personnage + couche scénario/lore** — les deux faiblesses reprochées à l'IA par la communauté.

| Tâche | Priorité | Effort |
|---|---|---|
| Finaliser la landing orientée acquisition (cohérence perso = message #1) | **Haute** | Moyen |
| Lancer une **waitlist** (email capture sur la landing) | **Haute** | Rapide |
| Créer le compte **Instagram** DreamWeave (+ réserver TikTok/X/YouTube) | **Haute** | Rapide |
| Teaser vidéo concept (30–60s : d'un prompt à une case cohérente) | **Haute** | Moyen |
| Démo « cohérence » vs reproches communauté (static faces / bad continuity) | **Haute** | Rapide |
| Préparer un **lancement Product Hunt** (assets, hunters, jour J) | Moyenne | Moyen |
| Contenu « build in public » régulier (X/Threads) | Moyenne | Moyen (récurrent) |
| Présence Reddit (r/webtoons, r/manga, r/comics) — utile, non promo | Moyenne | Moyen |
| Presets export LINE/Tapas comme argument marketing dès dispo | Basse | Rapide |
| Partenariats micro-créateurs webtoon FR pour beta feedback | Basse | Long |

---

## ✅ TL;DR

- **🟢 Blocker #1 levé** : `.env` n'est plus committé (sécurité **6 → 9**). Il ne reste comme garde-fou lancement que la revérif `npm test` sur Windows + une vérif d'historique git.
- **Technique en hausse** : `tsc` **et** `eslint` 0 erreur, 0 `any`, **35 fichiers de test** (vs 4 le 13/07), architecture propre. Note globale **~8,3/10**. Dette résiduelle concentrée sur `ChapterDetail.tsx` (3 174 LOC) et le JSONB canvas 100 000px.
- **Marché (fenêtre courante)** : Midjourney passe en **V8.1** (11/06, cohérence perso ↑) et *byUs* de WEBTOON reste côté **lecteur** → le créneau **outil d'auteur** de DreamWeave tient, mais son avantage doit basculer vers la **couche scénario/lore + pipeline case/bulle**, pas la seule cohérence.
- **Produit cohérent** avec sa promesse ; deux dettes de clarté : flag mort `allowLongMemory` (implémenter ou supprimer) et drift doc 14↔15 fonctions. **Univers v1** = dernier différenciateur à finaliser.
- **Marketing = priorité #1** : landing + waitlist + Instagram + teaser, angle **cohérence + lore**. Retard produit à combler pour la parité : **auto-bulles + presets export** (standard Dashtoon/COMICPAD/Anifusion, sources juillet 2026).

---

> 📝 **Impact Mémoire** : deux éléments datés de la fenêtre courante méritent la section Concurrence/Positionnement du mémoire — (1) Midjourney V8.1 (11/06/2026) réduit le fossé « cohérence de personnage » côté outils généralistes, ce qui déplace l'avantage défendable de DreamWeave vers la **couche scénario/lore intégrée** ; (2) auto-lettrage + presets d'export multi-plateformes sont désormais **standard de catégorie** (Dashtoon, COMICPAD, Anifusion).
> **Section concernée** : Modèle économique / Concurrence / Différenciation.
> **Proposition** : ajouter un paragraphe « À mesure que la cohérence de personnage se banalise (Midjourney V8.1, FLUX PuLID), la barrière défendable de DreamWeave n'est plus la génération cohérente seule mais l'intégration scénario → découpage → case → bulle + lore (NarraMind/Univers), sur un modèle tout-gratuit différencié par le volume de crédits. »

*Audit généré automatiquement le 2026-07-15. Choix autonomes : sources evergreen conservées en contexte faute de sources strictement datées du mois côté outils de création ; `npm test` non exécuté (incompatibilité sandbox Linux/esbuild) — à relancer sur Windows.*

## Sources

- [COMICPAD — Best AI Comic Generator (July 2026)](https://www.comicpad.app/best-ai-comic-generators)
- [Fastio — Best AI Comic Generators 2026](https://fast.io/resources/best-ai-comic-generators-2026/)
- [PromptsEra — Midjourney Consistent Characters (2026)](https://promptsera.com/midjourney-consistent-characters/)
- [ToonyStory — Best AI for Character Consistency 2026](https://toonystory.com/blog/best-ai-for-character-consistency-2026)
- [Anime News Network — WEBTOON byUs (2026-07-11)](https://www.animenewsnetwork.com/news/2026-07-11/webtoon-launches-ai-story-chat-service-byus-featuring-creator-approved-webtoon-ip/.239448)
- [The AI Tribune — AI Webtoon in 2026 (2026-05-08, contexte)](https://aitribune.net/2026/05/08/ai-webtoon-in-2026/)
