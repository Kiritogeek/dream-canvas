import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
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
  BarChart2,
  Lock,
  Wand2,
  PenLine,
  Layers,
  LayoutPanelTop,
  Package,
  Type,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState<
    "stats" | "panels" | "ia" | "assets"
  >("stats");
  const [viewMode, setViewMode] = useState<"edit" | "visuels">("edit");
  const [saveState, setSaveState] = useState<"clean" | "dirty" | "saving">(
    "clean"
  );

  // Local state — blocs
  const [lockedBlocks, setLockedBlocks] = useState<LockedBlock[]>([]);
  const [detectedBlocks, setDetectedBlocks] = useState<DetectedBlock[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

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
    setActiveTab("panels");
    try {
      const result = await callDetectBlocks({
        mode: "detect_blocks",
        chapter_content: content,
        chapter_title: chapter.title,
        chapter_number: chapter.chapter_number,
        target_panel_count: project?.panels_target_per_chapter ?? undefined,
      });
      setDetectedBlocks(result.blocks);
      if (result.blocks.length === 0) {
        toast({
          title: "Aucun panel détecté",
          description: "Le chapitre est peut-être trop court.",
        });
      } else {
        setViewMode("visuels");
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

  const toggleBlock = useCallback(
    (block: DetectedBlock) => {
      const isLocked = lockedBlocks.some(
        (b) => b.panel_number === block.panel_number
      );
      if (isLocked) {
        setLockedBlocks((prev) =>
          prev.filter((b) => b.panel_number !== block.panel_number)
        );
      } else {
        const newBlock: LockedBlock = {
          id: `${block.panel_number}-${Date.now()}`,
          panel_number: block.panel_number,
          description: block.description,
          text_excerpt: block.text_excerpt,
        };
        setLockedBlocks((prev) =>
          [...prev, newBlock].sort((a, b) => a.panel_number - b.panel_number)
        );
      }
    },
    [lockedBlocks]
  );

  const unlockBlock = useCallback((panelNumber: number) => {
    setLockedBlocks((prev) =>
      prev.filter((b) => b.panel_number !== panelNumber)
    );
  }, []);

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
  const totalPanelsCount = detectedBlocks.length + lockedBlocks.length;
  const hasVisuals = detectedBlocks.length > 0 || lockedBlocks.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* HEADER */}
      <header className="h-12 border-b border-border bg-background/95 backdrop-blur-xl sticky top-0 z-30 flex items-center gap-4 px-4 sm:px-6 shrink-0">
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
        {/* ZONE TEXTE */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar zone texte */}
          <div className="flex items-center gap-2 px-4 sm:px-8 py-2 border-b border-border/50 shrink-0">
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
                disabled={!hasVisuals}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "visuels"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                } disabled:opacity-40 disabled:pointer-events-none`}
              >
                <Layers className="h-3 w-3" />
                Visuels
                {totalPanelsCount > 0 && (
                  <span className="ml-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded px-1">
                    {totalPanelsCount}
                  </span>
                )}
              </button>
            </div>

            {viewMode === "visuels" && (
              <span className="text-xs text-muted-foreground italic ml-2">
                Survolez un passage pour verrouiller / déverrouiller
              </span>
            )}
          </div>

          {/* Wrapper scrollable — UNE SEULE scrollbar */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-8">
              {viewMode === "edit" ? (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onMouseUp={handleTextareaSelect}
                  onKeyUp={handleTextareaSelect}
                  placeholder="Commencez à écrire votre chapitre..."
                  className="w-full resize-none bg-transparent border-0 focus:ring-0 focus:outline-none text-base leading-[1.8] placeholder:text-muted-foreground/40 min-h-[calc(100vh-200px)]"
                  style={{ height: "auto" }}
                />
              ) : (
                <AnnotatedTextView
                  content={content}
                  detectedBlocks={detectedBlocks}
                  lockedBlocks={lockedBlocks}
                  onToggleBlock={toggleBlock}
                  onUnlockBlock={unlockBlock}
                />
              )}
            </div>
          </div>

          {/* Barre sélection */}
          {selectedText && viewMode === "edit" && (
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

        {/* PANNEAU DROIT */}
        <aside className="w-72 shrink-0 border-l border-border flex flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="w-full flex flex-col flex-1 overflow-hidden"
          >
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-2 shrink-0">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="stats" className="text-xs">
                  <BarChart2 className="h-3.5 w-3.5 mr-1" />
                  Stats
                </TabsTrigger>
                <TabsTrigger value="panels" className="text-xs">
                  <LayoutPanelTop className="h-3.5 w-3.5 mr-1" />
                  Panels
                </TabsTrigger>
                <TabsTrigger value="ia" className="text-xs">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  IA
                </TabsTrigger>
                <TabsTrigger value="assets" className="text-xs">
                  <Package className="h-3.5 w-3.5 mr-1" />
                  Assets
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Onglet Stats */}
              <TabsContent value="stats" className="mt-0">
                <div className="p-4 space-y-5">
                  <div className="space-y-3">
                    <StatRow
                      icon={<Type className="h-3.5 w-3.5 text-primary" />}
                      label="Mots"
                      value={
                        readingInfo?.words.toLocaleString("fr-FR") ?? "0"
                      }
                    />
                    <StatRow
                      icon={
                        <LayoutPanelTop className="h-3.5 w-3.5 text-amber-500" />
                      }
                      label="Panels estimés"
                      value={readingInfo ? `~${readingInfo.panels}` : "—"}
                      note={
                        targetPanels ? `cible : ${targetPanels}` : undefined
                      }
                    />
                    <StatRow
                      icon={<Clock className="h-3.5 w-3.5 text-mint" />}
                      label="Lecture"
                      value={readingInfo ? `~${readingInfo.minutes} min` : "—"}
                    />
                    {lockedBlocks.length > 0 && (
                      <StatRow
                        icon={<Lock className="h-3.5 w-3.5 text-emerald-500" />}
                        label="Panels verrouillés"
                        value={String(lockedBlocks.length)}
                        valueColor="emerald"
                      />
                    )}
                  </div>

                  <div className="border-t border-border/50" />

                  {/* Cible panels */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Cible panels/chapitre
                      </p>
                      {!editingTarget && (
                        <button
                          onClick={() => {
                            setPanelsTargetDraft(
                              String(project?.panels_target_per_chapter ?? 40)
                            );
                            setEditingTarget(true);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Modifier
                        </button>
                      )}
                    </div>
                    {editingTarget ? (
                      <div className="flex gap-2">
                        <Input
                          value={panelsTargetDraft}
                          onChange={(e) =>
                            setPanelsTargetDraft(e.target.value)
                          }
                          type="number"
                          min={1}
                          max={200}
                          className="h-7 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={saveTarget}
                        >
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
                    ) : (
                      <p className="text-2xl font-bold font-display text-foreground">
                        {project?.panels_target_per_chapter ?? "—"}
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                          panels
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Progression */}
                  {readingInfo && targetPanels ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progression vers la cible</span>
                        <span
                          className={
                            progressPct >= 90
                              ? "text-emerald-500 font-medium"
                              : ""
                          }
                        >
                          {progressPct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-primary/15 overflow-hidden">
                        <div
                          className="h-full rounded-full gradient-primary transition-all duration-700"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              {/* Onglet Panels */}
              <TabsContent value="panels" className="mt-0">
                <div className="p-4 space-y-4">
                  <p className="text-xs text-muted-foreground italic mb-3">
                    Identifiez les moments qui deviendront des{" "}
                    <strong className="text-foreground">images</strong> dans
                    votre webtoon.
                  </p>

                  <Button
                    onClick={handleDetectBlocks}
                    disabled={isDetecting || !content.trim()}
                    className="w-full gap-2 gradient-primary text-primary-foreground"
                    size="default"
                  >
                    {isDetecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyse en cours…
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Détecter les panels
                      </>
                    )}
                  </Button>

                  {lockedBlocks.length > 0 && detectedBlocks.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                      <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>
                        {lockedBlocks.length} panel
                        {lockedBlocks.length > 1 ? "s" : ""} verrouillé
                        {lockedBlocks.length > 1 ? "s" : ""} depuis la dernière
                        détection.
                      </span>
                    </div>
                  )}

                  {detectedBlocks.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {detectedBlocks.length} panels suggérés
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1"
                          onClick={() => setDetectedBlocks([])}
                        >
                          <X className="h-3 w-3" /> Fermer
                        </Button>
                      </div>
                      {detectedBlocks.map((block) => {
                        const isLocked = lockedBlocks.some(
                          (b) => b.panel_number === block.panel_number
                        );
                        return (
                          <div
                            key={block.panel_number}
                            className={`rounded-lg border p-3 space-y-1.5 transition-colors ${
                              isLocked
                                ? "border-emerald-500/40 bg-emerald-500/5"
                                : "border-border bg-card/40"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span
                                className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded shrink-0 ${
                                  isLocked
                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : "bg-primary/15 text-primary"
                                }`}
                              >
                                P{block.panel_number}
                              </span>
                              <Button
                                size="sm"
                                variant={isLocked ? "outline" : "default"}
                                className={`h-6 text-xs px-2 shrink-0 ${
                                  !isLocked
                                    ? "gradient-primary text-primary-foreground"
                                    : ""
                                }`}
                                onClick={() => toggleBlock(block)}
                              >
                                {isLocked ? "Déverrouiller" : "Verrouiller"}
                              </Button>
                            </div>
                            <p className="text-xs font-medium leading-snug">
                              {block.description}
                            </p>
                            <p className="text-xs text-muted-foreground italic truncate">
                              « {block.text_excerpt} »
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {lockedBlocks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-emerald-500" />
                        {lockedBlocks.length} panel
                        {lockedBlocks.length > 1 ? "s" : ""} verrouillé
                        {lockedBlocks.length > 1 ? "s" : ""}
                      </p>
                      {lockedBlocks.map((block) => (
                        <div
                          key={block.id}
                          className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5"
                        >
                          <span className="text-xs font-bold font-mono bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded shrink-0">
                            P{block.panel_number}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs leading-snug">
                              {block.description}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0 hover:text-destructive"
                            onClick={() => unlockBlock(block.panel_number)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {detectedBlocks.length === 0 && lockedBlocks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Cliquez sur « Détecter les panels » pour identifier les
                      moments forts qui deviendront des images.
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Onglet IA */}
              <TabsContent value="ia" className="mt-0">
                <div className="p-4 space-y-4">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                        IA Chapitre
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Améliorez ce chapitre pour le lecteur : rythme, dialogues,
                      tension dramatique.
                    </p>
                    <div className="space-y-2">
                      <Input
                        value={chapterAIPrompt}
                        onChange={(e) => setChapterAIPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleChapterAI();
                          }
                        }}
                        placeholder="Ex: rendre la scène finale plus tendue…"
                        className="h-8 text-sm"
                        disabled={chapterAI.isPending}
                      />
                      <Button
                        className="w-full gap-2 h-8 text-xs gradient-primary text-primary-foreground"
                        onClick={handleChapterAI}
                        disabled={
                          chapterAI.isPending ||
                          !chapterAIPrompt.trim() ||
                          !content.trim()
                        }
                      >
                        {chapterAI.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {chapterAI.isPending
                          ? "Génération…"
                          : "Réviser le chapitre"}
                      </Button>
                    </div>
                    {!content.trim() && (
                      <p className="text-xs text-amber-500">
                        Écrivez d'abord du contenu.
                      </p>
                    )}
                  </div>

                  {chapterAIResult && (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold">
                          Version proposée
                        </p>
                        <TextDiffLegend />
                      </div>
                      <div className="max-h-52 overflow-y-auto rounded bg-background p-2.5 text-xs">
                        <TextDiff
                          oldText={content}
                          newText={chapterAIResult}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1 gradient-primary text-primary-foreground flex-1"
                          onClick={() => {
                            setContent(chapterAIResult);
                            setChapterAIResult(null);
                            setChapterAIPrompt("");
                            toast({ title: "Version acceptée" });
                          }}
                        >
                          <Check className="h-3 w-3" /> Accepter
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => setChapterAIResult(null)}
                        >
                          <X className="h-3 w-3" /> Rejeter
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Onglet Assets */}
              <TabsContent value="assets" className="mt-0">
                <div className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground italic">
                    Assets détectés dans ce chapitre. Survolez pour voir le
                    détail.
                  </p>
                  {content.trim() ? (
                    <ScenarioTextHighlighter
                      text={content}
                      assets={assets}
                      onCreateAsset={undefined}
                      className="text-sm leading-relaxed"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Commencez à écrire pour voir les assets détectés.
                    </p>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
