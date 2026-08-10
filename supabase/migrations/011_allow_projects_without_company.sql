-- ============================================================
-- MODIRA - MIGRACIÓN 011
-- PERMITIR PROYECTOS DE CLIENTES SIN EMPRESA
-- ============================================================

BEGIN;

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
    -- Usuario autenticado
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Solo clientes pueden crear proyectos
    IF public.current_user_is_worker() THEN
        RAISE EXCEPTION 'Los trabajadores no pueden crear proyectos';
    END IF;

    -- Obtener empresa.
    -- Puede ser NULL: los clientes sin empresa también pueden crear proyectos.
    v_company_id := public.current_user_company_id();

    -- La descripción es obligatoria
    IF p_descripcion IS NULL OR trim(p_descripcion) = '' THEN
        RAISE EXCEPTION 'La descripción del proyecto es obligatoria';
    END IF;

    -- Crear proyecto
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

COMMIT;