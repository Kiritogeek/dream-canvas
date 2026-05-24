-- Étend la contrainte proposal_type pour inclure lore_chapter_update et lore_connection
ALTER TABLE public.compass_proposals
  DROP CONSTRAINT IF EXISTS compass_proposals_proposal_type_check;

ALTER TABLE public.compass_proposals
  ADD CONSTRAINT compass_proposals_proposal_type_check
  CHECK (proposal_type IN (
    'lore_world',
    'lore_asset',
    'lore_chapter_update',
    'lore_connection',
    'narrative_direction',
    'asset_prefill'
  ));
