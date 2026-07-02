import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { userOwnsProject, userOwnsChapter } from "./ownership";

const SUPABASE_URL = "https://proj.supabase.co";
const SERVICE_KEY = "service-role-key";
const USER_ID = "user-42";

const fetchMock = vi.fn();

function restResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("userOwnsProject", () => {
  it("200 avec une ligne → true", async () => {
    fetchMock.mockResolvedValue(restResponse([{ id: "proj-1" }]));
    expect(await userOwnsProject(SUPABASE_URL, SERVICE_KEY, "proj-1", USER_ID)).toBe(true);
  });

  it("200 tableau vide (projet d'un autre utilisateur) → false", async () => {
    fetchMock.mockResolvedValue(restResponse([]));
    expect(await userOwnsProject(SUPABASE_URL, SERVICE_KEY, "proj-autre", USER_ID)).toBe(false);
  });

  it("erreur HTTP 500 → false (fail-closed, jamais d'accès par défaut)", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    expect(await userOwnsProject(SUPABASE_URL, SERVICE_KEY, "proj-1", USER_ID)).toBe(false);
  });

  it("erreur HTTP 403 → false (fail-closed)", async () => {
    fetchMock.mockResolvedValue(new Response("forbidden", { status: 403 }));
    expect(await userOwnsProject(SUPABASE_URL, SERVICE_KEY, "proj-1", USER_ID)).toBe(false);
  });

  it("200 avec un corps non-tableau (objet d'erreur PostgREST) → false", async () => {
    fetchMock.mockResolvedValue(restResponse({ message: "error" }));
    expect(await userOwnsProject(SUPABASE_URL, SERVICE_KEY, "proj-1", USER_ID)).toBe(false);
  });

  it("interroge projects avec id et user_id encodés (anti-injection de filtre PostgREST)", async () => {
    fetchMock.mockResolvedValue(restResponse([{ id: "p" }]));
    const evilProjectId = "p1&user_id=neq.rien";
    const oddUserId = "user a/b";
    await userOwnsProject(SUPABASE_URL, SERVICE_KEY, evilProjectId, oddUserId);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(evilProjectId)}&user_id=eq.${encodeURIComponent(oddUserId)}&select=id`,
    );
    expect(init.headers).toMatchObject({
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    });
  });
});

describe("userOwnsChapter", () => {
  it("200 avec une ligne → true", async () => {
    fetchMock.mockResolvedValue(restResponse([{ id: "chap-1" }]));
    expect(await userOwnsChapter(SUPABASE_URL, SERVICE_KEY, "chap-1", USER_ID)).toBe(true);
  });

  it("200 tableau vide (chapitre d'un autre utilisateur) → false", async () => {
    fetchMock.mockResolvedValue(restResponse([]));
    expect(await userOwnsChapter(SUPABASE_URL, SERVICE_KEY, "chap-autre", USER_ID)).toBe(false);
  });

  it("erreur HTTP 500 → false (fail-closed)", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    expect(await userOwnsChapter(SUPABASE_URL, SERVICE_KEY, "chap-1", USER_ID)).toBe(false);
  });

  it("interroge chapters avec id et user_id encodés", async () => {
    fetchMock.mockResolvedValue(restResponse([{ id: "c" }]));
    const evilChapterId = "c1&user_id=neq.rien";
    await userOwnsChapter(SUPABASE_URL, SERVICE_KEY, evilChapterId, USER_ID);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `${SUPABASE_URL}/rest/v1/chapters?id=eq.${encodeURIComponent(evilChapterId)}&user_id=eq.${encodeURIComponent(USER_ID)}&select=id`,
    );
  });
});
