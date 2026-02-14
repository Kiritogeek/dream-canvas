# Modèle de Données — DreamWeave

## 1. Vue d'ensemble

Le modèle de données de DreamWeave est construit sur **PostgreSQL** via Supabase. Il est conçu pour supporter le workflow de création de webtoons : utilisateur → projets → style → assets → chapitres → panels.

### Diagramme Entité-Relation (ERD)

```
                          ┌──────────────────┐
                          │    auth.users     │
                          │  (Supabase Auth)  │
                          │──────────────────│
                          │  id (UUID, PK)    │
                          │  email            │
                          │  ...              │
                          └────────┬─────────┘
                                   │
                          Trigger: on_auth_user_created
                                   │
                                   ▼
                          ┌──────────────────┐
                          │    profiles       │
                          │──────────────────│
                          │  id (UUID, PK/FK)│◄─── Même ID que auth.users
                          │  display_name    │
                          │  avatar_url      │
                          │  plan            │     TEXT ('free'|'pro'), défaut 'free'
                          │  created_at      │
                          │  updated_at      │
                          └────────┬─────────┘
                                   │
                                   │ 1:N
                                   ▼
                          ┌──────────────────┐
                          │    projects       │
                          │──────────────────│
                          │  id (UUID, PK)    │
                          │  user_id (FK)     │──── → profiles.id
                          │  title            │
                          │  description      │
                          │  style_template   │     TEXT — description du style
                          │  style_image_urls │     JSONB — URLs des images de réf.
                          │  cover_url        │     TEXT — URL de la couverture
                          │  created_at       │
                          │  updated_at       │
                          └──┬────────────┬───┘
                             │            │
                    1:N      │            │      1:N
                             ▼            ▼
              ┌──────────────────┐  ┌──────────────────┐
              │     assets       │  │    chapters      │
              │──────────────────│  │──────────────────│
              │  id (UUID, PK)   │  │  id (UUID, PK)   │
              │  user_id (FK)    │  │  user_id (FK)    │
              │  project_id (FK) │  │  project_id (FK) │
              │  name            │  │  title           │
              │  asset_type      │  │  synopsis        │
              │  prompt          │  │  scenario        │
              │  ...             │  │  creation_mode   │
              │                  │  │  chapter_number  │
              │  image_url       │  │  created_at      │
              │  image_url_      │  │  updated_at      │
              │   profile_left   │  └────────┬─────────┘
              │  image_url_      │           │
              │   profile_right  │           │ 1:N
              │  image_url_back  │           ▼
              │  metadata (JSONB)│  ┌──────────────────┐
              │  created_at      │  │     panels       │
              └──────────────────┘  │──────────────────│
                                    │  id (UUID, PK)   │
                                    │  user_id (FK)    │
                                    │  chapter_id (FK) │
                                    │  panel_number    │
                                    │  prompt          │
                                    │  image_url       │  (mode Auto) ou images dans layout.blocks
                                    │  layout          │  JSONB — blocs (mode Structuré)
                                    │  dialogue        │
                                    │  narration       │
                                    │  speech_bubbles  │  JSONB
                                    │  created_at      │
                                    └──────────────────┘

                          ┌──────────────────┐
                          │      usage        │
                          │──────────────────│
                          │  id (UUID, PK)    │
                          │  user_id (FK)     │──── → auth.users.id
                          │  action           │     TEXT, défaut 'image_generation'
                          │  created_at       │
                          └──────────────────┘
```

---

## 2. Tables détaillées

### 2.1 `profiles`

> Profil utilisateur, créé automatiquement à l'inscription via un trigger.

| Colonne | Type | Contraintes | Description |
|---------|------|------------|-------------|
| `id` | `UUID` | PK, FK → auth.users.id | Identifiant unique (= ID auth) |
| `display_name` | `TEXT` | NULL | Nom d'affichage |
| `avatar_url` | `TEXT` | NULL | URL de l'avatar |
| `plan` | `TEXT` | NOT NULL, DEFAULT 'free', CHECK ('free', 'pro') | Plan tarifaire actif |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de création |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de mise à jour |

**Index** : `idx_profiles_plan` sur `plan`

**Trigger** : `on_auth_user_created` → `handle_new_user()`
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**RLS** :
- SELECT : `auth.uid() = id`
- UPDATE : `auth.uid() = id`

---

### 2.2 `projects`

> Projet de webtoon contenant le style, les assets et les chapitres.

| Colonne | Type | Contraintes | Description |
|---------|------|------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `user_id` | `UUID` | NOT NULL, FK → profiles.id | Propriétaire |
| `title` | `TEXT` | NOT NULL | Titre du projet |
| `description` | `TEXT` | NULL | Description du projet |
| `style_template` | `TEXT` | NULL | Template de style texte (prompt IA) |
| `style_image_urls` | `JSONB` | NULL | Liste d'URLs d'images de référence |
| `cover_url` | `TEXT` | NULL | URL de l'image de couverture |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de création |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de mise à jour |

**Index** :
- `idx_projects_user_id` sur `user_id`

**Format de `style_image_urls`** :
```json
[
  "https://xxx.supabase.co/storage/v1/object/public/dreamweave/user_id/projects/project_id/style/ref1.png",
  "https://xxx.supabase.co/storage/v1/object/public/dreamweave/user_id/projects/project_id/style/ref2.png"
]
```

**RLS** :
- SELECT : `auth.uid() = user_id`
- INSERT : `auth.uid() = user_id`
- UPDATE : `auth.uid() = user_id`
- DELETE : `auth.uid() = user_id`

**Note — Section Scénario (à préciser)** : La section « Scénario » permet à l'utilisateur d'écrire ou d'importer un scénario (texte) et de créer des **chapitres de scénario** (découpage narratif, **dissociés** des chapitres visuels `chapters`). Une **IA LLM scénariste** (agent avec system prompt dédié) aide à construire l'histoire. Le modèle pour stocker le scénario et ces chapitres de scénario reste à définir : ex. `projects.scenario` (TEXT) + table `scenario_chapters`, ou scénario avec JSON de découpage. **BDD — Scénarios approuvés** : prévoir la persistance de **tout ce qui a été approuvé** par l'utilisateur (versions de scénario, chapitres de scénario validés) ; historique / versions selon roadmap. Voir `11_Rapport_Chapitres_Flux_Blocs_Scenario.md` section 6 et `07_Roadmap_Produit.md` Phase 2.

---

### 2.3 `assets`

> Éléments visuels réutilisables : personnages, décors, objets.

| Colonne | Type | Contraintes | Description |
|---------|------|------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `user_id` | `UUID` | NOT NULL, FK → profiles.id | Propriétaire |
| `project_id` | `UUID` | NOT NULL, FK → projects.id | Projet parent |
| `name` | `TEXT` | NOT NULL | Nom de l'asset |
| `asset_type` | `asset_type` | NOT NULL | Type : 'character', 'background', 'object' |
| `prompt` | `TEXT` | NULL | Description / prompt pour la génération IA |
| `image_url` | `TEXT` | NULL | URL de l'image principale (vue de face) |
| `image_url_profile_left` | `TEXT` | NULL | URL de la vue profil gauche |
| `image_url_profile_right` | `TEXT` | NULL | URL de la vue profil droit |
| `image_url_back` | `TEXT` | NULL | URL de la vue de dos |
| `metadata` | `JSONB` | NULL | Métadonnées additionnelles |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de création |

**Enum `asset_type`** :
```sql
CREATE TYPE asset_type AS ENUM ('character', 'background', 'object');
```

**Index** :
- `idx_assets_project_id` sur `project_id`
- `idx_assets_user_id` sur `user_id`

**RLS** :
- SELECT : `auth.uid() = user_id`
- INSERT : `auth.uid() = user_id`
- UPDATE : `auth.uid() = user_id`
- DELETE : `auth.uid() = user_id`

---

### 2.4 `chapters`

> Chapitres d'un projet. Contient synopsis et optionnellement scénario. Deux modes de création : `automatic` (découpage IA scénario → panels ; **génération panel par panel**, pas tout le chapitre d'un coup) ou `structured` (blocs définis à la main). Le **scénario/synopsis n'est jamais injecté dans le prompt de génération d'image** : le prompt = style + assets sélectionnés + courte description du panel. La **sélection des assets par l'utilisateur** est impérative dans les deux flux (chapitre en mode Auto, par bloc en mode Structuré).

| Colonne | Type | Contraintes | Description |
|---------|------|------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `user_id` | `UUID` | NOT NULL, FK → profiles.id | Propriétaire |
| `project_id` | `UUID` | NOT NULL, FK → projects.id | Projet parent |
| `title` | `TEXT` | NOT NULL | Titre du chapitre |
| `synopsis` | `TEXT` | NULL | Résumé court du chapitre (référence ; découpage IA si pas de scénario). **Non utilisé dans les prompts d'image.** |
| `scenario` | `TEXT` | NULL | Scénario détaillé (optionnel). Utilisé **uniquement pour le découpage IA** (scénario → chapitres → panels). **Jamais injecté dans le prompt de génération d'image.** |
| `creation_mode` | `TEXT` | NULL | `'automatic'` \| `'structured'` — mode de création du chapitre |
| `chapter_number` | `INTEGER` | NOT NULL | Numéro du chapitre (ordonné) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de création |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de mise à jour |

**Index** :
- `idx_chapters_project_id` sur `project_id`

**RLS** :
- SELECT : `auth.uid() = user_id`
- INSERT : `auth.uid() = user_id`
- UPDATE : `auth.uid() = user_id`
- DELETE : `auth.uid() = user_id`

---

### 2.5 `panels`

> Panels composant un chapitre. En **mode Automatique** : un panel = une **image pleine** (illustration, pas de cases dans l’image). En **mode Structuré** : un panel contient des **blocs** (layout) ; chaque bloc a sa propre image pleine, affichée dans le bloc.

| Colonne | Type | Contraintes | Description |
|---------|------|------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `user_id` | `UUID` | NOT NULL, FK → profiles.id | Propriétaire |
| `chapter_id` | `UUID` | NOT NULL, FK → chapters.id | Chapitre parent |
| `panel_number` | `INTEGER` | NOT NULL | Numéro du panel (ordre d'affichage) |
| `prompt` | `TEXT` | NULL | Description / prompt pour la génération (mode Auto : 1 prompt par panel) |
| `image_url` | `TEXT` | NULL | URL de l'image du panel (mode Auto) ; NULL en mode Structuré si les images sont sur les blocs |
| `layout` | `JSONB` | NULL | En mode Structuré : définition des blocs (position, taille, prompt, refs assets, image_url par bloc). Voir format ci-dessous. |
| `dialogue` | `TEXT` | NULL | Texte de dialogue (simple) |
| `narration` | `TEXT` | NULL | Texte de narration |
| `speech_bubbles` | `JSONB` | NULL | Bulles de dialogue (structure riche) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de création |

**Format de `layout`** (mode Structuré — blocs) :
```json
{
  "blocks": [
    {
      "id": "uuid_ou_identifiant_stable",
      "x": 0,
      "y": 0,
      "width": 400,
      "height": 600,
      "prompt": "Luna entre dans la cafétéria, décor 'ville la nuit'.",
      "asset_refs": ["asset_uuid_1", "asset_uuid_2"],
      "image_url": "https://... (image pleine générée pour ce bloc)"
    }
  ]
}
```
Chaque image générée pour un bloc est une **illustration pleine** ; elle est affichée **dans** le rectangle du bloc (conteneur de mise en page). **La sélection d'assets par l'utilisateur (asset_refs) est impérative** pour la génération : elle cadre la scène et permet à l'IA de comprendre les éléments (personnages, décors, objets) à mettre dans le chapitre.

**Format de `speech_bubbles`** (prévu) :
```json
[
  {
    "id": "bubble_1",
    "type": "speech",        // "speech" | "thought" | "shout" | "whisper"
    "text": "Bonjour !",
    "character": "Luna",
    "position": { "x": 150, "y": 80 },
    "style": {
      "font": "Comic Sans",
      "size": 14,
      "color": "#000000"
    }
  },
  {
    "id": "bubble_2",
    "type": "thought",
    "text": "Que fait-il ici ?",
    "character": "Marc",
    "position": { "x": 300, "y": 200 }
  }
]
```

**Index** :
- `idx_panels_chapter_id` sur `chapter_id`

**RLS** :
- SELECT : `auth.uid() = user_id`
- INSERT : `auth.uid() = user_id`
- UPDATE : `auth.uid() = user_id`
- DELETE : `auth.uid() = user_id`

---

### 2.6 `usage`

> Suivi des générations d'images par utilisateur. Chaque ligne = une génération facturée. Le comptage mensuel est fait via une requête filtrée sur `created_at >= début du mois`.

| Colonne | Type | Contraintes | Description |
|---------|------|------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `user_id` | `UUID` | NOT NULL, FK → auth.users.id | Utilisateur ayant généré |
| `action` | `TEXT` | NOT NULL, DEFAULT 'image_generation' | Type d'action facturée |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de la génération |

**Index** :
- `idx_usage_user_id` sur `user_id`
- `idx_usage_created_at` sur `created_at`

**RLS** :
- SELECT : `auth.uid() = user_id`
- INSERT : via service_role (Edge Function uniquement)

**Requête de comptage mensuel** :
```sql
SELECT COUNT(*) FROM usage
WHERE user_id = $1
  AND action = 'image_generation'
  AND created_at >= date_trunc('month', now());
```

---

## 3. Storage (Supabase Storage)

### 3.1 Bucket : `dreamweave`

| Propriété | Valeur |
|-----------|--------|
| **Nom** | `dreamweave` |
| **Visibilité** | Public |
| **Taille max fichier** | 10 MB |
| **Types MIME** | `image/png`, `image/jpeg`, `image/webp` |

### 3.2 Structure des dossiers

```
dreamweave/
└── {user_id}/
    └── projects/
        └── {project_id}/
            ├── style/
            │   ├── ref_1_{timestamp}.png        ← Images de référence
            │   ├── ref_2_{timestamp}.png
            │   └── ref_3_{timestamp}.png
            ├── assets/
            │   ├── {asset_id}_front.png          ← Vue de face
            │   ├── {asset_id}_profile_left.png   ← Profil gauche
            │   ├── {asset_id}_profile_right.png  ← Profil droit
            │   └── {asset_id}_back.png           ← Vue de dos
            └── panels/
                ├── {panel_id}.png                ← Images des panels
                └── ...
```

### 3.3 Politiques de sécurité Storage

```sql
-- Upload : seul le propriétaire peut uploader dans son dossier
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Lecture : public (les images sont accessibles via URL publique)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'dreamweave');

-- Suppression : seul le propriétaire peut supprimer
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 4. Relations et contraintes

### 4.1 Clés étrangères

| Table source | Colonne | Table cible | Action ON DELETE |
|-------------|---------|------------|-----------------|
| `profiles` | `id` | `auth.users` | CASCADE |
| `projects` | `user_id` | `profiles` | CASCADE |
| `assets` | `user_id` | `profiles` | CASCADE |
| `assets` | `project_id` | `projects` | CASCADE |
| `chapters` | `user_id` | `profiles` | CASCADE |
| `chapters` | `project_id` | `projects` | CASCADE |
| `panels` | `user_id` | `profiles` | CASCADE |
| `panels` | `chapter_id` | `chapters` | CASCADE |

### 4.2 Cascade de suppression

```
Suppression d'un utilisateur (auth.users)
    └── Supprime profile
        └── Supprime tous les projects
            ├── Supprime tous les assets du projet
            └── Supprime tous les chapters du projet
                └── Supprime tous les panels du chapitre

Suppression d'un projet
    ├── Supprime tous les assets
    └── Supprime tous les chapters
        └── Supprime tous les panels

Suppression d'un chapitre
    └── Supprime tous les panels
```

> **Note** : La suppression des fichiers Storage n'est pas automatique (pas de trigger). Il faudra implémenter un nettoyage côté application ou via une Edge Function de cleanup.

---

## 5. Évolutions prévues du modèle

### 5.1 Court terme

| Modification | Table | Description |
|-------------|-------|-------------|
| Ajout `status` sur `assets` | `assets` | `enum ('pending', 'generating', 'ready', 'error')` |
| Ajout `generation_count` sur `assets` | `assets` | Compteur de régénérations |
| Ajout `status` sur `panels` | `panels` | `enum ('pending', 'generating', 'ready', 'error')` |

### 5.2 Moyen terme

| Modification | Table | Description |
|-------------|-------|-------------|
| Nouvelle table `styles` | `styles` | Marketplace de styles (name, template, images, author, price, rating) |
| Nouvelle table `collaborators` | `collaborators` | Partage de projet (project_id, user_id, role) |
| Nouvelle table `comments` | `comments` | Commentaires sur les panels |
| Ajout `subscription_tier` sur `profiles` | `profiles` | Plan d'abonnement (free, pro, team) |
| Nouvelle table `usage` | `usage` | Compteur de générations par mois |

### 5.3 Long terme

| Modification | Table | Description |
|-------------|-------|-------------|
| Nouvelle table `publications` | `publications` | Liens de publication externe |
| Nouvelle table `analytics` | `analytics` | Statistiques de lecture |
| Nouvelle table `notifications` | `notifications` | Notifications utilisateur |
