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
- **Automatisant la génération visuelle** via l'IA (FLUX.1 Schnell / FLUX.2 Pro via FAL.ai)
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

**Valeur** : Organisation claire du travail, gestion multi-projets.

---

### 2. 🖌️ Système de style visuel

**Description** : Définition d'un style visuel unique appliqué à toutes les générations d'un projet.

**Fonctionnalités** :
- **Template de style texte** : Description textuelle du style (ambiance, couleurs, niveau de détail, type de traits)
  - Exemple : "style webtoon sombre, ambiance urbaine nocturne, lumières néon, détails réalistes, palette violets / bleus"
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

**Vues multiples** :
- **Vue de face** : Image principale (générée automatiquement)
- **Profil gauche** : Vue de profil gauche
- **Profil droite** : Vue de profil droite
- **Vue de dos** : Vue arrière du personnage

**Fonctionnalités** :
- Génération à la demande pour chaque vue
- Interface dédiée pour gérer toutes les vues d'un personnage
- Régénération individuelle de chaque vue

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
- Zone dédiée pour écrire ou importer le scénario (texte narratif). **Les chapitres sont le scénario** (un chapitre = un bloc de texte ; pas de champ « nombre de chapitres » pour l'IA Scénario). **Deux types d'IA LLM** (même modèle, system prompts différents) — **IA Scénario** (histoire entière) et **IA Chapitre** (un chapitre). Options gratuites : Groq (Llama 3.3 70B), OpenRouter, Mistral, Google AI Studio.
- **IA Scénario** : l'utilisateur saisit un **prompt** ; l'IA génère **toute l'histoire** chapitre par chapitre **directement sur le site**. Modification : nouveau prompt → réécriture → **comparaison visuelle ancienne / nouvelle** (diff mot à mot : supprimé en rouge, ajouté en vert) → **Accepter** ou **Rejeter**.
- **IA Chapitre** : sur **chaque chapitre**, une IA qui **n'intervient que sur ce chapitre**. Même flux réécriture → **Accepter / Rejeter** avec **diff visuel**.
- **Dans le scénario** : détection des **assets déjà créés** (surbrillance par type). **Hover** : image de l'asset (HoverCard). **Clic** : popup agrandie (Dialog) avec image, nom, type. Détection des **éléments mentionnés non encore créés** (panneau + surbrillance ambre). **Création depuis le scénario** : survol d'un élément non créé ou **sélection d'un mot/groupe de mots** → choix du type (Personnage / Décor / Objet) → **navigation vers l'onglet Assets** avec **dialog de création pré-rempli** (nom + type), sans création directe.
- **À prévoir** : lors du **renommage d'un asset**, détecter les occurrences de l'ancien nom dans les chapitres et proposer d'appliquer le remplacement partout (voir `Produit/Plan_Action_Developpement_Scénario.md`).

**Édition de l'œuvre (panels)** : **IA Panel** (même modèle LLM, system prompt dédié) : suggère ou réécrit la description d'un panel (contexte scénario + assets) ; réécriture directe dans le champ ; **Accepter / Rejeter**. Voir rapport pour flux Automatique / Structuré.

**Valeur** : Structure narrative claire, assistance IA pour écrire et modifier tout le scénario ou chapitre par chapitre, lien visuel scénario ↔ assets.

---

### 5. 🖼️ Génération IA d'images

**Description** : Génération automatique d'images via l'IA (FAL.ai, multi-modèles selon le plan).

#### 5.1 Architecture technique

- **Edge Function Supabase** : `generate-asset-image`
- **Modèle IA** : FLUX.1 Schnell (Free) / FLUX.2 Pro / FLUX.2 Pro Edit (Pro) via API FAL.ai
- **Format** : Images 512×512px en PNG
- **Stockage** : Supabase Storage (bucket `dreamweave`)

#### 5.2 Processus de génération

1. **Prompt utilisateur** : Description de l'asset/panel
2. **Enrichissement automatique** :
   - Ajout du template de style texte (si défini)
   - Ajout des instructions système selon le type d'asset
   - Ajout des instructions pour les images de référence (si présentes)
   - Ajout des instructions pour les vues spécifiques (profil, dos, etc.)
3. **Appel API FAL.ai** : Génération de l'image (modèle sélectionné selon le plan)
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

### 6. 📱 Interface de lecture (panels)

**Description** : Prévisualisation des chapitres en format vertical (style webtoon).

**Fonctionnalités actuelles** :
- Affichage vertical des panels
- Format 800×1200px (ratio webtoon)
- Clic sur un panel pour le modifier
- Placeholder pour les panels sans image

**Fonctionnalités prévues (bientôt disponible)** :
- Génération automatique de 10-20 panels à partir du synopsis
- Édition des prompts de panels
- Régénération individuelle de panels
- Ajout de dialogues et bulles de texte
- Ajout de narration

**Valeur** : Expérience de lecture immersive, format natif webtoon.

---

### 7. 🔐 Authentification et sécurité

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

1. **Inscription/Connexion** → Dashboard
2. **Création d'un projet** → Titre + description
3. **Définition du style** :
   - Remplir le template de style texte
   - Uploader des images de référence
4. **Création des assets** :
   - Créer les personnages principaux (avec génération IA)
   - Créer les décors récurrents
   - Créer les objets importants
   - Générer les vues supplémentaires des personnages (profil, dos)
5. **Création des chapitres** :
   - Créer un chapitre avec titre et synopsis
   - (Bientôt) Générer automatiquement les panels
   - (Bientôt) Ajouter les dialogues et narration
6. **Prévisualisation** : Lire le chapitre en format vertical

---

## 🚀 Fonctionnalités à venir

### Court terme

1. **Génération automatique de panels** :
   - Génération de 10-20 panels à partir du synopsis
   - Utilisation des assets existants dans les prompts
   - Format vertical optimisé (800×1200px)

2. **Édition de panels** :
   - Modification du prompt d'un panel
   - Régénération individuelle
   - Réorganisation de l'ordre

3. **Système de dialogues** :
   - Ajout de bulles de dialogue
   - Personnalisation des polices
   - Positionnement des bulles
   - Ajout de narration

### Moyen terme

4. **Export** :
   - Export en PDF
   - Export en images individuelles
   - Export optimisé pour les plateformes webtoon

5. **Collaboration** :
   - Partage de projets
   - Édition collaborative
   - Commentaires

6. **Bibliothèque de styles** :
   - Styles prédéfinis
   - Partage de styles entre utilisateurs
   - Marketplace de styles

### Long terme

7. **Génération de scénario** :
   - IA pour générer des synopsis
   - Suggestions de dialogues
   - Développement de l'histoire

8. **Animation** :
   - Panels animés
   - Transitions entre panels
   - Effets visuels

9. **Publication** :
   - Intégration avec les plateformes webtoon
   - Publication directe depuis l'application
   - Analytics de lecture

---

## 💡 Points de différenciation

1. **Cohérence stylistique garantie** : Système de templates de style unique
2. **Vues multiples des personnages** : Génération de profil, dos, etc.
3. **Workflow optimisé** : Création d'assets → Chapitres → Panels
4. **Format natif webtoon** : Vertical, optimisé pour mobile
5. **Accessibilité** : Aucune compétence artistique requise
6. **Rapidité** : Génération en quelques secondes

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
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **IA** : FAL.ai API (FLUX.1 Schnell / FLUX.2 Pro / FLUX.2 Pro Edit)
- **Routing** : React Router DOM 7 (lazy loading)
- **State Management** : TanStack React Query 5
- **Deployment** : Vercel / Netlify

---

## 📝 Conclusion

DreamWeave répond à un besoin réel et croissant : **démocratiser la création de webtoons**. En combinant l'IA générative avec un workflow optimisé et une interface intuitive, le produit permet à quiconque de créer des webtoons professionnels en quelques heures plutôt qu'en plusieurs semaines.

Le product-market fit est solide car :
- ✅ Le marché est en croissance (webtoons)
- ✅ La barrière à l'entrée est élevée (compétences artistiques)
- ✅ La solution est techniquement viable (IA générative mature)
- ✅ La valeur est immédiate (résultats visuels rapides)

Le produit est actuellement en phase de développement actif, avec les fonctionnalités core (gestion de projets, assets, style) opérationnelles, et les fonctionnalités avancées (génération de panels, dialogues) en cours de développement.
