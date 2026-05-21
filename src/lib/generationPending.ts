// État module-level des générations en cours — survit aux démontages/remontages de composants.
// Résout le bug React Query v5 : les callbacks observer (onSuccess) sont détachés à l'unmount,
// ce qui empêche l'indicateur de chargement de persister lors de la navigation.
import { useState, useEffect } from "react";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ── Assets en cours ───────────────────────────────────────────────

const pendingAssets = new Set<string>();

export function startAssetGeneration(assetId: string): void {
  pendingAssets.add(assetId);
  notify();
}

export function endAssetGeneration(assetId: string): void {
  pendingAssets.delete(assetId);
  notify();
}

export function useGeneratingAssetId(): string | null {
  const [id, setId] = useState<string | null>(() =>
    pendingAssets.size > 0 ? [...pendingAssets][0] : null
  );
  useEffect(() =>
    subscribe(() => setId(pendingAssets.size > 0 ? [...pendingAssets][0] : null))
  , []);
  return id;
}

// ── Blocs de panel en cours ───────────────────────────────────────

const pendingBlocks = new Map<string, string>(); // panelId → blockId

export function startBlockGeneration(panelId: string, blockId: string): void {
  pendingBlocks.set(panelId, blockId);
  notify();
}

export function endBlockGeneration(panelId: string): void {
  pendingBlocks.delete(panelId);
  notify();
}

export function useGeneratingBlocks(): Map<string, string> {
  const [blocks, setBlocks] = useState<Map<string, string>>(() => new Map(pendingBlocks));
  useEffect(() =>
    subscribe(() => setBlocks(new Map(pendingBlocks)))
  , []);
  return blocks;
}

// ── Notifications "génération terminée" ───────────────────────────
// Badge affiché quand la génération se termine pendant que l'utilisateur
// est dans une autre section. Effacé dès que l'utilisateur revient.

const assetNotifs = new Set<string>(); // projectId
const blockNotifs = new Map<string, Set<string>>(); // projectId → Set<chapterId>

export function notifyAssetDone(projectId: string): void {
  assetNotifs.add(projectId);
  notify();
}

export function clearAssetNotif(projectId: string): void {
  if (assetNotifs.delete(projectId)) notify();
}

export function notifyBlockDone(projectId: string, chapterId: string): void {
  if (!blockNotifs.has(projectId)) blockNotifs.set(projectId, new Set());
  blockNotifs.get(projectId)!.add(chapterId);
  notify();
}

export function clearBlockNotif(projectId: string, chapterId: string): void {
  const s = blockNotifs.get(projectId);
  if (s?.delete(chapterId)) {
    if (s.size === 0) blockNotifs.delete(projectId);
    notify();
  }
}

/** Badge "asset terminé" pour un projet. */
export function useHasAssetNotif(projectId: string): boolean {
  const [has, setHas] = useState(() => assetNotifs.has(projectId));
  useEffect(() => subscribe(() => setHas(assetNotifs.has(projectId))), [projectId]);
  return has;
}

/** Set des chapterIds ayant un bloc terminé pendant l'absence de l'utilisateur. */
export function useBlockNotifsForProject(projectId: string): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => new Set(blockNotifs.get(projectId) ?? []));
  useEffect(() => subscribe(() => setIds(new Set(blockNotifs.get(projectId) ?? []))), [projectId]);
  return ids;
}

/** Expose subscribe pour les composants qui doivent réagir aux changements d'état. */
export function subscribeToGenerationEvents(fn: Listener): () => void {
  return subscribe(fn);
}

/** À appeler dans ChapterDetail : efface le badge du chapitre dès l'entrée,
 *  y compris si la génération se termine pendant que l'utilisateur est dedans. */
export function useChapterIsViewing(projectId: string, chapterId: string): void {
  useEffect(() => {
    clearBlockNotif(projectId, chapterId);
    return subscribe(() => clearBlockNotif(projectId, chapterId));
  }, [projectId, chapterId]);
}
