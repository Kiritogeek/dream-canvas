-- Fix P1 (session du 2026-07-02 soir) : consume_image_credit exécutable par anon.
--
-- Constat en prod : un appel PostgREST anonyme sur rpc/consume_image_credit
-- s'exécute (erreur FK atteinte, donc EXECUTE accordé) alors que la migration
-- 20260627130000 prévoyait REVOKE ALL FROM PUBLIC + GRANT service_role.
-- La fonction ayant été (re)créée via le Dashboard sans le bloc de grants,
-- l'ACL par défaut (EXECUTE pour PUBLIC) était en vigueur : n'importe quel
-- porteur de la clé publishable pouvait consommer les crédits d'un user_id
-- arbitraire (SECURITY DEFINER → bypass RLS sur usage).
--
-- Ré-application idempotente du verrou : seule service_role (Edge Functions)
-- peut exécuter la fonction.

REVOKE ALL ON FUNCTION public.consume_image_credit(uuid, int, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_image_credit(uuid, int, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.consume_image_credit(uuid, int, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_image_credit(uuid, int, timestamptz) TO service_role;
