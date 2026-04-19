// Edge Function: crée une session Stripe Customer Portal pour gérer un abonnement existant.
//
// Secrets requis :
//   - STRIPE_SECRET_KEY
//   - APP_URL                      (URL publique du front)
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - ALLOWED_ORIGIN               (pour CORS)
//
// Flow :
//   1. Vérifie le JWT utilisateur
//   2. Lit stripe_customer_id depuis profiles (service role)
//   3. Crée une session Billing Portal Stripe
//   4. Retourne { url } → le front redirige vers Stripe

import Stripe from "npm:stripe@14";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

function getCorsHeaders(): Record<string, string> {
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN")?.trim();
  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
  });
}

async function verifyUserFromToken(
  authHeader: string | null,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = anonKey?.trim() || serviceKey;

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: apiKey,
      },
    });

    if (!res.ok) return null;

    const user = (await res.json()) as { id?: string };
    return typeof user?.id === "string" ? user.id : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders() });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const appUrl = Deno.env.get("APP_URL");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecret || !appUrl || !supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Configuration Stripe incomplète" }, 500);
  }

  const userId = await verifyUserFromToken(
    req.headers.get("Authorization"),
    supabaseUrl,
    serviceKey
  );
  if (!userId) {
    return jsonResponse({ error: "JWT invalide ou expiré" }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

  try {
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileErr) {
      console.error("[create-portal-session] profile read error:", profileErr.message);
      return jsonResponse({ error: "Erreur lecture profil" }, 500);
    }

    const stripeCustomerId = profile?.stripe_customer_id;
    if (!stripeCustomerId) {
      return jsonResponse({ error: "Aucun abonnement actif" }, 400);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/plans`,
    });

    if (!session.url) {
      return jsonResponse(
        { error: "Stripe n'a pas retourné d'URL de portal" },
        502
      );
    }

    return jsonResponse({ url: session.url }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[create-portal-session] Exception:", msg);
    return jsonResponse({ error: "Erreur serveur", details: msg }, 500);
  }
});
