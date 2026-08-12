-- ============================================================
-- MODIRA
-- 002_security_and_workers.sql
--
-- SEGURIDAD, ROLES Y TRABAJADORES
--
-- Consolida:
--   - 003_workers.sql
--   - 004_worker_dashboard_access.sql
--   - 005_permisos_SELECT.sql
--   - 006_worker_exclusive_access.sql
--   - 007_worker_account_status.sql
--
-- Además establece las funciones de seguridad utilizadas
-- posteriormente por las políticas RLS.
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
            '002 stopped: public.workers does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
    ) THEN
        RAISE EXCEPTION
            '002 stopped: public.profiles does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'companies'
    ) THEN
        RAISE EXCEPTION
            '002 stopped: public.companies does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'audit_requests'
    ) THEN
        RAISE EXCEPTION
            '002 stopped: public.audit_requests does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
    ) THEN
        RAISE EXCEPTION
            '002 stopped: public.invoices does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'support_tickets'
    ) THEN
        RAISE EXCEPTION
            '002 stopped: public.support_tickets does not exist';
    END IF;

END $$;


-- ============================================================
-- 2. FUNCIÓN: CURRENT USER COMPANY
--
-- Devuelve la empresa asociada al perfil del usuario autenticado.
--
-- SECURITY DEFINER evita problemas de recursión RLS cuando esta
-- función es utilizada dentro de políticas sobre profiles.
--
-- Devuelve:
--
--   UUID de empresa → usuario asociado a una empresa
--   NULL            → usuario sin empresa
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT p.company_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
    LIMIT 1;
$$;


-- ============================================================
-- 3. FUNCIÓN: CURRENT USER IS ADMIN
--
-- Mantiene la función de administración de la arquitectura
-- original.
--
-- Un administrador es un usuario cuyo profile tiene:
--
--     rol = 'admin'
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.rol = 'admin'
    );
$$;


-- ============================================================
-- 4. FUNCIÓN: CURRENT USER IS WORKER
--
-- Determina si la cuenta autenticada pertenece a un trabajador
-- ACTIVO.
--
-- Para ser trabajador activo:
--
--     auth.uid()
--          ↓
--     workers.auth_user_id
--          ↓
--     is_active = TRUE
--
-- SECURITY DEFINER es necesario porque esta función se utiliza
-- dentro de políticas RLS de otras tablas.
--
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
-- 5. FUNCIÓN: CURRENT USER IS WORKER ACCOUNT
--
-- Determina si la cuenta pertenece al sistema de trabajadores,
-- independientemente de si está activa o inactiva.
--
-- IMPORTANTE:
--
-- current_user_is_worker()
--     → trabajador ACTIVO
--
-- current_user_is_worker_account()
--     → cuenta perteneciente a workers, activa o inactiva
--
-- Esto permite al frontend distinguir:
--
-- Cliente
--     ↓
-- no existe en workers
--
-- Trabajador activo
--     ↓
-- existe en workers + is_active = true
--
-- Trabajador inactivo
--     ↓
-- existe en workers + is_active = false
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_is_worker_account()
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
    );
$$;


-- ============================================================
-- 6. SEGURIDAD DE EJECUCIÓN DE LAS FUNCIONES
--
-- Nunca dejamos estas funciones ejecutables por PUBLIC.
--
-- El frontend autenticado únicamente necesita las funciones
-- que utiliza para identificar el tipo de cuenta.
-- ============================================================

REVOKE ALL
ON FUNCTION public.current_user_company_id()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.current_user_is_admin()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.current_user_is_worker()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.current_user_is_worker_account()
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.current_user_company_id()
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.current_user_is_admin()
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.current_user_is_worker()
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.current_user_is_worker_account()
TO authenticated;


-- ============================================================
-- 7. ROW LEVEL SECURITY
--
-- Activamos RLS sobre las tablas que participan en el sistema
-- de usuarios y dashboard.
--
-- projects tendrá sus políticas definitivas en 003.
-- Las demás tablas de negocio quedan protegidas aquí.
-- ============================================================

ALTER TABLE public.companies
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clients
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoices
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payments
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.budgets
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.support_tickets
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.automations
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_requests
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workers
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 8. COMPANIES
--
-- CLIENTE:
--   Puede consultar únicamente su propia empresa.
--
-- WORKER:
--   No obtiene acceso automático a todas las empresas.
--
-- Esto mantiene el aislamiento multiempresa.
-- ============================================================

DROP POLICY IF EXISTS companies_select_own
ON public.companies;

CREATE POLICY companies_select_own
ON public.companies
FOR SELECT
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND id = public.current_user_company_id()
);
DROP POLICY IF EXISTS companies_worker_select
ON public.companies;

CREATE POLICY companies_worker_select
ON public.companies
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);

-- ============================================================
-- 9. PROFILES
--
-- CLIENTE:
--   Puede consultar/modificar su propio perfil.
--
-- WORKER ACTIVO:
--   Puede consultar perfiles necesarios para el dashboard.
--
-- No permitimos a workers modificar profiles mediante estas
-- políticas.
--
-- El acceso de worker se limita a perfiles de MODIRA-001,
-- igual que en la arquitectura documentada actualmente.
-- ============================================================

DROP POLICY IF EXISTS profiles_select_own
ON public.profiles;

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND id = auth.uid()
);


DROP POLICY IF EXISTS profiles_update_own
ON public.profiles;

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND id = auth.uid()
)
WITH CHECK (
    NOT public.current_user_is_worker()
    AND id = auth.uid()
);


DROP POLICY IF EXISTS profiles_worker_select
ON public.profiles;

CREATE POLICY profiles_worker_select
ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 10. WORKERS
--
-- MUY IMPORTANTE:
--
-- El frontend NO puede crear trabajadores.
-- El frontend NO puede modificar trabajadores.
-- El frontend NO puede eliminar trabajadores.
--
-- El registro se realiza administrativamente.
--
-- Un usuario autenticado puede consultar únicamente su propio
-- registro worker cuando sea necesario.
--
-- La función current_user_is_worker_account() permite al
-- frontend realizar la comprobación sin depender de esta RLS.
-- ============================================================

DROP POLICY IF EXISTS workers_select_own
ON public.workers;

CREATE POLICY workers_select_own
ON public.workers
FOR SELECT
TO authenticated
USING (
    auth_user_id = auth.uid()
);


-- ============================================================
-- 11. AUDIT REQUESTS
--
-- VISITANTE ANÓNIMO:
--   INSERT
--
-- CLIENTE:
--   No puede consultar solicitudes.
--
-- WORKER ACTIVO:
--   SELECT
--
-- Las solicitudes de auditoría pertenecen al sistema interno
-- de MODIRA y no a una empresa cliente concreta.
-- ============================================================

DROP POLICY IF EXISTS audit_requests_public_insert
ON public.audit_requests;

CREATE POLICY audit_requests_public_insert
ON public.audit_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
    TRUE
);


DROP POLICY IF EXISTS audit_requests_worker_select
ON public.audit_requests;

CREATE POLICY audit_requests_worker_select
ON public.audit_requests
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 12. CLIENTS
--
-- CLIENTE:
--   Acceso únicamente a clientes de su empresa.
--
-- WORKER:
--   No utiliza el Área Cliente.
--
-- El acceso interno de trabajadores a datos específicos se
-- implementará únicamente donde sea necesario.
-- ============================================================

DROP POLICY IF EXISTS clients_company_access
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
-- 13. INVOICES
--
-- CLIENTE:
--   Acceso a facturas de su empresa.
--
-- WORKER ACTIVO:
--   SELECT sobre facturas de TODAS las empresas.
--
-- Esto incorpora directamente el resultado final de la
-- migración histórica 016.
--
-- Los workers NO reciben INSERT / UPDATE / DELETE.
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


DROP POLICY IF EXISTS invoices_worker_select
ON public.invoices;

CREATE POLICY invoices_worker_select
ON public.invoices
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 14. PAYMENTS
--
-- Los clientes únicamente pueden acceder a pagos de su empresa.
-- Los workers no tienen acceso de escritura.
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
-- 15. BUDGETS
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
-- 16. SUPPORT TICKETS
--
-- CLIENTE:
--   Acceso a tickets de su empresa.
--
-- WORKER ACTIVO:
--   SELECT de tickets de MODIRA-001.
--
-- Los workers no pueden modificar tickets desde estas policies.
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


DROP POLICY IF EXISTS support_tickets_worker_select
ON public.support_tickets;

CREATE POLICY support_tickets_worker_select
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 17. AUTOMATIONS
--
-- Los clientes acceden únicamente a las automatizaciones de
-- su empresa.
--
-- El acceso específico de workers se ampliará posteriormente
-- junto con la arquitectura de automatizaciones.
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
-- 18. PROJECTS
--
-- IMPORTANTE:
--
-- Aquí únicamente activamos RLS.
--
-- Las políticas definitivas de projects se crean en:
--
--     003_projects.sql
--
-- porque el modelo de projects es más complejo:
--
-- CLIENTE CON EMPRESA
-- CLIENTE SIN EMPRESA
-- WORKER ACTIVO
--
-- y además incorpora RPCs.
-- ============================================================

ALTER TABLE public.projects
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 19. PERMISOS POSTGRESQL
--
-- RLS responde:
--
--   "¿Qué filas puede utilizar?"
--
-- GRANT responde:
--
--   "¿Puede intentar utilizar la tabla?"
--
-- Los trabajadores necesitan SELECT sobre workers y profiles
-- para que el frontend pueda consultar la información necesaria.
--
-- Añadimos también los permisos básicos de las tablas utilizadas
-- por el frontend autenticado.
-- ============================================================

GRANT SELECT
ON public.workers
TO authenticated;


GRANT SELECT
ON public.profiles
TO authenticated;


GRANT SELECT
ON public.companies
TO authenticated;


GRANT SELECT
ON public.clients
TO authenticated;


GRANT SELECT
ON public.projects
TO authenticated;


GRANT SELECT
ON public.quotations
TO authenticated;


GRANT SELECT
ON public.invoices
TO authenticated;


GRANT SELECT
ON public.payments
TO authenticated;


GRANT SELECT
ON public.budgets
TO authenticated;


GRANT SELECT
ON public.support_tickets
TO authenticated;


GRANT SELECT
ON public.automations
TO authenticated;


GRANT SELECT
ON public.audit_requests
TO authenticated;


-- ============================================================
-- 20. PERMISOS DE ESCRITURA PARA CLIENTES
--
-- Los GRANT permiten la operación a nivel PostgreSQL.
-- RLS decide posteriormente qué filas pueden utilizar.
--
-- No concedemos INSERT/UPDATE/DELETE sobre workers.
-- ============================================================




-- ============================================================
-- 21. AUDIT REQUESTS
--
-- El formulario público necesita poder crear solicitudes.
--
-- No concedemos SELECT al rol anon.
-- ============================================================

GRANT INSERT
ON public.audit_requests
TO anon;


GRANT INSERT
ON public.audit_requests
TO authenticated;


-- ============================================================
-- 22. RESTRICCIONES EXPLÍCITAS SOBRE WORKERS
--
-- Nos aseguramos de que el frontend no pueda administrar
-- trabajadores directamente.
-- ============================================================

REVOKE INSERT, UPDATE, DELETE
ON public.workers
FROM anon, authenticated;


-- ============================================================
-- 23. RESTRICCIONES SOBRE AUDIT REQUESTS
--
-- Los visitantes solo pueden insertar.
-- ============================================================

REVOKE SELECT, UPDATE, DELETE
ON public.audit_requests
FROM anon;


-- ============================================================
-- 24. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_function_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- Comprobar funciones principales
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
          'current_user_company_id',
          'current_user_is_admin',
          'current_user_is_worker',
          'current_user_is_worker_account'
      );

    IF v_function_count <> 4 THEN
        RAISE EXCEPTION
            '002 failed: expected 4 security functions, found %',
            v_function_count;
    END IF;


    -- --------------------------------------------------------
    -- Comprobar RLS
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_class
        WHERE oid = 'public.workers'::regclass
          AND relrowsecurity = TRUE
    ) THEN
        RAISE EXCEPTION
            '002 failed: RLS is not enabled on workers';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_class
        WHERE oid = 'public.profiles'::regclass
          AND relrowsecurity = TRUE
    ) THEN
        RAISE EXCEPTION
            '002 failed: RLS is not enabled on profiles';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_class
        WHERE oid = 'public.audit_requests'::regclass
          AND relrowsecurity = TRUE
    ) THEN
        RAISE EXCEPTION
            '002 failed: RLS is not enabled on audit_requests';
    END IF;


    -- --------------------------------------------------------
    -- Comprobar separación worker
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
          ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_is_worker'
    ) THEN
        RAISE EXCEPTION
            '002 failed: current_user_is_worker() does not exist';
    END IF;


    -- --------------------------------------------------------
    -- Comprobar identificación worker account
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
          ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_is_worker_account'
    ) THEN
        RAISE EXCEPTION
            '002 failed: current_user_is_worker_account() does not exist';
    END IF;

END $$;


COMMIT;


-- ============================================================
-- RESULTADO FINAL DE LA MIGRACIÓN 002
--
-- CLIENTE
--   ↓
-- Área Cliente
--   ↓
-- company_id = su empresa
--
--
-- TRABAJADOR ACTIVO
--   ↓
-- current_user_is_worker() = TRUE
--   ↓
-- Área Empleados
--   ↓
-- NO utiliza las políticas del Área Cliente
--
--
-- TRABAJADOR INACTIVO
--   ↓
-- current_user_is_worker() = FALSE
--   ↓
-- no tiene acceso operativo de worker
--
-- pero:
--
-- current_user_is_worker_account() = TRUE
--
-- para que el frontend pueda distinguir su cuenta.
--
--
-- VISITANTE WEB
--   ↓
-- INSERT audit_request
--   ↓
-- NO SELECT
--
-- ============================================================