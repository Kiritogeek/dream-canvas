-- Audit 2026-06-27 — consommation atomique de crédit (anti race condition).
-- Remplace le pattern check-puis-insert (non atomique) des Edge Functions
-- generate-asset-image / generate-panel-image par un check+insert transactionnel
-- sérialisé par utilisateur (verrou consultatif). Empêche le dépassement de quota
-- par requêtes concurrentes (et le surcoût FAL.ai associé).
--
-- Renvoie : allowed (crédit accordé ?), usage_id (ligne réservée, pour remboursement
-- si la génération échoue), current_count (compteur après l'opération).

CREATE OR REPLACE FUNCTION public.consume_image_credit(
  p_user_id uuid,
  p_limit int,
  p_period_start timestamptz
)
RETURNS TABLE (allowed boolean, usage_id uuid, current_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_id uuid;
BEGIN
  -- Sérialise les appels concurrents du MÊME utilisateur sur la durée de la transaction.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  SELECT count(*) INTO v_count
  FROM public.usage
  WHERE user_id = p_user_id
    AND action = 'image_generation'
    AND created_at >= p_period_start;

  IF v_count >= p_limit THEN
    RETURN QUERY SELECT false, NULL::uuid, v_count;
  ELSE
    INSERT INTO public.usage (user_id, action)
    VALUES (p_user_id, 'image_generation')
    RETURNING id INTO v_id;
    RETURN QUERY SELECT true, v_id, v_count + 1;
  END IF;
END;
$$;

-- Appelée uniquement par les Edge Functions via le service role.
REVOKE ALL ON FUNCTION public.consume_image_credit(uuid, int, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_image_credit(uuid, int, timestamptz) TO service_role;
