-- Ajoute chapter_id sur lore_nodes (nullable) pour lier les événements à un chapitre.
-- Seuls les nœuds de type 'event' utilisent ce champ — les autres le laissent null.
ALTER TABLE lore_nodes
  ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;

-- Index partiel : seuls les événements liés à un chapitre sont indexés
CREATE INDEX IF NOT EXISTS idx_lore_nodes_chapter_id
  ON lore_nodes(chapter_id)
  WHERE chapter_id IS NOT NULL;
