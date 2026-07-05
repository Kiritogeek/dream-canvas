import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useBackgroundJobs } from "@/contexts/BackgroundJobsContext";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
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
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useScenarioChapter,
  useUpdateScenarioChapter,
  useScenarioChapters,
  useCreateScenarioChapter,
  useValidateChapter,
  useUnvalidateChapter,
  useChapterAssets,
  useValidateChapterAssets,
  useUnvalidateChapterAssets,
  useUpdateChapterAssets,
} from "@/hooks/useScenarioChapters";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProject, useUpdateProject } from "@/hooks/useProjects";
import { useChapters } from "@/hooks/useChapters";
import { ArianeAnalysisModal } from "@/components/project/ArianeAnalysisModal";
import { getMaxAccessibleTab, useProgressiveMenuAccess } from "@/hooks/useProgressiveMenuGate";
import { useAssets } from "@/hooks/useAssets";
import { useAssetGeneration } from "@/hooks/useAssetGeneration";
import { useActiveLoreAssetProposals } from "@/hooks/useCompassProposals";
import { useGeneratingAssetId } from "@/lib/generationPending";
import { extractSceneHeaderEntities, normalizeEntityName } from "@/services/scenarioChapters";
import { useScenarioAI } from "@/hooks/useScenarioAI";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAuth } from "@/hooks/useAuth";
import { callDetectBlocks, callGenerateAiSummary } from "@/services/scenarioAI";
import type { DetectBlocksDensity } from "@/services/scenarioAI";
import { parseProjectMeta } from "@/lib/projectMeta";
import { useNarraMindDebounce } from "@/hooks/useNarraMindDebounce";
import { useCompassIndex } from "@/hooks/useCompassIndex";
import { estimatePanelCount } from "@/services/panels";
import { ScenarioTextHighlighter } from "@/components/project/ScenarioTextHighlighter";
import { CreateAssetDialog } from "@/components/project/CreateAssetDialog";
import { ChapterStatusBar } from "@/components/project/ChapterStatusBar";
import { useToast } from "@/hooks/use-toast";
import { scrollChapterEditorToExcerpt } from "@/lib/arianeScroll";
import { cn } from "@/lib/utils";
import type { LockedBlock, DetectedBlock, AssetType, Asset } from "@/types";
import { EMPTY_CHAPTER_ASSETS } from "@/types";

/** NarraMind : auto-save uniquement, pas d’appel manuel — garde-fous tokens. */
const NARRAMIND_AUTOSAVE_MIN_WORDS = 80;

// ── Réglages du découpage (persistés par projet, pas de migration) ──

interface DecoupageSettings {
  density: DetectBlocksDensity;
}

const DEFAULT_DECOUPAGE_SETTINGS: DecoupageSettings = { density: "standard" };

const decoupageSettingsKey = (projectId: string) => `dreamweave_decoupage_settings_${projectId}`;

function loadDecoupageSettings(projectId: string | undefined): DecoupageSettings {
  if (!projectId) return DEFAULT_DECOUPAGE_SETTINGS;
  try {
    const raw = localStorage.getItem(decoupageSettingsKey(projectId));
    return raw ? { ...DEFAULT_DECOUPAGE_SETTINGS, ...(JSON.parse(raw) as Partial<DecoupageSettings>) } : DEFAULT_DECOUPAGE_SETTINGS;
  } catch {
    return DEFAULT_DECOUPAGE_SETTINGS;
  }
}

const DECOUPAGE_DENSITY_LABELS: Record<DetectBlocksDensity, string> = {
  aere: "Aéré",
  standard: "Standard",
  dense: "Dense",
};


function stripTypeMarkers(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const m = line.match(/^(\[[^\]]+\])\s*/);
      let cleaned = m ? line.slice(m[0].length) : line;
      cleaned = cleaned.replace(/\*([^*\n]+)\*/g, "$1");
      return cleaned;
    })
    .join("\n");
}

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
          <span style={{ fontSize: 0 }}>{scenePrefix}</span>
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
          <span style={{ fontSize: 0 }}>{blockquotePrefix}</span>
          {renderLineSegments(rest, restStart, null, style)}
        </span>
      );
    } else if (/^-{3,}\s*$/.test(line)) {
      nodes.push(
        <span key={wrapKey}>{renderLineSegments(line, lineStart, null, { color: "hsl(0, 0%, 58%)" })}</span>
      );
    } else {
      if (/«/.test(line)) {
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

const FormatCEditor = memo(function FormatCEditor({
  value,
  onChange,
  textareaRef,
  placeholder,
}: FormatCEditorProps) {
  return (
    <div className="relative min-h-[300px]">
      <div
        aria-hidden="true"
        className="pointer-events-none"
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
});

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
  const { startJob, completeJob, clearJob } = useBackgroundJobs();

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
  const createChapter = useCreateScenarioChapter();
  const validateChapter = useValidateChapter();
  const unvalidateChapter = useUnvalidateChapter();
  const { data: chapterAssets } = useChapterAssets(chapterId);
  const validateChapterAssets = useValidateChapterAssets();
  const unvalidateChapterAssets = useUnvalidateChapterAssets();
  const updateProject = useUpdateProject();
  useAuth();
  const { data: editionChapters = [] } = useChapters(projectId);

  const nextChapterNumber = useMemo(() => {
    const used = new Set(allChapters.map((c) => c.chapter_number));
    let n = 1;
    while (used.has(n)) n++;
    return n;
  }, [allChapters]);
  const chapterAI = useScenarioAI();
  const { plan, usageInfo } = useUserPlan();
  const targetPanels = project?.panels_target_per_chapter ?? null;
  const _isPro = plan === "createur" || plan === "studio";
  const { schedule: scheduleNarraMind } = useNarraMindDebounce();
  const { indexContent } = useCompassIndex();

  // Curation des assets au survol du texte (étape 2) — créer + générer en place.
  const updateChapterAssets = useUpdateChapterAssets();
  const generatingAssetId = useGeneratingAssetId();
  const { data: loreProposals = [] } = useActiveLoreAssetProposals(projectId);
  const { canGenerate: canGenerateAsset, generate: generateAsset } = useAssetGeneration({
    project,
    userPlan: plan,
    usageInfo,
  });

  // Pop-up de création d'asset ouverte depuis le texte du scénario (avec prompt).
  const [scenarioAssetDialogOpen, setScenarioAssetDialogOpen] = useState(false);
  const [scenarioAssetDraft, setScenarioAssetDraft] = useState<{ name: string; type: AssetType } | null>(null);

  // Highlight via ?highlight= param (navigation depuis Fil d'Ariane)
  const [searchParams] = useSearchParams();
  const highlightAnchor = searchParams.get("highlight");
  const [highlightVisible, setHighlightVisible] = useState(false);
  const [highlightFading, setHighlightFading] = useState(false);
  const highlightTriggeredRef = useRef(false);

  // Local state — content / title
  const [content, setContent] = useState("");
  const [wordMappings, setWordMappings] = useState<Record<string, string>>({});

  // Local state — UI
  const [viewMode, setViewMode] = useState<"edit" | "visuels">("edit");
  const [saveState, setSaveState] = useState<"clean" | "dirty" | "saving">(
    "clean"
  );

  // Local state — blocs
  const [lockedBlocks, setLockedBlocks] = useState<LockedBlock[]>([]);
  const [detectedBlocks, setDetectedBlocks] = useState<DetectedBlock[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  // Contenu au moment de la dernière détection — pour P2 warning
  const [detectedAtContent, setDetectedAtContent] = useState("");
  // Track montage pour éviter setState sur composant démonté (background)
  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);
  // Effacer le badge ciseau vert dès que l'utilisateur arrive sur la page du chapitre
  useEffect(() => { if (chapter?.id) clearJob(chapter.id); }, [chapter?.id, clearJob]);

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
  const [showValidateConfirm, setShowValidateConfirm] = useState(false);
  const [showArianeAfterValidation, setShowArianeAfterValidation] = useState(false);
  const [isCreatingEditionChapter, _setIsCreatingEditionChapter] = useState(false);

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
      setContent(stripTypeMarkers(chapter.content ?? ""));
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
        panels: estimatePanelCount(content, targetPanels),
        minutes: totalMins,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [content, lockedBlocks.length, targetPanels]);

  // Regex précompilées par asset (recompilées seulement si la liste d'assets change),
  // au lieu d'une RegExp neuve par asset à chaque frappe.
  const assetNameRegexes = useMemo(
    () =>
      assets
        .map((a) => {
          const name = a.name?.trim();
          if (!name || name.length < 2) return null;
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          return { asset: a, regex: new RegExp(`\\b${escaped}\\b`, "i") };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [assets],
  );

  // Assets mentionnés dans ce chapitre (par correspondance de nom)
  const assetsInChapter = useMemo(() => {
    if (!content || !assets.length) return assets;
    return assetNameRegexes.filter((x) => x.regex.test(content)).map((x) => x.asset);
  }, [assets, content, assetNameRegexes]);

  const canValidateText = useMemo(() => !!content.trim(), [content]);

  const linkedEditionChapter = useMemo(
    () => editionChapters.find((c) => c.linked_scenario_chapter_id === chapter?.id) ?? null,
    [editionChapters, chapter?.id]
  );

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
              indexContent(projectId!, "chapter", chapter.id, content);
            }
          },
          onError: () => setSaveState("dirty"),
        }
      );
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

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

  // ── Réglages du découpage (genre / densité / système) ─────────

  const [decoupageSettings, setDecoupageSettings] = useState<DecoupageSettings>(() => loadDecoupageSettings(projectId));
  const [decoupageDialogOpen, setDecoupageDialogOpen] = useState(false);
  // Genre + tonalité viennent du PROJET (onglet Paramètres) — source unique, plus de duplication.
  const decoupageMeta = useMemo(() => parseProjectMeta(project?.description), [project?.description]);
  useEffect(() => {
    setDecoupageSettings(loadDecoupageSettings(projectId));
  }, [projectId]);
  const updateDecoupageSettings = useCallback((updates: Partial<DecoupageSettings>) => {
    setDecoupageSettings((prev) => {
      const next = { ...prev, ...updates };
      if (projectId) {
        try {
          localStorage.setItem(decoupageSettingsKey(projectId), JSON.stringify(next));
        } catch { /* storage indisponible */ }
      }
      return next;
    });
  }, [projectId]);

  // ── Détecter les blocs ────────────────────────────────────────

  const handleDetectBlocks = useCallback(async () => {
    if (!chapter || !content.trim()) return;
    setIsDetecting(true);
    // Capturer les valeurs avant tout await (navigation possible pendant l'attente)
    const capturedChapterId = chapter.id;
    const capturedChapterNumber = chapter.chapter_number;
    const capturedChapterTitle = chapter.title;
    const capturedContent = content;
    const capturedProjectId = projectId!;
    startJob(capturedChapterId, capturedChapterNumber);
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
        chapter_content: capturedContent,
        chapter_title: capturedChapterTitle,
        chapter_number: capturedChapterNumber,
        target_panel_count: project?.panels_target_per_chapter ?? undefined,
        assets_context: assetsContext,
        universe_lore: project?.universe_lore?.trim() || undefined,
        text_density: decoupageSettings.density,
        genre: decoupageMeta.genre || undefined,
        tone: decoupageMeta.tone || undefined,
        // L'utilisateur crée ses fenêtres système à la main dans l'Édition → l'IA n'en génère jamais.
        allow_system_windows: false,
      });

      // Sauvegarder en BDD quelle que soit la navigation courante
      if (result.blocks.length > 0) {
        updateChapter.mutate({
          id: capturedChapterId,
          projectId: capturedProjectId,
          updates: {
            panels_outline: result.blocks.map((b) => ({ ...b, locked: false })),
          },
        });
        completeJob(capturedChapterId);
      } else {
        clearJob(capturedChapterId);
      }

      // Mise à jour UI uniquement si encore sur la page
      if (isMountedRef.current) {
        if (result.blocks.length === 0) {
          toast({
            title: "Aucune case détectée",
            description: "Le chapitre est peut-être trop court.",
          });
        } else {
          setDetectedBlocks(result.blocks);
          setDetectedAtContent(capturedContent);
          setViewMode("visuels");
        }
      }
    } catch (err) {
      clearJob(capturedChapterId);
      if (isMountedRef.current) {
        toast({
          title: "Erreur",
          description: (err as Error).message,
          variant: "destructive",
        });
      }
    } finally {
      if (isMountedRef.current) setIsDetecting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, content, toast, decoupageSettings, decoupageMeta]);

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

  const allBlocksLocked = useMemo(
    () => cases.length > 0 && cases.every((c) => lockedKeySet.has(`${c.panel_number}-${c.block_number}`)),
    [cases, lockedKeySet]
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
        project_id: projectId ?? undefined,
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
  }, [chapter, chapterAIPrompt, content, projectId, chapterAI, toast]);

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

  // « Créer l'asset » au survol : ouvre la pop-up de création (nom + prompt), sans quitter le scénario.
  const handleCreateAssetFromText = useCallback((name: string, type: AssetType) => {
    if (!canGenerateAsset()) return;
    setScenarioAssetDraft({ name, type });
    setScenarioAssetDialogOpen(true);
  }, [canGenerateAsset]);

  // Après création depuis la pop-up : lier le nouvel asset au chapitre courant.
  const handleAssetCreatedFromScenario = useCallback((asset: Asset) => {
    const items = (chapterAssets?.items ?? []).filter((it) => it.asset_id !== asset.id);
    items.push({ asset_id: asset.id, status: "added" });
    updateChapterAssets.mutate({
      chapterId,
      projectId: projectId!,
      state: { ...(chapterAssets ?? EMPTY_CHAPTER_ASSETS), items },
    });
  }, [chapterAssets, chapterId, projectId, updateChapterAssets]);

  const handleGenerateAsset = useCallback((asset: Asset) => {
    if (!canGenerateAsset()) return;
    void generateAsset(asset);
  }, [canGenerateAsset, generateAsset]);

  // Noms « à créer » surlignés ambre : en-têtes de scène ∪ propositions Ariane, sans asset existant.
  const extraCreatableNames = useMemo(() => {
    const existing = new Set(assets.map((a) => normalizeEntityName(a.name ?? "")));
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (raw: string) => {
      const nm = raw.trim();
      if (nm.length < 2) return;
      const norm = normalizeEntityName(nm);
      if (!norm || existing.has(norm) || seen.has(norm)) return;
      seen.add(norm);
      out.push(nm);
    };
    for (const e of extractSceneHeaderEntities(content)) add(e.name);
    for (const p of loreProposals) add(p.title);
    return out;
  }, [assets, content, loreProposals]);

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

  const handleEditChapter = useCallback(() => {
    if (!chapter || !projectId) return;
    if (linkedEditionChapter) {
      navigate(`/dashboard/projects/${projectId}/chapter/${linkedEditionChapter.id}`);
      return;
    }
    // Rediriger vers l'onglet Édition avec le dialog de création pré-ouvert
    navigate(`/dashboard/projects/${projectId}?tab=edition`, {
      state: { openCreate: true, defaultTitle: chapter.title },
    });
  }, [chapter, projectId, linkedEditionChapter, navigate]);

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

  // Machine à 3 états dérivée de 2 marqueurs : chapter.validated + chapter_assets.validated
  const textValidated = chapter.validated ?? false;
  const assetsValidated = chapterAssets?.validated ?? false;
  const editorStep: "edit" | "assets" | "cut" = !textValidated
    ? "edit"
    : !assetsValidated
      ? "assets"
      : "cut";
  // Le texte est verrouillé dès l'étape ASSETS (lecture seule).
  const isTextLocked = editorStep !== "edit";

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* HEADER */}
      <header className="h-12 border-b border-border bg-background/95 backdrop-blur-xl sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 shrink-0">
        {/* Colonne gauche : retour */}
        <Link
          to={`/dashboard/projects/${projectId}?tab=scenario`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group w-fit"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Retour au projet
        </Link>

        {/* Colonne centre : titre + badge validé */}
        <div className="flex items-center justify-center gap-2">
          <span className={`text-sm font-medium whitespace-nowrap transition-colors ${isTextLocked ? "text-emerald-500 dark:text-emerald-400" : "text-foreground"}`}>
            Chapitre {chapter.chapter_number}
          </span>
          {isTextLocked && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5 shrink-0">
              <Lock className="h-2.5 w-2.5" />
              {editorStep === "assets" ? "Texte" : "Validé"}
            </span>
          )}
        </div>

        {/* Colonne droite : stats + save */}
        <div className="flex items-center justify-end gap-2">
          {readingInfo && (
            <>
              <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
                <Type className="h-3 w-3" />
                {readingInfo.words.toLocaleString("fr-FR")} mots
              </span>
              <span className="hidden sm:flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full px-2.5 py-1">
                <Layers className="h-3 w-3" />
                {cases.length > 0
                  ? `${cases.length} case${cases.length > 1 ? "s" : ""}`
                  : `~${readingInfo.panels} cases`}
              </span>
              {lockedBlocks.length > 0 && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {lockedBlocks.length} validée{lockedBlocks.length > 1 ? "s" : ""}
                </span>
              )}
            </>
          )}

          {!isTextLocked && (
            <>
              <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                {saveState === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /><span className="hidden sm:inline">Sauvegarde...</span></>}
                {saveState === "clean" && <Check className="h-3 w-3 text-emerald-500" />}
                {saveState === "dirty" && <span className="text-amber-500">•</span>}
              </div>

              <Button
                size="sm"
                onClick={handleManualSave}
                disabled={saveState === "clean" || saveState === "saving"}
                className="h-7 gap-1.5 gradient-primary text-primary-foreground shrink-0 text-xs"
              >
                <Save className="h-3 w-3" />
                <span className="hidden sm:inline">Sauvegarder</span>
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="outline"
            disabled={createChapter.isPending}
            onClick={() => {
              createChapter.mutate(
                { project_id: projectId!, title: `Chapitre ${nextChapterNumber}`, chapter_number: nextChapterNumber, content: null },
                {
                  onSuccess: (newChapter) => navigate(`/dashboard/projects/${projectId}/scenario/${newChapter.id}`),
                  onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
                }
              );
            }}
            className="h-7 gap-1.5 shrink-0 text-xs border-[hsl(var(--lavender)/0.4)] text-[hsl(var(--lavender))] hover:bg-[hsl(var(--lavender)/0.08)]"
            title={`Créer et ouvrir le chapitre ${nextChapterNumber}`}
          >
            <ArrowRight className="h-3 w-3" />
            <span className="hidden sm:inline">Ch. {nextChapterNumber}</span>
          </Button>
        </div>
      </header>

      {/* MAIN ZONE */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar fine — toggle Écriture/Cases */}
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
                  Cases
                  {cases.length > 0 && (
                    <span className="ml-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded px-1">
                      {cases.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {editorStep === "assets" && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Package className="h-3 w-3" />
                Curation des assets
              </div>
            )}
          </div>

          {/* Zone principale — texte (curation des assets au survol en étape assets) */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Zone texte scrollable — UNE scrollbar */}
          <div
            ref={scrollContainerRef}
            className={`flex-1 min-w-0 ${chapterAIResult ? "overflow-hidden flex flex-col min-h-0" : "overflow-y-auto"}`}
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
              ) : isTextLocked ? (
                <>
                  <ScenarioTextHighlighter
                    text={content}
                    assets={assets}
                    wordMappings={wordMappings}
                    onAssignWord={editorStep === "assets" ? handleAssignWord : undefined}
                    onCreateAsset={editorStep === "assets" ? handleCreateAssetFromText : undefined}
                    onDismissMissing={editorStep === "assets" ? handleDismissMissing : undefined}
                    dismissedMissingNames={dismissedMissingNames}
                    extraCreatableNames={extraCreatableNames}
                    onGenerateAsset={editorStep === "assets" ? handleGenerateAsset : undefined}
                    generatingAssetId={generatingAssetId}
                    className=""
                    hideIndicator
                  />
                  <div style={{ height: "40vh" }} />
                </>
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

          </div>

          <ChapterStatusBar
            tab={viewMode === "visuels" ? "cases" : "ecriture"}
            wordCount={readingInfo?.words ?? 0}
            casesCount={cases.length}
            validatedCount={lockedBlocks.length}
            assetsGenerated={assetsInChapter.filter((a) => !!a.image_url).length}
            assetsUngenerated={assetsInChapter.filter((a) => !a.image_url).length}
            saveState={saveState}
            isValidated={isTextLocked}
            validatedLabel={editorStep === "assets" ? "Texte validé" : "Chapitre validé"}
            onShowUngenerated={() => {}}
          />
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

      {/* FAB EDIT — pills flottantes bas-droite (pas de panneau en étape EDIT). */}
      {editorStep === "edit" && !chapterAIResult && !showIABar && (
        <div className="fixed bottom-12 right-6 flex flex-col items-end gap-2.5 z-40">
          <button
            onClick={() => setShowIABar(true)}
            className="flex items-center gap-2 pl-3.5 pr-4 h-10 rounded-full bg-background/95 backdrop-blur-xl border border-border hover:border-primary/50 shadow-md text-sm font-medium text-primary transition-[box-shadow,border-color,transform] duration-200 hover:shadow-glow hover:scale-[1.03]"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>IA Chapitre</span>
          </button>

          <button
            onClick={() => canValidateText && setShowValidateConfirm(true)}
            disabled={!canValidateText}
            title={!content.trim() ? "Le chapitre est vide" : undefined}
            className="flex items-center gap-2 pl-4 pr-5 h-12 rounded-full text-sm font-semibold bg-background/95 backdrop-blur-xl border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-md hover:bg-emerald-500/8 hover:scale-[1.03] transition-[box-shadow,transform,opacity] duration-200 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Lock className="h-4 w-4 shrink-0" />
            <span>Valider le texte</span>
          </button>
        </div>
      )}

      {/* FAB ASSETS — flottants bas-droite, en toutes vues (plus de panneau, donc plus de collision). */}
      {editorStep === "assets" && !chapterAIResult && (
        <div className="fixed bottom-12 right-6 flex flex-col items-end gap-2.5 z-40">
          <button
            onClick={() => {
          unvalidateChapter.mutate({ id: chapter.id, projectId: projectId! });
          if (chapterAssets?.validated) {
            unvalidateChapterAssets.mutate({ chapterId: chapter.id, projectId: projectId!, state: chapterAssets });
          }
        }}
            disabled={unvalidateChapter.isPending}
            className="flex items-center gap-2 pl-3.5 pr-4 h-9 rounded-full bg-background/95 backdrop-blur-xl border border-border/60 hover:border-border shadow-md text-xs font-medium text-muted-foreground hover:text-foreground transition-[box-shadow,border-color,transform,color] duration-200 hover:scale-[1.03] disabled:opacity-50"
          >
            {unvalidateChapter.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            ) : (
              <Unlock className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>Déverrouiller le texte</span>
          </button>

          <button
            onClick={() =>
              validateChapterAssets.mutate({
                chapterId: chapter.id,
                projectId: projectId!,
                state: chapterAssets ?? EMPTY_CHAPTER_ASSETS,
              })
            }
            disabled={validateChapterAssets.isPending}
            className="flex items-center gap-2 pl-4 pr-5 h-12 rounded-full text-sm font-semibold gradient-primary text-primary-foreground shadow-dream hover:scale-[1.03] transition-[box-shadow,transform,opacity] duration-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            {validateChapterAssets.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Lock className="h-4 w-4 shrink-0" />
            )}
            <span>Valider les assets</span>
          </button>
        </div>
      )}

      {/* FAB CUT — flottants bas-droite, en toutes vues (plus de panneau, donc plus de collision). */}
      {editorStep === "cut" && !chapterAIResult && (
        <div className="fixed bottom-12 right-6 flex flex-col items-end gap-2.5 z-40">
          <button
            onClick={() =>
              unvalidateChapterAssets.mutate({
                chapterId: chapter.id,
                projectId: projectId!,
                state: chapterAssets ?? EMPTY_CHAPTER_ASSETS,
              })
            }
            disabled={unvalidateChapterAssets.isPending}
            className="flex items-center gap-2 pl-3.5 pr-4 h-9 rounded-full bg-background/95 backdrop-blur-xl border border-border/60 hover:border-border shadow-md text-xs font-medium text-muted-foreground hover:text-foreground transition-[box-shadow,border-color,transform,color] duration-200 hover:scale-[1.03] disabled:opacity-50"
          >
            {unvalidateChapterAssets.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            ) : (
              <Package className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>Modifier les assets</span>
          </button>

          {allBlocksLocked ? (
            <button
              onClick={handleEditChapter}
              disabled={isCreatingEditionChapter}
              className="flex items-center gap-2 pl-4 pr-5 h-12 rounded-full text-sm font-semibold gradient-primary text-primary-foreground shadow-dream hover:scale-[1.03] transition-[box-shadow,transform,opacity] duration-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isCreatingEditionChapter ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>Création…</span>
                </>
              ) : (
                <>
                  <PenLine className="h-4 w-4 shrink-0" />
                  <span>{linkedEditionChapter ? "Éditer le chapitre" : "Créer & éditer"}</span>
                </>
              )}
            </button>
          ) : (
            <Dialog open={decoupageDialogOpen} onOpenChange={setDecoupageDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  disabled={isDetecting || !content.trim() || (cases.length > 0 && detectedAtContent !== "" && content === detectedAtContent)}
                  className="flex items-center gap-2 pl-4 pr-5 h-12 rounded-full text-sm font-semibold gradient-primary text-primary-foreground shadow-dream hover:scale-[1.03] transition-[box-shadow,transform,opacity] duration-200 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span>Découpage en cours…</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="h-4 w-4 shrink-0" />
                      <span>Découper en cases</span>
                    </>
                  )}
                </button>
              </DialogTrigger>
              <DialogContent className="glass sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-display text-base flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-primary shrink-0" />
                    Réglages du découpage
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Genre & tonalité</label>
                    <div className="flex flex-wrap gap-1.5">
                      {decoupageMeta.genre ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{decoupageMeta.genre}</span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">Aucun genre défini</span>
                      )}
                      {decoupageMeta.tone && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">{decoupageMeta.tone}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Définis dans <button type="button" onClick={() => navigate(`/dashboard/projects/${projectId}?tab=parametres`)} className="text-primary hover:underline font-medium">Paramètres du projet</button>. Ils calibrent le nombre de cases, les SFX et le registre.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Densité de texte</label>
                    <div className="flex gap-1.5">
                      {(Object.entries(DECOUPAGE_DENSITY_LABELS) as [DetectBlocksDensity, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateDecoupageSettings({ density: value })}
                          className={cn(
                            "flex-1 h-8 rounded-lg border text-xs font-medium transition-colors",
                            decoupageSettings.density === value
                              ? "border-primary/60 bg-primary/15 text-primary"
                              : "border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">Aéré : peu de texte, plus de cases muettes. Dense : plus de bulles par case.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDecoupageDialogOpen(false); handleDetectBlocks(); }}
                    disabled={isDetecting}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold gradient-primary text-primary-foreground shadow-dream hover:shadow-glow transition-[box-shadow,transform] duration-200 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Scissors className="h-4 w-4 shrink-0" />
                    <span>Lancer le découpage</span>
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* Popup confirmation validation — ouvre l'analyse Ariane bloquante avant de valider */}
      <Dialog open={showValidateConfirm} onOpenChange={setShowValidateConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Valider le texte du Chapitre {chapter?.chapter_number} ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Le texte passera en lecture seule. Ariane relira d'abord votre chapitre, puis vous
            passerez à la curation des assets.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowValidateConfirm(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                setShowValidateConfirm(false);
                setShowArianeAfterValidation(true);
              }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Lock className="h-3.5 w-3.5" />
              Analyser et valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Ariane — analyse bloquante avant de valider le texte (puis passage à l'étape assets) */}
      {chapter && (
        <ArianeAnalysisModal
          isOpen={showArianeAfterValidation}
          onClose={() => setShowArianeAfterValidation(false)}
          onComplete={() => {
            validateChapter.mutate(
              { id: chapter.id, projectId: projectId! },
              {
                onSuccess: () => setShowArianeAfterValidation(false),
                onError: () => {
                  setShowArianeAfterValidation(false);
                  toast({
                    title: "Erreur",
                    description: "Impossible de valider le chapitre.",
                    variant: "destructive",
                  });
                },
              }
            );
          }}
          projectId={projectId!}
          chapterId={chapter.id}
          chapterContent={content}
          chapterNumber={chapter.chapter_number}
        />
      )}

      <CreateAssetDialog
        open={scenarioAssetDialogOpen}
        onOpenChange={setScenarioAssetDialogOpen}
        projectId={projectId!}
        assets={assets}
        onGenerate={handleGenerateAsset}
        initialName={scenarioAssetDraft?.name}
        initialType={scenarioAssetDraft?.type}
        onCreated={handleAssetCreatedFromScenario}
      />
    </div>
  );
}
