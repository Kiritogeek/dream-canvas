import { useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CompassProposal, LoreNodeType } from "@/types";

const SCAN_DEBOUNCE_MS = 300_000;

interface LorePrefillData {
  asset_id: string;
  asset_type: "character" | "background" | "object";
  chapter_id: string | null;
  chapter_number: number | null;
}

const ASSET_TO_LORE_TYPE: Record<string, LoreNodeType> = {
  character: "character",
  background: "location",
  object: "object",
};

export function useArianeLoreProposals(projectId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMounted = useRef(false);

  const { data: proposals = [] } = useQuery({
    queryKey: ["lore-proposals", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compass_proposals")
        .select("*")
        .eq("project_id", projectId)
        .eq("proposal_type", "lore_asset")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompassProposal[];
    },
    enabled: !!projectId && !!user,
  });

  const runScan = useCallback(async () => {
    if (!user || !projectId) return;

    const [
      { data: assets },
      { data: scenarioChapters },
      { data: canvasChapters },
      { data: existingNodes },
      { data: existingProposals },
    ] = await Promise.all([
      supabase.from("assets").select("id, name, asset_type").eq("project_id", projectId),
      supabase.from("scenario_chapters").select("id, chapter_number, content").eq("project_id", projectId).order("chapter_number"),
      supabase.from("chapters").select("id, chapter_number").eq("project_id", projectId),
      supabase.from("lore_nodes").select("asset_id").eq("project_id", projectId),
      supabase.from("compass_proposals").select("dedupe_key").eq("project_id", projectId).eq("proposal_type", "lore_asset"),
    ]);

    if (!assets?.length || !scenarioChapters?.length) return;

    const alreadyInLore = new Set(
      (existingNodes ?? []).map((n) => n.asset_id).filter(Boolean) as string[]
    );
    const alreadyProposed = new Set((existingProposals ?? []).map((p) => p.dedupe_key));
    const canvasMap = new Map((canvasChapters ?? []).map((c) => [c.chapter_number, c.id]));

    const toInsert: Array<{
      project_id: string;
      user_id: string;
      proposal_type: string;
      origin: string;
      title: string;
      content: string;
      prefill_data: LorePrefillData;
      status: string;
      dedupe_key: string;
    }> = [];

    for (const asset of assets) {
      if (alreadyInLore.has(asset.id)) continue;
      const dedupeKey = `lore_asset-${asset.id}`;
      if (alreadyProposed.has(dedupeKey)) continue;

      const lowerName = asset.name.toLowerCase().trim();
      if (lowerName.length < 2) continue;

      let firstChapterId: string | null = null;
      let firstChapterNumber: number | null = null;

      for (const sc of scenarioChapters) {
        if (sc.content?.toLowerCase().includes(lowerName)) {
          firstChapterId = canvasMap.get(sc.chapter_number) ?? null;
          firstChapterNumber = sc.chapter_number;
          break;
        }
      }

      if (!firstChapterNumber) continue;

      toInsert.push({
        project_id: projectId,
        user_id: user.id,
        proposal_type: "lore_asset",
        origin: "extracted",
        title: asset.name,
        content: asset.name,
        prefill_data: {
          asset_id: asset.id,
          asset_type: asset.asset_type as "character" | "background" | "object",
          chapter_id: firstChapterId,
          chapter_number: firstChapterNumber,
        },
        status: "active",
        dedupe_key: dedupeKey,
      });
    }

    if (toInsert.length > 0) {
      await supabase.from("compass_proposals").insert(toInsert);
      qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
    }
  }, [projectId, user, qc]);

  const { data: chaptersSignature } = useQuery({
    queryKey: ["chapters-signature-lore", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("scenario_chapters")
        .select("id, updated_at")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });
      return data?.map((c) => `${c.id}:${c.updated_at}`).join("|") ?? "";
    },
    enabled: !!projectId && !!user,
    refetchInterval: 30_000,
    staleTime: 0,
  });

  useEffect(() => {
    if (chaptersSignature === undefined) return;

    if (!hasMounted.current) {
      hasMounted.current = true;
      runScan();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runScan, SCAN_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [chaptersSignature, runScan]);

  const acceptMutation = useMutation({
    mutationFn: async (proposal: CompassProposal) => {
      if (!user) throw new Error("Not authenticated");
      const prefill = proposal.prefill_data as unknown as LorePrefillData;
      const loreType: LoreNodeType = ASSET_TO_LORE_TYPE[prefill.asset_type] ?? "object";

      const { error: nodeError } = await supabase.from("lore_nodes").insert({
        project_id: projectId,
        user_id: user.id,
        type: loreType,
        name: proposal.title,
        description: null,
        image_url: null,
        asset_id: prefill.asset_id,
        chapter_id: prefill.chapter_id,
        pos_x: 200 + Math.random() * 400,
        pos_y: 200 + Math.random() * 300,
      });
      if (nodeError) throw nodeError;

      const { error: propError } = await supabase
        .from("compass_proposals")
        .update({ status: "accepted" })
        .eq("id", proposal.id);
      if (propError) throw propError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
      qc.invalidateQueries({ queryKey: ["lore-nodes", projectId] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase
        .from("compass_proposals")
        .update({ status: "dismissed" })
        .eq("id", proposalId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
    },
  });

  const acceptAll = useCallback(async () => {
    for (const p of proposals) {
      await acceptMutation.mutateAsync(p);
    }
  }, [proposals, acceptMutation]);

  return {
    proposals,
    acceptProposal: (p: CompassProposal) => acceptMutation.mutate(p),
    acceptAll,
    dismissProposal: (id: string) => dismissMutation.mutate(id),
    isAccepting: acceptMutation.isPending,
  };
}
