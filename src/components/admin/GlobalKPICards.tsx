import { useState } from "react";
import {
  Users, Activity, TrendingUp, UserPlus, Zap, HelpCircle,
  DollarSign, Lock, Sparkles, Brain, ChevronDown, ChevronUp,
  RotateCcw, Shield, Gauge, FlameKindling,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AdminGlobalKPIs } from "@/services/adminService";
import ActivityChart from "./ActivityChart";

interface Props {
  data: AdminGlobalKPIs | null;
  loading: boolean;
}

const TREND_KEYS: ReadonlySet<string> = new Set(["totalUsers", "newUsers7d", "active7d"]);

function TrendIndicator({ cardKey, trends }: {
  cardKey: string;
  trends: AdminGlobalKPIs["kpiTrends"] | undefined;
}) {
  if (!trends || !TREND_KEYS.has(cardKey)) return null;
  const delta = trends[cardKey as keyof typeof trends] as number | undefined;
  if (delta === undefined || delta === 0) return null;
  return delta > 0
    ? <span className="text-xs text-emerald-500">↑ +{delta}</span>
    : <span className="text-xs text-rose-500">↓ {delta}</span>;
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  definition: string;
  cardKey: string;
  trends?: AdminGlobalKPIs["kpiTrends"];
  clickable?: boolean;
  expanded?: boolean;
  onClick?: () => void;
}

function KpiCard({ label, value, icon: Icon, color, bg, border, definition, cardKey, trends, clickable, expanded, onClick }: KpiCardProps) {
  return (
    <div
      className={`glass rounded-xl p-4 flex flex-col gap-3 border ${border} transition-all hover:shadow-dream ${clickable ? "cursor-pointer select-none" : ""} ${expanded ? "ring-1 ring-primary/30" : ""}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 ${bg}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="flex items-center gap-1">
          {clickable && (
            expanded
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
          )}
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
              {definition}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div>
        <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        <TrendIndicator cardKey={cardKey} trends={trends} />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
      {children}
    </p>
  );
}

function SkeletonGrid({ count, cols = 4 }: { count: number; cols?: 2 | 3 | 4 }) {
  const colClass = cols === 4 ? "lg:grid-cols-4" : cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";
  return (
    <div className={`grid grid-cols-2 ${colClass} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse bg-muted rounded-xl h-28" />
      ))}
    </div>
  );
}

export default function GlobalKPICards({ data, loading }: Props) {
  const [showHistory, setShowHistory] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><div className="h-3 w-20 bg-muted rounded animate-pulse mb-3" /><SkeletonGrid count={4} cols={4} /></div>
        <div><div className="h-3 w-28 bg-muted rounded animate-pulse mb-3" /><SkeletonGrid count={4} cols={4} /></div>
        <div><div className="h-3 w-36 bg-muted rounded animate-pulse mb-3" /><SkeletonGrid count={3} cols={3} /></div>
        <div><div className="h-3 w-16 bg-muted rounded animate-pulse mb-3" /><SkeletonGrid count={4} cols={4} /></div>
      </div>
    );
  }

  const d = data;
  const trends = d?.kpiTrends;

  return (
    <div className="space-y-6">

      {/* ── Audience ─────────────────────────────────── */}
      <div>
        <SectionLabel>Audience</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard cardKey="totalUsers" label="Total utilisateurs"
            value={d ? String(d.totalUsers) : "—"}
            icon={Users} color="text-sky-500" bg="bg-sky-500/10" border="border-sky-500/20"
            definition="Nombre total de comptes créés depuis le lancement."
            trends={trends}
          />
          <KpiCard cardKey="active7d" label="Actifs 7 jours"
            value={d ? String(d.active7d) : "—"}
            icon={Activity} color="text-emerald-500" bg="bg-emerald-500/10" border="border-emerald-500/20"
            definition="Utilisateurs ayant généré au moins 1 image dans les 7 derniers jours."
            trends={trends}
          />
          <KpiCard cardKey="active30d" label="Actifs 30 jours"
            value={d ? String(d.active30d) : "—"}
            icon={TrendingUp} color="text-teal-500" bg="bg-teal-500/10" border="border-teal-500/20"
            definition="Utilisateurs ayant généré au moins 1 image dans les 30 derniers jours."
            trends={trends}
          />
          <KpiCard cardKey="newUsers7d" label="Nouveaux 7j"
            value={d ? String(d.newUsers7d) : "—"}
            icon={UserPlus} color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20"
            definition="Comptes créés dans les 7 derniers jours. Cliquer pour l'historique semaine par semaine."
            trends={trends}
            clickable expanded={showHistory}
            onClick={() => setShowHistory((v) => !v)}
          />
        </div>
        {showHistory && (
          <div className="mt-3 glass rounded-xl p-5 border border-blue-500/20">
            <p className="text-sm font-medium text-foreground mb-4">Nouveaux utilisateurs — historique semaine par semaine</p>
            <ActivityChart data={d?.dailyNewUsers ?? null} loading={false} granularity="weeks" />
          </div>
        )}
      </div>

      {/* ── Santé produit ─────────────────────────────── */}
      <div>
        <SectionLabel>Santé produit</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard cardKey="activationRate" label="Taux d'activation"
            value={d ? `${Math.min(100, Math.round(d.activationRate * 100))} %` : "—"}
            icon={Zap} color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/20"
            definition="% d'inscrits ayant fait au moins 1 génération. Cible : > 60 %."
            trends={trends}
          />
          <KpiCard cardKey="retentionD7" label="Rétention J7"
            value={d ? `${d.retentionD7 ?? 0} %` : "—"}
            icon={Shield} color="text-indigo-500" bg="bg-indigo-500/10" border="border-indigo-500/20"
            definition="% des inscrits de la semaine précédente qui ont généré au moins 1 image dans leurs 7 premiers jours. Signal de product-market fit. Cible : > 40 %."
            trends={trends}
          />
          <KpiCard cardKey="totalGenerations" label="Générations totales"
            value={d ? String(d.totalGenerations ?? 0) : "—"}
            icon={FlameKindling} color="text-orange-500" bg="bg-orange-500/10" border="border-orange-500/20"
            definition="Nombre total de générations d'images depuis le lancement. Mesure le volume d'usage réel du produit."
            trends={trends}
          />
          <KpiCard cardKey="churnEstimated" label="Churn estimé"
            value={d ? `${d.churnEstimated ?? 0} %` : "—"}
            icon={RotateCcw} color="text-rose-500" bg="bg-rose-500/10" border="border-rose-500/20"
            definition="% d'utilisateurs ayant eu un abonnement payant et repassés en Libre. Proxy du churn réel. Cible : < 5 %."
            trends={trends}
          />
        </div>
      </div>

      {/* ── Saturation quotas ─────────────────────────── */}
      <div>
        <SectionLabel>Saturation des quotas ce mois-ci</SectionLabel>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard cardKey="quota_libre" label="Quota Libre atteint"
            value={d ? `${d.quotaSaturation?.libre ?? 0} %` : "—"}
            icon={Gauge} color="text-slate-400" bg="bg-slate-400/10" border="border-slate-400/20"
            definition="% d'utilisateurs Libre (0 €) ayant utilisé les 20 crédits ce mois. Signal d'upgrade vers Créateur."
            trends={trends}
          />
          <KpiCard cardKey="quota_createur" label="Quota Créateur atteint"
            value={d ? `${d.quotaSaturation?.createur ?? 0} %` : "—"}
            icon={Gauge} color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/20"
            definition="% d'utilisateurs Créateur ayant utilisé les 100 crédits ce mois. Signal d'upgrade vers Studio."
            trends={trends}
          />
          <KpiCard cardKey="quota_studio" label="Quota Studio atteint"
            value={d ? `${d.quotaSaturation?.studio ?? 0} %` : "—"}
            icon={Gauge} color="text-violet-500" bg="bg-violet-500/10" border="border-violet-500/20"
            definition="% d'utilisateurs Studio ayant utilisé les 250 crédits ce mois. Si élevé → envisager un plan supérieur."
            trends={trends}
          />
        </div>
      </div>

      {/* ── Revenus ───────────────────────────────────── */}
      <div>
        <SectionLabel>Revenus</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard cardKey="mrrEstimated" label="MRR estimé"
            value={d ? `${(d.mrrEstimated ?? 0).toFixed(2)} €` : "—"}
            icon={DollarSign} color="text-emerald-400" bg="bg-emerald-400/10" border="border-emerald-400/20"
            definition="Revenu Mensuel Récurrent : (nb Créateur × 12,99 € + nb Studio × 29,99 €)."
            trends={trends}
          />
          <KpiCard cardKey="plan_libre" label="Plan Libre"
            value={d ? String(d.planDistribution?.libre ?? 0) : "—"}
            icon={Lock} color="text-slate-400" bg="bg-slate-400/10" border="border-slate-400/20"
            definition="Utilisateurs sur le plan gratuit Libre (0 €)."
            trends={trends}
          />
          <KpiCard cardKey="plan_createur" label="Plan Créateur"
            value={d ? String(d.planDistribution?.createur ?? 0) : "—"}
            icon={Sparkles} color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/20"
            definition="Utilisateurs abonnés au plan Créateur (12,99 €/mois)."
            trends={trends}
          />
          <KpiCard cardKey="plan_studio" label="Plan Studio"
            value={d ? String(d.planDistribution?.studio ?? 0) : "—"}
            icon={Brain} color="text-violet-500" bg="bg-violet-500/10" border="border-violet-500/20"
            definition="Utilisateurs abonnés au plan Studio (29,99 €/mois)."
            trends={trends}
          />
        </div>
      </div>

    </div>
  );
}
