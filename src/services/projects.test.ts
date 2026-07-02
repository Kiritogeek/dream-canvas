import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateProject, countProjects } from "@/services/projects";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: fromMock },
}));

type QueryResult = { data?: unknown; error?: unknown; count?: number | null };

function supabaseChain(result: QueryResult) {
  const chain = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  chain.select.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  fromMock.mockReset();
});

// ── updateProject ─────────────────────────────────────────────────

describe("updateProject", () => {
  it("résout quand une ligne a bien été mise à jour", async () => {
    const chain = supabaseChain({ data: { id: "p1" }, error: null });
    fromMock.mockReturnValue(chain);
    await expect(updateProject("p1", { title: "Nouveau titre" })).resolves.toBeUndefined();
    expect(chain.update).toHaveBeenCalledWith({ title: "Nouveau titre" });
    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
  });

  it("rejette avec un message explicite si aucune ligne mise à jour (id inconnu ou RLS)", async () => {
    fromMock.mockReturnValue(supabaseChain({ data: null, error: null }));
    await expect(updateProject("p-fantome", { title: "T" })).rejects.toThrow(
      /Aucune ligne mise à jour/
    );
  });

  it("propage l'erreur Supabase telle quelle", async () => {
    fromMock.mockReturnValue(supabaseChain({ data: null, error: new Error("réseau coupé") }));
    await expect(updateProject("p1", { title: "T" })).rejects.toThrow("réseau coupé");
  });
});

// ── countProjects ─────────────────────────────────────────────────

describe("countProjects", () => {
  it("retourne le compte exact", async () => {
    fromMock.mockReturnValue(supabaseChain({ count: 5, error: null }));
    await expect(countProjects()).resolves.toBe(5);
  });

  it("retourne 0 quand count est null", async () => {
    fromMock.mockReturnValue(supabaseChain({ count: null, error: null }));
    await expect(countProjects()).resolves.toBe(0);
  });

  it("propage l'erreur Supabase", async () => {
    fromMock.mockReturnValue(supabaseChain({ count: null, error: new Error("indisponible") }));
    await expect(countProjects()).rejects.toThrow("indisponible");
  });
});
