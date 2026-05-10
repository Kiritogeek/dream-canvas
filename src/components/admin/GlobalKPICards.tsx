import { Users, Activity, TrendingUp, UserPlus, Zap, Crown, HelpCircle, ArrowRightLeft, Euro, BarChart3 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AdminGlobalKPIs } from "@/services/adminService";

interface Props {
  data: AdminGlobalKPIs | null;
  loading: boolean;
}

const cards = [
  {
    key: "totalUsers",
    label: "Utilisateurs",
    icon: Users,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    definition: "Nombre total de comptes créés sur DreamWeave depuis le lancement.",
  },
  {
    key: "active7d",
    label: "Actifs 7 jours",
    icon: Activity,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    definition: "Utilisateurs ayant effectué au moins 1 génération d'image au cours des 7 derniers jours.",
  },
  {
    key: "active30d",
    label: "Actifs 30 jours",
    icon: TrendingUp,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    definition: "Utilisateurs ayant effectué au moins 1 génération d'image au cours des 30 derniers jours. Mesure la rétention mensuelle.",
  },
  {
    key: "newUsers7d",
    label: "Nouveaux 7j",
    icon: UserPlus,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    definition: "Comptes créés au cours des 7 derniers jours. Mesure l'acquisition récente.",
  },
  {
    key: "activationRate",
    label: "Taux d'activation",
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    definition: "Pourcentage d'utilisateurs inscrits ayant fait au moins 1 génération. Cible mémoire : > 60 %.",
  },
  {
    key: "dauMauRatio",
    label: "DAU / MAU",
    icon: BarChart3,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    definition: "Ratio engagement : utilisateurs actifs aujourd'hui / actifs 30 jours. Mesure la régularité d'usage. Cible mémoire : > 30 %.",
  },
  {
    key: "paidUsers",
    label: "Plans payants",
    icon: Crown,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    definition: "Utilisateurs sur un plan Créateur ou Studio (abonnement actif). Mesure directe du revenu.",
  },
  {
    key: "conversionRate",
    label: "Taux conversion",
    icon: ArrowRightLeft,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    definition: "Pourcentage d'utilisateurs inscrits ayant souscrit un plan payant (Libre → Créateur/Studio). Cible mémoire : > 5 %.",
  },
  {
    key: "arpuEstimated",
    label: "ARPU estimé",
    icon: Euro,
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    definition: "Revenu moyen par utilisateur payant estimé depuis le nombre de Créateurs (7,99 €) et Studios (19,99 €). Cible mémoire : > 18 €.",
  },
] as const;

function formatValue(key: typeof cards[number]["key"], data: AdminGlobalKPIs): string {
  if (key === "activationRate") return `${Math.round(data.activationRate * 100)} %`;
  if (key === "conversionRate") return `${data.conversionRate.toFixed(1)} %`;
  if (key === "dauMauRatio") return `${data.dauMauRatio.toFixed(1)} %`;
  if (key === "arpuEstimated") return `${data.arpuEstimated.toFixed(2)} €`;
  return String(data[key as keyof AdminGlobalKPIs]);
}

export default function GlobalKPICards({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded-xl h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map(({ key, label, icon: Icon, color, bg, border, definition }) => (
        <div
          key={key}
          className={`glass rounded-xl p-4 flex flex-col gap-3 border ${border} transition-shadow hover:shadow-dream`}
        >
          <div className="flex items-center justify-between">
            <div className={`rounded-lg p-2 ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
                {definition}
              </TooltipContent>
            </Tooltip>
          </div>
          <div>
            <p className={`text-2xl font-bold font-display ${color}`}>
              {data ? formatValue(key, data) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
