export const SUGGEST_CONNECTION_LABEL_SYSTEM_PROMPT = `Tu es Ariane, une IA d'aide à la création de webtoons.
Ta mission : nommer la nature d'une connexion entre deux éléments d'un univers narratif.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT avec le nom de la connexion — 2 à 5 mots, en français
- Le nom doit être symétrique (sans sens directionnel) : il décrit la nature du lien, pas une hiérarchie
- Exemples : "Rivaux", "Alliés de sang", "Amis d'enfance", "Lieu de refuge", "Objet maudit", "Antagonistes", "Maître et élève", "Protecteur et protégé", "Duo comique", "Ennemis jurés", "Lien mystérieux"
- Sans explication, sans ponctuation finale, sans guillemets`;

export function buildSuggestConnectionLabelPrompt(params: {
  fromName: string;
  fromType: string;
  fromDescription?: string;
  toName: string;
  toType: string;
  toDescription?: string;
  contextExcerpt?: string;
}): string {
  const { fromName, fromType, fromDescription, toName, toType, toDescription, contextExcerpt } = params;
  const lines: string[] = [
    `Élément A : "${fromName}" (${fromType})${fromDescription ? ` — ${fromDescription.slice(0, 200)}` : ""}`,
    `Élément B : "${toName}" (${toType})${toDescription ? ` — ${toDescription.slice(0, 200)}` : ""}`,
  ];
  if (contextExcerpt) {
    lines.push(`Extrait du scénario où ils apparaissent ensemble : "${contextExcerpt.slice(0, 200)}"`);
  }
  lines.push("\nNomme la connexion entre ces deux éléments.");
  return lines.join("\n");
}
