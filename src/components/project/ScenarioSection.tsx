import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  LayoutTemplate,
  User,
  ImageIcon,
  Package,
  MousePointer2,
  ArrowRight,
  CheckCircle2,
  Compass,
  Lock,
  Scissors,
  FileText,
} from "lucide-react";
import { useBackgroundJobs } from "@/contexts/BackgroundJobsContext";
import { ArianeNarrativeSheet } from "./ArianeNarrativeSheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import {
  useScenarioChapters,
  useCreateScenarioChapter,
  useDeleteScenarioChapter,
  useReorderScenarioChapters,
  useValidateChapter,
} from "@/hooks/useScenarioChapters";
import { useScenarioAI } from "@/hooks/useScenarioAI";
import { useNarrativeDirections } from "@/hooks/useNarrativeDirections";
import { AIChapterPreviewModal } from "@/components/project/AIChapterPreviewModal";
import { estimatePanelCount } from "@/services/panels";
import { triggerCompassIndex, triggerCompassPropose } from "@/services/compassIndex";
import { triggerNarraMindUpdate } from "@/services/scenarioAI";
import { getDetectedAssets, detectMissingNames } from "@/components/project/ScenarioTextHighlighter";
import { parseProjectMeta } from "@/lib/projectMeta";
import type { Project, ScenarioChapter, Asset, AssetType } from "@/types";

// ── Props ─────────────────────────────────────────────────────

interface ScenarioSectionProps {
  projectId: string;
  project: Project;
  assets?: Asset[];
  /** Navigue vers l'onglet Assets avec le dialog de création pré-rempli */
  onNavigateToCreateAsset?: (name: string, type: AssetType) => void;
}

const SCENARIO_RECENT_CHAPTERS_FOR_IA = 5;

// ── Composant principal ───────────────────────────────────────

export function ScenarioSection({ projectId, project, assets = [] }: ScenarioSectionProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const aiBlockRef = useRef<HTMLDivElement>(null);

  const { data: chapters = [], isLoading } = useScenarioChapters(projectId);
  const createChapter = useCreateScenarioChapter();
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const deleteChapterMutation = useDeleteScenarioChapter();
  const reorderChapters = useReorderScenarioChapters();
  const scenarioAI = useScenarioAI();
  const narrativeDirections = useNarrativeDirections(projectId);

  const nextChapterNumber = useMemo(() => {
    const used = new Set(chapters.map((c) => c.chapter_number));
    let next = 1;
    while (used.has(next)) next++;
    return next;
  }, [chapters]);

  const chapterNumberChoices = useMemo(() => {
    const usedNumbers = Array.from(new Set(chapters.map((c) => c.chapter_number))).sort(
      (a, b) => a - b
    );
    if (usedNumbers.length === 0) return [1];
    const maxNumber = usedNumbers[usedNumbers.length - 1];
    const holes: number[] = [];
    for (let i = 1; i <= maxNumber; i++) {
      if (!usedNumbers.includes(i)) holes.push(i);
    }
    if (holes.length === 0) return [nextChapterNumber];
    return [...holes, maxNumber + 1];
  }, [chapters, nextChapterNumber]);

  const hasChapterNumberHoles = chapterNumberChoices.some(
    (n) => n < (Math.max(0, ...chapters.map((c) => c.chapter_number)) + 1)
  );

  const [deleteTarget, setDeleteTarget] = useState<ScenarioChapter | null>(null);
  const [showChapitreType, setShowChapitreType] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showChapterChoiceDialog, setShowChapterChoiceDialog] = useState(false);
  const [narrativeSheetOpen, setNarrativeSheetOpen] = useState(false);
  const [selectedAiChapterNumber, setSelectedAiChapterNumber] = useState<number>(
    chapterNumberChoices[0] ?? nextChapterNumber
  );

  // Amorce du Chapitre 1 : le synopsis décrit le début de l'histoire, il pré-remplit
  // le prompt tant qu'aucun chapitre n'existe (une seule fois, sans écraser une saisie).
  const projectSynopsis = useMemo(
    () => parseProjectMeta(project.description).synopsis.trim(),
    [project.description]
  );
  const didSeedPromptRef = useRef(false);
  useEffect(() => {
    if (didSeedPromptRef.current || isLoading) return;
    didSeedPromptRef.current = true;
    if (chapters.length === 0 && projectSynopsis && !aiPrompt.trim()) {
      setAiPrompt(projectSynopsis);
    }
  }, [isLoading, chapters.length, projectSynopsis, aiPrompt]);

  const showSynopsisHint =
    chapters.length === 0 && !!projectSynopsis && aiPrompt.trim() === projectSynopsis;

  const runScenarioGeneration = useCallback(
    (targetChapterNumber: number) => {
      const promptText = aiPrompt.trim();
      if (!promptText) {
        toast({
          title: "Prompt requis",
          description: "Décrivez votre histoire pour que l'IA puisse la créer.",
          variant: "destructive",
        });
        return;
      }
      setSelectedAiChapterNumber(targetChapterNumber);
      const recentChapters = chapters.slice(-SCENARIO_RECENT_CHAPTERS_FOR_IA);
      const existingContent =
        recentChapters.length > 0
          ? recentChapters
              .map((c, index) => {
                const isLast = index === recentChapters.length - 1;
                if (isLast) {
                  const content = c.content?.trim() ?? "(vide)";
                  return `Chapitre ${c.chapter_number} : ${c.title}\n${content}`;
                }
                const summary = (c as { ai_summary?: string | null }).ai_summary?.trim();
                if (summary) {
                  return `Chapitre ${c.chapter_number} (${c.title}) — résumé : ${summary}`;
                }
                const snippet = c.content?.slice(0, 400) ?? "(vide)";
                return `Chapitre ${c.chapter_number} : ${c.title}\n${snippet}${c.content && c.content.length > 400 ? "…" : ""}`;
              })
              .join("\n\n")
          : undefined;

      scenarioAI.mutate(
        {
          mode: "scenario",
          prompt: promptText,
          existing_content: existingContent,
          project_description: project.description ?? undefined,
          next_chapter_number: targetChapterNumber,
          project_id: projectId,
        },
        {
          onSuccess: (data) => {
            setAiResult(data.text);
            toast({ title: "Scénario généré par l'IA" });
          },
          onError: () =>
            toast({ title: "Génération IA indisponible", description: "Le service IA est temporairement indisponible. Réessayez dans quelques instants.", variant: "destructive" }),
        }
      );
    },
    [aiPrompt, chapters, project.description, projectId, scenarioAI, toast]
  );

  const handleMoveChapter = useCallback(
    (chapterId: string, direction: "up" | "down") => {
      const idx = chapters.findIndex((c) => c.id === chapterId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= chapters.length) return;

      const current = chapters[idx];
      const neighbor = chapters[swapIdx];

      reorderChapters.mutate(
        {
          projectId,
          chapters: [
            { id: current.id, chapter_number: neighbor.chapter_number },
            { id: neighbor.id, chapter_number: current.chapter_number },
          ],
        },
        {
          onError: (err) =>
            toast({ title: "Erreur", description: err.message, variant: "destructive" }),
        }
      );
    },
    [chapters, projectId, reorderChapters, toast]
  );

  const handleCreateChapter = useCallback(
    (initialContent?: string) => {
      createChapter.mutate(
        {
          project_id: projectId,
          title: `Chapitre ${nextChapterNumber}`,
          chapter_number: nextChapterNumber,
          content: initialContent ?? null,
        },
        {
          onSuccess: () => toast({ title: "Chapitre créé" }),
          onError: (err) =>
            toast({ title: "Erreur", description: err.message, variant: "destructive" }),
        }
      );
    },
    [nextChapterNumber, createChapter, projectId, toast]
  );

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteChapterMutation.mutate(
      { id: deleteTarget.id, projectId },
      {
        onSuccess: () => {
          toast({ title: "Chapitre supprimé" });
          setDeleteTarget(null);
        },
        onError: (err) =>
          toast({ title: "Erreur", description: err.message, variant: "destructive" }),
      }
    );
  }, [deleteTarget, deleteChapterMutation, projectId, toast]);

  const scrollToAI = () => {
    aiBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-12rem)]">
      {/* ── Bloc IA Scénario ──────────────────────────────────── */}
      <div
        ref={aiBlockRef}
        className="rounded-2xl p-6 sm:p-8 space-y-5 border border-[hsl(var(--lavender)/0.5)] dark:border-[hsl(var(--lavender)/0.2)] bg-gradient-to-br from-[hsl(var(--lavender)/0.08)] via-[hsl(var(--peach)/0.06)] to-[hsl(var(--mint)/0.05)] shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[hsl(var(--lavender)/0.15)]">
              <Sparkles className="h-5 w-5 text-[hsl(var(--lavender))]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-semibold leading-tight">
                IA Scénario
              </h2>
              <span className="text-[11px] font-medium text-[hsl(var(--lavender))] opacity-80">
                Scénariste
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChapitreType(true)}
            className="gap-1.5 border-[hsl(var(--lavender)/0.3)] text-[hsl(var(--lavender))] hover:bg-[hsl(var(--lavender)/0.08)]"
            title="Voir le format généré par l'IA"
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Chapitre type</span>
          </Button>
        </div>

        <Textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder={
            chapters.length > 0
              ? `Décrivez ce qui se passe dans le Chapitre ${nextChapterNumber} : lieu, personnages, événements, rebondissements…`
              : "Décrivez le début de votre histoire : univers, personnages, situation de départ…"
          }
          rows={5}
          className="text-base bg-white/70 dark:bg-card/60 border-[hsl(var(--lavender)/0.25)] rounded-xl focus-visible:border-[hsl(var(--lavender)/0.6)] focus-visible:ring-[hsl(var(--lavender)/0.15)] resize-none"
        />

        {showSynopsisHint && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
            <Sparkles className="h-3 w-3 shrink-0 text-[hsl(var(--lavender))]" />
            Pré-rempli depuis le synopsis de votre projet. Ajustez-le librement.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              if (hasChapterNumberHoles) {
                setSelectedAiChapterNumber(chapterNumberChoices[0] ?? nextChapterNumber);
                setShowChapterChoiceDialog(true);
                return;
              }
              runScenarioGeneration(nextChapterNumber);
            }}
            disabled={scenarioAI.isPending || !aiPrompt.trim()}
            className="gap-2 gradient-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold shadow-dream hover:shadow-glow transition-shadow"
          >
            {scenarioAI.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {hasChapterNumberHoles
                  ? "Générer le prochain chapitre"
                  : `Générer le Chapitre ${nextChapterNumber}`}
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setNarrativeSheetOpen(true)}
            className="gap-2 px-4 py-2.5 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/25 hover:border-amber-500/40 transition-all"
          >
            <Compass className="h-4 w-4" />
            {narrativeDirections.directions.length > 0
              ? "Voir les propositions Ariane"
              : "Propositions Ariane"}
          </Button>
        </div>

        <AIChapterPreviewModal
          isOpen={!!aiResult}
          onClose={() => setAiResult(null)}
          content={aiResult ?? ""}
          chapterNumber={selectedAiChapterNumber}
          projectId={projectId}
          isAccepting={isAccepting}
          onAccept={(finalContent) => {
            setIsAccepting(true);
            createChapter.mutate(
              {
                project_id: projectId,
                title: `Chapitre ${selectedAiChapterNumber}`,
                chapter_number: selectedAiChapterNumber,
                content: finalContent,
              },
              {
                onSuccess: (data) => {
                  setAiResult(null);
                  setAiPrompt("");
                  setIsAccepting(false);
                  toast({ title: "Chapitre créé" });
                  // Analyse Ariane fire-and-forget : index + lore + anomalies
                  void triggerCompassIndex(projectId, "chapter", data.id, finalContent);
                  void triggerCompassPropose(projectId, finalContent, data.id);
                  const wordCount = finalContent.trim().split(/\s+/).filter(Boolean).length;
                  if (wordCount >= 80) {
                    void triggerNarraMindUpdate(projectId, data.id).catch(() => {});
                  }
                  navigate(`/dashboard/projects/${projectId}/scenario/${data.id}`);
                },
                onError: (err) => {
                  setIsAccepting(false);
                  toast({ title: "Erreur", description: err.message, variant: "destructive" });
                },
              }
            );
          }}
        />
      </div>

      <AlertDialog
        open={showChapterChoiceDialog}
        onOpenChange={(open) => !open && setShowChapterChoiceDialog(false)}
      >
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle>Choisir le numéro du chapitre</AlertDialogTitle>
            <AlertDialogDescription>
              Des trous ont été détectés dans la numérotation. Choisissez le numéro
              à générer pour continuer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-wrap gap-2 py-2">
            {chapterNumberChoices.map((num) => (
              <Button
                key={num}
                type="button"
                size="sm"
                variant={selectedAiChapterNumber === num ? "default" : "outline"}
                onClick={() => setSelectedAiChapterNumber(num)}
              >
                Chapitre {num}
              </Button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowChapterChoiceDialog(false);
                runScenarioGeneration(selectedAiChapterNumber);
              }}
            >
              Générer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ArianeNarrativeSheet
        open={narrativeSheetOpen}
        onOpenChange={setNarrativeSheetOpen}
        directions={narrativeDirections.directions}
        isGenerating={narrativeDirections.isGenerating}
        error={narrativeDirections.error}
        pendingProposalsCount={narrativeDirections.pendingProposalsCount}
        loreStats={narrativeDirections.loreStats}
        nextChapterNumber={nextChapterNumber}
        generate={() => narrativeDirections.generate(nextChapterNumber)}
        reset={narrativeDirections.reset}
        onSelectDirection={(prompt) => {
          setAiPrompt(prompt);
          narrativeDirections.reset();
        }}
      />

      {/* ── Chapitres ────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 sm:p-8 space-y-5 border border-[hsl(var(--peach)/0.65)] dark:border-[hsl(var(--peach)/0.3)] bg-white/85 dark:bg-card/30 shadow-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[hsl(var(--peach)/0.2)]">
              <BookOpen className="h-5 w-5 text-[hsl(var(--peach-deep))]" />
            </div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-display font-semibold leading-tight">
                Votre scénario
              </h2>
              {chapters.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full gradient-primary text-primary-foreground text-xs font-semibold shadow-sm">
                  {chapters.length} chapitre{chapters.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="gap-1.5 rounded-lg border-[hsl(var(--lavender)/0.35)] text-[hsl(var(--lavender))] hover:bg-[hsl(var(--lavender)/0.08)]"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Importer</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleCreateChapter()}
              disabled={createChapter.isPending}
              className="gap-1.5 gradient-primary text-primary-foreground rounded-lg"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nouveau chapitre</span>
            </Button>
          </div>
        </div>

        {/* Importer un light novel / texte existant */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="glass sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <FileText className="h-4 w-4" style={{ color: "hsl(var(--lavender))" }} />
                Importer un chapitre
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-snug">
                Colle le texte d'un chapitre existant (light novel, roman, nouvelle). Il devient un chapitre de scénario, prêt à découper en cases.
              </p>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Colle ici le texte de ton chapitre de light novel..."
                rows={12}
                className="resize-none text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-muted-foreground">
                  {importText.trim() ? `${importText.trim().split(/\s+/).length} mots` : "Aucun texte"}
                </span>
                <Button
                  onClick={() => {
                    const text = importText.trim();
                    if (!text) return;
                    handleCreateChapter(text);
                    setImportOpen(false);
                    setImportText("");
                  }}
                  disabled={!importText.trim() || createChapter.isPending}
                  className="gap-1.5 gradient-primary text-primary-foreground rounded-lg"
                >
                  <Plus className="h-4 w-4" />
                  Créer le chapitre
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-[hsl(var(--peach)/0.2)] bg-[hsl(var(--cream)/0.5)] h-32 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* État vide */}
        {!isLoading && chapters.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[hsl(var(--lavender)/0.25)] bg-gradient-to-br from-[hsl(var(--lavender)/0.04)] to-[hsl(var(--peach)/0.04)] py-14 px-6 text-center">
            <div className="p-4 rounded-2xl bg-[hsl(var(--lavender)/0.1)]">
              <BookOpen className="h-10 w-10 text-gradient" style={{ color: "hsl(var(--lavender))" }} />
            </div>
            <div className="space-y-1.5">
              <p className="text-lg font-display font-semibold text-foreground">
                Votre histoire commence ici
              </p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Créez un chapitre manuellement ou laissez l'IA en écrire un premier.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-1 justify-center">
              <Button
                size="sm"
                onClick={() => handleCreateChapter()}
                disabled={createChapter.isPending}
                className="gap-1.5 gradient-primary text-primary-foreground rounded-lg px-4"
              >
                <Plus className="h-3.5 w-3.5" />
                Créer un chapitre
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={scrollToAI}
                className="gap-1.5 rounded-lg px-4 border-[hsl(var(--lavender)/0.35)] text-[hsl(var(--lavender))] hover:bg-[hsl(var(--lavender)/0.08)]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Générer avec l'IA
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImportOpen(true)}
                className="gap-1.5 rounded-lg px-4"
              >
                <FileText className="h-3.5 w-3.5" />
                Importer un light novel
              </Button>
            </div>
          </div>
        )}

        {/* Liste des chapitres en grille */}
        {!isLoading && chapters.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {chapters.map((chapter, idx) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                projectId={projectId}
                assets={assets}
                onRequestDelete={() => setDeleteTarget(chapter)}
                onMoveUp={idx > 0 ? () => handleMoveChapter(chapter.id, "up") : undefined}
                onMoveDown={
                  idx < chapters.length - 1
                    ? () => handleMoveChapter(chapter.id, "down")
                    : undefined
                }
                isReordering={reorderChapters.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Dialog confirmation suppression ───────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce chapitre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le chapitre « {deleteTarget?.title} » et tout son contenu seront
              définitivement supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteChapterMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog « Chapitre Type » ───────────────────────────── */}
      <AlertDialog
        open={showChapitreType}
        onOpenChange={(open) => !open && setShowChapitreType(false)}
      >
        <AlertDialogContent className="glass max-w-3xl max-h-[85vh] flex flex-col overflow-hidden min-h-0">
          <AlertDialogHeader className="shrink-0">
            <AlertDialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-primary" />
              Format généré par l'IA Scénario
            </AlertDialogTitle>
            <AlertDialogDescription>
              L'IA structure chaque chapitre en <strong className="text-foreground">scènes numérotées</strong>.
              Chaque scène commence par un en-tête{" "}
              <code className="text-primary bg-primary/10 px-1 rounded text-xs">### Scène N — Titre</code>,
              suivi du <strong className="text-foreground">lieu</strong>, des <strong className="text-foreground">personnages présents</strong>,
              puis de la <strong className="text-foreground">prose narrative</strong>. Ces métadonnées alimentent
              directement la génération d'images (décors, personnages dans les cases).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-wrap items-center gap-2 px-1 py-2 shrink-0">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
              ### Scène N — Titre
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[hsl(var(--mint)/0.2)] text-[hsl(170_40%_35%)] dark:text-[hsl(var(--mint))] border border-[hsl(var(--mint)/0.4)]">
              &gt; Lieu : …
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[hsl(var(--lavender)/0.15)] text-[hsl(var(--lavender))] border border-[hsl(var(--lavender)/0.3)]">
              &gt; Personnages : …
            </span>
            <span className="text-muted-foreground text-xs">puis</span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-muted-foreground border border-border/50">
              prose narrative + dialogues « »
            </span>
            <span className="text-muted-foreground text-xs">→</span>
            <span className="px-2.5 py-1 rounded-md text-xs font-mono text-muted-foreground border border-border/40">
              ---
            </span>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3 shrink-0">
            <p className="text-xs font-medium text-foreground uppercase tracking-wide flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-primary" />
              Assets dans le chapitre
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Les <strong className="text-foreground">personnages</strong>,{" "}
              <strong className="text-foreground">décors</strong> et{" "}
              <strong className="text-foreground">objets</strong> créés dans
              l'onglet Assets sont détectés automatiquement dans le texte. Les
              mentions sont{" "}
              <strong className="text-foreground">surlignées</strong>
              ; au <strong className="text-foreground">survol</strong>, l'asset
              s'affiche (image + infos). Ils servent de référence et alimentent
              le{" "}
              <strong className="text-foreground">prompt de génération</strong>{" "}
              des images (cases / blocs).
            </p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                Détection d'assets
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Le système cherche dans le texte les{" "}
                <strong className="text-foreground">noms exacts</strong> des
                assets du projet. Chaque mention trouvée est surlignée avec une{" "}
                <strong className="text-foreground">couleur selon le type</strong>{" "}
                (voir ci-dessous). Au survol d'une mention, une infobulle
                affiche l'asset (image, type, nom).
              </p>
            </div>
            <p className="text-xs font-medium text-foreground">
              Couleurs par type (même code que dans l'aperçu)
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-[hsl(var(--lavender)/0.2)] text-[hsl(var(--lavender))] dark:text-[hsl(var(--lavender))] border border-[hsl(var(--lavender)/0.5)]">
                <User className="h-3.5 w-3.5" />
                Personnages
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-[hsl(var(--mint)/0.25)] text-[hsl(170_40%_35%)] dark:text-[hsl(170_45%_75%)] border border-[hsl(var(--mint)/0.5)]">
                <ImageIcon className="h-3.5 w-3.5" />
                Décors
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                <Package className="h-3.5 w-3.5" />
                Objets
              </span>
              <span className="text-muted-foreground text-xs">→</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted text-muted-foreground border border-border/60">
                <MousePointer2 className="h-3 w-3" />
                dans le texte : surbrillance + hover
              </span>
              <span className="text-muted-foreground text-xs">→</span>
              <span className="text-xs text-muted-foreground italic">
                prompt de génération
              </span>
            </div>
          </div>

          <AlertDialogFooter className="shrink-0">
            <AlertDialogCancel>Fermer</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function stripMarkdownForPreview(text: string): string {
  return text
    .split("\n")
    .map((l) => l.replace(/^#{1,6}\s*/, "").replace(/^>\s*/, "").trim())
    .filter(Boolean)
    .join(" ");
}

// ── Carte chapitre ────────────────────────────────────────────

interface ChapterCardProps {
  chapter: ScenarioChapter;
  projectId: string;
  assets: Asset[];
  onRequestDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isReordering: boolean;
}

function ChapterCard({
  chapter,
  projectId,
  assets,
  onRequestDelete,
  onMoveUp,
  onMoveDown,
  isReordering,
}: ChapterCardProps) {
  const validateMutation = useValidateChapter();
  const { jobs, clearJob } = useBackgroundJobs();
  const detectJob = jobs.get(chapter.id);

  const wordCount =
    chapter.content?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  const preview = chapter.content?.trim()
    ? stripMarkdownForPreview(chapter.content.trim()).slice(0, 80) || null
    : null;

  type OutlineBlock = { panel_number: number; locked?: boolean };
  const outline = useMemo(
    () =>
      Array.isArray(chapter.panels_outline)
        ? (chapter.panels_outline as OutlineBlock[])
        : null,
    [chapter.panels_outline]
  );
  const detectedPanelCount = useMemo(
    () => (outline && outline.length > 0 ? outline.length : null),
    [outline]
  );
  const lockedCount = useMemo(
    () => (outline ? outline.filter((b) => b.locked).length : 0),
    [outline]
  );
  const panelEstimate = estimatePanelCount(chapter.content);

  // Conditions de validation
  const canValidate = useMemo(() => {
    if (!chapter.content?.trim()) return false;
    const detectedAssets = getDetectedAssets(chapter.content, assets);
    const allGenerated = detectedAssets.every((a) => !!a.image_url);
    const missing = detectMissingNames(chapter.content, assets);
    const dismissed = (() => {
      try {
        const saved = localStorage.getItem(`dw:dismissed-missing:${projectId}`);
        return saved ? new Set(JSON.parse(saved) as string[]) : new Set<string>();
      } catch { return new Set<string>(); }
    })();
    const undismissed = missing.filter((n) => !dismissed.has(n.toLowerCase()));
    return allGenerated && undismissed.length === 0;
  }, [chapter.content, assets, projectId]);

  const isValidated = chapter.validated ?? false;

  return (
    <Link
      to={`/dashboard/projects/${projectId}/scenario/${chapter.id}`}
      onClick={() => { if (detectJob?.status === "done") clearJob(chapter.id); }}
        className={`relative flex flex-col gap-3 rounded-2xl border p-4 shadow-sm cursor-pointer group transition-[box-shadow,border-color,transform] duration-200
          ${isValidated
            ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/5 hover:border-emerald-500/60"
            : "border-[hsl(var(--peach)/0.75)] dark:border-[hsl(var(--peach)/0.4)] bg-white dark:bg-card hover:shadow-dream hover:border-[hsl(var(--lavender)/0.85)] dark:hover:border-[hsl(var(--lavender)/0.6)] hover:-translate-y-0.5"
          }`}
      >
        {/* Actions en haut-droite */}
        <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isValidated && (
            <>
              <button
                type="button"
                disabled={!onMoveUp || isReordering}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onMoveUp?.(); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--lavender)/0.1)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Monter"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={!onMoveDown || isReordering}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onMoveDown?.(); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--lavender)/0.1)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Descendre"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {!isValidated && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRequestDelete(); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Badge numéro + titre + badge Validé */}
        <div className="flex items-start gap-3">
          <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-lg font-bold font-display min-w-[2.25rem] shrink-0 ${
            isValidated
              ? "bg-emerald-500 text-white"
              : "gradient-primary text-primary-foreground"
          }`}>
            {isValidated ? <Lock className="h-4 w-4" /> : chapter.chapter_number}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 pr-16">
              <p className="font-semibold text-base leading-snug truncate">
                {chapter.title}
              </p>
              {isValidated && (
                <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30 uppercase tracking-wide">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Validé
                </span>
              )}
              {detectJob?.status === "running" && (
                <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/30 uppercase tracking-wide animate-pulse">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  Découpage…
                </span>
              )}
              {detectJob?.status === "done" && (
                <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30 uppercase tracking-wide">
                  <Scissors className="h-2.5 w-2.5" />
                  Découpé ✓
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Aperçu du contenu */}
        {preview && (
          <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-2">
            {preview}{chapter.content && chapter.content.trim().length > 80 ? "…" : ""}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {wordCount > 0 ? (
              <>
                <span className="px-2.5 py-1 rounded-full bg-[hsl(var(--mint)/0.2)] text-[hsl(170_40%_35%)] dark:text-[hsl(var(--mint))] text-xs font-semibold border border-[hsl(var(--mint)/0.35)]">
                  {wordCount.toLocaleString()} mots
                </span>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-500/25">
                  {detectedPanelCount !== null ? `${detectedPanelCount} case${detectedPanelCount > 1 ? "s" : ""}` : `~${panelEstimate} cases`}
                </span>
                {lockedCount > 0 && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/25">
                    <CheckCircle2 className="h-3 w-3" />
                    {lockedCount} validée{lockedCount > 1 ? "s" : ""}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">Vide — cliquez pour écrire</span>
            )}
          </div>

          {!isValidated && (
            <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[hsl(var(--lavender))] opacity-0 group-hover:opacity-100 transition-opacity">
              Ouvrir
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        {/* Actions bas de carte */}
        {!isValidated && (
          <div className="flex items-center gap-2 pt-1 border-t border-border/40 mt-1">
            {canValidate ? (
              <button
                type="button"
                disabled={validateMutation.isPending}
                onClick={(e) => {
                  e.stopPropagation(); e.preventDefault();
                  validateMutation.mutate({ id: chapter.id, projectId });
                }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors font-medium ml-auto"
              >
                {validateMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                Valider le chapitre
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground/60 italic">
                {!chapter.content?.trim()
                  ? "Chapitre vide"
                  : "Générez les assets détectés pour valider"}
              </span>
            )}
          </div>
        )}
      </Link>
  );
}
