import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import {
  downloadCanvas,
  renderChapterToCanvas,
  exportChapterAsZip,
} from "@/services/exportPanel";

const { html2canvasMock, zipInstances } = vi.hoisted(() => ({
  html2canvasMock: vi.fn(),
  zipInstances: [] as Array<{
    folderName: string | null;
    files: Array<{ name: string; blob: Blob }>;
  }>,
}));

vi.mock("html2canvas", () => ({ default: html2canvasMock }));

vi.mock("jszip", () => ({
  default: class JSZipMock {
    private record = {
      folderName: null as string | null,
      files: [] as Array<{ name: string; blob: Blob }>,
    };
    constructor() {
      zipInstances.push(this.record);
    }
    folder(name: string) {
      this.record.folderName = name;
      const rec = this.record;
      return {
        file(fileName: string, blob: Blob) {
          rec.files.push({ name: fileName, blob });
        },
      };
    }
    generateAsync() {
      return Promise.resolve(new Blob(["zip"]));
    }
  },
}));

// jsdom n'implémente ni Canvas 2D, ni toBlob, ni URL.createObjectURL :
// on stubbe le strict nécessaire pour observer dimensions, découpage et noms.
const ctxByCanvas = new Map<HTMLCanvasElement, { drawImage: ReturnType<typeof vi.fn> }>();
const blobbedSlices: Array<{ width: number; height: number }> = [];
const clickedAnchors: Array<{ download: string; href: string }> = [];

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    let ctx = ctxByCanvas.get(this);
    if (!ctx) {
      ctx = { drawImage: vi.fn() };
      ctxByCanvas.set(this, ctx);
    }
    return ctx as unknown as CanvasRenderingContext2D;
  } as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toBlob = function (this: HTMLCanvasElement, callback: BlobCallback) {
    blobbedSlices.push({ width: this.width, height: this.height });
    callback(new Blob([`${this.width}x${this.height}`], { type: "image/png" }));
  };

  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    clickedAnchors.push({ download: this.download, href: this.href });
  };

  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  html2canvasMock.mockReset();
  html2canvasMock.mockImplementation(async (el: HTMLElement) => ({
    width: Number(el.dataset.w ?? "800"),
    height: Number(el.dataset.h ?? "100"),
  }));
  zipInstances.length = 0;
  ctxByCanvas.clear();
  blobbedSlices.length = 0;
  clickedAnchors.length = 0;
});

function panelEl(height: number, width = 800): HTMLDivElement {
  const el = document.createElement("div");
  el.dataset.h = String(height);
  el.dataset.w = String(width);
  return el;
}

// ── renderChapterToCanvas ─────────────────────────────────────────

describe("renderChapterToCanvas", () => {
  it("empile les cases verticalement : hauteur = somme, offsets cumulés", async () => {
    const merged = await renderChapterToCanvas([panelEl(1000), panelEl(500), panelEl(900)]);

    expect(merged.width).toBe(800);
    expect(merged.height).toBe(2400);
    const ctx = ctxByCanvas.get(merged);
    expect(ctx?.drawImage.mock.calls.map((c) => [c[1], c[2]])).toEqual([
      [0, 0],
      [0, 1000],
      [0, 1500],
    ]);
  });

  it("respecte le panelWidth fourni", async () => {
    const merged = await renderChapterToCanvas([panelEl(300)], 640);
    expect(merged.width).toBe(640);
  });

  it("chapitre vide → canvas de hauteur 0 avec la largeur par défaut", async () => {
    const merged = await renderChapterToCanvas([]);
    expect(merged.width).toBe(800);
    expect(merged.height).toBe(0);
  });

  it("nettoie les wrappers hors-écran ajoutés au DOM pendant le rendu", async () => {
    await renderChapterToCanvas([panelEl(100), panelEl(100)]);
    expect(document.body.children).toHaveLength(0);
  });
});

// ── exportChapterAsZip ────────────────────────────────────────────

describe("exportChapterAsZip", () => {
  it("découpe en tranches de cutHeight, la dernière portant le reste", async () => {
    await exportChapterAsZip([panelEl(1000), panelEl(1400)], "MonProjet", 3);

    const zip = zipInstances[0];
    expect(zip.folderName).toBe("MonProjet_Chapitre_3");
    expect(zip.files.map((f) => f.name)).toEqual(["Panel_01.png", "Panel_02.png"]);
    // 2400px total, cut à 1280 → 1280 puis 1120
    expect(blobbedSlices).toEqual([
      { width: 800, height: 1280 },
      { width: 800, height: 1120 },
    ]);
    expect(clickedAnchors[0].download).toBe("MonProjet_Chapitre_3.zip");
  });

  it("hauteur totale multiple exact de cutHeight → aucune tranche vide", async () => {
    await exportChapterAsZip([panelEl(500), panelEl(500)], "P", 1, 500);

    expect(zipInstances[0].files.map((f) => f.name)).toEqual(["Panel_01.png", "Panel_02.png"]);
    expect(blobbedSlices.map((s) => s.height)).toEqual([500, 500]);
  });

  it("numérote les tranches sur 2 chiffres au-delà de 9", async () => {
    await exportChapterAsZip([panelEl(1100)], "P", 2, 100);

    const names = zipInstances[0].files.map((f) => f.name);
    expect(names).toHaveLength(11);
    expect(names[0]).toBe("Panel_01.png");
    expect(names[9]).toBe("Panel_10.png");
    expect(names[10]).toBe("Panel_11.png");
  });

  it("rappelle onProgress après chaque case rendue", async () => {
    const onProgress = vi.fn();
    await exportChapterAsZip(
      [panelEl(100), panelEl(100), panelEl(100)],
      "P",
      1,
      1280,
      onProgress
    );
    expect(onProgress.mock.calls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it("chapitre vide → zip sans fichier mais téléchargement quand même déclenché", async () => {
    await exportChapterAsZip([], "Vide", 9);
    expect(zipInstances[0].files).toEqual([]);
    expect(clickedAnchors[0].download).toBe("Vide_Chapitre_9.zip");
  });
});

// ── downloadCanvas ────────────────────────────────────────────────

describe("downloadCanvas", () => {
  it("télécharge le PNG sous le nom demandé", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 20;

    downloadCanvas(canvas, "case_01.png");

    expect(clickedAnchors).toEqual([{ download: "case_01.png", href: "blob:mock-url" }]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
