import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Save,
  Loader2,
  Check,
  X,
  Sparkles,
  Send,
  Search,
  BarChart2,
  Layers,
  Lock,
  Wand2,
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
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import type { LockedBlock, DetectedBlock } from "@/types";

// NOTE : Les colonnes `ai_summary` et `locked_blocks` n'existent pas (encore)
// dans le schéma `scenario_chapters`. On garde ces données en état local
// pendant la session. Quand la migration sera ajoutée, il suffira de passer
// ces champs dans `updateChapter.mutate({ updates: { ... } })`.

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="glass rounded-lg p-3 space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-lg font-semibold font-display ${
          color === "emerald" ? "text-emerald-500" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<"stats" | "blocs" | "ia">("stats");
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
    setActiveTab("blocs");
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
          title: "Aucun bloc détecté",
          description: "Le chapitre est peut-être trop court.",
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
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!chapter) {
    return (
      <DashboardLayout>
        <div className="text-center p-8">
          <p className="text-muted-foreground mb-3">Chapitre introuvable.</p>
          <Link
            to={`/dashboard/projects/${projectId}?tab=scenario`}
            className="text-primary hover:underline"
          >
            Retour au scénario
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // ── Rendu ────────────────────────────────────────────────────

  const targetPanels = project?.panels_target_per_chapter ?? null;
  const progressPct = readingInfo && targetPanels
    ? Math.min(100, Math.round((readingInfo.panels / targetPanels) * 100))
    : 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] -mx-6 sm:-mx-8 lg:-mx-10 -my-6 sm:-my-8">
        {/* HEADER */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-4 px-6 py-3 h-16">
            <Link
              to={`/dashboard/projects/${projectId}?tab=scenario`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Scénario
            </Link>

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
                  className="h-9 text-lg font-display font-semibold max-w-md"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setEditingTitle(true)}
                  className="flex items-center gap-2 font-display font-semibold text-lg hover:text-primary transition-colors"
                  title="Renommer le chapitre"
                >
                  <span className="text-muted-foreground font-mono text-sm">
                    {String(chapter.chapter_number).padStart(2, "0")}
                  </span>
                  <span className="truncate">{chapter.title}</span>
                  <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </button>
              )}
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
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
              {saveState === "dirty" && (
                <span className="text-amber-500">Non sauvegardé</span>
              )}
            </div>

            <Button
              size="sm"
              onClick={handleManualSave}
              disabled={saveState === "clean" || saveState === "saving"}
              className="gap-1.5 gradient-primary text-primary-foreground shrink-0"
            >
              <Save className="h-3.5 w-3.5" />
              Sauvegarder
            </Button>
          </div>
        </header>

        {/* MAIN ZONE */}
        <div className="flex-1 flex overflow-hidden">
          {/* ZONE TEXTE */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onMouseUp={handleTextareaSelect}
                onKeyUp={handleTextareaSelect}
                placeholder="Écrivez votre chapitre ici… Sélectionnez un passage pour le modifier via l'IA."
                className="w-full h-full min-h-[400px] resize-none text-base leading-relaxed bg-transparent border-0 focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Barre sélection */}
            {selectedText && (
              <div className="flex items-center gap-3 px-6 py-3 bg-background/95 backdrop-blur border-t border-border">
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
          </div>

          {/* PANNEAU DROIT */}
          <aside className="w-72 border-l border-border overflow-y-auto shrink-0">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="w-full"
            >
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-2">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="stats" className="text-xs">
                    <BarChart2 className="h-3.5 w-3.5 mr-1" />
                    Stats
                  </TabsTrigger>
                  <TabsTrigger value="blocs" className="text-xs">
                    <Layers className="h-3.5 w-3.5 mr-1" />
                    Blocs
                  </TabsTrigger>
                  <TabsTrigger value="ia" className="text-xs">
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    IA
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Onglet Stats */}
              <TabsContent value="stats" className="mt-0">
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Mots" value={readingInfo?.words ?? 0} />
                    <StatCard
                      label="Panels estimés"
                      value={readingInfo ? `~${readingInfo.panels}` : "—"}
                    />
                    <StatCard
                      label="Temps lecture"
                      value={readingInfo ? `~${readingInfo.minutes} min` : "—"}
                    />
                    <StatCard
                      label="Blocs verrouillés"
                      value={lockedBlocks.length}
                      color={lockedBlocks.length > 0 ? "emerald" : undefined}
                    />
                  </div>

                  {/* Cible panels */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Cible panels par chapitre
                    </p>
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
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={saveTarget}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setEditingTarget(false)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setPanelsTargetDraft(
                            String(project?.panels_target_per_chapter ?? 40)
                          );
                          setEditingTarget(true);
                        }}
                        className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {project?.panels_target_per_chapter ?? "—"} panels
                        <Pencil className="h-3 w-3 opacity-50" />
                      </button>
                    )}
                  </div>

                  {/* Progression */}
                  {readingInfo && targetPanels && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progression</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-primary/15 overflow-hidden">
                        <div
                          className="h-full rounded-full gradient-primary transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Onglet Blocs */}
              <TabsContent value="blocs" className="mt-0">
                <div className="p-4 space-y-4">
                  <Button
                    onClick={handleDetectBlocks}
                    disabled={isDetecting || !content.trim()}
                    className="w-full gap-2 gradient-primary text-primary-foreground"
                  >
                    {isDetecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {isDetecting
                      ? "Analyse en cours…"
                      : "Détecter les blocs"}
                  </Button>

                  {detectedBlocks.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {detectedBlocks.length} blocs suggérés
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
                        {lockedBlocks.length} bloc
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
                      Cliquez sur « Détecter les blocs » pour analyser votre
                      chapitre et identifier les moments forts.
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Onglet IA */}
              <TabsContent value="ia" className="mt-0">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      IA Chapitre
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Améliorez ce chapitre pour le lecteur : rythme,
                      dialogues, tension.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={chapterAIPrompt}
                        onChange={(e) => setChapterAIPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleChapterAI();
                          }
                        }}
                        placeholder="Ex : rendre la scène plus tendue…"
                        className="h-8 text-sm flex-1"
                      />
                      <Button
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        variant="outline"
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
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {chapterAIResult && (
                    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">
                          Version proposée :
                        </p>
                        <TextDiffLegend />
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded bg-muted/30 p-2.5 border border-border/30 text-sm">
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

                  {assets.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2 border-t border-border/50 mt-4 pt-4">
                      Astuce : créez des assets dans l'onglet Assets pour
                      enrichir votre chapitre.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </aside>
        </div>
      </div>

    </DashboardLayout>
  );
}
