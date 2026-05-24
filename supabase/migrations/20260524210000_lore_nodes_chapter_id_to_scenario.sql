-- Migre lore_nodes.chapter_id : FK scenario_chapters au lieu de chapters (canvas/Édition)
-- Raison : Ariane scanne scenario_chapters. La table chapters (Édition) peut ne pas exister
-- pour les utilisateurs qui travaillent uniquement en Scénario+Univers.

ALTER TABLE lore_nodes
  DROP CONSTRAINT IF EXISTS lore_nodes_chapter_id_fkey;

-- Les valeurs existantes pointent vers chapters (canvas) — incompatibles après migration.
-- Ariane réassignera les chapter_id au prochain scan.
UPDATE lore_nodes SET chapter_id = NULL WHERE chapter_id IS NOT NULL;

ALTER TABLE lore_nodes
  ADD CONSTRAINT lore_nodes_chapter_id_fkey
    FOREIGN KEY (chapter_id) REFERENCES scenario_chapters(id) ON DELETE SET NULL;
