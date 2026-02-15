# User Stories & Parcours Utilisateur — DreamWeave

> Epics, user stories (40+), parcours utilisateur, experience map et priorisation RICE.

---

## 1. Épopées (Epics)

| ID | Epic | Description | Priorité |
|----|------|-------------|----------|
| E1 | **Authentification** | Inscription, connexion, gestion de session | P0 |
| E2 | **Gestion de projets** | Créer, lister, modifier, supprimer des projets | P0 |
| E3 | **Style visuel** | Définir et appliquer un style à un projet | P0 |
| E4 | **Bibliothèque d'assets** | Gérer les personnages, décors, objets | P0 |
| E5 | **Génération IA** | Générer des images via l'IA | P0 |
| E5b | **Section Scénario** | Écrire/importer le scénario, créer des chapitres de scénario (texte) | P0 |
| E6 | **Chapitres (œuvre)** | Organiser l'œuvre visuelle en chapitres et panels (Édition de l'œuvre) | P0 |
| E7 | **Panels** | Créer et gérer les panels ; édition avec visualisation scénario + assets | P1 |
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

### E5b — Section Scénario (texte narratif)

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-5b.1 | En tant qu'utilisateur, je veux écrire le scénario de mon histoire dans une section « Scénario » | - Section dédiée pour le texte narratif<br>- Édition libre (actions, lieux, personnages, dialogues)<br>- Sauvegarde automatique | 🔜 Planifié |
| US-5b.2 | En tant qu'utilisateur, je veux importer un scénario (format texte) | - Import par fichier texte (.txt) ou copier-coller<br>- Le contenu remplit la section Scénario<br>- Possibilité d'éditer après import | 🔜 Planifié |
| US-5b.3 | En tant qu'utilisateur, je veux créer des chapitres pour mon scénario | - Création de chapitres (titres, ordre, contenu texte)<br>- **Correspondance** : un chapitre écrit = un chapitre webtoon<br>- Servent à la génération panel par panel et à l'Édition de l'œuvre | 🔜 Planifié |
| US-5b.3b | En tant qu'utilisateur, je veux découper chaque chapitre (texte) en panels dans la section Scénario | - Découpage **Chapitre → Panels** (liste + courte description par panel) directement dans la section Scénario<br>- Alimente la génération panel par panel en Édition de l'œuvre<br>- Règles de gestion du découpage à définir plus tard | 🔜 Planifié |
| US-5b.4 | En tant qu'utilisateur, je veux que le scénario ne soit jamais utilisé dans le prompt de génération d'image | - Découpage IA (scénario → panels) = structure uniquement<br>- Prompts d'image = style + assets sélectionnés + courte description du panel | 🔜 Planifié |
| US-5b.5 | En tant qu'utilisateur, je veux que l'IA crée mon histoire chapitre par chapitre à partir de mes prompts | - Saisie d'un **prompt** pour le scénario<br>- **Un prompt = un chapitre** généré par l'IA Scénario<br>- Accepter crée un chapitre avec le texte proposé ; l'histoire se construit chapitre par chapitre | 🔜 Planifié |
| US-5b.5b | En tant qu'utilisateur, je veux modifier mon histoire par un nouveau prompt et choisir de garder ou non la version modifiée | - Saisie d'un **nouveau prompt** pour modifier des aspects de l'histoire<br>- L'IA **réécrit** le scénario directement sur le site<br>- **Comparaison** ancienne vs nouvelle version (lecture côte à côte ou bascule)<br>- **Accepter** (garder la nouvelle) ou **Rejeter** (revenir à l'ancienne) | 🔜 Planifié |
| US-5b.5c | En tant qu'utilisateur, je veux une IA dédiée par chapitre pour modifier uniquement ce chapitre | - Sur **chaque chapitre de scénario**, une **IA qui n'intervient que sur ce chapitre**<br>- Saisie d'un prompt de modification (ex. « Allonger la scène du duel ») → réécriture du chapitre directement sur le site<br>- **Accepter** ou **Rejeter** (comparaison ancienne vs nouvelle version) | 🔜 Planifié |
| US-5b.6 | En tant qu'utilisateur, je veux que mes scénarios approuvés soient sauvegardés | - Persistance en BDD de tout ce qui a été **approuvé** (scénarios, chapitres de scénario)<br>- Conservation des versions pour le flux accepter/rejeter | 🔜 Planifié |
| US-5b.7 | En tant qu'utilisateur, je veux voir les assets déjà créés mis en évidence dans mon scénario | - Détection des mentions d'assets existants (personnages, décors, objets) dans le texte<br>- **Surbrillance** des mentions selon le type d'asset (ex. Jean → personnage, ville principale → décor, épée → objet)<br>- **Au survol (hover)** sur une mention : affichage de l'**image** de l'asset correspondant (tooltip / popover) | 🔜 Planifié |
| US-5b.8 | En tant qu'utilisateur, je veux que l'IA détecte les éléments du scénario pas encore créés comme assets | - Détection (IA) des **personnages, décors, objets** mentionnés dans le scénario qui **n'existent pas** dans la bibliothèque<br>- Signalement dans le scénario (surbrillance distincte « à créer » ou liste « Éléments mentionnés non créés »)<br>- Permettre de créer les assets manquants depuis ce signalement pour garder la cohérence narrative | 🔜 Planifié |

### E6 — Chapitres (Édition de l'œuvre — visuel)

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-6.1 | En tant qu'utilisateur, je veux créer un chapitre visuel (œuvre) | - Titre + synopsis (+ lien optionnel vers un chapitre de scénario)<br>- Choix du mode : Automatique ou Structuré<br>- Numérotation automatique<br>- Ajout au projet | ✅ Fait (mode à finaliser) |
| US-6.2 | En tant qu'utilisateur, je veux voir la liste des chapitres de l'œuvre | - Liste ordonnée par numéro<br>- Titre et synopsis visibles<br>- Lien vers le détail | ✅ Fait |
| US-6.3 | En tant qu'utilisateur, je veux supprimer un chapitre (œuvre) | - Confirmation<br>- Suppression en cascade (panels)<br>- Mise à jour de la liste | ✅ Fait |

### E7 — Panels & Édition de l'œuvre (à implémenter)

**Principe** : les images générées sont des **illustrations pleines** (pas de cases dessinées dans l’image) ; en mode Structuré, elles sont affichées **dans** des blocs (conteneurs de mise en page). Voir `11_Rapport_Chapitres_Flux_Blocs_Scenario.md`.

**Édition de l'œuvre** : lors de l'édition d'un panel, l'utilisateur dispose de **deux visualisations** pour s'aider :
- **Côté scénario** : le chapitre de scénario (ou le passage) qu'il adapte en visuel, affiché pendant l'édition.
- **Côté assets** : les assets sélectionnés pour le prompting du panel (personnages, décors, objets), pour cadrer la génération IA.

#### Mode Automatique

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-7.1 | En tant qu'utilisateur, je veux générer les panels (mode Automatique) | - **Sélection des assets du chapitre (impérative)** : personnages, décors, objets<br>- **Génération panel par panel** (minimum) : impossible de générer tout le chapitre d'un coup (limites API/erreurs)<br>- Prompt d'image = **style + assets sélectionnés + courte description du panel** (pas le scénario/synopsis)<br>- 1 **image pleine** par panel | 🔜 Planifié |
| US-7.2 | En tant qu'utilisateur, je veux modifier le prompt d'un panel | - Édition inline<br>- Régénération → nouvelle image pleine | 🔜 Planifié |
| US-7.2b | En tant qu'utilisateur, je veux que l'IA Panel suggère ou réécrive la description d'un panel | - **IA Panel** (même modèle LLM, system prompt dédié) : suggère ou **réécrit** la description du panel (contexte scénario + assets)<br>- Réécriture **directe** dans le champ<br>- **Accepter** (garder la nouvelle) ou **Rejeter** (revenir à l'ancienne description) | 🔜 Planifié |
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
| US-7.10 | En tant qu'utilisateur, je veux voir le chapitre de scénario adapté pendant l'édition d'un panel | - Visualisation du texte du chapitre de scénario (ou passage) associé<br>- Contexte narratif visible pendant la saisie du prompt / génération | 🔜 Planifié |
| US-7.11 | En tant qu'utilisateur, je veux voir les assets sélectionnés pour le panel pendant l'édition | - Visualisation des personnages, décors et objets sélectionnés pour ce panel<br>- Rappel visuel pour le prompting et la cohérence | 🔜 Planifié |

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

---

*Dernière mise à jour : 14 février 2026*
