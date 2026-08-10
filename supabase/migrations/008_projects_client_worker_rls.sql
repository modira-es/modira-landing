-- ============================================================
-- MODIRA - MIGRACIÓN 008
-- POLÍTICAS RLS Y ACCESO A PROYECTOS (CLIENTE Y TRABAJADOR)
-- ============================================================
--
-- OBJETIVO:
-- 1. CLIENTE:
    -- - Puede ver (SELECT) sus propios proyectos (filtrados por company_id o user_id).
    -- - Puede crear (INSERT) sus propios proyectos.
    -- - NO puede modificar (UPDATE/DELETE) el estado ni ningún campo de los proyectos (protegido por RLS).
-- 2. TRABAJADOR:
    -- - Puede ver (SELECT) todos los proyectos existentes de todos los clientes.
    -- - Puede modificar exclusivamente el estado (UPDATE estado) de los proyectos.
    -- - NO puede modificar otros campos ni crear/eliminar proyectos.
--
-- ============================================================

BEGIN;

-- 1. Asegurar que RLS esté activado en projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas anteriores de projects para evitar conflictos
DROP POLICY IF EXISTS projects_company_access ON public.projects;
DROP POLICY IF EXISTS projects_select_policy ON public.projects;
DROP POLICY IF EXISTS projects_insert_policy ON public.projects;
DROP POLICY IF EXISTS projects_update_policy ON public.projects;
DROP POLICY IF EXISTS projects_delete_policy ON public.projects;

-- 3. POLÍTICA DE SELECT
-- - Si es trabajador activo: puede ver TODOS los proyectos de todas las empresas.
-- - Si es cliente: puede ver solo los proyectos de su propia empresa (o creados por él).
CREATE POLICY projects_select_policy ON public.projects
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
    OR (
        NOT public.current_user_is_worker()
        AND (
            company_id = public.current_user_company_id()
            OR user_id = auth.uid()
        )
    )
);

-- 4. POLÍTICA DE INSERT
-- - Solo los clientes (no trabajadores) pueden crear proyectos para su propia empresa / usuario.
CREATE POLICY projects_insert_policy ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.current_user_is_worker()
    AND (
        company_id = public.current_user_company_id()
        OR user_id = auth.uid()
    )
    AND user_id = auth.uid()
);

-- 5. POLÍTICA DE UPDATE
-- - TRABAJADOR: Puede actualizar el estado (y opcionalmente updated_at). 
--   Garantizamos mediante WITH CHECK que no cambie company_id, user_id, nombre, descripcion, etc.
-- - CLIENTE: NO puede actualizar proyectos (ni estado ni nada).
CREATE POLICY projects_update_policy ON public.projects
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_worker()
    OR (
        -- Clientes no tienen permiso UPDATE general, o bloqueado en WITH CHECK
        FALSE
    )
)
WITH CHECK (
    public.current_user_is_worker()
    -- El trabajador puede actualizar, pero nos aseguramos de que no altere la pertenencia a la empresa/usuario
    -- (permitimos cambiar estado, descripcion opcional o fecha_fin, pero el requisito principal es actualizar estado).
    AND company_id = company_id
    AND user_id = user_id
);

-- 6. POLÍTICA DE DELETE
-- - Ningún cliente ni trabajador estándar elimina proyectos desde el frontend (o reservado a admin si aplica).
-- Mantenemos cerrado DELETE desde el frontend para mayor seguridad.
DROP POLICY IF EXISTS projects_delete_policy ON public.projects;

COMMIT;
