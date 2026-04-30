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

- **Blocs et bulles** : `Edition_Case_Blocs_Bulles.md` — workflow, format blocs, génération par bloc, bulles.
- **Plan Phase 2** : `Plan_Phase2_Edition_Oeuvre.md` — Étapes 5 (blocs + génération), 6 (mode Structuré), 7 (blocs de couleurs, bulles, texte brut, effets).
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
