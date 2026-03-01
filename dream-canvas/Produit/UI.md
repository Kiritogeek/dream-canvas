## Guide UI – Parcours de création d’un webtoon

Ce document décrit l’intention UX derrière les principaux écrans et l’ordre visuel des étapes pour créer un webtoon dans DreamWeave.

---

## Vue Projet – Les 4 étapes principales

Dans la page **Détail d’un projet**, l’utilisateur voit un bandeau d’onglets :

1. **Style**
2. **Assets**
3. **Scénario**
4. **Édition de l’œuvre**

Chaque onglet est précédé d’un **chiffre dans un rond** (1, 2, 3, 4) pour matérialiser visuellement l’ordre recommandé. L’objectif est que l’utilisateur comprenne en un coup d’œil qu’il s’agit d’un **workflow séquentiel** et pas seulement de filtres indépendants.

### 1. Style

- **But** : définir l’ADN visuel de l’œuvre avant toute production d’images.
- **Éléments UI clés** :
  - Zone de configuration du **style template** (mots-clés, ambiance, références visuelles).
  - Aperçus/description du style sélectionné.
- **Raison UX** :
  - Le style est la fondation ; il doit être fixé avant de générer des assets pour éviter les incohérences visuelles entre personnages, décors et panels.

### 2. Assets

- **But** : constituer la bibliothèque de **personnages, décors, objets** cohérents avec le style défini.
- **Éléments UI clés** :
  - Grille de cartes d’assets (vignettes).
  - Boutons d’ajout/génération IA avec feedback d’état (en cours, terminé, erreur).
  - Filtres par type d’asset (personnage, décor, objet).
- **Raison UX** :
  - Construire les assets avant le scénario visuel permet de **penser les scènes en fonction de ce qui existe déjà** et de réutiliser la bibliothèque tout au long de la production.

### 3. Scénario

- **But** : écrire et structurer l’histoire, puis la découper en **chapitres** et en **panels scénarisés**.
- **Éléments UI clés** :
  - Zone de texte pour le scénario / chapitre.
  - Outils de génération IA (proposition de panels, résumés, variations).
  - Visualisation de la structure (chapitre, panels, temps fort).
- **Raison UX** :
  - Le scénario texte est la colonne vertébrale ; il précède l’édition graphique pour que chaque panel ait une **intention narrative claire**.

### 4. Édition de l’œuvre

- **But** : passer du scénario à la mise en page webtoon (panels) : disposer les blocs, générer les images, placer les bulles et effets.
- **Éléments UI clés** :
  - Canvas de panels avec zoom vertical type webtoon.
  - Blocs d’images, blocs de couleur, bulles de dialogue/pensée, effets.
  - Double vue : scénario à droite, panel editor à gauche.
- **Raison UX** :
  - C’est la phase finale où l’on combine **style + assets + scénario** pour produire des pages prêtes à la lecture. La structure en onglets rappelle que cette étape repose sur les décisions prises dans les trois précédentes.

---

## Principes UI généraux

- **Visualiser le flux plutôt que le texte** :
  - Utiliser des **chiffres entourés**, des flèches et des titres clairs pour montrer le chemin plutôt que de l’expliquer uniquement en texte.
  - Les labels d’onglets restent courts (Style, Assets, Scénario, Édition de l’œuvre) pour être lisibles même sur mobile.

- **Progression douce, non bloquante** :
  - L’utilisateur **peut** aller directement à l’onglet 3 ou 4, mais l’UI lui suggère le chemin optimal (1 → 2 → 3 → 4).
  - Pas de verrouillage dur, mais des messages/contextes qui rappellent l’ordre recommandé (ex. vide d’assets dans Édition → suggestion d’aller sur l’onglet Assets).

- **Cohérence visuelle** :
  - Même style pour les ronds numérotés (taille, couleur, contraste) pour renforcer la notion de **étapes d’un même parcours**.
  - Réutilisation du thème global (glass, couleurs `primary`, `muted`, etc.) pour intégrer les étapes dans le reste de l’interface.

---

## Extensions possibles

- Afficher une **mini-frise** ou timeline récapitulative sur la page Projet qui reprenne les 4 étapes avec un état :
  - Non commencé / En cours / Terminé (ex. via icônes, puces colorées).
- Ajouter de petites **info-bulles d’aide** sur chaque onglet pour expliquer en une phrase l’étape (utile pour les nouveaux utilisateurs).
- À terme, connecter l’état de progression (par ex. « X assets créés », « scénario découpé en Y panels », « Z panels édités ») pour donner un **retour d’avancement global** sur le projet.

