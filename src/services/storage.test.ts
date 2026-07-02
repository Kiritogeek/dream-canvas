import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Asset } from "@/types";
import { uploadStyleImage, deleteAssetImages, deleteStyleImage } from "@/services/storage";

const { storageFromMock } = vi.hoisted(() => ({ storageFromMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: storageFromMock } },
}));

const PUBLIC_PREFIX = "https://proj.supabase.co/storage/v1/object/public/dreamweave/";

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "asset-1",
    image_url: null,
    image_url_sheet: null,
    image_url_profile_left: null,
    image_url_profile_right: null,
    image_url_back: null,
    ...overrides,
  } as Asset;
}

beforeEach(() => {
  storageFromMock.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── uploadStyleImage ──────────────────────────────────────────────

describe("uploadStyleImage", () => {
  it("construit le chemin <userId>/projects/<projectId>/style/<uuid>.<ext> et upsert", async () => {
    const uploadMock = vi.fn(async () => ({ data: { path: "chemin/stocke.jpg" }, error: null }));
    const getPublicUrlMock = vi.fn(() => ({ data: { publicUrl: "https://cdn/style.jpg" } }));
    storageFromMock.mockReturnValue({ upload: uploadMock, getPublicUrl: getPublicUrlMock });

    const url = await uploadStyleImage(
      "u1",
      "p1",
      new File(["x"], "reference.jpg", { type: "image/jpeg" })
    );

    expect(url).toBe("https://cdn/style.jpg");
    const [path, , options] = uploadMock.mock.calls[0];
    expect(path).toMatch(/^u1\/projects\/p1\/style\/[^/]+\.jpg$/);
    expect(options).toEqual({ contentType: "image/jpeg", upsert: true });
    // L'URL publique doit être dérivée du chemin réellement stocké (réponse serveur)
    expect(getPublicUrlMock).toHaveBeenCalledWith("chemin/stocke.jpg");
  });

  it("nom de fichier finissant par un point → extension png par défaut", async () => {
    const uploadMock = vi.fn(async () => ({ data: { path: "p" }, error: null }));
    storageFromMock.mockReturnValue({
      upload: uploadMock,
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://cdn/x" } })),
    });

    await uploadStyleImage("u1", "p1", new File(["x"], "photo.", { type: "image/png" }));
    expect(uploadMock.mock.calls[0][0]).toMatch(/\.png$/);
  });

  it("erreur upload → rejette", async () => {
    storageFromMock.mockReturnValue({
      upload: vi.fn(async () => ({ data: null, error: new Error("accès refusé") })),
      getPublicUrl: vi.fn(),
    });

    await expect(
      uploadStyleImage("u1", "p1", new File(["x"], "a.png", { type: "image/png" }))
    ).rejects.toThrow("accès refusé");
  });
});

// ── deleteAssetImages ─────────────────────────────────────────────

describe("deleteAssetImages", () => {
  it("ne transmet au remove que les chemins extraits des URLs publiques du bucket", async () => {
    const removeMock = vi.fn(async () => ({ error: null }));
    storageFromMock.mockReturnValue({ remove: removeMock });

    await deleteAssetImages(
      makeAsset({
        image_url: `${PUBLIC_PREFIX}u1/assets/face.png`,
        image_url_sheet: null,
        image_url_profile_left: "https://autre-cdn.com/externe.png",
        image_url_profile_right: `${PUBLIC_PREFIX}u1/assets/droite.png`,
        image_url_back: `${PUBLIC_PREFIX}u1/assets/dos.png`,
      })
    );

    expect(removeMock).toHaveBeenCalledWith([
      "u1/assets/face.png",
      "u1/assets/droite.png",
      "u1/assets/dos.png",
    ]);
  });

  it("aucune URL → remove non appelé", async () => {
    await expect(deleteAssetImages(makeAsset())).resolves.toBeUndefined();
    expect(storageFromMock).not.toHaveBeenCalled();
  });

  it("uniquement des URLs hors bucket (autre bucket inclus) → remove non appelé", async () => {
    await deleteAssetImages(
      makeAsset({
        image_url: "https://autre-cdn.com/externe.png",
        image_url_sheet: "https://proj.supabase.co/storage/v1/object/public/autre-bucket/x.png",
      })
    );
    expect(storageFromMock).not.toHaveBeenCalled();
  });

  it("échec du remove → warning sans throw (la suppression de l'asset ne doit pas bloquer)", async () => {
    storageFromMock.mockReturnValue({
      remove: vi.fn(async () => ({ error: { message: "objet verrouillé" } })),
    });

    await expect(
      deleteAssetImages(makeAsset({ image_url: `${PUBLIC_PREFIX}u1/a.png` }))
    ).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });
});

// ── deleteStyleImage ──────────────────────────────────────────────

describe("deleteStyleImage", () => {
  it("supprime le chemin extrait de l'URL publique", async () => {
    const removeMock = vi.fn(async () => ({ error: null }));
    storageFromMock.mockReturnValue({ remove: removeMock });

    await deleteStyleImage(`${PUBLIC_PREFIX}u1/projects/p1/style/img.png`);
    expect(removeMock).toHaveBeenCalledWith(["u1/projects/p1/style/img.png"]);
  });

  it("URL étrangère au bucket → aucun appel Storage", async () => {
    await expect(deleteStyleImage("https://autre-cdn.com/img.png")).resolves.toBeUndefined();
    expect(storageFromMock).not.toHaveBeenCalled();
  });

  it("échec du remove → warning sans throw", async () => {
    storageFromMock.mockReturnValue({
      remove: vi.fn(async () => ({ error: { message: "introuvable" } })),
    });

    await expect(deleteStyleImage(`${PUBLIC_PREFIX}u1/x.png`)).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });
});
