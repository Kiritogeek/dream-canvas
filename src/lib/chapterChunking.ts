// Découpage d'un chapitre long en parties pour detect_blocks.
// WHY : l'Edge Function tronque l'entrée à ~16 000 chars (shrinkTextByTokens 4 000 tokens)
// et un chapitre light novel entier produit plus de cases que le plafond de sortie /
// le timeout 90s ne le permettent. En envoyant des parties bornées, chaque appel
// reste sous toutes les limites et AUCUN texte n'est perdu.

/** En dessous de ce seuil, pas de découpage : un seul appel suffit. */
export const DETECT_CHUNK_THRESHOLD_CHARS = 9_000;
/** Taille visée d'une partie (marge sous la troncature serveur de ~16 000 chars). */
export const DETECT_CHUNK_TARGET_CHARS = 7_500;

/** Coupe un paragraphe trop long aux frontières de phrases. */
function splitLongParagraph(paragraph: string, targetChars: number): string[] {
  const sentences = paragraph.match(/[^.!?…]+[.!?…]+["»']?\s*|[^.!?…]+$/g) ?? [paragraph];
  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > targetChars) {
      parts.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Découpe le contenu d'un chapitre en parties de ~targetChars, aux frontières
 * de paragraphes (double saut de ligne), sans jamais perdre de texte.
 * Retourne [content] tel quel si le chapitre tient en un seul appel.
 */
export function splitChapterForDetection(
  content: string,
  targetChars: number = DETECT_CHUNK_TARGET_CHARS
): string[] {
  const trimmed = content.trim();
  if (trimmed.length <= DETECT_CHUNK_THRESHOLD_CHARS) return [trimmed];

  const paragraphs = trimmed.split(/\n{2,}/);
  const parts: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) parts.push(current.trim());
    current = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > targetChars) {
      // Paragraphe monstre (prose collée sans sauts de ligne) : frontières de phrases.
      pushCurrent();
      const pieces = splitLongParagraph(paragraph, targetChars);
      for (const piece of pieces.slice(0, -1)) parts.push(piece);
      current = pieces[pieces.length - 1] ?? "";
      continue;
    }
    if (current && current.length + 2 + paragraph.length > targetChars) {
      pushCurrent();
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  pushCurrent();

  // Éviter une dernière partie minuscule (découpage IA de mauvaise qualité) :
  // la fusionner avec la précédente si le total reste raisonnable.
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    const prev = parts[parts.length - 2];
    if (last.length < 2_000 && prev.length + 2 + last.length <= targetChars * 1.4) {
      parts.splice(parts.length - 2, 2, `${prev}\n\n${last}`);
    }
  }

  return parts;
}
