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

> **Objectif** : (1) **Section Scénario** : écriture avec IA (un prompt = un chapitre généré, accepter/rejeter). (2) **Édition de l'œuvre** : chapitres visuels et panels (**deux flux** (Automatique et Structuré). Les images générées sont toujours des **illustrations pleines** ; elles sont affichées dans les panels ou dans des blocs (conteneurs de mise en page), sans « cases » dessinées dans l’image. Voir `11_Rapport_Chapitres_Flux_Blocs_Scenario.md`. **Règle impérative** : la génération doit s'appuyer sur les **assets sélectionnés par l'utilisateur** (chapitre en mode Auto, par bloc en mode Structuré) pour cadrer la scène et que l'IA comprenne les éléments à mettre dans le chapitre.

### 2.1 Section Scénario (texte narratif — uniquement scénario)

**Deux types d'IA LLM** : **même modèle** (ex. Groq/Llama, OpenRouter, Mistral), **system prompts différents** — (1) **IA Scénario** (histoire entière), (2) **IA Chapitre** (un chapitre). Options gratuites : **Groq** (Llama 3.3 70B, Mixtral), **OpenRouter**, **Mistral La Plateforme**, **Google AI Studio** (Gemini). Voir rapport section 3.5.

**Visibilité UX** : l'**IA Scénario** doit être **visible et accessible dès que l'utilisateur entre dans la section Scénario** (onglet Scénario) ; l'**IA Chapitre** doit être **visible et accessible dès que l'utilisateur ouvre un chapitre de scénario créé**. Aucune étape supplémentaire pour accéder à ces aides.

#### Implémenté (février 2026) ✅

| Élément | Détail |
|--------|--------|
| **Onglet Scénario** | Onglet dédié dans la page projet (Style / Assets / Scénario). |
| **Chapitres = scénario** | Table `scenario_chapters` (titre, contenu, ordre) ; pas de scénario monolithique. Création, réorganisation (drag & drop), suppression. |
| **Versions** | Table `scenario_versions` pour flux accepter/rejeter. |
| **IA Scénario** | Scénariste au service de la vision de l’auteur. **Un prompt = un chapitre** généré. L’utilisateur construit son histoire chapitre par chapitre ; accepter crée un chapitre avec le texte proposé. |
| **IA Chapitre** | Par chapitre : prompt → réécriture → accepter/rejeter. |
| **Diff visuel** | **IA Chapitre uniquement** : ancienne vs nouvelle version (texte supprimé en rouge, ajouté en vert). **IA Scénario** : pas de diff — texte proposé affiché tel quel, accepter ou rejeter. |
| **Détection assets** | Surbrillance des noms d’assets dans le texte (par type). **Hover** : image de l’asset (HoverCard responsive). **Clic** : popup agrandie (Dialog) avec image, nom, type. |
| **Éléments non créés** | Détection noms mentionnés sans asset ; panneau « Personnages / éléments mentionnés non créés » ; surbrillance ambre. |
| **Création depuis scénario** | Survol élément non créé ou **sélection de texte** → choix type (Personnage/Décor/Objet) → **navigation onglet Assets** avec dialog de création **pré-rempli** (nom + type), pas de création directe. |
| **Précision détection** | Frontières de mots (pas « Jean » dans « Jean-Pierre », pas « ile » dans « silencieux »), stop-words (Acte, Merci, etc.). |

Voir `Produit/Plan_Action_Developpement_Scénario.md` pour le détail des phases A à G.

#### Tâches roadmap (à faire ou à prévoir)

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Écrire / importer le scénario** | Zone dédiée : écriture ou import (.txt / copier-coller). | P0 | M |
| **IA Scénario (un chapitre par prompt)** | Chaque prompt → l’IA génère **un chapitre** ; l’utilisateur accepte ou rejette. Pas de sélection du nombre de chapitres : l’histoire se construit chapitre par chapitre. | P0 | L |
| **Modification par prompt (scénario entier)** | Nouveau prompt pour modifier l'histoire → IA **réécrit** directement sur le site. **Comparaison** ancienne vs nouvelle. **Accepter** (garder nouvelle) ou **Rejeter** (revenir à l'ancienne). | P0 | L |
| **IA Chapitre (par chapitre)** | Sur **chaque chapitre**, IA qui **n'intervient que sur ce chapitre**. Prompt de modification → réécriture du chapitre → **accepter / rejeter**. | P0 | L |
| **Chapitres (scénario = webtoon)** | Les chapitres créés dans la section Scénario **correspondent** aux chapitres webtoon (1 chapitre écrit = 1 chapitre webtoon). Création / découpage (titres, ordre). | P0 | M |
| **Découpage Chapitre → Panels (section Scénario)** | Dans chaque chapitre (texte), découpage en **panels** (liste + courte description par panel) directement dans la section Scénario, pour alimenter la génération panel par panel. **Règles de gestion** du découpage (auto/manuel, critères) à **définir plus tard**. | P0 | L |
| **BDD — Scénarios approuvés & versions** | Persistance des versions approuvées ; conservation ancienne vs nouvelle pour flux accepter/rejeter. | P0 | M |
| **Découpage IA (optionnel)** | IA : scénario → chapitres, puis chapitre → panels (courtes descriptions). Structure uniquement ; scénario **jamais** dans les prompts d'image. | P0 | L |
| **Détection des assets dans le scénario** | Repérer dans le texte les mentions d'assets déjà créés (personnages, décors, objets). **Surbrillance** dans l'éditeur (style par type). **Hover** : affichage de l'image de l'asset (tooltip / popover). | P0 | M |
| **IA — Éléments non créés** | Détection (règles + LLM si besoin) des **éléments mentionnés dans le scénario** qui ne sont **pas encore** créés comme assets (personnages, décors, objets). Signalement dans le scénario (surbrillance « à créer » ou liste « Éléments mentionnés non créés ») pour inviter à créer les assets manquants. | P0 | L |
| **À prévoir — Renommage d'assets** | Lors du **changement de nom d'un asset**, détecter toutes les occurrences de l'ancien nom dans le **contenu des chapitres** du projet et **proposer (ou appliquer) le remplacement** partout pour garder la cohérence scénario ↔ assets. Voir `Plan_Action_Developpement_Scénario.md` § 2. | P0 | M |

**Note** : L'IA Panel (suggestions / réécriture des descriptions de panels, accepter-rejeter) est en **2.2.1**. Règle inchangée : réutilisation de cette IA (ou d’un agent dérivé) pour la **rédaction des prompts des panels** (suggestions de descriptions courtes à partir du scénario + assets), sans injecter le scénario brut dans le prompt d’image (règle inchangée : prompt = style + assets + description).

### 2.2 Édition de l'œuvre (chapitres visuels, panels — uniquement visuel)

#### 2.2.1 Double visualisation & IA Panel

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Double visualisation** | À l'édition d'un panel : **côté scénario** chapitre de scénario (texte) affiché dès l'entrée dans le chapitre visuel (lien optionnel ou sélecteur) ; **côté assets** assets sélectionnés. Voir rapport § 3.4.1 (projection ouverture chapitre texte). | P0 | M |
| **IA Panel** | Même modèle LLM, system prompt « IA Panel » : suggère ou **réécrit** la description du panel (contexte scénario + assets). Réécriture **directe** dans le champ ; **accepter** ou **rejeter**. Règle : prompt d'image = style + assets + description (jamais le scénario brut). | P0 | L |

#### 2.2.2 Mode Automatique (flux rapide)

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Découpage automatique** | IA : scénario/synopsis → liste de panels (courtes descriptions). Découpage uniquement, pas dans le prompt d'image. | P0 | L |
| **Génération panel par panel** | Génération au minimum un panel à la fois (pas tout le chapitre d'un coup : limites API, timeouts). | P0 | M |
| **Architecture prompt panels** | Prompt par panel = style + **assets sélectionnés** + **courte description du panel** (pas le scénario/synopsis). Génération d’**images pleines** | P0 | L |
| **Sélection des assets par l'utilisateur** | En mode Auto : sélection des assets du chapitre avant génération. **Impératif** : cadrer la scène, faire comprendre à l'IA les éléments à mettre dans le chapitre. | P0 | M |
| **Intégration des assets dans les prompts** | Injecter les assets sélectionnés (personnages, décors, objets) dans chaque prompt de panel | P0 | M |
| **Format vertical 800×1200** | Images pleines, format webtoon | P0 | S |
| **Régénération / édition** | Régénérer un panel, modifier le prompt, réorganisation | P0–P1 | S–M |

#### 2.2.3 Mode Structuré (flux avec blocs)

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Modèle `panels.layout`** | JSONB blocs (x, y, width, height, prompt, asset_refs, image_url) | P0 | M |
| **UI structure chapitre** | Chapitre vide → ajout panels → ajout blocs (rectangles) par panel | P0 | L |
| **Remplissage des blocs** | Texte (prompt) + sélection d’assets par bloc **(impératif** : cadrer la génération, que l'IA comprenne les éléments à mettre dans l'image) | P0 | M |
| **Génération 1 image par bloc** | Image pleine par bloc à partir du prompt et des **assets sélectionnés** pour ce bloc, stockage URL, affichage dans le bloc | P0 | L |
| **Régénération / édition** | Régénérer un bloc, modifier prompt ou refs, réorganisation blocs | P1 | M |

#### 2.2.4 Système de dialogues et narration

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Bulles de dialogue** | Overlay de bulles sur les panels | P0 | L |
| **Positionnement des bulles** | Placement par drag & drop | P0 | M |
| **Types de bulles** | Parole, pensée, cri, chuchotement | P1 | M |
| **Narration** | Blocs de narration en haut/bas des panels | P1 | S |
| **Personnalisation typographique** | Police, taille, couleur du texte | P2 | S |
| **Génération IA de dialogues** | Suggestion de dialogues à partir du synopsis | P2 | L |

#### 2.2.5 Lecteur webtoon amélioré

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
| **IA — Rédaction des prompts panels** | Réutilisation de l’IA LLM (ou agent dérivé) pour **suggérer les descriptions/prompts des panels** à partir du scénario + assets sélectionnés. Règle inchangée : prompt d’image = style + assets + description (jamais le scénario brut). | P1 | L |

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
