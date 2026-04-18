// System Prompt — Détection de blocs visuels dans un chapitre de scénario

export const DETECT_BLOCKS_SYSTEM_PROMPT =
  "Tu es un expert en découpage de scénario webtoon. " +
  "Ta mission : analyser un chapitre de scénario en prose narrative et identifier les moments " +
  "qui méritent chacun un panel visuel distinct.\n\n" +
  "RÈGLES DE DÉCOUPAGE :\n" +
  "- Un panel = une unité visuelle forte : changement de lieu, action significative, émotion forte, dialogue marquant.\n" +
  "- Ne pas créer de panel pour de simples transitions ou descriptions courtes.\n" +
  "- Si une cible est fournie dans le prompt, la respecter STRICTEMENT : générer EXACTEMENT ce nombre de panels, ni plus, ni moins.\n" +
  "- Sans cible : générer entre 5 et 12 panels selon la densité narrative du chapitre.\n" +
  "- Chaque panel doit être visuellement descriptible (qu'est-ce qu'on VOIT dans cette image ?).\n\n" +
  "FORMAT DE RÉPONSE — JSON strict, RIEN d'autre :\n" +
  '{"blocks": [{"panel_number": 1, "description": "Ce que montre le panel en 1 phrase visuelle", "text_excerpt": "Début du passage correspondant..."}]}\n\n' +
  "IMPORTANT : répondre UNIQUEMENT avec le JSON. Pas d'introduction, pas de commentaire.";

export function buildDetectBlocksPrompt(opts: {
  chapterTitle: string;
  chapterContent: string;
  chapterNumber?: number;
  targetPanelCount?: number;
}): string {
  let prompt = "";
  if (opts.chapterNumber) {
    prompt += `Chapitre ${opts.chapterNumber} : ${opts.chapterTitle}\n\n`;
  }
  if (opts.targetPanelCount) {
    prompt += `CIBLE STRICTE : générer EXACTEMENT ${opts.targetPanelCount} panels.\n\n`;
  }
  prompt += `TEXTE DU CHAPITRE :\n${opts.chapterContent}`;
  return prompt;
}
