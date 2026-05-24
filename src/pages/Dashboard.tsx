import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, FolderOpen, Sparkles, Image, Zap, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRecentProjects, useProjectCount, useCreateProject } from "@/hooks/useProjects";
import { useAssetCount } from "@/hooks/useAssets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { planDisplayName, TIER_CONFIG } from "@/types";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ARIANE_DISPLAY_NAME,
  ARIANE_ONBOARDING_ADMIN_EMAIL,
  ARIANE_STYLE_ONBOARDING_NEXT_CREATE_SESSION_KEY,
  ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY,
  ARIANE_WELCOME_REPLAY_EVENT,
} from "@/constants/ariane";
import { useAuth } from "@/hooks/useAuth";
import { resetProgressiveOnboardingSimulation, bindForcedProgressiveProjectAfterCreate } from "@/lib/progressiveOnboardingStorage";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: projects = [], isLoading } = useRecentProjects(6);
  const { data: projectCount = 0 } = useProjectCount();
  const { data: assetCount = 0 } = useAssetCount();
  const { plan, usageInfo, limits } = useUserPlan();
  const createProject = useCreateProject();

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSynopsis, setNewSynopsis] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedTone, setSelectedTone] = useState("");

  const canReplayArianeOnboarding =
    user?.email?.trim().toLowerCase() === ARIANE_ONBOARDING_ADMIN_EMAIL;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (!newSynopsis.trim()) {
      toast({ title: "Synopsis requis", description: "Décris ton histoire en quelques phrases pour qu'Ariane puisse t'aider dès l'Univers.", variant: "destructive" });
      return;
    }
    if (!selectedGenre) {
      toast({ title: "Genre requis", description: "Choisis un genre pour que l'IA adapte ses suggestions à ton univers.", variant: "destructive" });
      return;
    }
    if (limits.maxProjects !== null && projectCount >= limits.maxProjects) {
      toast({
        title: "Limite de projets atteinte",
        description: `Le plan ${planDisplayName(plan)} est limité à ${limits.maxProjects} projet. Passez au plan Créateur pour des projets illimités.`,
        variant: "destructive",
      });
      return;
    }
    const parts: string[] = [];
    if (selectedGenre) parts.push(`[Tags: ${selectedGenre}]`);
    if (selectedTone) parts.push(`[Tone: ${selectedTone}]`);
    const prefix = parts.join("");
    const body = newSynopsis.trim();
    const finalDescription = prefix || body
      ? `${prefix}${body ? (prefix ? " " + body : body) : ""}`
      : null;
    const isFirstProject = projectCount === 0;
    createProject.mutate(
      { title: newTitle.trim(), description: finalDescription },
      {
        onSuccess: (data) => {
          setCreateOpen(false);
          setNewTitle("");
          setNewSynopsis("");
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
        onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
      }
    );
  };

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
            <span className="font-medium text-foreground/90">{ARIANE_DISPLAY_NAME}</span>{" "}
            vous souhaite la bienvenue. Prêt à tisser de nouvelles histoires&nbsp;?
            Créez un projet et commencez à générer vos webtoons.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gradient-primary text-primary-foreground shadow-dream sm:text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau projet
            </Button>
            {canReplayArianeOnboarding ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-[hsl(var(--lavender)/0.4)] bg-background/40 text-sm"
                  onClick={() => window.dispatchEvent(new CustomEvent(ARIANE_WELCOME_REPLAY_EVENT))}
                >
                  Relancer l’onboarding Ariane
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-[hsl(var(--mint)/0.35)] bg-background/40 text-sm"
                  onClick={() => {
                    resetProgressiveOnboardingSimulation(user?.id);
                    window.dispatchEvent(new CustomEvent(ARIANE_WELCOME_REPLAY_EVENT));
                    toast({
                      title: "Parcours débutant réinitialisé",
                      description:
                        "Bienvenue Ariane, Style et menus New seront proposés après création d’un projet ou en naviguant.",
                    });
                  }}
                >
                  Simuler première connexion (menus)
                </Button>
              </>
            ) : null}
          </div>
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
                  plan === "studio"
                    ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30"
                    : plan === "createur"
                    ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {plan === "studio" ? <Brain className="h-3 w-3" /> : plan === "createur" ? <Zap className="h-3 w-3" /> : null}
                Plan {planDisplayName(plan)}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {"FLUX.2 Pro"}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-medium">
              {usageInfo.count}/{usageInfo.limit} générations
            </span>
          </div>
          <div className="w-full bg-foreground/10 rounded-full h-2 sm:h-2.5">
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
          {plan === "libre" && (
            <p className="text-xs text-muted-foreground mt-2">
              Passez au plan {planDisplayName("createur")} pour le découpage IA, l'export PNG et {TIER_CONFIG.createur.maxGenerationsPerMonth} générations/mois.
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
                    {(() => {
                      const tags = p.description?.match(/^\[Tags: ([^\]]+)\]/)?.[1]?.split(", ") ?? [];
                      const tones = p.description?.match(/\[Tone: ([^\]]+)\]/)?.[1]?.split(", ") ?? [];
                      const synopsisText = p.description
                        ?.replace(/\[Tags: [^\]]*\]/g, "")
                        .replace(/\[Tone: [^\]]*\]/g, "")
                        .trim() || null;
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
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {synopsisText || "Aucune description"}
                          </p>
                        </>
                      );
                    })()}
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

      {/* Dialog création projet */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-display">Nouveau projet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Mon super webtoon"
                required
              />
            </div>

            {/* Genre + Tonalité côte à côte */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Genre <span className="text-red-400 text-xs">*</span></Label>
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
              <Label>
                Synopsis <span className="text-red-400 text-xs">*</span>
                <span className="text-muted-foreground font-normal text-xs ml-1">— Ariane s'en sert pour peupler ton Univers</span>
              </Label>
              <Textarea
                value={newSynopsis}
                onChange={(e) => setNewSynopsis(e.target.value)}
                placeholder="En quelques phrases, de quoi parle ton histoire ? Quels sont les personnages principaux, le contexte, les enjeux ?"
                rows={4}
                className="resize-none"
                required
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
    </DashboardLayout>
  );
}
