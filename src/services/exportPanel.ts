import html2canvas from "html2canvas";
import JSZip from "jszip";

async function toDataUrl(src: string): Promise<string> {
  const resp = await fetch(src, { cache: "reload" });
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function waitForImages(el: HTMLElement): Promise<void> {
  const imgs = Array.from(el.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.src || img.src.startsWith("data:")) return;
      try {
        const dataUrl = await toDataUrl(img.src);
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = dataUrl;
          if (img.complete) resolve();
        });
      } catch {
        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        }
      }
    })
  );
}

interface TailData {
  x: number; y: number; w: number;
  svgTop: number; svgH: number; vbH: number;
  fill: string; stroke: string; sw: number; fillOpacity: number;
  fp: string; tp?: string; ap: string;
}

/**
 * Dessine les formes de bulles (fill + strokes) directement sur le canvas
 * via Canvas 2D + Path2D, sans passer par html2canvas.
 *
 * Pourquoi : html2canvas convertit les SVG en Blob URL. Dans ce contexte,
 * vector-effect="non-scaling-stroke" produit des traits de largeur 0 (invisible).
 * Le bypass Path2D garantit un rendu identique à l'écran.
 */
function drawTailsOnCanvas(ctx: CanvasRenderingContext2D, clone: HTMLElement): void {
  clone.querySelectorAll<HTMLElement>("[data-export-tail]").forEach((node) => {
    const raw = node.getAttribute("data-export-tail");
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as TailData;
      const scaleX = d.w / 100;
      const scaleY = d.svgH / d.vbH;
      ctx.save();
      ctx.translate(d.x, d.y + d.svgTop);
      ctx.scale(scaleX, scaleY);
      ctx.globalAlpha = d.fillOpacity;
      // Fill corps + queue
      ctx.fillStyle = d.fill;
      ctx.fill(new Path2D(d.fp));
      // Stroke arc corps
      ctx.strokeStyle = d.stroke;
      ctx.lineWidth = d.sw / Math.max(scaleX, scaleY);
      ctx.stroke(new Path2D(d.ap));
      // Stroke queue (deux côtés)
      if (d.tp) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke(new Path2D(d.tp));
      }
      ctx.restore();
    } catch {
      // ignore
    }
  });
}

function setIgnore(el: HTMLElement, selector: string): void {
  el.querySelectorAll(selector).forEach((node) => {
    (node as HTMLElement).setAttribute("data-html2canvas-ignore", "true");
  });
}

function clearAllIgnore(el: HTMLElement): void {
  el.querySelectorAll("[data-html2canvas-ignore]").forEach((node) => {
    (node as HTMLElement).removeAttribute("data-html2canvas-ignore");
  });
}

/**
 * Rendu 2 passes + composite Path2D pour corriger deux limitations html2canvas :
 *   1. z-index croisé HTML/SVG non géré → impossible d'avoir images sous bulles sous texte
 *   2. vector-effect="non-scaling-stroke" invisible quand html2canvas convertit SVG en Blob URL
 *
 * Solution :
 *   Passe 1 — fond blanc + images + couleurs (SVG et texte ignorés)
 *   Passe 2 — texte seul, fond transparent (images ET SVG ignorés)
 *   Path2D  — formes de bulles dessinées directement sur canvas 2D (stroke normalisé,
 *             identique à l'affichage écran malgré le scale non uniforme)
 *   Composite — passe1 → Path2D → passe2
 */
export async function renderPanelToCanvas(
  panelEl: HTMLDivElement
): Promise<HTMLCanvasElement> {
  const clone = panelEl.cloneNode(true) as HTMLDivElement;
  clone.style.position = "fixed";
  clone.style.left = "-19999px";
  clone.style.top = "0";
  clone.style.zIndex = "-1";
  document.body.appendChild(clone);

  try {
    await waitForImages(clone);

    // ── Passe 1 : images + couleurs (sans SVG ni texte) ───────────────────
    clearAllIgnore(clone);
    setIgnore(clone, '[data-export-layer="svg"]');
    setIgnore(clone, '[data-export-layer="text"]');

    const bgCanvas = await html2canvas(clone, {
      useCORS: true,
      allowTaint: false,
      scale: 1,
      backgroundColor: "#ffffff",
      logging: false,
    });

    // ── Passe 2 : texte uniquement sur fond transparent ──────────────────
    // Les formes SVG (bulles + queues) sont gérées par Path2D dans drawTailsOnCanvas.
    // Ignorer les SVG ici évite que html2canvas les redessine avec un stroke épais
    // (vector-effect non supporté en contexte Blob URL).
    clearAllIgnore(clone);
    setIgnore(clone, '[data-export-layer="bg"]');
    setIgnore(clone, '[data-export-layer="svg"]');

    // vector-effect non supporté quand html2canvas convertit le SVG en image
    clone.querySelectorAll("[vector-effect]").forEach((el) =>
      el.removeAttribute("vector-effect")
    );

    // Le fond du panel root est blanc — le rendre transparent pour que
    // seul le contenu SVG/texte apparaisse dans fgCanvas
    clone.style.backgroundColor = "transparent";

    const fgCanvas = await html2canvas(clone, {
      useCORS: true,
      allowTaint: false,
      scale: 1,
      backgroundColor: null,
      logging: false,
    });

    // ── Composite ─────────────────────────────────────────────────────────
    const out = document.createElement("canvas");
    out.width = bgCanvas.width;
    out.height = bgCanvas.height;
    const ctx = out.getContext("2d")!;

    // 1. Fond : images + couleurs
    ctx.drawImage(bgCanvas, 0, 0);
    // 2. Formes de bulles via Path2D (bypass html2canvas SVG → Blob URL)
    drawTailsOnCanvas(ctx, clone);
    // 3. Texte + autres SVG (html2canvas, fond transparent)
    ctx.drawImage(fgCanvas, 0, 0);

    return out;
  } finally {
    document.body.removeChild(clone);
  }
}

export function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string
): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export async function renderChapterToCanvas(
  panelEls: HTMLDivElement[],
  panelWidth = 800
): Promise<HTMLCanvasElement> {
  const canvases = await Promise.all(
    panelEls.map((el) => renderPanelToCanvas(el))
  );

  const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);

  const merged = document.createElement("canvas");
  merged.width = panelWidth;
  merged.height = totalHeight;
  const ctx = merged.getContext("2d")!;

  let y = 0;
  for (const c of canvases) {
    ctx.drawImage(c, 0, y);
    y += c.height;
  }

  return merged;
}

export async function exportChapterAsZip(
  panelEls: HTMLDivElement[],
  projectName: string,
  chapterNumber: number,
  cutHeight = 1280
): Promise<void> {
  const canvases = await Promise.all(panelEls.map(renderPanelToCanvas));

  const totalWidth = canvases[0]?.width ?? 800;
  const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);

  const fullCanvas = document.createElement("canvas");
  fullCanvas.width = totalWidth;
  fullCanvas.height = totalHeight;
  const ctx = fullCanvas.getContext("2d")!;
  let offsetY = 0;
  for (const c of canvases) {
    ctx.drawImage(c, 0, offsetY);
    offsetY += c.height;
  }

  const sliceCount = Math.ceil(totalHeight / cutHeight);
  const zip = new JSZip();
  const folder = zip.folder(`${projectName}_Chapitre_${chapterNumber}`)!;

  for (let i = 0; i < sliceCount; i++) {
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = fullCanvas.width;
    const sliceH = Math.min(cutHeight, totalHeight - i * cutHeight);
    sliceCanvas.height = sliceH;
    const sliceCtx = sliceCanvas.getContext("2d")!;
    sliceCtx.drawImage(fullCanvas, 0, -(i * cutHeight));
    const blob = await new Promise<Blob>((res) =>
      sliceCanvas.toBlob((b) => res(b!), "image/png")
    );
    const num = String(i + 1).padStart(2, "0");
    folder.file(`Panel_${num}.png`, blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName}_Chapitre_${chapterNumber}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
