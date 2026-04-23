CREATE TABLE narramind_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_number INTEGER,
  mode TEXT NOT NULL,
  context_tokens INTEGER,
  response_tokens INTEGER,
  chapters_in_context INTEGER,
  anomalies_detected INTEGER DEFAULT 0,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE narramind_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own metrics" ON narramind_metrics
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Insert own metrics" ON narramind_metrics
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );
