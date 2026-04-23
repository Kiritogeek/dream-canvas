import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Trash2, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function Projects() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [panelsTarget, setPanelsTarget] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const genreTags = [
    { label: "Fantasy",   emoji: "🧙" },
    { label: "Médiéval",  emoji: "⚔️" },
    { label: "SF",        emoji: "🚀" },
    { label: "Romance",   emoji: "💕" },
    { label: "Action",    emoji: "⚡" },
    { label: "Mystère",   emoji: "🔍" },
    { label: "Webtoon",   emoji: "📱" },
    { label: "Manga",     emoji: "🎌" },
    { label: "Européen",  emoji: "🎨" },
    { label: "Horreur",   emoji: "👻" },
    { label: "Historique",emoji: "🏛️" },
    { label: "Comédie",   emoji: "😄" },
  ];

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

    const finalDescription = selectedTags.length
      ? `[Tags: ${selectedTags.join(", ")}]`
      : null;

    const panelsNum = panelsTarget.trim()
      ? Math.max(1, Math.min(99, parseInt(panelsTarget, 10) || 10))
      : null;

    createProject.mutate(
      { title: title.trim(), description: finalDescription, panels_target_per_chapter: panelsNum },
      {
        onSuccess: (data) => {
          setOpen(false);
          setTitle("");
          setPanelsTarget("");
          setSelectedTags([]);
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

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
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
                <div className="space-y-2">
                  <Label>Genre</Label>
                  <div className="flex flex-wrap gap-2">
                    {genreTags.map(({ label, emoji }) => {
                      const active = selectedTags.includes(label);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => toggleTag(label)}
                          className={[
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-150",
                            active
                              ? "border-primary/60 bg-primary/15 text-foreground shadow-sm scale-105"
                              : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5",
                          ].join(" ")}
                        >
                          <span className="text-base leading-none">{emoji}</span>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cases cible */}
                <div className="space-y-2">
                  <Label>Cases cible par chapitre <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={panelsTarget}
                    onChange={(e) => setPanelsTarget(e.target.value)}
                    placeholder="ex. 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Référence indicative pour le découpage IA et la barre de progression.
                  </p>
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
                  <h3 className="font-display font-semibold text-sm sm:text-base mb-1 group-hover:text-primary transition-colors pr-6">
                    {p.title}
                  </h3>
                  {(() => {
                    const tags = p.description?.match(/^\[Tags: ([^\]]+)\]/)?.[1]?.split(", ") ?? [];
                    return tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  <p className="text-xs text-muted-foreground mt-1 sm:mt-2">
                    {new Date(p.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </Link>
                <button
                  onClick={() => setDeleteTargetId(p.id)}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 text-muted-foreground hover:text-destructive transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
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
