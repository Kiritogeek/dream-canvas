// System Prompt — Composition visuelle webtoon
// Architecture : le serveur analyse les blocs et suggère des compos
// L'IA groupe librement, valide/modifie les suggestions selon le récit

export const COMPOSE_LAYOUT_SYSTEM_PROMPT =
  "Tu es un compositeur de webtoon. Tu reçois des blocs de scénario avec leur catégorie narrative.\n" +
  "Ta mission : grouper ces blocs en scènes et choisir la composition la plus adaptée AU RÉCIT.\n\n" +

  "PRINCIPE FONDAMENTAL : chaque choix de composition doit être justifiable par le contenu du bloc.\n" +
  "La catégorie de chaque bloc est dérivée de son type de scène (découpage) — respecte la compo suggérée :\n" +
  "  🏛️ LIEU (establishing)            → F (décor→réaction) ou A (splash)\n" +
  "  💬 DIALOGUE (dialogue)            → E (blocs empilés) ou D (face-à-face)\n" +
  "  🧠 INTROSPECTION (monologue)      → O / P (blanc latéral) ou B (isolement)\n" +
  "  😲 RÉACTION (reaction_revelation) → B (isolement) ou L (strip→grand)\n" +
  "  🖥️ SYSTÈME (revelation_system)    → A (splash) ou G (panneau réduit)\n" +
  "  💨 MOUVEMENT (action_movement)    → I (collision latérale) ou C (séquence)\n" +
  "  ⚡ IMPACT (action_impact)         → N (attaque verticale) ou I (jamais K)\n" +
  "  🔥 CONFRONTATION (tension)        → D (face-à-face) ou L\n" +
  "  ⚔️ MÊLÉE (action_melee)           → A (splash) ou M (triptyque)\n" +
  "  🌟 POUVOIR (power_display)        → A (splash) ou B\n" +
  "  🕳️ ISOLEMENT (isolation)          → B ou O (grand vide)\n" +
  "  🌀 ÉCHO (text_echo_psychological) → A (splash pleine largeur, fond noir)\n" +
  "  🕯️ SOUVENIR (memory_flashback)    → F ou O\n\n" +

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
  "  D  2 blocs  Face-à-face asymétrique — tension entre 2 personnages\n" +
  "  E  N blocs  Dialogue empilé, largeurs variées — le plus fréquent\n" +
  "  F  2 blocs  Lieu : grand décor → réaction centrée\n" +
  "  G  1 bloc   Réplique clé — mot qui change tout, panel réduit centré\n" +
  "  H  1 bloc   Transition — ellipse, saut temporel\n" +
  "  I  2 blocs  ⚡ Collision latérale diagonale — 2 forces horizontales\n" +
  "  J  2 blocs  Incrustation — réaction sur fond\n" +
  "  K  max 4    ⛔ INTERDIT sauf pic d'action ABSOLU — 1 seule fois par chapitre\n" +
  "  L  2 blocs  Strip+grand — gros plan détail → scène (signature SL tension)\n" +
  "  M  3 blocs  Triptyque — 3 réactions simultanées côte à côte\n" +
  "  N  2 blocs  ⚡ Attaque verticale diagonale — frappe/contre (signature SL)\n" +
  "  O  1 bloc   Panel carré ancré GAUCHE — blanc massif à droite (introspection, objet clé)\n" +
  "  P  1 bloc   Panel carré ancré DROITE — blanc massif à gauche (révélation latérale)\n\n" +

  "HEIGHT HINT — s'adapte au contenu du bloc :\n" +
  "  strip   → gros plan ultra-serré : yeux, mains, détail minuscule\n" +
  "  compact → zoom rapproché : visage, expression, objet\n" +
  "  standard → scène normale, dialogue, action courte\n" +
  "  grand   → plan large : ville, donjon, armée, boss, décor imposant\n" +
  "  splash  → révélation maximale, fin de chapitre\n" +
  "  RÈGLE : le serveur ajuste automatiquement selon les mots dans la description.\n" +
  "  → 'gros plan sur les yeux' → sera rendu petit même si tu mets 'standard'\n" +
  "  → 'panorama de la ville' → sera rendu grand même si tu mets 'standard'\n" +
  "  → Utilise quand même le bon hint pour guider l'échelle globale de la scène.\n" +
  "  → JAMAIS strip ou compact si le bloc a du dialogue (le texte a besoin d'espace).\n\n" +

  "GAP APRÈS (gap_after en px) :\n" +
  "  150-300 = action haché | 350-500 = dialogue normal | 500-700 = pause dramatique | 700-1000 = transition\n\n" +

  "RÈGLES STRICTES :\n" +
  "1. Chaque source_index [0..N-1] apparaît EXACTEMENT UNE FOIS\n" +
  "2. gap_after OBLIGATOIRE dans chaque scène\n" +
  "3. Jamais 2 scènes consécutives avec le même type\n" +
  "4. K = 1 seule fois maximum, max 4 blocs — utilise N ou I pour l'action standard\n" +
  "5. O et P = 1 seul bloc chacun — panel carré avec grand blanc latéral\n" +
  "   → Utilise O/P pour : zoom sur un objet, une plante, un visage seul, une réplique visuelle\n" +
  "   → O = panel ancré gauche (blanc à droite) | P = panel ancré droite (blanc à gauche)\n" +
  "6. Le rationale DOIT citer le contenu du bloc (personnage, action, lieu, réplique)\n\n" +
  "Répondre UNIQUEMENT avec le JSON brut.";

// ── Types ────────────────────────────────────────────────────────

/** Une réplique du découpage v2 (detect_blocks). */
export interface OutlineDialogue {
  character?: string;
  type?: string;
  text: string;
}

export interface PanelOutlineBlock {
  panel_number: number;
  block_number?: number;
  description: string;
  text_excerpt?: string;
  locked?: boolean;
  /** Type de scène issu du découpage IA (detect_blocks). Source prioritaire pour le choix de composition. */
  scene_type?: string;
  shot_type?: string;
  effects?: string[];
  // ── Découpage v2 (juillet 2026) — champs optionnels, rétrocompatibles ──
  characters?: string[];
  location?: string;
  dialogue?: OutlineDialogue[];
  narration?: string | null;
  silent?: boolean;
  sfx?: { text?: string; preset?: string } | null;
  breathing_after?: number;
  system_window?: { variant?: string; title?: string; body?: string } | null;
}

// Mapping direct scene_type (13 types du découpage) → catégorie + compositions suggérées.
// Évite de re-deviner par regex : on réutilise la classification déjà faite par detect_blocks.
const SCENE_TYPE_TAG: Record<string, { emoji: string; tag: string; suggestions: string }> = {
  establishing:            { emoji: "🏛️", tag: "LIEU",          suggestions: "F ou A" },
  dialogue:                { emoji: "💬", tag: "DIALOGUE",      suggestions: "E ou D" },
  internal_monologue:      { emoji: "🧠", tag: "INTROSPECTION", suggestions: "O, P ou B" },
  reaction_revelation:     { emoji: "😲", tag: "RÉACTION",      suggestions: "B ou L" },
  revelation_system:       { emoji: "🖥️", tag: "SYSTÈME",       suggestions: "A ou G" },
  action_movement:         { emoji: "💨", tag: "MOUVEMENT",     suggestions: "I ou C" },
  action_impact:           { emoji: "⚡", tag: "IMPACT",        suggestions: "N ou I (jamais K)" },
  tension_confrontation:   { emoji: "🔥", tag: "CONFRONTATION", suggestions: "D ou L" },
  action_melee:            { emoji: "⚔️", tag: "MÊLÉE",         suggestions: "A ou M" },
  power_display:           { emoji: "🌟", tag: "POUVOIR",       suggestions: "A ou B" },
  isolation_vulnerability: { emoji: "🕳️", tag: "ISOLEMENT",     suggestions: "B ou O" },
  text_echo_psychological: { emoji: "🌀", tag: "ÉCHO",          suggestions: "A (splash pleine largeur)" },
  memory_flashback:        { emoji: "🕯️", tag: "SOUVENIR",      suggestions: "F ou O" },
};

// Analyse narrative d'un bloc pour guider l'IA.
// Priorité au scene_type du découpage ; regex en fallback pour les blocs sans scene_type (créés à la main).
function tagBlock(block: PanelOutlineBlock): { emoji: string; tag: string; suggestions: string } {
  const st = block.scene_type?.trim();
  if (st && SCENE_TYPE_TAG[st]) return SCENE_TYPE_TAG[st];

  const d = (block.description ?? "").toLowerCase();
  const t = (block.text_excerpt ?? "").trim();

  if (/combat|attaque|frappe|coup|explos|charge|esquive|impact|saut|bless|bond|élan|rush|duel|ripost|bloque|bondit|fonce|tranche|dévaste|brise|taillade|percute/.test(d)) {
    return { emoji: "⚡", tag: "ACTION", suggestions: "N ou I (jamais K)" };
  }
  if (/apparaît|révèle|découvre|monstre|boss|portail|soudain|transformation|surgit|émerge|révélation|dévoile/.test(d)) {
    return { emoji: "🔮", tag: "RÉVÉLATION", suggestions: "A ou L" };
  }
  if (/gros plan|détail|yeux|regard|main|doigt|pied|visage|sourire|sueur|larme|lèvre|expression|plante|fleur|insecte|objet|cicatrice|symbole/.test(d)) {
    return { emoji: "🔍", tag: "DÉTAIL", suggestions: "L, B, O ou P" };
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
