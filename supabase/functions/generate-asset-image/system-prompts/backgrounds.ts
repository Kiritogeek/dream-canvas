// System Prompts Optimisés - Webtoon/Manhwa
// Version courte et claire - Février 2026

// ═══════════════════════════════════════════════════════════════
// BACKGROUNDS (DÉCORS)
// ═══════════════════════════════════════════════════════════════

export const buildBackgroundPrompt = (
  userDescription: string,
  styleText?: string,
  styleImageUrls?: string[]
) => {
  let prompt = `Crée un décor pour webtoon/manhwa.

DESCRIPTION DU DÉCOR :
${userDescription}

CADRAGE ET COMPOSITION :
- Environnement, lieu ou paysage uniquement
- AUCUN personnage ni créature visible
- Format vertical adapté aux webtoons
- Composition lisible avec profondeur de champ
- Lumière claire et bien définie`;

  // Ajout du style textuel
  if (styleText) {
    prompt += `\n\nSTYLE ARTISTIQUE :
${styleText}
Applique ce style à 100% : traits, ombrage, couleurs, textures, rendu.`;
  }

  // Ajout des images de référence style
  if (styleImageUrls && styleImageUrls.length > 0) {
    prompt += `\n\nIMAGES DE RÉFÉRENCE STYLE :
${styleImageUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

ANALYSE ET REPRODUIS le style graphique de ces images :
- Type et épaisseur des traits
- Technique d'ombrage et coloriage
- Palette de couleurs et ambiance
- Niveau de détail
- Traitement de la perspective
- Rendu des textures (matériaux, surfaces, végétation)

ATTENTION :
✓ Copie UNIQUEMENT le style graphique
✗ Ne copie JAMAIS les décors ou lieux spécifiques des références
✓ Crée un décor 100% original dans ce style`;
  }

  return prompt;
};

// ═══════════════════════════════════════════════════════════════
// FONCTIONS DE COMPATIBILITÉ (pour l'ancien code)
// ═══════════════════════════════════════════════════════════════

export const BACKGROUND_BASE_PROMPT =
  "Décor uniquement : environnement, lieu, paysage ou intérieur. Aucun personnage ni créature visible. " +
  "La scène doit être exploitable comme décor de bande dessinée / webtoon (composition lisible, profondeur, lumière claire). " +
  "Format vertical adapté aux webtoons, avec une composition équilibrée et une profondeur de champ bien définie.";

export const BACKGROUND_STYLE_TEXT_INSTRUCTION = (styleText: string) =>
  `STYLE ARTISTIQUE OBLIGATOIRE : ${styleText || "aucun style texte fourni"}. ` +
  `Ce style est la référence principale et doit être appliqué à 100 %. ` +
  `Tous les aspects (épaisseur et qualité des traits, technique d'ombrage, palette de couleurs, niveau de détail, rendu des volumes, traitement de la lumière, textures) doivent correspondre EXACTEMENT à cette description. ` +
  `Ne jamais s'en éloigner.`;

export const BACKGROUND_STYLE_IMAGES_INSTRUCTION = (imageUrls: string[]) => {
  const urlsList = imageUrls.map((url, index) => `Image ${index + 1}: ${url}`).join("\n");
  
  return "IMPORTANT : plusieurs images de référence ont été fournies dans la section Style. " +
    "Elles servent UNIQUEMENT à définir le STYLE GRAPHIQUE du décor, pas le contenu spécifique ni la composition. " +
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
    "- le traitement des volumes et de la perspective " +
    "- l'ambiance générale (douce, dramatique, sombre, lumineuse, etc.) " +
    "- le rendu des textures (matériaux, surfaces, végétation, etc.) " +
    "Applique TOUT cela de manière stricte au décor que tu vas créer. " +
    "\n\n" +
    "RÈGLES STRICTES : " +
    "- NE COPIE AUCUN DÉCOR SPÉCIFIQUE, AUCUNE COMPOSITION, AUCUN ÉLÉMENT DE CONTENU des images de référence. " +
    "- NE RECOPIE AUCUNE SCÈNE ni aucun lieu précis. " +
    "- Crée un décor 100 % original qui semble avoir été dessiné par le même artiste / dans le même style graphique que les images fournies. " +
    "- La cohérence stylistique avec ces images de référence est PLUS IMPORTANTE que tout autre critère. " +
    "- Si le style des images est très reconnaissable (ex: style d'un webtoon connu), reproduis fidèlement cette signature visuelle sans copier les décors existants.";
};
