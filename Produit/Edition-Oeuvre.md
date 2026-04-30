# Édition de l'œuvre — Documentation produit (document unique)

> **Fusion avril 2026** — Remplace : Plan_Phase2_Edition_Oeuvre, 11_Rapport_Chapitres_Flux_Blocs_Scenario, Edition_Case_Blocs_Bulles, Edition_Case_Deux_Modes, RefontEditeurdeloeuvre, Rapport_Etape5_Edition_Blocs. Références croisées : utiliser ce fichier.

---

## 0. Synthèse exécutive

| Sujet | Contenu |
|-------|---------|
| **Flux** | **Automatique** : génération **panel par panel**, assets du chapitre **obligatoires**, prompt = style + assets + courte description (**pas** le scénario brut). **Structuré** : blocs sur la case → prompt + assets par bloc → **1 image par bloc** (generate-panel-image). |
| **Scénario** | Section dédiée ; découpage chapitre → panels **optionnel** ; **jamais** injecter le texte complet du scénario dans le prompt image. |
| **Case** | Surface **800×H** ; images **dans les blocs** ; dimensions bloc → API. |
| **Refonte UX** | **Option B** livrée (23/04/2026) : pas d’onglets Architecture/Perso/Couleurs/Dialogue séquentiels ; accordéon + raccourcis **B / C / D / Esc** ; sidebar assets permanente. **Option A** : cible type Figma (refactor ChapterDetail) — voir Partie V. |
| **Étape 7 (plan)** | Bulles avancées partiellement ; blocs couleur ; effets ; lecteur webtoon ; export PDF — voir Partie I § Étape 7. |

---

# Partie I — Plan Phase 2 (jalons, tests, références)

# Plan Phase 2 — Édition de l'œuvre et lien textuel ↔ visuel

> Premier jalon : créer la section « Édition de l'œuvre ». L'utilisateur **crée librement** le nombre de cases qu'il souhaite pour le chapitre visuel ; le **chapitre textuel sert de référence**. Optionnellement : **suggestion de cases par IA** ou **import d'une suggestion** (liste + descriptions). **Contexte du chapitre** (lieu, scène, personnages) dans le prompt de chaque case ; **case 800×H** (hauteur configurable dans des bornes).

---

## 1. Contexte et objectif

### 1.1 Où on en est

- **Section Scénario** (onglet Scénario) : livrée. Chapitres texte (`scenario_chapters`), IA Scénario / IA Chapitre, **détection des assets dans le chapitre** (déjà en place).
- **Chapitres texte = chapitres webtoon** : 1 chapitre écrit = 1 chapitre webtoon (alignement conceptuel).

### 1.2 Ce qu'on vise en Phase 2

- **Section « Édition de l'œuvre »** : espace dédié où l'utilisateur construit le **webtoon visuel** à partir du scénario et des assets.
- **Lien textuel ↔ visuel** : à l'édition d'un chapitre visuel, afficher le **chapitre de scénario correspondant** (double visualisation : Scénario + Assets).
- **Liberté de création des cases** : l'utilisateur **crée le nombre de cases qu'il souhaite** (bouton « Ajouter une case »). Le **chapitre textuel** lui sert de **référence** ; l'agencement des cases et des blocs est **subjectif**. Chaque case est une **structure** 800×H (blocs pour les images, puis bulles et effets en couche). **Optionnel** : une **suggestion de cases par IA** (liste + descriptions) ou l'**import d'une suggestion** (depuis le scénario) pour pré-remplir les cases ; l'utilisateur peut ensuite ajouter ou supprimer des cases. Les **assets** sont déjà présents dans le chapitre textuel (détection déjà livrée).
- **Prompt de génération pour une case** : pour avoir lieu, scène et personnages cohérents, le **contexte du chapitre** (lieu, scène, personnages) doit être inclus dans le prompt de la case. Règle : **prompt = style + assets (du chapitre) + contexte du chapitre (lieu / scène / personnages) + description de la case**.
- **Dimensions d'une case** : **800 × hauteur variable** pixels (largeur fixe + hauteur configurable bornée). **La succession de cases** (empilées verticalement) **forme le chapitre visuel**.
- **Une case n'est pas qu'une image** : une case est une **structure** composée de **blocs** (contenant des images), de **texte** (bulles de dialogue), d'**effets de transition** et de **lignes de mouvement** (dynamiques, vitesse, impact, etc.). Voir § 1.4.
- **Estimation indicative** : la dimension case (800×H) peut servir à une estimation indicative du nombre de cases (affichée à titre d'information) ; l'utilisateur n'est pas tenu de s'y conformer.
- **Transformation chapitre textuel → chapitre visuel** :  
  **Chapitre texte** (référence à gauche) → **Édition de l'œuvre** : l'utilisateur **crée les cases** (une par une ou via une **suggestion IA / import** optionnel) → **succession de cases** (chaque case = blocs + bulles + effets) → **agencement des blocs** → prompts par bloc → **génération des images par bloc** (selon la forme du bloc) → **le chapitre = cette succession de cases**.

- **Visualisation de la case** : en édition, chaque case est affichée en visualisation immersive (plein écran), avec canvas central 800×H. **Les images sont générées dans les blocs.** L'édition est organisée par sous-menus visuels (Personnalisation, Couleurs, Dialogue). Voir `Edition-Oeuvre.md` (Parties III–IV).

Références : `07_Roadmap_Produit.md` Phase 2, `Edition-Oeuvre.md` (Parties II–IV), `UX.md` § 3.2.

### 1.3 Dimensions d'une case — le chapitre = succession de cases

| Élément | Définition |
|--------|-------------|
| **Dimensions d'une case** | **800 × hauteur variable** (largeur fixe, hauteur bornée). |
| **Une case** | **Structure** de taille 800×H comprenant : **blocs** (avec images), **bulles de texte**, **effets de transition**, **lignes de mouvement** (voir § 1.4). |
| **Le chapitre visuel** | **Succession de cases** : l'empilement vertical des cases constitue le chapitre. |

La dimension 800×H définit la **surface** dans laquelle s'organisent blocs, bulles et effets ; une estimation indicative du nombre de cases peut en découler (non contraignante).

### 1.4 Structure d'une case (blocs, texte, effets)

Une **case** (800×H) est constituée des éléments suivants. L'utilisateur **crée les cases** (à la main ou en important une suggestion) ; chaque case est ensuite remplie (blocs, images, texte, effets).

| Composant | Description |
|-----------|-------------|
| **Blocs** | Zones de la case contenant des **images** (illustrations générées). **C'est dans les blocs que les images sont générées.** Une case contient un ou plusieurs blocs. **Mode Automatique** : agencement automatique. **Mode Structuré** : l'utilisateur travaille en **deux modes** — **Architecture** (ajout, position, dimensions des blocs) et **Édition** (prompt par bloc avec détection des assets, bulles, effets, fond, texte). Bibliothèque de blocs à placer ; images générées **à l'intérieur** de chaque bloc. Chaque bloc : position, taille, prompt, assets, image_url. |
| **Blocs de couleurs** | **Même système que les blocs d'architecture** (position, dimensions), mais pour la **couleur** : remplir les **espaces entre les blocs d'image** par des zones de couleur. Le fond de la case est important en webtoon pour signifier l'ambiance (nuit, tension, flash-back). Par bloc couleur : couleur unie ou dégradé ; pas de génération d'image. Rendu : blocs couleur en arrière-plan, blocs image par-dessus. |
| **Texte (bulles et brut)** | **Bulles de dialogue** (parole, pensée, cri, chuchotement), **narration** — placement depuis une base de bulles (formes/types prédéfinis). **Texte brut (sans bulle)** : texte libre dans la case (narration, titres, onomatopées) avec **choix police / font, taille**, couleur. Les deux : position par drag & drop, **personnalisation typographique** (police, taille, couleur). |
| **Effets de transition** | Effets visuels entre moments ou entre cases (à définir : fondu, coupure, etc.). Ajout **côté client** (hors image), en overlay. |
| **Lignes de mouvement** | Effets graphiques pour l'intensité et le dynamisme : **lignes dynamiques** (tension, intensité), **lignes de vitesse** (course, coup rapide), **lignes d'impact** (coup, explosion, choc), **effets de vitesse** (terme général). Ajout **côté client** (hors image), en overlay. |

**Implémentation (bulles, transitions, lignes de mouvement)** — principe retenu :

| Élément | Description | Détail |
|--------|-------------|--------|
| **Blocs (mode Structuré)** | **Bibliothèque de blocs** à placer sur la case. | Base de blocs (formes / layouts prédéfinis) ; l'utilisateur **place** les blocs (drag & drop) ; les **images sont générées à l'intérieur** de chaque bloc. Données : `panels.layout` (JSONB) avec positions, tailles, type_bloc, prompt, image_url par bloc. |
| **Bulles de dialogue** | **Ajout côté client** (overlay sur la case). | Création d'une **base de bulles** (bibliothèque de formes/types : parole, pensée, cri, chuchotement, narration). L'utilisateur **place** les bulles sur la case ; pour chaque bulle : **texte éditable**, **couleur du contour**, **couleur de l'intérieur** (personnalisables). Données : positions, styles, contenu (JSONB par case, ex. `speech_bubbles`). |
| **Texte brut (sans bulle)** | **Ajout côté client** (overlay sur la case). | Texte libre dans la case **sans forme de bulle** (narration, titres, onomatopées). **Police / font**, **taille**, couleur éditables. Placement par drag & drop. Stockage : ex. `panel_text_elements` ou tableau dédié (JSONB). |
| **Blocs de couleurs** | **Même principe que blocs architecture** (position, dimensions). | Zones de **couleur** (unie ou dégradé) pour remplir les **espaces entre les blocs d'image** ; ambiance de la case (webtoon). Pas de génération d'image. Stockage : ex. `color_blocks` (JSONB) ou extension de `layout`. Rendu : calque arrière-plan sous les blocs image. |
| **Effets (transitions, lignes de mouvement)** | **Ajout côté client** (hors des images, en overlay). | Couches superposées aux images ; positions, types, styles stockés en JSONB par case. Modifiable sans régénérer l'image. L'intégration de certains effets *dans* l'image (ex. lignes d'impact via prompt) reste une **évolution ultérieure**. |

**Recommandation** : **bulles et effets = toujours côté client** (couche d'ajout, overlay). Pas d'intégration des bulles ou des effets dynamiques dans l'image générée pour la version courante ; évolution possible plus tard pour certains effets visuels optionnels (option B partielle).

### 1.5 Prévisualisation et téléchargement chapitre visuel

- **Prévisualisation** : La **prévisualisation** (vue lecture des cases dans l'édition du chapitre) doit **reprendre tous les éléments édités** — blocs image, **blocs de couleurs**, et à terme bulles, texte brut, effets — pour que l'utilisateur voie exactement le rendu final.
- **Téléchargement chapitre visuel (PDF)** : Objectif à terme (Phase 3) : **télécharger le chapitre en PDF**, avec la succession des cases et tous les éléments (blocs, couleurs, bulles, texte). La prévisualisation est alignée sur ce rendu exporté.

---

## 2. Étapes du plan

**État d'avancement** : **Étapes 1 à 6** = ✅ livrées (février 2026). **Étape 7** = 📋 à faire. Voir § 3 (synthèse) et § 4 (tests à faire).

**État réel du code (écarts connus)** :
- **Étape 3** : L'utilisateur **crée librement** le nombre de cases (« Ajouter une case »). **Suggestion de cases (IA)** et **Importer la suggestion** sont optionnels. Une **estimation indicative** du nombre de cases (à partir du contenu texte) peut être affichée ; elle n'est pas contraignante. La **répartition N/N+1** (prendre du chapitre N+1 / céder au N+1) n'est **pas implémentée** — à prévoir en complément ou en Étape ultérieure.
- **Étape 5** : Vue unifiée consolidée : modale immersive plein écran, canvas central 800×H, sous-menus par pictos (gauche) et chapitre textuel dédié (droite). Prompt par bloc = Textarea dans le panneau latéral ; **aperçu des mentions d'assets** (surbrillance + hover) sous le prompt du bloc via `ScenarioTextHighlighter`. **Contexte chapitre** (lieu, scène, personnages) : envoyé à l'API depuis la suggestion (`panels_outline[].context`) ou la description de la case. Suppression = bouton au survol sur le bloc (canvas) + bouton dans le panneau latéral.

---

### Étape 1 — Créer la section « Édition de l'œuvre » ✅ Livrée

**Statut** : livrée.

**Objectif** : Exister en tant qu'espace produit et entrée utilisateur, sans encore lier au scénario ni générer d'images.

| Livrable | Description |
|----------|-------------|
| **Onglet / entrée** | Dans la page détail projet : nouvel onglet **« Édition de l'œuvre »** (ou « Œuvre » / « Chapitres visuels ») à côté de Style, Assets, Scénario. |
| **Liste des chapitres visuels** | Affichage des chapitres du projet issus de la table `chapters` (chapitres webtoon). Création, réorganisation (drag & drop), suppression. Ordre = `chapter_number`. |
| **Vue vide / état initial** | Si le projet n'a aucun chapitre visuel : message d'accueil + CTA « Créer un chapitre » (titre, optionnellement choix du mode : Automatique / Structuré, à préciser plus tard). |
| **Ouverture d'un chapitre** | Clic sur un chapitre → écran d'édition du chapitre. Chaque **case** est une structure 800×H (blocs, bulles, effets) ; en Étape 1 : écran **shell** (liste des cases vide ou placeholder), pas encore de génération ni de double visualisation. |
| **Modèle de données** | Tables `chapters` et `panels` (voir `08_Modele_de_Donnees.md`). Une **case** : largeur 800 + hauteur configurée ; `layout` (JSONB) = blocs avec images ; `speech_bubbles` (JSONB) = bulles ; prévoir champs ou JSONB pour **effets de transition** et **lignes de mouvement**. Ajout si besoin : `chapters.linked_scenario_chapter_id` (FK → `scenario_chapters.id`, NULLABLE). |

**Critères de succès** : l'utilisateur peut ouvrir l'onglet « Édition de l'œuvre », voir la liste des chapitres visuels (ou vide), créer un chapitre, entrer dans l'écran d'édition d'un chapitre (structure prête pour les étapes suivantes). *Tests* : voir § 4.

---

### Étape 2 — Lien chapitre textuel ↔ chapitre visuel (double visualisation) ✅ Livrée

**Objectif** : En édition d'un chapitre visuel, afficher le **chapitre de scénario correspondant** (à gauche) pour garder le contexte pendant la saisie des descriptions de cases et la génération. Les **assets** sont visibles dans le texte via le même **Aperçu** que dans la section Scénario (surlignage + hover), sans panneau Assets dédié.

| Livrable | Description |
|----------|-------------|
| **Disposition** | Chapitre texte en colonne dédiée, cases au centre. Sur mobile : chapitre texte au-dessus des cases. |
| **Panneau « Chapitre texte »** | Colonne de gauche affichant le **texte du chapitre de scénario** lié. **Même visualisation que l'Aperçu** de la section Scénario : surbrillance des assets (personnages, décors, objets) dans le texte, **hover pour afficher l'asset** (image + infos). Repliable (accordéon) ; par défaut ouvert. |
| **Lien chapitre visuel ↔ chapitre texte** | Si `chapters.linked_scenario_chapter_id` est renseigné : à l'ouverture du chapitre visuel, chargement et affichage automatique du contenu de ce chapitre de scénario. Sinon : **sélecteur** (liste des chapitres de scénario du projet) pour choisir quel chapitre afficher ; option d'**enregistrer** ce choix comme lien pour ce chapitre visuel. |
| **Assets dans le texte** | Pas de panneau « Assets » séparé. Les assets sont **visibles dans le chapitre texte** via l'Aperçu (détection des mentions + surbrillance + hover pour voir l'élément). Cohérent avec la section Scénario (Chapitre → Aperçu). |
| **Données** | Migration : `linked_scenario_chapter_id` sur `chapters` (FK → `scenario_chapters.id`, NULLABLE). |

**Assets dans le chapitre texte — fonctionnement**

- **Ce que c'est** : les **assets** = personnages, décors, objets du projet (créés dans l'onglet Assets). Ils sont **détectés dans le texte** du chapitre de scénario : dès qu'un nom d'asset apparaît dans le paragraphe, il est reconnu.
- **Où on les voit** : dans le panneau « Chapitre texte » (à gauche en Édition de l'œuvre), **même rendu que l'Aperçu** en section Scénario : les mentions sont **surlignées** ; au **survol** (hover), une infobulle montre l'asset (image + infos). Pas de panneau « Assets » à part : tout passe par le texte.
- **À quoi ça sert** : (1) **référence** pendant l'édition des cases et des blocs ; (2) **génération d'images** : le prompt = style + **assets** (sélectionnés par l'utilisateur pour le bloc ou le chapitre) + contexte du chapitre + description. Les assets servent à cadrer la scène et à ce que l'IA dessine les bons éléments.

**Ce qui a été oublié / à compléter (résumé)**

| Point | Explication courte |
|-------|--------------------|
| **Répartition N/N+1** | Répartir le contenu entre chapitre texte N et N+1 (trop court → prendre du N+1 ; trop long → céder au N+1). **Non implémenté** ; à prévoir en complément. |
| **Éléments mentionnés non créés** | Dans le scénario, des noms peuvent apparaître sans qu'un asset existe encore. Détection prévue (section Scénario) ; **création depuis le texte** (panneau dédié, bouton « Créer l'asset ») = à finaliser / clarifier. |
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

Référence détaillée : `Edition-Oeuvre.md` (Partie II) § 3.4 et 3.4.1.

---

### Étape 3 — Liberté de création des cases + suggestion optionnelle (IA) ✅ Livrée

**Objectif** : Implémenter une **création libre des cases** qui, à partir d'un **chapitre textuel**, produit une **succession de cases** (liste + description par case). L'utilisateur **crée** le chapitre visuel dans l'Édition de l'œuvre. Les **assets** du chapitre sont déjà connus (détection dans le scénario, fonctionnalité livrée).

| Livrable | Description |
|----------|-------------|
| **Création libre des cases** | Entrée : contenu du chapitre textuel (lié au chapitre visuel). Sortie : **liste ordonnée de cases**, chacune avec une **courte description** (lieu, scène, personnages, action). Cette liste définit la **succession de cases** qui **forme le chapitre visuel**. Chaque case est une **structure** 800×H (blocs à remplir avec des images + bulles + effets à ajouter ensuite). |
| **Estimation indicative** | Utiliser la **dimension case 800×H** pour estimer le **nombre de cases** et la répartition du contenu (ex. une unité narrative ou une scène par case, en fonction de la longueur du chapitre). |
| **Suggestion de cases (IA)** | **Optionnel** : par **IA** (LLM : chapitre → liste de cases avec descriptions) et/ou **manuel** (l'utilisateur définit les cases dans la section Scénario ou dans l'Édition de l'œuvre). Stockage : colonne JSONB sur `scenario_chapters` ou table dédiée ; synchronisation avec les enregistrements `panels` du chapitre visuel (chaque case = conteneur 800×H avec `layout.blocs` à remplir). |
| **Import de la suggestion** | Lors de la création (ou de l'édition) d'un chapitre visuel lié à un chapitre texte : **appliquer le découpage** pour créer la **succession de cases** (enregistrements `panels` avec description / prompt par case ou par bloc). Chaque case démarre avec une structure vide (blocs à définir, pas encore d'images) ; l'utilisateur remplit les blocs, ajoute bulles et effets, puis lance la génération des images. |
| **Contexte du chapitre dans le prompt** | Pour chaque case, le **prompt de génération** doit inclure : **style + assets (du chapitre) + contexte du chapitre (lieu, scène, personnages) + description de la case**. Le contexte permet à l'IA d'image d'avoir lieu, scène et personnages cohérents. |

**Optionnel (complément)** : action « IA Case » pour **suggérer ou réécrire** la description d'une case individuelle (contexte scénario + assets) ; accepter / rejeter. Le prompt d'image reste : style + assets + **contexte chapitre** + description de la case.

**Implémentation livrée** : bouton « Ajouter une case » (création d'une case vide) ; message « Liberté de création » (scénario = référence, agencement subjectif) ; boutons « Suggestion de cases (IA) » et « Importer la suggestion » (optionnels) ; estimation indicative affichée à titre d'information. **Répartition N/N+1** (actions prendre/céder contenu entre chapitres) = non implémentée (complément possible).

---

### Étape 4 — Liaison suggestion ↔ Édition de l'œuvre (section Scénario) ✅ Livrée

**Objectif** : Proposer une **suggestion de cases** depuis la section Scénario (par chapitre texte) et l'**importer** dans l'Édition de l'œuvre pour pré-remplir la succession de cases. L'utilisateur reste **libre** de créer ses cases à la main sans utiliser cette suggestion.

| Livrable | Description |
|----------|-------------|
| **Suggestion dans la section Scénario** | Par chapitre de scénario : déclencher une **suggestion de cases** (IA ou manuel) ; liste de cases + descriptions. Stockage en BDD. |
| **Import vers Édition de l'œuvre** | Depuis un chapitre visuel lié à ce chapitre texte : bouton **« Importer la suggestion »** pour créer / mettre à jour la **succession de cases** avec les descriptions issues de la suggestion. L'utilisateur peut **ajouter ou supprimer** des cases ensuite : la suggestion est une **base optionnelle**, pas une contrainte. |
| **Édition des descriptions** | Dans l'Édition de l'œuvre, chaque case reste éditable (description, puis génération avec contexte chapitre + assets + description). Liberté du nombre de cases et du contenu. |

Référence : roadmap Phase 2 § 2.1, rapport § 3.2.

---

### Étape 5 — Édition des blocs et génération par bloc (mode Architecture + base Édition) ✅ Livrée

**Statut** : livrée.

**Objectif** : **Les images sont générées dans les blocs.** Implémentation actuelle : sous-menus d'édition (Personnalisation, Couleurs, Dialogue) avec actions structurelles de blocs conservées. Par défaut **aucun bloc** ; l'utilisateur **ajoute des blocs par glisser-déposer** (bloc **500×500** déposé sur la case), **déplace** les blocs par glisser-déposer, **édite** la largeur/hauteur de chaque bloc, renseigne un **prompt par bloc**, puis **génère l'image** par bloc. Visualisation **800×H** avec fond quadrillé. Détail : `Edition-Oeuvre.md` (Parties III–IV).

| Livrable | Description |
|----------|-------------|
| **Par défaut : aucun bloc** | À la création / import des cases, `layout.blocks = []`. Les blocs sont ajoutés par l'utilisateur. |
| **Ajout par glisser-déposer** | Source « Bloc 500×500 » déposée sur la case → création d'un bloc 500×500 à la position de dépôt. Option : bouton « Ajouter en (0,0) ». |
| **Déplacement par glisser-déposer** | Chaque bloc est déplaçable sur le canvas de la case ; la position (x, y) est mise à jour au dépôt. |
| **Édition des dimensions** | Par bloc : **largeur** et **hauteur** éditables (champs + « Appliquer dimensions »). Bloc par défaut : 500×500. |
| **Prompt et génération** | **Prompt** éditable par bloc (dans le panneau latéral) ; bouton « Générer » → image générée et affichée **dans le bloc**. **OBLIGATOIRE** : l'image générée utilise les **dimensions du bloc concerné** (largeur × hauteur). Prompt = style + (optionnel contexte chapitre, à brancher) + prompt du bloc. |
| **Visualisation case 800×H** | Fond quadrillé ; blocs délimités (bordure, ombre) ; scroll vertical si besoin. |
| **Suppression** | Bouton « Supprimer » par bloc. |
| **Contraintes** | Pas de génération « tout le chapitre » ni « toute la case ». Régénération possible par bloc. |
| **Bulles, effets, fond, texte** | Voir Étape 7 et `Edition-Oeuvre.md` (Partie IV). |

**Implémentation actuelle (détails livrés)** : **Vue unifiée immersive** : modale plein écran, canvas central 800×H (fond quadrillé, scroll vertical) + colonnes latérales (sous-menus à gauche, chapitre textuel à droite). Prévisualisation 500×500 pendant le glisser d'un nouveau bloc ; **placement par centre** (centre du bloc au point de dépôt) ; **suppression** : bouton au survol sur le bloc (canvas, ~25 % depuis le bas, centré) + bouton dans le panneau latéral ; **poignées de redimensionnement** (8 : 4 bordures 9 px, 4 coins 15 px), curseurs adaptés ; **génération par bloc** : Edge Function `generate-panel-image`, dimensions du bloc envoyées, **contexte chapitre** envoyé (depuis `panels_outline[].context` ou description de la case), instruction « remplir tout le cadre », stockage `{user_id}/projects/{project_id}/panels/{panel_id}/blocks/{block_id}.png`. **Aperçu des mentions d'assets** dans le prompt du bloc : sous le champ prompt, affichage du texte avec surbrillance des assets (même composant que l'Aperçu scénario) et hover pour afficher l'asset.

---

### Étape 6 — Mode Structuré (blocs) ✅ Livrée

**Objectif** : Chapitre visuel en mode **Structuré** : l'utilisateur **place** des **blocs** depuis une **bibliothèque de blocs** (formes / emplacements prédéfinis) sur chaque case ; les **images sont générées à l'intérieur** de chaque bloc. Par bloc : description + **sélection d'assets** ; génération **1 image par bloc**.

| Livrable | Description |
|----------|-------------|
| **Bibliothèque de blocs** | **Base de blocs** (formes / layouts prédéfinis) : l'utilisateur **place** les blocs sur la case (drag & drop depuis la bibliothèque). Chaque bloc a position, taille (définies par le type ou ajustables). Modèle : `panels.layout` (JSONB) avec `blocks[]` (x, y, width, height, type_bloc, prompt, asset_refs, image_url). |
| **Remplissage des blocs** | Par bloc : champ **description** (éditable ; IA Case réutilisable) + **sélection d'assets** pour ce bloc. |
| **Génération 1 image par bloc** | Bouton de génération par bloc. Prompt = style + assets du bloc + **contexte du chapitre (lieu, scène, personnages)** + description du bloc. Les **images sont générées à l'intérieur** de chaque bloc ; image stockée et affichée **dans** le bloc. **OBLIGATOIRE** : l'espace de l'image doit prendre les **dimensions du bloc concerné** (largeur × hauteur) ; l'API reçoit ces dimensions. |
| **Double visualisation** | Panneau Scénario + panneau Assets (par bloc ou par chapitre) disponible comme en mode Auto. |

**Implémentation livrée** : Bibliothèque de blocs (presets 500×500, 400×600, 720×400, 350×500, 600×400) dans le panneau latéral ; glisser-déposer crée un bloc aux dimensions du preset. En mode Personalisation, « Assets pour ce bloc » (cases à cocher) ; `asset_refs` stocké dans le bloc. Edge Function reçoit `block_asset_names` et les injecte dans le prompt.

---

### Étape 7 — Mode Édition : bulles, effets, fond, texte et lecture 📋 À faire

**Objectif** : En **mode Édition**, compléter chaque case avec **bibliothèque de bulles** (placement comme les blocs), **bibliothèque d'effets**, **couleur de fond**, **ajout de texte** (typo). Ces éléments forment une **couche d'ajout** sur les images (overlay) ; option ultérieure : intégration partielle à l'image. Puis lecteur webtoon (défilement vertical).

| Livrable | Description |
|----------|-------------|
| **Bibliothèque de bulles** | **Mode Édition.** Bibliothèque de formes/types (parole, pensée, cri, chuchotement, narration). **Même comportement que les blocs** : glisser-déposer depuis la bibliothèque sur la case. Par bulle : **texte éditable**, couleur contour/intérieur, police, taille. Stockage `panels.speech_bubbles` (JSONB). |
| **Menu Couleur** | **Mode Édition.** **Menu dédié** pour modifier la couleur de fond de la case : sélecteur de couleur (couleur unie ou dégradé), aperçu en temps réel. Stockage dans la case (ex. `panels.background_color` ou `panels.background_style`). |
| **Bibliothèque d'effets** | **Mode Édition.** **Bibliothèque d'éléments visuels** pour enrichir la case et donner de la profondeur, douceur, émotion et vivant à l'œuvre. Effets organisés par catégories : **profondeur** (ombres portées, lumières directionnelles, atmosphère), **douceur** (flou artistique, transitions douces, brume), **émotion** (météo, ambiances colorées, filtres), **vivant** (lignes de mouvement, particules, dynamisme). Choix dans la bibliothèque et application sur la case. Positions, types, styles, intensité en JSONB (ex. `panels.effects`). |
| **Effets de transition** | **Ajout côté client** (hors des images, overlay). Effets entre cases ou à l'intérieur d'une case (fondu, coupure, etc.). Positions, types, styles en JSONB par case. |
| **Lignes de mouvement** | **Ajout côté client** (hors des images, overlay). Lignes dynamiques (tension, intensité), lignes de vitesse, lignes d'impact, effets de vitesse. Positions, styles, types stockés en JSONB par case (ex. `panels.motion_lines` ou `panels.effects`). Évolution possible : demander certaines lignes d'impact **dans le prompt d'image** (intégré). |
| **Rendu final de la case** | Composition : image(s) des blocs + overlay (bulles + effets + texte libre) + fond (couleur personnalisée via Menu Couleur). Dimensions case 800×H respectées. |
| **Lecteur webtoon** | Vue lecture : défilement vertical, succession de cases ; navigation entre chapitres (précédent / suivant). |

---

## 3. Synthèse : ordre des étapes

| Ordre | Étape | Résumé | Statut |
|-------|--------|--------|--------|
| **1** | **Créer la section « Édition de l'œuvre »** | Onglet, liste chapitres visuels, écran d'édition chapitre (shell). Lien BDD `chapters` ↔ `scenario_chapters` si besoin. | ✅ Livrée |
| 2 | Lien textuel ↔ visuel (double visualisation) | Chapitre texte en colonne dédiée (Aperçu = surbrillance assets + hover), cases au centre ; lien `linked_scenario_chapter_id`. Pas de panneau Assets dédié. | ✅ Livrée |
| 3 | **Liberté de création des cases + suggestion optionnelle** | L'utilisateur crée le nombre de cases qu'il souhaite (« Ajouter une case ») ; scénario = référence. **Optionnel** : suggestion de cases (IA), import de la suggestion. Estimation indicative (non contraignante). Répartition N/N+1 = non implémentée. | ✅ Livrée |
| 4 | Liaison suggestion ↔ Édition de l'œuvre | Suggestion depuis la section Scénario (ou IA) ; import vers chapitre visuel (création/mise à jour des cases). Base optionnelle. | ✅ Livrée |
| 5 | **Édition blocs + génération par bloc** | **Vue unifiée immersive** : canvas 800×H + sous-menus latéraux. Ajout, position, dimensions des blocs (glisser-déposer, poignées) ; prompt par bloc ; génération par bloc (dimensions = bloc). Voir `Edition-Oeuvre.md` (Parties III–IV). | ✅ Livrée |
| 6 | Mode Structuré (blocs) | **Bibliothèque de blocs** à placer sur la case (mode Architecture) ; images **générées à l'intérieur** de chaque bloc ; prompt + **sélection d'assets par bloc** (mode Édition). | ✅ Livrée |
| 7 | **Mode Édition : blocs de couleurs, bulles, texte brut, effets, fond et lecture** | **Blocs de couleurs** (même principe que blocs architecture, remplir espaces entre blocs pour ambiance) ; **Menu Couleur** (fond global) ; **bulles** (dans la case, police/taille) ; **texte brut sans bulle** (police, taille) ; **bibliothèque d'effets** ; rendu = blocs couleur + blocs image + overlay ; lecteur webtoon vertical. | 📋 À faire |

---

## 4. Tests à faire

Tests de non-régression et critères d'acceptation par étape. À exécuter ou à valider à chaque livraison.

| Étape | Tests / critères à valider |
|-------|----------------------------|
| **1** ✅ | **Non-régression** : ouverture onglet Édition de l'œuvre ; liste chapitres (vide ou non) ; création / réorganisation / suppression ; ouverture écran chapitre (shell). Numéro de chapitre = premier numéro libre après suppression. |
| **2** ✅ | Affichage chapitre texte en colonne dédiée ; Aperçu = surbrillance assets + hover fond opaque (même rendu que Scénario) ; lien `linked_scenario_chapter_id` (sélecteur si non lié, option « Aucun ») ; changement de chapitre → confirmation → enregistrement du lien (persistant) ; libellé select sans « ✓ suggéré » dans le trigger ; création chapitre avec suggestion par numéro, message si aucun chapitre textuel. |
| **3** ✅ | Création libre des cases (« Ajouter une case ») ; message liberté de création (scénario = référence). Suggestion de cases (IA) et import de la suggestion (optionnels). Estimation indicative. Répartition N/N+1 = hors périmètre livré. |
| **4** ✅ | Suggestion déclenchable depuis Scénario (ou IA) ; import vers chapitre visuel (bouton « Importer la suggestion ») ; cases créées/mises à jour ; édition des descriptions possible. |
| **5** ✅ | Visualisation case 800×H ; édition des blocs (position, taille, prompt par bloc) ; génération par bloc (dimensions = bloc) ; pas de génération toute la case/chapitre ; régénération par bloc. |
| **6** ✅ | Bibliothèque de blocs (presets 500×500, 400×600, 720×400, etc.) ; placement sur case par glisser-déposer ; description + **sélection d'assets par bloc** ; génération 1 image par bloc (avec noms des assets dans le prompt) ; double visualisation (Scénario + Assets pour ce bloc). |
| **7** | Blocs de couleurs (remplir espaces entre blocs, ambiance) ; Menu Couleur (fond global) ; bulles (texte, police, taille) ; texte brut sans bulle (police, taille) ; effets de transition ; lignes de mouvement ; rendu final ; lecteur webtoon (défilement vertical, navigation chapitres). |

---

## 5. Références

- **Roadmap** : `07_Roadmap_Produit.md` — Phase 2 (Cases & Dialogues)
- **Édition case (blocs + bulles)** : `Edition-Oeuvre.md` (Partie III) — workflow, visualisation 800×H, édition blocs, prompts par bloc, génération par bloc, bulles
- **Sous-menus d'édition** : `Edition-Oeuvre.md` (Partie IV) — Personnalisation, Couleurs, Dialogue (vue immersive unifiée).
- **Flux et règles** : `Edition-Oeuvre.md` (Partie II) — § 2 (flux Auto/Structuré), § 3.4 (double visualisation), § 3.5 (IA Case)
- **UX** : `UX.md` — § 3.2 (Édition de l'œuvre)
- **Modèle de données** : `08_Modele_de_Donnees.md` — `chapters`, `panels`, `scenario_chapters`
- **API** : `09_Specifications_API.md` — § 3.2 `generate-panel-image` (génération par bloc)
- **Code** : `src/pages/ChapterDetail.tsx` (écran chapitre visuel), `src/services/panels.ts`, `src/hooks/usePanels.ts`, `supabase/functions/generate-panel-image/`

---

*Dernière mise à jour : 21 février 2026 — Étape 7 précisée : blocs de couleurs (ambiance case), bulles + texte brut (police/taille) dans la case. Réf. roadmap § 2.2.3, 2.2.4.*


---

# Partie II — Rapport : flux Structuré / Automatique, scénario, double visualisation

# Rapport — Chapitres : flux Structuré / Automatique, blocs et place du scénario

> Deux flux (Automatique / Structuré), images pleines dans des blocs, place du scénario. Liberté de création des cases ; suggestion Chapitre → Cases **optionnelle**.

---

## 1. Synthèse des décisions

| Décision | Choix |
|----------|--------|
| **Flux** | Deux modes : **Automatique** (suggestion IA → cases **optionnelle**, génération **case par case**) et **Structuré** (chapitre vide → blocs → texte + assets → génération). L'utilisateur crée librement le nombre de cases. |
| **Images** | Chaque image générée est une **illustration pleine** (pas de “cases” ou blocs dessinés dans l’image). Les blocs sont des **zones de mise en page** dans l’app : on y affiche une image par bloc. |
| **Blocs** | En mode Structuré : l’utilisateur définit des blocs (position, taille, forme rectangle en v1). Chaque bloc a un contenu texte (prompt) et des refs assets. À la génération : **1 image par bloc** → l’image est ensuite affichée **dans** ce bloc. **OBLIGATOIRE** : l'image générée utilise les dimensions du bloc concerné (largeur × hauteur) pour l'espace de l'image. |
| **Scénario** | **Section à part entière** : écrire son histoire. **IA Scénario** : **un prompt = un chapitre** généré ; l'utilisateur construit son histoire chapitre par chapitre, accepter crée le chapitre. **IA Chapitre** : par chapitre existant, IA qui n'intervient que sur ce chapitre ; même flux accepter/rejeter. Détection assets (surbrillance + hover) et éléments non créés. Jamais le scénario dans le prompt d'image. Voir section 3. |
| **Prompts d'image** | Uniquement **assets sélectionnés** + éventuellement **courte description par case** (issue du découpage ou saisie). Le scénario/synopsis **n'est pas** injecté dans le prompt. |
| **Génération case par case** | Mode Automatique : génération **au minimum case par case**. Impossible de générer un chapitre entier sans erreurs ou limites (quota, timeouts, API). |
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
2. Il définit la **structure** du chapitre : création de **panels**, puis pour chaque panel, en **mode Architecture**, création de **blocs** (rectangles : position x,y, largeur, hauteur). Aucune image n’est générée à ce stade.
3. En **mode Édition**, pour chaque bloc : il **rédige** une description (prompt) — avec **détection des assets** dans le texte comme dans le scénario — et **sélectionne les assets** (personnages, décors, objets) à utiliser pour ce bloc. **Cette sélection est primordiale** : elle cadre la génération et permet à l'IA de savoir quels éléments inclure. Les refs assets sont injectées dans le prompt à la génération.
4. Une fois la structure et les textes (avec assets) prêts, il lance la **génération** : **1 image par bloc**. L'API reçoit les **dimensions du bloc** (largeur × hauteur) et une **instruction** pour que l'image **remplisse tout le cadre** (pas de bandeaux ni bandes séparatrices). Chaque image est stockée par bloc (ex. Storage `panels/{panel_id}/blocks/{block_id}.png`) et affichée dans le bloc.
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

## 3. Scénario — section dédiée, chapitres = webtoon, suggestion Chapitre → Panels (optionnelle)

### 3.1 Définitions

| Terme | Définition | Usage |
|-------|------------|--------|
| **Scénario** | **Section à part entière** du produit : l'utilisateur y **écrit** son histoire ou **importe** un scénario (format texte : fichier .txt ou copier-coller). Texte narratif : actions, lieux, personnages, dialogues. | Découpage en **chapitres** (correspondant aux chapitres webtoon), puis **Chapitre → Panels** (liste + descriptions) dans la section Scénario. **Jamais** le texte brut injecté dans le prompt de génération d'image. |
| **Chapitres (section Scénario)** | Chapitres **écrits** dans la section Scénario. Ils **correspondent** aux chapitres du webtoon : **un chapitre écrit = un chapitre webtoon**. Titres, ordre, contenu texte. | Permettent de générer panel par panel l'histoire : chaque chapitre (texte) peut être découpé en panels (liste + descriptions) dans la section Scénario ; une suggestion de panels peut alimenter l'Édition de l'œuvre (optionnel). |
| **Suggestion Chapitre → Panels** | **Optionnel** : au sein de la section Scénario (ou en Édition de l'œuvre), pour **chaque chapitre** (texte), une **suggestion** en **panels** : liste avec courte description par panel. L'utilisateur crée librement le nombre de panels ; la suggestion est une base possible. **Règles de gestion** (IA, manuel) à **définir plus tard**. |
| **Édition de l'œuvre** | Partie **visuelle** du produit : chapitres webtoon (alignés sur les chapitres écrits) et panels. C'est là que l'utilisateur construit le webtoon à partir du scénario et des assets. | Lors de l'édition d'un panel : double visualisation (chapitre texte correspondant + assets). Voir 3.4. |
| **Synopsis** | Résumé court du chapitre (quelques phrases). Présent en BDD (`chapters.synopsis`). | Référence auteur ; peut servir d'entrée au découpage IA. **Pas** utilisé dans le prompt d'image. |

### 3.2 Contenu de la section Scénario

- **Saisie** : l'utilisateur écrit son scénario dans la section « Scénario » **ou** importe un scénario (fichier texte .txt ou copier-coller).
- **Chapitres = chapitres webtoon** : les chapitres créés dans la section Scénario **correspondent** aux chapitres du webtoon (un chapitre écrit = un chapitre webtoon). L'utilisateur crée et structure ces chapitres (titres, ordre, contenu texte) ; cette structure sert directement à l'Édition de l'œuvre et à la génération panel par panel.
- **Découpage Chapitre → Panels (dans la section Scénario)** : pour chaque chapitre (texte), un **découpage en panels** est réalisé **directement dans la section Scénario** : liste de panels avec courte description par panel. Ce découpage alimente la génération panel par panel en Édition de l'œuvre. Les **règles de gestion** de ce découpage (qui découpe : utilisateur, IA, les deux ; critères ; édition manuelle, etc.) sont à **définir plus tard**.
- **Détection des assets déjà créés dans le scénario** : le texte du scénario est analysé pour repérer les **mentions d'assets existants** (personnages, décors, objets) de la bibliothèque du projet. Exemple : « Jean est dans la ville principale avec une épée » → **Jean** (asset personnage), **ville principale** (asset décor), **épée** (asset objet) sont détectés s'ils existent. Ces mentions sont **mises en surbrillance** dans l'éditeur de scénario (style distinct selon le type : personnage / décor / objet). **Au survol (hover)** sur une mention, l'**image de l'asset** correspondant s'affiche (tooltip ou popover) pour rappel visuel.
- **Détection par l'IA des éléments non encore créés** : une **IA** (règles de correspondance noms d'assets + LLM si besoin) détecte dans le scénario les **éléments** (personnages, décors, objets) qui sont **mentionnés mais pas encore créés** comme assets dans la bibliothèque. Ces éléments sont **signalés** dans le scénario (surbrillance distincte, ex. « à créer » ou liste dédiée « Éléments mentionnés non créés ») pour que l'utilisateur puisse créer les assets manquants et garder la cohérence narrative.
- **IA LLM — Scénariste (agent)** : une **IA LLM** est intégrée pour aider l'utilisateur à **construire son histoire**, avec un **system prompt** dédié au rôle de scénariste (agent « scénariste IA »). Voir roadmap Phase 2.
- **BDD — Scénarios approuvés** : tout ce qui a été **approuvé** par l'utilisateur (scénarios, chapitres de scénario) est **persisté en BDD** ; modèle et historique/versions à définir en roadmap.
- **Réflexion — Rôle étendu** : il y a matière à réflexion sur l’extension du rôle de cette IA : elle pourrait aussi servir à la **rédaction des prompts pour les panels** (suggestions de descriptions à partir du scénario + assets), sans remettre en cause la règle « prompt d'image = style + assets + description » (jamais le scénario brut).
- **Place dans le modèle** : à préciser (scénario au niveau projet avec chapitres de scénario en entité dédiée ou champs structurés ; table/colonnes pour versions approuvées). Voir section 6 « Points à clarifier ».

### 3.3 Rôle par flux

- **Mode Automatique** : le scénario (section dédiée) peut servir à produire la **liste des panels** (découpage IA). La **génération d'image** pour chaque panel utilise **uniquement** : style + **assets sélectionnés** + **courte description du panel**. Génération **panel par panel**.
- **Mode Structuré** : scénario / chapitres de scénario = **référence** pour l'auteur qui remplit les blocs à la main. Pas utilisé dans les prompts d'image (chaque bloc = prompt + refs assets).

### 3.4 Interface d'édition des panels (Édition de l'œuvre)

Lors de l'édition d'un chapitre visuel, l'utilisateur dispose d'**une aide visuelle** : le **chapitre texte** (scénario) affiché dans une colonne dédiée (dans l’éditeur panel immersif : colonne droite), avec la **même visualisation Aperçu** que dans la section Scénario.

| Zone | Contenu | Objectif |
|------|---------|----------|
| **Gauche — Chapitre texte** | Texte du **chapitre de scénario** lié, affiché en **Aperçu** : surbrillance des assets (personnages, décors, objets) dans le texte ; **hover** pour afficher l'asset (image + infos). | Garder le contexte narratif ; voir directement dans le texte quels assets sont concernés, sans panneau Assets séparé. |
| **Zone centrale — Panels** | Liste et édition des panels du chapitre visuel. | Saisie des descriptions, génération, blocs, bulles. |

Il n'y a **pas de panneau « Assets » dédié** dans cet écran : les assets sont visibles **dans le texte** via l'Aperçu (détection + surbrillance + hover), comme dans la section Scénario (Chapitre → Aperçu). Un lien optionnel entre chapitre visuel et chapitre de scénario (`linked_scenario_chapter_id`) permet d'afficher le bon chapitre texte. Voir section 6 « Points à clarifier ».

#### 3.4.1 Projection : comment fonctionne l’ouverture du chapitre texte lors de l’édition de l’œuvre

**Contexte** : l’utilisateur est dans **Édition de l’œuvre** (chapitre visuel ouvert, en train d’éditer un panel ou un bloc). Il a besoin de **voir le texte du scénario** (chapitre de scénario) correspondant pour s’aider à rédiger la description du panel ou à cadrer la scène.

**Fonctionnement prévu** :

1. **Où s’affiche le chapitre texte**
   - Dans l’écran d’édition du chapitre visuel, le **chapitre texte** (scénario) s’affiche dans un panneau « Chapitre texte » dédié. Le contenu est affiché en **Aperçu** : même rendu que dans la section Scénario (surlignage des assets, hover pour voir l’asset). Les panels restent au centre. Pas de panneau Assets séparé — les assets sont visibles dans le texte via l’Aperçu.

2. **Quel chapitre texte afficher**
   - **Si un lien existe** : au moment de créer ou d’éditer le **chapitre visuel**, l’utilisateur peut **associer** ce chapitre à un **chapitre de scénario** (ex. « Ce chapitre visuel adapte le chapitre de scénario #3 »). En BDD : un champ optionnel sur le chapitre visuel, ex. `linked_scenario_chapter_id` (FK vers la table des chapitres de scénario).
   - **Comportement** : dès que l’utilisateur ouvre ce chapitre visuel pour éditer les panels, le système **affiche automatiquement** le texte du chapitre de scénario lié dans le panneau Scénario. L’utilisateur n’a rien à « ouvrir » de plus : le chapitre texte est **déjà visible** à l’entrée dans l’édition du chapitre visuel.
   - **Si aucun lien n’est défini** : le panneau Scénario peut rester vide avec un message du type « Aucun chapitre de scénario associé » et un **sélecteur** (liste déroulante ou liste des chapitres de scénario du projet) permettant à l’utilisateur de **choisir quel chapitre texte afficher**. Une fois choisi, le texte s’affiche dans le panneau ; optionnellement, l’utilisateur peut **enregistrer** ce choix comme association (lien) pour ce chapitre visuel, afin que ce soit réaffiché aux prochaines visites.
   - **Implémentation (livrée)** : lorsqu’il change de chapitre dans le sélecteur, une **popup de confirmation** (« Changer de chapitre texte ? ») s’affiche ; au clic sur « Changer », le lien est **enregistré en base** pour ce chapitre visuel, ce qui garantit que le chapitre texte affiché est **persistant** (quitter / revenir sur la page conserve le choix).

3. **Ouverture / affichage**
   - **Pas d’« ouverture » séparée** au sens « clic pour ouvrir un fichier » : le chapitre texte est **affiché directement** dans le panneau Scénario dès que l’utilisateur est dans l’édition du chapitre visuel (et que un chapitre de scénario est lié ou sélectionné).
   - Le panneau peut être **repliable** (accordéon ou bouton « Masquer / Afficher le scénario ») pour gagner de la place, mais par défaut il est **ouvert** pour que l’aide soit immédiate.
   - Si le projet n’a **aucun chapitre de scénario** : le panneau peut afficher un lien court vers la section Scénario (« Créer votre scénario ») ou le scénario global (texte brut) s’il existe au niveau projet.

4. **Résumé du flux**
   - Utilisateur **entre dans Édition de l’œuvre** → ouvre un **chapitre visuel** (liste des chapitres du webtoon).
   - L’écran d’édition s’affiche avec **panels au centre** et **chapitre texte dans une colonne dédiée** (Aperçu : surlignage assets + hover).
   - Le système charge et affiche le texte du chapitre de scénario **lié** (lien en BDD), sinon propose un **sélecteur** pour choisir un chapitre à afficher ; l’utilisateur peut **enregistrer** ce choix comme lien.
   - L’utilisateur **lit le texte** (avec les assets visibles dans l’Aperçu) tout en travaillant sur les panels ; il peut **replier** le panneau Chapitre texte pour gagner de la place.

5. **Données nécessaires**
   - **Chapitres** (`chapters` ou équivalent) : ajout d’un champ optionnel **`linked_scenario_chapter_id`** (chapitres écrits = chapitres webtoon ; même table ou deux tables liées par ordre). l’ordre.
   - **Chapitres (texte)** : table ou structure avec `id`, `project_id`, `title`, `content`, ordre. **Découpage Chapitre → Panels** : stockage liste panels (descriptions) par chapitre ; règles de gestion à définir plus tard.

Cette projection peut être implémentée progressivement : d’abord panneau Scénario avec **sélecteur manuel** (sans lien persisté), puis ajout du **lien optionnel** et affichage automatique du chapitre lié à l’entrée dans le chapitre visuel.

#### 3.4.2 Création d’un chapitre visuel — association au chapitre textuel

- **Suggestion par numéro** : à la création d’un chapitre visuel (ex. Chapitre 1), le système **pré-sélectionne** le chapitre de scénario de même numéro (Chapitre 1 textuel) s’il existe. L’utilisateur confirme, en choisit un autre ou laisse « Aucun » (associer plus tard).
- **Aucun chapitre textuel** : si le projet n’a aucun chapitre de scénario, une **notification** informe que l’utilisateur peut en créer dans l’onglet Scénario et associer ce chapitre visuel plus tard. La création du chapitre visuel reste possible.

#### 3.4.3 Longueur chapitre texte vs panels — guidance, estimation, répartition

- **Guidance** : si le découpage du chapitre textuel en panels est trop court ou trop long pour un chapitre webtoon, indiquer à l’utilisateur qu’il peut **retourner dans l’onglet Scénario** pour modifier le texte.
- **Estimation du nombre de panels** : disponible **en section Scénario** (pour chaque chapitre texte) et **en Édition de l'œuvre** (chapitre visuel). Estime le nombre de panels à partir du contenu texte et du format panel 800×H. **Uniquement indicatif et visuel** : l'utilisateur n'est pas tenu de respecter cette estimation ; il peut créer plus ou moins de panels (images) qu'estimé. Permet de pré-visualiser si la longueur convient.
- **Répartition N / N+1** : sans perdre d’éléments. Prérequis : **chapitre actuel (N) et chapitre suivant (N+1)**. **Trop court** : prendre des éléments du chapitre textuel N+1 et les ajouter au N (proposition + acceptation/refus). **Trop long** : céder des éléments du N vers N+1 (même principe). Les éléments acceptés sont retirés d’un chapitre et ajoutés à l’autre.

#### 3.4.4 Contrôle de la longueur — référence, nombre de panels cible, comparaison

*Objectif* : l'utilisateur a un **contrôle sur la longueur** de ses chapitres (en nombre de panels).

- **Référence panels / chapitre** : afficher une référence (ex. « En moyenne, un chapitre fait environ **10 panels** »). *Évolution* : afficher un **vrai chapitre webtoon** (fourni plus tard) avec son **nombre de panels** → l'utilisateur juge combien de panels il veut pour ses chapitres.
- **Nombre de panels cible** : l'utilisateur peut **choisir un nombre de panels cible** pour le chapitre (ou cible par défaut au niveau projet). Ex. 8, 10, 12 panels.
- **Comparaison estimation vs cible** : confronter l'estimation (panels prévus) au **nombre de panels cible** (ex. « Estimation : 7 · Cible : 10 → chapitre un peu court »). L'utilisateur adapte le texte ou utilise la répartition N/N+1.

*Usage intuitif* : en Scénario, à la création ou édition d'un chapitre, afficher référence + estimation ; permettre de définir une cible ; afficher la comparaison estimation vs cible. Même logique en Édition de l'œuvre.

*Principe* : l'estimation et toute visualisation du découpage chapitre → panels sont **purement indicatives et visuelles**. L'utilisateur reste libre d'avoir plus ou moins d'images que l'estimation ; pas de contrainte à appliquer strictement un panel « détecté » comme panel visuel.

### 3.5 Assistance IA : deux types (Scénario / Chapitre), réécriture directe et accepter-rejeter

**Même modèle LLM, system prompts différents** : le produit utilise **deux rôles IA** (et optionnellement un troisième pour les panels), avec le **même fournisseur LLM** mais des **system prompts** distincts : (1) **IA Scénario** — écrit toute l'histoire, intervient sur le scénario global ; (2) **IA Chapitre** — intervient **uniquement sur le chapitre de scénario** en cours ; (3) **IA Panel** (Édition de l'œuvre) — suggère ou réécrit les descriptions de panels. Voir ci-dessous.

**Visibilité dans l'interface** : l'**IA Scénario** est **visible et utilisable dès que l'utilisateur entre dans la section Scénario** (onglet Scénario) ; l'**IA Chapitre** est **visible et utilisable dès que l'utilisateur entre dans un chapitre de scénario créé** (ouverture du chapitre). L'utilisateur n'a pas à chercher ni à cliquer ailleurs pour accéder à ces aides.

#### IA Scénario (niveau histoire entière)

- L'utilisateur **saisit un prompt** décrivant son histoire (ex. « Une fantasy où un forgeron découvre une épée maudite »).
- Le système **demande en combien de chapitres** il veut son histoire (ex. 50 chapitres).
- L'**IA Scénario** génère **toute l'histoire** chapitre par chapitre, **directement sur le site** (le texte apparaît dans l'éditeur de scénario, chapitre par chapitre).
- **Modification par prompt** : l'utilisateur peut ensuite saisir un **nouveau prompt** pour modifier des aspects (ex. « Rendre le ton plus sombre, ajouter un second personnage »). L'IA **réécrit** le scénario (ou les parties concernées) **directement sur le site**.
- **Comparaison et choix** : l'utilisateur peut **lire** l'ancienne version et la **nouvelle version** (affichage côte à côte ou bascule). Il **choisit** : **garder la nouvelle** (accepter) ou **revenir à l'ancienne** (rejeter). Les versions sont conservées tant que l'utilisateur n'a pas accepté définitivement.

#### IA Chapitre (niveau un chapitre de scénario)

- Sur **chaque chapitre de scénario**, une **IA dédiée** qui **n'intervient que sur ce chapitre** (system prompt « assistant chapitre »).
- L'utilisateur ouvre un chapitre, saisit un **prompt de modification** (ex. « Allonger la scène du duel, plus de dialogues »). L'IA **réécrit le chapitre** directement sur le site.
- **Même flux accepter-rejeter** : l'utilisateur voit l'ancienne vs la nouvelle version et **accepte** (garder la nouvelle) ou **rejette** (revenir à l'ancienne).

#### IA Panel (Édition de l'œuvre)

- Lors de l'édition d'un **panel** (description / prompt du panel), l'utilisateur peut demander à l'**IA Panel** de **suggérer ou réécrire** la description du panel (à partir du contexte scénario + assets). La réécriture s'affiche **directement** dans le champ ; l'utilisateur peut **accepter** ou **rejeter** (revenir à l'ancienne description).

#### Options d'IA LLM gratuites (recommandations)

Pour un usage **gratuit** ou à coût maîtrisé, des options courantes en 2024–2025 sont : **Groq** (tier gratuit : Llama 3.3 70B, Mixtral 8x7B, nombreuses requêtes/jour) ; **OpenRouter** (accès gratuit avec limites, modèles Llama, Mistral, Gemma) ; **Mistral** (API gratuite via La Plateforme) ; **Google AI Studio** (Gemini avec quota gratuit). Le choix dépend des quotas, de la latence et de la langue ; un même backend peut appeler l’un de ces fournisseurs avec des system prompts différents pour Scénario / Chapitre / Panel.

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

Ces points découlent de la **correspondance chapitres écrits = chapitres webtoon**, du **découpage Chapitre → Panels** dans la section Scénario et de la double visualisation en édition. À trancher en produit / technique.

| Point | Évocation | Question / risque d'incohérence |
|-------|-----------|----------------------------------|
| **Correspondance chapitres écrits ↔ webtoon** | Les chapitres (section Scénario) **correspondent** aux chapitres webtoon (1 = 1). | **Modèle** : une seule table `chapters` avec type (scénario / visuel) ou deux tables (scénario vs visuel) liées par ordre). ou FK ? Gestion de la création : créer le chapitre visuel automatiquement à la création du chapitre écrit, ou l'utilisateur crée les deux côtés ? |
| **Découpage Chapitre → Panels (section Scénario)** | Dans chaque chapitre (texte), découpage en panels (liste + descriptions) directement dans la section Scénario. | **Règles de gestion** à définir plus tard : qui découpe (utilisateur, IA, les deux) ? Critères du découpage ? Édition manuelle des descriptions de panels ? Stockage : table `scenario_panels` (chapter_id, panel_number, description) ou JSONB sur le chapitre ? |
| **Modèle de données chapitres (texte)** | Chapitres écrits = chapitres webtoon ; contenu texte + découpage panels. | **Où stocker** : table dédiée (ex. `scenario_chapters` avec `content`, `panels` JSONB ou table `scenario_panels`) ou réutilisation de `chapters` avec champs scénario (content, panels) ? Impact sur l'UI. |
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

**Conclusion** : La vision (scénario = structure ; **chapitres écrits = chapitres webtoon** ; **découpage Chapitre → Panels** dans la section Scénario, règles à définir ; génération panel par panel ; assets impératifs ; double visualisation en édition) est cohérente. Les points de la section 6 restent à trancher pour l'implémentation (modèle chapitres, règles de gestion du découpage, import, layout). Les .md ont été alignés en conséquence.

Ce rapport sert de référence pour la mise à jour des .md et pour l’implémentation.

---

*Dernière mise à jour : 14 février 2026*


---

# Partie III — Spécification : blocs, bulles, workflow 800×H

# Édition de case — Blocs et bulles

> Définition du **système d'édition** d'une case : agencement des **blocs**, prompts par bloc, **génération d'image par bloc** (les **images sont générées dans les blocs**), **bulles de texte**, et **visualisation totale** de la case en 800×5000 px (hauteur configurable dans des bornes). L'édition se fait via des **sous-menus visuels** (colonne gauche) et un **suivi chapitre textuel** (colonne droite). Voir `Edition-Oeuvre.md` (Partie IV).

---

## 1. Images dans les blocs — rappel

**C'est dans les blocs que les images sont générées.** Chaque bloc est une zone (position, dimensions) ; l'utilisateur renseigne un **prompt** pour ce bloc ; la génération produit une **image** aux dimensions du bloc, affichée **dans** le bloc (`layout.blocks[].image_url`). Pas de génération « toute la case » : une image par bloc.

---

## 2. Dimensions et visualisation de la case

| Élément | Valeur | Description |
|--------|--------|-------------|
| **Dimensions de la case** | **800 × hauteur variable** pixels | Largeur fixe 800 px ; hauteur configurable dans l'éditeur (bornée min/max). |
| **Visualisation en édition** | **800 × hauteur courante** px | L'interface affiche la case en **taille réelle** pour voir l'agencement exact des blocs et des bulles. **Scroll vertical uniquement** (pas de scroll horizontal). |
| **Marges autour du canvas** | Variables selon layout | Espace visuel autour du canvas dans la modale plein écran ; n'appartient pas à la case elle-même. |
| **Scroll** | Vertical uniquement | La zone scrollable ne défile qu'en hauteur ; le contenu ne dépasse pas en largeur. |

La case est donc une **surface 800×H** (H bornée) dans laquelle s'organisent :
- les **blocs** (zones d'images),
- les **blocs de couleurs** (zones de couleur pour remplir les espaces entre les blocs — ambiance de la case),
- les **bulles de texte** (dialogue, pensée, narration) et le **texte brut** (sans bulle),
- et plus tard les effets (transitions, lignes de mouvement).

---

## 3. Modes et sous-menus d'édition

| Sous-menu | Rôle | Détail |
|------|------|--------|
| **Personnalisation** | Contenu des blocs | **Clic sur un bloc** → édition du prompt, détection d'assets, génération/régénération d'image par bloc. |
| **Couleurs** | Ambiance visuelle | Gestion des blocs de couleur (ajout, déplacement, redimensionnement, couleur). |
| **Dialogue** | Bulles et texte | Gestion des bulles de dialogue (ajout, style, position) + accès éditeur avancé. |

Notes produit :
- Les actions de structure (**ajout/déplacement/redimensionnement des blocs**) restent disponibles dans le flux d'édition de case.
- L'accès se fait via des **pictos** en colonne gauche (sans texte sous les icônes, mode sombre renforcé).

Spécification détaillée : **`Edition-Oeuvre.md`** (Partie IV).

---

## 4. Workflow : avant la génération d'images

L'ordre de travail est le suivant :

1. **Agencement des blocs**  
   L'utilisateur **ajoute des blocs** par **glisser-déposer** (bloc 500×500 déposé sur la case), **déplace** les blocs par glisser-déposer, et **édite** la largeur/hauteur de chaque bloc. Chaque bloc est un rectangle dans l'espace 800×H.

2. **Prompts par bloc**  
   Dans **chaque bloc**, l'utilisateur saisit un **prompt** (description de la scène / de l'illustration pour ce bloc). Le prompt de la case (description globale) peut servir de **contexte** pour tous les blocs, mais chaque bloc a son propre prompt.

3. **Génération par bloc**  
   La **génération d'image** se fait **bloc par bloc**. Pour chaque bloc :
   - **Dimensions (OBLIGATOIRE)** : l'API reçoit la **taille du bloc** (largeur × hauteur). L'image générée a exactement ces dimensions.
   - **Instruction « utiliser toute la place »** : le prompt système indique au modèle de **remplir tout le cadre** (pas de bandeaux, pas de bandes séparatrices, pas de marges vides). L'illustration doit occuper **toute la surface** du bloc.
   - **Prompt** = style projet + (optionnel) contexte chapitre + **prompt du bloc**.
   - **Stockage** : image par bloc dans Storage (`panels/{panel_id}/blocks/{block_id}.png`) ; URL enregistrée dans `layout.blocks[].image_url`.

**Règle** : pas de génération globale « toute la case » ; on ne génère qu'après avoir **agencé les blocs** et renseigné les **prompts par bloc**. **La forme du bloc détermine obligatoirement les dimensions envoyées à l'API de génération** — on peut générer des images dans les blocs, et chaque image doit utiliser l'espace (largeur × hauteur) du bloc concerné.

**Implémentation** : génération par bloc implémentée (Étape 5 livrée). Edge Function `generate-panel-image` ; service `services/panels.ts` (`generatePanelBlockImage`) ; hooks `usePanels.ts` (`useGeneratePanelImage`). Stockage : `{user_id}/projects/{project_id}/panels/{panel_id}/blocks/{block_id}.png`. Voir `09_Specifications_API.md` § 3.2.

---

## 5. Système d'édition — Blocs (mode Architecture)

| Fonctionnalité | Description |
|----------------|-------------|
| **Par défaut : aucun bloc** | À la **création d'une case** (création manuelle ou import d'une suggestion), la case est créée **sans bloc** (`layout.blocks = []`). L'utilisateur ajoute des blocs par **glisser-déposer**. |
| **Dimensions par défaut d'un bloc** | Un **nouveau bloc** fait **500 × 500** pixels. |
| **Ajout de blocs** | **Glisser-déposer** : une source « Bloc 500×500 » est déposée sur la case ; **prévisualisation 500×500** pendant le drag (ghost centré sur le curseur). Au dépôt, le bloc est créé avec son **centre** au point de dépôt (coordonnées x, y = centre moins 250 px). Option : bouton « Ajouter en (0,0) ». |
| **Contraintes de la case** | **Aucun bloc ne peut dépasser** la zone de la case : 800×H (hauteur bornée). Toutes les opérations (ajout, déplacement, redimensionnement) sont **bornées** pour que le bloc reste entièrement à l'intérieur. |
| **Déplacement d'un bloc** | Chaque bloc est **déplaçable** : **glisser-déposer** du bloc sur le canvas de la case pour modifier sa position (x, y). La position est **clampée** pour rester dans la case. |
| **Redimensionnement type Canva** | **Au glisser uniquement** : bordures et **coins** avec **hitbox élargie** (bordures 9 px, coins 15×15 px) pour faciliter la prise. **Survol** : léger style (fond primary/30) pour indiquer la zone cliquable. Curseurs adaptés (ns-resize / ew-resize / coins). Dimensions **dans la case** (min 100 px, x+largeur ≤ 720, y+hauteur ≤ 5000). |
| **Édition des dimensions** | En complément : champs **largeur** et **hauteur** (éditables) + bouton « Appliquer dimensions » pour enregistrer. Mêmes contraintes. |
| **Prompt et génération** | Le **prompt** est éditable **par bloc** dans le **panneau latéral** (Textarea). **Aperçu des mentions d'assets** : sous le champ, le texte est affiché avec surbrillance des assets (personnages, décors, objets) et hover pour afficher l'asset (même composant que l'Aperçu scénario). Bouton **Générer** par bloc. Génération : template de style du projet + **contexte chapitre** (depuis la suggestion ou la description de la case) + prompt du bloc. Sur **plan Pro**, les références d'images fournies par `block_asset_image_urls` (les sheets des assets) sont utilisées via FAL **image edit** pour conserver l'identité visuelle ; sur **Free**, fallback **text-to-image**. **L'image générée utilise obligatoirement les dimensions du bloc** (largeur × hauteur) ; elle s'affiche **dans le bloc** sur la case. |
| **Suppression** | **Supprimer un bloc** : bouton **au survol** du bloc (icône poubelle), positionné **milieu horizontal / moitié bas** du bloc (environ 25 % depuis le bas). Clic → bloc retiré de `layout.blocks`. Également disponible dans le panneau latéral. |
| **Visualisation** | La case (800×H) est affichée avec un **fond quadrillé** (grille) ; chaque bloc est délimité (bordure, ombre) et affiche son image générée ou un placeholder. |

**Format d'un bloc** (aligné sur `08_Modele_de_Donnees.md`) :

```json
{
  "id": "uuid_ou_identifiant_stable",
  "x": 0,
  "y": 0,
  "width": 500,
  "height": 500,
  "prompt": "Description de la scène pour ce bloc.",
  "asset_refs": [],
  "image_url": null
}
```

**Règle obligatoire** : l'**image générée** pour un bloc **doit** avoir les dimensions du bloc (largeur × hauteur) au moment de la génération — l'API reçoit ces dimensions pour produire l'image au bon format. Les dimensions du bloc sont modifiables après coup (redimensionnement ou champs largeur/hauteur) ; une nouvelle génération utilisera alors les nouvelles dimensions.

---

## 6. Blocs de couleurs (mode Édition)

> **Objectif** : Même système que les blocs d'architecture (position, dimensions), mais pour la **couleur**. Remplir les **espaces entre les blocs d'image** par des zones de couleur — dans les webtoons, le fond de la case est important pour signifier l'ambiance (nuit, tension, flash-back).

| Fonctionnalité | Description |
|----------------|-------------|
| **Principe** | **Blocs de couleurs** : position (x, y), largeur, hauteur comme les blocs d'image. Pas de génération d'image ; remplissage par **couleur unie** ou **dégradé**. |
| **Remplissage** | Par bloc couleur : sélecteur de couleur (unie ou dégradé). Les blocs couleur servent à remplir les **interstices** entre les blocs d'image. |
| **Ordre de rendu** | Blocs de couleurs en **arrière-plan** ; blocs image par-dessus. Option : ordre des calques configurable. |
| **Stockage** | Ex. `panels.color_blocks` (JSONB) ou extension de `layout`. Format par bloc : `id`, `x`, `y`, `width`, `height`, `fill` (couleur ou dégradé). |
| **Menu Couleur (fond global)** | En complément : couleur de fond de la case pour les zones non couvertes par blocs couleur ou image (`panels.background_style`). |

---

## 7. Système d'édition — Bulles et texte brut (mode Édition)

### 7.1 Types de bulles

| Type | Label UI | Description |
|------|----------|-------------|
| **dialogue** | 💬 Dialogue | Bulle de parole avec **queue** (pointe orientable) ; corps arrondi (border-radius 0–50 %) ; remplissage uni ou dégradé. |
| **thought** | 💭 Pensée | Bulle de pensée : chaîne de **petits cercles** vers la pointe (queue « nuage ») ; style italique par défaut. |
| **shout** | 💥 Cri | Bulle en **starburst** (pointes 6–22) avec queue ; souvent fond jaune/orange, bordure rouge. |
| **caption** | 📋 Narrative | Bloc **sans queue** (narration / sous-titre) ; barre verticale à gauche ; fond sombre par défaut. |

### 7.2 Éditeur avancé (référence)

Le composant **SpeechBubbleEditor** (`src/components/project/SpeechBubbleEditor.tsx`) fournit une édition complète des bulles :

- **Ajout** : boutons par type (Dialogue, Pensée, Cri, Narrative).
- **Position et taille** : glisser-déposer pour déplacer ; **poignées de redimensionnement** (8 points : N, S, E, W, coins).
- **Queue (dialogue / pensée / cri)** : pointe déplaçable via un **handle violet (✛)** ; réglage **pointe X/Y** et **largeur de base** dans le panneau.
- **Bulle connectée** : une bulle (dialogue ou pensée) peut avoir une **sous-bulle connectée** (ex. « Aah... ») reliée par un **cou** (courbes de Bézier). La sous-bulle est déplaçable et redimensionnable ; réglage de la **largeur du cou (neck)** en px.
- **Texte** : zone de saisie ; **style de texte** : police (Système, Manga, Serif, Mono, Rounded), taille (8–40 px), couleur, espacement des lettres (em), **gras / italique**, casse (majuscules / minuscules), alignement (gauche / centre / droite), **ombre de texte** (couleur + flou).
- **Forme** : **arrondi** (0–50 %), **bordure** (épaisseur 0–8 px, couleur).
- **Remplissage** : **uni** ou **dégradé** ; couleur 1 / couleur 2 ; direction du dégradé (↓ bas, → droite, ↘, ↙).
- **Cri** : nombre de **pointes** (6–22).
- **Calques** : liste des bulles à droite ; sélection au clic ; raccourcis (Suppr pour supprimer, 2× clic pour éditer le texte).

Rendu : géométrie par **périmètre paramétré** (coins arrondis diagonaux), queue découpée dans le contour, cou en courbes de Bézier pour les bulles connectées.

### 7.3 Stockage et format (aligné modèle)

- **Stockage** : `panels.speech_bubbles` (JSONB).
- **Format minimal** (compatible écran chapitre actuel) : `id`, `type` (speech | thought | shout | whisper | narration), `text`, `position` (x, y), `width`, `height`, `style` (font, size, color).
- **Format étendu** (éditeur avancé) : en plus, `borderRadius`, `tailX`, `tailY`, `tailBaseWidth`, `bgFill`, `bgColor`, `bgColor2`, `gradientDir`, `borderColor`, `borderWidth`, `textStyle` (complet), `spikes` (cri), `connected` (sous-bulle avec offset, dimensions, cou, texte et style). Voir `08_Modele_de_Donnees.md` pour le schéma détaillé.

### 7.4 Texte brut (sans bulle)

Texte libre dans la case **sans forme de bulle** (narration, titres, onomatopées). **Police / font**, **taille**, couleur éditables. Placement par drag & drop. Stockage dédié (ex. `panels.text_elements` JSONB).

**Personnalisation typographique** : pour **bulles et texte brut** : choix de la **police** (font), **taille**, couleur du texte (étendu dans l'éditeur avancé : graisse, italique, alignement, espacement, ombre).

Rendu final : composition blocs (images) + blocs de couleurs (arrière-plan) + overlay (bulles + texte brut), dimensions 800×H.

---

## 8. Expérience UI actuelle (modale édition)

- **Plein écran immersif** : l'édition de case s'ouvre en 100vw/100vh.
- **Case centrée fixe** : le canvas reste visuellement centré ; l'ouverture/fermeture d'outils latéraux ne doit pas décaler la zone d'édition.
- **Colonne gauche** : sous-menus d'actions par pictos (UI compacte).
- **Colonne droite** : suivi **Chapitre textuel** avec picto dédié.
- **Chapitre textuel verrouillé actif** : le sous-menu de droite ne doit pas être désactivable en production.

---

## 9. Récapitulatif — Ordre des opérations

1. **Créer les cases** (à la main ou en important une suggestion). Par défaut **aucun bloc**.  
2. **Pour chaque case** :  
   - **Structure** : ajouter/déplacer/redimensionner les blocs.  
   - **Personnalisation** : éditer prompt + générer image par bloc.  
   - **Couleurs** : remplir les espaces avec blocs de couleur.  
   - **Dialogue** : poser les bulles et éditer texte/style.  
3. **Rendu final** : case 800×H = blocs de couleurs (arrière-plan) + blocs (images) + overlay (bulles + texte brut + effets).

---

## 10. Références

- **Sous-menus d'édition** : `Edition-Oeuvre.md` (Partie IV) — organisation actuelle par Personnalisation / Couleurs / Dialogue.
- **Éditeur avancé bulles** : composant `src/components/project/SpeechBubbleEditor.tsx` — types dialogue, pensée, cri, narrative ; bulles connectées ; queue ; style texte complet (police, taille, gras, italique, alignement, ombre) ; forme (arrondi, bordure, remplissage uni/dégradé) ; calques.
- **Plan Phase 2** : `Edition-Oeuvre.md` (Partie I) — Étapes 5 (blocs + génération) ✅ livrée, 6 (mode Structuré), 7 (blocs de couleurs, bulles, texte brut, effets, fond, lecture).
- **API génération par bloc** : `09_Specifications_API.md` § 3.2 — Edge Function `generate-panel-image`.
- **Modèle de données** : `08_Modele_de_Donnees.md` — `panels.layout`, `panels.speech_bubbles` (format minimal et étendu).
- **Rapport flux** : `Edition-Oeuvre.md` (Partie II).

---

*Dernière mise à jour : 15 avril 2026 — UI édition case plein écran immersive, sous-menus par pictos, suivi chapitre textuel en colonne droite, case centrée fixe, harmonisation mode sombre.*


---

# Partie IV — Sous-menus Personnalisation / Couleurs / Dialogue

# Édition de case — Sous-menus d'édition

> Les **images sont générées dans les blocs** de la case. L'implémentation actuelle repose sur une **vue unifiée immersive** : modale plein écran, canvas central **800×H**, colonne gauche par **pictos** (Personnalisation / Couleurs / Dialogue), colonne droite pour le **chapitre textuel**.

---

## 1. Principe : images dans les blocs

- Chaque **case** est une surface **800×H** (hauteur configurable, bornée) contenant des **blocs**.
- **C'est dans les blocs** que les images sont générées : un bloc = une zone (position, dimensions) + un **prompt** → une **image** affichée dans ce bloc.
- L'utilisateur travaille via des **sous-menus** (pictos) tout en conservant les actions structurelles de blocs.

---

## 2. Sous-menu Personnalisation

**Objectif** : éditer le contenu visuel des blocs (prompt, génération, assets détectés), avec accès rapide aux actions de structure déjà disponibles.

| Fonctionnalité | Description |
|----------------|-------------|
| **Prompt par bloc** | Clic sur un bloc pour éditer le prompt visuel (avec surbrillance des assets détectés). |
| **Génération par bloc** | Bouton de génération/régénération par bloc ; dimensions du bloc envoyées à l'API. |
| **Actions structurelles** | Ajout/déplacement/redimensionnement/suppression des blocs disponibles dans le flux d'édition. |
| **Canvas** | Fond quadrillé, largeur fixe 800 px, hauteur configurable ; scroll vertical uniquement. |
| **Suppression** | **Au survol** du bloc : bouton supprimer (icône poubelle) centré en bas du bloc ; clic → bloc retiré. Également dans le panneau latéral. |

**Règle** : les actions visuelles et structurelles coexistent dans une expérience unifiée par sous-menus.

---

## 3. Sous-menu Couleurs et sous-menu Dialogue

**Objectif** : éditer les couches non-image de la case.

| Fonctionnalité | Description |
|----------------|-------------|
| **Blocs de couleurs** | **Même système que les blocs d'architecture** (position, dimensions) mais pour la **couleur** : remplir les **espaces entre les blocs d'image** (ambiance de la case webtoon). Couleur unie ou dégradé par bloc. Rendu en arrière-plan sous les blocs image. Stockage ex. `panels.color_blocks` (JSONB). |
| **Bibliothèque de bulles de dialogue** | Même principe que les blocs : **bibliothèque** de formes/types (parole, pensée, cri, chuchotement, narration). L'utilisateur **place** les bulles sur la case (glisser-déposer). Par bulle : **texte éditable**, position, style (couleur contour, intérieur, **police, taille**). Stockage `panels.speech_bubbles`. |
| **Texte brut (sans bulle)** | Texte libre dans la case **sans forme de bulle** (narration, titres, onomatopées). **Police / font**, **taille**, couleur. Placement par drag & drop. Stockage ex. `panels.text_elements` (JSONB). |
| **Menu Couleur** | **Menu dédié** pour la **couleur de fond de la case** (zones non couvertes) : couleur unie ou dégradé. Stockage `panels.background_style`. |
| **Bibliothèque d'effets** | **Bibliothèque d'éléments visuels** pour enrichir la case et donner de la profondeur, douceur, émotion et vivant à l'œuvre. Effets organisés par catégories : **profondeur** (ombres portées, lumières directionnelles, atmosphère), **douceur** (flou artistique, transitions douces, brume), **émotion** (météo, ambiances colorées, filtres), **vivant** (lignes de mouvement, particules, dynamisme). L'utilisateur **choisit et applique** un effet sur la case (ou sur une zone). Positions/types/styles/intensité stockés en JSONB (ex. `panels.effects` ou champs dédiés). |
| **Ajout de texte** | Possibilité d'**ajouter du texte** sur la case (texte libre, hors bulles) : **choix de la typographie** (police, taille, couleur). Position par glisser-déposer ou coordonnées. Stockage en overlay (ex. texte + position + style dans un tableau dédié par case). |

**Règle** : les sous-menus servent à organiser l'édition ; le canvas central reste la référence visuelle.

**Génération par bloc** : l'API reçoit les **dimensions du bloc** (largeur × hauteur) et une **instruction** pour que l'image **remplisse tout le cadre** (pas de bandeaux ni bandes séparatrices). Stockage : `panels/{panel_id}/blocks/{block_id}.png`.

---

## 4. UI immersive actuelle

- Modale d'édition **plein écran** (100vw/100vh).
- Canvas case **centré fixe** (ne se décale pas lors des interactions latérales).
- Colonne gauche : pictos des sous-menus (sans libellé sous icône).
- Colonne droite : **chapitre textuel** (picto dédié, actif par défaut et verrouillé actif).

---

## 5. Récapitulatif

| Élément | Sous-menu principal |
|--------|----------------------|
| Prompt et génération image d'un bloc | Personnalisation |
| Blocs de couleurs | Couleurs |
| Bulles / texte de dialogue | Dialogue |
| Actions structurelles des blocs | Disponibles dans le flux d'édition |

---

## 6. Prévisualisation et export

- **Prévisualisation** : La **vue lecture** (prévisualisation) de chaque case affiche **tous les éléments édités** : blocs de couleurs (arrière-plan), blocs image, et à terme bulles, texte brut, effets. Objectif : **cohérence avec le futur export** (téléchargement chapitre visuel en PDF).
- **Téléchargement chapitre visuel (PDF)** : Prévu en Phase 3 ; le PDF reprendra la succession des cases avec le même rendu que la prévisualisation.

---

## 7. Références

- **Blocs et bulles** : `Edition-Oeuvre.md` (Partie III) — workflow, format blocs, génération par bloc, bulles.
- **Plan Phase 2** : `Edition-Oeuvre.md` (Partie I) — Étapes 5 (blocs + génération), 6 (mode Structuré), 7 (blocs de couleurs, bulles, texte brut, effets).
- **Modèle de données** : `08_Modele_de_Donnees.md` — `panels.layout`, `panels.speech_bubbles`, effets.
- **Scénario (détection assets)** : même logique que dans l'Aperçu du scénario (surbrillance, hover) pour le **prompt du bloc** dans la popup d'édition.

---

---

## 8. Détails d'implémentation (livrés)

| Élément | Détail |
|--------|--------|
| **Visualisation case** | Éditeur plein écran ; case centrée ; largeur 800 px ; scroll vertical uniquement. |
| **Placement nouveau bloc** | Centre du bloc 500×500 au point de dépôt ; prévisualisation 500×500 pendant le glisser. |
| **Suppression** | Bouton au survol du bloc (milieu / moitié bas), plus panneau latéral. |
| **Poignées de redimensionnement** | Hitbox élargie (bordures 9 px, coins 15 px) ; style au survol pour indiquer la zone. |
| **Génération par bloc** | Edge Function `generate-panel-image` ; dimensions (width, height) du bloc envoyées à l'API ; instruction « remplir tout le cadre » dans le prompt ; stockage `{user_id}/projects/{project_id}/panels/{panel_id}/blocks/{block_id}.png`. Voir `09_Specifications_API.md` § 3.2. |
| **Prévisualisation** | Vue lecture des cases : **blocs de couleurs** (z-index 0) puis **blocs image** (z-index 10) — tous les éléments édités affichés, alignés avec le futur export PDF. |

---

*Dernière mise à jour : 15 avril 2026*


---

# Partie V — Refonte UX éditeur (Option B livrée, Option A cible)

# Refonte UX — Éditeur de l'Œuvre

Rédigé le 23/04/2026. Approche validée : **Option B court terme → Option A cible**.

---

## Contexte & Problème

L'éditeur actuel (`ChapterDetail.tsx`, 2611 lignes) impose un workflow en 4 sous-menus séquentiels :
Architecture → Personnalisation → Couleurs → Dialogue.

Pour chaque action, l'utilisateur doit savoir dans quel "mode" il se trouve. Ajouter une bulle alors qu'on est en mode Architecture = switch de mode, chercher le bon onglet, revenir. Ce workflow brise le flow créatif et génère de la friction inutile.

**Objectif** : liberté à la Figma — tout accessible sans quitter son intention créative.

---

## Option B — Court terme · 1 session · Priorité immédiate · ✅ LIVRÉ (23/04/2026)

**Statut** : livré sur `main`. Critères d'acceptation tous validés ci-dessous.

### Principe
Conserver l'architecture existante (blocs image, couleur, bulles). Rendre l'interface **contextuelle** plutôt que modale.

### Changements UI

| Avant | Après |
|-------|-------|
| 4 onglets PANEL_EDITOR_STEPS en sidebar | Supprimés |
| Propriétés dans la sidebar selon le mode actif | Panel droit accordéon — toujours visible |
| Aucun raccourci documenté | Raccourcis `B/C/T/D/Esc` affichés dans un tooltip |
| Assets visibles seulement en mode Architecture | Sidebar gauche assets permanente |

### Détail des changements

**1. Supprimer PANEL_EDITOR_STEPS**
- Supprimer les 4 onglets (Architecture / Personnalisation / Couleurs / Dialogue) dans `ChapterDetail.tsx`
- Le `activeStep` / `setActiveStep` state devient inutile → supprimer

**2. Panel droit accordéon permanent**
```
▼ Blocs image
  [+ Ajouter un bloc] [presets…]
  Si bloc sélectionné : prompt, asset_refs, dimensions, [Générer]
▼ Blocs couleur
  [+ Ajouter] Si sélectionné : fill, opacité
▼ Dialogue
  [+ Ajouter une bulle] Type de bulle…
  Si bulle sélectionnée : type, texte, formatage complet
```

**3. Toolbar contextuelle flottante**
Quand un objet est sélectionné → petit menu flottant au-dessus avec : Dupliquer / Supprimer / Monter/Descendre z-index

**4. Raccourcis clavier**
- `B` → ajouter un bloc image (ouvre le picker presets)
- `C` → ajouter un bloc couleur
- `D` → ajouter une bulle dialogue
- `Esc` → désélectionner tout
- `Delete/Backspace` → supprimer (déjà livré)

**5. Sidebar gauche assets toujours visible**
- Liste des assets du projet (personnages, décors, objets)
- Drag-and-drop vers le canvas → crée un bloc image avec `asset_refs` prérempli

### Fichiers à modifier

| Fichier | Changement |
|---------|-----------|
| `src/pages/ChapterDetail.tsx` | Supprimer PANEL_EDITOR_STEPS, ajouter panel accordéon, raccourcis |
| `src/components/project/EditionSection.tsx` | Aucun |

### Risques & garde-fous
- **Ne pas casser** : drag/drop, resize 8 poignées, génération image, export PNG, zoom
- Tester golden path : créer un bloc → générer → ajouter une bulle → exporter
- TypeScript : `npx tsc --noEmit` avant et après

### Critères d'acceptation
- [x] Aucun onglet PANEL_EDITOR_STEPS visible
- [x] Panel accordéon (4 sections : Assets, Blocs image, Couleurs, Dialogue, Cases scénario)
- [x] Raccourcis B/C/D/Esc fonctionnels (centre du canvas + hints `kbd` dans les headers)
- [x] Drag asset depuis sidebar → bloc créé sur le canvas avec `asset_refs` prérempli + prompt `[Nom] — `
- [x] Toolbar flottante contextuelle (Dupliquer / Monter / Descendre z-index / Supprimer)
- [x] 0 régression — `tsc --noEmit` OK, lint OK

---

## Option A — Cible Figma-like · 2-3 sessions · Moyen terme

### Principe
Refactoriser `ChapterDetail.tsx` en composants indépendants. Canvas centré plein écran, UI composée.

### Architecture cible

```
ChapterDetail (< 400 lignes après refacto)
├── CanvasArea              — canvas central, full-width, zoom
│   ├── ImageBlockLayer     — blocs image drag/resize
│   ├── ColorBlockLayer     — blocs couleur
│   └── BubbleLayer         — bulles SVG
├── LeftSidebar             — assets du projet + presets
│   ├── AssetList           — personnages, décors, objets
│   └── BlockPresets        — formats rapides
├── RightPanel              — propriétés de l'objet sélectionné
│   ├── ImageBlockProps
│   ├── ColorBlockProps
│   └── BubbleProps
├── TopToolbar              — zoom, undo/redo, export, save, raccourcis
└── LayersPanel (optionnel) — z-index visuel
```

### Nouveaux hooks
```
useDragBlock(canvasRef)       — logique drag commune blocs + bulles
useResizeBlock(blockRef)      — 8 poignées
useKeyboardShortcuts()        — B/C/T/D/Esc/Delete/Ctrl+Z
useCanvasSelection()          — sélection simple + multi
```

### Phases

| Phase | Contenu | Durée estimée |
|-------|---------|---------------|
| 1 | Extraire `useDragBlock` + `useResizeBlock` de `ChapterDetail.tsx` | ~2h |
| 2 | Séparer `ImageBlockLayer`, `ColorBlockLayer`, `BubbleLayer` | ~3h |
| 3 | `LeftSidebar` assets + drag-to-canvas | ~2h |
| 4 | `RightPanel` accordéon contextuel | ~2h |
| 5 | `TopToolbar` + undo/redo via `useReducer` action log | ~3h |

### Règles de migration
- Utiliser `isolation: "worktree"` (risque : `ChapterDetail.tsx` God Component)
- Jamais de feature freeze pendant la migration — Option B reste opérationnelle
- Chaque phase = commit indépendant, 0 régression avant de passer à la suivante

---

## Décisions

| Question | Décision | Raison |
|----------|----------|--------|
| Canvas SVG ou DOM ? | DOM | Cohérent avec l'existant, html2canvas fonctionne |
| Undo/redo ? | Phase 5 uniquement | Scope trop large pour Option B |
| Drag depuis sidebar | HTML5 drag API | Déjà utilisé pour blocs |
| Multi-sélection ? | Option A Phase 4 | Pas dans Option B |
| Layers panel ? | Optionnel | Utile si > 15 blocs par case |

---

## Référence

- `src/pages/ChapterDetail.tsx` — fichier principal (2611 lignes)
- `src/components/project/SpeechBubbleEditor.tsx` — éditeur bulles (1541 lignes)
- `src/services/panels.ts` — BLOCK_PRESETS, generatePanelBlockImage()
- `src/hooks/usePanels.ts` — mutations React Query
- Wiki : voir `wiki/RefontEditeur.md` (Obsidian) ou `Produit/Edition-Oeuvre.md` (Partie V).
- Wiki : `C:/Users/PC/Documents/WikiBrain/wiki/Edition-Panel.md`


---

# Partie VI — Rapport d’implémentation — Étape 5 (fév. 2026)

# Rapport — Étape 5 : Édition des blocs et génération par bloc

**Date** : 15 février 2026  
**Plan** : `Edition-Oeuvre.md` (Partie I) — Étape 5

---

## 1. Rappel de l’objectif

L’étape 5 vise à ce que **les images soient générées dans les blocs** : l’utilisateur ajoute des blocs sur le panel (désormais 800×H), les positionne et redimensionne, saisit un **prompt par bloc**, puis lance la **génération par bloc** (dimensions du bloc envoyées à l’API). Pas de génération « tout le panel » ni « tout le chapitre ».

---

## 2. Ce qui était déjà livré (avant ce rapport)

- Section Édition de l’œuvre (onglet, liste chapitres, écran chapitre).
- Lien chapitre textuel ↔ visuel (double visualisation, Aperçu scénario à gauche).
- Découpage chapitre → panels (IA), import du découpage, création des panels avec `layout.blocks = []`.
- **Blocs** : ajout par glisser-déposer (source « Bloc 500×500 ») ou bouton « Ajouter un bloc » ; placement par centre ; déplacement par glisser-déposer ; **poignées de redimensionnement** (8 : bordures 9 px, coins 15 px) ; champs largeur/hauteur + « Appliquer dimensions » ; **suppression** (bouton au survol sur le bloc + bouton dans le panneau latéral).
- **Prompt par bloc** : Textarea dans le panneau latéral (par panel), bouton Générer par bloc.
- **Génération** : Edge Function `generate-panel-image`, dimensions du bloc envoyées, stockage `{user_id}/projects/{project_id}/panels/{panel_id}/blocks/{block_id}.png`.
- Visualisation panel en largeur 800 px, hauteur configurable (fond quadrillé, scroll vertical).

**Manquait encore (écarts documentés)** :
1. **Contexte chapitre** : l’API accepte `context_chapter` mais le frontend ne l’envoyait pas.
2. **Détection des assets** dans le texte du prompt du bloc (surbrillance + hover comme dans l’Aperçu scénario).

---

## 3. Travail réalisé (compléments étape 5)

### 3.1 Contexte chapitre envoyé à l’API

- **Fichier** : `src/pages/ChapterDetail.tsx`.
- **Comportement** : lors de l’appel à `generatePanelImage.mutate()`, le frontend envoie désormais `contextChapter` :
  - Si le chapitre de scénario a un **découpage** (`panels_outline`) et que le panel correspond à un item (même `panel_number`), le contexte est construit à partir de `panels_outline[panel.panel_number - 1].context` (champs `lieu`, `scene`, `personnages`), formaté en lignes « Lieu : … », « Scène : … », « Personnages : … ».
  - Sinon, la **description du panel** (`panel.prompt`) est utilisée comme contexte.
- **Effet** : l’Edge Function `generate-panel-image` reçoit un contexte (lieu, scène, personnages) et l’intègre au prompt système pour une meilleure cohérence visuelle entre blocs et avec le chapitre.

### 3.2 Aperçu des mentions d’assets dans le prompt du bloc

- **Fichier** : `src/pages/ChapterDetail.tsx`.
- **Comportement** : sous le champ de saisie du prompt du bloc (Textarea ou texte en lecture seule), un **aperçu** affiche le même texte avec **surbrillance des assets** (personnages, décors, objets) et **hover** pour afficher l’asset (image + infos), comme dans l’Aperçu du chapitre texte.
- **Composant réutilisé** : `ScenarioTextHighlighter` avec `text` = texte du bloc (brouillon ou valeur enregistrée) et `assets` = liste des assets du projet.
- **Affichage** : l’aperçu n’est affiché que si le prompt du bloc (ou le brouillon) n’est pas vide ; libellé « Mentions d’assets (survol pour afficher) : ».

---

## 4. Synthèse

| Élément | Avant | Après |
|--------|--------|--------|
| Contexte chapitre (`context_chapter`) | Non envoyé | Envoyé (découpage ou description du panel) |
| Détection / aperçu des assets dans le prompt du bloc | Absent | Aperçu avec surbrillance + hover (ScenarioTextHighlighter) |

L’étape 5 est **complète** au regard des livrables prévus (édition des blocs, génération par bloc, dimensions du bloc, **contexte chapitre**, **aperçu des mentions d’assets**). La bascule explicite « Mode Architecture | Mode Édition » reste une évolution possible (vue unifiée conservée).

---

## 5. Fichiers modifiés

- `src/pages/ChapterDetail.tsx` : calcul et passage de `contextChapter` à `generatePanelImage.mutate` ; ajout du bloc « Mentions d’assets » avec `ScenarioTextHighlighter` sous le prompt de chaque bloc.
- `Produit/Edition-Oeuvre.md` (Partie VI) : état d’implémentation Étape 5.
- `Produit/09_Specifications_API.md` : note sur `context_chapter` mise à jour (envoyé par le frontend).

---

## 6. Tests suggérés

1. **Contexte chapitre** : lier un chapitre visuel à un chapitre de scénario ayant un découpage (panels_outline avec context) ; générer une image sur un bloc ; vérifier en logs ou en qualité d’image que le contexte est pris en compte. Sans découpage, vérifier que la description du panel est utilisée comme contexte.
2. **Aperçu assets** : saisir dans le prompt d’un bloc le nom d’un personnage ou d’un décor existant ; vérifier la surbrillance et le hover avec image + infos.
3. **Non-régression** : ajout / déplacement / redimensionnement / suppression de blocs ; génération par bloc ; pas de génération « tout le panel » ni « tout le chapitre ».

---

*Rapport rédigé le 15 février 2026.*


---

*Document fusionné le 30 avril 2026 — encodage UTF-8.*
