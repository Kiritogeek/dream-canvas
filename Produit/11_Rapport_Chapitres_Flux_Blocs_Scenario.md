# Rapport — Chapitres : flux Structuré / Automatique, blocs et place du scénario

**Date** : 14 Février 2026  
**Contexte** : Option B — deux flux de création (Structuré + Automatique). Les images générées sont des **images pleines** (illustrations), affichées **dans** des blocs de mise en page ; les blocs ne sont pas dessinés dans l’image.

---

## 1. Synthèse des décisions

| Décision | Choix |
|----------|--------|
| **Flux** | Deux modes : **Automatique** (découpage IA → panels, génération **panel par panel**) et **Structuré** (chapitre vide → blocs → texte + assets → génération). |
| **Images** | Chaque image générée est une **illustration pleine** (pas de “cases” ou blocs dessinés dans l’image). Les blocs sont des **zones de mise en page** dans l’app : on y affiche une image par bloc. |
| **Blocs** | En mode Structuré : l’utilisateur définit des blocs (position, taille, forme rectangle en v1). Chaque bloc a un contenu texte (prompt) et des refs assets. À la génération : **1 image par bloc** → l’image est ensuite affichée **dans** ce bloc. |
| **Scénario** | **Section à part entière** : écrire son histoire. IA découpe scénario → chapitres, puis chapitre → panels. **Jamais** utilisé dans le prompt de génération d'image (découpage uniquement). Voir section 3. |
| **Prompts d'image** | Uniquement **assets sélectionnés** + éventuellement **courte description par panel** (issue du découpage ou saisie). Le scénario/synopsis **n'est pas** injecté dans le prompt. |
| **Génération panel par panel** | Mode Automatique : génération **au minimum panel par panel**. Impossible de générer un chapitre entier sans erreurs ou limites (quota, timeouts, API). |
| **Assets — impératif (les 2 flux)** | **La génération doit impérativement s'appuyer sur les assets que l'utilisateur sélectionne.** Ces assets cadrent la scène et permettent à l'IA de comprendre quels éléments (personnages, décors, objets) doivent figurer dans le chapitre. Sans sélection d'assets par l'utilisateur, la génération n'est pas cadrée et la cohérence narrative n'est pas garantie. |

---

## 2. Les deux flux de création

### 2.1 Flux Automatique (rapide)

1. L’utilisateur crée un chapitre avec **titre** et **synopsis** (et optionnellement **scénario** plus détaillé).
2. **Scénario (section dédiée)** : l'utilisateur a écrit son histoire. L'IA a pu découper le scénario en chapitres, puis le chapitre en **panels** (liste avec courte description par panel). Ce découpage **ne sert pas** au prompt d'image.
3. **Sélection des assets du chapitre (impératif)** : l'utilisateur sélectionne les assets (personnages, décors, objets) pour ce chapitre.
4. **Génération panel par panel (minimum)** : la génération se fait **un panel à la fois**. Impossible de générer un chapitre entier d’un coup (erreurs, limites quota/timeouts/API). L’utilisateur lance la génération pour le panel 1, puis le panel 2, etc.
5. Pour **chaque** panel : le **prompt d'image** = **style** + **assets sélectionnés** (noms, prompts, refs) + éventuellement **courte description de ce panel**. **Le scénario/synopsis n'est pas injecté dans le prompt d'image.**
6. Chaque image est stockée comme un **panel**. Ensuite : bulles de dialogue / narration en overlay.

**Caractéristique** : génération **panel par panel** ; prompts d'image = **assets + courte description panel**, pas le scénario.

### 2.2 Flux Structuré (contrôle créatif)

1. L’utilisateur crée un chapitre **vide** (titre, optionnellement synopsis/scénario pour référence).
2. Il définit la **structure** du chapitre : création de **panels**, puis pour chaque panel, création de **blocs** (rectangles : position x,y, largeur, hauteur). Aucune image n’est générée à ce stade.
3. Pour chaque bloc, il **rédige** une description (ce qui doit apparaître dans ce bloc) et **sélectionne les assets** (personnages, décors, objets) à utiliser pour ce bloc. **Cette sélection est primordiale** : elle cadre la génération et permet à l'IA de savoir quels éléments inclure. Les refs assets sont injectées dans le prompt à la génération.
4. Une fois la structure et les textes (avec assets) prêts, il lance la **génération** : **1 image par bloc**. Chaque image est une illustration pleine (pas de sous-blocs dessinés dedans), produite à partir du prompt du bloc et des assets sélectionnés pour ce bloc.
5. Les images générées sont **affichées dans** les blocs (chaque bloc affiche une image). En lecture, on affiche les panels avec leurs blocs (layout) ; les blocs contiennent les images.
6. Optionnel : bulles de dialogue / narration en overlay sur les panels (comme en mode Automatique).

**Caractéristique** : les blocs sont uniquement des **conteneurs de mise en page** ; le rendu final = images pleines placées dans ces conteneurs. **La sélection d'assets par bloc est impérative** pour que l'IA comprenne les éléments à mettre dans chaque image.

### 2.3 Règle impérative : sélection des assets par l'utilisateur

**La génération de panels / chapitre doit impérativement utiliser les assets que l'utilisateur sélectionne.** C'est primordial pour :

- **Cadrer la scène** : l'IA sait quels personnages, décors et objets doivent apparaître.
- **Comprendre les éléments à mettre dans le chapitre** : noms, descriptions (prompts) et, selon le plan, images de référence des assets sont injectés dans les prompts de génération.
- **Garantir la cohérence narrative** : sans cette sélection, la génération ne repose que sur le texte (synopsis/scénario ou description de bloc) et ne s'ancre pas dans la bibliothèque d'assets du projet.

En **mode Automatique** : l'utilisateur sélectionne les assets du chapitre avant de lancer la génération (au niveau chapitre).  
En **mode Structuré** : l'utilisateur sélectionne les assets **par bloc**.  
Dans les deux cas, l'UI doit imposer ou fortement encourager cette sélection avant de permettre la génération.

---

## 3. Scénario — section dédiée, découpage IA, hors prompts d'image

### 3.1 Définitions

| Terme | Définition | Usage |
|-------|------------|--------|
| **Scénario** | **Section à part entière** du produit : l'utilisateur y écrit son histoire (texte narratif : actions, lieux, personnages, dialogues). « Ce qui se passe » de façon lisible. | **Découpage IA uniquement** : scénario → chapitres, puis chapitre → panels (liste + courte description par panel). **Jamais** injecté dans le prompt de génération d'image. |
| **Synopsis** | Résumé court du chapitre (quelques phrases). Présent en BDD (`chapters.synopsis`). | Référence auteur ; peut servir d'entrée au découpage IA si pas de scénario détaillé. **Pas** utilisé dans le prompt d'image. |

### 3.2 Place dans le modèle

- **Section « Scénario »** (projet ou chapitre) : zone d'édition dédiée pour écrire l'histoire. L'IA peut découper ce texte en chapitres, puis chaque chapitre en panels (titres / courtes descriptions). Ce découpage alimente **uniquement** la structure (liste de panels), pas les prompts d'image.
- **Chapitre** : `synopsis` (TEXT), `scenario` (TEXT, optionnel). Aucun de ces champs ne doit être envoyé au modèle de génération d'image.

### 3.3 Rôle par flux

- **Mode Automatique** : le scénario (section dédiée) sert à produire la **liste des panels** (découpage IA). La **génération d'image** pour chaque panel utilise **uniquement** : style + **assets sélectionnés** + **courte description du panel** (issue du découpage ou saisie). Génération **panel par panel** (pas tout le chapitre d'un coup).
- **Mode Structuré** : scénario / synopsis = **référence** pour l'auteur qui remplit les blocs à la main. Pas utilisé dans les prompts d'image (chaque bloc = prompt + refs assets).

---

## 4. Proposition de mise en place

### 4.1 Modèle de données (évolution)

- **chapters**  
  - Conserver : `title`, `synopsis`, `chapter_number`.  
  - Ajouter : `scenario` (TEXT, NULL), `creation_mode` (TEXT, NULL ou enum : `'automatic'` | `'structured'`).  
  - Optionnel : `panel_count` ou déduire du nombre de panels.

- **panels**  
  - Conserver : `id`, `chapter_id`, `panel_number`, `prompt`, `image_url`, `dialogue`, `narration`, `speech_bubbles`.  
  - En mode **Automatique** : 1 panel = 1 image pleine (comportement actuel).  
  - En mode **Structuré** : 1 panel = **conteneur de blocs** (layout). Le panel n’a pas d’`image_url` directe ; les images sont sur les blocs.  
  - Ajouter : `layout` (JSONB, NULL) pour décrire les blocs du panel (position, taille, ordre). Structure proposée :

```json
{
  "blocks": [
    {
      "id": "block_uuid",
      "x": 0,
      "y": 0,
      "width": 400,
      "height": 600,
      "prompt": "Luna entre dans la cafétéria...",
      "asset_refs": ["asset_id_1", "asset_id_2"],
      "image_url": "https://..."
    }
  ]
}
```

Alternative : table **panel_blocks** (id, panel_id, block_index, x, y, width, height, prompt, asset_refs JSONB, image_url). Les deux sont possibles ; JSONB sur `panels.layout` réduit les jointures pour un premier jet.

- **Génération**  
  - En mode Structuré : 1 appel IA par **bloc** (prompt = style + prompt du bloc + refs assets). L’image générée est une **image pleine** ; on stocke son URL dans le bloc et on l’affiche dans le rectangle du bloc.

### 4.2 Parcours utilisateur (résumé)

- **Choix du mode** à la création du chapitre (ou par défaut « Structuré » / « Automatique » selon produit).
- **Automatique** : section Scénario (découpage IA en chapitres puis panels) ; sélection assets chapitre ; **génération panel par panel** (pas tout le chapitre d'un coup). Prompt d'image = assets + courte description panel (pas le scénario). Édition possible (prompt, régénération, ordre).
- **Structuré** : formulaire chapitre (titre, synopsis/scénario optionnel) → page détail chapitre vide → ajout de panels → pour chaque panel, ajout de blocs (rectangles) → remplissage prompt + refs assets par bloc → « Générer les images » (par bloc ou par panel) → affichage des images dans les blocs → optionnel : bulles/narration.

### 4.3 Phasage proposé

| Phase | Contenu | Livrable |
|-------|--------|----------|
| **2a** | Modèle : `chapters.scenario`, `chapters.creation_mode` ; `panels.layout` (blocs) ou table `panel_blocks`. Migration + RLS. | BDD prête pour les deux flux. |
| **2b** | Mode **Automatique** : découpage scénario → N panels (IA) ; **génération panel par panel** (assets + courte description, pas le scénario dans le prompt) ; affichage en lecture verticale. | Flux rapide opérationnel. |
| **2c** | Mode **Structuré** : UI édition chapitre vide, création panels + blocs (rectangles), champs prompt + refs assets par bloc. Génération 1 image par bloc, stockage URL dans le bloc, affichage dans les blocs. | Flux structuré opérationnel. |
| **2d** | Commun : bulles de dialogue et narration (overlay sur les images), lecteur vertical amélioré. | Expérience lecture complète. |

### 4.4 Points techniques à trancher

- **Format d’image par bloc** : ratio fixe (ex. 800×1200) ou ratio du bloc ? Si ratio bloc variable, soit on génère en 1024×1024 puis recadrage/crop, soit on passe les dimensions au modèle (si l’API le permet). Recommandation v1 : ratio fixe par bloc (ex. hauteur/largeur du bloc en proportion 3:2 ou 2:3) pour simplifier.
- **Edge Function** : réutiliser `generate-asset-image` avec un type « panel » ou « block » (prompt + refs assets) pour générer une image pleine ; ou une nouvelle fonction dédiée `generate-panel-image` pour garder la sémantique claire.
- **Stockage** : même bucket `dreamweave`, chemin du type `{user_id}/projects/{project_id}/panels/{panel_id}_{block_id}.png` pour les images de blocs.

---

## 5. Résumé pour les .md

- **Product.md** : décrire la section « Scénario » (écrire l'histoire, découpage IA en chapitres/panels, **jamais** dans les prompts d'image) ; les deux flux avec génération **panel par panel** en mode Auto ; images pleines ; assets impératifs dans les 2 flux.
- **08_Modele_de_Donnees** : ajouter `chapters.scenario`, `chapters.creation_mode` ; étendre `panels` avec `layout` (blocs) ou documenter la table `panel_blocks` ; préciser que `image_url` sur un bloc = image pleine pour ce bloc.
- **07_Roadmap** : Phase 2 scinder en 2a–2d ci-dessus ; mentionner mode Structuré (blocs) et mode Automatique (synopsis/scénario).
- **04_User_Stories** : ajouter des user stories pour le mode Structuré (créer blocs, remplir blocs, référencer assets, générer images dans les blocs) et pour le scénario (saisie, utilisation en mode Auto).

---

## 6. Avis impartial sur cette vision

**Points forts**

- **Génération panel par panel** : Réaliste techniquement (limites API, timeouts, quotas). Réduit les échecs « tout ou rien » et permet de reprendre après une erreur. L'utilisateur garde le contrôle (lancer la génération panel par panel).
- **Scénario hors prompts d'image** : Le scénario reste un outil de **structure** (découpage en chapitres/panels). Ne pas l'injecter dans le prompt évite des prompts trop longs, du bruit pour le modèle et des dérives par rapport aux assets. Les **assets + courte description** cadrent mieux la génération et la cohérence visuelle.
- **Section « Scénario » dédiée** : Clarifie le parcours : écrire l'histoire → découpage IA → structure → génération à partir des assets. Séparation nette entre « écriture narrative » et « génération d'images ».

**Points de vigilance**

- **UX en mode Automatique** : Générer panel par panel peut sembler plus lent qu'un « tout en un clic ». Il faudra une UI claire (ex. bouton « Générer ce panel », progression, possibilité de lancer plusieurs panels à la suite sans réinjecter le scénario).
- **Courte description par panel** : Elle doit être suffisante pour que l'IA produise une image pertinente. Le découpage IA doit donc produire des descriptions courtes mais exploitables ; sinon, l'utilisateur devra les compléter (déjà prévu).

**Conclusion** : La vision (scénario = structure uniquement ; génération panel par panel ; assets impératifs dans les deux flux) est cohérente, réaliste pour l'implémentation et alignée avec les limites des API. Les .md ont été alignés en conséquence.

Ce rapport sert de référence pour la mise à jour des .md et pour l’implémentation.
