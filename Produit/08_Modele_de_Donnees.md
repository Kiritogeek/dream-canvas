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
                          │  id (UUID, PK)   │     gen_random_uuid() (≠ ID auth)
                          │  user_id (UNIQUE)│◄─── → auth.users.id
                          │  display_name    │
                          │  avatar_url      │
                          │  plan            │     TEXT ('libre'|'createur'|'studio'), défaut 'libre'
                          │  created_at      │
                          │  updated_at      │
                          └────────┬─────────┘
                                   │
                                   │ 1:N (via user_id → auth.users)
                                   ▼
                          ┌──────────────────┐
                          │    projects       │
                          │──────────────────│
                          │  id (UUID, PK)    │
                          │  user_id (FK)     │──── → auth.users.id
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
                                    │ chapter_canvases │  ex-panels (20260424)
                                    │──────────────────│
                                    │  id (UUID, PK)   │
                                    │  user_id (FK)    │  → auth.users.id
                                    │  chapter_id (FK) │  UNIQUE: 1/chapitre
                                    │  panel_number    │
                                    │  layout          │  JSONB {blocks[], panelHeight}
                                    │  speech_bubbles  │  JSONB
                                    │  color_blocks    │  JSONB
                                    │  background_style │  JSONB
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
                          │  version_type     │  TEXT ('full_scenario'|'chapter')
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
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Identifiant interne du profil (≠ ID auth) |
| `user_id` | `UUID` | NOT NULL, UNIQUE, FK → auth.users.id | Lien vers le compte Auth (clé d'appartenance) |
| `display_name` | `TEXT` | NULL | Nom d'affichage |
| `avatar_url` | `TEXT` | NULL | URL de l'avatar |
| `plan` | `TEXT` | NOT NULL, DEFAULT 'libre', CHECK ('libre', 'createur', 'studio') | Plan tarifaire actif (renommé free→libre, pro→createur + ajout studio, migration 20260503) |
| `email` | `TEXT` | NULL | Email de l'utilisateur (migration 20260217) |
| `stripe_customer_id` | `TEXT` | NULL | ID client Stripe (abonnement) |
| `billing_period_start` | `TIMESTAMPTZ` | NULL | Début de période de facturation (reset quota, migration 20260503) |
| `excluded_from_stats` | `BOOLEAN` | DEFAULT false | Exclut le compte des statistiques produit (migration 20260515) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de création |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de mise à jour |

**Index** : `idx_profiles_plan` sur `plan`

**Trigger** : `on_auth_user_created` → `handle_new_user()`
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
```

**RLS** :
- SELECT : `auth.uid() = user_id`
- UPDATE : `auth.uid() = user_id`

---

### 2.2 `projects`

> Projet de webtoon contenant le style, les assets et les chapitres.

| Colonne | Type | Contraintes | Description |
|---------|------|------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `user_id` | `UUID` | NOT NULL, FK → auth.users.id | Propriétaire |
| `title` | `TEXT` | NOT NULL | Titre du projet |
| `description` | `TEXT` | NULL | Description du projet |
| `style_template` | `TEXT` | NULL | Template de style texte (prompt IA). Peut être généré depuis un système preset (style principal + sous-style + précisions) tout en restant une chaîne texte compatible. |
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

**Note produit (compatibilité)** :
- Le système de style peut évoluer côté UI (sélection de style principal + sous-style) **sans migration BDD**.
- La sortie persistée reste `style_template` (texte), pour ne pas impacter les appels existants des Edge Functions.

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
| `user_id` | `UUID` | NOT NULL, FK → auth.users.id | Propriétaire |
| `chapter_number` | `INTEGER` | NOT NULL | Numéro du chapitre (ordonné) |
| `title` | `TEXT` | NOT NULL | Titre du chapitre |
| `content` | `TEXT` | NULL | Contenu textuel du chapitre (scénario) |
| `panels_outline` | `JSONB` | NULL | Découpage en panels (liste + descriptions). Alimente le mode Auto (`compose-chapter-layout`). |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de création |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de mise à jour |

**Index** :
- `idx_scenario_chapters_project` sur `(project_id, chapter_number)`

**Colonnes ajoutées depuis** : `panels_outline`, `ai_summary`, `locked_blocks` (JSONB), `word_mappings` (JSONB, 20260421), `narramind_anomalies` (JSONB, toujours `[]` après run NarraMind), `narramind_checked_at` (20260430), `validated` / `validated_at` (20260524), `chapter_assets` (JSONB, 20260531).

**RLS** :
- SELECT : `auth.uid() = user_id`
- INSERT : `auth.uid() = user_id`
- UPDATE : `auth.uid() = user_id` (durci en 20260627 avec `WITH CHECK (auth.uid() = user_id)` — empêche la réassignation de `user_id`)
- DELETE : `auth.uid() = user_id`

**Note** : La section Scénario permet à l'utilisateur d'écrire ou d'importer un scénario (texte) et de créer des **chapitres** qui **correspondent** aux chapitres webtoon (un chapitre écrit = un chapitre webtoon). **IA Scénario** : un prompt = un chapitre généré ; l'utilisateur construit son histoire **chapitre par chapitre**. **IA Chapitre** : sur chaque chapitre, réécriture avec diff visuel. **Détection assets** : surbrillance des noms d'assets existants dans le texte, hover (HoverCard), clic (Dialog). **Éléments non créés** : détection IA, panneau dédié, création depuis scénario. Voir `Plan_Action_Developpement_Scénario.md` et `07_Roadmap_Produit.md` Phase 2.

---

### 2.7 `scenario_versions`

> Versions de scénario (ancienne vs nouvelle) pour le flux accepter/rejeter. Implémenté en février 2026.

| Colonne | Type | Contraintes | Description |
|---------|------|------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `project_id` | `UUID` | NOT NULL, FK → projects.id | Projet parent |
| `scenario_chapter_id` | `UUID` | NULL, FK → scenario_chapters.id (ON DELETE CASCADE) | Chapitre concerné (NULL si version scénario entier) |
| `user_id` | `UUID` | NOT NULL, FK → auth.users.id | Propriétaire |
| `content` | `TEXT` | NOT NULL | Contenu de la version |
| `version_type` | `TEXT` | NOT NULL, CHECK ('full_scenario', 'chapter') | Type : `'full_scenario'` (IA Scénario) ou `'chapter'` (IA Chapitre) |
| `status` | `TEXT` | NOT NULL, DEFAULT 'pending' | Statut : `'pending'` (en attente), `'accepted'` (acceptée), `'rejected'` (rejetée) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de création |

**RLS** :
- SELECT : `auth.uid() = user_id`
- INSERT : `auth.uid() = user_id`
- UPDATE : `auth.uid() = user_id`
- DELETE : `auth.uid() = user_id`

**Note** : Persistance des versions pour le flux accepter/rejeter. **IA Chapitre** : comparaison ancienne vs nouvelle version avec diff visuel (texte supprimé en rouge, ajouté en vert). **IA Scénario** : texte proposé affiché tel quel, pas de diff.

> ⚠️ **Couche applicative retirée** : la table `scenario_versions` existe toujours en BDD (types auto-générés), mais le slice applicatif (hooks / services) a été supprimé lors du nettoyage code mort (commit 298507e, 2026-06). Le flux de versions n'est plus câblé côté client à ce jour.

---

**Note — Section Scénario (implémenté)** : ✅ **Complètement implémenté** (février 2026). Tables `scenario_chapters` et `scenario_versions` créées via migration `20260214200000_add_scenario_chapters.sql`. **À prévoir** : lors du renommage d'un asset, détecter les occurrences de l'ancien nom dans le `content` des chapitres et proposer/appliquer le remplacement — voir `Plan_Action_Developpement_Scénario.md` § 2.

---

### 2.3 `assets`

> Éléments visuels réutilisables : personnages, décors, objets.

| Colonne | Type | Contraintes | Description |
|---------|------|------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `user_id` | `UUID` | NOT NULL, FK → auth.users.id | Propriétaire |
| `project_id` | `UUID` | NOT NULL, FK → projects.id | Projet parent |
| `name` | `TEXT` | NOT NULL | Nom de l'asset |
| `asset_type` | `asset_type` | NOT NULL | Type : 'character', 'background', 'object' |
| `prompt` | `TEXT` | NULL | Description / prompt pour la génération IA |
| `image_url` | `TEXT` | NULL | URL de l'image principale (vue de face) |
| `image_url_sheet` | `TEXT` | NULL | URL de la fiche composite (sheet) de l'asset, utilisée comme référence identitaire pour les générations de panels (carte face+profils+dos pour `character`, tuile unique pour `background` / `object`). |
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
- `idx_assets_project` sur `project_id` (migration 20260627)

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
| `user_id` | `UUID` | NOT NULL, FK → auth.users.id | Propriétaire |
| `project_id` | `UUID` | NOT NULL, FK → projects.id | Projet parent |
| `title` | `TEXT` | NOT NULL | Titre du chapitre |
| `synopsis` | `TEXT` | NULL | Résumé court du chapitre (référence). **Non utilisé dans les prompts d'image.** |
| `chapter_number` | `INTEGER` | NOT NULL | Numéro du chapitre (ordonné) |
| `linked_scenario_chapter_id` | `UUID` | NULL, FK → scenario_chapters.id | Chapitre de scénario lié (double visualisation en Édition de l'œuvre). |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de création |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Date de mise à jour |

**Index** :
- `idx_chapters_project` sur `project_id` (migration 20260627)
- `idx_chapters_linked_scenario` sur `linked_scenario_chapter_id` (WHERE NOT NULL), voir migration Phase 2.

**RLS** :
- SELECT : `auth.uid() = user_id`
- INSERT : `auth.uid() = user_id`
- UPDATE : `auth.uid() = user_id`
- DELETE : `auth.uid() = user_id`

---

### 2.5 `panels` → renommée `chapter_canvases`

> ⚠️ **Renommage (migration 20260424)** : la table `panels` a été renommée en **`chapter_canvases`**. Le canvas représente désormais **le chapitre entier en scroll vertical** (800 px de large, jusqu'à ~100 000 px de haut) : il y a **toujours une seule ligne par chapitre** (invariant garanti par l'`UNIQUE INDEX idx_chapter_canvases_one_per_chapter`, migration 20260627140000). La description ci-dessous décrit l'ancien modèle « un panel = une ligne » conservé pour référence historique.

> **Colonnes actuelles de `chapter_canvases`** : `id`, `user_id`, `chapter_id`, `panel_number`, `layout` (JSONB `{blocks[], panelHeight}`), `speech_bubbles` (JSONB, bulles **implémentées**), `color_blocks` (JSONB, blocs de couleur — migration 20260221), `background_style` (JSONB, migration 20260218), `created_at`. La migration de renommage (20260424) a **supprimé** les colonnes mortes `dialogue`, `narration`, `prompt`, `image_url`, `transition_effects`, `motion_lines` (jamais lues/écrites par l'UI). Les colonnes `effects`, `motion_lines` et `transition_effects` listées dans le tableau historique ci-dessous **n'existent plus** (ou n'ont jamais existé pour `effects`).

> Panels composant un chapitre. En **mode Automatique** : un panel = une **image pleine** (illustration, pas de cases dans l’image). En **mode Structuré** : un panel contient des **blocs** (layout) ; chaque bloc a sa propre image pleine, affichée dans le bloc.

| Colonne | Type | Contraintes | Description |
|---------|------|------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `user_id` | `UUID` | NOT NULL, FK → auth.users.id | Propriétaire |
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
**Édition des panels** (voir `Edition-Oeuvre.md`, Parties III–IV) : **deux modes** — **Architecture** (ajout, position, dimensions des blocs ; placement par centre ; suppression au survol ; poignées avec hitbox élargie et hover) et **Édition** (prompt avec détection assets, bulles, effets, fond, texte). **Génération par bloc** : l'API reçoit les dimensions du bloc et une instruction « utiliser toute la place » ; images stockées sous `panels/{panel_id}/blocks/{block_id}.png`. Par défaut **aucun bloc** (`blocks: []`) ; l’utilisateur **ajoute des blocs par glisser-déposer** (bloc **500×500** déposé sur le panel), **déplace** les blocs par glisser-déposer, **édite** largeur/hauteur, puis saisit le prompt et génère l’image par bloc. Chaque image générée est une **illustration pleine** affichée **dans** le rectangle du bloc. **Les dimensions de l’image = dimensions du bloc** (width × height). **OBLIGATOIRE** : la génération d'image dans un bloc doit utiliser les dimensions de ce bloc pour l'espace de l'image. **La sélection d'assets (asset_refs)** est optionnelle mais recommandée pour cadrer la scène.

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

**Format étendu** (champs additionnels possibles sur une bulle) : en plus des champs ci-dessus, chaque bulle peut comporter :
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
- `idx_chapter_canvases_chapter` sur `chapter_id` (migration 20260627)
- `idx_chapter_canvases_one_per_chapter` — **UNIQUE** sur `chapter_id` (migration 20260627140000, garantit l'invariant 1 canvas/chapitre)

**RLS** :
- SELECT : `auth.uid() = user_id`
- INSERT : `auth.uid() = user_id`
- UPDATE : `auth.uid() = user_id` (durci en 20260627 avec `WITH CHECK (auth.uid() = user_id)`)
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
- `idx_usage_user_action_created` sur `(user_id, action, created_at DESC)` — index composite pour les comptages mensuels (migration 20260515, remplace l'ancien `idx_usage_user_created`)

**Nettoyage automatique** : un cron `pg_cron` (`cleanup-old-usage`, le 2 du mois à 03h UTC) supprime les entrées de plus de 13 mois (migration 20260515).

**RLS** :
- SELECT : `auth.uid() = user_id`
- INSERT : via service_role (Edge Function uniquement)

**Comptage atomique** : la réservation de crédit passe par la RPC `consume_image_credit(p_user_id, p_limit, p_period_start)` (migration 20260627) — check + insert atomiques sous `pg_advisory_xact_lock`, anti race condition quota. La fenêtre mensuelle est ancrée sur `billing_period_start` (payant) ou le 1er du mois calendaire (libre/null).

**Requête de comptage mensuel** (logique simplifiée) :
```sql
SELECT COUNT(*) FROM usage
WHERE user_id = $1
  AND action = 'image_generation'
  AND created_at >= $period_start;
```

---

### 2.7 Tables additionnelles (mémoire narrative, lore, Compass)

> Le modèle ne se limite pas aux tables ci-dessus : l'ensemble du schéma couvre aussi la mémoire narrative NarraMind, la cartographie de l'univers (lore) et l'infrastructure vectorielle Compass. Source de vérité : `supabase/migrations/`.

| Table | Rôle | Colonnes clés | Migration |
|-------|------|---------------|-----------|
| `memory_entities` | Entités narratives (personnages, lieux, objets) | project_id, user_id, asset_id, name, entity_type, traits (JSONB), relations (JSONB), lore_summary, first_seen_chapter, last_seen_chapter, token_estimate | 20260423 |
| `memory_summaries` | Résumés compacts par chapitre (mémoire longue) | project_id, user_id, chapter_id, chapter_number, summary, token_estimate | 20260423 |
| `narramind_alerts` | Alertes / anomalies narratives (fil d'Ariane) | project_id, user_id, chapter_id, severity, title, explanation, anchor (JSONB), status ('active'/'dismissed'/'resolved'), dedupe_key | 20260430 |
| `narramind_metrics` | Métriques de la mémoire (tokens, compression) + observabilité Compass (colonnes compass_mode, fragments_retrieved, cos_sim_min/max, proposals_count ajoutées en 20260610) | project_id, mode, chapter_number, context_tokens, response_tokens, anomalies_detected, duration_ms | 20260423, 20260610 |
| `narramind_missing_assets` | Assets mentionnés dans le scénario mais non créés (suggestions) | project_id, chapter_id, name, suggested_type, mention_count, status (défaut 'pending') | 20260503 |
| `lore_nodes` | Nœuds du graphe Univers (personnage / lieu / objet / événement) | project_id, user_id, type, name, description, image_url, asset_id, chapter_id, pos_x, pos_y | 20260522, 20260523 |
| `lore_edges` | Relations (arêtes) du graphe Univers | project_id, user_id, from_node_id, to_node_id, label | 20260522 |
| `project_embeddings` | Index vectoriel Compass | project_id, user_id, source_type ('chapter'/'lore_world_section'/'asset_lore'/'summary'), source_id, section_key, content, **embedding vector(768)** | 20260522 |
| `compass_proposals` | Propositions Compass (Ariane) | project_id, user_id, proposal_type ('lore_world'/'lore_asset'/'lore_chapter_update'/'lore_connection'/'lore_event'/'narrative_direction'/'asset_prefill'), origin ('extracted'/'generated'), title, content, prefill_data (JSONB), source_fragments (JSONB, ajoutée 20260610), status ('active'/'accepted'/'dismissed'), dedupe_key | 20260522, 20260524, 20260610 |

> **Infra vectorielle Compass** : extension `pgvector` activée (migration 20260522), fonction SQL `match_embeddings(query_embedding vector(768), match_project_id, match_user_id, match_count)` pour la recherche par similarité cosinus, vectorisation via Gemini `text-embedding-004` (768 dimensions). RLS `auth.uid() = user_id` sur `project_embeddings` et `compass_proposals`.

> **Colonnes, pas des tables** : `compass_metrics`, `compass_proposals_source_fragments`, `lore_world_sections` et `word_mappings` ne sont PAS des tables. L'observabilité Compass est portée par des colonnes ajoutées à `narramind_metrics` (`compass_mode`, `fragments_retrieved`, `cos_sim_min/max`, `proposals_count` — migration 20260610) ; les fragments sources sont une colonne `source_fragments` (JSONB) sur `compass_proposals` (20260610) ; le lore monde est stocké dans le graphe (`lore_nodes`/`lore_edges`) plus `projects.world_rules` et `projects.universe_lore` (les colonnes `projects.lore_*` ajoutées en 20260522 ont été supprimées par la migration 20260522150000) ; `word_mappings` est une colonne JSONB sur `scenario_chapters` (20260421).

> **`chapter_assets`** : il n'existe pas de table `chapter_assets`. La curation des assets de chapitre est une colonne JSONB `scenario_chapters.chapter_assets` (`{validated, items[]}`, migration 20260531) — décisions utilisateur (overrides) ; la détection auto reste calculée à la volée.

> **Note `scenario_chapters` (évolutions)** : la table a reçu `narramind_anomalies` (JSONB, vidé après chaque run NarraMind) et `narramind_checked_at` (migration 20260430). `projects` a reçu `narra_summary` (mémoire longue, migration 20260430) et `panels_target_per_chapter`. `assets` a reçu `image_url_sheet` (Sheet System, 20260416) et `lore` (20260423).

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
| `profiles` | `user_id` | `auth.users` | CASCADE |
| `projects` | `user_id` | `auth.users` | CASCADE |
| `assets` | `user_id` | `auth.users` | CASCADE |
| `assets` | `project_id` | `projects` | CASCADE |
| `chapters` | `user_id` | `auth.users` | CASCADE |
| `chapters` | `project_id` | `projects` | CASCADE |
| `chapter_canvases` (ex-`panels`) | `user_id` | `auth.users` | CASCADE |
| `chapter_canvases` (ex-`panels`) | `chapter_id` | `chapters` | CASCADE |

> **Note appartenance** : `projects` / `assets` / `chapters` / `chapter_canvases` portent un `user_id` qui pointe vers `auth.users(id)` directement. Les tables mémoire (`memory_entities`, `memory_summaries`) pointent en revanche vers `profiles(id)`. Comme `profiles.id` ≠ `auth.users.id` (lien via `profiles.user_id UNIQUE`), ces deux familles de FK ne ciblent pas la même table — à garder en tête lors des jointures.

### 4.2 Cascade de suppression

```
Suppression d'un utilisateur (auth.users)   ← toutes les tables métier FK directement auth.users
    ├── Supprime le profile (profiles.user_id)
    └── Supprime tous les projects (projects.user_id)
            ├── Supprime tous les assets du projet
            └── Supprime tous les chapters du projet
                └── Supprime le chapter_canvas du chapitre

Suppression d'un projet
    ├── Supprime tous les assets
    └── Supprime tous les chapters
        └── Supprime le chapter_canvas

Suppression d'un chapitre
    └── Supprime le chapter_canvas (1 ligne)
```

> **Note** : La suppression des fichiers Storage n'est pas automatique (pas de trigger). Il faudra implémenter un nettoyage côté application ou via une Edge Function de cleanup.

---

## 5. Évolutions prévues du modèle

### 5.1 Court terme

| Modification | Table | Description |
|-------------|-------|-------------|
| Ajout `status` sur `assets` | `assets` | `enum ('pending', 'generating', 'ready', 'error')` |
| Ajout `generation_count` sur `assets` | `assets` | Compteur de régénérations |
| Ajout `status` sur `chapter_canvases` | `chapter_canvases` (ex-`panels`) | `enum ('pending', 'generating', 'ready', 'error')` |

### 5.2 Moyen terme

| Modification | Table | Description |
|-------------|-------|-------------|
| Nouvelle table `styles` | `styles` | Marketplace de styles (name, template, images, author, price, rating) |
| Nouvelle table `collaborators` | `collaborators` | Partage de projet (project_id, user_id, role) |
| Nouvelle table `comments` | `comments` | Commentaires sur les panels |
| Ajout `subscription_tier` sur `profiles` | `profiles` | (Déjà couvert par `plan` : libre/createur/studio) |
| ~~Nouvelle table `usage`~~ | `usage` | ✅ Déjà implémentée (migration 20260213) |

### 5.3 Long terme

| Modification | Table | Description |
|-------------|-------|-------------|
| Nouvelle table `publications` | `publications` | Liens de publication externe |
| Nouvelle table `analytics` | `analytics` | Statistiques de lecture |
| Nouvelle table `notifications` | `notifications` | Notifications utilisateur |

---

*Dernière mise à jour : 28 juin 2026 (audit vérité code) — corrections de cohérence schéma : `profiles` (id = PK interne ≠ ID auth, ajout `user_id UNIQUE → auth.users`), FK d'appartenance (`projects`/`assets`/`chapters`/`chapter_canvases` → `auth.users`, pas `profiles`), `handle_new_user()` réaligné sur le code réel. Section 2.7 corrigée : `compass_metrics`, `compass_proposals_source_fragments`, `lore_world_sections`, `word_mappings` et `chapter_assets` ne sont PAS des tables (colonnes sur `narramind_metrics` / `compass_proposals` / `projects` / `scenario_chapters`). `narramind_alerts` (severity/title/explanation/anchor/status/dedupe_key). `scenario_versions.version_type` = ('full_scenario'/'chapter') et couche applicative retirée (commit 298507e). Index `usage` composite `idx_usage_user_action_created` + RPC atomique `consume_image_credit` + cron de purge. `chapter_canvases` : invariant 1/chapitre via index unique (20260627), colonnes mortes supprimées au renommage.*

*Précédente : 13 juin 2026 (audit vérité 2) — ajout des tables manquantes : `narramind_missing_assets`, `lore_world_sections`, `lore_nodes`, `lore_edges` (détaillées), `compass_metrics` + `compass_proposals_source_fragments` (observabilité Compass / RAG, migrations 20260610), types `compass_proposals` complétés (lore_chapter_update, lore_connection). Précédente (7 juin) : plans renommés libre/createur/studio + colonnes profiles, renommage panels → chapter_canvases, tables mémoire/lore/Compass (project_embeddings, compass_proposals, pgvector, text-embedding-004 768D), chapter_assets.*
