// Edge Function: webhook Stripe — synchronise profiles.plan avec l'état Stripe.
//
// Secrets requis :
//   - STRIPE_SECRET_KEY
//   - STRIPE_WEBHOOK_SECRET    (signing secret Stripe pour vérifier les events)
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//
// IMPORTANT :
//   - verify_jwt=false (Stripe n'envoie pas de JWT Supabase, seulement une signature Stripe)
//   - Pas de CORS : endpoint serveur-à-serveur, pas appelé par un navigateur
//   - La signature Stripe est la SEULE source d'authenticité : elle DOIT être vérifiée
//
// Events gérés :
//   - checkout.session.completed           → active Créateur (plan='createur')
//   - customer.subscription.created        → active Créateur si status=active
//   - customer.subscription.updated        → active ou désactive selon status
//   - customer.subscription.deleted        → désactive (plan='libre')
//
// La modification de profiles.plan est faite en service_role (bypass RLS).

import Stripe from "npm:stripe@14";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

type Plan = "libre" | "createur" | "studio";

function textResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return textResponse("Method not allowed", 405);
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceKey) {
    return textResponse("Configuration incomplete", 500);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return textResponse("Missing stripe-signature header", 400);
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] Signature verification failed:", msg);
    return textResponse(`Webhook signature error: ${msg}`, 400);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Retrouve le user_id à partir d'un customer Stripe
  async function findUserIdByCustomer(
    customerId: string
  ): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (error) {
      console.error(
        "[stripe-webhook] findUserIdByCustomer error:",
        error.message
      );
      return null;
    }
    return data?.user_id ?? null;
  }

  async function updatePlan(
    userId: string,
    plan: Plan,
    billingPeriodStart: string | null = null
  ): Promise<void> {
    const update: Record<string, unknown> = { plan };
    if (billingPeriodStart !== undefined) update.billing_period_start = billingPeriodStart;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(update)
      .eq("user_id", userId);
    if (error) {
      console.error(
        `[stripe-webhook] updatePlan error (${userId} → ${plan}):`,
        error.message
      );
      throw error;
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid") break;
        const userId =
          (session.metadata?.user_id as string | undefined) ??
          (typeof session.customer === "string"
            ? await findUserIdByCustomer(session.customer)
            : null);
        if (!userId) {
          console.error(
            "[stripe-webhook] checkout.session.completed: user_id introuvable"
          );
          break;
        }
        await updatePlan(userId, "createur", new Date().toISOString());
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const userId =
          (sub.metadata?.user_id as string | undefined) ??
          (await findUserIdByCustomer(customerId));
        if (!userId) {
          console.error(
            `[stripe-webhook] ${event.type}: user_id introuvable pour customer=${customerId}`
          );
          break;
        }
        const activeStatuses: Stripe.Subscription.Status[] = [
          "active",
          "trialing",
        ];
        const isActive = activeStatuses.includes(sub.status);
        const plan: Plan = isActive ? "createur" : "libre";
        const billingPeriodStart = isActive
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null;
        await updatePlan(userId, plan, billingPeriodStart);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const userId =
          (sub.metadata?.user_id as string | undefined) ??
          (await findUserIdByCustomer(customerId));
        if (!userId) {
          console.error(
            `[stripe-webhook] subscription.deleted: user_id introuvable pour customer=${customerId}`
          );
          break;
        }
        await updatePlan(userId, "libre", null);
        break;
      }

      default:
        // Events non gérés : on les accuse mais on ne fait rien
        break;
    }

    return jsonResponse({ received: true }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe-webhook] Exception:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
