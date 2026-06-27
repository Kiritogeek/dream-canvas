-- Audit 2026-06-27 — invariant « 1 canvas par chapitre » (chapter_canvases).
-- CLAUDE.md : « chapter_canvases ... toujours 1 seule ligne par chapter ».
-- Cette contrainte n'existait pas en base → risque de canvas en doublon (double
-- compose, retry) provoquant des « canvas fantômes » ou des erreurs multi-rows.
--
-- Étape 1 : dédoublonnage SÛR — on conserve, par chapitre, la ligne au layout le
-- plus volumineux (= le plus de travail d'édition), tiebreak sur id. Aucune perte
-- de la version la plus aboutie.

DELETE FROM public.chapter_canvases
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           row_number() OVER (
             PARTITION BY chapter_id
             ORDER BY length(coalesce(layout::text, '')) DESC, id
           ) AS rn
    FROM public.chapter_canvases
  ) ranked
  WHERE ranked.rn > 1
);

-- Étape 2 : contrainte d'unicité (idempotente).
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_canvases_one_per_chapter
  ON public.chapter_canvases(chapter_id);
