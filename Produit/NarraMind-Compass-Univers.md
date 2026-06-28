# NarraMind Compass — Spec Onglet Univers (Wiki Graphique)
*Décision session 22/05/2026. État actuel (mis à jour le 28/06/2026) : l'onglet Univers est livré sous forme de **vue graphe** (React Flow / `@xyflow/react`), adossée aux tables `lore_nodes` / `lore_edges` (composant `LoreGraphView.tsx`, hooks `useLoreNodes` / `useLoreEdges`). Ce modèle livré diffère du modèle `lore_categories` / `lore_entries` / `lore_links` proposé ci-dessous (jamais implémenté) : il n'y a PAS de catégories custom ni de vue liste, et les liens relient des nœuds entre eux (`lore_edges`), pas des entrées vers des assets. La vectorisation du lore monde se fait sous `source_type = "lore_world_section"` ; `source_type = "lore_entry"` n'existe pas. La spec ci-dessous reste l'ambition v2 de référence ; valider étape par étape avant de coder.*

---

## Vision

L'onglet **Univers → Monde** est un **wiki graphique** par projet. L'utilisateur construit une carte de son univers en créant des entrées de lore (lieux, règles, peuples...) liées entre elles et aux assets existants.

Deux vues :
- **Vue liste** — arbre par catégorie, fiches individuelles
- **Vue graphe** — nœuds/flèches (React Flow), toutes les relations visibles d'un coup

---

## Architecture BDD (remplace les colonnes lore_* de la Phase 2)

```sql
-- Catégories custom par projet (Lieux, Peuples, Règles du monde...)
CREATE TABLE lore_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  name        text NOT NULL,
  icon        text,           -- emoji ou icon key
  order_index int NOT NULL DEFAULT 0,
  UNIQUE (project_id, name)
);

-- Entrées de lore (chaque lieu, règle, peuple = 1 entrée)
CREATE TABLE lore_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES lore_categories(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  image_url   text,           -- image associée (depuis assets ou upload)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Liens entre éléments (lore_entry ↔ lore_entry OU lore_entry ↔ asset)
CREATE TABLE lore_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  from_entry_id   uuid NOT NULL REFERENCES lore_entries(id) ON DELETE CASCADE,
  to_entry_id     uuid REFERENCES lore_entries(id) ON DELETE CASCADE,   -- null si vers asset
  to_asset_id     uuid REFERENCES assets(id) ON DELETE CASCADE,          -- null si vers lore_entry
  label           text,       -- "possède", "habite", "ennemi de"...
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (to_entry_id IS NOT NULL AND to_asset_id IS NULL) OR
    (to_entry_id IS NULL AND to_asset_id IS NOT NULL)
  )
);
```

**RLS** : toutes les tables → `auth.uid() = user_id`

**Migration (cible v2 — état au 28/06/2026) :**
1. ~~DROP les colonnes `lore_magic`, `lore_geography`, `lore_factions`, `lore_culture`, `lore_timeline`~~ → déjà fait : ces colonnes ont été supprimées de `projects` par la migration `20260522150000_lore_graph.sql` (qui a aussi créé `lore_nodes` / `lore_edges`, le modèle graphe réellement livré).
2. Reste à faire pour cette spec : créer les 3 nouvelles tables `lore_categories` / `lore_entries` / `lore_links` (non implémentées).

---

## UI — Vue liste

```
Onglet Monde
─────────────────────────────────────────
[ Vue liste ▼ ]  [ Vue graphe ]

📍 Lieux                        [ + Ajouter ]
  ┌──────────────────────────────────────┐
  │  🖼 Château de Verre         [ › ]  │
  │  🖼 Ruines du Nord           [ › ]  │
  └──────────────────────────────────────┘

👥 Peuples                      [ + Ajouter ]
  ┌──────────────────────────────────────┐
  │     Les Gardiens             [ › ]  │
  └──────────────────────────────────────┘

[ + Nouvelle catégorie ]
─────────────────────────────────────────
```

### Fiche détail (au clic sur [ › ])

```
┌──────────────────────────────────────────┐
│  ← Retour                                │
│                                          │
│  📍 Château de Verre                     │
│  ─────────────────────────               │
│  [ Image ]  ← clic = picker assets       │
│                                          │
│  Description / Lore                      │
│  ┌──────────────────────────────────┐   │
│  │ Le siège du pouvoir depuis...    │   │
│  └──────────────────────────────────┘   │
│  [ ✦ Suggestions Ariane ]                │
│                                          │
│  🔗 Liens                               │
│  → Roi Aldric (asset)    [possède]  [✕] │
│  → Gardiens (peuple)     [protège]  [✕] │
│  → Ruines du Nord        [sur site] [✕] │
│  [ + Ajouter un lien ]                   │
│                                          │
│  [ Supprimer ]            [ Sauvegarder ]│
└──────────────────────────────────────────┘
```

### Modal "Ajouter un lien"

Liste déroulante de TOUS les éléments du projet :
- Section "Assets" → personnages, lieux, objets déjà créés (avec miniature)
- Section "Lore" → toutes les lore_entries du projet
- Champ texte libre pour le label de relation

---

## UI — Vue graphe (React Flow)

- Chaque `lore_entry` = un nœud coloré par catégorie
- Chaque `asset` lié = un nœud avec l'image de l'asset
- Les `lore_links` = des arêtes avec le label
- Layout : `dagre` (automatique, hiérarchique) ou `force` (organique)
- Clic sur un nœud → ouvre la fiche détail en panneau latéral
- Mini-map en bas à droite

---

## Catégories par défaut (suggérées à la création du projet)

L'utilisateur peut tout supprimer/renommer. Ce ne sont que des suggestions :

| Emoji | Nom | Usage |
|---|---|---|
| 🌐 | Règles du monde | Fonctionnement global (magie, arts martiaux, lois physiques) |
| 📍 | Lieux | Les décors, chacun avec son lore |
| 👥 | Peuples | Races, nations, organisations |
| 🎭 | Cultures | Mœurs, traditions, croyances |
| 📜 | Chronologie | Événements fondateurs, timeline |

---

## Vectorisation (Compass)

Chaque `lore_entry` sera vectorisée indépendamment (cible v2) :
```
source_type: "lore_entry"   (cible v2 — remplacera "lore_world_section")
source_id:   lore_entry.id
content:     name + "\n" + description
```

> ⚠️ **État implémenté (juin 2026)** : `CompassSourceType` réel = `"chapter" | "lore_world_section" | "asset_lore" | "summary"` (cf. `src/types/index.ts`). La valeur `"lore_entry"` sera ajoutée lors de la migration vers le wiki graphique v2. Aujourd’hui le lore monde est vectorisé section par section sous `"lore_world_section"`.

Les liens sont injectés dans le contexte lors des propositions :
> "La Tour de Verre est possédée par Roi Aldric et protégée par les Gardiens."

---

## Plan d'implémentation (3 étapes)

| Étape | Contenu | Pré-requis |
|---|---|---|
| **A** | Migration (drop lore_* + 3 nouvelles tables) + services/hooks + Vue liste + Fiches + Image picker | Étape A = fondation |
| **B** | Liens entre éléments (lore_links) + modal relation + affichage sur fiche | Étape A terminée |
| **C** | Vue graphe React Flow (nœuds/arêtes, layout dagre, clic → fiche) | Étape B terminée |

*Spec v1 — 22/05/2026 · audit 7 juin 2026 : wiki graphique v2 toujours spécifié/non livré ; clarification que `source_type` implémenté = `"lore_world_section"` (sections thématiques v1 livrée), `"lore_entry"` reste la cible v2.*
*Mise à jour 28/06/2026 : l'onglet Univers est désormais livré comme **vue graphe** via `lore_nodes` / `lore_edges` + React Flow (`LoreGraphView.tsx`), un modèle distinct de cette spec (`lore_categories` / `lore_entries` / `lore_links` jamais créées). Les colonnes `lore_*` de la Phase 2 ont été supprimées par la migration `20260522150000_lore_graph.sql`. `source_type` réel = `"chapter" | "lore_world_section" | "asset_lore" | "summary"` ; `"lore_entry"` non implémenté.*
