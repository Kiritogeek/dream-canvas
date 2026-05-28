// Écran d'édition d'un chapitre visuel — double visualisation + panels (liberté de création)
// Gauche : chapitre texte (scénario) avec Aperçu = surbrillance assets + hover. Droite : panels (l'utilisateur crée le nombre qu'il souhaite).
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Minus,
  ChevronDown,
  BookOpen,
  Save,
  Loader2,
  Sparkles,
  Trash2,
  Download,
  Layers,
  CheckCircle2,
  Undo2,
  Redo2,
} from "lucide-react";
import { BubbleToolbar } from "@/components/chapter/BubbleToolbar";
import { BlockToolbar } from "@/components/chapter/BlockToolbar";
import type { CanvasColorFillPickMeta } from "@/components/chapter/DreamWeaveColorPicker";
import { Button } from "@/components/ui/button";
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
import { QuotaReachedDialog } from "@/components/shared/QuotaReachedDialog";
import { getDetectedAssets } from "@/components/project/ScenarioTextHighlighter";
import { ScenarioFormattedPreview } from "@/components/project/ScenarioFormattedPreview";
import { useChapter, useUpdateChapter } from "@/hooks/useChapters";
import { useScenarioChapters, useScenarioChapter } from "@/hooks/useScenarioChapters";
import { useAssets } from "@/hooks/useAssets";
import { useProject } from "@/hooks/useProjects";
import { useComposeChapterLayout } from "@/hooks/useComposeChapterLayout";
import { getMaxAccessibleTab, useProgressiveMenuAccess } from "@/hooks/useProgressiveMenuGate";
import { useUserPlan } from "@/hooks/useUserPlan";
import {
  usePanels,
  useCreatePanel,
  useUpdatePanel,
  useDeletePanel,
  useGeneratePanelImage,
} from "@/hooks/usePanels";
import { useGeneratingBlocks, useChapterIsViewing, startBlockGeneration, endBlockGeneration, notifyBlockDone } from "@/lib/generationPending";
import {
  getPanelBlocks,
  getPanelHeight,
  getPanelLayout,
  getPanelColorBlocks,
  getPanelSpeechBubbles,
  generatePanelBlockImage,
  DEFAULT_BLOCK_WIDTH,
  DEFAULT_BLOCK_HEIGHT,
  DEFAULT_COLOR_BLOCK_FILL,
  PANEL_HEIGHT_MIN,
  PANEL_HEIGHT_MAX,
} from "@/services/panels";
import { callSuggestBlockPrompt } from "@/services/scenarioAI";
import { ColorBlockLayer } from "@/components/chapter/ColorBlockLayer";
import { ImageBlockLayer } from "@/components/chapter/ImageBlockLayer";
import { BubbleLayer } from "@/components/chapter/BubbleLayer";
import { PanelExportSpeechBubbles } from "@/components/chapter/PanelExportSpeechBubbles";
import { EditorRightPanel } from "@/components/chapter/EditorRightPanel";
import { EditorLeftSidebar, type SidebarTab } from "@/components/chapter/EditorLeftSidebar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { Json } from "@/integrations/supabase/types";
import type { Panel, PanelBlock, PanelLayout, PanelBlockShape, ColorBlock, ColorBlockFill, SpeechBubble, Asset } from "@/types";
import {
  DEFAULT_SPEECH_BUBBLE_WIDTH,
  DEFAULT_SPEECH_BUBBLE_HEIGHT,
  SPEECH_BUBBLE_DEFAULT_STYLE,
  planDisplayName,
} from "@/types";
import type { ChapterCanvasImageHistoryRow } from "@/services/chapterCanvasImageHistory";
import {
  chapterCanvasImageHistoryQueryKey,
  insertChapterCanvasImageHistoryForSession,
  parseLayoutRect,
} from "@/services/chapterCanvasImageHistory";
import { useChapterCanvasImageHistory } from "@/hooks/useChapterCanvasImageHistory";
import { useChapterEditorZoom } from "@/hooks/useChapterEditorZoom";
import {
  pushCanvasUndoSnapshot,
  snapshotPanelCanvas,
  type PanelCanvasSnapshot,
  type PanelCanvasUndoEntry,
} from "@/lib/panelCanvasUndo";
import { getSpeechBubbleBottomInPanelPx } from "@/lib/bubbleSvgLayout";

const PANEL_WIDTH = 800;

/** Convertit coords écran viewport → coords logiques du canvas (prend en compte le zoom via getBoundingClientRect). */
function viewportClientToCanvas(canvasEl: HTMLDivElement, clientX: number, clientY: number) {
  const rect = canvasEl.getBoundingClientRect();
  const scale = canvasEl.offsetWidth > 0 ? rect.width / canvasEl.offsetWidth : 1;
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  };
}

/** Centre de la zone de scroll visible projeté sur le canvas, puis ancres top-left d’un rectangle itemW×itemH (clampé dans le canvas). */
function canvasPlacementFromViewportCenter(
  canvasEl: HTMLDivElement | null,
  scrollEl: HTMLDivElement | null,
  panelWidth: number,
  panelLogicalHeight: number,
  itemWidth: number,
  itemHeight: number,
): { x: number; y: number } {
  if (!canvasEl) {
    return {
      x: Math.max(0, Math.round((panelWidth - itemWidth) / 2)),
      y: Math.max(0, Math.round((panelLogicalHeight - itemHeight) / 2)),
    };
  }

  let clientX: number;
  let clientY: number;
  if (scrollEl) {
    const sr = scrollEl.getBoundingClientRect();
    clientX = sr.left + sr.width / 2;
    clientY = sr.top + sr.height / 2;
  } else {
    const cr = canvasEl.getBoundingClientRect();
    clientX = cr.left + cr.width / 2;
    clientY = cr.top + cr.height / 2;
  }

  const canvasRect = canvasEl.getBoundingClientRect();
  const margin = 4;
  const px = Math.min(Math.max(clientX, canvasRect.left + margin), canvasRect.right - margin);
  const py = Math.min(Math.max(clientY, canvasRect.top + margin), canvasRect.bottom - margin);
  const pos = viewportClientToCanvas(canvasEl, px, py);
  const x = Math.round(pos.x - itemWidth / 2);
  const y = Math.round(pos.y - itemHeight / 2);
  return {
    x: Math.max(0, Math.min(panelWidth - itemWidth, x)),
    y: Math.max(0, Math.min(panelLogicalHeight - itemHeight, y)),
  };
}

const CANVAS_HISTORY_RESTORED_IDS_KEY = (id: string) => `dreamweave_canvas_history_restored_${id}`;

function loadCanvasHistoryRestoredIds(chapterDbId: string | undefined): Set<string> {
  if (!chapterDbId || typeof sessionStorage === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(CANVAS_HISTORY_RESTORED_IDS_KEY(chapterDbId));
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

type CanvasElementDeleteIntent =
  | { panelId: string; kind: "image"; blockId: string }
  | { panelId: string; kind: "color"; colorBlockId: string }
  | { panelId: string; kind: "bubble"; bubbleId: string };

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

// Détecte si deux blocs partagent un lien visuel (même lieu, mêmes personnages).
// Si oui → passer l'image précédente comme référence de continuité.
// Si non → scène différente, pas de référence (évite les contaminations visuelles).
const STOP_WORDS = new Set(["dans", "avec", "vers", "sous", "sur", "entre", "pour", "une", "des", "les", "son", "ses", "leur", "qui", "que", "est", "sont", "elle", "ils", "elles", "mais", "puis", "alors"]);
function hasVisualLink(promptA: string, promptB: string): boolean {
  const tokenize = (s: string) =>
    s.toLowerCase().replace(/[^a-zàâéèêëîïôùûüç\s]/g, " ").split(/\s+/)
      .filter((w) => w.length > 4 && !STOP_WORDS.has(w));
  const wordsA = new Set(tokenize(promptA));
  const wordsB = tokenize(promptB);
  const shared = wordsB.filter((w) => wordsA.has(w));
  return shared.length >= 2;
}


export default function ChapterDetail() {
  const { id: projectId, chapterId } = useParams<{ id: string; chapterId: string }>();
  const { toast } = useToast();

  const { data: chapter, isLoading: loadingChapter } = useChapter(chapterId);
  const { data: project } = useProject(projectId);
  const { isResolved, appliesProgressiveFlow, accessible } = useProgressiveMenuAccess(projectId);
  const progressiveRedirectRef = useRef(false);
  const { plan, usageInfo, nextResetDate } = useUserPlan();
  const navigate = useNavigate();
  const isPro = plan === "createur" || plan === "studio";
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
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const generatePanelImage = useGeneratePanelImage(chapterId ?? "");
  const composeLayout = useComposeChapterLayout(chapterId);
  const generatingBlocks = useGeneratingBlocks();
  const [generatingAllProgress, setGeneratingAllProgress] = useState<{ current: number; total: number } | null>(null);
  const [savedCompositionBeforeRecompose, setSavedCompositionBeforeRecompose] = useState<{
    layout: PanelLayout;
    speechBubbles: SpeechBubble[];
  } | null>(null);
  const [isRefusingRecompose, setIsRefusingRecompose] = useState(false);
  useChapterIsViewing(projectId ?? "", chapterId ?? "");
  const panelsQueryKey = useMemo(() => ["panels", chapterId] as const, [chapterId]);
  const { data: chapterImageHistory = [], isPending: chapterImageHistoryPending } = useChapterCanvasImageHistory(chapterId);
  const [restoringHistoryId, setRestoringHistoryId] = useState<string | null>(null);
  const [canvasHistoryRestoredIds, setCanvasHistoryRestoredIds] = useState<Set<string>>(() => new Set());
  const preloadedImagesRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    setCanvasHistoryRestoredIds(loadCanvasHistoryRestoredIds(chapterId));
  }, [chapterId]);

  useEffect(() => {
    progressiveRedirectRef.current = false;
  }, [projectId]);

  useEffect(() => {
    if (!isResolved || !appliesProgressiveFlow || !projectId) return;
    if (accessible.edition) return;
    if (progressiveRedirectRef.current) return;
    progressiveRedirectRef.current = true;
    const tab = getMaxAccessibleTab(accessible);
    toast({
      title: "Étape précédente requise",
      description:
        "Poursuivez le parcours débutant dans l’ordre : Style → Scénario → Assets → Univers → Édition.",
    });
    navigate(`/dashboard/projects/${projectId}?tab=${tab}`, { replace: true });
  }, [isResolved, appliesProgressiveFlow, accessible, projectId, navigate, toast]);

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
  /** Hauteur live pendant le drag de la poignée bas-du-canvas ; null = pas de drag en cours */
  const [panelHeightDragDraft, setPanelHeightDragDraft] = useState<number | null>(null);
  const panelHeightDragRef = useRef<{ startY: number; startH: number } | null>(null);
  /** Refs du canvas par panel (pour calcul position de dépôt quand on drop sur un bloc) */
  const canvasRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  /** Conteneur à scroll du canvas en modale d’édition (centre viewport = là où « regarde » l’utilisateur). */
  const panelEditorCanvasScrollRef = useRef<HTMLDivElement | null>(null);
  /** Cadre border du canvas zoomé — pour ancrer le zoom sur le centre du viewport de scroll (pas sur le coin haut-gauche). */
  const panelEditorZoomFrameRef = useRef<HTMLDivElement | null>(null);
  /** Panels où un picker couleur « live » a déjà enregistré l’instantané undo (SV / curseur teinte). */
  const panelLiveColorPickUndoRef = useRef<Set<string>>(new Set());
  /** Refs du canvas de prévisualisation par panel (utilisées pour l'export PNG) */
  const exportCanvasRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  /** Export du chapitre entier en cours */
  const [exportingChapter, setExportingChapter] = useState(false);
  /** Élément ghost pour le drag « nouveau bloc » (setDragImage) */
  const newBlockDragGhostRef = useRef<HTMLDivElement | null>(null);
  /** Drop move-block traité sur le canvas : ne pas nettoyer le preview dans onDragEnd pour éviter le saut visuel */
  const moveDropHandledRef = useRef(false);
  /** Après un drag, un clic parasite peut remonter au scroll parent et tout désélectionner ; le premier onClick sur cette zone est ignoré (ne pas réinitialiser ce flag dans un setTimeout(0) : il courrait avant le clic et cassait l’effet). */
  const skipNextCanvasEmptyClickRef = useRef(false);
  /** Bloc en cours de déplacement via drag HTML5 (move-block) — null quand useDragBlock gère le mouvement */
  const [draggingBlock, setDraggingBlock] = useState<{
    panelId: string; blockId: string;
    startBlockX: number; startBlockY: number;
    startMouseX: number; startMouseY: number;
  } | null>(null);
  /** Panel sur lequel un élément de la sidebar est en train d'être survolé (drag-over) */
  const [isDragOverCanvasId, setIsDragOverCanvasId] = useState<string | null>(null);
  const dragOverCounterRef = useRef<Record<string, number>>({});
  /** Panel ouvert en modale « Edition » (id ou null) — initialisé depuis le cache pour éliminer le flash au premier render */
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(() => {
    const cached = chapterId ? queryClient.getQueryData<Panel[]>(["panels", chapterId]) : undefined;
    return cached && cached.length > 0 ? cached[0].id : null;
  });
  /** Outil à droite dans la modale d'édition — null = panel rétracté. */
  const [panelEditorRightTool, setPanelEditorRightTool] = useState<"chapter-text" | "assets" | "cases" | null>(null);
  /** Bloc sélectionné dans la modale (mode Personalisation) pour afficher le panneau droit ou gauche */
  const [selectedBlockIdInModal, setSelectedBlockIdInModal] = useState<{ panelId: string; blockId: string } | null>(null);
  /** Bloc de couleur sélectionné (onglet Couleurs) pour éditer la couleur */
  const [selectedColorBlockIdInModal, setSelectedColorBlockIdInModal] = useState<{ panelId: string; colorBlockId: string } | null>(null);
  /** Bulle de dialogue sélectionnée (onglet Dialogue) pour éditer le texte et le style */
  const [selectedSpeechBubbleIdInModal, setSelectedSpeechBubbleIdInModal] = useState<{ panelId: string; bubbleId: string } | null>(null);
  /** Bulle dont la toolbar affiche le mode queue (null = mode bulle normal) */
  const [tailContextBubbleId, setTailContextBubbleId] = useState<string | null>(null);
  /** Modal de découpage et téléchargement ZIP */
  const [sliceModalOpen, setSliceModalOpen] = useState(false);
  /** Onglet actif de la sidebar bibliothèque / historique (null = fermée) */
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab | null>(null);

  const { zoomLevel, zoomRef, applyChapterEditorZoom } = useChapterEditorZoom({
    expandedPanelId,
    scrollContainerRef: panelEditorCanvasScrollRef,
    zoomFrameRef: panelEditorZoomFrameRef,
  });

  // Réduit la duplication des resets d'état de l'éditeur panel.
  const resetPanelEditorUiState = useCallback(() => {
    setSelectedBlockIdInModal(null);
    setSelectedColorBlockIdInModal(null);
    setSelectedSpeechBubbleIdInModal(null);
    setTailContextBubbleId(null);
    setPanelHeightDragDraft(null);
  }, []);

  const closePanelEditor = useCallback(() => {
    setExpandedPanelId(null);
    setCanvasDeleteIntent(null);
    setActiveSidebarTab(null);
    resetPanelEditorUiState();
  }, [resetPanelEditorUiState]);

  const handleScrollToCanvasY = useCallback((logicalY: number) => {
    const scrollEl = panelEditorCanvasScrollRef.current;
    const zoomFrameEl = panelEditorZoomFrameRef.current;
    if (!scrollEl || !zoomFrameEl) return;
    const zoom = zoomRef.current ?? 1;
    const scrollRect = scrollEl.getBoundingClientRect();
    const frameRect = zoomFrameEl.getBoundingClientRect();
    const canvasTopInContent = frameRect.top - scrollRect.top + scrollEl.scrollTop;
    const targetScrollTop = canvasTopInContent + logicalY * zoom - scrollEl.clientHeight / 2;
    scrollEl.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const canvasUndoStacksRef = useRef(new Map<string, PanelCanvasUndoEntry>());
  const [canvasDeleteIntent, setCanvasDeleteIntent] = useState<CanvasElementDeleteIntent | null>(null);

  const applyCanvasSnapshot = useCallback(
    (panelId: string, snap: PanelCanvasSnapshot) => {
      queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) =>
        !old
          ? old
          : old.map((row) =>
              row.id === panelId
                ? {
                    ...row,
                    layout: snap.layout as unknown as Json,
                    speech_bubbles: snap.speech_bubbles as unknown as Json,
                    color_blocks: snap.color_blocks as unknown as Json,
                  }
                : row,
            ),
      );
      updatePanelMutation.mutate(
        {
          id: panelId,
          updates: {
            layout: snap.layout as unknown as Json,
            speech_bubbles: snap.speech_bubbles as unknown as Json,
            color_blocks: snap.color_blocks as unknown as Json,
          },
        },
        {
          onError: (err) => {
            toast({ title: "Erreur", description: err.message, variant: "destructive" });
            queryClient.invalidateQueries({ queryKey: panelsQueryKey });
          },
        },
      );
    },
    [queryClient, panelsQueryKey, updatePanelMutation, toast],
  );

  const recordCanvasUndoBeforeChange = useCallback(
    (panelId: string) => {
      const list = queryClient.getQueryData<Panel[]>(panelsQueryKey);
      const pnow = list?.find((pp) => pp.id === panelId);
      if (pnow) pushCanvasUndoSnapshot(canvasUndoStacksRef.current, panelId, pnow);
    },
    [queryClient, panelsQueryKey],
  );

  const handleColorPickLiveGestureEndForPanel = useCallback((panelId: string) => {
    panelLiveColorPickUndoRef.current.delete(panelId);
  }, []);

  const undoPanelCanvas = useCallback(
    (panelId: string): boolean => {
      const entry = canvasUndoStacksRef.current.get(panelId);
      const list = queryClient.getQueryData<Panel[]>(panelsQueryKey);
      const panel = list?.find((p) => p.id === panelId);
      if (!entry?.past.length || !panel) return false;
      const current = snapshotPanelCanvas(panel);
      const prev = entry.past.pop()!;
      entry.future.push(current);
      applyCanvasSnapshot(panelId, prev);
      toast({ title: "Annulé", description: "Modification du canvas annulée." });
      return true;
    },
    [applyCanvasSnapshot, queryClient, panelsQueryKey, toast],
  );

  const redoPanelCanvas = useCallback(
    (panelId: string): boolean => {
      const entry = canvasUndoStacksRef.current.get(panelId);
      const list = queryClient.getQueryData<Panel[]>(panelsQueryKey);
      const panel = list?.find((p) => p.id === panelId);
      if (!entry?.future.length || !panel) return false;
      const current = snapshotPanelCanvas(panel);
      const next = entry.future.pop()!;
      entry.past.push(current);
      applyCanvasSnapshot(panelId, next);
      toast({ title: "Rétabli", description: "Modification du canvas rejouée." });
      return true;
    },
    [applyCanvasSnapshot, queryClient, panelsQueryKey, toast],
  );

  const restoreChapterCanvasImageHistoryRow = useCallback(
    async (entry: ChapterCanvasImageHistoryRow) => {
      if (!chapterId) return;
      const list = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? panels;
      const panel = list.find((p) => p.id === entry.panel_canvas_id);
      if (!panel) {
        toast({
          title: "Canvas introuvable",
          description: "Ce chapitre ne contient plus le canvas cible.",
          variant: "destructive",
        });
        return;
      }
      setRestoringHistoryId(entry.id);
      try {
        const ly = getPanelLayout(panel);
        const panelH = getPanelHeight(panel);
        const rect = parseLayoutRect(entry.layout_rect);
        const w = rect?.width ?? DEFAULT_BLOCK_WIDTH;
        const h = rect?.height ?? DEFAULT_BLOCK_HEIGHT;
        const x = rect?.x ?? Math.max(0, Math.round((PANEL_WIDTH - w) / 2));
        const y = rect?.y ?? Math.max(0, Math.round((panelH - h) / 2));
        const newBlock: PanelBlock = {
          id: crypto.randomUUID(),
          x,
          y,
          width: w,
          height: h,
          name: entry.block_name?.trim() || "Case restaurée",
          prompt: entry.prompt?.trim() || null,
          image_url: entry.image_url,
        };
        recordCanvasUndoBeforeChange(panel.id);
        await updatePanelMutation.mutateAsync({
          id: panel.id,
          updates: { layout: { ...ly, blocks: [...ly.blocks, newBlock] } as unknown as Json },
        });
        setCanvasHistoryRestoredIds((prev) => {
          const next = new Set(prev).add(entry.id);
          try {
            sessionStorage.setItem(CANVAS_HISTORY_RESTORED_IDS_KEY(chapterId), JSON.stringify([...next]));
          } catch {
            /* ignore quota / private mode */
          }
          return next;
        });
        toast({ title: "Image restaurée sur le canvas" });
      } catch (err) {
        toast({
          title: "Restauration impossible",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      } finally {
        setRestoringHistoryId(null);
      }
    },
    [chapterId, panels, panelsQueryKey, queryClient, recordCanvasUndoBeforeChange, toast, updatePanelMutation],
  );

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

  useKeyboardShortcuts({
    expandedPanelId,
    panels,
    selectedBlockIdInModal,
    selectedColorBlockIdInModal,
    selectedSpeechBubbleIdInModal,
    canvasRefByPanel,
    panelEditorCanvasScrollRef,
    updatePanelMutation,
    undoPanelCanvas,
    redoPanelCanvas,
    recordCanvasUndoBeforeChange,
    setSelectedBlockIdInModal,
    setSelectedColorBlockIdInModal,
    setSelectedSpeechBubbleIdInModal,
    setCanvasDeleteIntent,
    PANEL_WIDTH,
    canvasPlacementFromViewportCenter,
  });

  const handleColorBlockMoveCommit = useCallback((panelId: string, colorBlockId: string, x: number, y: number) => {
    const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
    const panelData = currentPanels.find((p) => p.id === panelId);
    if (panelData) recordCanvasUndoBeforeChange(panelId);
    const colorBlocksList = getPanelColorBlocks(panelData ?? panels.find((p) => p.id === panelId));
    const next = colorBlocksList.map((c) => (c.id === colorBlockId ? { ...c, x, y } : c));
    queryClient.cancelQueries({ queryKey: panelsQueryKey });
    const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
    queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panelId ? { ...p, color_blocks: next as unknown as Json } : p))));
    updatePanelMutation.mutate(
      { id: panelId, updates: { color_blocks: next as unknown as Json } },
      { onError: (err) => { if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels); toast({ title: "Erreur", description: err.message, variant: "destructive" }); } }
    );
    skipNextCanvasEmptyClickRef.current = true;
    setSelectedBlockIdInModal(null);
    setSelectedSpeechBubbleIdInModal(null);
    setSelectedColorBlockIdInModal({ panelId, colorBlockId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, panels, updatePanelMutation, toast, recordCanvasUndoBeforeChange]);

  const handleColorBlockResizeCommit = useCallback((panelId: string, colorBlockId: string, draft: { x: number; y: number; width: number; height: number }) => {
    const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
    const currentPanel = currentPanels.find((p) => p.id === panelId);
    if (currentPanel) recordCanvasUndoBeforeChange(panelId);
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
  }, [queryClient, panels, updatePanelMutation, toast, recordCanvasUndoBeforeChange]);

  const handleImageBlockMoveCommit = useCallback((panelId: string, blockId: string, x: number, y: number) => {
    const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
    const panelData = currentPanels.find((p) => p.id === panelId);
    if (panelData) recordCanvasUndoBeforeChange(panelId);
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
    skipNextCanvasEmptyClickRef.current = true;
    setSelectedColorBlockIdInModal(null);
    setSelectedSpeechBubbleIdInModal(null);
    setSelectedBlockIdInModal({ panelId, blockId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, panels, updatePanelMutation, moveDropHandledRef, toast, recordCanvasUndoBeforeChange]);

  const handleImageBlockResizeCommit = useCallback((panelId: string, blockId: string, draft: { x: number; y: number; width: number; height: number }) => {
    const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
    const panelData = currentPanels.find((p) => p.id === panelId);
    if (panelData) recordCanvasUndoBeforeChange(panelId);
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
  }, [queryClient, panels, updatePanelMutation, toast, recordCanvasUndoBeforeChange]);

  const handleBubbleMoveCommit = useCallback((panelId: string, bubbleId: string, x: number, y: number) => {
    const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
    const panelData = currentPanels.find((p) => p.id === panelId);
    if (panelData) recordCanvasUndoBeforeChange(panelId);
    const bubblesList = getPanelSpeechBubbles(panelData ?? panels.find((p) => p.id === panelId));
    const next = bubblesList.map((b) => (b.id === bubbleId ? { ...b, position: { x, y } } : b));
    queryClient.cancelQueries({ queryKey: panelsQueryKey });
    const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
    queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panelId ? { ...p, speech_bubbles: next as unknown as Json } : p))));
    updatePanelMutation.mutate(
      { id: panelId, updates: { speech_bubbles: next as unknown as Json } },
      { onError: (err) => { if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels); toast({ title: "Erreur", description: err.message, variant: "destructive" }); } }
    );
    skipNextCanvasEmptyClickRef.current = true;
    setSelectedBlockIdInModal(null);
    setSelectedColorBlockIdInModal(null);
    setSelectedSpeechBubbleIdInModal({ panelId, bubbleId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, panels, updatePanelMutation, toast, recordCanvasUndoBeforeChange]);

  const handleBubbleResizeCommit = useCallback((panelId: string, bubbleId: string, draft: { x: number; y: number; width: number; height: number }) => {
    const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
    const currentPanel = currentPanels.find((p) => p.id === panelId);
    if (currentPanel) recordCanvasUndoBeforeChange(panelId);
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
  }, [queryClient, panels, updatePanelMutation, toast, recordCanvasUndoBeforeChange]);

  const loading = loadingChapter || loadingPanels;
  const canSaveLink =
    (chapter?.linked_scenario_chapter_id ?? null) !==
    (displayedScenarioChapterId ?? null);

  const confirmCanvasElementDelete = (intent: CanvasElementDeleteIntent) => {
    setCanvasDeleteIntent(null);
    const row = (queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? []).find((p) => p.id === intent.panelId);
    if (!row) return;
    recordCanvasUndoBeforeChange(intent.panelId);
    const ly = getPanelLayout(row);
    const cols = getPanelColorBlocks(row);
    const bubbles = getPanelSpeechBubbles(row);

    if (intent.kind === "image") {
      const doomed = ly.blocks.find((b) => b.id === intent.blockId);
      const imgUrl = doomed?.image_url?.trim();
      if (doomed && imgUrl && chapterId) {
        void (async () => {
          try {
            await insertChapterCanvasImageHistoryForSession({
              chapterId,
              panelCanvasId: intent.panelId,
              eventKind: "case_removed_with_image",
              sourceBlockId: intent.blockId,
              prompt: doomed.prompt ?? null,
              imageUrl: imgUrl,
              blockName: doomed.name ?? null,
              layoutRect: { x: doomed.x, y: doomed.y, width: doomed.width, height: doomed.height },
            });
            await queryClient.invalidateQueries({ queryKey: chapterCanvasImageHistoryQueryKey(chapterId) });
          } catch (e) {
            toast({
              title: "Historique non sauvegardé",
              description: e instanceof Error ? e.message : String(e),
              variant: "destructive",
            });
          }
        })();
      }
      const nextBlocks = ly.blocks.filter((b) => b.id !== intent.blockId);
      if (
        selectedBlockIdInModal?.panelId === intent.panelId &&
        selectedBlockIdInModal.blockId === intent.blockId
      ) {
        setSelectedBlockIdInModal(null);
      }
      const prevImage = queryClient.getQueryData<Panel[]>(panelsQueryKey);
      queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === intent.panelId ? { ...p, layout: { ...ly, blocks: nextBlocks } as unknown as Json } : p))));
      updatePanelMutation.mutate(
        { id: intent.panelId, updates: { layout: { ...ly, blocks: nextBlocks } as unknown as Json } },
        {
          onSuccess: () => {
            setBlockPromptDrafts((prev) => {
              const n = { ...prev };
              delete n[`${intent.panelId}-${intent.blockId}`];
              return n;
            });
            toast({ title: "Case supprimée" });
          },
          onError: (err) => { if (prevImage) queryClient.setQueryData(panelsQueryKey, prevImage); toast({ title: "Erreur", description: err.message, variant: "destructive" }); },
        },
      );
      return;
    }
    if (intent.kind === "color") {
      const nextColor = cols.filter((c) => c.id !== intent.colorBlockId);
      if (
        selectedColorBlockIdInModal?.panelId === intent.panelId &&
        selectedColorBlockIdInModal.colorBlockId === intent.colorBlockId
      ) {
        setSelectedColorBlockIdInModal(null);
      }
      const prevColor = queryClient.getQueryData<Panel[]>(panelsQueryKey);
      queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === intent.panelId ? { ...p, color_blocks: nextColor as unknown as Json } : p))));
      updatePanelMutation.mutate(
        { id: intent.panelId, updates: { color_blocks: nextColor as unknown as Json } },
        {
          onSuccess: () => toast({ title: "Bloc de couleur supprimé" }),
          onError: (err) => { if (prevColor) queryClient.setQueryData(panelsQueryKey, prevColor); toast({ title: "Erreur", description: err.message, variant: "destructive" }); },
        },
      );
      return;
    }
    const nextSpeech = bubbles.filter((b) => b.id !== intent.bubbleId);
    setSelectedSpeechBubbleIdInModal((cur) =>
      cur?.panelId === intent.panelId && cur.bubbleId === intent.bubbleId ? null : cur,
    );
    setTailContextBubbleId((t) => (t === intent.bubbleId ? null : t));
    const prevBubble = queryClient.getQueryData<Panel[]>(panelsQueryKey);
    queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === intent.panelId ? { ...p, speech_bubbles: nextSpeech as unknown as Json } : p))));
    updatePanelMutation.mutate(
      { id: intent.panelId, updates: { speech_bubbles: nextSpeech as unknown as Json } },
      {
        onSuccess: () => toast({ title: "Bulle supprimée" }),
        onError: (err) => { if (prevBubble) queryClient.setQueryData(panelsQueryKey, prevBubble); toast({ title: "Erreur", description: err.message, variant: "destructive" }); },
      },
    );
  };

  // ── Recomposition handlers — définis avant les early returns (règles des hooks) ──

  const handleAcceptRecompose = useCallback(() => {
    setSavedCompositionBeforeRecompose(null);
    toast({ title: "Nouvelle composition acceptée !" });
  }, [toast]);

  const handleRefuseRecompose = useCallback(async () => {
    if (!savedCompositionBeforeRecompose || !panels.length) return;
    const panel = panels[0];
    setIsRefusingRecompose(true);
    try {
      await updatePanelMutation.mutateAsync({
        id: panel.id,
        updates: {
          layout: savedCompositionBeforeRecompose.layout as unknown as Json,
          speech_bubbles: savedCompositionBeforeRecompose.speechBubbles as unknown as Json,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["panels", chapterId] });
      setSavedCompositionBeforeRecompose(null);
      toast({ title: "Recomposition annulée", description: "L'ancienne composition a été restaurée." });
    } catch {
      toast({ title: "Erreur lors de la restauration", variant: "destructive" });
    } finally {
      setIsRefusingRecompose(false);
    }
  }, [savedCompositionBeforeRecompose, panels, updatePanelMutation, queryClient, chapterId, toast]);

  const handleGenerateAllBlocks = useCallback(async () => {
    if (!project || !panels.length) return;
    const panel = panels[0];
    const layout = getPanelLayout(panel);
    // Triés par Y : ordre visuel top→bottom = ordre narratif garanti
    const blocksToGen = layout.blocks
      .filter((b) => b.prompt?.trim() && !b.image_url)
      .sort((a, b) => a.y - b.y);

    if (!blocksToGen.length) {
      toast({ title: "Toutes les cases ont déjà une image" });
      return;
    }
    if (!project.style_template?.trim()) {
      toast({ title: "Style requis", description: "Enregistrez un template de style texte sur le projet.", variant: "destructive" });
      return;
    }

    setGeneratingAllProgress({ current: 0, total: blocksToGen.length });
    let currentLayout: PanelLayout = { ...layout, blocks: [...layout.blocks] };
    let generated = 0;
    // Continuité visuelle : image + prompt du bloc précédent
    let lastGeneratedImageUrl: string | null = null;
    let lastGeneratedPrompt: string | null = null;

    for (const block of blocksToGen) {
      if (usageInfo.count + generated >= usageInfo.limit) {
        setShowQuotaModal(true);
        break;
      }
      startBlockGeneration(panel.id, block.id);
      try {
        const prompt = block.prompt?.trim() ?? "";
        const refAssets = getDetectedAssets(prompt, assets);
        const blockAssetImageUrls = refAssets.map(getAssetReferenceImageUrl).filter((u): u is string => !!u);
        const blockAssetNames = refAssets.map(getAssetReferencePromptLabel);

        // Continuité : utiliser l'image précédente seulement si lien visuel détecté
        const visuallyLinked = lastGeneratedImageUrl && lastGeneratedPrompt
          ? hasVisualLink(prompt, lastGeneratedPrompt)
          : false;

        const result = await generatePanelBlockImage({
          panelId: panel.id,
          blockId: block.id,
          width: block.width,
          height: block.height,
          prompt,
          project,
          blockAssetImageUrls: blockAssetImageUrls.length ? blockAssetImageUrls : undefined,
          blockAssetNames: blockAssetNames.length ? blockAssetNames : undefined,
          previousImageUrl: visuallyLinked ? (lastGeneratedImageUrl ?? undefined) : undefined,
        });

        currentLayout = {
          ...currentLayout,
          blocks: currentLayout.blocks.map((b) =>
            b.id === block.id ? { ...b, image_url: result.image_url } : b
          ),
        };
        await updatePanelMutation.mutateAsync({
          id: panel.id,
          updates: { layout: currentLayout as unknown as Json },
        });
        queryClient.setQueryData(["panels", chapterId], (old: Panel[] | undefined) =>
          old?.map((p) => (p.id === panel.id ? { ...p, layout: currentLayout as unknown as Json } : p))
        );
        notifyBlockDone(project.id, chapterId ?? "");
        lastGeneratedImageUrl = result.image_url;
        lastGeneratedPrompt = prompt;
        generated++;
        setGeneratingAllProgress({ current: generated, total: blocksToGen.length });
      } catch {
        // skip block, continue avec le suivant (lastGeneratedImageUrl inchangé — pas de contexte corrompu)
      } finally {
        endBlockGeneration(panel.id);
      }
    }

    setGeneratingAllProgress(null);
    if (generated > 0) {
      toast({ title: `${generated} case${generated > 1 ? "s" : ""} générée${generated > 1 ? "s" : ""} !` });
    }
    queryClient.invalidateQueries({ queryKey: ["panels", chapterId] });
  }, [project, panels, assets, usageInfo, chapterId, queryClient, updatePanelMutation, toast]);

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

    const handleAddBlock = (atX?: number, atY?: number, width = DEFAULT_BLOCK_WIDTH, height = DEFAULT_BLOCK_HEIGHT, shape?: PanelBlockShape) => {
      const w = Math.max(100, Math.min(PANEL_WIDTH, width));
      const h = Math.max(100, Math.min(panelHeight, height));
      const placed =
        atX !== undefined && atY !== undefined
          ? { x: atX, y: atY }
          : canvasPlacementFromViewportCenter(
              canvasRefByPanel.current[panel.id] ?? null,
              panelEditorCanvasScrollRef.current,
              PANEL_WIDTH,
              panelHeight,
              w,
              h,
            );
      const x = Math.max(0, Math.min(PANEL_WIDTH - w, placed.x));
      const y = Math.max(0, Math.min(panelHeight - h, placed.y));
      const maxZ = Math.max(0, ...layout.blocks.map(b => b.zIndex ?? 0));
      const newBlock: PanelBlock = {
        id: crypto.randomUUID(),
        x, y, width: w, height: h,
        name: `Case ${layout.blocks.length + 1}`,
        prompt: null, image_url: null,
        ...(shape && shape !== "rect" ? { shape } : {}),
        zIndex: maxZ + 10,
      };
      const newLayout: PanelLayout = { ...layout, blocks: [...layout.blocks, newBlock] };
      recordCanvasUndoBeforeChange(panel.id);
      const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
      queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panel.id ? { ...p, layout: newLayout as unknown as Json } : p))));
      updatePanelMutation.mutate(
        { id: panel.id, updates: { layout: newLayout as unknown as Json } },
        {
          onSuccess: () => toast({ title: "Case ajoutée" }),
          onError: (err) => { if (previousPanels) queryClient.setQueryData(panelsQueryKey, previousPanels); toast({ title: "Erreur", description: err.message, variant: "destructive" }); },
        }
      );
    };

    const getCanvasDropPosition = (e: React.DragEvent, canvasEl?: HTMLDivElement | null, maxW = DEFAULT_BLOCK_WIDTH, maxH = DEFAULT_BLOCK_HEIGHT) => {
      const el = canvasEl ?? canvasRefByPanel.current[panel.id] ?? (e.currentTarget as HTMLDivElement);
      if (!el) return { x: 0, y: 0 };
      const { x: canvasX, y: canvasY } = viewportClientToCanvas(el, e.clientX, e.clientY);
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
          const { x: canvasMouseX, y: canvasMouseY } = viewportClientToCanvas(canvasEl, e.clientX, e.clientY);
          const newX = Math.max(0, Math.min(PANEL_WIDTH - block.width, draggingBlock.startBlockX + (canvasMouseX - draggingBlock.startMouseX)));
          const newY = Math.max(0, Math.min(panelHeight - block.height, draggingBlock.startBlockY + (canvasMouseY - draggingBlock.startMouseY)));
          setDragPreview({ panelId: panel.id, blockId: block.id, x: newX, y: newY });
        }
      }
    };

    const handleCanvasDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      dragOverCounterRef.current[panel.id] = (dragOverCounterRef.current[panel.id] ?? 0) + 1;
      if (!draggingBlock) setIsDragOverCanvasId(panel.id);
    };

    const handleCanvasDragLeave = (_e: React.DragEvent) => {
      dragOverCounterRef.current[panel.id] = Math.max(0, (dragOverCounterRef.current[panel.id] ?? 1) - 1);
      if (dragOverCounterRef.current[panel.id] === 0) setIsDragOverCanvasId(null);
    };

    const handleCanvasDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragOverCounterRef.current[panel.id] = 0;
      setIsDragOverCanvasId(null);
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
          const maxZ = Math.max(0, ...layout.blocks.map(b => b.zIndex ?? 0));
          const newBlock: PanelBlock = {
            id: crypto.randomUUID(),
            x, y, width: w, height: h,
            name: assetName,
            prompt: `[${assetName}] — `,
            image_url: null,
            asset_refs: [data.assetId],
            zIndex: maxZ + 10,
          };
          const newLayout: PanelLayout = { ...layout, blocks: [...layout.blocks, newBlock] };
          recordCanvasUndoBeforeChange(panel.id);
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
        if (data.type === "case-block" && typeof data.description === "string" && data.description.trim()) {
          const w = DEFAULT_BLOCK_WIDTH;
          const h = DEFAULT_BLOCK_HEIGHT;
          const { x, y } = getCanvasDropPosition(e, canvasEl, w, h);
          const rawCaseNum = (data as { caseNumber?: unknown }).caseNumber;
          const caseNum =
            typeof rawCaseNum === "number" && Number.isFinite(rawCaseNum) ? rawCaseNum : layout.blocks.length + 1;
          const maxZ = Math.max(0, ...layout.blocks.map(b => b.zIndex ?? 0));
          const newBlock: PanelBlock = {
            id: crypto.randomUUID(),
            x, y, width: w, height: h,
            name: `Case ${caseNum}`,
            prompt: data.description.trim(),
            image_url: null,
            zIndex: maxZ + 10,
          };
          const newLayout: PanelLayout = { ...layout, blocks: [...layout.blocks, newBlock] };
          recordCanvasUndoBeforeChange(panel.id);
          const previousPanelsCaseBlock = queryClient.getQueryData<Panel[]>(panelsQueryKey);
          queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panel.id ? { ...p, layout: newLayout as unknown as Json } : p))));
          updatePanelMutation.mutate(
            { id: panel.id, updates: { layout: newLayout as unknown as Json } },
            {
              onSuccess: () => {
                setSelectedBlockIdInModal({ panelId: panel.id, blockId: newBlock.id });
                toast({ title: "Case créée", description: "Prompt pré-rempli depuis le scénario." });
              },
              onError: (err) => { if (previousPanelsCaseBlock) queryClient.setQueryData(panelsQueryKey, previousPanelsCaseBlock); toast({ title: "Erreur", description: err.message, variant: "destructive" }); },
            }
          );
          setDraggingBlock(null);
          setDragPreview(null);
          return;
        }
        if (data.type === "new-block") {
          const w = typeof data.width === "number" ? data.width : DEFAULT_BLOCK_WIDTH;
          const h = typeof data.height === "number" ? data.height : DEFAULT_BLOCK_HEIGHT;
          const rawShape = (data as { shape?: string }).shape;
          const blockShape = typeof rawShape === "string" ? rawShape as PanelBlockShape : undefined;
          const { x, y } = getCanvasDropPosition(e, canvasEl, w, h);
          handleAddBlock(x, y, w, h, blockShape);
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
            const { x: canvasMouseX, y: canvasMouseY } = viewportClientToCanvas(canvasEl, e.clientX, e.clientY);
            const clampedX = Math.max(0, Math.min(PANEL_WIDTH - block.width, Math.round(draggingBlock.startBlockX + (canvasMouseX - draggingBlock.startMouseX))));
            const clampedY = Math.max(0, Math.min(panelHeight - block.height, Math.round(draggingBlock.startBlockY + (canvasMouseY - draggingBlock.startMouseY))));
            const blockIndex = layout.blocks.findIndex((b) => b.id === data.blockId);
            const nextBlocks = layout.blocks.map((b, i) => (i === blockIndex ? { ...b, x: clampedX, y: clampedY } : b));
            moveDropHandledRef.current = true;
            const movePayload = { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } };
            const panelRowUndo = (queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? []).find((p) => p.id === panel.id);
            if (panelRowUndo) recordCanvasUndoBeforeChange(panel.id);
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

    const handleSaveBlockName = (block: PanelBlock, name: string) => {
      const nextBlocks = layout.blocks.map((b) => (b.id === block.id ? { ...b, name: name.trim() || null } : b));
      recordCanvasUndoBeforeChange(panel.id);
      updatePanelMutation.mutate(
        { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } },
        { onSuccess: () => toast({ title: "Nom enregistré" }), onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }) }
      );
    };

    const handleBlockShapeOffsetChange = (block: PanelBlock, offset: number) => {
      const nextBlocks = layout.blocks.map((b) => (b.id === block.id ? { ...b, shapeOffset: offset } : b));
      // Mise à jour optimiste immédiate (pas de toast — c'est temps-réel via slider)
      const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
      queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panel.id ? { ...p, layout: { ...layout, blocks: nextBlocks } as unknown as Json } : p))));
      updatePanelMutation.mutate(
        { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } },
        { onError: (err) => { if (previousPanels) queryClient.setQueryData(panelsQueryKey, previousPanels); toast({ title: "Erreur", description: err.message, variant: "destructive" }); } }
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
      const panelUndoRow = (queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? []).find((p) => p.id === panel.id);
      if (panelUndoRow) recordCanvasUndoBeforeChange(panel.id);
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

    const handleDeleteBlock = (block: PanelBlock) =>
      setCanvasDeleteIntent({ panelId: panel.id, kind: "image", blockId: block.id });

    const handleAddColorBlock = (atX: number | undefined, atY: number | undefined, width: number, height: number, fill?: ColorBlockFill) => {
      const w = Math.max(50, Math.min(PANEL_WIDTH, width));
      const h = Math.max(50, Math.min(panelHeight, height));
      const placed =
        atX !== undefined && atY !== undefined
          ? { x: atX, y: atY }
          : canvasPlacementFromViewportCenter(
              canvasRefByPanel.current[panel.id] ?? null,
              panelEditorCanvasScrollRef.current,
              PANEL_WIDTH,
              panelHeight,
              w,
              h,
            );
      const x = Math.max(0, Math.min(PANEL_WIDTH - w, placed.x));
      const y = Math.max(0, Math.min(panelHeight - h, placed.y));
      const maxZ = Math.max(0, ...colorBlocks.map(cb => cb.zIndex ?? 0));
      const newBlock: ColorBlock = {
        id: crypto.randomUUID(),
        x, y, width: w, height: h,
        fill: fill ?? DEFAULT_COLOR_BLOCK_FILL,
        zIndex: maxZ + 10,
      };
      const next = [...colorBlocks, newBlock];
      recordCanvasUndoBeforeChange(panel.id);
      const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
      queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panel.id ? { ...p, color_blocks: next as unknown as Json } : p))));
      updatePanelMutation.mutate(
        { id: panel.id, updates: { color_blocks: next as unknown as Json } },
        {
          onSuccess: () => toast({ title: "Bloc de couleur ajouté" }),
          onError: (err) => { if (previousPanels) queryClient.setQueryData(panelsQueryKey, previousPanels); toast({ title: "Erreur", description: err.message, variant: "destructive" }); },
        }
      );
    };

    const handleAddSpeechBubble = (bubbleType: SpeechBubble["type"], x?: number, y?: number) => {
      const w = (bubbleType === "thought" || bubbleType === "shout") ? 380 : DEFAULT_SPEECH_BUBBLE_WIDTH;
      const h = (bubbleType === "thought" || bubbleType === "shout") ? 200 : DEFAULT_SPEECH_BUBBLE_HEIGHT;
      const placed =
        x !== undefined && y !== undefined
          ? { x, y }
          : canvasPlacementFromViewportCenter(
              canvasRefByPanel.current[panel.id] ?? null,
              panelEditorCanvasScrollRef.current,
              PANEL_WIDTH,
              panelHeight,
              w,
              h,
            );
      const clampedX = Math.max(0, Math.min(PANEL_WIDTH - w, placed.x));
      const clampedY = Math.max(0, Math.min(panelHeight - h, placed.y));
      const defaultStyle = SPEECH_BUBBLE_DEFAULT_STYLE[bubbleType];
      const maxZ = Math.max(0, ...speechBubbles.map(b => b.zIndex ?? 0));
      const newBubble: SpeechBubble = {
        id: crypto.randomUUID(),
        type: bubbleType,
        text: "",
        position: { x: clampedX, y: clampedY },
        width: w,
        height: h,
        tailOn: false,
        zIndex: maxZ + 10,
        style: {
          font: "inherit",
          size: 30,
          color: "#000000",
          fill: defaultStyle.fill,
          stroke: defaultStyle.stroke,
        },
      };
      const next = [...speechBubbles, newBubble];
      recordCanvasUndoBeforeChange(panel.id);
      const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
      queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panel.id ? { ...p, speech_bubbles: next as unknown as Json } : p))));
      updatePanelMutation.mutate(
        { id: panel.id, updates: { speech_bubbles: next as unknown as Json } },
        {
          onSuccess: () => toast({ title: "Bulle ajoutée" }),
          onError: (err) => { if (previousPanels) queryClient.setQueryData(panelsQueryKey, previousPanels); toast({ title: "Erreur", description: err.message, variant: "destructive" }); },
        }
      );
    };

    const handleUpdateSpeechBubbles = (next: SpeechBubble[]) => {
      queryClient.cancelQueries({ queryKey: panelsQueryKey });
      queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panel.id ? { ...p, speech_bubbles: next as unknown as Json } : p))));
      updatePanelMutation.mutate(
        { id: panel.id, updates: { speech_bubbles: next as unknown as Json } },
        { onError: (err) => { toast({ title: "Erreur", description: err.message, variant: "destructive" }); queryClient.invalidateQueries({ queryKey: panelsQueryKey }); } }
      );
    };

    const handleDeleteSpeechBubble = (bubble: SpeechBubble) =>
      setCanvasDeleteIntent({ panelId: panel.id, kind: "bubble", bubbleId: bubble.id });

    const handleUpdateColorBlocks = (next: ColorBlock[]) => {
      queryClient.cancelQueries({ queryKey: panelsQueryKey });
      const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
      queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) =>
        !old ? old : old.map((p) => (p.id === panel.id ? { ...p, color_blocks: next as unknown as Json } : p)),
      );
      updatePanelMutation.mutate(
        { id: panel.id, updates: { color_blocks: next as unknown as Json } },
        {
          onError: (err) => {
            if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels);
            toast({ title: "Erreur", description: err.message, variant: "destructive" });
          },
        },
      );
    };

    const handleDeleteColorBlock = (cb: ColorBlock) =>
      setCanvasDeleteIntent({ panelId: panel.id, kind: "color", colorBlockId: cb.id });

    const handleColorBlockFillChange = (
      cb: ColorBlock,
      fill: ColorBlock["fill"],
      meta?: CanvasColorFillPickMeta,
    ) => {
      const next = colorBlocks.map((c) => (c.id === cb.id ? { ...c, fill } : c));

      if (!meta?.live) {
        panelLiveColorPickUndoRef.current.delete(panel.id);
        recordCanvasUndoBeforeChange(panel.id);
        handleUpdateColorBlocks(next);
        return;
      }

      if (meta.phase === "begin") {
        const marks = panelLiveColorPickUndoRef.current;
        if (!marks.has(panel.id)) {
          recordCanvasUndoBeforeChange(panel.id);
          marks.add(panel.id);
        }
      }
      handleUpdateColorBlocks(next);
    };

    const handleSaveBlockPrompt = (block: PanelBlock, newPrompt: string, options?: { silent?: boolean }) => {
      const nextBlocks = layout.blocks.map((b) => (b.id === block.id ? { ...b, prompt: newPrompt.trim() || null } : b));
      recordCanvasUndoBeforeChange(panel.id);
      updatePanelMutation.mutate(
        { id: panel.id, updates: { layout: { ...layout, blocks: nextBlocks } as unknown as Json } },
        {
          onSuccess: () => {
            if (!options?.silent) {
              setBlockPromptDrafts((prev) => { const next = { ...prev }; delete next[`${panel.id}-${block.id}`]; return next; });
              toast({ title: "Prompt du bloc enregistré" });
            }
          },
          onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
        }
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
      }
    };

    const handleGenerateBlock = (block: PanelBlock) => {
      if (usageInfo.count >= usageInfo.limit) {
        setShowQuotaModal(true);
        return;
      }
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
      const refAssets = getDetectedAssets(promptToUse, assets);
      const blockAssetImageUrls = refAssets
        .map(getAssetReferenceImageUrl)
        .filter((u): u is string => !!u);
      const blockAssetNames = refAssets.map(getAssetReferencePromptLabel);

      // Bloc généré le plus proche au-dessus (par Y) avec lien visuel détecté
      const closestAbove = layout.blocks
        .filter((b) => b.id !== block.id && !!b.image_url && b.y < block.y)
        .sort((a, b) => b.y - a.y)[0];
      const previousImageUrl =
        closestAbove?.image_url && hasVisualLink(promptToUse, closestAbove.prompt ?? "")
          ? closestAbove.image_url
          : undefined;

      generatePanelImage.mutate(
        {
          panel: { id: panel.id, prompt: promptToUse },
          block: { id: block.id, width: block.width, height: block.height },
          project,
          blockAssetImageUrls: blockAssetImageUrls.length ? blockAssetImageUrls : undefined,
          blockAssetNames: blockAssetNames.length ? blockAssetNames : undefined,
          previousImageUrl,
          currentLayout: layout,
        },
        {
          onSuccess: (result) => {
            toast({ title: "Image générée" });
            // Snapshot undo AVANT que la query cache soit invalidée (montre l'état pré-image)
            recordCanvasUndoBeforeChange(panel.id);
            // Historique — non-critique, fire & forget
            const blockRow = layout.blocks.find((b) => b.id === block.id);
            if (chapterId && result.image_url && blockRow) {
              void (async () => {
                try {
                  await insertChapterCanvasImageHistoryForSession({
                    chapterId,
                    panelCanvasId: panel.id,
                    eventKind: "image_generated",
                    sourceBlockId: block.id,
                    prompt: promptToUse,
                    imageUrl: result.image_url,
                    blockName: blockRow.name ?? null,
                    layoutRect: { x: blockRow.x, y: blockRow.y, width: blockRow.width, height: blockRow.height },
                  });
                  await queryClient.invalidateQueries({ queryKey: chapterCanvasImageHistoryQueryKey(chapterId) });
                } catch { /* non-critique */ }
              })();
            }
          },
          onError: () => toast({ title: "Génération IA indisponible", description: "Service temporairement indisponible. Réessayez dans quelques instants.", variant: "destructive" }),
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

    return (
      <div className="relative flex flex-1 min-h-0 overflow-y-hidden bg-gradient-to-b from-background via-background to-muted/20">
        <EditorLeftSidebar
          panel={panel}
          activeSidebarTab={activeSidebarTab}
          onTabChange={setActiveSidebarTab}
          onScrollToY={handleScrollToCanvasY}
          isUpdating={updatePanelMutation.isPending}
          newBlockDragGhostRef={newBlockDragGhostRef}
          onSliceOpen={() => setSliceModalOpen(true)}
          imageHistoryEntries={chapterImageHistory}
          imageHistoryLoading={chapterImageHistoryPending}
          restoringHistoryId={restoringHistoryId}
          imageHistoryRestoredIds={canvasHistoryRestoredIds}
          onRestoreImageHistory={restoreChapterCanvasImageHistoryRow}
          onAddBlock={handleAddBlock}
          onAddColorBlock={handleAddColorBlock}
          onAddSpeechBubble={handleAddSpeechBubble}
          selectedBlockId={selectedBlockIdInModal}
          selectedColorBlockId={selectedColorBlockIdInModal}
          selectedSpeechBubbleId={selectedSpeechBubbleIdInModal}
          onSelectBlock={setSelectedBlockIdInModal}
          onSelectColorBlock={setSelectedColorBlockIdInModal}
          onSelectSpeechBubble={setSelectedSpeechBubbleIdInModal}
        />
        {/* Centre : panel 800px de large exactement, zoomable via contrôles header ou Ctrl+Scroll */}
        <div
          ref={panelEditorCanvasScrollRef}
          className="flex-1 min-w-0 flex flex-col items-center overflow-auto p-6 bg-background"
          onClick={() => {
            if (skipNextCanvasEmptyClickRef.current) {
              skipNextCanvasEmptyClickRef.current = false;
              return;
            }
            setSelectedBlockIdInModal(null);
            setSelectedColorBlockIdInModal(null);
            setSelectedSpeechBubbleIdInModal(null);
            setTailContextBubbleId(null);
          }}
        >
          {/* Toolbar bulle — sticky en haut du scroll canvas, ne décale rien */}
          {selectedSpeechBubble && (
            <div className="sticky top-1 z-50 self-center pointer-events-none" style={{ height: 0, overflow: "visible" }}>
              <div className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <BubbleToolbar
                  bubble={selectedSpeechBubble}
                  speechBubbles={speechBubbles}
                  onUpdate={handleUpdateSpeechBubbles}
                  onDuplicate={() => {
                    const nb: SpeechBubble = { ...selectedSpeechBubble, id: crypto.randomUUID(), position: { x: selectedSpeechBubble.position.x + 20, y: selectedSpeechBubble.position.y + 20 } };
                    handleUpdateSpeechBubbles([...speechBubbles, nb]);
                    setSelectedSpeechBubbleIdInModal({ panelId: panel.id, bubbleId: nb.id });
                  }}
                  onDelete={() => handleDeleteSpeechBubble(selectedSpeechBubble)}
                  tailContext={tailContextBubbleId === selectedSpeechBubble.id}
                  onTailContextChange={(v) => setTailContextBubbleId(v ? selectedSpeechBubble.id : null)}
                />
              </div>
            </div>
          )}
          {/* Toolbar bloc image / couleur — sticky, même pattern que BubbleToolbar */}
          {(selectedBlock || selectedColorBlock) && (
            <div className="sticky top-1 z-50 self-center pointer-events-none" style={{ height: 0, overflow: "visible" }}>
              <div className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                {selectedBlock && (() => {
                  const blockKey = `${panel.id}-${selectedBlock.id}`;
                  const nameDraft = blockNameDrafts[blockKey] ?? selectedBlock.name ?? "";
                  const promptDraft = blockPromptDrafts[blockKey] ?? selectedBlock.prompt ?? "";
                  const isBlockGenerating = generatingBlocks.has(panel.id);
                  return (
                    <BlockToolbar
                      type="image"
                      block={selectedBlock}
                      blockKey={blockKey}
                      nameDraft={nameDraft}
                      promptDraft={promptDraft}
                      isGenerating={isBlockGenerating}
                      canSuggest={!!scenarioChapter?.content?.trim()}
                      canGenerate={!!(promptDraft.trim() && project?.style_template)}
                      assets={assets}
                      onNameChange={(value) => setBlockNameDrafts((prev) => ({ ...prev, [blockKey]: value }))}
                      onNameSave={() => { if (nameDraft.trim() !== (selectedBlock.name ?? "")) handleSaveBlockName(selectedBlock, nameDraft); }}
                      onPromptChange={(value) => setBlockPromptDrafts((prev) => ({ ...prev, [blockKey]: value }))}
                      onSuggestPrompt={() => handleSuggestBlockPrompt(selectedBlock)}
                      onGenerate={() => handleGenerateBlock(selectedBlock)}
                      onDelete={() => handleDeleteBlock(selectedBlock)}
                      onShapeOffsetChange={(offset) => handleBlockShapeOffsetChange(selectedBlock, offset)}
                    />
                  );
                })()}
                {selectedColorBlock && (
                  <BlockToolbar
                    type="color"
                    colorBlock={selectedColorBlock}
                    onColorChange={(fill, meta) => handleColorBlockFillChange(selectedColorBlock, fill, meta)}
                    onLiveColorPickEnd={() => handleColorPickLiveGestureEndForPanel(panel.id)}
                    onDelete={() => handleDeleteColorBlock(selectedColorBlock)}
                  />
                )}
              </div>
            </div>
          )}
          {/* Wrapper relatif pour positionner la poignée de redimensionnement */}
          <div className="relative mt-[160px]" style={{ flexShrink: 0 }}>
            {(() => {
              const liveH = panelHeightDragDraft ?? panelHeight;
              const scaledPanelW = Math.ceil(PANEL_WIDTH * zoomLevel);
              const scaledPanelH = Math.ceil(liveH * zoomLevel);
              /** Cadre avec border : zone totale = contenu + 2px (boîte content-box). */
              const panelFrameOuterW = scaledPanelW + 2;
              return (
                <>
                  {/* Border hors du transform pour rester 1px à tous les niveaux de zoom.
                      Pas de rounded-* ici : avec overflow-hidden, un rayon arrondi clippe les traits
                      de sélection / outlines aux coins du canvas (même comportement qu’un masque).
                      Largeurs/hauteurs en ceil : évite de rogner le bord droit après scale() (sous-pixels).
                      box-content : la bordure s’ajoute à la largeur/hauteur — avec border-box par défaut,
                      le cadre mange 2px sur la zone utile et overflow-hidden coupait le bord droit du
                      canvas (sélection pleine largeur). */}
                  <div
                    ref={(el) => {
                      panelEditorZoomFrameRef.current = el;
                    }}
                    className="rounded-none box-content border border-border shadow-md overflow-hidden bg-muted"
                    style={{ width: scaledPanelW, height: scaledPanelH }}
                  >
                    <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left", width: PANEL_WIDTH }}>
                    <div className="relative shrink-0 bg-muted" style={{ width: PANEL_WIDTH, height: liveH }}>
                      <div
                        ref={(el) => { if (el) canvasRefByPanel.current[panel.id] = el; }}
                        className="absolute left-0 top-0 overflow-visible rounded-none"
                        style={{
                          width: PANEL_WIDTH,
                          height: liveH,
                          backgroundImage: "radial-gradient(circle, hsl(var(--border) / 0.7) 1.5px, transparent 1.5px)",
                          backgroundSize: "24px 24px",
                          backgroundColor: "hsl(var(--background))",
                        }}
                        onDragOver={handleCanvasDragOver}
                        onDragEnter={handleCanvasDragEnter}
                        onDragLeave={handleCanvasDragLeave}
                        onDrop={handleCanvasDrop}
                      >
                      {isDragOverCanvasId === panel.id && !draggingBlock && (
                        <div className="absolute inset-0 z-[300] pointer-events-none">
                          <div className="absolute inset-3 rounded-xl border-2 border-dashed border-primary/60 bg-primary/[0.04] flex items-center justify-center transition-opacity">
                            <div className="bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-primary/30 text-xs font-semibold text-primary flex items-center gap-1.5">
                              <Plus className="h-3 w-3" />
                              Déposer ici
                            </div>
                          </div>
                        </div>
                      )}
                      <ColorBlockLayer
                        panel={panel}
                        panels={panels}
                        colorBlocks={colorBlocks}
                        canvasRefByPanel={canvasRefByPanel}
                        zoomRef={zoomRef}
                        selectedColorBlockId={selectedColorBlockIdInModal?.panelId === panel.id ? selectedColorBlockIdInModal.colorBlockId : null}
                        onSelectColorBlock={(id) => {
                          if (id) {
                            setSelectedBlockIdInModal(null);
                            setSelectedSpeechBubbleIdInModal(null);
                            setSelectedColorBlockIdInModal({ panelId: panel.id, colorBlockId: id });
                          } else {
                            setSelectedColorBlockIdInModal(null);
                          }
                        }}
                        onMoveCommit={handleColorBlockMoveCommit}
                        onResizeCommit={handleColorBlockResizeCommit}
                        onDelete={handleDeleteColorBlock}
                        onColorChange={handleColorBlockFillChange}
                      />
                      <ImageBlockLayer
                        panel={panel}
                        panels={panels}
                        blocks={blocks}
                        canvasRefByPanel={canvasRefByPanel}
                        zoomRef={zoomRef}
                        selectedBlockId={selectedBlockIdInModal?.panelId === panel.id ? selectedBlockIdInModal.blockId : null}
                        onSelectBlock={(id) => {
                          if (id) {
                            setSelectedSpeechBubbleIdInModal(null);
                            setSelectedColorBlockIdInModal(null);
                            setSelectedBlockIdInModal({ panelId: panel.id, blockId: id });
                          } else {
                            setSelectedBlockIdInModal(null);
                          }
                        }}
                        onMoveCommit={handleImageBlockMoveCommit}
                        onResizeCommit={handleImageBlockResizeCommit}
                        onDelete={handleDeleteBlock}
                        onAddBlock={handleAddBlock}
                        isUpdating={updatePanelMutation.isPending}
                        generatingBlockId={generatingBlocks.get(panel.id) ?? null}
                      />
                      <BubbleLayer
                        panel={panel}
                        panels={panels}
                        speechBubbles={speechBubbles}
                        canvasRefByPanel={canvasRefByPanel}
                        zoomRef={zoomRef}
                        selectedBubbleId={selectedSpeechBubbleIdInModal?.panelId === panel.id ? selectedSpeechBubbleIdInModal.bubbleId : null}
                        onSelectBubble={(id) => {
                          if (id) {
                            setSelectedBlockIdInModal(null);
                            setSelectedColorBlockIdInModal(null);
                            setSelectedSpeechBubbleIdInModal({ panelId: panel.id, bubbleId: id });
                          } else {
                            setSelectedSpeechBubbleIdInModal(null);
                          }
                        }}
                        onMoveCommit={handleBubbleMoveCommit}
                        onResizeCommit={handleBubbleResizeCommit}
                        onDelete={handleDeleteSpeechBubble}
                        onTextCommit={(bubbleId, text) => {
                          const next = speechBubbles.map((b) => b.id === bubbleId ? { ...b, text } : b);
                          handleUpdateSpeechBubbles(next);
                        }}
                        tailContextBubbleId={tailContextBubbleId}
                        onTailContext={(id) => {
                          setTailContextBubbleId(id);
                        }}
                        onBubbleUpdate={handleUpdateSpeechBubbles}
                      />
                      </div>
                    </div>
                    </div>
                  </div>
                  {/* Poignée de redimensionnement — verte, toujours visible */}
                  <div
                    className="relative flex items-center justify-center select-none cursor-ns-resize mb-[600px]"
                    style={{ width: panelFrameOuterW, height: 24 }}
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
        <EditorRightPanel
          activeTool={panelEditorRightTool}
          onToolChange={setPanelEditorRightTool}
          loadingScenario={loadingScenario}
          scenarioContent={scenarioChapter?.content}
          assets={assets}
          validatedCases={validatedCases}
          existingBlockPrompts={layout.blocks.map((b) => b.prompt ?? "")}
          isUpdating={updatePanelMutation.isPending}
          isPro={isPro}
          newBlockDragGhostRef={newBlockDragGhostRef}
          onNavigateToPlans={() => navigate("/dashboard/plans")}
          hasOutlineToCompose={
            Array.isArray(linkedScenarioChapter?.panels_outline) &&
            (linkedScenarioChapter.panels_outline as unknown[]).length > 0
          }
          isComposing={composeLayout.isPending}
          hasExistingComposition={layout.blocks.length > 0}
          showRecomposeActions={savedCompositionBeforeRecompose !== null && !composeLayout.isPending}
          onAcceptRecompose={handleAcceptRecompose}
          onRefuseRecompose={handleRefuseRecompose}
          isRefusingRecompose={isRefusingRecompose}
          onCompose={() => {
            if (!linkedScenarioChapter?.panels_outline) return;
            const isRecompose = layout.blocks.length > 0;
            // Sauvegarder la composition actuelle avant d'écraser
            if (isRecompose) {
              setSavedCompositionBeforeRecompose({
                layout: getPanelLayout(panel),
                speechBubbles: getPanelSpeechBubbles(panel),
              });
            }
            const outline = linkedScenarioChapter.panels_outline as Array<{
              panel_number: number;
              block_number?: number;
              description: string;
              text_excerpt?: string;
              locked?: boolean;
            }>;
            // Blocs existants avec images — pour les préserver lors d'une recomposition
            const existingBlocksForRecompose = isRecompose
              ? getPanelLayout(panel).blocks
                  .filter((b) => b.prompt?.trim())
                  .map((b) => ({ prompt: b.prompt, image_url: b.image_url ?? null, name: b.name ?? null }))
              : undefined;

            composeLayout.mutate(
              {
                chapterId: chapterId!,
                panelsOutline: outline,
                projectStyle: project?.style_template ?? undefined,
                characters: assets
                  .filter((a) => a.asset_type === "character")
                  .map((a) => a.name),
                chapterTitle: chapter?.title ?? undefined,
                chapterSynopsis: linkedScenarioChapter?.synopsis ?? undefined,
                chapterScenarioContent: linkedScenarioChapter?.content ?? undefined,
                existingBlocks: existingBlocksForRecompose,
              },
              {
                onSuccess: (result) => {
                  if (!isRecompose) {
                    toast({
                      title: `✨ ${result.blocksCount} blocs composés`,
                      description: "La mise en page est prête. Génère maintenant les images !",
                    });
                  }
                },
                onError: (err) => {
                  if (isRecompose) setSavedCompositionBeforeRecompose(null);
                  toast({
                    title: "Erreur de composition",
                    description: err.message,
                    variant: "destructive",
                  });
                },
              }
            );
          }}
          blocksToGenerateCount={layout.blocks.filter((b) => b.prompt?.trim() && !b.image_url).length}
          onGenerateAll={handleGenerateAllBlocks}
          isGeneratingAll={generatingAllProgress !== null}
          generateAllProgress={generatingAllProgress}
        />
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
          {detectedCasesCount !== null && (
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
                            <ScenarioFormattedPreview
                              text={scenarioChapter.content}
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

          {/* Cases section */}
          {linkedScenarioChapter && detectedCasesCount !== null && detectedCasesCount > 0 && (
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
            const exportBubbles = getPanelSpeechBubbles(panel);
            const exportPanelPxHeight =
              exportBubbles.length === 0
                ? getPanelHeight(panel)
                : Math.max(getPanelHeight(panel), ...exportBubbles.map(getSpeechBubbleBottomInPanelPx));
            return (
              <div key={panel.id} style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none", zIndex: -1 }}>
                <div
                  ref={(el) => { exportCanvasRefByPanel.current[panel.id] = el; }}
                  style={{
                    width: PANEL_WIDTH,
                    height: exportPanelPxHeight,
                    backgroundColor: "#ffffff",
                    position: "relative",
                    overflow: "visible",
                  }}
                >
                  {previewColorBlocks.map((cb) => {
                    const bgStyle = cb.fill.type === "solid"
                      ? { backgroundColor: cb.fill.color }
                      : { background: `linear-gradient(${cb.fill.angle ?? 90}deg, ${cb.fill.from}, ${cb.fill.to})` };
                    return (
                      <div key={cb.id} data-export-layer="bg" style={{ position: "absolute", left: cb.x, top: cb.y, width: cb.width, height: cb.height, zIndex: 0, ...bgStyle }} />
                    );
                  })}
                  {blocks.map((block) => (
                    <div key={block.id} data-export-layer="bg" style={{ position: "absolute", left: block.x, top: block.y, width: block.width, height: block.height, zIndex: 10, overflow: "hidden" }}>
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
                  <PanelExportSpeechBubbles speechBubbles={getPanelSpeechBubbles(panel)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation suppression case / bloc couleur / bulle sur le canvas */}
      <AlertDialog
        open={canvasDeleteIntent !== null}
        onOpenChange={(open) => {
          if (!open) setCanvasDeleteIntent(null);
        }}
      >
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {canvasDeleteIntent?.kind === "image"
                ? "Supprimer cette case ?"
                : canvasDeleteIntent?.kind === "color"
                  ? "Supprimer ce bloc de couleur ?"
                  : "Supprimer cette bulle ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {"L'élément sera retiré du canvas. Vous pouvez annuler avec Ctrl+Z ou rétablir avec Ctrl+Maj+Z."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (canvasDeleteIntent) confirmCanvasElementDelete(canvasDeleteIntent);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                      plan === "studio"
                        ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30"
                        : isPro
                        ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                    title="Plan actuel"
                  >
                    {planDisplayName(plan)}
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
                  onClick={() => expandedPanelId && undoPanelCanvas(expandedPanelId)}
                  title="Annuler (Ctrl+Z)"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => expandedPanelId && redoPanelCanvas(expandedPanelId)}
                  title="Rétablir (Ctrl+Maj+Z)"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
                <div className="w-px h-4 bg-border/60" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => applyChapterEditorZoom(zoomRef.current - 0.1, "buttons")}
                  title="Dézoomer (Ctrl+Scroll)"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-mono w-10 text-center tabular-nums select-none">{Math.round(zoomLevel * 100)}%</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => applyChapterEditorZoom(zoomRef.current + 0.1, "buttons")}
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

      {/* Ghost pour le drag — hors écran, mis à jour dynamiquement avant setDragImage */}
      <div
        ref={newBlockDragGhostRef}
        className="pointer-events-none fixed left-[-9999px] top-0 z-[9999] flex shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 text-[11px] font-semibold text-foreground"
        style={{ width: 80, height: 60 }}
        aria-hidden
      />

      {/* Modal découpage & export ZIP */}
      <Dialog open={sliceModalOpen} onOpenChange={setSliceModalOpen}>
        <DialogContent className="glass max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Découper le chapitre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hauteur totale</span>
                <span className="font-medium tabular-nums">
                  {panels.length > 0 ? panels.reduce((sum, p) => sum + getPanelHeight(p), 0).toLocaleString() : "–"} px
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Découpe fixe</span>
                <span className="font-medium">1 280 px / panel</span>
              </div>
              <div className="flex justify-between text-foreground font-semibold">
                <span>Panels générés</span>
                <span className="tabular-nums">
                  {panels.length > 0 ? Math.ceil(panels.reduce((sum, p) => sum + getPanelHeight(p), 0) / 1280) : "–"}
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
                if (!project) return;
                const panelEls = panels
                  .map((p) => exportCanvasRefByPanel.current[p.id])
                  .filter((el): el is HTMLDivElement => el != null);
                if (panelEls.length === 0) {
                  toast({ title: "Aucun panel disponible", variant: "destructive" });
                  return;
                }
                setExportingChapter(true);
                try {
                  const { exportChapterAsZip } = await import("@/services/exportPanel");
                  await exportChapterAsZip(
                    panelEls,
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

      <QuotaReachedDialog
        open={showQuotaModal}
        onOpenChange={setShowQuotaModal}
        plan={plan}
        usageInfo={usageInfo}
        nextResetDate={nextResetDate}
      />
    </div>
  );
}
