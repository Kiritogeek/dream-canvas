import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateProject } from "@/hooks/useProjects";
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
  const updateProject = useUpdateProject();
  const { toast } = useToast();

  const initial = parseProjectMeta(project.description);
  const [genre, setGenre] = useState(initial.genre);
  const [tone, setTone] = useState(initial.tone);
  // Synopsis : défini à la création, non modifiable ici — mais préservé au save.
  const synopsis = initial.synopsis;

  // Resync si le projet change (navigation entre projets sans démontage).
  useEffect(() => {
    const m = parseProjectMeta(project.description);
    setGenre(m.genre);
    setTone(m.tone);
  }, [project.id, project.description]);

  const dirty = genre !== initial.genre || tone !== initial.tone;

  const handleSave = () => {
    const description = buildProjectDescription({ genre, tone, synopsis });
    updateProject.mutate(
      { id: project.id, updates: { description } },
      {
        onSuccess: () => toast({ title: "Paramètres enregistrés", description: "La tonalité et le genre guident désormais la génération." }),
        onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="glass rounded-2xl p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="font-display font-semibold text-base">Identité narrative</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Le genre et la tonalité orientent la génération de scénario, le découpage en cases et l'ambiance des images.
          </p>
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

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!dirty || updateProject.isPending}
            className="gradient-primary text-primary-foreground"
          >
            {updateProject.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sauvegarde…</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Enregistrer</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
