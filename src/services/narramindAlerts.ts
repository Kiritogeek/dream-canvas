import { supabase } from "@/integrations/supabase/client";
import type {
  NarrativeAlertAnchor,
  NarraMindAlertStatus,
  NarraMindAlertView,
} from "@/types";

function parseAnchor(raw: unknown): NarrativeAlertAnchor | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const a = raw as Record<string, unknown>;
  if (a.type !== "excerpt") return undefined;
  const text = typeof a.text === "string" ? a.text.trim() : "";
  if (text.length < 2) return undefined;
  if (text.length > 2000) return { type: "excerpt", text: `${text.slice(0, 1997)}…` };
  return { type: "excerpt", text };
}

function assertStatus(s: string): NarraMindAlertStatus {
  if (s === "active" || s === "dismissed" || s === "resolved") return s;
  return "active";
}

export function mapNarraMindAlertRow(row: {
  id: string;
  project_id: string;
  chapter_id: string;
  title: string;
  explanation: string;
  severity: string | null;
  anchor: unknown;
  status: string;
  dedupe_key: string;
  created_at: string;
  updated_at: string;
}): NarraMindAlertView {
  const sev =
    row.severity === "info" || row.severity === "warning" || row.severity === "critical"
      ? row.severity
      : undefined;
  const base: NarraMindAlertView = {
    id: row.id,
    title: row.title,
    explanation: row.explanation,
    dedupeKey: row.dedupe_key,
    status: assertStatus(row.status),
    projectId: row.project_id,
    chapterId: row.chapter_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (sev) base.severity = sev;
  const anch = parseAnchor(row.anchor);
  if (anch) base.anchor = anch;
  return base;
}

export async function fetchNarraMindAlerts(params: {
  projectId: string;
  chapterId?: string;
  statuses?: NarraMindAlertStatus[];
}): Promise<NarraMindAlertView[]> {
  const { projectId, chapterId, statuses = ["active"] } = params;
  let q = supabase
    .from("narramind_alerts")
    .select("*")
    .eq("project_id", projectId)
    .in("status", statuses);
  if (chapterId) q = q.eq("chapter_id", chapterId);
  const { data, error } = await q.order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapNarraMindAlertRow(row));
}

export async function setNarraMindAlertStatus(
  rowId: string,
  status: "resolved" | "dismissed"
): Promise<void> {
  const { error } = await supabase
    .from("narramind_alerts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", rowId);
  if (error) throw error;
}
