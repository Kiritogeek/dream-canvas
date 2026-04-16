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

> Supprime en cascade les assets, chapitres et panels associés.

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
    "image_url_profile_left": "https://...profile_left.png",
    "image_url_profile_right": null,
    "image_url_back": null,
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

### 2.6 Panels

#### Lister les panels d'un chapitre

```
GET /rest/v1/panels?chapter_id=eq.{chapter_id}&select=*&order=panel_number.asc
```

#### Créer un panel

```
POST /rest/v1/panels
Content-Type: application/json

{
  "user_id": "{user_id}",
  "chapter_id": "{chapter_id}",
  "panel_number": 1,
  "prompt": "Vue large de la ville sous l'orage, Luna debout sur un toit...",
  "dialogue": "C'est quoi cette lumière ?",
  "narration": "Cette nuit-là, tout a changé."
}
```

#### Mettre à jour un panel

```
PATCH /rest/v1/panels?id=eq.{panel_id}
Content-Type: application/json

{
  "prompt": "Gros plan sur le visage de Luna, éclairs se reflétant dans ses yeux...",
  "dialogue": "Qu'est-ce qui m'arrive ?",
  "speech_bubbles": [
    {
      "id": "b1",
      "type": "speech",
      "text": "Qu'est-ce qui m'arrive ?",
      "character": "Luna",
      "position": { "x": 200, "y": 100 }
    }
  ]
}
```

#### Supprimer un panel

```
DELETE /rest/v1/panels?id=eq.{panel_id}
```

---

## 3. Edge Functions (Custom API)

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
  "asset_type": "character",
  "image_view": "front"
}
```

**Paramètres** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `asset_id` | `string (UUID)` | Oui | ID de l'asset à mettre à jour |
| `prompt` | `string` | Oui | Description de l'asset |
| `asset_type` | `string` | Oui | `"character"`, `"background"`, ou `"object"` |
| `image_view` | `string` | Non | Vue à générer : `"front"`, `"profile_left"`, `"profile_right"`, `"back"`. Défaut : `"front"` |

**Réponse succès** (200) :
```json
{
  "image_url": "https://xxx.supabase.co/storage/v1/object/public/dreamweave/.../asset.png",
  "image_url_sheet": "https://xxx.supabase.co/storage/v1/object/public/dreamweave/.../asset_sheet.png",
  "image_view": "front",
  "update_field": "image_url",
  "model": "flux-2-pro-edit",
  "plan": "pro"
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
4. Construire le prompt enrichi :
   a. Prompt système (selon asset_type)
   b. + style_template (lu depuis `projects`) et/ou style images (si disponibles)
   c. + instructions de vue (si image_view != "front")
   d. + prompt utilisateur
5. Générer et stocker la sheet composite :
   - `character` : 2x2 vignettes (face + profils + dos)
   - `background` / `object` : 1 tuile
   - champ BDD : `assets.image_url_sheet`
6. Générer la vue demandée :
   - Pro : édition à partir de `image_url_sheet` via FAL image edit
   - Free : fallback text-to-image
7. Mettre à jour l'asset en BDD (vue demandée + `image_url_sheet`)
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
  "context_chapter": "Lieu : toit. Scène : nuit d'orage. Personnages : Luna.",
  "block_asset_names": ["Luna", "Forêt magique"],
  "block_asset_image_urls": [
    "https://xxx.supabase.co/storage/v1/object/public/dreamweave/.../luna_sheet.png",
    "https://xxx.supabase.co/storage/v1/object/public/dreamweave/.../foret_sheet.png"
  ]
}
```

**Paramètres** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `panel_id` | `string (UUID)` | Oui | ID du panel |
| `block_id` | `string (UUID)` | Oui | ID du bloc dans le layout |
| `width` | `number` | Oui | Largeur du bloc (px) ; plafonnée à 1024 côté serveur |
| `height` | `number` | Oui | Hauteur du bloc (px) ; plafonnée à 1024 côté serveur |
| `prompt` | `string` | Oui | Description de l'illustration pour ce bloc |
| `block_asset_names` | `string[]` | Non | Noms des assets du bloc (utilisés dans le prompt pour guider les éléments à inclure) |
| `block_asset_image_urls` | `string[]` | Non | URLs des “sheets” d’assets. En plan Pro, utilisées comme `image_urls` dans FAL image edit pour conserver la cohérence identitaire. En Free, ignorées. |
| `context_chapter` | `string` | Non | Contexte du chapitre (lieu, scène, personnages) pour cohérence visuelle. Envoyé par le frontend depuis le découpage (`panels_outline[].context`) ou la description du panel. |

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
2. Vérifier que le panel appartient à l'utilisateur (table `panels`)
3. Récupérer `project_id` via le chapitre du panel (pour le chemin Storage)
4. Construire le prompt : template de style du projet (depuis `projects`) + contexte chapitre + noms des assets + instruction « remplir tout le cadre » + prompt du bloc
5. Génération image :
   - Pro + `block_asset_image_urls` fournis : FAL image edit avec `image_urls = block_asset_image_urls` (les sheets servent d'identité visuelle)
   - Free : fallback text-to-image (les `block_asset_image_urls` sont ignorées)
6. Télécharger l'image et l'uploader dans Storage : `{user_id}/projects/{project_id}/panels/{panel_id}/blocks/{block_id}.png`
7. Retourner l'URL publique (le frontend met à jour `layout.blocks[].image_url`)

**Secret** : `FAL_API_KEY` (Supabase Edge Functions → Secrets). Config : `verify_jwt = false` dans `config.toml` ; la fonction vérifie le JWT via Supabase Auth.

---

### 3.3 Edge Functions futures (planifiées)

#### `generate-chapter-panels` (Phase 2)

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

#### `generate-dialogues` (Phase 2)

```
POST /functions/v1/generate-dialogues

{
  "chapter_id": "uuid",
  "synopsis": "...",
  "characters": ["Luna", "Marc"],
  "tone": "dramatique"
}
```

#### `export-chapter` (Phase 3)

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
| **Base URL** | `https://api.fal.ai/v1` |
| **Modèle** | `black-forest-labs/flux-2-pro` |
| **Auth** | API Key (header `Authorization: Bearer {FAL_API_KEY}`) |

### 4.2 Appel de génération d'image

```
POST https://api.fal.ai/v1/images/generations

Headers:
  Authorization: Bearer {FAL_API_KEY}
  Content-Type: application/json

Body:
{
  "model": "black-forest-labs/flux-2-pro",
  "prompt": "...(prompt enrichi)...",
  "response_format": "b64_json",
  "width": 1024,
  "height": 1024,
  "num_inference_steps": 4
}
```

**Réponse** :
```json
{
  "data": [
    {
      "b64_json": "/9j/4AAQSkZJRg..."
    }
  ]
}
```

### 4.3 Limites et tarification

| Paramètre | Valeur |
|-----------|--------|
| **Résolution max** | 1024×1024 |
| **Rate limit** | Variable selon le plan FAL.ai |
| **Coût estimé** | ~0,01-0,03 $/image |
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

**Format du path** : `{user_id}/projects/{project_id}/assets/{asset_id}_{view}.png`

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
    style_template: project.style_template,
    style_image_urls: project.style_image_urls,
    asset_type: asset.asset_type,
    image_view: 'front'
  }
});

// Upload d'image
const { data, error } = await supabase.storage
  .from('dreamweave')
  .upload(`${userId}/projects/${projectId}/style/ref.png`, file);
```

---

*Dernière mise à jour : 17 février 2026 (Audit : ajout Edge Functions generate-scenario-ai et generate-panel-image, documentation complète)*
