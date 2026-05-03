declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

const AI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const AI_MODEL = "gemini-2.0-flash";
const AI_FALLBACK_MODEL = "gemini-2.5-flash";
const AI_TIMEOUT_MS = 60_000;
/** Sortie JSON souvent > 1500 tokens (entités + anomalies) — troncature = JSON invalide. */
const NARRAMIND_MAX_OUTPUT_TOKENS = 8192;

/** Budget max (estimation ~tokens) pour le bloc « résumés chapitres précédents » — reste du prompt inchangé. */
const PREV_SUMMARIES_CONTEXT_TOKEN_BUDGET = 2200;
/** Troncature d'un seul résumé pour éviter qu'un chapitre ne monopolise le budget. */
const PREV_SUMMARY_MAX_CHARS = 420;
/** Limite de lignes candidates (les plus récents avant le chapitre courant). */
const PREV_SUMMARIES_FETCH_CAP = 24;

/** Phase 2 — garde-fous prompt (gros projets). */
const UNIVERSE_LORE_MAX_CHARS = 14_000;
const ASSETS_CONTEXT_TOKEN_BUDGET = 7_000;
const ASSET_PROMPT_MAX_CHARS = 320;
const ASSET_LORE_MAX_CHARS = 520;
const ENTITIES_CONTEXT_TOKEN_BUDGET = 5_000;
const ENTITY_LORE_SUMMARY_MAX_CHARS = 900;

/** Phase 3 — mémoire longue (méga-résumé + compression résumés). */
const NARRA_SUMMARY_STORE_MAX_CHARS = 24_000;
const NARRA_SUMMARY_PROMPT_MAX_CHARS = 5_500;
const NARRA_COMPRESSION_SUMMARY_TOKENS_THRESHOLD = 4_000;
const NARRA_COMPRESSION_BATCH = 8;
const NARRA_COMPRESSION_MIN_ROWS = 4;
const GEMINI_PLAIN_TIMEOUT_MS = 45_000;

function getCorsHeaders(): Record<string, string> {
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN")?.trim();
  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
  });
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getOpenAIMessageContent(message: { content?: unknown } | undefined): string {
  const c = message?.content;
  if (typeof c === "string") return c.trim();
  if (Array.isArray(c)) {
    return (c as Array<{ text?: string }>)
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();
  }
  return "";
}

function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function tryParseNarraMindAiJson(rawText: string): unknown | null {
  const tryOne = (s: string) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      return null;
    }
  };

  const t = rawText.trim();
  let p = tryOne(t);
  if (p) return p;

  const fencedOuter = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedOuter) {
    p = tryOne(fencedOuter[1].trim());
    if (p) return p;
  }

  const stripped = t.replace(/```(?:json)?\s*([\s\S]*?)```/gi, "$1").trim();
  if (stripped !== t) {
    p = tryOne(stripped);
    if (p) return p;
  }

  const brace0 = t.indexOf("{");
  const fromBrace = brace0 >= 0 ? t.slice(brace0) : t;
  p = tryOne(fromBrace);
  if (p) return p;

  const balanced = extractBalancedJsonObject(rawText);
  if (balanced) {
    p = tryOne(balanced);
    if (p) return p;
  }

  const s = rawText.indexOf("{");
  const e = rawText.lastIndexOf("}");
  if (s >= 0 && e > s) {
    p = tryOne(rawText.slice(s, e + 1));
    if (p) return p;
  }

  return null;
}

type AnomalySeverity = "info" | "warning" | "critical";

interface NormalizedAnomaly {
  id: string;
  title: string;
  explanation: string;
  severity?: AnomalySeverity;
  anchor?: { type: "excerpt"; text: string };
}

function parseAnchorField(raw: unknown): { type: "excerpt"; text: string } | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const a = raw as Record<string, unknown>;
  if (a.type !== "excerpt") return undefined;
  const text = typeof a.text === "string" ? a.text.trim() : "";
  if (text.length < 2) return undefined;
  if (text.length > 2000) return { type: "excerpt", text: text.slice(0, 1997) + "…" };
  return { type: "excerpt", text };
}

function normalizeSeverity(v: unknown): AnomalySeverity | undefined {
  if (v === "info" || v === "warning" || v === "critical") return v;
  return undefined;
}

/** Construit le bloc résumés antérieurs : ordre chronologique affiché, remplissage depuis les chapitres les plus récents jusqu'au budget. */
function buildPreviousSummariesContextForPrompt(
  rows: Array<{ chapter_number: number; summary: string | null }>,
  currentChapterNumber: number
): { text: string; included: number; estimatedTokens: number } {
  const byChapter = new Map<number, { chapter_number: number; summary: string | null }>();
  for (const r of rows) {
    if (r.chapter_number >= currentChapterNumber) continue;
    if (!byChapter.has(r.chapter_number)) byChapter.set(r.chapter_number, r);
  }
  const candidates = [...byChapter.values()]
    .filter((r) => (r.summary ?? "").trim().length > 0)
    .sort((a, b) => b.chapter_number - a.chapter_number);

  const header =
    "RÉSUMÉS CHAPITRES PRÉCÉDENTS (fenêtre récente, tronquée pour limiter la taille du prompt — utiliser uniquement pour contradictions avec des faits déjà posés ; pas pour critiquer le mystère ou l'ellipse) :\n";
  const headerTok = estimateTokens(header);
  let budgetLeft = Math.max(0, PREV_SUMMARIES_CONTEXT_TOKEN_BUDGET - headerTok);
  const lines: string[] = [];

  for (const r of candidates) {
    let s = (r.summary ?? "").replace(/\s+/g, " ").trim();
    if (s.length > PREV_SUMMARY_MAX_CHARS) {
      s = `${s.slice(0, PREV_SUMMARY_MAX_CHARS - 1)}…`;
    }
    const line = `Chapitre ${r.chapter_number} : ${s}`;
    const lineTok = estimateTokens(`${line}\n`);
    if (lineTok > budgetLeft) break;
    lines.push(line);
    budgetLeft -= lineTok;
  }

  if (lines.length === 0) {
    return { text: "", included: 0, estimatedTokens: 0 };
  }
  lines.reverse();
  const text = header + lines.join("\n");
  return {
    text,
    included: lines.length,
    estimatedTokens: estimateTokens(text),
  };
}

function capUniverseLoreForPrompt(
  raw: string | null | undefined,
  maxChars: number
): { text: string | null; truncated: boolean; originalChars: number } {
  if (raw == null) return { text: null, truncated: false, originalChars: 0 };
  const t = raw.replace(/\r\n/g, "\n").trim();
  if (!t) return { text: null, truncated: false, originalChars: 0 };
  if (t.length <= maxChars) {
    return { text: t, truncated: false, originalChars: t.length };
  }
  const tail = t.slice(-maxChars);
  const omitted = t.length - maxChars;
  return {
    text:
      `… [Lore monde : ${omitted} caractères non inclus en tête — extrait des ${maxChars} derniers caractères sur ${t.length}]\n` +
      tail,
    truncated: true,
    originalChars: t.length,
  };
}

type AssetRow = {
  id: string;
  name: string;
  asset_type: string;
  prompt: string | null;
  lore: string | null;
};

function buildAssetsContextForPrompt(
  assets: AssetRow[],
  tokenBudget: number
): {
  text: string;
  includedCount: number;
  totalCount: number;
  capped: boolean;
  estimatedTokens: number;
} {
  const sorted = [...assets].sort((a, b) => {
    const la = ((a.lore ?? "").trim().length > 0 ? 1 : 0);
    const lb = ((b.lore ?? "").trim().length > 0 ? 1 : 0);
    if (lb !== la) return lb - la;
    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
  });

  const lines: string[] = [];
  let budgetLeft = tokenBudget;

  for (const a of sorted) {
    let promptPart = (a.prompt ?? "(sans description)").replace(/\s+/g, " ").trim();
    if (promptPart.length > ASSET_PROMPT_MAX_CHARS) {
      promptPart = `${promptPart.slice(0, ASSET_PROMPT_MAX_CHARS - 1)}…`;
    }
    let lorePart = (a.lore ?? "").replace(/\s+/g, " ").trim();
    if (lorePart.length > ASSET_LORE_MAX_CHARS) {
      lorePart = `${lorePart.slice(0, ASSET_LORE_MAX_CHARS - 1)}…`;
    }
    const base = `- ${a.name} (${a.asset_type}) : ${promptPart}`;
    const line = lorePart.length > 0 ? `${base}\n  LORE: ${lorePart}` : base;
    const cost = estimateTokens(`${line}\n`);
    if (cost > budgetLeft) continue;
    lines.push(line);
    budgetLeft -= cost;
  }

  const capped = sorted.length > 0 && lines.length < sorted.length;
  const text =
    lines.length > 0
      ? lines.join("\n")
      : sorted.length === 0
        ? "(aucun asset)"
        : "(aucun asset inclus : budget prompt dépassé — priorité LORE non vide puis nom)";
  return {
    text,
    includedCount: lines.length,
    totalCount: sorted.length,
    capped,
    estimatedTokens: estimateTokens(text),
  };
}

function slimMemoryEntityForPrompt(e: Record<string, unknown>): Record<string, unknown> {
  const loreRaw = typeof e.lore_summary === "string" ? e.lore_summary : "";
  let loreOut = loreRaw.replace(/\s+/g, " ").trim();
  if (loreOut.length > ENTITY_LORE_SUMMARY_MAX_CHARS) {
    loreOut = `${loreOut.slice(0, ENTITY_LORE_SUMMARY_MAX_CHARS - 1)}…`;
  }
  return {
    name: e.name,
    entity_type: e.entity_type,
    traits: e.traits,
    relations: e.relations,
    lore_summary: loreOut.length > 0 ? loreOut : null,
    last_seen_chapter: e.last_seen_chapter,
    first_seen_chapter: e.first_seen_chapter,
  };
}

function buildMemoryEntitiesContextForPrompt(
  entitiesRaw: unknown[],
  currentChapterNumber: number,
  tokenBudget: number
): {
  json: string;
  included: number;
  total: number;
  capped: boolean;
  estimatedTokens: number;
} {
  const slimmed: Record<string, unknown>[] = [];
  for (const x of entitiesRaw) {
    if (x != null && typeof x === "object" && !Array.isArray(x)) {
      slimmed.push(slimMemoryEntityForPrompt(x as Record<string, unknown>));
    }
  }

  slimmed.sort((a, b) => {
    const la = typeof a.last_seen_chapter === "number" ? a.last_seen_chapter : -9999;
    const lb = typeof b.last_seen_chapter === "number" ? b.last_seen_chapter : -9999;
    const da = Math.abs(la - currentChapterNumber);
    const db = Math.abs(lb - currentChapterNumber);
    if (da !== db) return da - db;
    const na = typeof a.name === "string" ? a.name : "";
    const nb = typeof b.name === "string" ? b.name : "";
    return na.localeCompare(nb, "fr", { sensitivity: "base" });
  });

  const picked: Record<string, unknown>[] = [];
  for (const e of slimmed) {
    const candidate = [...picked, e];
    const s = JSON.stringify(candidate);
    const tok = estimateTokens(s);
    if (tok > tokenBudget) break;
    picked.push(e);
  }

  const json = JSON.stringify(picked);
  return {
    json,
    included: picked.length,
    total: slimmed.length,
    capped: picked.length < slimmed.length,
    estimatedTokens: estimateTokens(json),
  };
}

function trimNarraSummaryStore(raw: string, maxChars: number): string {
  const t = raw.replace(/\r\n/g, "\n").trim();
  if (t.length <= maxChars) return t;
  const head = Math.floor(maxChars * 0.42);
  const tail = maxChars - head - 100;
  if (tail < 800) return t.slice(-maxChars + 60) + "\n…";
  return `${t.slice(0, head)}\n\n… [troncature — milieu omis]\n\n${t.slice(-tail)}`;
}

function capNarraSummaryForPrompt(
  raw: string | null | undefined,
  maxChars: number
): { text: string | null; truncated: boolean } {
  if (raw == null) return { text: null, truncated: false };
  const t = raw.replace(/\r\n/g, "\n").trim();
  if (!t) return { text: null, truncated: false };
  if (t.length <= maxChars) return { text: t, truncated: false };
  const head = 2_400;
  const tail = maxChars - head - 90;
  if (tail < 600) {
    return { text: `${t.slice(0, maxChars - 3)}…`, truncated: true };
  }
  return {
    text: `${t.slice(0, head)}\n\n… [méga-résumé : milieu non envoyé, ${t.length - head - tail} caractères]\n\n${t.slice(-tail)}`,
    truncated: true,
  };
}

async function geminiPlainTextFromPrompt(
  geminiKey: string,
  userPrompt: string,
  signal: AbortSignal
): Promise<string | null> {
  const body = (model: string) =>
    JSON.stringify({
      model,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.15,
      max_tokens: 2048,
    });
  let res = await fetch(AI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${geminiKey}`,
    },
    body: body(AI_MODEL),
    signal,
  });
  if (res.status === 503 || res.status === 429) {
    res = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${geminiKey}`,
      },
      body: body(AI_FALLBACK_MODEL),
      signal,
    });
  }
  if (!res.ok) return null;
  const aiJson = await res.json() as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const rawText = getOpenAIMessageContent(aiJson.choices?.[0]?.message) || null;
  return rawText?.trim() ? rawText.trim() : null;
}

async function tryFuseAndDeleteOldestSummaries(
  supabaseUrl: string,
  dbHeaders: Record<string, string>,
  geminiKey: string,
  projectId: string
): Promise<{ arcText: string; deletedCount: number; chapterFrom: number; chapterTo: number } | null> {
  const listRes = await fetch(
    `${supabaseUrl}/rest/v1/memory_summaries?project_id=eq.${projectId}` +
      `&select=id,chapter_number,summary&order=chapter_number.asc&limit=${NARRA_COMPRESSION_BATCH}`,
    { headers: dbHeaders }
  );
  if (!listRes.ok) return null;
  const rows = await listRes.json() as Array<{
    id: string;
    chapter_number: number;
    summary: string | null;
  }>;
  const valid = rows.filter((r) => (r.summary ?? "").trim().length > 0);
  if (valid.length < NARRA_COMPRESSION_MIN_ROWS) return null;

  const fusePrompt =
    `Tu fusionnes des résumés de chapitres d'une fiction en UN SEUL texte dense pour la **mémoire narrative** : faits stables, personnages et lieux importants, règles du monde, twists déjà révélés. ` +
    `Pas de liste scène par scène. Français. Maximum environ 900 mots. ` +
    `Ne cite pas de numéros de chapitre dans le corps. Pas de JSON.\n\n` +
    valid
      .map((r) => `--- Résumé source (ch. ${r.chapter_number}) ---\n${(r.summary ?? "").trim()}`)
      .join("\n\n");

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), GEMINI_PLAIN_TIMEOUT_MS);
  let arcText: string | null = null;
  try {
    arcText = await geminiPlainTextFromPrompt(geminiKey, fusePrompt, ctrl.signal);
  } catch {
    arcText = null;
  }
  clearTimeout(to);
  if (!arcText?.trim()) return null;

  const idList = valid.map((r) => r.id).join(",");
  const delRes = await fetch(
    `${supabaseUrl}/rest/v1/memory_summaries?id=in.(${idList})`,
    { method: "DELETE", headers: { ...dbHeaders, Prefer: "return=minimal" } }
  );
  if (!delRes.ok) {
    console.error("narramind-update: compression DELETE failed", await delRes.text());
    return null;
  }
  const chNums = valid.map((r) => r.chapter_number);
  const chapterFrom = Math.min(...chNums);
  const chapterTo = Math.max(...chNums);
  return { arcText: arcText.trim(), deletedCount: valid.length, chapterFrom, chapterTo };
}

function normalizeAnomaliesInput(raw: unknown[]): NormalizedAnomaly[] {
  const out: NormalizedAnomaly[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const t = item.trim();
      if (t) out.push({ id: crypto.randomUUID(), title: t, explanation: "" });
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
      const idStr = typeof o.id === "string" && o.id.trim() ? o.id.trim() : crypto.randomUUID();
      const sev = normalizeSeverity(o.severity);

      if (!titleRaw && explanationRaw) {
        const id =
          typeof o.id === "string" && o.id.trim() ? o.id.trim() : crypto.randomUUID();
        const anch = parseAnchorField(o.anchor);
        if (explanationRaw.length <= 100) {
          const row: NormalizedAnomaly = { id, title: explanationRaw, explanation: "" };
          if (anch) row.anchor = anch;
          out.push(row);
        } else {
          const row: NormalizedAnomaly = {
            id,
            title: `${explanationRaw.slice(0, 97)}…`,
            explanation: explanationRaw,
          };
          if (anch) row.anchor = anch;
          out.push(row);
        }
        continue;
      }
      if (titleRaw) {
        const row: NormalizedAnomaly = {
          id: idStr,
          title: titleRaw,
          explanation: explanationRaw,
        };
        if (sev) row.severity = sev;
        const anch = parseAnchorField(o.anchor);
        if (anch) row.anchor = anch;
        out.push(row);
      }
    }
  }
  return out;
}

async function sha256HexUtf8(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function dedupeKeyForAnomaly(a: NormalizedAnomaly): Promise<string> {
  const canonical = JSON.stringify({
    t: a.title,
    e: a.explanation,
    s: a.severity ?? null,
    k: a.anchor ?? null,
  });
  return sha256HexUtf8(canonical);
}

async function persistNarramindAlerts(
  supabaseUrl: string,
  dbHeaders: Record<string, string>,
  params: {
    userId: string;
    projectId: string;
    chapterId: string;
    anomalies: NormalizedAnomaly[];
  }
): Promise<void> {
  const { userId, projectId, chapterId, anomalies } = params;
  const now = new Date().toISOString();
  const dedupeKeys: string[] = [];
  const rows: Array<Record<string, unknown>> = [];

  for (const a of anomalies) {
    const dk = await dedupeKeyForAnomaly(a);
    dedupeKeys.push(dk);
    rows.push({
      user_id: userId,
      project_id: projectId,
      chapter_id: chapterId,
      severity: a.severity ?? null,
      title: a.title,
      explanation: a.explanation,
      anchor: a.anchor ?? null,
      status: "active",
      dedupe_key: dk,
      updated_at: now,
    });
  }

  const patchResolvedBody = JSON.stringify({ status: "resolved", updated_at: now });
  const baseFilter =
    `${supabaseUrl}/rest/v1/narramind_alerts?chapter_id=eq.${chapterId}&status=eq.active`;

  if (dedupeKeys.length === 0) {
    const r0 = await fetch(baseFilter, {
      method: "PATCH",
      headers: { ...dbHeaders, Prefer: "return=minimal" },
      body: patchResolvedBody,
    });
    if (!r0.ok) console.error("narramind-update: resolve alerts", await r0.text());
    return;
  }

  const notIn = `(${dedupeKeys.join(",")})`;
  const r1 = await fetch(`${baseFilter}&dedupe_key=not.in.${notIn}`, {
    method: "PATCH",
    headers: { ...dbHeaders, Prefer: "return=minimal" },
    body: patchResolvedBody,
  });
  if (!r1.ok) console.error("narramind-update: resolve stale alerts", await r1.text());

  // Récupère les alertes existantes pour ce chapitre afin d'exclure celles
  // déjà traitées (resolved/dismissed) — sans ce filtre, l'upsert réécrirait
  // status → "active" même pour les alertes que l'utilisateur a fermées.
  const existingRes = await fetch(
    `${supabaseUrl}/rest/v1/narramind_alerts?chapter_id=eq.${chapterId}&dedupe_key=in.${notIn}&select=dedupe_key,status`,
    { headers: dbHeaders }
  );
  const existingAlerts: Array<{ dedupe_key: string; status: string }> = existingRes.ok
    ? await existingRes.json()
    : [];
  const skipKeys = new Set(
    existingAlerts
      .filter((r) => r.status === "dismissed" || r.status === "resolved")
      .map((r) => r.dedupe_key)
  );

  const rowsToUpsert = rows.filter((r) => !skipKeys.has(r.dedupe_key as string));
  if (rowsToUpsert.length === 0) return;

  const upsertRes = await fetch(
    `${supabaseUrl}/rest/v1/narramind_alerts?on_conflict=project_id,chapter_id,dedupe_key`,
    {
      method: "POST",
      headers: {
        ...dbHeaders,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rowsToUpsert),
    }
  );
  if (!upsertRes.ok) {
    console.error("narramind-update: upsert alerts", await upsertRes.text());
  }
}

async function persistNarramindMissingAssets(
  supabaseUrl: string,
  dbHeaders: Record<string, string>,
  params: {
    userId: string;
    projectId: string;
    chapterId: string;
    chapterNumber: number;
    items: Array<{ name: string; suggestedType: string | null; mentionCount: number }>;
  }
): Promise<void> {
  const { userId, projectId, chapterId, chapterNumber, items } = params;
  const now = new Date().toISOString();

  // Normalise le nom en clé de déduplication (minuscules, espaces normalisés)
  const normalizeKey = (n: string) => n.trim().toLowerCase().replace(/\s+/g, " ");

  const newDedupeKeys = items.map((it) => normalizeKey(it.name));

  // Résoudre les items "pending" qui ne sont plus détectés (l'asset a probablement été créé)
  const baseFilter = `${supabaseUrl}/rest/v1/narramind_missing_assets?chapter_id=eq.${chapterId}&status=eq.pending`;
  if (newDedupeKeys.length === 0) {
    const r = await fetch(baseFilter, {
      method: "PATCH",
      headers: { ...dbHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({ status: "resolved", updated_at: now }),
    });
    if (!r.ok) console.error("narramind-update: resolve missing assets", await r.text());
    return;
  }

  const notIn = `(${newDedupeKeys.join(",")})`;
  const r1 = await fetch(`${baseFilter}&dedupe_key=not.in.${notIn}`, {
    method: "PATCH",
    headers: { ...dbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({ status: "resolved", updated_at: now }),
  });
  if (!r1.ok) console.error("narramind-update: resolve stale missing assets", await r1.text());

  // Récupérer les items déjà dismissés pour ne pas les ressusciter
  const dismissedRes = await fetch(
    `${supabaseUrl}/rest/v1/narramind_missing_assets?chapter_id=eq.${chapterId}&status=eq.dismissed&select=dedupe_key`,
    { headers: dbHeaders }
  );
  const dismissedKeys = new Set<string>(
    dismissedRes.ok
      ? ((await dismissedRes.json() as Array<{ dedupe_key: string }>).map((r) => r.dedupe_key))
      : []
  );

  // Préparer les rows à upserter (hors dismissed)
  const rows = items
    .filter((it) => !dismissedKeys.has(normalizeKey(it.name)))
    .map((it) => ({
      user_id: userId,
      project_id: projectId,
      chapter_id: chapterId,
      chapter_number: chapterNumber,
      name: it.name,
      suggested_type: it.suggestedType,
      mention_count: it.mentionCount,
      status: "pending",
      dedupe_key: normalizeKey(it.name),
      updated_at: now,
    }));

  if (rows.length === 0) return;

  const upsertRes = await fetch(
    `${supabaseUrl}/rest/v1/narramind_missing_assets?on_conflict=project_id,chapter_id,dedupe_key`,
    {
      method: "POST",
      headers: { ...dbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    }
  );
  if (!upsertRes.ok) {
    console.error("narramind-update: upsert missing assets", await upsertRes.text());
  }
}

async function verifyUserFromToken(
  authHeader: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = anonKey || serviceKey;
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: apiKey,
      },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return typeof user?.id === "string" ? user.id : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN")?.trim();
  if (!allowedOrigin) {
    return jsonResponse(
      { error: "ALLOWED_ORIGIN non configurée." },
      500
    );
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders() });
  }

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return jsonResponse({ error: "GEMINI_API_KEY non configurée." }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "Config Supabase manquante." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization manquante." }, 401);
    }

    const userId = await verifyUserFromToken(authHeader, supabaseUrl, serviceKey);
    if (!userId) {
      return jsonResponse({ error: "JWT invalide ou expiré." }, 401);
    }

    let body: { project_id?: string; chapter_id?: string; user_id?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return jsonResponse({ error: "Body JSON invalide." }, 400);
    }

    const { project_id, chapter_id } = body;
    if (!project_id || !chapter_id) {
      return jsonResponse(
        { error: '"project_id" et "chapter_id" sont requis.' },
        400
      );
    }

    const dbHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    // 1. Récupérer le chapitre + universe_lore du projet
    const [chapterRes, projectRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/scenario_chapters?id=eq.${chapter_id}&select=*`,
        { headers: dbHeaders }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/projects?id=eq.${project_id}&select=universe_lore,narra_summary,narra_summary_updated_at`,
        { headers: dbHeaders }
      ),
    ]);
    if (!chapterRes.ok) {
      return jsonResponse({ error: "Impossible de récupérer le chapitre." }, 502);
    }
    const chapters = await chapterRes.json() as Array<{
      id: string;
      user_id: string;
      project_id: string;
      chapter_number: number;
      title: string;
      content: string | null;
    }>;
    if (!chapters.length) {
      return jsonResponse({ error: "Chapitre introuvable." }, 404);
    }
    const chapter = chapters[0];
    if (chapter.user_id !== userId) {
      return jsonResponse({ error: "Accès refusé." }, 403);
    }
    if (chapter.project_id !== project_id) {
      return jsonResponse(
        { error: "Le chapitre n'appartient pas à ce projet." },
        400
      );
    }
    const projects = projectRes.ok
      ? (await projectRes.json() as Array<{
          universe_lore: string | null;
          narra_summary: string | null;
          narra_summary_updated_at: string | null;
        }>)
      : [];
    const projectRow = projects[0];
    const universeLore = projectRow?.universe_lore ?? null;
    const initialNarraSummary = projectRow?.narra_summary ?? null;

    const prevChapterNum = chapter.chapter_number;
    const summariesListUrl =
      `${supabaseUrl}/rest/v1/memory_summaries?project_id=eq.${project_id}` +
      `&chapter_number=lt.${prevChapterNum}&select=chapter_number,summary` +
      `&order=chapter_number.desc&limit=${PREV_SUMMARIES_FETCH_CAP}`;

    const [assetsRes, entitiesRes, prevSummariesRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/assets?project_id=eq.${project_id}&select=id,name,asset_type,prompt,lore`,
        { headers: dbHeaders }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/memory_entities?project_id=eq.${project_id}&select=*`,
        { headers: dbHeaders }
      ),
      fetch(summariesListUrl, { headers: dbHeaders }),
    ]);

    const assets = assetsRes.ok
      ? (await assetsRes.json() as Array<{
          id: string;
          name: string;
          asset_type: string;
          prompt: string | null;
          lore: string | null;
        }>)
      : [];

    const existingEntities = entitiesRes.ok ? await entitiesRes.json() : [];
    const prevSummaryRows = prevSummariesRes.ok
      ? (await prevSummariesRes.json() as Array<{ chapter_number: number; summary: string | null }>)
      : [];
    const prevSummariesCtx = buildPreviousSummariesContextForPrompt(
      prevSummaryRows,
      chapter.chapter_number
    );

    const loreCap = capUniverseLoreForPrompt(universeLore, UNIVERSE_LORE_MAX_CHARS);
    const narraCap = capNarraSummaryForPrompt(initialNarraSummary, NARRA_SUMMARY_PROMPT_MAX_CHARS);
    const assetsCtx = buildAssetsContextForPrompt(assets, ASSETS_CONTEXT_TOKEN_BUDGET);
    const entitiesCtx = buildMemoryEntitiesContextForPrompt(
      Array.isArray(existingEntities) ? existingEntities : [],
      chapter.chapter_number,
      ENTITIES_CONTEXT_TOKEN_BUDGET
    );

    console.log("[narramind-update] prompt budgets (phase2)", {
      universe_lore_truncated: loreCap.truncated,
      universe_lore_original_chars: loreCap.originalChars,
      universe_lore_sent_chars: loreCap.text?.length ?? 0,
      narra_summary_truncated: narraCap.truncated,
      narra_summary_sent_chars: narraCap.text?.length ?? 0,
      assets_included: assetsCtx.includedCount,
      assets_total: assetsCtx.totalCount,
      assets_capped: assetsCtx.capped,
      assets_estimated_tokens: assetsCtx.estimatedTokens,
      entities_included: entitiesCtx.included,
      entities_total: entitiesCtx.total,
      entities_capped: entitiesCtx.capped,
      entities_estimated_tokens: entitiesCtx.estimatedTokens,
    });

    // 4. Construire les prompts
    const assetsContext = assetsCtx.text;

    const systemPrompt = `Tu es NarraMind, un système de mémoire narrative.
${loreCap.text ? `\nLORE DU MONDE :\n${loreCap.text}\n` : ""}${narraCap.text ? `\nRÉSUMÉ LONG DU PROJET (NarraMind — mémoire consolidée sur les chapitres passés ; un détail absent ici ne constitue pas une anomalie si le mystère ou l'ellipse restent légitimes) :\n${narraCap.text}\n` : ""}${prevSummariesCtx.text ? `\n${prevSummariesCtx.text}\n` : ""}
ASSETS DU PROJET (avec leur LORE) :
${assetsContext}

FICHES ENTITÉS EXISTANTES :
${entitiesCtx.json}

NOUVEAU CHAPITRE ${chapter.chapter_number} — ${chapter.title} :
${chapter.content ?? "(vide)"}


TÂCHE : Retourne un JSON avec :
1. "entities_to_update": liste des fiches entités à créer ou mettre à jour
2. "chapter_summary": résumé du chapitre en 60-80 tokens maximum
3. "anomalies": les problèmes de continuité décrits ci-dessous. Préfère un tableau d'objets avec titre et explication ; tu peux utiliser une chaîne courte seulement si une seule phrase suffit. Si aucune anomalie : [].
4. "missing_assets": parmi les noms propres (personnages nommés, lieux nommés, objets nommés) mentionnés dans ce chapitre, liste uniquement ceux qui N'ont PAS de correspondance (même partielle, insensible à la casse) dans ASSETS DU PROJET ci-dessus. Pour chaque nom : libellé exact, type probable, nombre d'occurrences dans le chapitre courant.

RÈGLES pour "missing_assets" :
- Inclure SEULEMENT les noms propres spécifiques : noms de personnages, de lieux précis, d'objets nommés
- Exclure les termes génériques ("le héros", "la ville", "l'épée", pronoms, articles) — seulement les noms propres reconnaissables
- Ne pas inclure ce qui est déjà dans ASSETS DU PROJET
- Compter précisément les occurrences dans ce chapitre (formes fléchies comptent)
- Si aucun asset manquant : []

TYPES D'ANOMALIES À SIGNALER :
A) CONTRADICTIONS EXPLICITES — Le chapitre affirme X alors que le lore / les résumés antérieurs / le lore des personnages établissent clairement Y.
   Exemples : un personnage réapparaît vivant alors qu'un chapitre précédent le dit mort ; un lieu décrit au nord est soudain au sud.
B) RUPTURES DE TON / GENRE — L'univers établi (lore ou résumés antérieurs) est clairement réaliste ou ne comporte aucun élément magique / fantastique / science-fiction, et le chapitre courant en introduit un brusquement, sans mise en place préalable.
   Exemples : un personnage tire une boule de feu dans un récit policier réaliste ; un vaisseau spatial apparaît dans une saga médiévale sans technologie avancée.
   Condition stricte : l'univers DOIT avoir été posé comme sans ces éléments (via le lore ou des résumés de chapitres précédents). Si l'univers est vague, nouveau ou non établi → ne pas alerter.

RÈGLES STRICTES POUR "anomalies" (légitime = ne PAS alerter) :
- Mystère, suspense, révélation différée, ellipses, éléments « étranges » ou nouveaux dans le chapitre tant que le texte ne les présente pas comme déjà fixés ailleurs : ce n'est PAS une anomalie.
- Un personnage qui doute ou une ambiguïté volontaire : PAS une anomalie.
- Conseil de relecture générique (« c'est abrupt », « manque de motivation ») sans citation d'un fait ou d'un lore contredit : PAS une anomalie.
- Univers vague ou non établi (premier chapitre, peu de contexte disponible) : PAS d'alerte de rupture de genre.
- Alerter seulement si tu peux formuler : « Le chapitre introduit / affirme X alors que l'univers établi (lore / résumés antérieurs) l'exclut ou contredit Y. »

Chaque objet anomalie :
- "title" : libellé court (environ 80 caractères max), langage **histoire** uniquement
- "explanation" : phrase(s) claires pour un auteur : qui / quoi contredit quoi dans **l'univers** (personnages, lieux, événements déjà posés). Courtes citations du texte du chapitre ou du lore autorisées.
- "severity" optionnel : "info" | "warning" | "critical"
- "anchor" optionnel : { "type": "excerpt", "text": "copie exacte et courte d'un passage du chapitre ci-dessus (pour retrouver l'endroit dans le texte)" }

Rédaction "title" et "explanation" pour l'auteur — **ABSOLUMENT INTERDIT** :
- Tout terme ou artefact **technique** ou **outil / base de données** : « asset », « entité », « fiche », « JSON », noms de champs (ex. first_seen_chapter, last_seen_chapter, entity_type, traits, relations, project_id, etc.).
- Toute référence à **une fiche** ou **un enregistrement** : n'écrire jamais « la fiche de X indique », « selon la fiche », « la fiche du personnage », etc.
- Toute référence au **format interne** ou aux clés du JSON que tu produis.
Exemple **interdit** : « Contradiction avec first_seen_chapter: 2 ».
Exemple **interdit** : « La fiche de Pleine Mer indique qu'il a été vu pour la première fois au chapitre 2. »
Exemple **correct** : « Le texte dit que Kael n'a jamais nagé vers l'épave, alors qu'au chapitre 3 il s'y dirige déjà. »
Formule toujours en termes d'histoire : personnages, lieux, événements, éléments du monde.

Format JSON STRICT :
{
  "entities_to_update": [
    {
      "name": "string",
      "entity_type": "character|background|object",
      "traits": ["string"],
      "relations": [{"with": "string", "type": "string"}],
      "lore_summary": "string",
      "last_seen_chapter": number,
      "first_seen_chapter": number
    }
  ],
  "chapter_summary": "string",
  "anomalies": [
    {
      "title": "string",
      "explanation": "string",
      "severity": "warning",
      "anchor": { "type": "excerpt", "text": "string" }
    }
  ],
  "missing_assets": [
    {
      "name": "string",
      "suggested_type": "character|background|object",
      "mention_count": 1
    }
  ]
}`;

    console.log("[narramind-update] context previous_summaries", {
      chapter_number: chapter.chapter_number,
      prev_summaries_included: prevSummariesCtx.included,
      prev_summaries_estimated_tokens: prevSummariesCtx.estimatedTokens,
      prev_summaries_token_budget: PREV_SUMMARIES_CONTEXT_TOKEN_BUDGET,
    });

    // 5. Appel LLM (Gemini primaire → Gemini fallback → Groq urgence)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let aiResult: {
      entities_to_update: Array<{
        name: string;
        entity_type: string;
        traits: string[];
        relations: Array<{ with: string; type: string }>;
        lore_summary: string;
        last_seen_chapter: number;
        first_seen_chapter: number;
      }>;
      chapter_summary: string;
      anomalies: unknown;
      missing_assets: unknown;
    };

    const buildGeminiBody = (model: string) =>
      JSON.stringify({
        model,
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.1,
        max_tokens: NARRAMIND_MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
      });

    const buildGroqBody = () =>
      JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.1,
        max_tokens: NARRAMIND_MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
      });

    let rawText: string | null = null;
    let aiFinishReason: string | null = null;
    const aiStart = Date.now();

    try {
      let aiRes = await fetch(AI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${geminiKey}`,
        },
        body: buildGeminiBody(AI_MODEL),
        signal: controller.signal,
      });

      // Fallback Gemini alternatif sur 429/503
      if (aiRes.status === 503 || aiRes.status === 429) {
        aiRes = await fetch(AI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${geminiKey}`,
          },
          body: buildGeminiBody(AI_FALLBACK_MODEL),
          signal: controller.signal,
        });
      }

      // Fallback Groq si les deux Gemini sont indisponibles
      if (!aiRes.ok) {
        const groqKey = Deno.env.get("GROQ_API_KEY");
        if (groqKey) {
          aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            body: buildGroqBody(),
            signal: controller.signal,
          });
        }
      }

      clearTimeout(timeout);

      if (!aiRes.ok) {
        const rawErr = await aiRes.text();
        return jsonResponse(
          { error: `Modèles IA indisponibles (${aiRes.status})`, details: rawErr.slice(0, 200) },
          502
        );
      }

      const aiJson = await aiRes.json() as {
        choices?: Array<{
          message?: { content?: unknown };
          finish_reason?: string;
          native_finish_reason?: string;
        }>;
      };
      const choice0 = aiJson.choices?.[0];
      rawText = getOpenAIMessageContent(choice0?.message) || null;
      const finishReason =
        choice0?.finish_reason ?? choice0?.native_finish_reason ?? null;
      aiFinishReason = finishReason;

      if (!rawText) {
        return jsonResponse(
          {
            error: "L'IA n'a pas retourné de texte.",
            finish_reason: finishReason,
          },
          502
        );
      }

      console.log("[narramind-update] gemini response", {
        finish_reason: finishReason,
        raw_chars: rawText.length,
        raw_tail: rawText.slice(-120),
      });

      type AiResult = typeof aiResult;
      const parsedUnknown = tryParseNarraMindAiJson(rawText);
      const parsed =
        parsedUnknown !== null && typeof parsedUnknown === "object"
          ? (parsedUnknown as AiResult)
          : null;

      if (!parsed) {
        throw new Error(
          `JSON invalide (finish_reason=${finishReason ?? "?"}). Début : ${rawText.slice(0, 280)}`
        );
      }
      aiResult = parsed;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        return jsonResponse({ error: "Timeout appel Gemini." }, 504);
      }
      return jsonResponse(
        {
          error: "Réponse IA illisible (JSON). Réessayez ou raccourcissez le contexte.",
          details: String(err),
          finish_reason: aiFinishReason,
          raw: rawText?.slice(0, 800) ?? "null",
        },
        502
      );
    }

    const aiDuration = Date.now() - aiStart;

    const entitiesToUpdate = Array.isArray(aiResult.entities_to_update)
      ? aiResult.entities_to_update
      : [];
    const chapterSummary = aiResult.chapter_summary ?? "";
    const rawAnomalies = Array.isArray(aiResult.anomalies) ? aiResult.anomalies : [];
    const anomalies = normalizeAnomaliesInput(rawAnomalies);

    await persistNarramindAlerts(supabaseUrl, dbHeaders, {
      userId,
      projectId: project_id,
      chapterId: chapter_id,
      anomalies,
    });

    const rawMissingAssets = Array.isArray(aiResult.missing_assets) ? aiResult.missing_assets : [];
    const missingAssets = rawMissingAssets
      .filter((x): x is { name: string; suggested_type?: string | null; mention_count?: number } =>
        x != null && typeof x === "object" && typeof (x as Record<string, unknown>).name === "string"
      )
      .map((x) => ({
        name: (x.name as string).trim(),
        suggestedType: (["character", "background", "object"].includes(x.suggested_type as string)
          ? x.suggested_type
          : null) as string | null,
        mentionCount: typeof x.mention_count === "number" && x.mention_count > 0
          ? x.mention_count
          : 1,
      }))
      .filter((x) => x.name.length > 0);

    await persistNarramindMissingAssets(supabaseUrl, dbHeaders, {
      userId,
      projectId: project_id,
      chapterId: chapter_id,
      chapterNumber: chapter.chapter_number,
      items: missingAssets,
    });

    // 6. Upsert des entités
    for (const entity of entitiesToUpdate) {
      const tokenEstimate = estimateTokens(JSON.stringify(entity));
      await fetch(`${supabaseUrl}/rest/v1/memory_entities`, {
        method: "POST",
        headers: {
          ...dbHeaders,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          project_id,
          user_id: userId,
          name: entity.name,
          entity_type: entity.entity_type,
          traits: entity.traits ?? [],
          relations: entity.relations ?? [],
          lore_summary: entity.lore_summary ?? null,
          last_seen_chapter: entity.last_seen_chapter ?? chapter.chapter_number,
          first_seen_chapter: entity.first_seen_chapter ?? chapter.chapter_number,
          token_estimate: tokenEstimate,
          updated_at: new Date().toISOString(),
        }),
      });
    }

    // 7. Insérer le résumé
    const summaryTokens = estimateTokens(chapterSummary);
    await fetch(`${supabaseUrl}/rest/v1/memory_summaries`, {
      method: "POST",
      headers: { ...dbHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        project_id,
        user_id: userId,
        chapter_id,
        chapter_number: chapter.chapter_number,
        summary: chapterSummary,
        token_estimate: summaryTokens,
      }),
    });

    // 8. Calculer le total tokens depuis les données déjà connues (évite double requête)
    const totalSummaryTokensNew = summaryTokens;
    const totalEntityTokensNew = entitiesToUpdate.reduce(
      (acc, e) => acc + estimateTokens(JSON.stringify(e)), 0
    );

    // Requêtes pour le total cumulatif réel (toutes sessions confondues)
    const allSummariesRes = await fetch(
      `${supabaseUrl}/rest/v1/memory_summaries?project_id=eq.${project_id}&select=token_estimate`,
      { headers: dbHeaders }
    );
    const allSummaries = allSummariesRes.ok
      ? (await allSummariesRes.json() as Array<{ token_estimate: number }>)
      : [];
    const totalSummaryTokens = allSummaries.reduce((acc, s) => acc + (s.token_estimate ?? 0), 0);

    const allEntitiesRes = await fetch(
      `${supabaseUrl}/rest/v1/memory_entities?project_id=eq.${project_id}&select=token_estimate`,
      { headers: dbHeaders }
    );
    const allEntities = allEntitiesRes.ok
      ? (await allEntitiesRes.json() as Array<{ token_estimate: number }>)
      : [];
    const totalEntityTokens = allEntities.reduce((acc, e) => acc + (e.token_estimate ?? 0), 0);

    const totalContextTokens = totalSummaryTokens + totalEntityTokens;
    // Fallback sur les tokens de cette session si les requêtes retournent 0
    const contextTokensToLog = totalContextTokens > 0
      ? totalContextTokens
      : totalSummaryTokensNew + totalEntityTokensNew;
    const needsCompression =
      totalSummaryTokens > NARRA_COMPRESSION_SUMMARY_TOKENS_THRESHOLD;

    let summariesCompressed = 0;
    let narraBase = (initialNarraSummary ?? "").trim();
    if (needsCompression) {
      const fused = await tryFuseAndDeleteOldestSummaries(
        supabaseUrl,
        dbHeaders,
        geminiKey,
        project_id
      );
      if (fused) {
        summariesCompressed = fused.deletedCount;
        narraBase =
          `[Arc comprimé (chapitres ${fused.chapterFrom}–${fused.chapterTo})]\n${fused.arcText}\n\n${narraBase}`
            .trim();
        console.log("[narramind-update] phase3 compression", {
          deleted_summaries: fused.deletedCount,
          chapter_from: fused.chapterFrom,
          chapter_to: fused.chapterTo,
        });
      }
    }

    const chapterNarraLine =
      `Chapitre ${chapter.chapter_number} : ${chapterSummary.replace(/\s+/g, " ").trim()}`;
    const narraFinal = trimNarraSummaryStore(
      narraBase ? `${narraBase}\n\n${chapterNarraLine}` : chapterNarraLine,
      NARRA_SUMMARY_STORE_MAX_CHARS
    );

    const narraPatchRes = await fetch(
      `${supabaseUrl}/rest/v1/projects?id=eq.${project_id}&user_id=eq.${userId}`,
      {
        method: "PATCH",
        headers: { ...dbHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({
          narra_summary: narraFinal,
          narra_summary_updated_at: new Date().toISOString(),
        }),
      }
    );
    if (!narraPatchRes.ok) {
      console.error(
        "narramind-update: PATCH projects narra_summary failed",
        await narraPatchRes.text()
      );
    }

    // 9. Log métriques (fire-and-forget)
    fetch(`${supabaseUrl}/rest/v1/narramind_metrics`, {
      method: "POST",
      headers: { ...dbHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        project_id,
        chapter_number: chapter.chapter_number,
        mode: "narramind_v1",
        context_tokens: contextTokensToLog,
        response_tokens: estimateTokens(JSON.stringify(aiResult)),
        chapters_in_context: allSummaries.length,
        anomalies_detected: anomalies.length,
        duration_ms: aiDuration,
      }),
    }).catch(() => {});

    const checkedAt = new Date().toISOString();
    const narramindAnomaliesSnapshot = anomalies.map((a) => ({
      id: a.id,
      title: a.title,
      explanation: a.explanation,
      ...(a.severity ? { severity: a.severity } : {}),
      ...(a.anchor ? { anchor: a.anchor } : {}),
    }));
    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/scenario_chapters?id=eq.${chapter_id}&user_id=eq.${userId}`,
      {
        method: "PATCH",
        headers: { ...dbHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({
          narramind_anomalies: narramindAnomaliesSnapshot,
          narramind_checked_at: checkedAt,
        }),
      }
    );
    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error("narramind-update: PATCH scenario_chapters failed", errText);
    }

    return jsonResponse(
      {
        success: true,
        summary: chapterSummary,
        entities_updated: entitiesToUpdate.length,
        anomalies,
        narramind_checked_at: checkedAt,
        total_context_tokens: totalContextTokens,
        needs_compression: needsCompression,
        memory_summaries_compressed: summariesCompressed,
      },
      200
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: "Erreur serveur.", details: msg }, 500);
  }
});
