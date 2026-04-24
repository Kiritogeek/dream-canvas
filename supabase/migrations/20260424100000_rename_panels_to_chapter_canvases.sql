-- Option B : renommer panels → chapter_canvases + supprimer colonnes mortes
-- Contexte : 1 canvas par chapitre (pas de grille multi-panels).
-- Colonnes supprimées : jamais lues ni écrites dans le code UI actuel.

ALTER TABLE public.panels RENAME TO chapter_canvases;

ALTER TABLE public.chapter_canvases DROP COLUMN IF EXISTS dialogue;
ALTER TABLE public.chapter_canvases DROP COLUMN IF EXISTS narration;
ALTER TABLE public.chapter_canvases DROP COLUMN IF EXISTS prompt;
ALTER TABLE public.chapter_canvases DROP COLUMN IF EXISTS image_url;
ALTER TABLE public.chapter_canvases DROP COLUMN IF EXISTS transition_effects;
ALTER TABLE public.chapter_canvases DROP COLUMN IF EXISTS motion_lines;

-- Les policies suivent automatiquement le rename (OID stable).
-- On les recrée avec des noms cohérents.
DROP POLICY IF EXISTS "Users can view own panels" ON public.chapter_canvases;
DROP POLICY IF EXISTS "Users can insert own panels" ON public.chapter_canvases;
DROP POLICY IF EXISTS "Users can update own panels" ON public.chapter_canvases;
DROP POLICY IF EXISTS "Users can delete own panels" ON public.chapter_canvases;

CREATE POLICY "Users can view own chapter_canvases"
  ON public.chapter_canvases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chapter_canvases"
  ON public.chapter_canvases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chapter_canvases"
  ON public.chapter_canvases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chapter_canvases"
  ON public.chapter_canvases FOR DELETE USING (auth.uid() = user_id);
