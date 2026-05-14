-- Ajoute le support d'une image de référence réelle pour les assets
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
