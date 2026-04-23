CREATE TABLE memory_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  traits JSONB DEFAULT '[]'::jsonb,
  relations JSONB DEFAULT '[]'::jsonb,
  lore_summary TEXT,
  last_seen_chapter INTEGER,
  first_seen_chapter INTEGER,
  token_estimate INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

CREATE TABLE memory_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES scenario_chapters(id) ON DELETE SET NULL,
  chapter_number INTEGER NOT NULL,
  summary TEXT NOT NULL,
  token_estimate INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE memory_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own memory_entities" ON memory_entities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own memory_summaries" ON memory_summaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_memory_entities_project ON memory_entities(project_id);
CREATE INDEX idx_memory_summaries_project ON memory_summaries(project_id);
CREATE INDEX idx_memory_summaries_chapter ON memory_summaries(chapter_number);
