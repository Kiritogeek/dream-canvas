# 🔍 Audit Quotidien DreamWeave — 2026-08-13

*Audit automatisé complet. Branche `pre-production` · commit `8a3c92a` · read-only. Sources benchmark : juillet–août 2026 uniquement (< 30 jours), sauf mention contraire signalée. Exécuté sans supervision (tâche planifiée) — aucune modification de code effectuée.*

---

## 1. 🔍 Benchmark & Competitive Intelligence

> Recherche exhaustive menée (requêtes variées : lancements IA webtoon, Reddit, Product Hunt, X). Très peu de matière datable au mois courant a été trouvée côté concurrents directs (Dashtoon, Komiko, Anifusion, etc.) — le contenu disponible sur ces outils est majoritairement du SEO non daté ("Best AI Comic Generators 2026"), écarté conformément à la règle des 30 jours. Le seul acteur avec de l'actualité datée et sourcée ce mois-ci est **WEBTOON Entertainment** (Nasdaq: WBTN), via ses résultats Q2 2026 — plateforme de distribution dominante, pas un concurrent direct de production, mais son virage IA est un signal de marché de premier plan.

### WEBTOON Entertainment — virage stratégique IA (résultats Q2 2026)

**Bios** (chat narratif IA avec personnages IP officiels, lancé en Corée, extension au Japon prévue fin 2026), **auto-traduction en beta** pour les créateurs Canvas anglophones (lancée mai 2026, extension en cours), et **Cuts Make** (animation courte IA pour IP officielle — +136 % de contenu, +188 % d'usage créateurs semaine après lancement). Nouveau fonds IP de 100 M$ avec Naver (juillet 2026) + rachat de 60 % du studio de jeu coréen RI Games Holdings pour adapter les IP WEBTOON en jeux.
Sources : [MarketBeat, 2026-08-11](https://www.marketbeat.com/instant-alerts/webtoon-entertainment-q2-earnings-call-highlights-2026-08-10/) · [Forbes, 2026-08-11](https://www.forbes.com/sites/robsalkowitz/2026/08/11/webtoons-growth-is-slowing-but-its-ambitions-are-growing/) · [Bloomberg, 2026-08-10](https://www.bloomberg.com/news/articles/2026-08-10/webtoon-buys-100-million-share-in-game-studio-to-expand-reach)

**Lecture pour DreamWeave :** le leader du marché double sa mise sur l'IA côté *consommation/IP* (chat narratif, animation courte, adaptation jeux à partir d'IP existantes), pas sur la *production assistée* pour créateurs indépendants sans compétence d'illustration — le créneau de DreamWeave reste distinct. Le ralentissement de croissance organique de WEBTOON (guidance Q3 : +0,7 % à +3,3 % seulement) confirme aussi que le marché de la distribution webtoon mûrit, ce qui renforce la valeur d'outils de production qui réduisent le coût de création pour les nouveaux entrants.

### Sentiment communautaire

Aucun fil Reddit/Discord/X daté et vérifiable ce mois-ci n'a pu être trouvé malgré plusieurs requêtes ciblées (`site:reddit.com`, Product Hunt juillet/août 2026, recherches X). Ce vide est signalé explicitement plutôt que comblé par du contenu non daté. Recommandation : un accès direct aux API Reddit/X ou une recherche manuelle sur r/webtoons, r/comicbooks et les Discords d'outils spécifiques serait nécessaire pour un signal fiable — le web search général indexe mal les posts sociaux récents.

**Conclusion benchmark :** mois pauvre en actualité concurrentielle directe. Aucune menace nouvelle identifiée sur le créneau précis de DreamWeave (production assistée, créateurs solo sans compétence illustration, cohérence de style par génération d'assets). À surveiller au prochain cycle : tout lancement Dashtoon/Komiko/Jenova avec date vérifiable.

---

## 2. 🛠️ Technical Audit

| Axe | Score /10 | Justification |
|---|---|---|
| **Qualité du code** | **8** | `npx tsc --noEmit` → **0 erreur**. `any`/`as any` quasi absent (1 seule occurrence, dans `supabase/functions/generate-asset-image/index.ts`, 0 dans `src/`). 0 `TODO`/`FIXME`/`HACK`. `console.log` discipliné (gated `import.meta.env.DEV` dans `EmailVerification.tsx`), `console.warn/error` réservés aux vrais chemins d'erreur (`useUserPlan.ts:28`, `useAssetGeneration.ts:145`). Commentaires respectent la règle « WHY pas WHAT » du CLAUDE.md. Bémol : god-components — `ChapterDetail.tsx` (3174 lignes), `ScenarioChapterEditor.tsx` (1937 lignes), `LoreGraphView.tsx` (2196 lignes) nuisent à la lisibilité locale malgré une organisation interne correcte. |
| **Architecture** | **8** | Couches `types → integrations → services → hooks → components → pages` respectées de façon cohérente. Edge Functions mutualisent `_shared/cors.ts` plutôt que de dupliquer la logique CORS. Écart doc/réalité : CLAUDE.md annonce **14 Edge Functions**, le repo en compte **15** (`generate-cover-image` existe et n'est pas documentée dans le tableau du CLAUDE.md). Bonne discipline de couplage : `useUserPlan.ts` importe `computeUsagePeriodStart`/`computeNextResetDate` depuis un module `@fn-shared` partagé client/Edge Function pour garder la logique de quota synchronisée. |
| **Performance & scalabilité** | **7** | `ChapterDetail.tsx` (zone protégée) montre une vraie discipline de mémoïsation : 32 `useMemo`/`useCallback` contre 8 dans `ProjectDetail.tsx`. Le hook `.claude/scripts/perf-audit.sh` bloque activement sur `background-attachment:fixed`, `transition: all`, timers sans cleanup, listeners sans `removeEventListener`, `<img>` sans `loading="lazy"`, `key={Math.random()}` — un vrai garde-fou exécuté, pas seulement documenté. Risque non mitigé : `chapter_canvases` stocke `layout`/`speech_bubbles`/`color_blocks` en JSONB sur **une seule ligne par chapitre**, pouvant représenter jusqu'à 100 000 px de canvas — aucune pagination, chunking ni cap de taille trouvés dans le schéma ou les migrations, donc coût de lecture/écriture linéaire non borné sur les très longs chapitres. Aucune virtualisation identifiée pour ce canvas. |
| **Sécurité** | **9** | RLS activement durcie, pas seulement déclarée : la migration `20260627120000_audit_hardening_rls_indexes.sql` ajoute `WITH CHECK (auth.uid() = user_id)` explicite sur les politiques UPDATE de `projects`, `assets`, `chapters`, `chapter_canvases`, `scenario_chapters`, `scenario_versions`, et corrige une politique `FOR ALL` sans `WITH CHECK` sur `narramind_missing_assets`. La consommation de crédit passe par une fonction `SECURITY DEFINER` (`consume_image_credit`, migration `20260627130000_atomic_credit_consumption.sql`) avec `pg_advisory_xact_lock` pour fermer une race condition check-then-insert, accès restreint au `service_role`. `.env.example` avertit explicitement de ne jamais exposer la `service_role`. `refreshSession()` appelée avant chaque appel Edge Function Stripe (17 points d'appel sur 10 fichiers), conforme à la convention CLAUDE.md. |
| **Dette technique** | **6** | Peu de dette de code (0 TODO/FIXME), mais `allowLongMemory` (`src/types/index.ts:18,32,44,56`) est confirmé mort exactement comme annoncé dans le CLAUDE.md — différencié par tier dans `TIER_CONFIG`, couvert par un test de synchronisation (`tierConfigSync.test.ts`) qui vérifie seulement la parité avec `TIER_LIMITS`, sans jamais vérifier qu'il est réellement consommé. Le vrai risque de dette est la taille des fichiers : `ChapterDetail.tsx` (3174 lignes) est à la fois un god-component et la « zone protégée » gelée du CLAUDE.md — tout refactor futur y nécessite un accord explicite de Louis, ce qui ralentira tout nettoyage incrémental. `generate-cover-image` non documentée (cf. Architecture) est un petit drift doc/réalité supplémentaire. |

**Moyenne technique ≈ 7,6/10.** Points forts : sécurité (RLS durcie, credits atomiques) et discipline TypeScript. Point de vigilance principal : scalabilité du cœur produit (canvas éditeur, JSONB non borné) et drift documentaire (14 vs 15 Edge Functions, `allowLongMemory` mort mais présent dans le modèle de données).

---

## 3. 📦 Product Audit

La livraison de features correspond globalement au positionnement affiché (« visuels cohérents en secondes, sans compétences d'illustration »). Le pipeline Style → Assets (Sheet System, fiche composite via `image_url_sheet`/`image_url_profile_left/right`/`image_url_back`, câblé dans `AssetCard`, `CharacterViewDialog`, `BlockToolbar`) → Scénario IA (`ScenarioSection.tsx`, `generate-scenario-ai`) → Édition (`ChapterDetail.tsx`, `compose-chapter-layout`) est implémenté de bout en bout. Le gate de tier (`TIER_CONFIG` dans `src/types/index.ts`) expose bien chaque feature flag (`allowReferenceImages`, `allowScenarioAI`, `allowFullExport`) à `true` sur les trois plans — confirmation que le volume de crédits (20/100/250) est le seul vrai différenciateur, cohérent avec la stratégie « tout gratuit ».

**Inconsistance confirmée :** `allowLongMemory` reste différencié par tier dans les données (`false`/`false`/`true` pour libre/créateur/studio) alors que le CLAUDE.md affirme que cette feature « n'est implémentée nulle part » et a été retirée de l'offre commerciale le 2026-06-27. C'est une config morte mais toujours présente dans le modèle — un utilisateur Studio pourrait techniquement voir un `true` exposé quelque part sans que la feature existe réellement. À trancher : supprimer, ou documenter explicitement comme « réservé, non livré ».

Le menu Univers v1 semble réellement câblé sur ses deux piliers déclarés : Cartographie via `LoreGraphView.tsx` (graph React Flow, lazy-loadé) et « Amélioration continue » via NarraMind Compass (`useCompassProposals`, `LoreUniversProposalsSheet` déclenché depuis `AssetLibrary.tsx`, `CompassSuggestionsPanel` depuis `LoreNodeSheet.tsx`, `ArianeAnalysisModal.tsx`) — un vrai câblage transversal, pas une coquille vide. Point faible : `UniverseSection.tsx` est un simple pass-through de 15 lignes vers `LoreGraphView`, sans point d'entrée visible pour le pilier « propositions Ariane » directement au niveau de l'onglet Univers (les propositions vivent dans les node sheets et la bibliothèque d'assets) — le framing « deux piliers » du CLAUDE.md n'est donc pas immédiatement lisible pour un nouvel utilisateur arrivant sur l'onglet Univers.

**Surface à surveiller :** `TestSection.tsx`, protégée par une simple comparaison d'email admin hardcodée (`ARIANE_ONBOARDING_ADMIN_EMAIL`) côté client dans `ProjectDetail.tsx`, est un outil de debug présent dans l'arbre de routes de production. Le check étant purement client-side, la protection n'est pas serveur-enforced.

---

## 4. 🎨 UX / UI Audit

La navigation dans `ProjectDetail.tsx` est chargée : le système d'onglets superpose un gating d'onboarding progressif (`useProgressiveMenuAccess`), des overlays de tour forcé (`ArianeTabTourOverlay`), des clés de tour persistées, des cartes de fin de parcours et des déclencheurs admin — le tout autour d'une structure à 5 onglets pourtant simple (Style/Assets/Scénario/Univers/Édition). Une douzaine de `useEffect` coordonnent état d'URL, flags localStorage/sessionStorage et visibilité de modales : fonctionnel, mais cette concentration de logique d'orchestration d'onboarding dans le composant page augmente le risque de régression à chaque évolution des règles d'onboarding. `ChapterDetail.tsx` va plus loin encore (100+ imports) mais avec un vrai undo/redo (`pushCanvasUndoSnapshot`, icônes `Undo2`/`Redo2`) et des contrôles de zoom — bonne pratique pour un canvas créatif, alignée avec les standards UX des outils IA créatifs comparables.

**Cohérence du design system : inconsistante.** La règle « zéro em-dash » de `.impeccable.md` est violée dans du copy UI live, pas seulement en commentaires : `StyleManager.tsx` ligne 466 rend un label de bouton `` `Appliquer — ${selectedStyle.label}` `` , ligne 671 contient un message d'avertissement avec em-dash, `EditionSection.tsx` lignes 451/589 utilisent des em-dash dans des descriptions visibles par l'utilisateur. Des couleurs hardcodées fuitent aussi hors palette : `LoreGraphView.tsx` utilise des hex inline (`#F59E0B`, `#EF4444`) — défendable pour du SVG React Flow mais toujours une violation du système de tokens — et `AssetLibrary.tsx` utilise des classes Tailwind brutes (`bg-violet-500/70`, `bg-blue-500/70`, `bg-amber-500/70`) hors palette définie. **Le fichier `.claude/skills/taste-skill/SKILL.md`, référencé par le CLAUDE.md comme source de vérité anti-slop, n'existe pas dans ce checkout** (seul `.impeccable.md` a été trouvé) — la « Pre-Flight Check Section 14 » citée dans les règles de comportement pointe donc vers un fichier manquant.

Côté UX positive : la gestion crédit/quota est claire et non punitive — `QuotaReachedDialog.tsx` affiche compteur/limite, date de reset en langage clair, CTA d'upgrade direct. Le FAB « Fil d'Ariane » (fils SVG animés autour d'un badge compteur) est une affordance de chargement/alerte distinctive et sur-marque plutôt qu'un spinner générique, cohérente avec le positionnement « outil créatif professionnel » — mais il n'apparaît que sur l'onglet Scénario, donc les alertes/assets manquants ne sont pas visibles quand l'utilisateur est en Édition.

**Comparaison marché :** faute de benchmark UX concurrent daté ce mois-ci (cf. section 1), la comparaison se limite aux standards généraux des outils créatifs IA — onboarding progressif ✅, feedback de génération (à vérifier : états de chargement pendant génération FAL.ai), undo/redo ✅ (canvas), transparence crédit ✅. Point à creuser au prochain cycle : latence perçue pendant la génération d'image (FLUX.2 Pro) et clarté du feedback pendant ce temps d'attente, un point de friction classique chez les concurrents (Dashtoon, ComicPad) qui investissent lourdement dans le feedback temps réel.

---

## 5. 💡 Improvement Suggestions

### 🗑️ Removals

**Supprimer ou documenter `allowLongMemory`.** Config morte dans `TIER_CONFIG`, différenciée par tier mais non consommée nulle part (confirmé par audit produit + technique). Soit suppression pure, soit commentaire explicite « réservé future feature, non livré » pour éviter toute confusion future en facturation/support.

**Nettoyer les em-dash du copy UI.** Violation directe et zéro-tolérance de la règle `.impeccable.md`, trouvée en production dans `StyleManager.tsx` et `EditionSection.tsx`. Correction rapide (< 1h), impact direct sur la perception « pas générique » du produit.

**Sécuriser ou retirer `TestSection.tsx` de l'arbre de routes de production.** Le gating par email hardcodé côté client n'est pas une protection réelle — soit migrer vers un check serveur (RLS/role), soit exclure du bundle de production.

### ⚡ Optimizations

**Réparer le lien `.claude/skills/taste-skill/SKILL.md` manquant.** La Pre-Flight Check citée dans les règles de comportement de l'Interface Architect pointe vers un fichier inexistant — soit le recréer, soit rediriger la référence vers `.impeccable.md` uniquement.

**Documenter `generate-cover-image` dans le tableau des Edge Functions du CLAUDE.md** (15 fonctions réelles vs 14 documentées) et dans `docs/EDGE_FUNCTIONS_INDEX.md`.

**Auditer la scalabilité du canvas `chapter_canvases`.** JSONB mono-ligne non borné (jusqu'à 100 000 px) sans pagination/chunking/virtualisation identifiée. Avant tout incident en production sur un très long chapitre, chiffrer le coût réel de lecture/écriture sur un cas limite et évaluer une stratégie de chunking — **note : c'est une zone protégée, toute modification nécessite l'accord explicite de Louis** conformément au CLAUDE.md.

**Uniformiser la palette de couleurs.** Remplacer les classes Tailwind brutes (`bg-violet-500/70` etc. dans `AssetLibrary.tsx`) par les tokens HSL définis, cohérent avec la règle « ne jamais hardcoder des couleurs ».

**Faire remonter le FAB Fil d'Ariane sur tous les onglets**, pas seulement Scénario, pour que les alertes/assets manquants restent visibles pendant l'Édition — cohérent avec l'ADN du menu Univers (amélioration continue visible partout).

### ➕ Additions

**Feedback de génération enrichi pendant l'attente FAL.ai.** Signal marché : les concurrents avec le meilleur score benchmark (Dashtoon, ComicPad — sources antérieures, hors fenêtre 30 jours de ce cycle mais tendance de fond confirmée) misent sur la richesse du feedback pendant la génération. À vérifier en priorité au prochain audit UX avec captures d'écran réelles du flux de génération.

**Surveiller le virage IA de WEBTOON côté distribution/IP** (source datée : [MarketBeat, 2026-08-11](https://www.marketbeat.com/instant-alerts/webtoon-entertainment-q2-earnings-call-highlights-2026-08-10/)). Aucune action immédiate requise — le créneau reste distinct — mais si WEBTOON ouvre un jour son AI story-chat *byUs* à des créateurs non-officiels, cela redessinerait la ligne entre consommation et production. À surveiller, pas à traiter maintenant.

---

## 6. 🚀 Launch Status

**Contexte :** exécution locale et/ou Vercel, pas encore annoncé publiquement (cf. brief de la tâche planifiée).

**Bloquants techniques identifiés ce cycle :**
- Aucun bloquant critique (0 erreur TypeScript, RLS durcie, crédits atomiques, sécurité 9/10).
- Points de vigilance avant scale public : scalabilité canvas non bornée (section 2), route de debug `TestSection.tsx` protégée seulement côté client.

**Bloquants produit/UX identifiés ce cycle :**
- Violations em-dash en copy UI production (zéro-tolérance déclarée, actuellement non respectée).
- Fichier `.claude/skills/taste-skill/SKILL.md` manquant — le process de QA design (Pre-Flight Check) n'est pas complètement exécutable tel que documenté.
- Onboarding/orchestration UI concentrée dans `ProjectDetail.tsx` — pas bloquant, mais fragile pour un lancement à trafic imprévisible.

**Checklist de lancement priorisée :**

1. **P0** — Corriger les em-dash en copy UI production (< 1h, zéro-tolérance déclarée).
2. **P0** — Sécuriser `TestSection.tsx` (gate serveur ou exclusion du bundle prod) avant toute exposition publique.
3. **P1** — Recréer ou rediriger `.claude/skills/taste-skill/SKILL.md` pour rétablir le process QA design complet.
4. **P1** — Chiffrer le coût réel du canvas sur un chapitre long (proche de 100 000 px) avant d'annoncer publiquement — risque de dégradation perçue si un power user pousse la limite dès le lancement.
5. **P2** — Documenter `generate-cover-image` (drift doc/réalité mineur, sans impact utilisateur).
6. **P2** — Décider du sort de `allowLongMemory` (suppression ou documentation « réservé »).
7. **P2** — Étendre le FAB Fil d'Ariane à tous les onglets.

Aucun de ces points n'est un bloquant dur au sens strict (le produit fonctionne, 0 erreur TS, sécurité solide) — mais les points P0 touchent directement les règles « zéro tolérance » que Louis a lui-même posées dans le CLAUDE.md (anti-slop, sécurité), donc à traiter avant toute annonce publique plutôt qu'après.

---

## 7. 📣 Marketing Plan

DreamWeave n'a, à ce jour, aucune présence publique identifiée dans cet audit (pas de compte social, pas de landing page d'acquisition distincte du produit, pas de waitlist visible dans le repo). Plan de tâches discrètes pour préparer un lancement :

| Tâche | Priorité | Effort |
|---|---|---|
| Créer le compte Instagram DreamWeave (visuel-first, adapté à un outil de création de webtoons) | Haute | Rapide |
| Créer un compte X/Twitter pour suivre la conversation créateurs webtoon/IA en temps réel | Haute | Rapide |
| Écrire une landing page d'acquisition dédiée (séparée de l'app, orientée conversion — actuellement le produit sert probablement de landing par défaut) | Haute | Moyen |
| Lancer une waitlist avec incitatif (ex : crédits bonus au lancement) pour capter l'intérêt avant l'annonce publique | Haute | Rapide |
| Produire une vidéo teaser concept montrant le pipeline Style → Assets → Scénario → Édition en accéléré | Moyenne | Moyen |
| Rédiger 2-3 posts de positionnement expliquant la différenciation « tout gratuit, volume de crédits uniquement » face aux concurrents freemium à features verrouillées | Moyenne | Rapide |
| Identifier et engager 5-10 créateurs webtoon amateurs (Reddit r/webtoons, Discord communautés manga/webtoon) pour un accès anticipé et retours qualitatifs avant lancement public | Haute | Moyen |
| Préparer un post de lancement Product Hunt (asset visuels, copy, timing) | Moyenne | Moyen |
| Documenter et publier un cas d'usage complet (« de zéro à un chapitre publié ») comme contenu de preuve sociale | Basse | Long |
| Surveiller mensuellement l'actualité concurrentielle (Dashtoon, ComicPad, Jenova, WEBTOON) pour ajuster le message de différenciation | Basse | Rapide (récurrent) |

---

## TL;DR

- **Technique solide (≈7,6/10)** : 0 erreur TypeScript, sécurité RLS durcie et crédits atomiques (9/10), mais scalabilité du canvas éditeur (JSONB non borné jusqu'à 100 000 px) et drift documentaire (14 vs 15 Edge Functions) à surveiller.
- **Deux violations « zéro tolérance » actives en production** : em-dash dans le copy UI (`StyleManager.tsx`, `EditionSection.tsx`) et fichier `taste-skill/SKILL.md` manquant — à corriger avant toute annonce publique.
- **Config produit incohérente** : `allowLongMemory` reste différenciée par tier dans les données alors que la feature a été retirée de l'offre commerciale — à trancher (supprimer ou documenter).
- **Benchmark concurrentiel pauvre ce mois-ci** : aucune menace nouvelle datée sur le créneau précis de DreamWeave ; seul signal de marché notable est le virage IA côté distribution/IP de WEBTOON (pas un concurrent direct de production).
- **Aucune présence marketing publique identifiée** — priorité haute : landing page d'acquisition dédiée + waitlist + comptes sociaux avant toute annonce.

---

*Rapport généré automatiquement par la tâche planifiée `dreamweave-daily-audit`. Aucune action d'écriture effectuée (lecture seule). Prochain cycle : reconduire le benchmark avec un focus recherche communautaire (Reddit/Discord) si accès API disponible.*
