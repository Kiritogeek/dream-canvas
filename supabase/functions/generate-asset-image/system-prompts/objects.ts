// System Prompts Optimisés - Webtoon/Manhwa
// Version Free/Pro différenciée - Avril 2026

// ═══════════════════════════════════════════════════════════════
// OBJETS
// ═══════════════════════════════════════════════════════════════

export const buildObjectPrompt = (
  userDescription: string,
  styleText?: string,
  styleImageUrls?: string[],
  _plan?: string
) => {
  // FLUX.2 Pro — prompt riche
  let prompt = `masterpiece, best quality, ultra-detailed, product design quality, clean render, professional illustration.

Crée un objet en PNG avec fond transparent.

DESCRIPTION DE L'OBJET :
${userDescription}

CADRAGE ET COMPOSITION :
- Objet seul, bien centré et lisible
- L'INTÉGRALITÉ de l'objet doit être visible : aucune partie coupée par les bords de l'image
- L'objet doit occuper environ 70-80% de l'image, avec des marges suffisantes tout autour
- Cadrage serré mais complet : on voit l'objet EN ENTIER sous tous ses angles
- Fond 100% transparent, sans décor, personnage, texte ou watermark
- L'image doit remplir tout le cadre sans espaces blancs ni bandes vides : l'illustration doit coïncider exactement avec la taille de la card, sans bord ni marge visibles
- Très haute qualité de détails (contours, volumes, textures, matériaux)`;

  if (styleText) {
    prompt += `\n\nSTYLE ARTISTIQUE :
${styleText}
Applique ce style à 100% : traits, ombrage, palette (N&B ou couleur selon le style imposé), rendu des matériaux.`;
  }

  if (styleImageUrls && styleImageUrls.length > 0) {
    prompt += `\n\nIMAGES DE RÉFÉRENCE STYLE :
${styleImageUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

ANALYSE ET REPRODUIS le style graphique de ces images :
- Type et épaisseur des traits
- Technique d'ombrage et coloriage
- Palette de couleurs
- Rendu des matériaux et reflets
- Traitement des volumes

ATTENTION :
✓ Copie UNIQUEMENT le style graphique
✗ Ne copie JAMAIS les objets spécifiques des références
✓ Crée un objet 100% original dans ce style`;
  }

  return prompt;
};

export const buildObjectSheetPrompt = (
  userDescription: string,
  styleText?: string,
  _plan?: string
) => {
  // FLUX.2 Pro — prompt riche
  let prompt = `masterpiece, best quality, ultra-detailed, product design quality, professional illustration.

Crée une sheet d'objet en une seule image composite, format carré ou paysage (jamais format webtoon vertical).

DESCRIPTION DE L'OBJET :
${userDescription}

MISE EN PAGE (OBLIGATOIRE) :
- Layout 2x2 avec 4 vignettes du MÊME objet.
- Vignette A : vue face.
- Vignette B : vue 3/4 gauche.
- Vignette C : vue 3/4 droite.
- Vignette D : vue arrière ou vue de dessus selon ce qui rend l'objet le plus lisible.

RÈGLE D'IDENTITÉ :
- Garder EXACTEMENT le même objet (forme, matériaux, couleurs, détails).
- Ne changer que l'angle de vue.

RÈGLES DE RENDU :
- Objet entièrement visible dans chaque vignette (aucune coupe).
- Fond transparent ou neutre très discret sans décor parasite.
- AUCUN texte, AUCUN watermark.
- Qualité premium (contours, volumes, textures).`;

  if (styleText) {
    prompt += `\n\nSTYLE ARTISTIQUE À APPLIQUER (OBLIGATOIRE) :
${styleText}

Applique ce style à 100% sur les 4 vignettes (traits, ombrage, palette, matériaux, rendu).`;
  }

  return prompt;
};

// ═══════════════════════════════════════════════════════════════
// FONCTIONS DE COMPATIBILITÉ (pour l'ancien code)
// ═══════════════════════════════════════════════════════════════

export const OBJECT_BASE_PROMPT =
  "Objet seul en PNG, fond entièrement transparent. Uniquement l'objet principal, bien centré et lisible, sans décor ni personnage. " +
  "L'INTÉGRALITÉ de l'objet doit être visible : aucune partie coupée par les bords de l'image. " +
  "L'objet occupe environ 70-80% du cadre avec des marges suffisantes tout autour. " +
  "L'image remplit le cadre sans espaces blancs ni bandes vides. " +
  "Très haut niveau de détail sur les contours, les volumes et les textures de l'objet.";

export const OBJECT_STYLE_TEXT_INSTRUCTION = (styleText: string) =>
  `STYLE ARTISTIQUE OBLIGATOIRE : ${styleText || "aucun style texte fourni"}. ` +
  `Ce style est la référence principale et doit être appliqué à 100 %. ` +
  `Tous les aspects (épaisseur et qualité des traits, technique d'ombrage, palette de couleurs, niveau de détail, rendu des volumes, traitement de la lumière, reflets et matériaux) doivent correspondre EXACTEMENT à cette description. ` +
  `Ne jamais s'en éloigner.`;

export const OBJECT_STYLE_IMAGES_INSTRUCTION = (imageUrls: string[]) => {
  const urlsList = imageUrls.map((url, index) => `Image ${index + 1}: ${url}`).join("\n");

  return "IMPORTANT : plusieurs images de référence ont été fournies dans la section Style. " +
    "Elles servent UNIQUEMENT à définir le STYLE GRAPHIQUE de l'objet, pas le contenu spécifique ni la forme précise. " +
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
    "- le rendu des matériaux et des reflets " +
    "- le traitement des volumes et des contours " +
    "- l'ambiance générale (douce, dramatique, sombre, lumineuse, etc.) " +
    "Applique TOUT cela de manière stricte à l'objet que tu vas créer. " +
    "\n\n" +
    "RÈGLES STRICTES : " +
    "- NE COPIE AUCUN OBJET SPÉCIFIQUE, AUCUNE FORME PRÉCISE, AUCUN DÉTAIL DE CONTENU des images de référence. " +
    "- NE RECOPIE AUCUNE SCÈNE ni aucun élément spécifique. " +
    "- Crée un objet 100 % original qui semble avoir été dessiné par le même artiste / dans le même style graphique que les images fournies. " +
    "- La cohérence stylistique avec ces images de référence est PLUS IMPORTANTE que tout autre critère. " +
    "- Si le style des images est très reconnaissable (ex: style d'un webtoon connu), reproduis fidèlement cette signature visuelle sans copier les objets existants.";
};
