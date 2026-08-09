-- ============================================================
-- MODIRA - MIGRACIÓN 006
-- ACCESO EXCLUSIVO DE TRABAJADORES
-- ============================================================
--
-- OBJETIVO:
--
-- Un usuario que figure como trabajador activo en
-- public.workers tendrá acceso EXCLUSIVAMENTE al área
-- de empleados.
--
-- TRABAJADOR:
--   Área empleados       -> permitido
--   Área cliente         -> bloqueado
--
-- CLIENTE:
--   Área cliente         -> permitido
--   Área empleados       -> bloqueado por la aplicación
--                           + public.workers
--
-- IMPORTANTE:
-- - NO se elimina ningún profile.
-- - NO se modifica auth.users.
-- - NO se modifican las migraciones anteriores.
-- - NO se crean tablas.
-- - NO se eliminan datos.
-- - Los permisos internos de la 004 permanecen.
--
-- La 006 modifica únicamente las políticas de acceso
-- de las tablas utilizadas por el área de cliente.
--
-- ============================================================


BEGIN;


-- ============================================================
-- 1. COMPROBACIONES PREVIAS
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
            'Migration 006 stopped: public.workers does not exist';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
    ) THEN
        RAISE EXCEPTION
            'Migration 006 stopped: public.profiles does not exist';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'companies'
    ) THEN
        RAISE EXCEPTION
            'Migration 006 stopped: public.companies does not exist';
    END IF;

END $$;


-- ============================================================
-- 2. FUNCIÓN DE IDENTIFICACIÓN DE TRABAJADOR
-- ============================================================
--
-- Reutilizamos la función creada en la migración 004.
--
-- Un usuario es trabajador únicamente si:
--   - existe en public.workers
--   - auth_user_id coincide con auth.uid()
--   - is_active = true
--
-- Si la función no existiera por algún motivo, la creamos.
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
-- 3. COMPANIES
-- ============================================================
--
-- Los trabajadores NO deben acceder al Área Cliente.
--
-- Por tanto, la policy de acceso de compañía excluye
-- explícitamente a trabajadores.
--
-- La inserción de compañías tampoco se permite a trabajadores.
-- ============================================================

DROP POLICY IF EXISTS companies_select_own
ON public.companies;

DROP POLICY IF EXISTS companies_update_own
ON public.companies;

DROP POLICY IF EXISTS companies_insert
ON public.companies;

DROP POLICY IF EXISTS company_members_can_view_company_record
ON public.companies;

DROP POLICY IF EXISTS company_insert_by_creator
ON public.companies;

DROP POLICY IF EXISTS company_admins_can_manage_company_record
ON public.companies;


CREATE POLICY companies_select_own
ON public.companies
FOR SELECT
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND id = public.current_user_company_id()
);


CREATE POLICY companies_insert
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.current_user_is_worker()
    AND created_by = auth.uid()
);


CREATE POLICY companies_update_own
ON public.companies
FOR UPDATE
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND id = public.current_user_company_id()
)
WITH CHECK (
    NOT public.current_user_is_worker()
    AND id = public.current_user_company_id()
);


-- ============================================================
-- 4. CLIENTS
-- ============================================================
--
-- Los trabajadores NO tienen acceso a clientes mediante
-- las políticas del área cliente.
-- ============================================================

DROP POLICY IF EXISTS clients_company_access
ON public.clients;

DROP POLICY IF EXISTS company_users_can_view_clients
ON public.clients;

DROP POLICY IF EXISTS company_managers_can_manage_clients
ON public.clients;


CREATE POLICY clients_company_access
ON public.clients
FOR ALL
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 5. PROJECTS
-- ============================================================

DROP POLICY IF EXISTS projects_company_access
ON public.projects;


CREATE POLICY projects_company_access
ON public.projects
FOR ALL
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 6. QUOTATIONS
-- ============================================================

DROP POLICY IF EXISTS quotations_company_access
ON public.quotations;


CREATE POLICY quotations_company_access
ON public.quotations
FOR ALL
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 7. INVOICES
-- ============================================================
--
-- IMPORTANTE:
--
-- La 004 tiene una policy específica que permite a los
-- trabajadores LEER facturas para el dashboard interno.
--
-- Por eso aquí:
--
--   - eliminamos únicamente la policy de cliente
--   - recreamos la policy de cliente excluyendo workers
--   - NO tocamos invoices_worker_select de la 004
--
-- Resultado:
--
--   Cliente  -> acceso según empresa
--   Worker   -> acceso SELECT mediante la 004
-- ============================================================

DROP POLICY IF EXISTS invoices_company_access
ON public.invoices;


CREATE POLICY invoices_company_access
ON public.invoices
FOR ALL
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 8. PAYMENTS
-- ============================================================

DROP POLICY IF EXISTS payments_company_access
ON public.payments;


CREATE POLICY payments_company_access
ON public.payments
FOR ALL
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 9. BUDGETS
-- ============================================================

DROP POLICY IF EXISTS budgets_company_access
ON public.budgets;


CREATE POLICY budgets_company_access
ON public.budgets
FOR ALL
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 10. SUPPORT TICKETS
-- ============================================================
--
-- Igual que invoices:
--
-- La 004 proporciona acceso SELECT específico para workers.
--
-- Por tanto NO eliminamos:
--
--   support_tickets_worker_select
--
-- Solo reemplazamos el acceso de cliente.
-- ============================================================

DROP POLICY IF EXISTS support_tickets_company_access
ON public.support_tickets;


CREATE POLICY support_tickets_company_access
ON public.support_tickets
FOR ALL
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 11. AUTOMATIONS
-- ============================================================

DROP POLICY IF EXISTS automations_company_access
ON public.automations;


CREATE POLICY automations_company_access
ON public.automations
FOR ALL
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 12. VERIFICACIÓN DE LA FUNCIÓN
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
            'Migration 006 failed: current_user_is_worker() does not exist';
    END IF;

END $$;


-- ============================================================
-- 13. FIN
-- ============================================================

COMMIT;


-- ============================================================
-- RESULTADO FINAL
-- ============================================================
--
-- Usuario NO trabajador:
--
--   Área cliente     -> permitido
--   Área empleados   -> bloqueado por public.workers
--
-- Usuario trabajador activo:
--
--   Área cliente     -> BLOQUEADO
--   Área empleados   -> permitido
--
-- Trabajador inactivo:
--
--   Área cliente     -> BLOQUEADO
--   Área empleados   -> BLOQUEADO
--
-- El profile del trabajador permanece intacto porque la 001
-- lo necesita como parte del sistema general de usuarios.
--
-- ============================================================