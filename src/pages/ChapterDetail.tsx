// Écran d'édition d'un chapitre visuel — double visualisation + panels (liberté de création)
// Gauche : chapitre texte (scénario) avec Aperçu = surbrillance assets + hover. Droite : panels (l'utilisateur crée le nombre qu'il souhaite).
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScenarioTextHighlighter } from "@/components/project/ScenarioTextHighlighter";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { useChapter, useUpdateChapter } from "@/hooks/useChapters";
import { useScenarioChapters, useScenarioChapter } from "@/hooks/useScenarioChapters";
import { useAssets } from "@/hooks/useAssets";
import { useProject } from "@/hooks/useProjects";
import {
  usePanels,
  useCreatePanel,
  useUpdatePanel,
  useDeletePanel,
  useGeneratePanelImage,
} from "@/hooks/usePanels";
import {
  getPanelBlocks,
  getPanelHeight,
  getPanelLayout,
  DEFAULT_BLOCK_WIDTH,
  DEFAULT_BLOCK_HEIGHT,
  BLOCK_PRESETS,
  PANEL_HEIGHT_DEFAULT,
  PANEL_HEIGHT_MIN,
  PANEL_HEIGHT_MAX,
} from "@/services/panels";
import { updateScenarioChapter } from "@/services/scenarioChapters";
import type { Json } from "@/integrations/supabase/types";
import type { Chapter, Panel, PanelBlock, PanelLayout } from "@/types";

const PANEL_WIDTH = 800;

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
  const createPanelMutation = useCreatePanel(chapterId ?? "");
  const updatePanelMutation = useUpdatePanel(chapterId ?? "");
  const deletePanelMutation = useDeletePanel(chapterId ?? "");
  /** Panel dont la suppression est en attente de confirmation */
  const [panelToDeleteId, setPanelToDeleteId] = useState<string | null>(null);
  const generatePanelImage = useGeneratePanelImage(chapterId ?? "");
  const panelsQueryKey = ["panels", chapterId] as const;

  /** Brouillons des prompts par bloc : clé = `${panelId}-${blockId}` */
  const [blockPromptDrafts, setBlockPromptDrafts] = useState<Record<string, string>>({});
  const [blockNameDrafts, setBlockNameDrafts] = useState<Record<string, string>>({});
  /** Brouillon hauteur du panel (modale édition), chaîne pour autoriser le champ vide ; null = afficher la valeur réelle */
  const [panelHeightDraft, setPanelHeightDraft] = useState<string | null>(null);
  /** Bloc en cours d'édition de prompt : clé = `${panelId}-${blockId}` */
  const [editingBlockKey, setEditingBlockKey] = useState<string | null>(null);
  /** Brouillon dimensions par bloc : clé = `${panelId}-${blockId}` → { width, height } */
  const [blockDimensionDrafts, setBlockDimensionDrafts] = useState<Record<string, { width: number; height: number }>>({});
  /** Mode d'édition par panel : chaque panel a son propre mode (Architecture ou Édition) */
  const [panelEditModeByPanelId, setPanelEditModeByPanelId] = useState<Record<string, "architecture" | "edition">>({});
  /** Refs du canvas par panel (pour calcul position de dépôt quand on drop sur un bloc) */
  const canvasRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  /** Élément ghost pour le drag « nouveau bloc » (setDragImage) */
  const newBlockDragGhostRef = useRef<HTMLDivElement | null>(null);
  /** Drop move-block traité sur le canvas : ne pas nettoyer le preview dans onDragEnd pour éviter le saut visuel */
  const moveDropHandledRef = useRef(false);
  /** Ref vers l’élément DOM du bloc en cours de déplacement (opacity pendant le drag) */
  const draggingBlockElRef = useRef<HTMLDivElement | null>(null);
  /** Ghost de drag : un div par panel, positionné en direct (React ne le touche jamais) = temps réel garanti */
  const dragGhostRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  /** Données du bloc en cours de déplacement (tout en ref pour ne jamais déclencher de re-render) */
  const draggingBlockDataRef = useRef<{
    panelId: string;
    blockId: string;
    startBlockX: number;
    startBlockY: number;
    startMouseX: number;
    startMouseY: number;
    blockWidth: number;
    blockHeight: number;
    /** Cache rect au start (fallback si getBoundingClientRect indisponible pendant le move) */
    rectLeft: number;
    rectTop: number;
  } | null>(null);
  /** En cours de resize (annuler le drag du bloc) */
  const isResizingRef = useRef(false);
  /** Élément DOM du bloc en cours de resize (mise à jour directe = zéro re-render) */
  const resizingBlockElRef = useRef<HTMLDivElement | null>(null);
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
  /** Panel ouvert en modale « Edition » (id ou null) */
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null);
  /** Bloc sélectionné dans la modale (mode Personalisation) pour afficher le panneau droit */
  const [selectedBlockIdInModal, setSelectedBlockIdInModal] = useState<{ panelId: string; blockId: string } | null>(null);
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

  /** Clamp position/dimensions pour rester dans le panel (largeur fixe, hauteur variable). */
  const clampBlockToPanel = (x: number, y: number, w: number, h: number, panelHeight = PANEL_HEIGHT_DEFAULT) => {
    const width = Math.round(Math.max(100, Math.min(PANEL_WIDTH, w)));
    const height = Math.round(Math.max(100, Math.min(panelHeight, h)));
    const x2 = Math.round(Math.max(0, Math.min(PANEL_WIDTH - width, x)));
    const y2 = Math.round(Math.max(0, Math.min(panelHeight - height, y)));
    return { x: x2, y: y2, width: width, height: height };
  };

  /** Convertit viewport -> coords logiques canvas. getBoundingClientRect() reflète déjà le scroll (le canvas bouge dans la viewport), donc pas d’ajout de scroll. */
  const viewportToCanvas = (canvasEl: HTMLDivElement, clientX: number, clientY: number) => {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  /** Plus d’effet global pour le drag : tout se fait dans le pointerdown du bloc (refs + listeners) pour zéro re-render. */

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

      const panel = panels.find((p) => p.id === resizingState.panelId);
      const panelH = getPanelHeight(panel);
      w = Math.max(minW, Math.min(PANEL_WIDTH, w));
      h = Math.max(minH, Math.min(panelH, h));

      if (leftFixed) w = Math.min(w, PANEL_WIDTH - start.x);
      if (topFixed) h = Math.min(h, panelH - start.y);
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
      else y = Math.max(0, Math.min(panelH - h, y));

      return { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) };
    };

      const onMove = (e: PointerEvent) => {
        if (e.buttons !== 1) return;
        lastResizeMouseRef.current = { x: e.clientX, y: e.clientY };
        const result = computeFromMouse(e.clientX, e.clientY);
        const roundedResult = { x: Math.round(result.x), y: Math.round(result.y), width: Math.round(result.width), height: Math.round(result.height) };
        resizeDraftRef.current = roundedResult;
        setResizeDraft(roundedResult);
        const el = resizingBlockElRef.current;
        if (el) {
          el.style.left = `${roundedResult.x}px`;
          el.style.top = `${roundedResult.y}px`;
          el.style.width = `${roundedResult.width}px`;
          el.style.height = `${roundedResult.height}px`;
        }
      };
    const onUp = () => {
      const lastClient = lastResizeMouseRef.current;
      const rawResult = lastClient
        ? computeFromMouse(lastClient.x, lastClient.y)
        : resizeDraftRef.current ?? { x: start.x, y: start.y, width: start.w, height: start.h };
      const result = { x: Math.round(rawResult.x), y: Math.round(rawResult.y), width: Math.round(rawResult.width), height: Math.round(rawResult.height) };
      const hadSave = !!saveResizeRef.current;
      saveResizeRef.current?.(result);
      saveResizeRef.current = null;
      if (!hadSave) {
        resizingBlockElRef.current = null;
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
  }, [resizingState, panels]);

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

  const renderPanelEditor = (panel: Panel) => {
    const layout = getPanelLayout(panel);
    const blocks = getPanelBlocks(panel);
    const panelHeight = getPanelHeight(panel);
    const mode = panelEditModeByPanelId[panel.id] ?? "architecture";
    const selectedBlock = selectedBlockIdInModal?.panelId === panel.id && selectedBlockIdInModal?.blockId
      ? blocks.find((b) => b.id === selectedBlockIdInModal.blockId)
      : null;

    const handleAddBlock = (atX?: number, atY?: number, width = DEFAULT_BLOCK_WIDTH, height = DEFAULT_BLOCK_HEIGHT) => {
      const w = Math.max(100, Math.min(PANEL_WIDTH, width));
      const h = Math.max(100, Math.min(panelHeight, height));
      const x = Math.max(0, Math.min(PANEL_WIDTH - w, atX ?? 0));
      const y = Math.max(0, Math.min(panelHeight - h, atY ?? 0));
      const newBlock: PanelBlock = {
        id: crypto.randomUUID(),
        x, y, width: w, height: h,
        name: `Bloc ${layout.blocks.length + 1}`,
        prompt: null, image_url: null,
      };
      const newLayout: PanelLayout = { ...layout, blocks: [...layout.blocks, newBlock] };
      updatePanelMutation.mutate(
        { id: panel.id, updates: { layout: newLayout as unknown as Json } },
        { onSuccess: () => toast({ title: "Bloc ajouté" }), onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
      );
    };

    const getCanvasDropPosition = (e: React.DragEvent, canvasEl?: HTMLDivElement | null, maxW = DEFAULT_BLOCK_WIDTH, maxH = DEFAULT_BLOCK_HEIGHT) => {
      const el = canvasEl ?? canvasRefByPanel.current[panel.id] ?? (e.currentTarget as HTMLDivElement);
      if (!el) return { x: 0, y: 0 };
      const { x: canvasX, y: canvasY } = viewportToCanvas(el, e.clientX, e.clientY);
      const x = Math.round(canvasX - maxW / 2);
      const y = Math.round(canvasY - maxH / 2);
      return { x: Math.max(0, Math.min(PANEL_WIDTH - maxW, x)), y: Math.max(0, Math.min(panelHeight - maxH, y)) };
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
          const newY = Math.max(0, Math.min(panelHeight - block.height, draggingBlock.startBlockY + (canvasMouseY - draggingBlock.startMouseY)));
          setDragPreview({ panelId: panel.id, blockId: block.id, x: newX, y: newY });
        }
      }
    };

    const handleCanvasDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (mode === "edition") return;
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const canvasEl = canvasRefByPanel.current[panel.id];
      try {
        const data = JSON.parse(raw) as { type: string; blockId?: string; width?: number; height?: number };
        if (data.type === "new-block") {
          const w = typeof data.width === "number" ? data.width : DEFAULT_BLOCK_WIDTH;
          const h = typeof data.height === "number" ? data.height : DEFAULT_BLOCK_HEIGHT;
          const { x, y } = getCanvasDropPosition(e, canvasEl, w, h);
          handleAddBlock(x, y, w, h);
          setDraggingBlock(null);
          setDragPreview(null);
          return;
        }
        if (data.type === "move-block" && data.blockId) {
          const block = layout.blocks.find((b) => b.id === data.blockId);
          if (block && draggingBlock && draggingBlock.panelId === panel.id && draggingBlock.blockId === data.blockId && canvasEl) {
            const { x: canvasMouseX, y: canvasMouseY } = viewportToCanvas(canvasEl, e.clientX, e.clientY);
            const clampedX = Math.max(0, Math.min(PANEL_WIDTH - block.width, Math.round(draggingBlock.startBlockX + (canvasMouseX - draggingBlock.startMouseX))));
            const clampedY = Math.max(0, Math.min(panelHeight - block.height, Math.round(draggingBlock.startBlockY + (canvasMouseY - draggingBlock.startMouseY))));
            const blockIndex = layout.blocks.findIndex((b) => b.id === data.blockId);
            const nextBlocks = layout.blocks.map((b, i) => (i === blockIndex ? { ...b, x: clampedX, y: clampedY } : b));
            moveDropHandledRef.current = true;
            const movePayload = { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } };
            queryClient.cancelQueries({ queryKey: panelsQueryKey });
            const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
            queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === movePayload.id ? { ...p, layout: movePayload.updates.layout ?? p.layout } : p))));
            setDraggingBlock(null);
            setDragPreview(null);
            updatePanelMutation.mutate(movePayload, {
              onSuccess: () => { moveDropHandledRef.current = false; queryClient.refetchQueries({ queryKey: panelsQueryKey }); },
              onError: (err) => {
                moveDropHandledRef.current = false;
                setDraggingBlock(null);
                setDragPreview(null);
                if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels);
                toast({ title: "Erreur", description: err.message, variant: "destructive" });
              },
            });
          } else {
            setDraggingBlock(null);
            setDragPreview(null);
          }
        }
      } catch { /* ignore */ }
    };

    const handleSaveBlockDimensions = (block: PanelBlock, width: number, height: number) => {
      const { x, y, width: w, height: h } = clampBlockToPanel(block.x, block.y, width, height, panelHeight);
      const nextBlocks = layout.blocks.map((b) => (b.id === block.id ? { ...b, x, y, width: w, height: h } : b));
      updatePanelMutation.mutate(
        { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } },
        {
          onSuccess: () => { setBlockDimensionDrafts((prev) => { const next = { ...prev }; delete next[`${panel.id}-${block.id}`]; return next; }); },
          onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
        }
      );
    };

    const handleSaveBlockName = (block: PanelBlock, name: string) => {
      const nextBlocks = layout.blocks.map((b) => (b.id === block.id ? { ...b, name: name.trim() || null } : b));
      updatePanelMutation.mutate(
        { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } },
        { onSuccess: () => toast({ title: "Nom enregistré" }), onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
      );
    };

    const handlePanelHeightChange = (newHeight: number) => {
      const h = Math.max(PANEL_HEIGHT_MIN, Math.min(PANEL_HEIGHT_MAX, newHeight));
      const clampedBlocks = layout.blocks.map((b) => {
        const maxY = h - b.height;
        const y = Math.max(0, Math.min(maxY, b.y));
        return { ...b, y };
      });
      const newLayout: PanelLayout = { ...layout, panelHeight: h, blocks: clampedBlocks };
      queryClient.cancelQueries({ queryKey: panelsQueryKey });
      const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
      queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) =>
        !old ? old : old.map((p) => (p.id === panel.id ? { ...p, layout: newLayout as unknown as Json } : p))
      );
      updatePanelMutation.mutate(
        { id: panel.id, updates: { layout: newLayout as unknown as Json } },
        {
          onSuccess: () => {
            toast({ title: "Hauteur du panel enregistrée" });
            queryClient.invalidateQueries({ queryKey: panelsQueryKey });
          },
          onError: (err) => {
            if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels);
            toast({ title: "Erreur", description: err.message, variant: "destructive" });
          },
        }
      );
    };

    const handleDeleteBlock = (block: PanelBlock) => {
      const nextBlocks = layout.blocks.filter((b) => b.id !== block.id);
      if (selectedBlockIdInModal?.blockId === block.id) setSelectedBlockIdInModal(null);
      updatePanelMutation.mutate(
        { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } },
        {
          onSuccess: () => {
            setEditingBlockKey((k) => (k === `${panel.id}-${block.id}` ? null : k));
            setBlockPromptDrafts((prev) => { const next = { ...prev }; delete next[`${panel.id}-${block.id}`]; return next; });
            toast({ title: "Bloc supprimé" });
          },
          onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
        }
      );
    };

    const handleSaveBlockPrompt = (block: PanelBlock, newPrompt: string, options?: { silent?: boolean }) => {
      const nextBlocks = layout.blocks.map((b) => (b.id === block.id ? { ...b, prompt: newPrompt.trim() || null } : b));
      updatePanelMutation.mutate(
        { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } },
        {
          onSuccess: () => {
            setEditingBlockKey(null);
            if (!options?.silent) {
              setBlockPromptDrafts((prev) => { const next = { ...prev }; delete next[`${panel.id}-${block.id}`]; return next; });
              toast({ title: "Prompt du bloc enregistré" });
            }
          },
          onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
        }
      );
    };

    const handleSaveBlockAssetRefs = (block: PanelBlock, assetIds: string[]) => {
      const nextBlocks = layout.blocks.map((b) => (b.id === block.id ? { ...b, asset_refs: assetIds.length ? assetIds : undefined } : b));
      updatePanelMutation.mutate(
        { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } },
        { onSuccess: () => toast({ title: "Assets du bloc enregistrés" }), onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
      );
    };

    const handleGenerateBlock = (block: PanelBlock) => {
      const promptToUse = (blockPromptDrafts[`${panel.id}-${block.id}`] ?? block.prompt ?? "").trim() || (panel.prompt ?? "").trim();
      if (!project) return;
      const hasStyle = (project.style_template?.trim()?.length ?? 0) > 0 || (Array.isArray(project.style_image_urls) && project.style_image_urls.length > 0);
      if (!hasStyle) {
        toast({ title: "Style requis", description: "Définissez un style dans l'onglet Style du projet avant de générer.", variant: "destructive" });
        return;
      }
      if (!promptToUse) {
        toast({ title: "Prompt requis", description: "Saisissez un prompt pour ce bloc (ou une description au panel).", variant: "destructive" });
        return;
      }
      const contextChapter = panel.prompt?.trim() || null;
      const refIds = block.asset_refs ?? [];
      const refAssets = refIds.map((id) => assets.find((a) => a.id === id)).filter(Boolean) as typeof assets;
      const blockAssetImageUrls = refAssets.map((a) => a.image_url).filter((url): url is string => !!url);
      const blockAssetNames = refAssets.map((a) => a.name ?? a.id.slice(0, 8));
      generatePanelImage.mutate(
        { panel: { id: panel.id, prompt: promptToUse }, block: { id: block.id, width: block.width, height: block.height }, project, contextChapter: contextChapter ?? undefined, blockAssetImageUrls: blockAssetImageUrls.length ? blockAssetImageUrls : undefined, blockAssetNames: blockAssetNames.length ? blockAssetNames : undefined },
        {
          onSuccess: (result) => {
            toast({ title: "Image générée" });
            const blockIndex = layout.blocks.findIndex((b) => b.id === block.id);
            if (blockIndex >= 0) {
              const nextBlocks = layout.blocks.map((b, i) => (i === blockIndex ? { ...b, image_url: result.image_url } : b));
              updatePanelMutation.mutate({ id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } });
            }
          },
          onError: (err) => toast({ title: "Génération échouée", description: err.message, variant: "destructive" }),
        }
      );
    };

    return (
      <div className="flex flex-1 min-h-0 overflow-hidden rounded-b-lg" style={{ maxHeight: "calc(95vh - 80px)" }}>
        {/* Gauche : contrôles — contexte et hauteur du panel (pas la liste des blocs) */}
        <aside className="w-[360px] shrink-0 flex flex-col border-r border-border bg-background overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Mode</span>
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(v) => { if (v) { setPanelEditModeByPanelId((prev) => ({ ...prev, [panel.id]: v as "architecture" | "edition" })); if (v === "architecture") setSelectedBlockIdInModal(null); } }}
                variant="outline"
                size="sm"
                className="rounded-xl border border-border/60 bg-muted/20 p-1 w-full grid grid-cols-2"
              >
                <ToggleGroupItem value="architecture" className="rounded-lg">Architecture</ToggleGroupItem>
                <ToggleGroupItem value="edition" className="rounded-lg">Personalisation</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="min-h-10 rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2">
              {mode === "architecture" ? (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground block">Bibliothèque de blocs — glisser sur le panel</span>
                  <div className="flex flex-wrap gap-2">
                    {BLOCK_PRESETS.map((preset) => (
                      <div
                        key={preset.label}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/json", JSON.stringify({ type: "new-block", width: preset.width, height: preset.height }));
                          e.dataTransfer.effectAllowed = "copy";
                          const ghost = newBlockDragGhostRef.current;
                          if (ghost) e.dataTransfer.setDragImage(ghost, Math.min(250, preset.width / 2), Math.min(250, preset.height / 2));
                        }}
                        className="cursor-grab active:cursor-grabbing rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        {preset.label}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="w-full text-center text-sm text-muted-foreground/80 block py-1" aria-hidden>Cliquez sur un bloc dans le panel pour l'éditer</span>
              )}
            </div>
            {mode === "architecture" && (
              <div className="space-y-2 rounded-xl bg-muted/20 p-3 border border-border/50">
                <span className="text-xs font-medium text-muted-foreground">Hauteur du panel</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={panelHeightDraft !== null ? panelHeightDraft : String(layout.panelHeight ?? PANEL_HEIGHT_DEFAULT)}
                    onChange={(e) => setPanelHeightDraft(e.target.value)}
                    className="w-24 h-9 rounded-lg border border-border/60 bg-background px-2 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">px</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-lg"
                    onClick={() => {
                      const raw = panelHeightDraft !== null ? panelHeightDraft.trim() : null;
                      const num = raw === null
                        ? (layout.panelHeight ?? PANEL_HEIGHT_DEFAULT)
                        : (raw === "" ? PANEL_HEIGHT_MIN : Math.max(PANEL_HEIGHT_MIN, Math.min(PANEL_HEIGHT_MAX, Number(raw) || PANEL_HEIGHT_MIN)));
                      handlePanelHeightChange(num);
                      setPanelHeightDraft(null);
                    }}
                  >
                    Appliquer
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground/80">Min {PANEL_HEIGHT_MIN} — max {PANEL_HEIGHT_MAX}. Vide = min par défaut.</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-border/60 space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Scénario</span>
            {loadingScenario ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : scenarioChapter?.content ? (
              <div className="rounded-md border border-border bg-muted/30 p-3 min-h-[80px] max-h-[40vh] overflow-y-auto">
                <ScenarioTextHighlighter text={scenarioChapter.content} assets={assets} className="text-sm" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic py-2">Aucun chapitre scénario lié.</p>
            )}
          </div>
        </aside>
        {/* Centre : panel 800px de large exactement */}
        <div className="flex-1 min-w-0 flex items-start justify-center overflow-auto p-6 bg-background">
          <div className="rounded-2xl border-2 border-border bg-muted shadow-lg min-w-0 ring-2 ring-border/60 shadow-[inset_0_3px_8px_-2px_rgba(0,0,0,0.15),inset_0_-3px_8px_-2px_rgba(0,0,0,0.15)]">
            <div className="relative shrink-0 bg-muted rounded-xl overflow-hidden" style={{ width: PANEL_WIDTH, height: panelHeight }}>
              <div
                ref={(el) => { if (el) canvasRefByPanel.current[panel.id] = el; }}
                className="absolute left-0 top-0 rounded-lg overflow-hidden"
                style={{
                  width: PANEL_WIDTH,
                  height: panelHeight,
                  backgroundImage: "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                  backgroundColor: "hsl(var(--muted))",
                }}
                onDragOver={handleCanvasDragOver}
                onDrop={handleCanvasDrop}
              >
              {blocks.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6 text-muted-foreground text-sm">
                  <Square className="h-10 w-10 opacity-50" />
                  <p>Aucun bloc. Glissez un bloc depuis la bibliothèque (gauche) ou ajoutez un premier bloc.</p>
                  <Button size="sm" variant="outline" onClick={() => handleAddBlock(0, 0)} disabled={updatePanelMutation.isPending}>
                    <Plus className="h-4 w-4 mr-1.5" /> Ajouter un bloc
                  </Button>
                </div>
              ) : (
                blocks.map((block, blockIndex) => {
                  const isThisResizing = resizingState?.panelId === panel.id && resizingState?.blockId === block.id;
                  const useResizeDraft = isThisResizing && resizeDraft != null && isResizingRef.current;
                  const rawGeom = useResizeDraft ? resizeDraft : { x: block.x, y: block.y, width: block.width, height: block.height };
                  const geom = { x: Math.round(rawGeom.x), y: Math.round(rawGeom.y), width: Math.round(rawGeom.width), height: Math.round(rawGeom.height) };
                  const isSelected = mode === "edition" && selectedBlockIdInModal?.panelId === panel.id && selectedBlockIdInModal?.blockId === block.id;
                  return (
                    <div
                      key={block.id}
                      ref={isThisResizing ? (el) => { if (el) resizingBlockElRef.current = el; } : undefined}
                      draggable={false}
                      onPointerDown={mode === "architecture" && !isThisResizing ? (e) => {
                        if (e.button !== 0 || isResizingRef.current) return;
                        e.preventDefault();
                        const canvasEl = canvasRefByPanel.current[panel.id];
                        if (!canvasEl) return;
                        const rect = canvasEl.getBoundingClientRect();
                        const startMouseX = e.clientX - rect.left;
                        const startMouseY = e.clientY - rect.top;
                        const el = e.currentTarget as HTMLDivElement;
                        draggingBlockElRef.current = el;
                        draggingBlockDataRef.current = { panelId: panel.id, blockId: block.id, startBlockX: block.x, startBlockY: block.y, startMouseX, startMouseY, blockWidth: block.width, blockHeight: block.height, rectLeft: rect.left, rectTop: rect.top };
                        const ghost = dragGhostRefByPanel.current[panel.id];
                        if (ghost) {
                          ghost.style.display = "block";
                          ghost.style.left = `${block.x}px`;
                          ghost.style.top = `${block.y}px`;
                          ghost.style.width = `${block.width}px`;
                          ghost.style.height = `${block.height}px`;
                        }
                        el.style.opacity = "0.35";
                        const panelH = getPanelHeight(panel);
                        const onPointerMove = (ev: PointerEvent) => {
                          const data = draggingBlockDataRef.current;
                          if (!data) return;
                          const canvas = canvasRefByPanel.current[data.panelId];
                          const rect = canvas?.getBoundingClientRect();
                          const canvasMouseX = rect ? ev.clientX - rect.left : ev.clientX - data.rectLeft;
                          const canvasMouseY = rect ? ev.clientY - rect.top : ev.clientY - data.rectTop;
                          const newX = Math.max(0, Math.min(PANEL_WIDTH - data.blockWidth, data.startBlockX + (canvasMouseX - data.startMouseX)));
                          const newY = Math.max(0, Math.min(panelH - data.blockHeight, data.startBlockY + (canvasMouseY - data.startMouseY)));
                          const g = dragGhostRefByPanel.current[data.panelId];
                          if (g) { g.style.left = `${newX}px`; g.style.top = `${newY}px`; }
                        };
                        const onPointerUp = (ev: PointerEvent) => {
                          if (ev.button !== 0) return;
                          document.removeEventListener("pointermove", onPointerMove, true);
                          document.removeEventListener("pointerup", onPointerUp, true);
                          const data = draggingBlockDataRef.current;
                          draggingBlockDataRef.current = null;
                          const dragEl = draggingBlockElRef.current;
                          if (dragEl) { dragEl.style.opacity = ""; draggingBlockElRef.current = null; }
                          const g = data && dragGhostRefByPanel.current[data.panelId];
                          if (g) g.style.display = "none";
                          if (!data) return;
                          const canvas = canvasRefByPanel.current[data.panelId];
                          const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
                          const panelUp = currentPanels.find((p) => p.id === data.panelId);
                          const layoutUp = getPanelLayout(panelUp ?? panel);
                          const blockUp = layoutUp.blocks.find((b) => b.id === data.blockId);
                          if (!blockUp || !canvas) return;
                          const { x: canvasMouseX, y: canvasMouseY } = viewportToCanvas(canvas, ev.clientX, ev.clientY);
                          const clampedX = Math.max(0, Math.min(PANEL_WIDTH - blockUp.width, Math.round(data.startBlockX + (canvasMouseX - data.startMouseX))));
                          const clampedY = Math.max(0, Math.min(getPanelHeight(panelUp ?? panel) - blockUp.height, Math.round(data.startBlockY + (canvasMouseY - data.startMouseY))));
                          const blockIndexUp = layoutUp.blocks.findIndex((b) => b.id === data.blockId);
                          const nextBlocks = layoutUp.blocks.map((b, i) => (i === blockIndexUp ? { ...b, x: clampedX, y: clampedY } : b));
                          moveDropHandledRef.current = true;
                          const movePayload = { id: data.panelId, updates: { layout: { ...layoutUp, blocks: nextBlocks } as unknown as Json } };
                          queryClient.cancelQueries({ queryKey: panelsQueryKey });
                          const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
                          queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === movePayload.id ? { ...p, layout: movePayload.updates.layout ?? p.layout } : p))));
                          updatePanelMutation.mutate(movePayload, {
                            onSuccess: () => { moveDropHandledRef.current = false; queryClient.refetchQueries({ queryKey: panelsQueryKey }); },
                            onError: (err) => {
                              moveDropHandledRef.current = false;
                              if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels);
                              toast({ title: "Erreur", description: err.message, variant: "destructive" });
                            },
                          });
                        };
                        document.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
                        document.addEventListener("pointerup", onPointerUp, true);
                      } : undefined}
                      onClick={mode === "edition" ? (e) => { e.stopPropagation(); setSelectedBlockIdInModal({ panelId: panel.id, blockId: block.id }); } : undefined}
                      className={`group absolute overflow-visible bg-background border border-border shadow-md transition-all duration-150 ${mode === "architecture" ? "cursor-grab active:cursor-grabbing ring-2 ring-primary/60" : `cursor-pointer ${isSelected ? "ring-2 ring-primary shadow-lg ring-offset-2 ring-offset-background" : "ring-1 ring-border/80 hover:ring-2 hover:ring-primary/50 hover:shadow-md"}`}`}
                      style={{ left: geom.x, top: geom.y, width: geom.width, height: geom.height }}
                      title={mode === "edition" ? `Clique — ${block.name ?? `Bloc ${blockIndex + 1}`}` : mode === "architecture" ? `Déplacer — ${block.name ?? `Bloc ${blockIndex + 1}`}` : `Bloc ${blockIndex + 1}`}
                    >
                      {mode === "architecture" && (
                        <button
                          type="button"
                          className="absolute bottom-[25%] left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-md bg-destructive/90 text-destructive-foreground opacity-0 shadow-md transition-opacity hover:bg-destructive group-hover:opacity-100"
                          title="Supprimer le bloc"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteBlock(block); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <div className="w-full h-full overflow-hidden pointer-events-none">
                        {block.image_url ? (
                          <ImageWithFallback src={block.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-xs text-muted-foreground p-2 text-center bg-muted/50 gap-1">
                            <div>{mode === "architecture" ? "Déplacer" : mode === "edition" ? "Clique" : block.prompt ? "Prompt défini — Générer ci-dessous" : "Saisir le prompt ci-dessous"}</div>
                            <div className="text-[10px] opacity-70">{Math.round(geom.width)} × {Math.round(geom.height)}</div>
                          </div>
                        )}
                      </div>
                      {mode === "architecture" && [
                        { edge: "r" as const, style: { right: 0, top: 0, bottom: 0, width: 9 }, cursor: "ew-resize" },
                        { edge: "b" as const, style: { bottom: 0, left: 0, right: 0, height: 9 }, cursor: "ns-resize" },
                        { edge: "l" as const, style: { left: 0, top: 0, bottom: 0, width: 9 }, cursor: "ew-resize" },
                        { edge: "t" as const, style: { top: 0, left: 0, right: 0, height: 9 }, cursor: "ns-resize" },
                        { edge: "tl" as const, style: { left: 0, top: 0, width: 15, height: 15 }, cursor: "nwse-resize" },
                        { edge: "tr" as const, style: { right: 0, top: 0, width: 15, height: 15 }, cursor: "nesw-resize" },
                        { edge: "br" as const, style: { right: 0, bottom: 0, width: 15, height: 15 }, cursor: "nwse-resize" },
                        { edge: "bl" as const, style: { left: 0, bottom: 0, width: 15, height: 15 }, cursor: "nesw-resize" },
                      ].map(({ edge, style, cursor }) => (
                        <div
                          key={edge}
                          className="absolute z-10 rounded-sm transition-colors hover:bg-primary/30"
                          style={{ ...style, cursor }}
                          onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            e.preventDefault();
                            e.stopPropagation();
                            isResizingRef.current = true;
                            resizeCaptureTargetRef.current = e.currentTarget;
                            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                            setResizingState({ panelId: panel.id, blockId: block.id, edge, start: { x: block.x, y: block.y, w: block.width, h: block.height }, startMouse: { x: e.clientX, y: e.clientY } });
                            const initial = { x: block.x, y: block.y, width: block.width, height: block.height };
                            setResizeDraft(initial);
                            resizeDraftRef.current = initial;
                            saveResizeRef.current = (draft) => {
                              const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
                              const currentPanel = currentPanels.find((p) => p.id === panel.id);
                              const currentBlocks = getPanelBlocks(currentPanel ?? panel);
                              const roundedDraft = { x: Math.round(draft.x), y: Math.round(draft.y), width: Math.round(draft.width), height: Math.round(draft.height) };
                              const nextBlocks = currentBlocks.map((b) => (b.id === block.id ? { ...b, x: roundedDraft.x, y: roundedDraft.y, width: roundedDraft.width, height: roundedDraft.height } : b));
                              const payload = { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } };
                              queryClient.cancelQueries({ queryKey: panelsQueryKey });
                              const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
                              queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === payload.id ? { ...p, layout: payload.updates.layout } : p))));
                              setResizingState(null);
                              setResizeDraft(null);
                              resizeDraftRef.current = null;
                              lastResizeMouseRef.current = null;
                              resizeCaptureTargetRef.current = null;
                              resizingBlockElRef.current = null;
                              isResizingRef.current = false;
                              updatePanelMutation.mutate(payload, {
                                onSuccess: () => {},
                                onError: (err) => {
                                  if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels);
                                  toast({ title: "Erreur", description: err.message, variant: "destructive" });
                                },
                              });
                            };
                          }}
                          aria-label="Redimensionner"
                        />
                      ))}
                    </div>
                                );
                                })
                              )}
              {/* Ghost de drag : position mis à jour uniquement en JS (temps réel, aucun re-render) */}
              <div
                ref={(el) => { if (el) dragGhostRefByPanel.current[panel.id] = el; }}
                aria-hidden
                className="pointer-events-none absolute z-50 rounded-lg border-2 border-primary bg-background/95 shadow-lg box-border"
                style={{ display: "none", left: 0, top: 0, width: 0, height: 0 }}
              />
              </div>
            </div>
          </div>
        </div>
        {/* Droite : détail du bloc sélectionné (mode Personalisation) */}
        {mode === "edition" && selectedBlock && (
          <aside className="w-[340px] shrink-0 flex flex-col border-l border-border bg-background overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-foreground">Bloc sélectionné</h4>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => setSelectedBlockIdInModal(null)} aria-label="Fermer"><X className="h-4 w-4" /></Button>
              </div>
              {(() => {
                const block = selectedBlock;
                const blockKey = `${panel.id}-${block.id}`;
                const nameDraft = blockNameDrafts[blockKey] ?? block.name ?? "";
                const promptDraft = blockPromptDrafts[blockKey] ?? block.prompt ?? "";
                const isGenerating = generatePanelImage.isPending && generatePanelImage.variables?.panel?.id === panel.id;
                return (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Nom du bloc</label>
                      <input
                        type="text"
                        value={nameDraft}
                        onChange={(e) => setBlockNameDrafts((prev) => ({ ...prev, [blockKey]: e.target.value }))}
                        onBlur={() => { if (nameDraft.trim() !== (block.name ?? "")) handleSaveBlockName(block, nameDraft); }}
                        placeholder="Ex. Bloc 1"
                        className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Prompt visuel</label>
                      <Textarea
                        value={promptDraft}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBlockPromptDrafts((prev) => ({ ...prev, [blockKey]: v }));
                          handleSaveBlockPrompt(block, v, { silent: true });
                        }}
                        placeholder="Description visuelle de ce bloc…"
                        className="min-h-[100px] text-sm resize-y"
                      />
                      {(promptDraft.trim() || (block.prompt ?? "").trim()) && (
                        <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
                          <ScenarioTextHighlighter text={promptDraft.trim() || (block.prompt ?? "").trim()} assets={assets} className="text-sm min-h-0" hideIndicator />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">Dimensions</span>
                      <p className="text-sm text-foreground tabular-nums">{block.width} × {Math.round(block.height)}</p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">Assets pour ce bloc</span>
                      <p className="text-[11px] text-muted-foreground/80">Sélectionnez les personnages, décors et objets à inclure dans la génération.</p>
                      {assets.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Aucun asset dans le projet.</p>
                      ) : (
                        <div className="max-h-[200px] overflow-y-auto space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-2">
                          {assets.map((asset) => {
                            const isChecked = (block.asset_refs ?? []).includes(asset.id);
                            return (
                              <label key={asset.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const refs = block.asset_refs ?? [];
                                    const next = isChecked ? refs.filter((id) => id !== asset.id) : [...refs, asset.id];
                                    handleSaveBlockAssetRefs(block, next);
                                  }}
                                  className="rounded border-border"
                                />
                                <span className="flex-1 min-w-0 truncate text-sm">{asset.name ?? asset.id.slice(0, 8)}</span>
                                {asset.image_url && (
                                  <div className="w-8 h-8 shrink-0 rounded overflow-hidden border border-border/60 bg-muted">
                                    <ImageWithFallback src={asset.image_url} alt="" className="w-full h-full object-cover" />
                                  </div>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {project && (
                      <Button size="sm" variant="outline" className="w-full gap-1.5" disabled={(!(block.prompt?.trim()) && !(panel.prompt?.trim())) || (!(project.style_template?.trim()) && !(Array.isArray(project.style_image_urls) && project.style_image_urls.length > 0)) || isGenerating} onClick={() => handleGenerateBlock(block)}>
                        {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{block.image_url ? "Régénérer l'image" : "Générer l'image"}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={updatePanelMutation.isPending} onClick={() => handleDeleteBlock(block)}><Trash2 className="h-3 w-3" /> Supprimer le bloc</Button>
                  </>
                );
              })()}
            </div>
          </aside>
        )}
      </div>
    );
  };

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
                {PANEL_WIDTH}×{PANEL_HEIGHT_DEFAULT}
              </strong>{" "}
              pixels par défaut (blocs, bulles, effets).
            </p>

            <div className="w-full max-w-[840px] rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">
                  Liberté de création
                </p>
                <p className="mt-1">
                  Vous êtes libre de créer autant de panels que vous le souhaitez. Le scénario à gauche vous sert de référence ; l'agencement des panels et des blocs est à vous.
                </p>
            </div>

            {panels.length === 0 ? (
              <div className="w-full max-w-[840px] glass rounded-xl border border-border overflow-hidden">
                <div className="flex flex-col items-center justify-center gap-5 py-10 px-6 text-center">
                  <div className="rounded-full bg-muted/60 p-4">
                    <LayoutPanelTop className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-medium text-foreground">
                      Aucun panel
                    </p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Créez votre premier panel pour commencer à composer la planche.
                    </p>
                  </div>
                  <Button
                    onClick={() => createPanelMutation.mutate(undefined, {
                      onSuccess: () => toast({ title: "Panel ajouté" }),
                      onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
                    })}
                    disabled={!chapterId || createPanelMutation.isPending}
                    variant="outline"
                    className="w-full max-w-sm gap-2 h-11 rounded-xl border-dashed border-2 border-border/80 bg-muted/30 hover:bg-muted/50 hover:border-primary/30 text-foreground font-medium"
                  >
                    {createPanelMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Ajouter un panel
                  </Button>
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
                    return (
                      <div
                        key={panel.id}
                        className="glass rounded-xl overflow-hidden border border-border max-w-[840px]"
                      >
                        <div className="p-3 border-b border-border flex flex-wrap items-center justify-between gap-4">
                          <h3 className="font-medium text-sm shrink-0">
                            Panel {panel.panel_number} — {PANEL_WIDTH}×{getPanelHeight(panel)}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => setExpandedPanelId(panel.id)}
                              title="Ouvrir l'édition du panel"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edition
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setPanelToDeleteId(panel.id)}
                              title="Supprimer le panel"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Supprimer
                            </Button>
                          </div>
                        </div>

                        {/* Vue lecture seule du panel — édition dans la modale */}
                        <div
                          className="overflow-x-hidden overflow-y-auto"
                          style={{ maxHeight: "80vh" }}
                        >
                          <div className="border-b border-border pl-4 pr-6 py-[15px] min-w-[840px]">
                            <div className="mx-auto w-max relative rounded-xl border border-border bg-muted shadow-[inset_0_3px_8px_-2px_rgba(0,0,0,0.15),inset_0_-3px_8px_-2px_rgba(0,0,0,0.15)]" style={{ width: PANEL_WIDTH, height: getPanelHeight(panel) }}>
                              <div
                                className="absolute left-0 top-0 rounded-lg overflow-hidden"
                                style={{
                                  width: PANEL_WIDTH,
                                  height: getPanelHeight(panel),
                                  backgroundColor: "hsl(var(--muted))",
                                }}
                              >
                              {blocks.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6 text-muted-foreground text-sm">
                                  <Square className="h-10 w-10 opacity-50" />
                                  <p>Aucun bloc. Cliquez sur Edition pour configurer le panel.</p>
                                </div>
                              ) : (
                                blocks.map((block) => (
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
                                ))
                              )}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {panels.length > 0 && (
              <div className="pt-4 w-full max-w-[840px]">
                <Button
                  onClick={() => createPanelMutation.mutate(undefined, {
                    onSuccess: () => toast({ title: "Panel ajouté" }),
                    onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
                  })}
                  disabled={!chapterId || createPanelMutation.isPending}
                  variant="outline"
                  className="w-full gap-2 h-11 rounded-xl border-dashed border-2 border-border/80 bg-muted/30 hover:bg-muted/50 hover:border-primary/30 text-foreground font-medium"
                >
                  {createPanelMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Ajouter un panel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation suppression panel */}
      <AlertDialog open={!!panelToDeleteId} onOpenChange={(open) => { if (!open) setPanelToDeleteId(null); }}>
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce panel ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le panel et tous ses blocs seront définitivement supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!panelToDeleteId) return;
                deletePanelMutation.mutate(panelToDeleteId, {
                  onSuccess: () => {
                    if (expandedPanelId === panelToDeleteId) setExpandedPanelId(null);
                    setPanelToDeleteId(null);
                    toast({ title: "Panel supprimé" });
                  },
                  onError: (err) => {
                    toast({ title: "Erreur", description: err.message, variant: "destructive" });
                  },
                });
              }}
              disabled={deletePanelMutation.isPending}
            >
              {deletePanelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modale Edition : architecture et personnalisation du panel */}
      <Dialog open={!!expandedPanelId} onOpenChange={(open) => { if (!open) { setExpandedPanelId(null); setSelectedBlockIdInModal(null); setPanelHeightDraft(null); } }}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col gap-0 p-0 bg-background border-border" aria-describedby={undefined}>
          <DialogHeader className="px-6 py-4 border-b border-border bg-background shrink-0">
            <DialogTitle className="text-base font-medium">
              Edition du panel {expandedPanelId ? `— Panel ${panels.find((p) => p.id === expandedPanelId)?.panel_number ?? ""}` : ""}
            </DialogTitle>
          </DialogHeader>
          {expandedPanelId && (() => {
            const panel = panels.find((p) => p.id === expandedPanelId);
            if (!panel) return null;
            return renderPanelEditor(panel);
          })()}
        </DialogContent>
      </Dialog>

      {/* Ghost pour le drag « nouveau bloc » — 500×500 comme le bloc réel, hors écran, utilisé par setDragImage */}
      <div
        ref={newBlockDragGhostRef}
        className="pointer-events-none fixed left-[-9999px] top-0 z-[9999] flex w-[500px] h-[500px] shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 text-sm font-medium text-foreground"
        aria-hidden
      >
        500×500
      </div>
    </DashboardLayout>
  );
}
