# DreamWeave — Claude Code Instructions

## Projet

**DreamWeave** est un outil web de création de webtoons/mangas assisté par IA. Les utilisateurs créent des projets, génèrent des assets visuels (personnages, décors, objets) avec une cohérence de style, écrivent leur scénario, découpent en chapitres/panels, puis composent chaque panel avec des blocs d'image, de couleur et des bulles de dialogue.

**Valeur principale** : générer des visuels cohérents en secondes, sans compétences en illustration.

**Tiers** :
- Free : 20 crédits/mois — même modèle FLUX.2 Pro que le Pro (logique Spotify : même qualité, quantité différente)
- Pro : 300 crédits/mois, 14,99 €/mois — Scénario IA Pro (Découpage → Panels), priorité traitement
- 1 crédit = 1 génération (asset, sheet, bloc panel — unifié)
- Multi-vues remplacés par **Sheet System** : fiche composite 4 angles, disponible Free ET Pro

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

### Git — Règle absolue

**Ne jamais exécuter `git push` sans autorisation explicite de l'utilisateur.**
Un commit peut être créé librement après une implémentation. Le push vers le remote ne se fait que si l'utilisateur dit explicitement "push", "envoie", "pousse le code" ou équivalent dans le message courant.
Cette règle s'applique même en fin de session, même pour une "mise à jour rapide", même si le commit est propre.

### Challenger et affiner en continu

**Toujours challenger la demande avant d'implémenter.** Pour toute feature ou modification non triviale, poser au moins une question de clarification sur :
- **L'intention** : pourquoi cet écran / ce flux existe-t-il ? Quel problème utilisateur résout-il ?
- **Le cas limite** : que se passe-t-il si l'utilisateur n'a pas encore de données ? Si le quota est atteint ? Si c'est un utilisateur Free ?
- **La cohérence** : est-ce que ça s'aligne avec le reste du parcours (Style → Assets → Scénario → Éditeur) ?
- **La priorisation** : est-ce que c'est P0 (bloquant) ou P2 (polish) ? Est-ce que ça vaut le coût d'implémentation maintenant ?

Ne pas poser toutes ces questions à la fois — choisir la plus pertinente selon le contexte. L'objectif est d'éviter d'implémenter la mauvaise chose parfaitement.

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

### Agents disponibles

| Agent | Couleur | Rôle | Quand l'utiliser |
|-------|---------|------|-----------------|
| `Interface Architect` | 🔵 #3B82F6 | UX/UI + design system | Composants, layout, glassmorphisme, animations, éditeur panels/bulles |
| `Prompt Engineer IA` | 🟠 #F97316 | Prompts FAL.ai / FLUX | Génération assets, panels, style templates, cohérence visuelle IA |
| `Fullstack Engineer` | 🟣 #8B5CF6 | React + TypeScript + Supabase | Bugs cross-couches, nouvelles features, auth, React Query, Edge Functions |
| `Product Owner` | 🔴 #EF4444 | Stratégie produit | Cadrage feature, user stories, critères d'acceptation, priorisation backlog |
| `Performance Auditor` | 🟢 #10B981 | Perf web React/CSS | Scroll lag, re-renders, memory leaks, GPU layers, lazy loading |
| `QA Engineer` | 🟡 #EAB308 | Validation livraisons | **Obligatoire** après tout code livré — TypeScript, tests, patterns, sécurité |
| `Explore` | ⚪ — | Scan codebase | Exploration > 3 fichiers, recherche de patterns |

Chaque agent commence sa réponse par son badge coloré (ex : `🟡 QA Engineer — nom de tâche`).

Pour les éditions ciblées (1-3 fichiers connus) : outils directs `Read`/`Edit`/`Grep`.

### Règle QA — OBLIGATOIRE

**Tout code livré par un agent doit passer par le `QA Engineer` 🟡 avant d'être présenté à Louis.**

Déclencher le QA après chaque livraison de `Fullstack Engineer` ou `Interface Architect` :

```
Agent(QA Engineer) {
  prompt: "Valide ce code livré. Fichiers modifiés : [liste]. Exécute la checklist complète."
  run_in_background: false  ← QA est bloquant, on attend sa validation
}
```

- Si QA → **PASS** 🟢 : présenter le code à Louis + passer à REVIEW
- Si QA → **FAIL** 🔴 : retourner au Fullstack Engineer avec les violations exactes. Ne pas présenter à Louis.
- **Aucune exception** — même pour un fix d'une ligne si TypeScript ou tests échouent.

### Règle Performance — OBLIGATOIRE

**Le `Performance Auditor` est spawné automatiquement en background** après chaque livraison de code touchant `.tsx`, `.ts` ou `.css` — sauf corrections de < 5 lignes sans impact rendu.

En parallèle, le hook `PostToolUse` dans `.claude/settings.local.json` exécute un scan statique (`.claude/scripts/perf-audit.sh`) après chaque `Edit`/`Write`. Si des anti-patterns sont détectés, ils sont signalés immédiatement et doivent être corrigés avant de finaliser.

**Mantra** : même rendu, zéro lag.

### Règle de délégation — OBLIGATOIRE

**Toujours déléguer à l'agent le plus qualifié.** Ne jamais implémenter soi-même ce qu'un agent spécialisé ferait mieux.

**Processus de décision :**
1. La tâche correspond à un agent existant → le spawner immédiatement.
2. La tâche touche à une compétence absente mais proche d'un agent → ajouter cette compétence dans son system prompt (`/.claude/agents/<agent>.md`), puis le spawner.
3. La tâche est trop éloignée de tous les agents existants → créer un nouvel agent spécialisé dans `/.claude/agents/`, **uniquement si la compétence sera réutilisée régulièrement** (ne pas créer d'agent one-shot).

**Cas où Claude principal agit directement** (sans délégation) :
- Éditions ciblées connues (1-3 fichiers, < 20 lignes)
- Lecture/recherche simple (`Read`, `Grep`, `Glob`)
- Meta-travail : wiki, CLAUDE.md, configuration agents

**Règles de prompt d'agent — obligatoires :**
- Chaque prompt doit être **self-contained** : fichiers cibles (chemins exacts), types pertinents, contraintes RLS, ce qui ne doit pas être touché.
- **Copier les extraits wiki pertinents** dans le prompt — les agents n'ont pas accès au wiki automatiquement.
- Utiliser `run_in_background: true` pour les agents indépendants (Interface Architect + Fullstack Engineer simultanément).
- Utiliser `isolation: "worktree"` pour les refactoring risqués (`ChapterDetail.tsx`, migrations).
- Seuil strict : **< 3 fichiers ET < 20 lignes → Claude principal** (overhead agent > travail).

---

## Workflow de développement

### Phases

```
PLAN → DESIGN → DEV → QA → REVIEW → MERGE
```

| Phase | Responsable | Couleur | Actions |
|-------|-------------|---------|---------|
| **PLAN** | `Product Owner` | 🔴 | Cadrer la feature, écrire user story + critères d'acceptation |
| **DESIGN** | `Interface Architect` | 🔵 | Proposer l'approche UI/UX, valider la cohérence design system |
| **DEV** | `Fullstack Engineer` | 🟣 | Implémenter (types → services → hooks → composants) |
| **PROMPT** | `Prompt Engineer IA` | 🟠 | Si génération image impliquée : optimiser les prompts |
| **QA** | `QA Engineer` | 🟡 | **Obligatoire** — TypeScript, Vitest, patterns, sécurité, RLS |
| **REVIEW** | Claude principal | — | Cohérence globale, décisions d'architecture |
| **MERGE** | Louis | — | PR propre, commit conventionnel français |

### Démarrer une nouvelle feature

1. Commencer par `Product Owner` → clarifier le besoin, écrire les critères d'acceptation
2. Passer à `Interface Architect` si la feature a un impact visuel significatif
3. Passer à `Fullstack Engineer` pour l'implémentation
4. Impliquer `Prompt Engineer IA` si la feature touche la génération d'images IA

### Implémenter du bas vers le haut

```
src/types/index.ts           (1) Ajouter/modifier les types
src/integrations/supabase/   (2) Types DB si schéma impacté
src/services/                (3) Logique métier et appels API
src/hooks/                   (4) State, mutations React Query
src/components/              (5) Composants UI
src/pages/                   (6) Intégration dans les pages
```

### Git

- Branches : `feat/`, `fix/`, `refactor/`, `chore/`
- Commits : impératif présent, **français** (`Ajoute le redimensionnement des panels`, `Corrige la vérification quota tier Free`)
- Ne jamais force-push sur `main`
- PR : titre court (< 70 chars), body avec contexte de la décision

---

## Checklist Qualité — Definition of Done

Obligatoire avant tout merge :

- [ ] `npx tsc --noEmit` → **0 erreur TypeScript**
- [ ] `npm run test` → **0 régression Vitest**
- [ ] Pas de `console.log` de debug laissé
- [ ] RLS non contournée — `auth.uid() = user_id` respecté
- [ ] Service role non exposé côté client
- [ ] Edge Functions non modifiées (sauf demande explicite)
- [ ] Migrations non modifiées (sauf demande explicite)
- [ ] `canGenerate()` vérifié avant tout appel FAL.ai
- [ ] `refreshSession()` appelé avant tout appel Edge Function
- [ ] UI testée sur le chemin principal (golden path)
- [ ] Interface en français

### Pièges courants à éviter

- Envoyer le style template depuis un draft local (toujours depuis `project.style_template` en BDD)
- Oublier d'invalider les React Query après une mutation
- Lazy loading oublié pour une nouvelle page (`React.lazy` dans `App.tsx`)
- Hardcoder des couleurs au lieu d'utiliser les tokens HSL
- Modifier `supabase/migrations/` sans tester sur une DB locale d'abord
- Appeler une Edge Function sans JWT valide

---

## Roadmap (résumé — ordre strict)

1. **Scénario IA** — refonte workspace + Sheet System + résumés contexte IA
2. **Finalisation plans Free/Pro** — après que Scénario et Sheet soient validés
3. **Stripe** — code prêt, déploiement après finalisation des plans
4. **Vue Admin** — `/admin`, accès `kiritogeek@gmail.com`, override plan, analytics

Roadmap complète : `../DreamWeave-wiki/wiki/Roadmap-2026.md` (source de vérité) · `Produit/07_Roadmap_Produit.md`

---

## Règle .md — Mettre à jour après chaque décision

**Après chaque session où des décisions produit/technique sont prises :**
- Mettre à jour les pages wiki concernées (vault : `../DreamWeave-wiki/wiki/`)
- Créer une page wiki si la décision crée une nouvelle spec (ex : `[[Scenario-IA]]`)
- Mettre à jour `../DreamWeave-wiki/wiki/index.md` si nouvelle page créée
- Ajouter une entrée dans `../DreamWeave-wiki/log.md`
- Mettre à jour `CLAUDE.md` si les tiers, la stack ou les règles changent

---

## Contexte utilisateur

- Utilisateur principal : **Louis** Basnier (louis.basnier@naxos.fr) — appeler par son prénom
- Interface en **français**
- Cible : créateurs de webtoons / mangas sans compétences d'illustration
- Philosophie UX : outil créatif professionnel, glassmorphisme, pas d'interface générique
