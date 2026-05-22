CREATE TABLE IF NOT EXISTS public.compass_proposals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  source_id       uuid,
  proposal_type   text NOT NULL CHECK (proposal_type IN ('lore_world','lore_asset','narrative_direction','asset_prefill')),
  origin          text NOT NULL CHECK (origin IN ('extracted','generated')),
  title           text NOT NULL,
  content         text NOT NULL,
  prefill_data    jsonb,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','accepted','dismissed')),
  dedupe_key      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, dedupe_key)
);

ALTER TABLE public.compass_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own proposals"
  ON public.compass_proposals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_compass_proposals_project
  ON public.compass_proposals (project_id, status);
