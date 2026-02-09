import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, FolderOpen, Sparkles, Image, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";

interface Project {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setProjects(data || []);
        setLoading(false);
      });
  }, [user]);

  const stats = [
    { icon: FolderOpen, label: "Projets", value: projects.length },
    { icon: Image, label: "Assets", value: "—" },
    { icon: BookOpen, label: "Chapitres", value: "—" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-dream rounded-2xl p-8 shadow-dream"
        >
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Bienvenue sur DreamWeave ✨
          </h1>
          <p className="text-muted-foreground mb-4">
            Prêt à tisser de nouvelles histoires ? Créez un projet et commencez à générer vos webtoons.
          </p>
          <Button asChild className="gradient-primary text-primary-foreground shadow-dream">
            <Link to="/dashboard/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau projet
            </Link>
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-xl p-4 text-center">
              <s.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-display font-bold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recent projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold">Projets récents</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/projects">Voir tout</Link>
            </Button>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-xl p-6 h-40 animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Sparkles className="h-10 w-10 mx-auto mb-4 text-primary opacity-50" />
              <p className="text-muted-foreground">
                Aucun projet pour l'instant. Créez votre premier webtoon !
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/dashboard/projects/${p.id}`}
                    className="block glass rounded-xl p-6 hover:shadow-dream transition-shadow duration-300 group"
                  >
                    <h3 className="font-display font-semibold mb-1 group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.description || "Aucune description"}</p>
                    <p className="text-xs text-muted-foreground mt-3">
                      {new Date(p.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
