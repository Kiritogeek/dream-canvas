# DreamWeave — Claude Code Instructions

## Projet

**DreamWeave** est un outil web de création de webtoons/mangas assisté par IA. Les utilisateurs créent des projets, génèrent des assets visuels (personnages, décors, objets) avec une cohérence de style, écrivent leur scénario, découpent en chapitres/cases, puis composent chaque case avec des blocs d'image, de couleur et des bulles de dialogue.

**Valeur principale** : générer des visuels cohérents en secondes, sans compétences en illustration.

**Tiers** :
- **Libre** (`plan` BDD : `libre`) : 0 €/mois — 20 crédits, 1 projet, FLUX.2 Pro pour tous, fil d’Ariane 3 alertes max
- **Créateur** (`plan` BDD : `createur`) : 7,99 €/mois — 150 crédits, projets illimités, Découpage → Cases, export chapitre complet, fil d’Ariane complet
- **Studio** (`plan` BDD : `studio`) : 19,99 €/mois — 500 crédits, mémoire narrative longue, priorité traitement FAL.ai
- 1 crédit = 1 génération (asset, sheet, bloc case — unifié). **FLUX.2 Pro pour tous les tiers** (logique Spotify)
- Multi-vues remplacés par **Sheet System** : fiche composite 4 angles, disponible sur tous les plans

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
| IA Image | FAL.ai — FLUX.2 Pro / FLUX.2 Pro Edit (tous les tiers) |
| IA Scénario | Groq — Llama 3.3 70B |
| IA Vectorisation | Gemini `text-embedding-004` (768D) — NarraMind Compass |
| Recherche vectorielle | pgvector (extension PostgreSQL Supabase) |
| Animation | Framer Motion 12 |
| Forms | React Hook Form 7 + Zod 3.25 |
| Tests | Vitest 3.2 |

---

## Design System

> Détail complet : `wiki/DesignSystem.md` — classes custom, tokens HSL, typographie.

Règle : ne jamais hardcoder des couleurs — utiliser les tokens HSL ou les classes custom (`.glass`, `.gradient-primary`, `.text-gradient`, etc.).

---

## Base de données (tables principales)

| Table | Colonnes clés |
|-------|--------------|
| `profiles` | user_id, display_name, plan ('free'/'pro'), email |
| `projects` | user_id, title, description, style_template, style_image_urls (JSONB), cover_url, panels_target_per_chapter |
| `assets` | project_id, name, asset_type, prompt, image_url, image_url_profile_left/right/back, image_url_sheet |
| `chapters` | project_id, chapter_number, title, synopsis, linked_scenario_chapter_id |
| `chapter_canvases` | chapter_id, panel_number, prompt, image_url, layout (JSONB), speech_bubbles (JSONB), color_blocks (JSONB) |
| `scenario_chapters` | project_id, chapter_number, title, content, panels_outline (JSONB), narramind_anomalies (vidé après chaque run NarraMind), narramind_checked_at |
| `usage` | user_id, action ('image_generation'), created_at — comptage mensuel |
| `project_embeddings` | project_id, source_type, source_id, section_key, content, embedding vector(768) — index vectoriel Compass |
| `compass_proposals` | project_id, proposal_type, origin ('extracted'/'generated'), title, content, status, dedupe_key |

**RLS** : toutes les tables ont `auth.uid() = user_id`. Ne jamais contourner.

---

## Edge Functions

| Fonction | Rôle |
|----------|------|
| `generate-asset-image` | Génère image asset via FAL.ai, upload Storage, update asset, log usage |
| `generate-panel-image` | Génère image case/bloc, dimensions = bloc (800px max width) |
| `generate-scenario-ai` | Génère scénario / chapitre / découpage cases via Google Gemini Flash (+ fallback Groq) |
| `narramind-update` | Mémoire narrative (entités, résumés, détection anomalies) ; réponse HTTP contient les anomalies ; `scenario_chapters.narramind_anomalies` toujours `[]` après run (pas de stockage liste pour l’UI) |
| `generate-style-template-images` | Génère images de prévisualisation du style |
| `generate-landing-showcase` | Images hero pour la landing page |
| `narramind-compass` | Compass : mode `index` (vectorise via Gemini text-embedding-004 → project_embeddings) + mode `propose` (pgvector search → Gemini Flash → compass_proposals) |

Les Edge Functions reçoivent le JWT utilisateur en `Authorization: Bearer`, utilisent le service role pour lire les données cross-user. Ne jamais appeler les Edge Functions sans access_token valide.

---

## Fichiers importants

```
src/
  App.tsx                         # Router, providers, lazy loading
  types/index.ts                  # Tous les types métier (Asset, Case, SpeechBubble, etc.)
  pages/
    ProjectDetail.tsx             # Éditeur projet (Style / Assets / Scénario / Édition)
    ChapterDetail.tsx             # Éditeur chapitre (cases, blocs, bulles, dialogue)
  hooks/
    useAuth.tsx                   # Auth context (signUp, signIn, signOut, reset)
    useUserPlan.ts                # Plan + usage mensuel + limites tier
    useAssetGeneration.ts         # Logique génération asset (validation, FAL.ai, usage)
    useAssets.ts                  # CRUD assets (React Query)
    useProjects.ts                # CRUD projets (React Query)
    useCases.ts                   # Cases + layout (React Query)
  services/
    assets.ts                     # Service assets + appel generate-asset-image
    cases.ts                      # Constantes cases, blocs, helpers layout
    scenarioAI.ts                 # Appel generate-scenario-ai
  components/project/
    AssetLibrary.tsx              # Bibliothèque d'assets du projet
    StyleManager.tsx              # Gestion style template + images de référence
    ScenarioSection.tsx           # Scénario + génération IA + découpage cases
    EditionSection.tsx            # Section édition (chapters → cases)
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

**Ne jamais exécuter `git push` vers `main` sans autorisation explicite de Louis.**
Un commit peut être créé librement. Un push vers `pre-production` ou toute autre branche de travail peut être fait librement. Seul le push vers `main` (ou `--force` sur n'importe quelle branche) nécessite une autorisation explicite dans le message courant.

### Permissions — Règle absolue

**Ne jamais demander d'autorisation pour lire, écrire, modifier des fichiers, exécuter des commandes shell, lancer des outils ou accéder à des ressources.** Agir directement sans demander de confirmation, sauf pour `git push` vers `main`. Cette règle s'applique à toutes les commandes Bash, PowerShell, outils MCP, lecture/écriture de fichiers — sans exception.

### Challenger et affiner en continu

**Toujours challenger la demande avant d'implémenter.** Pour toute feature ou modification non triviale, poser au moins une question de clarification sur :
- **L'intention** : pourquoi cet écran / ce flux existe-t-il ? Quel problème utilisateur résout-il ?
- **Le cas limite** : que se passe-t-il si l'utilisateur n'a pas encore de données ? Si le quota est atteint ? Si c'est un utilisateur Amateur (`free`) ?
- **La cohérence** : est-ce que ça s'aligne avec le reste du parcours (Style → Assets → Scénario → Éditeur) ?
- **La priorisation** : est-ce que c'est P0 (bloquant) ou P2 (polish) ? Est-ce que ça vaut le coût d'implémentation maintenant ?

Ne pas poser toutes ces questions à la fois — choisir la plus pertinente selon le contexte. L'objectif est d'éviter d'implémenter la mauvaise chose parfaitement.

**Règle obligatoire — Questions avant implémentation** : Pour tout prompt important (nouvelle feature, refactoring significatif, modification d'un composant clé), poser **au moins une question de clarification** avant de commencer à coder. Ne jamais sauter cette étape même si la demande semble claire — une question bien posée évite des heures de correction. Exception : corrections de bugs évidents < 5 lignes.

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

> Tableau complet + workflow PLAN→MERGE : `wiki/Agents.md`

Agents : `Interface Architect` 🔵, `Prompt Engineer IA` 🟠, `Fullstack Engineer` 🟣, `Product Owner` 🔴, `Performance Auditor` 🟢, `QA Engineer` 🟡, `Explore` ⚪.
Seuil direct : **< 3 fichiers ET < 20 lignes → Claude principal** (pas d'agent).

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

**Toujours déléguer à l'agent le plus qualifié.** Processus : tâche = agent existant → spawner. Compétence absente → enrichir l'agent (`/.claude/agents/<agent>.md`). Trop éloigné → créer un agent uniquement si réutilisable régulièrement.

Claude principal agit directement pour : éditions ciblées (1-3 fichiers, < 20 lignes), lecture/recherche simple, méta-travail (wiki, CLAUDE.md).

Prompts d'agent : self-contained (chemins exacts, types, contraintes RLS). `run_in_background: true` pour agents indépendants. `isolation: "worktree"` pour refactoring risqués.

---

## Workflow de développement

> Détail phases + démarrer une feature : `wiki/Agents.md`

Implémenter du bas vers le haut : `types/index.ts` → `integrations/supabase/` → `services/` → `hooks/` → `components/` → `pages/`

### Git

- Branches : `feat/`, `fix/`, `refactor/`, `chore/`
- Commits : impératif présent, **français** (`Ajoute le redimensionnement des cases`, `Corrige la vérification quota tier Free`)
- Ne jamais force-push sur `main`
- PR : titre court (< 70 chars), body avec contexte de la décision

---

## Checklist Qualité — Definition of Done

> Checklist complète + pièges courants : `wiki/Checklist.md`

Critiques non négociables : `tsc --noEmit` 0 erreur · `npm test` 0 régression · RLS respectée · `canGenerate()` avant FAL.ai · `refreshSession()` avant Edge Function · interface en français.

---

## Roadmap

> Source de vérité : `C:/Users/kirit/OneDrive/Documents/Obsidian Vault/wiki/Roadmap-2026.md`

Ordre strict : Scénario IA ✅ → Sheet System ✅ → Audit nav ✅ → Refonte Éditeur (Option B ✅, Option A ✅) → Plans Libre/Créateur/Studio ✅ → **Stripe** 🔴 → Vue Admin.

---

## ⚠️ Zone protégée — Canvas Éditeur (Blocs image / Couleur / Bulles)

Le comportement des éléments canvas est **freezé**. Toute modification demandée qui impacte — directement ou indirectement — le fonctionnement de :
- **Blocs image** (`ImageBlockLayer`, `useDragBlock`, `handleImageBlockMoveCommit`, `handleAddBlock`, `confirmCanvasElementDelete` kind=image)
- **Blocs couleur** (`ColorBlockLayer`, `handleColorBlockMoveCommit`, `handleAddColorBlock`, kind=color)
- **Bulles de dialogue** (`BubbleLayer`, `handleBubbleMoveCommit`, `handleAddSpeechBubble`, kind=bubble)

…doit être **signalée explicitement à Louis** avant toute implémentation, avec :
1. **Ce qui serait impacté** (comportement exact cassé ou modifié)
2. **Les conséquences** (régressions potentielles, UX cassée)
3. **Une alternative** qui évite l'impact

**Louis a le dernier mot.** Aucune modification de cette zone sans son accord explicite dans le message courant.

---

## Commande Initialisation

Quand Louis écrit **"Initialisation"**, exécuter ce protocole sans attendre :

1. Lire `C:/Users/kirit/OneDrive/Documents/Obsidian Vault/wiki/index.md`
2. Lire `.claude/Session.md` pour le protocole complet
3. Charger une page wiki spécifique **uniquement si la tâche du jour l'exige** (ex : travail sur Stripe → lire `wiki/Stripe.md`)
4. Répondre : "✅ Initialisé — [résumé contexte en 3 lignes : état du projet, dernière session, prochaine priorité]"

**Objectif** : être opérationnel à 100% dès le premier échange, sans devoir redemander le contexte.

---

## Commande Fin de session

Quand Louis écrit **"Fin de session"**, exécuter le protocole dans `.claude/Fin-de-session.md` sans attendre. Cette commande vaut autorisation explicite de pusher vers preprod et main **si et seulement si** l'audit passe sans bug bloquant.

---

## Règle .md — Mise à jour automatique après chaque session

**Automatique — pas besoin que Louis le demande.** Après chaque session avec des décisions durables :
- Mettre à jour les pages wiki concernées (`C:/Users/kirit/OneDrive/Documents/Obsidian Vault/wiki/`)
- Créer une page wiki si la décision crée une nouvelle spec (ex : `[[Scenario-IA]]`, `[[RefontEditeur]]`)
- Mettre à jour `wiki/index.md` si nouvelle page créée
- Ajouter une entrée dans `C:/Users/kirit/OneDrive/Documents/Obsidian Vault/log.md`
- Mettre à jour `CLAUDE.md` si les tiers, la stack ou les règles changent

**Sessions triviales** (fix < 5 lignes, exploration) → log.md uniquement, pas de mise à jour wiki.

---

## ⚠️ ULTRA IMPORTANT — Règle Mémoire de fin d'études

Le fichier `Produit/Memoire_DreamWeave.md` est le **mémoire de fin d'études de Louis**.

**Toute décision, implémentation ou changement qui peut impacter ce mémoire doit être signalé explicitement**, avec une proposition concrète de mise à jour du fichier.

### Ce qui déclenche la règle (exemples)
- Changement d'architecture technique (stack, Edge Functions, schéma BDD)
- Nouvelle feature livrée significative (scénario IA, éditeur, plans, Stripe)
- Changement de positionnement produit ou de modèle tarifaire
- Ajout de KPIs ou de métriques produit
- Décisions stratégiques (cible, différenciation, concurrence)
- Résultats de tests utilisateurs

### Format de signalement obligatoire

À chaque fois que cette règle se déclenche, ajouter dans la réponse :

> 📝 **Impact Mémoire** : [ce qui change dans le projet]
> **Section concernée** : [ex : Architecture technique / Modèle économique / Fonctionnalités]
> **Proposition** : [paragraphe ou bullet point à intégrer dans Memoire_DreamWeave.md]

### Ce qui NE déclenche PAS la règle
- Corrections de bugs < 5 lignes sans impact fonctionnel
- Refactoring purement technique sans nouvelle feature
- Modifications de style CSS/tokens

---

## Contexte utilisateur

- Utilisateur principal : **Louis** Basnier (louis.basnier@naxos.fr) — appeler par son prénom
- Interface en **français**
- Cible : créateurs de webtoons / mangas sans compétences d'illustration
- Philosophie UX : outil créatif professionnel, glassmorphisme, pas d'interface générique
