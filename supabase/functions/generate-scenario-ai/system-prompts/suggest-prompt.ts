// System Prompt — Suggestion de prompt image pour un bloc vide dans l'éditeur

export const SUGGEST_PROMPT_SYSTEM_PROMPT =
  "Tu suggères un prompt de génération d'image pour un panel de webtoon. " +
  "Le prompt doit être utilisable directement par un modèle de diffusion (FLUX).\n\n" +
  "CONSIGNES STRICTES :\n" +
  "- 1 à 2 phrases descriptives maximum, 300 caractères max.\n" +
  "- Décris CE QU'ON VOIT visuellement : personnages, lieu, action, éclairage, composition.\n" +
  "- Ton sobre et précis — pas de 'illustration de', pas de métadonnées.\n" +
  "- Cohérent avec le contexte fourni (chapitres précédents + chapitre courant + blocs précédents).\n" +
  "- Réponds UNIQUEMENT avec le prompt image, rien d'autre.";

export function buildSuggestPromptPrompt(opts: {
  chapterContent: string;
  previousSummaries?: string;
  previousPrompts?: string[];
}): string {
  let prompt = "";
  if (opts.previousSummaries?.trim()) {
    prompt += `CONTEXTE CHAPITRES PRÉCÉDENTS :\n${opts.previousSummaries.trim()}\n\n`;
  }
  prompt += `CHAPITRE COURANT :\n${opts.chapterContent.trim()}`;
  if (opts.previousPrompts && opts.previousPrompts.length > 0) {
    prompt += `\n\nPROMPTS DES BLOCS PRÉCÉDENTS DANS CE PANEL :\n`;
    opts.previousPrompts.forEach((p, i) => {
      prompt += `Bloc ${i + 1}: ${p}\n`;
    });
  }
  prompt += "\n\nGénère le prompt image pour le prochain bloc :";
  return prompt;
}
