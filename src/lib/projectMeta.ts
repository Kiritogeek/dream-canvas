// Genre / Tonalité / Synopsis d'un projet — stockés (historiquement) dans
// `projects.description` sous forme de tags préfixes : "[Tags: Fantasy][Tone: Épique] synopsis".
// Source unique de parse/build pour la création, l'onglet Paramètres et l'affichage.

export interface ProjectMeta {
  genre: string;
  tone: string;
  synopsis: string;
}

export function parseProjectMeta(description: string | null | undefined): ProjectMeta {
  const d = description ?? "";
  const genre = d.match(/\[Tags:\s*([^\]]*)\]/)?.[1]?.trim() ?? "";
  const tone = d.match(/\[Tone:\s*([^\]]*)\]/)?.[1]?.trim() ?? "";
  const synopsis = d
    .replace(/\[Tags:\s*[^\]]*\]/g, "")
    .replace(/\[Tone:\s*[^\]]*\]/g, "")
    .trim();
  return { genre, tone, synopsis };
}

export function buildProjectDescription(meta: ProjectMeta): string | null {
  const parts: string[] = [];
  if (meta.genre.trim()) parts.push(`[Tags: ${meta.genre.trim()}]`);
  if (meta.tone.trim()) parts.push(`[Tone: ${meta.tone.trim()}]`);
  const prefix = parts.join("");
  const body = meta.synopsis.trim();
  const desc = prefix || body ? `${prefix}${body ? (prefix ? " " + body : body) : ""}` : "";
  return desc || null;
}

/** Synopsis seul, tags retirés — pour l'affichage et le contexte IA. */
export function stripProjectMetaTags(description: string | null | undefined): string {
  return parseProjectMeta(description).synopsis;
}

export const PROJECT_GENRE_OPTIONS = [
  { value: "Fantasy", label: "🧙 Fantasy" },
  { value: "Médiéval", label: "⚔️ Médiéval" },
  { value: "SF", label: "🚀 SF" },
  { value: "Aventure", label: "🗺️ Aventure" },
  { value: "Romance", label: "💕 Romance" },
  { value: "Action", label: "⚡ Action" },
  { value: "Thriller", label: "🎯 Thriller" },
  { value: "Mystère", label: "🔍 Mystère" },
  { value: "Horreur", label: "👻 Horreur" },
  { value: "Dystopie", label: "⚙️ Dystopie" },
  { value: "Historique", label: "🏛️ Historique" },
  { value: "Comédie", label: "😄 Comédie" },
] as const;

export const PROJECT_TONE_OPTIONS = [
  { value: "Épique", label: "🔥 Épique" },
  { value: "Sombre", label: "🌑 Sombre" },
  { value: "Humoristique", label: "😂 Humoristique" },
  { value: "Romantique", label: "🌸 Romantique" },
  { value: "Mystérieux", label: "🌫️ Mystérieux" },
  { value: "Slice of life", label: "🌿 Slice of life" },
] as const;
