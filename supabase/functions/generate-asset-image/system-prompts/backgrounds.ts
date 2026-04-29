// System Prompts Optimisés - Webtoon/Manhwa
// Version Free/Pro différenciée - Avril 2026

// ═══════════════════════════════════════════════════════════════
// BACKGROUNDS (DÉCORS)
// ═══════════════════════════════════════════════════════════════

export const buildBackgroundPrompt = (
  userDescription: string,
  styleText?: string,
  styleImageUrls?: string[],
  plan: "free" | "pro" = "pro"
) => {
  const FULLBLEED =
    `Full-bleed illustration, edge-to-edge, fills 100% of canvas. ` +
    `NO white border, NO white margin, NO frame, NO letterbox, NO empty corners. ` +
    `Scene content bleeds to every pixel of all four edges.`;

  const FULLBLEED_CLOSE =
    `\n\nSTRICT: zero white border, zero margin, zero frame — every pixel on all 4 edges must be scene content.`;

  if (plan === "free") {
    let prompt = styleText
      ? `${FULLBLEED}\n\nSTYLE ARTISTIQUE (prioritaire) : ${styleText}\n\nDESCRIPTION : ${userDescription}`
      : `${FULLBLEED}\n\nBackground illustration, full frame.\n\n${userDescription}`;

    prompt += `\n\nEnvironnement uniquement — aucun personnage, aucune créature. Composition lisible, profondeur de champ, lumière bien définie.`;
    prompt += FULLBLEED_CLOSE;

    return prompt;
  }

  // Pro — prompt riche FLUX.2 Pro
  let prompt = styleText
    ? `STYLE ARTISTIQUE (PRIORITAIRE) : ${styleText}\n\n`
    : "";

  prompt += `${FULLBLEED} masterpiece, best quality, ultra-detailed, cinematic composition, atmospheric depth, professional background art.

DESCRIPTION DU DÉCOR :
${userDescription}

CADRAGE (OBLIGATOIRE) :
- Environnement, lieu ou paysage uniquement — AUCUN personnage ni créature
- REMPLISSAGE TOTAL bord à bord : aucun espace vide, aucune zone blanche, aucune marge
- Scène qui déborde jusqu'aux quatre bords exacts — rien ne s'arrête avant le bord
- Composition lisible, profondeur de champ, lumière claire`;

  if (styleText) {
    prompt += `\n\nRAPPEL STYLE : ${styleText.slice(0, 300)}`; // rappel final pour ancrer le style
  }

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

export const buildBackgroundSheetPrompt = (
  userDescription: string,
  styleText?: string,
  plan: "free" | "pro" = "pro"
) => {
  if (plan === "free") {
    let prompt = styleText
      ? `Background reference sheet, 2x2 grid, 4 angles of the same location (wide shot, side angle, close foreground, elevated view). No characters.\n\nSTYLE ARTISTIQUE :\n${styleText}\n\nDESCRIPTION :\n${userDescription}`
      : `Background reference sheet, 2x2 grid, 4 angles of the same location. No characters.\n\n${userDescription}`;

    prompt += `\n\nHigh quality, detailed, consistent palette and style across all 4 panels. No white borders, no empty space between panels.`;

    return prompt;
  }

  // Pro — prompt riche FLUX.2 Pro
  let prompt = `masterpiece, best quality, ultra-detailed, cinematic composition, professional background art.

Crée une sheet de décor en une seule image composite, format carré ou paysage (jamais format webtoon vertical).

DESCRIPTION DU DÉCOR :
${userDescription}

MISE EN PAGE (OBLIGATOIRE) :
- Layout 2x2 avec 4 vignettes différentes du MÊME décor (même lieu, même identité visuelle).
- Vignette A : vue large d'ensemble.
- Vignette B : angle latéral (camera shift) du même lieu.
- Vignette C : variation de profondeur (avant-plan marqué) du même lieu.
- Vignette D : variation d'élévation (plus bas ou plus haut) du même lieu.

RÈGLES :
- AUCUN personnage, AUCUNE créature.
- AUCUN texte, AUCUN watermark.
- Les 4 vignettes doivent remplir leurs zones sans bandes vides.
- Cohérence stricte d'architecture, de palette et d'ambiance entre les 4 vues.
- Qualité premium avec perspective lisible.`;

  if (styleText) {
    prompt += `\n\nSTYLE ARTISTIQUE À APPLIQUER (OBLIGATOIRE) :
${styleText}

Applique ce style à 100% sur les 4 vignettes (traits, ombrage, palette, textures, lumière, rendu).`;
  }

  return prompt;
};

// ═══════════════════════════════════════════════════════════════
// FONCTIONS DE COMPATIBILITÉ (pour l'ancien code)
// ═══════════════════════════════════════════════════════════════

export const BACKGROUND_BASE_PROMPT =
  "Décor uniquement : environnement, lieu, paysage ou intérieur. Aucun personnage ni créature visible. " +
  "La scène doit être exploitable comme décor de bande dessinée / webtoon (composition lisible, profondeur, lumière claire). " +
  "L'illustration doit REMPLIR ENTIÈREMENT le cadre de l'image, bord à bord, sans espace blanc ni bande vide. " +
  "Composition équilibrée avec une profondeur de champ bien définie.";

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
