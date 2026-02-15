# Édition de panel — Deux modes (Architecture / Édition)

> Les **images sont générées dans les blocs** du panel. L'édition d'un panel se fait selon **deux modes** : **Architecture** (structure des blocs) et **Édition** (contenu : prompts, bulles, effets, fond, texte).

---

## 1. Principe : images dans les blocs

- Chaque **panel** est une surface **720×5000** contenant des **blocs**.
- **C'est dans les blocs** que les images sont générées : un bloc = une zone (position, dimensions) + un **prompt** → une **image** affichée dans ce bloc.
- L'utilisateur travaille en **deux modes** pour construire et remplir le panel : **Architecture** puis **Édition** (ou en alternance).

---

## 2. Mode Architecture

**Objectif** : définir la **structure** du panel (où sont les blocs, leur taille). Aucune édition de contenu textuel ni de bulles/effets dans ce mode.

| Fonctionnalité | Description |
|----------------|-------------|
| **Ajout de blocs** | Glisser-déposer « Bloc 500×500 » sur le panel (ou bouton « Ajouter en (0,0) »). Création d'un bloc aux coordonnées de dépôt. |
| **Position des blocs** | Chaque bloc est **déplaçable** par glisser-déposer sur le canvas ; la position (x, y) est mise à jour au dépôt. Contraintes : bloc entièrement dans 720×5000. |
| **Dimensions des blocs** | **Redimensionnement** par poignées (bordures et coins) au glisser ; champs **largeur** et **hauteur** éditables + « Appliquer dimensions ». Dimensions bornées (min 100 px, dans le panel). |
| **Canvas** | Fond quadrillé 720×5000 ; blocs avec bordure/ombre ; pas d'édition de prompt ni de bulles dans ce mode. |
| **Suppression** | Bouton « Supprimer » par bloc (dans le panneau latéral). |

**Règle** : en mode Architecture, on **ne modifie pas** le prompt des blocs ni les bulles/effets/texte. Uniquement structure (ajout, position, dimensions, suppression de blocs).

---

## 3. Mode Édition

**Objectif** : éditer le **contenu** du panel : prompts des blocs (pour la génération d'image), bulles de dialogue, effets, couleur de fond, texte libre (typo). Le canvas est en **lecture seule** pour la structure (pas de déplacement ni redimensionnement des blocs).

| Fonctionnalité | Description |
|----------------|-------------|
| **Clic sur un bloc** | Ouvre une **popup** (dialog) permettant de **saisir ou modifier le prompt** du bloc pour la génération d'image. **Détection des assets dans le texte** : même comportement que dans le scénario (surbrillance des mentions d'assets existants, hover pour afficher l'asset ; éléments non créés signalés). Le prompt peut référencer les assets du projet ; ces références sont prises en compte à la génération. |
| **Bibliothèque de bulles de dialogue** | Même principe que les blocs : **bibliothèque** de formes/types (parole, pensée, cri, chuchotement, narration). L'utilisateur **place** les bulles sur le panel (glisser-déposer depuis la bibliothèque). Par bulle : **texte éditable**, position, style (couleur contour, intérieur, police, taille). Stockage `panels.speech_bubbles`. |
| **Bibliothèque d'effets** | **Effets** applicables sur le panel (transitions, lignes de mouvement, etc.) : bibliothèque d'effets prédéfinis ; l'utilisateur **choisit et applique** un effet sur le panel (ou sur une zone). Positions/types/styles stockés en JSONB (ex. `panels.effects` ou champs dédiés). |
| **Couleur de fond** | **Choix de la couleur de fond** du panel (couleur unie ou dégradé, selon implémentation). Stockage dans le panel (ex. `panels.background_style` ou champ dédié). |
| **Ajout de texte** | Possibilité d'**ajouter du texte** sur le panel (texte libre, hors bulles) : **choix de la typographie** (police, taille, couleur). Position par glisser-déposer ou coordonnées. Stockage en overlay (ex. texte + position + style dans un tableau dédié par panel). |

**Règle** : en mode Édition, on **ne déplace ni ne redimensionne** les blocs ; le canvas affiche les blocs en lecture seule. Toute l'édition de contenu (prompt, bulles, effets, fond, texte) se fait via popups, panneau latéral ou bibliothèques.

---

## 4. Bascule entre les modes

- **Sélecteur** : en tête de la zone Panels (écran d'édition du chapitre), **deux onglets ou boutons** : **Architecture** | **Édition**.
- **État** : un seul mode actif à la fois pour toute la page (tous les panels du chapitre).
- **Persistance** : le mode peut être conservé en session (state) ; pas d'obligation de le persister en base.

---

## 5. Récapitulatif

| Élément | Mode Architecture | Mode Édition |
|--------|--------------------|--------------|
| Ajouter des blocs | Oui (glisser-déposer, bouton) | Non |
| Modifier position des blocs | Oui (glisser-déposer) | Non |
| Modifier dimensions des blocs | Oui (poignées, champs) | Non |
| Supprimer un bloc | Oui | Optionnel (ou réservé à l'Architecture) |
| Éditer le prompt d'un bloc | Non | Oui (popup avec **détection des assets** comme dans le scénario) |
| Générer l'image d'un bloc | Optionnel (depuis panneau) | Oui (depuis popup ou panneau) |
| Bibliothèque de bulles | Non | Oui (placement + édition texte/style) |
| Bibliothèque d'effets | Non | Oui (appliquer effets sur le panel) |
| Couleur de fond du panel | Non | Oui |
| Ajout de texte (typo) | Non | Oui |

---

## 6. Références

- **Blocs et bulles** : `Edition_Panel_Blocs_Bulles.md` — workflow, format blocs, génération par bloc, bulles.
- **Plan Phase 2** : `Plan_Phase2_Edition_Oeuvre.md` — Étapes 5 (blocs + génération), 6 (mode Structuré), 7 (bulles, effets).
- **Modèle de données** : `08_Modele_de_Donnees.md` — `panels.layout`, `panels.speech_bubbles`, effets.
- **Scénario (détection assets)** : même logique que dans l'Aperçu du scénario (surbrillance, hover) pour le **prompt du bloc** dans la popup d'édition.

---

*Dernière mise à jour : février 2026*
