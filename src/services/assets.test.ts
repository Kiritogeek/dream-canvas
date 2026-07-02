import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Asset, GenerateAssetPayload } from "@/types";
import {
  generateAssetImage,
  deleteAsset,
  uploadReferenceImage,
  countAssets,
} from "@/services/assets";

const mocks = vi.hoisted(() => ({
  fromMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  getSessionMock: vi.fn(),
  invokeMock: vi.fn(),
  storageFromMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.fromMock,
    auth: { refreshSession: mocks.refreshSessionMock, getSession: mocks.getSessionMock },
    functions: { invoke: mocks.invokeMock },
    storage: { from: mocks.storageFromMock },
  },
}));

type QueryResult = { data?: unknown; error?: unknown; count?: number | null };

function supabaseChain(result: QueryResult) {
  const chain = {
    select: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  chain.select.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

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

const payload: GenerateAssetPayload = {
  asset_id: "asset-1",
  prompt: "un héros au clair de lune",
  asset_type: "character",
};

function mockSessionOk() {
  mocks.refreshSessionMock.mockResolvedValue({ data: {}, error: null });
  mocks.getSessionMock.mockResolvedValue({ data: { session: { access_token: "jwt" } } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── generateAssetImage ────────────────────────────────────────────

describe("generateAssetImage", () => {
  it("retourne le résultat de génération en cas de succès", async () => {
    mockSessionOk();
    const result = {
      image_url: "https://cdn/image.png",
      update_field: "image_url",
      model: "flux-2-pro",
      plan: "libre",
    };
    mocks.invokeMock.mockResolvedValue({ data: result, error: null });

    await expect(generateAssetImage(payload)).resolves.toEqual(result);
    expect(mocks.invokeMock).toHaveBeenCalledWith("generate-asset-image", { body: payload });
  });

  it("session absente → rejette sans appeler l'Edge Function", async () => {
    mocks.refreshSessionMock.mockResolvedValue({ data: {}, error: null });
    mocks.getSessionMock.mockResolvedValue({ data: { session: null } });

    await expect(generateAssetImage(payload)).rejects.toThrow(/Session expirée ou invalide/);
    expect(mocks.invokeMock).not.toHaveBeenCalled();
  });

  it("échec du refreshSession → warning mais la génération continue", async () => {
    mocks.refreshSessionMock.mockResolvedValue({ data: {}, error: { message: "réseau" } });
    mocks.getSessionMock.mockResolvedValue({ data: { session: { access_token: "jwt" } } });
    const result = { image_url: "https://cdn/i.png", update_field: "image_url", model: "flux-2-pro", plan: "libre" };
    mocks.invokeMock.mockResolvedValue({ data: result, error: null });

    await expect(generateAssetImage(payload)).resolves.toEqual(result);
    expect(console.warn).toHaveBeenCalled();
  });

  it("erreur invoke avec corps JSON → message détaillé + request_id extraits de la Response", async () => {
    mockSessionOk();
    const invokeError = Object.assign(
      new Error("Edge Function returned a non-2xx status code"),
      {
        context: new Response(
          JSON.stringify({ error: "Quota mensuel atteint", request_id: "req-42" }),
          { status: 402 }
        ),
      }
    );
    mocks.invokeMock.mockResolvedValue({ data: null, error: invokeError });

    await expect(generateAssetImage(payload)).rejects.toThrow(
      "Quota mensuel atteint (request_id: req-42)"
    );
  });

  it("erreur invoke sans contexte → reprend le message de l'erreur", async () => {
    mockSessionOk();
    mocks.invokeMock.mockResolvedValue({ data: null, error: new Error("Failed to fetch") });

    await expect(generateAssetImage(payload)).rejects.toThrow("Failed to fetch");
  });

  it("réponse sans image_url → rejette avec un message explicite", async () => {
    mockSessionOk();
    mocks.invokeMock.mockResolvedValue({ data: { update_field: "image_url" }, error: null });

    await expect(generateAssetImage(payload)).rejects.toThrow(
      "Réponse invalide : image_url manquant"
    );
  });
});

// ── deleteAsset ───────────────────────────────────────────────────

describe("deleteAsset", () => {
  it("supprime les images Storage AVANT la ligne BDD", async () => {
    const order: string[] = [];
    const removeMock = vi.fn(async () => {
      order.push("storage");
      return { error: null };
    });
    mocks.storageFromMock.mockReturnValue({ remove: removeMock });
    const chain = supabaseChain({ error: null });
    chain.delete.mockImplementation(() => {
      order.push("bdd");
      return chain;
    });
    mocks.fromMock.mockReturnValue(chain);

    await deleteAsset(
      makeAsset({
        image_url: `${PUBLIC_PREFIX}u1/a.png`,
        image_url_sheet: `${PUBLIC_PREFIX}u1/sheet.png`,
      })
    );

    expect(removeMock).toHaveBeenCalledWith(["u1/a.png", "u1/sheet.png"]);
    expect(order).toEqual(["storage", "bdd"]);
    expect(chain.eq).toHaveBeenCalledWith("id", "asset-1");
  });

  it("échec du nettoyage Storage → la suppression BDD a quand même lieu", async () => {
    mocks.storageFromMock.mockReturnValue({
      remove: vi.fn(async () => ({ error: { message: "bucket indisponible" } })),
    });
    const chain = supabaseChain({ error: null });
    mocks.fromMock.mockReturnValue(chain);

    await expect(
      deleteAsset(makeAsset({ image_url: `${PUBLIC_PREFIX}u1/a.png` }))
    ).resolves.toBeUndefined();
    expect(chain.delete).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it("asset sans image → Storage non sollicité", async () => {
    const chain = supabaseChain({ error: null });
    mocks.fromMock.mockReturnValue(chain);

    await deleteAsset(makeAsset());
    expect(mocks.storageFromMock).not.toHaveBeenCalled();
    expect(chain.delete).toHaveBeenCalled();
  });

  it("erreur BDD → rejette", async () => {
    mocks.fromMock.mockReturnValue(supabaseChain({ error: new Error("RLS refusée") }));
    await expect(deleteAsset(makeAsset())).rejects.toThrow("RLS refusée");
  });
});

// ── uploadReferenceImage ──────────────────────────────────────────

describe("uploadReferenceImage", () => {
  it("upload sous <userId>/references/<timestamp>_ref.<ext> avec upsert et retourne l'URL publique", async () => {
    const uploadMock = vi.fn(async () => ({ error: null }));
    const getPublicUrlMock = vi.fn(() => ({ data: { publicUrl: "https://cdn/pub.png" } }));
    mocks.storageFromMock.mockReturnValue({ upload: uploadMock, getPublicUrl: getPublicUrlMock });

    const url = await uploadReferenceImage(
      new File(["x"], "photo.jpg", { type: "image/jpeg" }),
      "u1"
    );

    expect(url).toBe("https://cdn/pub.png");
    const [path, , options] = uploadMock.mock.calls[0];
    expect(path).toMatch(/^u1\/references\/\d+_ref\.jpg$/);
    expect(options).toEqual({ upsert: true });
    expect(getPublicUrlMock).toHaveBeenCalledWith(path);
  });

  it("erreur upload → Error portant le message Storage", async () => {
    mocks.storageFromMock.mockReturnValue({
      upload: vi.fn(async () => ({ error: { message: "bucket plein" } })),
      getPublicUrl: vi.fn(),
    });

    await expect(
      uploadReferenceImage(new File(["x"], "photo.png", { type: "image/png" }), "u1")
    ).rejects.toThrow("bucket plein");
  });
});

// ── countAssets ───────────────────────────────────────────────────

describe("countAssets", () => {
  it("retourne le compte exact", async () => {
    mocks.fromMock.mockReturnValue(supabaseChain({ count: 7, error: null }));
    await expect(countAssets()).resolves.toBe(7);
  });

  it("retourne 0 quand count est null", async () => {
    mocks.fromMock.mockReturnValue(supabaseChain({ count: null, error: null }));
    await expect(countAssets()).resolves.toBe(0);
  });
});
