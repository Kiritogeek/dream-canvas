// Contrôle d'appartenance pour les Edge Functions opérant en service role.
// La RLS Postgres est contournée par le service role : toute lecture/écriture
// pilotée par un id reçu dans le body DOIT vérifier que la ressource appartient
// au userId du JWT, sinon IDOR cross-tenant.

function ownerHeaders(serviceKey: string) {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
}

export async function userOwnsProject(
  supabaseUrl: string,
  serviceKey: string,
  projectId: string,
  userId: string,
): Promise<boolean> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&user_id=eq.${encodeURIComponent(userId)}&select=id`,
    { headers: ownerHeaders(serviceKey) },
  );
  if (!res.ok) return false;
  const rows = (await res.json()) as Array<{ id: string }>;
  return Array.isArray(rows) && rows.length > 0;
}

export async function userOwnsChapter(
  supabaseUrl: string,
  serviceKey: string,
  chapterId: string,
  userId: string,
): Promise<boolean> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/chapters?id=eq.${encodeURIComponent(chapterId)}&user_id=eq.${encodeURIComponent(userId)}&select=id`,
    { headers: ownerHeaders(serviceKey) },
  );
  if (!res.ok) return false;
  const rows = (await res.json()) as Array<{ id: string }>;
  return Array.isArray(rows) && rows.length > 0;
}
