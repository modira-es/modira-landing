BEGIN;

-- ============================================================
-- MODIRA — 014_project_change_requests.sql
--
-- SOLICITUDES DE CAMBIO DE PROYECTOS
--
-- OBJETIVO
-- ============================================================
--
-- Esta migración transforma la edición de proyectos por parte
-- del cliente en un sistema controlado de solicitudes de cambio.
--
--
-- MODELO FINAL
-- ============================================================
--
-- CLIENTE
-- -------
--
-- Puede:
--
--   - consultar sus proyectos;
--   - consultar sus solicitudes de cambio;
--   - crear una solicitud de cambio si el proyecto tiene
--     habilitado el periodo de solicitudes y el plazo no ha
--     expirado;
--   - consultar el estado y la respuesta del trabajador.
--
-- NO puede:
--
--   - modificar directamente projects;
--   - cambiar nombre;
--   - cambiar descripción;
--   - cambiar fechas;
--   - cambiar estado;
--   - modificar user_id;
--   - modificar company_id;
--   - modificar client_id.
--
--
-- WORKER ACTIVO
-- -------------
--
-- Puede:
--
--   - consultar todos los proyectos;
--   - crear proyectos mediante la RPC existente;
--   - modificar nombre + estado mediante
--     update_project_by_worker();
--   - configurar el periodo de solicitudes de un proyecto;
--   - consultar todas las solicitudes;
--   - poner una solicitud en revisión;
--   - aceptarla;
--   - rechazarla;
--   - marcarla como completada después de realizar el cambio;
--   - añadir comentarios/notas;
--
--
-- IMPORTANTE
-- ==========
--
-- ACEPTAR UNA SOLICITUD NO MODIFICA AUTOMÁTICAMENTE EL PROYECTO.
--
-- El flujo es:
--
--     Cliente solicita
--           ↓
--        Pendiente
--           ↓
--       En revisión
--           ↓
--        Aceptada
--           ↓
--    Worker realiza cambio
--           ↓
--       Completada
--
--
-- Si se rechaza:
--
--     Pendiente / En revisión
--             ↓
--          Rechazada
--
--
-- De esta forma la solicitud representa una petición y no una
-- modificación automática de datos del proyecto.
--
--
-- ============================================================
-- CONFIGURACIÓN DEL PERIODO
-- ============================================================
--
-- Cada proyecto incorpora:
--
--     change_requests_enabled
--     change_requests_deadline
--
--
-- Ejemplo:
--
--     change_requests_enabled = TRUE
--     change_requests_deadline = 2026-09-15 23:59:59
--
--
-- El cliente podrá solicitar cambios mientras:
--
--     change_requests_enabled = TRUE
--
-- Y:
--
--     CURRENT_TIMESTAMP <= change_requests_deadline
--
--
-- La comprobación se realiza EN LA BASE DE DATOS.
--
-- El frontend únicamente debe utilizar estos valores para
-- mostrar/ocultar la interfaz.
--
--
-- ============================================================
-- SOLICITUDES ACTIVAS
-- ============================================================
--
-- Un mismo proyecto no puede tener simultáneamente más de una
-- solicitud activa.
--
-- Estados considerados activos:
--
--     pending
--     in_review
--     accepted
--
--
-- Una vez:
--
--     completed
--
-- o:
--
--     rejected
--
-- el proyecto puede volver a recibir otra solicitud mientras
-- el plazo siga abierto.
--
--
-- ============================================================


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    -- --------------------------------------------------------
    -- PROJECTS
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE
            table_schema = 'public'
            AND table_name = 'projects'
    ) THEN

        RAISE EXCEPTION
            '014 stopped: public.projects does not exist';

    END IF;


    -- --------------------------------------------------------
    -- projects.id
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE
            table_schema = 'public'
            AND table_name = 'projects'
            AND column_name = 'id'
    ) THEN

        RAISE EXCEPTION
            '014 stopped: projects.id does not exist';

    END IF;


    -- --------------------------------------------------------
    -- projects.user_id
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE
            table_schema = 'public'
            AND table_name = 'projects'
            AND column_name = 'user_id'
    ) THEN

        RAISE EXCEPTION
            '014 stopped: projects.user_id does not exist';

    END IF;


    -- --------------------------------------------------------
    -- projects.company_id
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE
            table_schema = 'public'
            AND table_name = 'projects'
            AND column_name = 'company_id'
    ) THEN

        RAISE EXCEPTION
            '014 stopped: projects.company_id does not exist';

    END IF;


    -- --------------------------------------------------------
    -- current_user_is_worker()
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
            ON n.oid = p.pronamespace
        WHERE
            n.nspname = 'public'
            AND p.proname = 'current_user_is_worker'
    ) THEN

        RAISE EXCEPTION
            '014 stopped: current_user_is_worker() does not exist';

    END IF;


    -- --------------------------------------------------------
    -- activity_log
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE
            table_schema = 'public'
            AND table_name = 'activity_log'
    ) THEN

        RAISE EXCEPTION
            '014 stopped: public.activity_log does not exist';

    END IF;

END $$;


-- ============================================================
-- 2. CONFIGURACIÓN DE SOLICITUDES EN PROJECTS
-- ============================================================
--
-- No se crea una tabla adicional para dos valores simples.
--
-- La configuración pertenece directamente al proyecto.
--
-- Por defecto:
--
--     change_requests_enabled = FALSE
--     change_requests_deadline = NULL
--
-- Esto significa que los proyectos existentes NO quedan
-- automáticamente abiertos a solicitudes de cambio.
--
-- El worker deberá habilitarlos explícitamente.
--
-- ============================================================

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS
    change_requests_enabled BOOLEAN
    NOT NULL
    DEFAULT FALSE;


ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS
    change_requests_deadline TIMESTAMPTZ;


-- ============================================================
-- 3. CONSTRAINT DE CONFIGURACIÓN
-- ============================================================
--
-- Si las solicitudes están habilitadas, debe existir una fecha
-- límite.
--
-- Si están deshabilitadas, la fecha puede ser NULL.
--
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE
            conrelid = 'public.projects'::regclass
            AND conname = 'projects_change_requests_config_check'
    ) THEN

        ALTER TABLE public.projects
        ADD CONSTRAINT
            projects_change_requests_config_check
        CHECK (
            change_requests_enabled = FALSE
            OR
            change_requests_deadline IS NOT NULL
        );

    END IF;

END $$;


-- ============================================================
-- 4. ÍNDICE DE CONFIGURACIÓN
-- ============================================================

CREATE INDEX IF NOT EXISTS
    idx_projects_change_requests_enabled_deadline
ON public.projects (
    change_requests_enabled,
    change_requests_deadline
);


-- ============================================================
-- 5. TABLA PROJECT_CHANGE_REQUESTS
-- ============================================================
--
-- Esta tabla representa cada petición realizada por un cliente.
--
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_change_requests (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,

    user_id UUID NOT NULL,

    company_id UUID,

    client_id UUID,

    description TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending',

    reviewed_by UUID,

    reviewed_at TIMESTAMPTZ,

    review_notes TEXT,

    accepted_at TIMESTAMPTZ,

    completed_by UUID,

    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,


    -- --------------------------------------------------------
    -- PROJECT
    -- --------------------------------------------------------

    CONSTRAINT
        project_change_requests_project_fk
    FOREIGN KEY (
        project_id
    )
    REFERENCES public.projects(id)
    ON DELETE CASCADE,


    -- --------------------------------------------------------
    -- USER
    -- --------------------------------------------------------

    CONSTRAINT
        project_change_requests_user_fk
    FOREIGN KEY (
        user_id
    )
    REFERENCES auth.users(id)
    ON DELETE CASCADE,


    -- --------------------------------------------------------
    -- COMPANY
    -- --------------------------------------------------------

    CONSTRAINT
        project_change_requests_company_fk
    FOREIGN KEY (
        company_id
    )
    REFERENCES public.companies(id)
    ON DELETE SET NULL,


    -- --------------------------------------------------------
    -- CLIENT
    -- --------------------------------------------------------

    CONSTRAINT
        project_change_requests_client_fk
    FOREIGN KEY (
        client_id
    )
    REFERENCES public.clients(id)
    ON DELETE SET NULL,


    -- --------------------------------------------------------
    -- WORKER QUE REVISA
    -- --------------------------------------------------------

    CONSTRAINT
        project_change_requests_reviewed_by_fk
    FOREIGN KEY (
        reviewed_by
    )
    REFERENCES public.workers(id)
    ON DELETE SET NULL,


    -- --------------------------------------------------------
    -- WORKER QUE COMPLETA
    -- --------------------------------------------------------

    CONSTRAINT
        project_change_requests_completed_by_fk
    FOREIGN KEY (
        completed_by
    )
    REFERENCES public.workers(id)
    ON DELETE SET NULL,


    -- --------------------------------------------------------
    -- ESTADOS
    -- --------------------------------------------------------

    CONSTRAINT
        project_change_requests_status_check
    CHECK (
        status IN (
            'pending',
            'in_review',
            'accepted',
            'rejected',
            'completed'
        )
    ),


    -- --------------------------------------------------------
    -- DESCRIPCIÓN
    -- --------------------------------------------------------

    CONSTRAINT
        project_change_requests_description_check
    CHECK (
        length(btrim(description)) > 0
        AND
        length(description) <= 5000
    ),


    -- --------------------------------------------------------
    -- REVIEW NOTES
    -- --------------------------------------------------------

    CONSTRAINT
        project_change_requests_review_notes_check
    CHECK (
        review_notes IS NULL
        OR
        length(review_notes) <= 5000
    )

);


-- ============================================================
-- 6. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS
    idx_project_change_requests_project_id
ON public.project_change_requests (
    project_id
);


CREATE INDEX IF NOT EXISTS
    idx_project_change_requests_user_id
ON public.project_change_requests (
    user_id
);


CREATE INDEX IF NOT EXISTS
    idx_project_change_requests_company_id
ON public.project_change_requests (
    company_id
);


CREATE INDEX IF NOT EXISTS
    idx_project_change_requests_client_id
ON public.project_change_requests (
    client_id
);


CREATE INDEX IF NOT EXISTS
    idx_project_change_requests_status
ON public.project_change_requests (
    status
);


CREATE INDEX IF NOT EXISTS
    idx_project_change_requests_created_at
ON public.project_change_requests (
    created_at DESC
);


CREATE INDEX IF NOT EXISTS
    idx_project_change_requests_reviewed_by
ON public.project_change_requests (
    reviewed_by
);


CREATE INDEX IF NOT EXISTS
    idx_project_change_requests_completed_by
ON public.project_change_requests (
    completed_by
);


-- ============================================================
-- 7. UNA SOLICITUD ACTIVA POR PROYECTO
-- ============================================================
--
-- No permitimos:
--
--     Proyecto A
--       ├── Solicitud pending
--       ├── Solicitud in_review
--       └── Solicitud accepted
--
-- simultáneamente.
--
-- Esto evita que dos trabajadores gestionen modificaciones
-- paralelas sobre el mismo proyecto.
--
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
    idx_project_change_requests_one_active_per_project
ON public.project_change_requests (
    project_id
)
WHERE status IN (
    'pending',
    'in_review',
    'accepted'
);


-- ============================================================
-- 8. RLS
-- ============================================================

ALTER TABLE public.project_change_requests
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 9. ELIMINAR POLICIES PREVIAS
-- ============================================================

DROP POLICY IF EXISTS
    project_change_requests_select
ON public.project_change_requests;


DROP POLICY IF EXISTS
    project_change_requests_insert
ON public.project_change_requests;


DROP POLICY IF EXISTS
    project_change_requests_update
ON public.project_change_requests;


DROP POLICY IF EXISTS
    project_change_requests_delete
ON public.project_change_requests;


-- ============================================================
-- 10. SELECT — CLIENTE + WORKER
-- ============================================================
--
-- CLIENTE:
--     únicamente solicitudes de proyectos cuyo propietario
--     es auth.uid().
--
-- WORKER:
--     todas.
--
-- ============================================================

CREATE POLICY
    project_change_requests_select
ON public.project_change_requests
FOR SELECT
TO authenticated
USING (

    public.current_user_is_worker()

    OR

    (
        NOT public.current_user_is_worker()

        AND

        EXISTS (
            SELECT 1
            FROM public.projects p
            WHERE
                p.id = project_change_requests.project_id
                AND p.user_id = auth.uid()
        )
    )

);


-- ============================================================
-- 11. NO ESCRITURA DIRECTA
-- ============================================================
--
-- Tanto cliente como worker utilizan RPCs.
--
-- CLIENTE:
--
--     request_project_change()
--
-- WORKER:
--
--     configure_project_change_requests()
--     resolve_project_change_request()
--
-- No se permite:
--
--     INSERT directo
--     UPDATE directo
--     DELETE directo
--
-- Esto evita que el frontend pueda manipular:
--
--     status
--     reviewed_by
--     reviewed_at
--     accepted_at
--     completed_by
--     completed_at
--     user_id
--     company_id
--     project_id
--
-- ============================================================


GRANT SELECT
ON public.project_change_requests
TO authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.project_change_requests
FROM authenticated, anon;


-- ============================================================
-- 12. ELIMINAR EDICIÓN DIRECTA DEL CLIENTE SOBRE PROJECTS
-- ============================================================
--
-- La 003 original contiene:
--
--     projects_client_update_policy
--
-- Esa policy permitía al cliente modificar directamente
-- su proyecto.
--
-- A partir de esta migración deja de existir.
--
-- ============================================================

DROP POLICY IF EXISTS
    projects_client_update_policy
ON public.projects;


-- ============================================================
-- 13. ELIMINAR PRIVILEGIO UPDATE DIRECTO SOBRE PROJECTS
-- ============================================================
--
-- El worker modifica proyectos mediante:
--
--     update_project_by_worker()
--
-- que es SECURITY DEFINER.
--
-- Por tanto authenticated no necesita UPDATE directo.
--
-- Esto garantiza que el cliente no pueda intentar modificar
-- projects directamente desde el Data API.
--
-- ============================================================

REVOKE UPDATE
ON public.projects
FROM authenticated;


-- ============================================================
-- 14. RPC — CONFIGURE PROJECT CHANGE REQUESTS
-- ============================================================
--
-- Firma:
--
--     configure_project_change_requests(
--         p_project_id,
--         p_enabled,
--         p_deadline
--     )
--
--
-- SOLO WORKER ACTIVO.
--
-- Ejemplo para habilitar durante 30 días:
--
--     p_enabled = TRUE
--     p_deadline = fecha calculada por el frontend
--
--
-- Para cerrar solicitudes:
--
--     p_enabled = FALSE
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.configure_project_change_requests(
    p_project_id UUID,
    p_enabled BOOLEAN,
    p_deadline TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE

    v_project public.projects;

BEGIN

    -- --------------------------------------------------------
    -- AUTENTICACIÓN
    -- --------------------------------------------------------

    IF auth.uid() IS NULL THEN

        RAISE EXCEPTION
            'Usuario no autenticado';

    END IF;


    -- --------------------------------------------------------
    -- WORKER
    -- --------------------------------------------------------

    IF NOT public.current_user_is_worker() THEN

        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';

    END IF;


    -- --------------------------------------------------------
    -- PROJECT_ID
    -- --------------------------------------------------------

    IF p_project_id IS NULL THEN

        RAISE EXCEPTION
            'El proyecto es obligatorio';

    END IF;


    -- --------------------------------------------------------
    -- ENABLED
    -- --------------------------------------------------------

    IF p_enabled IS NULL THEN

        RAISE EXCEPTION
            'La configuración de solicitudes es obligatoria';

    END IF;


    -- --------------------------------------------------------
    -- DEADLINE
    -- --------------------------------------------------------

    IF p_enabled = TRUE
       AND p_deadline IS NULL
    THEN

        RAISE EXCEPTION
            'Debe establecerse una fecha límite cuando las solicitudes están habilitadas';

    END IF;


    -- --------------------------------------------------------
    -- OBTENER PROYECTO
    -- --------------------------------------------------------

    SELECT *
    INTO v_project
    FROM public.projects
    WHERE id = p_project_id
    FOR UPDATE;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'Proyecto no encontrado';

    END IF;


    -- --------------------------------------------------------
    -- ACTUALIZAR
    -- --------------------------------------------------------

    UPDATE public.projects
    SET
        change_requests_enabled = p_enabled,

        change_requests_deadline =
            CASE
                WHEN p_enabled = FALSE
                    THEN p_deadline
                ELSE
                    p_deadline
            END,

        updated_at = CURRENT_TIMESTAMP

    WHERE id = p_project_id

    RETURNING *
    INTO v_project;


    -- --------------------------------------------------------
    -- ACTIVITY LOG
    -- --------------------------------------------------------

    INSERT INTO public.activity_log (
        user_id,
        company_id,
        action,
        resource_type,
        resource_id,
        description,
        metadata
    )
    VALUES (
        auth.uid(),
        v_project.company_id,
        'project.change_requests_configured',
        'project',
        v_project.id,
        CASE
            WHEN p_enabled = TRUE
                THEN 'Periodo de solicitudes de cambio habilitado'
            ELSE
                'Solicitudes de cambio deshabilitadas'
        END,
        jsonb_build_object(
            'enabled', p_enabled,
            'deadline', p_deadline
        )
    );


    RETURN v_project;

END;
$$;


-- ============================================================
-- 15. PERMISOS CONFIGURE
-- ============================================================

REVOKE ALL
ON FUNCTION public.configure_project_change_requests(
    UUID,
    BOOLEAN,
    TIMESTAMPTZ
)
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE
ON FUNCTION public.configure_project_change_requests(
    UUID,
    BOOLEAN,
    TIMESTAMPTZ
)
TO authenticated;


-- ============================================================
-- 16. RPC — REQUEST PROJECT CHANGE
-- ============================================================
--
-- Firma:
--
--     request_project_change(
--         p_project_id,
--         p_description
--     )
--
--
-- SOLO CLIENTE.
--
-- El sistema comprueba EN BD:
--
--     - autenticación
--     - que no sea worker
--     - proyecto existente
--     - proyecto perteneciente al cliente
--     - solicitudes habilitadas
--     - deadline existente
--     - deadline no expirado
--     - descripción válida
--     - que no exista otra solicitud activa
--
-- El cliente NO proporciona:
--
--     user_id
--     company_id
--     client_id
--     status
--     created_at
--
-- Todo se obtiene de la base de datos.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.request_project_change(
    p_project_id UUID,
    p_description TEXT
)
RETURNS public.project_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE

    v_project public.projects;

    v_request public.project_change_requests;

BEGIN

    -- --------------------------------------------------------
    -- AUTENTICACIÓN
    -- --------------------------------------------------------

    IF auth.uid() IS NULL THEN

        RAISE EXCEPTION
            'Usuario no autenticado';

    END IF;


    -- --------------------------------------------------------
    -- CLIENTE
    -- --------------------------------------------------------

    IF public.current_user_is_worker() THEN

        RAISE EXCEPTION
            'Los trabajadores no pueden crear solicitudes de cambio de cliente';

    END IF;


    -- --------------------------------------------------------
    -- PROJECT_ID
    -- --------------------------------------------------------

    IF p_project_id IS NULL THEN

        RAISE EXCEPTION
            'El proyecto es obligatorio';

    END IF;


    -- --------------------------------------------------------
    -- DESCRIPCIÓN
    -- --------------------------------------------------------

    IF p_description IS NULL
       OR btrim(p_description) = ''
    THEN

        RAISE EXCEPTION
            'La descripción del cambio es obligatoria';

    END IF;


    IF length(p_description) > 5000 THEN

        RAISE EXCEPTION
            'La descripción del cambio no puede superar 5000 caracteres';

    END IF;


    -- --------------------------------------------------------
    -- OBTENER PROYECTO
    -- --------------------------------------------------------

    SELECT *
    INTO v_project
    FROM public.projects
    WHERE
        id = p_project_id
        AND user_id = auth.uid()
    FOR UPDATE;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'El proyecto no existe o no pertenece al usuario autenticado';

    END IF;


    -- --------------------------------------------------------
    -- SOLICITUDES HABILITADAS
    -- --------------------------------------------------------

    IF v_project.change_requests_enabled IS NOT TRUE THEN

        RAISE EXCEPTION
            'Las solicitudes de cambio no están habilitadas para este proyecto';

    END IF;


    -- --------------------------------------------------------
    -- DEADLINE
    -- --------------------------------------------------------

    IF v_project.change_requests_deadline IS NULL THEN

        RAISE EXCEPTION
            'El proyecto no tiene una fecha límite de solicitudes configurada';

    END IF;


    IF CURRENT_TIMESTAMP >
       v_project.change_requests_deadline
    THEN

        RAISE EXCEPTION
            'El periodo para solicitar cambios ha finalizado';

    END IF;


    -- --------------------------------------------------------
    -- COMPROBAR SOLICITUD ACTIVA
    -- --------------------------------------------------------

    IF EXISTS (
        SELECT 1
        FROM public.project_change_requests r
        WHERE
            r.project_id = v_project.id
            AND r.status IN (
                'pending',
                'in_review',
                'accepted'
            )
    ) THEN

        RAISE EXCEPTION
            'Este proyecto ya tiene una solicitud de cambio en curso';

    END IF;


    -- --------------------------------------------------------
    -- CREAR SOLICITUD
    -- --------------------------------------------------------

    INSERT INTO public.project_change_requests (
        project_id,
        user_id,
        company_id,
        client_id,
        description,
        status
    )
    VALUES (
        v_project.id,
        auth.uid(),
        v_project.company_id,
        v_project.client_id,
        btrim(p_description),
        'pending'
    )
    RETURNING *
    INTO v_request;


    -- --------------------------------------------------------
    -- ACTIVITY LOG
    -- --------------------------------------------------------

    INSERT INTO public.activity_log (
        user_id,
        company_id,
        action,
        resource_type,
        resource_id,
        description,
        metadata
    )
    VALUES (
        auth.uid(),
        v_project.company_id,
        'project.change_request_created',
        'project_change_request',
        v_request.id,
        'El cliente ha solicitado un cambio en el proyecto',
        jsonb_build_object(
            'project_id', v_project.id,
            'description', v_request.description
        )
    );


    RETURN v_request;

END;
$$;


-- ============================================================
-- 17. PERMISOS REQUEST
-- ============================================================

REVOKE ALL
ON FUNCTION public.request_project_change(
    UUID,
    TEXT
)
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE
ON FUNCTION public.request_project_change(
    UUID,
    TEXT
)
TO authenticated;


-- ============================================================
-- 18. RPC — GET WORKER PROJECT CHANGE REQUESTS
-- ============================================================
--
-- Devuelve todas las solicitudes para el área de trabajador.
--
-- Se utiliza una RPC para proporcionar además información útil
-- del proyecto y del cliente sin abrir tablas adicionales.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_worker_project_change_requests()
RETURNS TABLE (
    id UUID,
    project_id UUID,
    project_nombre TEXT,
    user_id UUID,
    cliente_nombre TEXT,
    cliente_email TEXT,
    company_id UUID,
    client_id UUID,
    description TEXT,
    status TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    accepted_at TIMESTAMPTZ,
    completed_by UUID,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    change_requests_enabled BOOLEAN,
    change_requests_deadline TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN

    -- --------------------------------------------------------
    -- WORKER
    -- --------------------------------------------------------

    IF NOT public.current_user_is_worker() THEN

        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';

    END IF;


    RETURN QUERY

    SELECT
        r.id,

        r.project_id,

        p.nombre AS project_nombre,

        r.user_id,

        COALESCE(
            pr.nombre,
            'Sin nombre'
        ) AS cliente_nombre,

        u.email::TEXT AS cliente_email,

        r.company_id,

        r.client_id,

        r.description,

        r.status,

        r.reviewed_by,

        r.reviewed_at,

        r.review_notes,

        r.accepted_at,

        r.completed_by,

        r.completed_at,

        r.created_at,

        r.updated_at,

        p.change_requests_enabled,

        p.change_requests_deadline

    FROM public.project_change_requests r

    INNER JOIN public.projects p
        ON p.id = r.project_id

    LEFT JOIN public.profiles pr
        ON pr.id = r.user_id

    LEFT JOIN auth.users u
        ON u.id = r.user_id

    ORDER BY
        CASE
            WHEN r.status = 'pending'
                THEN 1
            WHEN r.status = 'in_review'
                THEN 2
            WHEN r.status = 'accepted'
                THEN 3
            WHEN r.status = 'completed'
                THEN 4
            WHEN r.status = 'rejected'
                THEN 5
            ELSE 6
        END,

        r.created_at DESC;

END;
$$;


-- ============================================================
-- 19. PERMISOS GET WORKER REQUESTS
-- ============================================================

REVOKE ALL
ON FUNCTION public.get_worker_project_change_requests()
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE
ON FUNCTION public.get_worker_project_change_requests()
TO authenticated;


-- ============================================================
-- 20. RPC — RESOLVE PROJECT CHANGE REQUEST
-- ============================================================
--
-- Firma:
--
--     resolve_project_change_request(
--         p_request_id,
--         p_action,
--         p_review_notes
--     )
--
--
-- SOLO WORKER ACTIVO.
--
--
-- ACCIONES PERMITIDAS
-- ===================
--
--     in_review
--     accepted
--     rejected
--     completed
--
--
-- FLUJO
-- =====
--
-- pending
--    │
--    ├── in_review
--    │       │
--    │       ├── accepted
--    │       │      │
--    │       │      └── completed
--    │       │
--    │       └── rejected
--    │
--    ├── accepted
--    │      │
--    │      └── completed
--    │
--    └── rejected
--
--
-- completed / rejected
--       ↓
--      FINAL
--
--
-- IMPORTANTE:
--
-- "completed" significa que el trabajador declara que el cambio
-- solicitado ya ha sido realizado.
--
-- La RPC NO realiza automáticamente modificaciones sobre
-- projects a partir del texto de la solicitud.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolve_project_change_request(
    p_request_id UUID,
    p_action TEXT,
    p_review_notes TEXT DEFAULT NULL
)
RETURNS public.project_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE

    v_request public.project_change_requests;

    v_worker_id UUID;

    v_project public.projects;

    v_new_status TEXT;

BEGIN

    -- --------------------------------------------------------
    -- AUTENTICACIÓN
    -- --------------------------------------------------------

    IF auth.uid() IS NULL THEN

        RAISE EXCEPTION
            'Usuario no autenticado';

    END IF;


    -- --------------------------------------------------------
    -- WORKER
    -- --------------------------------------------------------

    IF NOT public.current_user_is_worker() THEN

        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';

    END IF;


    -- --------------------------------------------------------
    -- REQUEST ID
    -- --------------------------------------------------------

    IF p_request_id IS NULL THEN

        RAISE EXCEPTION
            'La solicitud es obligatoria';

    END IF;


    -- --------------------------------------------------------
    -- ACTION
    -- --------------------------------------------------------

    IF p_action NOT IN (
        'in_review',
        'accepted',
        'rejected',
        'completed'
    ) THEN

        RAISE EXCEPTION
            'Acción no válida. Debe ser in_review, accepted, rejected o completed';

    END IF;


    -- --------------------------------------------------------
    -- REVIEW NOTES
    -- --------------------------------------------------------

    IF p_review_notes IS NOT NULL
       AND length(p_review_notes) > 5000
    THEN

        RAISE EXCEPTION
            'Las notas no pueden superar 5000 caracteres';

    END IF;


    -- --------------------------------------------------------
    -- WORKER ID
    -- --------------------------------------------------------

    SELECT w.id
    INTO v_worker_id
    FROM public.workers w
    WHERE
        w.auth_user_id = auth.uid()
        AND w.is_active = TRUE
    LIMIT 1;


    IF v_worker_id IS NULL THEN

        RAISE EXCEPTION
            'No se ha encontrado un trabajador activo asociado al usuario';

    END IF;


    -- --------------------------------------------------------
    -- OBTENER SOLICITUD
    -- --------------------------------------------------------

    SELECT *
    INTO v_request
    FROM public.project_change_requests
    WHERE id = p_request_id
    FOR UPDATE;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'La solicitud indicada no existe';

    END IF;


    -- --------------------------------------------------------
    -- OBTENER PROYECTO
    -- --------------------------------------------------------

    SELECT *
    INTO v_project
    FROM public.projects
    WHERE id = v_request.project_id;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'El proyecto asociado a la solicitud no existe';

    END IF;


    -- --------------------------------------------------------
    -- NO MODIFICAR SOLICITUDES FINALES
    -- --------------------------------------------------------

    IF v_request.status IN (
        'completed',
        'rejected'
    ) THEN

        RAISE EXCEPTION
            'La solicitud ya está cerrada y no puede modificarse';

    END IF;


    -- ========================================================
    -- ACCIÓN: IN_REVIEW
    -- ========================================================

    IF p_action = 'in_review' THEN

        IF v_request.status <> 'pending' THEN

            RAISE EXCEPTION
                'Solo una solicitud pendiente puede pasar a revisión';

        END IF;


        v_new_status := 'in_review';


        UPDATE public.project_change_requests

        SET
            status = v_new_status,

            reviewed_by = v_worker_id,

            reviewed_at = COALESCE(
                reviewed_at,
                CURRENT_TIMESTAMP
            ),

            review_notes = COALESCE(
                NULLIF(btrim(p_review_notes), ''),
                review_notes
            ),

            updated_at = CURRENT_TIMESTAMP

        WHERE id = p_request_id

        RETURNING *
        INTO v_request;


        INSERT INTO public.activity_log (
            user_id,
            company_id,
            action,
            resource_type,
            resource_id,
            description,
            metadata
        )
        VALUES (
            auth.uid(),
            v_project.company_id,
            'project.change_request_in_review',
            'project_change_request',
            v_request.id,
            'Solicitud de cambio puesta en revisión',
            jsonb_build_object(
                'project_id', v_project.id,
                'worker_id', v_worker_id
            )
        );


        RETURN v_request;

    END IF;


    -- ========================================================
    -- ACCIÓN: ACCEPTED
    -- ========================================================

    IF p_action = 'accepted' THEN

        IF v_request.status NOT IN (
            'pending',
            'in_review'
        ) THEN

            RAISE EXCEPTION
                'Solo una solicitud pendiente o en revisión puede aceptarse';

        END IF;


        v_new_status := 'accepted';


        UPDATE public.project_change_requests

        SET
            status = v_new_status,

            reviewed_by = v_worker_id,

            reviewed_at = COALESCE(
                reviewed_at,
                CURRENT_TIMESTAMP
            ),

            accepted_at = CURRENT_TIMESTAMP,

            review_notes = COALESCE(
                NULLIF(btrim(p_review_notes), ''),
                review_notes
            ),

            updated_at = CURRENT_TIMESTAMP

        WHERE id = p_request_id

        RETURNING *
        INTO v_request;


        INSERT INTO public.activity_log (
            user_id,
            company_id,
            action,
            resource_type,
            resource_id,
            description,
            metadata
        )
        VALUES (
            auth.uid(),
            v_project.company_id,
            'project.change_request_accepted',
            'project_change_request',
            v_request.id,
            'Solicitud de cambio aceptada por un trabajador',
            jsonb_build_object(
                'project_id', v_project.id,
                'worker_id', v_worker_id
            )
        );


        RETURN v_request;

    END IF;


    -- ========================================================
    -- ACCIÓN: REJECTED
    -- ========================================================

    IF p_action = 'rejected' THEN

        IF v_request.status NOT IN (
            'pending',
            'in_review'
        ) THEN

            RAISE EXCEPTION
                'Solo una solicitud pendiente o en revisión puede rechazarse';

        END IF;


        v_new_status := 'rejected';


        UPDATE public.project_change_requests

        SET
            status = v_new_status,

            reviewed_by = v_worker_id,

            reviewed_at = CURRENT_TIMESTAMP,

            review_notes =
                NULLIF(
                    btrim(p_review_notes),
                    ''
                ),

            updated_at = CURRENT_TIMESTAMP

        WHERE id = p_request_id

        RETURNING *
        INTO v_request;


        INSERT INTO public.activity_log (
            user_id,
            company_id,
            action,
            resource_type,
            resource_id,
            description,
            metadata
        )
        VALUES (
            auth.uid(),
            v_project.company_id,
            'project.change_request_rejected',
            'project_change_request',
            v_request.id,
            'Solicitud de cambio rechazada por un trabajador',
            jsonb_build_object(
                'project_id', v_project.id,
                'worker_id', v_worker_id
            )
        );


        RETURN v_request;

    END IF;


    -- ========================================================
    -- ACCIÓN: COMPLETED
    -- ========================================================

    IF p_action = 'completed' THEN

        IF v_request.status <> 'accepted' THEN

            RAISE EXCEPTION
                'Una solicitud debe estar aceptada antes de marcarse como completada';

        END IF;


        v_new_status := 'completed';


        UPDATE public.project_change_requests

        SET
            status = v_new_status,

            completed_by = v_worker_id,

            completed_at = CURRENT_TIMESTAMP,

            review_notes = COALESCE(
                NULLIF(btrim(p_review_notes), ''),
                review_notes
            ),

            updated_at = CURRENT_TIMESTAMP

        WHERE id = p_request_id

        RETURNING *
        INTO v_request;


        INSERT INTO public.activity_log (
            user_id,
            company_id,
            action,
            resource_type,
            resource_id,
            description,
            metadata
        )
        VALUES (
            auth.uid(),
            v_project.company_id,
            'project.change_request_completed',
            'project_change_request',
            v_request.id,
            'Cambio de proyecto realizado y solicitud completada',
            jsonb_build_object(
                'project_id', v_project.id,
                'worker_id', v_worker_id
            )
        );


        RETURN v_request;

    END IF;


    -- --------------------------------------------------------
    -- FALLBACK
    -- --------------------------------------------------------

    RAISE EXCEPTION
        'No se pudo resolver la solicitud';

END;
$$;


-- ============================================================
-- 21. PERMISOS RESOLVE
-- ============================================================

REVOKE ALL
ON FUNCTION public.resolve_project_change_request(
    UUID,
    TEXT,
    TEXT
)
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE
ON FUNCTION public.resolve_project_change_request(
    UUID,
    TEXT,
    TEXT
)
TO authenticated;


-- ============================================================
-- 22. SEGURIDAD DE RPCs
-- ============================================================

ALTER FUNCTION public.configure_project_change_requests(
    UUID,
    BOOLEAN,
    TIMESTAMPTZ
)
SET search_path = public, pg_temp;


ALTER FUNCTION public.request_project_change(
    UUID,
    TEXT
)
SET search_path = public, pg_temp;


ALTER FUNCTION public.get_worker_project_change_requests()
SET search_path = public, auth, pg_temp;


ALTER FUNCTION public.resolve_project_change_request(
    UUID,
    TEXT,
    TEXT
)
SET search_path = public, pg_temp;


-- ============================================================
-- 23. VERIFICAR QUE EL UPDATE DIRECTO DEL CLIENTE HA SIDO
--     ELIMINADO
-- ============================================================

DO $$
DECLARE
    v_policy_count INTEGER;
    v_has_update BOOLEAN;
BEGIN

    -- --------------------------------------------------------
    -- Policy antigua
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'public'
        AND tablename = 'projects'
        AND policyname = 'projects_client_update_policy';


    IF v_policy_count <> 0 THEN

        RAISE EXCEPTION
            '014 failed: projects_client_update_policy still exists';

    END IF;


    -- --------------------------------------------------------
    -- Privilegio UPDATE
    -- --------------------------------------------------------

    SELECT has_table_privilege(
        'authenticated',
        'public.projects',
        'UPDATE'
    )
    INTO v_has_update;


    IF v_has_update IS TRUE THEN

        RAISE EXCEPTION
            '014 failed: authenticated still has direct UPDATE privilege on projects';

    END IF;

END $$;


-- ============================================================
-- 24. VERIFICACIONES — PROJECTS CONFIGURATION
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- change_requests_enabled
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE
        table_schema = 'public'
        AND table_name = 'projects'
        AND column_name = 'change_requests_enabled';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '014 failed: projects.change_requests_enabled is missing';

    END IF;


    -- --------------------------------------------------------
    -- change_requests_deadline
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE
        table_schema = 'public'
        AND table_name = 'projects'
        AND column_name = 'change_requests_deadline';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '014 failed: projects.change_requests_deadline is missing';

    END IF;


    -- --------------------------------------------------------
    -- Constraint
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_constraint
    WHERE
        conrelid = 'public.projects'::regclass
        AND conname = 'projects_change_requests_config_check';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '014 failed: projects_change_requests_config_check is missing';

    END IF;

END $$;


-- ============================================================
-- 25. VERIFICACIONES — PROJECT_CHANGE_REQUESTS
-- ============================================================

DO $$
DECLARE
    v_rls_enabled BOOLEAN;
    v_policy_count INTEGER;
    v_index_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- Tabla
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE
            table_schema = 'public'
            AND table_name = 'project_change_requests'
    ) THEN

        RAISE EXCEPTION
            '014 failed: project_change_requests does not exist';

    END IF;


    -- --------------------------------------------------------
    -- RLS
    -- --------------------------------------------------------

    SELECT relrowsecurity
    INTO v_rls_enabled
    FROM pg_class
    WHERE
        oid = 'public.project_change_requests'::regclass;


    IF v_rls_enabled IS NOT TRUE THEN

        RAISE EXCEPTION
            '014 failed: RLS is not enabled on project_change_requests';

    END IF;


    -- --------------------------------------------------------
    -- SELECT policy
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'public'
        AND tablename = 'project_change_requests'
        AND policyname = 'project_change_requests_select';


    IF v_policy_count <> 1 THEN

        RAISE EXCEPTION
            '014 failed: project_change_requests_select policy is missing';

    END IF;


    -- --------------------------------------------------------
    -- No INSERT policy
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'public'
        AND tablename = 'project_change_requests'
        AND cmd = 'INSERT';


    IF v_policy_count <> 0 THEN

        RAISE EXCEPTION
            '014 failed: direct INSERT policy exists on project_change_requests';

    END IF;


    -- --------------------------------------------------------
    -- No UPDATE policy
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'public'
        AND tablename = 'project_change_requests'
        AND cmd = 'UPDATE';


    IF v_policy_count <> 0 THEN

        RAISE EXCEPTION
            '014 failed: direct UPDATE policy exists on project_change_requests';

    END IF;


    -- --------------------------------------------------------
    -- No DELETE policy
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'public'
        AND tablename = 'project_change_requests'
        AND cmd = 'DELETE';


    IF v_policy_count <> 0 THEN

        RAISE EXCEPTION
            '014 failed: direct DELETE policy exists on project_change_requests';

    END IF;


    -- --------------------------------------------------------
    -- Project index
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_index_count
    FROM pg_indexes
    WHERE
        schemaname = 'public'
        AND tablename = 'project_change_requests'
        AND indexname = 'idx_project_change_requests_project_id';


    IF v_index_count <> 1 THEN

        RAISE EXCEPTION
            '014 failed: project_change_requests project index is missing';

    END IF;


    -- --------------------------------------------------------
    -- Active request unique index
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_index_count
    FROM pg_indexes
    WHERE
        schemaname = 'public'
        AND tablename = 'project_change_requests'
        AND indexname =
            'idx_project_change_requests_one_active_per_project';


    IF v_index_count <> 1 THEN

        RAISE EXCEPTION
            '014 failed: active project change request unique index is missing';

    END IF;

END $$;


-- ============================================================
-- 26. VERIFICACIONES — ESTADOS
-- ============================================================

DO $$
DECLARE
    v_constraint_definition TEXT;
BEGIN

    SELECT pg_get_constraintdef(oid)
    INTO v_constraint_definition
    FROM pg_constraint
    WHERE
        conrelid = 'public.project_change_requests'::regclass
        AND conname = 'project_change_requests_status_check'
    LIMIT 1;


    IF v_constraint_definition IS NULL THEN

        RAISE EXCEPTION
            '014 failed: project_change_requests_status_check is missing';

    END IF;


    IF v_constraint_definition NOT LIKE '%pending%'
       OR v_constraint_definition NOT LIKE '%in_review%'
       OR v_constraint_definition NOT LIKE '%accepted%'
       OR v_constraint_definition NOT LIKE '%rejected%'
       OR v_constraint_definition NOT LIKE '%completed%'
    THEN

        RAISE EXCEPTION
            '014 failed: project change request states are incomplete. Found: %',
            v_constraint_definition;

    END IF;

END $$;


-- ============================================================
-- 27. VERIFICACIONES — RPCs
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- configure_project_change_requests()
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n
        ON n.oid = p.pronamespace
    WHERE
        n.nspname = 'public'
        AND p.proname =
            'configure_project_change_requests'
        AND p.pronargs = 3
        AND p.proargtypes[0] = 'uuid'::regtype
        AND p.proargtypes[1] = 'bool'::regtype
        AND p.proargtypes[2] = 'timestamptz'::regtype;


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '014 failed: configure_project_change_requests() is missing';

    END IF;


    -- --------------------------------------------------------
    -- request_project_change()
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n
        ON n.oid = p.pronamespace
    WHERE
        n.nspname = 'public'
        AND p.proname =
            'request_project_change'
        AND p.pronargs = 2
        AND p.proargtypes[0] = 'uuid'::regtype
        AND p.proargtypes[1] = 'text'::regtype;


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '014 failed: request_project_change() is missing';

    END IF;


    -- --------------------------------------------------------
    -- get_worker_project_change_requests()
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n
        ON n.oid = p.pronamespace
    WHERE
        n.nspname = 'public'
        AND p.proname =
            'get_worker_project_change_requests'
        AND p.pronargs = 0;


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '014 failed: get_worker_project_change_requests() is missing';

    END IF;


    -- --------------------------------------------------------
    -- resolve_project_change_request()
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n
        ON n.oid = p.pronamespace
    WHERE
        n.nspname = 'public'
        AND p.proname =
            'resolve_project_change_request'
        AND p.pronargs = 3
        AND p.proargtypes[0] = 'uuid'::regtype
        AND p.proargtypes[1] = 'text'::regtype
        AND p.proargtypes[2] = 'text'::regtype;


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '014 failed: resolve_project_change_request() is missing';

    END IF;

END $$;


-- ============================================================
-- 28. VERIFICACIONES — RPC PERMISSIONS
-- ============================================================

DO $$
BEGIN

    -- --------------------------------------------------------
    -- configure
    -- --------------------------------------------------------

    IF NOT has_function_privilege(
        'authenticated',
        'public.configure_project_change_requests(uuid,boolean,timestamptz)',
        'EXECUTE'
    ) THEN

        RAISE EXCEPTION
            '014 failed: authenticated cannot execute configure_project_change_requests()';

    END IF;


    -- --------------------------------------------------------
    -- request
    -- --------------------------------------------------------

    IF NOT has_function_privilege(
        'authenticated',
        'public.request_project_change(uuid,text)',
        'EXECUTE'
    ) THEN

        RAISE EXCEPTION
            '014 failed: authenticated cannot execute request_project_change()';

    END IF;


    -- --------------------------------------------------------
    -- get worker requests
    -- --------------------------------------------------------

    IF NOT has_function_privilege(
        'authenticated',
        'public.get_worker_project_change_requests()',
        'EXECUTE'
    ) THEN

        RAISE EXCEPTION
            '014 failed: authenticated cannot execute get_worker_project_change_requests()';

    END IF;


    -- --------------------------------------------------------
    -- resolve
    -- --------------------------------------------------------

    IF NOT has_function_privilege(
        'authenticated',
        'public.resolve_project_change_request(uuid,text,text)',
        'EXECUTE'
    ) THEN

        RAISE EXCEPTION
            '014 failed: authenticated cannot execute resolve_project_change_request()';

    END IF;

END $$;


-- ============================================================
-- 29. VERIFICACIÓN — UPDATE DEL WORKER
-- ============================================================
--
-- La migración 003 mantiene la RPC:
--
--     update_project_by_worker()
--
-- La comprobamos porque a partir de ahora es la vía de edición
-- del proyecto para workers.
--
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n
        ON n.oid = p.pronamespace
    WHERE
        n.nspname = 'public'
        AND p.proname = 'update_project_by_worker'
        AND p.pronargs = 3
        AND p.proargtypes[0] = 'uuid'::regtype
        AND p.proargtypes[1] = 'text'::regtype
        AND p.proargtypes[2] = 'text'::regtype;


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '014 failed: update_project_by_worker() from 003 is missing';

    END IF;

END $$;


-- ============================================================
-- 30. VERIFICACIÓN — ACTIVITY LOG
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n
        ON n.oid = p.pronamespace
    WHERE
        n.nspname = 'public'
        AND p.proname = 'log_activity';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '014 failed: existing log_activity() is missing';

    END IF;

END $$;


-- ============================================================
-- 31. RESULTADO FINAL
-- ============================================================
--
--
-- PROJECTS
-- ========
--
-- Cliente:
--
--     SELECT
--
--     INSERT
--
--     ❌ UPDATE directo
--
--     ❌ DELETE
--
--
-- Worker:
--
--     SELECT
--
--     create_project_by_worker()
--
--     update_project_by_worker()
--
--
-- ============================================================
--
--
-- CONFIGURACIÓN DEL PROYECTO
-- ==========================
--
-- Worker:
--
--     configure_project_change_requests()
--
--              │
--              ├── enabled
--              └── deadline
--
--
-- ============================================================
--
--
-- CLIENTE — SOLICITUD
-- ===================
--
-- Cliente
--    │
--    ▼
-- request_project_change()
--    │
--    ├── comprueba propietario
--    ├── comprueba enabled
--    ├── comprueba deadline
--    ├── comprueba solicitud activa
--    └── crea solicitud
--
--              ↓
--
--          pending
--
--
-- ============================================================
--
--
-- WORKER — GESTIÓN
-- =================
--
-- pending
--    │
--    ├── in_review
--    │      │
--    │      ├── accepted
--    │      │      │
--    │      │      └── completed
--    │      │
--    │      └── rejected
--    │
--    ├── accepted
--    │      │
--    │      └── completed
--    │
--    └── rejected
--
--
-- ============================================================
--
--
-- HISTORIAL
-- =========
--
-- project_change_requests
--        │
--        ├── solicitud
--        ├── estado
--        ├── trabajador revisor
--        ├── fecha revisión
--        ├── notas
--        ├── fecha aceptación
--        ├── trabajador que completa
--        └── fecha finalización
--
--
-- ============================================================
--
--
-- ACTIVITY LOG
-- ============
--
-- Se registran:
--
--     project.change_requests_configured
--     project.change_request_created
--     project.change_request_in_review
--     project.change_request_accepted
--     project.change_request_rejected
--     project.change_request_completed
--
--
-- ============================================================


COMMIT;