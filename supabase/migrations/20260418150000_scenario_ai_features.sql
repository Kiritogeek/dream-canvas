ALTER TABLE scenario_chapters
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS locked_blocks JSONB DEFAULT '[]'::jsonb;
