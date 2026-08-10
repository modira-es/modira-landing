-- ============================================================
-- MODIRA - MIGRACIÓN 008
-- PROYECTOS: ACCESO CLIENTE + GESTIÓN DE ESTADO TRABAJADOR
-- ============================================================
--
-- OBJETIVO
--
-- CLIENTE:
--   - Puede consultar sus propios proyectos.
--   - Puede crear proyectos para su propia empresa.
--   - NO puede modificar proyectos existentes.
--   - NO puede cambiar el estado.
--   - NO puede eliminar proyectos.
--
-- TRABAJADOR ACTIVO:
--   - Puede consultar TODOS los proyectos de todos los clientes.
--   - Puede modificar ÚNICAMENTE la columna "estado".
--   - NO puede modificar nombre, descripción, fechas, user_id,
--     company_id ni ningún otro campo.
--   - NO puede crear proyectos.
--   - NO puede eliminar proyectos.
--
-- IMPORTANTE:
--
-- La separación entre cliente y trabajador se realiza mediante:
--
--   public.current_user_is_worker()
--
-- Esta función fue creada en la migración 004 y determina si
-- la cuenta autenticada corresponde a un trabajador ACTIVO.
--
-- Esta migración NO modifica las migraciones 001-007.
-- ============================================================

BEGIN;


-- ============================================================
-- 1. COMPROBACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    -- Comprobar que existe la tabla projects
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'projects'
    ) THEN
        RAISE EXCEPTION
            'Migration 008 stopped: public.projects does not exist';
    END IF;


    -- Comprobar que existe current_user_is_worker()
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
          ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_is_worker'
    ) THEN
        RAISE EXCEPTION
            'Migration 008 stopped: public.current_user_is_worker() does not exist';
    END IF;


    -- Comprobar que existe current_user_company_id()
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
          ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_company_id'
    ) THEN
        RAISE EXCEPTION
            'Migration 008 stopped: public.current_user_company_id() does not exist';
    END IF;

END $$;


-- ============================================================
-- 2. ACTIVAR RLS
-- ============================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. ELIMINAR POLÍTICAS ANTERIORES DE PROJECTS
--
-- La migración 006 creó:
--
--   projects_company_access
--
-- Esta policy era FOR ALL y, por tanto, permitía UPDATE
-- a los usuarios de la empresa.
--
-- La sustituimos por políticas separadas y específicas.
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


-- ============================================================
-- 4. SELECT
--
-- TRABAJADOR ACTIVO:
--   Puede consultar TODOS los proyectos.
--
-- CLIENTE:
--   Solo puede consultar proyectos de su propia empresa.
--
-- No utilizamos user_id como alternativa para determinar
-- la empresa del cliente. La pertenencia se determina
-- mediante company_id.
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
        AND company_id = public.current_user_company_id()
    )
);


-- ============================================================
-- 5. INSERT
--
-- Únicamente los clientes pueden crear proyectos.
--
-- El proyecto debe pertenecer:
--
--   company_id = empresa del usuario autenticado
--   user_id    = usuario autenticado
--
-- El trabajador no puede crear proyectos.
--
-- Esto evita que un cliente pueda enviar manualmente un
-- company_id perteneciente a otra empresa.
-- ============================================================

CREATE POLICY projects_insert_policy
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
    AND user_id = auth.uid()
);


-- ============================================================
-- 6. UPDATE
--
-- ÚNICAMENTE trabajadores ACTIVOS.
--
-- La policy permite UPDATE únicamente a trabajadores.
--
-- IMPORTANTE:
--
-- Esta policy NO es la que limita las columnas.
--
-- La limitación real de columnas se establece más abajo
-- mediante permisos PostgreSQL:
--
--   GRANT UPDATE (estado)
--
-- De esta manera, el rol authenticated no posee permiso
-- general de UPDATE sobre projects.
--
-- Solo posee permiso UPDATE sobre la columna estado.
--
-- El frontend no puede saltarse esta protección.
-- ============================================================

CREATE POLICY projects_update_policy
ON public.projects
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_worker()
)
WITH CHECK (
    public.current_user_is_worker()
    AND estado IN (
        'activo',
        'pausado',
        'completado'
    )
);


-- ============================================================
-- 7. DELETE
--
-- Ningún cliente ni trabajador puede eliminar proyectos
-- desde el frontend.
--
-- No creamos ninguna policy DELETE.
-- Además, retiramos explícitamente el permiso PostgreSQL.
-- ============================================================

REVOKE DELETE
ON public.projects
FROM PUBLIC;

REVOKE DELETE
ON public.projects
FROM authenticated;


-- ============================================================
-- 8. PERMISOS POSTGRESQL
--
-- Esta sección es FUNDAMENTAL.
--
-- RLS determina:
--
--   "¿Qué filas puede modificar?"
--
-- Los permisos PostgreSQL determinan:
--
--   "¿Qué operación/columnas puede intentar modificar?"
--
-- Queremos:
--
--   SELECT  -> permitido
--   INSERT  -> permitido para clientes mediante RLS
--   UPDATE  -> únicamente columna estado
--   DELETE  -> no permitido
--
-- Primero eliminamos el UPDATE general.
-- ============================================================

REVOKE UPDATE
ON public.projects
FROM PUBLIC;

REVOKE UPDATE
ON public.projects
FROM authenticated;


-- ============================================================
-- 9. CONCEDER UPDATE ÚNICAMENTE SOBRE ESTADO
--
-- Esto impide que authenticated pueda hacer:
--
--   UPDATE nombre
--   UPDATE descripcion
--   UPDATE company_id
--   UPDATE user_id
--   UPDATE fecha_inicio
--   UPDATE fecha_fin
--
-- y cualquier otra columna.
--
-- Solo puede intentar:
--
--   UPDATE estado
--
-- La RLS anterior garantiza que únicamente un trabajador
-- activo pueda realizar ese UPDATE.
-- ============================================================

GRANT UPDATE (estado)
ON public.projects
TO authenticated;


-- ============================================================
-- 10. PERMISOS EXPLÍCITOS DE SELECT E INSERT
--
-- Nos aseguramos de que authenticated pueda ejecutar las
-- operaciones necesarias.
--
-- RLS seguirá determinando qué filas puede consultar/insertar.
-- ============================================================

GRANT SELECT
ON public.projects
TO authenticated;

GRANT INSERT
ON public.projects
TO authenticated;


-- ============================================================
-- 11. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_policy_count INTEGER;
BEGIN

    -- Debe existir la policy SELECT
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND policyname = 'projects_select_policy';

    IF v_policy_count <> 1 THEN
        RAISE EXCEPTION
            'Migration 008 failed: projects_select_policy was not created';
    END IF;


    -- Debe existir la policy INSERT
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND policyname = 'projects_insert_policy';

    IF v_policy_count <> 1 THEN
        RAISE EXCEPTION
            'Migration 008 failed: projects_insert_policy was not created';
    END IF;


    -- Debe existir la policy UPDATE
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND policyname = 'projects_update_policy';

    IF v_policy_count <> 1 THEN
        RAISE EXCEPTION
            'Migration 008 failed: projects_update_policy was not created';
    END IF;


    -- No debe existir una policy DELETE
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND cmd = 'DELETE';

    IF v_policy_count <> 0 THEN
        RAISE EXCEPTION
            'Migration 008 failed: DELETE policy exists on projects';
    END IF;

END $$;


-- ============================================================
-- 12. FIN
-- ============================================================

COMMIT;


-- ============================================================
-- RESULTADO FINAL
-- ============================================================
--
-- CLIENTE:
--
--   SELECT propios proyectos       ✅
--   INSERT propios proyectos       ✅
--   UPDATE proyectos               ❌
--   UPDATE estado                  ❌
--   DELETE proyectos               ❌
--
--
-- TRABAJADOR ACTIVO:
--
--   SELECT todos los proyectos     ✅
--   UPDATE estado                  ✅
--   UPDATE otros campos            ❌
--   INSERT proyectos               ❌
--   DELETE proyectos               ❌
--
--
-- TRABAJADOR INACTIVO:
--
--   SELECT projects                 ❌
--   UPDATE projects                ❌
--
--
-- La información del estado es compartida porque cliente
-- y trabajador consultan el mismo registro de:
--
--   public.projects
--
-- El trabajador modifica:
--
--   projects.estado
--
-- y el cliente visualiza ese mismo valor.
-- ============================================================