# Mini-spec — Couverture de webtoon — 2026-07-03

> Statut : **SPEC, pas encore implémentée**. Rédigée avant implémentation à la demande de Louis.
> La couverture = la vitrine du webtoon : première image que voit le lecteur, sur laquelle il clique pour entrer.

## 1. Décisions actées (Louis)

- **Emplacement** : entrée « Couverture » **dans l'onglet Édition**, en tête de la liste des chapitres, visuellement distincte (ce n'est PAS un chapitre numéroté — une sorte de « chapitre 0 » unique par projet).
- **Nature** : ce n'est pas un chapitre d'édition, c'est **une image générée à partir des informations de tout le projet** + un **titre stylisé**.
- **Flux** : générer → **valider** (l'utilisateur approuve le rendu) → l'image validée devient l'**affiche du projet dans le Tableau de bord** (et la liste des projets).
- La couverture ne va **PAS** dans Paramètres (retiré : l'utilisateur ne comprendrait pas qu'une image de couverture soit dans « Réglages »).

## 2. Périmètre

**Phase 1 (cette spec)** : créer, générer, valider et afficher une couverture.
**Phase 2 (plus tard, hors spec)** : mode lecteur / galerie publique où les couvertures sont des vignettes cliquables ouvrant la lecture verticale — suppose une notion de publication (statut publié/brouillon, visibilité publique/privée).

## 3. Modèle de données

- Colonne existante : **`projects.cover_url`** (aujourd'hui 100 % vide, jamais lue ni écrite). C'est elle qui stocke l'image **finale aplatie** (illustration + titre), affichée comme affiche du projet.
- Storage : bucket `dreamweave`, pattern existant `src/services/storage.ts` (`.upload(path, file, { upsert: true })`). Chemin proposé : `{user_id}/projects/{project_id}/cover.png`.
- **État de l'éditeur de couverture** (illustration brute + position/style du titre) — 2 options (question ouverte §12) :
  - **Option A (léger)** : ne stocker QUE `cover_url` (l'export aplati). L'éditeur repart de l'illustration brute à chaque ouverture. Simple, mais on reperd le placement du titre.
  - **Option B (éditable)** : stocker aussi un petit layout JSONB (illustration + bloc titre) — soit dans une colonne `projects.cover_layout` (migration légère), soit réutiliser une ligne `chapter_canvases` flaguée. Permet de rééditer le titre plus tard.
  - Reco : **Option A pour la Phase 1** (générer + titre + export + valider), Option B si Louis veut rééditer la couverture ensuite.

## 4. Emplacement UI — entrée « Couverture » dans Édition

- Fichier : `src/components/project/EditionSection.tsx` (liste les chapitres, badges `chapter_number` ~l.148, `createChapter`).
- Ajouter **une carte « Couverture » en tête de liste**, distincte des chapitres (icône dédiée, pas de numéro, badge « À générer » / miniature si `cover_url` existe).
- Clic → route dédiée vers l'**éditeur de couverture** (ex. `/dashboard/projects/:id/cover`), sur le modèle de la route chapitre (`/dashboard/projects/:id/chapter/:chapterId`).

## 5. L'éditeur de couverture (mini-canvas portrait)

Réutilise l'infra canvas existante en **format portrait** :
- **Canvas** : portrait, largeur 800 (cohérent avec `PANEL_WIDTH`), hauteur ~1200 (ratio 2:3, typique d'une affiche webtoon).
- **Couche 1 — illustration** : un bloc image généré (voir §6). Occupe tout le canvas (full-bleed).
- **Couche 2 — titre stylisé** : **réutilise le système de blocs texte/SFX** déjà construit (polices d'impact, contour, lueur, rotation, opacité — `SfxBlock`/`SfxVisual`, `sfxSystemStyle.ts`). Le titre du projet est pré-rempli, repositionnable, restylable. → le titre devient un vrai « logo » de couverture.
- **Couche optionnelle** : sous-titre / accroche (autre bloc texte).
- **Export** : aplatir illustration + titre via `exportPanel.ts` (déjà capable de rendre image + texte) → PNG → upload storage → `cover_url`.

## 6. Génération IA de l'illustration

### Contenu minimum requis (règle de disponibilité)
Le bouton « Générer la couverture » s'active dès que le projet a :
- **Titre** (obligatoire — sert au titre stylisé ET au contexte du prompt),
- **Style** (`style_template` + `style_image_urls`, obligatoire — l'identité visuelle).

Fortement **recommandé** (message d'aide si absents, sans bloquer) :
- **Genre + Tonalité** (composition + ambiance),
- **≥ 1 personnage principal** (asset `character`) → couverture featuring le héros. Sans personnage → couverture d'ambiance (décor + mood du genre).

### Builder de prompt (côté serveur, à partir du projet entier)
Concept : `webtoon cover key art / official cover illustration, {personnage(s) principal(aux) via asset refs}, {genre} {tonalité} atmosphere, dramatic vertical composition, strong focal subject, dramatic key lighting, negative space at top and bottom for title placement, portrait orientation` + **style du projet injecté** comme pour les cases.
- La **tonalité** module l'ambiance (Épique = key art grandiose ; Sombre = clair-obscur ; Romance = doux/pastel ; etc.) — réutilise `TONE_DIRECTIVES` de `detect-blocks.ts`.
- Les **assets personnages** passent en références d'identité (même pipeline que `generate-panel-image` : portrait C1, style C3, paires nom↔image C6).

### Où générer — 2 options (question ouverte §12)
- **Option 1 (réutilisation)** : réutiliser `generate-panel-image` en le faisant accepter un contexte « cover » (dimensions portrait, prompt cover). Nécessite de gérer un `panel_id/block_id` — ou d'assouplir la fonction pour un mode « cover » sans panel.
- **Option 2 (dédiée)** : petite Edge Function `generate-cover-image` (clone allégé de `generate-panel-image`) : lit le projet (style + assets), construit le prompt cover, appelle FLUX en portrait, upload → renvoie l'URL. Plus propre, isole la logique cover.
- Reco : **Option 2** (fonction dédiée) — évite de complexifier `generate-panel-image` (zone sensible) et garde le prompt cover au même endroit.
- **Dimensions FLUX** : contrainte existante (snap multiples de 32, min 256, max 1440). Portrait cible ~832×1216 puis recadrage/redimension aux formats d'affichage.

## 7. Étape de validation (demande explicite de Louis)

Flux : **Générer → Aperçu → Valider / Régénérer**.
1. L'utilisateur clique « Générer la couverture » → FLUX produit l'illustration (coûte 1 crédit, comme une case).
2. **Aperçu** dans l'éditeur : l'utilisateur ajuste le titre (position, police, couleur), peut **régénérer** l'illustration s'il n'aime pas.
3. **« Valider la couverture »** → export aplati → upload → écrit `cover_url` → toast de confirmation.
4. Tant que non validée, `cover_url` reste vide (le Tableau de bord montre le placeholder actuel).

## 8. Affichage — l'affiche du projet

Une fois `cover_url` renseignée, l'afficher comme **image du projet** partout où une carte projet existe :
- `src/pages/Dashboard.tsx` (~l.252 `projects.map`) — projets récents (aujourd'hui : placeholder).
- `src/pages/Projects.tsx` (~l.288) — liste complète des projets.
- Remplacer le placeholder par `<img src={p.cover_url}>` avec fallback sur le placeholder actuel si vide.
- ⚠️ **Dette repérée** : le parsing des tags `[Tags:]/[Tone:]` est **dupliqué** dans `Dashboard.tsx` (~l.267-269) alors que `Projects.tsx` utilise maintenant `parseProjectMeta`. À factoriser vers `parseProjectMeta` en même temps (petit nettoyage).

## 9. Cas limites

- Projet sans style → bouton désactivé + message « Définis un style d'abord ».
- Projet sans personnage → couverture d'ambiance (prompt sans asset), non bloquant.
- Régénération → remplace l'illustration (upsert storage), ne touche pas au titre déjà placé.
- Suppression de projet → supprimer la couverture du storage (étendre `storage.ts` deleteX).
- Quota : la génération consomme 1 crédit (`canGenerate()` avant appel, comme partout).

## 10. Fichiers touchés (estimation Phase 1)

| Fichier | Rôle |
|---|---|
| `supabase/functions/generate-cover-image/` (nouveau) | Génération FLUX portrait à partir du projet (Option 2) — **déploiement manuel** |
| `src/services/cover.ts` (nouveau) | Appel génération + upload + set `cover_url` |
| `src/pages/CoverEditor.tsx` (nouveau) | L'éditeur de couverture (mini-canvas portrait, réutilise blocs image + texte + export) |
| `src/App.tsx` | Route `/dashboard/projects/:id/cover` (lazy) |
| `src/components/project/EditionSection.tsx` | Carte « Couverture » en tête de liste |
| `src/pages/Dashboard.tsx`, `src/pages/Projects.tsx` | Afficher `cover_url` sur les cartes + factoriser `parseProjectMeta` |
| `src/services/storage.ts` | `uploadCoverImage` + `deleteCoverImage` |
| `src/lib/projectMeta.ts` ou nouveau | Builder de prompt cover (réutilise TONE) |

Migration : **aucune** en Option A (cover_url existe déjà) ; légère (`cover_layout`) si Option B.

## 11. Ce qui NE fait PAS partie de la Phase 1

- Mode lecteur / galerie publique (Phase 2).
- Statut de publication, visibilité publique/privée.
- Formats miniatures officiels multiples (1080×1080 + 1080×1920) — Phase 1 = une seule image portrait ; le multi-format viendra avec la publication.

## 12. Questions ouvertes (à trancher avant implémentation)

1. **Éditabilité du titre après coup** : Option A (cover_url seul, plus léger) ou Option B (layout éditable, +1 colonne JSONB) ? → détermine si on peut rééditer le titre plus tard.
2. **Génération** : réutiliser `generate-panel-image` (Option 1) ou fonction dédiée `generate-cover-image` (Option 2, recommandée) ?
3. **Titre stylisé dès la Phase 1**, ou d'abord juste l'illustration validée (titre en Phase 1.5) ? (Le titre réutilise nos blocs texte, donc peu coûteux — je penche pour l'inclure.)
4. **Ratio exact** de la couverture (2:3 = 800×1200 ? autre ?).

---

*Créé le 2026-07-03. À implémenter après arbitrage de Louis sur les 4 questions ouvertes. Réutilise massivement l'infra existante (canvas, blocs image/texte, pipeline FLUX style+assets, export PNG, storage).*
