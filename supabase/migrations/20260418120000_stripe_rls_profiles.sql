-- Migration: Intégration Stripe — colonne stripe_customer_id + RLS durcie sur profiles.plan
-- Date: 2026-04-18
--
-- Objectif :
--   1. Ajouter stripe_customer_id à profiles pour lier un user Supabase à un customer Stripe.
--   2. Durcir la politique UPDATE de profiles pour qu'un client AUTH (anon/authenticated JWT)
--      ne puisse PAS modifier la colonne plan. Seul le service_role (webhook Stripe) bypass
--      la RLS et peut modifier plan.
--
-- Fix du bug B3 (audit 17/04/2026) : un user pouvait passer Pro gratuitement via
-- changePlan.mutate("pro") côté client.

-- 1. Colonne stripe_customer_id (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT NULL;

-- Index pour retrouver rapidement un user depuis un customer (webhook Stripe)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 2. Durcir la politique UPDATE
-- La RLS reste activée ; seule la policy UPDATE change pour bloquer toute modif de plan
-- par un JWT utilisateur. Le service_role bypass la RLS (webhook Stripe peut updater plan).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND plan = (SELECT plan FROM public.profiles WHERE user_id = auth.uid())
  );
