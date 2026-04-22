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
  BookOpen,
  Save,
  Loader2,
  Sparkles,
  Pencil,
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
import { Separator } from "@/components/ui/separator";
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
import type { Json } from "@/integrations/supabase/types";
import type { Panel, PanelBlock, PanelLayout, ColorBlock, ColorBlockFill, SpeechBubble, SpeechBubbleType, Asset } from "@/types";
import {
  DEFAULT_SPEECH_BUBBLE_WIDTH,
  DEFAULT_SPEECH_BUBBLE_HEIGHT,
  getSpeechBubbleFillStroke,
  SPEECH_BUBBLE_DEFAULT_STYLE,
  SPEECH_BUBBLE_TYPE_LABELS,
} from "@/types";

const PANEL_WIDTH = 800;
const SPEECH_BUBBLE_TAIL_H = 14;

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
const PANEL_EDITOR_STEPS = [
  {
    value: "architecture",
    label: "Architecture",
    hint: "Structure du panel",
    icon: LayoutPanelTop,
  },
  {
    value: "personalisation",
    label: "Personnalisation",
    hint: "Blocs visuels",
    icon: Pencil,
  },
  {
    value: "couleurs",
    label: "Couleurs",
    hint: "Aplats et fonds",
    icon: Palette,
  },
  {
    value: "dialogue",
    label: "Dialogue",
    hint: "Bulles et texte",
    icon: MessageCircle,
  },
] as const;

/** ViewBox normalisé pour bulles avec queue (corps 0–100, queue 100–120). Redimensionnement propre. */
const SPEECH_BUBBLE_VIEWBOX_WITH_TAIL = "0 0 100 120";
/** ViewBox pour narration (rectangle, pas de queue). */
const SPEECH_BUBBLE_VIEWBOX_NARRATION = "0 0 100 100";

/** Rendu SVG de la forme de bulle (coordonnées normalisées 0–100). Styles BD/manga les plus utilisés. */
function SpeechBubbleShape(props: {
  type: SpeechBubble["type"];
  fill: string;
  stroke: string;
}) {
  const { type, fill, stroke } = props;
  const sw = 2; // strokeWidth en unités viewBox, scale avec la forme

  // Parole (dialogue) : ovale + queue triangulaire pointant vers le personnage (standard BD/manga)
  if (type === "speech") {
    return (
      <>
        <ellipse cx={50} cy={50} rx={48} ry={46} fill={fill} stroke={stroke} strokeWidth={sw} />
        <path d="M 28 98 L 18 118 L 38 98 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </>
    );
  }

  // Chuchotement : même forme que parole, contour en pointillés (convention comics/manga)
  if (type === "whisper") {
    return (
      <>
        <ellipse cx={50} cy={50} rx={48} ry={46} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="5 4" />
        <path d="M 28 98 L 18 118 L 38 98 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="5 4" strokeLinejoin="round" />
      </>
    );
  }

  // Pensée : nuage (plusieurs bulles reliées, queue en chaîne de cercles — standard “thought bubble”)
  if (type === "thought") {
    return (
      <>
        <ellipse cx={50} cy={46} rx={42} ry={34} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={22} cy={42} r={11} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={78} cy={42} r={11} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={33} cy={20} r={9} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={67} cy={20} r={9} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={58} cy={84} r={8} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={66} cy={100} r={5.5} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={73} cy={112} r={3.8} fill={fill} stroke={stroke} strokeWidth={sw} />
      </>
    );
  }

  // Narration / légende : rectangle arrondi sans queue (caption style)
  if (type === "narration") {
    return (
      <rect x={3} y={3} width={94} height={94} rx={8} ry={8} fill={fill} stroke={stroke} strokeWidth={sw} />
    );
  }

  // Radio / transmission : contour angulaire + queue éclair (convention voix via appareil)
  if (type === "radio") {
    return (
      <>
        <path
          d="M 8 12 L 92 12 L 98 24 L 98 78 L 90 90 L 12 90 L 2 78 L 2 24 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <path
          d="M 72 90 L 62 104 L 72 106 L 58 120 L 72 118 L 70 108 L 82 96 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </>
    );
  }

  // Cri / shout : contour en dents (explosion) + queue en éclair + petite étoile (style “scream bubble”)
  if (type === "shout") {
    const n = 20;
    const points: string[] = [];
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      const r = i % 2 === 0 ? 40 : 52;
      points.push(`${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`);
    }
    const jagged = `M ${points.join(" L ")} Z`;
    const lightning = "M 34 96 L 25 106 L 36 109 L 22 120 L 36 118 L 33 110 L 44 102 Z";
    return (
      <>
        <path d={jagged} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d={lightning} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </>
    );
  }

  return null;
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
  /** Brouillon hauteur du panel (modale édition), chaîne pour autoriser le champ vide ; null = afficher la valeur réelle */
  const [panelHeightDraft, setPanelHeightDraft] = useState<string | null>(null);
  /** Bloc en cours d'édition de prompt : clé = `${panelId}-${blockId}` */
  const [_editingBlockKey, setEditingBlockKey] = useState<string | null>(null);
  /** Brouillon dimensions par bloc : clé = `${panelId}-${blockId}` → { width, height } */
  const [_blockDimensionDrafts, setBlockDimensionDrafts] = useState<Record<string, { width: number; height: number }>>({});
  /** Mode d'édition par panel : chaque panel a son propre mode (Architecture ou Édition) */
  const [panelEditModeByPanelId, setPanelEditModeByPanelId] = useState<Record<string, "architecture" | "edition" | "couleurs">>({});
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
  const [_dragPreview, _setDragPreview] = useState<{ panelId: string; blockId: string; x: number; y: number } | null>(null);
  /** Panel ouvert en modale « Edition » (id ou null) */
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null);
  /** Onglet du panneau gauche en modale : Architecture | Personalisation | Couleurs */
  const [panelEditorLeftTab, setPanelEditorLeftTab] = useState<"architecture" | "personalisation" | "couleurs" | "dialogue">("architecture");
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

  // Réduit la duplication des resets d'état de l'éditeur panel.
  const resetPanelEditorUiState = useCallback(() => {
    setSelectedBlockIdInModal(null);
    setSelectedColorBlockIdInModal(null);
    setSelectedSpeechBubbleIdInModal(null);
    setPanelHeightDraft(null);
    setPanelEditorLeftTab("architecture");
    setPanelEditorRightTool("chapter-text");
  }, []);

  const closePanelEditor = useCallback(() => {
    setExpandedPanelId(null);
    resetPanelEditorUiState();
  }, [resetPanelEditorUiState]);
  /** Ref vers l’élément DOM du bloc de couleur en cours de déplacement (opacity pendant le drag) */
  const draggingColorBlockElRef = useRef<HTMLDivElement | null>(null);
  /** Ghost de drag pour blocs de couleur : un div par panel, position mis à jour en direct (comme blocs image) */
  const dragColorBlockGhostRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  /** Données du bloc de couleur en cours de déplacement (tout en ref = zéro re-render pendant le move) */
  const draggingColorBlockDataRef = useRef<{
    panelId: string;
    colorBlockId: string;
    startX: number;
    startY: number;
    startMouseX: number;
    startMouseY: number;
    width: number;
    height: number;
    rectLeft: number;
    rectTop: number;
  } | null>(null);
  /** Resize d'un bloc de couleur (comme pour les blocs image) */
  const [resizingColorBlockState, setResizingColorBlockState] = useState<{
    panelId: string;
    colorBlockId: string;
    edge: "t" | "b" | "l" | "r" | "tl" | "tr" | "bl" | "br";
    start: { x: number; y: number; w: number; h: number };
    startMouse: { x: number; y: number };
  } | null>(null);
  const [resizeColorBlockDraft, setResizeColorBlockDraft] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const resizeColorBlockCaptureTargetRef = useRef<HTMLElement | null>(null);
  const resizingColorBlockElRef = useRef<HTMLDivElement | null>(null);
  const saveResizeColorBlockRef = useRef<((draft: { x: number; y: number; width: number; height: number }) => void) | null>(null);
  const lastResizeColorBlockMouseRef = useRef<{ x: number; y: number } | null>(null);
  const resizeColorBlockDraftRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const isResizingColorBlockRef = useRef(false);
  /** Ghost de drag pour bulles de dialogue */
  const dragSpeechBubbleGhostRefByPanel = useRef<Record<string, HTMLDivElement | null>>({});
  const draggingSpeechBubbleDataRef = useRef<{
    panelId: string; bubbleId: string; startX: number; startY: number; startMouseX: number; startMouseY: number; width: number; height: number; rectLeft: number; rectTop: number;
  } | null>(null);
  const draggingSpeechBubbleElRef = useRef<HTMLDivElement | null>(null);
  /** Resize d'une bulle de dialogue */
  const [resizingSpeechBubbleState, setResizingSpeechBubbleState] = useState<{
    panelId: string; bubbleId: string; edge: "t" | "b" | "l" | "r" | "tl" | "tr" | "bl" | "br";
    start: { x: number; y: number; w: number; h: number }; startMouse: { x: number; y: number };
  } | null>(null);
  const [resizeSpeechBubbleDraft, setResizeSpeechBubbleDraft] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const resizeSpeechBubbleDraftRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const isResizingSpeechBubbleRef = useRef(false);
  const resizingSpeechBubbleElRef = useRef<HTMLDivElement | null>(null);
  const resizeSpeechBubbleCaptureTargetRef = useRef<HTMLElement | null>(null);
  const lastResizeSpeechBubbleMouseRef = useRef<{ x: number; y: number } | null>(null);
  const saveResizeSpeechBubbleRef = useRef<((draft: { x: number; y: number; width: number; height: number }) => void) | null>(null);
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

  /** Resize des blocs de couleur (même logique que blocs image). */
  useEffect(() => {
    const target = resizeColorBlockCaptureTargetRef.current;
    if (!resizingColorBlockState || !target) return;
    const { edge, start, panelId } = resizingColorBlockState;
    const minW = 100;
    const minH = 100;
    const rightFixed = start.x + start.w;
    const bottomFixed = start.y + start.h;
    const panel = panels.find((p) => p.id === panelId);
    const panelH = getPanelHeight(panel);

    const computeFromMouse = (clientX: number, clientY: number) => {
      const canvasEl = canvasRefByPanel.current[panelId];
      if (!canvasEl) return { x: start.x, y: start.y, width: start.w, height: start.h };
      const mouse = viewportToCanvas(canvasEl, clientX, clientY);
      let x = start.x, y = start.y, w = start.w, h = start.h;
      switch (edge) {
        case "r": w = mouse.x - start.x; break;
        case "l": x = mouse.x; w = rightFixed - mouse.x; break;
        case "b": h = mouse.y - start.y; break;
        case "t": y = mouse.y; h = bottomFixed - mouse.y; break;
        case "tr": y = mouse.y; w = mouse.x - start.x; h = bottomFixed - mouse.y; break;
        case "br": w = mouse.x - start.x; h = mouse.y - start.y; break;
        case "bl": x = mouse.x; w = rightFixed - mouse.x; h = mouse.y - start.y; break;
        case "tl": x = mouse.x; y = mouse.y; w = rightFixed - mouse.x; h = bottomFixed - mouse.y; break;
      }
      const leftFixed = edge === "r" || edge === "tr" || edge === "br";
      const topFixed = edge === "r" || edge === "b" || edge === "br" || edge === "bl";
      const rightAnchored = edge === "l" || edge === "bl" || edge === "tl";
      const bottomAnchored = edge === "t" || edge === "tr" || edge === "tl";
      w = Math.max(minW, Math.min(PANEL_WIDTH, w));
      h = Math.max(minH, Math.min(panelH, h));
      if (leftFixed) w = Math.min(w, PANEL_WIDTH - start.x);
      if (topFixed) h = Math.min(h, panelH - start.y);
      if (rightAnchored) { w = Math.min(w, rightFixed); x = rightFixed - w; }
      if (bottomAnchored) { h = Math.min(h, bottomFixed); y = bottomFixed - h; }
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
      lastResizeColorBlockMouseRef.current = { x: e.clientX, y: e.clientY };
      const result = computeFromMouse(e.clientX, e.clientY);
      resizeColorBlockDraftRef.current = result;
      setResizeColorBlockDraft(result);
      const el = resizingColorBlockElRef.current;
      if (el) {
        el.style.left = `${result.x}px`;
        el.style.top = `${result.y}px`;
        el.style.width = `${result.width}px`;
        el.style.height = `${result.height}px`;
      }
    };
    const onUp = () => {
      const lastClient = lastResizeColorBlockMouseRef.current;
      const rawResult = lastClient
        ? computeFromMouse(lastClient.x, lastClient.y)
        : resizeColorBlockDraftRef.current ?? { x: start.x, y: start.y, width: start.w, height: start.h };
      const result = { x: Math.round(rawResult.x), y: Math.round(rawResult.y), width: Math.round(rawResult.width), height: Math.round(rawResult.height) };
      const hadSave = !!saveResizeColorBlockRef.current;
      saveResizeColorBlockRef.current?.(result);
      saveResizeColorBlockRef.current = null;
      if (!hadSave) {
        setResizingColorBlockState(null);
        setResizeColorBlockDraft(null);
        resizeColorBlockDraftRef.current = null;
        lastResizeColorBlockMouseRef.current = null;
        resizeColorBlockCaptureTargetRef.current = null;
        resizingColorBlockElRef.current = null;
        isResizingColorBlockRef.current = false;
      }
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    return () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
    };
  }, [resizingColorBlockState, panels]);

  /** Resize des bulles de dialogue (même logique que blocs de couleur — listeners sur document pour recevoir tous les events). */
  useEffect(() => {
    if (!resizingSpeechBubbleState) return;
    const { edge, start, panelId } = resizingSpeechBubbleState;
    const minW = 60;
    const minH = 28;
    const rightFixed = start.x + start.w;
    const bottomFixed = start.y + start.h;
    const panel = panels.find((p) => p.id === panelId);
    const panelH = panel ? getPanelHeight(panel) : PANEL_HEIGHT_DEFAULT;
    const listenTarget = document.body;

    const computeFromMouse = (clientX: number, clientY: number) => {
      const canvasEl = canvasRefByPanel.current[panelId];
      if (!canvasEl) return { x: start.x, y: start.y, width: start.w, height: start.h };
      const mouse = viewportToCanvas(canvasEl, clientX, clientY);
      let x = start.x, y = start.y, w = start.w, h = start.h;
      switch (edge) {
        case "r": w = mouse.x - start.x; break;
        case "l": x = mouse.x; w = rightFixed - mouse.x; break;
        case "b": h = mouse.y - start.y; break;
        case "t": y = mouse.y; h = bottomFixed - mouse.y; break;
        case "tr": y = mouse.y; w = mouse.x - start.x; h = bottomFixed - mouse.y; break;
        case "br": w = mouse.x - start.x; h = mouse.y - start.y; break;
        case "bl": x = mouse.x; w = rightFixed - mouse.x; h = mouse.y - start.y; break;
        case "tl": x = mouse.x; y = mouse.y; w = rightFixed - mouse.x; h = bottomFixed - mouse.y; break;
      }
      const leftFixed = edge === "r" || edge === "tr" || edge === "br";
      const topFixed = edge === "r" || edge === "b" || edge === "br" || edge === "bl";
      const rightAnchored = edge === "l" || edge === "bl" || edge === "tl";
      const bottomAnchored = edge === "t" || edge === "tr" || edge === "tl";
      w = Math.max(minW, Math.min(PANEL_WIDTH, w));
      h = Math.max(minH, Math.min(panelH, h));
      if (leftFixed) w = Math.min(w, PANEL_WIDTH - start.x);
      if (topFixed) h = Math.min(h, panelH - start.y);
      if (rightAnchored) { w = Math.min(w, rightFixed); x = rightFixed - w; }
      if (bottomAnchored) { h = Math.min(h, bottomFixed); y = bottomFixed - h; }
      if (leftFixed) x = start.x;
      else if (rightAnchored) x = rightFixed - w;
      else x = Math.max(0, Math.min(PANEL_WIDTH - w, x));
      if (topFixed) y = start.y;
      else if (bottomAnchored) y = bottomFixed - h;
      else y = Math.max(0, Math.min(panelH - h, y));
      return { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) };
    };

    const tailH = 14;
    const onMove = (e: PointerEvent) => {
      if (e.buttons !== 1) return;
      lastResizeSpeechBubbleMouseRef.current = { x: e.clientX, y: e.clientY };
      const result = computeFromMouse(e.clientX, e.clientY);
      resizeSpeechBubbleDraftRef.current = result;
      setResizeSpeechBubbleDraft(result);
      const el = resizingSpeechBubbleElRef.current;
      if (el) {
        el.style.left = `${result.x}px`;
        el.style.top = `${result.y}px`;
        el.style.width = `${result.width}px`;
        el.style.height = `${result.height + tailH}px`;
      }
    };
    const onUp = () => {
      const lastClient = lastResizeSpeechBubbleMouseRef.current;
      const rawResult = lastClient
        ? computeFromMouse(lastClient.x, lastClient.y)
        : resizeSpeechBubbleDraftRef.current ?? { x: start.x, y: start.y, width: start.w, height: start.h };
      const result = { x: Math.round(rawResult.x), y: Math.round(rawResult.y), width: Math.round(rawResult.width), height: Math.round(rawResult.height) };
      const hadSave = !!saveResizeSpeechBubbleRef.current;
      saveResizeSpeechBubbleRef.current?.(result);
      saveResizeSpeechBubbleRef.current = null;
      if (!hadSave) {
        setResizingSpeechBubbleState(null);
        setResizeSpeechBubbleDraft(null);
        resizeSpeechBubbleDraftRef.current = null;
        lastResizeSpeechBubbleMouseRef.current = null;
        resizeSpeechBubbleCaptureTargetRef.current = null;
        resizingSpeechBubbleElRef.current = null;
        isResizingSpeechBubbleRef.current = false;
      }
    };
    listenTarget.addEventListener("pointermove", onMove, true);
    listenTarget.addEventListener("pointerup", onUp, true);
    return () => {
      listenTarget.removeEventListener("pointermove", onMove, true);
      listenTarget.removeEventListener("pointerup", onUp, true);
    };
  }, [resizingSpeechBubbleState, panels]);

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
      if (e.key !== "Delete" && e.key !== "Backspace") return;

      const panel = panels.find((p) => p.id === expandedPanelId);
      if (!panel) return;

      if (selectedBlockIdInModal?.panelId === expandedPanelId && selectedBlockIdInModal.blockId) {
        const blocks = getPanelBlocks(panel);
        const block = blocks.find((b) => b.id === selectedBlockIdInModal.blockId);
        if (block) {
          const layout = getPanelLayout(panel);
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
    const mode = panelEditModeByPanelId[panel.id] ?? "architecture";
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
        const data = JSON.parse(raw) as { type: string; blockId?: string; width?: number; height?: number; fill?: ColorBlockFill; bubbleType?: SpeechBubble["type"] };
        if (data.type === "speech-bubble" && data.bubbleType) {
          if (panelEditorLeftTab !== "dialogue") return;
          const { x, y } = getCanvasDropPosition(e, canvasEl, DEFAULT_SPEECH_BUBBLE_WIDTH, DEFAULT_SPEECH_BUBBLE_HEIGHT);
          handleAddSpeechBubble(data.bubbleType, x, y);
          setDraggingBlock(null);
          setDragPreview(null);
          return;
        }
        if (mode === "edition") return;
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
      const promptToUse = (blockPromptDrafts[`${panel.id}-${block.id}`] ?? block.prompt ?? "").trim() || (panel.prompt ?? "").trim();
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
            setPanelEditorLeftTab("personalisation");
            setPanelEditModeByPanelId((prev) => ({ ...prev, [panel.id]: "edition" }));
          },
          onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
        }
      );
    };

    const handlePanelEditorTabChange = (nextTab: "architecture" | "personalisation" | "couleurs" | "dialogue") => {
      setPanelEditorLeftTab(nextTab);
      if (nextTab === "personalisation") {
        setPanelEditModeByPanelId((prev) => ({ ...prev, [panel.id]: "edition" }));
        setSelectedColorBlockIdInModal(null);
        setSelectedSpeechBubbleIdInModal(null);
      }
      if (nextTab === "architecture") {
        setPanelEditModeByPanelId((prev) => ({ ...prev, [panel.id]: "architecture" }));
        setSelectedBlockIdInModal(null);
        setSelectedColorBlockIdInModal(null);
        setSelectedSpeechBubbleIdInModal(null);
      }
      if (nextTab === "couleurs") {
        setPanelEditModeByPanelId((prev) => ({ ...prev, [panel.id]: "couleurs" }));
        setSelectedBlockIdInModal(null);
        setSelectedSpeechBubbleIdInModal(null);
      }
      if (nextTab === "dialogue") {
        setPanelEditModeByPanelId((prev) => ({ ...prev, [panel.id]: "edition" }));
        setSelectedBlockIdInModal(null);
        setSelectedColorBlockIdInModal(null);
      }
    };

    return (
      <div className="flex flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
        {/* Menu d'édition : logo + sous-menu d'actions (UI type studio) */}
        <aside className="w-[92px] shrink-0 border-r border-border/80 bg-muted/20 px-3 py-4 flex flex-col items-center gap-3">
          <div className="w-full space-y-2">
            {PANEL_EDITOR_STEPS.map((step) => {
              const Icon = step.icon;
              const active = panelEditorLeftTab === step.value;
              return (
                <button
                  key={step.value}
                  type="button"
                  onClick={() => handlePanelEditorTabChange(step.value)}
                  className={`w-full h-12 rounded-xl border flex items-center justify-center transition-colors duration-150 ${
                    active
                      ? "border-primary/70 bg-primary/15 text-primary shadow-sm"
                      : "border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  title={`${step.label} — ${step.hint}`}
                >
                  <Icon className={`${active ? "h-5 w-5" : "h-[18px] w-[18px]"}`} />
                </button>
              );
            })}
          </div>
          <div className="w-full mt-auto pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => setSliceModalOpen(true)}
              className="w-full h-12 rounded-xl border border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center transition-colors duration-150"
              title="Découper & télécharger"
            >
              <Download className="h-[18px] w-[18px]" />
            </button>
          </div>
        </aside>
        {/* Gauche : contenu selon l’onglet (Chapitre | Architecture | Personalisation) */}
        <aside className="w-[360px] shrink-0 flex flex-col border-r border-border bg-background overflow-y-auto">
          {panelEditorLeftTab === "architecture" && (
            <div className="p-4 space-y-4">
              <div className="min-h-10 rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2">
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
              </div>
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
            </div>
          )}
          {panelEditorLeftTab === "personalisation" && (
            <div className="p-4 flex-1 min-h-0 flex flex-col overflow-y-auto">
              {selectedBlock ? (() => {
                const block = selectedBlock;
                const blockKey = `${panel.id}-${block.id}`;
                const nameDraft = blockNameDrafts[blockKey] ?? block.name ?? "";
                const promptDraft = blockPromptDrafts[blockKey] ?? block.prompt ?? "";
                const isGenerating = generatePanelImage.isPending && generatePanelImage.variables?.panel?.id === panel.id;
                return (
                  <>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-sm font-medium text-foreground">Bloc sélectionné</h4>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => setSelectedBlockIdInModal(null)} aria-label="Fermer"><X className="h-4 w-4" /></Button>
                    </div>
                    <div className="space-y-4">
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
                        {!block.image_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 h-7 text-xs"
                            disabled={suggestingBlockKeys.has(blockKey) || !scenarioChapter?.content?.trim()}
                            onClick={() => handleSuggestBlockPrompt(block)}
                            title={
                              !scenarioChapter?.content?.trim()
                                ? "Associez un chapitre de scénario avec du contenu pour utiliser l'IA"
                                : "L'IA suggère un prompt à partir du contexte (chapitre + blocs précédents)"
                            }
                          >
                            {suggestingBlockKeys.has(blockKey) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            Suggérer un prompt
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-muted-foreground">Dimensions</span>
                        <p className="text-sm text-foreground tabular-nums">{block.width} × {Math.round(block.height)}</p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-muted-foreground">Assets détectés</span>
                        {(() => {
                          const promptText = (promptDraft.trim() || (block.prompt ?? "").trim()) || "";
                          const detected = getDetectedAssets(promptText, assets);
                          if (detected.length === 0) {
                            return (
                              <p className="text-[11px] text-muted-foreground/80">
                                Les personnages, décors et objets mentionnés dans le prompt apparaîtront ici (un par asset).
                              </p>
                            );
                          }
                          return (
                            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-2">
                              {detected.map((asset) => (
                                <div key={asset.id} className="flex items-center gap-2 rounded px-2 py-1.5">
                                  <div className="w-10 h-10 shrink-0 rounded overflow-hidden border border-border/60 bg-muted">
                                    {getAssetReferenceImageUrl(asset) ? (
                                      <ImageWithFallback src={getAssetReferenceImageUrl(asset) ?? ""} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">—</div>
                                    )}
                                  </div>
                                  <span className="flex-1 min-w-0 truncate text-sm font-medium">{asset.name ?? asset.id.slice(0, 8)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      {project && (
                        <Button size="sm" variant="outline" className="w-full gap-1.5" disabled={(!(block.prompt?.trim()) && !(panel.prompt?.trim())) || !project.style_template?.trim() || isGenerating} onClick={() => handleGenerateBlock(block)}>
                          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{block.image_url ? "Régénérer l'image" : "Générer l'image"}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={updatePanelMutation.isPending} onClick={() => handleDeleteBlock(block)}><Trash2 className="h-3 w-3" /> Supprimer le bloc</Button>
                    </div>
                  </>
                );
              })() : (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">Cliquez sur un bloc dans le panel pour l'éditer (passez en mode Personalisation dans l'onglet Architecture si besoin).</p>
                </div>
              )}
            </div>
          )}
          {panelEditorLeftTab === "couleurs" && (
            <div className="p-4 space-y-4">
              <div className="min-h-10 rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground block">Bloc de couleur — glisser sur le panel</span>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/json", JSON.stringify({ type: "new-color-block", width: 300, height: 300, fill: { type: "solid", color: "#ffffff" } }));
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="cursor-grab active:cursor-grabbing rounded-lg border border-border/80 bg-white shadow-sm px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:shadow-md transition-shadow transition-colors duration-150 flex items-center justify-center gap-2 min-h-[56px]"
                  >
                    <span className="font-medium">Bloc blanc</span>
                    <span className="text-xs opacity-80">(glisser-déposer)</span>
                  </div>
                </div>
              </div>
              {selectedColorBlock ? (
                <>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-sm font-medium text-foreground">Bloc sélectionné</h4>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => setSelectedColorBlockIdInModal(null)} aria-label="Fermer"><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">Dimensions</span>
                      <p className="text-sm text-foreground tabular-nums">{selectedColorBlock.width} × {Math.round(selectedColorBlock.height)}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Couleur</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedColorBlock.fill.type === "solid" ? selectedColorBlock.fill.color : selectedColorBlock.fill.from}
                          onChange={(e) => handleColorBlockFillChange(selectedColorBlock, { type: "solid", color: e.target.value })}
                          className="h-9 w-14 rounded border border-border/60 cursor-pointer bg-background"
                        />
                        <span className="text-xs text-muted-foreground tabular-nums">{selectedColorBlock.fill.type === "solid" ? selectedColorBlock.fill.color : selectedColorBlock.fill.from}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={updatePanelMutation.isPending} onClick={() => handleDeleteColorBlock(selectedColorBlock)}><Trash2 className="h-3 w-3" /> Supprimer le bloc</Button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">Cliquez sur un bloc dans le panel pour l&apos;éditer (bloc de couleur).</p>
                </div>
              )}
            </div>
          )}
          {panelEditorLeftTab === "dialogue" && (
            <div className="p-4 space-y-4">
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-3 space-y-2">
                <span className="text-xs font-medium text-muted-foreground block">Ajouter une bulle</span>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/json", JSON.stringify({ type: "speech-bubble", bubbleType: "text" }));
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => {
                    const ph = getPanelHeight(panel);
                    const cx = Math.round((PANEL_WIDTH - DEFAULT_SPEECH_BUBBLE_WIDTH) / 2);
                    const cy = Math.round((ph - DEFAULT_SPEECH_BUBBLE_HEIGHT) / 2);
                    handleAddSpeechBubble("text", cx, cy);
                  }}
                  className="w-full cursor-pointer rounded-lg border border-border/60 bg-background px-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1.5 justify-center"
                  title="Ajouter un texte libre au centre (ou glisser sur le panel)"
                >
                  <Type className="h-3 w-3 shrink-0" />
                  <span>✏️ Texte libre</span>
                </button>
                <Separator className="my-1" />
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(SPEECH_BUBBLE_TYPE_LABELS) as [SpeechBubbleType, string][]).filter(([type]) => type !== "text").map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "speech-bubble", bubbleType: type }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => {
                        const ph = getPanelHeight(panel);
                        const cx = Math.round((PANEL_WIDTH - DEFAULT_SPEECH_BUBBLE_WIDTH) / 2);
                        const cy = Math.round((ph - DEFAULT_SPEECH_BUBBLE_HEIGHT) / 2);
                        handleAddSpeechBubble(type, cx, cy);
                      }}
                      className="cursor-pointer rounded-lg border border-border/60 bg-background px-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1.5 justify-center"
                      title={`Ajouter ${label} au centre (ou glisser sur le panel)`}
                    >
                      <Plus className="h-3 w-3 shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground/70">Clic = ajout au centre · Glisser = placement libre</p>
              </div>
              {selectedSpeechBubble ? (
                <>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-sm font-medium text-foreground">Bulle sélectionnée</h4>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => setSelectedSpeechBubbleIdInModal(null)} aria-label="Fermer la sélection"><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-4">
                    {/* Texte en premier — c'est l'action principale */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Texte</label>
                      <textarea
                        autoFocus
                        value={selectedSpeechBubble.text}
                        onChange={(e) => {
                          const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, text: e.target.value } : b);
                          handleUpdateSpeechBubbles(next);
                        }}
                        className="w-full min-h-[80px] rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-y"
                        placeholder="Dialogue, pensée, narration…"
                      />
                    </div>
                    {/* Changement de type */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Type de bulle</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.entries(SPEECH_BUBBLE_TYPE_LABELS) as [SpeechBubbleType, string][]).map(([t, lbl]) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, type: t } : b);
                              handleUpdateSpeechBubbles(next);
                            }}
                            className={`rounded-lg border px-2 py-1.5 text-xs transition-colors ${selectedSpeechBubble.type === t ? "border-primary bg-primary/10 text-foreground font-medium" : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"}`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Dimensions (glisser les poignées)</span>
                      <p className="text-sm text-foreground tabular-nums">{selectedSpeechBubble.width ?? DEFAULT_SPEECH_BUBBLE_WIDTH} × {selectedSpeechBubble.height ?? DEFAULT_SPEECH_BUBBLE_HEIGHT} px</p>
                    </div>
                    {selectedSpeechBubble.type !== "text" && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            Fond bulle
                            <input
                              type="color"
                              value={selectedSpeechBubble.bgColor ?? selectedSpeechBubble.style?.fill ?? SPEECH_BUBBLE_DEFAULT_STYLE[selectedSpeechBubble.type].fill}
                              onChange={(e) => {
                                const v = e.target.value;
                                const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, style: { ...b.style, fill: v }, bgColor: v } : b);
                                handleUpdateSpeechBubbles(next);
                              }}
                              className="h-6 w-8 rounded border border-border/60 cursor-pointer"
                            />
                          </label>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            Contour bulle
                            <input
                              type="color"
                              value={selectedSpeechBubble.borderColor ?? selectedSpeechBubble.style?.stroke ?? SPEECH_BUBBLE_DEFAULT_STYLE[selectedSpeechBubble.type].stroke}
                              onChange={(e) => {
                                const v = e.target.value;
                                const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, style: { ...b.style, stroke: v }, borderColor: v } : b);
                                handleUpdateSpeechBubbles(next);
                              }}
                              className="h-6 w-8 rounded border border-border/60 cursor-pointer"
                            />
                          </label>
                        </div>
                      </>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Police / taille / couleur</label>
                      <div className="flex flex-wrap gap-2 items-center">
                        <select
                          value={selectedSpeechBubble.style?.font ?? "inherit"}
                          onChange={(e) => {
                            const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, style: { ...b.style, font: e.target.value || undefined } } : b);
                            handleUpdateSpeechBubbles(next);
                          }}
                          className="h-9 rounded-lg border border-border/60 bg-background px-2 text-sm"
                        >
                          <option value="inherit">Par défaut</option>
                          <option value="sans-serif">Sans-serif</option>
                          <option value="serif">Serif</option>
                          <option value="monospace">Monospace</option>
                        </select>
                        <input
                          type="number"
                          min={8}
                          max={72}
                          value={selectedSpeechBubble.style?.size ?? 14}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            if (!Number.isNaN(n)) {
                              const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, style: { ...b.style, size: n } } : b);
                              handleUpdateSpeechBubbles(next);
                            }
                          }}
                          className="w-16 h-9 rounded-lg border border-border/60 bg-background px-2 text-sm tabular-nums"
                        />
                        <input
                          type="color"
                          value={selectedSpeechBubble.style?.color ?? "#000000"}
                          onChange={(e) => {
                            const next = speechBubbles.map((b) => b.id === selectedSpeechBubble.id ? { ...b, style: { ...b.style, color: e.target.value } } : b);
                            handleUpdateSpeechBubbles(next);
                          }}
                          className="h-9 w-10 rounded border border-border/60 cursor-pointer bg-background"
                        />
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={updatePanelMutation.isPending} onClick={() => handleDeleteSpeechBubble(selectedSpeechBubble)}><Trash2 className="h-3 w-3" /> Supprimer la bulle</Button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">Cliquez sur une bulle dans le panel pour éditer le texte et le style.</p>
                </div>
              )}
            </div>
          )}

        </aside>
        {/* Centre : panel 800px de large exactement, zoomable via contrôles header ou Ctrl+Scroll */}
        <div className="flex-1 min-w-0 flex items-start justify-center overflow-auto p-6 bg-background">
          <div style={{ width: PANEL_WIDTH * zoomLevel, height: panelHeight * zoomLevel, flexShrink: 0 }}>
            <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left", width: PANEL_WIDTH }}>
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
              {/* Blocs de couleur (arrière-plan) */}
              {colorBlocks.map((cb) => {
                const isResizingThis = resizingColorBlockState?.panelId === panel.id && resizingColorBlockState?.colorBlockId === cb.id;
                const geom = isResizingThis && resizeColorBlockDraft
                  ? { x: Math.round(resizeColorBlockDraft.x), y: Math.round(resizeColorBlockDraft.y), width: Math.round(resizeColorBlockDraft.width), height: Math.round(resizeColorBlockDraft.height) }
                  : { x: cb.x, y: cb.y, width: cb.width, height: cb.height };
                const isSelected = mode === "couleurs" && selectedColorBlockIdInModal?.panelId === panel.id && selectedColorBlockIdInModal?.colorBlockId === cb.id;
                const bgStyle = cb.fill.type === "solid"
                  ? { backgroundColor: cb.fill.color }
                  : { background: `linear-gradient(${cb.fill.angle ?? 90}deg, ${cb.fill.from}, ${cb.fill.to})` };
                return (
                  <div
                    key={cb.id}
                    ref={isResizingThis ? (el) => { if (el) resizingColorBlockElRef.current = el; } : undefined}
                    className={`group absolute overflow-visible border border-border/80 transition-[box-shadow,ring] duration-150 ${mode === "couleurs" ? "cursor-grab active:cursor-grabbing ring-2 ring-primary/60" : ""} ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    style={{
                      left: geom.x,
                      top: geom.y,
                      width: geom.width,
                      height: geom.height,
                      ...bgStyle,
                      zIndex: 0,
                      pointerEvents: mode === "couleurs" ? "auto" : "none",
                    }}
                    onPointerDown={mode === "couleurs" && !isResizingThis && !isResizingColorBlockRef.current ? (e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      const canvasEl = canvasRefByPanel.current[panel.id];
                      if (!canvasEl) return;
                      const rect = canvasEl.getBoundingClientRect();
                      const _dragScale = canvasEl.offsetWidth > 0 ? canvasEl.getBoundingClientRect().width / canvasEl.offsetWidth : 1;
                      const startMouseX = (e.clientX - rect.left) / _dragScale;
                      const startMouseY = (e.clientY - rect.top) / _dragScale;
                      const el = e.currentTarget as HTMLDivElement;
                      draggingColorBlockElRef.current = el;
                      draggingColorBlockDataRef.current = { panelId: panel.id, colorBlockId: cb.id, startX: cb.x, startY: cb.y, startMouseX, startMouseY, width: cb.width, height: cb.height, rectLeft: rect.left, rectTop: rect.top };
                      const ghost = dragColorBlockGhostRefByPanel.current[panel.id];
                      if (ghost) {
                        ghost.style.display = "block";
                        ghost.style.left = `${cb.x}px`;
                        ghost.style.top = `${cb.y}px`;
                        ghost.style.width = `${cb.width}px`;
                        ghost.style.height = `${cb.height}px`;
                        if (cb.fill.type === "solid") {
                          ghost.style.backgroundColor = cb.fill.color;
                          ghost.style.background = "";
                        } else {
                          ghost.style.background = `linear-gradient(${cb.fill.angle ?? 90}deg, ${cb.fill.from}, ${cb.fill.to})`;
                          ghost.style.backgroundColor = "";
                        }
                      }
                      el.style.opacity = "0.35";
                      const panelH = getPanelHeight(panel);
                      const onPointerMove = (ev: PointerEvent) => {
                        const data = draggingColorBlockDataRef.current;
                        if (!data) return;
                        const canvas = canvasRefByPanel.current[data.panelId];
                        const r = canvas?.getBoundingClientRect();
                        const _cbMs = canvas && canvas.offsetWidth > 0 ? r!.width / canvas.offsetWidth : 1;
                        const canvasMouseX = r ? (ev.clientX - r.left) / _cbMs : (ev.clientX - data.rectLeft) / zoomRef.current;
                        const canvasMouseY = r ? (ev.clientY - r.top) / _cbMs : (ev.clientY - data.rectTop) / zoomRef.current;
                        const newX = Math.max(0, Math.min(PANEL_WIDTH - data.width, data.startX + (canvasMouseX - data.startMouseX)));
                        const newY = Math.max(0, Math.min(panelH - data.height, data.startY + (canvasMouseY - data.startMouseY)));
                        const g = dragColorBlockGhostRefByPanel.current[data.panelId];
                        if (g) { g.style.left = `${newX}px`; g.style.top = `${newY}px`; }
                      };
                      const onPointerUp = (ev: PointerEvent) => {
                        if (ev.button !== 0) return;
                        document.removeEventListener("pointermove", onPointerMove, true);
                        document.removeEventListener("pointerup", onPointerUp, true);
                        const data = draggingColorBlockDataRef.current;
                        draggingColorBlockDataRef.current = null;
                        const dragEl = draggingColorBlockElRef.current;
                        if (dragEl) { dragEl.style.opacity = ""; draggingColorBlockElRef.current = null; }
                        const g = data && dragColorBlockGhostRefByPanel.current[data.panelId];
                        if (g) g.style.display = "none";
                        if (!data) return;
                        const canvas = canvasRefByPanel.current[data.panelId];
                        const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
                        const panelUp = currentPanels.find((p) => p.id === data.panelId);
                        const colorBlocksUp = getPanelColorBlocks(panelUp ?? panel);
                        if (!canvas) return;
                        const { x: canvasMouseX, y: canvasMouseY } = viewportToCanvas(canvas, ev.clientX, ev.clientY);
                        const clampedX = Math.max(0, Math.min(PANEL_WIDTH - data.width, Math.round(data.startX + (canvasMouseX - data.startMouseX))));
                        const clampedY = Math.max(0, Math.min(getPanelHeight(panelUp ?? panel) - data.height, Math.round(data.startY + (canvasMouseY - data.startMouseY))));
                        const next = colorBlocksUp.map((c) => (c.id === data.colorBlockId ? { ...c, x: clampedX, y: clampedY } : c));
                        queryClient.cancelQueries({ queryKey: panelsQueryKey });
                        const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
                        queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === data.panelId ? { ...p, color_blocks: next as unknown as Json } : p))));
                        updatePanelMutation.mutate(
                          { id: data.panelId, updates: { color_blocks: next as unknown as Json } },
                          {
                            onError: (err) => {
                              if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels);
                              toast({ title: "Erreur", description: err.message, variant: "destructive" });
                            },
                          }
                        );
                      };
                      document.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
                      document.addEventListener("pointerup", onPointerUp, true);
                    } : undefined}
                    onClick={mode === "couleurs" ? (e) => { e.stopPropagation(); setSelectedColorBlockIdInModal({ panelId: panel.id, colorBlockId: cb.id }); } : undefined}
                  >
                    {mode === "couleurs" && (
                      <>
                        <button
                          type="button"
                          className="absolute bottom-[25%] left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-md bg-destructive/90 text-destructive-foreground opacity-0 shadow-md transition-opacity hover:bg-destructive group-hover:opacity-100"
                          title="Supprimer le bloc de couleur"
                          onPointerDown={(ev) => ev.stopPropagation()}
                          onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); handleDeleteColorBlock(cb); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {[
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
                            onPointerDown={(ev) => {
                              if (ev.button !== 0) return;
                              ev.preventDefault();
                              ev.stopPropagation();
                              isResizingColorBlockRef.current = true;
                              resizeColorBlockCaptureTargetRef.current = ev.currentTarget as HTMLElement;
                              (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
                              setResizingColorBlockState({ panelId: panel.id, colorBlockId: cb.id, edge, start: { x: cb.x, y: cb.y, w: cb.width, h: cb.height }, startMouse: { x: ev.clientX, y: ev.clientY } });
                              setResizeColorBlockDraft({ x: cb.x, y: cb.y, width: cb.width, height: cb.height });
                              resizeColorBlockDraftRef.current = { x: cb.x, y: cb.y, width: cb.width, height: cb.height };
                              saveResizeColorBlockRef.current = (draft) => {
                                const roundedDraft = { x: Math.round(draft.x), y: Math.round(draft.y), width: Math.round(draft.width), height: Math.round(draft.height) };
                                const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
                                const currentPanel = currentPanels.find((p) => p.id === panel.id);
                                const currentColorBlocks = getPanelColorBlocks(currentPanel ?? panel);
                                const next = currentColorBlocks.map((c) => (c.id === cb.id ? { ...c, x: roundedDraft.x, y: roundedDraft.y, width: roundedDraft.width, height: roundedDraft.height } : c));
                                queryClient.cancelQueries({ queryKey: panelsQueryKey });
                                const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
                                queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panel.id ? { ...p, color_blocks: next as unknown as Json } : p))));
                                setResizingColorBlockState(null);
                                setResizeColorBlockDraft(null);
                                resizeColorBlockDraftRef.current = null;
                                lastResizeColorBlockMouseRef.current = null;
                                resizeColorBlockCaptureTargetRef.current = null;
                                resizingColorBlockElRef.current = null;
                                isResizingColorBlockRef.current = false;
                                updatePanelMutation.mutate(
                                  { id: panel.id, updates: { color_blocks: next as unknown as Json } },
                                  {
                                    onSuccess: () => {},
                                    onError: (err) => {
                                      if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels);
                                      toast({ title: "Erreur", description: err.message, variant: "destructive" });
                                    },
                                  }
                                );
                              };
                            }}
                            aria-label="Redimensionner"
                          />
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
              {/* Ghost de drag pour blocs de couleur : position mis à jour uniquement en JS (temps réel, aucun re-render) */}
              <div
                ref={(el) => { if (el) dragColorBlockGhostRefByPanel.current[panel.id] = el; }}
                aria-hidden
                className="pointer-events-none absolute z-50 rounded-lg border-2 border-primary shadow-lg box-border"
                style={{ display: "none", left: 0, top: 0, width: 0, height: 0 }}
              />
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
                        const _cbScale = canvasEl.offsetWidth > 0 ? rect.width / canvasEl.offsetWidth : 1;
                        const startMouseX = (e.clientX - rect.left) / _cbScale;
                        const startMouseY = (e.clientY - rect.top) / _cbScale;
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
                          const _ibMs = canvas && canvas.offsetWidth > 0 ? rect!.width / canvas.offsetWidth : 1;
                          const canvasMouseX = rect ? (ev.clientX - rect.left) / _ibMs : (ev.clientX - data.rectLeft) / zoomRef.current;
                          const canvasMouseY = rect ? (ev.clientY - rect.top) / _ibMs : (ev.clientY - data.rectTop) / zoomRef.current;
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
                            onSuccess: () => {
                              moveDropHandledRef.current = false;
                            },
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
                      className={`group absolute overflow-visible bg-black border border-border shadow-md transition-[box-shadow,ring] duration-150 ${mode === "couleurs" || panelEditorLeftTab === "dialogue" ? "pointer-events-none" : mode === "architecture" ? "cursor-grab active:cursor-grabbing ring-2 ring-primary/60" : `cursor-pointer ${isSelected ? "ring-2 ring-primary shadow-lg ring-offset-2 ring-offset-background" : "ring-1 ring-border/80 hover:ring-2 hover:ring-primary/50 hover:shadow-md"}`}`}
                      style={{ left: geom.x, top: geom.y, width: geom.width, height: geom.height, zIndex: 10, pointerEvents: mode === "couleurs" || panelEditorLeftTab === "dialogue" ? "none" : "auto" }}
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
                          <ImageWithFallback src={block.image_url} alt="" className="w-full h-full object-fill" />
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
              {/* Bulles de dialogue (overlay) — forme ovale + queue, déplaçables et redimensionnables */}
              {speechBubbles.map((bubble) => {
                const isSelected = panelEditorLeftTab === "dialogue" && selectedSpeechBubbleIdInModal?.panelId === panel.id && selectedSpeechBubbleIdInModal?.bubbleId === bubble.id;
                const isResizingThis = resizingSpeechBubbleState?.panelId === panel.id && resizingSpeechBubbleState?.bubbleId === bubble.id;
                const useResizeDraft = isResizingThis && resizeSpeechBubbleDraft != null;
                const bw = bubble.width ?? DEFAULT_SPEECH_BUBBLE_WIDTH;
                const bh = bubble.height ?? DEFAULT_SPEECH_BUBBLE_HEIGHT;
                const geom = useResizeDraft
                  ? { x: resizeSpeechBubbleDraft.x, y: resizeSpeechBubbleDraft.y, width: resizeSpeechBubbleDraft.width, height: resizeSpeechBubbleDraft.height }
                  : { x: bubble.position.x, y: bubble.position.y, width: bw, height: bh };
                const fontSize = bubble.style?.size ?? 14;
                const fontFamily = bubble.style?.font ?? "inherit";
                const color = bubble.style?.color ?? "#000000";
                const { fill: fillColor, stroke: strokeColor } = getSpeechBubbleFillStroke(bubble);
                const tailH = (bubble.type === "narration" || bubble.type === "text") ? 0 : SPEECH_BUBBLE_TAIL_H;
                const totalH = geom.height + tailH;
                return (
                  <div
                    key={bubble.id}
                    ref={isResizingThis ? (el) => { if (el) resizingSpeechBubbleElRef.current = el; } : undefined}
                    role={panelEditorLeftTab === "dialogue" && !isResizingThis ? "button" : undefined}
                    className={`group absolute z-20 overflow-visible transition-[box-shadow,ring] duration-150 ${panelEditorLeftTab === "dialogue" ? "cursor-grab active:cursor-grabbing ring-2 ring-primary/60" : ""} ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    style={{ left: geom.x, top: geom.y, width: geom.width, height: totalH, pointerEvents: panelEditorLeftTab === "dialogue" ? "auto" : "none" }}
                    onPointerDown={panelEditorLeftTab === "dialogue" && !isResizingThis && !isResizingSpeechBubbleRef.current ? (e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      const canvasEl = canvasRefByPanel.current[panel.id];
                      if (!canvasEl) return;
                      const rect = canvasEl.getBoundingClientRect();
                      const _dragScale = canvasEl.offsetWidth > 0 ? canvasEl.getBoundingClientRect().width / canvasEl.offsetWidth : 1;
                      const startMouseX = (e.clientX - rect.left) / _dragScale;
                      const startMouseY = (e.clientY - rect.top) / _dragScale;
                      const el = e.currentTarget as HTMLDivElement;
                      draggingSpeechBubbleElRef.current = el;
                      draggingSpeechBubbleDataRef.current = { panelId: panel.id, bubbleId: bubble.id, startX: geom.x, startY: geom.y, startMouseX, startMouseY, width: geom.width, height: totalH, rectLeft: rect.left, rectTop: rect.top };
                      const ghost = dragSpeechBubbleGhostRefByPanel.current[panel.id];
                      if (ghost) {
                        ghost.style.display = "block";
                        ghost.style.left = `${geom.x}px`;
                        ghost.style.top = `${geom.y}px`;
                        ghost.style.width = `${geom.width}px`;
                        ghost.style.height = `${totalH}px`;
                      }
                      el.style.opacity = "0.35";
                      const panelH = getPanelHeight(panel);
                      const onPointerMove = (ev: PointerEvent) => {
                        const data = draggingSpeechBubbleDataRef.current;
                        if (!data) return;
                        const canvas = canvasRefByPanel.current[data.panelId];
                        const r = canvas?.getBoundingClientRect();
                        const _cbMs = canvas && canvas.offsetWidth > 0 ? r!.width / canvas.offsetWidth : 1;
                        const canvasMouseX = r ? (ev.clientX - r.left) / _cbMs : (ev.clientX - data.rectLeft) / zoomRef.current;
                        const canvasMouseY = r ? (ev.clientY - r.top) / _cbMs : (ev.clientY - data.rectTop) / zoomRef.current;
                        const newX = Math.max(0, Math.min(PANEL_WIDTH - data.width, data.startX + (canvasMouseX - data.startMouseX)));
                        const newY = Math.max(0, Math.min(panelH - data.height, data.startY + (canvasMouseY - data.startMouseY)));
                        const g = dragSpeechBubbleGhostRefByPanel.current[data.panelId];
                        if (g) { g.style.left = `${newX}px`; g.style.top = `${newY}px`; }
                      };
                      const onPointerUp = (ev: PointerEvent) => {
                        if (ev.button !== 0) return;
                        document.removeEventListener("pointermove", onPointerMove, true);
                        document.removeEventListener("pointerup", onPointerUp, true);
                        const data = draggingSpeechBubbleDataRef.current;
                        draggingSpeechBubbleDataRef.current = null;
                        const dragEl = draggingSpeechBubbleElRef.current;
                        if (dragEl) { dragEl.style.opacity = ""; draggingSpeechBubbleElRef.current = null; }
                        const g = data && dragSpeechBubbleGhostRefByPanel.current[data.panelId];
                        if (g) g.style.display = "none";
                        if (!data) return;
                        const canvas = canvasRefByPanel.current[data.panelId];
                        const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
                        const panelUp = currentPanels.find((p) => p.id === data.panelId);
                        const speechBubblesUp = getPanelSpeechBubbles(panelUp ?? panel);
                        if (!canvas) return;
                        const { x: canvasMouseX, y: canvasMouseY } = viewportToCanvas(canvas, ev.clientX, ev.clientY);
                        const clampedX = Math.max(0, Math.min(PANEL_WIDTH - data.width, Math.round(data.startX + (canvasMouseX - data.startMouseX))));
                        const clampedY = Math.max(0, Math.min(getPanelHeight(panelUp ?? panel) - data.height, Math.round(data.startY + (canvasMouseY - data.startMouseY))));
                        const next = speechBubblesUp.map((b) => b.id === data.bubbleId ? { ...b, position: { x: clampedX, y: clampedY } } : b);
                        queryClient.cancelQueries({ queryKey: panelsQueryKey });
                        const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
                        queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === data.panelId ? { ...p, speech_bubbles: next as unknown as Json } : p))));
                        updatePanelMutation.mutate(
                          { id: data.panelId, updates: { speech_bubbles: next as unknown as Json } },
                          {
                            onError: (err) => {
                              if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels);
                              toast({ title: "Erreur", description: err.message, variant: "destructive" });
                            },
                          }
                        );
                      };
                      document.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
                      document.addEventListener("pointerup", onPointerUp, true);
                    } : undefined}
                    onClick={panelEditorLeftTab === "dialogue" ? (e) => { e.stopPropagation(); setSelectedSpeechBubbleIdInModal({ panelId: panel.id, bubbleId: bubble.id }); } : undefined}
                  >
                    {bubble.type !== "text" && (
                      <svg width="100%" height="100%" viewBox={bubble.type === "narration" ? SPEECH_BUBBLE_VIEWBOX_NARRATION : SPEECH_BUBBLE_VIEWBOX_WITH_TAIL} className="absolute inset-0 pointer-events-none" preserveAspectRatio="none">
                        <SpeechBubbleShape type={bubble.type} fill={fillColor} stroke={strokeColor} />
                      </svg>
                    )}
                    <div
                      className="absolute inset-0 flex items-center justify-center text-center px-2 py-1 pointer-events-none"
                      style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily === "inherit" ? undefined : fontFamily, color, height: bubble.type === "narration" || bubble.type === "text" ? geom.height : (totalH * 100) / 120 }}
                    >
                      <span className="line-clamp-3 break-words">{bubble.text || "…"}</span>
                    </div>
                    {panelEditorLeftTab === "dialogue" && isSelected && !isResizingThis && [
                      { edge: "r" as const, style: { right: 0, top: 0, bottom: 0, width: 8 }, cursor: "ew-resize" },
                      { edge: "b" as const, style: { bottom: 0, left: 0, right: 0, height: 8 }, cursor: "ns-resize" },
                      { edge: "l" as const, style: { left: 0, top: 0, bottom: 0, width: 8 }, cursor: "ew-resize" },
                      { edge: "t" as const, style: { top: 0, left: 0, right: 0, height: 8 }, cursor: "ns-resize" },
                      { edge: "tl" as const, style: { left: 0, top: 0, width: 12, height: 12 }, cursor: "nwse-resize" },
                      { edge: "tr" as const, style: { right: 0, top: 0, width: 12, height: 12 }, cursor: "nesw-resize" },
                      { edge: "br" as const, style: { right: 0, bottom: 0, width: 12, height: 12 }, cursor: "nwse-resize" },
                      { edge: "bl" as const, style: { left: 0, bottom: 0, width: 12, height: 12 }, cursor: "nesw-resize" },
                    ].map(({ edge, style, cursor }) => (
                      <div
                        key={edge}
                        className="absolute z-10 rounded-sm bg-primary/30 hover:bg-primary/50"
                        style={{ ...style, cursor }}
                        onPointerDown={(ev) => {
                          if (ev.button !== 0) return;
                          ev.preventDefault();
                          ev.stopPropagation();
                          isResizingSpeechBubbleRef.current = true;
                          resizeSpeechBubbleCaptureTargetRef.current = ev.currentTarget as HTMLElement;
                          (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
                          setResizingSpeechBubbleState({ panelId: panel.id, bubbleId: bubble.id, edge, start: { x: geom.x, y: geom.y, w: geom.width, h: geom.height }, startMouse: { x: ev.clientX, y: ev.clientY } });
                          setResizeSpeechBubbleDraft({ x: geom.x, y: geom.y, width: geom.width, height: geom.height });
                          resizeSpeechBubbleDraftRef.current = { x: geom.x, y: geom.y, width: geom.width, height: geom.height };
                          saveResizeSpeechBubbleRef.current = (draft) => {
                            const roundedDraft = { x: Math.round(draft.x), y: Math.round(draft.y), width: Math.round(draft.width), height: Math.round(draft.height) };
                            const currentPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey) ?? [];
                            const currentPanel = currentPanels.find((p) => p.id === panel.id);
                            const list = getPanelSpeechBubbles(currentPanel ?? panel);
                            const next = list.map((b) => b.id === bubble.id ? { ...b, position: { x: roundedDraft.x, y: roundedDraft.y }, width: roundedDraft.width, height: roundedDraft.height } : b);
                            queryClient.cancelQueries({ queryKey: panelsQueryKey });
                            const previousPanels = queryClient.getQueryData<Panel[]>(panelsQueryKey);
                            queryClient.setQueryData<Panel[]>(panelsQueryKey, (old) => (!old ? old : old.map((p) => (p.id === panel.id ? { ...p, speech_bubbles: next as unknown as Json } : p))));
                            setResizingSpeechBubbleState(null);
                            setResizeSpeechBubbleDraft(null);
                            resizeSpeechBubbleDraftRef.current = null;
                            lastResizeSpeechBubbleMouseRef.current = null;
                            resizeSpeechBubbleCaptureTargetRef.current = null;
                            resizingSpeechBubbleElRef.current = null;
                            isResizingSpeechBubbleRef.current = false;
                            updatePanelMutation.mutate(
                              { id: panel.id, updates: { speech_bubbles: next as unknown as Json } },
                              {
                                onSuccess: () => {},
                                onError: (err) => {
                                  if (previousPanels != null) queryClient.setQueryData(panelsQueryKey, previousPanels);
                                  toast({ title: "Erreur", description: err.message, variant: "destructive" });
                                },
                              }
                            );
                          };
                        }}
                        aria-label="Redimensionner la bulle"
                      />
                    ))}
                  </div>
                );
              })}
              {/* Ghost de drag pour bulles de dialogue */}
              <div
                ref={(el) => { if (el) dragSpeechBubbleGhostRefByPanel.current[panel.id] = el; }}
                aria-hidden
                className="pointer-events-none absolute z-50 border-2 border-primary border-dashed bg-white/50 rounded-[50%] box-border"
                style={{ display: "none", left: 0, top: 0, width: 100, height: 100 }}
              />
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
