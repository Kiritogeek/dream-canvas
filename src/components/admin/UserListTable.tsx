import { Eye, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { AdminUserRow } from "@/services/adminService";

const PAGE_SIZE = 20;

interface Props {
  users: AdminUserRow[];
  total: number;
  loading: boolean;
  page: number;
  search: string;
  planFilter: string;
  onPageChange: (p: number) => void;
  onSearchChange: (s: string) => void;
  onPlanFilterChange: (p: string) => void;
  onSelectUser: (userId: string) => void;
  onResetQuota: (userId: string, displayName: string) => void;
  onDeleteUser: (userId: string, displayName: string, email: string) => void;
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "createur") {
    return (
      <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0 capitalize">
        Créateur
      </Badge>
    );
  }
  if (plan === "studio") {
    return (
      <Badge className="bg-violet-500/20 text-violet-600 dark:text-violet-400 border-0 capitalize">
        Studio
      </Badge>
    );
  }
  return <Badge variant="secondary">Libre</Badge>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function UserListTable({
  users,
  total,
  loading,
  page,
  search,
  planFilter,
  onPageChange,
  onSearchChange,
  onPlanFilterChange,
  onSelectUser,
  onResetQuota,
  onDeleteUser,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher pseudo ou email..."
          className="flex-1"
        />
        <Select value={planFilter} onValueChange={onPlanFilterChange}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Tous les plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="libre">Libre</SelectItem>
            <SelectItem value="createur">Créateur</SelectItem>
            <SelectItem value="studio">Studio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded-lg h-12" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl">
          <div className="min-w-[500px] border border-border overflow-hidden rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Inscrit</TableHead>
                  <TableHead className="text-right">Gén. mois</TableHead>
                  <TableHead className="text-right">Projets</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow
                      key={u.user_id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => onSelectUser(u.user_id)}
                    >
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{u.display_name || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{u.email}</p>
                        </div>
                      </TableCell>
                      <TableCell><PlanBadge plan={u.plan} /></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(u.created_at)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{u.generationsThisMonth}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{u.projectsCount}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Voir le détail"
                            onClick={() => onSelectUser(u.user_id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Réinitialiser le quota"
                            onClick={() => onResetQuota(u.user_id, u.display_name)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Supprimer le compte"
                            onClick={() => onDeleteUser(u.user_id, u.display_name, u.email)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} utilisateur{total !== 1 ? "s" : ""} au total</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Précédent
          </Button>
          <span className="px-2">Page {page} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
