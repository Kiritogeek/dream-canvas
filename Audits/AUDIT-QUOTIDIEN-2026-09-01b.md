# Audit Quotidien DreamWeave — 2026-09-01 (cycle b)

*Cycle automatisé `dreamweave-daily-audit`. Second passage du 2026-09-01 — le fichier `AUDIT-QUOTIDIEN-2026-09-01.md` (12h52) existe déjà et n'a pas été écrasé. Comparaison avec `AUDIT-QUOTIDIEN-2026-08-27.md`.*

**Lecture seule. Aucun fichier de code modifié, aucun commit, aucun push.**

---

## 1. 🔍 Benchmark & Intelligence concurrentielle

### Avertissement méthodologique

La consigne impose de ne retenir que des sources du **mois courant**. Nous sommes le **1er septembre 2026** : la fenêtre stricte « septembre 2026 » ne contient encore aucune journée complète. La fenêtre appliquée est donc **glissante à 30 jours (2 août → 1er septembre 2026)**, et chaque source hors fenêtre est explicitement écartée plutôt que silencieusement recyclée.

### Sources retenues (dans la fenêtre)

| Date | Source | Constat |
|---|---|---|
| **2026-08-27** | [Anifusion — revue éditoriale mise à jour](https://anifusion.ai/) | Anifusion continue d'être positionné comme studio manga navigateur « pour aspirants mangaka sans compétence de dessin » — **positionnement quasi identique à celui de DreamWeave**. C'est le concurrent dont la proposition de valeur recoupe le plus la nôtre. |
| **2026-08-11** | [LlamaGen — démonstration multi-format](https://llamagen.ai/) | Démonstration contrôlée : **histoire de 12 pages, 8 personnages récurrents, 40 cases**, et adaptation d'un même chapitre en **3 formats de lecture** (manga japonais, comic occidental, webtoon vertical). La cohérence de personnage sur volume long n'est plus un différenciateur défendable seul. |
| **Août 2026** | [Product Hunt — récap des lancements d'août 2026](https://blog.mean.ceo/product-hunt-launches-news-august-2026/) | Aucun lancement d'outil webtoon/manga IA majeur identifié sur la période. **La fenêtre de lancement Product Hunt reste ouverte** pour DreamWeave. |

### Sources écartées (hors fenêtre 30 jours) — conservées ici comme contexte structurel, pas comme actualité

- **Nano Banana 2** (Google), annoncé le **2026-02-27** : cohérence stable sur 8-10+ éditions séquentielles, jusqu'à 5 personnages, devenu la référence de fait pour bande dessinée et storyboard. *Hors fenêtre, mais c'est le point de comparaison contre lequel FLUX.2 Pro sera jugé.*
- **WEBTOON — plateforme CANVAS internationale unifiée** + programme de traduction IA opt-in 7 langues, **2026-03-26**. *Hors fenêtre.*
- **Jenova Webtoon Creator**, gratuit avec usage limité, payant à **20 $/mois**, mars-avril 2026. *Hors fenêtre — mais c'est l'ancrage tarifaire international face auquel Créateur à 12,99 € se positionne.*

### Sentiment communauté

**Aucune source communautaire datable dans la fenêtre 30 jours.** Les recherches Reddit / Discord / X n'ont retourné que du contenu commercial (Gumroad, blogs SEO d'éditeurs d'outils) sans date fiable, ou du contenu antérieur à la fenêtre. **Rien n'est inventé ici** : ce point est simplement vide ce cycle.

### Lecture concurrentielle

Le marché est **calme sur 30 jours** — aucun lancement ni aucune levée de fonds nouvelle qui change l'équation. Mais la tendance de fond est défavorable à la différenciation actuelle de DreamWeave : la cohérence de personnage, argument central du produit, est en train de devenir **une commodité fournie par le modèle** (Nano Banana 2, FLUX.2) plutôt qu'une valeur ajoutée de la plateforme. LlamaGen le démontre à 40 cases dès le 11 août.

**Conséquence stratégique** : le différenciateur défendable de DreamWeave n'est pas « des personnages cohérents », c'est **le pipeline intégré Style → Assets → Scénario → Éditeur → Export** et surtout le **menu Univers** (cartographie narrative + Ariane). Aucun concurrent identifié ne propose de mémoire narrative structurée. C'est là qu'il faut investir, et c'est précisément la partie inachevée.

---

## 2. 🛠️ Audit technique

**Périmètre mesuré** : 207 fichiers `.ts`/`.tsx` (47 267 lignes) dans `src/`, **15 répertoires** d'Edge Functions (11 171 lignes), 49 migrations SQL, 35 fichiers de test.

**Faux positif écarté** : `git status` remonte 466 fichiers modifiés — c'est un **artefact CRLF** (`core.autocrlf` non défini côté mount). `git diff --ignore-cr-at-eol --stat` retombe à **3 fichiers** réellement modifiés. Le repo n'est pas en vrac.

**Commande n'ayant pas abouti** : `npx vitest run` — le binaire natif `esbuild` segfault (exit 139) dans l'environnement Linux. **Aucun résultat de test réel ce cycle** ; les 35 fichiers de test ont été inventoriés statiquement seulement.

| Axe | Note /10 | Justification |
|---|---|---|
| **Qualité du code** | **6/10** | Signaux excellents (**0 `any`** sur 47k lignes, ESLint 0 warning, 2 `@ts-ignore` seulement, commentaires WHY pertinents) mais **110 erreurs TypeScript réelles** invisibles, dont **13 appels à un symbole inexistant**. Un composant de 3 174 lignes. |
| **Architecture globale** | **7/10** | Sens de dépendance `types → integrations → services → hooks → components → pages` réellement respecté. `_shared/` bien factorisé (`ownership`, `quota`, `cors`, `tierConfig`) avec 6 fichiers de test. `manualChunks` réfléchi. Plombé par 3 god-components et `verify_jwt = false` sur les 15 fonctions. |
| **Performance & scalabilité** | **6/10** | Mémoïsation sérieuse (153 `useCallback`, 68 `useMemo`), `staleTime: 30_000`, `console.log` strippés en prod. Mais **PNG de 1,2 Mo sur la landing**, **aucun index ANN pgvector**, **aucune virtualisation** sur un canvas allant jusqu'à 100 000 px. |
| **Sécurité** | **6/10** | Fondations au-dessus de la moyenne : **RLS sur 18/18 tables**, helper anti-IDOR nommé et commenté, CORS en allowlist stricte, signature Stripe vérifiée avant écriture, crédit consommé sous `pg_advisory_xact_lock`. Mais **bucket Storage public + policy SELECT sans filtre d'ownership**, quota **fail-open**, email admin en dur dans le bundle. |
| **Dette technique** | **5/10** | La porte de qualité (`tsc --noEmit`) est un **no-op** en CI *et* en pre-commit : elle valide **0 fichier**. 110 erreurs se sont accumulées derrière. |

**Score moyen : 6,0/10** (contre ≈4,8/10 annoncé au 08-27 — l'écart vient d'une méthode de notation différente entre cycles, pas d'une amélioration du code : **aucun commit applicatif depuis le 2026-07-19**).

### Détail par axe

#### Qualité du code — le typecheck ne vérifie rien

`tsconfig.json` est un fichier *solution-style* (`"files": []` + `references`). Sans `--build`, `tsc --noEmit` type-check **zéro fichier** — vérifié : `npx tsc --noEmit --listFilesOnly` retourne 0 ligne.

Or cette commande exacte est la porte de qualité à deux endroits : `.github/workflows/ci.yml:26` et `.husky/pre-commit:2`. Les deux passent au vert sans rien contrôler. En ciblant la vraie config : `npx tsc -p tsconfig.app.json --noEmit` → **exit 2, 110 erreurs** (dont **~98 en code applicatif et 12 dans des fichiers `.test.ts`**).

Répartition : `LoreGraphView.tsx` (24), `ChapterDetail.tsx` (19), `services/panels.ts` (7), `useArianeLoreProposals.ts` (7), `useDragBlock.ts` (6), 26 autres fichiers (47).

Aggravant : la racine `tsconfig.json` désactive `strictNullChecks` et `noImplicitAny` alors que `tsconfig.app.json:19` active `strict: true`. Les deux configs se contredisent.

#### Deux bugs de production confirmés, même pattern

**A. `setDragPreview` n'existe pas** — `src/pages/ChapterDetail.tsx`, 13 appels (L1477, 1540, 1547, 1581, 1592, 1602, 1610, 1619, 1627, 1635, 1654, 1662, 1669). Aucune déclaration nulle part dans `src/`. En ESM strict : `ReferenceError` dans `onDragOver`/`onDrop`/`onDragEnd` du canvas. Introduit par `d4bed42` (2026-04-28, refactor « Option A »). **Zone protégée Canvas Éditeur — arbitrage de Louis requis.**

**B. `setNewAssetType` n'existe pas** — `src/components/project/AssetLibrary.tsx:368`. Le seul setter de ce nom est le state local de `CreateAssetDialog.tsx:66` ; le state d'AssetLibrary s'appelle `assetDialogSeed` (L93). Au clic sur **« Créer mon premier asset »** → `ReferenceError` → la ligne 369 (`setAssetDialogOpen(true)`) n'est jamais atteinte → **le dialog ne s'ouvre pas**. C'est le premier bouton que voit un nouvel utilisateur sur l'onglet Assets. **Hors zone protégée, correctif d'une ligne.**

Pourquoi rien ne les attrape : Vite/SWC strippe les types sans résoudre les identifiants (le build passe), `tsc --noEmit` est un no-op (la CI passe), et `typescript-eslint` désactive `no-undef` (le lint passe). **Les trois filets ont un trou au même endroit.**

#### Sécurité — la faille la plus sérieuse

`supabase/migrations/20260209195229_....sql:162-170` : bucket `dreamweave` créé avec `public = true`, et la policy nommée *« Users can view own files »* est :

```sql
CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (bucket_id = 'dreamweave');
```

**Aucun filtre `auth.uid()`** — contrairement aux policies INSERT et DELETE qui vérifient bien `auth.uid()::text = (storage.foldername(name))[1]`. Le nom de la policy ment sur son comportement. Résultat : **toute planche, fiche personnage ou page de chapitre de n'importe quel utilisateur est lisible sans authentification dès lors que son chemin est connu ou deviné** (`{user_id}/{asset_id}.png`). Ce n'est pas un listing public — mais la seule protection résiduelle est l'imprévisibilité des UUID, c'est-à-dire de la sécurité par obscurité, sur un produit dont la valeur est du contenu créatif **non publié**. Aucune migration ultérieure ne corrige, et `src/services/assets.ts:77` utilise `getPublicUrl()` partout (jamais `createSignedUrl`).

Autres points : quota **fail-open** (`_shared/quota.ts:38,43` — une panne RPC autorise des générations FAL.ai facturées et non comptées) ; email personnel de Louis en dur dans 3 Edge Functions **et embarqué dans le bundle JS public** (`src/constants/ariane.ts:5`) ; aucun rate limiting propre ; pas d'idempotence sur le webhook Stripe (un rejeu décale `billing_period_start`).

**`npm audit`** : 8 vulnérabilités (2 critiques, 4 hautes, 2 modérées). **Une seule touche le runtime livré** : `react-router-dom` (déclaré `^6.30.1`, résolu **6.30.4** au lockfile), open redirect via backslash menant à XSS. `npm audit fix` annoncé suffisant.

**Bonne nouvelle** : `.env` n'est plus suivi par git (retiré en `25d8903`) et ne contenait que des valeurs `VITE_` publiques par conception. **Aucune `service_role`, aucune clé FAL/Gemini/Stripe committée.** Pas de rotation d'urgence.

#### Performance — deux falaises

- **PNG de 1,2 Mo non compressé** (`src/assets/Ariane_Nero_AI_Background_Remover_transparent.png`) importé par `src/pages/Landing.tsx:13`, donc sur le chemin de premier rendu de la page publique. Il pèse **plus que le chunk d'entrée JS** (490 Ko). Aucune variante WebP/AVIF. Gain attendu ~90 %.
- **Aucun index ANN pgvector.** `20260522110000_project_embeddings.sql` crée un unique composite et un btree, mais rien sur la colonne `embedding`. Or `match_embeddings` fait `ORDER BY pe.embedding <=> query_embedding`. Le filtre `project_id` borne le coût aujourd'hui, mais la latence Compass croît linéairement avec la taille de l'univers narratif — **exactement la feature en construction**. Correctif : `CREATE INDEX ON project_embeddings USING hnsw (embedding vector_cosine_ops);`
- **Canvas non virtualisé** : aucun `react-window`/`IntersectionObserver` dans `src/`. Tous les blocs d'un chapitre (jusqu'à 100 000 px de haut) sont montés simultanément.

#### Dette technique

God files : `ChapterDetail.tsx` (3 174 l., **30 `useState` + 38 hooks mémo dans un seul composant**), `LoreGraphView.tsx` (2 196 l.), `ScenarioChapterEditor.tsx` (1 937 l.), `useArianeLoreProposals.ts` (1 105 l.). Côté serveur : `narramind-update` (1 400 l.), `generate-asset-image` (1 054 l.), `generate-scenario-ai` (1 030 l.).

**~10 000 lignes d'Edge Functions ne sont jamais type-checkées** (`tsconfig.app.json:29` n'inclut que `src` et `_shared`, et aucun `deno check` en CI). **Dérive documentaire** : CLAUDE.md et `docs/EDGE_FUNCTIONS_INDEX.md` annoncent 14 fonctions ; il y en a **15** (`generate-cover-image` n'est listée nulle part).

`zod@3.25` est une dépendance du projet mais **n'est utilisé dans aucune Edge Function** — alors que c'est exactement la frontière où CLAUDE.md exige de valider.

### Top 10 des problèmes par sévérité

| # | Sévérité | Problème | Fichier | Correction |
|---|---|---|---|---|
| 1 | **Critique** | `tsc --noEmit` type-check 0 fichier : porte qualité CI + pre-commit = no-op, 110 erreurs cachées | `tsconfig.json:2`, `ci.yml:26`, `.husky/pre-commit:2` | `tsc -b --noEmit` puis traiter les 110 erreurs |
| 2 | **Critique** | `setDragPreview` appelé 13× jamais déclaré → `ReferenceError` sur le drag du canvas | `ChapterDetail.tsx` L1477→1669 | Rétablir le `useState` perdu en `d4bed42` — **⛔ zone protégée, accord de Louis requis** |
| 3 | **Critique** | `setNewAssetType` non déclaré → le CTA « Créer mon premier asset » ne fait rien | `AssetLibrary.tsx:368` | Remplacer par le seed existant (`setAssetDialogSeed`) — 1 ligne, hors zone protégée |
| 4 | **Critique** | Bucket Storage public + policy SELECT sans ownership → toutes les planches lisibles sans auth | `20260209195229_....sql:162,169` | Ajouter `AND auth.uid()::text = (storage.foldername(name))[1]`, bucket en privé, `createSignedUrl()` |
| 5 | **Majeur** | Quota **fail-open** : panne RPC = générations FAL.ai facturées et non comptées | `_shared/quota.ts:38,43` | Passer en fail-closed (503 explicite) |
| 6 | **Majeur** | Erreurs de query **100 % invisibles** → « Projet introuvable » sur simple coupure réseau | `ProjectDetail.tsx:78-79`, `ScenarioSection.tsx:80`, `EditionSection.tsx:266-282` | Lire `isError` + état d'erreur avec « Réessayer » |
| 7 | **Majeur** | Aucun index ANN pgvector → scan séquentiel sur `match_embeddings` | `20260522110000_project_embeddings.sql` (absence) | Index `hnsw (embedding vector_cosine_ops)` |
| 8 | **Majeur** | PNG 1,2 Mo sur le premier rendu de la landing publique | `Landing.tsx:13` | WebP/AVIF + `srcset` |
| 9 | **Majeur** | `verify_jwt = false` sur les 15 fonctions : un oubli de `verifyUserFromToken` = fonction ouverte | `supabase/config.toml` | Test assertant l'appel dans chaque `index.ts` (sauf `stripe-webhook`) |
| 10 | **Mineur** | `react-router-dom` 6.30.4 — open redirect → XSS (seule vuln du runtime livré) | `package.json:63` | `npm audit fix` |

---

## 3. 📦 Audit produit

### La landing vend deux features explicitement retirées de l'offre

`src/pages/Landing.tsx:96-101` affiche pour le plan Studio : `["250 crédits / mois", "Mémoire narrative longue", "Priorité de traitement"]`.

CLAUDE.md acte que ces deux features ont été **retirées de l'offre commerciale le 2026-06-27 « pour ne pas vendre une feature non livrée »**. Elles sont toujours sur la page publique. Pire, l'app se contredit elle-même : `src/pages/Plans.tsx:43-105` liste 9 features **identiques sur les 3 plans**, sans mention de mémoire longue ni de priorité. **Un prospect qui passe de la landing à `/dashboard/plans` voit deux offres différentes pour le même prix.**

C'est le cœur du positionnement « différenciation par le volume de crédits uniquement » qui est cassé sur la seule page que voient les non-inscrits — et un risque de publicité trompeuse.

### Export : « PNG » promis, ZIP livré

`Landing.tsx:49` et `:77` (« Exportez votre chapitre en PNG »), `Plans.tsx:94` (« Export chapitre complet PNG »). La sortie réelle est un **`.zip` de tranches de 1280 px** (`src/services/exportPanel.ts:266-271`, hauteur de coupe en dur `:224`). Défendable pour du webtoon, mais l'utilisateur qui clique attend un fichier image.

### Flags de tier morts : `allowLongMemory` n'est pas seul

Trois cas, dont deux non documentés jusqu'ici :

- **`allowLongMemory`** (`types/index.ts:32/44/56`) — consommé nulle part hors le test de synchronisation. Connu.
- **`filArianeLimit`** (`types/index.ts:19`) — `null` sur les 3 plans, mais `ArianeContinuityPanel.tsx:294` contient une copy figée : *« alerte(s) masquée(s) — plan Libre limité à N alertes. »* Branche inatteignable décrivant une restriction abolie, protégée par un `!` non-null qui masquerait le bug si la valeur revenait.
- **`allowReferenceImages`** (`StyleManager.tsx:59`) — `true` partout, donc `StyleManager.tsx:567-578` est un **upsell complet « Passez au plan Créateur »** en code mort. Idem `canUseCases` (`ChapterDetail.tsx:272`).

Le scaffolding de gating mort ne se limite donc pas à des booléens inertes : il contient **de la copy commerciale contradictoire avec le positionnement actuel, prête à réapparaître**.

### Redondance et bug latent

Deux surfaces de suggestions Ariane coexistent sur des backends différents : le Fil d'Ariane (`LoreUniversProposalsSheet`, matching texte) et `CompassSuggestionsPanel` (`LoreNodeSheet.tsx:714-722`, pgvector). Ni source ni logique d'acceptation partagées.

**Bug latent de contamination** : `narramind-compass/index.ts:376` insère avec `prefill_data: null` et un `proposal_type` fourni par le client valant `"lore_asset"` (`LoreNodeSheet.tsx:331`). Or la query du Fil d'Ariane (`useArianeLoreProposals.ts:132`) inclut `lore_asset`. Ces lignes remontent dans le Fil d'Ariane et, à l'acceptation, `useArianeLoreProposals.ts:546-547` déréférence `prefill_data` → **TypeError sur `null`**.

### Univers v1 — l'écart roadmap/code s'élargit encore

CLAUDE.md marque « Univers v1 🔴 » (non démarré). **6 824 lignes sont livrées** (front 4 969 + Edge Functions 1 855). L'audit du 08-27 estimait ~3 649 lignes : la mesure de ce cycle est presque du double. **Sixième cycle consécutif où l'écart n'est pas tranché.**

- **Pilier 1 — Cartographie : ~90 % livré.** 4 types de nœuds, création élément/événement, fiche éditable autosave 1 s, edges par drag ou formulaire, anti-doublon, layout force-directed, persistance des positions, recherche. Manques : pas de suppression clavier (`deleteKeyCode={null}`), pas de filtre par type, pas de légende.
- **Pilier 2 — Amélioration continue : ~40 % livré côté utilisateur.** C'est l'écart critique. Le scan accessible depuis Univers (`runScan`) ne produit que `lore_asset`, `lore_chapter_update`, `lore_connection`. Les propositions d'**enrichissement de fiches** et d'**événements** — le cœur de l'ADN « améliorer les éléments de votre Univers grâce au scénario » — ne sont produites que par `triggerForceScan` (452 lignes, 41 % du hook), **câblé au seul panneau admin** (`TestSection.tsx:553`, gaté sur l'email de Louis).

  Conséquence directe : `LoreUniversProposalsSheet.tsx:113-127` **affiche les sections « Enrichir les fiches » et « Événements » que le chemin utilisateur ne peut jamais remplir.**

- **Aggravants** : aucun bouton de rescan manuel, debounce de **5 minutes** ; **le lore n'alimente jamais Ariane** (`narramind-update/index.ts:829` lit `projects.universe_lore`, colonne **jamais écrite** par `src/`) ; **la vectorisation ignore l'Univers** (les 3 déclencheurs du mode `index` passent tous `source_type: "chapter"`, donc `world_rules` et `lore_nodes` ne sont jamais indexés → le bouton Ariane de la fiche retourne fréquemment `no_relevant_context`).

- **Dérives hors des 2 piliers** (CLAUDE.md : *« Ce que ce n'est PAS : timeline, frise, visualisation temporelle »*) : `LoreGraphView.tsx:691` documente un layout *« Chronologique — axe X = timeline des Événements »* (`computeChronoLayout:695-784`, bouton `:2091`). La migration `20260522150000_lore_graph.sql:7` avait pourtant supprimé `projects.lore_timeline` — la frise a été retirée puis réintroduite sous une autre forme. `WorldRulesDialog` (`LoreGraphView.tsx:211-458`) constitue une 3ᵉ surface, ni cartographie ni amélioration continue.

---

## 4. 🎨 Audit UX / UI

### Parcours — deux CTA morts sur le chemin critique

Voir §2 (problèmes 2 et 3). Le CTA « Créer mon premier asset » est le **tout premier bouton** que voit un nouvel utilisateur sur l'onglet Assets, et il ne fait rien, sans message.

**Gating progressif : verrouillage silencieux.** `useProgressiveMenuGate.ts:79-95` verrouille **tous** les onglets tant que le style n'est pas validé, y compris pour un utilisateur vétéran (L81-83). `DashboardLayout.tsx:99-105` ne grise pas les items verrouillés : il les **retire du DOM**. Un nouvel utilisateur voit une sidebar à **un seul item** (Style) + Paramètres.

Aggravants : URL directe vers un onglet verrouillé → redirection vers `style` **sans message** (`ProjectDetail.tsx:125-131`) ; clic ignoré sans feedback (`:497-499`) ; la seule passerelle Style → Assets (`StyleManager.tsx:588`) est rendue sous `{!isFirstTime && …}` donc **invisible avant la sauvegarde**, puis neutralisée 750 ms (`pointer-events-none`) — **le clic naturel juste après validation est avalé** ; et **l'ordre de la sidebar est inversé** (`DashboardLayout.tsx:37-43` : `edition, scenario, universe, assets, style`), l'utilisateur lit sa progression de bas en haut.

**Compte jusqu'au premier asset** : 6 interactions minimum, la génération partant automatiquement — correct **si** l'on évite le CTA cassé.

### États vides

| Section | Statut |
|---|---|
| Projets (0 projet) | `Projects.tsx:252-261` — texte sans **aucun bouton**. Premier écran après inscription. |
| Assets (0 asset) | `AssetLibrary.tsx:357-374` — CTA présent mais **cassé** |
| Assets (0 résultat) | `AssetLibrary.tsx:375-381` — texte nu, pas de « réinitialiser » |
| **Univers (0 nœud)** | **AUCUN**. `LoreGraphView.tsx:1986-2027` monte un `<ReactFlow>` vide : canvas noir à pois, une toolbar, ni titre ni explication ni CTA |
| Scénario | `ScenarioSection.tsx:549-592` — complet, 3 CTA. **Le meilleur du lot, à répliquer.** |
| Édition | `EditionSection.tsx:510-534` — correct |

### Quota — la friction de monétisation est mal placée

- **Le compteur de crédits est absent là où les crédits se consomment.** `App.tsx:135-142` monte `ChapterDetail` **hors de `DashboardLayout`** ; la page rend son propre header (`:2561-2603`) sans aucun crédit. Le seul rappel est enfermé dans un `hidden md:flex` à l'intérieur de la modale canvas (`:2956`, `:2969`).
- **Aucun avertissement à l'approche de la limite.** `BlockToolbar.tsx:327` teste `canGenerate` qui (`ChapterDetail.tsx:2237`) ne vérifie **que** le prompt et le style — **jamais le quota**. L'utilisateur clique, puis découvre le mur (`:1950-1954`). Le pattern d'alerte existe pourtant : `AssetLibrary.tsx:276-282` passe la pastille en ambre si `remaining < 5`. Il n'a pas été porté dans l'éditeur.
- **`QuotaReachedDialog.tsx:41`** : `className="max-w-sm text-center"` — toujours pas de `.glass`, **6ᵉ cycle**. C'est l'écran de conversion le plus important du plan Libre, et c'est un dialog shadcn brut, en violation directe de l'anti-pattern CLAUDE.md. Trois autres dialogs sont dans le même cas, dont **`Plans.tsx:220`** — la modale de succès après achat, moment de plus forte valeur émotionnelle du parcours.
- **Aucun mécanisme de recharge.** Grep exhaustif : pas de top-up, pas de pack de crédits. Un utilisateur **Studio à 250/250 est bloqué jusqu'au mois suivant**, `QuotaReachedDialog.tsx:53-69` ne lui proposant que « Fermer ». **Revenu abandonné sur le segment qui a déjà prouvé sa disposition à payer.**

### Erreurs invisibles — le point le plus dangereux

**`isError` n'est lu que dans un seul fichier de tout `src/`** (`ArianeContinuityPanel.tsx`). Partout ailleurs les queries sont déstructurées avec un défaut silencieux (`= []`), ce qui transforme **toute panne réseau en état vide crédible** :

- `ProjectDetail.tsx:78` → **« Projet introuvable. »** (`:412-417`) — message faux, sans « Réessayer »
- `ProjectDetail.tsx:79` → « Aucun asset créé pour ce projet » — l'utilisateur croit avoir perdu ses assets
- `ScenarioSection.tsx:80` → « Votre histoire commence ici » alors que ses chapitres existent
- `EditionSection.tsx:270-282` → l'objet `error` Supabase **n'est jamais lu**, tous les compteurs affichent 0
- `useProgressiveMenuGate.ts:41-45` → `isResolved` reste `false` → **toute la sidebar disparaît**

Les erreurs de **mutation** sont bien gérées (toasts destructifs partout). Les erreurs de **query** sont invisibles à 100 %. Pas d'`onError` global, pas d'ErrorBoundary (`App.tsx:73-79`).

### Attente IA et export

Génération d'image (30-60 s) : overlay indéterminé, **pas d'estimation de durée, pas d'annulation** (aucun `AbortController`), et le crédit est consommé même si l'utilisateur quitte (`usePanels.ts:105-107`). En cas d'échec : message unique et générique (`ChapterDetail.tsx:2026`), pas de « Réessayer », aucune distinction timeout / refus de contenu / réseau, aucune indication sur la consommation du crédit.

Export : la « progression » ne couvre que la 1ʳᵉ des 3 phases (`exportPanel.ts:230-233`) — concaténation, découpage et zip sont muets. Erreur affichée en brut via `String(err)`. Le bouton est une icône seule, sans libellé, cachée sous `hidden sm:flex`.

### Design system

**Conforme** : Quicksand + Nunito, aucun Inter. `.glass` utilisé 102 fois.

**Écarts** : **88 hex hardcodés** en `.tsx` (majorité légitime — couleurs de canvas utilisateur ; exception : les icônes Ariane `ArianeOrbitIcon.tsx:55-94` et `ArianeThreadIcon.tsx:31-92` entièrement en ambre `#F59E0B`/`#FCD34D`/`#92400E`, accent chaud isolé interdit par `.impeccable.md` — possiblement délibéré « fil d'or » mais non documenté) ; **57 `transition-all`** (anime implicitement des propriétés de layout) ; **4 `DialogContent` non restylés** ; **~360 em-dashes bruts** hors tests, concentrés dans `ScenarioChapterEditor.tsx` (18), `ChapterDetail.tsx` (18), `LoreGraphView.tsx` (14), `arianeTabTourSteps.ts` (7 — **dans l'onboarding**). Toujours aucun garde-fou lint : **c'est structurel, seul un lint automatisé le réglera durablement.**

### Mobile

**L'éditeur n'est pas utilisable sur mobile, et rien ne le signale.** Sur 165 Ko, `ChapterDetail.tsx` ne contient que **3 breakpoints réels**, tous destinés à **cacher** des choses. Largeurs fixes : sidebar `w-[380px] shrink-0` + canvas `PANEL_WIDTH = 800` = **1180 px minimum**, sans wrap ni fit-to-width. Les interactions clés reposent sur le **drag-and-drop HTML5, non supporté sur iOS Safari et Android**. Aucun `useIsMobile`, aucun message d'avertissement.

### Comparaison aux standards concurrents (§1)

Face à LlamaGen (12 pages / 40 cases / 3 formats de sortie en un flux, 11 août) et Jenova (export « platform-ready »), DreamWeave a un **pipeline plus riche en amont** (Style, Assets, Univers) mais **un aval plus faible** : un seul format de sortie, en ZIP, sans prévisualisation ni progression fiable. La comparaison est défavorable exactement là où l'utilisateur juge le résultat.

---

## 5. 💡 Suggestions d'amélioration

### 🗑️ Suppressions

| Quoi | Où | Pourquoi |
|---|---|---|
| Copy « Mémoire narrative longue » + « Priorité de traitement » sur la landing | `Landing.tsx:96-101` | Vend deux features retirées de l'offre le 2026-06-27, et contredit `Plans.tsx`. **Correctif de 2 lignes à faire avant toute action marketing.** |
| Branche d'upsell images de référence | `StyleManager.tsx:567-578` | Code mort décrivant une restriction abolie |
| Copy « plan Libre limité à N alertes » | `ArianeContinuityPanel.tsx:294` | Branche inatteignable, protégée par un `!` qui masquerait le bug |
| `allowLongMemory`, `filArianeLimit`, `allowReferenceImages`, `canUseCases` | `types/index.ts`, `_shared/tierConfig.ts` | Trancher : implémenter ou retirer. Le scaffolding mort porte de la copy commerciale contradictoire |
| Layout « Chronologique » du graphe | `LoreGraphView.tsx:691-784`, bouton `:2091` | Hors ADN Univers (« ce que ce n'est PAS : timeline, frise ») ; la frise avait déjà été retirée en `20260522150000` |
| `dist/` périmé sur disque (2026-05-23) | racine | Résidu non suivi de 3 mois, fausse toute lecture de taille de bundle |
| Membres d'union jamais émis (`lore_world_section`, `asset_lore`, `summary`) | `types/index.ts:513` | Types fantômes |

### ⚡ Optimisations

1. **Réparer `tsc -b --noEmit` en CI et pre-commit** — c'est le correctif à plus fort effet de levier de toute la liste : il rend visibles automatiquement les problèmes 2, 3 et 9.
2. **Sécuriser le bucket Storage** — policy SELECT avec ownership + bucket privé + `createSignedUrl()`.
3. **Rendre les erreurs de query visibles** — lire `isError`, afficher un état d'erreur avec « Réessayer ». Corrige la perte de confiance la plus violente possible (« Projet introuvable » sur une coupure réseau).
4. **Porter le compteur de crédits dans l'éditeur** + alerte ambre à `remaining < 5` (le pattern existe déjà en `AssetLibrary.tsx:276`). Transforme un blocage subi en upgrade anticipé.
5. **Restyler `QuotaReachedDialog` et la modale de succès `Plans.tsx:220`** en `.glass` — 6ᵉ cycle de signalement sur les deux écrans les plus décisifs pour le revenu.
6. **Griser au lieu de retirer** les items de sidebar verrouillés, avec un tooltip explicatif, et **remettre la sidebar dans l'ordre du parcours**.
7. **Index `hnsw` sur `project_embeddings.embedding`** avant la montée en charge d'Univers.
8. **Convertir le PNG de 1,2 Mo en WebP/AVIF** — ~90 % de gain sur le premier rendu de la landing publique.
9. **Lint anti-em-dash** — 360 occurrences, structurel depuis 6 cycles ; seule l'automatisation le réglera.
10. **Ajouter un `AbortController` + « Réessayer » + libellé de durée estimée** sur la génération d'image (30-60 s d'attente aveugle aujourd'hui).

### ➕ Ajouts

| Quoi | Justification (source datée §1) |
|---|---|
| **Câbler le Pilier 2 d'Univers au parcours utilisateur** (sortir `triggerForceScan` du panneau admin, ajouter un bouton de rescan manuel, indexer `lore_nodes` et `world_rules` dans Compass) | **Le seul différenciateur défendable.** [LlamaGen, 2026-08-11](https://llamagen.ai/) démontre 40 cases avec 8 personnages cohérents : la cohérence visuelle devient une commodité du modèle. La mémoire narrative structurée, personne ne l'a. Aujourd'hui l'UI affiche des sections vides que l'utilisateur ne peut pas remplir. |
| **Pack de crédits à l'unité (top-up)** | Un Studio à 250/250 n'a aucun bouton d'achat. Revenu abandonné sur le segment le plus qualifié. [Jenova](https://www.jenova.ai/en/resources/ai-webtoon-creator) à 20 $/mois montre que l'ancrage international est au-dessus de Créateur à 12,99 € : il y a de la place. |
| **Export multi-format** (webtoon vertical / planche comic) | [LlamaGen, 2026-08-11](https://llamagen.ai/) adapte un même chapitre en 3 formats de lecture. Notre aval (ZIP unique, sans preview) est notre point faible comparatif. |
| **État vide Univers** avec explication de l'ADN et CTA | Aujourd'hui : canvas noir à pois, sans un mot. C'est la feature stratégique et elle accueille l'utilisateur par le vide. |
| **Avertissement mobile sur l'éditeur** | Le drag-and-drop HTML5 ne fonctionne ni sur iOS Safari ni sur Android. Un message honnête vaut mieux qu'un produit qui semble cassé. |
| **PostHog + Sentry** | Prérequis absolu inscrit dans `Produit/14_Plan_Marketing_Communication.md` (verrou n°2 : « mesure AVANT amplification ») — **aucun des deux n'est branché** (grep : 0 occurrence). |

---

## 6. 🚀 Statut de lancement

### Ce qui est prêt

- Déploiement Vercel configuré (`vercel.json`, rewrites SPA) ✅
- Stripe livré : checkout, portail client, webhook avec signature vérifiée ✅
- Routes légales `/cgu` et `/confidentialite` présentes ✅
- `robots.txt` permissif, métadonnées Open Graph / Twitter renseignées ✅
- RLS sur 18/18 tables ✅
- CI GitHub Actions avec lint, build et tests ✅

### Bloquants durs

| # | Bloquant | Sévérité |
|---|---|---|
| 1 | **110 erreurs TypeScript** derrière une porte qualité qui ne ferme pas | 🔴 P0 |
| 2 | **Deux `ReferenceError` en production** : le drag du canvas et le CTA « Créer mon premier asset » | 🔴 P0 |
| 3 | **Bucket Storage lisible sans authentification** — sur un produit dont la valeur est du contenu non publié | 🔴 P0 |
| 4 | **Aucune mesure, aucune supervision** : ni PostHog, ni Sentry, ni analytics (grep : 0 occurrence). Lancer sans mesure viole le verrou n°2 du propre plan marketing de Louis | 🔴 P0 |
| 5 | **La landing vend deux features inexistantes** — risque de publicité trompeuse | 🟠 P1 |
| 6 | `og-image.png` référencé dans `index.html` mais **absent de `public/`** → aperçu de partage cassé sur tous les réseaux | 🟠 P1 |
| 7 | Pas de `sitemap.xml` | 🟡 P2 |
| 8 | Quota fail-open sur une ressource FAL.ai facturée | 🟠 P1 |
| 9 | Éditeur inutilisable sur mobile, sans avertissement | 🟠 P1 |

### ⚠️ Constat de pilotage — sixième cycle sans mouvement de code

**Aucun commit non-merge touchant `src/` depuis le 2026-07-19** — vérifié : `git log --no-merges --since=2026-07-20 -- src/` retourne **vide**. Le merge `8a3c92a` du 2026-08-11 apparaît bien dans `git log -- src/`, mais son diff sur `src/` se réduit à `ScenarioCasesPanel.tsx` (7 insertions, 2 suppressions), c'est-à-dire le report sur la mainline du commit `6b7bb5e` du 2026-07-19. **Six semaines sans changement de code applicatif.** Les bloquants P0 identifiés au 08-12, 08-13, 08-23, 08-25, 08-27 et ce matin sont **strictement identiques**.

Ce n'est pas nécessairement un problème : les soutenances (Business Project + Mémoire) ont manifestement mobilisé le temps disponible, et c'est un arbitrage légitime. Mais il faut le nommer : **le produit n'avance plus, et les audits quotidiens produisent des constats que personne n'a le temps de traiter.** Si la priorité reste l'école jusqu'à une date donnée, il serait plus honnête de suspendre l'audit quotidien jusque-là que d'accumuler un septième rapport identique.

### Checklist de lancement priorisée

**Phase 0 — Débloquer (avant tout le reste)**

1. Réparer `tsc -b --noEmit` en CI + pre-commit → rend le reste visible
2. Corriger `setNewAssetType` (`AssetLibrary.tsx:368`) — 1 ligne, hors zone protégée
3. **Demander l'arbitrage de Louis sur `setDragPreview`** (zone protégée Canvas Éditeur)
4. Traiter les 110 erreurs TypeScript par ordre de fichier
5. Sécuriser le bucket Storage (migration + `createSignedUrl`)
6. `npm audit fix` (react-router-dom)

**Phase 1 — Instrumenter (avant tout trafic)**

7. Brancher **PostHog** (funnel inscription → 1re image = TTV) et **Sentry**
8. Passer le quota en fail-closed
9. Rendre les erreurs de query visibles

**Phase 2 — Aligner le discours**

10. Retirer les deux features fantômes de `Landing.tsx:96-101`
11. Déposer `public/og-image.png` (1200×630)
12. Reformuler « export PNG » en « export webtoon » ou livrer réellement un PNG unique
13. Restyler `QuotaReachedDialog` + modale de succès `Plans.tsx:220`

**Phase 3 — Polir le premier contact**

14. État vide Univers, état vide Projets avec bouton
15. Griser au lieu de retirer les items de sidebar + remettre l'ordre dans le sens du parcours
16. Compteur de crédits + alerte `< 5` dans l'éditeur
17. Avertissement mobile sur l'éditeur
18. Ajouter `sitemap.xml`

---

## 7. 📣 Plan marketing

### Posture actuelle

`Produit/14_Plan_Marketing_Communication.md` (cadré le 15/07/2026) est **solide et bien pensé** : trois verrous explicites (qualité avant push, mesure avant amplification, organique avant payant), piliers de contenu définis, cadence batch-film, personas identifiés. **Le plan n'est pas le problème.**

Le problème est que **la Phase 0 du plan de Louis n'est pas commencée** : PostHog et Sentry ne sont pas branchés (grep : 0 occurrence), aucun handle social n'existe, `@DreamWeaveApp` est déclaré dans `index.html:39` mais aucun compte correspondant n'a été identifié, et il n'y a ni waitlist ni landing d'acquisition séparée dans le repo. **Aucune présence publique nouvelle depuis le 08-25.**

### Tâches

| # | Tâche | Priorité | Effort |
|---|---|---|---|
| 1 | **Brancher PostHog + Sentry** (verrou n°2 du plan de Louis, prérequis absolu au trafic) | **Haute** | Rapide |
| 2 | Retirer les 2 features fantômes de la landing avant toute exposition publique | **Haute** | Rapide |
| 3 | Déposer `public/og-image.png` (1200×630) — sans ça, chaque partage social est un rectangle vide | **Haute** | Rapide |
| 4 | Réserver les handles cohérents (TikTok, Instagram, X, YouTube) — `@DreamWeaveApp` est déjà déclaré dans le code mais pas réservé | **Haute** | Rapide |
| 5 | Créer le compte **Instagram** DreamWeave (visuel-first, c'est le canal naturel d'un outil de dessin) | **Haute** | Rapide |
| 6 | Lancer une **waitlist** avec incitatif (crédits bonus au lancement) + 1 CTA unique | **Haute** | Rapide |
| 7 | Constituer la **banque de preuves** : générer 5-10 webtoons/personnages complets = matière première de tout le contenu | **Haute** | Moyen |
| 8 | Écrire une **landing d'acquisition dédiée**, séparée de l'app | **Haute** | Moyen |
| 9 | Produire la **vidéo teaser « magic moment »** (prompt → personnage cohérent en 30 s) | Moyenne | Moyen |
| 10 | Engager 5-10 créateurs webtoon amateurs (r/webtoons, r/manga, Discords) en accès anticipé, **value-first** | Moyenne | Moyen |
| 11 | Créer la **chaîne YouTube** + 1 tuto SEO evergreen « comment faire un webtoon sans savoir dessiner » | Moyenne | Long |
| 12 | Rédiger 2-3 posts sur la différenciation « tout gratuit, volume de crédits uniquement » | Moyenne | Rapide |
| 13 | Préparer le **post Product Hunt** (assets, séquence, soutiens) — la fenêtre est ouverte, aucun concurrent majeur n'a lancé en août | Moyenne | Moyen |
| 14 | Documenter un cas d'usage complet « de zéro à un chapitre publié » | Basse | Long |
| 15 | Veille concurrentielle mensuelle (WEBTOON, Komiko, Anifusion, LlamaGen, Jenova) | Basse | Rapide (récurrent) |

### Séquencement

**Ne pas accélérer sur le marketing avant la Phase 0 technique.** Lancer une waitlist ou un teaser sur un produit où le premier bouton de l'onglet Assets lève une exception, où le drag du canvas est cassé, et où les fichiers de tous les utilisateurs sont lisibles sans authentification, transformerait un trafic durement acquis en churn définitif. Les tâches 1 à 4 sont toutefois **sans risque et à faire dès maintenant** : elles préparent le terrain sans exposer le produit.

---

## TL;DR

- 🔴 **Sixième cycle consécutif sans commit applicatif** — aucun commit non-merge touchant `src/` depuis le **2026-07-19**, soit six semaines (le merge du 11/08 ne fait que reporter ce même commit). Les bloquants P0 sont strictement identiques depuis le 08-12. Si la priorité reste les soutenances, mieux vaut suspendre l'audit quotidien que d'empiler un septième rapport identique.
- 🔴 **Un deuxième `ReferenceError` découvert ce cycle** : `setNewAssetType` (`AssetLibrary.tsx:368`) casse le CTA « Créer mon premier asset », le tout premier bouton du parcours Assets. Même pattern que `setDragPreview`, même cause racine — **`tsc --noEmit` type-check zéro fichier** (`tsconfig.json` solution-style sans `--build`), donc CI et pre-commit valident 110 erreurs sans les voir. **Réparer cette seule ligne de CI est le correctif à plus fort levier du projet.**
- 🔴 **Faille Storage confirmée** : bucket `dreamweave` en `public = true` avec une policy SELECT nommée « Users can view own files » qui **ne filtre pas sur `auth.uid()`**. Toutes les planches de tous les utilisateurs sont lisibles sans authentification. Incompatible avec un lancement public.
- 🟠 **La landing vend deux features retirées de l'offre le 2026-06-27** (« Mémoire narrative longue », « Priorité de traitement ») et contredit `Plans.tsx` — correctif de 2 lignes, à faire avant toute action marketing. **Et ni PostHog ni Sentry ne sont branchés**, alors que c'est le verrou n°2 du propre plan marketing de Louis.
- 🧭 **Le benchmark envoie un signal stratégique clair** : [LlamaGen](https://llamagen.ai/) démontre au **2026-08-11** 40 cases avec 8 personnages cohérents en 3 formats de sortie. La cohérence de personnage devient une commodité du modèle. **Le seul différenciateur défendable de DreamWeave est le menu Univers** — 6 824 lignes livrées, Pilier 1 à ~90 %, mais **Pilier 2 câblé au panneau admin uniquement**, avec une UI qui affiche « Enrichir les fiches » et « Événements » que l'utilisateur ne peut jamais remplir.

---

> 📝 **Impact Mémoire** : trois constats touchent le mémoire.
> **(1) Démarche qualité** — l'audit a démontré qu'un indicateur qualité doit lui-même être audité : `tsc --noEmit`, invoqué sur une configuration TypeScript *solution-style* (`files: []`), ne contrôlait aucun fichier et validait la CI sans rien vérifier. Cent-dix erreurs s'y sont accumulées, dont deux références à des symboles inexistants totalisant 14 appels répartis sur deux parcours utilisateur critiques (le drag du canvas et la création du premier asset). *Un test qui ne peut pas échouer n'apporte aucune information.*
> **(2) Modèle économique** — la landing vend encore une différenciation par les features alors que le positionnement acté depuis le 2026-06-27 est « différenciation par le volume de crédits uniquement ». Écart à corriger ou à documenter avant soutenance.
> **(3) Roadmap et fonctionnalités** — le menu Univers représente **6 824 lignes livrées** (Pilier 1 ~90 %, Pilier 2 ~40 % côté utilisateur) alors que la roadmap le marque « non démarré ».
> **Sections concernées** : Architecture technique / Démarche qualité · Modèle économique · Fonctionnalités et Roadmap
> **Proposition** : ajouter un encadré « Écart déclaratif mesuré » présentant ces trois points comme des **constats de pilotage produit** issus d'une démarche d'audit automatisée — ce qui valorise la rigueur de la démarche plutôt que de masquer les écarts.

---

*Rapport généré par la tâche planifiée `dreamweave-daily-audit`. Lecture seule : aucun fichier de code modifié, aucun commit, aucun push. Mise à jour du wiki Obsidian non effectuée (vault non accessible depuis cet environnement) — à reporter sur la machine principale de Louis. Le fichier `AUDIT-QUOTIDIEN-2026-09-01.md` du même jour n'a pas été écrasé.*
