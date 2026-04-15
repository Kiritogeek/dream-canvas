/** Extrait les métadonnées du bloc STYLE_SYSTEM_V1 (template projet). */

export function extractStyleKeyFromTemplateText(
  template: string | null | undefined
): string | null {
  if (!template?.trim()) return null;
  const m = template.match(/style_key:\s*(\S+)/);
  return m?.[1]?.trim() ?? null;
}

export function extractStylePrincipalFromTemplateText(
  template: string | null | undefined
): string | null {
  if (!template?.trim()) return null;
  const m = template.match(/style_principal:\s*(.+)/);
  return m?.[1]?.trim() ?? null;
}

export function hasStyleSystemBlock(template: string | null | undefined): boolean {
  return !!template?.includes("STYLE_SYSTEM_V1");
}
