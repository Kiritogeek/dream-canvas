# Roadmap Produit — DreamWeave

## Vue d'ensemble

```
  2026
  ──────────────────────────────────────────────────────────────────────────────►

  Q1 (Jan-Mars)          Q2 (Avr-Juin)         Q3 (Jul-Sep)         Q4 (Oct-Déc)
  ┌─────────────┐        ┌─────────────┐       ┌─────────────┐      ┌─────────────┐
  │  MVP +      │        │  Panels &   │       │  Export &   │      │  Marketplace│
  │  Fondations │        │  Dialogues  │       │  Publication│      │  & Scale    │
  │             │        │             │       │             │      │             │
  │ ✅ Assets   │        │ 🔜 Panels   │       │ 📋 Export   │      │ 📋 Marketplace│
  │ ✅ Style    │        │    auto     │       │    PDF/PNG  │      │    de styles│
  │ ✅ Chapitres│        │ 🔜 Dialogues│       │ 📋 Publish  │      │ 📋 App mobile│
  │ ✅ Auth     │        │ 🔜 Lecture  │       │ 📋 Collab   │      │ 📋 Analytics│
  └─────────────┘        └─────────────┘       └─────────────┘      └─────────────┘
       ACTUEL                 NEXT                PLANNED              FUTURE
```

---

## Phase 1 : MVP & Fondations (Q1 2026) — ✅ LIVRÉ

> **Objectif** : Proposer un workflow complet de création d'assets avec IA, une organisation de projet fonctionnelle, et un système de monétisation (tiers Free/Pro).

### Fonctionnalités livrées ✅

| Fonctionnalité | Description | Statut |
|---------------|------------|--------|
| **Authentification complète** | Email/password + Google OAuth + sessions | ✅ Livré |
| **Gestion de projets** | CRUD projets, dashboard, liste, recherche | ✅ Livré |
| **Système de style** | Template texte + images de référence (2 max, Pro) | ✅ Livré |
| **Bibliothèque d'assets** | Personnages, décors, objets avec génération IA | ✅ Livré |
| **Vues multiples** | Face, profil gauche/droit, dos pour les personnages (Pro) | ✅ Livré |
| **Génération IA multi-modèles** | Free → FLUX.1 Schnell / Pro → FLUX.2 Pro / Pro Edit | ✅ Livré |
| **Plans Free / Pro** | Page pricing, comparaison, changement de plan | ✅ Livré |
| **Quotas mensuels** | 20 gen/mois (Free), 300 gen/mois (Pro), tracking usage | ✅ Livré |
| **Dashboard** | Stats temps réel, barre d'usage, badge tier | ✅ Livré |
| **Profil utilisateur** | Page profil avec display_name, email | ✅ Livré |
| **Landing page** | Page marketing avec CTA | ✅ Livré |
| **Thème clair/sombre** | Basculement avec persistance | ✅ Livré |
| **Design glassmorphism** | UI moderne avec effets visuels | ✅ Livré |
| **RLS (sécurité)** | Isolation des données par utilisateur | ✅ Livré |
| **JWT vérifié** | Vérification via Supabase Auth (pas de décodage manuel) | ✅ Livré |
| **Service layer** | Services séparés (projects, assets, storage) | ✅ Livré |
| **React Query** | Cache serveur, mutations, invalidation automatique | ✅ Livré |
| **TypeScript strict** | `strict: true`, types partagés centralisés | ✅ Livré |
| **Retry + Timeout** | fetchWithRetry (2x backoff), fetchWithTimeout (120s) | ✅ Livré |

### Métriques de succès Phase 1

| Métrique | Cible | Mesure |
|---------|-------|--------|
| Fonctionnalités core opérationnelles | 100% | Revue technique |
| Temps de génération d'un asset | < 15s | Monitoring Edge Function |
| Cohérence stylistique perçue | > 7/10 | Feedback beta testeurs |

---

## Phase 2 : Panels & Dialogues (Q2 2026) — 🔜 NEXT

> **Objectif** : Permettre la création complète d'un chapitre de webtoon avec panels générés par IA et dialogues.

### 2.1 Génération automatique de panels

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Architecture prompt panels** | Système de prompts pour générer des panels cohérents | P0 | L |
| **Découpage automatique du synopsis** | IA qui divise le synopsis en 10-20 scènes/panels | P0 | L |
| **Intégration des assets dans les panels** | Référencer les personnages/décors existants dans les prompts | P0 | M |
| **Format 800×1200** | Génération en format vertical webtoon | P0 | S |
| **Régénération individuelle** | Régénérer un seul panel | P0 | S |
| **Édition du prompt d'un panel** | Modifier la description avant régénération | P1 | S |
| **Réorganisation drag & drop** | Changer l'ordre des panels | P1 | M |
| **Ajout/suppression de panels** | Insérer ou retirer des panels manuellement | P1 | S |

### 2.2 Système de dialogues et narration

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Bulles de dialogue** | Overlay de bulles sur les panels | P0 | L |
| **Positionnement des bulles** | Placement par drag & drop | P0 | M |
| **Types de bulles** | Parole, pensée, cri, chuchotement | P1 | M |
| **Narration** | Blocs de narration en haut/bas des panels | P1 | S |
| **Personnalisation typographique** | Police, taille, couleur du texte | P2 | S |
| **Génération IA de dialogues** | Suggestion de dialogues à partir du synopsis | P2 | L |

### 2.3 Lecteur webtoon amélioré

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Défilement vertical fluide** | Lecture continue sans pagination | P0 | M |
| **Mode plein écran** | Lecture immersive | P1 | S |
| **Navigation entre chapitres** | Précédent / Suivant | P1 | S |
| **Préchargement d'images** | Chargement anticipé pour fluidité | P2 | M |

### Métriques de succès Phase 2

| Métrique | Cible |
|---------|-------|
| Panels générés par chapitre | 10-20 |
| Temps de génération d'un chapitre complet | < 30 min |
| Taux de satisfaction des panels (feedback) | > 6/10 |
| Taux de rétention J7 | > 35% |

---

## Phase 3 : Export & Publication (Q3 2026) — 📋 PLANNED

> **Objectif** : Permettre aux utilisateurs de sortir leur contenu de la plateforme et de le publier.

### 3.1 Export

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Export PDF** | Chapitre complet en PDF avec panels et dialogues | P0 | M |
| **Export PNG** | Images individuelles des panels | P0 | S |
| **Export format Webtoon** | Format optimisé pour les plateformes (bandes verticales continues) | P1 | L |
| **Résolution haute** | Upscaling des images (1024×1024 ou plus) | P1 | M |
| **Export batch** | Exporter tous les chapitres d'un coup | P2 | M |

### 3.2 Collaboration (base)

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Partage de projet** | Lien de partage en lecture seule | P0 | M |
| **Invitation d'éditeurs** | Inviter des collaborateurs par email | P1 | L |
| **Rôles** | Propriétaire, éditeur, lecteur | P1 | M |
| **Commentaires** | Commenter les panels pour feedback | P2 | M |

### 3.3 Améliorations IA

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Upscaling IA** | Augmenter la résolution des images générées | P0 | M |
| **Modèles multiples** | Support de Flux Pro, SDXL, etc. | P1 | L |
| **Inpainting** | Modifier une partie d'une image existante | P2 | L |
| **Character consistency** | IA améliorée pour la cohérence des personnages entre panels | P1 | XL |

### 3.4 Monétisation

| Tâche | Description | Priorité | Effort | Statut |
|-------|------------|----------|--------|--------|
| **Système de plans** | Free / Pro avec tiers | P0 | L | ✅ Livré (Phase 1) |
| **Gestion des quotas** | Compteur de générations, alertes, barre d'usage | P0 | M | ✅ Livré (Phase 1) |
| **Page pricing** | Page de présentation et comparaison des plans | P0 | S | ✅ Livré (Phase 1) |
| **Intégration Stripe** | Paiement par abonnement automatique | P0 | L | 📋 Planifié |

### Métriques de succès Phase 3

| Métrique | Cible |
|---------|-------|
| Premiers utilisateurs payants | > 50 |
| MRR | > 1 000 € |
| Taux de conversion Free → Pro | > 3% |
| Chapitres exportés par semaine | > 100 |

---

## Phase 4 : Marketplace & Scale (Q4 2026) — 📋 FUTURE

> **Objectif** : Construire un écosystème avec effet de réseau et préparer le scale.

### 4.1 Marketplace de styles

| Tâche | Description | Priorité |
|-------|------------|----------|
| **Galerie de styles** | Parcourir et prévisualiser des styles communautaires | P0 |
| **Publication de styles** | Les utilisateurs peuvent partager leurs styles | P0 |
| **Styles premium** | Vente de styles (commission 30%) | P1 |
| **Évaluation et avis** | Notes et commentaires sur les styles | P1 |
| **Styles officiels** | Styles curatés par DreamWeave | P2 |

### 4.2 Intégration plateformes

| Tâche | Description | Priorité |
|-------|------------|----------|
| **API Webtoon Canvas** | Publication directe sur Webtoon | P1 |
| **API Tapas** | Publication directe sur Tapas | P1 |
| **Lien de lecture public** | URL publique pour partager son webtoon | P0 |
| **Embed** | Widget intégrable dans un site web | P2 |

### 4.3 Mobile et performance

| Tâche | Description | Priorité |
|-------|------------|----------|
| **PWA** | Progressive Web App installable | P0 |
| **Optimisation mobile** | Interface tactile améliorée | P0 |
| **App iOS** | Application native iOS | P2 |
| **App Android** | Application native Android | P2 |

### 4.4 IA avancée

| Tâche | Description | Priorité |
|-------|------------|----------|
| **Génération de scénario** | IA pour générer/compléter des synopsis | P1 |
| **Suggestion de dialogues** | Dialogues générés à partir du contexte | P1 |
| **Panels animés** | Animations subtiles sur les panels | P2 |
| **Voix off IA** | Narration audio automatique | P3 |

---

## Légende

| Symbole | Signification |
|---------|--------------|
| ✅ | Livré et opérationnel |
| 🔜 | En cours / Prochaine phase |
| 📋 | Planifié (backlog) |
| P0 | Critique (must-have) |
| P1 | Important (should-have) |
| P2 | Souhaitable (nice-to-have) |
| P3 | Futur (won't-have now) |
| S | Small (1-3 jours) |
| M | Medium (3-7 jours) |
| L | Large (1-3 semaines) |
| XL | Extra Large (3+ semaines) |

---

## Timeline visuelle

```
2026
Jan     Fév     Mar     Avr     Mai     Juin    Jul     Aoû     Sep     Oct     Nov     Déc
 │       │       │       │       │       │       │       │       │       │       │       │
 ├───────┴───────┤       │       │       │       │       │       │       │       │       │
 │  PHASE 1 ✅   │       │       │       │       │       │       │       │       │       │
 │  MVP +        │       │       │       │       │       │       │       │       │       │
 │  Fondations   │       │       │       │       │       │       │       │       │       │
 ├───────────────┼───────┴───────┴───────┤       │       │       │       │       │       │
                 │     PHASE 2 🔜        │       │       │       │       │       │       │
                 │  Panels & Dialogues   │       │       │       │       │       │       │
                 ├───────────────────────┼───────┴───────┴───────┤       │       │       │
                                        │     PHASE 3 📋        │       │       │       │
                                        │  Export & Publication  │       │       │       │
                                        ├───────────────────────┼───────┴───────┴───────┤
                                                                │     PHASE 4 📋        │
                                                                │  Marketplace & Scale  │
                                                                ├───────────────────────┤
```
