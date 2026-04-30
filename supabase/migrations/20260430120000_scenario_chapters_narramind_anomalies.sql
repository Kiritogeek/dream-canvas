ALTER TABLE public.scenario_chapters
  ADD COLUMN IF NOT EXISTS narramind_anomalies jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS narramind_checked_at timestamptz;

COMMENT ON COLUMN public.scenario_chapters.narramind_anomalies IS
  'Dernières anomalies NarraMind (incohérences vs lore), tableau JSON de chaînes.';
COMMENT ON COLUMN public.scenario_chapters.narramind_checked_at IS
  'Horodatage du dernier passage NarraMind sur ce chapitre.';
