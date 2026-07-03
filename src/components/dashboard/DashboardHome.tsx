// Tableau de bord — design DreamWeaveBoard (Claude design) adapté à React Router + données réelles.
// Reçoit des données déjà mappées ; la logique (dialog création, onboarding) reste dans Dashboard.tsx.
import { Link, useNavigate } from "react-router-dom";
import {
  FolderOpen, BookOpen, Image as ImageIcon, Coins, Sparkles, Flame,
  Calendar, TrendingUp, Plus, Palette, ArrowRight, Clock, Mail, User,
  Gift, Zap, Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardStyleKey = "manga" | "webtoon-coreen" | "manhwa-chinois" | "europeen";

export interface DashboardProject {
  id: string;
  title: string;
  tags: string[];
  styleKey: DashboardStyleKey | null;
  coverUrl: string | null;
  createdAtLabel: string;
  chaptersCount: number;
  assetsCount: number;
}

export interface DashboardPlanConfig { label: string; maxProjects: number | null }
type PlanId = "libre" | "createur" | "studio";

interface DashboardHomeProps {
  displayName: string;
  email: string;
  plan: PlanId;
  planConfig: Record<PlanId, DashboardPlanConfig>;
  usage: { count: number; limit: number };
  projectCount: number;
  totalChapters: number;
  totalAssets: number;
  projects: DashboardProject[];
  renewLabel: string;
  onNewProject: () => void;
}

const STYLE_META: Record<DashboardStyleKey, { label: string; cover: string }> = {
  "manga":          { label: "Manga",          cover: "linear-gradient(165deg, #f3f4f6 0%, #6b7280 60%, #111827 100%)" },
  "webtoon-coreen": { label: "Webtoon Coréen",  cover: "linear-gradient(165deg, #f5d0fe 0%, #c4b5fd 50%, #a5b4fc 100%)" },
  "manhwa-chinois": { label: "Manhwa Chinois",  cover: "linear-gradient(165deg, #fca5a5 0%, #fdba74 55%, #fde68a 100%)" },
  "europeen":       { label: "Bande dessinée",  cover: "linear-gradient(165deg, #bfdbfe 0%, #a5f3fc 55%, #bae6fd 100%)" },
};

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string; value: React.ReactNode; sub?: string; accent: string;
}) {
  return (
    <div className="glass rounded-xl p-4 sm:p-5 flex items-start gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-dream group">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110", accent)}>
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <div className="text-xl sm:text-2xl font-display font-bold leading-none">{value}</div>
        <div className="text-xs sm:text-sm text-muted-foreground mt-1">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground/80 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function ProjectCard({ project: p }: { project: DashboardProject }) {
  const meta = p.styleKey ? STYLE_META[p.styleKey] : null;
  const cover = meta?.cover ?? "linear-gradient(135deg, hsl(275 55% 65%), hsl(20 75% 68%))";

  return (
    <Link
      to={`/dashboard/projects/${p.id}`}
      className="group block glass rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-dream"
    >
      <div className="relative h-28 sm:h-32 overflow-hidden">
        {p.coverUrl ? (
          <img src={p.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105" style={{ background: cover }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,.32))" }} />
        <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur text-[11px] font-semibold text-zinc-800 shadow-sm">
          <Palette size={11} className="text-primary" /> {meta?.label ?? "Style libre"}
        </span>
        <span className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full gradient-primary text-primary-foreground text-xs font-semibold shadow-dream opacity-0 translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
          Ouvrir <ArrowRight size={13} />
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <h3 className="font-display font-bold text-base sm:text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">
          {p.title}
        </h3>
        {p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {p.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{t}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><BookOpen size={13} className="text-[hsl(var(--peach-deep))]" /><span>{p.chaptersCount} chapitre{p.chaptersCount > 1 ? "s" : ""}</span></span>
          <span className="flex items-center gap-1.5"><ImageIcon size={13} className="text-[hsl(170_45%_42%)]" /><span>{p.assetsCount} asset{p.assetsCount > 1 ? "s" : ""}</span></span>
          <span className="flex items-center gap-1.5 ml-auto"><Clock size={12} /><span>{p.createdAtLabel}</span></span>
        </div>
      </div>
    </Link>
  );
}

export function DashboardHome({
  displayName, email, plan, planConfig, usage, projectCount, totalChapters, totalAssets, projects, renewLabel, onNewProject,
}: DashboardHomeProps) {
  const navigate = useNavigate();
  const cfg = planConfig[plan];

  const usagePct = usage.limit > 0 ? Math.round((usage.count / usage.limit) * 100) : 0;
  const remaining = Math.max(0, usage.limit - usage.count);
  const initial = (displayName || "C").charAt(0).toUpperCase();

  const PlanIcon = plan === "studio" ? Brain : plan === "createur" ? Zap : Gift;
  const planBadge =
    plan === "studio"   ? "bg-violet-500/15 text-violet-600 border border-violet-500/30"
  : plan === "createur" ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
  :                       "bg-muted text-muted-foreground border border-border";

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* En-tête compte */}
      <section className="glass rounded-2xl p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center text-2xl font-display font-bold shadow-dream shrink-0 transition-transform duration-300 hover:scale-105 hover:rotate-3">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl sm:text-2xl font-display font-bold">Bonjour, {displayName}</h1>
              <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold", planBadge)}>
                <PlanIcon size={12} /> Plan {cfg.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Mail size={13} /> {email}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => navigate("/dashboard/profile")}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent">
              <User size={15} /> <span className="hidden sm:inline">Mon profil</span>
            </button>
            <button onClick={onNewProject}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md gradient-primary text-primary-foreground text-sm font-medium shadow-dream transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow">
              <Plus size={16} /> Nouveau projet
            </button>
          </div>
        </div>
      </section>

      {/* Statistiques */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={FolderOpen} label="Projets" value={projectCount}
          sub={cfg.maxProjects ? `sur ${cfg.maxProjects} inclus` : "illimités"}
          accent="bg-[hsl(var(--lavender)/0.15)] text-[hsl(var(--lavender))]" />
        <StatCard icon={BookOpen} label="Chapitres" value={totalChapters}
          sub="tous projets confondus"
          accent="bg-[hsl(var(--peach)/0.2)] text-[hsl(var(--peach-deep))]" />
        <StatCard icon={ImageIcon} label="Assets créés" value={totalAssets}
          sub="personnages, décors, objets"
          accent="bg-[hsl(var(--mint)/0.22)] text-[hsl(170_45%_38%)]" />
        <StatCard icon={Coins} label="Crédits restants" value={remaining}
          sub={`renouvelés le ${renewLabel}`}
          accent="bg-primary/10 text-primary" />
      </section>

      {/* Générations IA */}
      <section className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles size={17} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-base leading-tight">Générations IA</h2>
              <p className="text-xs text-muted-foreground">Modèle FLUX.2 Pro · ce mois-ci</p>
            </div>
          </div>
          <span className="text-sm font-semibold tabular-nums">
            <span className={cn(usagePct >= 90 ? "text-destructive" : usagePct >= 70 ? "text-amber-600" : "text-primary")}>{usage.count}</span>
            <span className="text-muted-foreground"> / {usage.limit}</span>
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", usagePct >= 90 ? "bg-destructive" : usagePct >= 70 ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${Math.min(100, usagePct)}%` }} />
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Flame size={13} className="text-primary" /><span>{remaining} génération{remaining > 1 ? "s" : ""} disponible{remaining > 1 ? "s" : ""}</span></span>
          <span className="flex items-center gap-1.5"><Calendar size={13} /><span>Réinitialisation le {renewLabel}</span></span>
        </div>

        {plan === "libre" && (
          <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground flex-1 min-w-[180px]">
              Passez au plan <span className="font-semibold text-foreground">Créateur</span> pour plus de générations par mois.
            </p>
            <button onClick={() => navigate("/dashboard/plans")}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md gradient-primary text-primary-foreground text-sm font-medium shrink-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow">
              <TrendingUp size={15} /> Améliorer
            </button>
          </div>
        )}
      </section>

      {/* Mes projets */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-display font-semibold">Mes projets</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {projectCount === 0 ? "Commencez votre première histoire" : `${projectCount} univers en cours de création`}
            </p>
          </div>
          {projectCount > 0 && (
            <Link to="/dashboard/projects" className="group inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Tout voir <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {projects.length === 0 ? (
          <button onClick={onNewProject}
            className="w-full rounded-2xl border-2 border-dashed border-border hover:border-primary bg-card/30 hover:bg-primary/5 transition-all duration-200 py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary group">
            <span className="w-14 h-14 rounded-2xl bg-muted group-hover:bg-primary/15 flex items-center justify-center transition-all duration-200 group-hover:scale-110">
              <Plus size={26} />
            </span>
            <span className="font-semibold">Créer mon premier webtoon</span>
          </button>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
            <button onClick={onNewProject}
              className="min-h-[190px] rounded-2xl border-2 border-dashed border-border hover:border-primary bg-card/20 hover:bg-primary/5 transition-all duration-200 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary group">
              <span className="w-14 h-14 rounded-2xl bg-muted group-hover:bg-primary/15 flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:rotate-90">
                <Plus size={26} />
              </span>
              <span className="font-semibold text-sm">Nouveau projet</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
