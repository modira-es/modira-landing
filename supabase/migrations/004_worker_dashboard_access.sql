-- ============================================================
-- MODIRA - MIGRACIÓN 004
-- ACCESO DEL ÁREA DE TRABAJADORES
-- ============================================================
--
-- OBJETIVO:
-- Dar acceso de SOLO LECTURA a los trabajadores activos
-- sobre la información necesaria para el dashboard interno.
--
-- NO CREA TABLAS.
-- NO MODIFICA LA ESTRUCTURA DE 001, 002 NI 003.
-- NO PERMITE REGISTRO DE TRABAJADORES.
-- NO PERMITE QUE LOS WORKERS MODIFIQUEN DATOS.
--
-- ACCESO DE TRABAJADORES:
--   - audit_requests
--   - invoices
--   - support_tickets
--   - profiles (solo para poder mostrar nombre/email asociados)
--
-- Los trabajadores se identifican mediante public.workers.
--
-- ============================================================


BEGIN;


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'workers'
    ) THEN
        RAISE EXCEPTION
            'Migration 004 stopped: public.workers does not exist';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'audit_requests'
    ) THEN
        RAISE EXCEPTION
            'Migration 004 stopped: public.audit_requests does not exist';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
    ) THEN
        RAISE EXCEPTION
            'Migration 004 stopped: public.invoices does not exist';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'support_tickets'
    ) THEN
        RAISE EXCEPTION
            'Migration 004 stopped: public.support_tickets does not exist';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
    ) THEN
        RAISE EXCEPTION
            'Migration 004 stopped: public.profiles does not exist';
    END IF;

END $$;


-- ============================================================
-- 2. FUNCIÓN DE SEGURIDAD
--
-- Determina si el usuario actualmente autenticado es un
-- trabajador activo de Modira.
--
-- SECURITY DEFINER evita depender directamente de la RLS
-- de workers desde las políticas de otras tablas.
--
-- El frontend NO puede convertir a un usuario en worker.
-- El worker debe existir previamente en public.workers.
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_is_worker()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workers w
        WHERE w.auth_user_id = auth.uid()
          AND w.is_active = TRUE
    );
$$;


-- ============================================================
-- 3. AUDIT REQUESTS
-- ============================================================
--
-- La migración 002 creó inicialmente acceso SELECT para
-- cualquier usuario autenticado.
--
-- Ese acceso NO es adecuado para el sistema definitivo:
-- un cliente autenticado no debe poder consultar las
-- solicitudes de auditoría de otros usuarios.
--
-- Sustituimos esa política por acceso exclusivo para
-- trabajadores activos.
--
-- INSERT público de la migración 002 NO se modifica.
--
-- UPDATE NO se concede aquí.
-- El dashboard actual solo necesita lectura.
-- ============================================================

DROP POLICY IF EXISTS audit_requests_authenticated_select
ON public.audit_requests;


CREATE POLICY audit_requests_worker_select
ON public.audit_requests
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 4. INVOICES
-- ============================================================
--
-- La migración 001 protege invoices mediante company_id.
--
-- Añadimos una política SELECT específica para trabajadores.
--
-- IMPORTANTE:
-- Los workers reciben SOLO SELECT.
-- No reciben INSERT, UPDATE ni DELETE.
--
-- El acceso queda limitado a la empresa principal de Modira:
-- MODIRA-001
--
-- Esto evita que, si en el futuro existen otras empresas
-- dentro de la misma base de datos, un trabajador pueda ver
-- accidentalmente datos de otra organización.
-- ============================================================

DROP POLICY IF EXISTS invoices_worker_select
ON public.invoices;


CREATE POLICY invoices_worker_select
ON public.invoices
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
    AND company_id = (
        SELECT c.id
        FROM public.companies c
        WHERE c.company_code = 'MODIRA-001'
        LIMIT 1
    )
);


-- ============================================================
-- 5. SUPPORT TICKETS
-- ============================================================
--
-- Mismo principio que invoices:
--
--   worker activo → SELECT
--   worker activo → solo empresa MODIRA-001
--
-- No se permite modificar tickets mediante esta migración.
-- ============================================================

DROP POLICY IF EXISTS support_tickets_worker_select
ON public.support_tickets;


CREATE POLICY support_tickets_worker_select
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
    AND company_id = (
        SELECT c.id
        FROM public.companies c
        WHERE c.company_code = 'MODIRA-001'
        LIMIT 1
    )
);


-- ============================================================
-- 6. PROFILES
-- ============================================================
--
-- invoices y support_tickets almacenan user_id.
--
-- Para que el dashboard pueda mostrar información útil del
-- cliente, por ejemplo:
--
--   Juan Pérez
--   juan@empresa.com
--
-- el trabajador necesita poder consultar los profiles
-- correspondientes.
--
-- LIMITAMOS EL ACCESO A:
--   - trabajadores activos
--   - perfiles pertenecientes a MODIRA-001
--
-- NO se concede INSERT, UPDATE ni DELETE.
-- ============================================================

DROP POLICY IF EXISTS profiles_worker_select
ON public.profiles;


CREATE POLICY profiles_worker_select
ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
    AND company_id = (
        SELECT c.id
        FROM public.companies c
        WHERE c.company_code = 'MODIRA-001'
        LIMIT 1
    )
);


-- ============================================================
-- 7. VERIFICACIÓN FINAL
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND proname = 'current_user_is_worker'
    ) THEN
        RAISE EXCEPTION
            'Migration 004 failed: current_user_is_worker() was not created';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'audit_requests'
          AND policyname = 'audit_requests_worker_select'
    ) THEN
        RAISE EXCEPTION
            'Migration 004 failed: audit_requests worker policy was not created';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'invoices'
          AND policyname = 'invoices_worker_select'
    ) THEN
        RAISE EXCEPTION
            'Migration 004 failed: invoices worker policy was not created';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'support_tickets'
          AND policyname = 'support_tickets_worker_select'
    ) THEN
        RAISE EXCEPTION
            'Migration 004 failed: support_tickets worker policy was not created';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'profiles'
          AND policyname = 'profiles_worker_select'
    ) THEN
        RAISE EXCEPTION
            'Migration 004 failed: profiles worker policy was not created';
    END IF;

END $$;


COMMIT;


-- ============================================================
-- FIN MIGRACIÓN 004
-- ============================================================