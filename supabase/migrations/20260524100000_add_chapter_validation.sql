-- Validation de chapitre : verrou dur + horodatage
ALTER TABLE public.scenario_chapters
  ADD COLUMN IF NOT EXISTS validated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;
