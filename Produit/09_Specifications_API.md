# Spécifications API — DreamWeave

> API Supabase (PostgREST) et Edge Functions pour la logique métier et la génération IA.

---

## 1. Vue d'ensemble

DreamWeave utilise deux types d'API :
1. **API Supabase (auto-générée)** : PostgREST expose automatiquement les tables PostgreSQL en API REST
2. **Edge Functions (custom)** : Fonctions serverless Deno pour la logique métier (génération IA)

### Base URLs

| Environnement | Supabase API | Edge Functions |
|---------------|-------------|----------------|
| **Développement** | `https://{project_id}.supabase.co/rest/v1` | `https://{project_id}.supabase.co/functions/v1` |
| **Production** | `https://{project_id}.supabase.co/rest/v1` | `https://{project_id}.supabase.co/functions/v1` |

### Authentification

Toutes les requêtes nécessitent les headers suivants :

```
apikey: {SUPABASE_ANON_KEY}
Authorization: Bearer {JWT_TOKEN}
```

Le JWT est obtenu via Supabase Auth (signIn, signUp, ou session existante).

---

## 2. API Supabase (PostgREST)

### 2.1 Authentification

#### Inscription (Sign Up)

```
POST /auth/v1/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "data": {
    "display_name": "John Doe"
  }
}
```

**Réponse** (200) :
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "xxx",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "display_name": "John Doe"
    }
  }
}
```

#### Connexion (Sign In)

```
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Connexion Google (OAuth)

```
GET /auth/v1/authorize?provider=google&redirect_to={REDIRECT_URL}
```

Redirige vers Google OAuth, puis callback vers Supabase qui redirige vers l'app.

#### Déconnexion

```
POST /auth/v1/logout
Authorization: Bearer {JWT_TOKEN}
```

#### Récupérer l'utilisateur courant

```
GET /auth/v1/user
Authorization: Bearer {JWT_TOKEN}
```

---

### 2.2 Profiles

#### Récupérer son profil

```
GET /rest/v1/profiles?id=eq.{user_id}&select=*
```

**Réponse** :
```json
[
  {
    "id": "uuid",
    "display_name": "John Doe",
    "avatar_url": null,
    "plan": "libre",
    "created_at": "2026-02-01T10:00:00Z",
    "updated_at": "2026-02-01T10:00:00Z"
  }
]
```

#### Mettre à jour son profil

```
PATCH /rest/v1/profiles?id=eq.{user_id}
Content-Type: application/json

{
  "display_name": "Jane Doe",
  "avatar_url": "https://..."
}
```

---

### 2.3 Projects

#### Lister ses projets

```
GET /rest/v1/projects?select=*&order=created_at.desc
```

**Réponse** :
```json
[
  {
    "id": "project-uuid",
    "user_id": "user-uuid",
    "title": "Mon Webtoon",
    "description": "Une histoire de fantasy...",
    "style_template": "style webtoon sombre, palette violets/bleus...",
    "style_image_urls": ["https://...ref1.png", "https://...ref2.png"],
    "cover_url": null,
    "created_at": "2026-02-10T14:00:00Z",
    "updated_at": "2026-02-10T14:00:00Z"
  }
]
```

#### Créer un projet

```
POST /rest/v1/projects
Content-Type: application/json

{
  "title": "Mon Webtoon",
  "description": "Une histoire de fantasy...",
  "user_id": "{user_id}"
}
```

#### Récupérer un projet par ID

```
GET /rest/v1/projects?id=eq.{project_id}&select=*
```

#### Mettre à jour un projet

```
PATCH /rest/v1/projects?id=eq.{project_id}
Content-Type: application/json

{
  "title": "Nouveau titre",
  "style_template": "style manga coloré, traits fins...",
  "style_image_urls": ["https://...ref1.png"]
}
```

#### Supprimer un projet

```
DELETE /rest/v1/projects?id=eq.{project_id}
```

> Supprime en cascade les assets, chapitres et canvas de chapitre (`chapter_canvases`) associés.

---

### 2.4 Assets

#### Lister les assets d'un projet

```
GET /rest/v1/assets?project_id=eq.{project_id}&select=*&order=created_at.desc
```

**Réponse** :
```json
[
  {
    "id": "asset-uuid",
    "user_id": "user-uuid",
    "project_id": "project-uuid",
    "name": "Luna (héroïne)",
    "asset_type": "character",
    "prompt": "Jeune femme de 20 ans, cheveux violets longs...",
    "image_url": "https://...front.png",
    "image_url_sheet": "https://...sheet.png",
    "image_url_profile_left": null,
    "image_url_profile_right": null,
    "image_url_back": null,
    "reference_image_url": null,
    "metadata": null,
    "created_at": "2026-02-10T15:00:00Z"
  }
]
```

#### Filtrer par type

```
GET /rest/v1/assets?project_id=eq.{project_id}&asset_type=eq.character&select=*
```

#### Créer un asset

```
POST /rest/v1/assets
Content-Type: application/json

{
  "user_id": "{user_id}",
  "project_id": "{project_id}",
  "name": "Luna (héroïne)",
  "asset_type": "character",
  "prompt": "Jeune femme de 20 ans, cheveux violets longs, yeux dorés..."
}
```

#### Mettre à jour un asset (après génération)

```
PATCH /rest/v1/assets?id=eq.{asset_id}
Content-Type: application/json

{
  "image_url": "https://...front.png"
}
```

#### Supprimer un asset

```
DELETE /rest/v1/assets?id=eq.{asset_id}
```

---

### 2.5 Chapters

#### Lister les chapitres d'un projet

```
GET /rest/v1/chapters?project_id=eq.{project_id}&select=*&order=chapter_number.asc
```

#### Créer un chapitre

```
POST /rest/v1/chapters
Content-Type: application/json

{
  "user_id": "{user_id}",
  "project_id": "{project_id}",
  "title": "Chapitre 1 : Le Début",
  "synopsis": "Luna découvre ses pouvoirs magiques lors d'une nuit d'orage...",
  "chapter_number": 1
}
```

#### Mettre à jour un chapitre

```
PATCH /rest/v1/chapters?id=eq.{chapter_id}
Content-Type: application/json

{
  "title": "Chapitre 1 : L'Éveil",
  "synopsis": "Luna découvre ses pouvoirs..."
}
```

#### Supprimer un chapitre

```
DELETE /rest/v1/chapters?id=eq.{chapter_id}
```

---

### 2.6 Canvas de chapitre (`chapter_canvases`)

> ⚠️ La table `panels` a été **renommée `chapter_canvases`** (migration 20260424) et son modèle a changé : **une seule ligne par chapitre** représentant le canvas vertical entier (800px × jusqu'à 100 000px). L'invariant 1 canvas/chapitre est garanti par un index unique sur `chapter_id` (`idx_chapter_canvases_one_per_chapter`, migration 20260627140000). La mise en page n'est plus une liste de panels mais un **layout JSONB** (`{ blocks[], panelHeight }`), avec `speech_bubbles` et `color_blocks` en colonnes JSONB séparées (+ `background_style`).

#### Récupérer le canvas d'un chapitre

```
GET /rest/v1/chapter_canvases?chapter_id=eq.{chapter_id}&select=*
```

**Réponse** (0 ou 1 ligne) :
```json
[
  {
    "id": "canvas-uuid",
    "user_id": "user-uuid",
    "chapter_id": "chapter-uuid",
    "panel_number": 1,
    "layout": {
      "blocks": [
        { "id": "blk1", "x": 0, "y": 0, "width": 800, "height": 1000,
          "prompt": "Luna sur un toit sous l'orage", "asset_refs": ["asset-uuid"],
          "image_url": "https://.../blocks/blk1.png", "scene_type": "establishing" }
      ],
      "panelHeight": 5000
    },
    "speech_bubbles": [
      { "id": "b1", "type": "speech", "text": "Qu'est-ce qui m'arrive ?",
        "character": "Luna", "position": { "x": 200, "y": 100 } }
    ],
    "color_blocks": [],
    "background_style": null
  }
]
```

#### Créer / mettre à jour le canvas (upsert)

```
POST /rest/v1/chapter_canvases     (ou PATCH si la ligne existe)
Content-Type: application/json
Prefer: resolution=merge-duplicates

{
  "user_id": "{user_id}",
  "chapter_id": "{chapter_id}",
  "panel_number": 1,
  "layout": { "blocks": [ ... ], "panelHeight": 5000 },
  "speech_bubbles": [ ... ],
  "color_blocks": [ ... ]
}
```

> L'image de chaque bloc est produite par l'Edge Function `generate-panel-image` (§3.2) ; le frontend écrit ensuite l'URL retournée dans `layout.blocks[].image_url`. La composition automatique du `layout` peut être déléguée à `compose-chapter-layout` (§3.0).

#### Supprimer le canvas d'un chapitre

```
DELETE /rest/v1/chapter_canvases?id=eq.{canvas_id}
```

---

## 3. Edge Functions (Custom API)

### 3.0 Liste réelle des Edge Functions (`supabase/functions/`)

| Fonction | Rôle |
|----------|------|
| `generate-asset-image` | Génère l'image d'un asset (FAL.ai FLUX.2 Pro / Edit), génère la sheet composite, upload Storage, log usage |
| `generate-panel-image` | Génère l'image d'un bloc de chapitre (dimensions du bloc) |
| `generate-scenario-ai` | Multiplexeur scénario / chapitre / découpage cases (Gemini `gemini-2.5-flash`, fallback `gemini-2.5-flash-lite` sur 429/503 ; Groq `llama-3.3-70b-versatile` uniquement en secours du mode `extract_events`) |
| `compose-chapter-layout` | Composition automatique du layout d'un chapitre (Gemini groupe les `panels_outline` en scènes ; le serveur calcule la géométrie) |
| `narramind-update` | Mémoire narrative : entités, résumés, détection d'anomalies |
| `narramind-compass` | NarraMind Compass : mode `index` (vectorise via Gemini `text-embedding-004` → `project_embeddings`) ; mode `propose` (recherche pgvector → Gemini Flash → `compass_proposals`) |
| `generate-style-template-images` | Génère les images de prévisualisation du style |
| `generate-landing-showcase` | Génère les images hero de la landing page |
| `create-checkout-session` | Crée une session Stripe Checkout |
| `create-portal-session` | Crée un lien Stripe Customer Portal |
| `stripe-webhook` | Traite les événements Stripe → met à jour `profiles.plan` (service_role) |
| `admin-set-plan` / `admin-user-action` / `admin-get-kpis` | Endpoints d'administration (plan, actions utilisateur, KPIs) |

**14 Edge Functions au total** (+ un dossier `_shared/` de helpers : `cors.ts`, `ownership.ts`, `quota.ts`, `usagePeriod.ts`, `tierConfig.ts`, `style-template-image-prompts.ts`).

Toutes les Edge Functions reçoivent le JWT utilisateur (`Authorization: Bearer`) et utilisent le `service_role` côté serveur pour les lectures cross-user légitimes.

### 3.1 `generate-asset-image`

> Génère une image pour un asset en utilisant l'IA (FAL.ai / FLUX.2 Pro).

**Endpoint** :
```
POST /functions/v1/generate-asset-image
```

**Headers** :
```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

**Body** :
```json
{
  "asset_id": "uuid",
  "prompt": "Jeune femme de 20 ans, cheveux violets longs, yeux dorés, tenue d'aventurière",
  "asset_type": "character"
}
```

**Paramètres** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `asset_id` | `string (UUID)` | Oui | ID de l'asset à mettre à jour |
| `prompt` | `string` | Oui | Description de l'asset |
| `asset_type` | `string` | Oui | `"character"`, `"background"`, ou `"object"` |

> Le style (`style_template` + `style_image_urls`) est lu **uniquement** depuis la table `projects` côté serveur, jamais envoyé dans le body. Le Sheet System a remplacé les multi-vues : la fonction génère séquentiellement la face puis la sheet composite 4 angles, et n'accepte plus de paramètre de vue.

**Réponse succès** (200) :
```json
{
  "image_url": "https://xxx.supabase.co/storage/v1/object/public/dreamweave/.../asset.png",
  "image_url_sheet": "https://xxx.supabase.co/storage/v1/object/public/dreamweave/.../asset_sheet.png",
  "update_field": "image_url",
  "model": "flux-2-pro-edit",
  "plan": "createur",
  "request_id": "uuid"
}
```

**Réponse erreur** (400/401/500) :
```json
{
  "error": "Description de l'erreur"
}
```

**Codes d'erreur** :

| Code | Description |
|------|-------------|
| 400 | Paramètres manquants ou invalides |
| 401 | JWT invalide ou expiré |
| 403 | L'asset n'appartient pas à l'utilisateur |
| 500 | Erreur serveur (API FAL.ai, Storage, etc.) |

**Processus interne** :

```
1. Vérifier FAL_API_KEY
2. Extraire user_id du JWT
3. Vérifier que l'asset appartient à l'utilisateur
4. Réserver le crédit atomiquement (`reserveImageCredit`) avant tout appel FAL ; rembourser (`refundImageCredit`) en cas d'échec
5. Construire le prompt enrichi :
   a. Prompt système (selon asset_type)
   b. + style_template (lu depuis `projects`) et/ou style images (si disponibles)
   c. + prompt utilisateur
6. Générer **séquentiellement** :
   - la face (1280×1024) — FLUX.2 Pro Edit (si références) ou text-to-image
   - puis la sheet composite (strip horizontal 2560×768 = 4 panneaux verticaux 640×768), en utilisant la face comme référence d'identité — uniquement pour `asset_type = "character"`
   - 3 niveaux de fallback prompt sur violation policy FAL (422), crop des bordures blanches (pngjs)
7. Mettre à jour l'asset en BDD : `image_url` (face) + `image_url_sheet` ; réinitialiser `image_url_profile_left/right/back` à `null` (legacy Sheet System)
8. Retourner l'URL publique (image_url + image_url_sheet)
```

### 3.2 `generate-panel-image`

> Génère une image pour **un bloc** d'un panel (Étape 5 — édition blocs). Les dimensions de l'image sont celles du bloc (largeur × hauteur). Stockage : `{user_id}/projects/{project_id}/panels/{panel_id}/blocks/{block_id}.png`.

**Endpoint** :
```
POST /functions/v1/generate-panel-image
```

**Headers** :
```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

**Body** :
```json
{
  "panel_id": "uuid",
  "block_id": "uuid",
  "width": 500,
  "height": 500,
  "prompt": "Vue large de la ville sous l'orage, Luna debout sur un toit...",
  "block_asset_names": ["Luna", "Forêt magique"],
  "block_asset_image_urls": [
    "https://xxx.supabase.co/storage/v1/object/public/dreamweave/.../luna_sheet.png",
    "https://xxx.supabase.co/storage/v1/object/public/dreamweave/.../foret_sheet.png"
  ],
  "previous_image_url": "https://xxx.supabase.co/storage/v1/object/public/dreamweave/.../prev.png",
  "scene_type": "establishing",
  "effects": ["speed_lines"],
  "shot_type": "wide"
}
```

**Paramètres** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `panel_id` | `string (UUID)` | Oui | ID du canvas de chapitre (`chapter_canvases.id`) |
| `block_id` | `string (UUID)` | Oui | ID du bloc dans le layout |
| `width` | `number` | Oui | Largeur du bloc (px) ; snappée au multiple de 32, plafonnée à 1440 côté serveur |
| `height` | `number` | Oui | Hauteur du bloc (px) ; snappée au multiple de 32, plafonnée à 1440 côté serveur |
| `prompt` | `string` | Oui | Description de l'illustration pour ce bloc |
| `block_asset_names` | `string[]` | Non | Noms des assets du bloc (utilisés dans le prompt pour guider les éléments à inclure) |
| `block_asset_image_urls` | `string[]` | Non | URLs des « sheets » d'assets. Utilisées comme `image_urls` dans FLUX.2 Pro Edit pour conserver la cohérence identitaire (disponible sur tous les tiers). Budget `FLUX_MAX_REFS = 5` (assets nommés d'abord, puis images de style, puis continuité). |
| `previous_image_url` | `string` | Non | Image du bloc précédent, ajoutée en dernière référence de continuité. |
| `scene_type` | `string` | Non | Type de scène (grammaire visuelle webtoon, 12 types : `establishing`, `dialogue`, `action_impact`, etc.) mappé vers un préfixe FLUX. |
| `effects` | `string[]` | Non | Effets visuels (`speed_lines`, `multiple_energy_effects`, etc.) injectés dans le prompt. |
| `shot_type` | `string` | Non | Type de cadrage. |

**Réponse succès** (200) :
```json
{
  "image_url": "https://xxx.supabase.co/storage/v1/object/public/dreamweave/.../panels/.../blocks/....png?v=..."
}
```

**Réponse erreur** (400/401/403/502/500) :
```json
{
  "error": "Description de l'erreur"
}
```

**Processus interne** :

1. Vérifier FAL_API_KEY et JWT
2. Vérifier que le canvas appartient à l'utilisateur (`panel_id` = `chapter_canvases.id`) + réserver le crédit atomiquement (`reserveImageCredit`)
3. Récupérer `project_id` via le chapitre du canvas (pour le chemin Storage)
4. Construire le prompt : préfixe grammaire visuelle (`scene_type` + `effects`) + template de style du projet (depuis `projects`) + noms des assets + instruction « full-bleed, remplir tout le cadre » + prompt du bloc
5. Génération image (FLUX.2 Pro pour tous les tiers) :
   - Avec `block_asset_image_urls` fournis : FLUX.2 Pro Edit avec `image_urls = block_asset_image_urls` (les sheets servent d'identité visuelle)
   - Sans référence : FLUX.2 Pro text-to-image
6. Télécharger l'image et l'uploader dans Storage : `{user_id}/projects/{project_id}/panels/{panel_id}/blocks/{block_id}.png`
7. Retourner l'URL publique (le frontend met à jour `layout.blocks[].image_url`)

**Secret** : `FAL_API_KEY` (Supabase Edge Functions → Secrets). Config : `verify_jwt = false` dans `config.toml` ; la fonction vérifie le JWT via Supabase Auth.

---

### 3.3 Anciennes fonctions planifiées (superseded)

> ⚠️ **Section historique.** Les fonctions ci-dessous étaient envisagées en 2026 mais n'ont **pas** été implémentées sous cette forme. Leurs rôles sont aujourd'hui couverts autrement :
> - `generate-chapter-panels` → remplacé par `compose-chapter-layout` (groupement Gemini des `panels_outline` → géométrie serveur) + `generate-panel-image` (image par bloc).
> - `generate-dialogues` → les bulles de dialogue sont saisies dans l'éditeur (`chapter_canvases.speech_bubbles`) ; aucune Edge Function dédiée.
> - `export-chapter` → l'export est réalisé **côté client** (`src/services/exportPanel.ts`, `html2canvas` + `jszip`), pas via une Edge Function.

#### `generate-chapter-panels` (non implémentée)

```
POST /functions/v1/generate-chapter-panels

{
  "chapter_id": "uuid",
  "synopsis": "Luna découvre ses pouvoirs...",
  "assets": [
    { "name": "Luna", "prompt": "...", "image_url": "..." },
    { "name": "Forêt magique", "prompt": "...", "image_url": "..." }
  ],
  "style_template": "...",
  "panel_count": 15
}
```

**Réponse** :
```json
{
  "success": true,
  "panels": [
    { "panel_number": 1, "prompt": "...", "image_url": "..." },
    { "panel_number": 2, "prompt": "...", "image_url": "..." }
  ]
}
```

#### `generate-dialogues` (non implémentée)

```
POST /functions/v1/generate-dialogues

{
  "chapter_id": "uuid",
  "synopsis": "...",
  "characters": ["Luna", "Marc"],
  "tone": "dramatique"
}
```

#### `export-chapter` (non implémentée — export client-side)

```
POST /functions/v1/export-chapter

{
  "chapter_id": "uuid",
  "format": "pdf",
  "resolution": "1024x1536",
  "include_dialogues": true
}
```

---

## 4. API externe : FAL.ai

### 4.1 Configuration

| Paramètre | Valeur |
|-----------|--------|
| **Endpoint text-to-image** | `https://fal.run/fal-ai/flux-2-pro` |
| **Endpoint image edit (refs)** | `https://fal.run/fal-ai/flux-2-pro/edit` |
| **Modèle** | `fal-ai/flux-2-pro` (tous les tiers) |
| **Auth** | API Key (header `Authorization: Key {FAL_API_KEY}`) |

### 4.2 Appel de génération d'image

```
POST https://fal.run/fal-ai/flux-2-pro

Headers:
  Authorization: Key {FAL_API_KEY}
  Content-Type: application/json

Body:
{
  "prompt": "...(prompt enrichi)...",
  "image_size": { "width": 1280, "height": 1024 },
  "num_images": 1,
  "output_format": "png",
  "enable_safety_checker": true
}
```

> Avec images de référence (sheets / style), l'endpoint utilisé est `https://fal.run/fal-ai/flux-2-pro/edit` avec un champ supplémentaire `image_urls`.

**Réponse** :
```json
{
  "images": [
    { "url": "https://fal.media/.../output.png" }
  ]
}
```

### 4.3 Limites et tarification

| Paramètre | Valeur |
|-----------|--------|
| **Résolution** | Assets : face 1280×1024, sheet 2560×768 ; blocs de chapitre : dimensions du bloc (snappées au multiple de 32, plafonnées à 1440 px) |
| **Rate limit** | Variable selon le plan FAL.ai |
| **Temps de réponse** | 3-15 secondes |

---

## 5. Storage API (Supabase Storage)

### 5.1 Upload d'image

```
POST /storage/v1/object/dreamweave/{path}
Content-Type: image/png
Authorization: Bearer {JWT_TOKEN}

{binary image data}
```

### 5.2 Récupérer l'URL publique

```
GET /storage/v1/object/public/dreamweave/{path}
```

**Format des paths** :
- Assets : `{user_id}/assets/{asset_id}.png` (face) et `{user_id}/assets/{asset_id}_sheet.png` (sheet composite)
- Blocs de chapitre : `{user_id}/projects/{project_id}/panels/{panel_id}/blocks/{block_id}.png`

### 5.3 Supprimer un fichier

```
DELETE /storage/v1/object/dreamweave/{path}
Authorization: Bearer {JWT_TOKEN}
```

### 5.4 Lister les fichiers

```
POST /storage/v1/object/list/dreamweave
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

{
  "prefix": "{user_id}/projects/{project_id}/",
  "limit": 100
}
```

---

## 6. Codes de statut HTTP

| Code | Signification | Usage |
|------|-------------|-------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée (POST) |
| 204 | No Content | Suppression réussie (DELETE) |
| 400 | Bad Request | Paramètres invalides |
| 401 | Unauthorized | JWT manquant ou invalide |
| 403 | Forbidden | Accès refusé (RLS, ownership) |
| 404 | Not Found | Ressource inexistante |
| 409 | Conflict | Conflit (ex: email déjà utilisé) |
| 422 | Unprocessable | Données valides mais non traitables |
| 429 | Too Many Requests | Rate limiting |
| 500 | Internal Server Error | Erreur serveur |

---

## 7. Utilisation avec le SDK Supabase (Frontend)

Le frontend n'appelle pas directement l'API REST. Il utilise le **SDK Supabase** qui abstrait les appels :

```typescript
import { supabase } from '@/integrations/supabase/client';

// Lister les projets
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .order('created_at', { ascending: false });

// Créer un asset
const { data, error } = await supabase
  .from('assets')
  .insert({
    user_id: user.id,
    project_id: projectId,
    name: 'Luna',
    asset_type: 'character',
    prompt: 'Jeune femme...'
  })
  .select()
  .single();

// Appeler l'Edge Function
const { data, error } = await supabase.functions.invoke('generate-asset-image', {
  body: {
    asset_id: asset.id,
    prompt: asset.prompt,
    asset_type: asset.asset_type
  }
  // Le style est lu côté serveur depuis `projects`, jamais envoyé dans le body.
});

// Upload d'image
const { data, error } = await supabase.storage
  .from('dreamweave')
  .upload(`${userId}/projects/${projectId}/style/ref.png`, file);
```

---

*Dernière mise à jour : 28 juin 2026 (audit vérité code) — §3.0 : 14 Edge Functions confirmées (+ `_shared/`), correction `generate-scenario-ai` (Gemini 2.5-flash, fallback gemini-2.5-flash-lite ; Groq seulement pour `extract_events`) et `compose-chapter-layout` (groupement `panels_outline`, pas de lecture `scene_type`). §3.1 : suppression du paramètre fictif `image_view` (body réel `{asset_id, prompt, asset_type}`), sheet 2560×768, réservation crédit atomique, reset des vues legacy. §3.2 : ajout des vrais params (`scene_type`, `effects`, `shot_type`, `previous_image_url`), ownership sur `chapter_canvases`, plafond 1440px (snap 32), suppression de `context_chapter`. §3.3 : marquée superseded (compose-chapter-layout + generate-panel-image, export client-side). §2.4/§2.6/§5.2 : champs et paths alignés sur le schéma réel. Précédente (13 juin) : §2.6 `panels` → `chapter_canvases`. Antérieure (7 juin) : liste réelle des Edge Functions, FAL.ai FLUX.2 Pro / Edit, plans libre/createur/studio.*
