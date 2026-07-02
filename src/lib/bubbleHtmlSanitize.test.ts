import { describe, it, expect } from "vitest";
import { sanitizeBubbleHtml } from "@/lib/bubbleHtmlSanitize";

describe("sanitizeBubbleHtml — balises autorisées", () => {
  it("conserve les balises de formatage", () => {
    expect(sanitizeBubbleHtml("<b>gras</b>")).toBe("<b>gras</b>");
    expect(sanitizeBubbleHtml("<strong>a</strong> <em>b</em>")).toBe("<strong>a</strong> <em>b</em>");
    expect(sanitizeBubbleHtml("<i>x</i>")).toBe("<i>x</i>");
    expect(sanitizeBubbleHtml("<u>x</u>")).toBe("<u>x</u>");
    expect(sanitizeBubbleHtml("<s>x</s>")).toBe("<s>x</s>");
    expect(sanitizeBubbleHtml("<strike>x</strike>")).toBe("<strike>x</strike>");
    expect(sanitizeBubbleHtml("<del>x</del>")).toBe("<del>x</del>");
  });

  it("normalise la casse d'une balise autorisée en minuscules", () => {
    expect(sanitizeBubbleHtml("<B>gras</B>")).toBe("<b>gras</b>");
  });

  it("strippe tous les attributs d'une balise autorisée (onclick, style, class)", () => {
    const out = sanitizeBubbleHtml('<b class="x" style="color:red" onclick="alert(1)">gras</b>');
    expect(out).toBe("<b>gras</b>");
    expect(out.toLowerCase()).not.toContain("onclick");
  });
});

describe("sanitizeBubbleHtml — balises interdites", () => {
  it("supprime <script> mais laisse son texte inerte", () => {
    const out = sanitizeBubbleHtml("<script>alert(1)</script>");
    expect(out.toLowerCase()).not.toContain("<script");
    expect(out).toBe("alert(1)");
  });

  it("supprime totalement une balise <img onerror> bien fermée", () => {
    expect(sanitizeBubbleHtml("<img src=x onerror=alert(1)>")).toBe("");
  });

  it("supprime <iframe> et <svg onload>", () => {
    expect(sanitizeBubbleHtml('<iframe src="//evil"></iframe>')).toBe("");
    expect(sanitizeBubbleHtml("<svg onload=alert(1)>x</svg>")).toBe("x");
  });

  it("supprime <a href=javascript:> en conservant le libellé", () => {
    const out = sanitizeBubbleHtml('<a href="javascript:alert(1)">clique</a>');
    expect(out).toBe("clique");
    expect(out.toLowerCase()).not.toContain("javascript:");
  });
});

describe("sanitizeBubbleHtml — balises de bloc → <br>", () => {
  it("transforme la fermeture des paragraphes en <br>", () => {
    expect(sanitizeBubbleHtml("<p>a</p><p>b</p>")).toBe("a<br>b");
  });

  it("gère div / li / titres", () => {
    expect(sanitizeBubbleHtml("<div>x</div>")).toBe("x");
    expect(sanitizeBubbleHtml("<li>a</li><li>b</li>")).toBe("a<br>b");
    expect(sanitizeBubbleHtml("<h2>Titre</h2>Corps")).toBe("Titre<br>Corps");
  });
});

describe("sanitizeBubbleHtml — normalisation des <br>", () => {
  it("normalise les variantes auto-fermantes", () => {
    expect(sanitizeBubbleHtml("a<br/>b")).toBe("a<br>b");
    expect(sanitizeBubbleHtml("a<br />b")).toBe("a<br>b");
  });

  it("réduit les rafales de <br> (3+) à deux", () => {
    expect(sanitizeBubbleHtml("a<br><br><br><br>b")).toBe("a<br><br>b");
  });

  it("supprime les <br> en fin de chaîne", () => {
    expect(sanitizeBubbleHtml("texte<br><br>")).toBe("texte");
  });
});

describe("sanitizeBubbleHtml — entrées vides / limites", () => {
  it('retourne "" pour chaîne vide', () => expect(sanitizeBubbleHtml("")).toBe(""));
  it('retourne "" pour null', () => expect(sanitizeBubbleHtml(null as unknown as string)).toBe(""));
  it('retourne "" pour undefined', () => expect(sanitizeBubbleHtml(undefined as unknown as string)).toBe(""));
  it('retourne "" pour espaces seuls', () => expect(sanitizeBubbleHtml("   ")).toBe(""));
});

describe("sanitizeBubbleHtml — encodages (déjà échappés restent inertes)", () => {
  it("préserve les entités &lt;script&gt; sans les réactiver", () => {
    const encoded = "&lt;script&gt;alert(1)&lt;/script&gt;";
    const out = sanitizeBubbleHtml(encoded);
    expect(out).toBe(encoded);
    expect(out).not.toContain("<script>");
  });
});

describe("sanitizeBubbleHtml — imbrications / malformé", () => {
  it("ne reconstruit pas <script> via un split simple", () => {
    const out = sanitizeBubbleHtml("<scr<script>ipt>alert(1)");
    expect(out.toLowerCase()).not.toContain("<script");
  });

  it("neutralise une reconstruction <script> via une balise de bloc intercalée", () => {
    // <scr + <div> supprimé + ipt> ⇒ <script> ⇒ supprimé au passage final
    expect(sanitizeBubbleHtml("<scr<div>ipt>")).toBe("");
  });

  it("avale une balise interdite absorbée dans les attributs d'une balise autorisée", () => {
    const out = sanitizeBubbleHtml("<b<img src=x onerror=alert(1)>>");
    expect(out.toLowerCase()).not.toContain("onerror");
    expect(out.toLowerCase()).not.toContain("<img");
  });
});

describe("sanitizeBubbleHtml — adversarial XSS", () => {
  it("supprime bien la version fermée du vecteur onerror (contrôle)", () => {
    expect(sanitizeBubbleHtml('<img src=x onerror="alert(1)">').toLowerCase()).not.toContain("onerror");
  });

  // Balise non terminée (sans '>' final) : le parseur HTML la compléterait en fin de
  // flux via dangerouslySetInnerHTML (BubbleLayer, PanelExportSpeechBubbles) — le '<'
  // orphelin doit ressortir en &lt; inerte (fix du bypass P1 du 02/07).
  it("neutralise une balise <img onerror> NON terminée", () => {
    const out = sanitizeBubbleHtml('<img src=x onerror="alert(1)"');
    expect(out).toBe('&lt;img src=x onerror="alert(1)"');
  });

  it("neutralise une balise autorisée NON terminée portant des attributs", () => {
    const out = sanitizeBubbleHtml('<b onmouseover="alert(1)"');
    expect(out).toBe('&lt;b onmouseover="alert(1)"');
  });

  it("un '<' littéral dans le texte devient &lt; sans casser le rendu", () => {
    expect(sanitizeBubbleHtml("5 < 10 et <b>gras</b>")).toBe("5 &lt; 10 et <b>gras</b>");
  });
});
