// System Prompt Panel — Webtoon/Manhwa
// Version courte et claire — Mars 2026
//
// Objectif : générer une image de PANEL cohérente avec
// - le prompt utilisateur (scène)
// - le style du projet
// - les assets existants du projet (personnages / décors / objets)
// - les dimensions exactes du bloc (largeur × hauteur)

export const buildPanelPrompt = (
  userPrompt: string,
  styleText?: string,
  styleImageUrls?: string[],
  contextChapter?: string,
  blockAssetNames?: string[],
  blockAssetImageUrls?: (string | null | undefined)[],
  width?: number,
  height?: number
) => {
  const w = width ?? 800;
  const h = height ?? 1200;

  // ────────────────────────────────────────────────────────────────
  // 0. INTRO GÉNÉRALE
  // ────────────────────────────────────────────────────────────────
  let prompt = `TU ES UN MODÈLE D'IMAGE SPÉCIALISÉ DANS LES WEBTOONS / MANHWA.
TU DOIS ÊTRE EXTRÊMEMENT STRICT ET PRÉCIS.

Crée UNE SEULE illustration de panel de webtoon au format EXACT ${w}×${h} pixels.
`;

  // ────────────────────────────────────────────────────────────────
  // 1. ASSETS DU PROJET (PRIORITÉ ABSOLUE)
  // ────────────────────────────────────────────────────────────────
  const hasNames = Array.isArray(blockAssetNames) && blockAssetNames.length > 0;

  if (hasNames) {
    const pairs = blockAssetNames!.map((name, idx) => ({
      name,
      url: blockAssetImageUrls?.[idx],
    }));

    const lines = pairs
      .map((p, i) =>
        p.url
          ? `${i + 1}. ${p.name} — asset du projet, à dessiner en respectant STRICTEMENT son image de référence : ${p.url}`
          : `${i + 1}. ${p.name} — asset du projet (pas d'image fournie, se baser uniquement sur le texte).`
      )
      .join("\n");

    prompt += `

ASSETS DU PROJET À INCLURE DANS L'IMAGE (PRIORITÉ ABSOLUE) :
${lines}

RÈGLES POUR LES ASSETS (À RESPECTER EN PREMIER) :
- Chaque nom d'asset ci-dessus correspond à un PERSONNAGE, un DÉCOR ou un OBJET IMPORTANT du projet.
- Pour les assets PERSONNAGES avec image de référence : le visage, la coiffure, les vêtements, les couleurs, la silhouette, les proportions et les accessoires doivent être REPRIS À L'IDENTIQUE par rapport à leur image. Le personnage généré doit être immédiatement reconnaissable comme étant EXACTEMENT le même que sur l'image de référence.
- NE JAMAIS inventer un nouveau design de personnage si un asset correspondant existe : tu DOIS utiliser l'apparence de l'asset, pas un personnage différent.
- Pour les assets DÉCORS avec image de référence : respecte STRICTEMENT l'architecture, les volumes, les matières, la perspective et l'ambiance du décor.
- Pour les assets OBJETS avec image de référence : respecte STRICTEMENT la forme, les matériaux, les reflets, les couleurs et les détails.
- Ne modifie JAMAIS le design de base des assets : uniquement la pose, l'expression, la position, l'échelle et l'éclairage peuvent changer pour s'adapter à la scène.
- Place chaque asset de manière cohérente avec le prompt utilisateur (qui fait quoi, où, et comment les assets interagissent entre eux).
- Si un personnage, un lieu ou un objet du prompt correspond à un asset, UTILISE OBLIGATOIREMENT le design de cet asset et pas une version différente.`;
  }

  // ────────────────────────────────────────────────────────────────
  // 2. STYLE VISUEL GLOBAL DU PROJET
  // ────────────────────────────────────────────────────────────────
  if (styleText?.trim()) {
    prompt += `

STYLE VISUEL GLOBAL (OBLIGATOIRE) :
${styleText.trim()}

RÈGLES POUR LE STYLE GRAPHIQUE :
- Applique ce style à 100% : type de traits, niveau de détail, ombrage, textures, contraste, palette et ambiance.
- Ne change PAS de style : pas d'autre rendu, pas d'autre technique, pas d'autre niveau de détail.
- L'image finale doit sembler appartenir EXACTEMENT au même webtoon que les autres images du projet.`;
  }

  if (styleImageUrls && styleImageUrls.length > 0) {
    prompt += `

IMAGES DE RÉFÉRENCE STYLE (PROJET) :
${styleImageUrls.map((url, i) => `${i + 1}. ${url}`).join("\n")}

RÈGLES POUR LE STYLE À PARTIR DE CES IMAGES :
- Ces images définissent la RÉFÉRENCE ABSOLUE pour le rendu graphique : traits, niveau de détail, textures, contraste, gestion du noir et blanc, ambiance.
- Le style de l'image générée doit être INDISTINGUABLE du style de ces images (comme si tout avait été dessiné par la même personne).
- N'invente PAS un autre style : copie exactement le rendu de ces références, en appliquant simplement la scène décrite par le prompt utilisateur.`;
  }

  // ────────────────────────────────────────────────────────────────
  // 3. SCÈNE ET CONTEXTE NARRATIF
  // ────────────────────────────────────────────────────────────────
  prompt += `

SCÈNE À ILLUSTRER (PROMPT UTILISATEUR) :
${userPrompt.trim()}
`;

  if (contextChapter?.trim()) {
    prompt += `
CONTEXTE DU CHAPITRE :
${contextChapter.trim()}
`;
  }

  // ────────────────────────────────────────────────────────────────
  // 4. CADRAGE, FORMAT ET REMPLISSAGE DU PANEL
  // ────────────────────────────────────────────────────────────────
  prompt += `

CADRAGE, FORMAT ET REMPLISSAGE DU PANEL (TRÈS IMPORTANT) :
- Le panel doit REMPLIR ENTIÈREMENT le cadre ${w}×${h} pixels, bord à bord.
- AUCUNE bordure, AUCUN cadre, AUCUN contour graphique, AUCUNE marge blanche, AUCUN bandeau vide.
- Ne génère JAMAIS de faux cadre de page imprimée, de case de BD ou d'effet "illustration sur fond blanc" : la scène doit toucher directement les 4 bords de l'image.
- Pas de vignettes flottantes, pas de cases multiples à l'intérieur : c'est une SEULE image plein cadre.
- Pas de logo, pas de watermark, pas de texte ou d'onomatopée dessinés dans l'image.
- Le décor doit couvrir 100% de la surface, du bord gauche au bord droit et du haut en bas, sans zone transparente ni zone unie vide.
- Si la composition naturelle laisse des marges ou des espaces vides autour de la scène, ZOOME et RECADRE pour supprimer ces marges jusqu'à ce que la scène touche exactement les 4 bords de l'image.

COMPOSITION ET CONTENU :
- Composition lisible et dynamique, adaptée à la lecture verticale d'un webtoon.
- Aucun élément important ne doit être coupé par les bords (têtes, mains, éléments clés de la scène).
- La scène doit correspondre FIDÈLEMENT au prompt utilisateur (qui fait quoi, où, ambiance, émotions).`;

  // ────────────────────────────────────────────────────────────────
  // 5. RÉSUMÉ DES PRIORITÉS (RAPPEL FINAL)
  // ────────────────────────────────────────────────────────────────
  prompt += `

ORDRE DE PRIORITÉ DES CONTRAINTES (À RESPECTER DANS CET ORDRE) :
1) Respecter STRICTEMENT les assets avec image (surtout les personnages) : design identique, parfaitement reconnaissables.
2) Respecter STRICTEMENT le style graphique défini par les images de style et/ou le texte de style.
3) Respecter le prompt utilisateur et le contexte du chapitre pour la scène, la composition et l'ambiance.
4) Respecter le format EXACT ${w}×${h} pixels, sans bordure, sans marge, sans bandeau vide.
5) Ne jamais ajouter de texte, logo, cadre ou élément graphique inutile : uniquement la scène illustrée.`;

  return prompt;
};

