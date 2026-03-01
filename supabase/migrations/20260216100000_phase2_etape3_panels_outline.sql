-- Phase 2 Étape 3 — Découpage chapitre textuel en panels
-- scenario_chapters: stockage du découpage (liste panels + descriptions)
-- projects: cible nombre de panels par chapitre (référence utilisateur)

-- ── scenario_chapters : outline du découpage ─────────────────────
ALTER TABLE public.scenario_chapters
  ADD COLUMN IF NOT EXISTS panels_outline JSONB DEFAULT '[]';

COMMENT ON COLUMN public.scenario_chapters.panels_outline IS
  'Liste de panels issus du découpage : [{ "description", "context": { "lieu", "scene", "personnages" } }]';

-- ── projects : cible panels par chapitre (optionnel) ─────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS panels_target_per_chapter INTEGER;

COMMENT ON COLUMN public.projects.panels_target_per_chapter IS
  'Nombre de panels cible par chapitre (ex. 10). Indicatif pour comparaison avec l''estimation.';
