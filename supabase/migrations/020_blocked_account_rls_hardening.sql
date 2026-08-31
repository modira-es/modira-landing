BEGIN;

-- ============================================================
-- MODIRA — 020_blocked_account_rls_hardening.sql
--
-- H-05 — BLOQUEO EFECTIVO DE CUENTAS
--
-- Objetivo:
-- Garantizar que usuarios con perfil bloqueado/inactivo no
-- puedan acceder mediante policies RLS que actualmente no
-- comprueban current_user_is_active().
--
-- Afecta exclusivamente a:
--   - payments
--   - quotations
--   - workers
--
-- No modifica datos.
-- No modifica funciones.
-- No afecta al acceso de workers activos.
-- ============================================================


-- ============================================================
-- 1. PAYMENTS
-- ============================================================

DROP POLICY IF EXISTS payments_client_select
ON public.payments;

CREATE POLICY payments_client_select
ON public.payments
FOR SELECT
TO authenticated
USING (
    current_user_is_active()
    AND NOT current_user_is_worker()
    AND company_id = current_user_company_id()
);


-- ============================================================
-- 2. QUOTATIONS
-- ============================================================

DROP POLICY IF EXISTS quotations_company_select
ON public.quotations;

CREATE POLICY quotations_company_select
ON public.quotations
FOR SELECT
TO authenticated
USING (
    current_user_is_active()
    AND NOT current_user_is_worker()
    AND company_id = current_user_company_id()
);


-- ============================================================
-- 3. WORKERS
-- ============================================================

DROP POLICY IF EXISTS workers_select_own
ON public.workers;

CREATE POLICY workers_select_own
ON public.workers
FOR SELECT
TO authenticated
USING (
    current_user_is_active()
    AND auth_user_id = auth.uid()
);


-- ============================================================
-- 4. VERIFICACIÓN INTERNA
-- ============================================================

DO $$
DECLARE
    v_missing INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_missing
    FROM (
        SELECT 1
        WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'payments'
              AND policyname = 'payments_client_select'
              AND qual LIKE '%current_user_is_active()%'
        )

        UNION ALL

        SELECT 1
        WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'quotations'
              AND policyname = 'quotations_company_select'
              AND qual LIKE '%current_user_is_active()%'
        )

        UNION ALL

        SELECT 1
        WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'workers'
              AND policyname = 'workers_select_own'
              AND qual LIKE '%current_user_is_active()%'
        )
    ) AS checks;

    IF v_missing <> 0 THEN
        RAISE EXCEPTION
            '020 failed: blocked-account RLS policies incomplete';
    END IF;

END $$;


COMMIT;