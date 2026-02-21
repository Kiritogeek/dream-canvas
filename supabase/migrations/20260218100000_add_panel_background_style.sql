-- Couleur de fond du panel (blocs de couleurs en mode Édition)
ALTER TABLE panels
ADD COLUMN IF NOT EXISTS background_style jsonb DEFAULT NULL;

COMMENT ON COLUMN panels.background_style IS 'Couleur de fond du panel (ex. { "color": "#ffffff" }). Sélection parmi des blocs de couleurs.';
