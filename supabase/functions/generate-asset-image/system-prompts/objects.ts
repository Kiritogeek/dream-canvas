// Prompts système pour les OBJETS
// Modifie ce fichier pour changer le comportement global des objets.

export const OBJECT_BASE_PROMPT =
  "Objet seul en PNG, fond entièrement transparent. Uniquement l'objet principal, bien centré et lisible, sans décor ni personnage. " +
  "L'objet doit être complet (aucune partie coupée par le cadre) et facilement réutilisable dans une mise en page.";

export const OBJECT_STYLE_TEXT_INSTRUCTION = (styleText: string) =>
  `L'objet doit être dessiné dans le style graphique suivant (défini par l'utilisateur) : ${styleText}. Respecte ce style pour les contours, les volumes, la lumière et les couleurs.`;

export const OBJECT_STYLE_IMAGES_INSTRUCTION =
  "Les images de référence donnent le style graphique de l'objet (trait, matériaux, reflets, palette). " +
  "Inspire-toi uniquement de ce style visuel pour dessiner l'objet, sans copier les scènes ou personnages présents sur ces références.";


