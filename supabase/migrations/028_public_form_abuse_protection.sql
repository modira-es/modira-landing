BEGIN;

-- ============================================================
-- MODIRA — 028_public_form_abuse_protection.sql
--
-- Corrige el hallazgo de auditoría V-10:
--
-- audit_requests permitía INSERT anónimo ilimitado
-- (policy audit_requests_public_insert WITH CHECK (TRUE)).
--
-- Esta migración:
--
--   1. Elimina el INSERT directo desde el frontend.
--   2. Crea la RPC submit_audit_request() con:
--        - validación estricta de campos;
--        - límite de 3 solicitudes por identidad y hora;
--        - identidad calculada en backend a partir de las
--          cabeceras observadas por el proxy (nunca enviada
--          por el cliente) y almacenada solo como hash.
--
-- La RPC devuelve el mismo error genérico en caso de límite,
-- sin información sobre el estado interno.
-- ============================================================


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'audit_requests'
    ) THEN
        RAISE EXCEPTION '028 stopped: public.audit_requests does not exist';
    END IF;

END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 2. RETIRAR INSERT DIRECTO PÚBLICO
-- ============================================================

DROP POLICY IF EXISTS audit_requests_public_insert
ON public.audit_requests;

REVOKE INSERT
ON public.audit_requests
FROM anon, authenticated;


-- ============================================================
-- 3. TABLA DE LÍMITE POR IDENTIDAD
-- ============================================================

CREATE TABLE IF NOT EXISTS public.public_form_rate_limits (
    identity_key TEXT PRIMARY KEY,
    form_key TEXT NOT NULL,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    request_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT public_form_rate_limits_count_check
        CHECK (request_count >= 0),
    CONSTRAINT public_form_rate_limits_key_check
        CHECK (LENGTH(identity_key) <= 200)
);

ALTER TABLE public.public_form_rate_limits
ENABLE ROW LEVEL SECURITY;

-- Sin políticas: solo service_role y la RPC SECURITY DEFINER.
REVOKE ALL
ON public.public_form_rate_limits
FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 4. RPC — SOLICITUD DE AUDITORÍA CON LÍMITE
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_audit_request(
    p_nombre TEXT,
    p_email TEXT,
    p_empresa TEXT,
    p_empleados TEXT,
    p_proceso TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_nombre TEXT;
    v_email TEXT;
    v_empresa TEXT;
    v_empleados TEXT;
    v_proceso TEXT;

    v_headers JSONB;
    v_ip TEXT;
    v_identity_key TEXT;

    v_window_started_at TIMESTAMPTZ;
    v_request_count INTEGER;
    v_now TIMESTAMPTZ := clock_timestamp();

    v_request_id UUID;
BEGIN

    -- --------------------------------------------------------
    -- VALIDACIÓN DE ENTRADA
    -- --------------------------------------------------------

    v_nombre := NULLIF(TRIM(p_nombre), '');
    v_email := NULLIF(TRIM(p_email), '');
    v_empresa := NULLIF(TRIM(p_empresa), '');
    v_empleados := NULLIF(TRIM(p_empleados), '');
    v_proceso := NULLIF(TRIM(p_proceso), '');

    IF v_nombre IS NULL OR LENGTH(v_nombre) > 200 THEN
        RAISE EXCEPTION 'Datos de la solicitud no válidos.';
    END IF;

    IF v_email IS NULL
       OR LENGTH(v_email) > 320
       OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RAISE EXCEPTION 'Datos de la solicitud no válidos.';
    END IF;

    IF v_empresa IS NULL OR LENGTH(v_empresa) > 200 THEN
        RAISE EXCEPTION 'Datos de la solicitud no válidos.';
    END IF;

    IF v_empleados IS NULL OR LENGTH(v_empleados) > 50 THEN
        RAISE EXCEPTION 'Datos de la solicitud no válidos.';
    END IF;

    IF v_proceso IS NULL OR LENGTH(v_proceso) > 4000 THEN
        RAISE EXCEPTION 'Datos de la solicitud no válidos.';
    END IF;

    -- --------------------------------------------------------
    -- IDENTIDAD (cabeceras observadas por el proxy de confianza)
    -- --------------------------------------------------------

    BEGIN
        v_headers := COALESCE(
            NULLIF(current_setting('request.headers', TRUE), '')::JSONB,
            '{}'::JSONB
        );
    EXCEPTION WHEN OTHERS THEN
        v_headers := '{}'::JSONB;
    END;

    v_ip :=
        COALESCE(
            NULLIF(TRIM(v_headers->>'cf-connecting-ip'), ''),
            NULLIF(TRIM(v_headers->>'x-real-ip'), ''),
            NULLIF(TRIM(SPLIT_PART(COALESCE(v_headers->>'x-forwarded-for', ''), ',', 1)), ''),
            'unknown'
        );

    v_identity_key :=
        'audit:' || encode(digest(v_ip, 'sha256'), 'hex');

    -- --------------------------------------------------------
    -- LÍMITE: 3 SOLICITUDES POR HORA E IDENTIDAD
    -- --------------------------------------------------------

    PERFORM pg_advisory_xact_lock(
        hashtextextended(v_identity_key, 28)
    );

    SELECT window_started_at, request_count
    INTO v_window_started_at, v_request_count
    FROM public.public_form_rate_limits
    WHERE identity_key = v_identity_key
      AND form_key = 'audit_request'
    FOR UPDATE;

    IF NOT FOUND THEN

        INSERT INTO public.public_form_rate_limits (
            identity_key,
            form_key,
            window_started_at,
            request_count
        )
        VALUES (
            v_identity_key,
            'audit_request',
            v_now,
            1
        );

    ELSE
        IF EXTRACT(EPOCH FROM (v_now - v_window_started_at)) >= 3600 THEN

            UPDATE public.public_form_rate_limits
            SET
                window_started_at = v_now,
                request_count = 1,
                updated_at = v_now
            WHERE identity_key = v_identity_key
              AND form_key = 'audit_request';

        ELSIF v_request_count >= 3 THEN
            RAISE EXCEPTION
                'Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde.';
        ELSE

            UPDATE public.public_form_rate_limits
            SET
                request_count = request_count + 1,
                updated_at = v_now
            WHERE identity_key = v_identity_key
              AND form_key = 'audit_request';

        END IF;
    END IF;

    -- --------------------------------------------------------
    -- INSERTAR SOLICITUD
    -- --------------------------------------------------------

    INSERT INTO public.audit_requests (
        nombre,
        email,
        empresa,
        empleados,
        proceso,
        estado
    )
    VALUES (
        v_nombre,
        v_email,
        v_empresa,
        v_empleados,
        v_proceso,
        'nuevo'
    )
    RETURNING id
    INTO v_request_id;

    RETURN v_request_id;

END;
$$;

REVOKE ALL
ON FUNCTION public.submit_audit_request(TEXT, TEXT, TEXT, TEXT, TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.submit_audit_request(TEXT, TEXT, TEXT, TEXT, TEXT)
TO anon, authenticated;


-- ============================================================
-- 5. LIMPIEZA PERIÓDICA DE CONTADORES
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_public_form_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN

    DELETE FROM public.public_form_rate_limits
    WHERE updated_at < clock_timestamp() - INTERVAL '24 hours';

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN v_deleted;

END;
$$;

REVOKE ALL
ON FUNCTION public.cleanup_public_form_rate_limits()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.cleanup_public_form_rate_limits()
TO service_role;


-- ============================================================
-- 6. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_requests'
      AND policyname = 'audit_requests_public_insert';

    IF v_count <> 0 THEN
        RAISE EXCEPTION
            '028 failed: audit_requests_public_insert still exists';
    END IF;

    IF has_table_privilege('anon', 'public.audit_requests', 'INSERT') THEN
        RAISE EXCEPTION
            '028 failed: anon retains INSERT on audit_requests';
    END IF;

    IF NOT has_function_privilege(
        'anon',
        'public.submit_audit_request(text,text,text,text,text)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            '028 failed: anon cannot execute submit_audit_request';
    END IF;

END $$;


COMMIT;