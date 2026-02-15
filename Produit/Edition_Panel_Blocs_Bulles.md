# Édition de panel — Blocs et bulles

> Définition du **système d'édition** d'un panel : agencement des **blocs**, prompts par bloc, **génération d'image par bloc** (selon la forme du bloc), **bulles de texte**, et **visualisation totale** du panel en 720×5000 px.

---

## 1. Dimensions et visualisation du panel

| Élément | Valeur | Description |
|--------|--------|-------------|
| **Dimensions du panel** | **720 × 5000** pixels | Taille fixe du **contenant** du panel (bande verticale webtoon). |
| **Visualisation en édition** | **720 × 5000** px | L'interface doit afficher le panel en **taille réelle** (ou avec zoom homogène) pour que l'utilisateur voie l'agencement exact des blocs et des bulles. Scroll vertical si la hauteur dépasse la fenêtre. |

Le panel est donc une **surface fixe 720×5000** dans laquelle s'organisent :
- les **blocs** (zones d'images),
- les **bulles de texte** (dialogue, pensée, narration),
- et plus tard les effets (transitions, lignes de mouvement).

---

## 2. Workflow : avant la génération d'images

L'ordre de travail est le suivant :

1. **Agencement des blocs**  
   L'utilisateur **ajoute des blocs** par **glisser-déposer** (bloc 500×500 déposé sur le panel), **déplace** les blocs par glisser-déposer, et **édite** la largeur/hauteur de chaque bloc. Chaque bloc est un rectangle dans l'espace 720×5000.

2. **Prompts par bloc**  
   Dans **chaque bloc**, l'utilisateur saisit un **prompt** (description de la scène / de l'illustration pour ce bloc). Le prompt du panel (description globale) peut servir de **contexte** pour tous les blocs, mais chaque bloc a son propre prompt.

3. **Génération par bloc**  
   La **génération d'image** se fait **bloc par bloc**. Pour chaque bloc :
   - **Dimensions de l'image générée (OBLIGATOIRE)** : l'espace de l'image doit **obligatoirement** prendre les **dimensions du bloc concerné** (largeur × hauteur du rectangle). L'API de génération reçoit ces dimensions ; l'image produite est affichée dans le bloc et doit correspondre à sa forme.
   - **Prompt** = style projet + contexte chapitre + (optionnel) description panel + **prompt du bloc**.
   - L'image générée est stockée (Storage) et affichée **dans** le bloc (`layout.blocks[].image_url`).

**Règle** : pas de génération globale « tout le panel » ; on ne génère qu'après avoir **agencé les blocs** et renseigné les **prompts par bloc**. **La forme du bloc détermine obligatoirement les dimensions envoyées à l'API de génération** — on peut générer des images dans les blocs, et chaque image doit utiliser l'espace (largeur × hauteur) du bloc concerné.

---

## 3. Système d'édition — Blocs

| Fonctionnalité | Description |
|----------------|-------------|
| **Par défaut : aucun bloc** | À la **création d'un panel** (découpage / import), le panel est créé **sans bloc** (`layout.blocks = []`). L'utilisateur ajoute des blocs par **glisser-déposer**. |
| **Dimensions par défaut d'un bloc** | Un **nouveau bloc** fait **500 × 500** pixels. |
| **Ajout de blocs** | **Glisser-déposer** : une source « Bloc 500×500 » est déposée **sur le panel** à la position voulue ; un bloc 500×500 est créé à ces coordonnées (x, y). Option : bouton « Ajouter en (0,0) » pour créer un bloc en haut à gauche. |
| **Contraintes panel** | **Aucun bloc ne peut dépasser** la zone du panel : 720×5000. Toutes les opérations (ajout, déplacement, redimensionnement) sont **bornées** pour que le bloc reste entièrement à l'intérieur. |
| **Déplacement d'un bloc** | Chaque bloc est **déplaçable** : **glisser-déposer** du bloc sur le canvas du panel pour modifier sa position (x, y). La position est **clampée** pour rester dans le panel. |
| **Redimensionnement type Canva** | **Au glisser uniquement** : en faisant glisser une **bordure** (ou un coin) du bloc, l'utilisateur étire ou réduit le bloc. Curseurs adaptés (ns-resize / ew-resize / coins). **Aucun comportement au survol** des bords (pas de changement de taille au simple survol). Les dimensions restent **dans le panel** (min 100 px, x+largeur ≤ 720, y+hauteur ≤ 5000). |
| **Édition des dimensions** | En complément : champs **largeur** et **hauteur** (éditables) + bouton « Appliquer dimensions » pour enregistrer. Mêmes contraintes. |
| **Prompt et génération** | Dans chaque bloc : **prompt** éditable (description de la scène). Bouton **Générer** : génération d'image pour ce bloc (style + contexte chapitre + prompt). **L'image générée utilise obligatoirement les dimensions du bloc** (largeur × hauteur) pour l'espace de l'image ; elle s'affiche **dans le bloc** sur le panel. |
| **Suppression** | **Supprimer un bloc** : bouton par bloc ; le bloc est retiré de `layout.blocks`. |
| **Visualisation** | Le panel (720×5000) est affiché avec un **fond quadrillé** (grille) pour identifier les blocs ; chaque bloc est délimité (bordure, ombre) et affiche son image générée ou un placeholder. |

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

## 4. Système d'édition — Bulles de texte

| Fonctionnalité | Description |
|----------------|-------------|
| **Stockage** | `panels.speech_bubbles` (JSONB) : tableau de bulles. |
| **Types** | Parole, pensée, cri, chuchotement, narration (bibliothèque de formes prédéfinies). |
| **Par bulle** | **Texte** éditable, **position** (x, y) sur le panel 720×5000, **style** (couleur contour, couleur intérieur, police, taille). |
| **Placement** | Drag & drop sur le panel ; les bulles sont en **overlay** au-dessus des blocs (couche client, pas dans l'image générée). |

Format prévu (voir `08_Modele_de_Donnees.md`) : `id`, `type`, `text`, `position`, `style`, optionnel `character`.

Les bulles sont **éditables** (texte, position, style) dans l'éditeur de panel. Rendu final : composition blocs + bulles en overlay, dimensions 720×5000.

---

## 5. Récapitulatif — Ordre des opérations

1. **Créer / importer les panels** (découpage chapitre → panels). Par défaut **aucun bloc**.  
2. **Pour chaque panel** :  
   - **Visualisation 720×5000** : afficher le panel avec fond quadrillé.  
   - **Ajouter des blocs** : glisser « Bloc 500×500 » sur le panel (ou « Ajouter en (0,0) »).  
   - **Déplacer les blocs** : glisser-déposer chaque bloc sur le canvas.  
   - **Éditer les dimensions** : largeur et hauteur par bloc, puis « Appliquer dimensions ».  
   - **Renseigner les prompts** dans chaque bloc.  
   - **Générer les images** bloc par bloc (bouton « Générer » ; **chaque image utilise les dimensions du bloc concerné** ; l'image s'affiche dans le bloc).  
   - **Ajouter les bulles** (texte, position, style).  
3. **Rendu final** : panel 720×5000 = blocs (images) + overlay (bulles + effets).

---

## 6. Références

- **Plan Phase 2** : `Plan_Phase2_Edition_Oeuvre.md` — Étapes 5 (génération par bloc), 6 (mode Structuré), 7 (bulles, effets).
- **Modèle de données** : `08_Modele_de_Donnees.md` — `panels.layout`, `panels.speech_bubbles`.
- **Rapport flux** : `11_Rapport_Chapitres_Flux_Blocs_Scenario.md`.

---

*Dernière mise à jour : février 2026*
