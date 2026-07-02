import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reserveImageCredit, refundImageCredit } from "./quota";

const SUPABASE_URL = "https://proj.supabase.co";
const SERVICE_KEY = "service-role-key";
const USER_ID = "user-42";
const PERIOD_START = "2026-06-15T00:00:00.000Z";

const fetchMock = vi.fn();

function rpcResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reserveImageCredit", () => {
  it("RPC allowed=true → crédit réservé avec usageId et count", async () => {
    fetchMock.mockResolvedValue(rpcResponse([{ allowed: true, usage_id: "usage-1", current_count: 5 }]));
    expect(await reserveImageCredit(SUPABASE_URL, SERVICE_KEY, USER_ID, 20, PERIOD_START)).toEqual({
      allowed: true,
      usageId: "usage-1",
      count: 5,
    });
  });

  it("RPC allowed=false (quota atteint) → refus, pas de fail-open", async () => {
    fetchMock.mockResolvedValue(rpcResponse([{ allowed: false, usage_id: null, current_count: 20 }]));
    expect(await reserveImageCredit(SUPABASE_URL, SERVICE_KEY, USER_ID, 20, PERIOD_START)).toEqual({
      allowed: false,
      usageId: null,
      count: 20,
    });
  });

  it("RPC qui répond un objet nu (non tableau) → décodé pareil", async () => {
    fetchMock.mockResolvedValue(rpcResponse({ allowed: true, usage_id: "usage-2", current_count: 7 }));
    expect(await reserveImageCredit(SUPABASE_URL, SERVICE_KEY, USER_ID, 100, PERIOD_START)).toEqual({
      allowed: true,
      usageId: "usage-2",
      count: 7,
    });
  });

  it("appelle la RPC consume_image_credit avec le payload et les headers service role", async () => {
    fetchMock.mockResolvedValue(rpcResponse([{ allowed: true, usage_id: "u", current_count: 1 }]));
    await reserveImageCredit(SUPABASE_URL, SERVICE_KEY, USER_ID, 100, PERIOD_START);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${SUPABASE_URL}/rest/v1/rpc/consume_image_credit`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body)).toEqual({
      p_user_id: USER_ID,
      p_limit: 100,
      p_period_start: PERIOD_START,
    });
  });

  it("RPC en erreur HTTP (500) → fail-open contractuel : allowed=true, usageId=null, count=-1", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    expect(await reserveImageCredit(SUPABASE_URL, SERVICE_KEY, USER_ID, 20, PERIOD_START)).toEqual({
      allowed: true,
      usageId: null,
      count: -1,
    });
  });

  it("RPC absente (404, migration non appliquée) → fail-open contractuel", async () => {
    fetchMock.mockResolvedValue(new Response("not found", { status: 404 }));
    expect(await reserveImageCredit(SUPABASE_URL, SERVICE_KEY, USER_ID, 20, PERIOD_START)).toEqual({
      allowed: true,
      usageId: null,
      count: -1,
    });
  });

  it("fetch qui rejette (panne réseau) → fail-open contractuel", async () => {
    fetchMock.mockRejectedValue(new Error("réseau injoignable"));
    expect(await reserveImageCredit(SUPABASE_URL, SERVICE_KEY, USER_ID, 20, PERIOD_START)).toEqual({
      allowed: true,
      usageId: null,
      count: -1,
    });
  });

  it("200 avec JSON invalide → fail-open via le catch", async () => {
    fetchMock.mockResolvedValue(new Response("pas du json", { status: 200 }));
    expect(await reserveImageCredit(SUPABASE_URL, SERVICE_KEY, USER_ID, 20, PERIOD_START)).toEqual({
      allowed: true,
      usageId: null,
      count: -1,
    });
  });

  it("200 avec tableau vide (aucune ligne RPC) → refus fail-closed, contrairement à l'erreur HTTP", async () => {
    fetchMock.mockResolvedValue(rpcResponse([]));
    expect(await reserveImageCredit(SUPABASE_URL, SERVICE_KEY, USER_ID, 20, PERIOD_START)).toEqual({
      allowed: false,
      usageId: null,
      count: -1,
    });
  });

  it("current_count non numérique → count -1", async () => {
    fetchMock.mockResolvedValue(rpcResponse([{ allowed: true, usage_id: "u", current_count: "3" }]));
    expect(await reserveImageCredit(SUPABASE_URL, SERVICE_KEY, USER_ID, 20, PERIOD_START)).toEqual({
      allowed: true,
      usageId: "u",
      count: -1,
    });
  });
});

describe("refundImageCredit", () => {
  it("usageId null → aucun appel réseau", async () => {
    await refundImageCredit(SUPABASE_URL, SERVICE_KEY, null);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("DELETE sur la ligne usage avec l'id encodé dans l'URL et les headers service role", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const usageId = "id avec&esperluette";
    await refundImageCredit(SUPABASE_URL, SERVICE_KEY, usageId);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${SUPABASE_URL}/rest/v1/usage?id=eq.${encodeURIComponent(usageId)}`);
    expect(init.method).toBe("DELETE");
    expect(init.headers).toMatchObject({
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    });
  });

  it("échec réseau → best effort, ne rejette jamais", async () => {
    fetchMock.mockRejectedValue(new Error("réseau injoignable"));
    await expect(refundImageCredit(SUPABASE_URL, SERVICE_KEY, "usage-1")).resolves.toBeUndefined();
  });
});
