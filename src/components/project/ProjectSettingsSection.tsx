import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Save, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUpdateProject, useDeleteProject } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import {
  parseProjectMeta,
  buildProjectDescription,
  PROJECT_GENRE_OPTIONS,
  PROJECT_TONE_OPTIONS,
} from "@/lib/projectMeta";
import type { Project } from "@/types";

const TONE_NONE = "__none__";

export function ProjectSettingsSection({ project }: { project: Project }) {
  const navigate = useNavigate();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { toast } = useToast();

  const initial = parseProjectMeta(project.description);
  const [title, setTitle] = useState(project.title);
  const [genre, setGenre] = useState(initial.genre);
  const [tone, setTone] = useState(initial.tone);
  // Synopsis : défini à la création, non modifiable ici — mais préservé au save.
  const synopsis = initial.synopsis;

  // Resync si le projet change (navigation entre projets sans démontage).
  useEffect(() => {
    const m = parseProjectMeta(project.description);
    setTitle(project.title);
    setGenre(m.genre);
    setTone(m.tone);
  }, [project.id, project.title, project.description]);

  const trimmedTitle = title.trim();
  const dirty =
    (trimmedTitle !== "" && trimmedTitle !== project.title) ||
    genre !== initial.genre ||
    tone !== initial.tone;

  const handleSave = () => {
    if (!trimmedTitle) return;
    const description = buildProjectDescription({ genre, tone, synopsis });
    updateProject.mutate(
      { id: project.id, updates: { title: trimmedTitle, description } },
      {
        onSuccess: () => toast({ title: "Paramètres enregistrés", description: "La tonalité et le genre guident désormais la génération." }),
        onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
      },
    );
  };

  const handleDelete = () => {
    deleteProject.mutate(project.id, {
      onSuccess: () => {
        toast({ title: "Projet supprimé", description: "Le projet et tout son contenu ont été supprimés." });
        navigate("/dashboard/projects");
      },
      onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="w-full max-w-2xl space-y-5 sm:space-y-6">
      <div className="glass rounded-2xl p-4 sm:p-6 space-y-5">
        <div>
          <h2 className="font-display font-semibold text-base">Identité narrative</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Le titre, le genre et la tonalité orientent la génération de scénario, le découpage en cases et l'ambiance des images.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Titre</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du projet" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Genre</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_GENRE_OPTIONS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              Tonalité <span className="text-muted-foreground font-normal text-xs">(optionnel)</span>
            </Label>
            <Select value={tone || TONE_NONE} onValueChange={(v) => setTone(v === TONE_NONE ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TONE_NONE}>Aucune</SelectItem>
                {PROJECT_TONE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {synopsis && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">Synopsis <span className="font-normal text-xs">(défini à la création)</span></Label>
            <p className="text-sm text-muted-foreground leading-relaxed rounded-lg bg-muted/40 border border-border/60 px-3 py-2.5 whitespace-pre-wrap">
              {synopsis}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-end">
          <Button
            onClick={handleSave}
            disabled={!dirty || updateProject.isPending}
            className="w-full sm:w-auto gradient-primary text-primary-foreground"
          >
            {updateProject.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sauvegarde…</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Enregistrer</>
            )}
          </Button>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-6 border border-destructive/30 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <AlertTriangle className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-base text-destructive">Zone de danger</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Supprimer ce projet efface définitivement son scénario, ses chapitres, ses cases, ses assets et sa couverture. Cette action est irréversible.
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-auto justify-center border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Supprimer ce projet
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="glass">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">
                Supprimer « {project.title} » ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Tout le contenu du projet (scénario, chapitres, cases, assets, couverture) sera définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteProject.isPending ? "Suppression…" : "Supprimer définitivement"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
