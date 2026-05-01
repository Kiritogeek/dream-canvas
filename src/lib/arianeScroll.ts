/** Fait défiler l’éditeur scénario vers un passage (extrait) et place le curseur. */

export function findExcerptIndex(fullText: string, excerpt: string): number {
  const norm = excerpt.trim();
  if (!norm) return -1;
  let idx = fullText.indexOf(excerpt);
  if (idx >= 0) return idx;
  idx = fullText.indexOf(norm);
  if (idx >= 0) return idx;
  if (norm.length > 35) {
    idx = fullText.indexOf(norm.slice(0, 35));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function scrollChapterEditorToIndex(
  textarea: HTMLTextAreaElement,
  scrollParent: HTMLElement,
  fullText: string,
  charIndex: number
): void {
  const safeIdx = Math.max(0, Math.min(charIndex, fullText.length));
  const before = fullText.slice(0, safeIdx);
  const lineIdx = before.split("\n").length - 1;
  const cs = getComputedStyle(textarea);
  const lineHeight = parseFloat(cs.lineHeight);
  const lh = Number.isFinite(lineHeight) ? lineHeight : 28.8;
  const lineOffset = lineIdx * lh;
  const taRect = textarea.getBoundingClientRect();
  const spRect = scrollParent.getBoundingClientRect();
  const yInScroll =
    taRect.top - spRect.top + scrollParent.scrollTop + lineOffset;
  scrollParent.scrollTo({
    top: Math.max(0, yInScroll - spRect.height * 0.18),
    behavior: "smooth",
  });
  textarea.focus();
  const end = Math.min(safeIdx + 1, fullText.length);
  textarea.setSelectionRange(safeIdx, end);
}

export function scrollChapterEditorToExcerpt(
  textarea: HTMLTextAreaElement | null,
  scrollParent: HTMLElement | null,
  fullText: string,
  excerpt: string
): boolean {
  if (!textarea || !scrollParent) return false;
  const idx = findExcerptIndex(fullText, excerpt);
  if (idx < 0) return false;
  scrollChapterEditorToIndex(textarea, scrollParent, fullText, idx);
  return true;
}
