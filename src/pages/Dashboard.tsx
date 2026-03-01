import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, FolderOpen, Sparkles, Image, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecentProjects, useProjectCount } from "@/hooks/useProjects";
import { useAssetCount } from "@/hooks/useAssets";
import { useUserPlan } from "@/hooks/useUserPlan";
import DashboardLayout from "@/components/DashboardLayout";

export default function Dashboard() {
  const { data: projects = [], isLoading } = useRecentProjects(6);
  const { data: projectCount = 0 } = useProjectCount();
  const { data: assetCount = 0 } = useAssetCount();
  const { plan, usageInfo, limits } = useUserPlan();

  const usagePercent = Math.min(
    100,
    Math.round((usageInfo.count / usageInfo.limit) * 100)
  );

  const stats = [
    { icon: FolderOpen, label: "Projets", value: projectCount },
    { icon: Image, label: "Assets", value: assetCount },
    { icon: Sparkles, label: "Générations", value: `${usageInfo.count}/${usageInfo.limit}` },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-dream rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-dream"
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold mb-2">
            Bienvenue sur DreamWeave
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4">
            Prêt à tisser de nouvelles histoires ? Créez un projet et commencez
            à générer vos webtoons.
          </p>
          <Button
            asChild
            size="sm"
            className="gradient-primary text-primary-foreground shadow-dream sm:text-sm"
          >
            <Link to="/dashboard/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau projet
            </Link>
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
              <s.icon className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1.5 sm:mb-2 text-primary" />
              <div className="text-lg sm:text-2xl font-display font-bold">{s.value}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Barre de progression usage + info tier */}
        <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  plan === "pro"
                    ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {plan === "pro" && <Zap className="h-3 w-3" />}
                Plan {plan === "pro" ? "Pro" : "Free"}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {plan === "free" ? "Schnell" : "FLUX.2 Pro"}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-medium">
              {usageInfo.count}/{usageInfo.limit} générations
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 sm:h-2.5">
            <div
              className={`h-2 sm:h-2.5 rounded-full transition-all duration-500 ${
                usagePercent >= 90
                  ? "bg-destructive"
                  : usagePercent >= 70
                    ? "bg-amber-500"
                    : "bg-primary"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {plan === "free" && (
            <p className="text-xs text-muted-foreground mt-2">
              Passez au plan Pro pour les images de référence, vues multiples et 300 générations/mois.
            </p>
          )}
        </div>

        {/* Recent projects */}
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-display font-semibold">
              Projets récents
            </h2>
            <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm">
              <Link to="/dashboard/projects">Voir tout</Link>
            </Button>
          </div>
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
            <div className="glass rounded-lg sm:rounded-xl p-8 sm:p-12 text-center">
              <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 sm:mb-4 text-primary opacity-50" />
              <p className="text-sm sm:text-base text-muted-foreground">
                Aucun projet pour l'instant. Créez votre premier webtoon !
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {projects.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/dashboard/projects/${p.id}`}
                    className="block glass rounded-lg sm:rounded-xl p-4 sm:p-6 hover:shadow-dream transition-shadow duration-300 group"
                  >
                    <h3 className="font-display font-semibold text-sm sm:text-base mb-1 group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {p.description || "Aucune description"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 sm:mt-3">
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
