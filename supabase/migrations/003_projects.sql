BEGIN;

-- ============================================================
-- MODIRA — 003_projects.sql
-- Proyectos + RPCs + RLS definitiva.
--
-- MODELO:
--
-- CLIENTE
-- projects.user_id = propietario del proyecto
-- projects.company_id = empresa asociada al proyecto
--
-- IMPORTANTE:
-- El company_id del proyecto NO se actualiza cuando el usuario
-- cambia de empresa.
--
-- Por tanto:
--   - Los proyectos antiguos siguen perteneciendo al usuario.
--   - Los proyectos antiguos conservan la empresa con la que
--     fueron creados.
--   - Los nuevos proyectos se crean con la empresa actual del
--     usuario.
--
-- CLIENTE SIN EMPRESA
-- projects.company_id = NULL
-- projects.user_id = auth.uid()
--
-- WORKER ACTIVO
-- SELECT todos los proyectos
-- CREATE mediante create_project_by_worker()
-- UPDATE únicamente nombre + estado mediante RPC
-- NO DELETE
--
-- create_project_by_worker() crea el proyecto asociado a un
-- cliente real de Modira y utiliza como user_id el profile_id
-- del cliente. Esto mantiene coherencia con invoices, que usan
-- projects.user_id como usuario propietario.
--
-- IMPORTANTE:
-- clients.profile_id es añadido posteriormente por 009.
-- Para mantener el orden de migraciones, la RPC lo consulta
-- mediante SQL dinámico y lo utiliza cuando la función se ejecuta.
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
          AND table_name = 'projects'
    ) THEN
        RAISE EXCEPTION '003 stopped: public.projects does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_company_id'
    ) THEN
        RAISE EXCEPTION '003 stopped: current_user_company_id() does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_is_worker'
    ) THEN
        RAISE EXCEPTION '003 stopped: current_user_is_worker() does not exist';
    END IF;
END $$;


-- ============================================================
-- 2. VALIDACIÓN DEL MODELO DE PROJECTS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'company_id'
          AND is_nullable = 'YES'
    ) THEN
        RAISE EXCEPTION '003 failed: projects.company_id must allow NULL';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'client_id'
    ) THEN
        RAISE EXCEPTION '003 failed: projects.client_id is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.projects'::regclass
          AND conname = 'projects_estado_check'
    ) THEN
        RAISE EXCEPTION '003 failed: projects_estado_check missing';
    END IF;
END $$;


-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 4. ELIMINAR POLÍTICAS PREVIAS
-- ============================================================

DROP POLICY IF EXISTS projects_company_access
ON public.projects;

DROP POLICY IF EXISTS projects_select_policy
ON public.projects;

DROP POLICY IF EXISTS projects_insert_policy
ON public.projects;

DROP POLICY IF EXISTS projects_update_policy
ON public.projects;

DROP POLICY IF EXISTS projects_delete_policy
ON public.projects;

DROP POLICY IF EXISTS projects_client_select
ON public.projects;

DROP POLICY IF EXISTS projects_client_insert
ON public.projects;

DROP POLICY IF EXISTS projects_worker_select
ON public.projects;

DROP POLICY IF EXISTS projects_client_update_policy
ON public.projects;


-- ============================================================
-- 5. PROJECTS — SELECT
--
-- Cliente:
--     todos sus proyectos, independientemente de la empresa
--     actual del usuario.
--
-- Esto permite que un usuario que cambie de empresa siga viendo
-- los proyectos que creó o que están asociados a su usuario.
--
-- La empresa del proyecto se conserva en company_id y NO se
-- sustituye automáticamente por la nueva empresa del usuario.
--
-- Worker activo:
--     todos los proyectos.
-- ============================================================

CREATE POLICY projects_select_policy
ON public.projects
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
    OR
    (
        NOT public.current_user_is_worker()
        AND user_id = auth.uid()
    )
);


-- ============================================================
-- 6. PROJECTS — INSERT DIRECTO DE CLIENTES
--
-- Solo clientes pueden insertar directamente.
-- Los workers crean mediante create_project_by_worker().
--
-- Los proyectos nuevos:
--   - Si el usuario tiene empresa, se asocian a su empresa actual.
--   - Si no tiene empresa, company_id queda NULL.
-- ============================================================

CREATE POLICY projects_insert_policy
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND
    (
        (
            public.current_user_company_id() IS NOT NULL
            AND company_id = public.current_user_company_id()
        )
        OR
        (
            public.current_user_company_id() IS NULL
            AND company_id IS NULL
        )
    )
    AND estado IN (
        'Pendiente',
        'Activo',
        'Pausado',
        'Entregado',
        'Completado'
    )
);


-- ============================================================
-- 7. PROJECTS — CLIENT UPDATE
--
-- El usuario puede seguir modificando sus propios proyectos
-- aunque la empresa asociada al proyecto sea diferente de su
-- empresa actual.
--
-- IMPORTANTE:
-- No se utiliza company_id para determinar el acceso al proyecto.
-- ============================================================

CREATE POLICY projects_client_update_policy
ON public.projects
FOR UPDATE
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND user_id = auth.uid()
)
WITH CHECK (
    NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND estado IN (
        'Pendiente',
        'Activo',
        'Pausado',
        'Entregado',
        'Completado'
    )
);


-- ============================================================
-- 8. PERMISOS BASE
-- ============================================================

GRANT SELECT, INSERT, UPDATE
ON public.projects
TO authenticated;

REVOKE DELETE
ON public.projects
FROM authenticated, anon;


-- ============================================================
-- 9. create_project()
--
-- Contrato frontend actual:
--   p_descripcion
--   p_fecha_inicio
--   p_fecha_fin
--
-- Crea un proyecto para el usuario autenticado.
--
-- El company_id utilizado es el de la empresa ACTUAL del
-- usuario en el momento de crear el proyecto.
--
-- Una vez creado, ese company_id NO cambia automáticamente
-- si el usuario cambia de empresa.
-- ============================================================

DROP FUNCTION IF EXISTS
    public.create_project(TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION public.create_project(
    p_descripcion TEXT,
    p_fecha_inicio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    p_fecha_fin TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_project public.projects;
    v_company_id UUID;
    v_fecha_inicio TIMESTAMPTZ;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    IF public.current_user_is_worker() THEN
        RAISE EXCEPTION 'Los trabajadores no pueden crear proyectos mediante create_project()';
    END IF;

    IF p_descripcion IS NULL OR TRIM(p_descripcion) = '' THEN
        RAISE EXCEPTION 'La descripción del proyecto es obligatoria';
    END IF;

    v_fecha_inicio := COALESCE(p_fecha_inicio, CURRENT_TIMESTAMP);

    IF p_fecha_fin IS NOT NULL AND p_fecha_fin < v_fecha_inicio THEN
        RAISE EXCEPTION 'La fecha de fin no puede ser anterior a la fecha de inicio';
    END IF;

    v_company_id := public.current_user_company_id();

    INSERT INTO public.projects (
        user_id,
        company_id,
        nombre,
        descripcion,
        estado,
        fecha_inicio,
        fecha_fin
    )
    VALUES (
        auth.uid(),
        v_company_id,
        'Proyecto sin título',
        TRIM(p_descripcion),
        'Pendiente',
        v_fecha_inicio,
        p_fecha_fin
    )
    RETURNING * INTO v_project;

    RETURN v_project;
END;
$$;


REVOKE ALL
ON FUNCTION public.create_project(TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.create_project(TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
TO authenticated;


-- ============================================================
-- 10. create_project_by_worker()
--
-- Worker activo:
--   - selecciona un cliente
--   - el company_id se obtiene del cliente
--   - el user_id se obtiene del profile_id del cliente
--   - client_id queda guardado en projects
--
-- clients.profile_id se añade en 009. Se consulta dinámicamente
-- para que 003 siga siendo ejecutable antes de 009 durante reset.
-- ============================================================

DROP FUNCTION IF EXISTS
    public.create_project_by_worker(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION public.create_project_by_worker(
    p_client_id UUID,
    p_descripcion TEXT,
    p_fecha_inicio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    p_fecha_fin TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_project public.projects;
    v_client_company_id UUID;
    v_client_profile_id UUID;
    v_fecha_inicio TIMESTAMPTZ;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION 'Acceso denegado: se requiere un trabajador activo';
    END IF;

    IF p_client_id IS NULL THEN
        RAISE EXCEPTION 'El cliente es obligatorio';
    END IF;

    IF p_descripcion IS NULL OR TRIM(p_descripcion) = '' THEN
        RAISE EXCEPTION 'La descripción del proyecto es obligatoria';
    END IF;

    -- 009 añade clients.profile_id. Se usa SQL dinámico para que
    -- la definición de esta RPC no rompa el reset antes de 009.
    EXECUTE '
        SELECT c.company_id, c.profile_id
        FROM public.clients c
        WHERE c.id = $1
    '
    INTO v_client_company_id, v_client_profile_id
    USING p_client_id;

    IF v_client_company_id IS NULL THEN
        RAISE EXCEPTION 'El cliente seleccionado no existe';
    END IF;

    IF v_client_profile_id IS NULL THEN
        RAISE EXCEPTION
            'El cliente seleccionado no está vinculado a un usuario de Modira';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = v_client_profile_id
          AND p.company_id = v_client_company_id
          AND p.rol = 'user'
    ) THEN
        RAISE EXCEPTION
            'El usuario asociado al cliente no es válido para esta empresa';
    END IF;

    v_fecha_inicio := COALESCE(p_fecha_inicio, CURRENT_TIMESTAMP);

    IF p_fecha_fin IS NOT NULL AND p_fecha_fin < v_fecha_inicio THEN
        RAISE EXCEPTION 'La fecha de fin no puede ser anterior a la fecha de inicio';
    END IF;

    INSERT INTO public.projects (
        user_id,
        company_id,
        client_id,
        nombre,
        descripcion,
        estado,
        fecha_inicio,
        fecha_fin
    )
    VALUES (
        v_client_profile_id,
        v_client_company_id,
        p_client_id,
        'Proyecto sin título',
        TRIM(p_descripcion),
        'Pendiente',
        v_fecha_inicio,
        p_fecha_fin
    )
    RETURNING * INTO v_project;

    RETURN v_project;
END;
$$;


REVOKE ALL
ON FUNCTION public.create_project_by_worker(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.create_project_by_worker(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
TO authenticated;


-- ============================================================
-- 11. get_worker_projects()
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_worker_projects()
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    descripcion TEXT,
    estado TEXT,
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    company_id UUID,
    user_id UUID,
    created_at TIMESTAMPTZ,
    cliente_nombre TEXT,
    cliente_email TEXT,
    empresa_nombre TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION 'Acceso denegado: se requiere rol de trabajador activo';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.nombre,
        p.descripcion,
        p.estado,
        p.fecha_inicio,
        p.fecha_fin,
        p.company_id,
        p.user_id,
        p.created_at,
        COALESCE(pr.nombre, 'Sin nombre') AS cliente_nombre,
        u.email::TEXT AS cliente_email,
        c.company_name AS empresa_nombre
    FROM public.projects p
    LEFT JOIN public.profiles pr
        ON p.user_id = pr.id
    LEFT JOIN public.companies c
        ON p.company_id = c.id
    LEFT JOIN auth.users u
        ON p.user_id = u.id
    ORDER BY p.created_at DESC;
END;
$$;


REVOKE ALL
ON FUNCTION public.get_worker_projects()
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.get_worker_projects()
TO authenticated;


-- ============================================================
-- 12. update_project_by_worker()
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_project_by_worker(
    p_project_id UUID,
    p_nombre TEXT DEFAULT NULL,
    p_estado TEXT DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_project public.projects;
BEGIN
    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION 'Acceso denegado: se requiere un trabajador activo';
    END IF;

    IF p_estado IS NOT NULL
       AND p_estado NOT IN (
           'Pendiente',
           'Activo',
           'Pausado',
           'Entregado',
           'Completado'
       )
    THEN
        RAISE EXCEPTION 'Estado de proyecto no válido: %', p_estado;
    END IF;

    IF p_nombre IS NOT NULL AND TRIM(p_nombre) = '' THEN
        RAISE EXCEPTION 'El nombre del proyecto no puede estar vacío';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = p_project_id
    ) THEN
        RAISE EXCEPTION 'Proyecto no encontrado';
    END IF;

    UPDATE public.projects
    SET
        nombre = CASE
            WHEN p_nombre IS NULL THEN nombre
            ELSE TRIM(p_nombre)
        END,
        estado = COALESCE(p_estado, estado),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_project_id
    RETURNING * INTO v_project;

    RETURN v_project;
END;
$$;


REVOKE ALL
ON FUNCTION public.update_project_by_worker(UUID, TEXT, TEXT)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.update_project_by_worker(UUID, TEXT, TEXT)
TO authenticated;


-- ============================================================
-- 13. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_policy_count INTEGER;
    v_function_count INTEGER;
    v_create_project_args TEXT[];
BEGIN

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND policyname IN (
          'projects_select_policy',
          'projects_insert_policy',
          'projects_client_update_policy'
      );

    IF v_policy_count <> 3 THEN
        RAISE EXCEPTION
            '003 failed: expected 3 definitive project policies, found %',
            v_policy_count;
    END IF;


    SELECT COUNT(*)
    INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
          (
              p.proname = 'create_project'
              AND p.pronargs = 3
              AND p.proargtypes[0] = 'text'::regtype
              AND p.proargtypes[1] = 'timestamptz'::regtype
              AND p.proargtypes[2] = 'timestamptz'::regtype
          )
          OR
          (
              p.proname = 'create_project_by_worker'
              AND p.pronargs = 4
              AND p.proargtypes[0] = 'uuid'::regtype
              AND p.proargtypes[1] = 'text'::regtype
              AND p.proargtypes[2] = 'timestamptz'::regtype
              AND p.proargtypes[3] = 'timestamptz'::regtype
          )
          OR
          (
              p.proname = 'get_worker_projects'
              AND p.pronargs = 0
          )
          OR
          (
              p.proname = 'update_project_by_worker'
              AND p.pronargs = 3
              AND p.proargtypes[0] = 'uuid'::regtype
              AND p.proargtypes[1] = 'text'::regtype
              AND p.proargtypes[2] = 'text'::regtype
          )
      );

    IF v_function_count <> 4 THEN
        RAISE EXCEPTION
            '003 failed: expected 4 project functions with definitive signatures, found %',
            v_function_count;
    END IF;


    IF EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'projects'
          AND cmd = 'DELETE'
    ) THEN
        RAISE EXCEPTION '003 failed: DELETE policy exists on projects';
    END IF;


    SELECT p.proargnames
    INTO v_create_project_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_project'
      AND p.pronargs = 3
      AND p.proargtypes[0] = 'text'::regtype
      AND p.proargtypes[1] = 'timestamptz'::regtype
      AND p.proargtypes[2] = 'timestamptz'::regtype
    LIMIT 1;

    IF v_create_project_args IS DISTINCT FROM
       ARRAY['p_descripcion', 'p_fecha_inicio', 'p_fecha_fin']::TEXT[]
    THEN
        RAISE EXCEPTION
            '003 failed: create_project parameter names are incorrect. Found: %',
            v_create_project_args;
    END IF;

END $$;

COMMIT;