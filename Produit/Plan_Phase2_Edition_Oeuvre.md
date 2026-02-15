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
- **Découpage du chapitre textuel en panels** : une **fonction** (IA ou règle) qui **découpe le chapitre textuel en une succession de panels** (liste + description par panel). Ce découpage **construit** le chapitre visuel : chaque panel est une **structure** 720×5000 (blocs pour les images, puis bulles et effets en couche). Les **assets sont déjà présents** dans le chapitre textuel (détection déjà livrée).
- **Prompt de génération pour un panel** : pour avoir lieu, scène et personnages cohérents, le **contexte du chapitre** (lieu, scène, personnages) doit être inclus dans le prompt du panel. Règle : **prompt = style + assets (du chapitre) + contexte du chapitre (lieu / scène / personnages) + description du panel**.
- **Dimensions d’un panel** : **720 × 5000** pixels (taille du **contenant** panel). **La succession de panels** (empilés verticalement) **forme le chapitre visuel**.
- **Un panel n’est pas qu’une image** : un panel est une **structure** composée de **blocs** (contenant des images), de **texte** (bulles de dialogue), d’**effets de transition** et de **lignes de mouvement** (dynamiques, vitesse, impact, etc.). Voir § 1.4.
- **Estimation du découpage** : la dimension 720×5000 permet d’estimer le nombre de panels et la répartition du contenu narratif.
- **Transformation chapitre textuel → chapitre visuel** :  
  **Chapitre texte** → **découpage en panels** (fonction : liste + descriptions) → **Édition de l'œuvre** : **succession de panels** (chaque panel = blocs + bulles + effets) → génération des images (par bloc) → **le chapitre = cette succession de panels**.

Références : `07_Roadmap_Produit.md` Phase 2, `11_Rapport_Chapitres_Flux_Blocs_Scenario.md`, `UX.md` § 3.2.

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

### Étape 1 — Créer la section « Édition de l'œuvre » (priorité 1)

**Objectif** : Exister en tant qu’espace produit et entrée utilisateur, sans encore lier au scénario ni générer d’images.

| Livrable | Description |
|----------|-------------|
| **Onglet / entrée** | Dans la page détail projet : nouvel onglet **« Édition de l'œuvre »** (ou « Œuvre » / « Chapitres visuels ») à côté de Style, Assets, Scénario. |
| **Liste des chapitres visuels** | Affichage des chapitres du projet issus de la table `chapters` (chapitres webtoon). Création, réorganisation (drag & drop), suppression. Ordre = `chapter_number`. |
| **Vue vide / état initial** | Si le projet n’a aucun chapitre visuel : message d’accueil + CTA « Créer un chapitre » (titre, optionnellement choix du mode : Automatique / Structuré, à préciser plus tard). |
| **Ouverture d’un chapitre** | Clic sur un chapitre → écran d’édition du chapitre. Chaque **panel** est une structure 720×5000 (blocs, bulles, effets) ; en Étape 1 : écran **shell** (liste des panels vide ou placeholder), pas encore de génération ni de double visualisation. |
| **Modèle de données** | Tables `chapters` et `panels` (voir `08_Modele_de_Donnees.md`). Un **panel** : dimensions 720×5000 ; `layout` (JSONB) = blocs avec images ; `speech_bubbles` (JSONB) = bulles ; prévoir champs ou JSONB pour **effets de transition** et **lignes de mouvement**. Ajout si besoin : `chapters.linked_scenario_chapter_id` (FK → `scenario_chapters.id`, NULLABLE). |

**Critères de succès** : l’utilisateur peut ouvrir l’onglet « Édition de l'œuvre », voir la liste des chapitres visuels (ou vide), créer un chapitre, entrer dans l’écran d’édition d’un chapitre (structure prête pour les étapes suivantes).

---

### Étape 2 — Lien chapitre textuel ↔ chapitre visuel (double visualisation)

**Objectif** : En édition d’un chapitre visuel, afficher le **chapitre de scénario correspondant** et les **assets**, pour garder le contexte pendant la saisie des descriptions de panels et la génération.

| Livrable | Description |
|----------|-------------|
| **Panneau « Scénario »** | Dans l’écran d’édition du chapitre visuel : panneau (ou colonne) affichant le **texte du chapitre de scénario** lié. Repliable (accordéon) ; par défaut ouvert. |
| **Lien chapitre visuel ↔ chapitre texte** | Si `chapters.linked_scenario_chapter_id` est renseigné : à l’ouverture du chapitre visuel, chargement et affichage automatique du contenu de ce chapitre de scénario. Sinon : **sélecteur** (liste des chapitres de scénario du projet) pour choisir quel chapitre afficher ; option d’**enregistrer** ce choix comme lien pour ce chapitre visuel. |
| **Panneau « Assets »** | À côté (ou en dessous sur mobile) : panneau listant les **assets sélectionnés** pour ce chapitre (mode Auto) ou pour le panel/bloc en cours (mode Structuré). Rappel visuel ; impératif pour la génération (voir rapport). |
| **Données** | Migration si nécessaire : ajout de `linked_scenario_chapter_id` sur `chapters`. |

Référence détaillée : `11_Rapport_Chapitres_Flux_Blocs_Scenario.md` § 3.4 et 3.4.1.

---

### Étape 3 — Découpage du chapitre textuel en panels (construire le chapitre visuel)

**Objectif** : Implémenter une **fonction de découpage** qui, à partir d’un **chapitre textuel**, produit une **succession de panels** (liste + description par panel). Ce découpage **construit** le chapitre visuel dans l’Édition de l'œuvre. Les **assets** du chapitre sont déjà connus (détection dans le scénario, fonctionnalité livrée).

| Livrable | Description |
|----------|-------------|
| **Fonction de découpage** | Entrée : contenu du chapitre textuel (lié au chapitre visuel). Sortie : **liste ordonnée de panels**, chacun avec une **courte description** (lieu, scène, personnages, action). Cette liste définit la **succession de panels** qui **forme le chapitre visuel**. Chaque panel est une **structure** 720×5000 (blocs à remplir avec des images + bulles + effets à ajouter ensuite). |
| **Estimation de la taille du découpage** | Utiliser la **dimension 720×5000** (taille d’un panel) pour estimer le **nombre de panels** et la répartition du contenu (ex. une unité narrative ou une scène par panel, en fonction de la longueur du chapitre). |
| **Implémentation** | Découpage par **IA** (LLM : chapitre → liste de panels avec descriptions) et/ou **manuel** (l’utilisateur définit les panels dans la section Scénario ou dans l’Édition de l'œuvre). Stockage : colonne JSONB sur `scenario_chapters` ou table dédiée ; synchronisation avec les enregistrements `panels` du chapitre visuel (chaque panel = conteneur 720×5000 avec `layout.blocs` à remplir). |
| **Création du chapitre visuel à partir du découpage** | Lors de la création (ou de l’édition) d’un chapitre visuel lié à un chapitre texte : **appliquer le découpage** pour créer la **succession de panels** (enregistrements `panels` avec description / prompt par panel ou par bloc). Chaque panel démarre avec une structure vide (blocs à définir, pas encore d’images) ; l’utilisateur remplit les blocs, ajoute bulles et effets, puis lance la génération des images. |
| **Contexte du chapitre dans le prompt** | Pour chaque panel, le **prompt de génération** doit inclure : **style + assets (du chapitre) + contexte du chapitre (lieu, scène, personnages) + description du panel**. Le contexte permet à l’IA d’image d’avoir lieu, scène et personnages cohérents. |

**Optionnel (complément)** : action « IA Panel » pour **suggérer ou réécrire** la description d’un panel individuel (contexte scénario + assets) ; accepter / rejeter. Le prompt d’image reste : style + assets + **contexte chapitre** + description du panel.

---

### Étape 4 — Liaison découpage ↔ Édition de l'œuvre (section Scénario)

**Objectif** : Proposer le découpage **depuis la section Scénario** (par chapitre texte) et l’**importer** dans l’Édition de l'œuvre pour pré-remplir la succession de panels du chapitre visuel.

| Livrable | Description |
|----------|-------------|
| **Découpage dans la section Scénario** | Par chapitre de scénario : déclencher la **fonction de découpage** (Étape 3) ou définir manuellement la liste de panels + descriptions. Stockage en BDD. |
| **Import vers Édition de l'œuvre** | Depuis un chapitre visuel lié à ce chapitre texte : bouton « Importer le découpage » (ou équivalent) pour créer / mettre à jour la **succession de panels** avec les descriptions issues du découpage. |
| **Édition des descriptions** | Dans l’Édition de l'œuvre, chaque panel reste éditable (description, puis génération avec contexte chapitre + assets + description). |

Référence : roadmap Phase 2 § 2.1 (Découpage Chapitre → Panels), rapport § 3.2.

---

### Étape 5 — Génération panel par panel (mode Automatique)

**Objectif** : Pour un chapitre visuel en mode **Automatique**, générer les **images** qui remplissent les **blocs** des panels. Un panel 720×5000 peut n’avoir **qu’un seul bloc** (image pleine) ; **la succession de panels forme le chapitre**. Le prompt inclut le **contexte du chapitre** (lieu, scène, personnages) + assets (déjà présents dans le chapitre textuel) + description du panel/bloc.

| Livrable | Description |
|----------|-------------|
| **Assets du chapitre** | Les **assets sont déjà présents** dans le chapitre textuel (détection dans le scénario, fonctionnalité livrée). Ils sont utilisés tels quels pour cadrer la scène ; complément possible : sélection fine ou ordre par panel si besoin. |
| **Prompt de génération** | Pour **chaque bloc** : **prompt = style projet + assets (du chapitre) + contexte du chapitre (lieu, scène, personnages) + description du bloc**. Le contexte du chapitre est indispensable pour lieu / scène / personnages cohérents. |
| **Génération** | Bouton « Générer » par bloc. Appel Edge Function / API. Image stockée (Storage), mise à jour du bloc dans `panels.layout` (toujours plusieurs blocs par panel). |
| **Dimensions (obligatoires)** | **720 × 5000** (panel). l’image d’un En mode Auto les blocs sont **agencés automatiquement** selon le scénario. En multi-blocs, dimensions des blocs à dériver du layout 720×5000. |
| **Contraintes** | Pas de génération « tout le chapitre d’un coup » (limites API, timeouts, quota). |
| **Régénération / édition** | Possibilité de modifier la description ou le contexte, et de **régénérer** un bloc. Les **bulles et effets** (lignes de mouvement, etc.) sont ajoutés ensuite en **couche** (voir Étape 7). |

---

### Étape 6 — Mode Structuré (blocs)

**Objectif** : Chapitre visuel en mode **Structuré** : l’utilisateur **place** des **blocs** depuis une **bibliothèque de blocs** (formes / emplacements prédéfinis) sur chaque panel ; les **images sont générées à l'intérieur** de chaque bloc. Par bloc : description + **sélection d’assets** ; génération **1 image par bloc**.

| Livrable | Description |
|----------|-------------|
| **Bibliothèque de blocs** | **Base de blocs** (formes / layouts prédéfinis) : l'utilisateur **place** les blocs sur le panel (drag & drop depuis la bibliothèque). Chaque bloc a position, taille (définies par le type ou ajustables). Modèle : `panels.layout` (JSONB) avec `blocks[]` (x, y, width, height, type_bloc, prompt, asset_refs, image_url). |
| **Remplissage des blocs** | Par bloc : champ **description** (éditable ; IA Panel réutilisable) + **sélection d’assets** pour ce bloc. |
| **Génération 1 image par bloc** | Bouton de génération par bloc. Prompt = style + assets du bloc + **contexte du chapitre (lieu, scène, personnages)** + description du bloc. Les **images sont générées à l'intérieur** de chaque bloc ; image stockée et affichée **dans** le bloc. Dimensions à aligner avec le format panel (**720×5000**) selon le layout. |
| **Double visualisation** | Panneau Scénario + panneau Assets (par bloc ou par chapitre) disponible comme en mode Auto. |

---

### Étape 7 — Texte (bulles), effets et lecture

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

| Ordre | Étape | Résumé |
|-------|--------|--------|
| **1** | **Créer la section « Édition de l'œuvre »** | Onglet, liste chapitres visuels, écran d’édition chapitre (shell). Lien BDD `chapters` ↔ `scenario_chapters` si besoin. |
| 2 | Lien textuel ↔ visuel (double visualisation) | Panneaux Scénario + Assets à l’édition du chapitre visuel ; lien `linked_scenario_chapter_id`. |
| 3 | **Découpage chapitre textuel en panels** | Fonction qui découpe le chapitre texte en **succession de panels** (liste + descriptions) ; estimation avec 720×5000 ; contexte chapitre (lieu, scène, personnages) dans le prompt. |
| 4 | Liaison découpage ↔ Édition de l'œuvre | Découpage depuis la section Scénario ; import vers chapitre visuel (création des panels). |
| 5 | Génération (mode Auto) | **Blocs agencés automatiquement** selon le scénario ; images générées par bloc ; prompt = style + assets + **contexte chapitre** + description. Panel 720×5000. |
| 6 | Mode Structuré (blocs) | **Bibliothèque de blocs** à placer sur le panel ; images **générées à l'intérieur** de chaque bloc ; description + assets par bloc. |
| 7 | **Texte, effets et lecture** | **Bulles** (overlay) ; **effets de transition** ; **lignes de mouvement** (dynamiques, vitesse, impact — overlay, option intégré ultérieure) ; rendu panel = blocs + couches ; lecteur webtoon vertical. |

---

## 4. Références

- **Roadmap** : `07_Roadmap_Produit.md` — Phase 2 (Panels & Dialogues)
- **Flux et règles** : `11_Rapport_Chapitres_Flux_Blocs_Scenario.md` — § 2 (flux Auto/Structuré), § 3.4 (double visualisation), § 3.5 (IA Panel)
- **UX** : `UX.md` — § 3.2 (Édition de l’œuvre)
- **Modèle de données** : `08_Modele_de_Donnees.md` — `chapters`, `panels`, `scenario_chapters`

---

*Dernière mise à jour : 14 février 2026*
