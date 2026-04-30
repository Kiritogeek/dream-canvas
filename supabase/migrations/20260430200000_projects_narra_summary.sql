ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS narra_summary TEXT,
  ADD COLUMN IF NOT EXISTS narra_summary_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.projects.narra_summary IS
  'Méga-résumé narratif NarraMind (faits stables + arc), alimenté par l’EF narramind-update.';
COMMENT ON COLUMN public.projects.narra_summary_updated_at IS
  'Dernière mise à jour du méga-résumé (append chapitre et/ou fusion résumés).';
