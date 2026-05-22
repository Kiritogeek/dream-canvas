import { supabase } from "@/integrations/supabase/client";
import type { CompassSourceType, CompassProposalType, CompassProposal } from "@/types";

export type { CompassSourceType, CompassProposalType, CompassProposal };

// Fire-and-forget — ne throw jamais, ne bloque jamais l'UX
export async function triggerCompassIndex(
  projectId: string,
  sourceType: CompassSourceType,
  sourceId: string,
  content: string,
  sectionKey?: string
): Promise<void> {
  if (!content?.trim()) return;
  try {
    await supabase.auth.refreshSession();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narramind-compass`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
      },
      body: JSON.stringify({
        mode: "index",
        project_id: projectId,
        source_type: sourceType,
        source_id: sourceId,
        content,
        section_key: sectionKey,
      }),
    });
    // Réponse volontairement ignorée — fire-and-forget
  } catch (err) {
    console.error("[CompassIndex] Échec indexation silencieuse:", err);
  }
}

export async function fetchCompassProposals(
  projectId: string,
  proposalType: CompassProposalType,
  contextText: string,
  sourceId?: string
): Promise<CompassProposal[]> {
  await supabase.auth.refreshSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return [];

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narramind-compass`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    },
    body: JSON.stringify({
      mode: "propose",
      project_id: projectId,
      context_text: contextText,
      proposal_type: proposalType,
      source_id: sourceId,
    }),
  });

  if (!res.ok) throw new Error(`CompassPropose error ${res.status}`);
  const body = await res.json();
  return (body.proposals ?? []) as CompassProposal[];
}
