-- Audit 2026-06-27 — durcissement RLS + index FK + search_path
-- Migration ADDITIVE et idempotente. Aucun DROP de données. À appliquer via supabase db push.

-- ─────────────────────────────────────────────────────────────
-- 1. WITH CHECK explicite sur les policies UPDATE des tables propriétaires
--    Empêche la réassignation de user_id (transfert d'une ressource à un autre compte).
--    (profiles est déjà couverte par la policy Stripe plan-lock — non touchée.)
-- ─────────────────────────────────────────────────────────────
ALTER POLICY "Users can update own projects"          ON public.projects          WITH CHECK (auth.uid() = user_id);
ALTER POLICY "Users can update own assets"            ON public.assets            WITH CHECK (auth.uid() = user_id);
ALTER POLICY "Users can update own chapters"          ON public.chapters          WITH CHECK (auth.uid() = user_id);
ALTER POLICY "Users can update own chapter_canvases"  ON public.chapter_canvases  WITH CHECK (auth.uid() = user_id);
ALTER POLICY "Users can update own scenario chapters" ON public.scenario_chapters WITH CHECK (auth.uid() = user_id);
ALTER POLICY "Users can update own scenario versions" ON public.scenario_versions WITH CHECK (auth.uid() = user_id);

-- 1b. narramind_missing_assets : policy FOR ALL sans WITH CHECK → INSERT cross-user non bloqué.
ALTER POLICY "narramind_missing_assets_own" ON public.narramind_missing_assets WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 2. Index sur les colonnes FK fréquemment filtrées (listes + ON DELETE CASCADE).
--    Postgres n'indexe PAS automatiquement les FK.
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assets_project           ON public.assets(project_id);
CREATE INDEX IF NOT EXISTS idx_chapters_project         ON public.chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_chapter_canvases_chapter ON public.chapter_canvases(chapter_id);

-- ─────────────────────────────────────────────────────────────
-- 3. match_embeddings : SET search_path = public + référence schéma-qualifiée
--    (durcissement linter Supabase function_search_path_mutable).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.match_embeddings(
  query_embedding vector(768),
  match_project_id uuid,
  match_user_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  section_key text,
  content text,
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    pe.id,
    pe.source_type,
    pe.source_id,
    pe.section_key,
    pe.content,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM public.project_embeddings pe
  WHERE
    pe.project_id = match_project_id
    AND pe.user_id = match_user_id
    AND pe.embedding IS NOT NULL
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
$$;
