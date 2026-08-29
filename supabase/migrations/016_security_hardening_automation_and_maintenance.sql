BEGIN;

-- ============================================================
-- MODIRA — 016_auth_account_status_and_session_revocation.sql
--
-- H-05 — BLOQUEO EFECTIVO DE CUENTAS Y REVOCACIÓN DE SESIONES
--
-- OBJETIVO
--
-- 1. Crear una única fuente de verdad para el estado de cuenta:
--
--      public.profiles.status
--
--      active
--      blocked
--
-- 2. Impedir que un usuario autenticado pueda modificar su
--    propio estado.
--
-- 3. Hacer que una cuenta bloqueada pierda inmediatamente el
--    acceso a las operaciones protegidas por RLS.
--
-- 4. Hacer que current_user_company_id(), current_user_is_admin()
--    y current_user_is_worker() respeten el estado de la cuenta.
--
-- 5. Mantener la regla arquitectónica:
--
--      WORKER = trabajador interno de MODIRA
--
--    Los workers NO pertenecen a las empresas cliente.
--
-- 6. Proporcionar una RPC exclusiva para workers activos de
--    MODIRA para bloquear/desbloquear cuentas.
--
-- 7. Al bloquear una cuenta, eliminar sus sesiones de Supabase
--    para impedir la renovación mediante refresh tokens.
--
-- 8. Impedir que una cuenta bloqueada pueda consultar sus
--    facturas, crear checkout o utilizar recursos protegidos
--    mediante las políticas RLS.
--
-- 9. No modificar las migraciones anteriores.
--
-- ============================================================


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
    ) THEN
        RAISE EXCEPTION
            '016 stopped: public.profiles does not exist';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'workers'
    ) THEN
        RAISE EXCEPTION
            '016 stopped: public.workers does not exist';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'companies'
    ) THEN
        RAISE EXCEPTION
            '016 stopped: public.companies does not exist';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
            ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_company_id'
    ) THEN
        RAISE EXCEPTION
            '016 stopped: current_user_company_id() does not exist';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
            ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_is_worker'
    ) THEN
        RAISE EXCEPTION
            '016 stopped: current_user_is_worker() does not exist';
    END IF;

END $$;


-- ============================================================
-- 2. ESTADO DE CUENTA
-- ============================================================
--
-- 001 no tenía profiles.status.
--
-- H-05 exige una fuente de verdad explícita para poder bloquear
-- una cuenta independientemente de lo que muestre el frontend.
--
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT
NOT NULL
DEFAULT 'active';


-- ============================================================
-- 3. CONSTRAINT DEL ESTADO
-- ============================================================

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_status_check
CHECK (
    status IN (
        'active',
        'blocked'
    )
);


-- ============================================================
-- 4. ÍNDICE
-- ============================================================

CREATE INDEX IF NOT EXISTS
    idx_profiles_status
ON public.profiles (
    status
);


-- ============================================================
-- 5. FUNCIÓN: CURRENT USER IS ACTIVE
-- ============================================================
--
-- Esta función se convierte en la comprobación transversal
-- del estado de la cuenta.
--
-- IMPORTANTE:
--
-- SECURITY DEFINER:
-- evita depender de la propia RLS de profiles.
--
-- Un usuario solo está activo si:
--
--   auth.uid() existe
--       +
--   profile existe
--       +
--   status = active
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_is_active()
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
          AND p.status = 'active'
    );
$$;


-- ============================================================
-- 6. FUNCIÓN: CURRENT USER IS BLOCKED
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_is_blocked()
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
          AND p.status = 'blocked'
    );
$$;


-- ============================================================
-- 7. CORREGIR CURRENT_USER_COMPANY_ID()
-- ============================================================
--
-- Un usuario bloqueado NO debe conservar una empresa operativa
-- desde el punto de vista de las policies.
--
-- Por tanto:
--
-- active  -> company_id
-- blocked -> NULL
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
      AND p.status = 'active'
    LIMIT 1;
$$;


-- ============================================================
-- 8. CORREGIR CURRENT_USER_IS_ADMIN()
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
          AND p.status = 'active'
    );
$$;


-- ============================================================
-- 9. CORREGIR CURRENT_USER_IS_WORKER()
-- ============================================================
--
-- Un worker:
--
--   1. Debe existir en workers.
--   2. Debe estar activo.
--   3. Su profile, si existe, debe estar activo.
--
-- El worker sigue siendo exclusivamente interno de MODIRA.
--
-- NO se utiliza company_id para determinar si es worker.
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
        JOIN public.profiles p
            ON p.id = w.auth_user_id
        WHERE w.auth_user_id = auth.uid()
          AND w.is_active = TRUE
          AND p.status = 'active'
    );
$$;


-- ============================================================
-- 10. CORREGIR CURRENT_USER_IS_WORKER_ACCOUNT()
-- ============================================================
--
-- Esta función continúa permitiendo distinguir una cuenta
-- worker activa/inactiva para el frontend.
--
-- No se utiliza para autorizar operaciones sensibles.
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
-- 11. PERMISOS DE LAS FUNCIONES
-- ============================================================

REVOKE ALL
ON FUNCTION public.current_user_is_active()
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.current_user_is_blocked()
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.current_user_company_id()
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.current_user_is_admin()
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.current_user_is_worker()
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.current_user_is_worker_account()
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.current_user_is_active()
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.current_user_is_blocked()
TO authenticated;

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
-- 12. PROTEGER STATUS CONTRA EL CLIENTE
-- ============================================================
--
-- El cliente NO puede:
--
--   status = active
--   status = blocked
--
-- desde un UPDATE directo.
--
-- El cambio se realizará mediante RPC autorizada.
--
-- ============================================================

REVOKE UPDATE (
    status
)
ON public.profiles
FROM authenticated;


-- ============================================================
-- 13. FUNCIÓN PARA REVOCAR SESIONES
-- ============================================================
--
-- Al bloquear una cuenta eliminamos sus sesiones Auth.
--
-- Esto evita que los refresh tokens asociados continúen
-- renovando sesiones.
--
-- El JWT de acceso ya emitido no puede ser borrado porque es
-- stateless; por eso H-05 se completa conjuntamente con las
-- comprobaciones RLS de current_user_is_active().
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.revoke_user_sessions(
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION
            'Usuario obligatorio';
    END IF;


    DELETE FROM auth.sessions
    WHERE user_id = p_user_id;

END;
$$;


REVOKE ALL
ON FUNCTION public.revoke_user_sessions(UUID)
FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 14. RPC — CAMBIAR ESTADO DE CUENTA
-- ============================================================
--
-- SOLO WORKERS ACTIVOS DE MODIRA.
--
-- p_status:
--
--   active
--   blocked
--
-- Al bloquear:
--
--   1. cambia profiles.status
--   2. revoca las sesiones Auth
--
-- Al desbloquear:
--
--   1. cambia profiles.status
--   2. NO crea ninguna sesión automáticamente
--
-- El usuario deberá autenticarse nuevamente.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_profile_status(
    p_user_id UUID,
    p_status TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_profile public.profiles;
BEGIN

    -- --------------------------------------------------------
    -- AUTENTICACIÓN
    -- --------------------------------------------------------

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'Usuario no autenticado';
    END IF;


    -- --------------------------------------------------------
    -- SOLO WORKERS ACTIVOS DE MODIRA
    -- --------------------------------------------------------

    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo de MODIRA';
    END IF;


    -- --------------------------------------------------------
    -- VALIDAR USER ID
    -- --------------------------------------------------------

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION
            'El usuario objetivo es obligatorio';
    END IF;


    -- --------------------------------------------------------
    -- VALIDAR ESTADO
    -- --------------------------------------------------------

    IF p_status NOT IN (
        'active',
        'blocked'
    ) THEN
        RAISE EXCEPTION
            'Estado de cuenta no válido';
    END IF;


    -- --------------------------------------------------------
    -- NO PERMITIR QUE UN WORKER BLOQUEE SU PROPIA CUENTA
    -- MEDIANTE ESTA RPC.
    --
    -- La gestión administrativa de workers continúa separada
    -- mediante workers.is_active.
    -- --------------------------------------------------------

    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION
            'Un trabajador no puede modificar el estado de su propia cuenta';
    END IF;


    -- --------------------------------------------------------
    -- ACTUALIZAR PERFIL
    -- --------------------------------------------------------

    UPDATE public.profiles
    SET
        status = p_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id
    RETURNING *
    INTO v_profile;


    IF NOT FOUND THEN
        RAISE EXCEPTION
            'El perfil indicado no existe';
    END IF;


    -- --------------------------------------------------------
    -- BLOQUEO → REVOCAR SESIONES
    -- --------------------------------------------------------

    IF p_status = 'blocked' THEN

        PERFORM public.revoke_user_sessions(
            p_user_id
        );

    END IF;


    RETURN v_profile;

END;
$$;


REVOKE ALL
ON FUNCTION public.set_profile_status(UUID, TEXT)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.set_profile_status(UUID, TEXT)
TO authenticated;


-- ============================================================
-- 15. PROTEGER PROFILES CONTRA AUTO-DESBLOQUEO
-- ============================================================
--
-- Sustituimos las policies de perfil para que:
--
-- CLIENTE:
--   solo pueda consultar/modificar su perfil si está activo.
--
-- WORKER:
--   pueda consultar perfiles si es worker activo.
--
-- status NO puede modificarse directamente.
--
-- ============================================================

DROP POLICY IF EXISTS profiles_select_own
ON public.profiles;

DROP POLICY IF EXISTS profiles_update_own
ON public.profiles;

DROP POLICY IF EXISTS profiles_worker_select
ON public.profiles;

DROP POLICY IF EXISTS profiles_worker_update
ON public.profiles;


CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND id = auth.uid()
);


CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND id = auth.uid()
)
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND id = auth.uid()
);


CREATE POLICY profiles_worker_select
ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


CREATE POLICY profiles_worker_update
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_worker()
)
WITH CHECK (
    public.current_user_is_worker()
);


-- ============================================================
-- 16. AUTOMATIONS
-- ============================================================
--
-- Una cuenta bloqueada no puede:
--
--   SELECT
--   INSERT
--   UPDATE
--
-- ============================================================

DROP POLICY IF EXISTS automations_client_select
ON public.automations;

DROP POLICY IF EXISTS automations_client_insert
ON public.automations;

DROP POLICY IF EXISTS automations_client_update
ON public.automations;

DROP POLICY IF EXISTS automations_worker_select
ON public.automations;


CREATE POLICY automations_client_select
ON public.automations
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


CREATE POLICY automations_client_insert
ON public.automations
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND company_id = public.current_user_company_id()
);


CREATE POLICY automations_client_update
ON public.automations
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
    AND user_id = auth.uid()
);


CREATE POLICY automations_worker_select
ON public.automations
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 17. AUTOMATION RUNS
-- ============================================================
--
-- Cliente activo:
--   solo sus ejecuciones.
--
-- Worker activo MODIRA:
--   todas.
--
-- Cuenta bloqueada:
--   ninguna.
--
-- ============================================================

ALTER TABLE public.automation_runs
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS automation_runs_client_select
ON public.automation_runs;

DROP POLICY IF EXISTS automation_runs_worker_select
ON public.automation_runs;


CREATE POLICY automation_runs_client_select
ON public.automation_runs
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
    AND EXISTS (
        SELECT 1
        FROM public.automations a
        WHERE a.id = automation_runs.automation_id
          AND a.user_id = auth.uid()
    )
);


CREATE POLICY automation_runs_worker_select
ON public.automation_runs
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 18. MAINTENANCE CONTRACTS
-- ============================================================
--
-- Cuenta bloqueada:
--   ninguna lectura
--   ninguna creación
--
-- Worker activo:
--   lectura interna.
--
-- ============================================================

DROP POLICY IF EXISTS maintenance_contracts_client_select
ON public.maintenance_contracts;

DROP POLICY IF EXISTS maintenance_contracts_client_insert
ON public.maintenance_contracts;

DROP POLICY IF EXISTS maintenance_contracts_worker_select
ON public.maintenance_contracts;


CREATE POLICY maintenance_contracts_client_select
ON public.maintenance_contracts
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND (
        (
            company_id IS NOT NULL
            AND company_id = public.current_user_company_id()
        )
        OR
        (
            company_id IS NULL
            AND user_id = auth.uid()
        )
    )
);


CREATE POLICY maintenance_contracts_client_insert
ON public.maintenance_contracts
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND (
        company_id IS NULL
        OR company_id = public.current_user_company_id()
    )
);


CREATE POLICY maintenance_contracts_worker_select
ON public.maintenance_contracts
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 19. INVOICES
-- ============================================================
--
-- H-05 es especialmente importante aquí.
--
-- El checkout Edge Function utiliza el usuario autenticado
-- para localizar la factura.
--
-- Si la cuenta está bloqueada:
--
--   current_user_company_id() = NULL
--
-- por lo que la factura deja de ser visible mediante RLS.
--
-- ============================================================

DROP POLICY IF EXISTS invoices_client_select
ON public.invoices;

DROP POLICY IF EXISTS invoices_worker_select
ON public.invoices;


CREATE POLICY invoices_client_select
ON public.invoices
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


CREATE POLICY invoices_worker_select
ON public.invoices
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 20. COMPANIES
-- ============================================================
--
-- Cuenta bloqueada:
--   no puede consultar ni modificar su empresa.
--
-- ============================================================

DROP POLICY IF EXISTS companies_select_own
ON public.companies;

DROP POLICY IF EXISTS companies_update_own
ON public.companies;

DROP POLICY IF EXISTS companies_worker_select
ON public.companies;


CREATE POLICY companies_select_own
ON public.companies
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND id = public.current_user_company_id()
);


CREATE POLICY companies_update_own
ON public.companies
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND id = public.current_user_company_id()
)
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND id = public.current_user_company_id()
);


CREATE POLICY companies_worker_select
ON public.companies
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 21. CLIENTS
-- ============================================================

DROP POLICY IF EXISTS clients_company_access
ON public.clients;


CREATE POLICY clients_company_access
ON public.clients
FOR ALL
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 22. PAYMENTS
-- ============================================================

DROP POLICY IF EXISTS payments_company_access
ON public.payments;


CREATE POLICY payments_company_access
ON public.payments
FOR ALL
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 23. BUDGETS
-- ============================================================

DROP POLICY IF EXISTS budgets_company_access
ON public.budgets;


CREATE POLICY budgets_company_access
ON public.budgets
FOR ALL
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 24. COMPANY CHANGE REQUESTS
-- ============================================================
--
-- Una cuenta bloqueada no puede solicitar cambios de empresa
-- ni consultar solicitudes propias.
--
-- Workers activos de MODIRA mantienen el acceso interno.
--
-- ============================================================

DROP POLICY IF EXISTS company_change_requests_client_insert
ON public.company_change_requests;

DROP POLICY IF EXISTS company_change_requests_client_select
ON public.company_change_requests;

DROP POLICY IF EXISTS company_change_requests_worker_select
ON public.company_change_requests;

DROP POLICY IF EXISTS company_change_requests_worker_update
ON public.company_change_requests;

DROP POLICY IF EXISTS company_change_requests_worker_delete
ON public.company_change_requests;


CREATE POLICY company_change_requests_client_insert
ON public.company_change_requests
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND current_company_id IS NOT DISTINCT FROM
        public.current_user_company_id()
    AND status = 'pending'
);


CREATE POLICY company_change_requests_client_select
ON public.company_change_requests
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
);


CREATE POLICY company_change_requests_worker_select
ON public.company_change_requests
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


CREATE POLICY company_change_requests_worker_update
ON public.company_change_requests
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_worker()
)
WITH CHECK (
    public.current_user_is_worker()
);


CREATE POLICY company_change_requests_worker_delete
ON public.company_change_requests
FOR DELETE
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 25. VALIDACIÓN DE EMPRESA ACTIVA
-- ============================================================
--
-- Una cuenta activa con una empresa desactivada tampoco debe
-- poder operar sobre ella.
--
-- current_user_company_id() continúa devolviendo el company_id,
-- pero la policy de companies/resources deberá comprobar
-- company.is_active cuando corresponda.
--
-- ============================================================

DROP POLICY IF EXISTS companies_select_own
ON public.companies;

CREATE POLICY companies_select_own
ON public.companies
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND id = public.current_user_company_id()
    AND is_active = TRUE
);


DROP POLICY IF EXISTS companies_update_own
ON public.companies;

CREATE POLICY companies_update_own
ON public.companies
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND id = public.current_user_company_id()
    AND is_active = TRUE
)
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND id = public.current_user_company_id()
);


-- ============================================================
-- 26. COMENTARIOS
-- ============================================================

COMMENT ON COLUMN public.profiles.status
IS
'Estado de acceso de la cuenta. active permite operar; blocked bloquea el acceso a las operaciones protegidas.';


COMMENT ON FUNCTION public.current_user_is_active()
IS
'Indica si la cuenta autenticada tiene un perfil con status active.';


COMMENT ON FUNCTION public.current_user_is_blocked()
IS
'Indica si la cuenta autenticada tiene status blocked.';


COMMENT ON FUNCTION public.set_profile_status(UUID, TEXT)
IS
'Permite a un trabajador activo de MODIRA bloquear o desbloquear una cuenta de usuario. El bloqueo revoca las sesiones Auth existentes.';


COMMENT ON FUNCTION public.revoke_user_sessions(UUID)
IS
'Revoca las sesiones Auth almacenadas para un usuario bloqueado.';


-- ============================================================
-- 27. VALIDACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- profiles.status
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'status'
    ) THEN
        RAISE EXCEPTION
            '016 failed: profiles.status missing';
    END IF;


    -- --------------------------------------------------------
    -- status constraint
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_status_check';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '016 failed: profiles_status_check missing';
    END IF;


    -- --------------------------------------------------------
    -- current_user_is_active
    -- --------------------------------------------------------

    IF to_regprocedure(
        'public.current_user_is_active()'
    ) IS NULL THEN
        RAISE EXCEPTION
            '016 failed: current_user_is_active() missing';
    END IF;


    -- --------------------------------------------------------
    -- current_user_is_blocked
    -- --------------------------------------------------------

    IF to_regprocedure(
        'public.current_user_is_blocked()'
    ) IS NULL THEN
        RAISE EXCEPTION
            '016 failed: current_user_is_blocked() missing';
    END IF;


    -- --------------------------------------------------------
    -- set_profile_status
    -- --------------------------------------------------------

    IF to_regprocedure(
        'public.set_profile_status(uuid,text)'
    ) IS NULL THEN
        RAISE EXCEPTION
            '016 failed: set_profile_status(uuid,text) missing';
    END IF;


    -- --------------------------------------------------------
    -- revoke_user_sessions
    -- --------------------------------------------------------

    IF to_regprocedure(
        'public.revoke_user_sessions(uuid)'
    ) IS NULL THEN
        RAISE EXCEPTION
            '016 failed: revoke_user_sessions(uuid) missing';
    END IF;


    -- --------------------------------------------------------
    -- profiles policies
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname IN (
          'profiles_select_own',
          'profiles_update_own',
          'profiles_worker_select',
          'profiles_worker_update'
      );

    IF v_count <> 4 THEN
        RAISE EXCEPTION
            '016 failed: profiles policies incomplete';
    END IF;


    -- --------------------------------------------------------
    -- invoices policies
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
      AND policyname IN (
          'invoices_client_select',
          'invoices_worker_select'
      );

    IF v_count <> 2 THEN
        RAISE EXCEPTION
            '016 failed: invoices policies incomplete';
    END IF;


    -- --------------------------------------------------------
    -- automations policies
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'automations'
      AND policyname IN (
          'automations_client_select',
          'automations_client_insert',
          'automations_client_update',
          'automations_worker_select'
      );

    IF v_count <> 4 THEN
        RAISE EXCEPTION
            '016 failed: automations policies incomplete';
    END IF;


    -- --------------------------------------------------------
    -- maintenance policies
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'maintenance_contracts'
      AND policyname IN (
          'maintenance_contracts_client_select',
          'maintenance_contracts_client_insert',
          'maintenance_contracts_worker_select'
      );

    IF v_count <> 3 THEN
        RAISE EXCEPTION
            '016 failed: maintenance policies incomplete';
    END IF;


END $$;


COMMIT;