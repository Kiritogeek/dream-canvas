-- Migration: Ajout billing_period_start pour le reset de quota basé sur la date d'abonnement
-- Date: 2026-05-03
--
-- Pour les plans payants, le quota mensuel se réinitialise à la date anniversaire de l'abonnement
-- (ex: souscrit le 15 → reset chaque 15 du mois) plutôt que le 1er du mois calendaire.
-- NULL = plan Libre → reset calendaire (1er du mois).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMPTZ NULL;
