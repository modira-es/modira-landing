BEGIN;

-- ============================================================
-- MODIRA — 015_ai_rate_limiting.sql
--
-- Rate limiting persistente y atómico para Modira AI.
--
-- OBJETIVO:
-- Evitar que el límite de mensajes dependa de memoria local
-- de una instancia concreta de la Edge Function.
--
-- LA PROTECCIÓN SE REALIZA EN SUPABASE:
--
-- AIChatBot
--     ↓
-- modira-ai
--     ↓
-- RPC consume_ai_rate_limit()
--     ↓
-- ¿permitido?
--     ├── NO → 429
--     └── SÍ → OpenAI
--
-- La función RPC es SECURITY DEFINER y no está disponible
-- directamente para anon/authenticated.
--
-- ============================================================


-- ============================================================
-- 1. TABLA DE RATE LIMITS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
    rate_key TEXT PRIMARY KEY,

    window_started_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    request_count INTEGER NOT NULL
        DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ai_rate_limits_rate_key_check
        CHECK (
            LENGTH(TRIM(rate_key)) > 0
            AND LENGTH(rate_key) <= 200
        ),

    CONSTRAINT ai_rate_limits_request_count_check
        CHECK (
            request_count >= 0
        )
);


-- ============================================================
-- 2. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_updated_at
ON public.ai_rate_limits(updated_at);

CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_window_started_at
ON public.ai_rate_limits(window_started_at);


-- ============================================================
-- 3. RLS
-- ============================================================
--
-- Ningún usuario del frontend debe poder consultar ni modificar
-- directamente los contadores.
--
-- La Edge Function utilizará service_role/RPC.
-- ============================================================

ALTER TABLE public.ai_rate_limits
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 4. POLÍTICAS
-- ============================================================
--
-- No creamos ninguna política para anon/authenticated.
--
-- Por diseño:
--
-- anon            → sin acceso
-- authenticated   → sin acceso
-- service_role    → acceso mediante backend
--
-- ============================================================


-- ============================================================
-- 5. FUNCIÓN RPC ATÓMICA
-- ============================================================
--
-- consume_ai_rate_limit()
--
-- Recibe:
--
-- p_rate_key
-- p_limit
-- p_window_seconds
--
-- Ejemplo:
--
-- session:550e8400-e29b-41d4-a716-446655440000
--
-- o:
--
-- ip:203.0.113.10
--
--
-- La función:
--
-- 1. valida los parámetros;
-- 2. adquiere un advisory lock por clave;
-- 3. obtiene el contador;
-- 4. reinicia la ventana si ha expirado;
-- 5. comprueba el límite;
-- 6. incrementa únicamente si está permitido;
-- 7. devuelve resultado estructurado.
--
-- El advisory lock evita carreras entre peticiones simultáneas
-- de la misma clave.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.consume_ai_rate_limit(
    p_rate_key TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER
)
RETURNS TABLE (
    allowed BOOLEAN,
    remaining INTEGER,
    retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();

    v_window_started_at TIMESTAMPTZ;

    v_request_count INTEGER;

    v_elapsed_seconds NUMERIC;

    v_retry_after INTEGER;
BEGIN

    -- ========================================================
    -- VALIDACIÓN DE CLAVE
    -- ========================================================

    IF p_rate_key IS NULL
       OR LENGTH(TRIM(p_rate_key)) = 0
       OR LENGTH(p_rate_key) > 200
    THEN
        RAISE EXCEPTION
            'Invalid rate limit key';
    END IF;


    -- ========================================================
    -- VALIDACIÓN DEL LÍMITE
    -- ========================================================

    IF p_limit IS NULL
       OR p_limit < 1
       OR p_limit > 1000
    THEN
        RAISE EXCEPTION
            'Invalid rate limit limit';
    END IF;


    -- ========================================================
    -- VALIDACIÓN DE LA VENTANA
    -- ========================================================

    IF p_window_seconds IS NULL
       OR p_window_seconds < 1
       OR p_window_seconds > 86400
    THEN
        RAISE EXCEPTION
            'Invalid rate limit window';
    END IF;


    -- ========================================================
    -- LOCK ATÓMICO POR CLAVE
    -- ========================================================
    --
    -- hashtextextended genera una clave bigint para el
    -- advisory lock.
    --
    -- Las peticiones concurrentes de la misma clave quedan
    -- serializadas durante esta transacción.
    --
    -- No utilizamos locks de tabla porque queremos mantener
    -- concurrencia entre diferentes sesiones/IPs.
    -- ========================================================

    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            p_rate_key,
            0
        )
    );


    -- ========================================================
    -- OBTENER CONTADOR ACTUAL
    -- ========================================================

    SELECT
        ar.window_started_at,
        ar.request_count
    INTO
        v_window_started_at,
        v_request_count
    FROM public.ai_rate_limits ar
    WHERE ar.rate_key = p_rate_key
    FOR UPDATE;


    -- ========================================================
    -- PRIMERA PETICIÓN PARA ESTA CLAVE
    -- ========================================================

    IF NOT FOUND THEN

        INSERT INTO public.ai_rate_limits (
            rate_key,
            window_started_at,
            request_count
        )
        VALUES (
            p_rate_key,
            v_now,
            1
        );

        RETURN QUERY
        SELECT
            TRUE,
            p_limit - 1,
            0;

        RETURN;

    END IF;


    -- ========================================================
    -- CALCULAR TIEMPO TRANSCURRIDO
    -- ========================================================

    v_elapsed_seconds :=
        EXTRACT(
            EPOCH
            FROM (
                v_now - v_window_started_at
            )
        );


    -- ========================================================
    -- VENTANA EXPIRADA
    -- ========================================================

    IF v_elapsed_seconds >= p_window_seconds THEN

        UPDATE public.ai_rate_limits
        SET
            window_started_at = v_now,
            request_count = 1,
            updated_at = v_now
        WHERE rate_key = p_rate_key;

        RETURN QUERY
        SELECT
            TRUE,
            p_limit - 1,
            0;

        RETURN;

    END IF;


    -- ========================================================
    -- LÍMITE ALCANZADO
    -- ========================================================

    IF v_request_count >= p_limit THEN

        v_retry_after :=
            GREATEST(
                1,
                CEIL(
                    p_window_seconds
                    - v_elapsed_seconds
                )::INTEGER
            );

        RETURN QUERY
        SELECT
            FALSE,
            0,
            v_retry_after;

        RETURN;

    END IF;


    -- ========================================================
    -- PETICIÓN PERMITIDA
    -- ========================================================

    UPDATE public.ai_rate_limits
    SET
        request_count = request_count + 1,
        updated_at = v_now
    WHERE rate_key = p_rate_key;


    RETURN QUERY
    SELECT
        TRUE,
        GREATEST(
            0,
            p_limit - (v_request_count + 1)
        ),
        0;

END;
$$;


-- ============================================================
-- 6. FUNCIÓN DE LIMPIEZA
-- ============================================================
--
-- Las claves antiguas no deben permanecer indefinidamente.
--
-- Esta función elimina registros cuya ventana lleva más de
-- 24 horas expirada.
--
-- La limpieza podrá ejecutarse posteriormente mediante
-- pg_cron o mediante una tarea administrativa.
--
-- No forma parte del camino crítico del chatbot.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_ai_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN

    DELETE FROM public.ai_rate_limits
    WHERE updated_at < (
        clock_timestamp()
        - INTERVAL '24 hours'
    );

    GET DIAGNOSTICS
        v_deleted = ROW_COUNT;

    RETURN v_deleted;

END;
$$;


-- ============================================================
-- 7. PRIVILEGIOS
-- ============================================================
--
-- Nadie desde el frontend puede utilizar estas funciones.
--
-- La Edge Function utilizará service_role.
-- ============================================================

REVOKE ALL
ON TABLE public.ai_rate_limits
FROM PUBLIC;

REVOKE ALL
ON TABLE public.ai_rate_limits
FROM anon;

REVOKE ALL
ON TABLE public.ai_rate_limits
FROM authenticated;


REVOKE ALL
ON FUNCTION public.consume_ai_rate_limit(
    TEXT,
    INTEGER,
    INTEGER
)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.consume_ai_rate_limit(
    TEXT,
    INTEGER,
    INTEGER
)
FROM anon;

REVOKE ALL
ON FUNCTION public.consume_ai_rate_limit(
    TEXT,
    INTEGER,
    INTEGER
)
FROM authenticated;


REVOKE ALL
ON FUNCTION public.cleanup_ai_rate_limits()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.cleanup_ai_rate_limits()
FROM anon;

REVOKE ALL
ON FUNCTION public.cleanup_ai_rate_limits()
FROM authenticated;


-- ============================================================
-- 8. SERVICE ROLE
-- ============================================================

GRANT USAGE
ON SCHEMA public
TO service_role;


GRANT SELECT, INSERT, UPDATE, DELETE
ON public.ai_rate_limits
TO service_role;


GRANT EXECUTE
ON FUNCTION public.consume_ai_rate_limit(
    TEXT,
    INTEGER,
    INTEGER
)
TO service_role;


GRANT EXECUTE
ON FUNCTION public.cleanup_ai_rate_limits()
TO service_role;


-- ============================================================
-- 9. VERIFICACIONES
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- Tabla
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ai_rate_limits';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '015 failed: ai_rate_limits table is missing';
    END IF;


    -- --------------------------------------------------------
    -- rate_key
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_rate_limits'
      AND column_name = 'rate_key';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '015 failed: rate_key column is missing';
    END IF;


    -- --------------------------------------------------------
    -- window_started_at
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_rate_limits'
      AND column_name = 'window_started_at';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '015 failed: window_started_at column is missing';
    END IF;


    -- --------------------------------------------------------
    -- request_count
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_rate_limits'
      AND column_name = 'request_count';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '015 failed: request_count column is missing';
    END IF;


    -- --------------------------------------------------------
    -- RLS
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_class
    WHERE oid = 'public.ai_rate_limits'::regclass
      AND relrowsecurity = TRUE;

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '015 failed: RLS is not enabled';
    END IF;


    -- --------------------------------------------------------
    -- RPC
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'consume_ai_rate_limit';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '015 failed: consume_ai_rate_limit is missing';
    END IF;


    -- --------------------------------------------------------
    -- SECURITY DEFINER
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'consume_ai_rate_limit'
      AND p.prosecdef = TRUE;

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '015 failed: consume_ai_rate_limit is not SECURITY DEFINER';
    END IF;


    -- --------------------------------------------------------
    -- service_role EXECUTE
    -- --------------------------------------------------------

    IF NOT has_function_privilege(
        'service_role',
        'public.consume_ai_rate_limit(text,integer,integer)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            '015 failed: service_role cannot execute consume_ai_rate_limit';
    END IF;


    -- --------------------------------------------------------
    -- anon NO EXECUTE
    -- --------------------------------------------------------

    IF has_function_privilege(
        'anon',
        'public.consume_ai_rate_limit(text,integer,integer)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            '015 failed: anon can execute consume_ai_rate_limit';
    END IF;


    -- --------------------------------------------------------
    -- authenticated NO EXECUTE
    -- --------------------------------------------------------

    IF has_function_privilege(
        'authenticated',
        'public.consume_ai_rate_limit(text,integer,integer)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            '015 failed: authenticated can execute consume_ai_rate_limit';
    END IF;

END $$;


-- ============================================================
-- 10. RESULTADO
-- ============================================================
--
-- MODIRA AI dispone ahora de:
--
-- ✓ Rate limit persistente
-- ✓ Rate limit atómico
-- ✓ Protección contra concurrencia
-- ✓ Contador por clave
-- ✓ Ventanas temporales
-- ✓ remaining
-- ✓ retry_after_seconds
-- ✓ RLS activo
-- ✓ Sin acceso desde frontend
-- ✓ SECURITY DEFINER
-- ✓ search_path fijo
-- ✓ service_role para Edge Function
--
-- La migración NO cambia todavía index.ts.
--
-- El siguiente paso es conectar:
--
--   modira-ai
--        ↓
--   consume_ai_rate_limit()
--
-- antes de realizar cualquier llamada a OpenAI.
--
-- ============================================================

COMMIT;