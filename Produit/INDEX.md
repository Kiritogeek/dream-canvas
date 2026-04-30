# DreamWeave — Documentation Produit

> Dossier de conception produit complet pour DreamWeave, plateforme de création de webtoons par IA.

---

## Sommaire

### Documents originaux

| # | Document | Description |
|---|----------|-------------|
| — | [Product.md](./Product.md) | Document produit original — vue d'ensemble des fonctionnalités, flux, stack technique et à venir |

### Product Market Fit & Stratégie

| # | Document | Description |
|---|----------|-------------|
| 01 | [Product Market Fit](./01_Product_Market_Fit.md) | Problème, solution, marché cible, validation PMF, positionnement, risques, Go-to-Market |
| 03 | [Personas Utilisateurs](./03_Personas_Utilisateurs.md) | 4 personas (Luna, Marc, Élodie, Théo), frustrations, objectifs, WTP, matrice |
| 05 | [Business Model Canvas](./05_Business_Model_Canvas.md) | Canvas, modèle freemium SaaS, grille tarifaire, projections, KPIs |
| 06 | [Analyse Concurrentielle](./06_Analyse_Concurrentielle.md) | Concurrents, matrice comparative, SWOT, différenciation |

### Conception Produit & UX

| # | Document | Description |
|---|----------|-------------|
| **UX** | [**UX — Parcours utilisateur**](./UX.md) | **Étapes actuelles et futures, écran par écran ; schéma global de l'UX** |
| 04 | [User Stories & Parcours](./04_User_Stories_Parcours.md) | Epics, user stories (40+), parcours, experience map, priorisation RICE |
| 07 | [Roadmap Produit](./07_Roadmap_Produit.md) | 4 phases (Q1–Q4 2026), fonctionnalités, métriques, timeline |
| — | [Plan d'action Section Scénario](./Plan_Action_Developpement_Scénario.md) | Scénario : réalisé (phases A–G) + à prévoir (renommage assets) |
| — | [Plan d'action TextHighlighter](./Plan_Action_TextHighligh_No_Assets.md) | Détection éléments non créés : règles, répétition, stop-words, évolutions |
| — | [**Plan Phase 2 — Édition de l'œuvre**](./Plan_Phase2_Edition_Oeuvre.md) | **Plan détaillé Phase 2 : section Édition de l'œuvre, lien textuel↔visuel, IA Panel, transformation chapitre texte → visuel** |
| — | [**Édition panel — Blocs et bulles**](./Edition_Panel_Blocs_Bulles.md) | Workflow édition panel : agencement blocs, prompt par bloc, **génération par bloc (images dans les blocs)**, bulles, visualisation **800×H** et UI immersive |
| — | [**Édition panel — Deux modes**](./Edition_Panel_Deux_Modes.md) | Édition panel par **sous-menus** (Personnalisation, Couleurs, Dialogue), actions structurelles et suivi chapitre textuel |
| — | [Guide maintenance des styles](./Guide_Maintenance_Styles.md) | Procédure d'ajout, modification et suppression des styles (UI + templates + Edge Functions) |

### Architecture Technique

| # | Document | Description |
|---|----------|-------------|
| 02 | [Architecture Technique](./02_Architecture_Technique.md) | Vue d'ensemble système, stack détaillée, architecture frontend/backend, flux de données, sécurité, performance |
| 08 | [Modèle de Données](./08_Modele_de_Donnees.md) | ERD, tables détaillées (5 tables), Storage, relations, contraintes, évolutions prévues |
| 09 | [Spécifications API](./09_Specifications_API.md) | API REST (PostgREST), Edge Functions, API FAL.ai, Storage API, SDK usage |
| 10 | [Sécurité & Infrastructure](./10_Securite_Infrastructure.md) | Couches de sécurité, RLS, secrets, RGPD, infrastructure, CI/CD, monitoring, DRP |
| 11 | [Rapport Chapitres — Flux, blocs, scénario](./11_Rapport_Chapitres_Flux_Blocs_Scenario.md) | Deux flux (Automatique / Structuré), images pleines dans des blocs, synopsis vs scénario, proposition de mise en place |
| — | [**NarraMind — Mémoire Narrative**](./NarraMind.md) | **Système de mémoire narrative IA** : architecture, tables BDD, Edge Function, déclenchement auto, vision UI, évolutions prévues |

---

## Vue d'ensemble du projet

**DreamWeave** est une plateforme web permettant de créer des webtoons (bandes dessinées verticales) grâce à l'intelligence artificielle générative.

### Proposition de valeur

> Créer des webtoons professionnels en quelques heures, sans compétences artistiques, grâce à l'IA.

### Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React 18 + TypeScript + Vite 7 + Tailwind CSS + shadcn/ui |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| **IA** | FAL.ai API (FLUX.2 Pro) |
| **Hébergement** | Vercel / Netlify + Supabase Cloud |

### Statut actuel

| Phase | Statut | Description |
|-------|--------|-------------|
| **Phase 1 — MVP** | ✅ Livré | Auth, projets, style, assets, génération IA, dashboard |
| **Phase 2 — Panels** | 🔜 Next | Génération de panels, dialogues, lecteur webtoon |
| **Phase 3 — Export** | 📋 Planifié | Export PDF/PNG, collaboration, monétisation |
| **Phase 4 — Scale** | 📋 Futur | Marketplace, app mobile, publication, analytics |

---

## Structure uniforme des documents

Chaque document du dossier suit la même structure :

| Élément | Règle |
|--------|--------|
| **Titre** | `# Titre — Sous-titre` (H1 unique) |
| **Description** | Court bloc `> ...` (1–2 lignes) en tête |
| **Séparateur** | `---` après la description |
| **Corps** | Sections `## 1. …`, `## 2. …` (numérotation cohérente) |
| **Fin** | `---` puis `*Dernière mise à jour : JJ mois AAAA*` |

---

## Structure du dossier

```
Produit/
├── INDEX.md                          ← Ce fichier (sommaire + structure uniforme)
├── UX.md                             ← Parcours UX : étapes actuelles/futures + schéma global
├── Product.md                        ← Document produit original
├── 01_Product_Market_Fit.md          ← Analyse PMF & Go-to-Market
├── 02_Architecture_Technique.md      ← Architecture système complète
├── 03_Personas_Utilisateurs.md       ← 4 personas détaillés
├── 04_User_Stories_Parcours.md       ← User stories & parcours
├── 05_Business_Model_Canvas.md       ← Business model & revenus
├── 06_Analyse_Concurrentielle.md     ← Concurrence & SWOT
├── 07_Roadmap_Produit.md             ← Roadmap 4 phases (2026)
├── Plan_Action_Developpement_Scénario.md  ← Section Scénario : réalisé + à prévoir
├── Plan_Action_TextHighligh_No_Assets.md ← Détection éléments non créés (assets)
├── Guide_Maintenance_Styles.md       ← Guide d'évolution des styles (ajout/modification/suppression)
├── 08_Modele_de_Donnees.md           ← Schéma BDD & Storage
├── 09_Specifications_API.md          ← Documentation API
├── 10_Securite_Infrastructure.md     ← Sécurité, infra & monitoring
├── 11_Rapport_Chapitres_Flux_Blocs_Scenario.md  ← Flux chapitres, blocs, scénario
└── NarraMind.md                              ← Système mémoire narrative IA (NarraMind)
```

---

## Comment utiliser cette documentation

1. **Pour l’UX et les parcours** : Commencez par `UX.md` (étapes + schéma), puis `04_User_Stories_Parcours.md`
2. **Pour comprendre le produit** : `Product.md`, puis `01_Product_Market_Fit.md`
3. **Pour les utilisateurs** : `03_Personas_Utilisateurs.md` et `04_User_Stories_Parcours.md`
4. **Pour le business** : `05_Business_Model_Canvas.md` et `06_Analyse_Concurrentielle.md`
5. **Pour la technique** : `02_Architecture_Technique.md`, puis `08_Modele_de_Donnees.md` et `09_Specifications_API.md`
6. **Pour la roadmap** : `07_Roadmap_Produit.md`
7. **Pour la sécurité** : `10_Securite_Infrastructure.md`

---

## Audit 17/02/2026

### Vue d'ensemble

Cet audit fait le point sur l'état réel du code par rapport à la documentation produit. Les fichiers .md du dossier Produit ont été mis à jour pour refléter l'implémentation actuelle.

### Statut des phases

| Phase | Statut réel | Description |
|-------|-------------|-------------|
| **Phase 1 — MVP** | ✅ **Complètement livré** | Auth (email/password + Google OAuth), projets (CRUD), style (template + images de référence), assets (personnages/décors/objets avec génération IA), plans Free/Pro, quotas mensuels, dashboard, profil utilisateur, landing page, thème clair/sombre |
| **Phase 2 — Panels & Scénario** | 🔄 **Partiellement livré** | **Section Scénario** : ✅ complète (IA Scénario, IA Chapitre, chapitres texte, détection assets, éléments non créés). **Édition de l'œuvre** : ✅ implémentée (chapitres visuels, panels avec blocs, génération par bloc). **À venir** : découpage IA chapitre→panels, dialogues/bulles, lecteur webtoon |
| **Phase 3 — Export** | 📋 **Planifié** | Export PDF/PNG, collaboration, monétisation Stripe |
| **Phase 4 — Scale** | 📋 **Futur** | Marketplace, app mobile, publication, analytics |

### Fonctionnalités implémentées (détail)

#### ✅ Phase 1 — MVP (100% livré)
- **Authentification** : Email/password + Google OAuth, sessions persistantes, RLS
- **Projets** : CRUD complet, recherche, filtrage, dashboard avec stats
- **Style** : Template texte + images de référence (2 max Pro), application automatique
- **Assets** : Bibliothèque complète (personnages, décors, objets), génération IA multi-modèles (FLUX.1 Schnell / FLUX.2 Pro / FLUX.2 Pro Edit), vues multiples (face/profil/dos) pour personnages Pro
- **Plans** : Free (20 gen/mois) / Pro (300 gen/mois), page pricing, changement de plan
- **Quotas** : Tracking usage mensuel, barre de progression, alertes
- **UI/UX** : Design glassmorphism, thème clair/sombre, responsive, composants shadcn/ui

#### 🔄 Phase 2 — Panels & Scénario (partiellement livré)

**Section Scénario** ✅ **Complète** :
- Onglet Scénario dans ProjectDetail
- Tables `scenario_chapters` et `scenario_versions`
- IA Scénario : un prompt = un chapitre généré (Groq/Llama 3.3 70B)
- IA Chapitre : réécriture par chapitre avec diff visuel (texte supprimé/ajouté)
- Chapitres texte : création, réorganisation (drag & drop), édition, suppression
- Détection assets : surbrillance par type, hover (HoverCard), clic (Dialog)
- Éléments non créés : détection IA, panneau dédié, création depuis scénario
- Mode Édition / Aperçu avec surbrillance
- Import .txt (copier-coller)

**Édition de l'œuvre** ✅ **Implémentée** :
- Onglet "Édition de l'œuvre" dans ProjectDetail
- Chapitres visuels (`chapters` table) avec lien optionnel vers chapitres texte (`linked_scenario_chapter_id`)
- Panels (`panels` table) avec layout JSONB (blocs)
- Page `ChapterDetail` : édition immersive plein écran avec panel centré fixe + suivi chapitre textuel à droite
- Sous-menus d’édition : Personnalisation, Couleurs, Dialogue (pictos)
- Actions structurelles : ajout blocs (500×500 par défaut), position (drag & drop), dimensions (poignées), suppression
- Génération visuelle : prompt par bloc avec détection assets, génération par bloc
- Edge Function `generate-panel-image` : génération d'image avec dimensions du bloc
- Stockage : `panels/{panel_id}/blocks/{block_id}.png`

**À venir** :
- Découpage IA chapitre → panels (suggestion optionnelle)
- Bulles de dialogue (speech_bubbles JSONB prévu mais UI non implémentée)
- Narration, effets de transition
- Lecteur webtoon (défilement vertical)

### Architecture technique réelle

#### Frontend
- **Pages** : Landing, Auth, Dashboard, Projects, ProjectDetail, Profile, Plans, ChapterDetail, NotFound
- **Composants** : DashboardLayout, AssetLibrary, StyleManager, ScenarioSection, EditionSection, ScenarioTextHighlighter, CharacterViewDialog, AssetCard, etc.
- **Services** : projects.ts, assets.ts, chapters.ts, panels.ts, scenarioChapters.ts, scenarioAI.ts, storage.ts
- **Hooks** : useAuth, useProjects, useAssets, useChapters, usePanels, useScenarioChapters, useScenarioAI, useAssetGeneration, useUserPlan, useTheme

#### Backend
- **Tables** : profiles, projects, assets, chapters, panels, scenario_chapters, scenario_versions, usage
- **Edge Functions** :
  - `generate-asset-image` : génération images assets (FLUX.1 Schnell / FLUX.2 Pro / FLUX.2 Pro Edit)
  - `generate-scenario-ai` : IA Scénario, IA Chapitre, découpage panels (Groq/Llama 3.3 70B)
  - `generate-panel-image` : génération images blocs de panels (dimensions personnalisées)
- **Storage** : Bucket `dreamweave` avec structure `{user_id}/projects/{project_id}/...`

### Modèle de données réel

**Tables principales** :
- `profiles` : plan (free/pro), display_name, avatar_url
- `projects` : title, description, style_template, style_image_urls, panels_target_per_chapter, cover_url
- `assets` : name, asset_type (character/background/object), prompt, image_url + vues multiples
- `chapters` : title, synopsis, chapter_number, linked_scenario_chapter_id
- `panels` : panel_number, prompt, image_url, layout (JSONB blocs), speech_bubbles (JSONB), dialogue, narration
- `scenario_chapters` : title, content, chapter_number, panels_outline (JSONB)
- `scenario_versions` : content, version_type, status (pending/accepted/rejected)
- `usage` : user_id, action, created_at (comptage mensuel)

### Routes implémentées

```
/ → Landing
/auth → Auth (inscription/connexion)
/dashboard → Dashboard
/dashboard/projects → Liste projets
/dashboard/projects/new → Création projet
/dashboard/projects/:id → Détail projet (onglets Style/Assets/Scénario/Édition)
/dashboard/projects/:id/chapter/:chapterId → Édition chapitre visuel (panels)
/dashboard/profile → Profil utilisateur
/dashboard/plans → Page pricing
* → NotFound
```

### Points d'attention

1. **Documentation vs Code** : Certains fichiers .md mentionnaient des fonctionnalités "à venir" qui sont en fait déjà implémentées (ex. Section Scénario complète, Édition de l'œuvre avec blocs)
2. **Tables manquantes dans certains docs** : `scenario_chapters`, `scenario_versions` étaient mentionnées mais pas toujours détaillées
3. **Edge Functions** : `generate-panel-image` était mentionnée mais pas toujours documentée dans les specs API
4. **Routes** : La route `/dashboard/projects/:id/chapter/:chapterId` (ChapterDetail) était mentionnée comme "placeholder" mais est complètement implémentée

### Actions de mise à jour

Tous les fichiers .md du dossier Produit ont été mis à jour pour refléter :
- L'état réel du code (février 2026)
- Les fonctionnalités réellement implémentées
- Les tables et relations de base de données réelles
- Les Edge Functions déployées
- Les routes et pages disponibles
- Le statut réel des phases (Phase 1 ✅, Phase 2 partiellement ✅)

Les éléments "à venir" ou "planifiés" ont été conservés pour les fonctionnalités non encore implémentées.

---

*Dernière mise à jour : 17 février 2026 (Audit complet, mise à jour de tous les fichiers .md selon le code réel)*
