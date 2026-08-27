BEGIN;

-- ============================================================
-- MODIRA — 002_security_auth_and_rls.sql
-- ============================================================
-- Seguridad transversal, workers, RLS, signup y gestión
-- segura de solicitudes de cambio de empresa.
--
-- Esta migración presupone que 001_core_schema.sql ya ha sido
-- ejecutada correctamente.
--
-- RPC utilizadas por el frontend:
--
--   request_company_change(p_requested_company_name)
--   admin_update_profile_company(p_user_id, p_company_id)
--   resolve_company_change_request(p_request_id, p_action)
--
-- ============================================================


-- ============================================================
-- 1. COMPATIBILIDAD DEL MODELO DE SOLICITUDES
-- ============================================================
--
-- El frontend EmployeeArea utiliza requested_company_name.
--
-- 001 creó requested_company_id como NOT NULL.
-- Para permitir solicitudes por nombre, la empresa solicitada
-- puede identificarse:
--
--   a) mediante requested_company_id si existe en companies
--   b) mediante requested_company_name si no existe todavía
--
-- La resolución/aprobación solamente podrá asignar una empresa
-- existente.
-- ============================================================


ALTER TABLE public.company_change_requests
    ADD COLUMN IF NOT EXISTS requested_company_name TEXT;


ALTER TABLE public.company_change_requests
    ALTER COLUMN requested_company_id DROP NOT NULL;


-- ============================================================
-- 2. FUNCIONES DE SEGURIDAD
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


REVOKE ALL ON FUNCTION public.current_user_company_id()
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.current_user_is_admin()
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.current_user_is_worker()
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.current_user_is_worker_account()
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
-- 3. RLS TRANSVERSAL
-- ============================================================


ALTER TABLE public.companies
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clients
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payments
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.budgets
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.quotations
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_requests
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workers
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.company_change_requests
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 4. COMPANIES
-- ============================================================


CREATE POLICY companies_select_own
ON public.companies
FOR SELECT
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND id = public.current_user_company_id()
);


CREATE POLICY companies_worker_select
ON public.companies
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
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
-- 5. PROFILES
-- ============================================================


CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND id = auth.uid()
);


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
    AND rol = CASE
        WHEN public.current_user_is_admin()
            THEN 'admin'
        ELSE 'user'
    END
    AND company_id IS NOT DISTINCT FROM
        public.current_user_company_id()
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


CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.current_user_is_worker()
    AND id = auth.uid()
    AND rol = 'user'
    AND company_id IS NULL
);


-- ============================================================
-- 6. WORKERS
-- ============================================================


CREATE POLICY workers_select_own
ON public.workers
FOR SELECT
TO authenticated
USING (
    auth_user_id = auth.uid()
);


-- ============================================================
-- 7. AUDIT REQUESTS
-- ============================================================


CREATE POLICY audit_requests_public_insert
ON public.audit_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
    TRUE
);


CREATE POLICY audit_requests_worker_select
ON public.audit_requests
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 8. CLIENTS
-- ============================================================


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
-- 9. PAYMENTS
-- ============================================================


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
-- 10. BUDGETS
-- ============================================================


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
-- 11. QUOTATIONS
-- ============================================================


CREATE POLICY quotations_company_select
ON public.quotations
FOR SELECT
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


CREATE POLICY quotations_worker_select
ON public.quotations
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


CREATE POLICY quotations_worker_insert
ON public.quotations
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_is_worker()
);


CREATE POLICY quotations_worker_update
ON public.quotations
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_worker()
)
WITH CHECK (
    public.current_user_is_worker()
);


CREATE POLICY quotations_worker_delete
ON public.quotations
FOR DELETE
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 12. SOLICITUDES DE CAMBIO DE EMPRESA
-- ============================================================
--
-- El cliente NO tiene permiso para modificar directamente
-- profiles.company_id.
--
-- El flujo correcto es:
--
-- CLIENTE
--    |
--    | request_company_change()
--    v
-- company_change_requests
--    |
--    | pending
--    v
-- WORKER MODIRA
--    |
--    +---- approve ----> profiles.company_id
--    |
--    +---- reject -----> solicitud rechazada
--
-- La actualización de la empresa se realiza dentro de una
-- única función SECURITY DEFINER.
-- ============================================================


CREATE POLICY company_change_requests_client_insert
ON public.company_change_requests
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND current_company_id IS NOT DISTINCT FROM
        public.current_user_company_id()
    AND status = 'pending'
    AND (
        requested_company_id IS NOT NULL
        OR NULLIF(TRIM(requested_company_name), '') IS NOT NULL
    )
    AND (
        requested_company_id IS NULL
        OR requested_company_id <>
            public.current_user_company_id()
    )
);


CREATE POLICY company_change_requests_client_select
ON public.company_change_requests
FOR SELECT
TO authenticated
USING (
    NOT public.current_user_is_worker()
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
-- 13. PERMISOS DE TABLAS
-- ============================================================


GRANT SELECT
ON public.companies,
   public.profiles,
   public.clients,
   public.payments,
   public.budgets,
   public.quotations,
   public.audit_requests,
   public.company_change_requests
TO authenticated;


GRANT UPDATE (
    company_name,
    legal_name,
    cif_vat,
    billing_email,
    phone,
    website,
    logo_url,
    address,
    postal_code,
    city,
    province,
    country,
    industry,
    employees,
    timezone,
    language,
    currency,
    updated_at
)
ON public.companies
TO authenticated;


-- ============================================================
-- 14. PERMISOS DE PROFILES
-- ============================================================


REVOKE INSERT, UPDATE
ON public.profiles
FROM authenticated;


GRANT INSERT (
    id,
    nombre,
    rol,
    fecha_registro,
    fecha_ultimo_login
)
ON public.profiles
TO authenticated;


GRANT UPDATE (
    nombre,
    empresa,
    telefono,
    updated_at
)
ON public.profiles
TO authenticated;


-- Los workers utilizan RPC SECURITY DEFINER para cambios
-- sensibles de company_id.
--
-- Por tanto NO necesitan permiso directo sobre company_id.


-- ============================================================
-- 15. RESTO DE PERMISOS
-- ============================================================


GRANT INSERT, UPDATE, DELETE
ON public.clients,
   public.payments,
   public.budgets
TO authenticated;


GRANT SELECT, INSERT, UPDATE, DELETE
ON public.quotations
TO authenticated;


GRANT SELECT
ON public.workers
TO authenticated;


GRANT INSERT
ON public.audit_requests
TO anon, authenticated;


GRANT INSERT
ON public.company_change_requests
TO authenticated;


GRANT UPDATE, DELETE
ON public.company_change_requests
TO authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.workers
FROM anon, authenticated;


REVOKE SELECT, UPDATE, DELETE
ON public.audit_requests
FROM anon;


-- ============================================================
-- 16. SIGNUP
-- ============================================================


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_empresa TEXT;
    v_company_id UUID;
    v_company_code TEXT;
BEGIN

    v_empresa :=
        NULLIF(
            TRIM(
                COALESCE(
                    NEW.raw_user_meta_data->>'empresa',
                    ''
                )
            ),
            ''
        );


    IF v_empresa IS NOT NULL THEN

        SELECT c.id
        INTO v_company_id
        FROM public.companies c
        WHERE c.company_code = v_empresa
           OR LOWER(TRIM(c.company_name)) =
              LOWER(v_empresa)
        ORDER BY
            CASE
                WHEN c.company_code = v_empresa
                    THEN 0
                ELSE 1
            END
        LIMIT 1;


        IF v_company_id IS NULL THEN

            v_company_code :=
                'CLI-' ||
                UPPER(
                    REPLACE(
                        gen_random_uuid()::TEXT,
                        '-',
                        ''
                    )
                );


            INSERT INTO public.companies (
                company_code,
                company_name,
                legal_name,
                created_by
            )
            VALUES (
                v_company_code,
                TRIM(v_empresa),
                TRIM(v_empresa),
                NEW.id
            )
            RETURNING id
            INTO v_company_id;

        END IF;

    END IF;


    INSERT INTO public.profiles (
        id,
        nombre,
        empresa,
        company_id,
        rol,
        email
    )
    VALUES (
        NEW.id,

        COALESCE(
            NULLIF(
                TRIM(
                    NEW.raw_user_meta_data->>'nombre'
                ),
                ''
            ),
            NULLIF(
                TRIM(
                    NEW.raw_user_meta_data->>'name'
                ),
                ''
            ),
            NEW.email,
            'Usuario'
        ),

        v_empresa,

        v_company_id,

        'user',

        NEW.email
    )
    ON CONFLICT (id)
    DO UPDATE
    SET
        nombre = EXCLUDED.nombre,
        empresa = EXCLUDED.empresa,
        company_id = EXCLUDED.company_id,
        email = EXCLUDED.email;


    RETURN NEW;

END;
$$;


REVOKE ALL
ON FUNCTION public.handle_new_user()
FROM PUBLIC, anon, authenticated;


CREATE TRIGGER on_auth_user_created
AFTER INSERT
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 17. RPC — SOLICITAR CAMBIO DE EMPRESA
-- ============================================================
--
-- Firma exacta utilizada por el frontend:
--
-- request_company_change(
--     p_requested_company_name
-- )
--
-- El cliente solamente puede solicitar el cambio para sí mismo.
--
-- Si existe una empresa cuyo nombre coincide, se almacena también
-- requested_company_id.
--
-- Si no existe, requested_company_id queda NULL y se conserva
-- requested_company_name para que el trabajador pueda revisarla.
-- ============================================================


CREATE OR REPLACE FUNCTION public.request_company_change(
    p_requested_company_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_current_company_id UUID;
    v_requested_company_id UUID;
    v_requested_company_name TEXT;
    v_request_id UUID;
BEGIN

    v_user_id := auth.uid();


    IF v_user_id IS NULL THEN
        RAISE EXCEPTION
            'Debes iniciar sesión para solicitar un cambio de empresa.';
    END IF;


    IF public.current_user_is_worker() THEN
        RAISE EXCEPTION
            'Las cuentas de trabajadores no pueden solicitar cambio de empresa.';
    END IF;


    v_requested_company_name :=
        NULLIF(
            TRIM(p_requested_company_name),
            ''
        );


    IF v_requested_company_name IS NULL THEN
        RAISE EXCEPTION
            'Debes indicar la empresa solicitada.';
    END IF;


    SELECT p.company_id
    INTO v_current_company_id
    FROM public.profiles p
    WHERE p.id = v_user_id;


    SELECT c.id
    INTO v_requested_company_id
    FROM public.companies c
    WHERE c.is_active = TRUE
      AND LOWER(TRIM(c.company_name)) =
          LOWER(v_requested_company_name)
    LIMIT 1;


    IF v_requested_company_id IS NOT NULL
       AND v_requested_company_id IS NOT DISTINCT FROM
           v_current_company_id
    THEN
        RAISE EXCEPTION
            'La empresa solicitada ya es tu empresa actual.';
    END IF;


    IF EXISTS (
        SELECT 1
        FROM public.company_change_requests r
        WHERE r.user_id = v_user_id
          AND r.status = 'pending'
    ) THEN
        RAISE EXCEPTION
            'Ya tienes una solicitud de cambio de empresa pendiente.';
    END IF;


    INSERT INTO public.company_change_requests (
        user_id,
        current_company_id,
        requested_company_id,
        requested_company_name,
        status
    )
    VALUES (
        v_user_id,
        v_current_company_id,
        v_requested_company_id,
        v_requested_company_name,
        'pending'
    )
    RETURNING id
    INTO v_request_id;


    RETURN v_request_id;

END;
$$;


REVOKE ALL
ON FUNCTION public.request_company_change(TEXT)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.request_company_change(TEXT)
TO authenticated;


-- ============================================================
-- 18. RPC — CAMBIO DIRECTO DE EMPRESA POR WORKER
-- ============================================================
--
-- Firma exacta utilizada por EmployeeArea:
--
-- admin_update_profile_company(
--     p_user_id,
--     p_company_id
-- )
--
-- Solamente una cuenta worker activa puede ejecutarla.
-- ============================================================


CREATE OR REPLACE FUNCTION public.admin_update_profile_company(
    p_user_id UUID,
    p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'Usuario no autenticado.';
    END IF;


    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION
            'No tienes permisos para modificar empresas de clientes.';
    END IF;


    IF p_user_id IS NULL THEN
        RAISE EXCEPTION
            'El usuario es obligatorio.';
    END IF;


    IF p_company_id IS NULL THEN
        RAISE EXCEPTION
            'La empresa es obligatoria.';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = p_user_id
    ) THEN
        RAISE EXCEPTION
            'El perfil indicado no existe.';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM public.companies
        WHERE id = p_company_id
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION
            'La empresa indicada no existe o está inactiva.';
    END IF;


    UPDATE public.profiles
    SET
        company_id = p_company_id,
        empresa = (
            SELECT c.company_name
            FROM public.companies c
            WHERE c.id = p_company_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;


    RETURN TRUE;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_update_profile_company(UUID, UUID)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.admin_update_profile_company(UUID, UUID)
TO authenticated;

-- ============================================================
-- 19. RPC — RESOLVER SOLICITUD DE CAMBIO DE EMPRESA
-- ============================================================
--
-- Firma exacta utilizada por EmployeeArea:
--
-- resolve_company_change_request(
--     p_request_id,
--     p_action
-- )
--
-- p_action:
--
--     approved
--     rejected
--
-- La aprobación realiza en una única transacción:
--
--   1. Validación del worker.
--   2. Validación de la solicitud.
--   3. Resolución de la empresa.
--   4. Si la empresa no existe, creación de la empresa.
--   5. Actualización del perfil.
--   6. Actualización de la solicitud.
--
-- IMPORTANTE:
-- Si el nombre solicitado no corresponde a una empresa existente,
-- la empresa se crea ÚNICAMENTE cuando un trabajador aprueba
-- explícitamente la solicitud.
--
-- ============================================================


CREATE OR REPLACE FUNCTION public.resolve_company_change_request(
    p_request_id UUID,
    p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_request public.company_change_requests%ROWTYPE;
    v_target_company_id UUID;
    v_target_company_name TEXT;
    v_company_code TEXT;
BEGIN

    -- --------------------------------------------------------
    -- VALIDACIÓN DE AUTENTICACIÓN
    -- --------------------------------------------------------

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'Usuario no autenticado.';
    END IF;


    -- --------------------------------------------------------
    -- SOLO WORKERS ACTIVOS
    -- --------------------------------------------------------

    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION
            'No tienes permisos para gestionar solicitudes de cambio de empresa.';
    END IF;


    -- --------------------------------------------------------
    -- VALIDACIÓN DE PARÁMETROS
    -- --------------------------------------------------------

    IF p_request_id IS NULL THEN
        RAISE EXCEPTION
            'La solicitud es obligatoria.';
    END IF;


    IF p_action NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION
            'La acción debe ser approved o rejected.';
    END IF;


    -- --------------------------------------------------------
    -- OBTENER SOLICITUD Y BLOQUEARLA
    -- --------------------------------------------------------

    SELECT *
    INTO v_request
    FROM public.company_change_requests
    WHERE id = p_request_id
    FOR UPDATE;


    IF NOT FOUND THEN
        RAISE EXCEPTION
            'La solicitud indicada no existe.';
    END IF;


    IF v_request.status <> 'pending' THEN
        RAISE EXCEPTION
            'La solicitud ya ha sido gestionada.';
    END IF;


    -- --------------------------------------------------------
    -- RECHAZO
    -- --------------------------------------------------------

    IF p_action = 'rejected' THEN

        UPDATE public.company_change_requests
        SET
            status = 'rejected',
            reviewed_by = (
                SELECT w.id
                FROM public.workers w
                WHERE w.auth_user_id = auth.uid()
                LIMIT 1
            ),
            reviewed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_request_id;


        RETURN TRUE;

    END IF;


    -- --------------------------------------------------------
    -- APROBACIÓN
    -- --------------------------------------------------------

    v_target_company_id :=
        v_request.requested_company_id;


    v_target_company_name :=
        NULLIF(
            TRIM(v_request.requested_company_name),
            ''
        );


    -- --------------------------------------------------------
    -- 1. SI YA TENEMOS COMPANY_ID,
    --    COMPROBAMOS QUE LA EMPRESA SIGUE ACTIVA
    -- --------------------------------------------------------

    IF v_target_company_id IS NOT NULL THEN

        SELECT c.company_name
        INTO v_target_company_name
        FROM public.companies c
        WHERE c.id = v_target_company_id
          AND c.is_active = TRUE;


        IF v_target_company_name IS NULL THEN
            v_target_company_id := NULL;
        END IF;

    END IF;


    -- --------------------------------------------------------
    -- 2. SI NO TENEMOS COMPANY_ID,
    --    BUSCAMOS LA EMPRESA POR NOMBRE
    -- --------------------------------------------------------

    IF v_target_company_id IS NULL
   AND v_target_company_name IS NOT NULL
THEN

    SELECT c.id
    INTO v_target_company_id
    FROM public.companies c
    WHERE c.is_active = TRUE
      AND LOWER(TRIM(c.company_name)) =
          LOWER(v_target_company_name)
    ORDER BY c.created_at ASC
    LIMIT 1;

END IF;


    -- --------------------------------------------------------
    -- 3. SI NO EXISTE, CREARLA
    -- --------------------------------------------------------
    --
    -- La creación solamente ocurre porque un WORKER ha
    -- aprobado explícitamente la solicitud.
    --
    -- Se genera automáticamente un company_code único.
    -- --------------------------------------------------------

    IF v_target_company_id IS NULL THEN

        IF v_target_company_name IS NULL THEN
            RAISE EXCEPTION
                'La solicitud no contiene un nombre de empresa válido.';
        END IF;


        v_company_code :=
            'CLI-' ||
            UPPER(
                REPLACE(
                    gen_random_uuid()::TEXT,
                    '-',
                    ''
                )
            );


        INSERT INTO public.companies (
            company_code,
            company_name,
            legal_name,
            created_by,
            is_active
        )
        VALUES (
            v_company_code,
            v_target_company_name,
            v_target_company_name,
            auth.uid(),
            TRUE
        )
        RETURNING id
        INTO v_target_company_id;

    END IF;


    -- --------------------------------------------------------
    -- 4. SEGURIDAD:
    --    NUNCA PERMITIR CAMBIAR A LA MISMA EMPRESA
    -- --------------------------------------------------------

    IF v_request.current_company_id IS NOT DISTINCT FROM
       v_target_company_id
    THEN
        RAISE EXCEPTION
            'La empresa solicitada coincide con la empresa actual.';
    END IF;


    -- --------------------------------------------------------
    -- 5. CONFIRMAR EMPRESA DESTINO
    -- --------------------------------------------------------

    SELECT c.company_name
    INTO v_target_company_name
    FROM public.companies c
    WHERE c.id = v_target_company_id
      AND c.is_active = TRUE;


    IF v_target_company_name IS NULL THEN
        RAISE EXCEPTION
            'La empresa solicitada no existe o está inactiva.';
    END IF;


    -- --------------------------------------------------------
    -- 6. ACTUALIZAR PERFIL
    -- --------------------------------------------------------

    UPDATE public.profiles
    SET
        company_id = v_target_company_id,
        empresa = v_target_company_name,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_request.user_id;


    IF NOT FOUND THEN
        RAISE EXCEPTION
            'El perfil del usuario asociado a la solicitud no existe.';
    END IF;


    -- --------------------------------------------------------
    -- 7. MARCAR SOLICITUD COMO APROBADA
    -- --------------------------------------------------------

    UPDATE public.company_change_requests
    SET
        requested_company_id = v_target_company_id,
        requested_company_name = v_target_company_name,
        status = 'approved',
        reviewed_by = (
            SELECT w.id
            FROM public.workers w
            WHERE w.auth_user_id = auth.uid()
            LIMIT 1
        ),
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_request_id;


    RETURN TRUE;

END;
$$;


REVOKE ALL
ON FUNCTION public.resolve_company_change_request(UUID, TEXT)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.resolve_company_change_request(UUID, TEXT)
TO authenticated;

-- ============================================================
-- 21. COMENTARIOS
-- ============================================================


COMMENT ON FUNCTION public.request_company_change(TEXT)
IS
'Solicita el cambio de empresa del usuario autenticado.';


COMMENT ON FUNCTION public.admin_update_profile_company(UUID, UUID)
IS
'Permite a un trabajador activo de MODIRA cambiar la empresa de un perfil.';


COMMENT ON FUNCTION public.resolve_company_change_request(UUID, TEXT)
IS
'Permite a un trabajador aprobar o rechazar una solicitud de cambio de empresa.';


COMMENT ON COLUMN public.company_change_requests.requested_company_name
IS
'Nombre de la empresa solicitada. Se conserva incluso cuando todavía no existe una empresa correspondiente en companies.';


-- ============================================================
-- 22. VERIFICACIONES FINALES
-- ============================================================


DO $$
DECLARE
    v_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- Companies
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'companies'
      AND policyname IN (
          'companies_select_own',
          'companies_worker_select',
          'companies_update_own'
      );

    IF v_count <> 3 THEN
        RAISE EXCEPTION
            '002 failed: companies policies are incomplete';
    END IF;


    -- --------------------------------------------------------
    -- Profiles
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
          'profiles_worker_update',
          'profiles_insert_own'
      );

    IF v_count <> 5 THEN
        RAISE EXCEPTION
            '002 failed: profiles policies are incomplete';
    END IF;


    -- --------------------------------------------------------
    -- Quotations
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quotations'
      AND policyname IN (
          'quotations_company_select',
          'quotations_worker_select',
          'quotations_worker_insert',
          'quotations_worker_update',
          'quotations_worker_delete'
      );

    IF v_count <> 5 THEN
        RAISE EXCEPTION
            '002 failed: quotations policies are incomplete';
    END IF;


    -- --------------------------------------------------------
    -- Company change requests
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'company_change_requests'
    ) THEN
        RAISE EXCEPTION
            '002 failed: company_change_requests table is missing';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'company_change_requests'
          AND column_name = 'requested_company_name'
    ) THEN
        RAISE EXCEPTION
            '002 failed: requested_company_name column is missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_change_requests'
      AND policyname IN (
          'company_change_requests_client_insert',
          'company_change_requests_client_select',
          'company_change_requests_worker_select',
          'company_change_requests_worker_update',
          'company_change_requests_worker_delete'
      );

    IF v_count <> 5 THEN
        RAISE EXCEPTION
            '002 failed: company change request policies are incomplete';
    END IF;


    -- --------------------------------------------------------
    -- Core functions
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND proname = 'current_user_company_id'
    ) THEN
        RAISE EXCEPTION
            '002 failed: current_user_company_id() missing';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND proname = 'current_user_is_worker'
    ) THEN
        RAISE EXCEPTION
            '002 failed: current_user_is_worker() missing';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND proname = 'handle_new_user'
    ) THEN
        RAISE EXCEPTION
            '002 failed: handle_new_user() missing';
    END IF;


   -- --------------------------------------------------------
-- RPC request_company_change
-- --------------------------------------------------------

IF to_regprocedure(
    'public.request_company_change(text)'
) IS NULL THEN
    RAISE EXCEPTION
        '002 failed: request_company_change(text) missing';
END IF;


-- --------------------------------------------------------
-- RPC admin_update_profile_company
-- --------------------------------------------------------

IF to_regprocedure(
    'public.admin_update_profile_company(uuid, uuid)'
) IS NULL THEN
    RAISE EXCEPTION
        '002 failed: admin_update_profile_company(uuid, uuid) missing';
END IF;


-- --------------------------------------------------------
-- RPC resolve_company_change_request
-- --------------------------------------------------------

IF to_regprocedure(
    'public.resolve_company_change_request(uuid, text)'
) IS NULL THEN
    RAISE EXCEPTION
        '002 failed: resolve_company_change_request(uuid, text) missing';
END IF;
    -- --------------------------------------------------------
    -- Worker profile policy
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'profiles'
          AND policyname = 'profiles_worker_update'
    ) THEN
        RAISE EXCEPTION
            '002 failed: profiles_worker_update policy is missing';
    END IF;

END $$;


COMMIT;