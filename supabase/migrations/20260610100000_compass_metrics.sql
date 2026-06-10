-- Étend narramind_metrics pour les runs narramind-compass (mode propose).
-- Les colonnes existantes (chapter_number, context_tokens…) restent NULL pour les runs Compass.

ALTER TABLE narramind_metrics
  ADD COLUMN IF NOT EXISTS compass_mode        TEXT,
  ADD COLUMN IF NOT EXISTS fragments_retrieved JSONB,
  ADD COLUMN IF NOT EXISTS cos_sim_min         FLOAT,
  ADD COLUMN IF NOT EXISTS cos_sim_max         FLOAT,
  ADD COLUMN IF NOT EXISTS proposals_count     INT;
