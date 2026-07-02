-- Migration: Verrouillage des colonnes sensibles de profiles côté client
-- Date: 2026-07-02
--
-- Fix du finding P1 (audit 2026-07-02) : la policy UPDATE de profiles ne verrouillait
-- que la colonne plan (migration 20260418120000). Les autres colonnes restaient
-- librement modifiables par le propriétaire via le client anon :
--   - billing_period_start : en la repositionnant à la date du jour, l'utilisateur
--     déplace la fenêtre de quota de generate-panel-image et remet son compteur
--     mensuel à zéro (contournement de maxGenerationsPerMonth).
--   - stripe_customer_id : une valeur arbitraire/dupliquée casse findUserIdByCustomer
--     du webhook Stripe (maybeSingle → null sur doublon).
--   - excluded_from_stats : un utilisateur peut s'auto-exclure des KPIs admin.
--   - email : maintenu par le trigger sync_user_email (SECURITY DEFINER, non affecté
--     par la RLS) — aucune raison de le laisser modifiable côté client.
--
-- Après cette migration, le client ne peut plus modifier que display_name et
-- avatar_url (+ updated_at via trigger). Le service_role (webhook Stripe, fonctions
-- admin) bypass la RLS et reste la seule entrée pour les colonnes verrouillées.
--
-- IS NOT DISTINCT FROM (et non =) : billing_period_start et stripe_customer_id sont
-- NULL pour les comptes sans abonnement — NULL = NULL vaut NULL, ce qui rejetterait
-- toute mise à jour de profil (y compris display_name) pour ces comptes.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND plan IS NOT DISTINCT FROM (SELECT plan FROM public.profiles WHERE user_id = auth.uid())
    AND billing_period_start IS NOT DISTINCT FROM (SELECT billing_period_start FROM public.profiles WHERE user_id = auth.uid())
    AND stripe_customer_id IS NOT DISTINCT FROM (SELECT stripe_customer_id FROM public.profiles WHERE user_id = auth.uid())
    AND excluded_from_stats IS NOT DISTINCT FROM (SELECT excluded_from_stats FROM public.profiles WHERE user_id = auth.uid())
    AND email IS NOT DISTINCT FROM (SELECT email FROM public.profiles WHERE user_id = auth.uid())
  );
