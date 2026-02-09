import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Trash2, Sparkles } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";

interface Project {
  id: string;
  title: string;
  description: string | null;
  style_template: string | null;
  created_at: string;
}

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({ title: title.trim(), description: description.trim() || null, user_id: user.id })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else if (data) {
      setOpen(false);
      setTitle("");
      setDescription("");
      navigate(`/dashboard/projects/${data.id}`);
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
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
                <DialogTitle className="font-display">Nouveau projet</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mon super webtoon" required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="De quoi parle votre histoire ?" rows={3} />
                </div>
                <Button type="submit" disabled={creating} className="w-full gradient-primary text-primary-foreground">
                  {creating ? "Création..." : "Créer le projet"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-xl p-6 h-40 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
            <h3 className="font-display font-semibold text-lg mb-2">Aucun projet</h3>
            <p className="text-muted-foreground mb-4">Créez votre premier projet pour commencer !</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-6 hover:shadow-dream transition-shadow group relative"
              >
                <Link to={`/dashboard/projects/${p.id}`} className="block">
                  <h3 className="font-display font-semibold mb-1 group-hover:text-primary transition-colors">{p.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.description || "Aucune description"}</p>
                  <p className="text-xs text-muted-foreground mt-3">{new Date(p.created_at).toLocaleDateString("fr-FR")}</p>
                </Link>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
