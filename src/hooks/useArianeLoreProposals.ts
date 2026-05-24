import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CompassProposal, LoreNodeType, LoreNode } from "@/types";

const SCAN_DEBOUNCE_MS = 300_000;

interface LorePrefillData {
  asset_id: string;
  asset_type: "character" | "background" | "object";
  chapter_id: string | null;
  chapter_number: number | null;
}

interface LoreChapterUpdatePrefill {
  node_id: string;
  asset_id: string | null;
  chapter_id: string;
  chapter_number: number;
  current_chapter_id: string | null;
}

interface LoreConnectionPrefill {
  from_node_id: string;
  to_node_id: string;
  from_name: string;
  to_name: string;
  chapter_number: number;
  context_excerpt?: string;
  proposed_label?: string;
}

interface LoreEventPrefill {
  event_name: string;
  chapter_number: number;
  chapter_id: string;
}

const ASSET_TO_LORE_TYPE: Record<string, LoreNodeType> = {
  character: "character",
  background: "location",
  object: "object",
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractContextSentence(text: string, nameA: string, nameB: string): string {
  const reA = new RegExp(`\\b${escapeRegex(nameA)}\\b`, "i");
  const reB = new RegExp(`\\b${escapeRegex(nameB)}\\b`, "i");
  const sentences = text.replace(/\r?\n/g, " ").split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const match = sentences.find(s => reA.test(s) && reB.test(s));
  return (match ?? text.slice(0, 150)).slice(0, 200);
}

export function useArianeLoreProposals(projectId: string, { enableAutoScan = true }: { enableAutoScan?: boolean } = {}) {
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
        .in("proposal_type", ["lore_asset", "lore_chapter_update", "lore_connection", "lore_event"])
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
      { data: existingNodes },
      { data: existingProposals },
      { data: projectData },
    ] = await Promise.all([
      supabase.from("assets").select("id, name, asset_type, prompt").eq("project_id", projectId),
      supabase.from("scenario_chapters").select("id, chapter_number, content").eq("project_id", projectId).order("chapter_number"),
      supabase.from("lore_nodes").select("id, name, asset_id, chapter_id, type").eq("project_id", projectId),
      supabase.from("compass_proposals").select("dedupe_key").eq("project_id", projectId).in("proposal_type", ["lore_asset", "lore_chapter_update", "lore_connection", "lore_event"]),
      supabase.from("projects").select("description").eq("id", projectId).single(),
    ]);

    if (!assets?.length) return;

    // Validated chapters — requête séparée pour ne pas casser le scan si la migration n'est pas encore appliquée
    const { data: validatedData, error: validatedError } = await supabase
      .from("scenario_chapters")
      .select("id")
      .eq("project_id", projectId)
      .eq("validated", true);
    const validatedIds = new Set<string>(
      !validatedError && validatedData ? validatedData.map((r: { id: string }) => r.id) : []
    );
    const projectDescription = (projectData as { description?: string | null } | null)?.description ?? "";
    const hasContent = (scenarioChapters?.length ?? 0) > 0 || projectDescription.trim().length > 0;
    if (!hasContent) return;

    const loreNodeRows = (existingNodes ?? []) as Array<{ id: string; name: string; asset_id: string | null; chapter_id: string | null; type: string }>;
    const alreadyInLore = new Set(loreNodeRows.map((n) => n.asset_id).filter(Boolean) as string[]);
    const alreadyProposed = new Set((existingProposals ?? []).map((p) => p.dedupe_key));

    const seenNames = new Set<string>();

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
      const normalizedName = asset.name.toLowerCase().trim();
      if (seenNames.has(normalizedName)) continue;

      if (alreadyInLore.has(asset.id)) continue;
      const dedupeKey = `lore_asset-${asset.id}`;
      if (alreadyProposed.has(dedupeKey)) continue;

      if (normalizedName.length < 2) continue;

      let firstChapterId: string | null = null;
      let firstChapterNumber: number | null = null;

      const wordRe = new RegExp(`\\b${escapeRegex(asset.name)}\\b`, "i");
      for (const sc of (scenarioChapters ?? [])) {
        if (wordRe.test(sc.content ?? "")) {
          firstChapterId = sc.id;
          firstChapterNumber = sc.chapter_number;
          break;
        }
      }

      // Si absent des chapitres, chercher dans la description projet
      const foundInDescription = !firstChapterNumber && wordRe.test(projectDescription);
      if (!firstChapterNumber && !foundInDescription) continue;

      seenNames.add(normalizedName);

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

    // Nettoyage : dismiss les doublons actifs déjà en BDD (même titre normalisé, garder le plus ancien)
    const { data: activeNow } = await supabase
      .from("compass_proposals")
      .select("id, title, created_at")
      .eq("project_id", projectId)
      .eq("proposal_type", "lore_asset")
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (activeNow && activeNow.length > 0) {
      const seenTitlesClean = new Map<string, string>();
      const toDismiss: string[] = [];
      for (const p of activeNow) {
        const key = p.title.toLowerCase().trim();
        if (seenTitlesClean.has(key)) {
          toDismiss.push(p.id);
        } else {
          seenTitlesClean.set(key, p.id);
        }
      }
      if (toDismiss.length > 0) {
        await supabase
          .from("compass_proposals")
          .update({ status: "dismissed" })
          .in("id", toDismiss);
      }
    }

    if (toInsert.length > 0) {
      await supabase.from("compass_proposals").insert(toInsert);
    }

    // Scan : liaisons chapitre sur les nœuds existants (assets + événements)
    const chapterUpdateInserts: typeof toInsert = [];
    for (const loreNode of loreNodeRows) {
      let searchName: string;
      let assetId: string | null = null;
      if (loreNode.asset_id) {
        const asset = (assets ?? []).find((a) => a.id === loreNode.asset_id);
        if (!asset) continue;
        searchName = asset.name;
        assetId = asset.id;
      } else if (loreNode.type === "event" && loreNode.name) {
        searchName = loreNode.name;
      } else {
        continue;
      }
      const wordRe = new RegExp(`\\b${escapeRegex(searchName)}\\b`, "i");
      let firstChapterId: string | null = null;
      let firstChapterNumber: number | null = null;
      for (const sc of (scenarioChapters ?? [])) {
        if (wordRe.test(sc.content ?? "")) {
          firstChapterId = sc.id;
          firstChapterNumber = sc.chapter_number;
          break;
        }
      }
      if (!firstChapterNumber) continue;
      if (loreNode.chapter_id === firstChapterId) continue;
      const dedupeKey = `lore_chapter_update-${loreNode.id}`;
      if (alreadyProposed.has(dedupeKey)) continue;
      chapterUpdateInserts.push({
        project_id: projectId,
        user_id: user.id,
        proposal_type: "lore_chapter_update",
        origin: "extracted",
        title: searchName,
        content: searchName,
        prefill_data: {
          node_id: loreNode.id,
          asset_id: assetId,
          chapter_id: firstChapterId,
          chapter_number: firstChapterNumber,
          current_chapter_id: loreNode.chapter_id,
        } as LoreChapterUpdatePrefill,
        status: "active",
        dedupe_key: dedupeKey,
      });
    }
    if (chapterUpdateInserts.length > 0) {
      await supabase.from("compass_proposals").insert(chapterUpdateInserts);
      qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
    }

    // Scan : connexions entre éléments co-présents dans les chapitres VALIDÉS
    const validatedChapters = (scenarioChapters ?? []).filter((sc) => validatedIds.has(sc.id));
    if (validatedChapters.length > 0 && loreNodeRows.length >= 2) {
      const { data: existingEdges } = await supabase
        .from("lore_edges")
        .select("from_node_id, to_node_id")
        .eq("project_id", projectId);

      const edgeSet = new Set(
        (existingEdges ?? []).map((e) => [e.from_node_id, e.to_node_id].sort().join("|"))
      );

      // Assets + événements manuels (nœuds sans asset_id mais type=event)
      const nodesForConnections = loreNodeRows.filter((n) => n.asset_id || n.type === "event");
      const connectionInserts: typeof toInsert = [];

      outer: for (let i = 0; i < nodesForConnections.length; i++) {
        for (let j = i + 1; j < nodesForConnections.length; j++) {
          const nodeA = nodesForConnections[i];
          const nodeB = nodesForConnections[j];
          const assetA = nodeA.asset_id ? (assets ?? []).find((a) => a.id === nodeA.asset_id) : null;
          const assetB = nodeB.asset_id ? (assets ?? []).find((a) => a.id === nodeB.asset_id) : null;
          if (nodeA.asset_id && !assetA) continue;
          if (nodeB.asset_id && !assetB) continue;
          const nameA = assetA?.name ?? nodeA.name;
          const nameB = assetB?.name ?? nodeB.name;

          const sorted = [nodeA.id, nodeB.id].sort();
          const dedupeKey = `lore_connection-${sorted[0]}-${sorted[1]}`;
          if (alreadyProposed.has(dedupeKey)) continue;
          if (edgeSet.has(sorted.join("|"))) continue;

          const reA = new RegExp(`\\b${escapeRegex(nameA)}\\b`, "i");
          const reB = new RegExp(`\\b${escapeRegex(nameB)}\\b`, "i");

          for (const sc of validatedChapters) {
            const text = sc.content ?? "";
            if (reA.test(text) && reB.test(text)) {
              const [fromNode, toNode] = sorted[0] === nodeA.id ? [nodeA, nodeB] : [nodeB, nodeA];
              const [fromName, toName] = sorted[0] === nodeA.id ? [nameA, nameB] : [nameB, nameA];
              connectionInserts.push({
                project_id: projectId,
                user_id: user.id,
                proposal_type: "lore_connection",
                origin: "extracted",
                title: `${fromName} ↔ ${toName}`,
                content: `Co-présents dans le Chapitre ${sc.chapter_number}`,
                prefill_data: {
                  from_node_id: fromNode.id,
                  to_node_id: toNode.id,
                  from_name: fromName,
                  to_name: toName,
                  chapter_number: sc.chapter_number,
                  context_excerpt: extractContextSentence(text, fromName, toName),
                } as LoreConnectionPrefill,
                status: "active",
                dedupe_key: dedupeKey,
              });
              break;
            }
          }
          if (connectionInserts.length >= 5) break outer;
        }
      }

      if (connectionInserts.length > 0) {
        for (const ci of connectionInserts) {
          const pf = ci.prefill_data as LoreConnectionPrefill;
          try {
            const fromAsset = (assets ?? []).find(a => a.name === pf.from_name);
            const toAsset = (assets ?? []).find(a => a.name === pf.to_name);
            const { data, error } = await supabase.functions.invoke("generate-scenario-ai", {
              body: {
                mode: "suggest_connection_label",
                from_name: pf.from_name,
                from_type: ASSET_TO_LORE_TYPE[fromAsset?.asset_type ?? ""] ?? "element",
                from_description: fromAsset?.prompt ?? undefined,
                to_name: pf.to_name,
                to_type: ASSET_TO_LORE_TYPE[toAsset?.asset_type ?? ""] ?? "element",
                to_description: toAsset?.prompt ?? undefined,
                context_excerpt: pf.context_excerpt ?? "",
              },
            });
            if (!error && data?.label) pf.proposed_label = String(data.label).trim().slice(0, 50);
          } catch { /* graceful: no label */ }
          await new Promise(resolve => setTimeout(resolve, 350));
        }
        await supabase.from("compass_proposals").insert(connectionInserts);
        qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
      }
    }

    qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
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
    enabled: !!projectId && !!user && enableAutoScan,
    refetchInterval: 30_000,
    staleTime: 0,
  });

  useEffect(() => {
    if (!enableAutoScan) return;
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
  }, [chaptersSignature, runScan, enableAutoScan]);

  const acceptMutation = useMutation({
    mutationFn: async ({
      proposal,
      onNodeCreated,
      connectionLabel,
    }: {
      proposal: CompassProposal;
      onNodeCreated?: (node: LoreNode) => void;
      connectionLabel?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      if (proposal.proposal_type === "lore_chapter_update") {
        const prefill = proposal.prefill_data as unknown as LoreChapterUpdatePrefill;

        // Résout par chapter_number dans scenario_chapters (compatible anciens et nouveaux prefills)
        let safeChapterId: string | null = null;
        if (prefill.chapter_number != null) {
          const { data: sc } = await supabase
            .from("scenario_chapters")
            .select("id")
            .eq("project_id", projectId)
            .eq("chapter_number", prefill.chapter_number)
            .maybeSingle();
          if (sc) safeChapterId = sc.id;
        } else {
          safeChapterId = prefill.chapter_id ?? null;
        }

        const { error } = await supabase
          .from("lore_nodes")
          .update({ chapter_id: safeChapterId })
          .eq("id", prefill.node_id);
        if (error) throw error;
      } else if (proposal.proposal_type === "lore_connection") {
        const prefill = proposal.prefill_data as unknown as LoreConnectionPrefill;
        const { error } = await supabase.from("lore_edges").insert({
          project_id: projectId,
          user_id: user.id,
          from_node_id: prefill.from_node_id,
          to_node_id: prefill.to_node_id,
          label: connectionLabel?.trim() || null,
        });
        if (error) throw error;
      } else if (proposal.proposal_type === "lore_event") {
        const prefill = proposal.prefill_data as unknown as LoreEventPrefill;
        const { data: newNode, error: nodeError } = await supabase
          .from("lore_nodes")
          .insert({
            project_id: projectId,
            user_id: user.id,
            type: "event" as LoreNodeType,
            name: prefill.event_name,
            description: null,
            image_url: null,
            asset_id: null,
            chapter_id: prefill.chapter_id,
            pos_x: 200 + Math.random() * 400,
            pos_y: 200 + Math.random() * 300,
          })
          .select("*")
          .single();
        if (nodeError) throw nodeError;
        onNodeCreated?.(newNode as LoreNode);
      } else {
        // lore_asset
        const prefill = proposal.prefill_data as unknown as LorePrefillData;
        const loreType: LoreNodeType = ASSET_TO_LORE_TYPE[prefill.asset_type] ?? "object";

        // Résout par chapter_number dans scenario_chapters (compatible anciens et nouveaux prefills)
        let safeChapterId: string | null = null;
        if (prefill.chapter_number != null) {
          const { data: sc } = await supabase
            .from("scenario_chapters")
            .select("id")
            .eq("project_id", projectId)
            .eq("chapter_number", prefill.chapter_number)
            .maybeSingle();
          if (sc) safeChapterId = sc.id;
        } else {
          safeChapterId = prefill.chapter_id ?? null;
        }

        const { data: newNode, error: nodeError } = await supabase
          .from("lore_nodes")
          .insert({
            project_id: projectId,
            user_id: user.id,
            type: loreType,
            name: proposal.title,
            description: null,
            image_url: null,
            asset_id: prefill.asset_id,
            chapter_id: safeChapterId,
            pos_x: 200 + Math.random() * 400,
            pos_y: 200 + Math.random() * 300,
          })
          .select("*")
          .single();
        if (nodeError) throw nodeError;
        onNodeCreated?.(newNode as LoreNode);
      }

      const { error: propError } = await supabase
        .from("compass_proposals")
        .update({ status: "accepted" })
        .eq("id", proposal.id);
      if (propError) throw propError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
      qc.invalidateQueries({ queryKey: ["lore-nodes", projectId] });
      qc.invalidateQueries({ queryKey: ["lore_edges", projectId] });
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
      await acceptMutation.mutateAsync({ proposal: p });
    }
  }, [proposals, acceptMutation]);

  // Filet client-side : déduplique par titre normalisé avant affichage
  const deduplicatedProposals = useMemo(() => {
    const seen = new Set<string>();
    return proposals.filter((p) => {
      const key = `${p.proposal_type}:${p.title.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [proposals]);

  // forcedInfo : map proposal_id → raison (jamais auto-fetchée, uniquement via setQueryData)
  type ForcedReason = "already_exists" | "ignored";
  type ForcedInfo = Record<string, ForcedReason>;
  const { data: forcedInfo = {} } = useQuery<ForcedInfo>({
    queryKey: ["ariane-forced-ids", projectId],
    queryFn: async () => ({}),
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const triggerForceScan = useCallback(async () => {
    if (!user || !projectId) return;

    // Sauvegarder les labels de connexion existants AVANT purge (évite de reconsommer du quota Gemini)
    const { data: existingConnections } = await supabase
      .from("compass_proposals")
      .select("dedupe_key, prefill_data")
      .eq("project_id", projectId)
      .eq("proposal_type", "lore_connection");
    const savedConnectionLabels = new Map<string, string>();
    for (const p of existingConnections ?? []) {
      const lbl = (p.prefill_data as { proposed_label?: string } | null)?.proposed_label;
      if (lbl) savedConnectionLabels.set(p.dedupe_key, lbl);
    }

    // Collecter les données complètes des proposals dismissées AVANT purge
    const { data: dismissed } = await supabase
      .from("compass_proposals")
      .select("dedupe_key, proposal_type, title, content, prefill_data")
      .eq("project_id", projectId)
      .in("proposal_type", ["lore_asset", "lore_chapter_update", "lore_connection", "lore_event"])
      .eq("status", "dismissed");
    const dismissedDedupeKeys = new Set((dismissed ?? []).map((p) => p.dedupe_key));
    // Map dedupe_key → full dismissed proposal (pour ré-insérer même si absent du texte)
    const dismissedByDedupe = new Map(
      (dismissed ?? []).map((p) => [p.dedupe_key, p])
    );

    // Purger TOUTES les proposals lore
    await supabase
      .from("compass_proposals")
      .delete()
      .eq("project_id", projectId)
      .in("proposal_type", ["lore_asset", "lore_chapter_update", "lore_connection", "lore_event"]);

    // Fetch toutes les données nécessaires
    const [
      { data: assets },
      { data: scenarioChapters },
      { data: loreNodes },
      { data: loreEdges },
      { data: projectData },
    ] = await Promise.all([
      supabase.from("assets").select("id, name, asset_type, prompt").eq("project_id", projectId),
      supabase.from("scenario_chapters").select("id, chapter_number, content").eq("project_id", projectId).order("chapter_number"),
      supabase.from("lore_nodes").select("id, name, asset_id, chapter_id, type").eq("project_id", projectId),
      supabase.from("lore_edges").select("from_node_id, to_node_id").eq("project_id", projectId),
      supabase.from("projects").select("description").eq("id", projectId).single(),
    ]);

    // Validated chapters — requête séparée pour ne pas casser le scan si la migration n'est pas encore appliquée
    const { data: validatedData, error: validatedError } = await supabase
      .from("scenario_chapters")
      .select("id")
      .eq("project_id", projectId)
      .eq("validated", true);
    const validatedIds = new Set<string>(
      !validatedError && validatedData ? validatedData.map((r: { id: string }) => r.id) : []
    );

    if (!assets?.length) {
      await qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
      return;
    }

    const projectDescription = (projectData as { description?: string | null } | null)?.description ?? "";
    const loreNodeRows = (loreNodes ?? []) as Array<{ id: string; name: string; asset_id: string | null; chapter_id: string | null; type: string }>;
    const alreadyInLore = new Set(loreNodeRows.map((n) => n.asset_id).filter(Boolean) as string[]);
    const edgeSet = new Set((loreEdges ?? []).map((e) => [e.from_node_id, e.to_node_id].sort().join("|")));

    // Map dedupe_key → raison (construite pendant le scan)
    const reasonByDedupe = new Map<string, ForcedReason>();

    const forceInserts: Array<{
      project_id: string; user_id: string; proposal_type: string; origin: string;
      title: string; content: string; prefill_data: unknown; status: string; dedupe_key: string;
    }> = [];

    // ── lore_asset : tous les assets détectés ──────────────────────────────
    for (const asset of assets) {
      if (asset.name.trim().length < 2) continue;
      const wordRe = new RegExp(`\\b${escapeRegex(asset.name)}\\b`, "i");
      let firstChapterId: string | null = null;
      let firstChapterNumber: number | null = null;
      for (const sc of (scenarioChapters ?? [])) {
        if (wordRe.test(sc.content ?? "")) {
          firstChapterId = sc.id;
          firstChapterNumber = sc.chapter_number;
          break;
        }
      }
      const foundInDescription = !firstChapterNumber && wordRe.test(projectDescription);
      if (!firstChapterNumber && !foundInDescription) continue;

      const dedupeKey = `lore_asset-${asset.id}`;
      if (alreadyInLore.has(asset.id)) reasonByDedupe.set(dedupeKey, "already_exists");
      else if (dismissedDedupeKeys.has(dedupeKey)) reasonByDedupe.set(dedupeKey, "ignored");

      forceInserts.push({
        project_id: projectId, user_id: user.id,
        proposal_type: "lore_asset", origin: "extracted",
        title: asset.name, content: asset.name,
        prefill_data: { asset_id: asset.id, asset_type: asset.asset_type, chapter_id: firstChapterId, chapter_number: firstChapterNumber },
        status: "active", dedupe_key: dedupeKey,
      });
    }

    // ── lore_chapter_update : tous les nœuds Lore existants (assets + événements) ─
    for (const loreNode of loreNodeRows) {
      let searchName: string;
      let assetId: string | null = null;
      if (loreNode.asset_id) {
        const asset = (assets ?? []).find((a) => a.id === loreNode.asset_id);
        if (!asset) continue;
        searchName = asset.name;
        assetId = asset.id;
      } else if (loreNode.type === "event" && loreNode.name) {
        searchName = loreNode.name;
      } else {
        continue;
      }
      const wordRe = new RegExp(`\\b${escapeRegex(searchName)}\\b`, "i");
      let firstChapterId: string | null = null;
      let firstChapterNumber: number | null = null;
      for (const sc of (scenarioChapters ?? [])) {
        if (wordRe.test(sc.content ?? "")) {
          firstChapterId = sc.id;
          firstChapterNumber = sc.chapter_number;
          break;
        }
      }
      if (!firstChapterNumber) continue;

      const dedupeKey = `lore_chapter_update-${loreNode.id}`;
      if (loreNode.chapter_id === firstChapterId) reasonByDedupe.set(dedupeKey, "already_exists");
      else if (dismissedDedupeKeys.has(dedupeKey)) reasonByDedupe.set(dedupeKey, "ignored");

      forceInserts.push({
        project_id: projectId, user_id: user.id,
        proposal_type: "lore_chapter_update", origin: "extracted",
        title: searchName, content: searchName,
        prefill_data: { node_id: loreNode.id, asset_id: assetId, chapter_id: firstChapterId, chapter_number: firstChapterNumber, current_chapter_id: loreNode.chapter_id },
        status: "active", dedupe_key: dedupeKey,
      });
    }

    // ── lore_connection : toutes les paires co-présentes (chapitres validés, assets + événements) ─
    const validatedChapters = (scenarioChapters ?? []).filter((sc) => validatedIds.has(sc.id));
    if (validatedChapters.length > 0) {
      const nodesForConnections = loreNodeRows.filter((n) => n.asset_id || n.type === "event");
      let connectionCount = 0;
      outer: for (let i = 0; i < nodesForConnections.length; i++) {
        for (let j = i + 1; j < nodesForConnections.length; j++) {
          const nodeA = nodesForConnections[i];
          const nodeB = nodesForConnections[j];
          const assetA = nodeA.asset_id ? assets.find((a) => a.id === nodeA.asset_id) : null;
          const assetB = nodeB.asset_id ? assets.find((a) => a.id === nodeB.asset_id) : null;
          if (nodeA.asset_id && !assetA) continue;
          if (nodeB.asset_id && !assetB) continue;
          const nameA = assetA?.name ?? nodeA.name;
          const nameB = assetB?.name ?? nodeB.name;
          const sorted = [nodeA.id, nodeB.id].sort();
          const dedupeKey = `lore_connection-${sorted[0]}-${sorted[1]}`;
          const reA = new RegExp(`\\b${escapeRegex(nameA)}\\b`, "i");
          const reB = new RegExp(`\\b${escapeRegex(nameB)}\\b`, "i");
          for (const sc of validatedChapters) {
            const text = sc.content ?? "";
            if (reA.test(text) && reB.test(text)) {
              const [fromNode, toNode] = sorted[0] === nodeA.id ? [nodeA, nodeB] : [nodeB, nodeA];
              const [fromName, toName] = sorted[0] === nodeA.id ? [nameA, nameB] : [nameB, nameA];
              if (edgeSet.has(sorted.join("|"))) reasonByDedupe.set(dedupeKey, "already_exists");
              else if (dismissedDedupeKeys.has(dedupeKey)) reasonByDedupe.set(dedupeKey, "ignored");
              forceInserts.push({
                project_id: projectId, user_id: user.id,
                proposal_type: "lore_connection", origin: "extracted",
                title: `${fromName} ↔ ${toName}`,
                content: `Co-présents dans le Chapitre ${sc.chapter_number}`,
                prefill_data: { from_node_id: fromNode.id, to_node_id: toNode.id, from_name: fromName, to_name: toName, chapter_number: sc.chapter_number, context_excerpt: extractContextSentence(text, fromName, toName) },
                status: "active", dedupe_key: dedupeKey,
              });
              connectionCount++;
              break;
            }
          }
          if (connectionCount >= 5) break outer;
        }
      }
    }

    // ── lore_event : extraction IA des événements narratifs (chapitres validés) ──
    const existingEventNames = new Set(
      loreNodeRows.filter(n => n.type === "event").map(n => n.name?.toLowerCase().trim()).filter(Boolean) as string[]
    );
    for (const sc of validatedChapters) {
      if (!sc.content?.trim()) continue;
      try {
        const { data, error } = await supabase.functions.invoke("generate-scenario-ai", {
          body: { mode: "extract_events", chapter_content: sc.content, chapter_number: sc.chapter_number },
        });
        if (error || !Array.isArray(data?.events)) continue;
        for (const eventName of (data.events as string[]).slice(0, 5)) {
          const trimmed = eventName.trim();
          if (!trimmed || trimmed.length < 3) continue;
          const slug = trimmed.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 50);
          const dedupeKey = `lore_event-${sc.id}-${slug}`;
          if (existingEventNames.has(trimmed.toLowerCase())) {
            reasonByDedupe.set(dedupeKey, "already_exists");
          } else if (dismissedDedupeKeys.has(dedupeKey)) {
            reasonByDedupe.set(dedupeKey, "ignored");
          }
          forceInserts.push({
            project_id: projectId, user_id: user.id,
            proposal_type: "lore_event", origin: "extracted",
            title: trimmed,
            content: `Chapitre ${sc.chapter_number}`,
            prefill_data: { event_name: trimmed, chapter_number: sc.chapter_number, chapter_id: sc.id } satisfies LoreEventPrefill,
            status: "active", dedupe_key: dedupeKey,
          });
        }
      } catch { /* graceful: skip chapter */ }
    }

    // Ré-insérer les proposals dismissées non capturées par le scan normal (asset plus dans le texte, etc.)
    for (const [dedupeKey, p] of dismissedByDedupe) {
      if (!forceInserts.some((ins) => ins.dedupe_key === dedupeKey)) {
        reasonByDedupe.set(dedupeKey, "ignored");
        forceInserts.push({
          project_id: projectId,
          user_id: user.id,
          proposal_type: p.proposal_type,
          origin: "extracted",
          title: p.title,
          content: p.content,
          prefill_data: p.prefill_data,
          status: "active",
          dedupe_key: dedupeKey,
        });
      }
    }

    // Générer les labels Ariane pour les connexions avant insert
    // Priorité : réutiliser le label sauvegardé → appel Gemini séquentiel uniquement pour les nouvelles connexions
    const connectionForceInserts = forceInserts.filter(ci => ci.proposal_type === "lore_connection");
    for (const ci of connectionForceInserts) {
      const pf = ci.prefill_data as LoreConnectionPrefill;
      const saved = savedConnectionLabels.get(ci.dedupe_key);
      if (saved) { pf.proposed_label = saved; continue; }
      try {
        const fromAsset = (assets ?? []).find(a => a.name === pf.from_name);
        const toAsset = (assets ?? []).find(a => a.name === pf.to_name);
        const { data, error } = await supabase.functions.invoke("generate-scenario-ai", {
          body: {
            mode: "suggest_connection_label",
            from_name: pf.from_name,
            from_type: ASSET_TO_LORE_TYPE[fromAsset?.asset_type ?? ""] ?? "element",
            from_description: fromAsset?.prompt ?? undefined,
            to_name: pf.to_name,
            to_type: ASSET_TO_LORE_TYPE[toAsset?.asset_type ?? ""] ?? "element",
            to_description: toAsset?.prompt ?? undefined,
            context_excerpt: pf.context_excerpt ?? "",
          },
        });
        if (!error && data?.label) pf.proposed_label = String(data.label).trim().slice(0, 50);
      } catch { /* graceful: no label */ }
      await new Promise(resolve => setTimeout(resolve, 350));
    }

    if (forceInserts.length > 0) {
      await supabase.from("compass_proposals").insert(forceInserts);
    }

    // Récupérer les IDs insérés et construire forcedInfo par ID
    const dedupeKeysWithReason = [...reasonByDedupe.keys()];
    const newForcedInfo: ForcedInfo = {};
    if (dedupeKeysWithReason.length > 0) {
      const { data: insertedWithReason } = await supabase
        .from("compass_proposals")
        .select("id, dedupe_key")
        .eq("project_id", projectId)
        .in("dedupe_key", dedupeKeysWithReason);
      for (const p of insertedWithReason ?? []) {
        const reason = reasonByDedupe.get(p.dedupe_key);
        if (reason) newForcedInfo[p.id] = reason;
      }
    }
    qc.setQueryData<ForcedInfo>(["ariane-forced-ids", projectId], newForcedInfo);

    await qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
  }, [user, projectId, qc]);

  return {
    proposals: deduplicatedProposals,
    forcedInfo,
    acceptProposal: (p: CompassProposal, onNodeCreated?: (node: LoreNode) => void, connectionLabel?: string) =>
      acceptMutation.mutate({ proposal: p, onNodeCreated, connectionLabel }),
    acceptAll,
    dismissProposal: (id: string) => dismissMutation.mutate(id),
    isAccepting: acceptMutation.isPending,
    triggerScan: runScan,
    triggerForceScan,
  };
}
