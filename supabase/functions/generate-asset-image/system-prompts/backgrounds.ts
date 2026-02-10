// Prompts système pour les DÉCORS (backgrounds)
// Modifie ce fichier pour changer le comportement global des décors.

export const BACKGROUND_BASE_PROMPT =
  "Décor uniquement : environnement, lieu, paysage ou intérieur. Aucun personnage ni créature visible. " +
  "La scène doit être exploitable comme décor de bande dessinée / webtoon (composition lisible, profondeur, lumière claire).";

export const BACKGROUND_STYLE_TEXT_INSTRUCTION = (styleText: string) =>
  `Le décor doit être dessiné dans le style suivant (défini par l'utilisateur) : ${styleText}. Applique ce style au traitement des volumes, de la lumière, des couleurs et des textures.`;

export const BACKGROUND_STYLE_IMAGES_INSTRUCTION =
  "Les images de référence définissent le style visuel du décor (type de traits, rendu de la lumière, palette, niveau de détail). " +
  "Tu dois t'inspirer de ce style pour dessiner UNIQUEMENT l'environnement, sans ajouter de personnages.";


