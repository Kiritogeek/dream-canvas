CREATE TABLE public.narramind_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.scenario_chapters (id) ON DELETE CASCADE,
  severity TEXT CHECK (severity IS NULL OR severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  anchor JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'resolved')),
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, chapter_id, dedupe_key)
);

ALTER TABLE public.narramind_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own narramind_alerts" ON public.narramind_alerts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_narramind_alerts_project_status ON public.narramind_alerts (project_id, status);
CREATE INDEX idx_narramind_alerts_chapter ON public.narramind_alerts (chapter_id);
