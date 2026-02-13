# Architecture Technique — DreamWeave

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
│  Hébergé sur Vercel / Netlify / Lovable                         │ 
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
│  │  (Supabase    │  │         └─────────────────┼───────────────┘
│  │   Auth)       │  │                           │
│  └───────────────┘  │                           ▼
│  ┌───────────────┐  │         ┌─────────────────────────────────┐
│  │  Storage      │  │         │       FAL.ai API             │
│  │  (Bucket      │  │         │  Free : FLUX.1 Schnell         │
│  │  dreamweave)  │  │         │  Pro : FLUX.2 Pro / Pro Edit    │
│  └───────────────┘  │         │  Format : 1024×1024 PNG           │
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
| **React** | 18.x | Framework UI, composants réactifs |
| **TypeScript** | 5.x | Typage statique, fiabilité du code |
| **Vite** | 7.x | Build tool, HMR rapide, dev server |
| **Tailwind CSS** | 3.x | Utility-first CSS, design système |
| **shadcn/ui** | latest | Composants UI (Radix Primitives + Tailwind) |
| **Framer Motion** | latest | Animations et transitions |
| **React Router** | 6.x | Routing côté client (SPA) |
| **TanStack Query** | 5.x | Cache serveur, mutations, invalidation (utilisé partout) |
| **Lucide React** | latest | Icônes SVG |
| **React Hook Form** | latest | Gestion de formulaires |
| **Zod** | latest | Validation de schémas |
| **date-fns** | latest | Manipulation de dates |

### 2.2 Backend (Supabase)

| Service | Rôle |
|---------|------|
| **PostgreSQL** | Base de données relationnelle, JSONB, triggers |
| **Supabase Auth** | Authentification (email/password + OAuth Google) |
| **Supabase Storage** | Stockage d'images (bucket `dreamweave`, public) |
| **Edge Functions** | Fonctions serverless (Deno), logique métier côté serveur |
| **Row Level Security** | Isolation des données par utilisateur |
| **Realtime** | (Disponible, non encore utilisé) Temps réel WebSocket |

### 2.3 IA / Génération d'images

| Composant | Détail |
|-----------|--------|
| **Provider** | FAL.ai |
| **Modèle Free** | FLUX.1 Schnell (text-to-image, rapide, ~$0.003/image) |
| **Modèle Pro** | FLUX.2 Pro (text-to-image, ~$0.03/image) |
| **Modèle Pro + Refs** | FLUX.2 Pro Edit (multi-référence, ~$0.09/image avec 2 refs) |
| **API** | REST, URL response |
| **Résolution** | 1024×1024 pixels |
| **Format** | PNG |

### 2.4 Infrastructure & Déploiement

| Composant | Détail |
|-----------|--------|
| **Hébergement Frontend** | Lovable / Vercel / Netlify (CDN mondial) |
| **Hébergement Backend** | Supabase Cloud (AWS) |
| **CDN Images** | Supabase Storage (CDN intégré) |
| **DNS** | Domaine personnalisable |
| **CI/CD** | Git push → déploiement automatique |

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
│   └── storage.ts                    # Upload/delete images Storage
│
├── hooks/
│   ├── useAuth.tsx                   # AuthProvider + useAuth hook
│   ├── useProjects.ts               # React Query hooks projets
│   ├── useAssets.ts                  # React Query hooks assets
│   ├── useAssetGeneration.ts        # Logique génération images
│   ├── useUserPlan.ts               # Plan utilisateur + usage mensuel
│   ├── useTheme.tsx                  # Thème clair/sombre
│   ├── use-toast.ts                  # Notifications toast
│   └── use-mobile.tsx                # Détection mobile
│
├── components/
│   ├── DashboardLayout.tsx           # Layout dashboard (header + nav + badge tier)
│   ├── ProtectedRoute.tsx            # Route gardée (auth required)
│   ├── ThemeToggle.tsx               # Bouton thème
│   ├── NavLink.tsx                   # Lien navigation actif
│   ├── project/
│   │   ├── AssetLibrary.tsx          # Bibliothèque d'assets (onglets, CRUD, dialog édition, confirmations)
│   │   ├── AssetCard.tsx             # Carte d'asset (actions hover : modifier, régénérer, supprimer)
│   │   ├── StyleManager.tsx          # Gestion style (texte + images de référence)
│   │   └── CharacterViewDialog.tsx   # Vues multiples personnage
│   └── ui/                           # 50+ composants shadcn/ui
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── ImageWithFallback.tsx      # Image avec retry + fallback
│       └── ...
│
└── pages/
    ├── Index.tsx                      # Re-export Landing
    ├── Landing.tsx                    # Page marketing
    ├── Auth.tsx                       # Inscription / Connexion
    ├── Dashboard.tsx                  # Tableau de bord (stats, usage, projets récents)
    ├── Projects.tsx                   # Liste des projets (recherche, CRUD)
    ├── ProjectDetail.tsx             # Détail projet (assets, style)
    ├── Profile.tsx                   # Profil utilisateur
    ├── Plans.tsx                     # Comparaison des plans Free / Pro
    ├── ChapterDetail.tsx             # Détail chapitre (panels) — placeholder
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
          ├── "/dashboard" → <ProtectedRoute> → <Dashboard />
          ├── "/dashboard/projects" → <ProtectedRoute> → <Projects />
          ├── "/dashboard/projects/:id" → <ProtectedRoute> → <ProjectDetail />
          ├── "/dashboard/profile" → <ProtectedRoute> → <Profile />
          ├── "/dashboard/plans" → <ProtectedRoute> → <Plans />
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
│ plan (free/  │◄──────│ description      │
│  pro)        │       │ style_template   │
│ created_at   │       │ style_image_urls │
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
          └──────────────┘ │  panels  │     │
                           ├──────────┤     │
                           │ id (PK)  │     │
                           │ user_id  │     │
                           │ chapter_ │     │
                           │  id (FK) │     │
                           │ panel_   │     │
                           │  number  │     │
                           │ prompt   │     │
                           │ image_url│     │
                           │ dialogue │     │
                           │ narration│     │
                           │ speech_  │     │
                           │  bubbles │     │
                           │ created_ │     │
                           │  at      │     │
                           └──────────┘     │ 
```

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
│   ├── projects/
│   │   └── {project_id}/
│   │       ├── style/
│   │       │   └── reference_1.png
│   │       │   └── reference_2.png
│   │       ├── assets/
│   │       │   └── {asset_id}/
│   │       │       ├── front.png
│   │       │       ├── profile_left.png
│   │       │       ├── profile_right.png
│   │       │       └── back.png
│   │       └── panels/
│   │           └── {panel_id}.png
```

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
│     └── Body: { asset_id, prompt, style_template,               │
│                  style_image_urls, asset_type, image_view }     │
│                                                                 │
│  2. Vérification                                                │
│     ├── FAL_API_KEY existe ?                                 │
│     ├── JWT valide ? → Extraction user_id                       │
│     └── L'asset appartient à l'utilisateur ?                    │
│                                                                 │
│  3. Construction du prompt                                      │
│     ├── Prompt système selon asset_type :                       │
│     │   ├── characters.ts → buildCharacterPrompt()              │
│     │   ├── backgrounds.ts → buildBackgroundPrompt()            │
│     │   └── objects.ts → buildObjectPrompt()                    │
│     ├── + Style texte du projet                                 │
│     ├── + URLs images de référence                              │
│     └── + Instructions vue spécifique (profil, dos, etc.)       │
│                                                                 │
│  3b. Vérification tier & quotas                                  │
│     ├── Lecture du plan utilisateur (profiles.plan)               │
│     ├── Comptage usage mensuel (table usage)                      │
│     └── Rejet si quota dépassé (HTTP 429)                         │
│                                                                 │
│  4. Appel API FAL.ai (sélection modèle par tier)                │
│     ├── Free → FLUX.1 Schnell (text-to-image, rapide)           │
│     ├── Pro → FLUX.2 Pro (text-to-image, haute qualité)          │
│     ├── Pro + refs → FLUX.2 Pro Edit (multi-référence)           │
│     ├── Résolution : 1024×1024                                    │
│     └── Réponse : URL de l'image                                 │
│                                                                 │
│  5. Post-traitement                                             │
│     ├── Téléchargement image depuis FAL.ai                      │
│     ├── Upload vers Supabase Storage (cache-buster ?v=ts)       │
│     └── Obtention URL publique                                  │
│                                                                 │
│  6. Mise à jour BDD                                             │
│     ├── UPDATE assets SET image_url = URL                       │
│     │   (ou image_url_profile_left, etc. selon la vue)          │
│     └── INSERT usage (enregistrement de la génération)          │
│                                                                 │
│  7. Réponse                                                      │
│     └── { image_url, model, plan, image_view }                  │
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
    │                         │ {asset_id, prompt, style_template, ...}             │                      │                  │
    │                         ├────────────────────────────────────────────────────►│                      │                  │
    │                         │                            │                         │ 5. POST /generate    │                  │
    │                         │                            │                         │ {prompt enrichi}     │                  │
    │                         │                            │                         ├─────────────────────►│                  │
    │                         │                            │                         │                      │ 6. Image base64  │
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
| Résolution 1024×1024 | Qualité limitée | Upscaling post-génération |
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
