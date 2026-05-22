CREATE TABLE IF NOT EXISTS public.project_embeddings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  source_type     text NOT NULL CHECK (source_type IN ('chapter','lore_world_section','asset_lore','summary')),
  source_id       uuid NOT NULL,
  section_key     text,
  content         text NOT NULL,
  embedding       vector(768),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own embeddings"
  ON public.project_embeddings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- COALESCE() dans une contrainte UNIQUE inline n'est pas supporté par PostgreSQL.
-- On utilise CREATE UNIQUE INDEX qui accepte les expressions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_embeddings_unique
  ON public.project_embeddings (project_id, source_type, source_id, COALESCE(section_key, ''));

CREATE INDEX IF NOT EXISTS idx_project_embeddings_project
  ON public.project_embeddings (project_id);
