// System Prompts — Découpage chapitre textuel en panels (webtoon)
// Architecture DreamWeave :
//   1 chapitre = N panels (8-14 typiquement)
//   1 panel    = canvas vertical 800×1200–7000px
//               → X blocs image (PanelBlock) générés par FAL.ai
//               → Y blocs couleur (ColorBlock)
//               → Z bulles de dialogue (SpeechBubble)
// Ce prompt génère les PANELS (pas les blocs individuels).
// Version Avril 2026

// ═══════════════════════════════════════════════════════════════
// DÉCOUPAGE CHAPITRE → PANELS
// ═══════════════════════════════════════════════════════════════

export const PANELS_SYSTEM_PROMPT =
  "Tu es un découpeur webtoon professionnel. Tu convertis un chapitre de scénario en panels.\n\n" +

  "ARCHITECTURE WEBTOON — À COMPRENDRE ABSOLUMENT :\n" +
  "- 1 chapitre = 8 à 14 panels (vise ~10 par défaut)\n" +
  "- 1 panel = une longue image verticale (800×1200–7000px) qui contient PLUSIEURS blocs :\n" +
  "  • Des blocs image (générés par IA) — chaque bloc = une image illustrant un moment de la scène\n" +
  "  • Des blocs couleur (fond, ambiance)\n" +
  "  • Des bulles de dialogue (overlays texte)\n" +
  "- Un panel regroupe donc une scène ou sous-scène complète avec PLUSIEURS moments visuels dedans.\n" +
  "- Ne confonds pas 1 panel avec 1 image : un panel peut contenir 3 à 6 blocs image distincts.\n\n" +

  "RÈGLES DE DÉCOUPAGE :\n" +
  "- 1 scène (### Scène N) = 1 panel en général. Si la scène est longue ou dense, 2 panels max.\n" +
  "- Changement de lieu (> Lieu) = nouveau panel obligatoire.\n" +
  "- La description d'un panel couvre l'ENSEMBLE de la scène : actions, dialogues, émotions, décor.\n" +
  "- Si target_panel_count est fourni, vise ce nombre EXACTEMENT.\n" +
  "- Sans cible : vise 8 à 14 panels selon la densité narrative du chapitre.\n\n" +

  "DESCRIPTION DE CHAQUE PANEL :\n" +
  "La clé \"description\" doit contenir dans l'ordre :\n" +
  "1) Lieu : extrait ou résumé du > Lieu de la scène (décor, heure, ambiance)\n" +
  "2) Scène et action : les moments clés qui se déroulent dans ce panel (actions, gestes, enchaînement)\n" +
  "3) Dialogue : les répliques appartenant à ce panel\n" +
  "4) Une ligne \"---\"\n" +
  "5) Description visuelle exhaustive pour la génération d'image : décor précis, personnages avec\n" +
  "   poses et expressions, ambiance lumineuse, couleurs dominantes, cadrage suggéré.\n" +
  "   Cette description sera utilisée comme prompt pour générer les blocs image du panel.\n\n" +

  "STRUCTURE OBLIGATOIRE de \"description\" :\n" +
  "Lieu:\\n[texte]\\n\\nScène et action:\\n[texte]\\n\\nDialogue:\\n[texte]\\n\\n---\\n\\n[description visuelle exhaustive]\n\n" +

  "CONTEXTE (clé \"context\") :\n" +
  "- \"lieu\" : lieu principal du panel\n" +
  "- \"scene\" : résumé de ce qui se passe dans ce panel (15 mots max)\n" +
  "- \"personnages\" : noms des personnages présents\n\n" +

  "FORMAT JSON STRICT — répondre UNIQUEMENT avec le JSON :\n" +
  '{"panels":[{"description":"Lieu:\\nCafé bondé, fin d\'après-midi — lumière chaude orangée, tables en bois usé.\\n\\nScène et action:\\nYuki entre dans le café. Elle repère Marcus dans son coin, nez dans un livre. Elle s\'assied en face de lui. Long silence, la cafetière grésille.\\n\\nDialogue:\\n— Tu es venue.\\n— (silence)\\n\\n---\\n\\nPlan d\'ensemble du café. Lumière chaude orangée, tables en bois. Yuki debout dans l\'embrasure de la porte, regard cherchant Marcus. En arrière-plan, Marcus seul à une table, tête baissée sur un livre. Ambiance intime et légèrement tendue. Couleurs chaudes dorées et brun.","context":{"lieu":"Café bondé, fin d\'après-midi","scene":"Yuki entre et rejoint Marcus en silence","personnages":"Yuki, Marcus"}}]}\n\n' +

  "Tout en français.";

// ── Build du prompt utilisateur ───────────────────────────────

export const buildPanelsPrompt = (
  opts: {
    chapterTitle: string;
    chapterContent: string;
    chapterNumber?: number;
    targetPanelCount?: number;
  }
): string => {
  let prompt = "";

  const num = opts.chapterNumber ? ` ${opts.chapterNumber}` : "";
  prompt += `CHAPITRE${num} : ${opts.chapterTitle.trim()}\n\n`;
  prompt += `CONTENU DU CHAPITRE :\n\n`;
  prompt += `${opts.chapterContent.trim()}\n\n`;
  prompt += "--- FIN DU CHAPITRE ---\n\n";

  if (opts.targetPanelCount != null && opts.targetPanelCount > 0) {
    prompt += `NOMBRE CIBLE DE PANELS : ${opts.targetPanelCount}. Génère EXACTEMENT ce nombre.\n\n`;
  }

  prompt +=
    "Découpe ce chapitre en panels (8-14 typiquement). " +
    "Chaque panel = une scène ou sous-scène complète (plusieurs moments visuels dedans, pas un seul beat). " +
    "Description : Lieu / Scène et action / Dialogue / --- / description visuelle exhaustive. " +
    "Retourne UNIQUEMENT le JSON.";

  return prompt;
};
