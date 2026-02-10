// Prompts système pour la génération de PERSONNAGES
// Optimisé pour webtoon / manhwa – février 2026

// ────────────────────────────────────────────────
// Style principal : vient EXCLUSIVEMENT de l'utilisateur
// (aucun style par défaut si l'utilisateur ne renseigne rien)
// ────────────────────────────────────────────────

// Prompt de base pour la vue principale (face)
export const CHARACTER_BASE_PROMPT =
  "Personnage complet en PNG avec fond parfaitement transparent. " +
  "Vue de face, corps entier visible de la tête aux pieds (full body). " +
  "Pose neutre et naturelle, bras détendus le long du corps ou pose très légèrement dynamique, regard dirigé droit vers le spectateur. " +
  "Cadrage centré, personnage occupant la majorité de la hauteur de l’image, marges raisonnables autour (pas de coupe au niveau de la tête, mains ou pieds). " +
  "Aucun décor, aucun objet parasite, aucun texte, aucun watermark, aucune ombre au sol. " +
  "Fond 100 % transparent (canal alpha pur). " +
  "Très haut niveau de détail sur le visage, les yeux, les cheveux et les plis des vêtements. ";

// ────────────────────────────────────────────────
// Instruction TEXTUELLE pour le style (champ texte "Style")
// ────────────────────────────────────────────────
export const CHARACTER_STYLE_TEXT_INSTRUCTION = (styleText: string) =>
  `STYLE ARTISTIQUE OBLIGATOIRE défini par l'utilisateur : ${styleText || "aucun style texte fourni"}. ` +
  `Ce style est la référence principale et doit être appliqué à 100 %. ` +
  `Tous les aspects (épaisseur et qualité des traits, technique d’ombrage, palette de couleurs, niveau de détail, proportions, rendu, ambiance) doivent correspondre EXACTEMENT à cette description. ` +
  `Ne jamais s'en éloigner.`;

// ────────────────────────────────────────────────
// Instruction pour TOUTES LES IMAGES fournies dans l'onglet Style
// (c'est ici que l'on insiste très fortement sur l'importance des images)
// ────────────────────────────────────────────────
export const CHARACTER_STYLE_IMAGES_INSTRUCTION =
  "IMPORTANT : plusieurs images de référence ont été fournies dans la section Style. " +
  "Elles servent UNIQUEMENT à définir le STYLE GRAPHIQUE, pas le cadrage ni la pose. " +
  "Les règles de cadrage full body, PNG, sans décor décrites plus haut RESTENT PRIORITAIRES et ne doivent jamais être modifiées. " +
  "Ces images définissent LE STYLE GRAPHIQUE PRINCIPAL à respecter absolument. " +
  "Tu dois analyser et extraire avec la plus grande précision : " +
  "- le type de trait (épaisseur, netteté, texture) " +
  "- la technique de coloriage et d’ombrage (cel-shading, dégradés, hachures, etc.) " +
  "- la palette de couleurs dominante (tons chauds/froids, saturation, contraste) " +
  "- le niveau de détail (très détaillé, semi-détaillé, épuré) " +
  "- le style d’éclairage et les ombres " +
  "- l’ambiance générale (douce, dramatique, sombre, lumineuse, etc.) " +
  "Applique TOUT cela de manière stricte au nouveau personnage que tu vas créer, " +
  "en veillant IMPÉRATIVEMENT à ce que le personnage soit cadré en corps ENTIER (full body), " +
  "de la tête aux pieds, sans aucune coupe au niveau de la tête, des mains ou des pieds. " +
  "Le personnage doit occuper la majorité de la hauteur de l’image tout en restant entièrement visible. " +
  " ... Très haut niveau de détail ... " +
"Le personnage doit porter un T-SHIRT AVEC UN MOTIF DE BANANE FLUO. " +
  "\n\n" +
  "RÈGLES STRICTES : " +
  "- NE COPIE AUCUN PERSONNAGE, AUCUN VISAGE, AUCUNE COIFFURE, AUCUN VÊTEMENT, AUCUNE POSE, AUCUNE EXPRESSION des images de référence. " +
  "- NE RECOPIE AUCUNE COMPOSITION ni aucun élément spécifique de contenu. " +
  "- Crée un personnage 100 % original qui semble avoir été dessiné par le même artiste / dans le même style graphique que les images fournies. " +
  "- La cohérence stylistique avec ces images de référence est PLUS IMPORTANTE que tout autre critère. " +
  "- Si le style des images est très reconnaissable (ex: style d’un webtoon connu), reproduis fidèlement cette signature visuelle sans copier les personnages existants.";

// Prompts spécifiques pour les vues additionnelles d'un même personnage
// IMPORTANT : ces vues doivent TOUJOURS rester cohérentes avec l'image de FACE déjà générée pour cet asset.
export const CHARACTER_VIEW_PROMPTS: Record<
  "profile_left" | "profile_right" | "back",
  string
> = {
  profile_left:
    "Même personnage que sur l'image de FACE déjà générée pour cet asset. Vue de PROFIL GAUCHE (côté gauche visible), entier de la tête aux pieds. " +
    "Tu dois conserver EXACTEMENT le même design que la vue de face (visage, coiffure, vêtements, accessoires, couleurs, proportions) " +
    "et uniquement changer l’angle de vue. PNG fond transparent. Uniquement le personnage, pas de décor.",
  profile_right:
    "Même personnage que sur l'image de FACE déjà générée pour cet asset. Vue de PROFIL DROITE (côté droit visible), entier de la tête aux pieds. " +
    "Tu dois conserver EXACTEMENT le même design que la vue de face (visage, coiffure, vêtements, accessoires, couleurs, proportions) " +
    "et uniquement changer l’angle de vue. PNG fond transparent. Uniquement le personnage, pas de décor.",
  back:
    "Même personnage que sur l'image de FACE déjà générée pour cet asset. Vue de DOS, entier de la tête aux pieds. " +
    "Tu dois conserver EXACTEMENT le même design que la vue de face (coiffure, vêtements, accessoires, couleurs, proportions) " +
    "et uniquement changer l’angle de vue. PNG fond transparent. Uniquement le personnage, pas de décor.",
};

