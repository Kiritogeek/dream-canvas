# DreamWeave — Claude Code Instructions

## Projet

**DreamWeave** est un outil web de création de webtoons/mangas assisté par IA. Les utilisateurs créent des projets, génèrent des assets visuels (personnages, décors, objets) avec une cohérence de style, écrivent leur scénario, découpent en chapitres/panels, puis composent chaque panel avec des blocs d'image, de couleur et des bulles de dialogue.

**Valeur principale** : générer des visuels cohérents en secondes, sans compétences en illustration.

**Tiers** :
- Free : 20 générations/mois, modèle FLUX.1 Schnell, pas de multi-vues personnage
- Pro : 300 générations/mois, modèle FLUX.2 Pro, multi-vues (front/left/right/back)

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18.3, TypeScript 5.8, Vite 7.3 |
| UI | shadcn/ui (Radix UI) + Tailwind CSS 3.4 |
| Routing | React Router DOM 6.30 |
| State serveur | TanStack React Query 5.83 |
| Auth | Supabase Auth (PKCE, Google OAuth) |
| Base de données | Supabase PostgreSQL (RLS stricte par user_id) |
| Storage | Supabase Storage (bucket `dreamweave`) |
| Edge Functions | Deno (Supabase Functions) |
| IA Image | FAL.ai — FLUX.1 Schnell (free) / FLUX.2 Pro / FLUX.2 Pro Edit (pro) |
| IA Scénario | Groq — Llama 3.3 70B |
| Animation | Framer Motion 12 |
| Forms | React Hook Form 7 + Zod 3.25 |
| Tests | Vitest 3.2 |

---

## Design System

### Classes custom (index.css)
- `.glass` — Glassmorphisme : backdrop-blur(24px), bordure légère, ombre subtile
- `.gradient-dream` — Dégradé lavande → pêche → menthe (135°, alpha 0.3)
- `.gradient-primary` — Lavande → pêche-deep (135°, opaque) — utilisé pour les boutons CTA et éléments actifs
- `.text-gradient` — Dégradé texte lavande → pêche
- `.shadow-dream` — Ombre multi-couches (lavande 0.2 + pêche 0.15)
- `.shadow-glow` — Halo lavande pour effets hover
- `.bg-content` — Fond crème/pêche (light) ou lavande-dark (dark)
- `.scrollbar-none` — Scrollbar cachée

### Tokens couleur (HSL CSS variables)
```
--lavender: 275° 45% 72%       (couleur primaire)
--lavender-soft: 275° 30% 92%  (fond doux)
--peach: 28° 80% 88%           (accent chaud)
--peach-deep: 20° 70% 75%      (gradient secondaire)
--mint: 170° 35% 78%           (accent froid)
--cream: 40° 40% 96%           (fond principal light)
```
Dark mode : background 275° 20% 7% (lavande foncé, jamais noir pur).

### Typographie
- Display : **Quicksand** (font-display) — titres, labels nav
- Body : **Nunito** — texte courant
- Base : 110% (~18px)

---

## Base de données (tables principales)

| Table | Colonnes clés |
|-------|--------------|
| `profiles` | user_id, display_name, plan ('free'/'pro'), email |
| `projects` | user_id, title, description, style_template, style_image_urls (JSONB), cover_url, panels_target_per_chapter |
| `assets` | project_id, name, asset_type, prompt, image_url, image_url_profile_left/right/back, image_url_sheet |
| `chapters` | project_id, chapter_number, title, synopsis, linked_scenario_chapter_id |
| `panels` | chapter_id, panel_number, prompt, image_url, layout (JSONB), speech_bubbles (JSONB), color_blocks (JSONB) |
| `scenario_chapters` | project_id, chapter_number, title, content, panels_outline (JSONB) |
| `usage` | user_id, action ('image_generation'), created_at — comptage mensuel |

**RLS** : toutes les tables ont `auth.uid() = user_id`. Ne jamais contourner.

---

## Edge Functions

| Fonction | Rôle |
|----------|------|
| `generate-asset-image` | Génère image asset via FAL.ai, upload Storage, update asset, log usage |
| `generate-panel-image` | Génère image panel/bloc, dimensions = bloc (800px max width) |
| `generate-scenario-ai` | Génère scénario / chapitre / découpage panels via Groq (Llama 3.3 70B) |
| `generate-style-template-images` | Génère images de prévisualisation du style |
| `generate-landing-showcase` | Images hero pour la landing page |

Les Edge Functions reçoivent le JWT utilisateur en `Authorization: Bearer`, utilisent le service role pour lire les données cross-user. Ne jamais appeler les Edge Functions sans access_token valide.

---

## Fichiers importants

```
src/
  App.tsx                         # Router, providers, lazy loading
  types/index.ts                  # Tous les types métier (Asset, Panel, SpeechBubble, etc.)
  pages/
    ProjectDetail.tsx             # Éditeur projet (Style / Assets / Scénario / Édition)
    ChapterDetail.tsx             # Éditeur chapitre (panels, blocs, bulles, dialogue)
  hooks/
    useAuth.tsx                   # Auth context (signUp, signIn, signOut, reset)
    useUserPlan.ts                # Plan + usage mensuel + limites tier
    useAssetGeneration.ts         # Logique génération asset (validation, FAL.ai, usage)
    useAssets.ts                  # CRUD assets (React Query)
    useProjects.ts                # CRUD projets (React Query)
    usePanels.ts                  # Panels + layout (React Query)
  services/
    assets.ts                     # Service assets + appel generate-asset-image
    panels.ts                     # Constantes panels, blocs, helpers layout
    scenarioAI.ts                 # Appel generate-scenario-ai
  components/project/
    AssetLibrary.tsx              # Bibliothèque d'assets du projet
    StyleManager.tsx              # Gestion style template + images de référence
    ScenarioSection.tsx           # Scénario + génération IA + découpage panels
    EditionSection.tsx            # Section édition (chapters → panels)
  integrations/supabase/
    client.ts                     # Client Supabase
    types.ts                      # Types générés auto depuis DB schema
supabase/
  functions/                      # Edge Functions Deno
  migrations/                     # SQL migrations (source de vérité du schéma)
Produit/                          # Documentation produit (roadmap, architecture, UX)
Audits/                           # Audits techniques datés
```

---

## Conventions de code

### Règles générales
- **Pas de commentaires** sauf si le WHY est non-évident (contrainte cachée, invariant, workaround)
- **Pas d'abstraction prématurée** — 3 lignes similaires > helper inutile
- **Pas de gestion d'erreur défensive** pour des scénarios impossibles — faire confiance au framework
- **Validation uniquement aux frontières** (input utilisateur, APIs externes)

### Patterns
- Pages lazy-loadées via `React.lazy` dans App.tsx
- Mutations React Query → `onSuccess` invalide les queries affectées
- Style template : jamais envoyé depuis un draft local — toujours depuis `project.style_template` en BDD
- Génération image : vérifier `canGenerate()` avant tout appel FAL.ai
- Session : toujours `refreshSession()` avant un appel Edge Function

### Nommage
- Composants : `PascalCase.tsx`
- Hooks : `useCamelCase.ts`
- Services : `camelCase.ts`
- Types : `PascalCase` exportés depuis `src/types/index.ts`
- CSS : kebab-case, Tailwind en priorité

---

## Règles de comportement pour Claude

### Avant d'implémenter
- **Toujours proposer des options** avant d'implémenter un changement UI/UX non-trivial
- **Poser les questions ambiguës explicitement** — ne jamais assumer silencieusement
- **Confirmer les décisions destructives** (suppression de composant, refactoring large, changement de schéma DB)

### Pendant le développement
- Vérifier TypeScript : `npx tsc --noEmit` après chaque modification de types
- Préférer `Edit` sur les fichiers existants, `Write` uniquement pour les nouveaux fichiers
- Ne jamais modifier les Edge Functions sans demander — elles ont des effets en production
- Ne jamais contourner RLS, ne jamais exposer le service role côté client

### Ne pas toucher sans demande explicite
- Schéma Supabase (migrations) — impact production direct
- Système de paiement / plans (pas encore implémenté — voir roadmap Q2 2026)
- Edge Functions (Deno, Supabase) — déploiement manuel requis
- Variables d'environnement (`.env`, secrets Supabase)

### Agents
- Utiliser `Explore` pour scanner le codebase (> 3 fichiers à explorer)
- Utiliser `fullstack-engineer` pour analyses d'architecture ou bugs cross-couches
- Utiliser `dreamweave-image-prompt-engineer` pour les prompts de génération d'images
- Pour les éditions ciblées (1-3 fichiers connus) : outils directs `Read`/`Edit`/`Grep`

---

## Roadmap (résumé)

- **Q2 2026 PRIORITÉ** : Monétisation Stripe (checkout, webhook, RLS sur profiles.plan)
- **En cours** : Édition Figma-like (sélection explicite, panneau propriétés, touches clavier)
- **Livré** : Bulles de dialogue inline dans l'éditeur de panel, système de style, génération assets multi-vues, découpage IA

Roadmap complète : `Produit/07_Roadmap_Produit.md`

---

## Contexte utilisateur

- Utilisateur principal : Louis Basnier (louis.basnier@naxos.fr)
- Interface en **français**
- Cible : créateurs de webtoons / mangas sans compétences d'illustration
- Philosophie UX : outil créatif professionnel, glassmorphisme, pas d'interface générique
