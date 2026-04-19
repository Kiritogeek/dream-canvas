import html2canvas from "html2canvas";
import JSZip from "jszip";

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

export async function exportChapterAsZip(
  panelEl: HTMLDivElement,
  projectName: string,
  chapterNumber: number,
  cutHeight = 1280
): Promise<void> {
  const fullCanvas = await renderPanelToCanvas(panelEl);
  const totalHeight = fullCanvas.height;
  const panelCount = Math.ceil(totalHeight / cutHeight);
  const zip = new JSZip();
  const folder = zip.folder(`${projectName}_Chapitre_${chapterNumber}`)!;

  for (let i = 0; i < panelCount; i++) {
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = fullCanvas.width;
    const sliceH = Math.min(cutHeight, totalHeight - i * cutHeight);
    sliceCanvas.height = sliceH;
    const ctx = sliceCanvas.getContext("2d")!;
    ctx.drawImage(fullCanvas, 0, -(i * cutHeight));
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
