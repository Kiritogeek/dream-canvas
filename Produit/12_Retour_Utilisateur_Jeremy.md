# Retour Utilisateur — Jeremy

> Source : session de feedback utilisateur (Jeremy)  
> Date : 16 avril 2026  
> Objectif : transformer les retours UX/UI et produit en plan d'action exécutable.

---

## 1) Notes brutes consolidées

### Page d'accueil

- Vérifier que "Webtoon" n'est pas utilisé comme nom de marque.
- Problème de lisibilité typographique : texte trop blanc, contraste insuffisant, page perçue comme "sans vie".
- Ajouter des personnages, décors et bulles pour renforcer l'univers visuel.
- Ajouter un personnage guide (style webtoon) qui accompagne l'utilisateur.
- Les visuels de l'accueil ne doivent pas réutiliser les mêmes images que les exemples de style.
- Les visuels générés doivent prioritairement être intégrés au fond de la page d'accueil pour porter l'identité visuelle globale (plutôt que dans les blocs explicatifs).
- Utiliser une image de référence dédiée du hero de l'accueil pour garantir la cohérence visuelle du site global.
- Les visuels d'accueil doivent montrer explicitement des images réellement générées par l'IA pour rendre la promesse produit immédiatement visible.
- Le fond de la page d'accueil ne doit pas reprendre l'image de référence brute : il doit afficher des exemples de webtoons générés (inspirés du style de référence) pour rendre l'accueil plus vivant.
- Appliquer une palette pastel cohérente :
  - mode clair : texte noir,
  - mode sombre : texte blanc.
- En mode sombre, augmenter globalement la taille des textes pour améliorer la lisibilité.
- Représenter les 4 points clés avec des exemples visuels.

### Connexion / tableau de bord

- Renforcer l'identité visuelle globale sur tout le site.
- Supprimer "Mes projets" de la barre d'action.
- Au clic sur "Nouveau projet", ouvrir une pop-up de création.
- Dans la pop-up de création :
  - ajouter un dé pour générer un titre aléatoire,
  - ajouter un second dé pour générer une description aléatoire.

### Dans un projet — étape Style

- Texte trop petit ; améliorer la lisibilité (référence RGAA).
- Texte blanc requis sur fond sombre.
- Chevrons de navigation trop peu visibles ; les centrer verticalement gauche/droite.
- Corriger la faute "Webtoon Coreen" -> "Webtoon Coréen".
- Ajouter le style "Européen".
- Afficher la précision du style dans la même carte que la sélection de style.
- Ajouter une validation visuelle de sélection + bouton "Valider" pour passer à l'étape suivante.
- Ajouter une navigation latérale persistante des étapes : Style, Assets, Scénario, Édition de l'oeuvre.
- Ajouter "Tableau de bord" en haut de cette navigation latérale.

### Étape Assets

- Ajouter des exemples visuels d'assets pour chaque catégorie.
- Dans la création de projet (pop-up), ajouter une sélection de tags réutilisables ensuite.
- Exemples de tags : style, type de scénario (médiéval, SF, etc.).
- Revoir la génération d'assets (qualité perçue insuffisante).
- Remplacer le parcours Personnages/Décors/Objets par une recherche + filtres.

### Scénario / édition de l'oeuvre

- Les blocs doivent pouvoir être cliqués et déplacés librement.
- Au clic sur un bloc, afficher ses propriétés.
- La touche Suppr doit supprimer le bloc sélectionné.
- Supprimer la notion de panel pendant l'édition :
  - créer le chapitre complet directement,
  - découper en panels seulement au téléchargement/export.
- Viser une expérience d'édition "type Figma" :
  - sélection claire,
  - éléments éditables après sélection.

---

## 2) Plan d'action priorisé

## P0 — Critique (accessibilité, navigation, compréhension)

### 2.1 Lisibilité et contraste global (RGAA)

**Pourquoi**  
Le manque de contraste et la taille de texte trop faible dégradent immédiatement la perception de qualité et l'utilisabilité.

**Actions**

- Définir des tokens de contraste mode clair/sombre (texte, titres, liens, CTA).
- Auditer et corriger tailles de police minimales (body, labels, boutons).
- Appliquer une règle stricte :
  - clair -> texte sombre lisible,
  - sombre -> texte clair lisible.
- En mode sombre, appliquer un scale typographique global (texte plus grand) sur l'interface.
- Valider au minimum les contrastes AA sur les zones principales.

**Critères d'acceptation**

- Aucun texte principal "blanc sur fond clair".
- Contrastes conformes AA sur les écrans critiques (Accueil, Dashboard, Style, Assets, Édition).
- Aucun texte inférieur au minimum défini dans le design system.

### 2.2 Navigation projet persistante

**Pourquoi**  
L'utilisateur ne comprend pas le flux et ne sait pas où agir sans remonter en haut de page.

**Actions**

- Ajouter une barre latérale gauche persistante sur toutes les étapes projet.
- Inclure : Tableau de bord, Style, Assets, Scénario, Édition de l'oeuvre.
- Mettre en évidence l'étape courante + états "fait / en cours / à faire".

**Critères d'acceptation**

- Navigation visible et cliquable sur chaque étape.
- Changement d'étape possible en un clic, sans retour en haut.

### 2.3 Validation explicite de l'étape Style

**Pourquoi**  
Le passage à l'étape suivante n'est pas intuitif.

**Actions**

- Ajouter état visuel de style sélectionné.
- Ajouter bouton primaire "Valider" en bas de zone utile.
- Rendre les chevrons plus visibles et centrés verticalement.
- Corriger "Webtoon Coréen" + ajouter style "Européen".

**Critères d'acceptation**

- L'utilisateur peut sélectionner un style et confirmer via "Valider".
- Le style sélectionné est clairement identifiable.

---

## P1 — Important (adhésion produit et efficacité)

### 2.4 Refonte de l'accueil et identité visuelle

**Actions**

- Ajouter personnage guide style webtoon.
- Introduire visuels de personnages/décors/bulles dans le fond hero de l'accueil, distincts des visuels d'exemples de style.
- Créer un fond "vitrine vivante" avec plusieurs exemples de webtoons générés IA inspirés de la direction artistique de référence.
- Illustrer les 4 points de valeur avec exemples visuels concrets.
- Appliquer palette pastel cohérente au branding global.
- Vérifier le wording légal/branding autour de "Webtoon".
- 2e génération des visuels “accueil vitrine” avec une direction plus européenne (ligne claire, plus de contraste), pour rendre l’accueil plus vivant tout en restant cohérent.

**Critères d'acceptation**

- Landing plus incarnée visuellement, cohérente avec l'univers créatif.
- Les 4 bénéfices clés sont compréhensibles en moins de 10 secondes.

### 2.5 Pop-up de création de projet améliorée

**Actions**

- Ouvrir systématiquement une modale via "Nouveau projet".
- Supprimer "Mes projets" de la barre d'action si redondant.
- Ajouter 2 dés :
  - génération titre,
  - génération description.
- Ajouter des tags à la création du projet (style, ambiance, genre).

**Critères d'acceptation**

- Création projet possible sans quitter le dashboard.
- Titre/description auto-générables en un clic chacun.
- Tags enregistrés et réutilisables dans les étapes suivantes.

### 2.6 Assets : recherche/filtres + exemples

**Actions**

- Remplacer la navigation rigide par recherche + filtres combinables.
- Conserver catégories comme filtres, pas comme parcours imposé.
- Ajouter exemples visuels dans chaque catégorie.

**Critères d'acceptation**

- Un asset est trouvable en moins de 3 interactions.
- Les catégories affichent des aperçus concrets.

---

## P2 — Structurant (éditeur avancé et qualité IA)

### 2.7 Édition type Figma (blocs)

**Actions**

- Sélection explicite d'un bloc au clic.
- Panneau de propriétés du bloc sélectionné.
- Support de la suppression via touche Suppr.
- Liberté de positionnement/interactions des blocs.

**Critères d'acceptation**

- Le bloc sélectionné est identifiable visuellement.
- Suppr supprime uniquement le bloc actif.

### 2.8 Workflow "chapitre d'abord, panel à l'export"

**Actions**

- Retirer la contrainte panel pendant l'édition.
- Passer à une édition continue du chapitre.
- Générer le découpage panel au moment du téléchargement/export.

**Critères d'acceptation**

- L'utilisateur édite un flux chapitre continu.
- Le découpage panel est proposé seulement à l'export.

### 2.9 Amélioration qualité génération assets

**Actions**

- Auditer prompts, paramètres de génération, post-traitements.
- Mettre en place mesure qualité perçue (test interne + user test).
- Prioriser cohérence style + netteté + lisibilité.

**Critères d'acceptation**

- Hausse mesurable de la satisfaction perçue sur la qualité visuelle.

---

## 3) Roadmap proposée (3 sprints)

### Sprint 1 (P0)

- Accessibilité typographie/contraste.
- Navigation latérale persistante.
- Validation étape Style (bouton + feedback visuel).
- Corrections micro-copy ("Webtoon Coréen"), chevrons visibles.

### Sprint 2 (P1)

- Refonte landing (identité visuelle + 4 points illustrés + guide).
- Pop-up création projet (dés + tags).
- Refonte Assets (recherche/filtres + exemples visuels).

### Sprint 3 (P2)

- Interactions blocs type Figma.
- Workflow édition chapitre sans panel.
- Amélioration qualité génération assets.

---

## 4) KPI de suivi

- Taux de complétion création de projet.
- Temps moyen pour passer de Style -> Assets.
- Taux d'utilisation du bouton "Valider" en étape Style.
- Temps de recherche d'un asset.
- Taux d'erreur/retour arrière dans l'éditeur.
- Satisfaction perçue UI (score post-session).

---

## 5) Décisions à trancher rapidement

- Positionnement légal/marketing du terme "Webtoon" dans le branding.
- Niveaux exacts de conformité accessibilité visés (AA minimum).
- Portée de la V1 "éditeur type Figma" (MVP interactions vs édition complète).
- Stratégie court terme pour la qualité de génération d'assets.

---

*Document de travail produit — Retour Jeremy*
