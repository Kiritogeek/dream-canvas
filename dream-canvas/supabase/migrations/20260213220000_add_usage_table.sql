-- Migration: Ajout table usage pour le rate limiting / suivi de consommation
-- Date: 2026-02-13

CREATE TABLE IF NOT EXISTS public.usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  action TEXT NOT NULL DEFAULT 'image_generation',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les requêtes de comptage par utilisateur et mois
CREATE INDEX IF NOT EXISTS idx_usage_user_created ON public.usage (user_id, created_at DESC);

-- RLS
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON public.usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Note: La suppression et mise à jour ne sont pas autorisées côté client
-- Le nettoyage des anciennes entrées se fera via un cron ou manuellement
