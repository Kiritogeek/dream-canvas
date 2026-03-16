# Modèle de Données — DreamWeave

> PostgreSQL (Supabase) : utilisateur → projets → style → assets → chapitres → panels.

---

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
                          │  panels_target_   │     INTEGER — nombre cible panels/chapitre
                          │   per_chapter     │
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
              │  prompt          │  │  chapter_number  │
              │  image_url       │  │  linked_scenario │
              │  image_url_      │  │   _chapter_id    │  FK → scenario_chapters.id
              │   profile_left   │  │  created_at      │
              │  image_url_      │  │  updated_at      │
              │   profile_right  │  └────────┬─────────┘
              │  image_url_back  │           │
              │  metadata (JSONB)│           │ 1:N
              │  created_at      │           ▼
              └──────────────────┘  ┌──────────────────┐
                                    │     panels       │
                                    │──────────────────│
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
                                    │  motion_lines    │  JSONB
                                    │  transition_     │  JSONB
                                    │   effects        │
                                    │  created_at      │
                                    └──────────────────┘

                          ┌──────────────────┐
                          │ scenario_chapters │
                          │──────────────────│
                          │  id (UUID, PK)    │
                          │  project_id (FK)  │──── → projects.id
                          │  user_id (FK)     │
                          │  chapter_number   │
                          │  title            │
                          │  content          │
                          │  panels_outline   │  JSONB — découpage panels
                          │  created_at       │
                          │  updated_at       │
                          └────────┬──────────┘
                                    │
                                    │ 1:N
                                    ▼
                          ┌──────────────────┐
                          │ scenario_versions │
                          │──────────────────│
                          │  id (UUID, PK)    │
                          │  project_id (FK)  │
                          │  scenario_        │
                          │   chapter_id (FK) │──── → scenario_chapters.id (nullable)
                          │  user_id (FK)     │
                          │  content          │
                          │  version_type     │  TEXT ('scenario'|'chapter')
                          │  status           │  TEXT ('pending'|'accepted'|'rejected')
                          │  created_at       │
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
| `style_image_urls` | `JSONB` | NULL | Liste d'URLs d'images de référence (array de strings) |
| `cover_url` | `TEXT` | NULL | URL de l'image de couverture |
| `panels_target_per_chapter` | `INTEGER` | NULL | Nombre cible de panels par chapitre (guidance longueur) |
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

---

### 2.6 `scenario_chapters`

> Chapitres de scénario (texte narratif). Un chapitre écrit = un chapitre webtoon. Implémenté en février 2026.

| Colonne | Type | Contraintes | Description |
|---------|------|------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `project_id` | `UUID` | NOT NULL, FK → projects.id | Projet parent |
| `user_id` | `UUID` | NOT NULL, FK → profiles.id | Propriétaire |
| `chapter_number` | `INTEGER` | NOT NULL | Numéro du chapitre (ordonné) |
| `title` | `TEXT` | NOT NULL | Titre du chapitre |
| `content` | `TEXT` | NULL | Contenu textuel du chapitre (scénario) |
| `panels_outline` | `JSONB` | NULL | Découpage en panels (liste + descriptions) — optionnel, à venir |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de création |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de mise à jour |

**Index** :
- `idx_scenario_chapters_project_id` sur `project_id`

**RLS** :
- SELECT : `auth.uid() = user_id`
- INSERT : `auth.uid() = user_id`
- UPDATE : `auth.uid() = user_id`
- DELETE : `auth.uid() = user_id`

**Note** : La section Scénario permet à l'utilisateur d'écrire ou d'importer un scénario (texte) et de créer des **chapitres** qui **correspondent** aux chapitres webtoon (un chapitre écrit = un chapitre webtoon). **IA Scénario** : un prompt = un chapitre généré ; l'utilisateur construit son histoire **chapitre par chapitre**. **IA Chapitre** : sur chaque chapitre, réécriture avec diff visuel. **Détection assets** : surbrillance des noms d'assets existants dans le texte, hover (HoverCard), clic (Dialog). **Éléments non créés** : détection IA, panneau dédié, création depuis scénario. Voir `Plan_Action_Developpement_Scénario.md` et `07_Roadmap_Produit.md` Phase 2.

---

### 2.7 `scenario_versions`

> Versions de scénario (ancienne vs nouvelle) pour le flux accepter/rejeter. Implémenté en février 2026.

| Colonne | Type | Contraintes | Description |
|---------|------|------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `project_id` | `UUID` | NOT NULL, FK → projects.id | Projet parent |
| `scenario_chapter_id` | `UUID` | NULL, FK → scenario_chapters.id | Chapitre concerné (NULL si version scénario entier) |
| `user_id` | `UUID` | NOT NULL, FK → profiles.id | Propriétaire |
| `content` | `TEXT` | NOT NULL | Contenu de la version |
| `version_type` | `TEXT` | NOT NULL | Type : `'scenario'` (IA Scénario) ou `'chapter'` (IA Chapitre) |
| `status` | `TEXT` | NOT NULL, DEFAULT 'pending' | Statut : `'pending'` (en attente), `'accepted'` (acceptée), `'rejected'` (rejetée) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de création |

**RLS** :
- SELECT : `auth.uid() = user_id`
- INSERT : `auth.uid() = user_id`
- UPDATE : `auth.uid() = user_id`
- DELETE : `auth.uid() = user_id`

**Note** : Persistance des versions pour le flux accepter/rejeter. **IA Chapitre** : comparaison ancienne vs nouvelle version avec diff visuel (texte supprimé en rouge, ajouté en vert). **IA Scénario** : texte proposé affiché tel quel, pas de diff.

---

**Note — Section Scénario (implémenté)** : ✅ **Complètement implémenté** (février 2026). Tables `scenario_chapters` et `scenario_versions` créées via migration `20260214200000_add_scenario_chapters.sql`. **À prévoir** : lors du renommage d'un asset, détecter les occurrences de l'ancien nom dans le `content` des chapitres et proposer/appliquer le remplacement — voir `Plan_Action_Developpement_Scénario.md` § 2.

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
| `synopsis` | `TEXT` | NULL | Résumé court du chapitre (référence). **Non utilisé dans les prompts d'image.** |
| `chapter_number` | `INTEGER` | NOT NULL | Numéro du chapitre (ordonné) |
| `linked_scenario_chapter_id` | `UUID` | NULL, FK → scenario_chapters.id | Chapitre de scénario lié (double visualisation en Édition de l'œuvre). |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de création |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de mise à jour |

**Index** :
- `idx_chapters_project_id` sur `project_id`
- `idx_chapters_linked_scenario` sur `linked_scenario_chapter_id` (WHERE NOT NULL), voir migration Phase 2.

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
| `speech_bubbles` | `JSONB` | NULL | Bulles de dialogue (structure riche) — prévu mais UI non implémentée |
| `background_color` ou `background_style` | `TEXT` / `JSONB` | NULL | Couleur de fond du panel (Menu Couleur) : couleur unie (hex) ou dégradé (JSON). Prévu pour mode Édition. |
| `effects` | `JSONB` | NULL | Bibliothèque d'effets : éléments visuels pour profondeur, douceur, émotion, vivant (positions, types, styles, intensité). Prévu pour mode Édition. |
| `motion_lines` | `JSONB` | NULL | Lignes de mouvement (effets visuels) — prévu mais non implémenté |
| `transition_effects` | `JSONB` | NULL | Effets de transition entre panels — prévu mais non implémenté |
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
**Édition des panels** (voir `Edition_Panel_Blocs_Bulles.md`, `Edition_Panel_Deux_Modes.md`) : **deux modes** — **Architecture** (ajout, position, dimensions des blocs ; placement par centre ; suppression au survol ; poignées avec hitbox élargie et hover) et **Édition** (prompt avec détection assets, bulles, effets, fond, texte). **Génération par bloc** : l'API reçoit les dimensions du bloc et une instruction « utiliser toute la place » ; images stockées sous `panels/{panel_id}/blocks/{block_id}.png`. Par défaut **aucun bloc** (`blocks: []`) ; l’utilisateur **ajoute des blocs par glisser-déposer** (bloc **500×500** déposé sur le panel), **déplace** les blocs par glisser-déposer, **édite** largeur/hauteur, puis saisit le prompt et génère l’image par bloc. Chaque image générée est une **illustration pleine** affichée **dans** le rectangle du bloc. **Les dimensions de l’image = dimensions du bloc** (width × height). **OBLIGATOIRE** : la génération d'image dans un bloc doit utiliser les dimensions de ce bloc pour l'espace de l'image. **La sélection d'assets (asset_refs)** est optionnelle mais recommandée pour cadrer la scène.

**Format de `speech_bubbles`** (prévu — format minimal et étendu) :

**Format minimal** (compatible écran chapitre actuel) :
```json
[
  {
    "id": "bubble_1",
    "type": "speech",
    "text": "Bonjour !",
    "character": "Luna",
    "position": { "x": 150, "y": 80 },
    "width": 160,
    "height": 56,
    "style": {
      "font": "Comic Sans",
      "size": 14,
      "color": "#000000"
    }
  }
]
```

**Types** : `"speech"` (parole), `"thought"` (pensée), `"shout"` (cri), `"whisper"` (chuchotement), `"narration"` (narration). Pour l’éditeur avancé, les types sont aussi exposés comme **dialogue** (= speech), **caption** (= narration).

**Format étendu** (éditeur avancé — `SpeechBubbleEditor`) : en plus des champs ci-dessus, chaque bulle peut comporter :
- `borderRadius` (0–50, en %)
- `tailX`, `tailY`, `tailBaseWidth` (queue : pointe et largeur de base)
- `bgFill` ("solid" | "gradient"), `bgColor`, `bgColor2`, `gradientDir` ("to bottom" | "to right" | "to bottom right" | "to bottom left")
- `borderColor`, `borderWidth`
- `textStyle` : `fontSize`, `fontWeight`, `fontStyle`, `textAlign`, `textTransform`, `letterSpacing`, `textShadow`, `textShadowColor`, `textShadowBlur`, `textColor`, `fontFamily`
- `spikes` (pour type shout, nombre de pointes 6–22)
- `connected` : sous-bulle connectée (objet avec `id`, `offsetX`, `offsetY`, `width`, `height`, `borderRadius`, `text`, `textStyle`, `bgFill`, `bgColor`, `bgColor2`, `gradientDir`, `borderColor`, `borderWidth`, `neckWidth`)

Exemple (bulle dialogue avec sous-bulle connectée) :
```json
{
  "id": "b1",
  "type": "speech",
  "text": "Tu viens ?",
  "position": { "x": 100, "y": 50 },
  "width": 240,
  "height": 200,
  "borderRadius": 50,
  "tailX": 120,
  "tailY": 260,
  "tailBaseWidth": 22,
  "bgFill": "solid",
  "bgColor": "#ffffff",
  "bgColor2": "#e8e8ff",
  "gradientDir": "to bottom",
  "borderColor": "#000000",
  "borderWidth": 3,
  "textStyle": { "fontSize": 15, "fontWeight": "bold", "textAlign": "center", "textColor": "#000000", "fontFamily": "'Segoe UI', system-ui, sans-serif" },
  "connected": {
    "id": "conn-xyz",
    "offsetX": 20,
    "offsetY": 80,
    "width": 120,
    "height": 60,
    "borderRadius": 50,
    "text": "Aah...",
    "textStyle": { "fontSize": 12, "textAlign": "center", "textColor": "#000000" },
    "bgFill": "solid",
    "bgColor": "#ffffff",
    "borderColor": "#000000",
    "borderWidth": 2.5,
    "neckWidth": 40
  }
}
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
                ├── {panel_id}.png                ← Image panel (mode panel entier)
                ├── {panel_id}/
                │   └── blocks/
                │       └── {block_id}.png        ← Image d'un bloc (génération par bloc)
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

---

*Dernière mise à jour : 17 février 2026 (Audit : ajout tables scenario_chapters et scenario_versions dans ERD, colonne panels_target_per_chapter dans projects, colonnes motion_lines et transition_effects dans panels)*
