BEGIN;

-- ============================================================
-- MODIRA - MIGRACIÓN 016
-- ACCESO DE TRABAJADORES A FACTURAS DE TODAS LAS EMPRESAS
-- ============================================================
--
-- OBJETIVO:
--
-- Permitir que los trabajadores activos puedan consultar
-- las facturas de todas las empresas desde el Área de Empleados.
--
-- ANTES:
--
-- TRABAJADOR ACTIVO
--       ↓
-- invoices
--       ↓
-- Solo MODIRA-001
--
-- DESPUÉS:
--
-- TRABAJADOR ACTIVO
--       ↓
-- invoices
--       ↓
-- Todas las empresas
--
-- IMPORTANTE:
--
-- - El trabajador únicamente obtiene acceso de SELECT.
-- - No puede crear facturas.
-- - No puede modificar facturas.
-- - No puede eliminar facturas.
-- - La seguridad continúa dependiendo de
--   public.current_user_is_worker().
--
-- Esta migración NO modifica la estructura de invoices.
-- Únicamente sustituye la política de lectura de trabajadores.
--
-- ============================================================


-- ============================================================
-- 1. COMPROBACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    -- Comprobar que existe la tabla invoices
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
    ) THEN
        RAISE EXCEPTION
        'Migration 016 stopped: public.invoices does not exist';
    END IF;


    -- Comprobar que existe current_user_is_worker()
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
          ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_is_worker'
    ) THEN
        RAISE EXCEPTION
        'Migration 016 stopped: public.current_user_is_worker() does not exist';
    END IF;

END $$;


-- ============================================================
-- 2. ELIMINAR POLÍTICA ANTERIOR DE TRABAJADORES
-- ============================================================
--
-- La migración 004 creó:
--
-- invoices_worker_select
--
-- Esta política limitaba el acceso de los trabajadores
-- únicamente a la empresa MODIRA-001.
--
-- La eliminamos para sustituirla por una política
-- que permita consultar facturas de todas las empresas.
-- ============================================================

DROP POLICY IF EXISTS invoices_worker_select
ON public.invoices;


-- ============================================================
-- 3. NUEVA POLÍTICA DE SELECT PARA TRABAJADORES
-- ============================================================
--
-- Un trabajador activo puede consultar todas las facturas.
--
-- No se comprueba company_id porque el trabajador necesita
-- acceder a la facturación de todas las empresas desde
-- el Área de Empleados.
--
-- current_user_is_worker() garantiza que:
--
-- - La cuenta pertenece a workers.
-- - El trabajador está activo.
--
-- ============================================================

CREATE POLICY invoices_worker_select
ON public.invoices
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 4. PERMISO POSTGRESQL DE SELECT
-- ============================================================
--
-- RLS determina qué filas puede consultar el trabajador.
--
-- El permiso PostgreSQL determina si el rol authenticated
-- puede realizar la operación SELECT sobre la tabla.
--
-- ============================================================

GRANT SELECT
ON public.invoices
TO authenticated;


-- ============================================================
-- 5. VERIFICACIÓN FINAL
-- ============================================================

DO $$
DECLARE
    v_policy_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
      AND policyname = 'invoices_worker_select';

    IF v_policy_count <> 1 THEN
        RAISE EXCEPTION
        'Migration 016 failed: invoices_worker_select was not created correctly';
    END IF;

END $$;


COMMIT;


-- ============================================================
-- RESULTADO FINAL
-- ============================================================
--
-- TRABAJADOR ACTIVO:
--
-- SELECT invoices
--       ↓
-- ✅ Facturas de todas las empresas
--
-- CLIENTE:
--
-- SELECT invoices
--       ↓
-- ✅ Sigue sujeto a sus propias políticas RLS
--
-- TRABAJADOR INACTIVO:
--
-- SELECT invoices
--       ↓
-- ❌ current_user_is_worker() = false
--
-- ANÓNIMO:
--
-- SELECT invoices
--       ↓
-- ❌ No autenticado
--
-- ============================================================