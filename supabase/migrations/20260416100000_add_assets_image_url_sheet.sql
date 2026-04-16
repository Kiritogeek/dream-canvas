-- Adds a “character sheet” / single composite reference image per asset
-- used to keep graphic consistency when generating panels.
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS image_url_sheet TEXT NULL;

