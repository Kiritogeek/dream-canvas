// Écran d'édition d'un chapitre visuel — double visualisation (Étape 2) + découpage panels (Étape 3)
// Gauche : chapitre texte (scénario) avec Aperçu = surbrillance assets + hover. Droite : panels.
import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  LayoutPanelTop,
  Plus,
  ChevronDown,
  BookOpen,
  Save,
  Loader2,
  Sparkles,
  Pencil,
  X,
  Square,
  Trash2,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScenarioTextHighlighter } from "@/components/project/ScenarioTextHighlighter";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { useChapter, useUpdateChapter } from "@/hooks/useChapters";
import { useScenarioChapters, useScenarioChapter } from "@/hooks/useScenarioChapters";
import { useAssets } from "@/hooks/useAssets";
import { useProject } from "@/hooks/useProjects";
import {
  usePanels,
  useSplitChapterIntoPanels,
  useCreatePanelsFromOutline,
  useReplacePanelsFromOutline,
  useUpdatePanel,
  useGeneratePanelImage,
} from "@/hooks/usePanels";
import {
  estimatePanelCount,
  getPanelBlocks,
  DEFAULT_BLOCK_WIDTH,
  DEFAULT_BLOCK_HEIGHT,
  PANELS_REFERENCE_PER_CHAPTER,
} from "@/services/panels";
import { updateScenarioChapter } from "@/services/scenarioChapters";
import type { Json } from "@/integrations/supabase/types";
import type { Chapter, Panel, PanelBlock, PanelLayout, PanelOutlineItem } from "@/types";

const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 5000;

export default function ChapterDetail() {
  const { id: projectId, chapterId } = useParams<{ id: string; chapterId: string }>();
  const { toast } = useToast();

  const { data: chapter, isLoading: loadingChapter } = useChapter(chapterId);
  const { data: project } = useProject(projectId);
  const { data: scenarioChapters = [] } = useScenarioChapters(projectId);
  const updateChapter = useUpdateChapter(projectId ?? "");
  const { data: assets = [] } = useAssets(projectId);
  const queryClient = useQueryClient();
  const { data: panels = [], isLoading: loadingPanels } = usePanels(chapterId);
  const splitIntoPanels = useSplitChapterIntoPanels();
  const createPanelsFromOutline = useCreatePanelsFromOutline(chapterId ?? "");
  const replacePanelsFromOutline = useReplacePanelsFromOutline(chapterId ?? "");
  const updatePanelMutation = useUpdatePanel(chapterId ?? "");
  const generatePanelImage = useGeneratePanelImage(chapterId ?? "");
  const panelsQueryKey = ["panels", chapterId] as const;

  const [replacePanelsConfirmOpen, setReplacePanelsConfirmOpen] = useState(false);
  /** Brouillons des descriptions (modifiables) par panel id */
  const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>({});
  /** Brouillons des prompts par bloc : clé = `${panelId}-${blockId}` */
  const [blockPromptDrafts, setBlockPromptDrafts] = useState<Record<string, string>>({});
  /** Panel en cours d'édition (null = vue figée pour tous) */
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  /** Bloc en cours d'édition de prompt : clé = `${panelId}-${blockId}` */
  const [editingBlockKey, setEditingBlockKey] = useState<string | null>(null);
  /** Brouillon dimensions par bloc : clé = `${panelId}-${blockId}` → { width, height } */
  const [blockDimensionDrafts, setBlockDimensionDrafts] = useState<Record<string, { width: number; height: number }>>({});
  /** Refs du canvas par panel (pour calcul position de dépôt quand on drop sur un bloc) */
  const canvasRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  /** Drop move-block traité sur le canvas : ne pas nettoyer le preview dans onDragEnd pour éviter le saut visuel */
  const moveDropHandledRef = useRef(false);
  /** En cours de resize (annuler le drag du bloc) */
  const isResizingRef = useRef(false);
  /** Pendant un resize : { panelId, blockId, edge, start, startMouse } (bordures + coins) */
  const [resizingState, setResizingState] = useState<{
    panelId: string;
    blockId: string;
    edge: "r" | "b" | "l" | "t" | "tl" | "tr" | "br" | "bl";
    start: { x: number; y: number; w: number; h: number };
    startMouse: { x: number; y: number };
  } | null>(null);
  const [resizeDraft, setResizeDraft] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const resizeDraftRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const saveResizeRef = useRef<((draft: { x: number; y: number; width: number; height: number }) => void) | null>(null);
  const lastResizeMouseRef = useRef<{ x: number; y: number } | null>(null);
  const resizeCaptureTargetRef = useRef<HTMLElement | null>(null);
  /** Drag d’un bloc : position de départ pour suivi en temps réel */
  const [draggingBlock, setDraggingBlock] = useState<{
    panelId: string;
    blockId: string;
    startBlockX: number;
    startBlockY: number;
    startMouseX: number;
    startMouseY: number;
    blockWidth: number;
    blockHeight: number;
  } | null>(null);
  /** Position en temps réel du bloc pendant le drag (affichage) */
  const [dragPreview, setDragPreview] = useState<{ panelId: string; blockId: string; x: number; y: number } | null>(null);
  /** Panel ouvert en modale « Agrandisseur » (id ou null) */
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null);
  const [pendingOutline, setPendingOutline] = useState<Array<{ description: string; context?: { lieu?: string; scene?: string; personnages?: string } }> | null>(null);
  /** Valeur sentinelle pour "Aucun" (Radix Select n'accepte pas value="") */
  const SCENARIO_NONE_VALUE = "__none__";
  /** undefined = pas encore choisi (afficher la suggestion par numéro), null = "Aucun", string = id choisi */
  const [selectedScenarioChapterId, setSelectedScenarioChapterId] = useState<
    string | null | undefined
  >(undefined);
  const [confirmScenarioChangeOpen, setConfirmScenarioChangeOpen] = useState(false);
  const [pendingScenarioChapterId, setPendingScenarioChapterId] = useState<
    string | null | undefined
  >(undefined);

  const suggestedScenarioChapterId = useMemo(
    () =>
      scenarioChapters.find((sc) => sc.chapter_number === chapter?.chapter_number)
        ?.id ?? null,
    [scenarioChapters, chapter?.chapter_number]
  );

  const displayedScenarioChapterId =
    (selectedScenarioChapterId !== undefined
      ? selectedScenarioChapterId
      : chapter?.linked_scenario_chapter_id) ??
    suggestedScenarioChapterId;

  const scenarioChapterLabel = useMemo(() => {
    if (!displayedScenarioChapterId || displayedScenarioChapterId === SCENARIO_NONE_VALUE)
      return null;
    const sc = scenarioChapters.find((c) => c.id === displayedScenarioChapterId);
    return sc ? `Chapitre ${sc.chapter_number} : ${sc.title}` : null;
  }, [displayedScenarioChapterId, scenarioChapters]);

  const { data: scenarioChapter, isLoading: loadingScenario } = useScenarioChapter(
    displayedScenarioChapterId ?? undefined
  );

  const estimatedPanels = useMemo(
    () => estimatePanelCount(scenarioChapter?.content ?? null),
    [scenarioChapter?.content]
  );
  const targetPanels = project?.panels_target_per_chapter ?? PANELS_REFERENCE_PER_CHAPTER;
  const panelsLengthGuidance =
    estimatedPanels < targetPanels - 2
      ? "Estimation sous la cible : vous pouvez allonger le chapitre dans l’onglet Scénario ou répartir du contenu avec le chapitre suivant."
      : estimatedPanels > targetPanels + 2
        ? "Estimation au-dessus de la cible : vous pouvez raccourcir le texte en Scénario ou céder une partie au chapitre suivant."
        : null;

  /** Clamp position/dimensions pour rester dans le panel 720×5000 */
  const clampBlockToPanel = (x: number, y: number, w: number, h: number) => {
    const width = Math.max(100, Math.min(PANEL_WIDTH, w));
    const height = Math.max(100, Math.min(PANEL_HEIGHT, h));
    const x2 = Math.max(0, Math.min(PANEL_WIDTH - width, x));
    const y2 = Math.max(0, Math.min(PANEL_HEIGHT - height, y));
    return { x: x2, y: y2, width: width, height: height };
  };

  /** Convertit viewport -> coords logiques canvas (prend en compte le scroll du conteneur) */
  const viewportToCanvas = (canvasEl: HTMLDivElement, clientX: number, clientY: number) => {
    const rect = canvasEl.getBoundingClientRect();
    const scrollParent = canvasEl.parentElement;
    const scrollLeft = scrollParent?.scrollLeft ?? 0;
    const scrollTop = scrollParent?.scrollTop ?? 0;
    return {
      x: clientX - rect.left + scrollLeft,
      y: clientY - rect.top + scrollTop,
    };
  };

  /** Dragover global : souris en coords canvas, delta puis clamp position finale uniquement */
  useEffect(() => {
    if (!draggingBlock) return;
    const canvasEl = canvasRefByPanel.current[draggingBlock.panelId];
    const onDocDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!canvasEl) return;
      const { x: canvasMouseX, y: canvasMouseY } = viewportToCanvas(canvasEl, e.clientX, e.clientY);
      const newX = Math.max(0, Math.min(PANEL_WIDTH - draggingBlock.blockWidth, draggingBlock.startBlockX + (canvasMouseX - draggingBlock.startMouseX)));
      const newY = Math.max(0, Math.min(PANEL_HEIGHT - draggingBlock.blockHeight, draggingBlock.startBlockY + (canvasMouseY - draggingBlock.startMouseY)));
      setDragPreview({ panelId: draggingBlock.panelId, blockId: draggingBlock.blockId, x: newX, y: newY });
    };
    document.addEventListener("dragover", onDocDragOver);
    return () => document.removeEventListener("dragover", onDocDragOver);
  }, [draggingBlock]);

  /**
   * Resize façon Canva : poignées (4 coins + 4 côtés), bord/côté opposé ancré.
   * - Coins : largeur et hauteur changent, coin opposé fixe (nouvelle_largeur = initiale ± dX, nouvelle_hauteur = initiale ± dY).
   * - Côtés : une seule dimension change, l’autre reste fixe.
   */
  useEffect(() => {
    const target = resizeCaptureTargetRef.current;
    if (!resizingState || !target) return;
    const { edge, start } = resizingState;
    const minW = 100;
    const minH = 100;
    const rightFixed = start.x + start.w;
    const bottomFixed = start.y + start.h;

    const computeFromMouse = (clientX: number, clientY: number) => {
      const canvasEl = canvasRefByPanel.current[resizingState.panelId];
      if (!canvasEl) return { x: start.x, y: start.y, width: start.w, height: start.h };

      const mouse = viewportToCanvas(canvasEl, clientX, clientY);
      let x = start.x;
      let y = start.y;
      let w = start.w;
      let h = start.h;

      switch (edge) {
        case "r":
          w = mouse.x - start.x;
          break;
        case "l":
          x = mouse.x;
          w = rightFixed - mouse.x;
          break;
        case "b":
          h = mouse.y - start.y;
          break;
        case "t":
          y = mouse.y;
          h = bottomFixed - mouse.y;
          break;
        case "tr":
          y = mouse.y;
          w = mouse.x - start.x;
          h = bottomFixed - mouse.y;
          break;
        case "br":
          w = mouse.x - start.x;
          h = mouse.y - start.y;
          break;
        case "bl":
          x = mouse.x;
          w = rightFixed - mouse.x;
          h = mouse.y - start.y;
          break;
        case "tl":
          x = mouse.x;
          y = mouse.y;
          w = rightFixed - mouse.x;
          h = bottomFixed - mouse.y;
          break;
      }

      const leftFixed = edge === "r" || edge === "tr" || edge === "br";
      const topFixed = edge === "r" || edge === "b" || edge === "br" || edge === "bl";
      const rightAnchored = edge === "l" || edge === "bl" || edge === "tl";
      const bottomAnchored = edge === "t" || edge === "tr" || edge === "tl";

      w = Math.max(minW, Math.min(PANEL_WIDTH, w));
      h = Math.max(minH, Math.min(PANEL_HEIGHT, h));

      if (leftFixed) w = Math.min(w, PANEL_WIDTH - start.x);
      if (topFixed) h = Math.min(h, PANEL_HEIGHT - start.y);
      if (rightAnchored) {
        w = Math.min(w, rightFixed);
        x = rightFixed - w;
      }
      if (bottomAnchored) {
        h = Math.min(h, bottomFixed);
        y = bottomFixed - h;
      }

      if (leftFixed) x = start.x;
      else if (rightAnchored) x = rightFixed - w;
      else x = Math.max(0, Math.min(PANEL_WIDTH - w, x));

      if (topFixed) y = start.y;
      else if (bottomAnchored) y = bottomFixed - h;
      else y = Math.max(0, Math.min(PANEL_HEIGHT - h, y));

      return { x, y, width: w, height: h };
    };

    const onMove = (e: PointerEvent) => {
      if (e.buttons !== 1) return;
      lastResizeMouseRef.current = { x: e.clientX, y: e.clientY };
      const result = computeFromMouse(e.clientX, e.clientY);
      resizeDraftRef.current = result;
      setResizeDraft(result);
    };
    const onUp = () => {
      const lastClient = lastResizeMouseRef.current;
      const result = lastClient
        ? computeFromMouse(lastClient.x, lastClient.y)
        : resizeDraftRef.current ?? { x: start.x, y: start.y, width: start.w, height: start.h };
      const hadSave = !!saveResizeRef.current;
      saveResizeRef.current?.(result);
      saveResizeRef.current = null;
      if (!hadSave) {
        setResizingState(null);
        setResizeDraft(null);
        resizeDraftRef.current = null;
        lastResizeMouseRef.current = null;
        resizeCaptureTargetRef.current = null;
        isResizingRef.current = false;
      }
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    return () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      // Ne pas vider les refs ici : en Strict Mode le cleanup puis re-run laisserait target=null et aucun listener. Les refs sont remises à zéro dans onMutate / onUp.
    };
  }, [resizingState]);

  const handleSplitAndCreatePanels = () => {
    if (!scenarioChapter?.content?.trim() || !chapterId || !displayedScenarioChapterId) return;
    // Utiliser l'estimation comme cible du découpage pour que le nombre de panels créés corresponde à l'estimation affichée
    const target = estimatedPanels > 0 ? estimatedPanels : (project?.panels_target_per_chapter ?? PANELS_REFERENCE_PER_CHAPTER);
    splitIntoPanels.mutate(
      {
        chapter_title: scenarioChapter.title,
        chapter_content: scenarioChapter.content,
        chapter_number: scenarioChapter.chapter_number,
        target_panel_count: target,
      },
      {
        onSuccess: (res) => {
          if (!res.panels?.length) {
            toast({ title: "Aucun panel généré", variant: "destructive" });
            return;
          }
          if (panels.length > 0) {
            setPendingOutline(res.panels);
            setReplacePanelsConfirmOpen(true);
          } else {
            applyOutlineAndSave(res.panels);
          }
        },
        onError: (err) =>
          toast({ title: "Erreur découpage", description: err.message, variant: "destructive" }),
      }
    );
  };

  const applyOutlineAndSave = (
    outline: Array<{ description: string; context?: { lieu?: string; scene?: string; personnages?: string } }>
  ) => {
    if (!chapterId || !displayedScenarioChapterId) return;
    const saveOutline = () =>
      updateScenarioChapter(displayedScenarioChapterId, {
        panels_outline: outline as unknown as Json,
      });

    if (panels.length > 0) {
      replacePanelsFromOutline.mutate(outline, {
        onSuccess: async (created) => {
          await saveOutline();
          toast({ title: `${created.length} panel(s) créé(s) (remplacement)` });
          setReplacePanelsConfirmOpen(false);
          setPendingOutline(null);
        },
        onError: (err) =>
          toast({ title: "Erreur", description: err.message, variant: "destructive" }),
      });
    } else {
      createPanelsFromOutline.mutate(outline, {
        onSuccess: async (created) => {
          await saveOutline();
          toast({ title: `${created.length} panel(s) créé(s)` });
          setReplacePanelsConfirmOpen(false);
          setPendingOutline(null);
        },
        onError: (err) =>
          toast({ title: "Erreur", description: err.message, variant: "destructive" }),
      });
    }
  };

  const storedOutline =
    useMemo((): PanelOutlineItem[] | null => {
      const raw = scenarioChapter?.panels_outline;
      if (!raw || !Array.isArray(raw) || raw.length === 0) return null;
      return raw as unknown as PanelOutlineItem[];
    }, [scenarioChapter?.panels_outline]);

  const handleImportDecoupage = () => {
    if (!storedOutline?.length || !chapterId || !displayedScenarioChapterId) return;
    if (panels.length > 0) {
      setPendingOutline(storedOutline);
      setReplacePanelsConfirmOpen(true);
    } else {
      applyOutlineAndSave(storedOutline);
    }
  };

  const confirmReplacePanels = () => {
    if (!pendingOutline) return;
    const outline = pendingOutline;
    setPendingOutline(null);
    setReplacePanelsConfirmOpen(false);
    replacePanelsFromOutline.mutate(outline, {
      onSuccess: async (created) => {
        if (displayedScenarioChapterId)
          await updateScenarioChapter(displayedScenarioChapterId, {
            panels_outline: outline as unknown as Json,
          });
        toast({ title: `${created.length} panel(s) créé(s) (remplacement)` });
      },
      onError: (err) =>
        toast({ title: "Erreur", description: err.message, variant: "destructive" }),
    });
  };

  const handleSaveScenarioLink = () => {
    const idToSave = displayedScenarioChapterId;
    if (!chapterId) return;
    updateChapter.mutate(
      { id: chapterId, updates: { linked_scenario_chapter_id: idToSave ?? null } },
      {
        onSuccess: () => {
          toast({ title: "Lien enregistré" });
          setSelectedScenarioChapterId(undefined);
        },
        onError: (err) =>
          toast({
            title: "Erreur",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  };

  const loading = loadingChapter || loadingPanels;
  const canSaveLink =
    (chapter?.linked_scenario_chapter_id ?? null) !==
    (displayedScenarioChapterId ?? null);

  if (loading && !chapter) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (!chapter) {
    return (
      <DashboardLayout>
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-muted-foreground">Chapitre introuvable.</p>
          <Button asChild variant="ghost" className="mt-4">
            <Link to={`/dashboard/projects/${projectId}?tab=edition`}>
              Retour au projet
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/dashboard/projects/${projectId}?tab=edition`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-display font-bold truncate">
              Chapitre {chapter.chapter_number} : {chapter.title}
            </h1>
            {chapter.synopsis && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {chapter.synopsis}
              </p>
            )}
          </div>
        </div>

        {/* Layout : Chapitre texte à gauche (sticky au scroll), Panels à droite */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Gauche : Panneau Scénario — reste visible au scroll des panels */}
          <div className="lg:w-[min(420px,45%)] lg:shrink-0 lg:sticky lg:top-4 lg:self-start">
            <Collapsible defaultOpen className="glass rounded-xl border border-border">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-4 text-left font-display font-semibold hover:bg-muted/50 rounded-t-xl transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Chapitre texte
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 data-[state=open]:rotate-180 transition-transform" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-3">
                  {scenarioChapters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun chapitre de scénario. Créez-en dans l'onglet{" "}
                      <strong>Scénario</strong> du projet.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Chapitre de scénario à afficher
                        </label>
                        <Select
                          value={displayedScenarioChapterId ?? SCENARIO_NONE_VALUE}
                          onValueChange={(v) => {
                            const next = v === SCENARIO_NONE_VALUE ? null : v;
                            if (next !== (displayedScenarioChapterId ?? null)) {
                              setPendingScenarioChapterId(next);
                              setConfirmScenarioChangeOpen(true);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choisir un chapitre...">
                              {scenarioChapterLabel ?? "Aucun (ne pas associer)"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SCENARIO_NONE_VALUE}>
                              Aucun (ne pas associer)
                            </SelectItem>
                            {scenarioChapters.map((sc) => (
                              <SelectItem key={sc.id} value={sc.id}>
                                <span className="flex items-center gap-2">
                                  Chapitre {sc.chapter_number} : {sc.title}
                                  {sc.id === suggestedScenarioChapterId && (
                                    <span className="text-xs text-muted-foreground">✓ suggéré</span>
                                  )}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <AlertDialog
                          open={confirmScenarioChangeOpen}
                          onOpenChange={setConfirmScenarioChangeOpen}
                        >
                          <AlertDialogContent className="glass">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Changer de chapitre texte ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Le chapitre de scénario affiché à gauche sera remplacé et le lien
                                sera enregistré pour ce chapitre visuel.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                onClick={() => setPendingScenarioChapterId(undefined)}
                              >
                                Annuler
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  if (!chapterId) return;
                                  const idToSave = pendingScenarioChapterId ?? null;
                                  setSelectedScenarioChapterId(pendingScenarioChapterId);
                                  setConfirmScenarioChangeOpen(false);
                                  setPendingScenarioChapterId(undefined);
                                  updateChapter.mutate(
                                    {
                                      id: chapterId,
                                      updates: { linked_scenario_chapter_id: idToSave },
                                    },
                                    {
                                      onSuccess: () => {
                                        toast({ title: "Lien enregistré" });
                                        setSelectedScenarioChapterId(undefined);
                                      },
                                      onError: (err) =>
                                        toast({
                                          title: "Erreur",
                                          description: err.message,
                                          variant: "destructive",
                                        }),
                                    }
                                  );
                                }}
                                disabled={updateChapter.isPending}
                              >
                                {updateChapter.isPending ? "Enregistrement..." : "Changer"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      {displayedScenarioChapterId && (
                        <>
                          {loadingScenario ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Chargement...
                            </div>
                          ) : scenarioChapter?.content ? (
                            <div className="rounded-lg border border-border bg-background/80 p-4 min-h-[200px] max-h-[60vh] overflow-y-auto">
                              <ScenarioTextHighlighter
                                text={scenarioChapter.content}
                                assets={assets}
                              />
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic py-4">
                              Ce chapitre n'a pas encore de contenu.
                            </p>
                          )}
                          {canSaveLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full gap-2"
                              onClick={handleSaveScenarioLink}
                              disabled={updateChapter.isPending}
                            >
                              {updateChapter.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              Enregistrer ce lien
                            </Button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Droite : Panels */}
          <div className="flex-1 min-w-0 space-y-4">
            <p className="text-sm text-muted-foreground">
              Chaque panel est une structure{" "}
              <strong>
                {PANEL_WIDTH}×{PANEL_HEIGHT}
              </strong>{" "}
              pixels (blocs, bulles, effets).
            </p>

            {scenarioChapter?.content && (
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">
                  Longueur du chapitre — référence et estimation
                </p>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Référence : ~{PANELS_REFERENCE_PER_CHAPTER} panels / chapitre.</span>
                  <span>Estimation : <strong>{estimatedPanels}</strong> panels.</span>
                  <span>Cible : <strong>{targetPanels}</strong> panels.</span>
                </p>
                {panelsLengthGuidance && (
                  <p className="text-amber-700 dark:text-amber-300 text-xs">
                    {panelsLengthGuidance}
                  </p>
                )}
                <p className="text-xs">
                  Vous pouvez modifier la cible dans les paramètres du projet. L’estimation est indicative ; vous pouvez créer plus ou moins de panels qu’estimé.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {scenarioChapter?.content && (
                <Button
                  onClick={handleSplitAndCreatePanels}
                  disabled={splitIntoPanels.isPending}
                  variant="outline"
                  className="gap-2"
                >
                  {splitIntoPanels.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Découper en panels (IA)
                </Button>
              )}
              {storedOutline && storedOutline.length > 0 && (
                <Button
                  onClick={handleImportDecoupage}
                  disabled={createPanelsFromOutline.isPending || replacePanelsFromOutline.isPending}
                  variant="outline"
                  className="gap-2"
                >
                  <LayoutPanelTop className="h-4 w-4" />
                  Importer le découpage ({storedOutline.length} panels)
                </Button>
              )}
            </div>

            <AlertDialog open={replacePanelsConfirmOpen} onOpenChange={setReplacePanelsConfirmOpen}>
              <AlertDialogContent className="glass">
                <AlertDialogHeader>
                  <AlertDialogTitle>Remplacer les panels existants ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ce chapitre a déjà {panels.length} panel(s). Le découpage IA va les supprimer et créer une nouvelle succession de panels. Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setPendingOutline(null)}>
                    Annuler
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmReplacePanels}
                    disabled={replacePanelsFromOutline.isPending}
                  >
                    {replacePanelsFromOutline.isPending ? "Remplacement..." : "Remplacer"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {panels.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 py-12 px-4 text-center">
                <LayoutPanelTop className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-base font-medium text-muted-foreground">
                  Aucun panel
                </p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Associez un chapitre de scénario à gauche. Créez les panels avec « Découper en panels (IA) » ou importez un découpage déjà fait dans l'onglet Scénario.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {scenarioChapter?.content && (
                    <Button
                      onClick={handleSplitAndCreatePanels}
                      disabled={splitIntoPanels.isPending}
                      variant="outline"
                      className="gap-1.5"
                    >
                      {splitIntoPanels.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Découper en panels (IA)
                    </Button>
                  )}
                  {storedOutline && storedOutline.length > 0 && (
                    <Button
                      onClick={handleImportDecoupage}
                      disabled={createPanelsFromOutline.isPending}
                      variant="outline"
                      className="gap-1.5"
                    >
                      <LayoutPanelTop className="h-3.5 w-3.5" />
                      Importer le découpage ({storedOutline.length} panels)
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-display font-semibold">
                  Panels ({panels.length})
                </h2>
                <div className="space-y-4">
                  {panels.map((panel) => {
                    const blocks = getPanelBlocks(panel);
                    const layout = (panel.layout as PanelLayout | null) ?? { blocks: [] };
                    const isEditing = editingPanelId === panel.id;
                    const draftPrompt = promptDrafts[panel.id] ?? panel.prompt ?? "";
                    const displayText = panel.prompt ?? "";
                    const isDirty = isEditing && draftPrompt !== (panel.prompt ?? "");

                    const handleAddBlock = (atX?: number, atY?: number) => {
                      const x = Math.max(0, Math.min(PANEL_WIDTH - DEFAULT_BLOCK_WIDTH, atX ?? 0));
                      const y = Math.max(0, Math.min(PANEL_HEIGHT - DEFAULT_BLOCK_HEIGHT, atY ?? 0));
                      const newBlock: PanelBlock = {
                        id: crypto.randomUUID(),
                        x,
                        y,
                        width: DEFAULT_BLOCK_WIDTH,
                        height: DEFAULT_BLOCK_HEIGHT,
                        prompt: null,
                        image_url: null,
                      };
                      const newLayout: PanelLayout = { blocks: [...layout.blocks, newBlock] };
                      updatePanelMutation.mutate(
                        { id: panel.id, updates: { layout: newLayout as unknown as Json } },
                        {
                          onSuccess: () => toast({ title: "Bloc 500×500 ajouté" }),
                          onError: (err) =>
                            toast({ title: "Erreur", description: err.message, variant: "destructive" }),
                        }
                      );
                    };

                    const getCanvasDropPosition = (e: React.DragEvent, canvasEl?: HTMLDivElement | null, maxW = DEFAULT_BLOCK_WIDTH, maxH = DEFAULT_BLOCK_HEIGHT) => {
                      const el = canvasEl ?? canvasRefByPanel.current[panel.id] ?? (e.currentTarget as HTMLDivElement);
                      if (!el) return { x: 0, y: 0 };
                      const { x: canvasX, y: canvasY } = viewportToCanvas(el, e.clientX, e.clientY);
                      return {
                        x: Math.max(0, Math.min(PANEL_WIDTH - maxW, Math.round(canvasX))),
                        y: Math.max(0, Math.min(PANEL_HEIGHT - maxH, Math.round(canvasY))),
                      };
                    };

                    const handleCanvasDragOver = (e: React.DragEvent) => {
                      e.preventDefault();
                      if (draggingBlock && draggingBlock.panelId === panel.id) {
                        const block = layout.blocks.find((b) => b.id === draggingBlock.blockId);
                        if (block) {
                          const canvasEl = canvasRefByPanel.current[panel.id];
                          if (!canvasEl) return;
                          const { x: canvasMouseX, y: canvasMouseY } = viewportToCanvas(canvasEl, e.clientX, e.clientY);
                          const newX = Math.max(0, Math.min(PANEL_WIDTH - block.width, draggingBlock.startBlockX + (canvasMouseX - draggingBlock.startMouseX)));
                          const newY = Math.max(0, Math.min(PANEL_HEIGHT - block.height, draggingBlock.startBlockY + (canvasMouseY - draggingBlock.startMouseY)));
                          setDragPreview({ panelId: panel.id, blockId: block.id, x: newX, y: newY });
                        }
                      }
                    };

                    const handleCanvasDrop = (e: React.DragEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const raw = e.dataTransfer.getData("application/json");
                      if (!raw) return;
                      const canvasEl = canvasRefByPanel.current[panel.id];
                      try {
                        const data = JSON.parse(raw) as { type: string; blockId?: string };
                        if (data.type === "new-block") {
                          const { x, y } = getCanvasDropPosition(e, canvasEl);
                          handleAddBlock(x, y);
                          setDraggingBlock(null);
                          setDragPreview(null);
                          return;
                        }
                        if (data.type === "move-block" && data.blockId) {
                          const block = layout.blocks.find((b) => b.id === data.blockId);
                          if (block && draggingBlock && draggingBlock.panelId === panel.id && draggingBlock.blockId === data.blockId && canvasEl) {
                            const { x: canvasMouseX, y: canvasMouseY } = viewportToCanvas(canvasEl, e.clientX, e.clientY);
                            const clampedX = Math.max(0, Math.min(PANEL_WIDTH - block.width, Math.round(draggingBlock.startBlockX + (canvasMouseX - draggingBlock.startMouseX))));
                            const clampedY = Math.max(0, Math.min(PANEL_HEIGHT - block.height, Math.round(draggingBlock.startBlockY + (canvasMouseY - draggingBlock.startMouseY))));
                            const blockIndex = layout.blocks.findIndex((b) => b.id === data.blockId);
                            const nextBlocks = layout.blocks.map((b, i) =>
                              i === blockIndex ? { ...b, x: clampedX, y: clampedY } : b
                            );
                            moveDropHandledRef.current = true;
                            const movePayload = { id: panel.id, updates: { layout: { blocks: nextBlocks } as unknown as Json } };
                            queryClient.cancelQueries({ queryKey: panelsQueryKey });
                            const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
                            queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => {
                              if (!old) return old;
                              return old.map((p) =>
                                p.id === movePayload.id ? { ...p, layout: movePayload.updates.layout ?? p.layout } : p
                              );
                            });
                            setDraggingBlock(null);
                            setDragPreview(null);
                            updatePanelMutation.mutate(movePayload, {
                              onSuccess: () => {
                                moveDropHandledRef.current = false;
                                queryClient.refetchQueries({ queryKey: panelsQueryKey });
                                toast({ title: "Bloc déplacé" });
                              },
                              onError: (err) => {
                                moveDropHandledRef.current = false;
                                setDraggingBlock(null);
                                setDragPreview(null);
                                if (previousPanels != null) {
                                  queryClient.setQueryData(panelsQueryKey, previousPanels);
                                }
                                toast({ title: "Erreur", description: err.message, variant: "destructive" });
                              },
                            });
                          } else {
                            setDraggingBlock(null);
                            setDragPreview(null);
                          }
                        }
                      } catch {
                        // ignore invalid json
                      }
                    };

                    const handleSaveBlockDimensions = (block: PanelBlock, width: number, height: number) => {
                      const { x, y, width: w, height: h } = clampBlockToPanel(block.x, block.y, width, height);
                      const nextBlocks = layout.blocks.map((b) =>
                        b.id === block.id ? { ...b, x, y, width: w, height: h } : b
                      );
                      updatePanelMutation.mutate(
                        { id: panel.id, updates: { layout: { blocks: nextBlocks } as unknown as Json } },
                        {
                          onSuccess: () => {
                            setBlockDimensionDrafts((prev) => {
                              const next = { ...prev };
                              delete next[`${panel.id}-${block.id}`];
                              return next;
                            });
                            toast({ title: "Dimensions enregistrées" });
                          },
                          onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
                        }
                      );
                    };

                    const handleDeleteBlock = (block: PanelBlock) => {
                      const nextBlocks = layout.blocks.filter((b) => b.id !== block.id);
                      updatePanelMutation.mutate(
                        { id: panel.id, updates: { layout: { blocks: nextBlocks } as unknown as Json } },
                        {
                          onSuccess: () => {
                            setEditingBlockKey((k) => (k === `${panel.id}-${block.id}` ? null : k));
                            setBlockPromptDrafts((prev) => {
                              const next = { ...prev };
                              delete next[`${panel.id}-${block.id}`];
                              return next;
                            });
                            toast({ title: "Bloc supprimé" });
                          },
                          onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
                        }
                      );
                    };

                    const handleSaveBlockPrompt = (block: PanelBlock, newPrompt: string) => {
                      const nextBlocks = layout.blocks.map((b) =>
                        b.id === block.id ? { ...b, prompt: newPrompt.trim() || null } : b
                      );
                      updatePanelMutation.mutate(
                        { id: panel.id, updates: { layout: { blocks: nextBlocks } as unknown as Json } },
                        {
                          onSuccess: () => {
                            setEditingBlockKey(null);
                            setBlockPromptDrafts((prev) => {
                              const next = { ...prev };
                              delete next[`${panel.id}-${block.id}`];
                              return next;
                            });
                            toast({ title: "Prompt du bloc enregistré" });
                          },
                          onError: (err) =>
                            toast({ title: "Erreur", description: err.message, variant: "destructive" }),
                        }
                      );
                    };

                    const handleGenerateBlock = (block: PanelBlock) => {
                      const promptToUse = (blockPromptDrafts[`${panel.id}-${block.id}`] ?? block.prompt ?? "").trim() || (panel.prompt ?? "").trim();
                      if (!project) return;
                      const hasStyle =
                        (project.style_template?.trim()?.length ?? 0) > 0 ||
                        (Array.isArray(project.style_image_urls) && project.style_image_urls.length > 0);
                      if (!hasStyle) {
                        toast({
                          title: "Style requis",
                          description: "Définissez un style dans l'onglet Style du projet avant de générer.",
                          variant: "destructive",
                        });
                        return;
                      }
                      if (!promptToUse) {
                        toast({
                          title: "Prompt requis",
                          description: "Saisissez un prompt pour ce bloc (ou une description au panel).",
                          variant: "destructive",
                        });
                        return;
                      }
                      generatePanelImage.mutate(
                        { panel: { id: panel.id, prompt: promptToUse }, project },
                        {
                          onSuccess: (result) => {
                            toast({ title: "Image générée" });
                            const blockIndex = layout.blocks.findIndex((b) => b.id === block.id);
                            if (blockIndex >= 0) {
                              const nextBlocks = layout.blocks.map((b, i) =>
                                i === blockIndex ? { ...b, image_url: result.image_url } : b
                              );
                              updatePanelMutation.mutate({
                                id: panel.id,
                                updates: { layout: { blocks: nextBlocks } as unknown as Json },
                              });
                            }
                          },
                          onError: (err) =>
                            toast({ title: "Génération échouée", description: err.message, variant: "destructive" }),
                        }
                      );
                    };

                    return (
                      <div
                        key={panel.id}
                        className="glass rounded-xl overflow-hidden border border-border max-w-[720px]"
                      >
                        <div className="p-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-medium">
                            Panel {panel.panel_number} — {PANEL_WIDTH}×{PANEL_HEIGHT}
                          </h3>
                          <div className="flex items-center gap-2">
                            <div
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("application/json", JSON.stringify({ type: "new-block" }));
                                e.dataTransfer.effectAllowed = "copy";
                              }}
                              className="cursor-grab active:cursor-grabbing rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-sm font-medium text-foreground hover:bg-primary/10"
                            >
                              Glisser un bloc 500×500 sur le panel →
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => setExpandedPanelId(panel.id)}
                              title="Ouvrir le panel en grand"
                            >
                              <Maximize2 className="h-3.5 w-3.5" />
                              Agrandir
                            </Button>
                          </div>
                        </div>

                        {/* Canvas 720×5000 — fond quadrillé, zone de dépôt */}
                        <div
                          className="overflow-auto border-b border-border"
                          style={{ maxHeight: "80vh" }}
                        >
                          <div
                            ref={(el) => {
                              if (el) canvasRefByPanel.current[panel.id] = el;
                            }}
                            className="relative shrink-0"
                            style={{
                              width: PANEL_WIDTH,
                              height: PANEL_HEIGHT,
                              backgroundImage: `
                                linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                                linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                              `,
                              backgroundSize: "24px 24px",
                              backgroundColor: "hsl(var(--muted) / 0.3)",
                            }}
                            onDragOver={handleCanvasDragOver}
                            onDrop={handleCanvasDrop}
                          >
                            {blocks.length === 0 ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6 text-muted-foreground text-sm">
                                <Square className="h-10 w-10 opacity-50" />
                                <p>Aucun bloc. Glissez « Bloc 500×500 » ici ou ajoutez un premier bloc.</p>
                                <Button size="sm" variant="outline" onClick={() => handleAddBlock(0, 0)} disabled={updatePanelMutation.isPending}>
                                  <Plus className="h-4 w-4 mr-1.5" />
                                  Ajouter un bloc
                                </Button>
                              </div>
                            ) : (
                              blocks.map((block, blockIndex) => {
                                const isThisResizing = resizingState?.panelId === panel.id && resizingState?.blockId === block.id;
                                const isThisDragging = dragPreview?.panelId === panel.id && dragPreview?.blockId === block.id;
                                const useResizeDraft = isThisResizing && resizeDraft != null && isResizingRef.current;
                                const geom = useResizeDraft
                                  ? resizeDraft
                                  : isThisDragging && dragPreview
                                    ? { x: dragPreview.x, y: dragPreview.y, width: block.width, height: block.height }
                                    : { x: block.x, y: block.y, width: block.width, height: block.height };
                                return (
                                  <div
                                    key={block.id}
                                    draggable={!isThisResizing}
                                    onDragStart={(e) => {
                                      if (isResizingRef.current) {
                                        e.preventDefault();
                                        return;
                                      }
                                      e.dataTransfer.setData("application/json", JSON.stringify({ type: "move-block", blockId: block.id }));
                                      e.dataTransfer.effectAllowed = "move";
                                      const canvasEl = canvasRefByPanel.current[panel.id];
                                      if (!canvasEl) return;
                                      const { x: startMouseX, y: startMouseY } = viewportToCanvas(canvasEl, e.clientX, e.clientY);
                                      setDraggingBlock({
                                        panelId: panel.id,
                                        blockId: block.id,
                                        startBlockX: block.x,
                                        startBlockY: block.y,
                                        startMouseX,
                                        startMouseY,
                                        blockWidth: block.width,
                                        blockHeight: block.height,
                                      });
                                      setDragPreview({ panelId: panel.id, blockId: block.id, x: block.x, y: block.y });
                                    }}
                                    onDragEnd={() => {
                                      if (!moveDropHandledRef.current) {
                                        setDraggingBlock(null);
                                        setDragPreview(null);
                                      }
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleCanvasDrop}
                                    className="absolute overflow-visible ring-2 ring-primary/60 bg-background/95 shadow-md cursor-grab active:cursor-grabbing"
                                    style={{
                                      left: geom.x,
                                      top: geom.y,
                                      width: geom.width,
                                      height: geom.height,
                                    }}
                                    title={`Bloc ${blockIndex + 1} — glisser pour déplacer, bordures pour redimensionner`}
                                  >
                                    {/* Contenu (image ou placeholder) */}
                                    <div className="w-full h-full overflow-hidden pointer-events-none">
                                      {block.image_url ? (
                                        <ImageWithFallback
                                          src={block.image_url}
                                          alt=""
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center bg-muted/50">
                                          {block.prompt ? "Prompt défini — Générer ci-dessous" : "Saisir le prompt ci-dessous"}
                                        </div>
                                      )}
                                    </div>
                                    {/* Poignées de redimensionnement (bordures + coins). Spec : étirer/réduire au glisser uniquement, aucun comportement au survol. */}
                                    {[
                                      { edge: "r" as const, style: { right: 0, top: 0, bottom: 0, width: 6 }, cursor: "ew-resize" },
                                      { edge: "b" as const, style: { bottom: 0, left: 0, right: 0, height: 6 }, cursor: "ns-resize" },
                                      { edge: "l" as const, style: { left: 0, top: 0, bottom: 0, width: 6 }, cursor: "ew-resize" },
                                      { edge: "t" as const, style: { top: 0, left: 0, right: 0, height: 6 }, cursor: "ns-resize" },
                                      { edge: "tl" as const, style: { left: 0, top: 0, width: 12, height: 12 }, cursor: "nwse-resize" },
                                      { edge: "tr" as const, style: { right: 0, top: 0, width: 12, height: 12 }, cursor: "nesw-resize" },
                                      { edge: "br" as const, style: { right: 0, bottom: 0, width: 12, height: 12 }, cursor: "nwse-resize" },
                                      { edge: "bl" as const, style: { left: 0, bottom: 0, width: 12, height: 12 }, cursor: "nesw-resize" },
                                    ].map(({ edge, style, cursor }) => (
                                      <div
                                        key={edge}
                                        className="absolute z-10"
                                        style={{ ...style, cursor }}
                                        onPointerDown={(e) => {
                                          if (e.button !== 0) return;
                                          e.preventDefault();
                                          e.stopPropagation();
                                          isResizingRef.current = true;
                                          resizeCaptureTargetRef.current = e.currentTarget;
                                          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                                          setResizingState({
                                            panelId: panel.id,
                                            blockId: block.id,
                                            edge,
                                            start: { x: block.x, y: block.y, w: block.width, h: block.height },
                                            startMouse: { x: e.clientX, y: e.clientY },
                                          });
                                          const initial = { x: block.x, y: block.y, width: block.width, height: block.height };
                                          setResizeDraft(initial);
                                          resizeDraftRef.current = initial;
                                          saveResizeRef.current = (draft) => {
                                            const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
                                            const currentPanel = currentPanels.find((p) => p.id === panel.id);
                                            const currentBlocks = getPanelBlocks(currentPanel ?? panel);
                                            const nextBlocks = currentBlocks.map((b) =>
                                              b.id === block.id ? { ...b, x: draft.x, y: draft.y, width: draft.width, height: draft.height } : b
                                            );
                                            const payload = { id: panel.id, updates: { layout: { blocks: nextBlocks } as unknown as Json } };
                                            queryClient.cancelQueries({ queryKey: panelsQueryKey });
                                            const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
                                            queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => {
                                              if (!old) return old;
                                              return old.map((p) =>
                                                p.id === payload.id ? { ...p, layout: payload.updates.layout } : p
                                              );
                                            });
                                            setResizingState(null);
                                            setResizeDraft(null);
                                            resizeDraftRef.current = null;
                                            lastResizeMouseRef.current = null;
                                            resizeCaptureTargetRef.current = null;
                                            isResizingRef.current = false;
                                            updatePanelMutation.mutate(payload, {
                                              onSuccess: () => {
                                                toast({ title: "Dimensions enregistrées" });
                                              },
                                              onError: (err) => {
                                                if (previousPanels != null) {
                                                  queryClient.setQueryData(panelsQueryKey, previousPanels);
                                                }
                                                toast({ title: "Erreur", description: err.message, variant: "destructive" });
                                              },
                                            });
                                          };
                                        }}
                                        aria-label={`Redimensionner ${edge.length === 1 ? (edge === "r" ? "droite" : edge === "b" ? "bas" : edge === "l" ? "gauche" : "haut") : "coin"}`}
                                      />
                                    ))}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div className="p-3 border-b border-border space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Contexte du panel (optionnel)</span>
                            {!isEditing ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 gap-1.5 text-muted-foreground"
                                onClick={() => {
                                  setEditingPanelId(panel.id);
                                  setPromptDrafts((prev) => ({ ...prev, [panel.id]: panel.prompt ?? "" }));
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Modifier
                              </Button>
                            ) : (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => setEditingPanelId(null)}>
                                  <X className="h-3.5 w-3.5" />
                                  Annuler
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5"
                                  disabled={updatePanelMutation.isPending || !isDirty}
                                  onClick={() => {
                                    updatePanelMutation.mutate(
                                      { id: panel.id, updates: { prompt: draftPrompt.trim() || null } },
                                      {
                                        onSuccess: () => {
                                          setEditingPanelId(null);
                                          setPromptDrafts((prev) => { const n = { ...prev }; delete n[panel.id]; return n; });
                                          toast({ title: "Contexte enregistré" });
                                        },
                                        onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
                                      }
                                    );
                                  }}
                                >
                                  {updatePanelMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                  Enregistrer
                                </Button>
                              </div>
                            )}
                          </div>
                          {isEditing ? (
                            <Textarea
                              value={draftPrompt}
                              onChange={(e) => setPromptDrafts((prev) => ({ ...prev, [panel.id]: e.target.value }))}
                              placeholder="Lieu / Scène / Personnages (contexte pour tous les blocs)…"
                              className="min-h-[80px] text-sm resize-y"
                              autoFocus
                            />
                          ) : (
                            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 min-h-[48px]">
                              <p className="text-sm whitespace-pre-wrap text-foreground/90">
                                {displayText || <span className="text-muted-foreground italic">Aucun contexte.</span>}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Blocs : prompt par bloc + Générer */}
                        {blocks.length > 0 && (
                          <div className="p-3 space-y-3">
                            <span className="text-xs font-medium text-muted-foreground">Blocs — prompt et génération</span>
                            {blocks.map((block, index) => {
                              const blockKey = `${panel.id}-${block.id}`;
                              const isEditingBlock = editingBlockKey === blockKey;
                              const blockDraft = blockPromptDrafts[blockKey] ?? block.prompt ?? "";
                              const blockDirty = isEditingBlock && blockDraft !== (block.prompt ?? "");
                              const isGenerating =
                                generatePanelImage.isPending && generatePanelImage.variables?.panel?.id === panel.id;
                              const dimDraft = blockDimensionDrafts[blockKey] ?? { width: block.width, height: block.height };
                              const dimDirty = dimDraft.width !== block.width || dimDraft.height !== block.height;
                              return (
                                <div key={block.id} className="rounded-lg border border-border p-3 space-y-2">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Bloc {index + 1} — {block.width}×{block.height} (éditable ci-dessous)
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {!isEditingBlock ? (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 gap-1 text-muted-foreground"
                                          onClick={() => {
                                            setEditingBlockKey(blockKey);
                                            setBlockPromptDrafts((prev) => ({ ...prev, [blockKey]: block.prompt ?? "" }));
                                          }}
                                        >
                                          <Pencil className="h-3 w-3" />
                                          Modifier
                                        </Button>
                                      ) : (
                                        <>
                                          <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingBlockKey(null)}>
                                            <X className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 gap-1"
                                            disabled={updatePanelMutation.isPending || !blockDirty}
                                            onClick={() => handleSaveBlockPrompt(block, blockDraft)}
                                          >
                                            <Save className="h-3 w-3" />
                                            Enregistrer
                                          </Button>
                                        </>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        disabled={updatePanelMutation.isPending}
                                        onClick={() => handleDeleteBlock(block)}
                                        title="Supprimer le bloc"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        Supprimer
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Édition largeur × hauteur */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                      Largeur
                                      <input
                                        type="number"
                                        min={100}
                                        max={PANEL_WIDTH}
                                        value={dimDraft.width}
                                        onChange={(e) =>
                                          setBlockDimensionDrafts((prev) => ({
                                            ...prev,
                                            [blockKey]: { ...dimDraft, width: Number(e.target.value) || 100 },
                                          }))
                                        }
                                        className="w-20 h-8 rounded border border-border bg-background px-2 text-sm"
                                      />
                                    </label>
                                    <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                      Hauteur
                                      <input
                                        type="number"
                                        min={100}
                                        max={PANEL_HEIGHT}
                                        value={dimDraft.height}
                                        onChange={(e) =>
                                          setBlockDimensionDrafts((prev) => ({
                                            ...prev,
                                            [blockKey]: { ...dimDraft, height: Number(e.target.value) || 100 },
                                          }))
                                        }
                                        className="w-20 h-8 rounded border border-border bg-background px-2 text-sm"
                                      />
                                    </label>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 gap-1"
                                      disabled={updatePanelMutation.isPending || !dimDirty}
                                      onClick={() => handleSaveBlockDimensions(block, dimDraft.width, dimDraft.height)}
                                    >
                                      <Save className="h-3 w-3" />
                                      Appliquer dimensions
                                    </Button>
                                  </div>

                                  {isEditingBlock ? (
                                    <Textarea
                                      value={blockDraft}
                                      onChange={(e) => setBlockPromptDrafts((prev) => ({ ...prev, [blockKey]: e.target.value }))}
                                      placeholder="Description visuelle de ce bloc…"
                                      className="min-h-[72px] text-sm resize-y"
                                      autoFocus
                                    />
                                  ) : (
                                    <p className="text-sm text-foreground/90 whitespace-pre-wrap min-h-[24px]">
                                      {block.prompt || <span className="text-muted-foreground italic">Aucun prompt.</span>}
                                    </p>
                                  )}
                                  {project && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5"
                                      disabled={
                                        (!(block.prompt?.trim()) && !(panel.prompt?.trim())) ||
                                        (!(project.style_template?.trim()) &&
                                          !(Array.isArray(project.style_image_urls) && project.style_image_urls.length > 0)) ||
                                        isGenerating
                                      }
                                      onClick={() => handleGenerateBlock(block)}
                                    >
                                      {isGenerating ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Sparkles className="h-3.5 w-3.5" />
                                      )}
                                      {block.image_url ? "Régénérer" : "Générer"}
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modale Agrandisseur : panel en grand */}
      <Dialog open={!!expandedPanelId} onOpenChange={(open) => !open && setExpandedPanelId(null)}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col gap-2" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              Panel en grand {expandedPanelId ? `— Panel ${panels.find((p) => p.id === expandedPanelId)?.panel_number ?? ""}` : ""}
            </DialogTitle>
          </DialogHeader>
          {expandedPanelId && (() => {
            const panel = panels.find((p) => p.id === expandedPanelId);
            if (!panel) return null;
            const blocks = getPanelBlocks(panel);
            return (
              <div className="overflow-auto flex-1 min-h-0 rounded border border-border" style={{ maxHeight: "calc(95vh - 120px)" }}>
                <div
                  className="relative shrink-0 mx-auto"
                  style={{
                    width: PANEL_WIDTH,
                    height: PANEL_HEIGHT,
                    backgroundImage: `
                      linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                      linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                    `,
                    backgroundSize: "24px 24px",
                    backgroundColor: "hsl(var(--muted) / 0.3)",
                  }}
                >
                  {panel.image_url && (
                    <div className="absolute inset-0">
                      <ImageWithFallback src={panel.image_url} alt="" className="w-full h-full object-contain object-top" />
                    </div>
                  )}
                  {blocks.map((block) => (
                    <div
                      key={block.id}
                      className="absolute overflow-hidden ring-1 ring-border bg-background/95"
                      style={{ left: block.x, top: block.y, width: block.width, height: block.height }}
                    >
                      {block.image_url ? (
                        <ImageWithFallback src={block.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 bg-muted/50">
                          Bloc
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
