import { describe, it, expect } from "vitest";
import {
  GAP_MIN_PX,
  GAP_MAX_PX,
  TOP_RESERVE_PX,
  MIN_CANVAS_HEIGHT,
  clampGap,
  inferBlockHeight,
  fallbackLayout,
  computeSceneLayout,
  normalizeScenes,
  matchAssetRefs,
  buildBubblesForBlock,
  buildSfxForBlock,
  processComposition,
  type AISimpleScene,
} from "./geometry";
import type { PanelOutlineBlock } from "./system-prompts/compose-layout";

const block = (over: Partial<PanelOutlineBlock> = {}): PanelOutlineBlock => ({
  panel_number: 1,
  description: "Un chasseur marche dans la rue",
  ...over,
});

type Positioned = { x: number; y: number; width: number; height: number };
type Bubble = { position: { x: number; y: number }; width: number; height: number; type: string; character: string | null };

describe("clampGap — barème Distance = Time", () => {
  it("couvre tout le barème mesuré (50 action → 2000 ellipse)", () => {
    expect(clampGap(50)).toBe(50);      // action rapide
    expect(clampGap(120)).toBe(120);    // enchaînement (plus déformé en 150)
    expect(clampGap(700)).toBe(700);    // cliffhanger
    expect(clampGap(1200)).toBe(1200);  // changement de lieu (plus écrasé à 1000)
    expect(clampGap(2000)).toBe(2000);  // ellipse temporelle
  });

  it("borne les valeurs aberrantes sans déformer le barème", () => {
    expect(clampGap(10)).toBe(GAP_MIN_PX);
    expect(clampGap(9999)).toBe(GAP_MAX_PX);
    expect(GAP_MIN_PX).toBe(50);
    expect(GAP_MAX_PX).toBe(2000);
  });
});

describe("inferBlockHeight — hauteur par contenu", () => {
  it("plans ultra-serrés → strip 280", () => {
    expect(inferBlockHeight("extrême gros plan sur la pupille", 900)).toBe(280);
  });
  it("gros plan → compact plafonné à 520", () => {
    expect(inferBlockHeight("gros plan sur les yeux", 900)).toBe(520);
    expect(inferBlockHeight("zoom sur la main", 400)).toBe(400);
  });
  it("panorama → au moins 1400", () => {
    expect(inferBlockHeight("panorama de la ville", 900)).toBe(1400);
    expect(inferBlockHeight("paysage immense", 2200)).toBe(2200);
  });
  it("sinon la hauteur de base", () => {
    expect(inferBlockHeight("il sourit doucement", 900)).toBe(900);
  });
});

describe("computeSceneLayout — patterns v1 préservés + Q letterbox", () => {
  it("A splash : pleine largeur, au moins 1200", () => {
    const { positioned } = computeSceneLayout("A", [0], "standard", ["le boss surgit"]);
    const p = positioned[0] as Positioned;
    expect(p.width).toBe(800);
    expect(p.height).toBeGreaterThanOrEqual(1200);
  });

  it("Q letterbox : bande cinéma 800×200", () => {
    const { positioned, sectionHeight } = computeSceneLayout("Q", [0], "standard", ["ses yeux se plissent"]);
    const p = positioned[0] as Positioned;
    expect(p).toMatchObject({ x: 0, y: 0, width: 800, height: 200 });
    expect(sectionHeight).toBe(200);
  });

  it("composition inconnue → fallback empilé gap 120", () => {
    const { positioned } = computeSceneLayout("Z", [0, 1], "standard", ["a", "b"]);
    expect(positioned).toHaveLength(2);
    const [p0, p1] = positioned as Positioned[];
    expect(p1.y).toBe(p0.height + 120);
  });

  it("D à 1 bloc → retombe sur fallback (invariant v1)", () => {
    const { positioned } = computeSceneLayout("D", [0], "standard", ["face à face"]);
    expect((positioned[0] as Positioned).width).toBe(800);
  });

  it("fallbackLayout borne [500, 1200]", () => {
    const { positioned } = fallbackLayout([0], 2200, ["paysage immense"]);
    expect((positioned[0] as Positioned).height).toBe(1200);
  });
});

describe("normalizeScenes — invariants v1", () => {
  it("K limité à 1 par chapitre, les suivants deviennent E", () => {
    const scenes: AISimpleScene[] = [
      { source_indices: [0], composition: "K" },
      { source_indices: [1], composition: "K" },
    ];
    const out = normalizeScenes(scenes, 2);
    expect(out[0].composition).toBe("K");
    expect(out[1].composition).toBe("E");
  });

  it("tronque au max de la compo (Q = 1 bloc) et redistribue en E", () => {
    const out = normalizeScenes([{ source_indices: [0, 1, 2], composition: "Q" }], 3);
    expect(out[0].source_indices).toEqual([0]);
    const redistributed = out.slice(1).flatMap((s) => s.source_indices);
    expect(redistributed.sort()).toEqual([1, 2]);
    expect(out.slice(1).every((s) => s.composition === "E")).toBe(true);
  });

  it("trie les source_indices en ordre narratif", () => {
    const out = normalizeScenes([{ source_indices: [2, 0], composition: "E" }], 3);
    expect(out[0].source_indices).toEqual([0, 2]);
  });
});

describe("matchAssetRefs — pré-liaison assets", () => {
  const assets = [
    { id: "a1", name: "Kaël" },
    { id: "a2", name: "Mira" },
  ];
  it("matche par personnages, insensible aux accents", () => {
    expect(matchAssetRefs(["Kael"], "", assets)).toEqual(["a1"]);
  });
  it("fallback : scanne la description", () => {
    expect(matchAssetRefs(undefined, "Mira dégaine son arc", assets)).toEqual(["a2"]);
  });
});

describe("buildBubblesForBlock — codes webtoon bulles", () => {
  const rect = { x: 0, y: 1000, width: 800, height: 900 };

  it("narration d'abord, puis dialogue dans l'ordre de lecture (haut → bas)", () => {
    const bubbles = buildBubblesForBlock(rect, block({
      narration: "Le lendemain matin.",
      dialogue: [
        { character: "Kael", text: "On y va." },
        { character: "Mira", text: "Derrière toi !" },
      ],
    })) as Bubble[];
    expect(bubbles).toHaveLength(3);
    expect(bubbles[0].type).toBe("narration");
    expect(bubbles[1].position.y).toBeLessThan(bubbles[2].position.y);
  });

  it("alterne gauche/droite au changement de locuteur, même côté sinon", () => {
    const bubbles = buildBubblesForBlock(rect, block({
      dialogue: [
        { character: "Kael", text: "Un." },
        { character: "Kael", text: "Deux." },
        { character: "Mira", text: "Trois." },
      ],
    })) as Bubble[];
    expect(bubbles[0].position.x).toBe(bubbles[1].position.x);
    expect(bubbles[2].position.x).not.toBe(bubbles[0].position.x);
  });

  it("les bulles restent dans leur case sur les blocs standard (≥ ~316px)", () => {
    const shortRect = { x: 0, y: 500, width: 800, height: 550 };
    const bubbles = buildBubblesForBlock(shortRect, block({
      dialogue: [
        { character: "A", text: "1" },
        { character: "B", text: "2" },
        { character: "A", text: "3" },
        { character: "B", text: "4" },
      ],
    })) as Bubble[];
    const bottom = shortRect.y + shortRect.height;
    for (const b of bubbles) {
      expect(b.position.y + b.height).toBeLessThanOrEqual(bottom);
    }
  });

  it("pas de compression quand la pile tient (pas standard 160)", () => {
    const bubbles = buildBubblesForBlock(rect, block({
      dialogue: [
        { character: "A", text: "1" },
        { character: "B", text: "2" },
      ],
    })) as Bubble[];
    expect(bubbles[1].position.y - bubbles[0].position.y).toBe(160);
  });

  it("cascade dense : le pas ne descend jamais sous 100px", () => {
    const tinyRect = { x: 0, y: 0, width: 800, height: 320 };
    const bubbles = buildBubblesForBlock(tinyRect, block({
      dialogue: [
        { character: "A", text: "1" },
        { character: "B", text: "2" },
        { character: "A", text: "3" },
        { character: "B", text: "4" },
      ],
    })) as Bubble[];
    for (let i = 1; i < bubbles.length; i++) {
      expect(bubbles[i].position.y - bubbles[i - 1].position.y).toBeGreaterThanOrEqual(100);
    }
  });

  it("entrées vides ignorées, type inconnu → speech", () => {
    const bubbles = buildBubblesForBlock(rect, block({
      dialogue: [
        { character: "A", text: "   " },
        { character: "B", text: "Réel", type: "exotique" },
      ],
    })) as Bubble[];
    expect(bubbles).toHaveLength(1);
    expect(bubbles[0].type).toBe("speech");
  });
});

describe("buildSfxForBlock", () => {
  it("texte vide → null ; preset inconnu → boom", () => {
    expect(buildSfxForBlock({ x: 0, y: 0, width: 800, height: 900 }, { text: " " }, false)).toBeNull();
    const sfx = buildSfxForBlock({ x: 0, y: 0, width: 800, height: 900 }, { text: "BOOM", preset: "xyz" }, false) as { fontSize: number };
    expect(sfx.fontSize).toBe(72);
  });
});

describe("processComposition — codes webtoon du canvas", () => {
  const outline: PanelOutlineBlock[] = [
    block({ panel_number: 1, description: "La ville au crépuscule" }),
    block({ panel_number: 2, description: "Kael serre le poing", breathing_after: 700 }),
    block({ panel_number: 3, description: "Le portail s'ouvre" }),
  ];
  const scenes: AISimpleScene[] = [
    { source_indices: [0], composition: "A", gap_after: 400, height_hint: "grand" },
    { source_indices: [1], composition: "B", gap_after: 300, height_hint: "compact" },
    { source_indices: [2], composition: "A", gap_after: 600, height_hint: "splash" },
  ];

  it("réserve les ~300px du haut (header plateforme mobile)", () => {
    const { blocks } = processComposition(scenes, outline);
    const ys = (blocks as Positioned[]).map((b) => b.y);
    expect(Math.min(...ys)).toBe(TOP_RESERVE_PX);
    expect(TOP_RESERVE_PX).toBe(300);
  });

  it("breathing_after du découpage prime sur le gap IA (Distance = Time)", () => {
    const { blocks } = processComposition(scenes, outline);
    const [b0, b1, b2] = blocks as Positioned[];
    // scène 1 → gap IA 400 ; scène 2 → breathing 700 prime sur 300
    expect(b1.y).toBe(b0.y + b0.height + 400);
    expect(b2.y).toBe(b1.y + b1.height + 700);
  });

  it("system_window → fenêtre native, pas de bloc image", () => {
    const withSystem = [block({ system_window: { variant: "quest", title: "QUÊTE" } })];
    const { blocks, systemBlocks } = processComposition(
      [{ source_indices: [0], composition: "A", gap_after: 400 }],
      withSystem
    );
    expect(blocks).toHaveLength(0);
    expect(systemBlocks).toHaveLength(1);
  });

  it("dialogue présent → dialogue_text null (anti-duplication des bulles)", () => {
    const withDialogue = [block({ dialogue: [{ character: "A", text: "Hé !" }], text_excerpt: "Hé !" })];
    const { blocks, speechBubbles } = processComposition(
      [{ source_indices: [0], composition: "A", gap_after: 400 }],
      withDialogue
    );
    expect((blocks[0] as { dialogue_text: string | null }).dialogue_text).toBeNull();
    expect(speechBubbles).toHaveLength(1);
  });

  it("source_index non couvert → bloc de réparation en fin de canvas", () => {
    const { blocks } = processComposition(
      [{ source_indices: [0], composition: "A", gap_after: 400 }],
      outline
    );
    expect(blocks).toHaveLength(3);
  });

  it("recomposition : restaure l'image d'un bloc au même prompt", () => {
    const { blocks } = processComposition(scenes, outline, [
      { prompt: "La ville au crépuscule", image_url: "https://x/img.png" },
    ]);
    expect((blocks[0] as { image_url: string | null }).image_url).toBe("https://x/img.png");
  });

  it("panelHeight ≥ plancher 5000", () => {
    const { panelHeight } = processComposition(
      [{ source_indices: [0], composition: "Q", gap_after: 100 }],
      [block({ description: "ses yeux" })]
    );
    expect(panelHeight).toBe(MIN_CANVAS_HEIGHT);
  });

  it("Q avec dialogue → rétrogradé en G côté serveur, bulle contenue", () => {
    const withDlg = [block({ description: "ses yeux", dialogue: [{ character: "A", text: "Quoi ?!" }] })];
    const { blocks, speechBubbles } = processComposition(
      [{ source_indices: [0], composition: "Q", gap_after: 400 }],
      withDlg
    );
    const b = blocks[0] as Positioned;
    expect(b.height).toBeGreaterThanOrEqual(400); // G, plus letterbox 200
    expect(b.width).toBe(600);
    const bubble = speechBubbles[0] as Bubble;
    expect(bubble.position.y + bubble.height).toBeLessThanOrEqual(b.y + b.height);
  });

  it("l'IA peut ÉTENDRE la respiration au-delà du barème découpage (ellipse 2000)", () => {
    const o = [
      block({ description: "fin de scène", breathing_after: 250 }),
      block({ panel_number: 2, description: "trois ans plus tard" }),
    ];
    const { blocks } = processComposition(
      [
        { source_indices: [0], composition: "A", gap_after: 2000 },
        { source_indices: [1], composition: "A", gap_after: 400 },
      ],
      o
    );
    const [b0, b1] = blocks as Positioned[];
    expect(b1.y).toBe(b0.y + b0.height + 2000);
  });

  it("l'IA ne raccourcit JAMAIS la respiration du découpage (700 vs gap 300 → 700)", () => {
    const o = [
      block({ description: "cliffhanger", breathing_after: 700 }),
      block({ panel_number: 2, description: "suite" }),
    ];
    const { blocks } = processComposition(
      [
        { source_indices: [0], composition: "A", gap_after: 300 },
        { source_indices: [1], composition: "A", gap_after: 400 },
      ],
      o
    );
    const [b0, b1] = blocks as Positioned[];
    expect(b1.y).toBe(b0.y + b0.height + 700);
  });
});
