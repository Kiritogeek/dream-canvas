-- Migration: Nettoyage automatique de la table usage + index composite
-- Date: 2026-05-15
--
-- Objectif :
--   1. Index composite (user_id, action, created_at) pour accélérer les comptages mensuels
--   2. Cron job pg_cron : supprime les entrées > 13 mois le 2 de chaque mois à 03h UTC
--      → garde 13 mois d'historique (analytics + sécurité billing)
--      → évite la croissance infinie de la table

-- 1. Index composite — remplace l'index simple (user_id, created_at)
--    La requête fetchMonthlyUsage filtre sur user_id + action + created_at
CREATE INDEX IF NOT EXISTS idx_usage_user_action_created
  ON public.usage (user_id, action, created_at DESC);

-- 2. Extension pg_cron (disponible sur tous les plans Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Droits d'exécution pour pg_cron sur le schéma public
GRANT USAGE ON SCHEMA public TO postgres;

-- 4. Cron job : nettoyage mensuel le 2 du mois à 03:00 UTC
--    Supprime toutes les entrées antérieures à 13 mois
SELECT cron.schedule(
  'cleanup-old-usage',
  '0 3 2 * *',
  $$
  DELETE FROM public.usage
  WHERE created_at < now() - INTERVAL '13 months';
  $$
);
