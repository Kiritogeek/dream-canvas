// Comptes agrégés pour le Tableau de bord : chapitres et assets par projet + totaux.
// 2 requêtes RLS-scopées (l'utilisateur ne voit que ses lignes), comptage client.
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  chaptersByProject: Record<string, number>;
  assetsByProject: Record<string, number>;
  totalChapters: number;
  totalAssets: number;
}

const EMPTY: DashboardStats = { chaptersByProject: {}, assetsByProject: {}, totalChapters: 0, totalAssets: 0 };

function countByProject(rows: Array<{ project_id: string | null }> | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows ?? []) {
    if (r.project_id) out[r.project_id] = (out[r.project_id] ?? 0) + 1;
  }
  return out;
}

export function useDashboardStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-stats"],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<DashboardStats> => {
      const [chaptersRes, assetsRes] = await Promise.all([
        supabase.from("chapters").select("project_id"),
        supabase.from("assets").select("project_id"),
      ]);
      const chaptersRows = (chaptersRes.data ?? []) as Array<{ project_id: string | null }>;
      const assetsRows = (assetsRes.data ?? []) as Array<{ project_id: string | null }>;
      return {
        chaptersByProject: countByProject(chaptersRows),
        assetsByProject: countByProject(assetsRows),
        totalChapters: chaptersRows.length,
        totalAssets: assetsRows.length,
      };
    },
    placeholderData: EMPTY,
  });
}
