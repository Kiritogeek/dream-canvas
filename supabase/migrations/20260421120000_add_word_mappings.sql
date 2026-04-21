ALTER TABLE scenario_chapters
ADD COLUMN IF NOT EXISTS word_mappings JSONB DEFAULT '{}';
