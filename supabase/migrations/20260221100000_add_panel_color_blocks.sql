-- Blocs de couleurs (ambiance panel) — même principe que blocs architecture, remplir espaces entre blocs
ALTER TABLE public.panels
  ADD COLUMN IF NOT EXISTS color_blocks jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.panels.color_blocks IS 'Blocs de couleur (x, y, width, height, fill) pour remplir les espaces entre les blocs image. Rendu en arrière-plan.';
