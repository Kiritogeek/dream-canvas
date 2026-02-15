# Plan Phase 2 — Édition de l'œuvre et lien textuel ↔ visuel

> Premier jalon : créer la section « Édition de l'œuvre ». Puis **découper le chapitre textuel en panels** pour construire le chapitre visuel (succession de panels), avec **contexte du chapitre** (lieu, scène, personnages) dans le prompt de chaque panel, et **dimensions panel 720×5000** (obligatoires, utilisées pour estimer la taille du découpage).

---

## 1. Contexte et objectif

### 1.1 Où on en est

- **Section Scénario** (onglet Scénario) : livrée. Chapitres texte (`scenario_chapters`), IA Scénario / IA Chapitre, **détection des assets dans le chapitre** (déjà en place).
- **Chapitres texte = chapitres webtoon** : 1 chapitre écrit = 1 chapitre webtoon (alignement conceptuel).

### 1.2 Ce qu’on vise en Phase 2

- **Section « Édition de l'œuvre »** : espace dédié où l’utilisateur construit le **webtoon visuel** à partir du scénario et des assets.
- **Lien textuel ↔ visuel** : à l’édition d’un chapitre visuel, afficher le **chapitre de scénario correspondant** (double visualisation : Scénario + Assets).
- **Découpage du chapitre textuel en panels** : une **fonction** (IAnpm  ou règle) qui **découpe le chapitre textuel en une succession de panels** (liste + description par panel). Ce découpage **construit** le chapitre visuel : chaque panel est une **structure** 720×5000 (blocs pour les images, puis bulles et effets en couche). Les **assets sont déjà présents** dans le chapitre textuel (détection déjà livrée).
- **Prompt de génération pour un panel** : pour avoir lieu, scène et personnages cohérents, le **contexte du chapitre** (lieu, scène, personnages) doit être inclus dans le prompt du panel. Règle : **prompt = style + assets (du chapitre) + contexte du chapitre (lieu / scène / personnages) + description du panel**.
- **Dimensions d’un panel** : **720 × 5000** pixels (taille du **contenant** panel). **La succession de panels** (empilés verticalement) **forme le chapitre visuel**.
- **Un panel n’est pas qu’une image** : un panel est une **structure** composée de **blocs** (contenant des images), de **texte** (bulles de dialogue), d’**effets de transition** et de **lignes de mouvement** (dynamiques, vitesse, impact, etc.). Voir § 1.4.
- **Estimation du découpage** : la dimension 720×5000 permet d’estimer le nombre de panels et la répartition du contenu narratif.
- **Transformation chapitre textuel → chapitre visuel** :  
  **Chapitre texte** → **découpage en panels** (fonction : liste + descriptions) → **Édition de l'œuvre** : **succession de panels** (chaque panel = blocs + bulles + effets) → **agencement des blocs** → prompts par bloc → **génération des images par bloc** (selon la forme du bloc) → **le chapitre = cette succession de panels**.

- **Visualisation du panel** : en édition, chaque panel est affiché en **visualisation totale 720×5000** px (taille réelle ou zoom homogène) pour agencer les blocs et les bulles. Voir `Edition_Panel_Blocs_Bulles.md`.

Références : `07_Roadmap_Produit.md` Phase 2, `11_Rapport_Chapitres_Flux_Blocs_Scenario.md`, `UX.md` § 3.2, **`Edition_Panel_Blocs_Bulles.md`** (édition blocs + bulles, workflow, visu 720×5000).

### 1.3 Dimensions d’un panel — le chapitre = succession de panels

| Élément | Définition |
|--------|-------------|
| **Dimensions d’un panel** | **720 × 5000** pixels (taille du **contenant** ; dimensions obligatoires). |
| **Un panel** | **Structure** de taille 720×5000 comprenant : **blocs** (avec images), **bulles de texte**, **effets de transition**, **lignes de mouvement** (voir § 1.4). |
| **Le chapitre visuel** | **Succession de panels** : l’empilement vertical des panels constitue le chapitre. |

La dimension 720×5000 sert à **estimer la taille du découpage** du chapitre textuel et définit la **surface** dans laquelle s’organisent blocs, bulles et effets.

### 1.4 Structure d’un panel (blocs, texte, effets)

Un **panel** (720×5000) est constitué des éléments suivants. Le **découpage** chapitre → panels produit une **succession de panels** ; chaque panel est ensuite rempli (blocs, images, texte, effets).

| Composant | Description |
|-----------|-------------|
| **Blocs** | Zones du panel contenant des **images** (illustrations générées). Un panel contient **toujours plusieurs blocs**. **Mode Automatique** : agencement **automatique** des blocs en fonction du scénario. **Mode Structuré** : **bibliothèque de blocs** (formes / emplacements prédéfinis) que l'utilisateur **place** sur le panel ; les **images sont générées à l'intérieur** de chaque bloc placé. Chaque bloc : position, taille, prompt, assets, image_url. |
| **Texte (bulles)** | **Bulles de dialogue** (parole, pensée, cri, chuchotement), **narration**. Ajout **côté client** : l'utilisateur place des bulles depuis une **base de bulles** (formes/types prédéfinis). Chaque bulle : **texte éditable**, **couleur du contour**, **couleur de l'intérieur** (personnalisables). Position par drag & drop. |
| **Effets de transition** | Effets visuels entre moments ou entre panels (à définir : fondu, coupure, etc.). Ajout **côté client** (hors image), en overlay. |
| **Lignes de mouvement** | Effets graphiques pour l’intensité et le dynamisme : **lignes dynamiques** (tension, intensité), **lignes de vitesse** (course, coup rapide), **lignes d’impact** (coup, explosion, choc), **effets de vitesse** (terme général). Ajout **côté client** (hors image), en overlay. |

**Implémentation (bulles, transitions, lignes de mouvement)** — principe retenu :

| Élément | Description | Détail |
|--------|-------------|--------|
| **Blocs (mode Structuré)** | **Bibliothèque de blocs** à placer sur le panel. | Base de blocs (formes / layouts prédéfinis) ; l'utilisateur **place** les blocs (drag & drop) ; les **images sont générées à l'intérieur** de chaque bloc. Données : `panels.layout` (JSONB) avec positions, tailles, type_bloc, prompt, image_url par bloc. |
| **Bulles de dialogue** | **Ajout côté client** (overlay sur le panel). | Création d’une **base de bulles** (bibliothèque de formes/types : parole, pensée, cri, chuchotement, narration). L’utilisateur **place** les bulles sur le panel ; pour chaque bulle : **texte éditable**, **couleur du contour**, **couleur de l’intérieur** (personnalisables). Données : positions, styles, contenu (JSONB par panel, ex. `speech_bubbles`). |
| **Effets (transitions, lignes de mouvement)** | **Ajout côté client** (hors des images, en overlay). | Couches superposées aux images ; positions, types, styles stockés en JSONB par panel. Modifiable sans régénérer l’image. L’intégration de certains effets *dans* l’image (ex. lignes d’impact via prompt) reste une **évolution ultérieure**. |

**Recommandation** : **bulles et effets = toujours côté client** (couche d’ajout, overlay). Pas d’intégration des bulles ou des effets dynamiques dans l’image générée pour la version courante ; évolution possible plus tard pour certains effets visuels optionnels (option B partielle).

---

## 2. Étapes du plan

**État d'avancement** : **Étapes 1 à 4** = ✅ livrées (février 2026). **Étapes 5 à 7** = 📋 à faire. Voir § 3 (synthèse) et § 4 (tests à faire).

---

### Étape 1 — Créer la section « Édition de l'œuvre » ✅ Livrée

**Statut** : livrée.

**Objectif** : Exister en tant qu’espace produit et entrée utilisateur, sans encore lier au scénario ni générer d’images.

| Livrable | Description |
|----------|-------------|
| **Onglet / entrée** | Dans la page détail projet : nouvel onglet **« Édition de l'œuvre »** (ou « Œuvre » / « Chapitres visuels ») à côté de Style, Assets, Scénario. |
| **Liste des chapitres visuels** | Affichage des chapitres du projet issus de la table `chapters` (chapitres webtoon). Création, réorganisation (drag & drop), suppression. Ordre = `chapter_number`. |
| **Vue vide / état initial** | Si le projet n’a aucun chapitre visuel : message d’accueil + CTA « Créer un chapitre » (titre, optionnellement choix du mode : Automatique / Structuré, à préciser plus tard). |
| **Ouverture d’un chapitre** | Clic sur un chapitre → écran d’édition du chapitre. Chaque **panel** est une structure 720×5000 (blocs, bulles, effets) ; en Étape 1 : écran **shell** (liste des panels vide ou placeholder), pas encore de génération ni de double visualisation. |
| **Modèle de données** | Tables `chapters` et `panels` (voir `08_Modele_de_Donnees.md`). Un **panel** : dimensions 720×5000 ; `layout` (JSONB) = blocs avec images ; `speech_bubbles` (JSONB) = bulles ; prévoir champs ou JSONB pour **effets de transition** et **lignes de mouvement**. Ajout si besoin : `chapters.linked_scenario_chapter_id` (FK → `scenario_chapters.id`, NULLABLE). |

**Critères de succès** : l’utilisateur peut ouvrir l’onglet « Édition de l'œuvre », voir la liste des chapitres visuels (ou vide), créer un chapitre, entrer dans l’écran d’édition d’un chapitre (structure prête pour les étapes suivantes). *Tests* : voir § 4.

---

### Étape 2 — Lien chapitre textuel ↔ chapitre visuel (double visualisation) ✅ Livrée

**Objectif** : En édition d’un chapitre visuel, afficher le **chapitre de scénario correspondant** (à gauche) pour garder le contexte pendant la saisie des descriptions de panels et la génération. Les **assets** sont visibles dans le texte via le même **Aperçu** que dans la section Scénario (surlignage + hover), sans panneau Assets dédié.

| Livrable | Description |
|----------|-------------|
| **Disposition** | **Chapitre texte à gauche**, **panels à droite**. Sur mobile : chapitre texte au-dessus des panels. |
| **Panneau « Chapitre texte »** | Colonne de gauche affichant le **texte du chapitre de scénario** lié. **Même visualisation que l’Aperçu** de la section Scénario : surbrillance des assets (personnages, décors, objets) dans le texte, **hover pour afficher l’asset** (image + infos). Repliable (accordéon) ; par défaut ouvert. |
| **Lien chapitre visuel ↔ chapitre texte** | Si `chapters.linked_scenario_chapter_id` est renseigné : à l’ouverture du chapitre visuel, chargement et affichage automatique du contenu de ce chapitre de scénario. Sinon : **sélecteur** (liste des chapitres de scénario du projet) pour choisir quel chapitre afficher ; option d’**enregistrer** ce choix comme lien pour ce chapitre visuel. |
| **Assets dans le texte** | Pas de panneau « Assets » séparé. Les assets sont **visibles dans le chapitre texte** via l’Aperçu (détection des mentions + surbrillance + hover pour voir l’élément). Cohérent avec la section Scénario (Chapitre → Aperçu). |
| **Données** | Migration : `linked_scenario_chapter_id` sur `chapters` (FK → `scenario_chapters.id`, NULLABLE). |

**Implémentation livrée (détails)**  
Suggestion par numéro à l'ouverture (chapitre visuel N → affichage par défaut du chapitre texte N). Libellé du sélecteur : « Chapitre N : Titre » sans « ✓ suggéré » dans le bouton ; « ✓ suggéré » uniquement dans la liste déroulante. Confirmation au changement puis sauvegarde du lien (persistance au retour sur la page).

**Création d'un chapitre visuel — association au chapitre textuel**

| Comportement | Description |
|--------------|-------------|
| **Suggestion par numéro** | Lors de la création d'un chapitre visuel (ex. Chapitre 1), le système **pré-sélectionne** le chapitre de scénario de même numéro (Chapitre 1 textuel) s'il existe. L'utilisateur peut **confirmer** (créer avec ce lien), **changer** (choisir un autre chapitre dans la liste) ou **ne pas associer** (option « Aucun », associer plus tard). |
| **Sélecteur à la création** | Dans le dialog « Créer un chapitre » : champ **Associer au chapitre de scénario** (liste déroulante : Aucun + tous les chapitres de scénario du projet). Valeur par défaut = chapitre textuel dont `chapter_number` = numéro du chapitre visuel créé (recommandé). |
| **Aucun chapitre textuel** | Si le projet n'a **aucun** chapitre de scénario au moment de créer un chapitre visuel : **notification** (message dans le dialog) indiquant que l'utilisateur peut créer des chapitres dans l'onglet Scénario et associer ce chapitre visuel plus tard. La création du chapitre visuel reste possible. |

Référence détaillée : `11_Rapport_Chapitres_Flux_Blocs_Scenario.md` § 3.4 et 3.4.1.

---

### Étape 3 — Découpage du chapitre textuel en panels (construire le chapitre visuel) ✅ Livrée

**Objectif** : Implémenter une **fonction de découpage** qui, à partir d’un **chapitre textuel**, produit une **succession de panels** (liste + description par panel). Ce découpage **construit** le chapitre visuel dans l’Édition de l'œuvre. Les **assets** du chapitre sont déjà connus (détection dans le scénario, fonctionnalité livrée).

| Livrable | Description |
|----------|-------------|
| **Fonction de découpage** | Entrée : contenu du chapitre textuel (lié au chapitre visuel). Sortie : **liste ordonnée de panels**, chacun avec une **courte description** (lieu, scène, personnages, action). Cette liste définit la **succession de panels** qui **forme le chapitre visuel**. Chaque panel est une **structure** 720×5000 (blocs à remplir avec des images + bulles + effets à ajouter ensuite). |
| **Estimation de la taille du découpage** | Utiliser la **dimension 720×5000** (taille d’un panel) pour estimer le **nombre de panels** et la répartition du contenu (ex. une unité narrative ou une scène par panel, en fonction de la longueur du chapitre). |
| **Implémentation** | Découpage par **IA** (LLM : chapitre → liste de panels avec descriptions) et/ou **manuel** (l’utilisateur définit les panels dans la section Scénario ou dans l’Édition de l'œuvre). Stockage : colonne JSONB sur `scenario_chapters` ou table dédiée ; synchronisation avec les enregistrements `panels` du chapitre visuel (chaque panel = conteneur 720×5000 avec `layout.blocs` à remplir). |
| **Création du chapitre visuel à partir du découpage** | Lors de la création (ou de l’édition) d’un chapitre visuel lié à un chapitre texte : **appliquer le découpage** pour créer la **succession de panels** (enregistrements `panels` avec description / prompt par panel ou par bloc). Chaque panel démarre avec une structure vide (blocs à définir, pas encore d’images) ; l’utilisateur remplit les blocs, ajoute bulles et effets, puis lance la génération des images. |
| **Contexte du chapitre dans le prompt** | Pour chaque panel, le **prompt de génération** doit inclure : **style + assets (du chapitre) + contexte du chapitre (lieu, scène, personnages) + description du panel**. Le contexte permet à l’IA d’image d’avoir lieu, scène et personnages cohérents. |

**Optionnel (complément)** : action « IA Panel » pour **suggérer ou réécrire** la description d’un panel individuel (contexte scénario + assets) ; accepter / rejeter. Le prompt d’image reste : style + assets + **contexte chapitre** + description du panel.

**Contrôle de la longueur des chapitres (estimation, référence, cible)** — livrables de l'Étape 3 :

*Objectif* : donner à l'utilisateur un **contrôle sur la longueur** de ses chapitres (en nombre de panels). *Principe* : estimation et visualisation **uniquement indicatives et visuelles** ; l'utilisateur n'est pas tenu d'appliquer strictement un panel « détecté » — il peut vouloir plus ou moins d'images qu'estimé. Pas de contrainte.

*Où placer la fonctionnalité ?* **Option C recommandée** : dans **Scénario** (par chapitre) et **Édition de l'œuvre** (chapitre visuel). Une seule cible/référence (projet ou chapitre) partagée.

| Livrable | Description |
|----------|-------------|
| **Référence panels / chapitre** | Référence affichée (ex. « ~10 panels / chapitre »). *Évolution* : afficher un **vrai chapitre webtoon** (fourni plus tard) avec son nombre de panels pour que l'utilisateur fixe sa cible. |
| **Estimation du nombre de panels** | À partir du contenu du chapitre textuel (et 720×5000), **estimer** le nombre de panels. **Indicatif et visuel uniquement** ; l'utilisateur peut créer plus ou moins de panels qu'estimé. En Scénario (par chapitre) et en Édition de l'œuvre. |
| **Nombre de panels cible** | L'utilisateur définit une **cible** (ex. 8, 10, 12). Niveau **projet** (défaut) et/ou **par chapitre**. |
| **Comparaison estimation vs cible** | Afficher ex. « Estimation : 7 · Cible : 10 » et indiquer si en dessous / au-dessus / proche. L'utilisateur adapte le texte ou utilise la répartition N/N+1. |
| **Guidance longueur** | Si découpage trop court ou trop long : indiquer retour au Scénario ou répartition N/N+1 (prendre du chapitre N+1 ou céder au N+1 ; acceptation/refus ; prérequis : N et N+1). |
| **Répartition N / N+1** | Sans perdre d'éléments. Trop court → prendre des éléments du chapitre textuel N+1, les ajouter au N. Trop long → céder du N vers N+1. Même principe (proposition + acceptation/refus). |

*Usage* : en Scénario (création/édition chapitre) : afficher référence + estimation ; choix cible ; comparaison estimation vs cible. Même logique en Édition de l'œuvre. *Évolution* : exemple de chapitre webtoon réel (image + nombre de panels).

---

### Étape 4 — Liaison découpage ↔ Édition de l'œuvre (section Scénario) ✅ Livrée

**Objectif** : Proposer le découpage **depuis la section Scénario** (par chapitre texte) et l’**importer** dans l’Édition de l'œuvre pour pré-remplir la succession de panels du chapitre visuel.

| Livrable | Description |
|----------|-------------|
| **Découpage dans la section Scénario** | Par chapitre de scénario : déclencher la **fonction de découpage** (Étape 3) ou définir manuellement la liste de panels + descriptions. Stockage en BDD. |
| **Import vers Édition de l'œuvre** | Depuis un chapitre visuel lié à ce chapitre texte : bouton « Importer le découpage » (ou équivalent) pour créer / mettre à jour la **succession de panels** avec les descriptions issues du découpage. L'utilisateur peut **ajouter ou supprimer** des panels ensuite : le découpage est une **base**, pas une contrainte. |
| **Édition des descriptions** | Dans l'Édition de l'œuvre, chaque panel reste éditable (description, puis génération avec contexte chapitre + assets + description). Liberté d'avoir plus ou moins d'images que l'estimation. |

Référence : roadmap Phase 2 § 2.1 (Découpage Chapitre → Panels), rapport § 3.2.

---

### Étape 5 — Édition des blocs et génération par bloc 📋 À faire

**Objectif** : Par défaut **aucun bloc** ; l’utilisateur **ajoute des blocs par glisser-déposer** (bloc **500×500** déposé sur le panel), **déplace** les blocs par glisser-déposer, **édite** la largeur/hauteur de chaque bloc, renseigne un **prompt par bloc**, puis **génère l’image** par bloc. Visualisation **720×5000** avec fond quadrillé. Détail : `Edition_Panel_Blocs_Bulles.md`.

| Livrable | Description |
|----------|-------------|
| **Par défaut : aucun bloc** | À la création / import des panels, `layout.blocks = []`. Les blocs sont ajoutés par l’utilisateur. |
| **Ajout par glisser-déposer** | Source « Bloc 500×500 » déposée sur le panel → création d’un bloc 500×500 à la position de dépôt. Option : bouton « Ajouter en (0,0) ». |
| **Déplacement par glisser-déposer** | Chaque bloc est déplaçable sur le canvas du panel ; la position (x, y) est mise à jour au dépôt. |
| **Édition des dimensions** | Par bloc : **largeur** et **hauteur** éditables (champs + « Appliquer dimensions »). Bloc par défaut : 500×500. |
| **Prompt et génération** | **Prompt** éditable par bloc ; bouton « Générer » → image générée et affichée **dans le bloc**. **OBLIGATOIRE** : l'image générée utilise les **dimensions du bloc concerné** (largeur × hauteur) pour l'espace de l'image. Prompt = style + contexte chapitre + prompt du bloc. |
| **Visualisation panel 720×5000** | Fond quadrillé ; blocs délimités (bordure, ombre) ; scroll vertical si besoin. |
| **Suppression** | Bouton « Supprimer » par bloc. |
| **Contraintes** | Pas de génération « tout le chapitre » ni « tout le panel ». Régénération possible par bloc. |
| **Bulles** | Voir Étape 7 et `Edition_Panel_Blocs_Bulles.md`. |

---

### Étape 6 — Mode Structuré (blocs) 📋 À faire

**Objectif** : Chapitre visuel en mode **Structuré** : l’utilisateur **place** des **blocs** depuis une **bibliothèque de blocs** (formes / emplacements prédéfinis) sur chaque panel ; les **images sont générées à l'intérieur** de chaque bloc. Par bloc : description + **sélection d’assets** ; génération **1 image par bloc**.

| Livrable | Description |
|----------|-------------|
| **Bibliothèque de blocs** | **Base de blocs** (formes / layouts prédéfinis) : l'utilisateur **place** les blocs sur le panel (drag & drop depuis la bibliothèque). Chaque bloc a position, taille (définies par le type ou ajustables). Modèle : `panels.layout` (JSONB) avec `blocks[]` (x, y, width, height, type_bloc, prompt, asset_refs, image_url). |
| **Remplissage des blocs** | Par bloc : champ **description** (éditable ; IA Panel réutilisable) + **sélection d’assets** pour ce bloc. |
| **Génération 1 image par bloc** | Bouton de génération par bloc. Prompt = style + assets du bloc + **contexte du chapitre (lieu, scène, personnages)** + description du bloc. Les **images sont générées à l'intérieur** de chaque bloc ; image stockée et affichée **dans** le bloc. **OBLIGATOIRE** : l'espace de l'image doit prendre les **dimensions du bloc concerné** (largeur × hauteur) ; l'API reçoit ces dimensions. |
| **Double visualisation** | Panneau Scénario + panneau Assets (par bloc ou par chapitre) disponible comme en mode Auto. |

---

### Étape 7 — Texte (bulles), effets et lecture 📋 À faire

**Objectif** : Compléter chaque panel avec **bulles de dialogue / narration**, **effets de transition** et **lignes de mouvement**. Ces éléments forment une **couche d’ajout** sur les images (overlay) ; option ultérieure : intégration partielle à l’image. Puis lecteur webtoon (défilement vertical).

| Livrable | Description |
|----------|-------------|
| **Bulles de dialogue** | **Ajout côté client** (overlay). **Base de bulles** : bibliothèque de formes/types (parole, pensée, cri, chuchotement, narration). L'utilisateur place les bulles (drag & drop) ; par bulle : **texte éditable**, **couleur du contour**, **couleur de l'intérieur** (personnalisables). Stockage `panels.speech_bubbles` (JSONB). |
| **Narration** | Bloc de narration par panel (texte hors bulle), en overlay (P1). |
| **Effets de transition** | **Ajout côté client** (hors des images, overlay). Effets entre panels ou à l’intérieur d’un panel (fondu, coupure, etc.). Positions, types, styles en JSONB par panel. |
| **Lignes de mouvement** | **Ajout côté client** (hors des images, overlay). Lignes dynamiques (tension, intensité), lignes de vitesse, lignes d’impact, effets de vitesse. Positions, styles, types stockés en JSONB par panel (ex. `panels.motion_lines` ou `panels.effects`). Évolution possible : demander certaines lignes d’impact **dans le prompt d’image** (intégré). |
| **Rendu final du panel** | Composition : image(s) des blocs + overlay (bulles + effets + lignes de mouvement). Dimensions panel 720×5000 respectées. |
| **Lecteur webtoon** | Vue lecture : défilement vertical, succession de panels ; navigation entre chapitres (précédent / suivant). |

---

## 3. Synthèse : ordre des étapes

| Ordre | Étape | Résumé | Statut |
|-------|--------|--------|--------|
| **1** | **Créer la section « Édition de l'œuvre »** | Onglet, liste chapitres visuels, écran d’édition chapitre (shell). Lien BDD `chapters` ↔ `scenario_chapters` si besoin. | ✅ Livrée |
| 2 | Lien textuel ↔ visuel (double visualisation) | Chapitre texte à gauche (Aperçu = surbrillance assets + hover), panels à droite ; lien `linked_scenario_chapter_id`. Pas de panneau Assets dédié. | ✅ Livrée |
| 3 | **Découpage chapitre textuel en panels** | Fonction qui découpe le chapitre texte en **succession de panels** (liste + descriptions) ; estimation avec 720×5000 ; contexte chapitre (lieu, scène, personnages) dans le prompt. **Contrôle longueur** : référence, estimation, cible, comparaison estimation vs cible (Scénario + Édition de l'œuvre) ; guidance et répartition N/N+1. | ✅ Livrée |
| 4 | Liaison découpage ↔ Édition de l'œuvre | Découpage depuis la section Scénario ; import vers chapitre visuel (création des panels). | ✅ Livrée |
| 5 | **Édition blocs + génération par bloc** | **Visualisation panel 720×5000**. Agencement des blocs, prompt par bloc ; génération **par bloc** (dimensions = forme du bloc). Voir `Edition_Panel_Blocs_Bulles.md`. | 📋 À faire |
| 6 | Mode Structuré (blocs) | **Bibliothèque de blocs** à placer sur le panel ; images **générées à l'intérieur** de chaque bloc ; description + assets par bloc. | 📋 À faire |
| 7 | **Texte, effets et lecture** | **Bulles** (overlay) ; **effets de transition** ; **lignes de mouvement** (dynamiques, vitesse, impact — overlay, option intégré ultérieure) ; rendu panel = blocs + couches ; lecteur webtoon vertical. | 📋 À faire |

---

## 4. Tests à faire

Tests de non-régression et critères d'acceptation par étape. À exécuter ou à valider à chaque livraison.

| Étape | Tests / critères à valider |
|-------|----------------------------|
| **1** ✅ | **Non-régression** : ouverture onglet Édition de l'œuvre ; liste chapitres (vide ou non) ; création / réorganisation / suppression ; ouverture écran chapitre (shell). Numéro de chapitre = premier numéro libre après suppression. |
| **2** ✅ | Affichage chapitre texte à gauche, panels à droite ; Aperçu = surbrillance assets + hover fond opaque (même rendu que Scénario) ; lien `linked_scenario_chapter_id` (sélecteur si non lié, option « Aucun ») ; changement de chapitre → confirmation → enregistrement du lien (persistant) ; libellé select sans « ✓ suggéré » dans le trigger ; création chapitre avec suggestion par numéro, message si aucun chapitre textuel. |
| **3** | Fonction découpage (entrée chapitre texte → liste panels + descriptions) ; estimation nombre de panels (720×5000) ; contrôle longueur : référence, estimation, cible, comparaison (Scénario + Édition) ; guidance longueur ; répartition N/N+1 (prérequis N et N+1). |
| **4** | Découpage déclenchable depuis Scénario ; import vers chapitre visuel (bouton « Importer le découpage ») ; panels créés/mis à jour ; édition des descriptions possible. |
| **5** | Visualisation panel 720×5000 ; édition des blocs (position, taille, prompt par bloc) ; génération par bloc (dimensions = bloc) ; pas de génération tout le panel/chapitre ; régénération par bloc. |
| **6** | Bibliothèque de blocs ; placement sur panel ; description + assets par bloc ; génération 1 image par bloc ; double visualisation (Scénario + assets). |
| **7** | Bulles (overlay, types, édition texte/couleurs) ; narration ; effets de transition ; lignes de mouvement ; rendu final ; lecteur webtoon (défilement vertical, navigation chapitres). |

---

## 5. Références

- **Roadmap** : `07_Roadmap_Produit.md` — Phase 2 (Panels & Dialogues)
- **Édition panel (blocs + bulles)** : `Edition_Panel_Blocs_Bulles.md` — workflow, visualisation 720×5000, édition blocs, prompts par bloc, génération par bloc, bulles
- **Flux et règles** : `11_Rapport_Chapitres_Flux_Blocs_Scenario.md` — § 2 (flux Auto/Structuré), § 3.4 (double visualisation), § 3.5 (IA Panel)
- **UX** : `UX.md` — § 3.2 (Édition de l’œuvre)
- **Modèle de données** : `08_Modele_de_Donnees.md` — `chapters`, `panels`, `scenario_chapters`

---

*Dernière mise à jour : février 2026*
