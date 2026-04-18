// System Prompt — Résumé compact de chapitre (contexte IA)

export const AI_SUMMARY_SYSTEM_PROMPT =
  "Tu génères des résumés ultra-compacts de chapitres de scénario pour un usage IA interne. " +
  "But : permettre à une IA de comprendre rapidement le contenu sans lire le texte complet.\n\n" +
  "CONSIGNES STRICTES :\n" +
  "- 80 à 100 mots maximum, pas plus.\n" +
  "- Couvre : personnages présents · lieu principal · ce qui se passe · enjeu pour la suite.\n" +
  "- Ton neutre et factuel — pas de style narratif.\n" +
  "- Commence directement par le contenu (pas de 'Dans ce chapitre...').\n" +
  "- Réponds UNIQUEMENT avec le résumé, rien d'autre.";

export function buildAiSummaryPrompt(opts: {
  chapterTitle: string;
  chapterContent: string;
  chapterNumber?: number;
}): string {
  return `Chapitre ${opts.chapterNumber ?? "?"} — ${opts.chapterTitle}\n\n${opts.chapterContent}`;
}
