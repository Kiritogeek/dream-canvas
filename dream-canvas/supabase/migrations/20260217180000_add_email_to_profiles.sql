-- Migration: Ajout du champ 'email' à la table profiles
-- Date: 2026-02-17
-- Description: Ajoute le champ email dans profiles pour faciliter l'affichage dans le dashboard Supabase
-- L'email est synchronisé avec auth.users.email via un trigger

-- Ajouter le champ email
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Mettre à jour les profils existants avec l'email depuis auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- Fonction pour synchroniser l'email quand il change dans auth.users
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mettre à jour l'email dans profiles quand il change dans auth.users
  UPDATE public.profiles
  SET email = NEW.email, updated_at = now()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger pour synchroniser l'email automatiquement
DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;
CREATE TRIGGER sync_user_email_trigger
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_user_email();

-- Mettre à jour la fonction handle_new_user pour inclure l'email lors de la création
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = COALESCE(EXCLUDED.email, profiles.email), updated_at = now();
  RETURN NEW;
END;
$$;

-- Index pour faciliter les recherches par email (optionnel mais utile)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email) WHERE email IS NOT NULL;
