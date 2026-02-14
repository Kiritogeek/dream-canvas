# User Stories & Parcours Utilisateur — DreamWeave

## 1. Épopées (Epics)

| ID | Epic | Description | Priorité |
|----|------|-------------|----------|
| E1 | **Authentification** | Inscription, connexion, gestion de session | P0 |
| E2 | **Gestion de projets** | Créer, lister, modifier, supprimer des projets | P0 |
| E3 | **Style visuel** | Définir et appliquer un style à un projet | P0 |
| E4 | **Bibliothèque d'assets** | Gérer les personnages, décors, objets | P0 |
| E5 | **Génération IA** | Générer des images via l'IA | P0 |
| E6 | **Chapitres** | Organiser l'histoire en chapitres | P0 |
| E7 | **Panels** | Créer et gérer les panels d'un chapitre | P1 |
| E8 | **Dialogues** | Ajouter des bulles et narration aux panels | P1 |
| E9 | **Export** | Exporter en PDF, images, format plateforme | P2 |
| E10 | **Collaboration** | Partage, édition multi-utilisateurs | P2 |
| E11 | **Dashboard** | Vue d'ensemble et statistiques | P1 |
| E12 | **Landing page** | Page marketing et acquisition | P1 |

---

## 2. User Stories par Epic

### E1 — Authentification

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-1.1 | En tant qu'utilisateur, je veux m'inscrire avec email et mot de passe pour créer mon compte | - Formulaire email + mdp + nom d'affichage<br>- Validation des champs<br>- Profil créé automatiquement<br>- Redirection vers dashboard | ✅ Fait |
| US-1.2 | En tant qu'utilisateur, je veux me connecter avec email et mot de passe | - Formulaire email + mdp<br>- Message d'erreur si échec<br>- Session persistante<br>- Redirection vers dashboard | ✅ Fait |
| US-1.3 | En tant qu'utilisateur, je veux me connecter avec Google pour aller plus vite | - Bouton "Continuer avec Google"<br>- OAuth redirect<br>- Profil créé automatiquement<br>- Redirection vers dashboard | ✅ Fait |
| US-1.4 | En tant qu'utilisateur, je veux me déconnecter | - Bouton déconnexion visible<br>- Session supprimée<br>- Redirection vers landing | ✅ Fait |
| US-1.5 | En tant qu'utilisateur, je veux que mes données soient protégées | - RLS activé sur toutes les tables<br>- Données isolées par utilisateur | ✅ Fait |

### E2 — Gestion de projets

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-2.1 | En tant qu'utilisateur, je veux créer un nouveau projet webtoon | - Formulaire titre + description<br>- Projet ajouté en base<br>- Redirection vers détail du projet | ✅ Fait |
| US-2.2 | En tant qu'utilisateur, je veux voir la liste de mes projets | - Grille de cartes responsive<br>- Titre, description, date<br>- Lien vers le détail | ✅ Fait |
| US-2.3 | En tant qu'utilisateur, je veux supprimer un projet | - Confirmation avant suppression<br>- Suppression en cascade (assets, chapitres, panels)<br>- Mise à jour de la liste | ✅ Fait |
| US-2.4 | En tant qu'utilisateur, je veux voir les statistiques de mon projet | - Nombre d'assets<br>- Nombre de chapitres<br>- Date de dernière modification | ✅ Fait |

### E3 — Style visuel

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-3.1 | En tant qu'utilisateur, je veux définir un template de style texte | - Champ texte avec placeholder explicatif<br>- Sauvegarde automatique<br>- Appliqué à toutes les générations | ✅ Fait |
| US-3.2 | En tant qu'utilisateur, je veux uploader des images de référence | - Upload multiple<br>- Aperçu des images<br>- Suppression individuelle<br>- Stockage dans Storage | ✅ Fait |
| US-3.3 | En tant qu'utilisateur, je veux voir combien d'images de référence sont actives | - Badge avec le nombre<br>- Message de confirmation | ✅ Fait |

### E4 — Bibliothèque d'assets

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-4.1 | En tant qu'utilisateur, je veux créer un personnage | - Sélection type "Personnage"<br>- Nom + prompt<br>- Vérification du style défini<br>- Génération automatique de l'image | ✅ Fait |
| US-4.2 | En tant qu'utilisateur, je veux créer un décor | - Sélection type "Décor"<br>- Nom + prompt<br>- Génération automatique | ✅ Fait |
| US-4.3 | En tant qu'utilisateur, je veux créer un objet | - Sélection type "Objet"<br>- Nom + prompt<br>- Génération automatique | ✅ Fait |
| US-4.4 | En tant qu'utilisateur, je veux voir mes assets en grille | - Grille responsive<br>- Image ou placeholder<br>- Nom et type visibles | ✅ Fait |
| US-4.5 | En tant qu'utilisateur, je veux régénérer l'image d'un asset | - Bouton régénérer<br>- Nouvelle image avec le style actuel<br>- Remplacement de l'ancienne image | ✅ Fait |
| US-4.6 | En tant qu'utilisateur, je veux générer les vues multiples d'un personnage | - Vue de face (auto)<br>- Profil gauche (à la demande)<br>- Profil droit (à la demande)<br>- Vue de dos (à la demande) | ✅ Fait |
| US-4.7 | En tant qu'utilisateur, je veux supprimer un asset | - Confirmation<br>- Suppression en base + storage<br>- Mise à jour de la grille | ✅ Fait |

### E5 — Génération IA

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-5.1 | En tant que système, je veux enrichir le prompt utilisateur avec le style du projet | - Ajout du style texte<br>- Ajout des URLs images de référence<br>- Instructions spécifiques au type d'asset | ✅ Fait |
| US-5.2 | En tant qu'utilisateur, je veux voir un indicateur de chargement pendant la génération | - Spinner ou skeleton<br>- Message "Génération en cours"<br>- Timeout géré | ✅ Fait |
| US-5.3 | En tant qu'utilisateur, je veux être notifié si la génération échoue | - Toast d'erreur<br>- Message explicatif<br>- Option de réessayer | ✅ Fait |

### E6 — Chapitres

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-6.1 | En tant qu'utilisateur, je veux créer un chapitre | - Titre + synopsis (+ scénario optionnel)<br>- Choix du mode : Automatique ou Structuré<br>- Numérotation automatique<br>- Ajout au projet | ✅ Fait (scénario + mode à ajouter) |
| US-6.2 | En tant qu'utilisateur, je veux voir la liste des chapitres | - Liste ordonnée par numéro<br>- Titre et synopsis visibles<br>- Lien vers le détail | ✅ Fait |
| US-6.3 | En tant qu'utilisateur, je veux supprimer un chapitre | - Confirmation<br>- Suppression en cascade (panels)<br>- Mise à jour de la liste | ✅ Fait |
| US-6.4 | En tant qu'utilisateur, je veux écrire mon histoire dans une section « Scénario » | - Section dédiée (projet ou chapitre)<br>- IA découpe scénario → chapitres, puis chapitre → panels (structure uniquement)<br>- **Scénario jamais utilisé dans le prompt de génération d'image** ; en mode Structuré : référence pour remplir les blocs | 🔜 Planifié |

### E7 — Panels (à implémenter)

**Principe** : les images générées sont des **illustrations pleines** (pas de cases dessinées dans l’image) ; en mode Structuré, elles sont affichées **dans** des blocs (conteneurs de mise en page). Voir `11_Rapport_Chapitres_Flux_Blocs_Scenario.md`.

#### Mode Automatique

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-7.1 | En tant qu'utilisateur, je veux générer les panels (mode Automatique) | - **Sélection des assets du chapitre (impérative)** : personnages, décors, objets<br>- **Génération panel par panel** (minimum) : impossible de générer tout le chapitre d'un coup (limites API/erreurs)<br>- Prompt d'image = **style + assets sélectionnés + courte description du panel** (pas le scénario/synopsis)<br>- 1 **image pleine** par panel | 🔜 Planifié |
| US-7.2 | En tant qu'utilisateur, je veux modifier le prompt d'un panel | - Édition inline<br>- Régénération → nouvelle image pleine | 🔜 Planifié |
| US-7.3 | En tant qu'utilisateur, je veux régénérer un panel individuellement | - Bouton régénérer sur chaque panel<br>- Nouvelle image pleine | 🔜 Planifié |
| US-7.4 | En tant qu'utilisateur, je veux réorganiser l'ordre des panels | - Drag & drop<br>- Mise à jour des numéros | 🔜 Planifié |

#### Mode Structuré (blocs)

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-7.5 | En tant qu'utilisateur, je veux définir la structure du chapitre avec des blocs | - Création de panels puis de **blocs** (rectangles : position, largeur, hauteur)<br>- Aucune image générée à ce stade | 🔜 Planifié |
| US-7.6 | En tant qu'utilisateur, je veux remplir chaque bloc (description + assets) | - Champ texte (prompt) par bloc<br>- Sélection d’assets (personnages, décors, objets) par bloc **(impérative** : cadre la génération, l'IA comprend les éléments à mettre dans l'image)<br>- Les refs sont injectées dans le prompt à la génération | 🔜 Planifié |
| US-7.7 | En tant qu'utilisateur, je veux générer une image pleine par bloc | - Génération à partir du prompt et des **assets sélectionnés** pour ce bloc<br>- 1 image pleine par bloc (pas de cases dans l’image)<br>- L’image est affichée **dans** le bloc<br>- Régénération possible par bloc | 🔜 Planifié |
| US-7.8 | En tant qu'utilisateur, je veux réorganiser les blocs (drag & drop, redimensionnement) | - Ordre et taille modifiables<br>- Mise à jour du layout | 🔜 Planifié |

#### Lecture

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-7.9 | En tant qu'utilisateur, je veux lire mon chapitre en défilement vertical | - Affichage vertical continu<br>- Images pleines dans les panels/blocs<br>- Format natif webtoon | 🔜 Planifié |

### E8 — Dialogues (à implémenter)

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-8.1 | En tant qu'utilisateur, je veux ajouter des bulles de dialogue à un panel | - Clic pour ajouter<br>- Texte éditable<br>- Positionnement par drag | 📋 Backlog |
| US-8.2 | En tant qu'utilisateur, je veux ajouter de la narration à un panel | - Zone de narration en haut/bas<br>- Texte stylisé | 📋 Backlog |
| US-8.3 | En tant qu'utilisateur, je veux personnaliser les polices des dialogues | - Choix de police<br>- Taille<br>- Couleur | 📋 Backlog |

---

## 3. Parcours Utilisateur Principal

### 3.1 Premier contact → Première génération (Onboarding)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Landing  │────►│  Auth    │────►│Dashboard │────►│  Projet  │────►│  Asset   │
│  Page    │     │(Signup)  │     │          │     │  Nouveau │     │  Généré  │
│          │     │          │     │          │     │          │     │  ✨      │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
  Découverte      Inscription       Bienvenue      Titre+Desc        Première
  du produit      en 30s            + Stats        + Style           image IA !

         ◄─── Time to Value cible : < 10 minutes ───►
```

**Étapes détaillées** :

1. **Landing page** (30s)
   - L'utilisateur découvre DreamWeave
   - Voit les 4 fonctionnalités principales
   - Clique sur "Commencer gratuitement"

2. **Inscription** (1 min)
   - Email + mot de passe + nom OU Google en 1 clic
   - Profil créé automatiquement
   - Redirection vers dashboard

3. **Dashboard** (30s)
   - Message de bienvenue personnalisé
   - CTA "Créer votre premier projet"
   - Stats à zéro (motivation à remplir)

4. **Création de projet** (2 min)
   - Titre du webtoon
   - Description courte
   - Redirection vers le détail du projet

5. **Définition du style** (3 min)
   - Remplir le template de style texte
   - (Optionnel) Uploader des images de référence

6. **Premier asset** (2 min)
   - Cliquer "Nouvel asset"
   - Choisir "Personnage"
   - Nom + description
   - **Wow moment** : l'image est générée en quelques secondes !

### 3.2 Parcours de création d'un chapitre complet

```
                    ┌─────────────┐
                    │   PROJET    │
                    │ (avec style)│
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌───────────┐ ┌───────────┐ ┌───────────┐
        │ Personnage│ │  Décor    │ │  Objet    │
        │ Principal │ │ Principal │ │ Important │
        │ (+ vues)  │ │           │ │           │
        └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
                    ┌─────────────┐
                    │  CHAPITRE   │
                    │ Titre +     │
                    │ Synopsis    │
                    └──────┬──────┘
                           │
                           ▼ (futur)
                    ┌─────────────┐
                    │  PANELS     │
                    │ Génération  │
                    │ automatique │
                    └──────┬──────┘
                           │
                           ▼ (futur)
                    ┌─────────────┐
                    │  DIALOGUES  │
                    │ Bulles +    │
                    │ Narration   │
                    └──────┬──────┘
                           │
                           ▼ (futur)
                    ┌─────────────┐
                    │   LECTURE   │
                    │  Vertical   │
                    │  Webtoon    │
                    └─────────────┘
```

### 3.3 Parcours de régénération (itération créative)

```
Asset existant ──► Résultat insatisfaisant
        │
        ▼
  ┌─ Options ──────────────────────┐
  │                                │
  ├── Régénérer (même prompt)      │
  │   └── Nouvelle seed aléatoire  │
  │                                │
  ├── Modifier le prompt           │
  │   └── Ajuster la description   │
  │                                │
  ├── Modifier le style du projet  │
  │   └── Affecter les futures     │
  │       générations              │
  │                                │
  └── Générer une vue différente   │
      └── Profil, dos, etc.        │
  └────────────────────────────────┘
```

---

## 4. Carte d'expérience (Experience Map)

| Phase | Action | Émotion | Pain Point | Opportunité |
|-------|--------|---------|-----------|-------------|
| **Découverte** | Voit la landing page | Curiosité | "Est-ce que ça marche vraiment ?" | Démo interactive / exemples |
| **Inscription** | Crée un compte | Neutre | "Encore un formulaire..." | OAuth Google = 1 clic |
| **Exploration** | Explore le dashboard | Intrigué | "C'est vide, par où commencer ?" | Onboarding guidé |
| **1er projet** | Crée un projet | Motivé | "Quel titre donner ?" | Suggestions IA |
| **Style** | Définit le style | Concentré | "Que mettre comme description ?" | Exemples/templates |
| **1er asset** | Génère un personnage | **Excitation !** | Attente de la génération | Feedback temps réel |
| **Résultat** | Voit l'image générée | **Émerveillement** ou Déception | Qualité variable | Régénération facile |
| **Itération** | Régénère / ajuste | Déterminé | Pas assez de contrôle | Options avancées |
| **Chapitre** | Crée un chapitre | Productif | Pas encore de panels auto | Génération panels |
| **Partage** | (Futur) Partage le résultat | Fier | Pas de fonctionnalité d'export | Export + partage social |

---

## 5. Matrice de priorisation (RICE)

| User Story | Reach | Impact | Confidence | Effort | Score RICE |
|-----------|-------|--------|-----------|--------|-----------|
| US-7.1 Génération auto panels | 9 | 9 | 7 | 8 | 71 |
| US-7.5 Lecture verticale | 9 | 8 | 9 | 4 | 162 |
| US-8.1 Bulles de dialogue | 8 | 8 | 7 | 6 | 75 |
| US-7.2 Édition prompt panel | 7 | 7 | 8 | 3 | 131 |
| US-7.3 Régénération panel | 7 | 6 | 9 | 2 | 189 |
| US-7.4 Drag & drop panels | 5 | 5 | 8 | 5 | 40 |
| US-8.2 Narration | 6 | 6 | 7 | 4 | 63 |
| US-8.3 Polices personnalisées | 3 | 3 | 8 | 3 | 24 |
