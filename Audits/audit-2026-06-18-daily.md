# Audit Quotidien DreamWeave — 18 juin 2026

> Run automatique (tâche planifiée `dreamweave-daily-audit`). Exécution autonome, Louis absent.
> Périmètre : benchmark concurrentiel, audit technique, produit, UX/UI, suggestions, statut de lancement, plan marketing.

---

## 1. 🔍 Benchmark & Veille concurrentielle

⚠️ **Limite de fraîcheur honnête.** La consigne demande des sources du mois courant (juin 2026) uniquement. Les recherches web disponibles aujourd'hui renvoient des sources majoritairement datées **mars–avril 2026**. Je ne fabrique pas de dates de juin : les éléments ci-dessous sont les plus récents trouvés, avec leur date réelle. À traiter comme contexte de fond, pas comme news du mois.

### WEBTOON Entertainment (acteur dominant, mouvements IA)

- **Outils de localisation / traduction IA** — Programme de traduction sur la plateforme CANVAS unifiée (7 langues dont le français), annoncé pour le printemps 2026. La traduction porte sur le texte, sans entraînement sur l'art des créateurs.
  Source : [Anime News Network](https://www.animenewsnetwork.com/news/2026-03-30/webtoon-launches-ai-powered-localization-tools/.235796) — 30 mars 2026
- **Partenariat Genies (avatars IA)** — Les personnages de webtoons deviennent des avatars 3D interactifs / chat.
  Source : [Variety](https://variety.com/2026/gaming/news/webtoon-entertainment-genies-ai-1236729996/) — avril 2026 · [Anime News Network](https://www.animenewsnetwork.com/news/2026-04-28/webtoon-partners-with-genies-to-launch-interactive-ai-avatars-for-webcomic-characters/.236872) — 28 avril 2026
- **Programmes créateurs CANVAS** étendus (monétisation, dashboard).
  Source : [AIDirectory](https://aidirectory.com/news/webtoon-expands-canvas-creator-programs-2026-monetization-dashboard-residency)

**Lecture stratégique** : WEBTOON ne se positionne pas comme générateur de visuels ; il muscle la **distribution, la traduction et l'engagement** autour des personnages. C'est un complément, pas un concurrent frontal de DreamWeave — mais il fixe les attentes des créateurs (multi-langue, monétisation).

### Concurrents directs (génération webtoon/manga IA)

| Outil | Positionnement | Source / date |
|---|---|---|
| **Anifusion** | « Meilleur générateur manga 2026 », orienté self-publishing / Amazon KDP, tout-en-un concept→print | [Anifusion](https://anifusion.ai/articles/best-ai-manga-generators-2026/) · [Analytics Insight](https://www.analyticsinsight.net/ampstories/entertainment/top-ai-comic-webtoon-creation-tools-for-artists-in-2026) |
| **Jenova Webtoon Creator** | Agentique, multi-modèles, mémoire de projet persistante (saisons), pas de lock-in | [Jenova](https://www.jenova.ai/en/resources/ai-webtoon-creator) — mars 2026 |
| **Dashtoon** | Meilleure distribution intégrée pour webcomics | [Anifusion benchmark](https://anifusion.ai/articles/best-ai-manga-generators-2026/) |
| **LlamaGen.ai** | Générateur scroll vertical, cohérence perso, export mobile | [LlamaGen](https://llamagen.ai/features/ai-webtoon-generator) |
| **AI Comic Factory** | Gratuit, Hugging Face, génération rapide simple | [aicomicfactory](https://aicomicfactory.com/) |

### Sur le modèle IA (cœur de la promesse DreamWeave)

- La **cohérence de personnage** est passée de « quasi impossible » à « réellement exploitable » fin 2025 / début 2026. **FLUX.2** (Black Forest Labs) référence jusqu'à **10 images** pour fusionner une identité stable, score **92/100** en cohérence (devant Midjourney V7 de 8 points en multi-pose).
  Source : [fast.io — 8 Best AI Comic Generators 2026](https://fast.io/resources/best-ai-comic-generators-2026/) · [selfielab — Flux 2 Multi-Ref guide](https://selfielab.me/blog/flux-2-multi-ref-character-consistency-guide-20260329) (29 mars 2026) · [flux2.pics](https://flux2.pics/core-brand-tools/flux-2-character-consistent-generator/)

**Implication directe** : le choix FLUX.2 Pro pour tous les tiers (logique « Spotify ») est aligné sur l'état de l'art. Mais la cohérence perso n'est plus un différenciateur — c'est devenu une **table stakes**. Le différenciateur de DreamWeave doit se loger ailleurs : le couple **Scénario IA → découpage cases → composition** et la **mémoire narrative (NarraMind / Compass / Univers)**, que peu de concurrents offrent de bout en bout.

### Sentiment communautaire

Aucune source Reddit / Discord / X datable du mois courant n'est ressortie via la recherche (résultat vide sur la requête ciblée). À ne pas surinterpréter : absence de données ≠ absence de sentiment. **Action recommandée** : mettre en place une veille manuelle r/manga, r/webtoons, r/StableDiffusion et Product Hunt, car la recherche automatisée ne couvre pas ces espaces de façon datable.

---

## 2. 🛠️ Audit technique

Métriques relevées sur le code connecté (`src/`, `supabase/`) :
- **41 738 lignes** TS/TSX · **173 fichiers** · **16 Edge Functions** · **42 migrations**
- `tsc --noEmit` : **0 erreur** ✅ · `: any` : **0** · `@ts-ignore` : **0** · `console.log` résiduels : **8**
- `useMemo`/`useCallback` : 241 occurrences · hex hardcodés en `.tsx` : **191** (anti-pattern design system) · `service_role` côté client : **0** ✅
- Tests : **4 fichiers** seulement.

| Axe | Note /10 | Justification |
|---|---|---|
| **Qualité du code** | **7,5** | TypeScript strict tenu (0 `any`, 0 `ts-ignore`, tsc vert), husky + lint-staged + `--max-warnings 0`. Bémols : fichiers obèses — `ChapterDetail.tsx` 2 501 l., `LoreGraphView.tsx` 2 244 l., `ScenarioChapterEditor.tsx` 2 042 l., `SpeechBubbleEditor.tsx` 1 543 l. Ces god-components plombent la lisibilité et la testabilité. |
| **Architecture** | **8** | Séparation nette `types → integrations → services → hooks → components → pages`, lazy-loading des pages, React Query côté serveur, 16 Edge Functions au rôle clair. Cohérent et documenté (`docs/EDGE_FUNCTIONS_INDEX.md`). Note : CLAUDE.md mentionne « 14 Edge Functions » alors qu'il y en a **16** sur disque — doc à resynchroniser. |
| **Performance & scalabilité** | **6,5** | Usage soutenu de mémoïsation (241), hook PostToolUse de perf-audit, pgvector pour Compass. Risques : composants canvas monolithiques (re-renders), **191 couleurs hardcodées** (dette de thème), canvas chapitre jusqu'à 100 000px (gestion mémoire/scroll à surveiller). Scalabilité I/O dépend de FAL.ai (file d'attente) — la priorité Studio est un bon levier. |
| **Sécurité** | **8** | RLS `auth.uid() = user_id` sur les tables, `service_role` jamais exposé côté client (0 occurrence), webhook Stripe seule entrée autorisée à modifier `plan`, JWT requis sur Edge Functions. `.env` correctement gitignore (`.env.example` fourni). Point d'attention : valider que **toutes** les 42 migrations ont bien activé RLS (14 fichiers contiennent des règles — à auditer table par table avant launch public). |
| **Dette technique** | **6,5** | Très peu de dette « sale » (0 TODO/FIXME/HACK, 0 any). La dette est surtout **structurelle** : god-components, 191 hex hardcodés contraires au design system, couverture de tests faible (4 fichiers pour 41k lignes). Dette maîtrisée mais à attaquer avant montée en charge. |

**Score technique global ≈ 7,3 / 10** — base saine et disciplinée, fragilités concentrées sur la taille des composants et la couverture de tests.

---

## 3. 📦 Audit produit

**Cohérence features ↔ positionnement : forte.** La promesse (« générer des visuels cohérents en secondes, sans compétences en illustration ») est servie par le parcours complet Style → Assets → Scénario IA → Découpage cases → Composition → Export. Le Sheet System (fiche 4 angles) et NarraMind/Compass/Univers vont au-delà d'un simple générateur d'images : ils créent une **continuité narrative**, ce qui est précisément le terrain où les concurrents (Anifusion, LlamaGen) sont plus faibles.

**Incohérences promesse vs livré à surveiller :**
- La stratégie « tout gratuit, différenciation par le volume de crédits » est claire et actée (TIER_CONFIG source de vérité). Risque produit : **20 crédits Libre** suffisent-ils pour atteindre le « aha moment » (un premier chapitre composé) ? À mesurer — un quota trop serré tue l'activation.
- **Univers v1** est marqué 🔴 (prochaine priorité) dans la roadmap, mais le code contient déjà beaucoup de surface Univers/Lore (`LoreGraphView`, `LoreFriseView`, `LoreNodeSheet`, `UniverseSection`, `useArianeLoreProposals` 937 l.). Risque de **scope creep** : `LoreFriseView` (frise) contredit l'ADN affirmé du menu Univers (« ce que ce n'est PAS : timeline, frise, visualisation temporelle »). À clarifier — un composant frise existe alors que la règle fondatrice l'exclut.

**Features potentiellement sous-utilisées / redondantes :**
- `TestSection.tsx` (672 l.) — composant de test présent en prod ? À retirer du bundle si non destiné aux utilisateurs.
- Doublon conceptuel `LoreGraphView` vs `LoreFriseView` : si la frise est hors-ADN, c'est du code mort à terme.

---

## 4. 🎨 Audit UX / UI

**Fluidité des parcours.** Le fil Style → Assets → Scénario → Éditeur est linéaire et logique. Ariane (assistant, onboarding, tours) est très présente (≈14 composants `ariane/`) — atout d'accompagnement, mais risque de surcharge cognitive si les overlays se déclenchent trop. À tester sur un utilisateur réel débutant.

**Cohérence du design system.** Tokens HSL, glassmorphisme, Quicksand+Nunito, classes custom (`.glass`, `.gradient-primary`) : direction forte et différenciante face aux UI génériques des concurrents. **Faille mesurée : 191 couleurs hex hardcodées dans les `.tsx`**, en contradiction directe avec la règle « ne jamais hardcoder de couleurs ». C'est la principale dette de cohérence visuelle — invisible à l'œil mais elle casse le theming (dark mode, futurs ajustements de marque).

**Points de friction identifiés :**
- Composants éditeur monolithiques → latence potentielle sur le canvas (re-renders) ressentie comme du « lag » lors du drag de blocs/bulles.
- Quota Libre (20 crédits) : friction d'activation si atteint avant le premier chapitre fini → prévoir un `QuotaReachedDialog` (existe) avec parcours d'upgrade fluide.

**Comparaison aux standards concurrents.** Anifusion et Jenova mettent en avant **export print-ready / multi-plateforme** et **mémoire de saison**. DreamWeave a l'export chapitre et la mémoire narrative — au niveau. En revanche, les concurrents communiquent fort sur la **simplicité d'onboarding** (« du texte à la page »). DreamWeave est plus riche donc potentiellement plus intimidant : l'onboarding Ariane doit absolument réduire le temps jusqu'au premier visuel généré.

---

## 5. 💡 Suggestions d'amélioration

### 🗑️ À retirer / nettoyer
- **`TestSection.tsx`** hors du bundle de production (672 l.) si non destiné aux utilisateurs finaux.
- **8 `console.log`** résiduels en prod.
- **`LoreFriseView`** (frise temporelle) : trancher — soit on l'assume et on met à jour l'ADN Univers, soit on le supprime conformément à la règle fondatrice « pas de timeline/frise ». Aujourd'hui code et doc se contredisent.

### ⚡ Optimisations
- **Découper les god-components** (`ChapterDetail` 2 501 l., `LoreGraphView` 2 244 l., `ScenarioChapterEditor` 2 042 l.) — gains de perf (re-renders ciblés) et de testabilité. ⚠️ `ChapterDetail` touche la **zone canvas freezée** → toute découpe affectant blocs image/couleur/bulles doit être signalée à Louis avant implémentation.
- **Remplacer les 191 hex hardcodés** par les tokens HSL — restaure la cohérence du design system et le dark mode.
- **Remonter la couverture de tests** (4 fichiers → cibler d'abord `services/` et `hooks/` critiques : `useAssetGeneration`, quotas, `canGenerate`).
- **Resynchroniser la doc** : CLAUDE.md dit « 14 Edge Functions », il y en a 16.

### ➕ Ajouts (appuyés sur le benchmark daté)
- **Export / traduction multi-langue** : WEBTOON industrialise la traduction IA en 7 langues (français inclus). Une traduction de bulles assistée serait un fort levier d'audience. *Source : [ANN, 30/03/2026](https://www.animenewsnetwork.com/news/2026-03-30/webtoon-launches-ai-powered-localization-tools/.235796).*
- **Export print-ready / KDP** : Anifusion fait du « concept → print » son argument n°1. Un export PDF haute résolution prêt à l'impression élargirait la cible. *Source : [Anifusion, 2026](https://anifusion.ai/articles/best-ai-manga-generators-2026/).*
- **Mémoire « saison » mise en avant** : Jenova vend la persistance multi-saisons. DreamWeave a déjà NarraMind/Compass — c'est un actif **sous-marketé** à valoriser dans l'UI et la comm. *Source : [Jenova, 03/2026](https://www.jenova.ai/en/resources/ai-webtoon-creator).*

---

## 6. 🚀 Statut de lancement

**Contexte** : tourne en local et/ou Vercel (`vercel.json`, `dist/` présents), non annoncé publiquement. Stripe ✅ intégré (checkout, portal, webhook). Build TypeScript vert.

**Bloqueurs / étapes restantes avant lancement public :**

| Priorité | Item | Statut |
|---|---|---|
| **P0** | Audit RLS exhaustif des 42 migrations (confirmer RLS active sur **toutes** les tables, pas seulement 14 fichiers) | À faire |
| **P0** | Retirer `TestSection` + `console.log` du build prod | Rapide |
| **P0** | Vérifier secrets/clés (FAL.ai, Groq, Gemini, Stripe) en variables d'env Vercel, jamais commités | À vérifier |
| **P0** | Webhook Stripe en mode **live** + test bout-en-bout d'un abonnement Créateur/Studio | À valider |
| **P1** | Quota Libre (20 crédits) : valider qu'il permet d'atteindre le premier chapitre composé (activation) | À mesurer |
| **P1** | Trancher la contradiction Univers (frise vs ADN) avant d'exposer le menu | Décision produit |
| **P1** | Onboarding débutant : mesurer le temps jusqu'au 1er visuel généré | Test utilisateur |
| **P2** | Découpe des god-components / perf canvas | Dette |
| **P2** | Pages légales (CGU, RGPD, mentions) — obligatoire en France avec paiement | À créer |

**Checklist priorisée** : P0 sécurité/paiement → P1 activation/produit → P2 polish/dette. Aucun bloqueur technique « rouge » au build ; les bloqueurs sont **conformité (RLS, légal, secrets)** et **validation paiement live**.

---

## 7. 📣 Plan marketing

Posture actuelle : produit quasi prêt, **aucune présence publique**. La fenêtre est favorable : la cohérence perso vient de devenir mainstream, l'intérêt créateur est haut.

| Tâche | Priorité | Effort |
|---|---|---|
| Lancer une **waitlist** (landing + capture email) — la landing existe déjà, ajouter le formulaire | Haute | Quick |
| **Page d'acquisition** orientée bénéfice (« ton webtoon, du scénario à la planche, en français ») | Haute | Medium |
| Créer le compte **Instagram + TikTok** DreamWeave (formats verticaux = ADN webtoon) | Haute | Quick |
| **Teaser concept** (15–30s) : montrer Scénario IA → cases → composition en accéléré | Haute | Medium |
| Préparer un **lancement Product Hunt** (assets, premiers utilisateurs, copy) | Moyenne | Medium |
| Présence **Reddit / Discord** ciblée (r/manga, r/webtoons, r/StableDiffusion) — partage de making-of, pas de spam | Moyenne | Long |
| Programme **early-adopters** : crédits offerts contre feedback / témoignages | Moyenne | Quick |
| **SEO** : pages comparatives (« alternative à Anifusion / Dashtoon en français ») | Basse | Medium |
| Mettre en avant le différenciateur **mémoire narrative** dans toute la comm | Moyenne | Quick |

**Angle de différenciation à tenir** : DreamWeave n'est pas « encore un générateur d'images », c'est l'outil qui **tient ta continuité narrative** du scénario à la planche — en français, gratuit à l'entrée. C'est le seul terrain où les leaders (Anifusion, LlamaGen, AI Comic Factory) sont faibles.

---

## 📝 Impact Mémoire

> **Ce qui change** : le benchmark confirme que la cohérence de personnage (cœur de la promesse FLUX.2) est devenue un standard du marché en 2026, pas un différenciateur. Le différenciateur défendable de DreamWeave se déplace vers le pipeline narratif complet + mémoire (NarraMind/Compass/Univers).
> **Section concernée** : Analyse concurrentielle / Différenciation produit.
> **Proposition** : ajouter au mémoire un paragraphe : « En 2026, la cohérence de personnage par IA (FLUX.2, score 92/100 en cohérence multi-pose) s'est banalisée chez les concurrents (Anifusion, Jenova, LlamaGen). DreamWeave ne se différencie donc plus sur la génération d'images seule, mais sur la **chaîne narrative intégrée** (scénario IA → découpage → composition) et la **mémoire narrative longue** (NarraMind/Compass), capacités absentes ou immatures chez les concurrents. »

---

## TL;DR

- **Code sain, discipliné** (tsc vert, 0 `any`/`ts-ignore`, RLS + Stripe propres) ≈ **7,3/10** ; dette concentrée sur **god-components** (ChapterDetail 2 501 l.), **191 couleurs hardcodées** et **couverture de tests faible** (4 fichiers).
- **Benchmark** : la cohérence perso (FLUX.2) est désormais un standard, pas un avantage. Différenciation à défendre = **pipeline narratif complet + mémoire** (terrain faible chez Anifusion/Jenova/LlamaGen). *Sources mars–avril 2026 — pas de source datable juin disponible via la recherche.*
- **Avant launch (P0)** : audit RLS exhaustif des 42 migrations, retrait `TestSection`/`console.log`, secrets en env Vercel, test paiement Stripe **live**, pages légales FR.
- **Produit à trancher** : contradiction Univers (composant `LoreFriseView` vs ADN « pas de frise ») ; valider que le quota Libre (20 crédits) permet l'activation (premier chapitre composé).
- **Marketing** : ouvrir la **waitlist** + **Instagram/TikTok** + **teaser** dès maintenant (effort faible, fenêtre favorable) ; lancement Product Hunt ensuite, en martelant l'angle « continuité narrative en français, gratuit à l'entrée ».

---
*Rapport généré automatiquement le 2026-06-18. Limite assumée : les sources concurrentielles datables ne descendent pas sous mars–avril 2026 ; aucune donnée communautaire (Reddit/PH/Discord) datable du mois courant n'a pu être récupérée par la recherche automatisée.*
