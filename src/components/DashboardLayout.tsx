import { ReactNode, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation, useNavigate, useMatch } from "react-router-dom";
import {
  Sparkles, LayoutDashboard, LogOut, User, Zap, Brain, Crown, Menu, X,
  Palette, Image as ImageIcon, BookOpen, Layers, Plus, Pencil, Globe, FlaskConical,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { planDisplayName } from "@/types";
import { useProject, useProjects, useUpdateProject } from "@/hooks/useProjects";
import { useProgressiveMenuSidebarState } from "@/hooks/useProgressiveMenuGate";
import { useHasAssetNotif, useBlockNotifsForProject } from "@/lib/generationPending";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArianeOnboardingCard } from "@/components/ariane";
import { PROJECT_MENU_LABEL } from "@/lib/projectMenuLabels";
import { ARIANE_ONBOARDING_ADMIN_EMAIL, ARIANE_STYLE_ONBOARDING_STORAGE_KEY } from "@/constants/ariane";

const ALL_NAV_LINKS = [
  { to: "/dashboard",          icon: LayoutDashboard, label: "Tableau de bord", adminOnly: false },
  { to: "/dashboard/plans",    icon: Crown,           label: "Plans",           adminOnly: false },
  { to: "/dashboard/profile",  icon: User,            label: "Profil",          adminOnly: false },
  { to: "/dashboard/pilotage", icon: BarChart2,       label: "Pilotage",        adminOnly: true  },
];

const projectSteps = [
  { key: "edition",  label: PROJECT_MENU_LABEL.edition,  icon: Layers    },
  { key: "assets",   label: PROJECT_MENU_LABEL.assets,   icon: ImageIcon },
  { key: "scenario", label: PROJECT_MENU_LABEL.scenario, icon: BookOpen  },
  { key: "universe", label: PROJECT_MENU_LABEL.universe, icon: Globe     },
  { key: "style",    label: PROJECT_MENU_LABEL.style,    icon: Palette   },
] as const;

function ProjectStepsSection({ projectId, onLinkClick }: { projectId: string; onLinkClick?: () => void }) {
  const location = useLocation();
  const isInChapter = location.pathname.includes("/chapter/");
  const isScenarioEditor = /\/projects\/[^/]+\/scenario\//.test(location.pathname);
  const activeTab = isInChapter
    ? "edition"
    : isScenarioEditor
      ? "scenario"
      : new URLSearchParams(location.search).get("tab") || "style";
  const { data: project } = useProject(projectId);
  const { user } = useAuth();
  const isAdmin = user?.email?.trim().toLowerCase() === ARIANE_ONBOARDING_ADMIN_EMAIL;
  const { isResolved, appliesProgressiveFlow, accessible, showNew } = useProgressiveMenuSidebarState(
    projectId,
    activeTab
  );
  const hasAssetNotif = useHasAssetNotif(projectId);
  const blockNotifs = useBlockNotifsForProject(projectId);
  const updateProject = useUpdateProject();
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const openEdit = () => {
    if (!project) return;
    setEditTitle(project.title);
    setEditOpen(true);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !editTitle.trim()) return;
    updateProject.mutate(
      {
        id: projectId,
        updates: { title: editTitle.trim() },
      },
      {
        onSuccess: () => { toast({ title: "Projet mis à jour !" }); setEditOpen(false); },
        onError: (err) =>
          toast({ title: "Erreur", description: err.message, variant: "destructive" }),
      }
    );
  };

  const baseSteps = isAdmin
    ? [...projectSteps, { key: "test", label: "Test", icon: FlaskConical } as const]
    : projectSteps;

  const styleOnboardingDone = user?.id
    ? (() => { try { return localStorage.getItem(`${ARIANE_STYLE_ONBOARDING_STORAGE_KEY}_${user.id}`) === "1"; } catch { return false; } })()
    : false;

  const sidebarSteps =
    appliesProgressiveFlow
      ? baseSteps.filter((step) => {
          if (step.key === "style") return true;
          if (step.key === "test") return isAdmin;
          if (!styleOnboardingDone) return false;
          if (!isResolved) return false;
          return accessible[step.key as keyof typeof accessible];
        })
      : baseSteps;

  return (
    <div className="mt-3">
      {project && (
        <div className="flex items-center justify-between px-5 mb-2">
          <h2
            className="text-sm font-display font-bold text-foreground leading-tight truncate"
            title={project.title}
          >
            {project.title}
          </h2>
          <button
            onClick={openEdit}
            className="p-1 rounded-md text-muted-foreground/75 hover:text-primary transition-colors shrink-0"
            title="Modifier le projet"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <nav className="border-l border-border/60 ml-4">
        <AnimatePresence initial={false}>
          {sidebarSteps.map((step) => {
            const Icon = step.icon;
            const isActive = activeTab === step.key;
            const to = "path" in step
              ? `/dashboard/projects/${projectId}/${step.path}`
              : `/dashboard/projects/${projectId}?tab=${step.key}`;
            const className = `flex items-center gap-3 pl-4 pr-3 py-2.5 text-sm font-medium transition-colors duration-150 border-l-2 -ml-px ${
              isActive
                ? "border-primary text-foreground bg-primary/8"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50"
            }`;
            const newBadge =
              showNew[step.key as keyof typeof showNew] &&
              step.key !== "style" ? (
                <span className="shrink-0 rounded-full bg-mint px-1.5 py-0 text-[10px] font-bold uppercase tracking-wide text-white">
                  New
                </span>
              ) : null;
            const showGenNotif = !isActive && (
              (step.key === "assets" && hasAssetNotif) ||
              (step.key === "edition" && blockNotifs.size > 0)
            );
            const genNotifBadge = showGenNotif ? (
              <span className="relative shrink-0 inline-flex items-center justify-center w-4 h-4">
                <span className="absolute inset-0 rounded-full bg-[hsl(var(--lavender)/0.5)] animate-ping" />
                <span className="relative inline-flex items-center justify-center w-4 h-4 rounded-full gradient-primary">
                  <Sparkles className="h-2.5 w-2.5 text-white" />
                </span>
              </span>
            ) : null;
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <Link
                  to={to}
                  onClick={onLinkClick}
                  className={className}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${isActive ? "text-primary" : ""}`} />
                  <span className="flex-1 truncate">{step.label}</span>
                  {newBadge}
                  {genNotifBadge}
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </nav>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-display">Modifier le projet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={updateProject.isPending}
              className="w-full gradient-primary text-primary-foreground"
            >
              {updateProject.isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectsListSection({ onLinkClick }: { onLinkClick?: () => void }) {
  const { data: projects = [] } = useProjects();
  const location = useLocation();

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-5 mb-2">
        <span className="text-sm font-display font-bold text-foreground">Mes projets</span>
        <Link
          to="/dashboard/projects"
          onClick={onLinkClick}
          className="p-1 rounded-md text-muted-foreground/75 hover:text-primary transition-colors"
          title="Voir tous les projets"
        >
          <Plus className="h-3.5 w-3.5" />
        </Link>
      </div>

      <nav className="space-y-0.5 px-2">
        {projects.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-2">Aucun projet</p>
        ) : (
          projects.map((p) => {
            const isActive = location.pathname.startsWith(`/dashboard/projects/${p.id}`);
            return (
              <Link
                key={p.id}
                to={`/dashboard/projects/${p.id}`}
                onClick={onLinkClick}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                  isActive
                    ? "bg-primary/10 text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                <span className="truncate">{p.title}</span>
              </Link>
            );
          })
        )}
      </nav>
    </div>
  );
}

/** Tableau de bord (nav principale) actif sur l'accueil dashboard et sur la liste des projets — pas sur une fiche projet. */
function isTableauDeBordNavActive(pathname: string): boolean {
  return pathname === "/dashboard" || pathname === "/dashboard/projects";
}

function SidebarContextSection({ onLinkClick }: { onLinkClick?: () => void }) {
  const projectMatch = useMatch("/dashboard/projects/:id");
  const chapterMatch = useMatch("/dashboard/projects/:id/chapter/:chapterId");
  const editionMatch = useMatch("/dashboard/projects/:id/edition");
  const scenarioEditorMatch = useMatch("/dashboard/projects/:id/scenario/:chapterId");
  const projectId =
    projectMatch?.params?.id ??
    chapterMatch?.params?.id ??
    editionMatch?.params?.id ??
    scenarioEditorMatch?.params?.id;
  const animKey = projectId ?? "list";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={animKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {projectId
          ? <ProjectStepsSection projectId={projectId} onLinkClick={onLinkClick} />
          : <ProjectsListSection onLinkClick={onLinkClick} />}
      </motion.div>
    </AnimatePresence>
  );
}

export default function DashboardLayout({ children, fluidSection, compactHeader }: { children: ReactNode; fluidSection?: ReactNode; compactHeader?: boolean }) {
  const { user, signOut } = useAuth();
  const { plan, usageInfo } = useUserPlan();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.email?.trim().toLowerCase() === ARIANE_ONBOARDING_ADMIN_EMAIL;
  const navLinks = ALL_NAV_LINKS.filter((item) => !item.adminOnly || isAdmin);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50 shadow-sm">
        <div className="px-4 sm:px-6 flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/dashboard"
              className="group/logo flex items-center gap-1.5 sm:gap-2 transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary transition-transform duration-300 group-hover/logo:animate-logo-sparkle" />
              <span className="font-display text-lg sm:text-xl font-bold text-gradient">DreamWeave</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/dashboard/plans"
              className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80 ${
                plan === "studio"
                  ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30"
                  : plan === "createur"
                  ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
              title="Voir les plans"
            >
              {plan === "studio" ? <Brain className="h-3 w-3" /> : plan === "createur" ? <Zap className="h-3 w-3" /> : null}
              {planDisplayName(plan)}
            </Link>
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">
              <Sparkles className="h-3 w-3" />
              {usageInfo.count}/{usageInfo.limit}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-1.5 transition-transform duration-300 hover:rotate-90"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen
                ? <X className="h-5 w-5 animate-in fade-in zoom-in-95 duration-200" />
                : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile/tablet dropdown */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden border-t border-border/50 bg-card/95 backdrop-blur-xl animate-menu-slide origin-top"
            role="menu"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((item, index) => {
                const active =
                  item.to === "/dashboard"
                    ? isTableauDeBordNavActive(location.pathname)
                    : location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors animate-menu-item-in [animation-fill-mode:both] ${
                      index === 0 ? "stagger-1" : index === 1 ? "stagger-2" : "stagger-3"
                    } ${
                      active
                        ? "gradient-primary text-primary-foreground shadow-dream"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="pt-2 border-t border-border/60 animate-menu-item-in [animation-fill-mode:both] stagger-4">
                <SidebarContextSection onLinkClick={() => setMobileMenuOpen(false)} />
              </div>

              <div className="pt-2 border-t border-border/50 animate-menu-item-in [animation-fill-mode:both] stagger-5">
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full animate-menu-item-in [animation-fill-mode:both] stagger-6"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-1 pt-14 sm:pt-16">
        {/* Desktop sidebar — lg+ only */}
        <aside className="hidden lg:flex flex-col fixed left-0 top-16 w-[260px] h-[calc(100vh-4rem)] border-r border-border/60 bg-sidebar z-40 overflow-y-auto">
          <div className="py-4 flex flex-col h-full">
            <nav className="border-l border-border/60 ml-4">
              {navLinks.map((item) => {
                const isActive =
                  item.to === "/dashboard"
                    ? isTableauDeBordNavActive(location.pathname)
                    : location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 pl-4 pr-3 py-2.5 text-sm font-medium transition-colors duration-150 border-l-2 -ml-px ${
                      isActive
                        ? "border-primary text-foreground bg-primary/8"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 flex-shrink-0 transition-colors ${isActive ? "text-primary" : ""}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <SidebarContextSection />

            <div className="flex-1" />

            <div className="px-4 pt-3 border-t border-border/60">
              <p className="text-xs text-muted-foreground truncate mb-2">{user?.email}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-[260px] min-w-0 bg-content flex flex-col">
          <div
            key={location.pathname}
            className={[
              "w-full px-6 sm:px-8 lg:px-10 animate-fade-up",
              compactHeader ? "" : "py-6 sm:py-8",
            ].join(" ")}
          >
            {children}
          </div>
          {fluidSection}
        </main>
      </div>
      <ArianeOnboardingCard />
    </div>
  );
}
