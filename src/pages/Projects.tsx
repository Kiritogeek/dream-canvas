import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Trash2, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

    createProject.mutate(
      { title: title.trim(), description: description.trim() || null },
      {
        onSuccess: (data) => {
          setOpen(false);
          setTitle("");
          setDescription("");
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Mes projets</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground shadow-dream">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau projet
              </Button>
            </DialogTrigger>
            <DialogContent className="glass">
              <DialogHeader>
                <DialogTitle className="font-display">
                  Nouveau projet
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Mon super webtoon"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="De quoi parle votre histoire ?"
                    rows={3}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={createProject.isPending}
                  className="w-full gradient-primary text-primary-foreground"
                >
                  {createProject.isPending
                    ? "Création..."
                    : "Créer le projet"}
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass rounded-xl p-6 h-40 animate-pulse"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
            <h3 className="font-display font-semibold text-lg mb-2">
              Aucun projet
            </h3>
            <p className="text-muted-foreground mb-4">
              Créez votre premier projet pour commencer !
            </p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Search className="h-8 w-8 mx-auto mb-3 text-primary opacity-40" />
            <p className="text-muted-foreground text-sm">
              Aucun projet ne correspond à "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-6 hover:shadow-dream transition-shadow group relative"
              >
                <Link
                  to={`/dashboard/projects/${p.id}`}
                  className="block"
                >
                  <h3 className="font-display font-semibold mb-1 group-hover:text-primary transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {p.description || "Aucune description"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    {new Date(p.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </Link>
                <button
                  onClick={() => setDeleteTargetId(p.id)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  title="Supprimer le projet"
                >
                  <Trash2 className="h-4 w-4" />
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
