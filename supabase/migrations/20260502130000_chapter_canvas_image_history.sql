-- Historique persistant des images générées sur le canvas du chapitre (et traces de cases avec image supprimées).
-- Affichage + restauration depuis l’éditeur.

CREATE TABLE public.chapter_canvas_image_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters (id) ON DELETE CASCADE,
  panel_canvas_id uuid NOT NULL REFERENCES public.chapter_canvases (id) ON DELETE CASCADE,
  event_kind text NOT NULL CHECK (event_kind IN ('image_generated', 'case_removed_with_image')),
  source_block_id text NOT NULL,
  prompt text,
  image_url text NOT NULL,
  block_name text,
  layout_rect jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cc_image_history_chapter_created
  ON public.chapter_canvas_image_history (chapter_id, created_at DESC);

CREATE INDEX idx_cc_image_history_panel
  ON public.chapter_canvas_image_history (panel_canvas_id);

COMMENT ON TABLE public.chapter_canvas_image_history IS 'Historique UX : générations d’image et cases avec image supprimées (restaurables).';
COMMENT ON COLUMN public.chapter_canvas_image_history.layout_rect IS 'Optionnel { x, y, width, height } pour replacer le bloc à la restauration.';
COMMENT ON COLUMN public.chapter_canvas_image_history.event_kind IS 'image_generated : succès génération IA. case_removed_with_image : suppression d’une case qui avait cette image.';

ALTER TABLE public.chapter_canvas_image_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chapter_canvas_image_history"
  ON public.chapter_canvas_image_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chapter_canvas_image_history"
  ON public.chapter_canvas_image_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
