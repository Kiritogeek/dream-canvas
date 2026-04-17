import html2canvas from "html2canvas";

export async function renderPanelToCanvas(panelEl: HTMLDivElement): Promise<HTMLCanvasElement> {
  return html2canvas(panelEl, {
    useCORS: true,
    allowTaint: false,
    scale: 1,
    backgroundColor: "#ffffff",
    logging: false,
  });
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
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
  const canvases = await Promise.all(panelEls.map((el) => renderPanelToCanvas(el)));

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
