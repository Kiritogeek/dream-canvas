# Plan Phase 2 — Édition de l'œuvre et lien textuel ↔ visuel

> Premier jalon : créer la section « Édition de l'œuvre ». L'utilisateur **crée librement** le nombre de panels qu'il souhaite pour le chapitre visuel ; le **scénario à gauche sert de référence**. Optionnellement : **suggestion de panels par IA** ou **import d'une suggestion** (liste + descriptions). **Contexte du chapitre** (lieu, scène, personnages) dans le prompt de chaque panel ; **dimensions panel 720×5000** (obligatoires).

---

## 1. Contexte et objectif

### 1.1 Où on en est

- **Section Scénario** (onglet Scénario) : livrée. Chapitres texte (`scenario_chapters`), IA Scénario / IA Chapitre, **détection des assets dans le chapitre** (déjà en place).
- **Chapitres texte = chapitres webtoon** : 1 chapitre écrit = 1 chapitre webtoon (alignement conceptuel).

### 1.2 Ce qu’on vise en Phase 2

- **Section « Édition de l'œuvre »** : espace dédié où l’utilisateur construit le **webtoon visuel** à partir du scénario et des assets.
- **Lien textuel ↔ visuel** : à l’édition d’un chapitre visuel, afficher le **chapitre de scénario correspondant** (double visualisation : Scénario + Assets).
- **Liberté de création des panels** : l'utilisateur **crée le nombre de panels qu'il souhaite** (bouton « Ajouter un panel »). Le **scénario à gauche** lui sert de **référence** ; l'agencement des panels et des blocs est **subjectif**. Chaque panel est une **structure** 720×5000 (blocs pour les images, puis bulles et effets en couche). **Optionnel** : une **suggestion de panels par IA** (liste + descriptions) ou l'**import d'une suggestion** (depuis le scénario) pour pré-remplir les panels ; l'utilisateur peut ensuite ajouter ou supprimer des panels. Les **assets** sont déjà présents dans le chapitre textuel (détection déjà livrée).
- **Prompt de génération pour un panel** : pour avoir lieu, scène et personnages cohérents, le **contexte du chapitre** (lieu, scène, personnages) doit être inclus dans le prompt du panel. Règle : **prompt = style + assets (du chapitre) + contexte du chapitre (lieu / scène / personnages) + description du panel**.
- **Dimensions d’un panel** : **720 × 5000** pixels (taille du **contenant** panel). **La succession de panels** (empilés verticalement) **forme le chapitre visuel**.
- **Un panel n’est pas qu’une image** : un panel est une **structure** composée de **blocs** (contenant des images), de **texte** (bulles de dialogue), d’**effets de transition** et de **lignes de mouvement** (dynamiques, vitesse, impact, etc.). Voir § 1.4.
- **Estimation indicative** : la dimension 720×5000 peut servir à une estimation indicative du nombre de panels (affichée à titre d'information) ; l'utilisateur n'est pas tenu de s'y conformer.
- **Transformation chapitre textuel → chapitre visuel** :  
  **Chapitre texte** (référence à gauche) → **Édition de l'œuvre** : l'utilisateur **crée les panels** (un par un ou via une **suggestion IA / import** optionnel) → **succession de panels** (chaque panel = blocs + bulles + effets) → **agencement des blocs** → prompts par bloc → **génération des images par bloc** (selon la forme du bloc) → **le chapitre = cette succession de panels**.

- **Visualisation du panel** : en édition, chaque panel est affiché en **visualisation totale 720×5000** px (taille réelle ou zoom homogène) pour agencer les blocs et les bulles. **Les images sont générées dans les blocs.** L'édition se fait en **deux modes** : **Architecture** (structure des blocs) et **Édition** (contenu). Voir `Edition_Panel_Blocs_Bulles.md` et **`Edition_Panel_Deux_Modes.md`**.

Références : `07_Roadmap_Produit.md` Phase 2, `11_Rapport_Chapitres_Flux_Blocs_Scenario.md`, `UX.md` § 3.2, **`Edition_Panel_Blocs_Bulles.md`** (édition blocs + bulles, workflow, visu 720×5000), **`Edition_Panel_Deux_Modes.md`** (modes Architecture / Édition).

### 1.3 Dimensions d’un panel — le chapitre = succession de panels

| Élément | Définition |
|--------|-------------|
| **Dimensions d’un panel** | **720 × 5000** pixels (taille du **contenant** ; dimensions obligatoires). |
| **Un panel** | **Structure** de taille 720×5000 comprenant : **blocs** (avec images), **bulles de texte**, **effets de transition**, **lignes de mouvement** (voir § 1.4). |
| **Le chapitre visuel** | **Succession de panels** : l’empilement vertical des panels constitue le chapitre. |

La dimension 720×5000 définit la **surface** dans laquelle s'organisent blocs, bulles et effets ; une estimation indicative du nombre de panels peut en découler (non contraignante).

### 1.4 Structure d’un panel (blocs, texte, effets)

Un **panel** (720×5000) est constitué des éléments suivants. L'utilisateur **crée les panels** (à la main ou en important une suggestion) ; chaque panel est ensuite rempli (blocs, images, texte, effets).

| Composant | Description |
|-----------|-------------|
| **Blocs** | Zones du panel contenant des **images** (illustrations générées). **C'est dans les blocs que les images sont générées.** Un panel contient une ou plusieurs blocs. **Mode Automatique** : agencement automatique. **Mode Structuré** : l'utilisateur travaille en **deux modes** — **Architecture** (ajout, position, dimensions des blocs) et **Édition** (prompt par bloc avec détection des assets, bulles, effets, fond, texte). Bibliothèque de blocs à placer ; images générées **à l'intérieur** de chaque bloc. Chaque bloc : position, taille, prompt, assets, image_url. |
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

**État d'avancement** : **Étapes 1 à 6** = ✅ livrées (février 2026). **Étape 7** = 📋 à faire. Voir § 3 (synthèse) et § 4 (tests à faire).

**État réel du code (écarts connus)** :
- **Étape 3** : L'utilisateur **crée librement** le nombre de panels (« Ajouter un panel »). **Suggestion de panels (IA)** et **Importer la suggestion** sont optionnels. Une **estimation indicative** du nombre de panels (à partir du contenu texte) peut être affichée ; elle n'est pas contraignante. La **répartition N/N+1** (prendre du chapitre N+1 / céder au N+1) n'est **pas implémentée** — à prévoir en complément ou en Étape ultérieure.
- **Étape 5** : Pas de bascule **Architecture | Édition** : une **vue unifiée** (canvas 720×5000 + panneau latéral par panel). Prompt par bloc = Textarea dans le panneau latéral ; **aperçu des mentions d'assets** (surbrillance + hover) sous le prompt du bloc via `ScenarioTextHighlighter`. **Contexte chapitre** (lieu, scène, personnages) : envoyé à l'API depuis la suggestion (`panels_outline[].context`) ou la description du panel. Suppression = bouton au survol sur le bloc (canvas) + bouton dans le panneau latéral.

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

**Assets dans le chapitre texte — fonctionnement**

- **Ce que c’est** : les **assets** = personnages, décors, objets du projet (créés dans l’onglet Assets). Ils sont **détectés dans le texte** du chapitre de scénario : dès qu’un nom d’asset apparaît dans le paragraphe, il est reconnu.
- **Où on les voit** : dans le panneau « Chapitre texte » (à gauche en Édition de l’œuvre), **même rendu que l’Aperçu** en section Scénario : les mentions sont **surlignées** ; au **survol** (hover), une infobulle montre l’asset (image + infos). Pas de panneau « Assets » à part : tout passe par le texte.
- **À quoi ça sert** : (1) **référence** pendant l’édition des panels et des blocs ; (2) **génération d’images** : le prompt = style + **assets** (sélectionnés par l’utilisateur pour le bloc ou le chapitre) + contexte du chapitre + description. Les assets servent à cadrer la scène et à ce que l’IA dessine les bons éléments.

**Ce qui a été oublié / à compléter (résumé)**

| Point | Explication courte |
|-------|--------------------|
| **Répartition N/N+1** | Répartir le contenu entre chapitre texte N et N+1 (trop court → prendre du N+1 ; trop long → céder au N+1). **Non implémenté** ; à prévoir en complément. |
| **Éléments mentionnés non créés** | Dans le scénario, des noms peuvent apparaître sans qu’un asset existe encore. Détection prévue (section Scénario) ; **création depuis le texte** (panneau dédié, bouton « Créer l’asset ») = à finaliser / clarifier. |
| **Mode Architecture / Édition** | Doc prévoit deux modes (Architecture = blocs ; Édition = prompt, bulles, effets). **Actuel** : vue unifiée (canvas + panneau latéral) ; pas de bascule explicite. |
| **Étape 7** | Bulles (bibliothèque + placement), Menu Couleur (fond), effets (transitions, lignes de mouvement), lecteur webtoon = **à faire**. |

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

### Étape 3 — Liberté de création des panels + suggestion optionnelle (IA) ✅ Livrée

**Objectif** : Implémenter une **création libre des panels** qui, à partir d’un **chapitre textuel**, produit une **succession de panels** (liste + description par panel). L'utilisateur **crée** le chapitre visuel dans l’Édition de l'œuvre. Les **assets** du chapitre sont déjà connus (détection dans le scénario, fonctionnalité livrée).

| Livrable | Description |
|----------|-------------|
| **Création libre des panels** | Entrée : contenu du chapitre textuel (lié au chapitre visuel). Sortie : **liste ordonnée de panels**, chacun avec une **courte description** (lieu, scène, personnages, action). Cette liste définit la **succession de panels** qui **forme le chapitre visuel**. Chaque panel est une **structure** 720×5000 (blocs à remplir avec des images + bulles + effets à ajouter ensuite). |
| **Estimation indicative** | Utiliser la **dimension 720×5000** (taille d’un panel) pour estimer le **nombre de panels** et la répartition du contenu (ex. une unité narrative ou une scène par panel, en fonction de la longueur du chapitre). |
| **Suggestion de panels (IA)** | **Optionnel** : par **IA** (LLM : chapitre → liste de panels avec descriptions) et/ou **manuel** (l’utilisateur définit les panels dans la section Scénario ou dans l’Édition de l'œuvre). Stockage : colonne JSONB sur `scenario_chapters` ou table dédiée ; synchronisation avec les enregistrements `panels` du chapitre visuel (chaque panel = conteneur 720×5000 avec `layout.blocs` à remplir). |
| **Import de la suggestion** | Lors de la création (ou de l’édition) d’un chapitre visuel lié à un chapitre texte : **appliquer le découpage** pour créer la **succession de panels** (enregistrements `panels` avec description / prompt par panel ou par bloc). Chaque panel démarre avec une structure vide (blocs à définir, pas encore d’images) ; l’utilisateur remplit les blocs, ajoute bulles et effets, puis lance la génération des images. |
| **Contexte du chapitre dans le prompt** | Pour chaque panel, le **prompt de génération** doit inclure : **style + assets (du chapitre) + contexte du chapitre (lieu, scène, personnages) + description du panel**. Le contexte permet à l’IA d’image d’avoir lieu, scène et personnages cohérents. |

**Optionnel (complément)** : action « IA Panel » pour **suggérer ou réécrire** la description d’un panel individuel (contexte scénario + assets) ; accepter / rejeter. Le prompt d’image reste : style + assets + **contexte chapitre** + description du panel.

**Implémentation livrée** : bouton « Ajouter un panel » (création d'un panel vide) ; message « Liberté de création » (scénario = référence, agencement subjectif) ; boutons « Suggestion de panels (IA) » et « Importer la suggestion » (optionnels) ; estimation indicative affichée à titre d'information. **Répartition N/N+1** (actions prendre/céder contenu entre chapitres) = non implémentée (complément possible).

---

### Étape 4 — Liaison suggestion ↔ Édition de l'œuvre (section Scénario) ✅ Livrée

**Objectif** : Proposer une **suggestion de panels** depuis la section Scénario (par chapitre texte) et l’**importer** dans l’Édition de l'œuvre pour pré-remplir la succession de panels. L'utilisateur reste **libre** de créer ses panels à la main sans utiliser cette suggestion.

| Livrable | Description |
|----------|-------------|
| **Suggestion dans la section Scénario** | Par chapitre de scénario : déclencher une **suggestion de panels** (IA ou manuel) ; liste de panels + descriptions. Stockage en BDD. |
| **Import vers Édition de l'œuvre** | Depuis un chapitre visuel lié à ce chapitre texte : bouton **« Importer la suggestion »** pour créer / mettre à jour la **succession de panels** avec les descriptions issues de la suggestion. L'utilisateur peut **ajouter ou supprimer** des panels ensuite : la suggestion est une **base optionnelle**, pas une contrainte. |
| **Édition des descriptions** | Dans l'Édition de l'œuvre, chaque panel reste éditable (description, puis génération avec contexte chapitre + assets + description). Liberté du nombre de panels et du contenu. |

Référence : roadmap Phase 2 § 2.1, rapport § 3.2.

---

### Étape 5 — Édition des blocs et génération par bloc (mode Architecture + base Édition) ✅ Livrée

**Statut** : livrée.

**Objectif** : **Les images sont générées dans les blocs.** Deux modes prévus à terme : **Architecture** (ajout, position, dimensions des blocs) et **Édition** (prompt par bloc, éventuellement avec détection des assets). Par défaut **aucun bloc** ; l’utilisateur **ajoute des blocs par glisser-déposer** (bloc **500×500** déposé sur le panel), **déplace** les blocs par glisser-déposer, **édite** la largeur/hauteur de chaque bloc, renseigne un **prompt par bloc**, puis **génère l’image** par bloc. Visualisation **720×5000** avec fond quadrillé. Détail : `Edition_Panel_Blocs_Bulles.md`, `Edition_Panel_Deux_Modes.md`.

| Livrable | Description |
|----------|-------------|
| **Par défaut : aucun bloc** | À la création / import des panels, `layout.blocks = []`. Les blocs sont ajoutés par l’utilisateur. |
| **Ajout par glisser-déposer** | Source « Bloc 500×500 » déposée sur le panel → création d’un bloc 500×500 à la position de dépôt. Option : bouton « Ajouter en (0,0) ». |
| **Déplacement par glisser-déposer** | Chaque bloc est déplaçable sur le canvas du panel ; la position (x, y) est mise à jour au dépôt. |
| **Édition des dimensions** | Par bloc : **largeur** et **hauteur** éditables (champs + « Appliquer dimensions »). Bloc par défaut : 500×500. |
| **Prompt et génération** | **Prompt** éditable par bloc (dans le panneau latéral) ; bouton « Générer » → image générée et affichée **dans le bloc**. **OBLIGATOIRE** : l'image générée utilise les **dimensions du bloc concerné** (largeur × hauteur). Prompt = style + (optionnel contexte chapitre, à brancher) + prompt du bloc. |
| **Visualisation panel 720×5000** | Fond quadrillé ; blocs délimités (bordure, ombre) ; scroll vertical si besoin. |
| **Suppression** | Bouton « Supprimer » par bloc. |
| **Contraintes** | Pas de génération « tout le chapitre » ni « tout le panel ». Régénération possible par bloc. |
| **Bulles, effets, fond, texte** | Voir Étape 7 et `Edition_Panel_Deux_Modes.md`. |

**Implémentation actuelle (détails livrés)** : **Vue unifiée** : pas de bascule Architecture | Édition ; canvas 720×5000 (fond quadrillé, marges 20 px L/R, 15 px haut/bas, scroll vertical) + **panneau latéral** par panel (description panel, liste des blocs avec prompt, dimensions, boutons Modifier/Enregistrer/Supprimer/Générer). Prévisualisation 500×500 pendant le glisser d'un nouveau bloc ; **placement par centre** (centre du bloc au point de dépôt) ; **suppression** : bouton au survol sur le bloc (canvas, ~25 % depuis le bas, centré) + bouton dans le panneau latéral ; **poignées de redimensionnement** (8 : 4 bordures 9 px, 4 coins 15 px), curseurs adaptés ; **génération par bloc** : Edge Function `generate-panel-image`, dimensions du bloc envoyées, **contexte chapitre** envoyé (depuis `panels_outline[].context` ou description du panel), instruction « remplir tout le cadre », stockage `{user_id}/projects/{project_id}/panels/{panel_id}/blocks/{block_id}.png`. **Aperçu des mentions d'assets** dans le prompt du bloc : sous le champ prompt, affichage du texte avec surbrillance des assets (même composant que l'Aperçu scénario) et hover pour afficher l'asset.

---

### Étape 6 — Mode Structuré (blocs) ✅ Livrée

**Objectif** : Chapitre visuel en mode **Structuré** : l’utilisateur **place** des **blocs** depuis une **bibliothèque de blocs** (formes / emplacements prédéfinis) sur chaque panel ; les **images sont générées à l'intérieur** de chaque bloc. Par bloc : description + **sélection d’assets** ; génération **1 image par bloc**.

| Livrable | Description |
|----------|-------------|
| **Bibliothèque de blocs** | **Base de blocs** (formes / layouts prédéfinis) : l'utilisateur **place** les blocs sur le panel (drag & drop depuis la bibliothèque). Chaque bloc a position, taille (définies par le type ou ajustables). Modèle : `panels.layout` (JSONB) avec `blocks[]` (x, y, width, height, type_bloc, prompt, asset_refs, image_url). |
| **Remplissage des blocs** | Par bloc : champ **description** (éditable ; IA Panel réutilisable) + **sélection d’assets** pour ce bloc. |
| **Génération 1 image par bloc** | Bouton de génération par bloc. Prompt = style + assets du bloc + **contexte du chapitre (lieu, scène, personnages)** + description du bloc. Les **images sont générées à l'intérieur** de chaque bloc ; image stockée et affichée **dans** le bloc. **OBLIGATOIRE** : l'espace de l'image doit prendre les **dimensions du bloc concerné** (largeur × hauteur) ; l'API reçoit ces dimensions. |
| **Double visualisation** | Panneau Scénario + panneau Assets (par bloc ou par chapitre) disponible comme en mode Auto. |

**Implémentation livrée** : Bibliothèque de blocs (presets 500×500, 400×600, 720×400, 350×500, 600×400) dans le panneau latéral ; glisser-déposer crée un bloc aux dimensions du preset. En mode Personalisation, « Assets pour ce bloc » (cases à cocher) ; `asset_refs` stocké dans le bloc. Edge Function reçoit `block_asset_names` et les injecte dans le prompt.

---

### Étape 7 — Mode Édition : bulles, effets, fond, texte et lecture 📋 À faire

**Objectif** : En **mode Édition**, compléter chaque panel avec **bibliothèque de bulles** (placement comme les blocs), **bibliothèque d'effets**, **couleur de fond**, **ajout de texte** (typo). Ces éléments forment une **couche d’ajout** sur les images (overlay) ; option ultérieure : intégration partielle à l’image. Puis lecteur webtoon (défilement vertical).

| Livrable | Description |
|----------|-------------|
| **Bibliothèque de bulles** | **Mode Édition.** Bibliothèque de formes/types (parole, pensée, cri, chuchotement, narration). **Même comportement que les blocs** : glisser-déposer depuis la bibliothèque sur le panel. Par bulle : **texte éditable**, couleur contour/intérieur, police, taille. Stockage `panels.speech_bubbles` (JSONB). |
| **Menu Couleur** | **Mode Édition.** **Menu dédié** pour modifier la couleur de fond du panel : sélecteur de couleur (couleur unie ou dégradé), aperçu en temps réel. Stockage dans le panel (ex. `panels.background_color` ou `panels.background_style`). |
| **Bibliothèque d'effets** | **Mode Édition.** **Bibliothèque d'éléments visuels** pour enrichir le panel et donner de la profondeur, douceur, émotion et vivant à l'œuvre. Effets organisés par catégories : **profondeur** (ombres portées, lumières directionnelles, atmosphère), **douceur** (flou artistique, transitions douces, brume), **émotion** (météo, ambiances colorées, filtres), **vivant** (lignes de mouvement, particules, dynamisme). Choix dans la bibliothèque et application sur le panel. Positions, types, styles, intensité en JSONB (ex. `panels.effects`). |
| **Effets de transition** | **Ajout côté client** (hors des images, overlay). Effets entre panels ou à l’intérieur d’un panel (fondu, coupure, etc.). Positions, types, styles en JSONB par panel. |
| **Lignes de mouvement** | **Ajout côté client** (hors des images, overlay). Lignes dynamiques (tension, intensité), lignes de vitesse, lignes d’impact, effets de vitesse. Positions, styles, types stockés en JSONB par panel (ex. `panels.motion_lines` ou `panels.effects`). Évolution possible : demander certaines lignes d’impact **dans le prompt d’image** (intégré). |
| **Rendu final du panel** | Composition : image(s) des blocs + overlay (bulles + effets + texte libre) + fond (couleur personnalisée via Menu Couleur). Dimensions panel 720×5000 respectées. |
| **Lecteur webtoon** | Vue lecture : défilement vertical, succession de panels ; navigation entre chapitres (précédent / suivant). |

---

## 3. Synthèse : ordre des étapes

| Ordre | Étape | Résumé | Statut |
|-------|--------|--------|--------|
| **1** | **Créer la section « Édition de l'œuvre »** | Onglet, liste chapitres visuels, écran d’édition chapitre (shell). Lien BDD `chapters` ↔ `scenario_chapters` si besoin. | ✅ Livrée |
| 2 | Lien textuel ↔ visuel (double visualisation) | Chapitre texte à gauche (Aperçu = surbrillance assets + hover), panels à droite ; lien `linked_scenario_chapter_id`. Pas de panneau Assets dédié. | ✅ Livrée |
| 3 | **Liberté de création des panels + suggestion optionnelle** | L'utilisateur crée le nombre de panels qu'il souhaite (« Ajouter un panel ») ; scénario = référence. **Optionnel** : suggestion de panels (IA), import de la suggestion. Estimation indicative (non contraignante). Répartition N/N+1 = non implémentée. | ✅ Livrée |
| 4 | Liaison suggestion ↔ Édition de l'œuvre | Suggestion depuis la section Scénario (ou IA) ; import vers chapitre visuel (création/mise à jour des panels). Base optionnelle. | ✅ Livrée |
| 5 | **Édition blocs + génération par bloc** | **Vue unifiée** : canvas 720×5000 + panneau latéral (prompt/dimensions par bloc). Ajout, position, dimensions des blocs (glisser-déposer, poignées) ; prompt par bloc ; génération par bloc (dimensions = bloc). Détection assets dans le prompt = prévue Étape 6. Voir `Edition_Panel_Blocs_Bulles.md`, `Edition_Panel_Deux_Modes.md`. | ✅ Livrée |
| 6 | Mode Structuré (blocs) | **Bibliothèque de blocs** à placer sur le panel (mode Architecture) ; images **générées à l'intérieur** de chaque bloc ; prompt + **sélection d'assets par bloc** (mode Édition). | ✅ Livrée |
| 7 | **Mode Édition : bulles, effets, fond, texte et lecture** | **Bibliothèque de bulles** (placement comme les blocs) ; **Menu Couleur** (modification couleur de fond) ; **bibliothèque d'effets** (profondeur, douceur, émotion, vivant) ; **ajout de texte** (typo). Rendu panel = blocs + overlay + fond personnalisé ; lecteur webtoon vertical. | 📋 À faire |

---

## 4. Tests à faire

Tests de non-régression et critères d'acceptation par étape. À exécuter ou à valider à chaque livraison.

| Étape | Tests / critères à valider |
|-------|----------------------------|
| **1** ✅ | **Non-régression** : ouverture onglet Édition de l'œuvre ; liste chapitres (vide ou non) ; création / réorganisation / suppression ; ouverture écran chapitre (shell). Numéro de chapitre = premier numéro libre après suppression. |
| **2** ✅ | Affichage chapitre texte à gauche, panels à droite ; Aperçu = surbrillance assets + hover fond opaque (même rendu que Scénario) ; lien `linked_scenario_chapter_id` (sélecteur si non lié, option « Aucun ») ; changement de chapitre → confirmation → enregistrement du lien (persistant) ; libellé select sans « ✓ suggéré » dans le trigger ; création chapitre avec suggestion par numéro, message si aucun chapitre textuel. |
| **3** ✅ | Création libre des panels (« Ajouter un panel ») ; message liberté de création (scénario = référence). Suggestion de panels (IA) et import de la suggestion (optionnels). Estimation indicative. Répartition N/N+1 = hors périmètre livré. |
| **4** ✅ | Suggestion déclenchable depuis Scénario (ou IA) ; import vers chapitre visuel (bouton « Importer la suggestion ») ; panels créés/mis à jour ; édition des descriptions possible. |
| **5** ✅ | Visualisation panel 720×5000 ; édition des blocs (position, taille, prompt par bloc) ; génération par bloc (dimensions = bloc) ; pas de génération tout le panel/chapitre ; régénération par bloc. |
| **6** ✅ | Bibliothèque de blocs (presets 500×500, 400×600, 720×400, etc.) ; placement sur panel par glisser-déposer ; description + **sélection d'assets par bloc** ; génération 1 image par bloc (avec noms des assets dans le prompt) ; double visualisation (Scénario + Assets pour ce bloc). |
| **7** | Bulles (overlay, types, édition texte/couleurs) ; narration ; effets de transition ; lignes de mouvement ; rendu final ; lecteur webtoon (défilement vertical, navigation chapitres). |

---

## 5. Références

- **Roadmap** : `07_Roadmap_Produit.md` — Phase 2 (Panels & Dialogues)
- **Édition panel (blocs + bulles)** : `Edition_Panel_Blocs_Bulles.md` — workflow, visualisation 720×5000, édition blocs, prompts par bloc, génération par bloc, bulles
- **Deux modes (Architecture / Édition)** : `Edition_Panel_Deux_Modes.md` — mode Architecture (position, dimensions des blocs), mode Édition (prompt, bulles, effets, fond, texte). Implémentation actuelle = vue unifiée.
- **Flux et règles** : `11_Rapport_Chapitres_Flux_Blocs_Scenario.md` — § 2 (flux Auto/Structuré), § 3.4 (double visualisation), § 3.5 (IA Panel)
- **UX** : `UX.md` — § 3.2 (Édition de l’œuvre)
- **Modèle de données** : `08_Modele_de_Donnees.md` — `chapters`, `panels`, `scenario_chapters`
- **API** : `09_Specifications_API.md` — § 3.2 `generate-panel-image` (génération par bloc)
- **Code** : `src/pages/ChapterDetail.tsx` (écran chapitre visuel), `src/services/panels.ts`, `src/hooks/usePanels.ts`, `supabase/functions/generate-panel-image/`

---

*Dernière mise à jour : 17 février 2026 — Étape 6 (Mode Structuré) livrée : bibliothèque de blocs, sélection d'assets par bloc, API avec block_asset_names.*
