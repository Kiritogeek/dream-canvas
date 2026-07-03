import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useUserPlan } from "@/hooks/useUserPlan";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { TIER_CONFIG } from "@/types";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardHome, type DashboardProject, type DashboardStyleKey } from "@/components/dashboard/DashboardHome";
import {
  ARIANE_ONBOARDING_ADMIN_EMAIL,
  ARIANE_STYLE_ONBOARDING_NEXT_CREATE_SESSION_KEY,
  ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY,
  ARIANE_WELCOME_REPLAY_EVENT,
} from "@/constants/ariane";
import { useAuth } from "@/hooks/useAuth";
import { resetProgressiveOnboardingSimulation, bindForcedProgressiveProjectAfterCreate } from "@/lib/progressiveOnboardingStorage";
import { buildProjectDescription, parseProjectMeta } from "@/lib/projectMeta";
import { extractStyleKeyFromTemplateText } from "@/lib/styleTemplateMeta";

const KNOWN_STYLE_KEYS: DashboardStyleKey[] = ["manga", "webtoon-coreen", "manhwa-chinois", "europeen"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: projects = [] } = useRecentProjects(6);
  const { data: projectCount = 0 } = useProjectCount();
  const { plan, usageInfo, nextResetDate } = useUserPlan();
  const { data: stats } = useDashboardStats();
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
    const finalDescription = buildProjectDescription({ genre: selectedGenre, tone: selectedTone, synopsis: newSynopsis });
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

  const displayName =
    (user?.user_metadata?.display_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Créateur";

  const planConfig = {
    libre: { label: TIER_CONFIG.libre.label, maxProjects: TIER_CONFIG.libre.maxProjects },
    createur: { label: TIER_CONFIG.createur.label, maxProjects: TIER_CONFIG.createur.maxProjects },
    studio: { label: TIER_CONFIG.studio.label, maxProjects: TIER_CONFIG.studio.maxProjects },
  };

  const mappedProjects: DashboardProject[] = projects.map((p) => {
    const meta = parseProjectMeta(p.description);
    const rawKey = extractStyleKeyFromTemplateText(p.style_template);
    const styleKey = (KNOWN_STYLE_KEYS as string[]).includes(rawKey ?? "")
      ? (rawKey as DashboardStyleKey)
      : null;
    return {
      id: p.id,
      title: p.title,
      tags: [meta.genre, meta.tone].filter(Boolean),
      styleKey,
      coverUrl: p.cover_url ?? null,
      createdAtLabel: new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
      chaptersCount: stats?.chaptersByProject[p.id] ?? 0,
      assetsCount: stats?.assetsByProject[p.id] ?? 0,
    };
  });

  const renewLabel = nextResetDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  return (
    <DashboardLayout>
      {canReplayArianeOnboarding && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-[hsl(var(--lavender)/0.4)] bg-background/40 text-xs"
            onClick={() => window.dispatchEvent(new CustomEvent(ARIANE_WELCOME_REPLAY_EVENT))}
          >
            Relancer l’onboarding Ariane
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-[hsl(var(--mint)/0.35)] bg-background/40 text-xs"
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
        </div>
      )}

      <DashboardHome
        displayName={displayName}
        email={user?.email ?? ""}
        plan={plan}
        planConfig={planConfig}
        usage={{ count: usageInfo.count, limit: usageInfo.limit }}
        projectCount={projectCount}
        totalChapters={stats?.totalChapters ?? 0}
        totalAssets={stats?.totalAssets ?? 0}
        projects={mappedProjects}
        renewLabel={renewLabel}
        onNewProject={() => setCreateOpen(true)}
      />

      {/* Dialog — création de projet */}
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
                <span className="text-muted-foreground font-normal text-xs ml-1">(Ariane s'en sert pour peupler ton Univers)</span>
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
