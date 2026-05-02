// Whitelist HTML : on ne garde que les balises de formatage propres (bulles dialogue).
const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "s", "strike", "del", "br"]);

export function sanitizeBubbleHtml(html: string): string {
  if (!html) return "";
  let out = html.replace(/<\/(p|div|li|h[1-6])>/gi, "<br>");
  out = out.replace(/<(p|div|li|h[1-6])\b[^>]*>/gi, "");
  out = out.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (_match, slash, tag: string) => {
    const tagLower = tag.toLowerCase();
    return ALLOWED_TAGS.has(tagLower) ? `<${slash}${tagLower}>` : "";
  });
  out = out.replace(/<br\s*\/?>/gi, "<br>");
  out = out.replace(/(<br>\s*){3,}/gi, "<br><br>");
  out = out.replace(/(<br>\s*)+$/i, "");
  return out.trim();
}
