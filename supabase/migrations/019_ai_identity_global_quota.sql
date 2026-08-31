-- MODIRA 019 — identidad autenticada, cuotas globales y reservas AI
-- No modifica migraciones históricas 001–018.

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id
  ON public.ai_conversations(user_id);

-- Las conversaciones nuevas quedan vinculadas al usuario autenticado.
-- Las conversaciones legacy sin user_id permanecen visibles solo a workers/admins.
DROP POLICY IF EXISTS ai_conversations_user_select ON public.ai_conversations;
CREATE POLICY ai_conversations_user_select
ON public.ai_conversations
FOR SELECT TO authenticated
USING (
  public.current_user_is_active()
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS ai_messages_user_select ON public.ai_messages;
CREATE POLICY ai_messages_user_select
ON public.ai_messages
FOR SELECT TO authenticated
USING (
  public.current_user_is_active()
  AND EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_messages.conversation_id
      AND c.user_id = auth.uid()
  )
);

CREATE TABLE IF NOT EXISTS public.ai_quota_config (
  config_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  user_request_limit INTEGER NOT NULL DEFAULT 20,
  company_request_limit INTEGER,
  anonymous_request_limit INTEGER NOT NULL DEFAULT 20,
  anonymous_period_seconds INTEGER NOT NULL DEFAULT 86400,
  period_seconds INTEGER NOT NULL DEFAULT 3600,
  budget_cents NUMERIC(12,4),
  anonymous_budget_cents NUMERIC(12,4),
  max_input_tokens INTEGER NOT NULL DEFAULT 12000,
  max_output_tokens INTEGER NOT NULL DEFAULT 600,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ai_quota_config_key_check CHECK (config_key = 'modira-ai'),
  CONSTRAINT ai_quota_config_user_limit_check CHECK (user_request_limit > 0),
  CONSTRAINT ai_quota_config_company_limit_check CHECK (company_request_limit IS NULL OR company_request_limit > 0),
  CONSTRAINT ai_quota_config_anonymous_limit_check CHECK (anonymous_request_limit > 0),
  CONSTRAINT ai_quota_config_anonymous_period_check CHECK (anonymous_period_seconds BETWEEN 60 AND 2592000),
  CONSTRAINT ai_quota_config_period_check CHECK (period_seconds BETWEEN 60 AND 2592000),
  CONSTRAINT ai_quota_config_budget_check CHECK (budget_cents IS NULL OR budget_cents >= 0),
  CONSTRAINT ai_quota_config_anonymous_budget_check CHECK (anonymous_budget_cents IS NULL OR anonymous_budget_cents >= 0),
  CONSTRAINT ai_quota_config_input_check CHECK (max_input_tokens > 0),
  CONSTRAINT ai_quota_config_output_check CHECK (max_output_tokens > 0)
);

INSERT INTO public.ai_quota_config (config_key, enabled, user_request_limit, company_request_limit, anonymous_request_limit, anonymous_period_seconds, period_seconds, budget_cents, anonymous_budget_cents)
VALUES ('modira-ai', TRUE, 20, NULL, 20, 86400, 3600, NULL, NULL)
ON CONFLICT (config_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ai_usage_periods (
  scope_key TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  period_started_at TIMESTAMPTZ NOT NULL,
  period_ends_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  cost_cents NUMERIC(14,4) NOT NULL DEFAULT 0,
  reserved_requests INTEGER NOT NULL DEFAULT 0,
  reserved_input_tokens BIGINT NOT NULL DEFAULT 0,
  reserved_output_tokens BIGINT NOT NULL DEFAULT 0,
  reserved_cost_cents NUMERIC(14,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ai_usage_periods_counts_check CHECK (request_count >= 0 AND reserved_requests >= 0),
  CONSTRAINT ai_usage_periods_tokens_check CHECK (input_tokens >= 0 AND output_tokens >= 0 AND reserved_input_tokens >= 0 AND reserved_output_tokens >= 0),
  CONSTRAINT ai_usage_periods_cost_check CHECK (cost_cents >= 0 AND reserved_cost_cents >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_periods_user ON public.ai_usage_periods(user_id, period_ends_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_periods_company ON public.ai_usage_periods(company_id, period_ends_at);

CREATE TABLE IF NOT EXISTS public.ai_usage_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  scope_key TEXT NOT NULL,
  estimated_input_tokens INTEGER NOT NULL,
  estimated_output_tokens INTEGER NOT NULL,
  estimated_cost_cents NUMERIC(14,4) NOT NULL DEFAULT 0,
  actual_input_tokens INTEGER,
  actual_output_tokens INTEGER,
  actual_cost_cents NUMERIC(14,4),
  status TEXT NOT NULL DEFAULT 'reserved',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finalized_at TIMESTAMPTZ,
  CONSTRAINT ai_usage_reservations_estimate_check CHECK (estimated_input_tokens >= 0 AND estimated_output_tokens >= 0 AND estimated_cost_cents >= 0),
  CONSTRAINT ai_usage_reservations_actual_check CHECK ((actual_input_tokens IS NULL OR actual_input_tokens >= 0) AND (actual_output_tokens IS NULL OR actual_output_tokens >= 0) AND (actual_cost_cents IS NULL OR actual_cost_cents >= 0)),
  CONSTRAINT ai_usage_reservations_status_check CHECK (status IN ('reserved', 'consumed', 'released', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_reservations_scope ON public.ai_usage_reservations(scope_key, status);
CREATE INDEX IF NOT EXISTS idx_ai_usage_reservations_expiry ON public.ai_usage_reservations(expires_at) WHERE status = 'reserved';

ALTER TABLE public.ai_quota_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_quota_config, public.ai_usage_periods, public.ai_usage_reservations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_usage_periods, public.ai_usage_reservations TO service_role;
GRANT SELECT, UPDATE ON public.ai_quota_config TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_ai_quota_for_user(
  p_user_id UUID,
  p_company_id UUID,
  p_estimated_input_tokens INTEGER,
  p_estimated_output_tokens INTEGER,
  p_estimated_cost_cents NUMERIC
)
RETURNS TABLE (allowed BOOLEAN, reservation_id UUID, retry_after_seconds INTEGER, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_config public.ai_quota_config;
  v_profile public.profiles;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_period_end TIMESTAMPTZ;
  v_user_key TEXT;
  v_company_key TEXT;
  v_user public.ai_usage_periods;
  v_company public.ai_usage_periods;
  v_reservation UUID;
  v_user_count BIGINT;
  v_company_count BIGINT;
BEGIN
  IF p_user_id IS NULL OR p_estimated_input_tokens < 0 OR p_estimated_output_tokens < 0 OR p_estimated_cost_cents < 0 THEN
    RAISE EXCEPTION 'Invalid AI quota parameters';
  END IF;

  SELECT * INTO v_config FROM public.ai_quota_config WHERE config_key = 'modira-ai' FOR SHARE;
  IF NOT FOUND OR NOT v_config.enabled THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 3600, 'disabled'; RETURN;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND OR v_profile.status <> 'active' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 3600, 'inactive'; RETURN;
  END IF;
  IF v_profile.company_id IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Invalid AI company identity';
  END IF;

  v_period_end := v_now + make_interval(secs => v_config.period_seconds);
  v_user_key := 'user:' || p_user_id::TEXT;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_key, 19019));

  INSERT INTO public.ai_usage_periods(scope_key, user_id, company_id, period_started_at, period_ends_at)
  VALUES (v_user_key, p_user_id, p_company_id, v_now, v_period_end)
  ON CONFLICT (scope_key) DO UPDATE SET
    period_started_at = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN v_now ELSE ai_usage_periods.period_started_at END,
    period_ends_at = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN v_period_end ELSE ai_usage_periods.period_ends_at END,
    request_count = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.request_count END,
    input_tokens = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.input_tokens END,
    output_tokens = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.output_tokens END,
    cost_cents = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.cost_cents END,
    reserved_requests = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.reserved_requests END,
    reserved_input_tokens = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.reserved_input_tokens END,
    reserved_output_tokens = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.reserved_output_tokens END,
    reserved_cost_cents = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.reserved_cost_cents END,
    updated_at = v_now
  RETURNING * INTO v_user;

  v_user_count := v_user.request_count + v_user.reserved_requests;
  IF v_user_count >= v_config.user_request_limit THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_user.period_ends_at - v_now)))::INTEGER), 'user_request_limit'; RETURN;
  END IF;
  IF v_config.budget_cents IS NOT NULL AND v_user.cost_cents + v_user.reserved_cost_cents + p_estimated_cost_cents > v_config.budget_cents THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_user.period_ends_at - v_now)))::INTEGER), 'budget_limit'; RETURN;
  END IF;

  IF p_company_id IS NOT NULL AND v_config.company_request_limit IS NOT NULL THEN
    v_company_key := 'company:' || p_company_id::TEXT;
    PERFORM pg_advisory_xact_lock(hashtextextended(v_company_key, 19019));
    INSERT INTO public.ai_usage_periods(scope_key, user_id, company_id, period_started_at, period_ends_at)
    VALUES (v_company_key, p_user_id, p_company_id, v_now, v_period_end)
    ON CONFLICT (scope_key) DO UPDATE SET
      period_started_at = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN v_now ELSE ai_usage_periods.period_started_at END,
      period_ends_at = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN v_now + make_interval(secs => v_config.period_seconds) ELSE ai_usage_periods.period_ends_at END,
      request_count = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.request_count END,
      reserved_requests = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.reserved_requests END,
      input_tokens = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.input_tokens END,
      output_tokens = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.output_tokens END,
      cost_cents = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.cost_cents END,
      reserved_input_tokens = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.reserved_input_tokens END,
      reserved_output_tokens = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.reserved_output_tokens END,
      reserved_cost_cents = CASE WHEN ai_usage_periods.period_ends_at <= v_now THEN 0 ELSE ai_usage_periods.reserved_cost_cents END,
      updated_at = v_now
    RETURNING * INTO v_company;
    v_company_count := v_company.request_count + v_company.reserved_requests;
    IF v_company_count >= v_config.company_request_limit THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_company.period_ends_at - v_now)))::INTEGER), 'company_request_limit'; RETURN;
    END IF;
  END IF;

  v_reservation := gen_random_uuid();
  INSERT INTO public.ai_usage_reservations(id, user_id, company_id, scope_key, estimated_input_tokens, estimated_output_tokens, estimated_cost_cents, expires_at)
  VALUES (v_reservation, p_user_id, p_company_id, v_user_key, p_estimated_input_tokens, p_estimated_output_tokens, p_estimated_cost_cents, v_now + INTERVAL '2 minutes');

  UPDATE public.ai_usage_periods SET reserved_requests = reserved_requests + 1, reserved_input_tokens = reserved_input_tokens + p_estimated_input_tokens, reserved_output_tokens = reserved_output_tokens + p_estimated_output_tokens, reserved_cost_cents = reserved_cost_cents + p_estimated_cost_cents, updated_at = v_now WHERE scope_key = v_user_key;
  IF p_company_id IS NOT NULL AND v_config.company_request_limit IS NOT NULL THEN
    UPDATE public.ai_usage_periods SET reserved_requests = reserved_requests + 1, reserved_input_tokens = reserved_input_tokens + p_estimated_input_tokens, reserved_output_tokens = reserved_output_tokens + p_estimated_output_tokens, reserved_cost_cents = reserved_cost_cents + p_estimated_cost_cents, updated_at = v_now WHERE scope_key = v_company_key;
  END IF;

  RETURN QUERY SELECT TRUE, v_reservation, 0, 'allowed';
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_ai_quota(
  p_reservation_id UUID,
  p_actual_input_tokens INTEGER,
  p_actual_output_tokens INTEGER,
  p_actual_cost_cents NUMERIC,
  p_success BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  r public.ai_usage_reservations;
  c public.ai_quota_config;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF p_actual_input_tokens < 0 OR p_actual_output_tokens < 0 OR p_actual_cost_cents < 0 THEN RAISE EXCEPTION 'Invalid AI usage'; END IF;
  SELECT * INTO c FROM public.ai_quota_config WHERE config_key = 'modira-ai';
  SELECT * INTO r FROM public.ai_usage_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND OR r.status <> 'reserved' THEN RETURN FALSE; END IF;

  IF r.scope_key LIKE 'anon-ip:%' THEN
    UPDATE public.ai_anonymous_quota_periods SET
      reserved_requests = GREATEST(0, reserved_requests - 1),
      reserved_input_tokens = GREATEST(0, reserved_input_tokens - r.estimated_input_tokens),
      reserved_output_tokens = GREATEST(0, reserved_output_tokens - r.estimated_output_tokens),
      reserved_cost_cents = GREATEST(0, reserved_cost_cents - r.estimated_cost_cents),
      request_count = request_count + CASE WHEN p_success THEN 1 ELSE 0 END,
      input_tokens = input_tokens + CASE WHEN p_success THEN p_actual_input_tokens ELSE 0 END,
      output_tokens = output_tokens + CASE WHEN p_success THEN p_actual_output_tokens ELSE 0 END,
      cost_cents = cost_cents + CASE WHEN p_success THEN p_actual_cost_cents ELSE 0 END,
      updated_at = v_now
    WHERE identity_key = r.scope_key;
  ELSE
    UPDATE public.ai_usage_periods SET
      reserved_requests = GREATEST(0, reserved_requests - 1),
      reserved_input_tokens = GREATEST(0, reserved_input_tokens - r.estimated_input_tokens),
      reserved_output_tokens = GREATEST(0, reserved_output_tokens - r.estimated_output_tokens),
      reserved_cost_cents = GREATEST(0, reserved_cost_cents - r.estimated_cost_cents),
      request_count = request_count + CASE WHEN p_success THEN 1 ELSE 0 END,
      input_tokens = input_tokens + CASE WHEN p_success THEN p_actual_input_tokens ELSE 0 END,
      output_tokens = output_tokens + CASE WHEN p_success THEN p_actual_output_tokens ELSE 0 END,
      cost_cents = cost_cents + CASE WHEN p_success THEN p_actual_cost_cents ELSE 0 END,
      updated_at = v_now
    WHERE scope_key = r.scope_key;
  END IF;

  IF r.company_id IS NOT NULL AND c.company_request_limit IS NOT NULL THEN
    UPDATE public.ai_usage_periods SET
      reserved_requests = GREATEST(0, reserved_requests - 1),
      reserved_input_tokens = GREATEST(0, reserved_input_tokens - r.estimated_input_tokens),
      reserved_output_tokens = GREATEST(0, reserved_output_tokens - r.estimated_output_tokens),
      reserved_cost_cents = GREATEST(0, reserved_cost_cents - r.estimated_cost_cents),
      request_count = request_count + CASE WHEN p_success THEN 1 ELSE 0 END,
      input_tokens = input_tokens + CASE WHEN p_success THEN p_actual_input_tokens ELSE 0 END,
      output_tokens = output_tokens + CASE WHEN p_success THEN p_actual_output_tokens ELSE 0 END,
      cost_cents = cost_cents + CASE WHEN p_success THEN p_actual_cost_cents ELSE 0 END,
      updated_at = v_now
    WHERE scope_key = 'company:' || r.company_id::TEXT;
  END IF;

  UPDATE public.ai_usage_reservations SET status = CASE WHEN p_success THEN 'consumed' ELSE 'released' END, actual_input_tokens = p_actual_input_tokens, actual_output_tokens = p_actual_output_tokens, actual_cost_cents = p_actual_cost_cents, finalized_at = v_now WHERE id = p_reservation_id;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_quota_for_user(UUID, UUID, INTEGER, INTEGER, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_ai_quota(UUID, INTEGER, INTEGER, NUMERIC, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_quota_for_user(UUID, UUID, INTEGER, INTEGER, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_ai_quota(UUID, INTEGER, INTEGER, NUMERIC, BOOLEAN) TO service_role;

COMMENT ON TABLE public.ai_quota_config IS 'Configuración no editable por usuarios. budget_cents NULL significa que el presupuesto económico debe configurarse antes de producción.';


-- Cuota anónima: la clave se construye exclusivamente en la Edge Function
-- a partir de la IP observada por el gateway. session_id nunca es la fuente
-- de verdad. No se concede acceso directo a clientes.
CREATE TABLE IF NOT EXISTS public.ai_anonymous_quota_periods (
  identity_key TEXT PRIMARY KEY,
  period_started_at TIMESTAMPTZ NOT NULL,
  period_ends_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  cost_cents NUMERIC(14,4) NOT NULL DEFAULT 0,
  reserved_requests INTEGER NOT NULL DEFAULT 0,
  reserved_input_tokens BIGINT NOT NULL DEFAULT 0,
  reserved_output_tokens BIGINT NOT NULL DEFAULT 0,
  reserved_cost_cents NUMERIC(14,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ai_anonymous_quota_identity_check CHECK (identity_key LIKE 'anon-ip:%' AND LENGTH(identity_key) <= 200),
  CONSTRAINT ai_anonymous_quota_counts_check CHECK (request_count >= 0 AND reserved_requests >= 0),
  CONSTRAINT ai_anonymous_quota_tokens_check CHECK (input_tokens >= 0 AND output_tokens >= 0 AND reserved_input_tokens >= 0 AND reserved_output_tokens >= 0),
  CONSTRAINT ai_anonymous_quota_cost_check CHECK (cost_cents >= 0 AND reserved_cost_cents >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ai_anonymous_quota_updated ON public.ai_anonymous_quota_periods(updated_at);
ALTER TABLE public.ai_anonymous_quota_periods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_anonymous_quota_periods FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_anonymous_quota_periods TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_ai_anonymous_quota(
  p_identity_key TEXT,
  p_estimated_input_tokens INTEGER,
  p_estimated_output_tokens INTEGER,
  p_estimated_cost_cents NUMERIC
)
RETURNS TABLE (allowed BOOLEAN, reservation_id UUID, retry_after_seconds INTEGER, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  c public.ai_quota_config;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_period_end TIMESTAMPTZ;
  v_row public.ai_anonymous_quota_periods;
  v_count BIGINT;
  v_reservation UUID;
BEGIN
  IF p_identity_key IS NULL OR p_identity_key NOT LIKE 'anon-ip:%' OR LENGTH(p_identity_key) > 200 OR p_estimated_input_tokens < 0 OR p_estimated_output_tokens < 0 OR p_estimated_cost_cents < 0 THEN
    RAISE EXCEPTION 'Invalid anonymous AI quota parameters';
  END IF;
  SELECT * INTO c FROM public.ai_quota_config WHERE config_key = 'modira-ai' FOR SHARE;
  IF NOT FOUND OR NOT c.enabled THEN RETURN QUERY SELECT FALSE, NULL::UUID, 3600, 'disabled'; RETURN; END IF;
  v_period_end := v_now + make_interval(secs => c.anonymous_period_seconds);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_identity_key, 19020));
  INSERT INTO public.ai_anonymous_quota_periods(identity_key, period_started_at, period_ends_at)
  VALUES (p_identity_key, v_now, v_period_end)
  ON CONFLICT (identity_key) DO UPDATE SET
    period_started_at = CASE WHEN ai_anonymous_quota_periods.period_ends_at <= v_now THEN v_now ELSE ai_anonymous_quota_periods.period_started_at END,
    period_ends_at = CASE WHEN ai_anonymous_quota_periods.period_ends_at <= v_now THEN v_period_end ELSE ai_anonymous_quota_periods.period_ends_at END,
    request_count = CASE WHEN ai_anonymous_quota_periods.period_ends_at <= v_now THEN 0 ELSE ai_anonymous_quota_periods.request_count END,
    input_tokens = CASE WHEN ai_anonymous_quota_periods.period_ends_at <= v_now THEN 0 ELSE ai_anonymous_quota_periods.input_tokens END,
    output_tokens = CASE WHEN ai_anonymous_quota_periods.period_ends_at <= v_now THEN 0 ELSE ai_anonymous_quota_periods.output_tokens END,
    cost_cents = CASE WHEN ai_anonymous_quota_periods.period_ends_at <= v_now THEN 0 ELSE ai_anonymous_quota_periods.cost_cents END,
    reserved_requests = CASE WHEN ai_anonymous_quota_periods.period_ends_at <= v_now THEN 0 ELSE ai_anonymous_quota_periods.reserved_requests END,
    reserved_input_tokens = CASE WHEN ai_anonymous_quota_periods.period_ends_at <= v_now THEN 0 ELSE ai_anonymous_quota_periods.reserved_input_tokens END,
    reserved_output_tokens = CASE WHEN ai_anonymous_quota_periods.period_ends_at <= v_now THEN 0 ELSE ai_anonymous_quota_periods.reserved_output_tokens END,
    reserved_cost_cents = CASE WHEN ai_anonymous_quota_periods.period_ends_at <= v_now THEN 0 ELSE ai_anonymous_quota_periods.reserved_cost_cents END,
    updated_at = v_now
  RETURNING * INTO v_row;
  v_count := v_row.request_count + v_row.reserved_requests;
  IF v_count >= c.anonymous_request_limit THEN RETURN QUERY SELECT FALSE, NULL::UUID, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row.period_ends_at - v_now)))::INTEGER), 'anonymous_request_limit'; RETURN; END IF;
  IF c.anonymous_budget_cents IS NOT NULL AND v_row.cost_cents + v_row.reserved_cost_cents + p_estimated_cost_cents > c.anonymous_budget_cents THEN RETURN QUERY SELECT FALSE, NULL::UUID, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row.period_ends_at - v_now)))::INTEGER), 'budget_limit'; RETURN; END IF;
  v_reservation := gen_random_uuid();
  INSERT INTO public.ai_usage_reservations(id, user_id, company_id, scope_key, estimated_input_tokens, estimated_output_tokens, estimated_cost_cents, expires_at)
  VALUES (v_reservation, NULL, NULL, p_identity_key, p_estimated_input_tokens, p_estimated_output_tokens, p_estimated_cost_cents, v_now + INTERVAL '2 minutes');
  UPDATE public.ai_anonymous_quota_periods SET reserved_requests = reserved_requests + 1, reserved_input_tokens = reserved_input_tokens + p_estimated_input_tokens, reserved_output_tokens = reserved_output_tokens + p_estimated_output_tokens, reserved_cost_cents = reserved_cost_cents + p_estimated_cost_cents, updated_at = v_now WHERE identity_key = p_identity_key;
  RETURN QUERY SELECT TRUE, v_reservation, 0, 'allowed';
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_anonymous_quota(TEXT, INTEGER, INTEGER, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_anonymous_quota(TEXT, INTEGER, INTEGER, NUMERIC) TO service_role;
