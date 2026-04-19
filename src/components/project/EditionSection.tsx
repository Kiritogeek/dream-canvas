import { useState, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  LayoutPanelTop,
  ArrowRight,
  BookOpen,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useChapters,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
  useReorderChapters,
} from "@/hooks/useChapters";
import { useScenarioChapters } from "@/hooks/useScenarioChapters";
import type { Chapter } from "@/types";

// ── ChapterEditionCard ────────────────────────────────────────────────────────

interface ChapterCardProps {
  chapter: Chapter;
  idx: number;
  total: number;
  projectId: string;
  isReordering: boolean;
  onMove: (chapterId: string, direction: "up" | "down") => void;
  onEdit: (chapter: Chapter) => void;
  onDelete: (chapter: Chapter) => void;
}

const ChapterEditionCard = memo(function ChapterEditionCard({
  chapter,
  idx,
  total,
  projectId,
  isReordering,
  onMove,
  onEdit,
  onDelete,
}: ChapterCardProps) {
  const navigate = useNavigate();

  const handleOpenChapter = useCallback(
    () => navigate(`/dashboard/projects/${projectId}/chapter/${chapter.id}`),
    [navigate, projectId, chapter.id]
  );

  const handleMoveUp = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onMove(chapter.id, "up"); },
    [onMove, chapter.id]
  );
  const handleMoveDown = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onMove(chapter.id, "down"); },
    [onMove, chapter.id]
  );
  const handleEdit = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onEdit(chapter); },
    [onEdit, chapter]
  );
  const handleDelete = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onDelete(chapter); },
    [onDelete, chapter]
  );

  return (
    <div
      className="flex flex-col gap-3 p-5 rounded-2xl border border-[hsl(var(--peach)/0.4)] hover:border-[hsl(var(--lavender)/0.5)] bg-white/50 dark:bg-card/30 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer"
      onClick={handleOpenChapter}
    >
      {/* Numéro + titre + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="shrink-0 w-8 h-8 rounded-xl gradient-primary text-primary-foreground text-sm font-bold font-display flex items-center justify-center">
            {chapter.chapter_number}
          </span>
          <h3 className="font-semibold font-display text-foreground leading-snug pt-0.5">
            {chapter.title}
          </h3>
        </div>

        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={idx === 0 || isReordering}
            onClick={handleMoveUp}
            title="Monter"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={idx === total - 1 || isReordering}
            onClick={handleMoveDown}
            title="Descendre"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleEdit}
            title="Modifier le titre"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Bas de carte : badge scénario + CTA */}
      <div className="flex items-center justify-between gap-2">
        <div>
          {chapter.linked_scenario_chapter_id && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--mint)/0.2)] text-[hsl(170_40%_38%)] border border-[hsl(var(--mint)/0.3)]">
              <Link2 className="h-3 w-3" />
              Scénario associé
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-[hsl(var(--lavender))]">
          Illustrer
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
});

// ── EditionSection ────────────────────────────────────────────────────────────

interface EditionSectionProps {
  projectId: string;
}

export function EditionSection({ projectId }: EditionSectionProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: chapters = [], isLoading } = useChapters(projectId);
  const { data: scenarioChapters = [] } = useScenarioChapters(projectId);

  const createChapter = useCreateChapter(projectId);
  const updateChapter = useUpdateChapter(projectId);
  const deleteChapter = useDeleteChapter(projectId);
  const reorderChapters = useReorderChapters(projectId);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const [editTarget, setEditTarget] = useState<Chapter | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const { nextChapterNumber, matchingScenarioChapter } = useMemo(() => {
    const used = new Set(chapters.map((c) => c.chapter_number));
    let next = 1;
    while (used.has(next)) next++;
    return {
      nextChapterNumber: next,
      matchingScenarioChapter: scenarioChapters.find(
        (sc) => sc.chapter_number === next
      ),
    };
  }, [chapters, scenarioChapters]);

  const linkedCount = useMemo(
    () => chapters.filter((ch) => !!ch.linked_scenario_chapter_id).length,
    [chapters]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleOpenCreateDialog = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleCreateChapter = useCallback(() => {
    const title = newTitle.trim() || `Chapitre ${nextChapterNumber}`;
    createChapter.mutate(
      {
        title,
        chapter_number: nextChapterNumber,
        linked_scenario_chapter_id: matchingScenarioChapter?.id,
      },
      {
        onSuccess: (created) => {
          toast({ title: "Chapitre créé" });
          setCreateDialogOpen(false);
          setNewTitle("");
          navigate(`/dashboard/projects/${projectId}/chapter/${created.id}`);
        },
        onError: (err) =>
          toast({
            title: "Erreur",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  }, [
    newTitle,
    nextChapterNumber,
    matchingScenarioChapter?.id,
    createChapter,
    toast,
    projectId,
    navigate,
  ]);

  const handleMoveChapter = useCallback(
    (chapterId: string, direction: "up" | "down") => {
      const idx = chapters.findIndex((c) => c.id === chapterId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= chapters.length) return;
      const current = chapters[idx];
      const neighbor = chapters[swapIdx];
      reorderChapters.mutate(
        [
          { id: current.id, chapter_number: neighbor.chapter_number },
          { id: neighbor.id, chapter_number: current.chapter_number },
        ],
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
    [chapters, reorderChapters, toast]
  );

  const openEditDialog = useCallback((chapter: Chapter) => {
    setEditTarget(chapter);
    setEditTitle(chapter.title);
  }, []);

  const handleDeleteTarget = useCallback((chapter: Chapter) => {
    setDeleteTarget(chapter);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteChapter.mutate(deleteTarget.id, {
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
    });
  }, [deleteTarget, deleteChapter, toast]);

  const handleSaveEdit = useCallback(() => {
    if (!editTarget) return;
    updateChapter.mutate(
      {
        id: editTarget.id,
        updates: { title: editTitle.trim() || editTarget.title },
      },
      {
        onSuccess: () => {
          toast({ title: "Chapitre mis à jour" });
          setEditTarget(null);
        },
        onError: (err) =>
          toast({
            title: "Erreur",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  }, [editTarget, editTitle, updateChapter, toast]);

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-12rem)]">

      {/* Header */}
      <div className="rounded-2xl p-6 border border-[hsl(var(--lavender)/0.2)] bg-gradient-to-br from-[hsl(var(--lavender)/0.08)] via-[hsl(var(--peach)/0.05)] to-[hsl(var(--mint)/0.04)]">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl gradient-primary">
              <LayoutPanelTop className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-foreground">
                Édition de l'œuvre
              </h2>
              <p className="text-sm text-muted-foreground">
                Donnez vie à chaque chapitre — panels, illustrations, dialogues
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleOpenCreateDialog}
            disabled={createChapter.isPending}
            className="gap-1.5 gradient-primary text-primary-foreground shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau chapitre
          </Button>
        </div>

        {chapters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-[hsl(var(--lavender)/0.15)] text-[hsl(var(--lavender))] border border-[hsl(var(--lavender)/0.25)]">
              <BookOpen className="h-3.5 w-3.5" />
              {chapters.length} chapitre{chapters.length > 1 ? "s" : ""}
            </span>
            {linkedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-[hsl(var(--mint)/0.15)] text-[hsl(170_40%_38%)] border border-[hsl(var(--mint)/0.25)]">
                <Link2 className="h-3.5 w-3.5" />
                {linkedCount}/{chapters.length} liés au scénario
              </span>
            )}
          </div>
        )}
      </div>

      {/* Skeletons */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-muted/20 h-24 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* État vide */}
      {!isLoading && chapters.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[hsl(var(--lavender)/0.3)] bg-[hsl(var(--lavender)/0.03)] py-16 px-4 text-center flex-1">
          <LayoutPanelTop
            className="h-12 w-12"
            style={{ color: "hsl(var(--lavender))" }}
          />
          <div className="space-y-1.5">
            <p className="text-lg font-semibold font-display text-foreground">
              Votre œuvre commence ici
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Créez votre premier chapitre pour commencer à illustrer votre histoire.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleOpenCreateDialog}
            disabled={createChapter.isPending}
            className="gap-1.5 gradient-primary text-primary-foreground mt-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau chapitre
          </Button>
        </div>
      )}

      {/* Liste des chapitres */}
      {!isLoading && chapters.length > 0 && (
        <div className="flex flex-col gap-3">
          {chapters.map((chapter, idx) => (
            <ChapterEditionCard
              key={chapter.id}
              chapter={chapter}
              idx={idx}
              total={chapters.length}
              projectId={projectId}
              isReordering={reorderChapters.isPending}
              onMove={handleMoveChapter}
              onEdit={openEditDialog}
              onDelete={handleDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Dialog — créer un chapitre */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setNewTitle("");
        }}
      >
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-display">
              Nouveau chapitre
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={`Chapitre ${nextChapterNumber}`}
                onKeyDown={(e) => e.key === "Enter" && handleCreateChapter()}
                autoFocus
              />
            </div>

            {matchingScenarioChapter ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--mint)/0.1)] border border-[hsl(var(--mint)/0.3)]">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-[hsl(170_40%_45%)]" />
                <p className="text-xs text-[hsl(170_40%_38%)]">
                  Scénario associé automatiquement — chapitre {nextChapterNumber} : <span className="font-medium">{matchingScenarioChapter.title}</span>
                </p>
              </div>
            ) : scenarioChapters.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun chapitre de scénario correspondant au chapitre {nextChapterNumber}.
              </p>
            ) : null}

            <Button
              className="w-full gradient-primary text-primary-foreground"
              onClick={handleCreateChapter}
              disabled={createChapter.isPending}
            >
              {createChapter.isPending ? "Création..." : "Créer et illustrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — modifier le titre */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-display">Modifier le titre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                autoFocus
              />
            </div>
            <Button
              className="w-full gradient-primary text-primary-foreground"
              onClick={handleSaveEdit}
              disabled={updateChapter.isPending}
            >
              {updateChapter.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce chapitre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le chapitre « {deleteTarget?.title} » et tous ses panels seront
              définitivement supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteChapter.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
