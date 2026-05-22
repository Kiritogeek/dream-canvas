ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS lore_magic      text,
  ADD COLUMN IF NOT EXISTS lore_geography  text,
  ADD COLUMN IF NOT EXISTS lore_factions   text,
  ADD COLUMN IF NOT EXISTS lore_culture    text,
  ADD COLUMN IF NOT EXISTS lore_timeline   text;
