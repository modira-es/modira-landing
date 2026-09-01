BEGIN;

-- ============================================================
-- MODIRA — 022_companies_remove_client_update.sql
--
-- Seguridad:
-- - El cliente NO puede modificar directamente companies.
-- - Se elimina la policy companies_update_own.
-- - Se revoca UPDATE a authenticated.
-- - Las modificaciones de companies deberán realizarse
--   mediante funciones/RPC protegidas o backend interno.
-- ============================================================


-- ============================================================
-- 1. ELIMINAR UPDATE DIRECTO DEL CLIENTE
-- ============================================================

DROP POLICY IF EXISTS companies_update_own
ON public.companies;


-- ============================================================
-- 2. REVOCAR CUALQUIER UPDATE DIRECTO
-- ============================================================
--
-- Esto es importante porque migraciones anteriores pudieron
-- haber concedido UPDATE a nivel de tabla o de columnas.
--
-- El REVOKE general elimina también esos permisos de columna
-- para authenticated.
--

REVOKE UPDATE
ON public.companies
FROM authenticated;


-- ============================================================
-- 3. GARANTIZAR QUE NO QUEDA NINGÚN UPDATE POR COLUMNAS
-- ============================================================

REVOKE ALL PRIVILEGES
ON public.companies
FROM authenticated;

-- Restauramos únicamente SELECT.
--
-- El acceso efectivo continúa controlado por RLS.
--

GRANT SELECT
ON public.companies
TO authenticated;


-- ============================================================
-- 4. COMPROBACIÓN DE SEGURIDAD
-- ============================================================

DO $$
DECLARE
    v_policy_count INTEGER;
    v_update_privilege BOOLEAN;
BEGIN

    -- No debe existir la antigua policy UPDATE.
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'companies'
      AND policyname = 'companies_update_own';

    IF v_policy_count <> 0 THEN
        RAISE EXCEPTION
            '022 failed: companies_update_own sigue existiendo';
    END IF;


    -- authenticated no debe conservar UPDATE sobre companies.
    SELECT has_table_privilege(
        'authenticated',
        'public.companies',
        'UPDATE'
    )
    INTO v_update_privilege;

    IF v_update_privilege THEN
        RAISE EXCEPTION
            '022 failed: authenticated todavía conserva UPDATE sobre companies';
    END IF;


    -- SELECT debe seguir disponible.
    IF NOT has_table_privilege(
        'authenticated',
        'public.companies',
        'SELECT'
    ) THEN
        RAISE EXCEPTION
            '022 failed: authenticated perdió SELECT sobre companies';
    END IF;

END $$;


COMMIT;
