// Chemin argent — canGenerate() est le garde-fou client avant tout appel
// FAL.ai (1 appel = 1 crédit). Un faux "true" ici consomme un crédit à tort,
// un faux "false" bloque un utilisateur qui a payé.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAssetGeneration } from "@/hooks/useAssetGeneration";
import type { Asset, Project, UsageInfo } from "@/types";

const { toastMock, generateAssetImageMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  generateAssetImageMock: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/services/assets", () => ({
  generateAssetImage: generateAssetImageMock,
}));

vi.mock("@/lib/generationLogger", () => ({
  logGenerationFailure: vi.fn(),
  logGenerationInfo: vi.fn(),
}));

type StyleInfo = Parameters<typeof useAssetGeneration>[0];

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    style_template: "style_key: manga-noir",
    style_image_urls: null,
    ...overrides,
  } as Project;
}

function usage(count: number, limit = 20): UsageInfo {
  return { count, limit, plan: "libre" };
}

function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "asset-1",
    project_id: "proj-1",
    prompt: "un héros au sabre",
    asset_type: "character",
    ...overrides,
  } as Asset;
}

function setup(styleInfo: StyleInfo, qc = new QueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useAssetGeneration(styleInfo), { wrapper });
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ── canGenerate — garde quota ─────────────────────────────────────

describe("canGenerate — quota", () => {
  it("quota atteint avec onQuotaReached → false, callback appelé, pas de toast", () => {
    const onQuotaReached = vi.fn();
    const { result } = setup({ project: project(), usageInfo: usage(20), onQuotaReached });

    expect(result.current.canGenerate()).toBe(false);
    expect(onQuotaReached).toHaveBeenCalledTimes(1);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("quota atteint sans onQuotaReached → false et toast destructif avec le compteur", () => {
    const { result } = setup({ project: project(), usageInfo: usage(20) });

    expect(result.current.canGenerate()).toBe(false);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Quota atteint",
        description: expect.stringContaining("20/20"),
        variant: "destructive",
      }),
    );
  });

  it("compteur au-delà de la limite → false", () => {
    const onQuotaReached = vi.fn();
    const { result } = setup({ project: project(), usageInfo: usage(25), onQuotaReached });

    expect(result.current.canGenerate()).toBe(false);
    expect(onQuotaReached).toHaveBeenCalledTimes(1);
  });

  it("juste sous la limite (19/20) avec style défini → true, aucune alerte", () => {
    const onQuotaReached = vi.fn();
    const { result } = setup({ project: project(), usageInfo: usage(19), onQuotaReached });

    expect(result.current.canGenerate()).toBe(true);
    expect(onQuotaReached).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("sans usageInfo, le quota n'est pas vérifié — seul le style décide", () => {
    const { result } = setup({ project: project() });

    expect(result.current.canGenerate()).toBe(true);
  });
});

// ── canGenerate — garde style ─────────────────────────────────────

describe("canGenerate — style requis", () => {
  it("quota ok mais aucun style (ni texte ni images) → false + toast Style requis", () => {
    const onQuotaReached = vi.fn();
    const { result } = setup({
      project: project({ style_template: null, style_image_urls: null }),
      usageInfo: usage(5),
      onQuotaReached,
    });

    expect(result.current.canGenerate()).toBe(false);
    expect(onQuotaReached).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Style requis", variant: "destructive" }),
    );
  });

  it("style_template composé uniquement d'espaces → pas de style → false", () => {
    const { result } = setup({
      project: project({ style_template: "   ", style_image_urls: null }),
      usageInfo: usage(0),
    });

    expect(result.current.canGenerate()).toBe(false);
  });

  it("style_image_urls vide ne compte pas comme style → false", () => {
    const { result } = setup({
      project: project({ style_template: null, style_image_urls: [] }),
      usageInfo: usage(0),
    });

    expect(result.current.canGenerate()).toBe(false);
  });

  it("projet null → false + toast Style requis", () => {
    const { result } = setup({ project: null, usageInfo: usage(0) });

    expect(result.current.canGenerate()).toBe(false);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Style requis", variant: "destructive" }),
    );
  });

  it("images de référence seules (sans template texte) → true", () => {
    const { result } = setup({
      project: project({ style_template: null, style_image_urls: ["https://cdn/ref.png"] }),
      usageInfo: usage(0),
    });

    expect(result.current.canGenerate()).toBe(true);
    expect(toastMock).not.toHaveBeenCalled();
  });
});

// ── generate — protection du crédit ───────────────────────────────

describe("generate", () => {
  it("asset sans prompt → toast Impossible et aucun appel réseau (aucun crédit consommé)", async () => {
    const { result } = setup({ project: project(), usageInfo: usage(0) });

    await act(async () => {
      await result.current.generate(asset({ prompt: "   " }));
    });

    expect(generateAssetImageMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Impossible", variant: "destructive" }),
    );
  });

  it("style absent → aucun appel à generateAssetImage", async () => {
    const { result } = setup({
      project: project({ style_template: null, style_image_urls: null }),
    });

    await act(async () => {
      await result.current.generate(asset());
    });

    expect(generateAssetImageMock).not.toHaveBeenCalled();
  });

  it("succès → invalide monthlyUsage (compteur de crédits) et les assets du projet", async () => {
    generateAssetImageMock.mockResolvedValue({ image_url: "https://cdn/img.png" });
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    const { result } = setup({ project: project() }, qc);

    await act(async () => {
      await result.current.generate(asset());
    });

    expect(generateAssetImageMock).toHaveBeenCalledWith({
      asset_id: "asset-1",
      prompt: "un héros au sabre",
      asset_type: "character",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["monthlyUsage"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["assets", "proj-1"] });
    expect(toastMock).toHaveBeenCalledWith({ title: "Image générée !" });
  });

  it("échec → toast destructif, état de génération libéré, compteur non invalidé", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateAssetImageMock.mockRejectedValue(new Error("timeout"));
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    const { result } = setup({ project: project() }, qc);

    await act(async () => {
      await result.current.generate(asset());
    });

    expect(result.current.generatingAssetId).toBeNull();
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Génération IA indisponible",
        description: expect.stringContaining("délai dépassé"),
        variant: "destructive",
      }),
    );
  });
});
