# Édition de panel — Blocs et bulles

> Définition du **système d'édition** d'un panel : agencement des **blocs**, prompts par bloc, **génération d'image par bloc** (les **images sont générées dans les blocs**), **bulles de texte**, et **visualisation totale** du panel en 800×5000 px (hauteur configurable dans des bornes). L'édition se fait via des **sous-menus visuels** (colonne gauche) et un **suivi chapitre textuel** (colonne droite). Voir `Edition_Panel_Deux_Modes.md`.

---

## 1. Images dans les blocs — rappel

**C'est dans les blocs que les images sont générées.** Chaque bloc est une zone (position, dimensions) ; l'utilisateur renseigne un **prompt** pour ce bloc ; la génération produit une **image** aux dimensions du bloc, affichée **dans** le bloc (`layout.blocks[].image_url`). Pas de génération « tout le panel » : une image par bloc.

---

## 2. Dimensions et visualisation du panel

| Élément | Valeur | Description |
|--------|--------|-------------|
| **Dimensions du panel** | **800 × hauteur variable** pixels | Largeur fixe 800 px ; hauteur configurable dans l'éditeur (bornée min/max). |
| **Visualisation en édition** | **800 × hauteur courante** px | L'interface affiche le panel en **taille réelle** pour voir l'agencement exact des blocs et des bulles. **Scroll vertical uniquement** (pas de scroll horizontal). |
| **Marges autour du canvas** | Variables selon layout | Espace visuel autour du canvas dans la modale plein écran ; n'appartient pas au panel lui-même. |
| **Scroll** | Vertical uniquement | La zone scrollable ne défile qu'en hauteur ; le contenu ne dépasse pas en largeur. |

Le panel est donc une **surface 800×H** (H bornée) dans laquelle s'organisent :
- les **blocs** (zones d'images),
- les **blocs de couleurs** (zones de couleur pour remplir les espaces entre les blocs — ambiance du panel),
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
- Les actions de structure (**ajout/déplacement/redimensionnement des blocs**) restent disponibles dans le flux d'édition panel.
- L'accès se fait via des **pictos** en colonne gauche (sans texte sous les icônes, mode sombre renforcé).

Spécification détaillée : **`Edition_Panel_Deux_Modes.md`**.

---

## 4. Workflow : avant la génération d'images

L'ordre de travail est le suivant :

1. **Agencement des blocs**  
   L'utilisateur **ajoute des blocs** par **glisser-déposer** (bloc 500×500 déposé sur le panel), **déplace** les blocs par glisser-déposer, et **édite** la largeur/hauteur de chaque bloc. Chaque bloc est un rectangle dans l'espace 800×H.

2. **Prompts par bloc**  
   Dans **chaque bloc**, l'utilisateur saisit un **prompt** (description de la scène / de l'illustration pour ce bloc). Le prompt du panel (description globale) peut servir de **contexte** pour tous les blocs, mais chaque bloc a son propre prompt.

3. **Génération par bloc**  
   La **génération d'image** se fait **bloc par bloc**. Pour chaque bloc :
   - **Dimensions (OBLIGATOIRE)** : l'API reçoit la **taille du bloc** (largeur × hauteur). L'image générée a exactement ces dimensions.
   - **Instruction « utiliser toute la place »** : le prompt système indique au modèle de **remplir tout le cadre** (pas de bandeaux, pas de bandes séparatrices, pas de marges vides). L'illustration doit occuper **toute la surface** du bloc.
   - **Prompt** = style projet + (optionnel) contexte chapitre + **prompt du bloc**.
   - **Stockage** : image par bloc dans Storage (`panels/{panel_id}/blocks/{block_id}.png`) ; URL enregistrée dans `layout.blocks[].image_url`.

**Règle** : pas de génération globale « tout le panel » ; on ne génère qu'après avoir **agencé les blocs** et renseigné les **prompts par bloc**. **La forme du bloc détermine obligatoirement les dimensions envoyées à l'API de génération** — on peut générer des images dans les blocs, et chaque image doit utiliser l'espace (largeur × hauteur) du bloc concerné.

**Implémentation** : génération par bloc implémentée (Étape 5 livrée). Edge Function `generate-panel-image` ; service `services/panels.ts` (`generatePanelBlockImage`) ; hooks `usePanels.ts` (`useGeneratePanelImage`). Stockage : `{user_id}/projects/{project_id}/panels/{panel_id}/blocks/{block_id}.png`. Voir `09_Specifications_API.md` § 3.2.

---

## 5. Système d'édition — Blocs (mode Architecture)

| Fonctionnalité | Description |
|----------------|-------------|
| **Par défaut : aucun bloc** | À la **création d'un panel** (création manuelle ou import d'une suggestion), le panel est créé **sans bloc** (`layout.blocks = []`). L'utilisateur ajoute des blocs par **glisser-déposer**. |
| **Dimensions par défaut d'un bloc** | Un **nouveau bloc** fait **500 × 500** pixels. |
| **Ajout de blocs** | **Glisser-déposer** : une source « Bloc 500×500 » est déposée sur le panel ; **prévisualisation 500×500** pendant le drag (ghost centré sur le curseur). Au dépôt, le bloc est créé avec son **centre** au point de dépôt (coordonnées x, y = centre moins 250 px). Option : bouton « Ajouter en (0,0) ». |
| **Contraintes panel** | **Aucun bloc ne peut dépasser** la zone du panel : 800×H (hauteur bornée). Toutes les opérations (ajout, déplacement, redimensionnement) sont **bornées** pour que le bloc reste entièrement à l'intérieur. |
| **Déplacement d'un bloc** | Chaque bloc est **déplaçable** : **glisser-déposer** du bloc sur le canvas du panel pour modifier sa position (x, y). La position est **clampée** pour rester dans le panel. |
| **Redimensionnement type Canva** | **Au glisser uniquement** : bordures et **coins** avec **hitbox élargie** (bordures 9 px, coins 15×15 px) pour faciliter la prise. **Survol** : léger style (fond primary/30) pour indiquer la zone cliquable. Curseurs adaptés (ns-resize / ew-resize / coins). Dimensions **dans le panel** (min 100 px, x+largeur ≤ 720, y+hauteur ≤ 5000). |
| **Édition des dimensions** | En complément : champs **largeur** et **hauteur** (éditables) + bouton « Appliquer dimensions » pour enregistrer. Mêmes contraintes. |
| **Prompt et génération** | Le **prompt** est éditable **par bloc** dans le **panneau latéral** (Textarea). **Aperçu des mentions d'assets** : sous le champ, le texte est affiché avec surbrillance des assets (personnages, décors, objets) et hover pour afficher l'asset (même composant que l'Aperçu scénario). Bouton **Générer** par bloc. Génération : template de style du projet + **contexte chapitre** (depuis la suggestion ou la description du panel) + prompt du bloc. Sur **plan Pro**, les références d'images fournies par `block_asset_image_urls` (les sheets des assets) sont utilisées via FAL **image edit** pour conserver l'identité visuelle ; sur **Free**, fallback **text-to-image**. **L'image générée utilise obligatoirement les dimensions du bloc** (largeur × hauteur) ; elle s'affiche **dans le bloc** sur le panel. |
| **Suppression** | **Supprimer un bloc** : bouton **au survol** du bloc (icône poubelle), positionné **milieu horizontal / moitié bas** du bloc (environ 25 % depuis le bas). Clic → bloc retiré de `layout.blocks`. Également disponible dans le panneau latéral. |
| **Visualisation** | Le panel (800×H) est affiché avec un **fond quadrillé** (grille) ; chaque bloc est délimité (bordure, ombre) et affiche son image générée ou un placeholder. |

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

> **Objectif** : Même système que les blocs d'architecture (position, dimensions), mais pour la **couleur**. Remplir les **espaces entre les blocs d'image** par des zones de couleur — dans les webtoons, le fond du panel est important pour signifier l'ambiance (nuit, tension, flash-back).

| Fonctionnalité | Description |
|----------------|-------------|
| **Principe** | **Blocs de couleurs** : position (x, y), largeur, hauteur comme les blocs d'image. Pas de génération d'image ; remplissage par **couleur unie** ou **dégradé**. |
| **Remplissage** | Par bloc couleur : sélecteur de couleur (unie ou dégradé). Les blocs couleur servent à remplir les **interstices** entre les blocs d'image. |
| **Ordre de rendu** | Blocs de couleurs en **arrière-plan** ; blocs image par-dessus. Option : ordre des calques configurable. |
| **Stockage** | Ex. `panels.color_blocks` (JSONB) ou extension de `layout`. Format par bloc : `id`, `x`, `y`, `width`, `height`, `fill` (couleur ou dégradé). |
| **Menu Couleur (fond global)** | En complément : couleur de fond du panel pour les zones non couvertes par blocs couleur ou image (`panels.background_style`). |

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

Texte libre dans le panel **sans forme de bulle** (narration, titres, onomatopées). **Police / font**, **taille**, couleur éditables. Placement par drag & drop. Stockage dédié (ex. `panels.text_elements` JSONB).

**Personnalisation typographique** : pour **bulles et texte brut** : choix de la **police** (font), **taille**, couleur du texte (étendu dans l’éditeur avancé : graisse, italique, alignement, espacement, ombre).

Rendu final : composition blocs (images) + blocs de couleurs (arrière-plan) + overlay (bulles + texte brut), dimensions 800×H.

---

## 8. Expérience UI actuelle (modale édition)

- **Plein écran immersif** : l'édition panel s'ouvre en 100vw/100vh.
- **Panel centré fixe** : le canvas reste visuellement centré ; l'ouverture/fermeture d'outils latéraux ne doit pas décaler la zone d'édition.
- **Colonne gauche** : sous-menus d'actions par pictos (UI compacte).
- **Colonne droite** : suivi **Chapitre textuel** avec picto dédié.
- **Chapitre textuel verrouillé actif** : le sous-menu de droite ne doit pas être désactivable en production.

---

## 9. Récapitulatif — Ordre des opérations

1. **Créer les panels** (à la main ou en important une suggestion). Par défaut **aucun bloc**.  
2. **Pour chaque panel** :  
   - **Structure** : ajouter/déplacer/redimensionner les blocs.  
   - **Personnalisation** : éditer prompt + générer image par bloc.  
   - **Couleurs** : remplir les espaces avec blocs de couleur.  
   - **Dialogue** : poser les bulles et éditer texte/style.  
3. **Rendu final** : panel 800×H = blocs de couleurs (arrière-plan) + blocs (images) + overlay (bulles + texte brut + effets).

---

## 10. Références

- **Sous-menus d’édition** : `Edition_Panel_Deux_Modes.md` — organisation actuelle par Personnalisation / Couleurs / Dialogue.
- **Éditeur avancé bulles** : composant `src/components/project/SpeechBubbleEditor.tsx` — types dialogue, pensée, cri, narrative ; bulles connectées ; queue ; style texte complet (police, taille, gras, italique, alignement, ombre) ; forme (arrondi, bordure, remplissage uni/dégradé) ; calques.
- **Plan Phase 2** : `Plan_Phase2_Edition_Oeuvre.md` — Étapes 5 (blocs + génération) ✅ livrée, 6 (mode Structuré), 7 (blocs de couleurs, bulles, texte brut, effets, fond, lecture).
- **API génération par bloc** : `09_Specifications_API.md` § 3.2 — Edge Function `generate-panel-image`.
- **Modèle de données** : `08_Modele_de_Donnees.md` — `panels.layout`, `panels.speech_bubbles` (format minimal et étendu).
- **Rapport flux** : `11_Rapport_Chapitres_Flux_Blocs_Scenario.md`.

---

*Dernière mise à jour : 15 avril 2026 — UI édition panel plein écran immersive, sous-menus par pictos, suivi chapitre textuel en colonne droite, panel centré fixe, harmonisation mode sombre.*
