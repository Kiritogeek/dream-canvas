import { describe, it, expect } from "vitest";
import type { SpeechBubble, SpeechBubbleType } from "@/types";
import {
  getSpeechBubbleViewBoxHeight,
  bubbleShowsTailGraphic,
  getSpeechBubbleSvgBoxRelToBubble,
  getSpeechBubbleBottomInPanelPx,
} from "@/lib/bubbleSvgLayout";

function bubble(type: SpeechBubbleType, extra?: Partial<SpeechBubble>): SpeechBubble {
  return {
    id: "b1",
    type,
    text: "coucou",
    position: { x: 0, y: 0 },
    ...extra,
  } as SpeechBubble;
}

describe("getSpeechBubbleViewBoxHeight", () => {
  it("0 pour text (pas de forme)", () => expect(getSpeechBubbleViewBoxHeight(bubble("text"))).toBe(0));
  it("100 pour narration (sans queue)", () => expect(getSpeechBubbleViewBoxHeight(bubble("narration"))).toBe(100));
  it("92 pour thought", () => expect(getSpeechBubbleViewBoxHeight(bubble("thought"))).toBe(92));
  it("120 pour speech", () => expect(getSpeechBubbleViewBoxHeight(bubble("speech"))).toBe(120));
  it("120 pour shout", () => expect(getSpeechBubbleViewBoxHeight(bubble("shout"))).toBe(120));
  it("120 pour cloud", () => expect(getSpeechBubbleViewBoxHeight(bubble("cloud"))).toBe(120));
  it("120 pour radio", () => expect(getSpeechBubbleViewBoxHeight(bubble("radio"))).toBe(120));
});

describe("bubbleShowsTailGraphic", () => {
  it("false pour text", () => expect(bubbleShowsTailGraphic(bubble("text"))).toBe(false));
  it("false pour narration (type sans queue)", () => expect(bubbleShowsTailGraphic(bubble("narration"))).toBe(false));

  it("shout : queue seulement si tailOn === true", () => {
    expect(bubbleShowsTailGraphic(bubble("shout"))).toBe(false); // tailOn absent
    expect(bubbleShowsTailGraphic(bubble("shout", { tailOn: false }))).toBe(false);
    expect(bubbleShowsTailGraphic(bubble("shout", { tailOn: true }))).toBe(true);
  });

  it("speech : queue par défaut, masquée seulement si tailOn === false", () => {
    expect(bubbleShowsTailGraphic(bubble("speech"))).toBe(true);
    expect(bubbleShowsTailGraphic(bubble("speech", { tailOn: true }))).toBe(true);
    expect(bubbleShowsTailGraphic(bubble("speech", { tailOn: false }))).toBe(false);
  });

  it("thought : queue par défaut", () => {
    expect(bubbleShowsTailGraphic(bubble("thought"))).toBe(true);
    expect(bubbleShowsTailGraphic(bubble("thought", { tailOn: false }))).toBe(false);
  });
});

describe("getSpeechBubbleSvgBoxRelToBubble", () => {
  it("narration : offset 0, svgH = hauteur brute", () => {
    const r = getSpeechBubbleSvgBoxRelToBubble(bubble("narration", { height: 160 }));
    expect(r.svgTopOffset).toBe(0);
    expect(r.svgH).toBe(160);
  });

  it("thought : svgH = hauteur, offset centré à 0", () => {
    const r = getSpeechBubbleSvgBoxRelToBubble(bubble("thought", { height: 160 }));
    expect(r.svgH).toBeCloseTo(160, 5);
    expect(r.svgTopOffset).toBeCloseTo(0, 5);
  });

  it("speech : svgH = hauteur * 1.2, offset dérivé du bodyCY", () => {
    const r = getSpeechBubbleSvgBoxRelToBubble(bubble("speech", { height: 160 }));
    expect(r.svgH).toBeCloseTo(192, 5);
    expect(r.svgTopOffset).toBeCloseTo(6.4, 4);
  });

  it("cloud : bodyCY 47 → offset 3 pour hauteur 100", () => {
    const r = getSpeechBubbleSvgBoxRelToBubble(bubble("cloud", { height: 100 }));
    expect(r.svgH).toBeCloseTo(120, 5);
    expect(r.svgTopOffset).toBeCloseTo(3, 4);
  });

  it("hauteur absente → défaut 160 (identique à speech 160)", () => {
    const r = getSpeechBubbleSvgBoxRelToBubble(bubble("speech"));
    expect(r.svgH).toBeCloseTo(192, 5);
    expect(r.svgTopOffset).toBeCloseTo(6.4, 4);
  });

  it("arrondit une hauteur fractionnaire", () => {
    const r = getSpeechBubbleSvgBoxRelToBubble(bubble("narration", { height: 159.6 }));
    expect(r.svgH).toBe(160);
  });
});

describe("getSpeechBubbleBottomInPanelPx", () => {
  it("text : simplement y + hauteur", () => {
    expect(getSpeechBubbleBottomInPanelPx(bubble("text", { position: { x: 0, y: 10 }, height: 100 }))).toBe(110);
  });

  it("narration (sans queue) : bas = y + svgH + saignement de trait", () => {
    const b = bubble("narration", { position: { x: 0, y: 0 }, height: 160 });
    expect(getSpeechBubbleBottomInPanelPx(b)).toBeCloseTo(174, 4); // 0 + 160 + 14
  });

  it("speech avec queue : le corps domine quand la pointe est haute (tailY 115)", () => {
    const b = bubble("speech", { position: { x: 0, y: 0 }, height: 160 });
    expect(getSpeechBubbleBottomInPanelPx(b)).toBeCloseTo(212.4, 3);
  });

  it("speech : une pointe basse (tailY grand) étend le bas au-delà du corps", () => {
    const b = bubble("speech", { position: { x: 0, y: 0 }, height: 160, tailY: 250 });
    // tip = 250/120*192 = 400 → 6.4 + 400 + 14 = 420.4
    expect(getSpeechBubbleBottomInPanelPx(b)).toBeCloseTo(420.4, 2);
  });

  it("speech tailOn:false : la queue est ignorée même avec tailY grand", () => {
    const b = bubble("speech", { position: { x: 0, y: 0 }, height: 160, tailY: 250, tailOn: false });
    expect(getSpeechBubbleBottomInPanelPx(b)).toBeCloseTo(212.4, 3);
  });

  it("intègre la position y et arrondit y et hauteur", () => {
    const b = bubble("narration", { position: { x: 0, y: 10.6 }, height: 160.4 });
    // round(10.6)=11, round(160.4)=160 → 11 + 160 + 14 = 185
    expect(getSpeechBubbleBottomInPanelPx(b)).toBeCloseTo(185, 4);
  });
});
