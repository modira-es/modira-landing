-- ============================================================
-- MODIRA - MIGRACIÓN 009
-- CREACIÓN SEGURA DE PROYECTOS
-- ============================================================
--
-- OBJETIVO:
-- Permitir que un cliente cree un proyecto sin que el frontend
-- tenga que consultar ni proporcionar company_id.
--
-- La empresa y el usuario se determinan exclusivamente desde
-- la sesión autenticada:
--
--   user_id    = auth.uid()
--   company_id = current_user_company_id()
--
-- El cliente solamente proporciona:
--   - nombre
--   - descripcion
--   - fecha_inicio
--   - fecha_fin
--
-- La RLS de la migración 008 continúa protegiendo la tabla.
-- ============================================================

BEGIN;


-- ============================================================
-- 1. FUNCIÓN SEGURA PARA CREAR PROYECTOS
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_project(
    p_nombre TEXT,
    p_descripcion TEXT DEFAULT NULL,
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
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;


    -- --------------------------------------------------------
    -- La función solo puede ser utilizada por clientes.
    -- Los trabajadores no pueden crear proyectos.
    -- --------------------------------------------------------

    IF public.current_user_is_worker() THEN
        RAISE EXCEPTION 'Los trabajadores no pueden crear proyectos';
    END IF;


    -- --------------------------------------------------------
    -- Obtener empresa directamente desde el usuario autenticado
    -- --------------------------------------------------------

    v_company_id := public.current_user_company_id();

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'El usuario no tiene una empresa asociada';
    END IF;


    -- --------------------------------------------------------
    -- Validación del nombre
    -- --------------------------------------------------------

    IF p_nombre IS NULL OR trim(p_nombre) = '' THEN
        RAISE EXCEPTION 'El nombre del proyecto es obligatorio';
    END IF;


    -- --------------------------------------------------------
    -- Crear proyecto
    --
    -- company_id y user_id NO vienen del frontend.
    -- Se establecen aquí de forma segura.
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
        trim(p_nombre),
        NULLIF(trim(COALESCE(p_descripcion, '')), ''),
        'activo',
        COALESCE(p_fecha_inicio, CURRENT_TIMESTAMP),
        p_fecha_fin
    )
    RETURNING *
    INTO v_project;


    RETURN v_project;

END;
$$;


-- ============================================================
-- 2. PERMITIR EJECUTAR LA FUNCIÓN A USUARIOS AUTENTICADOS
-- ============================================================

GRANT EXECUTE
ON FUNCTION public.create_project(
    TEXT,
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ
)
TO authenticated;


-- ============================================================
-- 3. NO PERMITIR EJECUCIÓN ANÓNIMA
-- ============================================================

REVOKE EXECUTE
ON FUNCTION public.create_project(
    TEXT,
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ
)
FROM anon;


COMMIT;


-- ============================================================
-- RESULTADO
-- ============================================================
--
-- CLIENTE:
--
--   create_project(...)
--          ↓
--      auth.uid()
--          ↓
--   current_user_company_id()
--          ↓
--      projects
--
-- El frontend NO proporciona:
--
--   user_id
--   company_id
--   estado
--
-- Estos valores son determinados por Supabase.
--
-- TRABAJADOR:
--
--   NO puede utilizar create_project().
--
-- ============================================================
