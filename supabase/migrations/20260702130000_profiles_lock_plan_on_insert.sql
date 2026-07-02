-- Migration: Verrouille les colonnes sensibles de profiles à l'INSERT
-- Date: 2026-07-02
--
-- Suite de 20260702120000 (verrouillage UPDATE). La policy INSERT d'origine
-- (20260209195229) ne contrôle que user_id : un client pourrait en théorie
-- insérer sa ligne profiles avec plan='studio'. Chemin inatteignable
-- aujourd'hui (ligne créée au signup par handle_new_user en SECURITY DEFINER,
-- user_id UNIQUE, aucune policy DELETE client) — verrouillé par défense en
-- profondeur (observation QA du 02/07).
--
-- Un INSERT client légitime ne peut créer qu'un profil vierge : plan par
-- défaut 'libre' (défaut colonne depuis 20260503200000), sans données de
-- facturation. handle_new_user (SECURITY DEFINER, propriétaire de la table)
-- bypass la RLS et n'est pas affecté.

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND plan = 'libre'
    AND billing_period_start IS NULL
    AND stripe_customer_id IS NULL
    AND excluded_from_stats = false
  );
