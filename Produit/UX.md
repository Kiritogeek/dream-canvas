# UX — Parcours utilisateur DreamWeave

> Documentation de l’expérience utilisateur actuelle et prévue : chaque étape du parcours, écrans et flux, puis schéma global.

---

## Sommaire

1. [Conventions](#1-conventions)
2. [Parcours UX actuels (étape par étape)](#2-parcours-ux-actuels-étape-par-étape)
3. [Parcours UX à venir](#3-parcours-ux-à-venir)
4. [Schéma global de l’UX](#4-schéma-global-de-lux)
5. [Références croisées](#5-références-croisées)

---

## 1. Conventions

- **Actuel** : implémenté et livré (février 2026).
- **À venir** : prévu dans la roadmap (Phase 2 et au-delà).
- Les écrans et actions sont décrits du point de vue de l’utilisateur.

---

## 2. Parcours UX actuels (étape par étape)

### 2.1 Découverte et inscription

| Étape | Écran / action | Détail |
|-------|----------------|--------|
| 1 | **Landing page** | Présentation du produit, CTA « Commencer gratuitement ». Thème clair/sombre. |
| 2 | **Inscription** | Email + mot de passe + nom d’affichage, ou **Continuer avec Google** (OAuth). Profil créé automatiquement. |
| 3 | **Connexion** | Même formulaire ; message d’erreur si échec. Session persistante. |
| 4 | **Redirection** | Après auth → **Dashboard**. |

---

### 2.2 Dashboard -> *A revoir*

| Étape | Écran / action | Détail |
|-------|----------------|--------|
| 1 | **Vue d’ensemble** | Message de bienvenue, liste des projets (grille responsive). |
| 2 | **Statistiques** | Nombre de projets, assets, usage mensuel (barre + quota Free/Pro). Badge tier (Free / Pro). |
| 3 | **Actions** | Créer un projet, accéder au profil, déconnexion. |
| 4 | **Recherche / filtre** | Recherche et filtrage des projets. |

---

### 2.3 Projet : entrée et onglets

| Étape | Écran / action | Détail |
|-------|----------------|--------|
| 1 | **Détail projet** | Titre, description ; **onglets** : Style, Assets, Scénario, Edition de l'oeuvre (+ tard) |
| 2 | **Navigation** | Clic sur un onglet → contenu correspondant. Onglet actif mis en évidence. |
| 3 | **Édition projet** | Modification du titre et de la description (sauvegarde). |

---

### 2.4 Onglet Style

| Étape | Écran / action | Détail |
|-------|----------------|--------|
| 1 | **Template de style** | Champ texte pour décrire le style (ambiance, couleurs, type de traits). Sauvegarde automatique. |
| 2 | **Images de référence** | Upload d’images (2 max en Pro), aperçu, suppression. Stockage Supabase Storage. |
| 3 | **Application** | Le style est appliqué à toutes les générations d’assets (et futurs panels). |

---

### 2.5 Onglet Assets

| Étape | Écran / action | Détail |
|-------|----------------|--------|
| 1 | **Bibliothèques** | 3 onglets : **Personnages**, **Décors**, **Objets**. Sous-titre : « Utile surtout pour les éléments récurrents de votre scénario. » |
| 2 | **Liste** | Grille d’assets avec image (ou placeholder), nom, type. |
| 3 | **Ajout** | Bouton « Ajouter » → dialog : type, nom, description/prompt. Génération IA automatique après création. |
| 4 | **Carte asset** | Hover : boutons Modifier, Régénérer, Supprimer. Clic sur un personnage → dialog vues (face, profil gauche/droit, dos). |
| 5 | **Modification** | Dialog pré-rempli (nom, prompt). Si seul le nom change → « Sauvegarder ». Si prompt change → « Sauvegarder sans régénérer » ou « Sauvegarder et régénérer ». |
| 6 | **Renommage + scénario** | Si le nom change et que l’ancien nom apparaît dans des chapitres : proposition « Mettre à jour le scénario ? » → Appliquer remplace l’ancien nom par le nouveau dans les chapitres concernés. |
| 7 | **Suppression** | Confirmation (AlertDialog) avant suppression. Nettoyage Storage. |

---

### 2.6 Onglet Scénario

| Étape | Écran / action | Détail |
|-------|----------------|--------|
| 1 | **Vue globale** | Zone IA Scénario (prompt + génération d’un chapitre), puis liste des chapitres (collapsibles). |
| 2 | **IA Scénario** | Saisie d’un prompt → l’IA génère **un chapitre** (structure Lieu / Scène / Dialogue-Action). Proposition affichée en texte simple ; **Accepter** crée le chapitre, **Rejeter** annule. Contexte limité aux N derniers chapitres (ex. 5). |
| 3 | **Liste des chapitres** | Drag & drop pour réordonner. Création manuelle de chapitre, suppression. Chaque chapitre : titre (éditable), numéro, contenu. |
| 4 | **Ouverture d’un chapitre** | Contenu : zone IA Chapitre (prompt de modification), résultat avec **diff visuel** (texte supprimé en rouge, ajouté en vert), boutons Accepter / Rejeter. Panneau « Personnages / éléments mentionnés non créés ». Toggle **Édition** / **Aperçu**. |
| 5 | **Mode Édition** | Textarea pour le contenu du chapitre. Sauvegarde (ex. Ctrl+S). |
| 6 | **Mode Aperçu** | Texte surligné : **assets existants** (couleur par type : personnage / décor / objet). **Hover** sur un nom d’asset → HoverCard avec image. **Clic** → Dialog agrandi. **Éléments non créés** : surbrillance ambre ; panneau listant ces noms. |
| 7 | **Création d’asset depuis le scénario** | Sur un élément non créé (ou dans le panneau) : hover → choix Personnage / Décor / Objet → **navigation vers l’onglet Assets** avec dialog de création **pré-rempli** (nom + type). Option **Ne pas créer** : retire le nom de la liste pour la session. |
| 8 | **Sélection de texte** | En Aperçu, sélection d’un mot ou groupe de mots → menu flottant « Créer comme asset » (Personnage, Décor, Objet) → même navigation vers Assets avec nom pré-rempli. |
| 9 | **Détection des éléments non créés** | Règle actuelle : mots ou bigrammes **répétés au moins 4 fois** dans le chapitre, hors stop-words et hors mots qui sont des **parties d’un asset existant** (ex. « Marcus » et « Blackwood » si l’asset « Marcus Blackwood » existe). Prénom/nom seul reconnu comme l’asset (ex. « Marcus » → personnage Marcus Blackwood). |

---

### 2.7 Profil et paramètres

| Étape | Écran / action | Détail |
|-------|----------------|--------|
| 1 | **Page profil** | Nom d’affichage, email. Édition du display name. |
| 2 | **Plans** | Accès à la page pricing (Free / Pro), changement de plan, visualisation des quotas. |

---

## 3. Parcours UX à venir

### 3.1 Section Scénario (compléments)

| Élément | Description |
|--------|--------------|
| Import scénario | Fichier .txt ou copier-coller pour remplir le scénario. |
| Découpage Chapitre → Panels | Dans la section Scénario, pour chaque chapitre : liste de panels avec courte description. Alimente la génération panel par panel. |
| Estimation panels (par chapitre) | Pour chaque chapitre texte : **estimation** du nombre de panels (contenu + 720×5000). **Indicatif et visuel uniquement** — l'utilisateur peut ensuite faire plus ou moins d'images. Pré-visualiser si la longueur convient. |
| Référence panels / chapitre | Référence (ex. ~10 panels/chapitre). À venir : vrai chapitre webtoon + son nombre de panels pour que l'utilisateur juge sa cible. |
| Nombre de panels cible | Choix utilisateur (par chapitre ou défaut projet). Ex. 8, 10, 12. |
| Comparaison estimation vs cible | Afficher estimation vs cible (ex. « Estimation : 7 · Cible : 10 → chapitre un peu court »). Adapter le texte ou répartition N/N+1. |
| Renommage asset (complétion) | Option « Toujours proposer » la mise à jour des chapitres lors d’un renommage. |

### 3.2 Édition de l’œuvre (panels)

| Élément | Description |
|--------|--------------|
| Double visualisation | À l’édition d’un chapitre visuel : **chapitre texte à gauche** (Aperçu : surbrillance assets + hover), **panels à droite**. Pas de panneau Assets séparé. |
| Création chapitre visuel | Lors de la création : **sélecteur « Associer au chapitre de scénario »** ; pré-sélection du chapitre textuel de même numéro (ex. visuel 1 → textuel 1). Si aucun chapitre textuel : message invitant à en créer dans l’onglet Scénario et associer plus tard. |
| Guidance longueur | Si le chapitre textuel découpé en panels est trop court ou trop long : indiquer qu’il peut retourner dans le Scénario pour modifier, ou utiliser (à venir) l’estimation de panels et la répartition N/N+1. |
| Estimation panels | (À venir) **Estimation** du nombre de panels pour ce chapitre (texte + 720×5000). Indicatif et visuel uniquement ; pas de contrainte (plus ou moins d'images possible). Disponible en Scénario et en Édition de l'œuvre. |
| Référence et cible | (À venir) **Référence** (ex. ~10 panels/chapitre) ; **nombre de panels cible** (choix utilisateur) ; **comparaison** estimation vs cible pour contrôler la longueur. |
| Répartition N / N+1 | (À venir) Chapitre trop court → prendre des éléments du chapitre textuel N+1 (acceptation/refus). Trop long → céder des éléments au N+1. Prérequis : chapitre N et N+1. |
| IA Panel | Suggestion ou réécriture de la description du panel (contexte scénario + assets) ; Accepter / Rejeter. |
| Mode Automatique | Découpage IA → liste de panels. **Sélection des assets du chapitre** (impérative). Génération **panel par panel** (style + assets + description du panel). |
| Mode Structuré | Chapitre vide → **blocs** (position, taille) → par bloc : description + **sélection d’assets** → génération 1 image par bloc. **Dimensions du bloc obligatoires pour l'espace de l'image.** Images pleines affichées **dans** les blocs. |
| Lecture verticale | Défilement vertical, format webtoon. |

### 3.3 Dialogues et export

| Élément | Description |
|--------|--------------|
| Bulles de dialogue | Ajout de bulles sur les panels, texte éditable, positionnement. |
| Narration | Zone de narration par panel. |
| Export | Export PDF/PNG, publication, collaboration. |

---

## 4. Schéma global de l’UX

### 4.1 Vue d’ensemble du parcours

```mermaid
flowchart TB
    subgraph Découverte
        A[Landing] --> B[Auth Inscription / Connexion]
        B --> C[Dashboard]
    end

    subgraph Projet
        C --> D[Détail Projet]
        D --> E[Onglet Style]
        D --> F[Onglet Assets]
        D --> G[Onglet Scénario]
    end

    subgraph Style
        E --> E1[Template texte]
        E --> E2[Images de référence]
    end

    subgraph Assets
        F --> F1[Personnages / Décors / Objets]
        F1 --> F2[Création + Génération IA]
        F1 --> F3[Édition / Régénération / Suppression]
        F3 --> F4[Renommage → Mise à jour scénario]
    end

    subgraph Scénario
        G --> G1[IA Scénario : 1 prompt = 1 chapitre]
        G --> G2[Chapitres : édition / réordre]
        G2 --> G3[IA Chapitre : réécriture + diff]
        G2 --> G4[Aperçu : surbrillance assets + non créés]
        G4 --> G5[Créer asset depuis texte / Ne pas créer]
        G5 --> F
    end

    subgraph Futur
        G2 -.-> H[Découpage Chapitre → Panels]
        H --> I[Édition œuvre : Panels / Blocs]
        I --> J[Génération panel par panel]
        J --> K[Dialogues / Narration]
        K --> L[Lecture verticale / Export]
    end
```

### 4.2 Flux détaillé : de l’idée au premier asset

```
Landing → Auth → Dashboard → Nouveau projet (titre, description)
    → Onglet Style (template + refs)
    → Onglet Assets : Ajouter (type, nom, prompt)
    → Génération IA → Asset créé
```

### 4.3 Flux détaillé : Scénario ↔ Assets

```
Onglet Scénario : IA Scénario (prompt → chapitre) ou édition manuelle
    → Aperçu : noms d’assets surlignés (existants) / ambre (non créés)
    → Sur élément non créé : Créer comme Personnage/Décor/Objet
        → Navigation vers Onglet Assets + dialog pré-rempli
    → Ou : Ne pas créer (retire de la liste pour la session)

Onglet Assets : Renommage d’un asset
    → Si ancien nom dans des chapitres : "Mettre à jour le scénario ?"
    → Appliquer : remplacement ancien nom → nouveau nom dans les chapitres
```

### 4.4 Légende des statuts (roadmap)

| Symbole | Signification |
|---------|---------------|
| ✅ | Livré / implémenté |
| 🔜 | Prochaine étape / en cours |
| 📋 | Planifié / backlog |

---

## 5. Références croisées

| Thème | Document |
|-------|----------|
| User stories détaillées | [04_User_Stories_Parcours.md](./04_User_Stories_Parcours.md) |
| Roadmap et phases | [07_Roadmap_Produit.md](./07_Roadmap_Produit.md) |
| Section Scénario (réalisé + à prévoir) | [Plan_Action_Developpement_Scénario.md](./Plan_Action_Developpement_Scénario.md) |
| Détection éléments non créés | [Plan_Action_TextHighligh_No_Assets.md](./Plan_Action_TextHighligh_No_Assets.md) |
| Flux panels / blocs / scénario | [11_Rapport_Chapitres_Flux_Blocs_Scenario.md](./11_Rapport_Chapitres_Flux_Blocs_Scenario.md) |
| Vue produit complète | [Product.md](./Product.md) |
| Index documentation | [INDEX.md](./INDEX.md) |

---

*Dernière mise à jour : 14 février 2026*
