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
| E6 | **Chapitres (œuvre)** | Organiser l'œuvre visuelle en chapitres et cases (Édition de l'œuvre) | P0 |
| E7 | **Cases** | Créer et gérer les cases ; édition avec visualisation scénario + assets | P1 |
| E8 | **Dialogues** | Ajouter des bulles et narration aux cases | P1 |
| E9 | **Export** | Exporter en PNG panel + chapitre complet | P1 |
| E10 | **Collaboration** | Partage, édition multi-utilisateurs | P2 |
| E11 | **Dashboard** | Vue d'ensemble et statistiques | P1 |
| E12 | **Landing page** | Page marketing et acquisition | P1 |
| E13 | **NarraMind & Ariane** | Mémoire narrative, détection incohérences, fil d'Ariane, IA continuité | P0 |
| E14 | **Univers / Lore** | Graph relationnel de lore (personnages, lieux, objets, événements) | P1 |
| E15 | **NarraMind Compass** | Vectorisation narrative, propositions Ariane contextualisées | P1 |

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
| US-4.6 | En tant qu'utilisateur, je veux générer la fiche Sheet System d'un personnage (4 angles) | - Fiche composite : face + profil gauche + profil droit + dos, générée en une passe<br>- Cohérence visuelle du personnage entre les angles<br>- Disponible sur tous les plans (remplace les multi-vues) | ✅ Fait |
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
| US-5b.1 | En tant qu'utilisateur, je veux écrire le scénario de mon histoire dans une section « Scénario » | - Section dédiée pour le texte narratif<br>- Édition libre (actions, lieux, personnages, dialogues)<br>- Sauvegarde automatique | ✅ Fait |
| US-5b.2 | En tant qu'utilisateur, je veux importer un scénario (format texte) | - Import par fichier texte (.txt) ou copier-coller<br>- Le contenu remplit la section Scénario<br>- Possibilité d'éditer après import | 📋 Backlog |
| US-5b.3 | En tant qu'utilisateur, je veux créer des chapitres pour mon scénario | - Création de chapitres (titres, ordre, contenu texte)<br>- **Correspondance** : un chapitre écrit = un chapitre webtoon<br>- Servent à la génération panel par panel et à l'Édition de l'œuvre | ✅ Fait |
| US-5b.3b | En tant qu'utilisateur, je veux découper chaque chapitre (texte) en panels dans la section Scénario | - Découpage **Chapitre → Panels** (liste + courte description par panel) directement dans la section Scénario<br>- Alimente la génération panel par panel en Édition de l'œuvre<br>- Règles de gestion du découpage à définir plus tard | 📋 Backlog |
| US-5b.4 | En tant qu'utilisateur, je veux que le scénario ne soit jamais utilisé dans le prompt de génération d'image | - Découpage IA (scénario → panels) = structure uniquement<br>- Prompts d'image = style + assets sélectionnés + courte description du panel | ✅ Fait |
| US-5b.5 | En tant qu'utilisateur, je veux que l'IA crée mon histoire chapitre par chapitre à partir de mes prompts | - Saisie d'un **prompt** pour le scénario<br>- **Un prompt = un chapitre** généré par l'IA Scénario<br>- Accepter crée le chapitre avec le texte proposé ; l'histoire se construit chapitre par chapitre | ✅ Fait |
| US-5b.5b | En tant qu'utilisateur, je veux modifier mon histoire par un nouveau prompt et choisir de garder ou non la version modifiée | - Saisie d'un **nouveau prompt** pour modifier des aspects de l'histoire<br>- L'IA **réécrit** le scénario directement sur le site<br>- **Comparaison** ancienne vs nouvelle version (lecture côte à côte ou bascule)<br>- **Accepter** (garder la nouvelle) ou **Rejeter** (revenir à l'ancienne) | 📋 Backlog |
| US-5b.5c | En tant qu'utilisateur, je veux une IA dédiée par chapitre pour modifier uniquement ce chapitre | - Sur **chaque chapitre de scénario**, une **IA qui n'intervient que sur ce chapitre**<br>- Saisie d'un prompt de modification (ex. « Allonger la scène du duel ») → réécriture du chapitre directement sur le site<br>- **Accepter** ou **Rejeter** (comparaison ancienne vs nouvelle version) | ✅ Fait |
| US-5b.6 | En tant qu'utilisateur, je veux que mes scénarios approuvés soient sauvegardés | - Persistance en BDD de tout ce qui a été **approuvé** (scénarios, chapitres de scénario)<br>- Conservation des versions pour le flux accepter/rejeter | ✅ Fait |
| US-5b.7 | En tant qu'utilisateur, je veux voir les assets déjà créés mis en évidence dans mon scénario | - Détection des mentions d'assets existants (personnages, décors, objets) dans le texte<br>- **Surbrillance** des mentions selon le type d'asset<br>- **Au survol (hover)** sur une mention : image de l'asset (HoverCard) ; **au clic** : Dialog agrandie avec image, nom, type | ✅ Fait |
| US-5b.8 | En tant qu'utilisateur, je veux que l'IA détecte les éléments du scénario pas encore créés comme assets | - Détection des **personnages, décors, objets** mentionnés dans le scénario qui **n'existent pas** dans la bibliothèque<br>- Panneau « Éléments mentionnés non créés » + surbrillance ambre<br>- Option « Ne pas créer » pour exclure un élément ; création depuis le scénario via dialog pré-rempli | ✅ Fait |

### E6 — Chapitres (Édition de l'œuvre — visuel)

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-6.1 | En tant qu'utilisateur, je veux créer un chapitre visuel (œuvre) | - Titre + synopsis (+ lien optionnel vers un chapitre de scénario)<br>- Choix du mode : Automatique ou Structuré<br>- Numérotation automatique<br>- Ajout au projet | ✅ Fait (mode à finaliser) |
| US-6.2 | En tant qu'utilisateur, je veux voir la liste des chapitres de l'œuvre | - Liste ordonnée par numéro<br>- Titre et synopsis visibles<br>- Lien vers le détail | ✅ Fait |
| US-6.3 | En tant qu'utilisateur, je veux supprimer un chapitre (œuvre) | - Confirmation<br>- Suppression en cascade (panels)<br>- Mise à jour de la liste | ✅ Fait |

### E7 — Panels & Édition de l'œuvre (à implémenter)

**Principe** : les images générées sont des **illustrations pleines** (pas de cases dessinées dans l’image) ; en mode Structuré, elles sont affichées **dans** des blocs (conteneurs de mise en page). Voir `Edition-Oeuvre.md` (Partie II — flux et blocs).

**Édition de l'œuvre** : lors de l'édition d'un panel, l'utilisateur dispose de **deux visualisations** pour s'aider :
- **Côté scénario** : le chapitre de scénario (ou le passage) qu'il adapte en visuel, affiché pendant l'édition.
- **Côté assets** : les assets sélectionnés pour le prompting du panel (personnages, décors, objets), pour cadrer la génération IA.

#### Mode Automatique

| ID | User Story | Critères d’acceptation | Statut |
|----|-----------|----------------------|--------|
| US-7.1 | En tant qu’utilisateur, je veux générer les panels (mode Automatique) | - **Sélection des assets du chapitre (impérative)** : personnages, décors, objets<br>- **Génération panel par panel** : prompt d’image = style + assets sélectionnés + description<br>- 1 **image pleine** par panel | 📋 Backlog |
| US-7.2 | En tant qu’utilisateur, je veux modifier le prompt d’un panel | - Édition inline<br>- Régénération → nouvelle image pleine | ✅ Fait |
| US-7.2b | En tant qu’utilisateur, je veux que l’IA Panel suggère ou réécrive la description d’un panel | - **IA Panel** (même modèle LLM, system prompt dédié) : suggère ou **réécrit** la description du panel<br>- Réécriture **directe** dans le champ<br>- **Accepter** ou **Rejeter** | 📋 Backlog |
| US-7.3 | En tant qu’utilisateur, je veux régénérer un panel individuellement | - Bouton régénérer sur chaque bloc<br>- Nouvelle image pleine | ✅ Fait |
| US-7.4 | En tant qu’utilisateur, je veux réorganiser l’ordre des panels | - Drag & drop blocs<br>- Mise à jour du layout | ✅ Fait |

#### Mode Structuré (blocs)

| ID | User Story | Critères d’acceptation | Statut |
|----|-----------|----------------------|--------|
| US-7.5 | En tant qu’utilisateur, je veux définir la structure du chapitre avec des blocs | - Création de **blocs** (rectangles : position, largeur, hauteur) par panel<br>- Canvas vertical 800px, scroll jusqu’à 100 000px | ✅ Fait |
| US-7.6 | En tant qu’utilisateur, je veux remplir chaque bloc (description + assets) | - Champ texte (prompt) par bloc<br>- Sélection d’assets (personnages, décors, objets) par bloc<br>- Les refs sont injectées dans le prompt à la génération | ✅ Fait |
| US-7.7 | En tant qu’utilisateur, je veux générer une image pleine par bloc | - Génération à partir du prompt et des assets sélectionnés<br>- 1 image pleine par bloc ; affichée dans le bloc<br>- Régénération possible par bloc | ✅ Fait |
| US-7.8 | En tant qu’utilisateur, je veux repositionner et redimensionner les blocs | - Drag & drop libre + poignées de redimensionnement (8 points)<br>- Touches clavier (Delete/Backspace pour supprimer l’élément actif)<br>- Undo/Redo complet | ✅ Fait |
| US-7.8b | En tant qu’utilisateur, je veux ajouter des blocs de couleur pour l’ambiance du panel | - Blocs dédiés couleur (même positionnement/dimensions que blocs image)<br>- Couleur unie ou dégradé, sans génération d’image<br>- Rendu : couleur en arrière-plan, blocs image par-dessus | ✅ Fait |

#### Lecture

| ID | User Story | Critères d’acceptation | Statut |
|----|-----------|----------------------|--------|
| US-7.9 | En tant qu’utilisateur, je veux lire mon chapitre en défilement vertical | - Affichage vertical continu<br>- Images pleines dans les blocs<br>- Format natif webtoon | ✅ Fait |
| US-7.10 | En tant qu’utilisateur, je veux voir le chapitre de scénario pendant l’édition | - Visualisation du texte du chapitre de scénario associé (panneau latéral)<br>- Contexte narratif visible pendant la saisie du prompt | ✅ Fait |
| US-7.11 | En tant qu’utilisateur, je veux voir les assets sélectionnés pour le bloc pendant l’édition | - Visualisation des personnages, décors et objets sélectionnés<br>- Rappel visuel pour le prompting | ✅ Fait |

### E8 — Dialogues

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-8.1 | En tant qu'utilisateur, je veux ajouter des bulles de dialogue à un panel | - Clic pour ajouter une bulle (centrée sur le panel)<br>- Texte éditable inline<br>- Drag & drop libre pour repositionner<br>- Redimensionnement par 8 poignées | ✅ Fait |
| US-8.1b | En tant qu'utilisateur, je veux choisir le type de bulle | - Types disponibles : Parole, Pensée, Cri, Chuchotement, Narration, Radio + texte brut sans bulle<br>- Formes SVG manga/webtoon distinctes par type | ✅ Fait |
| US-8.1c | En tant qu'utilisateur, je veux personnaliser l'apparence d'une bulle | - Texte, type, fond, contour, police, taille, couleur éditables dans la sidebar<br>- Édition inline sans éditeur plein écran séparé | ✅ Fait |
| US-8.2 | En tant qu'utilisateur, je veux ajouter de la narration à un panel | - Type « Narration » (rectangle) ou texte brut sans fond<br>- Positionnement libre par drag | ✅ Fait |
| US-8.3 | En tant qu'utilisateur, je veux personnaliser les polices des dialogues | - Choix de police, taille, couleur dans la sidebar | ✅ Fait |
| US-8.4 | En tant qu'utilisateur, je veux personnaliser typographiquement de façon avancée | - Gras, italique, espacement lettres, ombre texte | 📋 Backlog |
| US-8.5 | En tant qu'utilisateur, je veux générer des dialogues par IA | - Suggestion de dialogues à partir du synopsis et des assets | 📋 Backlog |

### E8b — Personnalisation visuelle du panel

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-8b.1 | En tant qu'utilisateur, je veux modifier la couleur de fond d'un panel | - Blocs de couleur (même système que blocs image : position, dimensions)<br>- Couleur unie ou dégradé<br>- Rendu en arrière-plan des blocs image | ✅ Fait |
| US-8b.2 | En tant qu'utilisateur, je veux ajouter des effets visuels à mon panel pour enrichir l'œuvre | - **Bibliothèque d'effets** avec catégories : profondeur, douceur, émotion, vivant<br>- Application sur le panel avec personnalisation | 📋 Backlog |
| US-8b.3 | En tant qu'utilisateur, je veux utiliser des effets de profondeur | - Ombres portées, lumières directionnelles, atmosphère<br>- Application en overlay sans régénérer les images | 📋 Backlog |
| US-8b.4 | En tant qu'utilisateur, je veux utiliser des effets de douceur | - Flou artistique, transitions douces, brume en overlay | 📋 Backlog |
| US-8b.5 | En tant qu'utilisateur, je veux utiliser des effets émotionnels | - Météo, ambiances colorées, filtres en overlay | 📋 Backlog |
| US-8b.6 | En tant qu'utilisateur, je veux utiliser des effets vivants | - Lignes de mouvement, particules, dynamisme en overlay | 📋 Backlog |

### E9 — Export

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-9.1 | En tant qu'utilisateur, je veux exporter un panel individuel en PNG | - Téléchargement PNG (800×H) via html2canvas<br>- Inclut blocs image + couleurs + bulles | ✅ Fait |
| US-9.2 | En tant qu'utilisateur, je veux exporter un chapitre complet en PNG | - Assemblage vertical de tous les panels (800×ΣH)<br>- Format Webtoon Canvas / Tapas | ✅ Fait |
| US-9.3 | En tant qu'utilisateur, je veux exporter en haute résolution | - Upscaling 2× pour impression ou plateformes HD | 📋 Backlog |
| US-9.4 | En tant qu'utilisateur, je veux exporter tous les chapitres en batch | - Export groupé de plusieurs chapitres | 📋 Backlog |

### E13 — NarraMind & Ariane

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-13.1 | En tant qu'auteur, je veux qu'Ariane détecte les incohérences narratives dans mon scénario | - Déclenchement automatique après auto-save (≥ 80 mots, garde-fou ≥ 12 min)<br>- Ariane signale les incohérences en langage auteur (pas de jargon technique)<br>- Alertes persistées dans `narramind_alerts` (actif / ignoré / résolu) | ✅ Fait |
| US-13.2 | En tant qu'auteur, je veux qu'Ariane maintienne une mémoire de mes personnages et lieux | - Extraction automatique d'entités (personnages, décors, objets) dans `memory_entities`<br>- Résumés glissants par chapitre dans `memory_summaries`<br>- Contexte borné (~1 400 tokens quel que soit le nombre de chapitres) | ✅ Fait |
| US-13.3 | En tant qu'auteur, je veux être guidé par Ariane dès mon premier projet | - Fil d'Ariane progressif (ArianeBubble, ArianeTabTourOverlay)<br>- Menus débloqués étape par étape (useProgressiveMenuGate)<br>- Onboarding différent au 2e projet | ✅ Fait |
| US-13.4 | En tant qu'auteur, je veux qu'Ariane m'aide à maintenir la continuité narrative | - ArianeContinuityPanel : fil d'Ariane doré animé, alertes continuité<br>- ArianeNarrativeSheet : fiche narrative de l'asset (lore) | ✅ Fait |
| US-13.5 | En tant qu'auteur, je veux accéder à une analyse narrative approfondie via Ariane | - ArianeAnalysisModal : analyse complète du projet/chapitre | ✅ Fait |
| US-13.6 | En tant qu'auteur, je veux une mémoire narrative longue (Studio) | - Contexte narratif étendu pour projets longs<br>- `allowLongMemory` activé sur plan Studio uniquement | ✅ Fait |

### E14 — Univers / Lore

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-14.1 | En tant qu'auteur, je veux cartographier les éléments de mon univers narratif | - Graphe relationnel des entités (personnages, lieux, objets, événements)<br>- Vue interactive avec @xyflow/react (ReactFlow) | ✅ Fait |
| US-14.2 | En tant qu'auteur, je veux créer et lier des fiches lore | - Création de nœuds lore dans le graphe<br>- Connexions entre entités (relations narratives)<br>- Table `universe_lore` en BDD | ✅ Fait |
| US-14.3 | En tant qu'auteur, je veux qu'Ariane propose des enrichissements de lore à partir de mon scénario | - Ariane scanne le scénario et propose d'enrichir/créer des fiches lore<br>- `compass_proposals` avec statuts (accepted/rejected/pending) | ✅ Fait |

### E15 — NarraMind Compass (vectorisation narrative)

| ID | User Story | Critères d'acceptation | Statut |
|----|-----------|----------------------|--------|
| US-15.1 | En tant que système, je veux vectoriser le contenu narratif du projet | - Mode `index` : vectorisation via Gemini text-embedding-004 (768D) → `project_embeddings` (pgvector)<br>- Sources indexées : scénario, lore, entités | ✅ Fait |
| US-15.2 | En tant qu'auteur, je veux qu'Ariane me propose des directions narratives contextualisées | - Mode `propose` : recherche pgvector top-5 → Gemini Flash → `compass_proposals`<br>- Propositions typées (directions narratives, suggestions lore)<br>- Provenance : 'extracted' (tiré du scénario) ou 'generated' (proposé par Ariane) | ✅ Fait |

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
        │ (+ Sheet) │ │           │ │           │
        └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
                    ┌─────────────┐
                    │  SCÉNARIO   │ ← IA Scénario (1 prompt = 1 chap)
                    │ Chapitres   │ ← IA Chapitre (réécriture + diff)
                    │ texte       │ ← NarraMind (mémoire + alertes)
                    └──────┬──────┘ ← Ariane (continuité narrative)
                           │
                           ▼
                    ┌─────────────┐
                    │  ÉDITEUR    │ ← Blocs image (drag/resize/génération)
                    │  Canvas     │ ← Blocs couleur (ambiance)
                    │  (visuel)   │ ← Bulles SVG (6 types + texte brut)
                    └──────┬──────┘ ← Undo/Redo + raccourcis clavier
                           │
                           ▼
                    ┌─────────────┐
                    │   UNIVERS   │ ← Graphe lore (@xyflow/react)
                    │   / Lore    │ ← Compass (propositions narratives)
                    └──────┬──────┘ ← Ariane 🔍 suggestions
                           │
                           ▼
                    ┌─────────────┐
                    │   EXPORT    │ ← PNG panel (html2canvas)
                    │  PNG panel  │ ← PNG chapitre complet (800×ΣH)
                    │  + chapitre │
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
  └── Régénérer la fiche Sheet     │
      └── 4 angles (face/profils/dos)│
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
| **Scénario** | Écrit avec IA Scénario | Créatif | Parfois hésitant sur la direction narrative | Ariane + Compass propose des directions |
| **Éditeur** | Compose les cases visuellement | Engagé | Positionnement précis des blocs | Snap-to-grid futur |
| **Bulles** | Ajoute dialogues et narration | Satisfait | Sélection de la police parfois lente | Éditeur inline sidebar optimisé |
| **Export** | Télécharge son chapitre en PNG | **Fier** | Résolution limitée à 1024px | Export haute résolution futur |

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

*Dernière mise à jour : 13 juin 2026 — Mise à jour majeure statuts : E5b (Section Scénario), E7 (Éditeur canvas mode Structuré), E8 (Dialogues/Bulles), E9 (Export PNG) tous ✅ Fait. Ajout E13 (NarraMind & Ariane), E14 (Univers/Lore), E15 (Compass). Diagramme parcours mis à jour avec workflow réel complet. Précédente : 7 juin 2026 — Sheet System, tiers.*
