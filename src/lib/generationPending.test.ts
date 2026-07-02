import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  startAssetGeneration,
  endAssetGeneration,
  useGeneratingAssetId,
  startBlockGeneration,
  endBlockGeneration,
  useGeneratingBlocks,
  notifyAssetDone,
  clearAssetNotif,
  notifyBlockDone,
  clearBlockNotif,
  useHasAssetNotif,
  useBlockNotifsForProject,
  useChapterIsViewing,
  subscribeToGenerationEvents,
} from "@/lib/generationPending";

// L'état est module-level (singleton) : chaque test nettoie ce qu'il a introduit.
afterEach(() => {
  endAssetGeneration("a1");
  endAssetGeneration("a2");
  endBlockGeneration("panel-1");
  endBlockGeneration("panel-2");
  clearAssetNotif("proj-1");
  clearBlockNotif("proj-1", "chap-1");
  clearBlockNotif("proj-1", "chap-2");
});

describe("subscribeToGenerationEvents", () => {
  it("notifie les abonnés à chaque mutation puis stoppe après désabonnement", () => {
    const listener = vi.fn();
    const unsub = subscribeToGenerationEvents(listener);

    startAssetGeneration("a1");
    endAssetGeneration("a1");
    expect(listener).toHaveBeenCalledTimes(2);

    unsub();
    startAssetGeneration("a1");
    expect(listener).toHaveBeenCalledTimes(2);
    endAssetGeneration("a1");
  });
});

describe("notifications asset", () => {
  it("clearAssetNotif ne notifie que si une entrée est réellement supprimée", () => {
    const listener = vi.fn();
    const unsub = subscribeToGenerationEvents(listener);

    clearAssetNotif("proj-1"); // rien à supprimer
    expect(listener).toHaveBeenCalledTimes(0);

    notifyAssetDone("proj-1");
    expect(listener).toHaveBeenCalledTimes(1);

    clearAssetNotif("proj-1"); // supprime → notifie
    expect(listener).toHaveBeenCalledTimes(2);

    unsub();
  });
});

describe("notifications bloc", () => {
  it("clearBlockNotif ne notifie que pour un couple (projet, chapitre) présent", () => {
    const listener = vi.fn();
    const unsub = subscribeToGenerationEvents(listener);

    clearBlockNotif("proj-1", "chap-1"); // rien
    expect(listener).toHaveBeenCalledTimes(0);

    notifyBlockDone("proj-1", "chap-1");
    expect(listener).toHaveBeenCalledTimes(1);

    clearBlockNotif("proj-1", "chap-2"); // même projet, chapitre absent → pas de notif
    expect(listener).toHaveBeenCalledTimes(1);

    clearBlockNotif("proj-1", "chap-1"); // présent → notif
    expect(listener).toHaveBeenCalledTimes(2);

    unsub();
  });
});

describe("useGeneratingAssetId", () => {
  it("null initialement, reflète l'asset en cours puis revient à null", () => {
    const { result, unmount } = renderHook(() => useGeneratingAssetId());
    expect(result.current).toBeNull();

    act(() => startAssetGeneration("a1"));
    expect(result.current).toBe("a1");

    act(() => endAssetGeneration("a1"));
    expect(result.current).toBeNull();
    unmount();
  });

  it("lit l'état déjà présent au montage", () => {
    startAssetGeneration("a1");
    const { result, unmount } = renderHook(() => useGeneratingAssetId());
    expect(result.current).toBe("a1");
    act(() => endAssetGeneration("a1"));
    unmount();
  });
});

describe("useGeneratingBlocks", () => {
  it("expose la map panelId → blockId et se met à jour", () => {
    const { result, unmount } = renderHook(() => useGeneratingBlocks());
    expect(result.current.size).toBe(0);

    act(() => startBlockGeneration("panel-1", "block-9"));
    expect(result.current.get("panel-1")).toBe("block-9");

    act(() => endBlockGeneration("panel-1"));
    expect(result.current.has("panel-1")).toBe(false);
    unmount();
  });
});

describe("useHasAssetNotif", () => {
  it("suit le badge asset d'un projet donné", () => {
    const { result, unmount } = renderHook(() => useHasAssetNotif("proj-1"));
    expect(result.current).toBe(false);

    act(() => notifyAssetDone("proj-1"));
    expect(result.current).toBe(true);

    act(() => clearAssetNotif("proj-1"));
    expect(result.current).toBe(false);
    unmount();
  });
});

describe("useBlockNotifsForProject", () => {
  it("retourne le set des chapterIds notifiés pour le projet", () => {
    const { result, unmount } = renderHook(() => useBlockNotifsForProject("proj-1"));
    expect(result.current.size).toBe(0);

    act(() => notifyBlockDone("proj-1", "chap-1"));
    act(() => notifyBlockDone("proj-1", "chap-2"));
    expect(result.current.has("chap-1")).toBe(true);
    expect(result.current.has("chap-2")).toBe(true);

    act(() => clearBlockNotif("proj-1", "chap-1"));
    expect(result.current.has("chap-1")).toBe(false);
    expect(result.current.has("chap-2")).toBe(true);
    unmount();
  });

  it("isole les notifications par projet", () => {
    const { result, unmount } = renderHook(() => useBlockNotifsForProject("proj-1"));
    act(() => notifyBlockDone("proj-2", "chap-1"));
    expect(result.current.size).toBe(0);
    act(() => clearBlockNotif("proj-2", "chap-1"));
    unmount();
  });
});

describe("useChapterIsViewing", () => {
  it("efface le badge du chapitre dès le montage", () => {
    notifyBlockDone("proj-1", "chap-1");
    const probe = renderHook(() => useBlockNotifsForProject("proj-1"));
    expect(probe.result.current.has("chap-1")).toBe(true);

    const viewing = renderHook(() => useChapterIsViewing("proj-1", "chap-1"));
    expect(probe.result.current.has("chap-1")).toBe(false);

    viewing.unmount();
    probe.unmount();
  });

  it("efface aussi un badge qui arrive pendant la consultation", () => {
    const probe = renderHook(() => useBlockNotifsForProject("proj-1"));
    const viewing = renderHook(() => useChapterIsViewing("proj-1", "chap-1"));

    act(() => notifyBlockDone("proj-1", "chap-1"));
    expect(probe.result.current.has("chap-1")).toBe(false);

    viewing.unmount();
    probe.unmount();
  });
});
