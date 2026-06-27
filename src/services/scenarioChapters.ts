// Service layer — Scenario chapters
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  ScenarioChapter,
  ScenarioChapterInsert,
  ScenarioChapterUpdate,
  NarrativeCoherenceAlert,
  NarrativeAlertSeverity,
  NarrativeAlertAnchor,
  ChapterAssetsState,
  ChapterAssetItem,
  ChapterAssetStatus,
} from "@/types";
import { EMPTY_CHAPTER_ASSETS } from "@/types";

function normalizeSeverityFrontend(v: unknown): NarrativeAlertSeverity | undefined {
  if (v === "info" || v === "warning" || v === "critical") return v;
  return undefined;
}

function parseAnchorFromJson(raw: unknown): NarrativeAlertAnchor | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const a = raw as Record<string, unknown>;
  if (a.type !== "excerpt") return undefined;
  const text = typeof a.text === "string" ? a.text.trim() : "";
  if (text.length < 2) return undefined;
  if (text.length > 2000) return { type: "excerpt", text: `${text.slice(0, 1997)}…` };
  return { type: "excerpt", text };
}

function attachAnchor(row: NarrativeCoherenceAlert, source: Record<string, unknown>) {
  const anchor = parseAnchorFromJson(source.anchor);
  if (anchor) row.anchor = anchor;
}

export function parseNarrativeCoherenceAlerts(
  value: Json | null | undefined
): NarrativeCoherenceAlert[] {
  if (value == null) return [];
  if (!Array.isArray(value)) return [];
  const out: NarrativeCoherenceAlert[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const t = item.trim();
      if (t) out.push({ id: `legacy-${out.length}`, title: t, explanation: "" });
      continue;
    }
    if (item != null && typeof item === "object" && !Array.isArray(item)) {
      const o = item as Record<string, unknown>;
      const titleRaw =
        typeof o.title === "string"
          ? o.title.trim()
          : typeof o.message === "string"
            ? o.message.trim()
            : "";
      const explanationRaw =
        typeof o.explanation === "string"
          ? o.explanation.trim()
          : typeof o.detail === "string"
            ? o.detail.trim()
            : typeof o.description === "string"
              ? o.description.trim()
              : "";
      const idRaw = typeof o.id === "string" && o.id.trim() ? o.id.trim() : "";
      const sev = normalizeSeverityFrontend(o.severity);

      if (!titleRaw && explanationRaw) {
        const id = idRaw || `gen-${out.length}`;
        if (explanationRaw.length <= 100) {
          const row: NarrativeCoherenceAlert = { id, title: explanationRaw, explanation: "" };
          attachAnchor(row, o);
          out.push(row);
        } else {
          const row: NarrativeCoherenceAlert = {
            id,
            title: `${explanationRaw.slice(0, 97)}…`,
            explanation: explanationRaw,
          };
          attachAnchor(row, o);
          out.push(row);
        }
        continue;
      }
      if (titleRaw) {
        const row: NarrativeCoherenceAlert = {
          id: idRaw || `gen-${out.length}`,
          title: titleRaw,
          explanation: explanationRaw,
        };
        if (sev) row.severity = sev;
        attachAnchor(row, o);
        out.push(row);
      }
    }
  }
  return out;
}

export function parseNarraMindAnomalies(value: Json | null | undefined): string[] {
  return parseNarrativeCoherenceAlerts(value).map((a) =>
    a.explanation ? `${a.title} — ${a.explanation}` : a.title
  );
}

/** Repère la première occurrence de l'extrait (exact puis casse identique sur minuscules). */
export function findExcerptRangeInText(
  haystack: string,
  excerpt: string
): { start: number; end: number } | null {
  const t = excerpt.trim();
  if (t.length < 2) return null;
  let idx = haystack.indexOf(t);
  if (idx >= 0) return { start: idx, end: idx + t.length };
  const lowH = haystack.toLowerCase();
  const lowT = t.toLowerCase();
  idx = lowH.indexOf(lowT);
  if (idx >= 0) return { start: idx, end: idx + t.length };
  return null;
}
// ── Remplacement nom d'asset (frontières de mot, comme ScenarioTextHighlighter) ─

const LETTER_CHARS =
  "a-zA-ZàáâãäéèêëïîôùûüÿçÀÁÂÃÄÉÈÊËÏÎÔÙÛÜŸÇœŒæÆ";

/** Indique si le contenu contient le nom donné comme mot entier (frontières de mot). */
export function contentContainsAssetName(content: string, name: string): boolean {
  if (!name.trim()) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `(?<![${LETTER_CHARS}\\-])${escaped}(?![${LETTER_CHARS}\\-])`,
    "i"
  );
  return regex.test(content);
}

export type SceneHeaderEntity = { name: string; type: "character" | "background" };

/** Normalise un nom pour la déduplication (insensible casse + accents). */
export function normalizeEntityName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Extrait les noms mentionnés dans les en-têtes de scène :
 * `> Personnages : Nom1, Nom2 (...)` → type character,
 * `> Lieu : Lieu, heure, ambiance` → type background (1er segment seulement).
 * Dédup par nom (insensible casse/accents). Filtre les segments trop courts/descriptifs.
 */
export function extractSceneHeaderEntities(content: string): SceneHeaderEntity[] {
  if (!content?.trim()) return [];
  const out: SceneHeaderEntity[] = [];
  const seen = new Set<string>();

  const push = (raw: string, type: SceneHeaderEntity["type"]) => {
    const name = raw.replace(/\([^)]*\)/g, "").trim();
    if (name.length < 2 || name.length > 60) return;
    const key = `${type}:${normalizeEntityName(name)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ name, type });
  };

  for (const line of content.split("\n")) {
    const persoMatch = line.match(/^>\s*Personnages\s*:\s*(.+)$/i);
    if (persoMatch) {
      for (const part of persoMatch[1].split(",")) push(part, "character");
      continue;
    }
    const lieuMatch = line.match(/^>\s*Lieu\s*:\s*(.+)$/i);
    if (lieuMatch) {
      const first = lieuMatch[1].split(",")[0] ?? "";
      push(first, "background");
    }
  }

  return out;
}

/** Remplace toutes les occurrences du nom (mot entier) par le nouveau nom dans le contenu. */
export function replaceAssetNameInContent(
  content: string,
  oldName: string,
  newName: string
): string {
  if (!oldName.trim()) return content;
  const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `(?<![${LETTER_CHARS}\\-])${escaped}(?![${LETTER_CHARS}\\-])`,
    "gi"
  );
  return content.replace(regex, newName);
}

// ── Curation des assets de chapitre (chapter_assets JSONB) ───────

const ASSET_STATUSES: ChapterAssetStatus[] = ["auto", "added", "removed", "skipped"];

/** Parse défensivement le JSONB `chapter_assets` vers un état typé. */
export function parseChapterAssets(value: Json | null | undefined): ChapterAssetsState {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_CHAPTER_ASSETS };
  }
  const obj = value as Record<string, unknown>;
  const validated = obj.validated === true;
  const rawItems = Array.isArray(obj.items) ? obj.items : [];
  const items: ChapterAssetItem[] = [];
  for (const raw of rawItems) {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) continue;
    const r = raw as Record<string, unknown>;
    const assetId = typeof r.asset_id === "string" ? r.asset_id : "";
    const status = ASSET_STATUSES.includes(r.status as ChapterAssetStatus)
      ? (r.status as ChapterAssetStatus)
      : "auto";
    if (!assetId) continue;
    const item: ChapterAssetItem = { asset_id: assetId, status };
    if (typeof r.linked_alias === "string" && r.linked_alias.trim()) {
      item.linked_alias = r.linked_alias.trim();
    }
    items.push(item);
  }
  return { validated, items };
}

/** Lit la colonne `chapter_assets` d'un chapitre. */
export async function fetchChapterAssets(
  chapterId: string
): Promise<ChapterAssetsState> {
  const { data, error } = await supabase
    .from("scenario_chapters")
    .select("chapter_assets")
    .eq("id", chapterId)
    .single();

  if (error) throw error;
  return parseChapterAssets(data?.chapter_assets ?? null);
}

/** Écrit la colonne `chapter_assets` d'un chapitre. */
export async function updateChapterAssets(
  chapterId: string,
  state: ChapterAssetsState
): Promise<ChapterAssetsState> {
  const { data, error } = await supabase
    .from("scenario_chapters")
    .update({ chapter_assets: state as unknown as Json })
    .eq("id", chapterId)
    .select("chapter_assets")
    .single();

  if (error) throw error;
  return parseChapterAssets(data?.chapter_assets ?? null);
}

// ── Scenario chapters ────────────────────────────────────────

/** Récupère tous les chapitres de scénario d'un projet, triés par numéro */
export async function fetchScenarioChapters(
  projectId: string
): Promise<ScenarioChapter[]> {
  const { data, error } = await supabase
    .from("scenario_chapters")
    .select("*")
    .eq("project_id", projectId)
    .order("chapter_number", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Récupère un chapitre de scénario par son id */
export async function fetchScenarioChapter(
  id: string
): Promise<ScenarioChapter> {
  const { data, error } = await supabase
    .from("scenario_chapters")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/** Crée un nouveau chapitre de scénario */
export async function createScenarioChapter(
  chapter: Pick<
    ScenarioChapterInsert,
    "project_id" | "user_id" | "title" | "chapter_number" | "content"
  >
): Promise<ScenarioChapter> {
  const { data, error } = await supabase
    .from("scenario_chapters")
    .insert(chapter)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Met à jour un chapitre de scénario */
export async function updateScenarioChapter(
  id: string,
  updates: ScenarioChapterUpdate
): Promise<ScenarioChapter> {
  const { data, error } = await supabase
    .from("scenario_chapters")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Supprime un chapitre de scénario */
export async function deleteScenarioChapter(id: string): Promise<void> {
  const { error } = await supabase
    .from("scenario_chapters")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** Réordonne les chapitres scénario (upsert batch — 1 requête au lieu de N) */
export async function reorderScenarioChapters(
  chapters: { id: string; chapter_number: number }[]
): Promise<void> {
  const { error } = await supabase
    .from("scenario_chapters")
    .upsert(chapters, { onConflict: "id" });

  if (error) throw error;
}
