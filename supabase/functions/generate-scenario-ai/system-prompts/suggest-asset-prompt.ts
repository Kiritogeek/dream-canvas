// System Prompt — Suggestion de description (prompt) pour un ASSET (personnage / décor / objet)

export const SUGGEST_ASSET_PROMPT_SYSTEM_PROMPT =
  "Tu génères une description visuelle (prompt) pour créer un ASSET de webtoon avec un modèle " +
  "de diffusion d'images (FLUX). L'asset est un personnage, un décor ou un objet.\n\n" +
  "CONSIGNES STRICTES :\n" +
  "- Décris UNIQUEMENT ce qu'on voit : apparence, formes, matières, couleurs, posture, éclairage, ambiance.\n" +
  "- Personnage : âge apparent, morphologie, cheveux, yeux, tenue, expression, pose de référence neutre.\n" +
  "- Décor : lieu, éléments marquants, profondeur, lumière, atmosphère.\n" +
  "- Objet : forme, matériau, couleur, détails, échelle.\n" +
  "- 2 à 4 phrases, riche mais sans remplissage. En français.\n" +
  "- Reste cohérent avec le style visuel du projet s'il est fourni.\n" +
  "- Pas de nom propre, pas de métadonnées (\"illustration de\", \"style de\"), aucun texte à afficher dans l'image.\n" +
  "- Réponds UNIQUEMENT avec le prompt, rien d'autre.";

const TYPE_LABELS: Record<string, string> = {
  character: "personnage",
  background: "décor",
  object: "objet",
};

export function buildSuggestAssetPrompt(opts: {
  assetName: string;
  assetType: string;
  styleDescription?: string;
  lore?: string;
  currentDescription?: string;
}): string {
  const typeLabel = TYPE_LABELS[opts.assetType] ?? opts.assetType;
  let prompt = `TYPE D'ASSET : ${typeLabel}\nNOM : ${opts.assetName}`;
  if (opts.styleDescription?.trim()) {
    prompt += `\nSTYLE VISUEL DU PROJET : ${opts.styleDescription.trim()}`;
  }
  if (opts.lore?.trim()) {
    prompt += `\nCONTEXTE / LORE : ${opts.lore.trim()}`;
  }
  if (opts.currentDescription?.trim()) {
    prompt += `\nDESCRIPTION ACTUELLE À ENRICHIR : ${opts.currentDescription.trim()}`;
  }
  prompt += "\n\nGénère le prompt de génération d'image pour cet asset :";
  return prompt;
}
