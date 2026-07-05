-- Étend proposal_type pour inclure lore_node_enrichment
-- (Ariane propose d'enrichir la description d'un élément d'Univers EXISTANT à partir du scénario).
ALTER TABLE public.compass_proposals
  DROP CONSTRAINT IF EXISTS compass_proposals_proposal_type_check;

ALTER TABLE public.compass_proposals
  ADD CONSTRAINT compass_proposals_proposal_type_check
  CHECK (proposal_type IN (
    'lore_world',
    'lore_asset',
    'lore_chapter_update',
    'lore_connection',
    'lore_event',
    'lore_node_enrichment',
    'narrative_direction',
    'asset_prefill'
  ));
