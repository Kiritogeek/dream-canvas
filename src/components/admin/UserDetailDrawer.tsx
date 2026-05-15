import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { TIER_CONFIG } from "@/types";
import type { UserPlan } from "@/types";
import {
  fetchUserDetail, setUserPlan,
  type AdminUserDetail,
} from "@/services/adminService";
import ActivityChart from "./ActivityChart";

interface Props {
  userId: string | null;
  onClose: () => void;
  onResetQuota: (userId: string, displayName: string) => void;
  onDeleteUser: (userId: string, displayName: string, email: string) => void;
  onPlanChanged: () => void;
  onToggleExcluded: (userId: string, displayName: string, currentlyExcluded: boolean) => void;
}

function parseStyleTemplate(raw: string | null): string {
  if (!raw) return "—";
  const m = raw.match(/Style_principal:\s*([^\s]+)/i) ?? raw.match(/Style_key:\s*([^\s]+)/i);
  if (m) return m[1];
  return raw.length > 18 ? raw.slice(0, 18) + "…" : raw;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function aggregateActivity(recentActivity: AdminUserDetail["recentActivity"]): { date: string; count: number }[] {
  const counts: Record<string, number> = {};
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400_000);
    counts[d.toISOString().slice(0, 10)] = 0;
  }
  for (const item of recentActivity) {
    const day = item.created_at.slice(0, 10);
    if (day in counts) counts[day]++;
  }
  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}

function planLabel(plan: string): string {
  if (plan === "createur") return "Créateur";
  if (plan === "studio") return "Studio";
  return "Libre";
}

export default function UserDetailDrawer({ userId, onClose, onResetQuota, onDeleteUser, onPlanChanged, onToggleExcluded }: Props) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) { setDetail(null); return; }
    setLoadingDetail(true);
    setDetail(null);
    setShowAllProjects(false);
    setPendingPlan(null);
    fetchUserDetail(userId)
      .then(setDetail)
      .finally(() => setLoadingDetail(false));
  }, [userId]);

  const handlePlanChange = async (newPlan: string) => {
    if (!userId || !detail) return;
    setPlanLoading(true);
    try {
      await setUserPlan(userId, newPlan as UserPlan);
      toast({ title: "Plan mis à jour" });
      onPlanChanged();
      setDetail((d) => d ? { ...d, profile: { ...d.profile, plan: newPlan } } : d);
    } catch {
      toast({ title: "Erreur", description: "Impossible de changer le plan", variant: "destructive" });
    } finally {
      setPlanLoading(false);
    }
  };

  const confirmPlanChange = async () => {
    if (!pendingPlan) return;
    await handlePlanChange(pendingPlan);
    setPendingPlan(null);
  };

  const copyEmail = () => {
    if (!detail) return;
    navigator.clipboard.writeText(detail.profile.email);
    toast({ title: "Email copié" });
  };

  const handleToggleExcluded = () => {
    if (!detail) return;
    onToggleExcluded(detail.profile.user_id, detail.profile.display_name, detail.profile.excluded_from_stats);
    setDetail((d) => d ? {
      ...d,
      profile: { ...d.profile, excluded_from_stats: !d.profile.excluded_from_stats },
    } : d);
  };

  const plan = (detail?.profile.plan ?? "libre") as UserPlan;
  const quota = TIER_CONFIG[plan]?.maxGenerationsPerMonth ?? 20;
  const remaining = Math.max(0, quota - (detail?.generationsThisMonth ?? 0));

  const displayedProjects = showAllProjects
    ? (detail?.projects ?? [])
    : (detail?.projects ?? []).slice(0, 5);

  const activityData = detail ? aggregateActivity(detail.recentActivity) : null;

  return (
    <Sheet open={!!userId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <SheetHeader>
              <SheetTitle className="font-display sr-only">Détail utilisateur</SheetTitle>
            </SheetHeader>

            {loadingDetail && (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-muted rounded-lg h-10" />
                ))}
              </div>
            )}

            {!loadingDetail && detail && (
              <>
                {/* En-tête */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarFallback className="text-lg font-bold gradient-primary text-primary-foreground">
                      {(detail.profile.display_name || detail.profile.email || "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-lg text-foreground truncate">
                      {detail.profile.display_name || "Sans pseudo"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-sm text-muted-foreground truncate">{detail.profile.email}</p>
                      <button
                        onClick={copyEmail}
                        className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
                        title="Copier l'email"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Inscrit le {formatDate(detail.profile.created_at)}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <PlanBadge plan={detail.profile.plan} />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            {detail.sessions7d > 0 ? (
                              <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0 cursor-help">
                                Actif
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="cursor-help">Inactif</Badge>
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                          {detail.sessions7d > 0
                            ? `A généré des images ${detail.sessions7d} jour${detail.sessions7d > 1 ? "s" : ""} différent${detail.sessions7d > 1 ? "s" : ""} cette semaine.`
                            : "Aucune génération dans les 7 derniers jours."}
                        </TooltipContent>
                      </Tooltip>
                      {detail.profile.excluded_from_stats && (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                          Exclu des stats
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-3">
                  <KpiCard label="Gén. mois" value={String(detail.generationsThisMonth)} />
                  <KpiCard label="Gén. total" value={String(detail.generationsTotal)} />
                  <KpiCard label="Quota restant" value={String(remaining)} />
                  <KpiCard label="Projets" value={String(detail.projectsCount)} />
                  <KpiCard label="Assets" value={String(detail.assetsCount)} />
                  <KpiCard label="Chapitres" value={String(detail.chaptersCount)} />
                  <KpiCard label="Sessions 7j" value={String(detail.sessions7d)} />
                </div>

                {/* Mini graphique */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Activité — 30 derniers jours</p>
                  <div className="overflow-hidden rounded-lg">
                    <ActivityChart data={activityData} loading={false} />
                  </div>
                </div>

                {/* Projets */}
                {detail.projects.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">
                      Projets ({detail.projects.length})
                    </p>
                    <div className="space-y-2">
                      {displayedProjects.map((p) => (
                        <div key={p.id} className="glass rounded-lg p-3 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-foreground truncate">{p.title}</p>
                            {p.style_template && (
                              <Badge variant="outline" className="shrink-0 text-xs capitalize">
                                {parseStyleTemplate(p.style_template)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{p.assets_count} asset{p.assets_count !== 1 ? "s" : ""}</span>
                            <span>{p.chapters_count} chapitre{p.chapters_count !== 1 ? "s" : ""}</span>
                            <span className="ml-auto">{formatDate(p.updated_at)}</span>
                          </div>
                        </div>
                      ))}
                      {!showAllProjects && detail.projects.length > 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-muted-foreground"
                          onClick={() => setShowAllProjects(true)}
                        >
                          Voir les {detail.projects.length - 5} autres projets
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Actions support */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions support
                  </p>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => onResetQuota(detail.profile.user_id, detail.profile.display_name)}
                  >
                    🔄 Réinitialiser le quota
                  </Button>

                  <Button
                    variant="outline"
                    className={`w-full justify-start gap-2 ${
                      detail.profile.excluded_from_stats
                        ? "text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                        : "text-muted-foreground"
                    }`}
                    onClick={handleToggleExcluded}
                  >
                    {detail.profile.excluded_from_stats ? "👁️ Inclure dans les stats" : "🙈 Exclure des stats"}
                  </Button>

                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Changer le plan</p>
                    <Select
                      value={detail.profile.plan}
                      onValueChange={(v) => { if (v !== detail.profile.plan) setPendingPlan(v); }}
                      disabled={planLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="libre">Libre</SelectItem>
                        <SelectItem value="createur">Créateur</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                      </SelectContent>
                    </Select>
                    {pendingPlan && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                        <span className="text-amber-600 dark:text-amber-400">
                          Passer à <strong>{planLabel(pendingPlan)}</strong> ?
                        </span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setPendingPlan(null)}>Annuler</Button>
                          <Button size="sm" onClick={confirmPlanChange} disabled={planLoading}>Confirmer</Button>
                        </div>
                      </div>
                    )}
                    {detail.profile.plan !== "libre" && detail.profile.billing_period_start && (
                      <p className="text-xs text-muted-foreground">
                        Renouvellement le {formatDate(detail.profile.billing_period_start)}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => onDeleteUser(
                      detail.profile.user_id,
                      detail.profile.display_name,
                      detail.profile.email,
                    )}
                  >
                    🗑️ Supprimer le compte
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-3 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold font-display text-foreground">{value}</p>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "createur") {
    return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0">Créateur</Badge>;
  }
  if (plan === "studio") {
    return <Badge className="bg-violet-500/20 text-violet-600 dark:text-violet-400 border-0">Studio</Badge>;
  }
  return <Badge variant="secondary">Libre</Badge>;
}
