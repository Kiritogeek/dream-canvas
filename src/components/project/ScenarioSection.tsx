import { useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Sparkles,
  Plus,
  FileUp,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
  LayoutTemplate,
  User,
  ImageIcon,
  Package,
  MousePointer2,
  ArrowRight,
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import {
  useScenarioChapters,
  useCreateScenarioChapter,
  useDeleteScenarioChapter,
  useReorderScenarioChapters,
} from "@/hooks/useScenarioChapters";
import { useScenarioAI } from "@/hooks/useScenarioAI";
import { ScenarioTextHighlighter } from "@/components/project/ScenarioTextHighlighter";
import { estimatePanelCount } from "@/services/panels";
import type { Project, ScenarioChapter, Asset, AssetType } from "@/types";

// ── Props ─────────────────────────────────────────────────────

interface ScenarioSectionProps {
  projectId: string;
  project: Project;
  /** Navigue vers l'onglet Assets avec le dialog de création pré-rempli */
  onNavigateToCreateAsset?: (name: string, type: AssetType) => void;
}

// Nombre de chapitres les plus récents envoyés à l'IA scénario (~2700 car/chapitre)
const SCENARIO_RECENT_CHAPTERS_FOR_IA = 5;

// ── Exemple « Chapitre Type » (en dur) ────────────────────────

const CHAPITRE_TYPE_EXEMPLE = `=== Scène 1 — La rencontre ===

Yuki pousse la porte du café. L'air chaud la frappe d'un coup.
Elle repère Marcus dans son coin habituel, le nez dans un livre qu'il ne lit pas.

« Tu es venue. » — voix neutre, ni soulagée ni surprise.

Elle s'assied sans répondre. Long silence. La cafetière grésille derrière le comptoir.

Marcus referme son livre. « Qu'est-ce qui s'est passé cette nuit-là ? »

Yuki fixe sa tasse. Elle sait qu'il sait. La question n'est pas une question.

=== Scène 2 — La tension ===

La lumière de l'après-midi découpe la table en deux zones d'ombre et de clarté.
Yuki pose les mains à plat. Ses doigts ne tremblent pas — elle a répété ça.

« J'ai fait ce que tu m'as demandé. »

Marcus se lève lentement, boutonne son manteau sans la regarder.

« Je ne t'ai rien demandé. »

La porte du café claque. Yuki reste seule avec sa tasse froide et une réponse qu'elle n'a pas donnée.`;

// Assets de démo pour l'exemple « Chapitre type » (personnages + décors + objets, surlignage réel)
const CHAPITRE_TYPE_DEMO_ASSETS: Asset[] = [
  { id: "demo-yuki", name: "Yuki", asset_type: "character", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, image_url_sheet: null, metadata: null, prompt: null },
  { id: "demo-marcus", name: "Marcus", asset_type: "character", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, image_url_sheet: null, metadata: null, prompt: null },
  { id: "demo-cafe", name: "café", asset_type: "background", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, image_url_sheet: null, metadata: null, prompt: null },
  { id: "demo-tasse", name: "tasse", asset_type: "object", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, image_url_sheet: null, metadata: null, prompt: null },
  { id: "demo-livre", name: "livre", asset_type: "object", project_id: "", user_id: "", created_at: "", image_url: null, image_url_back: null, image_url_profile_left: null, image_url_profile_right: null, image_url_sheet: null, metadata: null, prompt: null },
];

// ── Utilitaire : un prompt IA Scénario = un chapitre ───────────
// À l'acceptation, le texte généré devient le contenu d'un seul chapitre.

function createOneChapterFromAIResult(
  text: string,
  nextChapterNumber: number
): { number: number; title: string; content: string } {
  return {
    number: nextChapterNumber,
    title: `Chapitre ${nextChapterNumber}`,
    content: text.trim(),
  };
}

// ── Composant principal ───────────────────────────────────────

export function ScenarioSection({ projectId, project }: ScenarioSectionProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Données
  const { data: chapters = [], isLoading } = useScenarioChapters(projectId);
  const createChapter = useCreateScenarioChapter();
  const deleteChapterMutation = useDeleteScenarioChapter();
  const reorderChapters = useReorderScenarioChapters();
  const scenarioAI = useScenarioAI();

  // UI state
  const [deleteTarget, setDeleteTarget] = useState<ScenarioChapter | null>(
    null
  );
  const [showChapitreType, setShowChapitreType] = useState(false);

  // IA Scénario state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);

  // ── Réordonner un chapitre (monter / descendre) ─────────────

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
            toast({
              title: "Erreur",
              description: err.message,
              variant: "destructive",
            }),
        }
      );
    },
    [chapters, projectId, reorderChapters, toast]
  );

  // ── Créer un chapitre ───────────────────────────────────────

  const handleCreateChapter = useCallback(
    (initialContent?: string) => {
      const nextNumber =
        chapters.length > 0
          ? Math.max(...chapters.map((c) => c.chapter_number)) + 1
          : 1;

      createChapter.mutate(
        {
          project_id: projectId,
          title: `Chapitre ${nextNumber}`,
          chapter_number: nextNumber,
          content: initialContent ?? null,
        },
        {
          onSuccess: () => {
            toast({ title: "Chapitre créé" });
          },
          onError: (err) =>
            toast({
              title: "Erreur",
              description: err.message,
              variant: "destructive",
            }),
        }
      );
    },
    [chapters, createChapter, projectId, toast]
  );

  // ── Import .txt ─────────────────────────────────────────────

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      if (!file.name.endsWith(".txt") && file.type !== "text/plain") {
        toast({
          title: "Format non supporté",
          description: "Seuls les fichiers .txt sont acceptés pour le moment.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        if (!text.trim()) {
          toast({
            title: "Fichier vide",
            description: "Le fichier importé ne contient pas de texte.",
            variant: "destructive",
          });
          return;
        }
        handleCreateChapter(text.trim());
      };
      reader.onerror = () =>
        toast({
          title: "Erreur de lecture",
          description: "Impossible de lire le fichier.",
          variant: "destructive",
        });
      reader.readAsText(file, "UTF-8");
    },
    [handleCreateChapter, toast]
  );

  // ── Supprimer un chapitre ───────────────────────────────────

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
          toast({
            title: "Erreur",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  }, [deleteTarget, deleteChapterMutation, projectId, toast]);

  // ── Rendu ───────────────────────────────────────────────────

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ── Bloc IA Scénario (visible dès l'entrée) ──────────── */}
      <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-display font-semibold">
              IA Scénario
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
              Scénariste
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            <FileUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Importer .txt</span>
          </Button>
        </div>

        <p className="text-sm sm:text-base text-muted-foreground">
          Votre scénariste IA au service de <strong>votre vision</strong>. Il
          crée votre histoire <strong>chapitre par chapitre</strong> : chaque
          prompt génère <strong>un chapitre</strong>. Décrivez votre histoire
          (ou la suite que vous voulez) et laissez l'IA la créer ou la faire
          avancer.
        </p>

        {/* Prompt utilisateur */}
        <Textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder={chapters.length > 0
            ? `Décrivez ce qui se passe dans le Chapitre ${chapters.length + 1} : lieu, personnages, événements, rebondissements…`
            : "Décrivez le début de votre histoire : univers, personnages, situation de départ…"}
          rows={4}
          className="text-base"
        />

        {/* Bouton générer */}
        <Button
          onClick={() => {
            if (!aiPrompt.trim()) {
              toast({
                title: "Prompt requis",
                description:
                  "Décrivez votre histoire pour que l'IA puisse la créer.",
                variant: "destructive",
              });
              return;
            }
            const recentChapters = chapters.slice(-SCENARIO_RECENT_CHAPTERS_FOR_IA);
            const nextChapterNumber = chapters.length + 1;
            const existingContent =
              recentChapters.length > 0
                ? recentChapters.map((c, index) => {
                    const isLast = index === recentChapters.length - 1;
                    if (isLast) {
                      // Dernier chapitre : contenu complet pour que l'IA enchaîne précisément
                      const content = c.content?.trim() ?? "(vide)";
                      return `Chapitre ${c.chapter_number} : ${c.title}\n${content}`;
                    }
                    const summary = (c as { ai_summary?: string | null }).ai_summary?.trim();
                    if (summary) {
                      return `Chapitre ${c.chapter_number} (${c.title}) — résumé : ${summary}`;
                    }
                    const snippet = c.content?.slice(0, 400) ?? "(vide)";
                    return `Chapitre ${c.chapter_number} : ${c.title}\n${snippet}${c.content && c.content.length > 400 ? "…" : ""}`;
                  }).join("\n\n")
                : undefined;

            scenarioAI.mutate(
              {
                mode: "scenario",
                prompt: aiPrompt.trim(),
                existing_content: existingContent,
                project_description: project.description ?? undefined,
                next_chapter_number: nextChapterNumber,
              },
              {
                onSuccess: (data) => {
                  setAiResult(data.text);
                  toast({ title: "Scénario généré par l'IA" });
                },
                onError: (err) =>
                  toast({
                    title: "Erreur IA",
                    description: err.message,
                    variant: "destructive",
                  }),
              }
            );
          }}
          disabled={scenarioAI.isPending || !aiPrompt.trim()}
          className="gap-2 gradient-primary text-primary-foreground"
        >
          {scenarioAI.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération en cours…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {chapters.length > 0
                ? `Générer le Chapitre ${chapters.length + 1}`
                : "Générer le Chapitre 1"}
            </>
          )}
        </Button>

        {/* Résultat IA Scénario — texte proposé (pas de diff supprimé/ajouté) */}
        {aiResult && (
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold">
                Proposition de l'IA Scénario
              </h3>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg bg-background/80 p-4 border border-border/50 text-base leading-relaxed whitespace-pre-wrap">
              {aiResult}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  // Un prompt = un chapitre : le texte généré devient un seul chapitre
                  const ch = createOneChapterFromAIResult(
                    aiResult,
                    chapters.length + 1
                  );
                  createChapter.mutate(
                    {
                      project_id: projectId,
                      title: ch.title,
                      chapter_number: ch.number,
                      content: ch.content,
                    },
                    {
                      onSuccess: () => {
                        toast({ title: "Chapitre créé" });
                        setAiResult(null);
                        setAiPrompt("");
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
                className="gap-1.5 gradient-primary text-primary-foreground"
              >
                <Check className="h-3.5 w-3.5" />
                Accepter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiResult(null)}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Rejeter
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Chapitres (= le scénario) ────────────────────────── */}
      <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-display font-semibold">
              Votre scénario
            </h2>
            {chapters.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {chapters.length} chapitre{chapters.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChapitreType(true)}
              className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              title="Voir la structure type d'un chapitre"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chapitre Type</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleCreateChapter()}
              disabled={createChapter.isPending}
              className="gap-1.5 gradient-primary text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nouveau chapitre</span>
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={handleFileImport}
        />

        <p className="text-sm sm:text-base text-muted-foreground">
          Chaque chapitre de scénario correspond à un chapitre webtoon.
          Écrivez, collez ou importez du texte dans chaque chapitre.
        </p>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-muted/20 h-16 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* État vide */}
        {!isLoading && chapters.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 py-10 px-4 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-base font-medium text-muted-foreground">
                Aucun chapitre pour le moment
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Créez votre premier chapitre ou utilisez l'IA Scénario (avec
                Importer .txt si besoin) pour commencer votre histoire.
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={() => handleCreateChapter()}
                disabled={createChapter.isPending}
                className="gap-1.5 gradient-primary text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Créer un chapitre
              </Button>
            </div>
          </div>
        )}

        {/* Liste des chapitres */}
        {!isLoading && chapters.length > 0 && (
          <div className="space-y-2">
            {chapters.map((chapter, idx) => (
              <ChapterRow
                key={chapter.id}
                chapter={chapter}
                projectId={projectId}
                onRequestDelete={() => setDeleteTarget(chapter)}
                onMoveUp={
                  idx > 0
                    ? () => handleMoveChapter(chapter.id, "up")
                    : undefined
                }
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

      {/* Astuce */}
      <p className="text-sm text-muted-foreground text-right">
        Astuce : utilisez l'IA Scénario pour générer une première ébauche, puis
        affinez chaque chapitre à votre guise.
      </p>

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
              Format d'écriture
            </AlertDialogTitle>
            <AlertDialogDescription>
              Écrivez en <strong className="text-foreground">prose narrative libre</strong>, comme un roman.
              Les marqueurs{" "}
              <code className="text-primary bg-primary/10 px-1 rounded text-xs">=== Scène N — Titre ===</code>{" "}
              sont <strong className="text-foreground">optionnels</strong> — ils aident à repérer les changements de lieu, mais l'important est un texte vivant et fluide.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Format visuel */}
          <div className="flex flex-wrap items-center gap-2 px-1 py-2 shrink-0">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
              === Scène N — Titre ===
            </span>
            <span className="text-muted-foreground text-xs italic">optionnel — délimite un changement de lieu ou de moment</span>
          </div>

          {/* Assets dans le chapitre — détection, couleurs par type, visuel */}
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
              des images (panels / blocs).
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

          {/* Exemple — zone scrollable pour tout le chapitre */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-lg bg-background/80 border border-border/50">
            <p className="text-xs text-muted-foreground px-4 pt-3 pb-1 uppercase tracking-wide font-medium shrink-0">
              Exemple complet — 3 séquences dans un seul chapitre
            </p>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 pt-0">
              <ScenarioTextHighlighter
                text={CHAPITRE_TYPE_EXEMPLE}
                assets={CHAPITRE_TYPE_DEMO_ASSETS}
                hideIndicator
                className="text-sm leading-relaxed whitespace-pre-wrap"
              />
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

// ── Ligne chapitre (navigation rapide vers éditeur) ──────────

interface ChapterRowProps {
  chapter: ScenarioChapter;
  projectId: string;
  onRequestDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isReordering: boolean;
}

function ChapterRow({
  chapter,
  projectId,
  onRequestDelete,
  onMoveUp,
  onMoveDown,
  isReordering,
}: ChapterRowProps) {
  const wordCount =
    chapter.content?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  const panelEstimate = estimatePanelCount(chapter.content);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 hover:bg-card/80 transition-colors group">
      {/* Numéro */}
      <span className="text-sm text-muted-foreground font-mono w-6 shrink-0">
        {String(chapter.chapter_number).padStart(2, "0")}
      </span>

      {/* Titre + stats */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-base truncate">{chapter.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {wordCount > 0 ? (
            <>
              <span>{wordCount.toLocaleString()} mots</span>
              <span>·</span>
              <span>~{panelEstimate} panels</span>
            </>
          ) : (
            <span className="italic">Vide</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          disabled={!onMoveUp || isReordering}
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp?.();
          }}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Monter"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={!onMoveDown || isReordering}
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown?.();
          }}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Descendre"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete();
          }}
          className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
          title="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bouton Éditer */}
      <Link
        to={`/dashboard/projects/${projectId}/scenario/${chapter.id}`}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium gradient-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Éditer
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
