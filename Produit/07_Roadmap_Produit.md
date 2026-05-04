# Roadmap Produit — DreamWeave

> Quatre phases (Q1–Q4 2026) : MVP livré, Panels & Dialogues, Export & Publication, Marketplace & Scale.

---

## Vue d'ensemble

```
  2026
  ──────────────────────────────────────────────────────────────────────────────►

  Q1 (Jan-Mars)          Q2 (Avr-Juin)         Q3 (Jul-Sep)         Q4 (Oct-Déc)
  ┌─────────────┐        ┌─────────────┐       ┌─────────────┐      ┌─────────────┐
  │  MVP +      │        │  Panels &   │       │  Export &   │      │  Marketplace│
  │  Fondations │        │  Dialogues  │       │  Publication│      │  & Scale    │
  │             │        │             │       │             │      │             │
  │ ✅ Assets   │        │ 🔜 Panels  │       │ 📋 Export   │      │ 📋 Marketplace│
  │ ✅ Style    │       │    auto     │       │    PDF/PNG  │      │    de styles│
  │ ✅ Chapitres│       │ 🔜 Dialogues│       │ 📋 Publish  │      │ 📋 App mobile│
  │ ✅ Auth     │       │ 🔜 Lecture  │       │ 📋 Collab   │      │ 📋 Analytics│
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

## Phase 2 : Panels & Dialogues (Q2 2026) — 🔄 PARTIELLEMENT LIVRÉ

> **Objectif** : (1) **Section Scénario** : écriture avec IA (un prompt = un chapitre généré, accepter/rejeter). (2) **Édition de l'œuvre** : chapitres visuels et panels (**deux flux** (Automatique et Structuré). Les images générées sont toujours des **illustrations pleines** ; elles sont affichées dans les panels ou dans des blocs (conteneurs de mise en page), sans « cases » dessinées dans l’image. Voir `Edition-Oeuvre.md` (Partie II). **Règle impérative** : la génération doit s'appuyer sur les **assets sélectionnés par l'utilisateur** (chapitre en mode Auto, par bloc en mode Structuré) pour cadrer la scène et que l'IA comprenne les éléments à mettre dans le chapitre.

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
| **Précision détection** | Frontières de mots (pas « Jean » dans « Jean-Pierre », pas « ile » dans « silencieux »), stop-words (Acte, Merci, etc.). Voir `Plan_Action_Developpement_Scénario.md` §5 pour les règles (signal dialogue, répétition, liste limitée). |
| **Option « Ne pas créer »** | Retirer un élément de la liste « non créés » pour la session (exclusion sans créer l'asset). |

Voir `Plan_Action_Developpement_Scénario.md` pour le détail des phases A à G.

#### Tâches roadmap (statut et à faire)

| Tâche | Description | Priorité | Effort | Statut |
|-------|------------|----------|--------|--------|
| **Écrire le scénario** | Zone dédiée par chapitre (textarea). | P0 | M | ✅ Livré |
| **Import scénario** | Import .txt / copier-coller pour remplir le scénario. | P0 | S | 📋 À faire |
| **IA Scénario (un chapitre par prompt)** | Un prompt = un chapitre généré ; accepter/rejeter. | P0 | L | ✅ Livré |
| **Modification par prompt (scénario entier)** | Nouveau prompt → IA réécrit l'histoire entière ; comparaison ancienne vs nouvelle ; accepter/rejeter. | P1 | L | 📋 À faire |
| **IA Chapitre (par chapitre)** | Par chapitre : prompt → réécriture → accepter/rejeter + diff visuel. | P0 | L | ✅ Livré |
| **Chapitres (scénario = webtoon)** | 1 chapitre écrit = 1 chapitre webtoon. Création, réorganisation (drag & drop), suppression. | P0 | M | ✅ Livré |
| **Écrire le scénario (prose libre)** | ~~Format Lieu/Scène/Dialogue~~ → **prose narrative libre** avec marqueurs `=== Scène ===` optionnels. | P0 | M | 🔄 Refonte 18/04 |
| **Compteur temps de lecture live** | Formule : (mots ÷ 200) + (blocs × 20s). Debounce 800ms. Affiché dans Scénario + badge dans éditeur. | P0 | S | 📋 À faire |
| **Cible panels modifiable dans Scénario** | `projects.panels_target_per_chapter` éditable inline depuis la page Scénario. | P0 | S | 📋 À faire |
| **Détection blocs visuels + verrouillage** | IA détecte zones avec assez de matière pour 1 panel → propose `📌 Panel suggéré` → bouton Verrouiller. Fond coloré + numéro. Toujours modifiable. | P0 | L | 📋 À faire |
| **✏️ Modifier ce passage** (IA) | Sélection de texte → IA propose réécriture du passage. | P0 | M | 📋 À faire |
| **Résumés IA compacts** (`ai_summary`) | Après sauvegarde : génère un résumé 80 mots du chapitre. Utilisé comme contexte IA au lieu du texte complet. Migration : `ADD COLUMN ai_summary TEXT`. | P0 | M | 📋 À faire |
| **`✨ Suggérer un prompt` dans l'éditeur** | Bouton sur chaque bloc vide → IA propose prompt court basé sur chapitre + blocs précédents + historique. Injecté directement dans le champ prompt. | P0 | L | 📋 À faire |
| **Découpage Chapitre → Panels** | **Gate feature Pro.** IA découpe le chapitre en liste de panels avec description, lieu, personnages, ambiance. CTA upgrade pour Free. | P1 | L | 📋 À faire |
| **Limites caractères champs prompt** | Bloc panel : 400 chars · Asset : 300 chars · Style : 500 chars. | P1 | S | 📋 À faire |
| **Import scénario** | Import .txt / copier-coller. | P1 | S | 📋 À faire |
| **Renommage assets → mise à jour scénario** | Au renommage : modale confirmation + remplacement dans les chapitres. | P1 | M | 📋 À faire |
| **BDD — Scénarios approuvés & versions** | Persistance des versions, flux accepter/rejeter. | P0 | M | ✅ Livré |
| **Détection assets dans scénario** | Surbrillance par type, HoverCard, Dialog. | P0 | M | ✅ Livré |
| **Éléments non créés** | Panneau MissingAssetsPanel + surbrillance ambre + option Ne pas créer. | P0 | L | ✅ Livré |
| **Contrôle longueur chapitres** | `PanelCountBadge` (8–14 typique, barre progression). | P0 | M | ✅ Livré — commit a9f1279 |


### 2.2 Édition de l'œuvre (chapitres visuels, panels — uniquement visuel)

#### 2.2.1 Double visualisation

| Tâche | Description | Priorité | Effort | Statut |
|-------|------------|----------|--------|--------|
| **Double visualisation** | À l'édition d'un panel : **côté scénario** chapitre de scénario (texte) affiché dès l'entrée dans le chapitre visuel (lien optionnel ou sélecteur) ; **côté assets** assets sélectionnés. Voir rapport § 3.4.1 (projection ouverture chapitre texte). | P0 | M | ✅ Livré |

#### 2.2.2 Mode Structuré (flux avec blocs)

| Tâche | Description | Priorité | Effort | Statut |
|-------|------------|----------|--------|--------|
| **Modèle `panels.layout`** | JSONB blocs (x, y, width, height, prompt, asset_refs, image_url) | P0 | M | ✅ Livré |
| **UI structure chapitre** | Chapitre vide → ajout panels → ajout blocs (rectangles) par panel | P0 | L | ✅ Livré |
| **Remplissage des blocs** | Texte (prompt) + sélection d’assets par bloc | P0 | M | ✅ Livré |
| **Génération 1 image par bloc** | Image pleine par bloc à partir du prompt et des assets sélectionnés | P0 | L | ✅ Livré |
| **Régénération / édition** | Régénérer un bloc, modifier prompt ou refs, réorganisation blocs | P1 | M | ✅ Livré |

#### 2.2.3 Système de dialogues et texte dans le panel

| Tâche | Description | Priorité | Effort | Statut |
|-------|------------|----------|--------|--------|
| **Bulles de dialogue** | Bulles directement dans le panel ; overlay sur les blocs | P0 | L | ✅ Livré |
| **Positionnement des bulles** | Placement par clic (centre du panel) ou drag & drop libre | P0 | M | ✅ Livré |
| **Types de bulles** | Parole, pensée, cri, chuchotement, narration, radio — formes SVG manga/webtoon | P0 | M | ✅ Livré |
| **Édition inline** | Texte, type, fond, contour, police, taille, couleur éditables directement dans la sidebar — sans éditeur plein écran séparé | P0 | M | ✅ Livré (17/04/2026) |
| **Redimensionnement** | Poignées sur la bulle sélectionnée (8 points) | P0 | M | ✅ Livré |
| **Texte brut (sans bulle)** | Texte libre dans le panel, sans forme de bulle (narration, titres, onomatopées) | P1 | M | ✅ Livré — type `"text"` SpeechBubble, sans SVG ni fond (commit a9f1279) |
| **Personnalisation typographique avancée** | Gras, italique, espacement lettres, ombre texte | P1 | M | 📋 À faire |
| **Narration** | Blocs de narration en haut/bas des panels (texte brut ou bulle narration) | P1 | S | 📋 À faire |
| **Génération IA de dialogues** | Suggestion de dialogues à partir du synopsis | P2 | L | 📋 À faire |

#### 2.2.6b Édition type Figma (retour Jeremy — P2)

> **Source** : `12_Retour_Utilisateur_Jeremy.md` § 2.7 — Session 16/04/2026

| Tâche | Description | Priorité | Effort | Statut |
|-------|------------|----------|--------|--------|
| **Sélection explicite au clic** | Bloc sélectionné visuellement identifiable (ring, handles) | P2 | M | ✅ Livré |
| **Panneau de propriétés contextuel** | Au clic sur un bloc : propriétés dans la sidebar gauche (dimensions, prompt, assets) | P2 | M | ✅ Livré |
| **Suppression via touche Suppr** | Touche Delete/Backspace supprime le bloc/bulle actif(e) | P2 | S | ✅ Livré — keydown useEffect (commit a9f1279) |
| **Liberté de positionnement total** | Blocs et bulles repositionnables sans contrainte de grille | P2 | M | ✅ Livré |

#### 2.2.4 Blocs de couleurs (ambiance du panel)

> **Objectif** : Même système de blocs que pour l’architecture (position, dimensions), mais pour la **couleur** — remplir les **espaces entre les blocs d’image** par des zones de couleur. Dans les webtoons, le fond du panel est essentiel pour signifier l’ambiance (nuit, tension, flash-back, etc.).

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Blocs de couleurs** | Blocs dédiés à la couleur (même principe que blocs architecture : position, largeur, hauteur) ; remplissent les **interstices** entre les blocs d’image | P0 | L |
| **Remplissage par couleur** | Par bloc couleur : couleur unie ou dégradé ; pas de génération d’image | P0 | M |
| **Ordre des calques** | Gestion du rendu : blocs couleur en arrière-plan, blocs image par-dessus ; ou ordre configurable | P0 | M |
| **Menu Couleur (fond global)** | En complément : couleur de fond du panel (couleur unie ou dégradé) pour les zones non couvertes | P0 | S |

#### 2.2.5 Personnalisation visuelle du panel (effets)

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Bibliothèque d'effets** | Bibliothèque d'éléments visuels pour donner de la profondeur, douceur, émotion et vivant à l'œuvre | P0 | L |
| **Catégories d'effets** | Effets organisés par catégories : profondeur (ombres, lumières, atmosphère), douceur (flou, transitions douces), émotion (météo, ambiances), vivant (mouvement, dynamisme) | P0 | M |
| **Application des effets** | Placement et personnalisation des effets sur le panel (position, intensité, paramètres) | P0 | M |

#### 2.2.6 Prévisualisation et téléchargement chapitre visuel

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Prévisualisation complète** | La **prévisualisation** (vue lecture des panels) doit **inclure tous les éléments édités** : blocs image, **blocs de couleurs** (arrière-plan), et à terme bulles, texte brut, effets. Objectif : **cohérence avec le rendu exporté**. | P0 | M |
| **Export PNG panel individuel** | Télécharger un panel en PNG (800×H) — html2canvas : blocs image + couleurs + bulles. | P0 | S | ✅ Livré — commit a9f1279 |
| **Export PNG chapitre entier** | Télécharger tous les panels d’un chapitre assemblés verticalement (800×ΣH) — format Webtoon Canvas / Tapas. | P0 | S | ✅ Livré — commit a9f1279 |

#### 2.2.7 Lecteur webtoon amélioré

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Défilement vertical fluide** | Lecture continue sans pagination | P0 | M |
| **Mode plein écran** | Lecture immersive | P1 | S |
| **Navigation entre chapitres** | Précédent / Suivant | P1 | S |
| **Préchargement d'images** | Chargement anticipé pour fluidité | P2 | M |

### 2.3 Monétisation — Stripe (⚠️ PRIORITÉ Q2 2026)

> **Situation actuelle** : Le plan Pro (14,99 €/mois) est entièrement simulé — n'importe quel utilisateur peut s'upgrader gratuitement depuis la page Plans. Le paiement réel est indispensable avant tout lancement public.

| Tâche | Description | Priorité | Effort | Statut |
|-------|------------|----------|--------|--------|
| **Intégration Stripe Checkout** | Rediriger vers Stripe au clic "Passer au Pro" — abonnement mensuel | P0 | L | 📋 À faire |
| **Webhook Stripe → Supabase** | Mettre à jour `profiles.plan` via webhook (events: `customer.subscription.created/deleted/updated`) | P0 | L | 📋 À faire |
| **Sécuriser la page Plans** | Retirer le bouton "Passer au Pro" sans paiement — afficher statut abonnement réel | P0 | M | 📋 À faire |
| **RLS sur `profiles.plan`** | S'assurer que seul le webhook (service role) peut modifier le plan — pas l'utilisateur lui-même | P0 | S | 📋 À faire |
| **Portal de gestion abonnement** | Lien vers Stripe Customer Portal pour annulation/changement CB | P1 | S | 📋 À faire |

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

### 3.1 Export et téléchargement chapitre visuel

| Tâche | Description | Priorité | Effort |
|-------|------------|----------|--------|
| **Export PNG panel + chapitre** | ✅ Livré en Phase 2 (commit a9f1279) — panel individuel (800×H) + chapitre complet assemblé verticalement (800×ΣH, format Webtoon/Tapas). | P0 | S | ✅ Livré |
| **Export haute résolution** | Upscaling 2× des exports PNG pour impression ou plateformes HD | P1 | M |
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

---

## Annexe : État réel du code (2026-05-04)

> Section basée sur l'analyse du code source — source de vérité : git log + fichiers src/.

### Pages réellement présentes dans `/src/pages/`

| Fichier | Présent dans doc | Notes |
|---------|-----------------|-------|
| `Landing.tsx` | ✅ | Page marketing |
| `Auth.tsx` | ✅ | Inscription / Connexion |
| `Dashboard.tsx` | ✅ | Tableau de bord |
| `Projects.tsx` | ✅ | Liste des projets |
| `ProjectDetail.tsx` | ✅ | Éditeur projet (Style/Assets/Scénario/Édition) |
| `ChapterDetail.tsx` | ✅ | Éditeur chapitre visuel |
| `Profile.tsx` | ✅ | Profil utilisateur |
| `Plans.tsx` | ✅ | Page plans Free/Pro/Studio |
| `NotFound.tsx` | ✅ | Page 404 |
| `ResetPassword.tsx` | ⚠️ absent du doc | Réinitialisation de mot de passe |
| `EmailVerification.tsx` | ⚠️ absent du doc | Vérification email post-inscription |
| `ScenarioChapterEditor.tsx` | ⚠️ absent du doc | Éditeur dédié d'un chapitre de scénario (vue standalone) |

### Composants majeurs réellement présents dans `/src/components/project/`

| Fichier | Présent dans doc | Notes |
|---------|-----------------|-------|
| `AssetLibrary.tsx` | ✅ | Bibliothèque d'assets |
| `AssetCard.tsx` | ✅ | Carte asset |
| `StyleManager.tsx` | ✅ | Gestion style |
| `ScenarioSection.tsx` | ✅ | Section scénario |
| `EditionSection.tsx` | ✅ | Section édition |
| `ScenarioTextHighlighter.tsx` | ✅ | Surbrillance assets dans scénario |
| `CharacterViewDialog.tsx` | ✅ | Vues multiples personnage |
| `SpeechBubbleEditor.tsx` | ⚠️ absent du doc | Éditeur de bulles de dialogue |
| `AIChapterPreviewModal.tsx` | ⚠️ absent du doc | Aperçu chapitre IA |
| `ScenarioFormattedPreview.tsx` | ⚠️ absent du doc | Prévisualisation scénario formaté |
| `UniverseSection.tsx` | ⚠️ absent du doc | Section univers narratif (lore) |
| `TestSection.tsx` | ⚠️ absent du doc | Section de test (dev) |

### Features implémentées vs documentées — état réel

| Feature | Statut roadmap | État réel dans le code |
|---------|---------------|----------------------|
| **Sheet System** (image_url_sheet) | 🔜 | ✅ Migration 20260416, EF generate-asset-image |
| **NarraMind** (mémoire narrative) | 🔜 | ✅ EF narramind-update, tables memory_entities/summaries/narramind_alerts |
| **3 tiers (libre/createur/studio)** | 📋 | ✅ Migration 20260503, useUserPlan.ts |
| **billing_period_start** | 📋 | ✅ Migration 20260503 |
| **Stripe infrastructure** | 📋 | ✅ EFs create-checkout-session, stripe-webhook, profiles.stripe_customer_id — non déployé en prod |
| **Export PNG panel + chapitre** | 📋 | ✅ Livré (html2canvas, commit a9f1279) |
| **universe_lore** | non documenté | ✅ Table + UniverseSection.tsx |
| **Reset Password** | non documenté | ✅ ResetPassword.tsx |
| **Email Verification** | non documenté | ✅ EmailVerification.tsx |

### TODOs dans le code

Aucun commentaire `TODO` ou `FIXME` trouvé dans `/src/` (grep négatif — code propre).

### Branches git actives

| Branche | Type | Objectif |
|---------|------|---------|
| `main` | Production | Branche principale |
| `worktree-agent-*` | Temporaire | Worktrees d'agents Claude Code (nettoyage automatique) |

> Pas de branche `feat/` ou `fix/` active. Tout le développement se fait directement sur `main`.

### 30 derniers commits significatifs (git log --oneline -30)

| Hash | Message |
|------|---------|
| `0774aea` | Supprime le champ 'Panels cible' du dialog de modification de projet |
| `0c27c56` | Supprime la bannière Assets et l'exemple complet du dialog Chapitre type |
| `c3b5620` | Améliore l'UX scénario — chapitre suivant, lien Assets, onboarding Ariane |
| `63ba603` | Ajoute l'indicateur de coût crédit sur les boutons de génération |
| `a48376f` | Corrige la sheet asset et l'affichage des cards personnages |
| `5f85eeb` | Corrige l'onboarding Style — clé localStorage par user.id |
| `50d07b0` | Corrige l'onboarding Ariane — clé localStorage par user.id |
| `2317ba3` | Landing — gradient-dream light mode plus opaque |
| `d8e01c7` | Améliore le contraste light mode — tokens, glass, sidebar |
| `583f876` | Landing — centre le hero, corrige portrait Ariane |
| `4cb5027` | Refonte Landing — 7 sections, Ariane hero + section dédiée, plans aperçu |
| `7a18842` | Corrige NarraMind : ne réactive pas les alertes resolved/dismissed |
| `01811bd` | Plans — box shadow coloré via --glass-shadow CSS var |
| `43c295b` | Chantier 4 — gates features, billing_period_start, quota reset abonnement |
| `1290761` | Passe de 2 tiers (free/pro) à 3 tiers (libre/createur/studio) |
| `742b0dd` | Refonte Éditeur Option A — CaseLayers, raccourcis clavier extraits |
| `c071258` | Fil d'Ariane V2 — assets manquants, navigation avec highlight, FAB 64px |
| `cf8295c` | Corrige le label chapitre, supprime bouton Continuité, améliore NarraMind |
| `6d776d3` | Ajoute animation de vague sinusoïdale aux fils du fil d'Ariane |
| `b4a1391` | Remplace la pelote par des fils dorés animés qui orbitent |

## Références

- **UX et parcours** : `UX.md`, `04_User_Stories_Parcours.md`
- **Scénario et flux** : `Edition-Oeuvre.md`, `Plan_Action_Developpement_Scénario.md` (dont §5 TextHighlighter)
- **Index produit** : `INDEX.md`

---

*Dernière mise à jour : 4 mai 2026 (v5) — Annexe "État réel du code" ajoutée : pages manquantes (ResetPassword, EmailVerification, ScenarioChapterEditor), composants manquants, features réellement implémentées (Sheet System ✅, NarraMind ✅, 3 tiers ✅, Stripe infra ✅), git log -30.*
