import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Save,
  Loader2,
  Check,
  X,
  Sparkles,
  Scissors,
  CheckCircle2,
  Circle,
  PenLine,
  Layers,
  Package,
  Type,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useScenarioChapter,
  useUpdateScenarioChapter,
  useScenarioChapters,
} from "@/hooks/useScenarioChapters";
import { useProject, useUpdateProject } from "@/hooks/useProjects";
import { getMaxAccessibleTab, useProgressiveMenuAccess } from "@/hooks/useProgressiveMenuGate";
import { useAssets } from "@/hooks/useAssets";
import { useScenarioAI } from "@/hooks/useScenarioAI";
import { useUserPlan } from "@/hooks/useUserPlan";
import { planDisplayName } from "@/types";
import { callDetectBlocks, callGenerateAiSummary } from "@/services/scenarioAI";
import { useNarraMindDebounce } from "@/hooks/useNarraMindDebounce";
import { estimatePanelCount } from "@/services/panels";
import { ScenarioTextHighlighter } from "@/components/project/ScenarioTextHighlighter";
import { useToast } from "@/hooks/use-toast";
import { scrollChapterEditorToExcerpt } from "@/lib/arianeScroll";
import { cn } from "@/lib/utils";
import type { LockedBlock, DetectedBlock, AssetType } from "@/types";

/** NarraMind : auto-save uniquement, pas d’appel manuel — garde-fous tokens. */
const NARRAMIND_AUTOSAVE_MIN_WORDS = 80;

const EDITOR_FONT_STYLE: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: "1rem",
  lineHeight: "1.8",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowWrap: "break-word",
  padding: 0,
  margin: 0,
};

function segmentsForLine(
  line: string,
  lineStart: number,
  hl: { start: number; end: number } | null
): Array<{ text: string; mark: boolean }> {
  if (!hl || hl.end <= lineStart || hl.start >= lineStart + line.length) {
    return [{ text: line, mark: false }];
  }
  const rs = Math.max(0, hl.start - lineStart);
  const re = Math.min(line.length, hl.end - lineStart);
  const out: Array<{ text: string; mark: boolean }> = [];
  if (rs > 0) out.push({ text: line.slice(0, rs), mark: false });
  if (re > rs) out.push({ text: line.slice(rs, re), mark: true });
  if (re < line.length) out.push({ text: line.slice(re), mark: false });
  return out;
}

function renderLineSegments(
  line: string,
  lineStart: number,
  hl: { start: number; end: number } | null,
  style: React.CSSProperties
): React.ReactNode {
  const segs = segmentsForLine(line, lineStart, hl);
  return segs.map((s, j) =>
    s.mark ? (
      <mark
        key={j}
        className="rounded-sm px-0.5"
        style={{
          ...style,
          backgroundColor: "rgba(251, 191, 36, 0.42)",
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
        }}
      >
        {s.text}
      </mark>
    ) : (
      <span key={j} style={style}>
        {s.text}
      </span>
    )
  );
}

function renderFormatCHighlight(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let offset = 0;
  lines.forEach((line, i) => {
    const lineStart = offset;
    const scenePrefix = line.match(/^(###\s)/)?.[1];
    const blockquotePrefix = line.match(/^(>\s*)/)?.[1];
    const wrapKey = `h-${i}`;

    if (scenePrefix) {
      const rest = line.slice(scenePrefix.length);
      const restStart = lineStart + scenePrefix.length;
      const style = { color: "hsl(275, 45%, 60%)", fontWeight: 700 as const };
      nodes.push(
        <span key={wrapKey}>
          <span style={style}>{scenePrefix}</span>
          {renderLineSegments(rest, restStart, null, style)}
        </span>
      );
    } else if (blockquotePrefix) {
      const rest = line.slice(blockquotePrefix.length);
      const restStart = lineStart + blockquotePrefix.length;
      const restColor = /^Personnages\s*:/i.test(rest)
        ? "hsl(275, 38%, 55%)"
        : "hsl(170, 40%, 55%)";
      const style = { color: restColor };
      nodes.push(
        <span key={wrapKey}>
          <span style={{ color: "hsl(0, 0%, 58%)" }}>{blockquotePrefix}</span>
          {renderLineSegments(rest, restStart, null, style)}
        </span>
      );
    } else if (/^-{3,}\s*$/.test(line)) {
      nodes.push(
        <span key={wrapKey}>{renderLineSegments(line, lineStart, null, { color: "hsl(0, 0%, 58%)" })}</span>
      );
    } else if (/«/.test(line)) {
      nodes.push(
        <span key={wrapKey}>
          {renderLineSegments(line, lineStart, null, {
            fontStyle: "italic",
            color: "hsl(275, 22%, 52%)",
          })}
        </span>
      );
    } else {
      nodes.push(
        <span key={wrapKey}>
          {renderLineSegments(line, lineStart, null, { color: "hsl(var(--foreground))" })}
        </span>
      );
    }

    offset += line.length + (i < lines.length - 1 ? 1 : 0);
    if (i < lines.length - 1) nodes.push("\n");
  });
  return nodes;
}

interface FormatCEditorProps {
  value: string;
  onChange: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  placeholder?: string;
}

function FormatCEditor({
  value,
  onChange,
  textareaRef,
  placeholder,
}: FormatCEditorProps) {
  return (
    <div className="relative min-h-[300px]">
      <div
        aria-hidden="true"
        className="pointer-events-none select-none"
        style={{ ...EDITOR_FONT_STYLE, minHeight: 300 }}
      >
        {value ? (
          renderFormatCHighlight(value)
        ) : (
          <span style={{ color: "transparent" }}>{placeholder ?? " "}</span>
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="absolute inset-0 w-full resize-none border-0 focus:ring-0 focus:outline-none bg-transparent overflow-hidden placeholder:text-muted-foreground/40"
        style={{
          ...EDITOR_FONT_STYLE,
          color: "transparent",
          caretColor: "hsl(var(--foreground))",
          height: "100%",
        }}
      />
    </div>
  );
}

// ─── DiffColumns ───────────────────────────────────────────────

function DiffColumns({ original, revised }: { original: string; revised: string }) {
  const origParas = original.split(/\n\n+/);
  const revisedParas = revised.split(/\n\n+/);

  return (
    <>
      {revisedParas.map((para, i) => {
        const isChanged = para.trim() !== (origParas[i] ?? "").trim();
        return (
          <p
            key={i}
            className={`mb-4 last:mb-0 rounded px-1 -mx-1 transition-colors ${
              isChanged
                ? "bg-amber-400/10 text-foreground"
                : "text-foreground"
            }`}
          >
            {para}
          </p>
        );
      })}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ScenarioChapterEditor
// ═══════════════════════════════════════════════════════════════

export default function ScenarioChapterEditor() {
  const { id: projectId, chapterId } = useParams<{
    id: string;
    chapterId: string;
  }>();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Data
  const { data: chapter, isLoading: isLoadingChapter } =
    useScenarioChapter(chapterId);
  const { data: project } = useProject(projectId);
  const { isResolved, appliesProgressiveFlow, accessible } = useProgressiveMenuAccess(projectId);
  const progressiveRedirectRef = useRef(false);
  const { data: assets = [] } = useAssets(projectId);
  const { data: allChapters = [] } = useScenarioChapters(projectId);
  const contextChapters = useMemo(
    () => allChapters.filter((c) => c.id !== chapterId).slice(-5),
    [allChapters, chapterId]
  );
  const updateChapter = useUpdateScenarioChapter();
  const updateProject = useUpdateProject();
  const chapterAI = useScenarioAI();
  const { plan } = useUserPlan();
  const isPro = plan === "pro";
  const { schedule: scheduleNarraMind } = useNarraMindDebounce();

  // Highlight via ?highlight= param (navigation depuis Fil d'Ariane)
  const [searchParams] = useSearchParams();
  const highlightAnchor = searchParams.get("highlight");
  const [highlightVisible, setHighlightVisible] = useState(false);
  const [highlightFading, setHighlightFading] = useState(false);
  const highlightTriggeredRef = useRef(false);

  // Local state — content / title
  const [content, setContent] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [wordMappings, setWordMappings] = useState<Record<string, string>>({});

  // Local state — UI
  const [viewMode, setViewMode] = useState<"edit" | "visuels">("edit");
  const [showAssets, setShowAssets] = useState(false);
  const [saveState, setSaveState] = useState<"clean" | "dirty" | "saving">(
    "clean"
  );

  // Local state — blocs
  const [lockedBlocks, setLockedBlocks] = useState<LockedBlock[]>([]);
  const [detectedBlocks, setDetectedBlocks] = useState<DetectedBlock[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  // Contenu au moment de la dernière détection — pour P2 warning
  const [detectedAtContent, setDetectedAtContent] = useState("");

  // Local state — IA barre
  const [showIABar, setShowIABar] = useState(false);

  // Local state — éléments à ne pas proposer comme assets (persisté par projet)
  const [dismissedMissingNames, setDismissedMissingNames] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`dw:dismissed-missing:${projectId}`);
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // Local state — sélection / IA
  const [chapterAIPrompt, setChapterAIPrompt] = useState("");
  const [chapterAIResult, setChapterAIResult] = useState<string | null>(null);

  // Local state — reading info
  const [readingInfo, setReadingInfo] = useState<{
    words: number;
    panels: number;
    minutes: number;
  } | null>(null);

  // Local state — cible panels projet
  const [panelsTargetDraft, setPanelsTargetDraft] = useState<string>("");
  const [editingTarget, setEditingTarget] = useState(false);

  const [isWritingManually, setIsWritingManually] = useState(false);
  const [showInlineAI, setShowInlineAI] = useState(false);
  const [inlineAIPrompt, setInlineAIPrompt] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);
  // Bloque onScroll pendant le toggle assets pour éviter que l'effondrement
  // du contenu n'écrase lastScrollTopRef avec une valeur clampée.
  const isTransitioningRef = useRef<boolean>(false);

  // Ref pour éviter de marquer "dirty" pendant la synchro initiale
  const initialSyncDoneRef = useRef(false);
  // Throttle ai_summary : max 1 appel Groq toutes les 2 min pour économiser le budget TPM
  const lastAiSummaryCallRef = useRef<number>(0);

  useEffect(() => {
    progressiveRedirectRef.current = false;
  }, [projectId]);

  useEffect(() => {
    if (!isResolved || !appliesProgressiveFlow || !projectId) return;
    if (accessible.scenario) return;
    if (progressiveRedirectRef.current) return;
    progressiveRedirectRef.current = true;
    const tab = getMaxAccessibleTab(accessible);
    toast({
      title: "Étape précédente requise",
      description:
        "Validez d’abord le style, puis enchaînez les étapes du parcours débutant avant le scénario.",
    });
    navigate(`/dashboard/projects/${projectId}?tab=${tab}`, { replace: true });
  }, [isResolved, appliesProgressiveFlow, accessible, projectId, navigate, toast]);

  const handleContentChange = useCallback((next: string) => {
    setContent(next);
  }, []);

  // ── Sync content depuis la BDD (chargement initial) ──────────

  useEffect(() => {
    if (chapter) {
      setContent(chapter.content ?? "");
      setTitleDraft(chapter.title);
      setIsWritingManually(false);
      setShowInlineAI(false);
      setInlineAIPrompt("");
      initialSyncDoneRef.current = true;
      setSaveState("clean");
      setWordMappings({});
      const wm = chapter.word_mappings;
      if (wm && typeof wm === "object" && !Array.isArray(wm)) {
        setWordMappings(wm as Record<string, string>);
      }

      // Restaurer les blocs depuis panels_outline
      type StoredBlock = {
        panel_number: number;
        block_number?: number;
        description: string;
        text_excerpt: string;
        locked?: boolean;
      };
      const outline = chapter.panels_outline;
      if (Array.isArray(outline) && outline.length > 0) {
        const stored = outline as StoredBlock[];
        // Assign block_number if missing (old data without block_number)
        const counters: Record<number, number> = {};
        const detected: DetectedBlock[] = stored.map((b) => {
          counters[b.panel_number] = (counters[b.panel_number] ?? 0) + 1;
          return {
            panel_number: b.panel_number,
            block_number: b.block_number ?? counters[b.panel_number],
            description: b.description,
            text_excerpt: b.text_excerpt,
          };
        });
        const locked: LockedBlock[] = stored
          .filter((b) => b.locked)
          .map((b, idx) => ({
            id: `${b.panel_number}-${b.block_number ?? idx}-restored`,
            panel_number: b.panel_number,
            block_number: b.block_number ?? 1,
            description: b.description,
            text_excerpt: b.text_excerpt,
          }));
        setDetectedBlocks(detected);
        setLockedBlocks(locked);
        setDetectedAtContent(chapter.content ?? "");
        setViewMode("edit");
      } else {
        setDetectedBlocks([]);
        setLockedBlocks([]);
        setDetectedAtContent("");
        setViewMode("edit");
      }
    }
    // WHY : ne resync que lorsque l'id change (ex : navigation chapitre)
    // — sinon l'auto-save overwrite-erait les frappes en cours.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter?.id]);

  // Scroll + surbrillance dorée vers un extrait passé via ?highlight= (navigation depuis Fil d'Ariane)
  useEffect(() => {
    if (!highlightAnchor || highlightTriggeredRef.current) return;
    if (!content || !textareaRef.current || !scrollContainerRef.current) return;
    highlightTriggeredRef.current = true;
    const timer = setTimeout(() => {
      scrollChapterEditorToExcerpt(
        textareaRef.current!,
        scrollContainerRef.current!,
        content,
        highlightAnchor
      );
      setHighlightVisible(true);
      setHighlightFading(false);
      const fadeTimer = setTimeout(() => setHighlightFading(true), 2400);
      const hideTimer = setTimeout(() => {
        setHighlightVisible(false);
        setHighlightFading(false);
      }, 3000);
      return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
    }, 350);
    return () => clearTimeout(timer);
    // WHY: dépend de content pour attendre le chargement initial, ref stable ensuite
  }, [highlightAnchor, content]);

  // ── Préserver la position de scroll lors du toggle Assets ────
  // setTimeout(0) garantit que l'auto-resize a déjà tourné avant de restaurer.

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const saved = lastScrollTopRef.current;
    isTransitioningRef.current = true;
    const t = setTimeout(() => {
      container.scrollTop = saved;
      isTransitioningRef.current = false;
    }, 50);
    return () => clearTimeout(t);
  }, [showAssets]);

  // ── Calcul lecture (debounce 800ms) ──────────────────────────

  useEffect(() => {
    const t = setTimeout(() => {
      const words = content.trim().split(/\s+/).filter(Boolean).length;
      if (words < 30) {
        setReadingInfo(null);
        return;
      }
      const readingSeconds = (words / 200) * 60;
      const panelSeconds = lockedBlocks.length * 20;
      const totalMins = Math.max(
        1,
        Math.round((readingSeconds + panelSeconds) / 60)
      );
      setReadingInfo({
        words,
        panels: estimatePanelCount(content),
        minutes: totalMins,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [content, lockedBlocks.length]);

  // ── Auto-save (debounce 2s) ──────────────────────────────────

  useEffect(() => {
    if (!chapter || !initialSyncDoneRef.current) return;
    if (content === (chapter.content ?? "")) {
      setSaveState("clean");
      return;
    }
    setSaveState("dirty");
    const t = setTimeout(() => {
      setSaveState("saving");
      updateChapter.mutate(
        { id: chapter.id, projectId: projectId!, updates: { content } },
        {
          onSuccess: () => {
            setSaveState("clean");
            const words = content.trim().split(/\s+/).filter(Boolean).length;
            const now = Date.now();
            if (words >= 50 && now - lastAiSummaryCallRef.current > 120_000) {
              lastAiSummaryCallRef.current = now;
              callGenerateAiSummary({
                mode: "ai_summary",
                chapter_content: content,
                chapter_title: chapter.title,
                chapter_number: chapter.chapter_number,
              }).catch(() => {});
            }
            if (words >= NARRAMIND_AUTOSAVE_MIN_WORDS) {
              scheduleNarraMind(projectId!, chapter.id);
            }
          },
          onError: () => setSaveState("dirty"),
        }
      );
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // ── Title save ───────────────────────────────────────────────

  const saveTitle = useCallback(() => {
    if (!chapter) return;
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(chapter.title);
      setEditingTitle(false);
      return;
    }
    if (trimmed === chapter.title) {
      setEditingTitle(false);
      return;
    }
    updateChapter.mutate(
      { id: chapter.id, projectId: projectId!, updates: { title: trimmed } },
      {
        onSuccess: () => {
          toast({ title: "Titre mis à jour" });
          setEditingTitle(false);
        },
        onError: (err) =>
          toast({
            title: "Erreur",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  }, [chapter, titleDraft, projectId, updateChapter, toast]);

  // ── Manual save ──────────────────────────────────────────────

  const handleManualSave = useCallback(() => {
    if (!chapter || saveState === "clean" || saveState === "saving") return;
    setSaveState("saving");
    updateChapter.mutate(
      { id: chapter.id, projectId: projectId!, updates: { content } },
      {
        onSuccess: () => {
          setSaveState("clean");
          toast({ title: "Chapitre sauvegardé" });
        },
        onError: (err) => {
          setSaveState("dirty");
          toast({
            title: "Erreur",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  }, [chapter, content, projectId, saveState, updateChapter, toast]);

  // ── Ctrl+S ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleManualSave]);

  // ── Détecter les blocs ────────────────────────────────────────

  const handleDetectBlocks = useCallback(async () => {
    if (!chapter || !content.trim()) return;
    setIsDetecting(true);
    try {
      // Construire le contexte assets : nom + type (limité à 80 chars/asset, max 20 assets)
      const assetsContext = assets.length > 0
        ? assets
            .slice(0, 20)
            .map((a) => {
              const typeLabel = a.asset_type === "character" ? "personnage"
                : a.asset_type === "background" ? "décor" : "objet";
              const desc = a.prompt?.trim().slice(0, 60) ?? "";
              return `- ${a.name} (${typeLabel})${desc ? ` : ${desc}` : ""}`;
            })
            .join("\n")
        : undefined;

      const result = await callDetectBlocks({
        mode: "detect_blocks",
        chapter_content: content,
        chapter_title: chapter.title,
        chapter_number: chapter.chapter_number,
        target_panel_count: project?.panels_target_per_chapter ?? undefined,
        assets_context: assetsContext,
        universe_lore: project?.universe_lore?.trim() || undefined,
      });
      setDetectedBlocks(result.blocks);
      if (result.blocks.length === 0) {
        toast({
          title: "Aucune case détectée",
          description: "Le chapitre est peut-être trop court.",
        });
      } else {
        setDetectedAtContent(content);
        setViewMode("visuels");
        updateChapter.mutate({
          id: chapter.id,
          projectId: projectId!,
          updates: {
            panels_outline: result.blocks.map((b) => ({ ...b, locked: false })),
          },
        });
      }
    } catch (err) {
      toast({
        title: "Erreur",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, content, toast]);

  // ── Toggle / unlock un bloc ──────────────────────────────────

  const isBlockLocked = useCallback(
    (b: DetectedBlock) =>
      lockedBlocks.some(
        (l) => l.panel_number === b.panel_number && l.block_number === b.block_number
      ),
    [lockedBlocks]
  );

  const savePanelsOutline = useCallback(
    (detected: DetectedBlock[], locked: LockedBlock[]) => {
      if (!chapter || detected.length === 0) return;
      updateChapter.mutate({
        id: chapter.id,
        projectId: projectId!,
        updates: {
          panels_outline: detected.map((b) => ({
            ...b,
            locked: locked.some(
              (l) => l.panel_number === b.panel_number && l.block_number === b.block_number
            ),
          })),
        },
      });
    },
    [chapter, projectId, updateChapter]
  );

  const toggleBlock = useCallback(
    (block: DetectedBlock) => {
      const locked = isBlockLocked(block);
      const newLocked = locked
        ? lockedBlocks.filter(
            (l) => !(l.panel_number === block.panel_number && l.block_number === block.block_number)
          )
        : [
            ...lockedBlocks,
            {
              id: `${block.panel_number}-${block.block_number}-${Date.now()}`,
              panel_number: block.panel_number,
              block_number: block.block_number,
              description: block.description,
              text_excerpt: block.text_excerpt,
            },
          ];
      setLockedBlocks(newLocked);
      savePanelsOutline(detectedBlocks, newLocked);
    },
    [lockedBlocks, detectedBlocks, isBlockLocked, savePanelsOutline]
  );

  const lockAllDetected = useCallback(() => {
    const toAdd: LockedBlock[] = detectedBlocks
      .filter((d) => !isBlockLocked(d))
      .map((d) => ({
        id: `${d.panel_number}-${d.block_number}-${Date.now()}`,
        panel_number: d.panel_number,
        block_number: d.block_number,
        description: d.description,
        text_excerpt: d.text_excerpt,
      }));
    if (toAdd.length > 0) {
      const newLocked = [...lockedBlocks, ...toAdd];
      setLockedBlocks(newLocked);
      savePanelsOutline(detectedBlocks, newLocked);
    }
  }, [detectedBlocks, lockedBlocks, isBlockLocked, savePanelsOutline]);

  const unlockAllBlocks = useCallback(() => {
    const newLocked: LockedBlock[] = [];
    setLockedBlocks(newLocked);
    savePanelsOutline(detectedBlocks, newLocked);
  }, [detectedBlocks, savePanelsOutline]);

  // ── Set des clés verrouillées — O(1) lookup en render ────────

  const lockedKeySet = useMemo(
    () => new Set(lockedBlocks.map((l) => `${l.panel_number}-${l.block_number}`)),
    [lockedBlocks]
  );

  // ── Liste plate des cases (un bloc = une case) ───────────────

  const cases = useMemo(
    () =>
      [...detectedBlocks].sort((a, b) =>
        a.panel_number !== b.panel_number
          ? a.panel_number - b.panel_number
          : a.block_number - b.block_number
      ),
    [detectedBlocks]
  );

  // ── IA chapitre complet ──────────────────────────────────────

  const handleChapterAI = useCallback(() => {
    if (!chapter || !chapterAIPrompt.trim() || !content.trim()) return;
    chapterAI.mutate(
      {
        mode: "chapter",
        prompt: chapterAIPrompt.trim(),
        chapter_title: chapter.title,
        chapter_content: content,
        chapter_number: chapter.chapter_number,
      },
      {
        onSuccess: (data) => {
          setChapterAIResult(data.text);
          setShowIABar(false);
          toast({ title: "Suggestion IA prête" });
        },
        onError: (err) =>
          toast({
            title: "Erreur IA",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  }, [chapter, chapterAIPrompt, content, chapterAI, toast]);

  // ── Cible panels projet ──────────────────────────────────────

  const saveTarget = useCallback(() => {
    if (!project) {
      setEditingTarget(false);
      return;
    }
    const n = parseInt(panelsTargetDraft, 10);
    if (!isNaN(n) && n > 0 && n <= 200) {
      updateProject.mutate(
        { id: project.id, updates: { panels_target_per_chapter: n } },
        {
          onSuccess: () => toast({ title: "Cible mise à jour" }),
          onError: (err) =>
            toast({
              title: "Erreur",
              description: err.message,
              variant: "destructive",
            }),
        }
      );
    }
    setEditingTarget(false);
  }, [panelsTargetDraft, project, updateProject, toast]);

  // ── Dismiss missing asset name ───────────────────────────────

  const handleDismissMissing = useCallback((name: string) => {
    setDismissedMissingNames((prev) => {
      const next = new Set(prev);
      next.add(name.toLowerCase());
      try {
        localStorage.setItem(`dw:dismissed-missing:${projectId}`, JSON.stringify([...next]));
      } catch { /* localStorage indisponible */ }
      return next;
    });
  }, [projectId]);

  const handleCreateAssetFromText = useCallback((name: string, type: AssetType) => {
    navigate(`/dashboard/projects/${projectId}?tab=assets&pendingName=${encodeURIComponent(name)}&pendingType=${type}`);
  }, [navigate, projectId]);

  const handleAssignWord = useCallback(
    (word: string, assetId: string | null) => {
      if (!chapter) return;
      const newMappings = { ...wordMappings };
      if (assetId === null) {
        delete newMappings[word.toLowerCase()];
      } else {
        newMappings[word.toLowerCase()] = assetId;
      }
      setWordMappings(newMappings);
      updateChapter.mutate({
        id: chapter.id,
        projectId: projectId!,
        updates: { word_mappings: newMappings },
      });
    },
    [chapter, wordMappings, projectId, updateChapter]
  );

  const handleInlineGeneration = useCallback(() => {
    if (!chapter || !inlineAIPrompt.trim()) return;
    const existingContent =
      contextChapters.length > 0
        ? contextChapters
            .map((c, i) => {
              const isLast = i === contextChapters.length - 1;
              if (isLast) {
                return `Chapitre ${c.chapter_number} : ${c.title}\n${c.content?.trim() ?? "(vide)"}`;
              }
              const summary = (c as { ai_summary?: string | null }).ai_summary?.trim();
              if (summary) return `Chapitre ${c.chapter_number} (${c.title}) — résumé : ${summary}`;
              const snippet = c.content?.slice(0, 400) ?? "(vide)";
              return `Chapitre ${c.chapter_number} : ${c.title}\n${snippet}${c.content && c.content.length > 400 ? "…" : ""}`;
            })
            .join("\n\n")
        : undefined;

    chapterAI.mutate(
      {
        mode: "scenario",
        prompt: inlineAIPrompt.trim(),
        existing_content: existingContent,
        project_description: project?.description ?? undefined,
        next_chapter_number: chapter.chapter_number,
      },
      {
        onSuccess: (data) => {
          setContent(data.text);
          setShowInlineAI(false);
          setInlineAIPrompt("");
          toast({ title: "Chapitre généré par l'IA" });
        },
        onError: (err) =>
          toast({ title: "Erreur IA", description: err.message, variant: "destructive" }),
      }
    );
  }, [chapter, inlineAIPrompt, contextChapters, project, chapterAI, toast]);

  // ── Loading / error states ───────────────────────────────────

  if (isLoadingChapter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <p className="text-muted-foreground mb-3">Chapitre introuvable.</p>
          <Link
            to={`/dashboard/projects/${projectId}?tab=scenario`}
            className="text-primary hover:underline"
          >
            Retour au scénario
          </Link>
        </div>
      </div>
    );
  }

  // ── Rendu ────────────────────────────────────────────────────

  const _targetPanels = project?.panels_target_per_chapter ?? null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* HEADER */}
      <header className="h-12 border-b border-border bg-background/95 backdrop-blur-xl sticky top-0 z-30 flex items-center gap-2 px-4 sm:px-6 shrink-0">
        {/* Retour scénario — bouton explicite */}
        <Link
          to={`/dashboard/projects/${projectId}?tab=scenario`}
          className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg border border-border bg-muted/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/80 transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Scénario</span>
        </Link>

        <span className="text-muted-foreground/40 text-sm shrink-0">/</span>
        <span className="text-sm text-muted-foreground truncate max-w-[160px] shrink-0">{project?.title ?? "—"}</span>
        <span className="text-muted-foreground/40 text-sm shrink-0">/</span>

        <div className="flex-1 min-w-0 group">
          {editingTitle ? (
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveTitle();
                }
                if (e.key === "Escape") {
                  setTitleDraft(chapter.title);
                  setEditingTitle(false);
                }
              }}
              className="h-7 text-sm max-w-sm"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors truncate"
              title="Renommer le chapitre"
            >
              <span className="text-muted-foreground font-mono text-xs">
                {String(chapter.chapter_number).padStart(2, "0")}
              </span>
              <span className="truncate">{chapter.title}</span>
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
            </button>
          )}
        </div>

        {/* Zone droite : stats chips — toujours visibles */}
        <div className="flex items-center gap-2 shrink-0">
          {readingInfo && (
            <>
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
                <Type className="h-3 w-3" />
                {readingInfo.words.toLocaleString("fr-FR")} mots
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full px-2.5 py-1">
                <Layers className="h-3 w-3" />
                {cases.length > 0
                  ? `${cases.length} case${cases.length > 1 ? "s" : ""}`
                  : `~${readingInfo.panels} cases`}
              </span>
              {lockedBlocks.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {lockedBlocks.length} validée{lockedBlocks.length > 1 ? "s" : ""}
                </span>
              )}
            </>
          )}
        </div>

        {/* Save state + bouton save */}
        <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
          {saveState === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Sauvegarde...
            </>
          )}
          {saveState === "clean" && (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              Sauvegardé
            </>
          )}
          {saveState === "dirty" && <span className="text-amber-500">•</span>}
        </div>

        <Button
          size="sm"
          onClick={handleManualSave}
          disabled={saveState === "clean" || saveState === "saving"}
          className="h-7 gap-1.5 gradient-primary text-primary-foreground shrink-0 text-xs"
        >
          <Save className="h-3 w-3" />
          Sauvegarder
        </Button>
      </header>

      {/* MAIN ZONE */}
      <div
        className="flex flex-1 overflow-hidden"
        style={{ height: "calc(100vh - 48px)" }}
      >
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar fine — toggle Écriture/Cases + toggle Assets */}
          <div className="flex items-center gap-2 px-4 sm:px-8 py-1.5 border-b border-border/50 shrink-0 bg-background/95 backdrop-blur-xl">
            {!chapterAIResult && (
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("edit")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "edit"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <PenLine className="h-3 w-3" />
                  Écriture
                </button>
                <button
                  onClick={isPro ? () => setViewMode("visuels") : () => navigate("/dashboard/plans")}
                  title={!isPro ? `Réservé au plan ${planDisplayName("pro")} — cliquez pour vous abonner` : undefined}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    isPro
                      ? viewMode === "visuels"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                      : "text-muted-foreground/60 hover:text-muted-foreground"
                  }`}
                >
                  <Layers className="h-3 w-3" />
                  Cases
                  {isPro && cases.length > 0 && (
                    <span className="ml-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded px-1">
                      {cases.length}
                    </span>
                  )}
                  {!isPro && (
                    <span className="ml-0.5 bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/30 text-[9px] font-bold rounded px-1 tracking-wide">
                      PRO
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Toggle Assets — ON/OFF, uniquement en mode Écriture */}
            {!chapterAIResult && viewMode === "edit" && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => {
                    lastScrollTopRef.current = scrollContainerRef.current?.scrollTop ?? lastScrollTopRef.current;
                    setShowAssets((v) => !v);
                  }}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    showAssets
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-transparent border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Package className="h-3 w-3" />
                  Assets
                  <span
                    className={`h-2 w-2 rounded-full transition-colors ${
                      showAssets ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Zone texte scrollable — UNE scrollbar */}
          <div
            ref={scrollContainerRef}
            className={`flex-1 ${chapterAIResult ? "overflow-hidden flex flex-col min-h-0" : "overflow-y-auto"}`}
            onScroll={(e) => { if (!isTransitioningRef.current) lastScrollTopRef.current = e.currentTarget.scrollTop; }}
          >
            {/* Bandeau de surbrillance doré — navigation depuis Fil d'Ariane */}
            {highlightAnchor && highlightVisible && (
              <div
                className={cn(
                  "sticky top-0 z-10 flex items-center gap-2 px-8 py-2 border-b border-amber-400/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300 transition-opacity duration-500",
                  highlightFading ? "opacity-0" : "opacity-100"
                )}
              >
                <span className="font-semibold shrink-0">Point d'attention :</span>
                <span className="italic text-amber-600/80 dark:text-amber-400/80 line-clamp-1">
                  {highlightAnchor}
                </span>
              </div>
            )}
            {chapterAIResult ? (
              /* Vue deux colonnes — original vs proposition IA */
              <div className="flex gap-0 flex-1 min-h-0 h-full overflow-hidden">
                {/* Colonne gauche — original */}
                <div className="flex-1 flex flex-col min-w-0 px-8 py-8 pb-24 overflow-y-auto">
                  <div className="max-w-xl mx-auto w-full">
                    <div className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" />
                      Original
                    </div>
                    <div className="text-base leading-[1.8] text-muted-foreground/70 whitespace-pre-wrap">
                      {content}
                    </div>
                  </div>
                </div>

                {/* Séparateur */}
                <div className="w-px bg-border/60 shrink-0" />

                {/* Colonne droite — proposition IA */}
                <div className="flex-1 flex flex-col min-w-0 px-8 py-8 pb-24 overflow-y-auto">
                  <div className="max-w-xl mx-auto w-full">
                    <div className="text-xs font-medium text-amber-400 mb-4 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      Proposition IA
                    </div>
                    <div className="text-base leading-[1.8]">
                      <DiffColumns original={content} revised={chapterAIResult} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {!chapterAIResult && (
            <div className="max-w-3xl mx-auto px-8 py-8">
              {viewMode === "visuels" ? (
                /* Vue Cases plate : un bloc = une case numérotée globalement */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      {cases.length > 0 ? (
                        <>
                          {cases.length} case{cases.length > 1 ? "s" : ""}
                          {lockedBlocks.length > 0 && (
                            <span className="text-emerald-500 ml-1.5 font-normal text-xs">
                              · {lockedBlocks.length} validée{lockedBlocks.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </>
                      ) : "Aucune case"}
                    </p>
                    {detectedBlocks.length > 0 && (
                      detectedBlocks.every((d) => lockedKeySet.has(`${d.panel_number}-${d.block_number}`)) ? (
                        <button
                          onClick={unlockAllBlocks}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Circle className="h-3 w-3" />
                          Tout dévalider
                        </button>
                      ) : (
                        <button
                          onClick={lockAllDetected}
                          className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Tout valider
                        </button>
                      )
                    )}
                  </div>

                  {/* Warning si le contenu a changé depuis la dernière détection */}
                  {detectedAtContent !== "" && cases.length > 0 && content !== detectedAtContent && (
                    <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>Le chapitre a été modifié depuis la dernière détection. Cliquez sur «&nbsp;Diviser en cases&nbsp;» pour mettre à jour le découpage.</span>
                    </div>
                  )}

                  {cases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                      <Layers className="h-8 w-8 text-muted-foreground/20" />
                      <p className="text-sm text-muted-foreground">
                        Aucune case détectée. Cliquez sur «&nbsp;Diviser en cases&nbsp;» pour identifier les images à générer.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {cases.map((c, idx) => {
                        const validated = lockedKeySet.has(`${c.panel_number}-${c.block_number}`);
                        return (
                          <div
                            key={`${c.panel_number}-${c.block_number}`}
                            className={`flex gap-3 p-4 rounded-xl border transition-colors ${
                              validated
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : "bg-card/60 border-border hover:border-[hsl(var(--lavender)/0.35)]"
                            }`}
                          >
                            {/* Numéro de case */}
                            <span className={`shrink-0 text-xs font-bold font-mono w-7 h-7 rounded-lg flex items-center justify-center ${
                              validated
                                ? "bg-emerald-500 text-white"
                                : "bg-[hsl(275,45%,55%)] text-white"
                            }`}>
                              {idx + 1}
                            </span>

                            {/* Contenu */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-relaxed text-foreground">
                                {c.description}
                              </p>
                              {c.text_excerpt && (
                                <p className="text-xs text-muted-foreground italic mt-1.5 line-clamp-2 border-l-2 border-border pl-2">
                                  {c.text_excerpt}
                                </p>
                              )}
                            </div>

                            {/* Bouton validation */}
                            <button
                              onClick={() => toggleBlock(c)}
                              title={validated ? "Retirer la validation" : "Valider cette case"}
                              className={`shrink-0 flex items-center justify-center transition-colors ${
                                validated
                                  ? "text-emerald-500 hover:text-destructive"
                                  : "text-muted-foreground/30 hover:text-[hsl(var(--lavender))]"
                              }`}
                            >
                              {validated
                                ? <CheckCircle2 className="h-5 w-5" />
                                : <Circle className="h-5 w-5" />
                              }
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : showAssets ? (
                <>
                  <ScenarioTextHighlighter
                    text={content}
                    assets={assets}
                    wordMappings={wordMappings}
                    onAssignWord={handleAssignWord}
                    onCreateAsset={handleCreateAssetFromText}
                    onDismissMissing={handleDismissMissing}
                    dismissedMissingNames={dismissedMissingNames}
                    className="text-base leading-[1.8]"
                    hideIndicator
                  />
                  <div style={{ height: "40vh" }} />
                </>
              ) : !content.trim() && !isWritingManually ? (
                showInlineAI ? (
                  <div className="flex flex-col gap-5 py-16">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[hsl(var(--lavender)/0.15)]">
                        <Sparkles className="h-5 w-5 text-[hsl(var(--lavender))]" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-lg leading-tight">
                          Générer le Chapitre {chapter.chapter_number}
                        </h3>
                        <span className="text-xs text-muted-foreground">Scénariste IA</span>
                      </div>
                    </div>
                    <Textarea
                      value={inlineAIPrompt}
                      onChange={(e) => setInlineAIPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          handleInlineGeneration();
                        }
                      }}
                      placeholder={`Décrivez ce qui se passe dans le Chapitre ${chapter.chapter_number} : lieu, personnages, événements, rebondissements…`}
                      rows={5}
                      autoFocus
                      className="text-base bg-white/70 dark:bg-card/60 border-[hsl(var(--lavender)/0.25)] rounded-xl focus-visible:border-[hsl(var(--lavender)/0.6)] focus-visible:ring-[hsl(var(--lavender)/0.15)] resize-none"
                    />
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleInlineGeneration}
                        disabled={chapterAI.isPending || !inlineAIPrompt.trim()}
                        className="gap-2 gradient-primary text-primary-foreground px-6 rounded-xl font-semibold shadow-dream hover:shadow-glow transition-shadow"
                      >
                        {chapterAI.isPending ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Génération en cours…</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> Générer</>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { setShowInlineAI(false); setInlineAIPrompt(""); }}
                        disabled={chapterAI.isPending}
                      >
                        Annuler
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Ctrl+Entrée pour générer</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
                    <div className="p-4 rounded-2xl bg-[hsl(var(--lavender)/0.1)]">
                      <PenLine className="h-10 w-10 text-[hsl(var(--lavender))]" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xl font-display font-semibold">Ce chapitre est vide</p>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Générez votre chapitre avec l'IA ou commencez à écrire vous-même.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <Button
                        onClick={() => setShowInlineAI(true)}
                        className="gap-2 gradient-primary text-primary-foreground rounded-xl px-5 shadow-dream"
                      >
                        <Sparkles className="h-4 w-4" />
                        Générer avec l'IA
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsWritingManually(true);
                          setTimeout(() => textareaRef.current?.focus(), 50);
                        }}
                        className="gap-2 rounded-xl px-5 border-[hsl(var(--lavender)/0.35)] text-[hsl(var(--lavender))] hover:bg-[hsl(var(--lavender)/0.08)]"
                      >
                        <PenLine className="h-4 w-4" />
                        Écrire moi-même
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <>
                  <FormatCEditor
                    value={content}
                    onChange={handleContentChange}
                    textareaRef={textareaRef}
                    placeholder="Commencez à écrire votre chapitre..."
                  />
                  <div style={{ height: "40vh" }} />
                </>
              )}
            </div>
            )}
          </div>

        </main>
      </div>

      {/* Barre d'action diff — proposition IA accepter/annuler */}
      {chapterAIResult && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-6 py-3 bg-background/95 backdrop-blur-xl border-t border-border shadow-dream">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              Proposition IA — les passages{" "}
              <span className="text-amber-400 font-medium">surlignés</span>{" "}
              ont été modifiés
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChapterAIResult(null)}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Annuler
            </Button>
            <Button
              size="sm"
              className="gradient-primary text-primary-foreground shadow-dream"
              onClick={() => {
                setContent(chapterAIResult);
                setChapterAIResult(null);
                setChapterAIPrompt("");
                setShowIABar(false);
                toast({ title: "Texte mis à jour" });
              }}
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Remplacer mon texte
            </Button>
          </div>
        </div>
      )}

      {/* Barre IA chapitre — fixed au bas de l'écran pour éviter tout masquage */}
      {showIABar && !chapterAIResult && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-6 py-3 bg-background/95 backdrop-blur-xl border-t border-border shadow-dream">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <Input
            value={chapterAIPrompt}
            onChange={(e) => setChapterAIPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleChapterAI();
              }
            }}
            placeholder="Ex : rends la scène finale plus tendue, améliore les dialogues…"
            className="h-8 text-sm flex-1"
            disabled={chapterAI.isPending}
            autoFocus
          />
          <Button
            size="sm"
            className="h-8 gap-1.5 gradient-primary text-primary-foreground shrink-0"
            onClick={handleChapterAI}
            disabled={chapterAI.isPending || !chapterAIPrompt.trim() || !content.trim()}
          >
            {chapterAI.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Réviser
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => { setShowIABar(false); setChapterAIPrompt(""); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* FABs — pills flottantes bas-droite */}
      {!chapterAIResult && !showIABar && (
        <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2.5 z-40">
          <button
            onClick={() => setShowIABar(true)}
            className="flex items-center gap-2 pl-3.5 pr-4 h-10 rounded-full bg-background/95 backdrop-blur-xl border border-border hover:border-primary/50 shadow-md text-sm font-medium text-primary transition-[box-shadow,border-color,transform] duration-200 hover:shadow-glow hover:scale-[1.03]"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>IA Chapitre</span>
          </button>

          <button
            onClick={isPro ? handleDetectBlocks : () => navigate("/dashboard/plans")}
            disabled={isDetecting || (isPro && !content.trim()) || (isPro && cases.length > 0 && detectedAtContent !== "" && content === detectedAtContent)}
            title={!isPro ? `Réservé au plan ${planDisplayName("pro")} — cliquez pour vous abonner` : undefined}
            className={`flex items-center gap-2 pl-4 pr-5 h-12 rounded-full text-sm font-semibold transition-[box-shadow,transform,opacity] duration-200 disabled:opacity-50 disabled:pointer-events-none ${
              isPro
                ? "gradient-primary text-primary-foreground shadow-dream hover:scale-[1.03]"
                : "bg-white/10 text-white/60 border border-white/15 cursor-pointer hover:bg-white/15"
            }`}
          >
            {isDetecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Découpage en cours…</span>
              </>
            ) : isPro ? (
              <>
                <Scissors className="h-4 w-4 shrink-0" />
                <span>Diviser en cases</span>
              </>
            ) : (
              <>
                <Scissors className="h-4 w-4 shrink-0" />
                <span>Diviser en cases</span>
                <span className="ml-1 text-[11px] bg-amber-400/30 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold tracking-wide">
                  PRO
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* PANNEAU STATS cible — rendu hors flux, accessible via le panneau Stats supprimé */}
      {/* La cible cases est accessible via le chip "~N cases" dans le header */}

      {editingTarget && (
        <div className="fixed bottom-4 right-4 z-50 glass rounded-xl p-4 shadow-dream flex flex-col gap-3 w-64">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Cible cases/chapitre
          </p>
          <div className="flex gap-2">
            <Input
              value={panelsTargetDraft}
              onChange={(e) => setPanelsTargetDraft(e.target.value)}
              type="number"
              min={1}
              max={200}
              className="h-7 text-sm"
              autoFocus
            />
            <Button size="sm" className="h-7 w-7 p-0" onClick={saveTarget}>
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setEditingTarget(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
