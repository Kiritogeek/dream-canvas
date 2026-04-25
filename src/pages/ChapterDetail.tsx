// Écran d'édition d'un chapitre visuel — double visualisation + panels (liberté de création)
// Gauche : chapitre texte (scénario) avec Aperçu = surbrillance assets + hover. Droite : panels (l'utilisateur crée le nombre qu'il souhaite).
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  LayoutPanelTop,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Save,
  Loader2,
  Sparkles,
  Palette,
  MessageCircle,
  X,
  Square,
  Trash2,
  Type,
  Download,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
import { ScenarioTextHighlighter, getDetectedAssets } from "@/components/project/ScenarioTextHighlighter";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { useChapter, useUpdateChapter } from "@/hooks/useChapters";
import { useScenarioChapters, useScenarioChapter } from "@/hooks/useScenarioChapters";
import { useAssets } from "@/hooks/useAssets";
import { useProject } from "@/hooks/useProjects";
import { useUserPlan } from "@/hooks/useUserPlan";
import {
  usePanels,
  useCreatePanel,
  useUpdatePanel,
  useDeletePanel,
  useGeneratePanelImage,
  useCreatePanelsFromOutline,
} from "@/hooks/usePanels";
import {
  getPanelBlocks,
  getPanelHeight,
  getPanelLayout,
  getPanelColorBlocks,
  getPanelSpeechBubbles,
  DEFAULT_BLOCK_WIDTH,
  DEFAULT_BLOCK_HEIGHT,
  BLOCK_PRESETS,
  DEFAULT_COLOR_BLOCK_FILL,
  PANEL_HEIGHT_DEFAULT,
  PANEL_HEIGHT_MIN,
  PANEL_HEIGHT_MAX,
} from "@/services/panels";
import { callSuggestBlockPrompt } from "@/services/scenarioAI";
import { renderPanelToCanvas, renderChapterToCanvas, downloadCanvas, exportChapterAsZip } from "@/services/exportPanel";
import { ColorBlockLayer } from "@/components/chapter/ColorBlockLayer";
import { ImageBlockLayer } from "@/components/chapter/ImageBlockLayer";
import { BubbleLayer } from "@/components/chapter/BubbleLayer";
import type { Json } from "@/integrations/supabase/types";
import type { Panel, PanelBlock, PanelLayout, ColorBlock, ColorBlockFill, SpeechBubble, SpeechBubbleType, Asset } from "@/types";
import {
  DEFAULT_SPEECH_BUBBLE_WIDTH,
  DEFAULT_SPEECH_BUBBLE_HEIGHT,
  SPEECH_BUBBLE_DEFAULT_STYLE,
  SPEECH_BUBBLE_TYPE_LABELS,
} from "@/types";

const PANEL_WIDTH = 800;

function getAssetReferenceImageUrl(asset: Asset): string | null {
  if (asset.asset_type === "character") {
    return (
      asset.image_url_sheet ??
      asset.image_url ??
      asset.image_url_profile_left ??
      asset.image_url_profile_right ??
      asset.image_url_back ??
      null
    );
  }
  return asset.image_url ?? asset.image_url_sheet ?? null;
}

function getAssetReferencePromptLabel(asset: Asset): string {
  const name = asset.name?.trim() || asset.id.slice(0, 8);
  if (asset.asset_type === "character") return `character named "${name}"`;
  if (asset.asset_type === "background") return `background: "${name}"`;
  return `object: "${name}"`;
}


export default function ChapterDetail() {
  const { id: projectId, chapterId } = useParams<{ id: string; chapterId: string }>();
  const { toast } = useToast();

  const { data: chapter, isLoading: loadingChapter } = useChapter(chapterId);
  const { data: project } = useProject(projectId);
  const { plan, usageInfo } = useUserPlan();
  const navigate = useNavigate();
  const isPro = plan === "pro";
  const { data: scenarioChapters = [] } = useScenarioChapters(projectId);
  const updateChapter = useUpdateChapter(projectId ?? "");
  const { data: assets = [] } = useAssets(projectId);
  const queryClient = useQueryClient();
  const { data: panels = [], isLoading: loadingPanels } = usePanels(chapterId);
  const createPanelMutation = useCreatePanel(chapterId ?? "");
  const _createFromOutlineMutation = useCreatePanelsFromOutline(chapterId ?? "");
  const updatePanelMutation = useUpdatePanel(chapterId ?? "");
  const deletePanelMutation = useDeletePanel(chapterId ?? "");
  /** Panel dont la suppression est en attente de confirmation */
  const [panelToDeleteId, setPanelToDeleteId] = useState<string | null>(null);
  const generatePanelImage = useGeneratePanelImage(chapterId ?? "");
  const panelsQueryKey = ["panels", chapterId] as const;
  const preloadedImagesRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    const urls = panels.flatMap((p) =>
      getPanelBlocks(p)
        .map((b) => b.image_url)
        .filter((u): u is string => !!u)
    );
    preloadedImagesRef.current = urls.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
  }, [panels]);

  const CANVAS_HEIGHT = 50_000;

  useEffect(() => {
    if (!chapterId || loadingPanels || panels.length > 0) return;
    createPanelMutation.mutate(undefined, {
      onSuccess: (newPanel) => {
        const layout: PanelLayout = { blocks: [], panelHeight: CANVAS_HEIGHT };
        updatePanelMutation.mutate({
          id: newPanel.id,
          updates: { layout: layout as unknown as Json },
        });
      },
      onError: (err) => toast({ title: "Erreur création canvas", description: err.message, variant: "destructive" }),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, loadingPanels, panels.length]);

  useEffect(() => {
    if (panels.length > 0 && !expandedPanelId) {
      setExpandedPanelId(panels[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels.length]);

  /** Brouillons des prompts par bloc : clé = `${panelId}-${blockId}` */
  const [blockPromptDrafts, setBlockPromptDrafts] = useState<Record<string, string>>({});
  const [blockNameDrafts, setBlockNameDrafts] = useState<Record<string, string>>({});
  /** Blocs en train de générer une suggestion IA de prompt (clé = `${panelId}-${blockId}`). */
  const [suggestingBlockKeys, setSuggestingBlockKeys] = useState<Set<string>>(() => new Set());
  /** Hauteur live pendant le drag de la poignée bas-du-canvas ; null = pas de drag en cours */
  const [panelHeightDragDraft, setPanelHeightDragDraft] = useState<number | null>(null);
  const panelHeightDragRef = useRef<{ startY: number; startH: number } | null>(null);
  /** Bloc en cours d'édition de prompt : clé = `${panelId}-${blockId}` */
  const [_editingBlockKey, setEditingBlockKey] = useState<string | null>(null);
  /** Brouillon dimensions par bloc : clé = `${panelId}-${blockId}` → { width, height } */
  const [_blockDimensionDrafts, setBlockDimensionDrafts] = useState<Record<string, { width: number; height: number }>>({});
  /** Refs du canvas par panel (pour calcul position de dépôt quand on drop sur un bloc) */
  const canvasRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  /** Refs du canvas de prévisualisation par panel (utilisées pour l'export PNG) */
  const exportCanvasRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  /** Export en cours : id du panel exporté individuellement, ou null */
  const [_exportingPanel, _setExportingPanel] = useState<string | null>(null);
  /** Export du chapitre entier en cours */
  const [exportingChapter, setExportingChapter] = useState(false);
  /** Élément ghost pour le drag « nouveau bloc » (setDragImage) */
  const newBlockDragGhostRef = useRef<HTMLDivElement | null>(null);
  /** Drop move-block traité sur le canvas : ne pas nettoyer le preview dans onDragEnd pour éviter le saut visuel */
  const moveDropHandledRef = useRef(false);
  /** Panel ouvert en modale « Edition » (id ou null) */
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null);
  /** Outil à droite dans la modale d'édition (suivi chapitre textuel). */
  const [panelEditorRightTool, setPanelEditorRightTool] = useState<"chapter-text" | "cases">("chapter-text");
  /** Bloc sélectionné dans la modale (mode Personalisation) pour afficher le panneau droit ou gauche */
  const [selectedBlockIdInModal, setSelectedBlockIdInModal] = useState<{ panelId: string; blockId: string } | null>(null);
  /** Bloc de couleur sélectionné (onglet Couleurs) pour éditer la couleur */
  const [selectedColorBlockIdInModal, setSelectedColorBlockIdInModal] = useState<{ panelId: string; colorBlockId: string } | null>(null);
  /** Bulle de dialogue sélectionnée (onglet Dialogue) pour éditer le texte et le style */
  const [selectedSpeechBubbleIdInModal, setSelectedSpeechBubbleIdInModal] = useState<{ panelId: string; bubbleId: string } | null>(null);
  /** Modal de découpage et téléchargement ZIP */
  const [sliceModalOpen, setSliceModalOpen] = useState(false);
  /** Niveau de zoom du canvas éditeur (0.1–2.0, défaut 0.5) */
  const [zoomLevel, setZoomLevel] = useState(0.5);
  const zoomRef = useRef(0.5);
  /** Onglet actif de la sidebar bibliothèque (null = fermée) */
  const [activeSidebarTab, setActiveSidebarTab] = useState<"blocs" | "couleurs" | "dialogue" | null>(null);

  // Réduit la duplication des resets d'état de l'éditeur panel.
  const resetPanelEditorUiState = useCallback(() => {
    setSelectedBlockIdInModal(null);
    setSelectedColorBlockIdInModal(null);
    setSelectedSpeechBubbleIdInModal(null);
    setPanelHeightDraft(null);
  }, []);

  const closePanelEditor = useCallback(() => {
    setExpandedPanelId(null);
    resetPanelEditorUiState();
  }, [resetPanelEditorUiState]);
  const [_pendingOutline, _setPendingOutline] = useState<Array<{ description: string; context?: { lieu?: string; scene?: string; personnages?: string } }> | null>(null);
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
    const scale = canvasEl.offsetWidth > 0 ? rect.width / canvasEl.offsetWidth : 1;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  };

  const _handleExportPanel = async (panel: Panel) => {
    const el = exportCanvasRefByPanel.current[panel.id];
    if (!el) return;
    _setExportingPanel(panel.id);
    try {
      const canvas = await renderPanelToCanvas(el);
      downloadCanvas(canvas, `panel-${panel.panel_number}.png`);
    } finally {
      _setExportingPanel(null);
    }
  };

  const _handleExportChapter = async () => {
    // TODO: panels fermés = ref null — expansion requise pour les panels non visibles
    const orderedPanels = [...panels].sort((a, b) => a.panel_number - b.panel_number);
    const els = orderedPanels
      .map((p) => exportCanvasRefByPanel.current[p.id])
      .filter(Boolean) as HTMLDivElement[];
    if (els.length === 0) return;
    setExportingChapter(true);
    try {
      const canvas = await renderChapterToCanvas(els);
      downloadCanvas(canvas, `chapitre-${chapter?.chapter_number ?? 1}.png`);
    } finally {
      setExportingChapter(false);
    }
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
      if (!expandedPanelId) return;

      const panel = panels.find((p) => p.id === expandedPanelId);
      if (!panel) return;
      const layout = getPanelLayout(panel);
      const panelH = getPanelHeight(panel);

      if (e.key === "Escape") {
        setSelectedBlockIdInModal(null);
        setSelectedColorBlockIdInModal(null);
        setSelectedSpeechBubbleIdInModal(null);
        return;
      }

      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        const w = DEFAULT_BLOCK_WIDTH;
        const h = DEFAULT_BLOCK_HEIGHT;
        const x = Math.max(0, Math.round((PANEL_WIDTH - w) / 2));
        const y = Math.max(0, Math.round((panelH - h) / 2));
        const newBlock: PanelBlock = {
          id: crypto.randomUUID(),
          x, y, width: w, height: h,
          name: `Bloc ${layout.blocks.length + 1}`,
          prompt: null, image_url: null,
        };
        updatePanelMutation.mutate(
          { id: panel.id, updates: { layout: { ...layout, blocks: [...layout.blocks, newBlock] } as unknown as Json } },
          {
            onSuccess: () => {
              setSelectedBlockIdInModal({ panelId: panel.id, blockId: newBlock.id });
              toast({ title: "Bloc ajouté", description: "Raccourci B" });
            },
            onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
          }
        );
        return;
      }

      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        const w = 300, h = 300;
        const x = Math.max(0, Math.round((PANEL_WIDTH - w) / 2));
        const y = Math.max(0, Math.round((panelH - h) / 2));
        const colorBlocks = getPanelColorBlocks(panel);
        const newCb: ColorBlock = {
          id: crypto.randomUUID(),
          x, y, width: w, height: h,
          fill: { ...DEFAULT_COLOR_BLOCK_FILL },
        };
        updatePanelMutation.mutate(
          { id: panel.id, updates: { color_blocks: [...colorBlocks, newCb] as unknown as Json } },
          {
            onSuccess: () => {
              setSelectedColorBlockIdInModal({ panelId: panel.id, colorBlockId: newCb.id });
              toast({ title: "Bloc couleur ajouté", description: "Raccourci C" });
            },
            onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
          }
        );
        return;
      }

      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        const w = DEFAULT_SPEECH_BUBBLE_WIDTH;
        const h = DEFAULT_SPEECH_BUBBLE_HEIGHT;
        const x = Math.max(0, Math.round((PANEL_WIDTH - w) / 2));
        const y = Math.max(0, Math.round((panelH - h) / 2));
        const bubbles = getPanelSpeechBubbles(panel);
        const newBubble: SpeechBubble = {
          id: crypto.randomUUID(),
          type: "text",
          text: "",
          position: { x, y },
          width: w,
          height: h,
          style: {},
        };
        updatePanelMutation.mutate(
          { id: panel.id, updates: { speech_bubbles: [...bubbles, newBubble] as unknown as Json } },
          {
            onSuccess: () => {
              setSelectedSpeechBubbleIdInModal({ panelId: panel.id, bubbleId: newBubble.id });
              toast({ title: "Bulle ajoutée", description: "Raccourci D" });
            },
            onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
          }
        );
        return;
      }

      if (e.key !== "Delete" && e.key !== "Backspace") return;

      if (selectedBlockIdInModal?.panelId === expandedPanelId && selectedBlockIdInModal.blockId) {
        const blocks = getPanelBlocks(panel);
        const block = blocks.find((b) => b.id === selectedBlockIdInModal.blockId);
        if (block) {
          const nextBlocks = blocks.filter((b) => b.id !== block.id);
          setSelectedBlockIdInModal(null);
          updatePanelMutation.mutate(
            { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } },
            { onSuccess: () => toast({ title: "Bloc supprimé" }), onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
          );
        }
      } else if (selectedColorBlockIdInModal?.panelId === expandedPanelId && selectedColorBlockIdInModal.colorBlockId) {
        const colorBlocks = getPanelColorBlocks(panel);
        const cb = colorBlocks.find((c) => c.id === selectedColorBlockIdInModal.colorBlockId);
        if (cb) {
          const next = colorBlocks.filter((c) => c.id !== cb.id);
          setSelectedColorBlockIdInModal(null);
          updatePanelMutation.mutate(
            { id: panel.id, updates: { color_blocks: next as unknown as Json } },
            { onSuccess: () => toast({ title: "Bloc de couleur supprimé" }), onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
          );
        }
      } else if (selectedSpeechBubbleIdInModal?.panelId === expandedPanelId && selectedSpeechBubbleIdInModal.bubbleId) {
        const speechBubbles = getPanelSpeechBubbles(panel);
        const bubble = speechBubbles.find((b) => b.id === selectedSpeechBubbleIdInModal.bubbleId);
        if (bubble) {
          const next = speechBubbles.filter((b) => b.id !== bubble.id);
          setSelectedSpeechBubbleIdInModal(null);
          updatePanelMutation.mutate(
            { id: panel.id, updates: { speech_bubbles: next as unknown as Json } },
            { onSuccess: () => toast({ title: "Bulle supprimée" }), onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
          );
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expandedPanelId, selectedBlockIdInModal, selectedColorBlockIdInModal, selectedSpeechBubbleIdInModal, panels, updatePanelMutation, toast]);

  useEffect(() => {
    zoomRef.current = zoomLevel;
  }, [zoomLevel]);


  useEffect(() => {
    if (!expandedPanelId) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoomLevel((prev) => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const next = Math.min(2, Math.max(0.1, Math.round((prev + delta) * 10) / 10));
        zoomRef.current = next;
        return next;
      });
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, [expandedPanelId]);

  const handleColorBlockMoveCommit = useCallback((panelId: string, colorBlockId: string, x: number, y: number) => {
    const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
    const panelData = currentPanels.find((p) => p.id === panelId);
    const colorBlocksList = getPanelColorBlocks(panelData ?? panels.find((p) => p.id === panelId));
    const next = colorBlocksList.map((c) => (c.id === colorBlockId ? { ...c, x, y } : c));
    queryClient.cancelQueries({ queryKey: panelsQueryKey });
    const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
    queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panelId ? { ...p, color_blocks: next as unknown as Json } : p))));
    updatePanelMutation.mutate(
      { id: panelId, updates: { color_blocks: next as unknown as Json } },
      { onError: (err) => { if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels); toast({ title: "Erreur", description: err.message, variant: "destructive" }); } }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, panels, updatePanelMutation, toast]);

  const handleColorBlockResizeCommit = useCallback((panelId: string, colorBlockId: string, draft: { x: number; y: number; width: number; height: number }) => {
    const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
    const currentPanel = currentPanels.find((p) => p.id === panelId);
    const currentColorBlocks = getPanelColorBlocks(currentPanel ?? panels.find((p) => p.id === panelId));
    const next = currentColorBlocks.map((c) => (c.id === colorBlockId ? { ...c, x: draft.x, y: draft.y, width: draft.width, height: draft.height } : c));
    queryClient.cancelQueries({ queryKey: panelsQueryKey });
    const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
    queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panelId ? { ...p, color_blocks: next as unknown as Json } : p))));
    updatePanelMutation.mutate(
      { id: panelId, updates: { color_blocks: next as unknown as Json } },
      { onError: (err) => { if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels); toast({ title: "Erreur", description: err.message, variant: "destructive" }); } }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, panels, updatePanelMutation, toast]);

  const handleImageBlockMoveCommit = useCallback((panelId: string, blockId: string, x: number, y: number) => {
    const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
    const panelData = currentPanels.find((p) => p.id === panelId);
    const layoutData = getPanelLayout(panelData ?? panels.find((p) => p.id === panelId));
    const nextBlocks = layoutData.blocks.map((b) => (b.id === blockId ? { ...b, x, y } : b));
    moveDropHandledRef.current = true;
    const movePayload = { id: panelId, updates: { layout: { ...layoutData, blocks: nextBlocks } as unknown as Json } };
    queryClient.cancelQueries({ queryKey: panelsQueryKey });
    const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
    queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panelId ? { ...p, layout: movePayload.updates.layout ?? p.layout } : p))));
    updatePanelMutation.mutate(movePayload, {
      onSuccess: () => { moveDropHandledRef.current = false; },
      onError: (err) => {
        moveDropHandledRef.current = false;
        if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels);
        toast({ title: "Erreur", description: err.message, variant: "destructive" });
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, panels, updatePanelMutation, moveDropHandledRef, toast]);

  const handleImageBlockResizeCommit = useCallback((panelId: string, blockId: string, draft: { x: number; y: number; width: number; height: number }) => {
    const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
    const panelData = currentPanels.find((p) => p.id === panelId);
    const layoutData = getPanelLayout(panelData ?? panels.find((p) => p.id === panelId));
    const nextBlocks = layoutData.blocks.map((b) => (b.id === blockId ? { ...b, x: draft.x, y: draft.y, width: draft.width, height: draft.height } : b));
    queryClient.cancelQueries({ queryKey: panelsQueryKey });
    const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
    queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panelId ? { ...p, layout: { ...layoutData, blocks: nextBlocks } as unknown as Json } : p))));
    updatePanelMutation.mutate(
      { id: panelId, updates: { layout: { ...layoutData, blocks: nextBlocks } as unknown as Json } },
      { onError: (err) => { if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels); toast({ title: "Erreur", description: err.message, variant: "destructive" }); } }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, panels, updatePanelMutation, toast]);

  const handleBubbleMoveCommit = useCallback((panelId: string, bubbleId: string, x: number, y: number) => {
    const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
    const panelData = currentPanels.find((p) => p.id === panelId);
    const bubblesList = getPanelSpeechBubbles(panelData ?? panels.find((p) => p.id === panelId));
    const next = bubblesList.map((b) => (b.id === bubbleId ? { ...b, position: { x, y } } : b));
    queryClient.cancelQueries({ queryKey: panelsQueryKey });
    const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
    queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panelId ? { ...p, speech_bubbles: next as unknown as Json } : p))));
    updatePanelMutation.mutate(
      { id: panelId, updates: { speech_bubbles: next as unknown as Json } },
      { onError: (err) => { if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels); toast({ title: "Erreur", description: err.message, variant: "destructive" }); } }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, panels, updatePanelMutation, toast]);

  const handleBubbleResizeCommit = useCallback((panelId: string, bubbleId: string, draft: { x: number; y: number; width: number; height: number }) => {
    const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
    const currentPanel = currentPanels.find((p) => p.id === panelId);
    const list = getPanelSpeechBubbles(currentPanel ?? panels.find((p) => p.id === panelId));
    const next = list.map((b) => (b.id === bubbleId ? { ...b, position: { x: draft.x, y: draft.y }, width: draft.width, height: draft.height } : b));
    queryClient.cancelQueries({ queryKey: panelsQueryKey });
    const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
    queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panelId ? { ...p, speech_bubbles: next as unknown as Json } : p))));
    updatePanelMutation.mutate(
      { id: panelId, updates: { speech_bubbles: next as unknown as Json } },
      { onError: (err) => { if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels); toast({ title: "Erreur", description: err.message, variant: "destructive" }); } }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, panels, updatePanelMutation, toast]);

  const loading = loadingChapter || loadingPanels;
  const canSaveLink =
    (chapter?.linked_scenario_chapter_id ?? null) !==
    (displayedScenarioChapterId ?? null);

  if (loading && !chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-muted-foreground">Chapitre introuvable.</p>
          <Button asChild variant="ghost" className="mt-4">
            <Link to={`/dashboard/projects/${projectId}?tab=edition`}>
              Retour au projet
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const linkedScenarioChapter = scenarioChapters.find(
    (sc) => sc.id === chapter.linked_scenario_chapter_id
  );
  const detectedCasesCount = Array.isArray(linkedScenarioChapter?.panels_outline)
    ? (linkedScenarioChapter.panels_outline as { panel_number: number }[]).length
    : null;

  const generatedCasesCount = panels
    .flatMap((p) => getPanelBlocks(p))
    .filter((b) => !!b.image_url).length;

  const pct =
    detectedCasesCount && detectedCasesCount > 0
      ? Math.round((generatedCasesCount / detectedCasesCount) * 100)
      : null;

  const renderPanelEditor = (panel: Panel) => {
    const layout = getPanelLayout(panel);
    const blocks = getPanelBlocks(panel);
    const colorBlocks = getPanelColorBlocks(panel);
    const speechBubbles = getPanelSpeechBubbles(panel);
    const panelHeight = getPanelHeight(panel);
    const selectedBlock = selectedBlockIdInModal?.panelId === panel.id && selectedBlockIdInModal?.blockId
      ? blocks.find((b) => b.id === selectedBlockIdInModal.blockId)
      : null;
    const selectedColorBlock = selectedColorBlockIdInModal?.panelId === panel.id && selectedColorBlockIdInModal?.colorBlockId
      ? colorBlocks.find((c) => c.id === selectedColorBlockIdInModal.colorBlockId)
      : null;
    const selectedSpeechBubble = selectedSpeechBubbleIdInModal?.panelId === panel.id && selectedSpeechBubbleIdInModal?.bubbleId
      ? speechBubbles.find((b) => b.id === selectedSpeechBubbleIdInModal.bubbleId)
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
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const canvasEl = canvasRefByPanel.current[panel.id];
      try {
        const data = JSON.parse(raw) as {
          type: string;
          blockId?: string;
          width?: number;
          height?: number;
          fill?: ColorBlockFill;
          bubbleType?: SpeechBubble["type"];
          assetId?: string;
          assetName?: string;
        };
        if (data.type === "asset-drop" && data.assetId) {
          const w = DEFAULT_BLOCK_WIDTH;
          const h = DEFAULT_BLOCK_HEIGHT;
          const { x, y } = getCanvasDropPosition(e, canvasEl, w, h);
          const assetName = data.assetName?.trim() || "Asset";
          const newBlock: PanelBlock = {
            id: crypto.randomUUID(),
            x, y, width: w, height: h,
            name: assetName,
            prompt: `[${assetName}] — `,
            image_url: null,
            asset_refs: [data.assetId],
          };
          const newLayout: PanelLayout = { ...layout, blocks: [...layout.blocks, newBlock] };
          updatePanelMutation.mutate(
            { id: panel.id, updates: { layout: newLayout as unknown as Json } },
            {
              onSuccess: () => {
                setSelectedBlockIdInModal({ panelId: panel.id, blockId: newBlock.id });
                toast({ title: "Bloc créé", description: `${assetName} référencé` });
              },
              onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
            }
          );
          setDraggingBlock(null);
          setDragPreview(null);
          return;
        }
        if (data.type === "speech-bubble" && data.bubbleType) {
          const { x, y } = getCanvasDropPosition(e, canvasEl, DEFAULT_SPEECH_BUBBLE_WIDTH, DEFAULT_SPEECH_BUBBLE_HEIGHT);
          handleAddSpeechBubble(data.bubbleType, x, y);
          setDraggingBlock(null);
          setDragPreview(null);
          return;
        }
        if (data.type === "new-block") {
          const w = typeof data.width === "number" ? data.width : DEFAULT_BLOCK_WIDTH;
          const h = typeof data.height === "number" ? data.height : DEFAULT_BLOCK_HEIGHT;
          const { x, y } = getCanvasDropPosition(e, canvasEl, w, h);
          handleAddBlock(x, y, w, h);
          setDraggingBlock(null);
          setDragPreview(null);
          return;
        }
        if (data.type === "new-color-block") {
          const w = typeof data.width === "number" ? data.width : 300;
          const h = typeof data.height === "number" ? data.height : 300;
          const fill: ColorBlockFill = data.fill && (data.fill as ColorBlockFill).type ? (data.fill as ColorBlockFill) : { type: "solid", color: "#ffffff" };
          const { x, y } = getCanvasDropPosition(e, canvasEl, w, h);
          handleAddColorBlock(x, y, w, h, fill);
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
              onSuccess: () => {
                moveDropHandledRef.current = false;
              },
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

    const _handleSaveBlockDimensions = (block: PanelBlock, width: number, height: number) => {
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

    const handleAddColorBlock = (atX: number, atY: number, width: number, height: number, fill?: ColorBlockFill) => {
      const w = Math.max(50, Math.min(PANEL_WIDTH, width));
      const h = Math.max(50, Math.min(panelHeight, height));
      const x = Math.max(0, Math.min(PANEL_WIDTH - w, atX));
      const y = Math.max(0, Math.min(panelHeight - h, atY));
      const newBlock: ColorBlock = {
        id: crypto.randomUUID(),
        x, y, width: w, height: h,
        fill: fill ?? DEFAULT_COLOR_BLOCK_FILL,
      };
      const next = [...colorBlocks, newBlock];
      updatePanelMutation.mutate(
        { id: panel.id, updates: { color_blocks: next as unknown as Json } },
        { onSuccess: () => toast({ title: "Bloc de couleur ajouté" }), onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
      );
    };

    const handleAddSpeechBubble = (bubbleType: SpeechBubble["type"], x: number, y: number) => {
      const w = DEFAULT_SPEECH_BUBBLE_WIDTH;
      const h = DEFAULT_SPEECH_BUBBLE_HEIGHT;
      const clampedX = Math.max(0, Math.min(PANEL_WIDTH - w, x));
      const clampedY = Math.max(0, Math.min(panelHeight - h, y));
      const defaultStyle = SPEECH_BUBBLE_DEFAULT_STYLE[bubbleType];
      const newBubble: SpeechBubble = {
        id: crypto.randomUUID(),
        type: bubbleType,
        text: "",
        position: { x: clampedX, y: clampedY },
        width: w,
        height: h,
        style: {
          font: "inherit",
          size: 14,
          color: "#000000",
          fill: defaultStyle.fill,
          stroke: defaultStyle.stroke,
        },
      };
      const next = [...speechBubbles, newBubble];
      updatePanelMutation.mutate(
        { id: panel.id, updates: { speech_bubbles: next as unknown as Json } },
        { onSuccess: () => toast({ title: "Bulle ajoutée" }), onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
      );
    };

    const handleUpdateSpeechBubbles = (next: SpeechBubble[]) => {
      queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panel.id ? { ...p, speech_bubbles: next as unknown as Json } : p))));
      updatePanelMutation.mutate(
        { id: panel.id, updates: { speech_bubbles: next as unknown as Json } },
        { onError: (err) => { toast({ title: "Erreur", description: err.message, variant: "destructive" }); queryClient.invalidateQueries({ queryKey: panelsQueryKey }); } }
      );
    };

    const handleDeleteSpeechBubble = (bubble: SpeechBubble) => {
      const next = speechBubbles.filter((b) => b.id !== bubble.id);
      setSelectedSpeechBubbleIdInModal(null);
      updatePanelMutation.mutate(
        { id: panel.id, updates: { speech_bubbles: next as unknown as Json } },
        { onSuccess: () => toast({ title: "Bulle supprimée" }), onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
      );
    };

    const handleUpdateColorBlocks = (next: ColorBlock[]) => {
      updatePanelMutation.mutate(
        { id: panel.id, updates: { color_blocks: next as unknown as Json } },
        { onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
      );
    };

    const handleDeleteColorBlock = (cb: ColorBlock) => {
      const next = colorBlocks.filter((c) => c.id !== cb.id);
      if (selectedColorBlockIdInModal?.colorBlockId === cb.id) setSelectedColorBlockIdInModal(null);
      updatePanelMutation.mutate(
        { id: panel.id, updates: { color_blocks: next as unknown as Json } },
        { onSuccess: () => toast({ title: "Bloc de couleur supprimé" }), onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
      );
    };

    const handleColorBlockFillChange = (cb: ColorBlock, fill: ColorBlock["fill"]) => {
      const next = colorBlocks.map((c) => (c.id === cb.id ? { ...c, fill } : c));
      handleUpdateColorBlocks(next);
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

    const _handleSaveBlockAssetRefs = (block: PanelBlock, assetIds: string[]) => {
      const nextBlocks = layout.blocks.map((b) => (b.id === block.id ? { ...b, asset_refs: assetIds.length ? assetIds : undefined } : b));
      updatePanelMutation.mutate(
        { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } },
        { onSuccess: () => toast({ title: "Assets du bloc enregistrés" }), onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
      );
    };

    /**
     * Suggère un prompt image via l'IA pour un bloc vide.
     * Contexte fourni à l'IA : chapitre texte courant, résumés IA des chapitres précédents,
     * prompts des blocs précédents dans ce panel.
     */
    const handleSuggestBlockPrompt = async (block: PanelBlock) => {
      const blockKey = `${panel.id}-${block.id}`;
      const blockIndex = blocks.findIndex((b) => b.id === block.id);
      if (blockIndex < 0) return;

      setSuggestingBlockKeys((prev) => {
        const next = new Set(prev);
        next.add(blockKey);
        return next;
      });

      try {
        const previousPrompts = blocks
          .slice(0, blockIndex)
          .map((b) => b.prompt)
          .filter((p): p is string => !!p?.trim());

        const previousSummaries =
          scenarioChapters
            ?.filter((sc) => sc.chapter_number < (chapter?.chapter_number ?? 999))
            .sort((a, b) => a.chapter_number - b.chapter_number)
            .map((sc) => sc.ai_summary?.trim() ?? sc.content?.slice(0, 200) ?? "")
            .filter(Boolean)
            .join("\n\n") || undefined;

        const result = await callSuggestBlockPrompt({
          mode: "suggest_block_prompt",
          chapter_content: scenarioChapter?.content ?? "",
          previous_summaries: previousSummaries,
          previous_prompts: previousPrompts,
        });

        const suggested = result.text.slice(0, 400);
        setBlockPromptDrafts((prev) => ({ ...prev, [blockKey]: suggested }));
        handleSaveBlockPrompt(block, suggested, { silent: true });
        toast({ title: "Prompt suggéré par l'IA" });
      } catch (err) {
        toast({
          title: "Erreur",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      } finally {
        setSuggestingBlockKeys((prev) => {
          const next = new Set(prev);
          next.delete(blockKey);
          return next;
        });
      }
    };

    const handleGenerateBlock = (block: PanelBlock) => {
      const promptToUse = (blockPromptDrafts[`${panel.id}-${block.id}`] ?? block.prompt ?? "").trim();
      if (!project) return;
      const hasSavedStyleText = (project.style_template?.trim()?.length ?? 0) > 0;
      if (!hasSavedStyleText) {
        toast({
          title: "Style requis",
          description:
            "Enregistrez un template de style texte sur le projet — la génération de case lit uniquement ce contenu sauvegardé.",
          variant: "destructive",
        });
        return;
      }
      if (!promptToUse) {
        toast({ title: "Prompt requis", description: "Saisissez un prompt pour ce bloc (ou une description au panel).", variant: "destructive" });
        return;
      }
      const contextChapter = scenarioChapter?.content?.slice(0, 500).trim() || null;
      const refAssets = getDetectedAssets(promptToUse, assets);
      const blockAssetImageUrls = refAssets
        .map(getAssetReferenceImageUrl)
        .filter((u): u is string => !!u);
      const blockAssetNames = refAssets.map(getAssetReferencePromptLabel);
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

    type StoredCase = { panel_number: number; block_number?: number; description?: string; text_excerpt?: string; locked?: boolean };
    const validatedCases: (StoredCase & { caseNumber: number })[] = (() => {
      const outline = scenarioChapter?.panels_outline;
      if (!Array.isArray(outline)) return [];
      return (outline as StoredCase[])
        .filter((b) => b.locked)
        .map((b, idx) => ({ ...b, caseNumber: idx + 1 }));
    })();

    const handleAddBlockFromCase = (caseDescription: string) => {
      const newBlock: PanelBlock = {
        id: crypto.randomUUID(),
        x: 0, y: 0,
        width: DEFAULT_BLOCK_WIDTH,
        height: DEFAULT_BLOCK_HEIGHT,
        name: `Case`,
        prompt: caseDescription,
        image_url: null,
      };
      const newLayout: PanelLayout = { ...layout, blocks: [...layout.blocks, newBlock] };
      updatePanelMutation.mutate(
        { id: panel.id, updates: { layout: newLayout as unknown as Json } },
        {
          onSuccess: () => {
            toast({ title: "Bloc créé", description: "Le prompt de la case a été pré-rempli." });
          },
          onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
        }
      );
    };

    // ── Toolbar flottante : Dupliquer / Monter / Descendre ──────────────────

    const clampInside = (x: number, y: number, w: number, h: number, ph: number) => ({
      x: Math.max(0, Math.min(PANEL_WIDTH - w, x)),
      y: Math.max(0, Math.min(ph - h, y)),
    });

    const duplicateSelected = () => {
      if (selectedBlock) {
        const src = selectedBlock;
        const pos = clampInside(src.x + 20, src.y + 20, src.width, src.height, panelHeight);
        const copy: PanelBlock = { ...src, id: crypto.randomUUID(), x: pos.x, y: pos.y, name: src.name ? `${src.name} (copie)` : "Bloc (copie)" };
        const nextBlocks = [...layout.blocks, copy];
        updatePanelMutation.mutate(
          { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } },
          { onSuccess: () => { setSelectedBlockIdInModal({ panelId: panel.id, blockId: copy.id }); toast({ title: "Bloc dupliqué" }); }, onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
        );
        return;
      }
      if (selectedColorBlock) {
        const src = selectedColorBlock;
        const pos = clampInside(src.x + 20, src.y + 20, src.width, src.height, panelHeight);
        const copy: ColorBlock = { ...src, id: crypto.randomUUID(), x: pos.x, y: pos.y };
        const next = [...colorBlocks, copy];
        updatePanelMutation.mutate(
          { id: panel.id, updates: { color_blocks: next as unknown as Json } },
          { onSuccess: () => { setSelectedColorBlockIdInModal({ panelId: panel.id, colorBlockId: copy.id }); toast({ title: "Bloc couleur dupliqué" }); }, onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
        );
        return;
      }
      if (selectedSpeechBubble) {
        const src = selectedSpeechBubble;
        const w = src.width ?? DEFAULT_SPEECH_BUBBLE_WIDTH;
        const h = src.height ?? DEFAULT_SPEECH_BUBBLE_HEIGHT;
        const pos = clampInside(src.position.x + 20, src.position.y + 20, w, h, panelHeight);
        const copy: SpeechBubble = { ...src, id: crypto.randomUUID(), position: { x: pos.x, y: pos.y } };
        const next = [...speechBubbles, copy];
        updatePanelMutation.mutate(
          { id: panel.id, updates: { speech_bubbles: next as unknown as Json } },
          { onSuccess: () => { setSelectedSpeechBubbleIdInModal({ panelId: panel.id, bubbleId: copy.id }); toast({ title: "Bulle dupliquée" }); }, onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
        );
      }
    };

    const moveSelected = (direction: "up" | "down") => {
      const swap = <T,>(arr: T[], i: number, j: number): T[] => {
        if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return arr;
        const next = arr.slice();
        const tmp = next[i];
        next[i] = next[j];
        next[j] = tmp;
        return next;
      };
      const delta = direction === "up" ? 1 : -1;
      if (selectedBlock) {
        const idx = layout.blocks.findIndex((b) => b.id === selectedBlock.id);
        const next = swap(layout.blocks, idx, idx + delta);
        if (next === layout.blocks) return;
        updatePanelMutation.mutate(
          { id: panel.id, updates: { layout: { ...layout, blocks: next } as unknown as Json } },
          { onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
        );
        return;
      }
      if (selectedColorBlock) {
        const idx = colorBlocks.findIndex((c) => c.id === selectedColorBlock.id);
        const next = swap(colorBlocks, idx, idx + delta);
        if (next === colorBlocks) return;
        updatePanelMutation.mutate(
          { id: panel.id, updates: { color_blocks: next as unknown as Json } },
          { onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
        );
        return;
      }
      if (selectedSpeechBubble) {
        const idx = speechBubbles.findIndex((b) => b.id === selectedSpeechBubble.id);
        const next = swap(speechBubbles, idx, idx + delta);
        if (next === speechBubbles) return;
        updatePanelMutation.mutate(
          { id: panel.id, updates: { speech_bubbles: next as unknown as Json } },
          { onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
        );
      }
    };

    const hasSelection = !!(selectedBlock || selectedColorBlock || selectedSpeechBubble);
    const selectionLabel = selectedBlock
      ? `Bloc « ${selectedBlock.name ?? "sans nom"} »`
      : selectedColorBlock
        ? "Bloc couleur"
        : selectedSpeechBubble
          ? `Bulle ${SPEECH_BUBBLE_TYPE_LABELS[selectedSpeechBubble.type] ?? ""}`
          : "";

    return (
      <div className="relative flex flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
        {/* Toolbar contextuelle flottante — visible uniquement quand un objet est sélectionné */}
        {hasSelection && (
          <div
            role="toolbar"
            aria-label="Actions sur la sélection"
            className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full border border-border/70 bg-background/95 backdrop-blur-sm shadow-lg px-2 py-1"
          >
            <span className="px-2 text-xs text-muted-foreground truncate max-w-[200px]">{selectionLabel}</span>
            <div className="h-5 w-px bg-border" />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs rounded-full"
              onClick={duplicateSelected}
              disabled={updatePanelMutation.isPending}
              title="Dupliquer"
            >
              <Plus className="h-3.5 w-3.5" />
              Dupliquer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-full"
              onClick={() => moveSelected("up")}
              disabled={updatePanelMutation.isPending}
              title="Mettre au-dessus"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-full"
              onClick={() => moveSelected("down")}
              disabled={updatePanelMutation.isPending}
              title="Mettre en dessous"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <div className="h-5 w-px bg-border" />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (selectedBlock) handleDeleteBlock(selectedBlock);
                else if (selectedColorBlock) handleDeleteColorBlock(selectedColorBlock);
                else if (selectedSpeechBubble) handleDeleteSpeechBubble(selectedSpeechBubble);
              }}
              disabled={updatePanelMutation.isPending}
              title="Supprimer (Delete)"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {/* Panneau gauche — barre d'icônes fixe + flyouts en overlay (ne poussent pas le canvas) */}
        <aside className="relative w-14 shrink-0 border-r border-border bg-background z-30">

          {/* Barre d'icônes (56px, fixe) */}
          <div className="w-14 flex flex-col items-center gap-1 py-2">
            {([
              { id: "blocs" as const, icon: LayoutPanelTop, label: "Blocs" },
              { id: "couleurs" as const, icon: Palette, label: "Couleurs" },
              { id: "dialogue" as const, icon: MessageCircle, label: "Dialogue" },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                title={label}
                onClick={() => {
                  if (hasSelection) {
                    setSelectedBlockIdInModal(null);
                    setSelectedColorBlockIdInModal(null);
                    setSelectedSpeechBubbleIdInModal(null);
                  }
                  setActiveSidebarTab((t) => (t === id ? null : id));
                }}
                className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${activeSidebarTab === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[9px] font-medium">{label}</span>
              </button>
            ))}
            <div className="flex-1" />
            <button
              type="button"
              title="Découper & télécharger"
              onClick={() => setSliceModalOpen(true)}
              className="w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="text-[9px] font-medium">Export</span>
            </button>
          </div>

          {/* Flyout bibliothèque — overlay absolu, uniquement quand aucun élément sélectionné */}
          {activeSidebarTab && !hasSelection && (
            <div className="absolute top-0 left-full h-full w-[220px] bg-background border-r border-border shadow-xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  {activeSidebarTab === "blocs" && <><span>Blocs image</span> <kbd className="text-[9px] font-mono bg-muted text-muted-foreground border border-border px-1 rounded">B</kbd></>}
                  {activeSidebarTab === "couleurs" && <><span>Couleurs</span> <kbd className="text-[9px] font-mono bg-muted text-muted-foreground border border-border px-1 rounded">C</kbd></>}
                  {activeSidebarTab === "dialogue" && <><span>Dialogue</span> <kbd className="text-[9px] font-mono bg-muted text-muted-foreground border border-border px-1 rounded">D</kbd></>}
                </span>
                <button type="button" onClick={() => setActiveSidebarTab(null)} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" aria-label="Fermer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {activeSidebarTab === "blocs" && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">Clic ou glisser sur le canvas</p>
                    <div className="flex flex-col gap-1.5">
                      {BLOCK_PRESETS.map((preset) => (
                        <div key={preset.label} draggable onDragStart={(e) => { e.dataTransfer.setData("application/json", JSON.stringify({ type: "new-block", width: preset.width, height: preset.height })); e.dataTransfer.effectAllowed = "copy"; const ghost = newBlockDragGhostRef.current; if (ghost) e.dataTransfer.setDragImage(ghost, Math.min(250, preset.width / 2), Math.min(250, preset.height / 2)); }} onClick={() => handleAddBlock(undefined, undefined, preset.width, preset.height)} className="cursor-grab active:cursor-grabbing rounded-lg border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-between">
                          <span>{preset.label}</span>
                          <LayoutPanelTop className="h-3 w-3 opacity-40" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeSidebarTab === "couleurs" && (
                  <div draggable onDragStart={(e) => { e.dataTransfer.setData("application/json", JSON.stringify({ type: "new-color-block", width: 300, height: 300, fill: { type: "solid", color: "#ffffff" } })); e.dataTransfer.effectAllowed = "copy"; }} onClick={() => { const ph = getPanelHeight(panel); const x = Math.round((PANEL_WIDTH - 300) / 2); const y = Math.round((ph - 300) / 2); handleAddColorBlock(x, y, 300, 300); }} className="cursor-grab active:cursor-grabbing rounded-lg border border-border/80 bg-white shadow-sm px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:shadow-md transition-all flex items-center justify-center gap-2">
                    <Square className="h-4 w-4 shrink-0" />
                    <span>Bloc de couleur</span>
                  </div>
                )}
                {activeSidebarTab === "dialogue" && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">Clic ou glisser sur le canvas</p>
                    <button type="button" draggable onDragStart={(e) => { e.dataTransfer.setData("application/json", JSON.stringify({ type: "speech-bubble", bubbleType: "text" })); e.dataTransfer.effectAllowed = "copy"; }} onClick={() => { const ph = getPanelHeight(panel); const cx = Math.round((PANEL_WIDTH - DEFAULT_SPEECH_BUBBLE_WIDTH) / 2); const cy = Math.round((ph - DEFAULT_SPEECH_BUBBLE_HEIGHT) / 2); handleAddSpeechBubble("text", cx, cy); }} className="w-full cursor-pointer rounded-lg border border-border/60 bg-background px-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1.5 justify-center">
                      <Type className="h-3 w-3 shrink-0" />✏️ Texte libre
                    </button>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.entries(SPEECH_BUBBLE_TYPE_LABELS) as [SpeechBubbleType, string][]).filter(([type]) => type !== "text").map(([type, label]) => (
                        <button key={type} type="button" draggable onDragStart={(e) => { e.dataTransfer.setData("application/json", JSON.stringify({ type: "speech-bubble", bubbleType: type })); e.dataTransfer.effectAllowed = "copy"; }} onClick={() => { const ph = getPanelHeight(panel); const cx = Math.round((PANEL_WIDTH - DEFAULT_SPEECH_BUBBLE_WIDTH) / 2); const cy = Math.round((ph - DEFAULT_SPEECH_BUBBLE_HEIGHT) / 2); handleAddSpeechBubble(type, cx, cy); }} className="cursor-pointer rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1 justify-center">
                          <Plus className="h-3 w-3 shrink-0" />{label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Panneau propriétés — overlay absolu, uniquement quand un élément est sélectionné */}
          {hasSelection && (
            <div className="absolute top-0 left-full h-full w-[220px] bg-background border-r border-border shadow-xl flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto min-h-0">
                {selectedBlock ? (() => {
                  const block = selectedBlock;
                  const blockKey = `${panel.id}-${block.id}`;
                  const nameDraft = blockNameDrafts[blockKey] ?? block.name ?? "";
                  const promptDraft = blockPromptDrafts[blockKey] ?? block.prompt ?? "";
                  const isGenerating = generatePanelImage.isPending && generatePanelImage.variables?.panel?.id === panel.id;
                  return (
                    <div className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Bloc image</span>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => setSelectedBlockIdInModal(null)} aria-label="Désélectionner"><X className="h-3.5 w-3.5" /></Button>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Nom</label>
                        <input type="text" value={nameDraft} onChange={(e) => setBlockNameDrafts((prev) => ({ ...prev, [blockKey]: e.target.value }))} onBlur={() => { if (nameDraft.trim() !== (block.name ?? "")) handleSaveBlockName(block, nameDraft); }} placeholder="Ex. Bloc 1" className="w-full h-8 rounded-lg border border-border/60 bg-background px-3 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Prompt visuel</label>
                        <Textarea value={promptDraft} onChange={(e) => { const v = e.target.value; setBlockPromptDrafts((prev) => ({ ...prev, [blockKey]: v })); handleSaveBlockPrompt(block, v, { silent: true }); }} placeholder="Description visuelle de ce bloc…" className="min-h-[70px] text-sm resize-y" />
                        {!block.image_url && <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs w-full" disabled={suggestingBlockKeys.has(blockKey) || !scenarioChapter?.content?.trim()} onClick={() => handleSuggestBlockPrompt(block)}>{suggestingBlockKeys.has(blockKey) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}Suggérer un prompt IA</Button>}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">{block.width} × {Math.round(block.height)} px</div>
                      {(() => { const promptText = (promptDraft.trim() || (block.prompt ?? "").trim()) || ""; const detected = getDetectedAssets(promptText, assets); if (detected.length === 0) return null; return (<div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-2">{detected.map((asset) => (<div key={asset.id} className="flex items-center gap-2"><div className="w-8 h-8 shrink-0 rounded overflow-hidden border border-border/60 bg-muted">{getAssetReferenceImageUrl(asset) ? <ImageWithFallback src={getAssetReferenceImageUrl(asset) ?? ""} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">—</div>}</div><span className="flex-1 min-w-0 truncate text-xs font-medium">{asset.name ?? asset.id.slice(0, 8)}</span></div>))}</div>); })()}
                      {project && <Button size="sm" variant="outline" className="w-full gap-1.5" disabled={!selectedBlock.prompt?.trim() || !project.style_template?.trim() || isGenerating} onClick={() => handleGenerateBlock(block)}>{isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{block.image_url ? "Régénérer" : "Générer l'image"}</Button>}
                      <Button size="sm" variant="ghost" className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={updatePanelMutation.isPending} onClick={() => handleDeleteBlock(block)}><Trash2 className="h-3 w-3" /> Supprimer le bloc</Button>
                    </div>
                  );
                })() : selectedColorBlock ? (
                  <div className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Bloc couleur</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => setSelectedColorBlockIdInModal(null)} aria-label="Désélectionner"><X className="h-3.5 w-3.5" /></Button>
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">{selectedColorBlock.width} × {Math.round(selectedColorBlock.height)} px</div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">Couleur<input type="color" value={selectedColorBlock.fill.type === "solid" ? selectedColorBlock.fill.color : selectedColorBlock.fill.from} onChange={(e) => handleColorBlockFillChange(selectedColorBlock, { type: "solid", color: e.target.value })} className="h-7 w-12 rounded border border-border/60 cursor-pointer bg-background" /><span className="text-xs text-muted-foreground tabular-nums">{selectedColorBlock.fill.type === "solid" ? selectedColorBlock.fill.color : selectedColorBlock.fill.from}</span></label>
                    <Button size="sm" variant="ghost" className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={updatePanelMutation.isPending} onClick={() => handleDeleteColorBlock(selectedColorBlock)}><Trash2 className="h-3 w-3" /> Supprimer</Button>
                  </div>
                ) : selectedSpeechBubble ? (
                  <div className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Bulle de dialogue</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => setSelectedSpeechBubbleIdInModal(null)} aria-label="Désélectionner"><X className="h-3.5 w-3.5" /></Button>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Texte</label>
                      <textarea autoFocus value={selectedSpeechBubble.text} onChange={(e) => { const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, text: e.target.value } : b); handleUpdateSpeechBubbles(next); }} className="w-full min-h-[60px] rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-y" placeholder="Dialogue, pensée, narration…" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Type</label>
                      <div className="grid grid-cols-2 gap-1">{(Object.entries(SPEECH_BUBBLE_TYPE_LABELS) as [SpeechBubbleType, string][]).map(([t, lbl]) => (<button key={t} type="button" onClick={() => { const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, type: t } : b); handleUpdateSpeechBubbles(next); }} className={`rounded-lg border px-2 py-1 text-xs transition-colors ${selectedSpeechBubble.type === t ? "border-primary bg-primary/10 text-foreground font-medium" : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"}`}>{lbl}</button>))}</div>
                    </div>
                    {selectedSpeechBubble.type !== "text" && (
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">Fond<input type="color" value={selectedSpeechBubble.bgColor ?? selectedSpeechBubble.style?.fill ?? SPEECH_BUBBLE_DEFAULT_STYLE[selectedSpeechBubble.type].fill} onChange={(e) => { const v = e.target.value; const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, style: { ...b.style, fill: v }, bgColor: v } : b); handleUpdateSpeechBubbles(next); }} className="h-6 w-8 rounded border border-border/60 cursor-pointer" /></label>
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">Contour<input type="color" value={selectedSpeechBubble.borderColor ?? selectedSpeechBubble.style?.stroke ?? SPEECH_BUBBLE_DEFAULT_STYLE[selectedSpeechBubble.type].stroke} onChange={(e) => { const v = e.target.value; const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, style: { ...b.style, stroke: v }, borderColor: v } : b); handleUpdateSpeechBubbles(next); }} className="h-6 w-8 rounded border border-border/60 cursor-pointer" /></label>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <select value={selectedSpeechBubble.style?.font ?? "inherit"} onChange={(e) => { const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, style: { ...b.style, font: e.target.value || undefined } } : b); handleUpdateSpeechBubbles(next); }} className="flex-1 h-8 rounded-lg border border-border/60 bg-background px-2 text-xs"><option value="inherit">Police par défaut</option><option value="sans-serif">Sans-serif</option><option value="serif">Serif</option><option value="monospace">Monospace</option></select>
                      <input type="number" min={8} max={72} value={selectedSpeechBubble.style?.size ?? 14} onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) { const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, style: { ...b.style, size: n } } : b); handleUpdateSpeechBubbles(next); } }} className="w-14 h-8 rounded-lg border border-border/60 bg-background px-2 text-xs tabular-nums" />
                      <input type="color" value={selectedSpeechBubble.style?.color ?? "#000000"} onChange={(e) => { const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, style: { ...b.style, color: e.target.value } } : b); handleUpdateSpeechBubbles(next); }} className="h-8 w-10 rounded border border-border/60 cursor-pointer bg-background" />
                    </div>
                    <Button size="sm" variant="ghost" className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={updatePanelMutation.isPending} onClick={() => handleDeleteSpeechBubble(selectedSpeechBubble)}><Trash2 className="h-3 w-3" /> Supprimer la bulle</Button>
                  </div>
                ) : null}
              </div>
            </div>
          )}

        </aside>
        {/* Centre : panel 800px de large exactement, zoomable via contrôles header ou Ctrl+Scroll */}
        {/* pl-[360px] compense l'asymétrie sidebar droite (416px) vs gauche (56px) pour centrer dans le viewport */}
        <div className="flex-1 min-w-0 flex items-start justify-center overflow-auto p-6 bg-background pl-[360px]">
          {/* Wrapper relatif pour positionner la poignée de redimensionnement */}
          <div className="relative" style={{ flexShrink: 0 }}>
            {(() => {
              const liveH = panelHeightDragDraft ?? panelHeight;
              return (
                <>
                  <div style={{ width: PANEL_WIDTH * zoomLevel, height: liveH * zoomLevel }}>
                    <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left", width: PANEL_WIDTH }}>
                  <div className="rounded-2xl border-2 border-border bg-muted shadow-lg min-w-0 ring-2 ring-border/60 shadow-[inset_0_3px_8px_-2px_rgba(0,0,0,0.15),inset_0_-3px_8px_-2px_rgba(0,0,0,0.15)]">
                    <div className="relative shrink-0 bg-muted rounded-xl overflow-hidden" style={{ width: PANEL_WIDTH, height: liveH }}>
                      <div
                        ref={(el) => { if (el) canvasRefByPanel.current[panel.id] = el; }}
                        className="absolute left-0 top-0 rounded-lg overflow-hidden"
                        style={{
                          width: PANEL_WIDTH,
                          height: liveH,
                          backgroundImage: "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
                          backgroundSize: "24px 24px",
                          backgroundColor: "hsl(var(--muted))",
                        }}
                        onDragOver={handleCanvasDragOver}
                        onDrop={handleCanvasDrop}
                      >
                      <ColorBlockLayer
                        panel={panel}
                        panels={panels}
                        colorBlocks={colorBlocks}
                        canvasRefByPanel={canvasRefByPanel}
                        zoomRef={zoomRef}
                        selectedColorBlockId={selectedColorBlockIdInModal?.panelId === panel.id ? selectedColorBlockIdInModal.colorBlockId : null}
                        onSelectColorBlock={(id) => id
                          ? setSelectedColorBlockIdInModal({ panelId: panel.id, colorBlockId: id })
                          : setSelectedColorBlockIdInModal(null)
                        }
                        onMoveCommit={handleColorBlockMoveCommit}
                        onResizeCommit={handleColorBlockResizeCommit}
                        onDelete={handleDeleteColorBlock}
                      />
                      <ImageBlockLayer
                        panel={panel}
                        panels={panels}
                        blocks={blocks}
                        canvasRefByPanel={canvasRefByPanel}
                        zoomRef={zoomRef}
                        selectedBlockId={selectedBlockIdInModal?.panelId === panel.id ? selectedBlockIdInModal.blockId : null}
                        onSelectBlock={(id) => id
                          ? setSelectedBlockIdInModal({ panelId: panel.id, blockId: id })
                          : setSelectedBlockIdInModal(null)
                        }
                        onMoveCommit={handleImageBlockMoveCommit}
                        onResizeCommit={handleImageBlockResizeCommit}
                        onDelete={handleDeleteBlock}
                        onAddBlock={handleAddBlock}
                        isUpdating={updatePanelMutation.isPending}
                      />
                      <BubbleLayer
                        panel={panel}
                        panels={panels}
                        speechBubbles={speechBubbles}
                        canvasRefByPanel={canvasRefByPanel}
                        zoomRef={zoomRef}
                        selectedBubbleId={selectedSpeechBubbleIdInModal?.panelId === panel.id ? selectedSpeechBubbleIdInModal.bubbleId : null}
                        onSelectBubble={(id) => id
                          ? setSelectedSpeechBubbleIdInModal({ panelId: panel.id, bubbleId: id })
                          : setSelectedSpeechBubbleIdInModal(null)
                        }
                        onMoveCommit={handleBubbleMoveCommit}
                        onResizeCommit={handleBubbleResizeCommit}
                        onDelete={handleDeleteSpeechBubble}
                      />
                      </div>
                    </div>
                  </div>
                    </div>
                  </div>
                  {/* Poignée de redimensionnement — verte, toujours visible */}
                  <div
                    className="relative flex items-center justify-center select-none cursor-ns-resize mb-[600px]"
                    style={{ width: PANEL_WIDTH * zoomLevel, height: 24 }}
                    title={`Hauteur : ${Math.round(liveH)} px — glisser pour redimensionner`}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      panelHeightDragRef.current = { startY: e.clientY, startH: panelHeight };
                    }}
                    onPointerMove={(e) => {
                      if (!panelHeightDragRef.current) return;
                      const delta = (e.clientY - panelHeightDragRef.current.startY) / zoomLevel;
                      const newH = Math.round(Math.max(PANEL_HEIGHT_MIN, Math.min(PANEL_HEIGHT_MAX, panelHeightDragRef.current.startH + delta)));
                      setPanelHeightDragDraft(newH);
                    }}
                    onPointerUp={(e) => {
                      if (!panelHeightDragRef.current) return;
                      const delta = (e.clientY - panelHeightDragRef.current.startY) / zoomLevel;
                      const newH = Math.round(Math.max(PANEL_HEIGHT_MIN, Math.min(PANEL_HEIGHT_MAX, panelHeightDragRef.current.startH + delta)));
                      panelHeightDragRef.current = null;
                      setPanelHeightDragDraft(null);
                      handlePanelHeightChange(newH);
                    }}
                    onPointerCancel={() => {
                      panelHeightDragRef.current = null;
                      setPanelHeightDragDraft(null);
                    }}
                  >
                    <div className="w-full h-full rounded-b-xl bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center gap-2 hover:bg-emerald-500/30 transition-colors">
                      <div className="w-8 h-1 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {Math.round(liveH)} px
                      </span>
                      <div className="w-8 h-1 rounded-full bg-emerald-500" />
                    </div>
                    {panelHeightDragDraft !== null && (
                      <span className="absolute -bottom-6 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        ↕ {Math.round(liveH)} px
                      </span>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
        {/* Droite : chapitre textuel + cases (largeur fixe pour ne pas décaler le canvas) */}
        <aside className="w-[340px] shrink-0 flex flex-col border-l border-border bg-background overflow-y-auto">
          {panelEditorRightTool === "chapter-text" && (
            <div className="p-4 space-y-2 flex-1 min-h-0 flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Scénario</span>
              {loadingScenario ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </div>
              ) : scenarioChapter?.content ? (
                <div className="rounded-md border border-border bg-muted/30 p-3 min-h-[80px] flex-1 overflow-y-auto">
                  <ScenarioTextHighlighter text={scenarioChapter.content} assets={assets} className="text-sm" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic py-2">Aucun chapitre scénario lié.</p>
              )}
            </div>
          )}

          {panelEditorRightTool === "cases" && (
            <div className="p-4 space-y-3 flex-1 min-h-0 flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cases du scénario</span>
                {validatedCases.length > 0 && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-semibold">
                    {validatedCases.length} validée{validatedCases.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {!scenarioChapter && !loadingScenario && (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
                  <BookOpen className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Aucun chapitre scénario lié à ce chapitre.</p>
                </div>
              )}

              {loadingScenario && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                </div>
              )}

              {scenarioChapter && !loadingScenario && validatedCases.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
                  <BookOpen className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Aucune case validée dans le scénario. Validez des cases dans l'onglet Scénario.</p>
                </div>
              )}

              {validatedCases.length > 0 && (
                <div className="flex flex-col gap-2">
                  {validatedCases.map((c) => {
                    const alreadyAdded = layout.blocks.some((b) => b.prompt?.trim() === c.description?.trim());
                    return (
                      <div
                        key={`case-${c.panel_number}-${c.block_number}`}
                        className="rounded-xl border border-border/60 bg-card/60 p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-[10px] font-bold font-mono w-5 h-5 rounded bg-[hsl(var(--lavender)/0.15)] text-[hsl(275,45%,55%)] flex items-center justify-center mt-0.5">
                            {c.caseNumber}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs leading-relaxed text-foreground line-clamp-3">
                              {c.description ?? "—"}
                            </p>
                            {c.text_excerpt && (
                              <p className="text-[10px] text-muted-foreground italic mt-1 line-clamp-2 border-l-2 border-border pl-2">
                                {c.text_excerpt}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={alreadyAdded ? "outline" : "default"}
                          className={`w-full h-7 text-xs gap-1.5 ${alreadyAdded ? "opacity-60" : "gradient-primary text-primary-foreground"}`}
                          disabled={!c.description || updatePanelMutation.isPending}
                          onClick={() => !alreadyAdded && handleAddBlockFromCase(c.description!)}
                        >
                          {alreadyAdded ? (
                            <>✓ Déjà ajouté</>
                          ) : (
                            <><Plus className="h-3 w-3" /> Créer un bloc</>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </aside>
        <aside className="w-[76px] shrink-0 border-l border-border/80 bg-muted/20 px-2 py-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setPanelEditorRightTool("chapter-text")}
            className={`w-full h-12 rounded-xl border flex items-center justify-center transition-colors duration-150 ${
              panelEditorRightTool === "chapter-text"
                ? "border-primary/70 bg-primary/15 text-primary shadow-sm"
                : "border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Scénario"
          >
            <BookOpen className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={isPro ? () => setPanelEditorRightTool("cases") : () => navigate("/dashboard/plans")}
            className={`w-full h-12 rounded-xl border flex items-center justify-center transition-colors duration-150 relative ${
              isPro
                ? panelEditorRightTool === "cases"
                  ? "border-primary/70 bg-primary/15 text-primary shadow-sm"
                  : "border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                : "border-border/70 bg-background text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30"
            }`}
            title={isPro ? "Cases" : "Fonctionnalité Pro — Cliquez pour mettre à niveau"}
          >
            <Layers className="h-5 w-5" />
            {!isPro && (
              <span className="absolute -top-1 -right-1 bg-amber-400/30 text-amber-600 dark:text-amber-400 border border-amber-400/40 text-[8px] font-bold rounded px-1 tracking-wide">
                PRO
              </span>
            )}
          </button>
        </aside>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header fin 48px */}
      <header className="h-12 border-b border-border bg-background/95 backdrop-blur-xl sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 shrink-0">
        <Link
          to={`/dashboard/projects/${projectId}?tab=edition`}
          className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg border border-border bg-muted/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Édition</span>
        </Link>
        <span className="text-muted-foreground/40 text-sm">/</span>
        <span className="text-sm font-medium truncate flex-1">
          Chapitre {chapter.chapter_number} : {chapter.title}
        </span>
        {/* KPI chips */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            {generatedCasesCount} case{generatedCasesCount !== 1 ? "s" : ""} générée{generatedCasesCount !== 1 ? "s" : ""}
          </span>
          {plan === "pro" && detectedCasesCount !== null && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
              {detectedCasesCount} détectée{detectedCasesCount !== 1 ? "s" : ""}
            </span>
          )}
          {pct !== null && (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
              pct === 100
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : "bg-[hsl(var(--lavender)/0.08)] text-[hsl(275,45%,55%)] border-[hsl(var(--lavender)/0.2)]"
            }`}>
              {pct}% complété
            </span>
          )}
          <button
            type="button"
            onClick={() => setSliceModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-muted/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Découper & télécharger ZIP"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Corps : left panel (scénario + cases) + right (canvas) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel ~380px, scrollable */}
        <div className="w-[380px] shrink-0 border-r border-border overflow-y-auto flex flex-col">
          {/* Chapitre texte (Collapsible) */}
          <Collapsible defaultOpen className="border-b border-border">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left font-display font-semibold hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Chapitre texte
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 data-[state=open]:rotate-180 transition-transform" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-3">
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
                          <div className="rounded-lg border border-border bg-background/80 p-4 min-h-[120px] max-h-[40vh] overflow-y-auto">
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

          {/* Cases section — Pro uniquement */}
          {plan === "pro" && linkedScenarioChapter && detectedCasesCount !== null && detectedCasesCount > 0 && (
            <div className="border-b border-border">
              <div className="flex items-center gap-2 px-4 py-3">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold font-display">Cases</span>
                <span className="ml-auto text-xs text-muted-foreground">{detectedCasesCount}</span>
              </div>
              <div className="px-3 pb-3 space-y-2 overflow-y-auto max-h-[40vh]">
                {(linkedScenarioChapter.panels_outline as Array<{ panel_number: number; block_number: number; description: string; locked?: boolean }>).map((c, idx) => (
                  <div
                    key={`${c.panel_number}-${c.block_number}`}
                    className={`flex gap-2.5 p-2.5 rounded-lg border text-xs ${c.locked ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/30 border-border"}`}
                  >
                    <span className={`shrink-0 w-5 h-5 rounded font-bold font-mono flex items-center justify-center text-[10px] text-white ${c.locked ? "bg-emerald-500" : "bg-[hsl(275,45%,55%)]"}`}>
                      {idx + 1}
                    </span>
                    <p className="leading-relaxed text-muted-foreground line-clamp-3">{c.description}</p>
                    {c.locked && <CheckCircle2 className="shrink-0 h-3.5 w-3.5 text-emerald-500 mt-0.5" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right : canvas zone, scrollable */}
        <div className="flex-1 overflow-auto p-4">
          {/* Canvas (chargement automatique) */}
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(var(--lavender))" }} />
              <p className="text-sm">Chargement du canvas...</p>
            </div>
          </div>
          {/* Refs cachés pour l'export — le canvas de chaque panel est monté hors écran */}
          {panels.map((panel) => {
            const previewColorBlocks = getPanelColorBlocks(panel);
            const blocks = getPanelBlocks(panel);
            return (
              <div key={panel.id} style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none", zIndex: -1 }}>
                <div
                  ref={(el) => { exportCanvasRefByPanel.current[panel.id] = el; }}
                  style={{ width: PANEL_WIDTH, height: getPanelHeight(panel), backgroundColor: "#ffffff", position: "relative", overflow: "hidden" }}
                >
                  {previewColorBlocks.map((cb) => {
                    const bgStyle = cb.fill.type === "solid"
                      ? { backgroundColor: cb.fill.color }
                      : { background: `linear-gradient(${cb.fill.angle ?? 90}deg, ${cb.fill.from}, ${cb.fill.to})` };
                    return (
                      <div key={cb.id} style={{ position: "absolute", left: cb.x, top: cb.y, width: cb.width, height: cb.height, zIndex: 0, ...bgStyle }} />
                    );
                  })}
                  {blocks.map((block) => (
                    <div key={block.id} style={{ position: "absolute", left: block.x, top: block.y, width: block.width, height: block.height, zIndex: 10, overflow: "hidden" }}>
                      {block.image_url ? (
                        <img
                          src={block.image_url}
                          alt=""
                          crossOrigin="anonymous"
                          loading="eager"
                          style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
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
                    if (expandedPanelId === panelToDeleteId) closePanelEditor();
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
      <Dialog
        open={!!expandedPanelId}
        onOpenChange={(open) => {
          if (!open) closePanelEditor();
        }}
      >
        <DialogContent
          className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] overflow-hidden flex flex-col gap-0 p-0 bg-background border-0 rounded-none shadow-none [&>button.absolute]:hidden"
          aria-describedby={undefined}
        >
          <DialogHeader className="px-6 pt-4 pb-4 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <Link
                to={`/dashboard/projects/${projectId}?tab=edition`}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
                onClick={closePanelEditor}
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au projet
              </Link>
              <DialogTitle className="text-base font-medium truncate">
                Éditeur de canvas
              </DialogTitle>
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden md:flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      plan === "pro"
                        ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                    title="Plan actuel"
                  >
                    {plan === "pro" ? "Pro" : "Free"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">
                    <Sparkles className="h-3 w-3" />
                    {usageInfo.count}/{usageInfo.limit}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setZoomLevel((l) => Math.max(0.1, Math.round((l - 0.1) * 10) / 10))}
                  title="Dézoomer (Ctrl+Scroll)"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-mono w-10 text-center tabular-nums select-none">{Math.round(zoomLevel * 100)}%</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setZoomLevel((l) => Math.min(2, Math.round((l + 0.1) * 10) / 10))}
                  title="Zoomer (Ctrl+Scroll)"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
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

      {/* Modal découpage & export ZIP */}
      <Dialog open={sliceModalOpen} onOpenChange={setSliceModalOpen}>
        <DialogContent className="glass max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Découper le chapitre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hauteur du canvas</span>
                <span className="font-medium tabular-nums">
                  {panels[0] ? getPanelHeight(panels[0]).toLocaleString() : "–"} px
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Découpe fixe</span>
                <span className="font-medium">1 280 px / panel</span>
              </div>
              <div className="flex justify-between text-foreground font-semibold">
                <span>Panels générés</span>
                <span className="tabular-nums">
                  {panels[0] ? Math.ceil(getPanelHeight(panels[0]) / 1280) : "–"}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Le chapitre sera découpé en tranches de 1 280px et téléchargé en ZIP.
              Seules les zones avec du contenu visible seront incluses.
            </p>
            <Button
              className="w-full gradient-primary text-primary-foreground gap-2"
              disabled={exportingChapter}
              onClick={async () => {
                if (!panels[0] || !project) return;
                const panelId = panels[0].id;
                const el = exportCanvasRefByPanel.current[panelId];
                if (!el) {
                  toast({ title: "Canvas non disponible", description: "Ouvrez d'abord le panel dans l'éditeur.", variant: "destructive" });
                  return;
                }
                setExportingChapter(true);
                try {
                  await exportChapterAsZip(
                    el,
                    project.title ?? "Projet",
                    chapter?.chapter_number ?? 1,
                    1280
                  );
                  toast({ title: "ZIP téléchargé" });
                  setSliceModalOpen(false);
                } catch (err) {
                  toast({ title: "Erreur export", description: String(err), variant: "destructive" });
                } finally {
                  setExportingChapter(false);
                }
              }}
            >
              {exportingChapter ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Export en cours...</>
              ) : (
                <><Download className="h-4 w-4" /> Télécharger le ZIP</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
