// Whitelist HTML : on ne garde que les balises de formatage propres (bulles dialogue).
const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "s", "strike", "del", "br"]);

// Après le passage whitelist, les seuls '<' légitimes ouvrent une balise canonique
// sans attributs (`<b>`, `</em>`, `<br>`). Tout autre '<' — notamment une balise
// NON terminée que le parseur HTML compléterait en fin de flux, attributs compris
// (bypass XSS via dangerouslySetInnerHTML) — doit devenir inerte.
const STRAY_LT = new RegExp(`<(?!\\/?(?:${[...ALLOWED_TAGS].join("|")})>)`, "g");

export function sanitizeBubbleHtml(html: string): string {
  if (!html) return "";
  let out = html.replace(/<\/(p|div|li|h[1-6])>/gi, "<br>");
  out = out.replace(/<(p|div|li|h[1-6])\b[^>]*>/gi, "");
  out = out.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (_match, slash, tag: string) => {
    const tagLower = tag.toLowerCase();
    return ALLOWED_TAGS.has(tagLower) ? `<${slash}${tagLower}>` : "";
  });
  out = out.replace(/<br\s*\/?>/gi, "<br>");
  out = out.replace(STRAY_LT, "&lt;");
  out = out.replace(/(<br>\s*){3,}/gi, "<br><br>");
  out = out.replace(/(<br>\s*)+$/i, "");
  return out.trim();
}
