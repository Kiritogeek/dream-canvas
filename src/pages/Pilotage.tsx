import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalKPICards from "@/components/admin/GlobalKPICards";
import PlanDistributionChart from "@/components/admin/PlanDistributionChart";
import ActivityChart from "@/components/admin/ActivityChart";
import type { Granularity } from "@/components/admin/ActivityChart";
import UserListTable from "@/components/admin/UserListTable";
import UserDetailDrawer from "@/components/admin/UserDetailDrawer";
import DeleteUserDialog from "@/components/admin/DeleteUserDialog";
import {
  fetchGlobalKPIs,
  fetchTestKPIs,
  fetchUsersList,
  resetUserQuota,
  deleteUser,
  toggleExcluded,
  type AdminGlobalKPIs,
  type AdminUserRow,
} from "@/services/adminService";
import { ARIANE_ONBOARDING_ADMIN_EMAIL } from "@/constants/ariane";

type FetchPeriod = "30d" | "90d" | "1y";
const PERIOD_LABELS: Record<FetchPeriod, string> = { "30d": "30 jours", "90d": "3 mois", "1y": "1 an" };

const GRAN_LABELS: Record<Granularity, string> = {
  days: "Jours", weeks: "Semaines", months: "Mois", years: "Années",
};

function PeriodSelector({ value, onChange }: { value: FetchPeriod; onChange: (p: FetchPeriod) => void }) {
  return (
    <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
      {(Object.keys(PERIOD_LABELS) as FetchPeriod[]).map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            value === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}>
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

function GranularitySelector({ value, onChange, options }: {
  value: Granularity;
  onChange: (g: Granularity) => void;
  options: Granularity[];
}) {
  return (
    <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
      {options.map((g) => (
        <button key={g} onClick={() => onChange(g)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            value === g ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}>
          {GRAN_LABELS[g]}
        </button>
      ))}
    </div>
  );
}

function GlobalView({ testOnly = false }: { testOnly?: boolean }) {
  const [kpis, setKpis] = useState<AdminGlobalKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FetchPeriod>("30d");
  const [activityGran, setActivityGran] = useState<Granularity>("days");

  const fetchFn = testOnly ? fetchTestKPIs : fetchGlobalKPIs;

  useEffect(() => {
    setLoading(true);
    fetchFn(period).then(setKpis).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, testOnly]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground text-sm uppercase tracking-wider text-muted-foreground">
            {testOnly ? "Comptes de test" : "Vue d'ensemble"}
          </h3>
          <div className="flex items-center gap-2">
            <PeriodSelector value={period} onChange={setPeriod} />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={loading}
              onClick={() => { setLoading(true); fetchFn(period).then(setKpis).finally(() => setLoading(false)); }}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <GlobalKPICards data={kpis} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Distribution des plans</h3>
          <PlanDistributionChart data={kpis?.planDistribution ?? null} loading={loading} />
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground">Générations</h3>
            <GranularitySelector value={activityGran} onChange={setActivityGran} options={["days", "weeks", "months", "years"]} />
          </div>
          <ActivityChart data={kpis?.dailyGenerations ?? null} loading={loading} granularity={activityGran} />
        </div>
      </div>
    </div>
  );
}

function UsersView() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    userId: string; displayName: string; email: string
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    fetchUsersList({ page, search, plan: planFilter === "all" ? undefined : planFilter })
      .then((res) => { setUsers(res.users); setTotal(res.total); })
      .finally(() => setLoading(false));
  }, [page, search, planFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSearchChange = (s: string) => { setSearch(s); setPage(1); };
  const handlePlanFilterChange = (p: string) => { setPlanFilter(p); setPage(1); };

  const handleResetQuota = async (userId: string, displayName: string) => {
    try {
      await resetUserQuota(userId);
      toast({ title: `Quota réinitialisé pour ${displayName}` });
      load();
    } catch {
      toast({ title: "Erreur", description: "Impossible de réinitialiser le quota", variant: "destructive" });
    }
  };

  const handleDeleteUserRequest = (userId: string, displayName: string, email: string) => {
    setDeleteTarget({ userId, displayName, email });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteUser(deleteTarget.userId);
      toast({ title: `Compte supprimé : ${deleteTarget.displayName}` });
      setDeleteTarget(null);
      setSelectedUserId(null);
      load();
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer le compte", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleExcluded = async (userId: string, displayName: string, currentlyExcluded: boolean) => {
    try {
      await toggleExcluded(userId);
      toast({
        title: currentlyExcluded
          ? `${displayName} inclus dans les stats`
          : `${displayName} exclu des stats`,
      });
      load();
    } catch {
      toast({ title: "Erreur", description: "Impossible de modifier le statut", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <UserListTable
        users={users}
        total={total}
        loading={loading}
        page={page}
        search={search}
        planFilter={planFilter}
        onPageChange={setPage}
        onSearchChange={handleSearchChange}
        onPlanFilterChange={handlePlanFilterChange}
        onSelectUser={setSelectedUserId}
        onResetQuota={handleResetQuota}
        onDeleteUser={handleDeleteUserRequest}
        onToggleExcluded={handleToggleExcluded}
      />

      <UserDetailDrawer
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onResetQuota={handleResetQuota}
        onDeleteUser={handleDeleteUserRequest}
        onPlanChanged={load}
        onToggleExcluded={handleToggleExcluded}
      />

      <DeleteUserDialog
        open={!!deleteTarget}
        displayName={deleteTarget?.displayName ?? ""}
        email={deleteTarget?.email ?? ""}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  );
}

export default function Pilotage() {
  const { user } = useAuth();

  if (user?.email?.trim().toLowerCase() !== ARIANE_ONBOARDING_ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Pilotage</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tableau de bord administrateur — métriques et gestion utilisateurs
          </p>
        </div>

        <Tabs defaultValue="global" className="space-y-6">
          <TabsList className="glass">
            <TabsTrigger value="global">Vue Globale</TabsTrigger>
            <TabsTrigger value="test">Vue Test</TabsTrigger>
            <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
          </TabsList>

          <TabsContent value="global">
            <GlobalView />
          </TabsContent>

          <TabsContent value="test">
            <GlobalView testOnly />
          </TabsContent>

          <TabsContent value="utilisateurs">
            <UsersView />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
