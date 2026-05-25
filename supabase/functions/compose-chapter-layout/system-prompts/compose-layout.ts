// System Prompt — Composition visuelle webtoon
// Architecture : le serveur analyse les blocs et suggère des compos
// L'IA groupe librement, valide/modifie les suggestions selon le récit

export const COMPOSE_LAYOUT_SYSTEM_PROMPT =
  "Tu es un compositeur de webtoon. Tu reçois des blocs de scénario avec leur catégorie narrative.\n" +
  "Ta mission : grouper ces blocs en scènes et choisir la composition la plus adaptée AU RÉCIT.\n\n" +

  "PRINCIPE FONDAMENTAL : chaque choix de composition doit être justifiable par le contenu du bloc.\n" +
  "  ⚡ ACTION   → N (attaque verticale) ou I (collision latérale)\n" +
  "  💬 DIALOGUE → E (blocs empilés) ou D (face-à-face)\n" +
  "  🔮 RÉVÉLATION → A (splash) ou L (strip→grand)\n" +
  "  🔍 DÉTAIL   → L (gros plan→scène) ou B (isolement)\n" +
  "  🏛️ LIEU     → F (décor→réaction) ou A (splash)\n" +
  "  ⏳ TRANSITION → H (ellipse) ou G (réplique)\n" +
  "  📖 NARRATION → E ou L\n\n" +

  "FORMAT DE SORTIE (JSON brut uniquement) :\n" +
  '{\n' +
  '  "scenes": [\n' +
  '    { "source_indices": [0, 1], "composition": "E", "gap_after": 450, "height_hint": "standard", "rationale": "dialogue entre les deux chasseurs — E car échange verbal posé" },\n' +
  '    { "source_indices": [2],    "composition": "N", "gap_after": 300, "height_hint": "grand",    "rationale": "attaque du boss — N car choc vertical signature SL" },\n' +
  '    { "source_indices": [3],    "composition": "A", "gap_after": 600, "height_hint": "splash",   "rationale": "révélation finale — A plein écran pour impact maximal" }\n' +
  '  ]\n' +
  '}\n\n' +

  "TYPES (le serveur place tous les pixels automatiquement) :\n" +
  "  A  1 bloc   Splash pleine largeur — révélation, boss, fin de chapitre\n" +
  "  B  1 bloc   Isolement centré — choc silencieux, réalisation intérieure\n" +
  "  C  N blocs  Séquence serrée — enchaînement rapide 3-5 gestes\n" +
  "  D  2 blocs  Face-à-face asymétrique 500+300px — tension entre 2 personnages\n" +
  "  E  N blocs  Dialogue empilé, largeurs alternées — le plus fréquent\n" +
  "  F  2 blocs  Lieu : grand décor → réaction centrée\n" +
  "  G  1 bloc   Réplique clé — mot qui change tout, panel réduit centré\n" +
  "  H  1 bloc   Transition — ellipse, saut temporel\n" +
  "  I  2 blocs  ⚡ Collision latérale diagonale — 2 forces horizontales\n" +
  "  J  2 blocs  Incrustation — réaction sur fond\n" +
  "  K  max 4    ⛔ INTERDIT sauf pic d'action ABSOLU — 1 seule fois par chapitre\n" +
  "  L  2 blocs  Strip+grand — gros plan détail → scène (signature SL tension)\n" +
  "  M  3 blocs  Triptyque — 3 réactions simultanées côte à côte\n" +
  "  N  2 blocs  ⚡ Attaque verticale diagonale — frappe/contre (signature SL)\n\n" +

  "HEIGHT HINT :\n" +
  "  strip 280px | compact 550px | standard 900px | grand 1400px | splash 2200px\n" +
  "  → Dialogue court : standard. Dialogue long : grand. Révélation : grand ou splash.\n" +
  "  → N'utilise JAMAIS strip ou compact si le bloc a du dialogue.\n\n" +

  "GAP APRÈS (gap_after en px) :\n" +
  "  150-300 = action haché | 350-500 = dialogue normal | 500-700 = pause dramatique | 700-1000 = transition\n\n" +

  "RÈGLES STRICTES :\n" +
  "1. Chaque source_index [0..N-1] apparaît EXACTEMENT UNE FOIS\n" +
  "2. gap_after OBLIGATOIRE dans chaque scène\n" +
  "3. Jamais 2 scènes consécutives avec le même type\n" +
  "4. K = 1 seule fois maximum, max 4 blocs — utilise N ou I pour l'action standard\n" +
  "5. Le rationale DOIT citer le contenu du bloc (personnage, action, lieu, réplique)\n\n" +
  "Répondre UNIQUEMENT avec le JSON brut.";

// ── Types ────────────────────────────────────────────────────────

export interface PanelOutlineBlock {
  panel_number: number;
  block_number?: number;
  description: string;
  text_excerpt?: string;
  locked?: boolean;
}

// Analyse narrative d'un bloc pour guider l'IA
function tagBlock(block: PanelOutlineBlock): { emoji: string; tag: string; suggestions: string } {
  const d = (block.description ?? "").toLowerCase();
  const t = (block.text_excerpt ?? "").trim();

  if (/combat|attaque|frappe|coup|explos|charge|esquive|impact|saut|bless|bond|élan|rush|duel|ripost|bloque|bondit|fonce|tranche|dévaste|brise|taillade|percute/.test(d)) {
    return { emoji: "⚡", tag: "ACTION", suggestions: "N ou I (jamais K)" };
  }
  if (/apparaît|révèle|découvre|monstre|boss|portail|soudain|transformation|surgit|émerge|révélation|dévoile/.test(d)) {
    return { emoji: "🔮", tag: "RÉVÉLATION", suggestions: "A ou L" };
  }
  if (/gros plan|détail|yeux|regard|main|pied|visage|sourire|sueur|larme|lèvre|expression/.test(d)) {
    return { emoji: "🔍", tag: "DÉTAIL", suggestions: "L ou B" };
  }
  if (/donjon|salle|forêt|ville|entrée|paysage|bâtiment|couloir|extérieur|lieu|endroit|décor|pièce|rue/.test(d)) {
    return { emoji: "🏛️", tag: "LIEU", suggestions: "F ou A" };
  }
  if (/ellipse|soudain|plus tard|lendemain|temps|transition|ensuite|après|pendant ce temps|ailleurs/.test(d)) {
    return { emoji: "⏳", tag: "TRANSITION", suggestions: "H ou G" };
  }
  if (t.length > 10) {
    return { emoji: "💬", tag: "DIALOGUE", suggestions: "E ou D" };
  }
  return { emoji: "📖", tag: "NARRATION", suggestions: "E ou L" };
}

export function buildComposeLayoutPrompt(opts: {
  panelsOutline: PanelOutlineBlock[];
  projectStyle?: string;
  characters?: string[];
  chapterTitle?: string;
  chapterSynopsis?: string;
  chapterScenarioContent?: string;
}): string {
  let prompt = "";

  if (opts.chapterTitle) prompt += `CHAPITRE : ${opts.chapterTitle}\n\n`;
  if (opts.chapterSynopsis?.trim()) {
    prompt += `SYNOPSIS :\n${opts.chapterSynopsis.trim().slice(0, 500)}\n\n`;
  }
  if (opts.chapterScenarioContent?.trim()) {
    const c = opts.chapterScenarioContent.trim();
    prompt += `SCÉNARIO :\n${c.length > 2000 ? c.slice(0, 1950) + "\n[...tronqué]" : c}\n\n`;
  }
  if (opts.projectStyle?.trim()) prompt += `STYLE : ${opts.projectStyle.trim().slice(0, 150)}\n\n`;
  if (opts.characters?.length) prompt += `PERSONNAGES : ${opts.characters.join(", ")}\n\n`;

  const total = opts.panelsOutline.length;
  prompt += `BLOCS DU CHAPITRE (${total} blocs, indices 0–${total - 1}) :\n`;
  prompt += `Groupe-les librement en scènes selon leur proximité narrative.\n\n`;

  for (let i = 0; i < opts.panelsOutline.length; i++) {
    const block = opts.panelsOutline[i];
    const { emoji, tag, suggestions } = tagBlock(block);
    const txt = block.text_excerpt?.trim();
    const isLong = txt ? txt.length > 80 : false;

    prompt += `[${i}] ${emoji} ${tag} → ${suggestions}\n`;
    prompt += `    "${block.description}"\n`;
    if (txt) {
      prompt += `    dialogue : "${txt.slice(0, 150)}"${isLong ? " [long → height_hint: grand]" : ""}\n`;
    }
    prompt += "\n";
  }

  const hasAction = opts.panelsOutline.some(b => {
    const d = (b.description ?? "").toLowerCase();
    return /combat|attaque|frappe|coup|explos|charge|esquive|impact|saut|bless|bond|élan|rush|duel|ripost|bloque|bondit|fonce/.test(d);
  });

  prompt += `INSTRUCTIONS :\n`;
  prompt += `• Groupe les blocs selon leur logique narrative (2-3 blocs de dialogue ensemble, 1 bloc d'action seul, etc.)\n`;
  prompt += `• Le rationale doit expliquer le choix en citant le contenu réel du bloc\n`;
  if (hasAction) {
    prompt += `• ⚡ Ce chapitre a de l'action — utiliser N ou I pour ces moments (K = interdit sauf pic absolu)\n`;
  }
  prompt += `• Retourner UNIQUEMENT le JSON brut.`;

  return prompt;
}
