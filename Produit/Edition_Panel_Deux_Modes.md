# Édition de panel — Deux modes (Architecture / Édition)

> Les **images sont générées dans les blocs** du panel. À terme, l'édition se fait selon **deux modes** : **Architecture** (structure des blocs) et **Édition** (contenu : prompts, bulles, effets, fond, texte). **Implémentation actuelle** : **vue unifiée** (pas de bascule Architecture | Édition) — canvas 720×5000 + panneau latéral par panel ; prompt par bloc et dimensions dans le panneau latéral ; **aperçu des mentions d'assets** sous le prompt (surbrillance + hover) ; **contexte chapitre** envoyé à l'API de génération. Bascule des deux modes = évolution possible (Étape 6 ou complément).

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
| **Ajout de blocs** | Glisser-déposer « Bloc 500×500 » sur le panel : **prévisualisation 500×500** pendant le drag ; au dépôt, le **centre** du bloc est placé au point de dépôt. Option « Ajouter en (0,0) ». |
| **Position des blocs** | Chaque bloc est **déplaçable** par glisser-déposer ; position (x, y) mise à jour au dépôt. Contraintes : bloc entièrement dans 720×5000. |
| **Dimensions des blocs** | **Redimensionnement** par poignées (bordures 9 px, coins 15×15 px) au glisser ; **survol** des poignées : léger fond pour indiquer la zone. Champs **largeur** et **hauteur** éditables + « Appliquer dimensions ». Dimensions bornées (min 100 px, dans le panel). |
| **Canvas** | Fond quadrillé 720×5000 ; blocs avec bordure/ombre ; pas d'édition de prompt ni de bulles dans ce mode. Marges 20 px L/R, 15 px haut/bas ; scroll vertical uniquement. |
| **Suppression** | **Au survol** du bloc : bouton supprimer (icône poubelle) centré en bas du bloc ; clic → bloc retiré. Également dans le panneau latéral. |

**Règle** : en mode Architecture, on **ne modifie pas** le prompt des blocs ni les bulles/effets/texte. Uniquement structure (ajout, position, dimensions, suppression de blocs).

---

## 3. Mode Édition

**Objectif** : éditer le **contenu** du panel : prompts des blocs (pour la génération d'image), bulles de dialogue, effets, couleur de fond, texte libre (typo). Le canvas est en **lecture seule** pour la structure (pas de déplacement ni redimensionnement des blocs).

| Fonctionnalité | Description |
|----------------|-------------|
| **Clic sur un bloc** | À terme : **popup** (dialog) pour saisir/modifier le prompt du bloc. **Actuellement** : le prompt est édité dans le **panneau latéral** (Textarea par bloc) ; **aperçu des mentions d'assets** sous le champ (surbrillance + hover, même composant que l'Aperçu scénario). |
| **Bibliothèque de bulles de dialogue** | Même principe que les blocs : **bibliothèque** de formes/types (parole, pensée, cri, chuchotement, narration). L'utilisateur **place** les bulles sur le panel (glisser-déposer depuis la bibliothèque). Par bulle : **texte éditable**, position, style (couleur contour, intérieur, police, taille). Stockage `panels.speech_bubbles`. |
| **Menu Couleur** | **Menu dédié** pour modifier la couleur de fond du panel : sélecteur de couleur (couleur unie ou dégradé), aperçu en temps réel. Stockage dans le panel (ex. `panels.background_color` ou `panels.background_style`). |
| **Bibliothèque d'effets** | **Bibliothèque d'éléments visuels** pour enrichir le panel et donner de la profondeur, douceur, émotion et vivant à l'œuvre. Effets organisés par catégories : **profondeur** (ombres portées, lumières directionnelles, atmosphère), **douceur** (flou artistique, transitions douces, brume), **émotion** (météo, ambiances colorées, filtres), **vivant** (lignes de mouvement, particules, dynamisme). L'utilisateur **choisit et applique** un effet sur le panel (ou sur une zone). Positions/types/styles/intensité stockés en JSONB (ex. `panels.effects` ou champs dédiés). |
| **Ajout de texte** | Possibilité d'**ajouter du texte** sur le panel (texte libre, hors bulles) : **choix de la typographie** (police, taille, couleur). Position par glisser-déposer ou coordonnées. Stockage en overlay (ex. texte + position + style dans un tableau dédié par panel). |

**Règle** : en mode Édition, on **ne déplace ni ne redimensionne** les blocs ; le canvas affiche les blocs en lecture seule. Toute l'édition de contenu (prompt, bulles, effets, fond, texte) se fait via popups, panneau latéral ou bibliothèques.

**Génération par bloc** : l'API reçoit les **dimensions du bloc** (largeur × hauteur) et une **instruction** pour que l'image **remplisse tout le cadre** (pas de bandeaux ni bandes séparatrices). Stockage : `panels/{panel_id}/blocks/{block_id}.png`.

---

## 4. Bascule entre les modes (cible)

- **Sélecteur** (à implémenter) : en tête de la zone Panels, **deux onglets ou boutons** : **Architecture** | **Édition**.
- **État** : un seul mode actif à la fois pour toute la page (tous les panels du chapitre).
- **Persistance** : le mode peut être conservé en session (state) ; pas d'obligation de le persister en base.
- **Actuellement** : pas de bascule ; une seule vue combine canvas (blocs déplaçables/redimensionnables) et panneau latéral (prompt, dimensions, générer par bloc).

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
| Bibliothèque d'effets | Non | Oui (appliquer effets sur le panel : profondeur, douceur, émotion, vivant) |
| Menu Couleur (fond du panel) | Non | Oui (sélecteur couleur unie/dégradé) |
| Ajout de texte (typo) | Non | Oui |

---

## 6. Références

- **Blocs et bulles** : `Edition_Panel_Blocs_Bulles.md` — workflow, format blocs, génération par bloc, bulles.
- **Plan Phase 2** : `Plan_Phase2_Edition_Oeuvre.md` — Étapes 5 (blocs + génération), 6 (mode Structuré), 7 (bulles, effets).
- **Modèle de données** : `08_Modele_de_Donnees.md` — `panels.layout`, `panels.speech_bubbles`, effets.
- **Scénario (détection assets)** : même logique que dans l'Aperçu du scénario (surbrillance, hover) pour le **prompt du bloc** dans la popup d'édition.

---

---

## 7. Détails d'implémentation (livrés)

| Élément | Détail |
|--------|--------|
| **Visualisation panel** | Marges 20 px gauche/droite, 15 px haut/bas ; scroll vertical uniquement (pas de scroll horizontal). |
| **Placement nouveau bloc** | Centre du bloc 500×500 au point de dépôt ; prévisualisation 500×500 pendant le glisser. |
| **Suppression** | Bouton au survol du bloc (milieu / moitié bas), plus panneau latéral. |
| **Poignées de redimensionnement** | Hitbox élargie (bordures 9 px, coins 15 px) ; style au survol pour indiquer la zone. |
| **Génération par bloc** | Edge Function `generate-panel-image` ; dimensions (width, height) du bloc envoyées à l'API ; instruction « remplir tout le cadre » dans le prompt ; stockage `{user_id}/projects/{project_id}/panels/{panel_id}/blocks/{block_id}.png`. Voir `09_Specifications_API.md` § 3.2. |

---

*Dernière mise à jour : février 2026*
