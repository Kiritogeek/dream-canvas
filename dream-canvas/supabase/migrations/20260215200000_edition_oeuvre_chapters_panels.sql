-- Migration Phase 2 Édition de l'œuvre — Étape 1
-- chapters: lien optionnel vers chapitre de scénario
-- panels: layout (blocs), transition_effects, motion_lines (JSONB)

-- ── chapters ─────────────────────────────────────────────────────
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS linked_scenario_chapter_id UUID REFERENCES public.scenario_chapters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chapters_linked_scenario
  ON public.chapters (linked_scenario_chapter_id)
  WHERE linked_scenario_chapter_id IS NOT NULL;

-- ── panels ───────────────────────────────────────────────────────
ALTER TABLE public.panels
  ADD COLUMN IF NOT EXISTS layout JSONB DEFAULT '{"blocks":[]}';

ALTER TABLE public.panels
  ADD COLUMN IF NOT EXISTS transition_effects JSONB DEFAULT '[]';

ALTER TABLE public.panels
  ADD COLUMN IF NOT EXISTS motion_lines JSONB DEFAULT '[]';

COMMENT ON COLUMN public.chapters.linked_scenario_chapter_id IS 'Chapitre de scénario lié (double visualisation)';
COMMENT ON COLUMN public.panels.layout IS 'Blocs (position, taille, prompt, image_url) — mode Structuré';
COMMENT ON COLUMN public.panels.transition_effects IS 'Effets de transition (overlay)';
COMMENT ON COLUMN public.panels.motion_lines IS 'Lignes de mouvement (overlay)';
