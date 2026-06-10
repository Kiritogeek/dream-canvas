-- Ajoute la traçabilité des fragments sources utilisés pour chaque proposition Compass.
-- Permet de vérifier qu'une suggestion "extracted" est réellement ancrée dans les sources injectées.

ALTER TABLE compass_proposals
  ADD COLUMN IF NOT EXISTS source_fragments JSONB;
  -- Format : [{source_type, source_id, cos_sim, excerpt}]
