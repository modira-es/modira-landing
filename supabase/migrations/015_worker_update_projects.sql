BEGIN;

-- ============================================================
-- MODIRA - MIGRACIÓN 015
-- ACTUALIZACIÓN DE PROYECTOS POR TRABAJADORES
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_project_by_worker(
    p_project_id UUID,
    p_nombre TEXT DEFAULT NULL,
    p_estado TEXT DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$

DECLARE
    v_project public.projects;
BEGIN

    -- ========================================================
    -- 1. Comprobar trabajador activo
    -- ========================================================

    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';
    END IF;


    -- ========================================================
    -- 2. Validar estado
    -- ========================================================

    IF p_estado IS NOT NULL
       AND p_estado NOT IN (
           'Pendiente',
           'Activo',
           'Pausado',
           'Entregado',
           'Completado'
       )
    THEN
        RAISE EXCEPTION
            'Estado de proyecto no válido';
    END IF;


    -- ========================================================
    -- 3. Comprobar que existe el proyecto
    -- ========================================================

    IF NOT EXISTS (
        SELECT 1
        FROM public.projects
        WHERE id = p_project_id
    ) THEN
        RAISE EXCEPTION
            'Proyecto no encontrado';
    END IF;


    -- ========================================================
    -- 4. Actualizar
    -- ========================================================
    --
    -- Solo modificamos los campos que se hayan enviado.
    --

    UPDATE public.projects
    SET
        nombre = COALESCE(p_nombre, nombre),
        estado = COALESCE(p_estado, estado)
    WHERE id = p_project_id
    RETURNING *
    INTO v_project;


    -- ========================================================
    -- 5. Devolver proyecto actualizado
    -- ========================================================

    RETURN v_project;

END;

$function$;


-- ============================================================
-- PERMISOS
-- ============================================================

REVOKE ALL
ON FUNCTION public.update_project_by_worker(UUID, TEXT, TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.update_project_by_worker(UUID, TEXT, TEXT)
TO authenticated;


COMMIT;