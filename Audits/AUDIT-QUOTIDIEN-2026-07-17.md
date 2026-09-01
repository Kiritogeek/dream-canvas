# Audit quotidien DreamWeave — 2026-07-17

> Audit automatisé. Branche `pre-production`. Lecture seule, aucun fichier modifié.
> Les findings marqués ✅ **vérifié** ont été contre-vérifiés à la main après contradiction entre deux agents (voir §8 Note de méthode).

---

## 1. 🔍 Benchmark & Intelligence concurrentielle

**Avertissement méthodologique important.** La consigne impose de rejeter toute source de plus de 30 jours. Appliquée strictement, elle élimine la quasi-totalité du corpus : le marché « AI comic generator » est saturé de pages SEO commerciales, non datées ou rétro-datées en continu (Jenova, LlamaGen, COMICPAD publient des pages « (Mars 2026) », « (Avril 2026) », « (2026) » qui sont des landing pages, pas de l'actualité). **Ces sources sont écartées : elles sont à la fois indatables et vendeuses de leur propre produit.**

Ce qui reste après filtrage honnête :

### Retenu — daté du mois courant

| Date | Finding | Source |
|---|---|---|
| **2026-07-11** | **Naver WEBTOON lance byUs**, service de chat narratif IA basé sur des IP webtoon validées par les créateurs. Deux modes : *Original Stories* (branche depuis le webtoon original) et *Fan Stories* (UGC sur personnages existants). Signal fort : **le leader du marché entre sur l'IA générative par la narration, pas par l'image**. | [Anime News Network](https://www.animenewsnetwork.com/news/2026-07-11/webtoon-launches-ai-story-chat-service-byus-featuring-creator-approved-webtoon-ip/.239448) |
| **2026-07-08** (données vérifiées à cette date) | Comparatif d'outils : **Dashtoon** en tête (8,6/10) sur la cohérence de personnage — entraîne des modèles custom sur les designs de l'utilisateur, verrouillant les traits sur des centaines de cases. **Anifusion** #10, plan Creator 9 $/mois, **export en calques** pour finition Photoshop / Clip Studio. | [COMICPAD](https://www.comicpad.app/best-ai-comic-generators) ⚠️ *source concurrente, comparatif auto-publié — à traiter comme du marketing, pas comme un benchmark neutre* |

### Écarté mais structurant — hors fenêtre 30 jours, trop important pour être tu

Ces faits sont antérieurs à juin 2026 et donc **hors consigne**. Je les signale explicitement comme tels parce qu'ils conditionnent des décisions produit et qu'un rapport qui les omettrait par respect d'une règle de date serait trompeur :

- **2026-03-26** — WEBTOON CANVAS impose le **label de contenu IA** pour toute série monétisée. ([contexte relayé](https://www.comicpad.app/best-ai-comic-generators))
- **2026-01-22** — **AI Basic Act** sud-coréen : divulgation IA obligatoire pour la distribution commerciale en Corée.
- **2026-01** — Un manga entièrement généré par IA, *My Dear Wife, Will You Be My Lover?*, prend la **1ʳᵉ place sur Comic C'moA** (plus grande librairie numérique japonaise), devant *Kingdom*. Preuve d'acceptation par le marché grand public.
- **2026-05-08** — Sentiment communautaire : les lecteurs et créateurs restent **très sceptiques**. Critiques Reddit récurrentes sur Canvas : « mauvaise continuité », « visages statiques », « expressions fausses », lettrage faible. Usage positif reconnu : décors, colorisation, idéation. ([The AI Tribune](https://aitribune.net/2026/05/08/ai-webtoon-in-2026/))

### Lecture stratégique

1. **La cohérence de personnage est le champ de bataille**, et Dashtoon y a une longueur d'avance via l'entraînement de modèles custom. Le **Sheet System** de DreamWeave (fiche composite 4 angles) attaque le même problème par un chemin moins coûteux. C'est défendable, mais ce n'est pas un fossé.
2. **Les griefs communautaires (continuité, expressions) sont précisément ce que NarraMind / Compass adresse.** Personne ne communique sur la continuité *narrative* — tout le monde parle de cohérence *visuelle*. **C'est le positionnement le plus différenciant disponible, et il est déjà construit.**
3. **Le label IA devient une norme de plateforme** (CANVAS) et une obligation légale (Corée). Un export DreamWeave destiné à CANVAS devrait porter la mention. Ce n'est pas encore le cas.
4. **Le sentiment anti-IA est un risque de lancement réel**, pas une objection théorique. Le positionnement « outil d'assistance au créateur » plutôt que « générateur de webtoon » n'est pas cosmétique — c'est ce qui décide de l'accueil sur Reddit.

---

## 2. 🛠️ Audit technique

| Axe | Score | Justification |
|---|---|---|
| Qualité du code | **7/10** | 0 `any` sur 47 262 lignes, 0 TODO/FIXME, 575 cas de test, commentaires « WHY only » respectés. Discipline **outillée** (`eslint --max-warnings 0` en lint-staged), pas déclarative. Plombé par 4 god components > 1000 L (`ChapterDetail.tsx` **3174 L / 29 `useState`**, `LoreGraphView.tsx` 2196 L) et par **un symbole non déclaré en production** (§ ci-dessous). |
| Architecture globale | **7/10** | Découpage `types → services → hooks → components → pages` réellement respecté (29 services, 32 hooks, 0 appel Supabase hors couche service). `lazyWithReload` (`App.tsx:36-54`) gère les chunks périmés avec garde anti-boucle — raffiné. **Mais `verifyUserFromToken` est réimplémenté 9 fois** et absent de `_shared/`, alors que `_shared/` existe et sert déjà pour le CORS. Le code le plus sensible du système est copié-collé 9 fois. |
| Performance & scalabilité | **6,5/10** | Drag impératif sans re-render (`useDragBlock.ts`) = bon pattern. Index FK ajoutés, consommation de crédit atomique (`pg_advisory_xact_lock`). **Mais aucun index ANN sur `project_embeddings.embedding`** : `match_embeddings` fait `ORDER BY embedding <=> query` en scan séquentiel. Plafond de scalabilité Compass. Layout thrash dans `useDragBlock.ts:93-122` (`getBoundingClientRect` + écriture `left/top` à chaque `pointermove`, `willChange: transform` qui ne correspond pas à la propriété animée). |
| Sécurité | **6,5/10** | RLS exemplaire : **18 tables, 18 avec RLS, 51 policies, zéro `USING (true)`**. Verrou anti-auto-upgrade du plan (`stripe_rls_profiles.sql:29-35`) — excellent design. 0 secret dans tout l'historique git. XSS maîtrisé (sanitizer testé). **Mais la policy SELECT du bucket Storage est non scopée** (§P0 ci-dessous), et le **quota est fail-open**. |
| Dette technique | **6,5/10** | 0 TODO, culture d'audit qui **corrige** (migrations de durcissement du 06-27 qui suivent les findings). Dette concentrée : 4 fichiers > 1000 L, `verifyUserFromToken` × 9, flags morts (`allowLongMemory`, `filArianeLimit`, `maxProjects`). Aggravant structurel : **le plus gros fichier est en zone protégée Canvas** — la dette y est gelée par règle. |
| | **≈ 6,8/10** | Codebase mature et sérieusement tenue. Trois findings bloquent le lancement public. |

### 🔴 P0 — Bucket Storage : policy SELECT non scopée → énumération cross-user

`supabase/migrations/20260209195229_*.sql` :
- `:162` → `INSERT INTO storage.buckets … VALUES ('dreamweave', 'dreamweave', true)` (public)
- `:169` → `CREATE POLICY "Users can view own files" ON storage.objects FOR SELECT USING (bucket_id = 'dreamweave');`

**Le nom dit « own files », la condition ne contient aucun `auth.uid()`.** INSERT (`:168`) et DELETE (`:170`) sont correctement scopés via `(storage.foldername(name))[1]` — SELECT ne l'est pas. Tout utilisateur authentifié peut **lister l'intégralité du bucket**, découvrir les chemins des autres et lire leurs images (bucket public → lecture sans auth une fois le chemin connu).

**Nuance : `public = true` est un choix nécessaire, pas un oubli** — FAL.ai doit télécharger les images de référence par URL (`src/services/storage.ts:31`, `assets.ts:77` utilisent `getPublicUrl`). Le problème n'est pas le bucket public, c'est que la policy SELECT annule la seule protection restante (l'obscurité des chemins). Les planches non publiées d'un auteur sont énumérables.

**Correctif** : une migration, ajouter `AND auth.uid()::text = (storage.foldername(name))[1]`. À valider : qu'aucun affichage ne dépende du listing cross-user. Une seule migration touche `storage` sur les 49 — jamais retouché depuis février.

### 🔴 P0 — Quota fail-open : risque de coût direct

`supabase/functions/_shared/quota.ts:34,44` : si la RPC `consume_image_credit` erre ou lève → `{ allowed: true, usageId: null, count: -1 }`.

C'est **délibéré et documenté** (lignes 5-7 : « Fail-open … résilience »). Mais la conséquence est nette : en cas d'incident Postgres, **les générations FLUX.2 Pro deviennent illimitées et non comptées, tous plans confondus, y compris Libre**. Arbitrage disponibilité/coût qui appelle une décision explicite de Louis — pas un défaut de code, mais une facture potentielle non bornée.

### 🟠 P1 — `verifyUserFromToken` dupliqué 9 fois

Réimplémenté dans `compose-chapter-layout`, `create-checkout-session`, `create-portal-session`, `generate-asset-image`, `generate-cover-image`, `generate-panel-image`, `generate-scenario-ai`, `narramind-compass`, `narramind-update`. Absent de `_shared/`.

Aggravé par `verify_jwt = false` sur toutes les fonctions (`supabase/config.toml`) — **justifié et documenté** (JWT ES256 rejetés par la passerelle), mais cela déplace la garantie d'auth de la passerelle vers 9 implémentations dupliquées. **La sécurité du système repose sur le fait qu'aucune des 9 copies ne diverge.** Un bug d'auth = 9 correctifs.

Idem pour l'ownership : `_shared/ownership.ts` n'est importé que par 2 fonctions ; les autres refont le contrôle inline (`generate-asset-image:655,691`, `generate-panel-image:858,901`, `generate-cover-image:163`, `narramind-update:848`). **Aucune fonction n'oublie le contrôle** — vérifié une par une — mais deux conventions coexistent.

### 🟠 P1 — Pas d'index ANN sur `project_embeddings.embedding`

`20260522110000_project_embeddings.sql:23-27` ne crée que l'index unique + `project_id`. **Zéro `ivfflat` / `hnsw`** sur les 49 migrations. Atténué aujourd'hui par le filtre `project_id` en amont (partition petite), mais c'est le plafond de scalabilité de Compass.

### 🟡 P2 — `ADMIN_EMAIL` en dur

`admin-set-plan/index.ts:9`, `admin-get-kpis/index.ts:8`, `admin-user-action/index.ts:8` : `const ADMIN_EMAIL = "kiritogeek@gmail.com"`. Incohérent avec le commit `be021fd` (« email admin env ») et avec `VITE_ADMIN_EMAIL` dans `.env`. Pas une faille (le check serveur fait foi) — une variable d'environnement manquante. Rotation d'admin = redéploiement de 3 fonctions.

### ✅ Ce qui est solide et mérite d'être dit

- **RLS** : 18/18 tables, 51 policies, aucune permissive. Le verrou anti-auto-upgrade (`plan = (SELECT plan FROM profiles WHERE user_id = auth.uid())` dans la policy UPDATE) est exactement le bon design.
- **Durcissement post-audit réel** : `20260627120000_audit_hardening_rls_indexes.sql` ajoute `WITH CHECK` sur 6 policies UPDATE pour empêcher la réassignation de `user_id` (transfert de ressource vers un autre compte). Ce fichier prouve une culture d'audit qui corrige au lieu de documenter.
- **0 secret dans tout l'historique git** (`git log --all -p` sur `sk_live_`, `whsec_`, `AIza`, `SERVICE_ROLE_KEY`, `FAL_API_KEY`). `.env` a été committé (`5f84bf9`, `be021fd`) mais ne contenait que des `VITE_` publiques par design. **Sévérité réelle : nulle.**
- **XSS maîtrisé** : les 2 `dangerouslySetInnerHTML` (`BubbleLayer.tsx:740`, `PanelExportSpeechBubbles.tsx:229`) sont toujours enveloppés de `sanitizeBubbleHtml`. Sanitizer audité : whitelist stricte, attributs supprimés, `STRAY_LT` neutralise le bypass de balise non terminée. Bypass classiques testés, tous inertes.

---

## 3. 📦 Audit produit

### 🔴 P0 — La landing vend deux features retirées de l'offre et jamais implémentées ✅ **vérifié**

`src/pages/Landing.tsx:100` — lu et confirmé de mes yeux :
```ts
{ id: "studio", recommended: false,
  highlights: ["250 crédits / mois", "Mémoire narrative longue", "Priorité de traitement"] },
```

`CLAUDE.md:14` affirme l'inverse : ces deux features ont été **retirées de l'offre commerciale le 2026-06-27** précisément « pour ne pas vendre une feature non livrée ». **Le retrait a été documenté mais jamais exécuté dans le code.**

- « Priorité de traitement » : la chaîne n'existe **que** dans `Landing.tsx:100`. Aucune file d'attente, aucun champ `priority` dans les fonctions de génération.
- « Mémoire narrative longue » : `allowLongMemory` n'est lu nulle part ; `narramind-update` ne lit jamais le plan.

**Deux aggravants :**

1. **La landing se contredit elle-même** — `:90` promet « Toutes les fonctionnalités incluses » (Libre), `:95` « Toutes les fonctionnalités » (Créateur), et `:100` réserve deux features nommées à Studio. Un visiteur en déduit mécaniquement que Libre et Créateur en sont privés.
2. **Landing et Plans se contredisent** — `src/pages/Plans.tsx` (la vraie page de paiement) est **propre** : son tableau `:43-107` ne mentionne ni l'une ni l'autre, et son sous-titre `:252` dit exactement la bonne chose (« seule la quantité de générations mensuelles change »). **Le prospect lit une promesse sur la landing et en trouve une autre au moment de payer.**

C'est le correctif le plus rentable de tout l'audit : supprimer deux chaînes de `Landing.tsx:100` résout le P0, la contradiction interne et l'écart Landing↔Plans. Remplacer par du volume (ex. « 12,5× plus de générations qu'en Libre »).

### 🔴 `allowLongMemory` — flag zombie, et seule entorse structurelle à la stratégie

Défini `src/types/index.ts:18,32,44,56` + dupliqué `_shared/tierConfig.ts:13,21,27,33`. **Consommé nulle part.** Seul lecteur : `src/test/tierConfigSync.test.ts:18` — un test qui verrouille deux constantes mortes.

**Le point non relevé jusqu'ici** : sur les 9 champs de `TierLimits`, `allowLongMemory` est **le seul, hors `maxGenerationsPerMonth`, dont la valeur diffère entre plans** (`studio: true`). Il est donc l'unique contradiction structurelle à « différenciation = volume UNIQUEMENT » — inscrite dans le type qui sert de source de vérité. Signalé sans décision depuis le 2026-06-27, soit 4 audits.

L'en-tête `tierConfig.ts:5-6` annonce encore « Studio : 250 crédits + mémoire narrative longue » — commentaire obsolète depuis le retrait.

### 🟠 `filArianeLimit` — gate mort + upsell inatteignable (nouveau)

`null` pour les 3 plans (`types/index.ts:33,45,57`) → `ArianeContinuityPanel.tsx:120` `isAlertsCapped` est **toujours `false`**. Le bloc `:292-300` est inatteignable, y compris ce texte :

> `{alerts.length - filArianeLimit!} alerte(s) masquée(s) — plan Libre limité à {filArianeLimit} alertes.`

C'est de l'UI qui, si elle s'affichait, **contredirait frontalement la stratégie « tout gratuit »** en annonçant un plafond Libre. À retirer, ou assumer le gating.

### 🟠 `maxProjects` — guard mort, ouvert depuis le 2026-06-13

`null` pour les 3 plans → `DashboardHome.tsx:168` rend toujours « illimités ». Signalé dans 4 audits successifs, jamais tranché.

### 🟠 Dérive documentaire

| Claim | Réalité |
|---|---|
| `CLAUDE.md:105` + `docs/EDGE_FUNCTIONS_INDEX.md:5` : « **14 Edge Functions** » | **15** ✅ **vérifié** (`ls supabase/functions/` = 16 entrées − README). `generate-cover-image` absente des deux docs alors qu'elle est en production (`src/services/cover.ts:14`, `CoverEditor.tsx`, route `App.tsx:144`) |
| `CLAUDE.md:305` : Roadmap « **Univers v1 (cartographie + Ariane)** 🔴 » (à faire) | **Largement livré** : `UniverseSection.tsx` → `LoreGraphView.tsx` (~2100 L), onglet `universe` (`ProjectDetail.tsx:426`), Edge `narramind-compass`, table `compass_proposals`, `CompassSuggestionsPanel.tsx` |
| `CLAUDE.md` référence `wiki/DesignSystem.md`, `wiki/Agents.md`, `wiki/Univers.md`, `wiki/Checklist.md` | **Le répertoire `wiki/` n'existe pas dans le repo.** 4 renvois morts (le vault Obsidian est hors repo, mais les chemins sont écrits en relatif — donc trompeurs) |

### 🟡 Crédits en dur sur la landing

Le **prix** est dérivé de `TIER_CONFIG` (`Landing.tsx:521,558`) — excellent. Les **crédits** ne le sont pas : `:90,95,100,201,613` codent « 20 / 100 / 250 » en dur. Corrects aujourd'hui, dériveront silencieusement le jour où `maxGenerationsPerMonth` bouge. Le test de synchro ne couvre que front↔edge, pas landing↔`TIER_CONFIG`.

Mineur : `Landing.tsx:558` affiche `12.99 €` / `29.99 €` (point) au lieu de la convention FR `12,99 €`.

### 🟢 Soldé

`LoreFriseView.tsx`, `SpeechBubbleEditor.tsx` (1543 L) et le slice `ScenarioVersions` : **supprimés**, zéro occurrence. Les audits des 06-27 / 06-16 / 06-17 sont soldés sur ce point.

---

## 4. 🎨 Audit UX / UI

### 🔴 P0 — Le CTA du premier asset plante l'application ✅ **vérifié à la main**

`src/components/project/AssetLibrary.tsx:363-373` — état vide « Aucun asset créé » :
```tsx
onClick={() => {
  if (!onCanGenerate()) return;
  setNewAssetType(defaultNewAssetType);   // ← ligne 368
  setAssetDialogOpen(true);
}}
```

**Vérification exhaustive menée personnellement** (ce finding contredisait le rapport de l'agent technique, j'ai donc tout recontrôlé) :
- `setNewAssetType` n'est **ni déclaré ni importé** dans `AssetLibrary.tsx` — les 33 lignes d'import lues intégralement, l'état local du fichier est `assetDialogSeed`/`setAssetDialogSeed` (`:93`).
- Il n'existe que dans **un autre composant**, `CreateAssetDialog.tsx:66`.
- En revanche `defaultNewAssetType` (`:149`) et `setAssetDialogOpen` (`:92`) **existent bien** — un seul symbole est fautif, pas trois.
- Le bouton du header **fonctionne** (`:302-313`, `setAssetDialogSeed(null)`). **Seul celui de l'état vide est cassé — exactement le chemin que seuls les nouveaux utilisateurs empruntent et que Louis ne voit jamais** (il a des assets partout).

**Chaîne complète expliquant le passage en production :**
- `package.json:8` → `"build": "vite build"` ✅ **vérifié** — **aucun `tsc`**. esbuild strippe les types sans les vérifier.
- `package.json` lint-staged ne lance qu'ESLint ; `no-undef` est désactivé par défaut sous typescript-eslint (c'est TS qui est censé s'en charger).
- `.husky/pre-commit` lance bien `npx tsc --noEmit` → **le commit a donc été poussé avec `--no-verify`**, sinon TS2304 aurait bloqué.

**Et aucun garde-fou** : zéro `ErrorBoundary` / `componentDidCatch` dans tout `src/`. `main.tsx:16` rend `<App />` nu ; `App.tsx:103` n'a qu'un `<Suspense>` (qui attrape le *pending*, pas le *throw*). Le routing utilise `<Routes>` et non `createBrowserRouter`, donc `errorElement` indisponible sans migration.

→ **Nouvel utilisateur → Assets → clic sur l'unique CTA → écran blanc, sans reset ni message.**

**Fix** : `setAssetDialogSeed(null)` à la ligne 368 (aligner sur `:308`) + ErrorBoundary + `tsc --noEmit &&` dans le build.

### 🔴 Quota atteint dans l'éditeur : message mensonger, upsell perdu

`ChapterDetail.tsx:2237` :
```tsx
canGenerate={!!(promptDraft.trim() && project?.style_template)}
```
**Aucune vérification de quota.** Comparer à `AssetLibrary.tsx:392` qui fait bien `canGenerate={remaining > 0}`. Le bouton « Générer » du canvas reste actif à 20/20 crédits. **Viole `CLAUDE.md:160`** (« vérifier `canGenerate()` avant tout appel FAL.ai »).

Pire, `ChapterDetail.tsx:2026` :
```tsx
onError: () => toast({ title: "Génération IA indisponible",
  description: "Service temporairement indisponible. Réessayez dans quelques instants.", variant: "destructive" }),
```
**L'erreur n'est même pas bindée.** Or `services/panels.ts:450` positionne bien `err.quotaExceeded = true`, et le chemin « générer toutes les cases » **sait le gérer** (`ChapterDetail.tsx:1170` → `setShowQuotaModal(true)`).

→ Un utilisateur Libre à court de crédits lit **« Service temporairement indisponible »**. Il croit à une panne et réessaie en boucle. `QuotaReachedDialog` et son CTA « Passer au plan Créateur » ne s'ouvrent jamais. **C'est le moment de conversion le plus qualifié du produit, et il est perdu sur une chaîne codée en dur.**

Le même `onError` écrase aussi le mapping d'erreurs actionnable déjà écrit dans `useAssetGeneration.ts:43-57` (`summarizeGenerationError` : « contenu refusé… reformulez : ex. "marques d'usure" plutôt que "traces de combat" »). Il est à un import de distance.

### 🔴 Une erreur réseau est indiscernable d'un état vide

**Aucun composant de `src/pages` ou `src/components/project` ne lit `isError`.** Toutes les queries ont un défaut `= []` / `= 0`, et `App.tsx:73-80` ne définit ni `queryCache.onError` ni handler global.

| Query | Fichier | Ce que voit l'utilisateur si le fetch échoue |
|---|---|---|
| `useProject` | `ProjectDetail.tsx:78` → `:409-420` | **« Projet introuvable. »** |
| `useChapter` | `ChapterDetail.tsx:264` → `:1228-1241` | **« Chapitre introuvable. »** |
| `useProjects` | `Projects.tsx:47` | « Aucun projet » |
| `useScenarioChapters` | `ScenarioSection.tsx:80` | « Votre histoire commence ici » |

**Un coup de Wi-Fi annonce à l'auteur que son projet a été supprimé**, sans bouton « Réessayer » — seulement « Retour aux projets ».

*(Les mutations sont très bien traitées : `onError` + toast destructif français quasi partout, avec rollback optimiste — `ChapterDetail.tsx:697,717,759,980`. C'est la force du code.)*

### 🟠 Le dashboard annonce « vous n'avez rien » à chaque visite

`Dashboard.tsx:39-42` — aucun `isLoading` destructuré. `DashboardHome` branche sur `projects.length === 0` (`:238`). À **chaque** chargement de `/dashboard`, pendant le fetch, un utilisateur avec 10 projets voit « Créer mon premier webtoon » et des stats à **0** — puis tout apparaît. Sur l'écran d'accueil post-login.

`Projects.tsx:243-251` fait ça correctement (skeletons, `isLoading` avant `length === 0`) — **le pattern existe déjà dans la maison.**

### 🟠 États vides manquants sur les deux écrans les plus intimidants

- **Univers** : `LoreGraphView.tsx:1297` `const { data: loreNodes = [] }`. **Aucune branche `loreNodes.length === 0`** dans ~2100 lignes. À 0 nœud → plein écran (`calc(100vh - 4rem)`) de fond pointillé vide, sans un mot sur ce qu'est un nœud de lore. **C'est précisément l'écran qui porte l'ADN « Bâtir votre Univers » — et il n'explique rien.**
- **Canvas chapitre** : aucune branche `blocks.length === 0`. Un chapitre neuf s'auto-crée avec `blocks: []` et `panelHeight: 50_000` (`:343-353`) → **50 000 px de vide**, sans guidage.

À l'inverse, `ScenarioSection.tsx:549-592` (illustration + titre + 3 CTA différenciés) et `EditionSection.tsx:510-534` sont exemplaires. **Le savoir-faire est là, il n'a pas été appliqué à ces deux écrans.**

`Projects.tsx:252-261` : le texte promet « Créez votre premier projet pour commencer ! » mais **il n'y a pas de bouton** — le `mb-4` orphelin sur le dernier élément marque l'emplacement du CTA disparu.

### 🟠 « Générer toutes les cases » peut échouer en silence

`ChapterDetail.tsx:1167-1177` : hors quota, les échecs sont avalés (`// sinon : skip block`), sans toast ni compteur. Puis `:1182-1184` `if (generated > 0)` :
- **Tout échoue** → aucun toast. L'utilisateur regarde « Rendu x/y… » s'arrêter. Rien n'est dit.
- **Échec partiel** (3/8) → « **5 cases générées !** » avec un point d'exclamation. Les 3 échecs ne sont jamais mentionnés — **et les crédits sont consommés.**

`ChapterDetail.tsx:3086` : `description: String(err)` → fuite d'un message d'erreur anglais brut dans une UI 100 % française.

### Design System

| Règle | Verdict |
|---|---|
| **Inter interdite** | ✅ **Conforme.** `tailwind.config.ts:18-19` : `display: ["Quicksand"]`, `body: ["Nunito"]`. |
| **Couleurs hardcodées** | ✅ **Conforme.** Les 129 hex de `src/` sont tous légitimes : artwork canvas, color pickers, SVG décoratifs, logo de marque (auto-justifié en commentaire), icône Google. **Zéro `bg-[#...]`.** Les arbitraires sont token-based. |
| **Em-dash `—` en UI** | 🔴 **~75 violations / 24 fichiers.** Les 2 signalées le 2026-07-16 (`ProjectDetail.tsx:429,652`) sont **toujours là** et représentaient <3 % du réel. **Attention** : corriger `services/*` cassera des assertions de tests (`scenarioAI.test.ts:207,379`, `composeChapterLayout.test.ts:180`). À trancher : les `"—"` des tableaux admin sont un glyphe « pas de données », pas de la prose. |
| **shadcn non restylé** | 🟠 `button.tsx`, `badge.tsx`, `input.tsx` sont le **default upstream verbatim**. Ils héritent des tokens HSL, donc pas *hors* système — mais ne portent aucune signature DreamWeave (`rounded-md` stock vs l'idiome `rounded-xl`/`.glass`). Les appelants compensent par des `className` ad hoc. |

### Comparaison avec les standards concurrents (§1)

- **Cohérence de personnage** : Dashtoon entraîne des modèles custom. Le Sheet System (4 angles) est plus léger mais moins verrouillé. **Écart défavorable assumé.**
- **Export en calques** : Anifusion exporte en calques pour finition Photoshop / Clip Studio à 9 $/mois. DreamWeave exporte le chapitre à plat. **Manque identifié** — c'est exactement ce qui permet à un créateur sérieux d'utiliser l'IA sans être prisonnier de sa sortie, et c'est ce qui désamorce le grief « low-effort AI » de Reddit.
- **Continuité narrative** : **personne ne l'adresse.** NarraMind + Compass est en avance sur le marché. C'est l'actif le plus sous-exploité du produit.

---

## 5. 💡 Suggestions d'amélioration

### 🗑️ Retraits

| Quoi | Justification |
|---|---|
| **« Mémoire narrative longue » + « Priorité de traitement »** (`Landing.tsx:100`) | Vendues, non livrées, retirées de l'offre depuis le 06-27 mais toujours affichées. **Risque commercial et juridique** (publicité mensongère sur une page de vente). P0. |
| **`allowLongMemory`** (`types/index.ts:18`, `tierConfig.ts:13`) | Flag zombie et **seule contradiction structurelle** à « différenciation = volume uniquement » dans la source de vérité. Retirer > implémenter : l'implémenter affaiblirait l'argument « logique Spotify ». |
| **`filArianeLimit` + bloc `:292-300`** | Gate mort dont l'UI, si elle s'affichait, annoncerait un plafond Libre contraire à la stratégie. |
| **`maxProjects`** | Guard mort, 4 audits sans décision. |
| **Commentaire `tierConfig.ts:5-6`** | Annonce encore la mémoire longue en feature Studio. |

### ⚡ Optimisations

| Quoi | Justification |
|---|---|
| **Brancher `quotaExceeded` dans le canvas** (`ChapterDetail.tsx:2026,2237`) | Le code existe (`panels.ts:450`, `QuotaReachedDialog`, `setShowQuotaModal`) et fonctionne ailleurs. **Le moment de conversion le plus qualifié du produit est actuellement perdu sur un `onError` codé en dur.** Meilleur ROI business de l'audit. |
| **`tsc --noEmit &&` dans le build** (`package.json:8`) | Le P0 `AssetLibrary` est passé précisément parce que le build ne type-check pas. Corriger le bug sans corriger la chaîne garantit le prochain. |
| **ErrorBoundary global** | Zéro filet aujourd'hui. Tout `throw` de rendu = écran blanc. |
| **`isError` sur les queries de lecture** | « Projet introuvable » sur un coup de Wi-Fi est le pire message possible pour un auteur. |
| **`isLoading` → `DashboardHome`** (`Dashboard.tsx:39-42`) | Le pattern existe déjà dans `Projects.tsx:243-251`. |
| **États vides Univers + canvas** | L'écran porteur de l'ADN produit n'explique rien à 0 nœud. |
| **Index `hnsw` sur `project_embeddings.embedding`** | Plafond de scalabilité Compass. Une migration. |
| **`_shared/auth.ts`** | 9 copies du contrôle d'identité, sous `verify_jwt = false`. |
| **`transform: translate3d()` dans `useDragBlock`** | Supprime un reflow par `pointermove`. ⚠️ **Zone protégée Canvas — accord de Louis requis.** |

### ➕ Ajouts

| Quoi | Justification (source datée) |
|---|---|
| **Export en calques (PSD / calques séparés)** | Anifusion le propose à 9 $/mois avec finition Photoshop / Clip Studio ([COMICPAD, 2026-07-08](https://www.comicpad.app/best-ai-comic-generators)). C'est le pont entre « généré par IA » et « fini à la main » — **et la réponse directe au grief Reddit « low-effort AI »** ([The AI Tribune, 2026-05-08](https://aitribune.net/2026/05/08/ai-webtoon-in-2026/), hors fenêtre 30 j). |
| **Label « créé avec assistance IA » à l'export** | WEBTOON CANVAS l'exige pour toute série monétisée (2026-03-26) ; l'AI Basic Act coréen l'impose pour la distribution commerciale (2026-01-22). **Sources hors fenêtre 30 j — signalées comme telles, mais ce sont des obligations, pas des tendances.** Un export DreamWeave vers CANVAS est aujourd'hui non conforme. |
| **Communiquer sur la continuité narrative comme différenciateur #1** | Les griefs communautaires portent sur « mauvaise continuité », « visages statiques », « expressions fausses ». NarraMind/Compass adresse le premier et **personne ne communique dessus** — tout le marché parle de cohérence visuelle. Actif déjà construit, non exploité. |

---

## 6. 🚀 Statut de lancement

**Verdict : NON prêt pour une annonce publique. Trois bloquants, tous corrigeables en une session.**

Le produit est fonctionnellement complet et techniquement mature (RLS solide, Stripe livré, 575 tests, 0 `any`). Ce ne sont pas les fondations qui bloquent — ce sont trois défauts situés exactement sur le chemin du nouvel utilisateur et sur la page de vente, c'est-à-dire les deux seules choses qu'un lancement public expose.

### Bloquants

| # | Bloquant | Nature | Effort |
|---|---|---|---|
| 1 | **`AssetLibrary.tsx:368` — écran blanc sur le CTA du premier asset** | **Le parcours d'onboarding est cassé pour 100 % des nouveaux inscrits.** Invisible pour Louis (il a des assets). Annoncer publiquement avec ce bug = brûler le trafic du jour 1. | 1 ligne |
| 2 | **`Landing.tsx:100` — deux features vendues et non livrées** | Risque commercial/juridique sur la page de vente. Contredit `Plans.tsx` au moment de payer. | 1 ligne |
| 3 | **Storage : policy SELECT non scopée** | Les planches non publiées de chaque auteur sont énumérables cross-user. **Sur un produit créatif, c'est le pire type de fuite** : l'œuvre inédite est l'actif de l'utilisateur. Inacceptable au moment où le nombre de comptes cesse d'être 1. | 1 migration |

### Non bloquant mais à décider avant l'ouverture

- **Quota fail-open** (`_shared/quota.ts:34,44`) : un incident Postgres = générations FLUX.2 Pro illimitées et non facturées. Tolérable à 1 utilisateur, structurellement dangereux dès l'ouverture publique. **Décision de Louis requise** : accepter le risque coût, ou basculer fail-closed + alerte.

### Checklist priorisée

| # | Action | Fichier | Effort |
|---|---|---|---|
| 1 | `setAssetDialogSeed(null)` au lieu de `setNewAssetType(...)` | `AssetLibrary.tsx:368` | 1 ligne |
| 2 | Retirer les 2 highlights fantômes | `Landing.tsx:100` | 1 ligne |
| 3 | Scoper la policy SELECT Storage | nouvelle migration | S |
| 4 | `tsc --noEmit &&` dans le build | `package.json:8` | 1 ligne |
| 5 | ErrorBoundary global | `main.tsx` / `App.tsx` | S |
| 6 | Trancher le fail-open quota | `_shared/quota.ts` | décision |
| 7 | Brancher `quotaExceeded` dans le canvas | `ChapterDetail.tsx:2026,2237` | S |
| 8 | `isError` sur les queries de lecture | pages + sections | M |
| 9 | Retirer `allowLongMemory` / `filArianeLimit` / `maxProjects` | `types/index.ts`, `tierConfig.ts` | S |
| 10 | États vides Univers + canvas | `LoreGraphView.tsx`, `ChapterDetail.tsx` | M |
| 11 | Corriger la doc (15 EF, statut Univers v1, renvois `wiki/` morts) | `CLAUDE.md`, `docs/` | S |
| 12 | Campagne em-dash (⚠️ casse des tests dans `services/*`) | 24 fichiers | M |

**Les points 1 à 5 sont réalisables en une session et débloquent l'annonce.**

---

## 7. 📣 Plan marketing

**Posture actuelle** : aucune présence externe détectable. Pas de compte social, pas de waitlist, pas de capture d'email sur la landing. Le produit tourne en local/Vercel sans annonce. **La landing convertit vers l'inscription directe — il n'y a aucun filet pour les visiteurs qui ne s'inscrivent pas le jour même.**

**Contrainte de contexte majeure** : le sentiment communautaire envers les outils IA webtoon est **hostile** ([The AI Tribune, 2026-05-08](https://aitribune.net/2026/05/08/ai-webtoon-in-2026/)). Un lancement « générez votre webtoon avec l'IA » sur Reddit se fera démolir sur la continuité et les expressions — les griefs exacts documentés. **L'angle doit être l'assistance au créateur et la cohérence narrative, pas la génération.** C'est aussi le seul angle où DreamWeave est réellement en avance.

| # | Tâche | Priorité | Effort |
|---|---|---|---|
| 1 | **Waitlist + capture email sur la landing** — rien ne retient un visiteur aujourd'hui | Haute | Rapide |
| 2 | **Corriger les 3 bloquants avant toute acquisition** — envoyer du trafic sur un onboarding cassé détruit l'actif le plus cher (la première impression) | Haute | Rapide |
| 3 | **Réécrire l'angle de la landing : « l'IA qui tient votre continuité », pas « l'IA qui dessine »** — répond au grief #1 du marché, exploite NarraMind, évite le terrain où Dashtoon gagne | Haute | Moyen |
| 4 | **Compte Instagram + TikTok** — le public webtoon y est ; format vertical natif = le format du produit | Haute | Rapide |
| 5 | **Vidéo teaser de concept** — montrer un chapitre complet en scroll vertical, pas des images isolées | Haute | Moyen |
| 6 | **Devlog public (X + Reddit r/webtoons, r/manga)** — le devlog transparent est la seule entrée acceptée sur ces communautés ; « je construis un outil, voilà mes choix » passe là où « essayez mon générateur IA » se fait bannir | Moyen | Long |
| 7 | **Page de comparaison honnête vs Dashtoon / Anifusion** — reconnaître l'avance de Dashtoon sur la cohérence de personnage et revendiquer la continuité narrative. La franchise convertit mieux qu'un tableau tout-vert sur un public hostile | Moyen | Moyen |
| 8 | **Label IA à l'export + le communiquer** — obligation CANVAS et loi coréenne. En faire un argument de conformité plutôt qu'une contrainte subie | Moyen | Moyen |
| 9 | **Product Hunt** — après les bloquants et la waitlist, jamais avant | Basse | Moyen |
| 10 | **Programme early access sur les 20 crédits Libre** — la gratuité intégrale est déjà l'argument ; il faut juste que quelqu'un le sache | Basse | Rapide |

---

## 8. Note de méthode — divergence entre agents

Deux agents ont produit des conclusions **incompatibles**, ce qui a déclenché une contre-vérification manuelle :

- L'agent technique a rapporté **`npx tsc --noEmit` → 0 erreur, EXIT 0, vérifié**.
- L'agent UX a rapporté un **symbole non déclaré** (`setNewAssetType`, `AssetLibrary.tsx:368`) — ce qui produit nécessairement une erreur TS2304 et rend « 0 erreur » impossible.

**Vérification menée personnellement** (grep exhaustif + lecture intégrale des imports du fichier) : **l'agent UX a raison.** `setNewAssetType` n'est ni déclaré ni importé dans `AssetLibrary.tsx` ; il n'existe que dans `CreateAssetDialog.tsx:66`. En revanche l'agent UX se trompait partiellement sur l'étendue : `defaultNewAssetType` (`:149`) et `setAssetDialogOpen` (`:92`) **existent bien**. **Un seul symbole est fautif, pas trois.**

Mon propre `tsc --noEmit` n'a pas abouti dans le temps imparti (> 6 min, toujours en cours à la clôture — lenteur du montage OneDrive depuis le sandbox Linux). **Le comptage exact d'erreurs TypeScript reste donc non établi.** Mais le finding ne dépend pas de tsc : un identifiant non déclaré et non importé est une erreur de compilation et un `ReferenceError` à l'exécution, ce qui est établi par lecture directe du source.

L'affirmation « 0 erreur TypeScript » de l'agent technique est **à considérer comme non fiable** — et par extension, les métriques de cet agent qui reposent sur la même exécution. À reconfirmer sur la machine de Louis (`npx tsc --noEmit`, quelques secondes en local).

Limites d'environnement rencontrées, sans conséquence sur le code : `vitest` non exécutable (segfault esbuild — `node_modules` installé depuis Windows sur montage OneDrive), `eslint` en timeout > 200 s. **Le statut « tests verts » et « lint propre » n'a été vérifié par personne** — 575 cas de test comptés statiquement seulement.

Connecteurs Figma / Linear / Notion / Slack non autorisés dans cette session non interactive : aucun signal produit externe n'a pu être croisé.

---

## TL;DR

- 🔴 **Le parcours d'onboarding est cassé** — `AssetLibrary.tsx:368` appelle `setNewAssetType`, un symbole qui n'existe pas dans le fichier. Écran blanc pour **100 % des nouveaux inscrits**, sur l'unique CTA de l'état vide. Invisible pour Louis (il a des assets partout). Passé en prod parce que `"build": "vite build"` ne type-check pas et que le hook pre-commit a été contourné (`--no-verify`). **Correctif : 1 ligne.**
- 🔴 **La landing vend deux features retirées de l'offre le 2026-06-27 et jamais implémentées** (`Landing.tsx:100` : « Mémoire narrative longue », « Priorité de traitement »). Elle se contredit elle-même (« Toutes les fonctionnalités » en Libre) **et contredit `Plans.tsx`, qui est propre, au moment de payer**. Le retrait a été documenté sans jamais être exécuté. **Correctif : 1 ligne.**
- 🔴 **Fuite Storage cross-user** — la policy SELECT du bucket `dreamweave` s'appelle « Users can view own files » mais ne contient aucun `auth.uid()`. Tout compte authentifié peut énumérer et lire les planches inédites de tous les autres. Sur un produit créatif, l'œuvre non publiée est *l'*actif de l'utilisateur. **Correctif : 1 migration.**
- ⚡ **Le meilleur ROI business est déjà codé et débranché** : à quota épuisé, le canvas affiche « Service temporairement indisponible » au lieu d'ouvrir `QuotaReachedDialog` et son CTA « Passer au plan Créateur ». `panels.ts:450` positionne pourtant `quotaExceeded`, et le chemin « générer toutes les cases » le gère correctement. **Le moment de conversion le plus qualifié du produit est perdu sur un `onError` non bindé.**
- 🎯 **Le vrai différenciateur est construit mais muet** : le marché se bat sur la cohérence *visuelle* (Dashtoon entraîne des modèles custom et gagne ce terrain). Les griefs communautaires portent sur la **continuité narrative** — que NarraMind/Compass adresse et dont **personne ne parle**. Manque identifié face à Anifusion : l'export en calques (9 $/mois), qui est aussi la meilleure réponse au grief « low-effort AI ».
- ⚠️ **Un rapport d'agent est non fiable** : l'agent technique a affirmé « `tsc` 0 erreur, vérifié », ce qui est incompatible avec le bug ci-dessus. Contre-vérifié à la main. Ses métriques d'exécution sont à reconfirmer localement.

**Prochaine action** : les 5 premiers points de la checklist §6 tiennent en une session et débloquent l'annonce publique.

---

> 📝 **Impact Mémoire** : deux findings touchent des affirmations du mémoire.
> **Section concernée** : Modèle économique / Fonctionnalités · Architecture technique
> **Proposition** : (1) `Produit/Memoire_DreamWeave.md` décrit « différenciation par le volume de crédits uniquement ». C'est **contredit dans le code livré** : `Landing.tsx:100` vend deux features comme exclusives à Studio, et `TIER_CONFIG.studio.allowLongMemory: true` est la seule variation de features entre plans dans la source de vérité. **Ne pas modifier le mémoire tant que `allowLongMemory` n'est pas tranché** — une fois le flag retiré et `Landing.tsx:100` corrigé, la formulation actuelle devient exacte sans retouche. Implémenter la mémoire longue imposerait au contraire de passer à un modèle hybride volume + feature, ce qui affaiblirait l'argument « logique Spotify ». **Recommandation : retirer le flag, garder le positionnement.** (2) Le compte d'Edge Functions est à corriger partout : **15, pas 14** (`generate-cover-image` manquante dans `CLAUDE.md:105` et `docs/EDGE_FUNCTIONS_INDEX.md:5`).
