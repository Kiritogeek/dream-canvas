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

## 3. Scénario — section dédiée, chapitres de scénario, hors prompts d'image

### 3.1 Définitions

| Terme | Définition | Usage |
|-------|------------|--------|
| **Scénario** | **Section à part entière** du produit : l'utilisateur y **écrit** son histoire ou **importe** un scénario (format texte : fichier .txt ou copier-coller). Texte narratif : actions, lieux, personnages, dialogues. | **Découpage IA** (optionnel) : scénario → chapitres, puis chapitre → panels (liste + courte description). **Jamais** injecté dans le prompt de génération d'image. |
| **Chapitres de scénario** | Découpage **narratif** du scénario, créés par l'utilisateur (titres, structure logique de l'histoire). | **Complètement dissociés** des chapitres visuels du webtoon (Édition de l'œuvre). Servent de référence pour l'adaptation en visuel. |
| **Édition de l'œuvre** | Partie **visuelle** du produit : chapitres (visuels) et panels. C'est là que l'utilisateur construit le webtoon à partir du scénario et des assets. | Chapitres visuels = ceux qui contiennent les panels. Lors de l'édition d'un panel : double visualisation (voir 3.4). |
| **Synopsis** | Résumé court du chapitre visuel (quelques phrases). Présent en BDD (`chapters.synopsis`). | Référence auteur ; peut servir d'entrée au découpage IA. **Pas** utilisé dans le prompt d'image. |

### 3.2 Contenu de la section Scénario

- **Saisie** : l'utilisateur écrit son scénario dans la section « Scénario » **ou** importe un scénario (fichier texte .txt ou copier-coller).
- **Chapitres de scénario** : l'utilisateur peut créer lui-même des chapitres pour structurer son scénario. Ces chapitres sont **indépendants** des chapitres de l'œuvre (visuels) : même nombre ou non, même découpage ou non.
- **IA LLM — Scénariste (agent)** : une **IA LLM** est intégrée pour aider l'utilisateur à **construire son histoire**, avec un **system prompt** dédié au rôle de scénariste (agent « scénariste IA »). Voir roadmap Phase 2.
- **BDD — Scénarios approuvés** : tout ce qui a été **approuvé** par l'utilisateur (scénarios, chapitres de scénario) est **persisté en BDD** ; modèle et historique/versions à définir en roadmap.
- **Réflexion — Rôle étendu** : il y a matière à réflexion sur l’extension du rôle de cette IA : elle pourrait aussi servir à la **rédaction des prompts pour les panels** (suggestions de descriptions à partir du scénario + assets), sans remettre en cause la règle « prompt d'image = style + assets + description » (jamais le scénario brut).
- **Place dans le modèle** : à préciser (scénario au niveau projet avec chapitres de scénario en entité dédiée ou champs structurés ; table/colonnes pour versions approuvées). Voir section 6 « Points à clarifier ».

### 3.3 Rôle par flux

- **Mode Automatique** : le scénario (section dédiée) peut servir à produire la **liste des panels** (découpage IA). La **génération d'image** pour chaque panel utilise **uniquement** : style + **assets sélectionnés** + **courte description du panel**. Génération **panel par panel**.
- **Mode Structuré** : scénario / chapitres de scénario = **référence** pour l'auteur qui remplit les blocs à la main. Pas utilisé dans les prompts d'image (chaque bloc = prompt + refs assets).

### 3.4 Interface d'édition des panels (Édition de l'œuvre)

Lors de l'édition d'un panel, l'utilisateur dispose de **deux aides visuelles** :

| Côté | Contenu affiché | Objectif |
|------|-----------------|----------|
| **Scénario** | Visualisation du **chapitre de scénario** (ou du passage de scénario) qu'il adapte en visuel. | Garder le contexte narratif pendant la saisie du prompt / la génération. |
| **Assets** | Visualisation des **assets sélectionnés** pour ce panel (personnages, décors, objets). | Rappel visuel pour le prompting et la cohérence ; cadrer la génération IA. |

Cela suppose qu'un **lien optionnel** entre chapitre visuel et chapitre de scénario (ou passage) soit possible, pour afficher « le bon » extrait de scénario à côté du panel en cours d'édition. Voir section 6 « Points à clarifier ».

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
- **04_User_Stories** : ajouter des user stories pour le mode Structuré (créer blocs, remplir blocs, référencer assets, générer images dans les blocs) et pour le scénario (saisie, import, chapitres de scénario ; double visualisation en édition de panel).

---

## 6. Points à clarifier / incohérences possibles

Ces points découlent de la dissociation **chapitres de scénario** vs **chapitres de l'œuvre** et de la double visualisation en édition. À trancher en produit / technique.

| Point | Évocation | Question / risque d'incohérence |
|-------|-----------|----------------------------------|
| **Lien scénario ↔ œuvre** | Chapitres de scénario et chapitres visuels sont « complètement dissociés ». Pendant l'édition d'un panel, on affiche « le chapitre de scénario qu'il adapte ». | **Quel passage afficher ?** Si tout est dissocié, il n'y a pas de lien explicite entre un panel (ou chapitre visuel) et un chapitre de scénario. Faut-il une **association optionnelle** (ex. « Ce chapitre visuel adapte le chapitre de scénario #2 ») pour afficher le bon extrait à côté ? Sinon : afficher tout le scénario, ou le chapitre visuel courant sans lien ? |
| **Modèle de données « chapitres de scénario »** | L'utilisateur crée des chapitres pour son scénario (texte). | **Où les stocker ?** Nouvelle table `scenario_chapters` (project_id, title, content ou start/end offset dans un blob scénario) ? Ou un seul champ `project.scenario` (TEXT) avec un JSON de découpage (titres + positions) ? Impact sur l'UI (liste des chapitres de scénario, édition). |
| **Import scénario** | Import d'un scénario (format texte). | **Format** : .txt uniquement ou aussi .md / docx ? **Chapitres après import** : l'utilisateur doit-il recréer les chapitres de scénario après import, ou l'import peut-il détecter des marqueurs (ex. "## Chapitre 1") pour pré-remplir les chapitres ? |
| **Ordre des onglets / zones** | « Côté scénario » et « côté assets » pendant l'édition. | **Layout** : deux colonnes (scénario à gauche, assets à droite), panneaux repliables, ou onglets ? À définir en UX. |

---

## 7. Avis impartial sur cette vision

**Points forts**

- **Génération panel par panel** : Réaliste techniquement (limites API, timeouts, quotas). Réduit les échecs « tout ou rien » et permet de reprendre après une erreur. L'utilisateur garde le contrôle (lancer la génération panel par panel).
- **Scénario hors prompts d'image** : Le scénario reste un outil de **structure** (découpage en chapitres/panels). Ne pas l'injecter dans le prompt évite des prompts trop longs, du bruit pour le modèle et des dérives par rapport aux assets. Les **assets + courte description** cadrent mieux la génération et la cohérence visuelle.
- **Section « Scénario » dédiée** : Clarifie le parcours : écrire l'histoire → découpage IA → structure → génération à partir des assets. Séparation nette entre « écriture narrative » et « génération d'images ».

**Points de vigilance**

- **UX en mode Automatique** : Générer panel par panel peut sembler plus lent qu'un « tout en un clic ». Il faudra une UI claire (ex. bouton « Générer ce panel », progression, possibilité de lancer plusieurs panels à la suite sans réinjecter le scénario).
- **Courte description par panel** : Elle doit être suffisante pour que l'IA produise une image pertinente. Le découpage IA doit donc produire des descriptions courtes mais exploitables ; sinon, l'utilisateur devra les compléter (déjà prévu).

**Conclusion** : La vision (scénario = structure uniquement ; chapitres de scénario dissociés de l'œuvre ; génération panel par panel ; assets impératifs ; double visualisation en édition) est cohérente. Les points de la section 6 restent à trancher pour l'implémentation (lien scénario/œuvre, modèle chapitres de scénario, import, layout). Les .md ont été alignés en conséquence.

Ce rapport sert de référence pour la mise à jour des .md et pour l’implémentation.
