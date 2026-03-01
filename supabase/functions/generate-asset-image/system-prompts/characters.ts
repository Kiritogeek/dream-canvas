// System Prompts Optimisés - Webtoon/Manhwa
// Version courte et claire - Février 2026

// ═══════════════════════════════════════════════════════════════
// PERSONNAGES
// ═══════════════════════════════════════════════════════════════

export const buildCharacterPrompt = (
  userDescription: string,
  styleText?: string,
  styleImageUrls?: string[]
) => {
  let prompt = `Crée un personnage complet (corps entier de la tête aux pieds) en PNG avec fond transparent.

DESCRIPTION DU PERSONNAGE :
${userDescription}

CADRAGE ET COMPOSITION :
- Vue de face, pose neutre, regard vers le spectateur
- Personnage centré, occupant 80% de la hauteur de l'image
- Aucune partie coupée (tête, mains, pieds tous visibles)
- L'image doit REMPLIR le cadre sans espaces blancs ni bandes vides sur les côtés
- Fond 100% transparent, sans décor, ombre, texte ou watermark
- Très haute qualité de détails (visage, yeux, cheveux, vêtements)`;

  // Ajout du style textuel
  if (styleText) {
    prompt += `\n\nSTYLE ARTISTIQUE :
${styleText}
Applique ce style à 100% : traits, ombrage, couleurs, proportions, rendu.`;
  }

  // Ajout des images de référence style
  if (styleImageUrls && styleImageUrls.length > 0) {
    prompt += `\n\nIMAGES DE RÉFÉRENCE STYLE :
${styleImageUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

ANALYSE ET REPRODUIS le style graphique de ces images :
- Type et épaisseur des traits
- Technique d'ombrage (cel-shading, dégradés, etc.)
- Palette de couleurs (tons, saturation, contraste)
- Niveau de détail et rendu

ATTENTION :
✓ Copie UNIQUEMENT le style graphique
✗ Ne copie JAMAIS les personnages, visages, poses, vêtements des références
✓ Crée un personnage 100% original dans ce style`;
  }

  return prompt;
};

// ═══════════════════════════════════════════════════════════════
// VUES ADDITIONNELLES (Profil, Dos)
// ═══════════════════════════════════════════════════════════════

export const CHARACTER_VIEW_PROMPTS: Record<
  "profile_left" | "profile_right" | "back",
  string
> = {
  profile_left:
    "Vue de PROFIL GAUCHE du même personnage. " +
    "Conserve EXACTEMENT le même design (visage, coiffure, vêtements, couleurs) que la vue de face. " +
    "Change UNIQUEMENT l'angle de vue (profil gauche). " +
    "Corps entier visible de la tête aux pieds, PNG fond transparent, sans décor.",

  profile_right:
    "Vue de PROFIL DROIT du même personnage. " +
    "Conserve EXACTEMENT le même design (visage, coiffure, vêtements, couleurs) que la vue de face. " +
    "Change UNIQUEMENT l'angle de vue (profil droit). " +
    "Corps entier visible de la tête aux pieds, PNG fond transparent, sans décor.",

  back:
    "Vue de DOS du même personnage. " +
    "Conserve EXACTEMENT le même design (coiffure, vêtements, couleurs) que la vue de face. " +
    "Change UNIQUEMENT l'angle de vue (dos). " +
    "Corps entier visible de la tête aux pieds, PNG fond transparent, sans décor.",
};

// ═══════════════════════════════════════════════════════════════
// FONCTIONS DE COMPATIBILITÉ (pour l'ancien code)
// ═══════════════════════════════════════════════════════════════

// Ces constantes sont conservées pour la compatibilité avec l'ancien code
// mais ne sont plus utilisées directement
export const CHARACTER_BASE_PROMPT =
  "Personnage complet en PNG avec fond parfaitement transparent. " +
  "Vue de face, corps entier visible de la tête aux pieds (full body). " +
  "Pose neutre et naturelle, bras détendus le long du corps ou pose très légèrement dynamique, regard dirigé droit vers le spectateur. " +
  "Cadrage centré, personnage occupant la majorité de la hauteur de l'image, marges raisonnables autour (pas de coupe au niveau de la tête, mains ou pieds). " +
  "Aucun décor, aucun objet parasite, aucun texte, aucun watermark, aucune ombre au sol. " +
  "Fond 100 % transparent (canal alpha pur). " +
  "Très haut niveau de détail sur le visage, les yeux, les cheveux et les plis des vêtements. ";

export const CHARACTER_STYLE_TEXT_INSTRUCTION = (styleText: string) =>
  `STYLE ARTISTIQUE OBLIGATOIRE : ${styleText || "aucun style texte fourni"}. ` +
  `Ce style est la référence principale et doit être appliqué à 100 %. ` +
  `Tous les aspects (épaisseur et qualité des traits, technique d'ombrage, palette de couleurs, niveau de détail, proportions, rendu, ambiance) doivent correspondre EXACTEMENT à cette description. ` +
  `Ne jamais s'en éloigner.`;

export const CHARACTER_STYLE_IMAGES_INSTRUCTION = (imageUrls: string[]) => {
  const urlsList = imageUrls.map((url, index) => `Image ${index + 1}: ${url}`).join("\n");
  
  return "IMPORTANT : plusieurs images de référence ont été fournies dans la section Style. " +
    "Elles servent UNIQUEMENT à définir le STYLE GRAPHIQUE, pas le cadrage ni la pose. " +
    "Les règles de cadrage full body, PNG, sans décor décrites plus haut RESTENT PRIORITAIRES et ne doivent jamais être modifiées. " +
    "Ces images définissent LE STYLE GRAPHIQUE PRINCIPAL à respecter absolument. " +
    "\n\n" +
    "URLS DES IMAGES DE RÉFÉRENCE À ANALYSER :\n" +
    urlsList +
    "\n\n" +
    "Tu dois analyser ces images et extraire avec la plus grande précision : " +
    "- le type de trait (épaisseur, netteté, texture) " +
    "- la technique de coloriage et d'ombrage (cel-shading, dégradés, hachures, etc.) " +
    "- la palette de couleurs dominante (tons chauds/froids, saturation, contraste) " +
    "- le niveau de détail (très détaillé, semi-détaillé, épuré) " +
    "- le style d'éclairage et les ombres " +
    "- l'ambiance générale (douce, dramatique, sombre, lumineuse, etc.) " +
    "Applique TOUT cela de manière stricte au nouveau personnage que tu vas créer, " +
    "en veillant IMPÉRATIVEMENT à ce que le personnage soit cadré en corps ENTIER (full body), " +
    "de la tête aux pieds, sans aucune coupe au niveau de la tête, des mains ou des pieds. " +
    "Le personnage doit occuper la majorité de la hauteur de l'image tout en restant entièrement visible. " +
    "Très haut niveau de détail. " +
    "\n\n" +
    "RÈGLES STRICTES : " +
    "- NE COPIE AUCUN PERSONNAGE, AUCUN VISAGE, AUCUNE COIFFURE, AUCUN VÊTEMENT, AUCUNE POSE, AUCUNE EXPRESSION des images de référence. " +
    "- NE RECOPIE AUCUNE COMPOSITION ni aucun élément spécifique de contenu. " +
    "- Crée un personnage 100 % original qui semble avoir été dessiné par le même artiste / dans le même style graphique que les images fournies. " +
    "- La cohérence stylistique avec ces images de référence est PLUS IMPORTANTE que tout autre critère. " +
    "- Si le style des images est très reconnaissable (ex: style d'un webtoon connu), reproduis fidèlement cette signature visuelle sans copier les personnages existants.";
};
