import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Save,
  Loader2,
  Check,
  X,
  Sparkles,
  Scissors,
  Lock,
  Unlock,
  PenLine,
  Layers,
  LayoutPanelTop,
  Package,
  Type,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useScenarioChapter,
  useUpdateScenarioChapter,
} from "@/hooks/useScenarioChapters";
import { useProject, useUpdateProject } from "@/hooks/useProjects";
import { useAssets } from "@/hooks/useAssets";
import { useScenarioAI } from "@/hooks/useScenarioAI";
import { useUserPlan } from "@/hooks/useUserPlan";
import { callDetectBlocks, callGenerateAiSummary } from "@/services/scenarioAI";
import { estimatePanelCount } from "@/services/panels";
import { ScenarioTextHighlighter } from "@/components/project/ScenarioTextHighlighter";
import { useToast } from "@/hooks/use-toast";
import type { LockedBlock, DetectedBlock, AssetType } from "@/types";

// ─── FormatCEditor ─────────────────────────────────────────────

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

function renderFormatCHighlight(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, i) => {
    let span: React.ReactNode;

    const scenePrefix = line.match(/^(###\s)/)?.[1];
    const blockquotePrefix = line.match(/^(>\s*)/)?.[1];

    if (scenePrefix) {
      span = (
        <span key={`h-${i}`} style={{ color: "hsl(275, 45%, 60%)", fontWeight: 700 }}>
          {line.slice(scenePrefix.length)}
        </span>
      );
    } else if (blockquotePrefix) {
      const rest = line.slice(blockquotePrefix.length);
      const color = /^Personnages\s*:/i.test(rest)
        ? "hsl(275, 38%, 55%)"
        : "hsl(170, 40%, 55%)";
      span = <span key={`h-${i}`} style={{ color }}>{rest}</span>;
    } else if (/^-{3,}\s*$/.test(line)) {
      span = (
        <span key={`h-${i}`} style={{ color: "hsl(0, 0%, 58%)" }}>
          {line}
        </span>
      );
    } else if (/«/.test(line)) {
      span = (
        <span key={`h-${i}`} style={{ fontStyle: "italic", color: "hsl(275, 22%, 52%)" }}>
          {line}
        </span>
      );
    } else {
      span = (
        <span key={`h-${i}`} style={{ color: "hsl(var(--foreground))" }}>
          {line}
        </span>
      );
    }
    nodes.push(span);
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

function FormatCEditor({ value, onChange, textareaRef, placeholder }: FormatCEditorProps) {
  return (
    <div className="relative min-h-[300px]">
      {/* Highlight layer — in-flow, drives container height */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none"
        style={{ ...EDITOR_FONT_STYLE, minHeight: 300 }}
      >
        {value ? renderFormatCHighlight(value) : (
          <span style={{ color: "transparent" }}>{placeholder ?? " "}</span>
        )}
      </div>
      {/* Transparent textarea overlay */}
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
  const { data: assets = [] } = useAssets(projectId);
  const updateChapter = useUpdateScenarioChapter();
  const updateProject = useUpdateProject();
  const chapterAI = useScenarioAI();
  const { plan } = useUserPlan();
  const isPro = plan === "pro";

  // Local state — content / title
  const [content, setContent] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);

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

  // ── Sync content depuis la BDD (chargement initial) ──────────

  useEffect(() => {
    if (chapter) {
      setContent(chapter.content ?? "");
      setTitleDraft(chapter.title);
      initialSyncDoneRef.current = true;
      setSaveState("clean");

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
        setViewMode("visuels");
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
      const result = await callDetectBlocks({
        mode: "detect_blocks",
        chapter_content: content,
        chapter_title: chapter.title,
        chapter_number: chapter.chapter_number,
      });
      setDetectedBlocks(result.blocks);
      if (result.blocks.length === 0) {
        toast({
          title: "Aucun panel détecté",
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

  // ── Grouper les blocs détectés par panel ──────────────────────

  const groupedPanels = useMemo(() => {
    const map = new Map<number, DetectedBlock[]>();
    for (const block of detectedBlocks) {
      const arr = map.get(block.panel_number) ?? [];
      arr.push(block);
      map.set(block.panel_number, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([panelNumber, blocks]) => ({
        panelNumber,
        blocks: [...blocks].sort((a, b) => a.block_number - b.block_number),
      }));
  }, [detectedBlocks]);

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

  const handleCreateAssetFromText = useCallback((_name: string, _type: AssetType) => {
    navigate(`/dashboard/projects/${projectId}?tab=assets`);
  }, [navigate, projectId]);

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
        {/* Breadcrumb gauche */}
        <Link
          to={`/dashboard/projects/${projectId}?tab=scenario`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-medium">{project?.title ?? "Scénario"}</span>
        </Link>

        <span className="text-muted-foreground/40 text-sm shrink-0">/</span>
        <span className="text-sm text-muted-foreground shrink-0">Scénario</span>
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
                <LayoutPanelTop className="h-3 w-3" />
                {groupedPanels.length > 0
                  ? `${groupedPanels.length} panel${groupedPanels.length > 1 ? "s" : ""}`
                  : `~${readingInfo.panels} panels`}
              </span>
              {lockedBlocks.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1">
                  <Lock className="h-3 w-3" />
                  {lockedBlocks.length} verrouillé{lockedBlocks.length > 1 ? "s" : ""}
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
          {/* Toolbar fine — toggle Écriture/Panels + toggle Assets */}
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
                  onClick={() => setViewMode("visuels")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "visuels"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-3 w-3" />
                  Panels
                  {groupedPanels.length > 0 && (
                    <span className="ml-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded px-1">
                      {groupedPanels.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Toggle Assets — ON/OFF, uniquement en mode Écriture */}
            {!chapterAIResult && viewMode === "edit" && (
              <button
                onClick={() => {
                  lastScrollTopRef.current = scrollContainerRef.current?.scrollTop ?? lastScrollTopRef.current;
                  setShowAssets((v) => !v);
                }}
                className={`ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
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
            )}
          </div>

          {/* Zone texte scrollable — UNE scrollbar */}
          <div
            ref={scrollContainerRef}
            className={`flex-1 ${chapterAIResult ? "overflow-hidden flex flex-col min-h-0" : "overflow-y-auto"}`}
            onScroll={(e) => { if (!isTransitioningRef.current) lastScrollTopRef.current = e.currentTarget.scrollTop; }}
          >
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
                /* Vue Panels groupés : N panels, chacun contenant ses blocs */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      {groupedPanels.length > 0 ? (
                        <>
                          {groupedPanels.length} panel{groupedPanels.length > 1 ? "s" : ""}
                          <span className="text-muted-foreground ml-1.5 font-normal text-xs">
                            · {detectedBlocks.length} blocs
                          </span>
                        </>
                      ) : "Aucun panel"}
                      {lockedBlocks.length > 0 && (
                        <span className="text-emerald-500 ml-1.5 font-normal text-xs">
                          · {lockedBlocks.length} verrouillé{lockedBlocks.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </p>
                    {detectedBlocks.length > 0 && (
                      detectedBlocks.every((d) => lockedKeySet.has(`${d.panel_number}-${d.block_number}`)) ? (
                        <button
                          onClick={unlockAllBlocks}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Unlock className="h-3 w-3" />
                          Tout déverrouiller
                        </button>
                      ) : (
                        <button
                          onClick={lockAllDetected}
                          className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
                        >
                          <Lock className="h-3 w-3" />
                          Tout verrouiller
                        </button>
                      )
                    )}
                  </div>

                  {/* P2 — warning si le contenu a changé depuis la dernière détection */}
                  {detectedAtContent !== "" && groupedPanels.length > 0 && content !== detectedAtContent && (
                    <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>Le chapitre a été modifié depuis la dernière détection. Cliquez sur «&nbsp;Diviser en panels&nbsp;» pour mettre à jour le découpage.</span>
                    </div>
                  )}

                  {groupedPanels.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                      <Layers className="h-8 w-8 text-muted-foreground/20" />
                      <p className="text-sm text-muted-foreground">
                        Aucun panel détecté. Cliquez sur «&nbsp;Diviser en panels&nbsp;» pour identifier les images à générer.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {groupedPanels.map(({ panelNumber, blocks }) => {
                        const panelLockedCount = blocks.filter((b) => lockedKeySet.has(`${b.panel_number}-${b.block_number}`)).length;
                        return (
                          <div
                            key={panelNumber}
                            className="w-full rounded-xl border border-border bg-card/60 flex flex-col overflow-hidden"
                          >
                            {/* En-tête panel */}
                            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[hsl(var(--lavender)/0.08)] border-b border-[hsl(var(--lavender)/0.15)]">
                              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-[hsl(var(--lavender)/0.15)] text-[hsl(275,45%,55%)]">
                                Panel {panelNumber}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {blocks.length} bloc{blocks.length > 1 ? "s" : ""}
                                </span>
                                {panelLockedCount > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                    · {panelLockedCount} <Lock className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Liste des blocs */}
                            <div className="divide-y divide-border/40">
                              {blocks.map((block) => {
                                const locked = lockedKeySet.has(`${block.panel_number}-${block.block_number}`);
                                return (
                                  <div
                                    key={`${panelNumber}-${block.block_number}`}
                                    className={`flex gap-3 px-4 py-3 transition-colors ${
                                      locked ? "bg-emerald-500/5" : "hover:bg-muted/30"
                                    }`}
                                  >
                                    {/* Numéro de bloc */}
                                    <span className={`shrink-0 mt-0.5 text-[10px] font-bold font-mono w-5 h-5 rounded flex items-center justify-center ${
                                      locked
                                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                        : "bg-muted text-muted-foreground"
                                    }`}>
                                      {block.block_number}
                                    </span>

                                    {/* Contenu */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm leading-relaxed text-foreground">
                                        {block.description}
                                      </p>
                                      {block.text_excerpt && (
                                        <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2 border-l-2 border-border pl-2">
                                          {block.text_excerpt}
                                        </p>
                                      )}
                                    </div>

                                    {/* Bouton lock */}
                                    <button
                                      onClick={() => toggleBlock(block)}
                                      title={locked ? "Déverrouiller" : "Verrouiller"}
                                      className={`shrink-0 mt-0.5 h-6 w-6 flex items-center justify-center rounded border transition-colors ${
                                        locked
                                          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                                      }`}
                                    >
                                      {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
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
                    onCreateAsset={handleCreateAssetFromText}
                    onDismissMissing={handleDismissMissing}
                    dismissedMissingNames={dismissedMissingNames}
                    className="text-base leading-[1.8]"
                    hideIndicator
                  />
                  <div style={{ height: "40vh" }} />
                </>
              ) : (
                <>
                  <FormatCEditor
                    value={content}
                    onChange={setContent}
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
            disabled={isDetecting || (isPro && !content.trim()) || (isPro && groupedPanels.length > 0 && detectedAtContent !== "" && content === detectedAtContent)}
            title={!isPro ? "Fonctionnalité Pro — Cliquez pour mettre à niveau" : undefined}
            className={`flex items-center gap-2 pl-4 pr-5 h-12 rounded-full text-sm font-semibold transition-[box-shadow,transform,opacity] duration-200 disabled:opacity-50 disabled:pointer-events-none ${
              isPro
                ? "gradient-primary text-primary-foreground shadow-dream hover:scale-[1.03]"
                : "bg-white/10 text-white/60 border border-white/15 cursor-pointer hover:bg-white/15"
            }`}
          >
            {isDetecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Division en cours…</span>
              </>
            ) : isPro ? (
              <>
                <Scissors className="h-4 w-4 shrink-0" />
                <span>Diviser en panels</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 shrink-0" />
                <span>Diviser en panels</span>
                <span className="ml-1 text-[11px] bg-amber-400/30 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold tracking-wide">
                  PRO
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* PANNEAU STATS cible — rendu hors flux, accessible via le panneau Stats supprimé */}
      {/* La cible panels est désormais accessible via le chip "~N panels" dans le header */}
      {editingTarget && (
        <div className="fixed bottom-4 right-4 z-50 glass rounded-xl p-4 shadow-dream flex flex-col gap-3 w-64">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Cible panels/chapitre
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
