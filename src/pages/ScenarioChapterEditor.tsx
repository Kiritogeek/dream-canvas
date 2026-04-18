import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Save,
  Loader2,
  Check,
  X,
  Sparkles,
  Search,
  Lock,
  Wand2,
  PenLine,
  Layers,
  LayoutPanelTop,
  Package,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useScenarioChapter,
  useUpdateScenarioChapter,
} from "@/hooks/useScenarioChapters";
import { useProject, useUpdateProject } from "@/hooks/useProjects";
import { useAssets } from "@/hooks/useAssets";
import { useScenarioAI } from "@/hooks/useScenarioAI";
import { callDetectBlocks, callGenerateAiSummary } from "@/services/scenarioAI";
import { estimatePanelCount } from "@/services/panels";
import { TextDiff, TextDiffLegend } from "@/components/ui/TextDiff";
import { ScenarioTextHighlighter } from "@/components/project/ScenarioTextHighlighter";
import { useToast } from "@/hooks/use-toast";
import type { LockedBlock, DetectedBlock } from "@/types";

// NOTE : Les colonnes `ai_summary` et `locked_blocks` n'existent pas (encore)
// dans le schéma `scenario_chapters`. On garde ces données en état local
// pendant la session. Quand la migration sera ajoutée, il suffira de passer
// ces champs dans `updateChapter.mutate({ updates: { ... } })`.

// ═══════════════════════════════════════════════════════════════
// Sous-composants
// ═══════════════════════════════════════════════════════════════

function StatRow({
  icon,
  label,
  value,
  note,
  valueColor,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note?: string;
  valueColor?: "emerald";
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      <div className="text-right">
        <span
          className={`text-sm font-semibold ${
            valueColor === "emerald" ? "text-emerald-500" : "text-foreground"
          }`}
        >
          {value}
        </span>
        {note && (
          <span className="text-xs text-muted-foreground ml-1.5">{note}</span>
        )}
      </div>
    </div>
  );
}

// ─── AnnotatedTextView ─────────────────────────────────────────

interface AnnotatedSegment {
  text: string;
  panelNumber?: number;
  isLocked?: boolean;
}

function buildSegments(
  content: string,
  detectedBlocks: DetectedBlock[],
  lockedBlocks: LockedBlock[]
): AnnotatedSegment[] {
  // Merge : les blocs verrouillés ont priorité sur les détectés pour le même numéro
  const allBlocks = [
    ...lockedBlocks.map((b) => ({
      panel_number: b.panel_number,
      text_excerpt: b.text_excerpt,
      isLocked: true,
    })),
    ...detectedBlocks
      .filter(
        (d) => !lockedBlocks.some((l) => l.panel_number === d.panel_number)
      )
      .map((d) => ({
        panel_number: d.panel_number,
        text_excerpt: d.text_excerpt,
        isLocked: false,
      })),
  ];

  const positioned = allBlocks
    .map((b) => ({ ...b, start: content.indexOf(b.text_excerpt) }))
    .filter((b) => b.start >= 0)
    .sort((a, b) => a.start - b.start);

  if (positioned.length === 0) return [{ text: content }];

  const segments: AnnotatedSegment[] = [];
  let cursor = 0;

  for (const { panel_number, text_excerpt, start, isLocked } of positioned) {
    const end = start + text_excerpt.length;
    if (start < cursor) continue; // éviter les chevauchements
    if (start > cursor) segments.push({ text: content.slice(cursor, start) });
    segments.push({
      text: content.slice(start, end),
      panelNumber: panel_number,
      isLocked,
    });
    cursor = end;
  }
  if (cursor < content.length) segments.push({ text: content.slice(cursor) });

  return segments;
}

interface AnnotatedTextViewProps {
  content: string;
  detectedBlocks: DetectedBlock[];
  lockedBlocks: LockedBlock[];
  onToggleBlock: (block: DetectedBlock) => void;
  onUnlockBlock: (panelNumber: number) => void;
}

function AnnotatedTextView({
  content,
  detectedBlocks,
  lockedBlocks,
  onToggleBlock,
  onUnlockBlock,
}: AnnotatedTextViewProps) {
  const segments = buildSegments(content, detectedBlocks, lockedBlocks);

  return (
    <div className="text-base leading-[1.8] whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.panelNumber === undefined) {
          return <span key={i}>{seg.text}</span>;
        }

        const isLocked = seg.isLocked;
        const detectedBlock = detectedBlocks.find(
          (b) => b.panel_number === seg.panelNumber
        );

        return (
          <span key={i} className="relative group">
            <span
              className={`relative inline rounded-sm px-0.5 ${
                isLocked
                  ? "bg-emerald-500/15 border-l-2 border-emerald-500 pl-1"
                  : "bg-primary/10 border-l-2 border-primary pl-1"
              }`}
            >
              <span
                className={`absolute -left-7 top-0 text-[10px] font-bold font-mono px-1 py-0.5 rounded select-none ${
                  isLocked
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-primary/15 text-primary"
                }`}
              >
                P{seg.panelNumber}
              </span>
              {seg.text}
              <span className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => {
                    if (isLocked) {
                      onUnlockBlock(seg.panelNumber!);
                    } else if (detectedBlock) {
                      onToggleBlock(detectedBlock);
                    }
                  }}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded shadow-sm border transition-colors ${
                    isLocked
                      ? "bg-background border-emerald-500/30 text-emerald-600 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      : "bg-background border-primary/30 text-primary hover:bg-primary/10"
                  }`}
                >
                  {isLocked ? "Déverr." : "Verrouiller"}
                </button>
              </span>
            </span>
          </span>
        );
      })}
    </div>
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

  // Data
  const { data: chapter, isLoading: isLoadingChapter } =
    useScenarioChapter(chapterId);
  const { data: project } = useProject(projectId);
  const { data: assets = [] } = useAssets(projectId);
  const updateChapter = useUpdateScenarioChapter();
  const updateProject = useUpdateProject();
  const chapterAI = useScenarioAI();

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

  // Local state — IA barre
  const [showIABar, setShowIABar] = useState(false);

  // Local state — sélection / IA
  const [selectedText, setSelectedText] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);
  const [passagePrompt, setPassagePrompt] = useState("");
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

  // Ref pour éviter de marquer "dirty" pendant la synchro initiale
  const initialSyncDoneRef = useRef(false);

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
        description: string;
        text_excerpt: string;
        locked?: boolean;
      };
      const outline = chapter.panels_outline;
      if (Array.isArray(outline) && outline.length > 0) {
        const stored = outline as StoredBlock[];
        const detected: DetectedBlock[] = stored.map(
          ({ panel_number, description, text_excerpt }) => ({
            panel_number,
            description,
            text_excerpt,
          })
        );
        const locked: LockedBlock[] = stored
          .filter((b) => b.locked)
          .map((b) => ({
            id: `${b.panel_number}-restored`,
            panel_number: b.panel_number,
            description: b.description,
            text_excerpt: b.text_excerpt,
          }));
        setDetectedBlocks(detected);
        setLockedBlocks(locked);
        setViewMode("visuels");
      } else {
        setDetectedBlocks([]);
        setLockedBlocks([]);
        setViewMode("edit");
      }
    }
    // WHY : ne resync que lorsque l'id change (ex : navigation chapitre)
    // — sinon l'auto-save overwrite-erait les frappes en cours.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter?.id]);

  // ── Auto-resize textarea ─────────────────────────────────────

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [content, viewMode]);

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
            if (words >= 50) {
              // Fire-and-forget : résumé IA (non persistant tant que la colonne
              // n'existe pas côté DB). On ignore silencieusement toute erreur.
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

  // ── Textarea selection ───────────────────────────────────────

  const handleTextareaSelect = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end } = ta;
    if (end > start && content.slice(start, end).trim().length > 10) {
      setSelectedText({ text: content.slice(start, end), start, end });
    } else {
      setSelectedText(null);
    }
  }, [content]);

  // ── Modifier un passage via l'IA ──────────────────────────────

  const handleModifyPassage = useCallback(() => {
    if (!chapter || !selectedText || !passagePrompt.trim()) return;
    chapterAI.mutate(
      {
        mode: "chapter",
        prompt: passagePrompt.trim(),
        chapter_title: chapter.title,
        chapter_content: selectedText.text,
        chapter_number: chapter.chapter_number,
      },
      {
        onSuccess: (data) => {
          const newContent =
            content.slice(0, selectedText.start) +
            data.text +
            content.slice(selectedText.end);
          setContent(newContent);
          setSelectedText(null);
          setPassagePrompt("");
          toast({ title: "Passage modifié par l'IA" });
        },
        onError: (err) =>
          toast({
            title: "Erreur IA",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  }, [chapter, selectedText, passagePrompt, chapterAI, content, toast]);

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
        target_panel_count: estimatePanelCount(content),
      });
      setDetectedBlocks(result.blocks);
      if (result.blocks.length === 0) {
        toast({
          title: "Aucun panel détecté",
          description: "Le chapitre est peut-être trop court.",
        });
      } else {
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
  }, [chapter, content, project, toast]);

  // ── Toggle / unlock un bloc ──────────────────────────────────

  const savePanelsOutline = useCallback(
    (detected: DetectedBlock[], locked: LockedBlock[]) => {
      if (!chapter || detected.length === 0) return;
      updateChapter.mutate({
        id: chapter.id,
        projectId: projectId!,
        updates: {
          panels_outline: detected.map((b) => ({
            ...b,
            locked: locked.some((l) => l.panel_number === b.panel_number),
          })),
        },
      });
    },
    [chapter, projectId, updateChapter]
  );

  const toggleBlock = useCallback(
    (block: DetectedBlock) => {
      const isLocked = lockedBlocks.some(
        (b) => b.panel_number === block.panel_number
      );
      const newLocked = isLocked
        ? lockedBlocks.filter((b) => b.panel_number !== block.panel_number)
        : [
            ...lockedBlocks,
            {
              id: `${block.panel_number}-${Date.now()}`,
              panel_number: block.panel_number,
              description: block.description,
              text_excerpt: block.text_excerpt,
            },
          ].sort((a, b) => a.panel_number - b.panel_number);
      setLockedBlocks(newLocked);
      savePanelsOutline(detectedBlocks, newLocked);
    },
    [lockedBlocks, detectedBlocks, savePanelsOutline]
  );

  const unlockBlock = useCallback(
    (panelNumber: number) => {
      const newLocked = lockedBlocks.filter(
        (b) => b.panel_number !== panelNumber
      );
      setLockedBlocks(newLocked);
      savePanelsOutline(detectedBlocks, newLocked);
    },
    [lockedBlocks, detectedBlocks, savePanelsOutline]
  );

  const lockAllDetected = useCallback(() => {
    const newBlocks: LockedBlock[] = detectedBlocks
      .filter((d) => !lockedBlocks.some((l) => l.panel_number === d.panel_number))
      .map((d) => ({
        id: `${d.panel_number}-${Date.now()}`,
        panel_number: d.panel_number,
        description: d.description,
        text_excerpt: d.text_excerpt,
      }));
    if (newBlocks.length > 0) {
      const newLocked = [...lockedBlocks, ...newBlocks].sort(
        (a, b) => a.panel_number - b.panel_number
      );
      setLockedBlocks(newLocked);
      savePanelsOutline(detectedBlocks, newLocked);
    }
  }, [detectedBlocks, lockedBlocks, savePanelsOutline]);

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

  // ── Assets détectés dans le texte ────────────────────────────

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

  const targetPanels = project?.panels_target_per_chapter ?? null;
  const progressPct =
    readingInfo && targetPanels
      ? Math.min(100, Math.round((readingInfo.panels / targetPanels) * 100))
      : 0;
  const hasVisuals = detectedBlocks.length > 0 || lockedBlocks.length > 0;

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

        {/* Zone droite : stats chips OU boutons diff selon le mode */}
        {chapterAIResult ? (
          /* Mode diff : Accepter / Rejeter */
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="h-7 gap-1.5 gradient-primary text-primary-foreground text-xs"
              onClick={() => {
                setContent(chapterAIResult);
                setChapterAIResult(null);
                setChapterAIPrompt("");
                setShowIABar(false);
                toast({ title: "Version acceptée" });
              }}
            >
              <Check className="h-3 w-3" />
              Accepter
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setChapterAIResult(null)}
            >
              <X className="h-3 w-3" />
              Rejeter
            </Button>
          </div>
        ) : (
          /* Mode normal : chips stats + boutons action */
          <div className="flex items-center gap-2 shrink-0">
            {readingInfo && (
              <>
                <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
                  <Type className="h-3 w-3" />
                  {readingInfo.words.toLocaleString("fr-FR")} mots
                </span>
                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full px-2.5 py-1">
                  <LayoutPanelTop className="h-3 w-3" />
                  ~{readingInfo.panels} panels
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
        )}

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
                  {detectedBlocks.length > 0 && (
                    <span className="ml-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded px-1">
                      {detectedBlocks.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Toggle Assets — ON/OFF indépendant */}
            {!chapterAIResult && (
              <button
                onClick={() => setShowAssets((v) => !v)}
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
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-8">
              {chapterAIResult ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <TextDiffLegend />
                  </div>
                  <TextDiff oldText={content} newText={chapterAIResult} />
                </>
              ) : viewMode === "visuels" ? (
                /* Vue Panels : cartes au centre, remplace le texte */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      {detectedBlocks.length} panel{detectedBlocks.length > 1 ? "s" : ""}
                      {lockedBlocks.length > 0 && (
                        <span className="text-emerald-500 ml-1.5 font-normal text-xs">
                          · {lockedBlocks.length} verrouillé{lockedBlocks.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </p>
                    {detectedBlocks.length > 0 && (
                      <button
                        onClick={lockAllDetected}
                        disabled={detectedBlocks.every((d) =>
                          lockedBlocks.some((l) => l.panel_number === d.panel_number)
                        )}
                        className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      >
                        <Lock className="h-3 w-3" />
                        Tout verrouiller
                      </button>
                    )}
                  </div>

                  {detectedBlocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                      <Layers className="h-8 w-8 text-muted-foreground/20" />
                      <p className="text-sm text-muted-foreground">
                        Aucun panel détecté. Cliquez sur «&nbsp;Détecter les panels&nbsp;» pour identifier les images à générer.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {detectedBlocks.map((block) => {
                        const isLocked = lockedBlocks.some(
                          (b) => b.panel_number === block.panel_number
                        );
                        return (
                          <div
                            key={block.panel_number}
                            className={`rounded-xl border p-4 space-y-2.5 transition-colors ${
                              isLocked
                                ? "border-emerald-500/40 bg-emerald-500/5"
                                : "border-border bg-card/60 hover:border-primary/30"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                                  isLocked
                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : "bg-primary/15 text-primary"
                                }`}
                              >
                                Panel {block.panel_number}
                              </span>
                              <button
                                onClick={() => toggleBlock(block)}
                                className={`text-xs font-medium px-2 py-0.5 rounded border transition-colors ${
                                  isLocked
                                    ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                                    : "border-primary/30 text-primary hover:bg-primary/10"
                                }`}
                              >
                                {isLocked ? "Déverr." : "Verrouiller"}
                              </button>
                            </div>
                            <p className="text-sm font-medium leading-snug text-foreground">
                              {block.description}
                            </p>
                            <p className="text-xs text-muted-foreground italic line-clamp-2">
                              « {block.text_excerpt} »
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : showAssets ? (
                <ScenarioTextHighlighter
                  text={content}
                  assets={assets}
                  onCreateAsset={undefined}
                  className="text-base leading-[1.8]"
                  hideIndicator
                />
              ) : (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onMouseUp={handleTextareaSelect}
                  onKeyUp={handleTextareaSelect}
                  placeholder="Commencez à écrire votre chapitre..."
                  className="w-full resize-none bg-transparent border-0 focus:ring-0 focus:outline-none text-base leading-[1.8] placeholder:text-muted-foreground/40 min-h-[300px]"
                  style={{ height: "auto" }}
                />
              )}
            </div>
          </div>

          {/* Barre sélection */}
          {selectedText && viewMode === "edit" && !chapterAIResult && (
            <div className="flex items-center gap-3 px-6 py-3 bg-background/95 backdrop-blur border-t border-border shrink-0">
              <Pencil className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-xs text-muted-foreground italic flex-1 truncate">
                « {selectedText.text.slice(0, 60)}
                {selectedText.text.length > 60 ? "…" : ""} »
              </span>
              <Input
                value={passagePrompt}
                onChange={(e) => setPassagePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleModifyPassage();
                }}
                placeholder="Instruction pour l'IA…"
                className="h-8 text-sm w-64"
              />
              <Button
                size="sm"
                className="h-8 gap-1 gradient-primary text-primary-foreground"
                onClick={handleModifyPassage}
                disabled={!passagePrompt.trim() || chapterAI.isPending}
              >
                {chapterAI.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                Modifier
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedText(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

        </main>
      </div>

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
            className="flex items-center gap-2 pl-3.5 pr-4 h-10 rounded-full bg-background/95 backdrop-blur-xl border border-border hover:border-primary/50 shadow-md text-sm font-medium text-primary transition-all duration-200 hover:shadow-glow hover:scale-[1.03]"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>IA Chapitre</span>
          </button>

          <button
            onClick={handleDetectBlocks}
            disabled={isDetecting || !content.trim()}
            className="flex items-center gap-2 pl-4 pr-5 h-12 rounded-full gradient-primary text-primary-foreground shadow-dream text-sm font-semibold transition-all duration-200 hover:scale-[1.03] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isDetecting ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Search className="h-4 w-4 shrink-0" />
            )}
            <span>{isDetecting ? "Analyse…" : "Détecter les panels"}</span>
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
