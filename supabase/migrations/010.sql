-- ============================================================
-- MODIRA - MIGRACIÓN 010
-- MODIFICACIONES EN PROYECTOS, SEGURIDAD Y ACCESO A DATOS
-- ============================================================

BEGIN;

-- 1. ACTUALIZACIÓN DE ESTADOS DE PROYECTOS
-- ------------------------------------------------------------
-- Los únicos estados válidos deben ser: Pendiente, Activo, Pausado, Entregado, Completado.
-- El estado inicial por defecto será 'Pendiente'.

-- Primero actualizamos los registros existentes para que cumplan con los nuevos estados (mapeo simple)
UPDATE public.projects SET estado = 'Activo' WHERE estado = 'activo';
UPDATE public.projects SET estado = 'Pausado' WHERE estado = 'pausado';
UPDATE public.projects SET estado = 'Completado' WHERE estado = 'completado';
UPDATE public.projects SET estado = 'Pendiente' WHERE estado NOT IN ('Activo', 'Pausado', 'Completado');

ALTER TABLE public.projects 
  DROP CONSTRAINT IF EXISTS projects_estado_check;

ALTER TABLE public.projects 
  ADD CONSTRAINT projects_estado_check 
  CHECK (estado IN ('Pendiente', 'Activo', 'Pausado', 'Entregado', 'Completado'));

ALTER TABLE public.projects 
  ALTER COLUMN estado SET DEFAULT 'Pendiente';


-- 2. REDEFINICIÓN DE LA FUNCIÓN create_project
-- ------------------------------------------------------------
-- El cliente ya no proporciona el nombre. La descripción es obligatoria.
-- Eliminamos la versión anterior para evitar conflictos de sobrecarga.

DROP FUNCTION IF EXISTS public.create_project(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

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

    -- Obtener empresa
    v_company_id := public.current_user_company_id();
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'El usuario no tiene una empresa asociada';
    END IF;

    -- Validación de descripción obligatoria
    IF p_descripcion IS NULL OR trim(p_descripcion) = '' THEN
        RAISE EXCEPTION 'La descripción del proyecto es obligatoria';
    END IF;

    -- Crear proyecto con nombre por defecto y estado Pendiente
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
        'Proyecto sin título', -- Título inicial que establecerá el trabajador
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

-- Permisos para la nueva función
GRANT EXECUTE ON FUNCTION public.create_project(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_project(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM anon;


-- 3. ACTUALIZACIÓN DE POLÍTICAS DE UPDATE PARA PROJECTS
-- ------------------------------------------------------------
-- El trabajador debe poder modificar el título y el estado.

DROP POLICY IF EXISTS projects_update_policy ON public.projects;

CREATE POLICY projects_update_policy
ON public.projects
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_worker()
)
WITH CHECK (
    public.current_user_is_worker()
    AND estado IN ('Pendiente', 'Activo', 'Pausado', 'Entregado', 'Completado')
);

-- Conceder permisos de UPDATE sobre las columnas específicas
-- Revocamos primero para asegurar que partimos de un estado limpio
REVOKE UPDATE ON public.projects FROM authenticated;

GRANT UPDATE (nombre, estado)
ON public.projects
TO authenticated;


-- 4. FUNCIÓN SEGURA PARA OBTENER DATOS DE CLIENTES (PARA TRABAJADORES)
-- ------------------------------------------------------------
-- Permite obtener nombre, email y empresa del cliente de forma segura.

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
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Verificar que el que llama es trabajador activo
    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol de trabajador';
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
        COALESCE(pr.nombre, 'Sin nombre') as cliente_nombre,
        u.email::TEXT as cliente_email,
        c.company_name as empresa_nombre
    FROM 
        public.projects p
    LEFT JOIN 
        public.profiles pr ON p.user_id = pr.id
    LEFT JOIN 
        public.companies c ON p.company_id = c.id
    LEFT JOIN 
        auth.users u ON p.user_id = u.id
    ORDER BY 
        p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_worker_projects() TO authenticated;

COMMIT;
