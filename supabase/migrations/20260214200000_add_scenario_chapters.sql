-- ============================================================
-- Migration : scenario_chapters + scenario_versions
-- Phase B du plan d'action « Section Scénario »
-- ============================================================

-- ── Scenario chapters ─────────────────────────────────────────
-- Chapitres de scénario (texte narratif). Chaque chapitre correspond
-- à un chapitre webtoon (1 = 1). Le scénario EST la collection
-- de ces chapitres.

CREATE TABLE IF NOT EXISTS public.scenario_chapters (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_number INTEGER    NOT NULL DEFAULT 1,
  title         TEXT        NOT NULL,
  content       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_scenario_chapters_project
  ON public.scenario_chapters (project_id, chapter_number);

-- RLS
ALTER TABLE public.scenario_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own scenario chapters" ON public.scenario_chapters;
DROP POLICY IF EXISTS "Users can insert own scenario chapters" ON public.scenario_chapters;
DROP POLICY IF EXISTS "Users can update own scenario chapters" ON public.scenario_chapters;
DROP POLICY IF EXISTS "Users can delete own scenario chapters" ON public.scenario_chapters;

CREATE POLICY "Users can view own scenario chapters"
  ON public.scenario_chapters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scenario chapters"
  ON public.scenario_chapters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scenario chapters"
  ON public.scenario_chapters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scenario chapters"
  ON public.scenario_chapters FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger updated_at (réutilise la fonction existante)
DROP TRIGGER IF EXISTS update_scenario_chapters_updated_at ON public.scenario_chapters;
CREATE TRIGGER update_scenario_chapters_updated_at
  BEFORE UPDATE ON public.scenario_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ── Scenario versions (flux accepter / rejeter) ──────────────
-- Stocke les versions générées par l'IA (ou modifications manuelles)
-- pour comparaison ancienne/nouvelle avant acceptation.
--   • scenario_chapter_id NULL  → version portant sur le scénario complet
--   • scenario_chapter_id rempli → version portant sur un chapitre précis

CREATE TABLE IF NOT EXISTS public.scenario_versions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scenario_chapter_id   UUID        REFERENCES public.scenario_chapters(id) ON DELETE CASCADE,
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content               TEXT        NOT NULL,
  version_type          TEXT        NOT NULL CHECK (version_type IN ('full_scenario', 'chapter')),
  status                TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour récupérer rapidement les versions d'un projet / chapitre
CREATE INDEX IF NOT EXISTS idx_scenario_versions_project
  ON public.scenario_versions (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_versions_chapter
  ON public.scenario_versions (scenario_chapter_id, created_at DESC);

-- RLS
ALTER TABLE public.scenario_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own scenario versions" ON public.scenario_versions;
DROP POLICY IF EXISTS "Users can insert own scenario versions" ON public.scenario_versions;
DROP POLICY IF EXISTS "Users can update own scenario versions" ON public.scenario_versions;
DROP POLICY IF EXISTS "Users can delete own scenario versions" ON public.scenario_versions;

CREATE POLICY "Users can view own scenario versions"
  ON public.scenario_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scenario versions"
  ON public.scenario_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scenario versions"
  ON public.scenario_versions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scenario versions"
  ON public.scenario_versions FOR DELETE
  USING (auth.uid() = user_id);
