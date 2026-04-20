// System Prompts Optimisés - Webtoon/Manhwa
// Version Free/Pro différenciée - Avril 2026

// ═══════════════════════════════════════════════════════════════
// PERSONNAGES
// ═══════════════════════════════════════════════════════════════

export const buildCharacterPrompt = (
  userDescription: string,
  styleText?: string,
  styleImageUrls?: string[],
  plan: "free" | "pro" = "pro"
) => {
  if (plan === "free") {
    let prompt = `Full body character, facing forward, neutral pose, white background, no cropping.

${userDescription}`;

    if (styleText) {
      prompt += `\n\n${styleText}`;
    }

    prompt += `\n\nHigh quality, clean manga illustration, detailed face and outfit, transparent background.`;

    return prompt;
  }

  // Pro — prompt riche FLUX.2 Pro
  let prompt = `masterpiece, best quality, ultra-detailed, anatomically correct, perfect proportions, professional webtoon art.

Crée un personnage complet (corps entier de la tête aux pieds) en PNG avec fond transparent.

DESCRIPTION DU PERSONNAGE :
${userDescription}

CADRAGE ET COMPOSITION :
- Vue de face, pose neutre, regard vers le spectateur
- Personnage centré, occupant 80% de la hauteur de l'image
- Aucune partie coupée (tête, mains, pieds tous visibles)
- L'image doit REMPLIR le cadre sans espaces blancs ni bandes vides sur les côtés
- Fond 100% transparent, sans décor, ombre, texte ou watermark
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
--- MANGA PAGE — ONE ROW, FOUR VERTICAL PANELS, SAME CHARACTER IN FOUR ANGLES ---

Output ONE single horizontal manga page composed of EXACTLY 4 vertical panels placed side by side on a single row (a 1×4 layout). Each panel is a tall portrait-oriented rectangle with the same dimensions. The panels are separated by thin clean white gutters.

The page shows the SAME CHARACTER standing in a neutral pose, drawn from 4 different angles — one angle per panel. Think of it as 4 frames of an animation turnaround, printed side by side on one page.

STRICT PANEL ORDER, FROM LEFT TO RIGHT:
- Panel 1 (leftmost)  — FRONT       : the character faces the reader, full body, head to feet, face fully visible.
- Panel 2             — LEFT SIDE   : the character's body is rotated about 90° so we see their LEFT side, full body head to feet, head turned to the reader's left showing the profile.
- Panel 3             — RIGHT SIDE  : the character's body is rotated about 90° the other way so we see their RIGHT side, full body head to feet, head turned to the reader's right showing the profile.
- Panel 4 (rightmost) — BACK        : the character is completely turned around, we see only their back, full body head to feet, the face is NOT visible.

SAME CHARACTER IDENTITY IN EVERY PANEL — ABSOLUTE RULE:
Every panel shows the EXACT SAME character. Identical face, identical hair, identical outfit, identical colors, identical accessories, identical proportions. The ONLY thing that changes between panels is the camera angle around the character.

POSE AND FRAMING — IDENTICAL IN EACH PANEL:
- Standing neutral pose, relaxed arms along the body, feet roughly shoulder-width apart.
- Whole body visible from top of head to soles of feet. NO cropping of head, hands or feet.
- Character occupies about 85% of the panel height, centered horizontally.

BACKGROUND AND LIGHTING — IDENTICAL IN EACH PANEL:
- Pure solid white background (#FFFFFF). No gradient, no texture, no ground, no cast shadow.
- Flat, even, neutral frontal lighting.

HARD FORMAT RULES — NEVER VIOLATE:
- The output is ONE single image, ONE horizontal row, EXACTLY 4 panels. Not 2, not 3, not 5.
- EVERY panel contains a FULL BODY head to feet. Never a headshot, never a bust, never just a face.
- The 4 panels are all the same size and share the same baseline.
- Layout is strictly 1 row × 4 columns. There is NO second row. There are NO stacked images.

WHAT MUST NEVER APPEAR (Flux is known to add these — DO NOT):
- NO second row of portrait headshots above or below the panels.
- NO floating face close-up, NO expression chart, NO emotion chart, NO mood board.
- NO isolated head, NO isolated bust, NO waist-up crop, NO disembodied hand.
- NO extra portrait panel. NO bonus sketch. NO chibi inset. NO additional panel beyond the 4 views.
- NO second character, NO companion, NO child version, NO older version, NO alternate outfit version.
- NO color swatches, NO fabric samples, NO palette chip.
- NO text, NO speech bubble, NO label, NO arrow, NO number, NO annotation, NO watermark, NO signature.
- NO background scenery, NO landscape, NO interior, NO prop, NO furniture.
- NO hat unless explicitly requested in the character description.
- NO action pose, NO running, NO jumping, NO combat pose.

FINAL REMINDER: ONE image. ONE horizontal row. FOUR vertical panels, same size, same character, four angles: front — left side — right side — back.
`.trim();

export const SHEET_NEGATIVE_HINTS = `
NEGATIVE / DO NOT GENERATE:
Second row of panels, stacked rows, 2x2 grid, extra row of headshots above or below the main row.
Portrait headshot strip, expression chart, emotion grid, face chart, mood board, headshot banner.
Floating disembodied head, floating hand, isolated bust, cropped torso, waist-up crop, any detached body part.
Second character, companion character, background silhouette, child or adult alternate, more than one figure inside a single panel.
Color swatch panel, fabric sample, material chip.
Text, letters, numbers, label, arrow, annotation, watermark, signature, speech bubble.
Decorative frame, ornate border, vignette, film letterbox, rounded corners.
Background scenery, landscape, interior décor, furniture, sky, ground texture.
Hat or cap not described in the character text.
Action pose, combat stance, running figure, jumping figure, weapon swing.
Extra bonus panel beyond the 4 required views, chibi inset, portrait inset.
The final image must be ONE horizontal manga page with EXACTLY 4 vertical full-body panels: front, left side, right side, back.
`.trim();

/**
 * Instruction explicite à ajouter au prompt quand on édite la sheet à partir
 * de la vue de face déjà générée (flux-2-pro/edit). La face sert alors de
 * modèle d'identité strict pour les 4 panneaux.
 */
export const SHEET_FROM_FACE_INSTRUCTION = `
IDENTITY REFERENCE — USE THE PROVIDED REFERENCE IMAGE AS THE CHARACTER MODEL:
The first reference image attached to this request IS THE CHARACTER to reproduce across the 4 panels. Treat it as the definitive identity model. All 4 panels must show THAT EXACT character — same face, same hair, same outfit, same colors, same proportions, same art style — only the viewing angle changes.

- Panel 1 (FRONT)      : re-render the reference character as-is, facing the reader, full body head to feet.
- Panel 2 (LEFT SIDE)  : same character rotated ~90° to the reader's left, full body, side view.
- Panel 3 (RIGHT SIDE) : same character rotated ~90° to the reader's right, full body, side view.
- Panel 4 (BACK)       : same character turned 180°, only the back is visible, full body, no face.

Do NOT reinterpret the character. Do NOT change hair color, do NOT change outfit, do NOT change skin tone, do NOT alter the age. The reference image is the absolute law for identity — the layout above is the absolute law for panel order and angle.
`.trim();

export const buildCharacterSheetPrompt = (
  userDescription: string,
  styleText?: string,
  useFaceReference: boolean = false
): string => {
  const parts: string[] = [
    "masterpiece, best quality, ultra-detailed, clean manga page — ONE horizontal row of EXACTLY 4 vertical full-body panels showing the SAME character from 4 different angles.",
    "",
    "CHARACTER DESCRIPTION (the SAME character is drawn in all 4 panels — only the angle changes):",
    userDescription.trim(),
  ];

  if (styleText?.trim()) {
    parts.push(
      "",
      "ART STYLE (apply identically to the 4 panels — line weight, shading, palette, rendering):",
      styleText.trim()
    );
  }

  if (useFaceReference) {
    parts.push("", SHEET_FROM_FACE_INSTRUCTION);
  }

  parts.push("", SHEET_COMPOSITE_INSTRUCTION, "", SHEET_NEGATIVE_HINTS);
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
