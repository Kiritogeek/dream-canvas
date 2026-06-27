// Réservation atomique d'un crédit de génération — anti race condition.
// S'appuie sur la RPC Postgres consume_image_credit (check + insert dans UNE
// seule transaction verrouillée par utilisateur via pg_advisory_xact_lock).
//
// Fail-open : si la RPC échoue ou n'existe pas encore (migration non appliquée),
// on autorise la génération sans réservation (résilience — comportement
// historique), au prix d'une absence de comptage sur ce coup.

export interface CreditReservation {
  allowed: boolean;
  usageId: string | null;
  count: number;
}

export async function reserveImageCredit(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  limit: number,
  periodStartIso: string,
): Promise<CreditReservation> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_image_credit`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_limit: limit,
        p_period_start: periodStartIso,
      }),
    });
    if (!res.ok) return { allowed: true, usageId: null, count: -1 };
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    return {
      allowed: !!row?.allowed,
      usageId: row?.usage_id ?? null,
      count: typeof row?.current_count === "number" ? row.current_count : -1,
    };
  } catch {
    return { allowed: true, usageId: null, count: -1 };
  }
}

// Rembourse (supprime) le crédit réservé si la génération échoue après réservation.
export async function refundImageCredit(
  supabaseUrl: string,
  serviceKey: string,
  usageId: string | null,
): Promise<void> {
  if (!usageId) return;
  try {
    await fetch(`${supabaseUrl}/rest/v1/usage?id=eq.${encodeURIComponent(usageId)}`, {
      method: "DELETE",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
  } catch {
    // best effort
  }
}
