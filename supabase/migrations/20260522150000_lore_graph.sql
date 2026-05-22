-- Wiki Graphique Univers — remplace colonnes lore_* (Phase 2)
ALTER TABLE projects
  DROP COLUMN IF EXISTS lore_magic,
  DROP COLUMN IF EXISTS lore_geography,
  DROP COLUMN IF EXISTS lore_factions,
  DROP COLUMN IF EXISTS lore_culture,
  DROP COLUMN IF EXISTS lore_timeline;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS world_rules text;

CREATE TABLE IF NOT EXISTS lore_nodes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL,
  type        text        NOT NULL CHECK (type IN ('character','location','object','event')),
  name        text        NOT NULL,
  description text,
  image_url   text,
  asset_id    uuid        REFERENCES assets(id) ON DELETE SET NULL,
  pos_x       float8      NOT NULL DEFAULT 0,
  pos_y       float8      NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lore_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lore_nodes" ON lore_nodes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS lore_edges (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL,
  from_node_id  uuid        NOT NULL REFERENCES lore_nodes(id) ON DELETE CASCADE,
  to_node_id    uuid        NOT NULL REFERENCES lore_nodes(id) ON DELETE CASCADE,
  label         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lore_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lore_edges" ON lore_edges
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS lore_nodes_project_id_idx ON lore_nodes(project_id);
CREATE INDEX IF NOT EXISTS lore_edges_project_id_idx ON lore_edges(project_id);
CREATE INDEX IF NOT EXISTS lore_edges_from_node_idx  ON lore_edges(from_node_id);
CREATE INDEX IF NOT EXISTS lore_edges_to_node_idx    ON lore_edges(to_node_id);
