// System Prompts Optimisés - Webtoon/Manhwa
// Version Free/Pro différenciée - Avril 2026

// ═══════════════════════════════════════════════════════════════
// PERSONNAGES
// ═══════════════════════════════════════════════════════════════

export const buildCharacterPrompt = (
  userDescription: string,
  styleText?: string,
  styleImageUrls?: string[],
  _plan?: string
) => {
  // FLUX.2 Pro — prompt riche
  let prompt = `masterpiece, best quality, ultra-detailed, anatomically correct, perfect proportions, professional webtoon art.

Crée un personnage complet (corps entier de la tête aux pieds) isolé sur un fond BLANC PUR (#FFFFFF), sans aucun décor.

DESCRIPTION DU PERSONNAGE :
${userDescription}

CADRAGE ET COMPOSITION :
- Vue de face, pose neutre, regard vers le spectateur
- Personnage centré, occupant 80% de la hauteur de l'image
- Aucune partie coupée (tête, mains, pieds tous visibles)
- L'image doit REMPLIR le cadre sans espaces blancs ni bandes vides sur les côtés
- Fond BLANC PUR (#FFFFFF), uni, plat, sans gradient, sans texture, sans ombre portée
- STRICTEMENT INTERDIT en arrière-plan : décor, sol, ombre au sol, ciel, mur, intérieur, mobilier, accessoire, plante, objet parasite, texte, watermark, signature
- Seul le personnage est visible — aucun élément autre que le personnage sur fond blanc
- Très haute qualité de détails (visage, yeux, cheveux, vêtements)`;

  if (styleText) {
    prompt += `\n\nSTYLE ARTISTIQUE :
${styleText}
Applique ce style à 100% : traits, ombrage, palette (monochrome N&B ou couleur selon le style imposé ci-dessus), proportions, rendu.`;
  }

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
// CHARACTER REFERENCE SHEET — Composite 2×2 (face / profil G / profil D / dos)
// Source de vérité visuelle pour la cohérence des panels.
// Compatible FLUX.1 Schnell (Free) et FLUX.2 Pro (Pro, text + edit).
// ═══════════════════════════════════════════════════════════════

export const SHEET_COMPOSITE_INSTRUCTION = `
Character turnaround sheet — ONE horizontal image, EXACTLY 4 equal-width panels, SAME subject, 4 angles.

Panels, left to right:
1. FRONT — subject faces the viewer.
2. LEFT SIDE — subject rotated 90°, facing screen-right (viewer sees the subject's left side).
3. RIGHT SIDE — subject rotated 90° the OTHER way, facing screen-left (viewer sees the subject's right side). Horizontal mirror of panel 2.
4. REAR — subject rotated 180° away from the viewer (opposite of panel 1). No face visible.

Rules:
- Exactly 4 panels, equal width (25% each), same baseline, 1 row × 4 columns. No second row.
- Whole subject visible in each panel (no crop).
- Same subject in every panel: identical design, identical colors, identical accessories. Only the viewing angle changes.
- Neutral pose, identical in all 4 panels.
- Pure white background (#FFFFFF) in every panel. No scenery, no ground, no shadow, no gradient.

Do not add:
- No extra panel, no bonus portrait, no face close-up, no expression chart, no headshot strip.
- No second subject, no alternate version, no chibi, no inset.
- No text, label, number, watermark, signature.
- No panel wider than the others.
- Panels 2 and 3 must face OPPOSITE directions (mirror). Never two identical side views.
- Panel 4 is the rear view — the face is not visible. Never replace panel 4 with a portrait.
`.trim();

export const SHEET_NEGATIVE_HINTS = `
Negative (do not generate): extra panel beyond the 4 views, bonus portrait, face close-up, expression chart, mood board, second row of headshots, inset, chibi version, second subject, alternate outfit, color swatches, text, label, watermark, signature, background scenery, decorative frame. No panel wider than the others. No two panels facing the same direction. No visible face in the rear view.
`.trim();

/**
 * Instruction explicite à ajouter au prompt quand on édite la sheet à partir
 * de la vue de face déjà générée (flux-2-pro/edit). La face sert alors de
 * modèle d'identité strict pour les 4 panneaux.
 */
export const SHEET_FROM_FACE_INSTRUCTION = `
The first reference image IS the subject. All 4 panels must reproduce it exactly:
- Same identity: same design, proportions, features, age, outfit, accessories.
- Same drawing technique: same line weight, same inking level, same shading method.
- Same palette: if the reference is monochrome (black & white, ink-only), ALL 4 panels must stay monochrome. If the reference is colored, use the exact same colors. Never add color to a monochrome reference. Never desaturate a colored reference.
Do not reinterpret, do not soften, do not "improve". If the textual description conflicts with the reference, the reference wins.
`.trim();

export const buildCharacterSheetPrompt = (
  userDescription: string,
  styleText?: string,
  useFaceReference: boolean = false
): string => {
  const parts: string[] = [SHEET_COMPOSITE_INSTRUCTION];

  if (useFaceReference) {
    parts.push("", SHEET_FROM_FACE_INSTRUCTION);
  }

  parts.push("", `Subject: ${userDescription.trim()}`);

  if (styleText?.trim()) {
    parts.push("", `Style: ${styleText.trim()}`);
  }

  parts.push("", SHEET_NEGATIVE_HINTS);
  return parts.join("\n");
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

/*
## Tableau Free vs Pro — Génération d'assets (CLAUDE.md source de vérité)

| Fonctionnalité                        | Free                  | Pro                        |
|---------------------------------------|-----------------------|----------------------------|
| Modèle IA                             | FLUX.1 Schnell        | FLUX.2 Pro                 |
| Qualité de rendu                      | Standard              | Ultra-détaillé             |
| Prompt optimisé                       | Simplifié             | Riche et précis            |
| Images de référence style (projet)    | ✗                     | ✓ (2 images max)           |
| Character sheet composite 2×2 (perso) | ✓                     | ✓                          |
| Générations / mois                    | 20                    | 300                        |

Règle métier : 1 appel "générer un personnage" = 1 crédit débité, et produit
simultanément la vue de face (asset card) + la sheet 4 angles (cohérence panels).
Multi-vues séparées (profile_left / profile_right / back) supprimées depuis la
refonte Sheet System d'avril 2026.
*/
