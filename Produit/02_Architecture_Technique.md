# Architecture Technique — DreamWeave

> SPA JAMstack, backend Supabase serverless, intégration IA externe.

---

## 1. Vue d'ensemble

DreamWeave est une application web monopage (SPA) basée sur une architecture **JAMstack** avec un backend serverless Supabase et une intégration IA via API externe.

```
┌─────────────────────────────────────────────────────────────────┐
│                        UTILISATEUR                              │
│                    (Navigateur Web)                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (SPA)                              │
│  React 18 + TypeScript + Vite 7 + Tailwind CSS + shadcn/ui      │
│  Hébergé sur Vercel / Netlify                                   │ 
└──────────┬──────────────────────────────────┬───────────────────┘
           │ Supabase Client SDK              │
           ▼                                  ▼
┌─────────────────────┐         ┌─────────────────────────────────┐
│   SUPABASE PLATFORM │         │    SUPABASE EDGE FUNCTIONS      │
│                     │         │    (Deno Runtime)               │
│  ┌───────────────┐  │         │  ┌───────────────────────────┐  │
│  │  PostgreSQL   │  │         │  │  generate-asset-image     │  │
│  │  (Base de     │  │         │  │  - Build prompt système   │  │
│  │   données)    │  │         │  │  - Appel API FAL.ai       │  │
│  └───────────────┘  │         │  │  - Upload Storage         │  │
│  ┌───────────────┐  │         │  │  - Mise à jour BDD        │  │
│  │  Auth         │  │         │  └──────────────┬────────────┘  │
│  │  (Supabase    │  │         │  ┌───────────────────────────┐  │
│  │   Auth)       │  │         │  │  generate-scenario-ai    │  │
│  └───────────────┘  │         │  │  - IA Scénario/Chapitre   │  │
│  ┌───────────────┐  │         │  │  - Découpage panels      │  │
│  │  Storage      │  │         │  │  - Gemini Flash + fallback Groq  │  │
│  │  (Bucket      │  │         │  └──────────────┬────────────┘  │
│  │  dreamweave)  │  │         │  ┌───────────────────────────┐  │
│  └───────────────┘  │         │  │  generate-panel-image    │  │
│  ┌───────────────┐  │         │  │  - Génération par bloc   │  │
│  │  Row Level    │  │         │  │  - Dimensions personnalisées│  │
│  │  Security     │  │         │  │  - Appel API FAL.ai       │  │
│  └───────────────┘  │         │  └──────────────┬────────────┘  │
│                     │         └─────────────────┼───────────────┘
│                     │                           │
│  └───────────────┘  │                           ▼
│  ┌───────────────┐  │         ┌─────────────────────────────────┐
│  │  Storage      │  │         │       FAL.ai API             │
│  │  (Bucket      │  │         │  Tous tiers : FLUX.2 Pro       │
│  │  dreamweave)  │  │         │  + FLUX.2 Pro Edit (refs)       │
│  └───────────────┘  │         │  Format : PNG                     │
│  ┌───────────────┐  │         └─────────────────────────────────┘
│  │  Row Level    │  │
│  │  Security     │  │
│  └───────────────┘  │
└─────────────────────┘
```

---

## 2. Stack Technique Détaillée

### 2.1 Frontend

| Technologie | Version | Rôle |
|-------------|---------|------|
| **React** | 18.3.1 | Framework UI, composants réactifs |
| **TypeScript** | 5.8.3 | Typage statique, fiabilité du code |
| **Vite** | 7.3.1 | Build tool, HMR rapide, dev server |
| **Tailwind CSS** | 3.4.17 | Utility-first CSS, design système |
| **shadcn/ui** | — | Composants UI (Radix Primitives + Tailwind) — pas de package unique, composants Radix individuels |
| **Framer Motion** | 12.34.0 | Animations et transitions |
| **React Router DOM** | 6.30.1 | Routing côté client (SPA) |
| **TanStack React Query** | 5.83.0 | Cache serveur, mutations, invalidation (utilisé partout) |
| **Lucide React** | 0.462.0 | Icônes SVG |
| **React Hook Form** | 7.61.1 | Gestion de formulaires |
| **Zod** | 3.25.76 | Validation de schémas |
| **jszip** | 3.10.1 | Export ZIP chapitres complets |
| **html2canvas** | 1.4.1 | Export PNG panels/chapitres |
| **recharts** | 2.15.4 | Graphiques Dashboard (barre d'usage) |
| **sonner** | 1.7.4 | Notifications toast |
| **next-themes** | 0.3.0 | Thème clair/sombre avec persistance |
| **vitest** | 3.2.4 | Tests unitaires |
| **eslint** | 9.32.0 | Linting TypeScript/React |
| **husky** | 9.1.7 | Git hooks (lint-staged avant commit) |

### 2.2 Dépendances de développement (devDependencies — package.json)

| Package | Version | Rôle |
|---------|---------|------|
| **@vitejs/plugin-react-swc** | 3.11.0 | Build React avec SWC (Vite plugin) |
| **@testing-library/react** | 16.0.0 | Tests composants React |
| **@testing-library/jest-dom** | 6.6.0 | Assertions DOM dans les tests |
| **typescript-eslint** | 8.38.0 | ESLint rules TypeScript |
| **lovable-tagger** | 1.1.13 | Tagger Lovable (AI platform) |
| **lint-staged** | 16.4.0 | Linting fichiers stagés uniquement |
| **@tailwindcss/typography** | 0.5.16 | Plugin Tailwind pour le texte formaté |

### 2.3 Backend (Supabase)

| Service | Rôle |
|---------|------|
| **PostgreSQL** | Base de données relationnelle, JSONB, triggers |
| **Supabase Auth** | Authentification (email/password + OAuth Google) |
| **Supabase Storage** | Stockage d'images (bucket `dreamweave`, public) |
| **Edge Functions** | Fonctions serverless (Deno), logique métier côté serveur |
| **Row Level Security** | Isolation des données par utilisateur |
| **Realtime** | (Disponible, non encore utilisé) Temps réel WebSocket |

### 2.4 IA / Génération d'images

| Composant | Détail |
|-----------|--------|
| **Provider** | FAL.ai |
| **Modèle (tous les tiers)** | FLUX.2 Pro (text-to-image) — logique « Spotify », même modèle pour Libre/Créateur/Studio (décision 30/05/2026) |
| **Modèle + Refs** | FLUX.2 Pro Edit (multi-référence, utilisé dès qu'il y a des images de référence / sheets) |
| **API** | REST, URL response |
| **Format** | PNG |

### 2.5 Infrastructure & Déploiement

| Composant | Détail |
|-----------|--------|
| **Hébergement Frontend** | Vercel / Netlify (CDN mondial) |
| **Hébergement Backend** | Supabase Cloud (AWS) |
| **CDN Images** | Supabase Storage (CDN intégré) |
| **DNS** | Domaine personnalisable |
| **CI/CD** | GitHub Actions (`.github/workflows/ci.yml`) — lint + typecheck + tests + build sur push/PR |

### 2.6 Edge Functions — liste complète (supabase/functions/)

| Fonction | Rôle réel | Secrets utilisés |
|----------|-----------|-----------------|
| `generate-asset-image` | Génère image asset (FAL.ai FLUX.2 Pro), upload Storage, log usage | `FAL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `generate-panel-image` | Génère image case/bloc (dimensions personnalisées), FAL.ai | `FAL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `generate-scenario-ai` | Génère scénario/chapitre/découpage cases (Google Gemini Flash + fallback Groq Llama 3.3 70B) | `GEMINI_API_KEY`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `narramind-update` | Mémoire narrative : entités, résumés, détection anomalies (Gemini Flash + fallback Groq) | `GEMINI_API_KEY`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `narramind-compass` | NarraMind Compass : mode `index` (vectorise via Gemini text-embedding-004 → `project_embeddings`) + mode `propose` (recherche pgvector → Gemini Flash → `compass_proposals`) | `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `compose-chapter-layout` | Composition automatique du layout d'un chapitre : Gemini groupe les scènes (`panels_outline`), le serveur calcule la géométrie (compositions A-P) → `chapter_canvases.layout` | `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `generate-style-template-images` | Génère images de prévisualisation du style (FAL.ai) | `FAL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `generate-landing-showcase` | Génère images hero pour la landing page (FAL.ai) | `FAL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `create-checkout-session` | Crée une session Stripe Checkout (abonnement mensuel Créateur / Studio) | `STRIPE_SECRET_KEY`, `STRIPE_CREATEUR_PRICE_ID`, `STRIPE_STUDIO_PRICE_ID`, `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `create-portal-session` | Crée un lien Stripe Customer Portal (gestion abonnement) | `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `stripe-webhook` | Gère les événements Stripe (checkout.session.completed, customer.subscription.created/updated/deleted → update profiles.plan, plan déduit du Price ID) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CREATEUR_PRICE_ID`, `STRIPE_STUDIO_PRICE_ID`, `SUPABASE_SERVICE_ROLE_KEY` |
| `admin-set-plan` | Endpoint admin pour changer le plan de l'admin lui-même (test) | `SUPABASE_SERVICE_ROLE_KEY` |
| `admin-user-action` | Actions admin sur un utilisateur (reset_quota, delete_user, set_plan, toggle_excluded) | `SUPABASE_SERVICE_ROLE_KEY` |
| `admin-get-kpis` | Récupère les KPIs produit pour le dashboard admin | `SUPABASE_SERVICE_ROLE_KEY` |

### 2.7 Intégrations tierces — données réelles

| Intégration | Version / Endpoint | Rôle | Côté |
|-------------|-------------------|------|------|
| **FAL.ai** | FLUX.2 Pro (`fal-ai/flux-2-pro`), FLUX.2 Pro Edit (`fal-ai/flux-2-pro/edit`) | Génération d'images | Serveur (Edge Functions) |
| **Google Gemini Flash** | `gemini-2.5-flash` (scénario / compose-layout) + `gemini-2.0-flash` (NarraMind, Compass propose), via REST API | Génération scénario, NarraMind, Compass | Serveur |
| **Google Gemini Embeddings** | `text-embedding-004` (768 dimensions) | Vectorisation Compass (chapitres, lore) | Serveur |
| **Groq / Llama 3.3 70B** | Fallback scénario/NarraMind | Génération texte (fallback) | Serveur |
| **pgvector** | Extension PostgreSQL Supabase | Recherche vectorielle Compass (`project_embeddings`) | Serveur (BDD) |
| **Stripe** | SDK `npm:stripe@14` (apiVersion 2024-06-20) | Paiements, abonnements | Serveur |
| **Supabase JS** | `@supabase/supabase-js` ^2.95.3 | BDD, Auth, Storage | Client + Serveur |
| **Google OAuth 2.0** | Via Supabase Auth | Connexion Google | Client → Supabase |

### 2.8 Variables d'environnement — données réelles

#### Frontend (`.env` — voir `.env.example`)

| Variable | Exposition | Rôle |
|----------|-----------|------|
| `VITE_SUPABASE_URL` | Client (publique) | URL du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client (publique — clé anon) | Clé anon Supabase |
| `VITE_SUPABASE_PROJECT_ID` | Client (publique, optionnel) | Référence projet Supabase |
| `VITE_ADMIN_EMAIL` | Client (optionnel) | Email admin pour lien Stripe manuel |

#### Serveur (Supabase Edge Function Secrets — jamais dans le code)

| Variable | Rôle | Utilisé par |
|----------|------|------------|
| `FAL_API_KEY` | Clé API FAL.ai | generate-asset-image, generate-panel-image, generate-style-template-images, generate-landing-showcase |
| `GEMINI_API_KEY` | Clé API Google Gemini | generate-scenario-ai, narramind-update, narramind-compass, compose-chapter-layout |
| `GROQ_API_KEY` | Clé API Groq (fallback) | generate-scenario-ai, narramind-update |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe | create-checkout-session, create-portal-session, stripe-webhook |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature webhook Stripe | stripe-webhook |
| `STRIPE_CREATEUR_PRICE_ID` | ID du prix Stripe (abonnement Créateur 12,99 €/mois) | create-checkout-session, stripe-webhook |
| `STRIPE_STUDIO_PRICE_ID` | ID du prix Stripe (abonnement Studio 29,99 €/mois) | create-checkout-session, stripe-webhook |
| `APP_URL` | URL de l'application (redirect Stripe) | create-checkout-session |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service Supabase (bypass RLS) | Toutes les Edge Functions |
| `SUPABASE_URL` | URL Supabase interne (Deno) | Toutes les Edge Functions |
| `SUPABASE_ANON_KEY` | Clé anon Supabase (Deno) | Certaines Edge Functions |
| `ALLOWED_ORIGIN` | Domaine autorisé CORS | Toutes les Edge Functions |

---

## 3. Architecture Frontend

### 3.1 Structure des fichiers

```
src/
├── main.tsx                          # Point d'entrée, initialisation thème
├── App.tsx                           # Routes, providers (Auth, Query, Toast)
├── index.css                         # Variables CSS, Tailwind, utilitaires
│
├── integrations/
│   └── supabase/
│       ├── client.ts                 # Instance Supabase (singleton)
│       └── types.ts                  # Types générés depuis la BDD
│
├── lib/
│   └── utils.ts                      # cn() utilitaire classnames
│
├── types/
│   └── index.ts                      # Types partagés, enums, TierConfig
│
├── services/
│   ├── projects.ts                   # CRUD projets (Supabase)
│   ├── assets.ts                     # CRUD assets + appel Edge Function
│   ├── chapters.ts                   # CRUD chapitres visuels
│   ├── panels.ts                     # CRUD panels + génération par bloc
│   ├── scenarioChapters.ts           # CRUD chapitres de scénario
│   ├── scenarioAI.ts                # Appels Edge Function IA Scénario/Chapitre
│   └── storage.ts                    # Upload/delete images Storage
│
├── hooks/
│   ├── useAuth.tsx                   # AuthProvider + useAuth hook
│   ├── useProjects.ts               # React Query hooks projets
│   ├── useAssets.ts                  # React Query hooks assets
│   ├── useChapters.ts                # React Query hooks chapitres visuels
│   ├── usePanels.ts                  # React Query hooks panels
│   ├── useScenarioChapters.ts        # React Query hooks chapitres de scénario
│   ├── useScenarioAI.ts             # Hook IA Scénario/Chapitre
│   ├── useAssetGeneration.ts        # Logique génération images assets
│   ├── useUserPlan.ts               # Plan utilisateur + usage mensuel
│   ├── useTheme.tsx                  # Thème clair/sombre
│   └── use-toast.ts                  # Notifications toast
│
├── components/
│   ├── DashboardLayout.tsx           # Layout dashboard (header + nav + badge tier)
│   ├── ProtectedRoute.tsx            # Route gardée (auth required)
│   ├── ThemeToggle.tsx               # Bouton thème
│   ├── project/
│   │   ├── AssetLibrary.tsx          # Bibliothèque d'assets (onglets, CRUD, dialog édition, confirmations)
│   │   ├── AssetCard.tsx             # Carte d'asset (actions hover : modifier, régénérer, supprimer)
│   │   ├── StyleManager.tsx          # Gestion style (texte + images de référence)
│   │   ├── ScenarioSection.tsx       # Section Scénario (IA Scénario/Chapitre, chapitres texte)
│   │   ├── EditionSection.tsx        # Section Édition de l'œuvre (chapitres visuels)
│   │   ├── ScenarioTextHighlighter.tsx # Surbrillance assets + détection éléments non créés
│   │   ├── CharacterViewDialog.tsx   # Dialog fiche personnage (4 angles, Sheet System)
│   │   ├── AIChapterPreviewModal.tsx # Aperçu chapitre généré par l'IA avant insertion
│   │   ├── ScenarioFormattedPreview.tsx # Rendu mis en forme du scénario
│   │   ├── UniverseSection.tsx       # Univers : cartographie + Ariane (amélioration continue)
│   │   └── LoreGraphView.tsx         # Univers : graphe de connexions (cartographie du monde)
│   └── ui/                           # 22 composants shadcn/ui (restylés)
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── ImageWithFallback.tsx      # Image avec retry + fallback
│       └── ...
│
└── pages/
    ├── Landing.tsx                    # Page marketing
    ├── Auth.tsx                       # Inscription / Connexion
    ├── EmailVerification.tsx          # Vérification d'email post-inscription
    ├── ResetPassword.tsx              # Réinitialisation de mot de passe
    ├── Dashboard.tsx                  # Tableau de bord (stats, usage, projets récents)
    ├── Projects.tsx                   # Liste des projets (recherche, CRUD)
    ├── ProjectDetail.tsx             # Détail projet (onglets Style / Assets / Univers / Scénario / Édition)
    ├── ScenarioChapterEditor.tsx     # Éditeur de chapitre de scénario (prose, fil d'Ariane)
    ├── ChapterDetail.tsx             # Édition chapitre visuel (canvas blocs / couleur / bulles)
    ├── Profile.tsx                   # Profil utilisateur
    ├── Plans.tsx                     # Comparaison des plans Libre / Créateur / Studio
    ├── Pilotage.tsx                  # Dashboard admin (KPIs produit, gestion plans)
    └── NotFound.tsx                  # Page 404
```

### 3.2 Arbre de composants

```
<App>
  <QueryClientProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          ├── "/" → <Landing />
          ├── "/auth" → <Auth />
          ├── "/auth/verify-email" → <EmailVerification />
          ├── "/auth/reset-password" → <ResetPassword />
          ├── "/dashboard" → <ProtectedRoute> → <Dashboard />
          ├── "/dashboard/projects" → <ProtectedRoute> → <Projects />
          ├── "/dashboard/projects/:id" → <ProtectedRoute> → <ProjectDetail />
          ├── "/dashboard/projects/:id/scenario/:chapterId" → <ProtectedRoute> → <ScenarioChapterEditor />
          ├── "/dashboard/projects/:id/chapter/:chapterId" → <ProtectedRoute> → <ChapterDetail />
          ├── "/dashboard/profile" → <ProtectedRoute> → <Profile />
          ├── "/dashboard/plans" → <ProtectedRoute> → <Plans />
          ├── "/dashboard/pilotage" → <ProtectedRoute> → <Pilotage />
          └── "*" → <NotFound />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  </QueryClientProvider>
</App>
```

### 3.3 Gestion d'état

```
┌─────────────────────────────────────────────┐
│              État Global                    │
│                                             │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ AuthContext │  │ ThemeContext         │  │
│  │ - user      │  │ - theme (light/dark) │  │
│  │ - session   │  │ - toggleTheme()      │  │
│  │ - loading   │  │ (localStorage)       │  │
│  │ - signIn()  │  └──────────────────────┘  │
│  │ - signUp()  │                            │
│  │ - signOut() │                            │
│  └─────────────┘                            │
│                                             │
│              TanStack React Query           │
│  ┌─────────────────────────────────────┐    │
│  │ Cache serveur intelligent :         │    │
│  │ - useProjects(), useAssets()        │    │
│  │ - Mutations avec invalidation auto  │    │
│  │ - staleTime, retry, enabled         │    │
│  │ - Service layer → supabase.from()   │    │
│  └─────────────────────────────────────┘    │
│              État Local (useState)          │
│  ┌─────────────────────────────────────┐    │
│  │ - UI (dialogs, loading, forms)      │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### 3.4 Thème et Design System

**Tokens personnalisés** :
- `lavender` : Couleur primaire
- `peach` : Accent chaud
- `mint` : Accent frais
- `rose` : Accent romantique
- `cream` : Fond clair

**Utilitaires CSS** :
- `glass` : Effet glassmorphism (backdrop-blur)
- `gradient-dream` : Gradient personnalisé
- `gradient-primary` : Gradient primaire
- `shadow-dream` : Ombre douce
- `shadow-glow` : Lueur

**Polices** :
- `Quicksand` : Titres (display)
- `Nunito` : Corps de texte (body)

---

## 4. Architecture Backend

### 4.1 Base de données PostgreSQL

#### Schéma relationnel

```
┌──────────────┐       ┌──────────────────┐
│   profiles   │       │     projects     │
├──────────────┤       ├──────────────────┤
│ id (PK, FK)  │       │ id (PK, UUID)    │
│ display_name │       │ user_id (FK)     │
│ avatar_url   │  1──N │ title            │
│ plan (libre/ │◄──────│ description      │
│ createur/    │       │ style_template   │
│ studio)      │       │ style_image_urls │
│ created_at   │       │                  │
│ updated_at   │       │                  │
└──────────────┘       │                  │
                       │ cover_url        │
                       │ created_at       │
                       │ updated_at       │
                       └────────┬─────────┘
                                │
                    ┌───────────┼───────────┐
                    │ 1──N      │ 1──N      │
                    ▼           ▼           │
          ┌──────────────┐ ┌──────────┐     │
          │    assets    │ │ chapters │     │
          ├──────────────┤ ├──────────┤     │
          │ id (PK)      │ │ id (PK)  │     │
          │ user_id (FK) │ │ user_id  │     │
          │ project_id   │ │ project_id│    │
          │ name         │ │ title    │     │
          │ asset_type   │ │ synopsis │     │
          │ prompt       │ │ chapter_ │     │
          │ image_url    │ │  number  │     │
          │ image_url_   │ │ created_ │     │
          │  profile_left│ │  at      │     │
          │ image_url_   │ │ updated_ │     │
          │  profile_    │ │  at      │     │
          │  right       │ └─────┬────┘     │
          │ image_url_   │       │          │
          │  back        │       │ 1──N     │
          │ metadata     │       ▼          │
          │ created_at   │ ┌──────────┐     │
          └──────────────┘ │  canvas  │     │  (chapter_canvases)
                           ├──────────┤     │
                           │ id (PK)  │     │
                           │ user_id  │     │
                           │ chapter_ │     │
                           │  id (FK) │     │
                           │ layout   │     │
                           │ (JSONB:  │     │
                           │  blocks) │     │
                           │ speech_  │     │
                           │  bubbles │     │
                           │ color_   │     │
                           │  blocks  │     │
                           │ backgrd_ │     │
                           │  style   │     │
                           │ → 1 ligne│     │
                           │ /chapitre│     │
                           └──────────┘     │
       (l'historique d'images est une table à part :              │
        chapter_canvas_image_history)                             │
```

#### Tables réelles (source de vérité : supabase/migrations/)

| Table | Colonnes clés réelles | Migration source |
|-------|----------------------|-----------------|
| `profiles` | id, user_id, display_name, avatar_url, plan ('libre'/'createur'/'studio'), email, stripe_customer_id, billing_period_start | 20260209, 20260213, 20260417, 20260418, 20260503 |
| `projects` | id, user_id, title, description, style_template, style_image_urls (JSONB), cover_url, narra_summary | 20260209, 20260430 |
| `assets` | id, user_id, project_id, name, asset_type (ENUM), prompt, image_url, image_url_profile_left, image_url_profile_right, image_url_back, image_url_sheet, lore | 20260209, 20260416, 20260423 |
| `scenario_chapters` | id, project_id, chapter_number, title, content, panels_outline (JSONB), narramind_anomalies (JSONB), narramind_checked_at | 20260214, 20260418, 20260430 |
| `chapter_canvases` | id, user_id, chapter_id, panel_number, prompt, image_url, layout (JSONB), speech_bubbles (JSONB), color_blocks (JSONB), background_style (JSONB) — 1 ligne/chapitre | 20260215, 20260218, 20260221, 20260424, 20260627 |
| `chapter_canvas_image_history` | id, user_id, chapter_id, panel_canvas_id, event_kind, source_block_id, prompt, image_url, block_name, layout_rect (JSONB) | 20260502 |
| `usage` | id, user_id, action ('image_generation'), created_at | 20260213 |
| `memory_entities` | id, project_id, user_id, asset_id, name, entity_type, traits (JSONB), relations (JSONB), lore_summary, last_seen_chapter | 20260423 |
| `memory_summaries` | id, project_id, user_id, chapter_id, chapter_number, summary, token_estimate | 20260423 |
| `narramind_alerts` | id, project_id, user_id, chapter_id, severity, title, explanation, anchor (JSONB), status, dedupe_key | 20260430 |
| `scenario_versions` | Versions des scénarios (accepter/rejeter) | 20260214 |
| `narramind_metrics` | Métriques de la mémoire narrative / Compass (tokens, fragments, similarité) | 20260423, 20260610 |
| `narramind_missing_assets` | Assets mentionnés dans le scénario mais non créés (suggestions) | 20260503 |
| `lore_nodes` / `lore_edges` | Cartographie de l'univers narratif (graphe lore : noeuds + arêtes) | 20260522, 20260523, 20260524 |
| `project_embeddings` | Index vectoriel Compass : `source_type`, `source_id`, `section_key`, `embedding vector(768)` | 20260522 |
| `compass_proposals` | Propositions Compass : `proposal_type`, `origin` ('extracted'/'generated'), `title`, `content`, `status`, `dedupe_key` | 20260522, 20260524, 20260610 |

> **Note de migration clé** : La table `panels` a été renommée en `chapter_canvases` (migration 20260424). Le doc antérieur à cette date peut encore mentionner `panels`.
>
> **NarraMind Compass (infra vectorielle, mai 2026)** : extension `pgvector` activée (migration 20260522), fonction SQL `match_embeddings` pour la recherche par similarité, vectorisation via Gemini `text-embedding-004` (768D). Les tables `project_embeddings` + `compass_proposals` alimentent l'Edge Function `narramind-compass`.

> ⚠️ Le schéma ne se résume plus à « 10 tables » : l'ensemble des tables couvre profiles, projects, assets, chapters, chapter_canvases, scenario_chapters/versions, usage, la mémoire narrative (memory_entities/summaries, narramind_alerts/metrics), le lore et l'infra vectorielle Compass.

#### Enum

```sql
CREATE TYPE asset_type AS ENUM ('character', 'background', 'object');
```

#### Row Level Security (RLS)

Toutes les tables ont RLS activé. Chaque utilisateur ne peut accéder qu'à ses propres données :
```sql
-- Exemple pour projects
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);
```

#### Triggers

```sql
-- Création automatique du profil à l'inscription
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Mise à jour automatique de updated_at
CREATE TRIGGER update_profiles_updated_at ...
CREATE TRIGGER update_projects_updated_at ...
CREATE TRIGGER update_chapters_updated_at ...
```

### 4.2 Authentification

```
┌──────────────────────────────────┐
│        Supabase Auth             │
│                                  │
│  ┌────────────────────────────┐  │
│  │  Email / Password          │  │
│  │  - Inscription             │  │
│  │  - Connexion               │  │
│  │  - Sessions JWT            │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │  OAuth 2.0 — Google        │  │
│  │  - Connexion rapide        │  │
│  │  - Callback Supabase       │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │  Gestion de session        │  │
│  │  - JWT tokens              │  │
│  │  - Refresh automatique     │  │
│  │  - onAuthStateChange       │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### 4.3 Storage

```
Bucket : dreamweave (public)
│
├── {user_id}/
│   ├── assets/
│   │   ├── {asset_id}.png                 ← face de l'asset
│   │   └── {asset_id}_sheet.png           ← fiche composite 4 angles (Sheet System)
│   └── projects/
│       └── {project_id}/
│           ├── style/
│           │   └── {uuid}.png             ← images de référence de style
│           └── panels/
│               └── {panel_id}/
│                   └── blocks/
│                       └── {block_id}.png ← 1 image par bloc du canvas
```

> **Note** : la sheet composite 4 angles d'un personnage est stockée avec l'asset et référencée par `assets.image_url_sheet` ; elle est réinjectée comme `image_urls` dans `generate-panel-image` pour la cohérence identitaire.

**Politiques de sécurité Storage** :
- Upload : limité au dossier de l'utilisateur authentifié
- Lecture : public (images accessibles via URL)
- Suppression : limité au propriétaire

---

## 5. Architecture IA — Génération d'images

### 5.1 Edge Function : `generate-asset-image`

```
┌─────────────────────────────────────────────────────────────────┐
│                    Edge Function Flow                           │
│                                                                 │
│  1. Requête HTTP POST                                           │
│     ├── Headers: Authorization (JWT)                            │
│     └── Body: { asset_id, prompt, asset_type }                  │
│        (le style est lu en BDD : projects.style_template +      │
│         style_image_urls, jamais transmis dans le body)         │
│                                                                 │
│  2. Vérification                                                │
│     ├── FAL_API_KEY existe ?                                 │
│     ├── JWT valide ? → Extraction user_id                       │
│     └── L'asset appartient à l'utilisateur ?                    │
│                                                                 │
│  3. Construction du prompt                                      │
│     ├── Prompt système selon asset_type :                       │
│     │   ├── characters.ts → buildCharacterPrompt() + sheet      │
│     │   ├── backgrounds.ts → buildBackgroundPrompt()            │
│     │   └── objects.ts → buildObjectPrompt()                    │
│     ├── + Style texte du projet (lu en BDD)                     │
│     ├── + URLs images de référence (lu en BDD)                  │
│     └── + Sheet System : face puis fiche composite 4 angles     │
│                                                                 │
│  3b. Vérification tier & quotas                                  │
│     ├── Lecture du plan utilisateur (profiles.plan)               │
│     ├── Comptage usage mensuel (table usage)                      │
│     └── Rejet si quota dépassé (HTTP 429)                         │
│                                                                 │
│  4. Appel API FAL.ai (FLUX.2 Pro pour tous les tiers)           │
│     ├── Sans référence → FLUX.2 Pro (text-to-image)             │
│     ├── Avec refs/sheet → FLUX.2 Pro Edit (multi-référence)     │
│     └── Réponse : URL de l'image                                 │
│                                                                 │
│  5. Post-traitement                                             │
│     ├── Téléchargement image depuis FAL.ai                      │
│     ├── Upload vers Supabase Storage (cache-buster ?v=ts)       │
│     └── Obtention URL publique                                  │
│                                                                 │
│  6. Mise à jour BDD                                             │
│     ├── UPDATE assets SET image_url (face) + image_url_sheet    │
│     │   (image_url_profile_left/right/back remis à null, legacy)│
│     └── Crédit réservé atomiquement avant FAL (refund si échec) │
│                                                                 │
│  7. Réponse                                                      │
│     └── { image_url, image_url_sheet, model, plan }             │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Système de prompts

#### Structure du prompt final

```
[PROMPT SYSTÈME (selon asset_type)]
  ├── Instructions de style webtoon
  ├── Contraintes de composition
  └── Instructions spécifiques au type

[STYLE TEXTE DU PROJET]
  └── Template de style défini par l'utilisateur

[IMAGES DE RÉFÉRENCE]
  └── URLs des images de référence à analyser

[INSTRUCTIONS DE VUE]
  └── Instructions spécifiques (face/profil/dos)

[PROMPT UTILISATEUR]
  └── Description de l'asset par l'utilisateur
```

#### Prompts par type

| Type | Fichier | Focus |
|------|---------|-------|
| **Personnages** | `characters.ts` | Full-body, cohérence visuelle, vues multiples |
| **Décors** | `backgrounds.ts` | Format vertical, profondeur, ambiance, pas de personnages |
| **Objets** | `objects.ts` | Objet isolé, fond transparent, proportions |

---

## 6. Flux de données

### 6.1 Création d'un asset avec génération IA

```
Utilisateur                Frontend                    Supabase BDD              Edge Function           FAL.ai API          Storage
    │                         │                            │                         │                      │                  │
    │ 1. Remplit formulaire   │                            │                         │                      │                  │
    │ (type, nom, prompt)     │                            │                         │                      │                  │
    ├────────────────────────►│                            │                         │                      │                  │
    │                         │ 2. INSERT asset            │                         │                      │                  │
    │                         │ (image_url = null)         │                         │                      │                  │
    │                         ├───────────────────────────►│                         │                      │                  │
    │                         │                            │ 3. OK (asset_id)        │                      │                  │
    │                         │◄───────────────────────────┤                         │                      │                  │
    │                         │                            │                         │                      │                  │
    │                         │ 4. POST /generate-asset-image                       │                      │                  │
    │                         │ {asset_id, prompt, asset_type}                      │                      │                  │
    │                         ├────────────────────────────────────────────────────►│                      │                  │
    │                         │                            │                         │ 5. POST /generate    │                  │
    │                         │                            │                         │ {prompt enrichi}     │                  │
    │                         │                            │                         ├─────────────────────►│                  │
    │                         │                            │                         │                      │ 6. URL image     │
    │                         │                            │                         │◄─────────────────────┤                  │
    │                         │                            │                         │                      │                  │
    │                         │                            │                         │ 7. Upload image      │                  │
    │                         │                            │                         ├──────────────────────────────────────►│
    │                         │                            │                         │                      │    8. URL pub    │
    │                         │                            │                         │◄─────────────────────────────────────┤
    │                         │                            │                         │                      │                  │
    │                         │                            │ 9. UPDATE asset         │                      │                  │
    │                         │                            │  SET image_url = URL    │                      │                  │
    │                         │                            │◄────────────────────────┤                      │                  │
    │                         │                            │                         │                      │                  │
    │                         │ 10. Réponse {success, image_url}                    │                      │                  │
    │                         │◄────────────────────────────────────────────────────┤                      │                  │
    │                         │                            │                         │                      │                  │
    │ 11. Affichage image     │                            │                         │                      │                  │
    │◄────────────────────────┤                            │                         │                      │                  │
```

### 6.2 Authentification

```
Utilisateur                Frontend                    Supabase Auth
    │                         │                            │
    │ Email + Password        │                            │
    ├────────────────────────►│                            │
    │                         │ signUp() / signIn()        │
    │                         ├───────────────────────────►│
    │                         │                            │ Création/vérif user
    │                         │                            │ Génération JWT
    │                         │ Session + JWT              │
    │                         │◄───────────────────────────┤
    │                         │                            │
    │                         │ onAuthStateChange()        │
    │                         │ → AuthContext mise à jour   │
    │                         │                            │
    │ Redirect → /dashboard   │                            │
    │◄────────────────────────┤                            │
```

---

### 6.3 Communication entre features (source de vérité)

Les features ne s'appellent pas directement entre elles : elles communiquent par **trois canaux** — (1) des **tables Postgres partagées**, (2) des **Edge Functions**, (3) l'**invalidation du cache React Query** (une mutation invalide les `queryKey` concernées, ce qui rafraîchit les vues dépendantes).

#### Pipeline principal de création

```
 STYLE ──────► ASSETS ──────► SCÉNARIO ──────► ÉDITION ──────► EXPORT
   │             │               │                │              │
projects.      assets.*      scenario_         chapter_       PNG (client,
style_template image_url_    chapters.         canvases.      html2canvas)
style_image_   sheet         content /         layout /
urls                         panels_outline    speech_bubbles
   │             │               │                │
   └─ injecté ───┴── injecté ────┴── découpage ───┘
      dans chaque génération        + composition
```

1. **Style → Assets / Édition** : `projects.style_template` (+ `style_image_urls`) est **lu par `generate-asset-image` et `generate-panel-image`** et préfixé à chaque prompt. Aucune génération n'ignore le style du projet.
2. **Assets → Édition** : la **sheet** d'un personnage (`assets.image_url_sheet`) est passée comme `block_asset_image_urls` à `generate-panel-image` (FLUX.2 Pro Edit multi-référence) → cohérence identitaire entre cases.
3. **Scénario → Assets** : `ScenarioTextHighlighter` détecte les noms d'assets dans `scenario_chapters.content` (existants = surbrillance, manquants = panneau ambre) ; « créer depuis le scénario » pré-remplit le dialog de création dans l'onglet Assets.
4. **Scénario → Édition (Mode Auto)** : `generate-scenario-ai` mode `detect_blocks` produit le découpage écrit dans `scenario_chapters.panels_outline` → `compose-chapter-layout` (Gemini 2.5-flash) compose la mise en page → `chapter_canvases.layout` → l'éditeur génère l'image de chaque bloc via `generate-panel-image`.
5. **Édition → Export** : l'export PNG est **100 % client** (html2canvas) — il lit le canvas rendu (`chapter_canvases.layout` + `speech_bubbles` + `color_blocks`), aucune Edge Function.

#### Services transverses (greffés sur le pipeline)

| Système | Déclencheur | Edge Function | Lit | Écrit | Restitué à l'utilisateur via |
|---|---|---|---|---|---|
| **NarraMind** (mémoire) | Auto-save d'un chapitre de scénario (≥ 80 mots, debounce 5 min) | `narramind-update` | `scenario_chapters`, `memory_entities`, `memory_summaries` | `memory_entities`, `memory_summaries`, `narramind_alerts`, `narramind_missing_assets`, `projects.narra_summary` | Fil d'Ariane (alertes de continuité) |
| **Compass** (RAG) | Indexation après sauvegarde ; demande de propositions | `narramind-compass` (`index` / `propose`) | `scenario_chapters`, `projects.lore_*` (sections lore), `project_embeddings` (pgvector) | `project_embeddings`, `compass_proposals`, `narramind_metrics` | Onglet Univers (propositions Ariane) |
| **Univers / Lore** | Édition manuelle du graphe ; acceptation d'une proposition Compass | — (PostgREST direct) | `lore_nodes`, `lore_edges` | `lore_nodes`, `lore_edges` | Graphe `@xyflow/react` |
| **Plans / Quota** | Génération d'image ; passage à un plan payant | `stripe-webhook` (plan), Edge de génération (quota) | `profiles.plan`, `usage` | `usage` (log), `profiles.plan` (webhook only) | `useUserPlan` → garde `canGenerate()` |
| **Ariane** | Présente dans tout le workflow | via les EF ci-dessus | — | — | Bulle flottante, onboarding, panneau continuité |

#### Règle d'or des invariants de communication

- **`profiles.plan`** n'est modifiable **que** par `stripe-webhook` (service_role) — jamais par le client (RLS). `useUserPlan` ne fait que **lire** le plan + compter `usage`.
- Le **style** transite toujours par `projects.style_template` en BDD, jamais depuis un brouillon local.
- Le **prompt d'image** d'une case = `style_template` + assets sélectionnés + description du bloc — **jamais** le scénario brut.
- `chapter_canvases` = **une seule ligne par chapitre** (le canvas entier en scroll vertical), pas une ligne par case.

---

## 7. Sécurité

### 7.1 Couches de sécurité

| Couche | Mécanisme | Protection |
|--------|-----------|-----------|
| **Transport** | HTTPS/TLS | Chiffrement en transit |
| **Authentification** | JWT Supabase Auth | Identité vérifiée |
| **Autorisation** | Row Level Security (RLS) | Isolation données utilisateur |
| **API** | CORS + JWT verification | Protection Edge Functions |
| **Storage** | Politiques par utilisateur | Accès fichiers contrôlé |
| **Secrets** | Variables d'environnement Supabase | Clés API côté serveur uniquement |

### 7.2 Variables sensibles

| Variable | Localisation | Accès |
|----------|-------------|-------|
| `FAL_API_KEY` | Supabase Edge Function Secrets | Serveur uniquement |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function Secrets | Serveur uniquement |
| `VITE_SUPABASE_URL` | `.env` frontend | Client (public) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` frontend | Client (public, clé anon) |

---

## 8. Performance et Scalabilité

### 8.1 Performances actuelles

| Métrique | Valeur | Cible |
|----------|--------|-------|
| Time to First Byte (TTFB) | < 200ms | < 100ms |
| Largest Contentful Paint (LCP) | < 2.5s | < 1.5s |
| Time to Interactive (TTI) | < 3s | < 2s |
| Génération IA (1 image) | 5-15s | < 10s |

### 8.2 Stratégies de scalabilité

| Composant | Stratégie |
|-----------|-----------|
| **Frontend** | CDN mondial (Vercel/Netlify), code splitting, lazy loading |
| **Base de données** | Index PostgreSQL, connection pooling (Supavisor) |
| **Edge Functions** | Auto-scaling Supabase, cold start < 500ms |
| **Storage** | CDN Supabase, cache navigateur |
| **IA** | Queue de génération, limitation de débit, cache de prompts similaires |

### 8.3 Limites connues

| Limite | Impact | Solution future |
|--------|--------|----------------|
| Résolution bornée (face 1280×1024, sheet 2560×768, blocs ≤ 1440px) | Qualité limitée | Upscaling post-génération |
| Pas de queue de génération | Timeout possible | Worker queue (Bull/Redis) |
| Pas de cache IA | Regénération systématique | Hash prompt → cache résultat |
| Pas de CDN images dédié | Latence variable | Cloudflare Images / imgix |

---

## 9. Monitoring et Observabilité

### 9.1 Actuellement disponible

| Outil | Usage |
|-------|-------|
| Supabase Dashboard | Métriques BDD, Auth, Storage |
| Edge Function Logs | Logs de génération IA |
| Console navigateur | Logs frontend de debug |

### 9.2 À implémenter

| Outil | Usage | Priorité |
|-------|-------|----------|
| **Sentry** | Error tracking frontend + backend | P0 |
| **PostHog / Mixpanel** | Analytics produit, funnels | P0 |
| **Supabase Realtime Logs** | Monitoring temps réel | P1 |
| **Grafana** | Dashboards de performance | P2 |
| **Uptime monitoring** | Alertes de disponibilité | P1 |

---

## 10. Environnements

| Environnement | Frontend | Backend | Utilisation |
|---------------|----------|---------|-------------|
| **Local (dev)** | `localhost:8080` | Supabase Cloud (dev project) | Développement |
| **Staging** | staging.dreamweave.app | Supabase Cloud (staging project) | Tests & QA |
| **Production** | dreamweave.app | Supabase Cloud (prod project) | Utilisateurs |

### Variables d'environnement par environnement

```
# .env.local (développement)
VITE_SUPABASE_PROJECT_ID="dev-project-id"
VITE_SUPABASE_URL="https://dev-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."

# .env.staging
VITE_SUPABASE_PROJECT_ID="staging-project-id"
VITE_SUPABASE_URL="https://staging-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."

# .env.production
VITE_SUPABASE_PROJECT_ID="prod-project-id"
VITE_SUPABASE_URL="https://prod-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."
```

---

## 11. Diagramme de déploiement

```
┌──────────────────────────────────────────────────────────────┐
│                        Internet                               │
└──────────┬──────────────────────┬────────────────────────────┘
           │                      │
           ▼                      ▼
┌─────────────────┐    ┌─────────────────────────────┐
│  CDN (Vercel /  │    │    Supabase Cloud (AWS)     │
│  Netlify)       │    │                             │
│                 │    │  ┌───────────────────────┐  │
│  React SPA      │    │  │  API Gateway          │  │
│  (HTML/JS/CSS)  │    │  │  (PostgREST + GoTrue) │  │
│                 │    │  └───────────────────────┘  │
│  Assets statiques│   │                             │
│  (images, fonts)│    │  ┌───────────────────────┐  │
│                 │    │  │  PostgreSQL (managed)  │  │
└─────────────────┘    │  └───────────────────────┘  │
                       │                             │
                       │  ┌───────────────────────┐  │
                       │  │  Edge Functions (Deno) │  │
                       │  └──────────┬────────────┘  │
                       │             │               │
                       │  ┌───────────────────────┐  │
                       │  │  Storage (S3-compat)   │  │
                       │  └───────────────────────┘  │
                       └──────────────┬──────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │     FAL.ai API            │
                       │     (External)               │
                       └──────────────────────────────┘
```

---

*Dernière mise à jour : 28 juin 2026 (audit vérité 3) — secrets `compose-chapter-layout` (GEMINI_API_KEY) + `create-checkout-session` / `stripe-webhook` (STRIPE_CREATEUR_PRICE_ID / STRIPE_STUDIO_PRICE_ID, plus STRIPE_PRO_PRICE_ID), Stripe via SDK `npm:stripe@14`, modèles Gemini précisés (2.5-flash scénario / 2.0-flash NarraMind+Compass), body réel `generate-asset-image` = {asset_id, prompt, asset_type} (style lu en BDD, Sheet System), arbre Storage assets corrigé ({user_id}/assets/{asset_id}.png + _sheet), tables corrigées (narramind_alerts colonnes réelles, chapter_canvas_image_history table séparée, word_mappings/chapter_assets = colonnes non tables, lore_edges ajouté), suppression refs fichiers supprimés (NavLink, LoreFriseView, use-mobile, date-fns), ui = 22 composants, admin-set-plan = plan de l'admin lui-même, mode découpage = detect_blocks (pas « panels »). Précédente (13 juin, audit vérité 2) — ajout §6.3 « Communication entre features » (pipeline Style→Assets→Scénario→Édition→Export, services transverses NarraMind/Compass/Univers/Plans, invariants), ERD `panels` → `chapter_canvases` (1 ligne/chapitre, layout JSONB), arbre Storage corrigé (panels/{panel_id}/blocks/{block_id}.png + note sheet), `compose-chapter-layout` = Gemini 2.5-flash. Précédente (7 juin) : FLUX.2 Pro tous tiers, 14 Edge Functions, infra Compass (pgvector, text-embedding-004 768D), plans Libre/Créateur/Studio, arbre pages/routes synchronisé.*
