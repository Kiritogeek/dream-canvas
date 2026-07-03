import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { buildProjectDescription, parseProjectMeta } from "@/lib/projectMeta";
import { Plus, Trash2, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks/useProjects";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ARIANE_STYLE_ONBOARDING_NEXT_CREATE_SESSION_KEY,
  ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY,
} from "@/constants/ariane";
import { bindForcedProgressiveProjectAfterCreate } from "@/lib/progressiveOnboardingStorage";

export default function Projects() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedTone, setSelectedTone] = useState("");

  const deleteTargetProject = projects.find((p) => p.id === deleteTargetId);

  const filteredProjects = searchQuery.trim()
    ? projects.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    : projects;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalDescription = buildProjectDescription({ genre: selectedGenre, tone: selectedTone, synopsis });

    const isFirstProject = projects.length === 0;

    createProject.mutate(
      { title: title.trim(), description: finalDescription },
      {
        onSuccess: (data) => {
          setOpen(false);
          setTitle("");
          setSynopsis("");
          setSelectedGenre("");
          setSelectedTone("");
          try {
            const attachStyleOnboarding =
              isFirstProject ||
              sessionStorage.getItem(ARIANE_STYLE_ONBOARDING_NEXT_CREATE_SESSION_KEY) === "1";
            if (attachStyleOnboarding) {
              sessionStorage.setItem(ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY, data.id);
              sessionStorage.removeItem(ARIANE_STYLE_ONBOARDING_NEXT_CREATE_SESSION_KEY);
            }
            bindForcedProgressiveProjectAfterCreate(data.id);
          } catch {
            /* ignore */
          }
          navigate(`/dashboard/projects/${data.id}`);
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
    if (location.pathname.endsWith("/projects/new")) setOpen(true);
  }, [location.pathname]);

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    deleteProject.mutate(deleteTargetId, {
      onSuccess: () => {
        toast({ title: "Projet supprimé" });
        setDeleteTargetId(null);
      },
      onError: (err) => {
        toast({
          title: "Erreur",
          description: err.message,
          variant: "destructive",
        });
        setDeleteTargetId(null);
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-display font-bold">Mes projets</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-dream text-xs sm:text-sm shrink-0">
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Nouveau projet</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="glass">
              <DialogHeader>
                <DialogTitle className="font-display">
                  Nouveau projet
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-5">
                {/* Titre */}
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Mon super webtoon"
                    required
                  />
                </div>

                {/* Genre */}
                {/* Genre + Tonalité côte à côte */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Genre</Label>
                    <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fantasy">🧙 Fantasy</SelectItem>
                        <SelectItem value="Médiéval">⚔️ Médiéval</SelectItem>
                        <SelectItem value="SF">🚀 SF</SelectItem>
                        <SelectItem value="Aventure">🗺️ Aventure</SelectItem>
                        <SelectItem value="Romance">💕 Romance</SelectItem>
                        <SelectItem value="Action">⚡ Action</SelectItem>
                        <SelectItem value="Thriller">🎯 Thriller</SelectItem>
                        <SelectItem value="Mystère">🔍 Mystère</SelectItem>
                        <SelectItem value="Horreur">👻 Horreur</SelectItem>
                        <SelectItem value="Dystopie">⚙️ Dystopie</SelectItem>
                        <SelectItem value="Historique">🏛️ Historique</SelectItem>
                        <SelectItem value="Comédie">😄 Comédie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tonalité <span className="text-muted-foreground font-normal text-xs">(opt.)</span></Label>
                    <Select value={selectedTone} onValueChange={setSelectedTone}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Épique">🔥 Épique</SelectItem>
                        <SelectItem value="Sombre">🌑 Sombre</SelectItem>
                        <SelectItem value="Humoristique">😂 Humoristique</SelectItem>
                        <SelectItem value="Romantique">🌸 Romantique</SelectItem>
                        <SelectItem value="Mystérieux">🌫️ Mystérieux</SelectItem>
                        <SelectItem value="Slice of life">🌿 Slice of life</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Synopsis */}
                <div className="space-y-2">
                  <Label>Synopsis <span className="text-muted-foreground font-normal text-xs">(optionnel)</span></Label>
                  <Textarea
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    placeholder="En quelques phrases, de quoi parle votre histoire ?"
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createProject.isPending}
                  className="w-full gradient-primary text-primary-foreground"
                >
                  {createProject.isPending ? "Création..." : "Créer le projet"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Barre de recherche */}
        {projects.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un projet..."
              className="pl-10"
            />
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass rounded-lg sm:rounded-xl p-5 sm:p-6 h-32 sm:h-40 animate-pulse"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass rounded-xl sm:rounded-2xl p-10 sm:p-16 text-center">
            <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-primary opacity-50" />
            <h3 className="font-display font-semibold text-base sm:text-lg mb-2">
              Aucun projet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez votre premier projet pour commencer !
            </p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="glass rounded-lg sm:rounded-xl p-8 sm:p-12 text-center">
            <Search className="h-7 w-7 sm:h-8 sm:w-8 mx-auto mb-2 sm:mb-3 text-primary opacity-40" />
            <p className="text-muted-foreground text-xs sm:text-sm">
              Aucun projet ne correspond à "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredProjects.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 hover:shadow-dream transition-shadow group relative"
              >
                <Link
                  to={`/dashboard/projects/${p.id}`}
                  className="block"
                >
                  {p.cover_url && (
                    <img src={p.cover_url} alt="" className="w-full h-28 object-cover rounded-lg mb-2.5 border border-border/50" />
                  )}
                  <h3 className="font-display font-semibold text-sm sm:text-base mb-1 group-hover:text-primary transition-colors pr-6">
                    {p.title}
                  </h3>
                  {(() => {
                    const meta = parseProjectMeta(p.description);
                    const tags = meta.genre ? meta.genre.split(", ") : [];
                    const tones = meta.tone ? meta.tone.split(", ") : [];
                    const synopsisText = meta.synopsis || null;
                    return (
                      <>
                        {(tags.length > 0 || tones.length > 0) && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {tags.map((tag) => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{tag}</span>
                            ))}
                            {tones.map((tone) => (
                              <span key={tone} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">{tone}</span>
                            ))}
                          </div>
                        )}
                        {synopsisText && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{synopsisText}</p>
                        )}
                      </>
                    );
                  })()}
                  <p className="text-xs text-muted-foreground mt-1 sm:mt-2">
                    {new Date(p.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteTargetId(p.id);
                  }}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors z-10"
                  title="Supprimer le projet"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation suppression */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Supprimer le projet
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer{" "}
              <strong>{deleteTargetProject?.title}</strong> ? Cette action est
              irréversible et supprimera tous les assets et chapitres associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProject.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
