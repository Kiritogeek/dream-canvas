// Section « Édition de l'œuvre » — liste des chapitres visuels (webtoon)
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  LayoutPanelTop,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Chapter, Project } from "@/types";

interface EditionSectionProps {
  projectId: string;
  project: Project;
}

export function EditionSection({ projectId, project }: EditionSectionProps) {
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
  const [newSynopsis, setNewSynopsis] = useState("");
  const LINKED_NONE_VALUE = "__none__";
  const [linkedScenarioChapterId, setLinkedScenarioChapterId] = useState<string>(LINKED_NONE_VALUE);
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const [editTarget, setEditTarget] = useState<Chapter | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSynopsis, setEditSynopsis] = useState("");

  // Premier numéro libre (permet de « recréer » un chapitre 1 après suppression)
  const usedNumbers = new Set(chapters.map((c) => c.chapter_number));
  let nextChapterNumber = 1;
  while (usedNumbers.has(nextChapterNumber)) nextChapterNumber++;

  const suggestedScenarioChapter = scenarioChapters.find(
    (sc) => sc.chapter_number === nextChapterNumber
  );

  const handleOpenCreateDialog = useCallback(() => {
    setCreateDialogOpen(true);
    setLinkedScenarioChapterId(suggestedScenarioChapter?.id ?? LINKED_NONE_VALUE);
  }, [suggestedScenarioChapter?.id]);

  const handleCreateChapter = useCallback(() => {
    const title = newTitle.trim() || `Chapitre ${nextChapterNumber}`;
    createChapter.mutate(
      {
        title,
        chapter_number: nextChapterNumber,
        synopsis: newSynopsis.trim() || undefined,
        linked_scenario_chapter_id:
          linkedScenarioChapterId === LINKED_NONE_VALUE
            ? undefined
            : linkedScenarioChapterId,
      },
      {
        onSuccess: (created) => {
          toast({ title: "Chapitre créé" });
          setCreateDialogOpen(false);
          setNewTitle("");
          setNewSynopsis("");
          setLinkedScenarioChapterId(LINKED_NONE_VALUE);
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
    newSynopsis,
    nextChapterNumber,
    linkedScenarioChapterId,
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

  const openEditDialog = (chapter: Chapter) => {
    setEditTarget(chapter);
    setEditTitle(chapter.title);
    setEditSynopsis(chapter.synopsis ?? "");
  };

  const handleSaveEdit = useCallback(() => {
    if (!editTarget) return;
    updateChapter.mutate(
      {
        id: editTarget.id,
        updates: {
          title: editTitle.trim() || editTarget.title,
          synopsis: editSynopsis.trim() || null,
        },
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
  }, [editTarget, editTitle, editSynopsis, updateChapter, toast]);

  const openChapter = (chapterId: string) => {
    navigate(`/dashboard/projects/${projectId}/chapter/${chapterId}`);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Construisez votre webtoon visuel à partir des chapitres : créez des
        chapitres, ouvrez-les pour éditer les panels (800×5000), ajoutez blocs,
        bulles et effets.
      </p>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-muted/20 h-16 animate-pulse"
            />
          ))}
        </div>
      )}

      {!isLoading && chapters.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 py-10 px-4 text-center">
          <LayoutPanelTop className="h-8 w-8 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-base font-medium text-muted-foreground">
              Aucun chapitre visuel
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Créez votre premier chapitre pour commencer à construire l'œuvre
              (panels 800×5000, blocs, bulles et effets à venir).
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleOpenCreateDialog}
            disabled={createChapter.isPending}
            className="gap-1.5 gradient-primary text-primary-foreground mt-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Créer un chapitre
          </Button>
        </div>
      )}

      {!isLoading && chapters.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {chapters.length} chapitre{chapters.length > 1 ? "s" : ""}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenCreateDialog}
              disabled={createChapter.isPending}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Créer un chapitre
            </Button>
          </div>
          <div className="space-y-2">
            {chapters.map((chapter, idx) => (
              <div
                key={chapter.id}
                className="glass rounded-xl p-4 flex items-center gap-3 group"
              >
                <div className="flex flex-col gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={idx === 0 || reorderChapters.isPending}
                    onClick={() => handleMoveChapter(chapter.id, "up")}
                    title="Monter"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={
                      idx === chapters.length - 1 || reorderChapters.isPending
                    }
                    onClick={() => handleMoveChapter(chapter.id, "down")}
                    title="Descendre"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => openChapter(chapter.id)}
                  className="flex-1 min-w-0 text-left rounded-lg hover:bg-muted/50 p-2 -m-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">
                      Chapitre {chapter.chapter_number} : {chapter.title}
                    </span>
                  </div>
                  {chapter.synopsis && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                      {chapter.synopsis}
                    </p>
                  )}
                </button>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(chapter);
                    }}
                    title="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(chapter);
                    }}
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog création chapitre */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setLinkedScenarioChapterId(LINKED_NONE_VALUE);
        }}
      >
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-display">
              Créer un chapitre
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {scenarioChapters.length === 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                Vous n'avez pas encore de chapitre de scénario. Vous pouvez en
                créer dans l'onglet <strong>Scénario</strong> et associer ce
                chapitre visuel plus tard.
              </div>
            )}
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={`Chapitre ${nextChapterNumber}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Synopsis (optionnel)</Label>
              <Input
                value={newSynopsis}
                onChange={(e) => setNewSynopsis(e.target.value)}
                placeholder="Résumé court du chapitre..."
              />
            </div>
            {scenarioChapters.length > 0 && (
              <div className="space-y-2">
                <Label>
                  Associer au chapitre de scénario
                  {suggestedScenarioChapter && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      (recommandé : chapitre {nextChapterNumber})
                    </span>
                  )}
                </Label>
                <Select
                  value={linkedScenarioChapterId}
                  onValueChange={setLinkedScenarioChapterId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun (associer plus tard)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LINKED_NONE_VALUE}>
                      Aucun (associer plus tard)
                    </SelectItem>
                    {scenarioChapters.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>
                        Chapitre {sc.chapter_number} : {sc.title}
                        {sc.chapter_number === nextChapterNumber ? " ✓" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              className="w-full gradient-primary text-primary-foreground"
              onClick={handleCreateChapter}
              disabled={createChapter.isPending}
            >
              {createChapter.isPending ? "Création..." : "Créer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog édition chapitre */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-display">
              Modifier le chapitre
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Synopsis (optionnel)</Label>
              <Input
                value={editSynopsis}
                onChange={(e) => setEditSynopsis(e.target.value)}
                placeholder="Résumé court..."
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
