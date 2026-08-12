-- ============================================================
-- MODIRA
-- 003_projects.sql
--
-- SISTEMA COMPLETO DE PROYECTOS
--
-- Consolida:
--   - 008_projects_client_worker_rls.sql
--   - 009_create_project_rpc.sql
--   - 010_projects_management.sql
--   - 011_allow_projects_without_company.sql
--   - 013_allow_projects_without_company.sql
--   - 014_projects_company_optional.sql
--   - 015_worker_update_projects.sql
--
-- ============================================================
--
-- MODELO FINAL
--
-- CLIENTE CON EMPRESA
--   ↓
--   projects.company_id = company del usuario
--   projects.user_id    = auth.uid()
--
-- CLIENTE SIN EMPRESA
--   ↓
--   projects.company_id = NULL
--   projects.user_id    = auth.uid()
--
-- TRABAJADOR ACTIVO
--   ↓
--   puede consultar todos los proyectos
--   puede modificar nombre + estado mediante RPC
--   no puede crear proyectos
--   no puede eliminar proyectos
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
          AND table_name = 'projects'
    ) THEN
        RAISE EXCEPTION
            '003 stopped: public.projects does not exist';
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
            '003 stopped: current_user_company_id() does not exist';
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
            '003 stopped: current_user_is_worker() does not exist';
    END IF;

END $$;


-- ============================================================
-- 2. ESTADOS VÁLIDOS DE LOS PROYECTOS
--
-- Estados definidos por la arquitectura actual:
--
--   Pendiente
--   Activo
--   Pausado
--   Entregado
--   Completado
--
-- Pendiente es el estado inicial.
--
-- La documentación de la 010 establece estos cinco estados.
-- ============================================================

ALTER TABLE public.projects
    ALTER COLUMN estado SET DEFAULT 'Pendiente';


ALTER TABLE public.projects
    DROP CONSTRAINT IF EXISTS projects_estado_check;


ALTER TABLE public.projects
    ADD CONSTRAINT projects_estado_check
    CHECK (
        estado IN (
            'Pendiente',
            'Activo',
            'Pausado',
            'Entregado',
            'Completado'
        )
    );


-- ============================================================
-- 3. ASEGURAR QUE LOS CAMPOS CRÍTICOS NO SE PUEDAN OMITIR
--
-- user_id identifica al propietario/origen del proyecto.
-- nombre es siempre necesario.
-- ============================================================

ALTER TABLE public.projects
    ALTER COLUMN user_id SET NOT NULL;


ALTER TABLE public.projects
    ALTER COLUMN nombre SET NOT NULL;


ALTER TABLE public.projects
    ALTER COLUMN estado SET NOT NULL;


-- ============================================================
-- 4. ACTIVAR RLS
-- ============================================================

ALTER TABLE public.projects
    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. ELIMINAR POLÍTICAS PREVIAS
--
-- Esta migración nace en una instalación limpia, pero los DROP
-- hacen el bloque idempotente y evitan duplicados si se ejecuta
-- durante pruebas controladas.
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

DROP POLICY IF EXISTS projects_client_update_policy
ON public.projects;


-- ============================================================
-- 6. SELECT
--
-- TRABAJADOR ACTIVO
--   → todos los proyectos
--
-- CLIENTE CON EMPRESA
--   → proyectos de su empresa
--
-- CLIENTE SIN EMPRESA
--   → únicamente sus propios proyectos con company_id NULL
--
-- Un trabajador nunca utiliza las políticas del Área Cliente.
-- ============================================================

CREATE POLICY projects_select_policy
ON public.projects
FOR SELECT
TO authenticated
USING (

    -- --------------------------------------------------------
    -- TRABAJADOR ACTIVO
    -- --------------------------------------------------------

    public.current_user_is_worker()

    OR

    -- --------------------------------------------------------
    -- CLIENTE
    -- --------------------------------------------------------

    (
        NOT public.current_user_is_worker()

        AND

        (
            -- Cliente con empresa
            (
                public.current_user_company_id() IS NOT NULL
                AND
                company_id = public.current_user_company_id()
            )

            OR

            -- Cliente sin empresa
            (
                public.current_user_company_id() IS NULL
                AND
                company_id IS NULL
                AND
                user_id = auth.uid()
            )
        )
    )
);


-- ============================================================
-- 7. INSERT
--
-- ÚNICAMENTE CLIENTES.
--
-- El frontend NO decide:
--
--   user_id
--   company_id
--
-- La RPC create_project() se encarga de ello.
--
-- Aun así, mantenemos una policy INSERT segura para impedir
-- que alguien intente insertar directamente datos pertenecientes
-- a otra empresa.
--
-- CLIENTE CON EMPRESA
--   company_id = su empresa
--   user_id = auth.uid()
--
-- CLIENTE SIN EMPRESA
--   company_id = NULL
--   user_id = auth.uid()
--
-- TRABAJADOR
--   → NO INSERT
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
        -- Cliente con empresa
        (
            public.current_user_company_id() IS NOT NULL
            AND
            company_id = public.current_user_company_id()
        )

        OR

        -- Cliente sin empresa
        (
            public.current_user_company_id() IS NULL
            AND
            company_id IS NULL
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
-- 8. UPDATE PARA CLIENTES
--
-- El comportamiento documentado posteriormente en la 013
-- permite al cliente modificar sus propios proyectos.
--
-- IMPORTANTE:
--
-- El cliente NO puede cambiar:
--
--   user_id
--   company_id
--
-- Esto evita que pueda:
--
--   - transferir el proyecto a otro usuario
--   - moverlo a otra empresa
--   - utilizar el UPDATE para romper el aislamiento.
--
-- La protección de columnas se completa mediante GRANT
-- específico más abajo.
-- ============================================================

CREATE POLICY projects_client_update_policy
ON public.projects
FOR UPDATE
TO authenticated
USING (

    NOT public.current_user_is_worker()

    AND user_id = auth.uid()

    AND
    (
        -- Cliente con empresa
        (
            public.current_user_company_id() IS NOT NULL
            AND
            company_id = public.current_user_company_id()
        )

        OR

        -- Cliente sin empresa
        (
            public.current_user_company_id() IS NULL
            AND
            company_id IS NULL
        )
    )
)
WITH CHECK (

    NOT public.current_user_is_worker()

    AND user_id = auth.uid()

    AND
    (
        -- Cliente con empresa
        (
            public.current_user_company_id() IS NOT NULL
            AND
            company_id = public.current_user_company_id()
        )

        OR

        -- Cliente sin empresa
        (
            public.current_user_company_id() IS NULL
            AND
            company_id IS NULL
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
-- 9. UPDATE PARA TRABAJADORES
--
-- Los trabajadores activos pueden modificar únicamente:
--
--   nombre
--   estado
--
-- La policy comprueba:
--
--   trabajador activo
--   estado válido
--
-- La restricción de columnas se aplica posteriormente mediante
-- permisos PostgreSQL.
-- ============================================================




-- ============================================================
-- 10. DELETE
--
-- NO existe ninguna policy DELETE.
--
-- Resultado:
--
-- CLIENTE     → ❌
-- TRABAJADOR  → ❌
-- ============================================================

-- Intencionadamente no se crea ninguna policy DELETE.


-- ============================================================
-- 11. PERMISOS POSTGRESQL DE PROJECTS
--
-- RLS decide qué filas pueden utilizarse.
--
-- GRANT decide qué operaciones/columnas puede intentar el rol.
--
-- ============================================================


-- ------------------------------------------------------------
-- SELECT
-- ------------------------------------------------------------

GRANT SELECT
ON public.projects
TO authenticated;


-- ------------------------------------------------------------
-- INSERT
-- ------------------------------------------------------------

GRANT INSERT
ON public.projects
TO authenticated;


-- ------------------------------------------------------------
-- UPDATE
--
-- Primero eliminamos UPDATE general.
--
-- Después concedemos únicamente las columnas que deben poder
-- modificarse desde el frontend:
--
--   nombre
--   estado
--
-- Esto evita que un cliente o trabajador pueda modificar:
--
--   user_id
--   company_id
--   descripcion
--   fechas
--   etc.
-- ------------------------------------------------------------

REVOKE UPDATE
ON public.projects
FROM authenticated;


GRANT UPDATE (
    nombre,
    estado
)
ON public.projects
TO authenticated;


-- ------------------------------------------------------------
-- DELETE
-- ------------------------------------------------------------

REVOKE DELETE
ON public.projects
FROM authenticated;


-- ============================================================
-- 12. FUNCIÓN create_project()
--
-- Esta es la versión FINAL.
--
-- El frontend proporciona únicamente:
--
--   p_descripcion
--   p_fecha_inicio
--   p_fecha_fin
--
-- La base de datos determina:
--
--   user_id
--   company_id
--
-- mediante la sesión autenticada.
--
-- Esto permite:
--
-- CLIENTE CON EMPRESA
--   company_id = empresa
--
-- CLIENTE SIN EMPRESA
--   company_id = NULL
--
-- El nombre inicial es:
--
--   Proyecto sin título
--
-- y el estado:
--
--   Pendiente
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_project(
    p_descripcion TEXT,
    p_fecha_inicio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    p_fecha_fin TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_project public.projects;
BEGIN

    -- --------------------------------------------------------
    -- Usuario autenticado
    -- --------------------------------------------------------

    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION
            'Usuario no autenticado';
    END IF;


    -- --------------------------------------------------------
    -- Solo clientes
    -- --------------------------------------------------------

    IF public.current_user_is_worker() THEN
        RAISE EXCEPTION
            'Los trabajadores no pueden crear proyectos';
    END IF;


    -- --------------------------------------------------------
    -- Obtener empresa desde el perfil
    --
    -- Puede devolver NULL.
    -- Esto es correcto para clientes sin empresa.
    -- --------------------------------------------------------

    v_company_id := public.current_user_company_id();


    -- --------------------------------------------------------
    -- Descripción obligatoria
    -- --------------------------------------------------------

    IF p_descripcion IS NULL
       OR trim(p_descripcion) = '' THEN

        RAISE EXCEPTION
            'La descripción del proyecto es obligatoria';

    END IF;


    -- --------------------------------------------------------
    -- Fecha final
    --
    -- Si existe, no puede ser anterior a la fecha de inicio.
    -- --------------------------------------------------------

    IF p_fecha_fin IS NOT NULL
       AND p_fecha_inicio IS NOT NULL
       AND p_fecha_fin < p_fecha_inicio THEN

        RAISE EXCEPTION
            'La fecha de fin no puede ser anterior a la fecha de inicio';

    END IF;


    -- --------------------------------------------------------
    -- Crear proyecto
    -- --------------------------------------------------------

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
        v_user_id,
        v_company_id,
        'Proyecto sin título',
        trim(p_descripcion),
        'Pendiente',
        COALESCE(p_fecha_inicio, CURRENT_TIMESTAMP),
        p_fecha_fin
    )
    RETURNING *
    INTO v_project;


    RETURN v_project;

END;
$$;


-- ============================================================
-- 13. PERMISOS DE create_project()
-- ============================================================

REVOKE ALL
ON FUNCTION public.create_project(
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.create_project(
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ
)
TO authenticated;


-- Nadie anónimo puede crear proyectos.
REVOKE EXECUTE
ON FUNCTION public.create_project(
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ
)
FROM anon;


-- ============================================================
-- 14. FUNCIÓN get_worker_projects()
--
-- Función específica del Área de Empleados.
--
-- Devuelve:
--
--   proyecto
--   cliente
--   email
--   empresa
--
-- Solo puede ejecutarla un trabajador activo.
--
-- SECURITY DEFINER permite consultar auth.users de forma
-- controlada sin exponer esa tabla directamente al frontend.
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

    -- --------------------------------------------------------
    -- Comprobar trabajador activo
    -- --------------------------------------------------------

    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION
            'Acceso denegado: se requiere rol de trabajador activo';
    END IF;


    -- --------------------------------------------------------
    -- Obtener proyectos
    -- --------------------------------------------------------

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

        COALESCE(
            pr.nombre,
            'Sin nombre'
        ) AS cliente_nombre,

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


-- ============================================================
-- 15. PERMISOS get_worker_projects()
-- ============================================================

REVOKE ALL
ON FUNCTION public.get_worker_projects()
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.get_worker_projects()
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.get_worker_projects()
FROM anon;


-- ============================================================
-- 16. FUNCIÓN update_project_by_worker()
--
-- Permite a un trabajador activo modificar:
--
--   nombre
--   estado
--
-- No permite:
--
--   user_id
--   company_id
--   descripcion
--   fecha_inicio
--   fecha_fin
--
-- El trabajador activo se comprueba explícitamente.
--
-- Los parámetros pueden ser NULL:
--
--   p_nombre = NULL
--   → mantiene nombre actual
--
--   p_estado = NULL
--   → mantiene estado actual
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_project_by_worker(
    p_project_id UUID,
    p_nombre TEXT DEFAULT NULL,
    p_estado TEXT DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_project public.projects;
BEGIN

    -- --------------------------------------------------------
    -- Comprobar trabajador activo
    -- --------------------------------------------------------

    IF NOT public.current_user_is_worker() THEN

        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';

    END IF;


    -- --------------------------------------------------------
    -- Validar estado
    -- --------------------------------------------------------

    IF p_estado IS NOT NULL
       AND p_estado NOT IN (
            'Pendiente',
            'Activo',
            'Pausado',
            'Entregado',
            'Completado'
       ) THEN

        RAISE EXCEPTION
            'Estado de proyecto no válido: %',
            p_estado;

    END IF;


    -- --------------------------------------------------------
    -- Validar nombre
    --
    -- Si se proporciona, no puede estar vacío.
    -- --------------------------------------------------------

    IF p_nombre IS NOT NULL
       AND trim(p_nombre) = '' THEN

        RAISE EXCEPTION
            'El nombre del proyecto no puede estar vacío';

    END IF;


    -- --------------------------------------------------------
    -- Comprobar que el proyecto existe
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = p_project_id
    ) THEN

        RAISE EXCEPTION
            'Proyecto no encontrado';

    END IF;


    -- --------------------------------------------------------
    -- Actualizar únicamente nombre y estado
    -- --------------------------------------------------------

    UPDATE public.projects
    SET
        nombre = CASE
            WHEN p_nombre IS NULL
                THEN nombre
            ELSE trim(p_nombre)
        END,

        estado = COALESCE(
            p_estado,
            estado
        ),

        updated_at = CURRENT_TIMESTAMP

    WHERE id = p_project_id

    RETURNING *
    INTO v_project;


    RETURN v_project;

END;
$$;


-- ============================================================
-- 17. PERMISOS update_project_by_worker()
-- ============================================================

REVOKE ALL
ON FUNCTION public.update_project_by_worker(
    UUID,
    TEXT,
    TEXT
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.update_project_by_worker(
    UUID,
    TEXT,
    TEXT
)
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.update_project_by_worker(
    UUID,
    TEXT,
    TEXT
)
FROM anon;


-- ============================================================
-- 18. SEGURIDAD ADICIONAL DE LAS RPC
--
-- Evitamos que el buscador de funciones pueda utilizar
-- search_path externo para resolver objetos inesperados.
-- ============================================================

ALTER FUNCTION public.create_project(
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ
)
SET search_path = public;


ALTER FUNCTION public.get_worker_projects()
SET search_path = public, auth, pg_temp;


ALTER FUNCTION public.update_project_by_worker(
    UUID,
    TEXT,
    TEXT
)
SET search_path = public, auth, pg_temp;


-- ============================================================
-- 19. ÍNDICE ADICIONAL
--
-- Facilita la consulta de proyectos de un usuario.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_projects_user_company
ON public.projects (
    user_id,
    company_id
);


-- ============================================================
-- 20. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_policy_count INTEGER;
    v_function_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- RLS
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_class
        WHERE oid = 'public.projects'::regclass
          AND relrowsecurity = TRUE
    ) THEN

        RAISE EXCEPTION
            '003 failed: RLS is not enabled on projects';

    END IF;


    -- --------------------------------------------------------
    -- SELECT policy
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND policyname = 'projects_select_policy';

    IF v_policy_count <> 1 THEN

        RAISE EXCEPTION
            '003 failed: projects_select_policy missing';

    END IF;


    -- --------------------------------------------------------
    -- INSERT policy
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND policyname = 'projects_insert_policy';

    IF v_policy_count <> 1 THEN

        RAISE EXCEPTION
            '003 failed: projects_insert_policy missing';

    END IF;


    -- --------------------------------------------------------
    -- Client UPDATE policy
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND policyname = 'projects_client_update_policy';

    IF v_policy_count <> 1 THEN

        RAISE EXCEPTION
            '003 failed: projects_client_update_policy missing';

    END IF;


 


    -- --------------------------------------------------------
    -- No DELETE policy
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND cmd = 'DELETE';

    IF v_policy_count <> 0 THEN

        RAISE EXCEPTION
            '003 failed: DELETE policy exists on projects';

    END IF;


    -- --------------------------------------------------------
    -- RPCs
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
          'create_project',
          'get_worker_projects',
          'update_project_by_worker'
      );

    IF v_function_count <> 3 THEN

        RAISE EXCEPTION
            '003 failed: expected 3 project functions, found %',
            v_function_count;

    END IF;


    -- --------------------------------------------------------
    -- company_id debe aceptar NULL
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'company_id'
          AND is_nullable = 'YES'
    ) THEN

        RAISE EXCEPTION
            '003 failed: projects.company_id must allow NULL';

    END IF;


    -- --------------------------------------------------------
    -- estado
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.projects'::regclass
          AND conname = 'projects_estado_check'
    ) THEN

        RAISE EXCEPTION
            '003 failed: projects_estado_check missing';

    END IF;


END $$;


COMMIT;


-- ============================================================
-- RESULTADO FINAL
--
-- CLIENTE CON EMPRESA
--   ↓
-- SELECT → proyectos de su empresa
-- INSERT → proyectos de su empresa
-- UPDATE → sus propios proyectos
-- DELETE → ❌
--
--
-- CLIENTE SIN EMPRESA
--   ↓
-- SELECT → sus propios proyectos con company_id NULL
-- INSERT → proyectos propios con company_id NULL
-- UPDATE → sus propios proyectos
-- DELETE → ❌
--
--
-- TRABAJADOR ACTIVO
--   ↓
-- get_worker_projects()
--       → todos los proyectos
--
-- update_project_by_worker()
--       → nombre
--       → estado
--
-- INSERT → ❌
-- DELETE → ❌
--
--
-- TRABAJADOR INACTIVO
--   ↓
-- current_user_is_worker() = FALSE
--   ↓
-- no acceso al sistema de proyectos como worker
--
-- ============================================================