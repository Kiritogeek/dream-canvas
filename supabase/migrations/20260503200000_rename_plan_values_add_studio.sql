-- Migration: Renommage tiers free→libre, pro→createur, ajout studio
-- Date: 2026-05-03

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;

UPDATE public.profiles SET plan = 'libre' WHERE plan = 'free';
UPDATE public.profiles SET plan = 'createur' WHERE plan = 'pro';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('libre', 'createur', 'studio'));

ALTER TABLE public.profiles ALTER COLUMN plan SET DEFAULT 'libre';
