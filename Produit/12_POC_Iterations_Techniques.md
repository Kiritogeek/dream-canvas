# POC & Itérations Techniques — DreamWeave

> Document destiné au mémoire de fin d'année Business Project [TECH] — section WSF5 "Projet Innovant".
> Basé sur les données réelles du dépôt : git log, migrations, code source.

---

## 1. Présentation du projet technique

### 1.1 Objectif CTO — quels défis techniques DreamWeave résout-il ?

DreamWeave s'attaque à trois problèmes techniques fondamentaux dans la création de webtoons assistée par IA :

1. **La cohérence visuelle inter-panels** : Comment s'assurer qu'un personnage généré dans le chapitre 1 ressemble au même personnage au chapitre 10 ? Sans mécanisme de référence, chaque génération produit un résultat différent.

2. **L'intégration d'un workflow créatif complet** : Passer de l'idée (scénario texte) à l'œuvre finale (panels visuels) nécessite d'orchestrer plusieurs modèles d'IA (LLM pour le texte, image pour les visuels), plusieurs couches de données (narratif, visuel, métadonnées) et une interface qui ne noie pas le créateur dans la complexité technique.

3. **La sécurité et l'isolation multi-tenant** : Chaque utilisateur doit accéder uniquement à ses données, ses images, ses projets — même dans une architecture serverless partagée.

### 1.2 Stack choisie et justification

| Choix technique | Alternatives considérées | Justification |
|----------------|--------------------------|---------------|
| **React 18 + TypeScript** | Vue.js, SvelteKit | Ecosystème riche, typing fort, compatibilité shadcn/ui |
| **Vite 7** | Create React App, Next.js | Build ultra-rapide, HMR instant, pas de SSR nécessaire (SPA) |
| **Supabase** | Firebase, PlanetScale + custom auth | BDD + Auth + Storage + Edge Functions dans un seul service, RLS native PostgreSQL |
| **FAL.ai (FLUX.2 Pro)** | Replicate, Stability AI, OpenAI DALL-E | Meilleure qualité pour webtoon style, API multi-référence (FLUX.2 Pro Edit), tarification au megapixel |
| **Google Gemini Flash** | GPT-4o, Claude, Groq seul | Quotas généreux, vitesse, qualité narrative satisfaisante pour la génération de scénarios |
| **Deno (Edge Functions)** | Node.js Lambda, Cloudflare Workers | Natif Supabase, démarrage à froid rapide, isolation sécurisée |
| **TanStack React Query** | SWR, Redux Toolkit Query | Gestion cache + mutations + invalidation automatique — élimine la gestion manuelle du state serveur |

---

## 2. Défis techniques majeurs & solutions implémentées

### 2.1 Cohérence visuelle inter-panels — Sheet System

**Problème** : Chaque génération FAL.ai avec le même prompt produit un personnage différent. Dans un webtoon, le lecteur doit reconnaître le personnage à chaque apparition.

**Solution implémentée** — Sheet System :
- Fichier : `supabase/functions/generate-asset-image/index.ts`
- Migration : `20260416100000_add_assets_image_url_sheet.sql`
- Une "sheet" est une fiche composite 4 angles (face, profil gauche, profil droit, dos) générée en une seule génération avec FLUX.2 Pro
- La sheet est stockée dans `assets.image_url_sheet` et injectée comme image de référence dans tous les appels FLUX.2 Pro Edit ultérieurs
- Les panels de scènes utilisent `generate-panel-image` avec `block_asset_image_urls` = URLs des sheets des personnages sélectionnés → FAL.ai FLUX.2 Pro Edit reçoit 1-3 images de référence et génère une image cohérente avec les personnages

**Résultat** : Cohérence visuelle automatique sans effort de l'utilisateur. L'image de référence "ancre" le style du personnage dans chaque génération.

### 2.2 Génération par bloc — Edge Function generate-panel-image

**Problème** : Un panel webtoon peut contenir plusieurs scènes, personnages et décors positionnés librement. Il faut générer une image adaptée à chaque bloc de mise en page (dimensions variables, position, contexte narratif différent).

**Solution implémentée** :
- Fichier : `supabase/functions/generate-panel-image/index.ts`
- Chaque bloc (défini par `layout` JSONB dans `chapter_canvases`) contient ses propres dimensions, prompt et références d'assets
- La génération est indépendante par bloc : l'utilisateur peut régénérer un bloc sans toucher aux autres
- Côté client : `useAssetGeneration.ts` orchestre le polling de résultat + mise à jour React Query

**Structure du bloc** (JSONB `layout` dans `chapter_canvases`) :
```json
{
  "blocks": [
    {
      "id": "uuid",
      "x": 0, "y": 0, "width": 800, "height": 400,
      "prompt": "Description de la scène",
      "asset_refs": ["asset_id_1", "asset_id_2"],
      "image_url": "https://..."
    }
  ]
}
```

### 2.3 NarraMind — mémoire narrative longue

**Problème** : Un LLM a une fenêtre de contexte limitée. Après 5-10 chapitres, le modèle "oublie" les personnages, les lieux et les événements passés. Cela produit des incohérences narratives (un personnage mort qui réapparaît, un lieu qui change de description).

**Solution implémentée** — NarraMind :
- Edge Function : `supabase/functions/narramind-update/index.ts`
- Tables : `memory_entities`, `memory_summaries`, `narramind_alerts` (migrations 20260423-20260430)
- À chaque sauvegarde de chapitre : NarraMind extrait les entités (personnages, lieux, objets), génère un résumé compact du chapitre (< 100 mots), détecte les anomalies narratives (contradictions, incohérences)
- Les anomalies sont remontées comme alertes dans le fil d'Ariane (UI) et stockées dans `scenario_chapters.narramind_anomalies`
- Le contexte LLM pour la génération suivante = résumés compacts des N chapitres précédents (pas le texte brut) → économie de tokens, cohérence maintenue

**Résultat** : Mémoire narrative extensible sans dépendre de la longueur du contexte LLM. Détection proactive des incohérences.

### 2.4 Système de quotas et plans (libre/créateur/studio)

**Problème** : Limiter l'usage IA sans dégrader l'expérience (FLUX.2 Pro pour tous = logique Spotify) tout en protégeant les revenus.

**Solution implémentée** :
- Migration : `20260503200000_rename_plan_values_add_studio.sql` — 3 tiers : `libre`, `createur`, `studio`
- Migration : `20260213220000_add_usage_table.sql` — comptage usage mensuel dans `usage`
- Migration : `20260418120000_stripe_rls_profiles.sql` — `profiles.plan` protégé par RLS (seul le webhook Stripe peut modifier le plan)
- Hook : `src/hooks/useUserPlan.ts` — récupère plan + usage mensuel + limites tier
- Vérification côté serveur dans chaque Edge Function : quota dépassé → HTTP 429

**Sécurité critique** : La RLS sur `profiles.plan` empêche qu'un utilisateur s'upgrade gratuitement côté client (bug B3 corrigé en migration 20260418).

### 2.5 Sécurité RLS multi-tenant

**Problème** : Dans une architecture Supabase partagée, un utilisateur ne doit jamais voir les données d'un autre, même en cas de fuite de la clé anon.

**Solution implémentée** :
- RLS activé sur toutes les tables (`profiles`, `projects`, `assets`, `chapter_canvases`, `scenario_chapters`, `usage`, `memory_entities`, `memory_summaries`, `narramind_alerts`)
- Pattern universel : `auth.uid() = user_id` sur chaque table
- La clé anon ne bypass jamais la RLS — seul `service_role` (côté serveur uniquement) peut le faire
- Les Edge Functions utilisent `service_role` uniquement pour les opérations légitimes cross-user (webhooks, usage logging)

---

## 3. Itérations / méthodologie de prototypage

> Reconstituées à partir de `git log --oneline` (237 commits) et des migrations SQL.

### 3.1 Phase 0 — Scaffold initial (jan 2026)

**Objectif** : Poser les fondations (auth, CRUD projets/assets, génération image basique).

**Itérations** :
- Scaffold Lovable (1 commit) → architecture initiale React + Supabase
- Migration fondatrice `20260209` : tables `profiles`, `projects`, `assets`, `chapters`, RLS de base
- Premier test génération image FAL.ai — FLUX.1 Schnell (Free)

**Résultat** : MVP fonctionnel en 2 semaines.

### 3.2 Phase 1 — Monétisation & Qualité (fév 2026)

**Objectif** : Implémenter les tiers Free/Pro, quotas, améliorer la qualité IA.

**Itérations clés** :
- Migration `20260213` : table `usage` (comptage générations)
- Migration `20260213` : colonne `plan` dans `profiles`
- Migration `20260214` : `scenario_chapters` + `scenario_versions` (système scénario texte)
- Migration `20260215` : `chapter_canvases` (édition visuelle)
- Passage FLUX.1 Schnell (Free) → FLUX.2 Pro (Pro) — qualité ×10 mais coût ×10

**Correctif critique** : `fetchWithRetry` + `fetchWithTimeout(120s)` pour résilience FAL.ai.

### 3.3 Phase 2 — Sheet System & Cohérence (avr 2026)

**Objectif** : Résoudre le problème de cohérence visuelle inter-panels (feedback utilisateurs beta).

**Itérations** :
- Schiffear × 20 commits : expérimentation prompts sheet, ratio 2560×768, fond blanc
- Migration `20260416` : `assets.image_url_sheet`
- Passage FLUX.2 Pro (text-to-image) → FLUX.2 Pro Edit (image-to-image multi-référence)
- Résultat : cohérence visuelle "passable → très bonne" selon feedback

**Correctif inattendu** : Les 2 images de référence (sheet + décor) multiplient par 3 le coût FAL.ai → décision de compter chaque génération comme 1 crédit (coût absorbé).

### 3.4 Phase 3 — NarraMind & 3 Tiers (avr-mai 2026)

**Objectif** : Mémoire narrative longue pour les projets > 5 chapitres. Refonte des tiers pour le lancement commercial.

**Itérations** :
- Marine Tardy Miquel × 3 commits : NarraMind v2 (test quota Gemini 429 → gestion fallback Groq)
- Migrations `20260423` : `memory_entities`, `memory_summaries`, `universe_lore`, `word_mappings`
- Migrations `20260430` : `narramind_alerts`, fil d'Ariane UI
- Migration `20260503` : renommage `free→libre`, `pro→createur`, ajout `studio`
- Migration `20260503` : `billing_period_start` pour reset quota abonnement

**Correctif Stripe** : Bug B3 (user pouvait s'upgrader gratuitement) corrigé en migration 20260418 avec durcissement RLS `profiles.plan`.

### 3.5 Méthodologie générale

- **Solo + IA** : Développement solo avec assistance Claude Code, Cursor Agent (≈40% des commits sont des commits d'agent)
- **Commits atomiques en français** : Convention stricte (impératif présent, français) — facilite le suivi
- **Migrations SQL comme source de vérité** : Chaque évolution du schéma = migration versionnée
- **Pas de tests E2E** : Uniquement tests unitaires Vitest + TypeCheck — rapidité de cycle acceptée au stade MVP
- **Git flow simplifié** : Développement direct sur `main`, pas de branches feat/ longues

---

## 4. Documentation technique de mise en œuvre

### 4.1 Stack finale préconisée

| Couche | Choix retenu | Justification post-implémentation |
|--------|-------------|----------------------------------|
| **Frontend** | React 18.3 + TypeScript 5.8 + Vite 7.3 | Aucune friction — stack mature, outillage IA (Claude Code) très efficace sur React/TS |
| **State serveur** | TanStack React Query 5.83 | Élimine 80% de la logique de chargement/cache manuelle |
| **Auth** | Supabase Auth (PKCE + Google OAuth) | Zéro backend auth à maintenir |
| **BDD** | Supabase PostgreSQL + RLS | RLS native PostgreSQL = sécurité multi-tenant sans code applicatif |
| **Storage** | Supabase Storage (bucket public) | Intégré, CDN, pas de configuration S3 |
| **IA Image** | FAL.ai FLUX.2 Pro / FLUX.2 Pro Edit | Meilleur rapport qualité/cohérence/coût pour webtoon |
| **IA Texte** | Google Gemini Flash (+ fallback Groq) | Gemini = haute qualité narrative ; Groq = fallback ultra-rapide si quota 429 |
| **Paiements** | Stripe (via Edge Functions) | Standard industrie, webhook fiable, Customer Portal inclus |

### 4.2 Architecture recommandée pour passer à l'échelle

| Composant | Limite actuelle | Évolution recommandée |
|-----------|----------------|----------------------|
| **Génération IA** | Synchrone (timeout 120s) | Queue asynchrone (Supabase Realtime + worker) |
| **Cohérence personnages** | 1 sheet = référence unique | Fine-tuning LoRA par personnage (coût plus élevé, cohérence parfaite) |
| **NarraMind** | Gemini Flash (fenêtre 32K) | Gemini Pro ou Claude pour projets > 20 chapitres |
| **Images** | 1024×1024 (FAL.ai standard) | Upscaling 4× post-génération (Real-ESRGAN via FAL.ai) |
| **Multi-tenant** | Supabase Cloud (connexions partagées) | Supabase Dedicated pour > 10K MAU |
| **Frontend** | SPA (pas de SSR) | Ajouter React Router loader + prefetch pour Time to First Contentful |

---

## 5. Plan de release (Beta → MVP → V1 → V2)

### Beta (état actuel — mai 2026)

**Statut** : Application fonctionnelle, utilisable, non déployée publiquement.

| Feature | Implémentée | Déployée prod |
|---------|------------|--------------|
| Auth (email + Google OAuth) | ✅ | Non confirmé |
| Gestion projets | ✅ | Non confirmé |
| Assets + Sheet System | ✅ | Non confirmé |
| Scénario IA (Gemini + Groq) | ✅ | Non confirmé |
| Éditeur panels (blocs + bulles) | ✅ | Non confirmé |
| NarraMind (mémoire narrative) | ✅ | Non confirmé |
| 3 tiers (libre/créateur/studio) | ✅ | Non confirmé |
| Stripe (infrastructure) | ✅ impl. | ❌ non déployé |
| Export PNG chapitre | ✅ | Non confirmé |

### MVP (lancement public — objectif Q2 2026)

**Prérequis bloquants** :
- [ ] Déploiement Stripe Checkout + webhook (paiement réel)
- [ ] Politique de confidentialité + CGU publiées
- [ ] CORS restreint au domaine de production
- [ ] Confirmation email activée
- [ ] Sentry configuré (error tracking)
- [ ] URL de production confirmée

### V1 (objectif Q3 2026)

| Feature | Priorité |
|---------|----------|
| Export PDF / format Webtoon Canvas | P0 |
| Upscaling images (4×) | P1 |
| Compteur temps de lecture live | P1 |
| Import scénario (.txt) | P1 |
| Découpage chapitre → panels (IA) | P1 (gate Créateur) |

### V2 (objectif Q4 2026)

| Feature | Priorité |
|---------|----------|
| Marketplace de styles communautaires | P1 |
| Collaboration (lien de partage) | P1 |
| PWA (installable mobile) | P1 |
| API B2B | P2 |
| App iOS/Android native | P3 |

---

*Créé le 4 mai 2026 — basé sur l'analyse du dépôt git (237 commits, 26 migrations SQL, 10 Edge Functions).*
