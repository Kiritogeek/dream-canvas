-- Migration: Ajout du champ 'plan' à la table profiles pour la gestion des tiers
-- Date: 2026-02-13

-- Ajouter le champ plan avec valeur par défaut 'free'
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

-- Contrainte pour limiter les valeurs possibles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro'));

-- Index pour filtrer par plan (utile pour les stats admin)
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles (plan);
-- Note: La table 'usage' existe déjà (migration 20260213220000)
-- Elle est utilisée pour le comptage des générations mensuelles

-- Permettre l'Edge Function (service_role) d'accéder à la table usage
-- en ajoutant des policies pour le service_role (déjà couvert par le bypass RLS du service_role)

-- S'assurer que la RLS sur profiles autorise la lecture du champ plan par l'utilisateur
-- (les policies existantes SELECT * WHERE auth.uid() = user_id couvrent déjà cela)
