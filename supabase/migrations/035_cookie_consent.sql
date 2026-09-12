BEGIN;

-- ============================================================
-- MODIRA — 035_cookie_consent.sql
--
-- REGISTRO PERSISTENTE DEL CONSENTIMIENTO DE COOKIES
--
-- OBJETIVO
-- 1. Mantener el funcionamiento actual de CookieBanner.
-- 2. Registrar en Supabase cada decisión del usuario sobre
--    la categoría de analítica.
-- 3. Registrar la fecha/hora de la decisión.
-- 4. Registrar la versión de la Política de Cookies vigente
--    en el momento de la decisión.
-- 5. Permitir el registro tanto a visitantes anónimos como
--    a usuarios autenticados.
-- 6. Impedir INSERT/SELECT/UPDATE/DELETE directo desde el
--    frontend.
--
-- PRINCIPIO DE MINIMIZACIÓN
-- - No se almacena nombre.
-- - No se almacena email.
-- - No se almacena IP.
-- - No se almacena user-agent.
-- - No se almacena fingerprint.
-- - No se almacena ningún dato de Google Analytics.
--
-- La tabla contiene únicamente la evidencia técnica mínima
-- necesaria del evento de consentimiento.
--
-- IMPORTANTE
-- La versión de política se fija dentro de la RPC y NO se
-- recibe desde el frontend.
--
-- Versión vigente en esta migración:
-- 2026-09
--
-- Si la Política de Cookies cambia de forma que requiera una
-- nueva versión de consentimiento, deberá crearse una nueva
-- migración que actualice esta constante y el CookieBanner
-- deberá tratar la nueva versión como una nueva decisión.
--
-- ============================================================


-- ============================================================
-- 1. EXTENSIÓN NECESARIA
-- ============================================================
--
-- Las migraciones existentes de Modira ya utilizan pgcrypto
-- y gen_random_uuid() para identificadores UUID.
--
-- CREATE EXTENSION IF NOT EXISTS es idempotente.
--
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 2. TABLA DE REGISTRO DE CONSENTIMIENTOS
-- ============================================================
--
-- Cada fila representa una decisión concreta del usuario.
--
-- Ejemplo:
--
-- id             = UUID generado por PostgreSQL
-- analytics      = TRUE
-- policy_version = 2026-09
-- created_at     = fecha/hora del servidor
--
-- Si posteriormente el usuario cambia:
--
-- analytics = TRUE
--        ↓
-- analytics = FALSE
--
-- se crea un nuevo registro.
--
-- No se sobrescribe el registro anterior.
--
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cookie_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    analytics BOOLEAN NOT NULL,

    policy_version TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT cookie_consents_policy_version_check
    CHECK (
        LENGTH(TRIM(policy_version)) > 0
        AND LENGTH(policy_version) <= 50
    )
);


-- ============================================================
-- 3. ÍNDICE
-- ============================================================
--
-- Facilita las consultas internas por fecha, especialmente
-- para auditoría o revisión de los registros.
--
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_cookie_consents_created_at
ON public.cookie_consents(created_at);


-- ============================================================
-- 4. RLS
-- ============================================================
--
-- El frontend NO tendrá acceso directo a la tabla.
--
-- La escritura se realizará exclusivamente mediante:
--
-- CookieBanner
--      ↓
-- record_cookie_consent()
--      ↓
-- SECURITY DEFINER
--      ↓
-- cookie_consents
--
-- ============================================================

ALTER TABLE public.cookie_consents
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. PRIVILEGIOS DIRECTOS
-- ============================================================
--
-- Ningún visitante ni usuario autenticado puede:
--
-- INSERT
-- SELECT
-- UPDATE
-- DELETE
--
-- directamente sobre la tabla.
--
-- service_role conserva SELECT para las tareas internas de
-- revisión/auditoría.
--
-- ============================================================

REVOKE ALL
ON public.cookie_consents
FROM PUBLIC, anon, authenticated;


GRANT SELECT
ON public.cookie_consents
TO service_role;


-- ============================================================
-- 6. RPC — REGISTRAR CONSENTIMIENTO
-- ============================================================
--
-- Esta es la única vía pública para registrar una decisión.
--
-- Parámetro:
--
-- p_analytics
--   TRUE  = usuario acepta analítica.
--   FALSE = usuario rechaza analítica.
--
-- La versión de la política NO se recibe como parámetro.
--
-- Se fija internamente:
--
-- v_policy_version := '2026-09'
--
-- De esta manera el cliente no puede modificar la versión
-- registrada en la evidencia del consentimiento.
--
-- created_at también se genera en el servidor.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_cookie_consent(
    p_analytics BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_policy_version CONSTANT TEXT := '2026-09';
    v_consent_id UUID;
BEGIN

    -- --------------------------------------------------------
    -- VALIDACIÓN DE ENTRADA
    -- --------------------------------------------------------
    --
    -- La decisión debe ser explícitamente TRUE o FALSE.
    -- NULL no representa una decisión válida.
    --
    -- --------------------------------------------------------

    IF p_analytics IS NULL THEN
        RAISE EXCEPTION
            'Decisión de cookies no válida.';
    END IF;


    -- --------------------------------------------------------
    -- REGISTRAR DECISIÓN
    -- --------------------------------------------------------
    --
    -- PostgreSQL genera:
    -- - UUID del registro
    -- - fecha/hora del servidor
    --
    -- La versión procede de la propia función.
    --
    -- --------------------------------------------------------

    INSERT INTO public.cookie_consents (
        analytics,
        policy_version
    )
    VALUES (
        p_analytics,
        v_policy_version
    )
    RETURNING id
    INTO v_consent_id;


    RETURN v_consent_id;

END;
$$;


-- ============================================================
-- 7. PROTEGER LA RPC
-- ============================================================
--
-- Por seguridad no dejamos EXECUTE para PUBLIC.
--
-- Permitimos únicamente:
--
-- anon
-- authenticated
--
-- Esto permite registrar el consentimiento tanto antes como
-- después de iniciar sesión.
--
-- ============================================================

REVOKE ALL
ON FUNCTION public.record_cookie_consent(BOOLEAN)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.record_cookie_consent(BOOLEAN)
TO anon, authenticated;


-- ============================================================
-- 8. DOCUMENTACIÓN
-- ============================================================

COMMENT ON TABLE public.cookie_consents IS
'Registro interno de decisiones de consentimiento de cookies. Cada fila representa una decisión concreta sobre la categoría de analítica. No contiene nombre, email, IP, user-agent ni otros datos de identificación directa.';


COMMENT ON COLUMN public.cookie_consents.id IS
'Identificador técnico aleatorio del registro de consentimiento.';


COMMENT ON COLUMN public.cookie_consents.analytics IS
'Decisión del usuario respecto de la categoría de analítica: TRUE = aceptada, FALSE = rechazada.';


COMMENT ON COLUMN public.cookie_consents.policy_version IS
'Versión de la Política de Cookies vigente cuando se registró la decisión.';


COMMENT ON COLUMN public.cookie_consents.created_at IS
'Fecha y hora del servidor en la que se registró la decisión de consentimiento.';


COMMENT ON FUNCTION public.record_cookie_consent(BOOLEAN) IS
'Registra una decisión de consentimiento de cookies. La versión de la Política de Cookies y la fecha del registro se determinan en el servidor.';


-- ============================================================
-- 9. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- TABLA
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cookie_consents';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '035 failed: cookie_consents table is missing';
    END IF;


    -- --------------------------------------------------------
    -- COLUMNAS
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cookie_consents'
      AND column_name = 'analytics';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '035 failed: analytics column is missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cookie_consents'
      AND column_name = 'policy_version';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '035 failed: policy_version column is missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cookie_consents'
      AND column_name = 'created_at';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '035 failed: created_at column is missing';
    END IF;


    -- --------------------------------------------------------
    -- RLS
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_class
    WHERE oid = 'public.cookie_consents'::regclass
      AND relrowsecurity = TRUE;

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '035 failed: RLS is not enabled on cookie_consents';
    END IF;


    -- --------------------------------------------------------
    -- ANON NO DEBE TENER INSERT DIRECTO
    -- --------------------------------------------------------

    IF has_table_privilege(
        'anon',
        'public.cookie_consents',
        'INSERT'
    ) THEN
        RAISE EXCEPTION
            '035 failed: anon retains INSERT on cookie_consents';
    END IF;


    -- --------------------------------------------------------
    -- AUTHENTICATED NO DEBE TENER INSERT DIRECTO
    -- --------------------------------------------------------

    IF has_table_privilege(
        'authenticated',
        'public.cookie_consents',
        'INSERT'
    ) THEN
        RAISE EXCEPTION
            '035 failed: authenticated retains INSERT on cookie_consents';
    END IF;


    -- --------------------------------------------------------
    -- ANON NO DEBE PODER LEER LOS REGISTROS
    -- --------------------------------------------------------

    IF has_table_privilege(
        'anon',
        'public.cookie_consents',
        'SELECT'
    ) THEN
        RAISE EXCEPTION
            '035 failed: anon retains SELECT on cookie_consents';
    END IF;


    -- --------------------------------------------------------
    -- AUTHENTICATED NO DEBE PODER LEER LOS REGISTROS
    -- --------------------------------------------------------

    IF has_table_privilege(
        'authenticated',
        'public.cookie_consents',
        'SELECT'
    ) THEN
        RAISE EXCEPTION
            '035 failed: authenticated retains SELECT on cookie_consents';
    END IF;


    -- --------------------------------------------------------
    -- LA RPC DEBE SER EJECUTABLE POR ANON
    -- --------------------------------------------------------

    IF NOT has_function_privilege(
        'anon',
        'public.record_cookie_consent(boolean)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            '035 failed: anon cannot execute record_cookie_consent';
    END IF;


    -- --------------------------------------------------------
    -- LA RPC DEBE SER EJECUTABLE POR AUTHENTICATED
    -- --------------------------------------------------------

    IF NOT has_function_privilege(
        'authenticated',
        'public.record_cookie_consent(boolean)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            '035 failed: authenticated cannot execute record_cookie_consent';
    END IF;


    -- --------------------------------------------------------
    -- PUBLIC NO DEBE PODER EJECUTAR LA RPC
    -- --------------------------------------------------------

    IF has_function_privilege(
        'public',
        'public.record_cookie_consent(boolean)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            '035 failed: PUBLIC retains EXECUTE on record_cookie_consent';
    END IF;

END $$;


COMMIT;


-- ============================================================
-- RESULTADO FINAL
-- ============================================================
--
-- cookie_consents
--
-- Cada decisión queda registrada como:
--
-- id             → UUID aleatorio generado por PostgreSQL
-- analytics      → TRUE / FALSE
-- policy_version → 2026-09
-- created_at     → fecha/hora del servidor
--
-- ACCESO
--
-- anon
--   ❌ INSERT directo
--   ❌ SELECT
--   ❌ UPDATE
--   ❌ DELETE
--   ✅ record_cookie_consent()
--
-- authenticated
--   ❌ INSERT directo
--   ❌ SELECT
--   ❌ UPDATE
--   ❌ DELETE
--   ✅ record_cookie_consent()
--
-- service_role
--   ✅ SELECT
--
-- ============================================================