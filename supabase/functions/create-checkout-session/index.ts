// Edge Function: crée une session Stripe Checkout pour passer un user Free → Pro.
//
// Secrets requis :
//   - STRIPE_SECRET_KEY
//   - STRIPE_PRO_PRICE_ID  (ID du price Stripe pour le plan Pro 14,99 €/mois)
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - ALLOWED_ORIGIN       (pour CORS)
//   - APP_URL              (URL publique du front, ex. https://dreamweave.app)
//
// Flow :
//   1. Vérifie le JWT utilisateur
//   2. Récupère / crée le stripe_customer_id lié au profile (service role)
//   3. Crée une session Checkout en mode subscription
//   4. Retourne { url } → le front redirige vers Stripe
//
// La mise à jour effective de profiles.plan se fait UNIQUEMENT dans stripe-webhook,
// via service_role (bypass RLS).

import Stripe from "npm:stripe@14";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, makeJsonResponse } from "../_shared/cors.ts";

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

// ═══════════════════════════════════════════════════════════════
// Vérification JWT via Supabase Auth
// ═══════════════════════════════════════════════════════════════

async function verifyUserFromToken(
  authHeader: string | null,
  supabaseUrl: string,
  _serviceKey: string
): Promise<{ userId: string; userEmail: string | null } | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
    if (!anonKey) return null;
    const apiKey = anonKey;

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: apiKey,
      },
    });

    if (!res.ok) return null;

    const user = (await res.json()) as { id?: string; email?: string };
    if (typeof user?.id !== "string") return null;

    return {
      userId: user.id,
      userEmail: typeof user.email === "string" ? user.email : null,
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Handler
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const jsonResponse = makeJsonResponse(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const priceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = Deno.env.get("APP_URL");

  if (!stripeSecret || !priceId || !supabaseUrl || !serviceKey || !appUrl) {
    return jsonResponse(
      { error: "Configuration Stripe incomplète" },
      500
    );
  }

  const auth = await verifyUserFromToken(
    req.headers.get("Authorization"),
    supabaseUrl,
    serviceKey
  );
  if (!auth) {
    return jsonResponse({ error: "JWT invalide ou expiré" }, 401);
  }

  const { userId, userEmail } = auth;

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

  try {
    // 1. Lire le profile pour récupérer un customer existant
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileErr) {
      console.error("[create-checkout-session] profile read error:", profileErr.message);
      return jsonResponse({ error: "Erreur lecture profil" }, 500);
    }

    if (profile?.plan === "pro") {
      return jsonResponse(
        { error: "Vous avez déjà un abonnement Pro actif." },
        400
      );
    }

    let stripeCustomerId = profile?.stripe_customer_id ?? null;

    // 2. Créer le customer Stripe si nécessaire
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail ?? undefined,
        metadata: { supabase_user_id: userId },
      });
      stripeCustomerId = customer.id;

      const { error: updateErr } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("user_id", userId);

      if (updateErr) {
        console.error(
          "[create-checkout-session] profile update error:",
          updateErr.message
        );
        return jsonResponse({ error: "Erreur sauvegarde customer" }, 500);
      }
    }

    // 3. Créer la session Checkout
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/plans?success=true`,
      cancel_url: `${appUrl}/plans?canceled=true`,
      allow_promotion_codes: true,
      metadata: { user_id: userId },
      subscription_data: {
        metadata: { user_id: userId },
      },
    });

    if (!session.url) {
      return jsonResponse(
        { error: "Stripe n'a pas retourné d'URL de session" },
        502
      );
    }

    return jsonResponse({ url: session.url }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[create-checkout-session] Exception:", msg);
    return jsonResponse({ error: "Erreur serveur", details: msg }, 500);
  }
});
