# Product.md - DreamWeave

## 📋 Vue d'ensemble

**DreamWeave** est une plateforme web innovante permettant de créer des webtoons (bandes dessinées verticales) grâce à l'intelligence artificielle. Le produit démocratise la création de contenu visuel narratif en permettant à quiconque, sans compétences artistiques, de transformer ses idées en webtoons professionnels.

---

## 🎯 Product-Market Fit

### Problème résolu

**Le marché des webtoons explose** (millions de lecteurs sur des plateformes comme Webtoon, Tapas, etc.), mais la création reste un goulot d'étranglement majeur :

1. **Barrière technique élevée** : Créer un webtoon nécessite des compétences en dessin, colorisation, mise en page, et des heures de travail par épisode.
2. **Coûts prohibitifs** : Faire appel à des artistes professionnels coûte cher (plusieurs centaines à milliers d'euros par chapitre).
3. **Temps de production long** : Un chapitre peut prendre des semaines à produire manuellement.
4. **Manque de cohérence visuelle** : Maintenir un style uniforme sur plusieurs chapitres est difficile.

### Solution DreamWeave

DreamWeave résout ces problèmes en :
- **Automatisant la génération visuelle** via l'IA (FLUX.2 Pro / FLUX.2 Pro Edit via FAL.ai, pour tous les tiers)
- **Garantissant la cohérence stylistique** grâce à un système de templates de style
- **Réduisant drastiquement le temps de production** (de semaines à heures)
- **Rendant la création accessible** à tous, sans compétences artistiques

### Marché cible

1. **Créateurs de contenu indépendants** : YouTubers, blogueurs, storytellers souhaitant diversifier leur contenu
2. **Auteurs de romans** : Écrivains voulant adapter leurs histoires en format visuel
3. **Éditeurs et studios** : Professionnels cherchant à accélérer la pré-production
4. **Amateurs passionnés** : Fans de webtoons désirant créer leurs propres histoires

---

## ✨ Fonctionnalités principales

### 1. 🎨 Gestion de projets

**Description** : Système de projets permettant d'organiser plusieurs webtoons.

**Fonctionnalités** :
- Création de projets avec titre et description
- Liste de tous les projets de l'utilisateur
- Dashboard avec aperçu des projets récents
- Suppression de projets
- Statistiques (nombre de projets, assets, chapitres)

- **Découverte guidée** : pour le premier projet, parcours **progressif** (menus débloqués étape par étape) avec **Ariane** ; wiki Obsidian `Parcours-Premier-Projet`, `UX.md` §2.2bis.

**Valeur** : Organisation claire du travail, gestion multi-projets.

---

### 2. 🖌️ Système de style visuel

**Description** : Définition d'un style visuel unique appliqué à toutes les générations d'un projet, via un système guidé.

**Fonctionnalités** :
- **Style principal (preset)** : Sélection d'une famille visuelle (ex. Manga, Webtoon coréen, Manwha)
- **Sous-style** : Déclinaison du preset (ex. Sobre, Violent, Dramatique, Lumineux)
- **Template de style texte compatible** : Généré automatiquement à partir du preset + sous-style + précisions projet, puis stocké dans `style_template` (compatibilité Edge Functions conservée)
- **Images de référence** : Upload de plusieurs images pour guider l'IA
  - Format portrait/webtoon recommandé
  - Gestion multi-images (ajout/suppression)
  - Stockage dans Supabase Storage
- **Application automatique** : Le style est automatiquement appliqué à toutes les générations d'assets et panels

**Valeur** : Cohérence visuelle garantie sur tout le projet, personnalisation poussée.

---

### 3. 🎭 Bibliothèque d'assets

**Description** : Gestion d'une bibliothèque d'éléments réutilisables (personnages, décors, objets).

#### 3.1 Types d'assets

- **Personnages** (`character`) : Héros, antagonistes, personnages secondaires
- **Décors** (`background`) : Environnements, lieux, scènes
- **Objets** (`object`) : Accessoires, objets de scène, éléments décoratifs

#### 3.2 Création d'assets

- Formulaire avec :
  - Sélection du type (Personnages / Décors / Objets)
  - Nom de l'asset
  - Description / Prompt détaillé pour la génération IA
- Validation : Vérification que le style du projet est défini avant création
- Génération automatique : L'image est générée immédiatement après création

#### 3.3 Gestion des personnages

**Sheet System** (fiche composite 4 angles — remplace les multi-vues) :
- Une **fiche composite** unique regroupant les 4 angles : face, profil gauche, profil droit, dos
- Générée en une seule passe pour garantir la cohérence du personnage
- Disponible sur tous les plans (y compris Libre)

**Fonctionnalités** :
- Génération de la fiche composite à la demande
- Interface dédiée pour visualiser tous les angles d'un personnage
- Régénération de la fiche

**Valeur** : Réutilisation des personnages sous différents angles, cohérence visuelle maximale.

#### 3.4 Opérations sur les assets

- **Régénération** : Régénérer une image avec le style actuel du projet
- **Suppression** : Supprimer un asset de la bibliothèque
- **Affichage** : Grille responsive avec aperçu des images
- **Placeholder** : Affichage d'un placeholder pendant la génération

---

### 4. 📖 Gestion des chapitres

**Description** : Organisation de l'histoire en chapitres numérotés.

**Fonctionnalités** :
- Création de chapitres avec :
  - Titre du chapitre
  - Synopsis (description de l'action)
  - Numérotation automatique
- Liste des chapitres avec aperçu
- Navigation vers le détail d'un chapitre
- Suppression de chapitres

**Section Scénario (écriture de l'histoire)** :
- Zone dédiée pour écrire ou importer le scénario (texte narratif). **Les chapitres sont le scénario** (un chapitre = un bloc de texte). **IA Scénario** : votre scénariste IA crée votre histoire **chapitre par chapitre** — **un prompt génère un chapitre** ; vous acceptez ou rejetez. **IA Chapitre** : sur un chapitre existant, réécriture ciblée (un chapitre). Moteur texte : **Google Gemini Flash** (primaire) + **Groq Llama 3.3 70B** (fallback).
- **IA Scénario** : l'utilisateur saisit un **prompt** ; l'IA génère **toute l'histoire** chapitre par chapitre **directement sur le site**. Modification : nouveau prompt → réécriture → **comparaison visuelle ancienne / nouvelle** (diff mot à mot : supprimé en rouge, ajouté en vert) → **Accepter** ou **Rejeter**.
- **IA Chapitre** : sur **chaque chapitre**, une IA qui **n'intervient que sur ce chapitre**. Même flux réécriture → **Accepter / Rejeter** avec **diff visuel**.
- **Dans le scénario** : détection des **assets déjà créés** (surbrillance par type). **Hover** : image de l'asset (HoverCard). **Clic** : popup agrandie (Dialog) avec image, nom, type. Détection des **éléments mentionnés non encore créés** (panneau + surbrillance ambre). **Création depuis le scénario** : survol d'un élément non créé ou **sélection d'un mot/groupe de mots** → choix du type (Personnage / Décor / Objet) → **navigation vers l'onglet Assets** avec **dialog de création pré-rempli** (nom + type), sans création directe.
- **À prévoir** : lors du **renommage d'un asset**, détecter les occurrences de l'ancien nom dans les chapitres et proposer d'appliquer le remplacement partout (voir `Produit/Plan_Action_Developpement_Scénario.md`).

**Édition de l'œuvre (panels)** : **IA Panel** (même modèle LLM, system prompt dédié) : suggère ou réécrit la description d'un panel (contexte scénario + assets) ; réécriture directe dans le champ ; **Accepter / Rejeter**. Voir rapport pour flux Automatique / Structuré.

**Valeur** : Structure narrative claire, assistance IA pour écrire et modifier tout le scénario ou chapitre par chapitre, lien visuel scénario ↔ assets.

---

### 5. 🖼️ Génération IA d'images

**Description** : Génération automatique d'images via l'IA (FAL.ai, FLUX.2 Pro pour tous les tiers).

#### 5.1 Architecture technique

- **Edge Function Supabase** : `generate-asset-image`
- **Modèle IA** : FLUX.2 Pro / FLUX.2 Pro Edit via API FAL.ai — **même modèle pour tous les tiers** (logique « tout gratuit » : la différenciation se fait sur le volume de crédits, pas sur le modèle)
- **Stockage** : Supabase Storage (bucket `dreamweave`)

#### 5.2 Processus de génération

1. **Prompt utilisateur** : Description de l'asset/panel
2. **Enrichissement automatique** :
   - Ajout du template de style texte (si défini)
   - Ajout des instructions système selon le type d'asset
   - Ajout des instructions pour les images de référence (si présentes)
   - Ajout des instructions pour les vues spécifiques (profil, dos, etc.)
3. **Appel API FAL.ai** : Génération de l'image (FLUX.2 Pro pour tous les tiers)
4. **Upload Storage** : Sauvegarde dans Supabase Storage
5. **Mise à jour BDD** : Mise à jour de l'URL de l'image dans la base de données

#### 5.3 Prompts système

**Personnages** :
- Instructions pour le style webtoon
- Contraintes de cohérence visuelle
- Instructions spécifiques pour les vues (profil, dos)

**Décors** :
- Format vertical adapté aux webtoons
- Instructions de profondeur et d'ambiance

**Objets** :
- Style cohérent avec le projet
- Détails et proportions

**Valeur** : Qualité professionnelle, rapidité de génération, cohérence automatique.

---

### 6. ✍️ Section Scénario & IA narrative

**Description** : Écriture complète du scénario avec assistance IA, mémoire narrative et cohérence.

**Fonctionnalités** :
- Zone dédiée pour écrire le scénario chapitre par chapitre (prose narrative libre)
- **IA Scénario** : un prompt = un chapitre généré (Gemini Flash + Groq fallback) — accepter/rejeter
- **IA Chapitre** : réécriture ciblée d'un chapitre avec diff visuel (rouge = supprimé, vert = ajouté)
- Détection des assets existants dans le texte (surbrillance + HoverCard image + Dialog agrandie)
- Détection des éléments non créés (panneau « à créer », surbrillance ambre, option exclure)
- **NarraMind** : mémoire narrative automatique (entités `memory_entities`, résumés glissants `memory_summaries`, contexte borné ~1 400 tokens)
- Alertes d'incohérence Ariane en langage auteur (persistées dans `narramind_alerts`)
- Déclenchement automatique après auto-save (≥ 80 mots, ≥ 12 min de garde-fou)

**Valeur** : Écrire et itérer sur son histoire sans perdre la cohérence narrative, avec une IA qui connaît tous ses personnages.

---

### 7. 🎨 Éditeur Canvas (Édition de l'œuvre)

**Description** : Éditeur visuel type Figma pour composer les panels du webtoon.

**Fonctionnalités** :
- Canvas vertical 800px × jusqu'à 100 000px (chapitre entier en scroll vertical continu)
- **Blocs image** : ajout, drag & drop, redimensionnement (8 poignées), génération FLUX.2 Pro, régénération
- **Blocs couleur** : zones de couleur unie ou dégradé pour l'ambiance du panel
- **Bulles de dialogue** (6 types SVG manga/webtoon) : Parole, Pensée, Cri, Chuchotement, Narration, Radio + texte brut sans forme
- Positionnement libre des bulles, redimensionnement 8 points, édition inline dans la sidebar
- Undo/Redo complet, raccourcis clavier (Delete, Ctrl+Z, Ctrl+Y), zoom + panoramique
- Sélection explicite au clic (ring + handles Figma-style), panneau de propriétés contextuel

**Export** :
- PNG panel individuel (800×H) via html2canvas
- PNG chapitre complet assemblé verticalement (800×ΣH) — format Webtoon Canvas / Tapas

**Valeur** : Composer des pages webtoon professionnelles sans compétences graphiques.

---

### 8. 🌌 Univers / Lore & Ariane Compass

**Description** : Cartographie narrative de l'univers + propositions Ariane contextualisées par vectorisation.

**Fonctionnalités** :
- **Graphe Univers** : vue interactive des entités (personnages, lieux, objets, événements) avec connexions relationnelles (@xyflow/react)
- Création et édition de fiches lore directement dans le graphe
- **NarraMind Compass** : vectorisation via Gemini text-embedding-004 (768D) → pgvector (`project_embeddings`)
- Propositions Ariane : recherche sémantique top-5 → Gemini Flash → `compass_proposals` (directions narratives, suggestions lore)

**Valeur** : Construire un univers cohérent et profond grâce au scénario lui-même.

---

### 9. 🤖 Ariane — IA continuité intégrée

**Description** : Personnage IA intégré à tout le workflow, de l'onboarding à la continuité narrative.

**Composants** :
- **ArianeBubble** : bulle flottante présente dans toutes les vues
- **ArianeTabTourOverlay** : onboarding progressif (onglets débloqués étape par étape via `useProgressiveMenuGate`)
- **ArianeContinuityPanel** : fil d'Ariane doré animé, alertes de continuité narrative
- **ArianeNarrativeSheet** : fiche narrative de l'asset (lore du personnage/décor)
- **ArianeAnalysisModal** : analyse narrative approfondie du projet ou d'un chapitre

**Valeur** : Un assistant créatif qui guide l'auteur sans jamais l'interrompre.

---

### 10. 🔐 Authentification et sécurité

**Description** : Système d'authentification sécurisé avec Supabase Auth.

**Fonctionnalités** :
- **Inscription** : Email + mot de passe + nom d'affichage
- **Connexion** : Email + mot de passe
- **OAuth Google** : Connexion rapide via Google
- **Gestion de session** : Sessions persistantes
- **Row Level Security (RLS)** : Chaque utilisateur ne voit que ses propres projets/assets/chapitres

**Valeur** : Sécurité des données, expérience utilisateur fluide.

---

### 8. 🎨 Interface utilisateur

**Description** : Interface moderne et intuitive avec support du thème sombre/clair.

**Fonctionnalités** :
- **Design glassmorphism** : Effet de verre dépoli moderne
- **Thème clair/sombre** : Basculement instantané
- **Animations** : Transitions fluides avec Framer Motion
- **Responsive** : Adaptation mobile, tablette, desktop
- **Navigation** : Menu latéral avec liens vers Dashboard, Projets, etc.

**Composants UI** :
- Boutons avec gradients
- Cartes avec effets de survol
- Dialogs modaux
- Formulaires avec validation
- Toasts de notification

**Valeur** : Expérience utilisateur agréable, accessibilité, modernité.

---

### 9. 📊 Dashboard

**Description** : Vue d'ensemble de l'activité utilisateur.

**Fonctionnalités** :
- Message de bienvenue personnalisé
- Statistiques rapides :
  - Nombre de projets
  - Nombre d'assets (à venir)
  - Nombre de chapitres (à venir)
- Liste des projets récents (6 derniers)
- Accès rapide à la création de projet

**Valeur** : Vue d'ensemble, navigation rapide.

---

### 10. 🌐 Page d'accueil (Landing)

**Description** : Page marketing présentant le produit.

**Fonctionnalités** :
- Hero section avec call-to-action
- Présentation des 4 fonctionnalités principales :
  - Génération IA
  - Style cohérent
  - Lecture verticale
  - Bulles & dialogues
- Navigation vers l'inscription/connexion
- Design attractif avec animations

**Valeur** : Acquisition d'utilisateurs, communication produit.

---

## 🔄 Flux utilisateur typique

### Création d'un webtoon

1. **Inscription/Connexion** → Dashboard (guidé par Ariane dès le premier projet)
2. **Création d'un projet** → Titre + description
3. **Définition du style** :
   - Sélection preset (Manga, Webtoon coréen, Manwha...) + sous-style
   - Upload d'images de référence
4. **Création des assets** :
   - Personnages, décors, objets (génération FLUX.2 Pro)
   - Sheet System 4 angles (face, profil G/D, dos) pour les personnages
5. **Section Scénario** :
   - Écrire l'histoire chapitre par chapitre ou avec l'IA Scénario
   - NarraMind analyse la cohérence en arrière-plan, Ariane signale les incohérences
6. **Éditeur Canvas** :
   - Composer les panels avec blocs image + blocs couleur + bulles de dialogue
   - Drag, resize, génération IA par bloc, undo/redo
7. **Univers / Lore** :
   - Cartographier les entités dans le graphe
   - Ariane Compass propose des enrichissements à partir du scénario
8. **Export** : PNG panel individuel ou chapitre complet (800×ΣH)

---

## 🚀 Fonctionnalités à venir (backlog)

### Court terme (P0)

1. **Génération automatique de panels (Mode Auto)** :
   - Sélection des assets du chapitre → génération panel par panel à partir du scénario
   - Prompt = style + assets sélectionnés + description (jamais le scénario brut)

2. **Import scénario** :
   - Import .txt ou copier-coller dans la section Scénario

3. **Export haute résolution** :
   - Upscaling 2× des exports PNG

### Moyen terme

4. **Collaboration** :
   - Partage de projets (lecture seule + éditeurs)
   - Commentaires sur les panels

5. **Marketplace de styles** :
   - Partage de styles entre utilisateurs
   - Styles officiels DreamWeave

6. **Personnalisation typographique avancée** :
   - Gras, italique, espacement lettres, ombre texte dans les bulles

### Long terme

7. **Publication directe** :
   - Intégration Webtoon Canvas / Tapas
   - Lien de lecture public

8. **Animation** :
   - Panels animés, transitions, effets dynamiques

9. **Mobile / PWA** :
   - Progressive Web App installable, app iOS/Android

---

## 💡 Points de différenciation

1. **Cohérence stylistique garantie** : Template texte + images de référence appliqués à toutes les générations
2. **Sheet System** : Fiche composite 4 angles (face, profils, dos) par personnage — unique sur le marché
3. **Workflow intégré complet** : Scénario → Assets → Éditeur Canvas → Univers → Export
4. **NarraMind** : Mémoire narrative compressée, détection d'incohérences, contexte borné
5. **Ariane** : IA continuité intégrée à tout le workflow (onboarding, alertes, analyse, lore)
6. **Compass** : Vectorisation narrative (RAG) → propositions contextualisées uniques
7. **Format natif webtoon** : Canvas vertical 800px, export assemblé (Webtoon / Tapas)
8. **Accessibilité** : Aucune compétence artistique requise
9. **Plan Libre généreux** : Toutes les features, 20 crédits/mois, projets illimités

---

## 🎯 Métriques de succès

### Métriques produit

- **Taux de création de projet** : % d'utilisateurs créant au moins un projet
- **Taux de complétion** : % de projets avec au moins un chapitre
- **Taux de génération** : Nombre moyen d'assets générés par projet
- **Temps de génération** : Temps moyen pour générer un asset

### Métriques business

- **Taux d'inscription** : Conversion landing → inscription
- **Rétention** : Utilisateurs actifs mensuels
- **Engagement** : Nombre moyen de projets par utilisateur
- **Satisfaction** : NPS, feedback utilisateurs

---

## 🔧 Stack technique

- **Frontend** : React + TypeScript + Vite
- **UI** : shadcn/ui + Tailwind CSS + Framer Motion
- **Backend** : Supabase (PostgreSQL RLS + Auth email + Google OAuth + Storage bucket `dreamweave` + Edge Functions Deno)
- **IA images** : FAL.ai API (FLUX.2 Pro / FLUX.2 Pro Edit, tous tiers)
- **IA texte** : Google Gemini Flash (primaire) + Groq Llama 3.3 70B (fallback)
- **IA vectorisation** : Google Gemini text-embedding-004 (768D) + pgvector — NarraMind Compass
- **Paiement** : Stripe
- **Routing** : React Router DOM 6 (lazy loading)
- **State Management** : TanStack React Query 5
- **Deployment** : Vercel

---

## 📝 Conclusion

DreamWeave répond à un besoin réel et croissant : **démocratiser la création de webtoons**. En combinant l'IA générative avec un workflow optimisé et une interface intuitive, le produit permet à quiconque de créer des webtoons professionnels en quelques heures plutôt qu'en plusieurs semaines.

Le product-market fit est solide car :
- ✅ Le marché est en croissance (webtoons)
- ✅ La barrière à l'entrée est élevée (compétences artistiques)
- ✅ La solution est techniquement viable (IA générative mature)
- ✅ La valeur est immédiate (résultats visuels rapides)

Le produit est actuellement en phase de développement actif, avec les fonctionnalités core (gestion de projets, assets, style) opérationnelles, et les fonctionnalités avancées (génération de panels, dialogues) en cours de développement.

---

*Dernière mise à jour : 13 juin 2026 — Mise à jour majeure : ajout Section Scénario (IA Scénario + NarraMind), Éditeur Canvas (blocs image + couleur + bulles 6 types SVG + export PNG), Univers/Lore (graphe + Compass), Ariane (5 composants). Suppression "À venir" pour toutes les features livrées. Précédente : 7 juin 2026 — Sheet System, tiers, NarraMind Compass.*
