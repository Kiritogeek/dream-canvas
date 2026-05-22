-- Fonction de recherche sémantique pgvector pour NarraMind Compass.
-- Appelée via rpc('match_embeddings', {...}) depuis narramind-compass (mode "propose").
-- L'opérateur <=> (similarité cosinus) ne peut pas être utilisé directement via PostgREST.

CREATE OR REPLACE FUNCTION match_embeddings(
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
AS $$
  SELECT
    pe.id,
    pe.source_type,
    pe.source_id,
    pe.section_key,
    pe.content,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM project_embeddings pe
  WHERE
    pe.project_id = match_project_id
    AND pe.user_id = match_user_id
    AND pe.embedding IS NOT NULL
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
$$;
