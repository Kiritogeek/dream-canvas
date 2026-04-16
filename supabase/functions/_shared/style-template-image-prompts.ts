/**
 * Prompts FAL utilisés pour générer les images d’exemple du carousel (admin).
 * Source unique : le style sauvegardé sur le projet doit reprendre ces mêmes prompts.
 */

export type TemplateStyleKey =
  | "manga"
  | "webtoon-coreen"
  | "manhwa-chinois"
  | "europeen";
export type TemplateImageType = "character" | "background" | "scene";

export interface StyleTemplateImageDefinition {
  style: TemplateStyleKey;
  type: TemplateImageType;
  prompt: string;
}

export const STYLE_TEMPLATE_IMAGE_DEFINITIONS: StyleTemplateImageDefinition[] = [
  {
    style: "manga",
    type: "character",
    prompt:
      "Premium manga style reference character. One iconic protagonist with strong silhouette, razor-sharp black ink lines, refined screentone gradients, expressive eyes, confident stance, cinematic waist-up framing. Add subtle cloth folds, hair strand details, and dramatic rim light in grayscale. High readability, editorial-quality finish. Full-bleed composition, subject fills the frame edge-to-edge with no white margins, no blank borders, no matte frame, no empty padding. No text, no watermark.",
  },
  {
    style: "manga",
    type: "background",
    prompt:
      "Premium manga style reference background. Dense urban alley at dusk with dramatic one-point perspective, layered architecture depth, cables, signs, textures, atmospheric haze, and precise line hierarchy. Black-and-white rendering with controlled screentone values and rich contrast separation between foreground/midground/background. No characters. Full-bleed edge-to-edge composition with environment details touching all borders. The outermost pixels on all four edges must contain non-white scene details and grayscale texture (never pure or near-white). Keep frame edges textured with linework/screentone and avoid bright white bands. No white margins, no blank borders, no matte frame, no empty padding. No text, no watermark.",
  },
  {
    style: "manga",
    type: "scene",
    prompt:
      "Premium manga style reference scene. Two characters in an intense emotional standoff, cinematic camera angle, dynamic composition lines, dramatic depth, and polished black-and-white inking with layered screentones. Add motion energy through framing and contrast, while keeping faces readable and expressive. Full-bleed edge-to-edge artwork, no white margins, no blank borders, no matte frame, no empty padding. No speech bubbles, no text, no watermark.",
  },
  {
    style: "webtoon-coreen",
    type: "character",
    prompt:
      "Premium Korean webtoon style reference character. Highly polished full-color digital illustration with clean linework, soft skin gradients, glossy hair lighting, modern fashion details, and expressive cinematic eyes. Medium portrait framing with elegant pose and premium mobile-webtoon finish. Use rich but balanced color harmony and subtle bloom highlights. Full-bleed composition, subject fills the frame edge-to-edge, no white margins, no blank borders, no matte frame, no empty padding. No text, no watermark.",
  },
  {
    style: "webtoon-coreen",
    type: "background",
    prompt:
      "Premium Korean webtoon style reference background. Contemporary city rooftop at sunset with cinematic sky gradient, reflective surfaces, layered skyline depth, signage details, atmospheric perspective, and crisp digital painting quality. Rich color storytelling with warm rim light and cool shadow balance, optimized for immersive mobile reading. No people. Full-bleed edge-to-edge composition with detailed environment filling the entire frame. The outermost pixels on all four edges must contain scene color/details (never plain white). Absolutely no white margins, no blank borders, no matte frame, no empty padding. No text, no watermark.",
  },
  {
    style: "webtoon-coreen",
    type: "scene",
    prompt:
      "Premium Korean webtoon style reference scene. Emotional close-up between two characters with cinematic storytelling, luminous color grading, realistic depth of field, refined facial micro-expressions, and high-detail eye rendering. Add layered foreground/background separation and subtle atmospheric glow for dramatic impact. Full-bleed edge-to-edge artwork with no white margins, no blank borders, no matte frame, no empty padding. No speech balloons, no text, no watermark.",
  },
  {
    style: "manhwa-chinois",
    type: "character",
    prompt:
      "Chinese manhua inspired style reference character. Heroic warrior, ornate costume, intense expression, vivid color contrast, dramatic lighting, high-detail digital art. Full-bleed composition, subject fills the frame, no white margins, no blank borders, no empty padding. No text, no watermark.",
  },
  {
    style: "manhwa-chinois",
    type: "background",
    prompt:
      "Chinese manhua inspired style reference background. Ancient fantasy palace courtyard, epic scale, rich ornament details, dramatic light rays, vivid colors, no characters. Full-bleed composition with dense environment details touching all edges, edge-to-edge artwork, absolutely no white margins, no blank borders, no framing matte, no empty padding. Fill the entire canvas with scenery. No text, no watermark.",
  },
  {
    style: "manhwa-chinois",
    type: "scene",
    prompt:
      "Chinese manhua inspired style reference scene. Dramatic fantasy moment, dynamic camera angle, powerful visual atmosphere, saturated cinematic colors. Full-bleed composition, edge-to-edge artwork, no white margins, no blank borders, no empty padding. No text, no watermark.",
  },
  {
    style: "europeen",
    type: "character",
    prompt:
      "Premium European comic style reference character. Clear ligne claire inspired linework, elegant silhouette, balanced proportions, nuanced facial expression, refined costume details, soft pastel grading with subtle texture. Editorial-quality finish, readable anatomy, cinematic half-body framing. Full-bleed composition with no white margins, no blank borders, no matte frame, no empty padding. No text, no watermark.",
  },
  {
    style: "europeen",
    type: "background",
    prompt:
      "Premium European comic style reference background. Atmospheric old-town street with strong perspective, rich architectural details, handcrafted textures, gentle pastel color harmony, light watercolor-like shading and clean contour hierarchy. No characters. Full-bleed edge-to-edge artwork with environment details touching all borders. No white margins, no blank borders, no matte frame, no empty padding. No text, no watermark.",
  },
  {
    style: "europeen",
    type: "scene",
    prompt:
      "Premium European comic style reference scene. Two characters interacting in a narrative moment, cinematic composition, expressive gesture language, clear staging, pastel yet vivid palette, clean European BD rendering with tasteful texture. Full-bleed edge-to-edge artwork, no white margins, no blank borders, no matte frame, no empty padding. No speech bubbles, no text, no watermark.",
  },
];

export function getReferencePromptsForStyle(
  styleKey: string
): { character: string; background: string; scene: string } | null {
  const character = STYLE_TEMPLATE_IMAGE_DEFINITIONS.find(
    (d) => d.style === styleKey && d.type === "character"
  )?.prompt;
  const background = STYLE_TEMPLATE_IMAGE_DEFINITIONS.find(
    (d) => d.style === styleKey && d.type === "background"
  )?.prompt;
  const scene = STYLE_TEMPLATE_IMAGE_DEFINITIONS.find(
    (d) => d.style === styleKey && d.type === "scene"
  )?.prompt;
  if (!character || !background || !scene) return null;
  return { character, background, scene };
}

export function isTemplateStyleKey(key: string): key is TemplateStyleKey {
  return (
    key === "manga" ||
    key === "webtoon-coreen" ||
    key === "manhwa-chinois" ||
    key === "europeen"
  );
}
