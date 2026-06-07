-- Curation des assets de chapitre (étape 2 de la validation en 3 étapes)
-- Stocke uniquement les décisions utilisateur (overrides) ; la détection auto reste calculée à la volée.
ALTER TABLE public.scenario_chapters
  ADD COLUMN IF NOT EXISTS chapter_assets JSONB NOT NULL DEFAULT '{"validated":false,"items":[]}'::jsonb;
