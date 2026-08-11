BEGIN;

-- ============================================================
-- MODIRA - MIGRACIÓN 013
-- PROYECTOS DE CLIENTES SIN EMPRESA
-- ============================================================
--
-- OBJETIVO:
--
-- Permitir que un cliente que todavía no tenga empresa asociada
-- pueda crear y consultar sus propios proyectos.
--
-- REGLAS:
--
-- CLIENTE CON EMPRESA
--   -> puede crear proyectos de su empresa
--   -> puede consultar proyectos de su empresa
--
-- CLIENTE SIN EMPRESA
--   -> puede crear proyectos con company_id = NULL
--   -> puede consultar únicamente sus propios proyectos
--
-- TRABAJADOR
--   -> no puede crear proyectos
--   -> no obtiene acceso al Área Cliente
--
-- NO SE MODIFICAN LAS MIGRACIONES 001-012.
--
-- ============================================================


-- ============================================================
-- 1. ELIMINAR POLÍTICAS ANTERIORES DE PROJECTS
-- ============================================================

DROP POLICY IF EXISTS projects_select_policy
ON public.projects;

DROP POLICY IF EXISTS projects_insert_policy
ON public.projects;

DROP POLICY IF EXISTS projects_company_access
ON public.projects;


-- ============================================================
-- 2. SELECT
-- ============================================================
--
-- Cliente con empresa:
--   -> ve proyectos de su empresa
--
-- Cliente sin empresa:
--   -> ve únicamente sus propios proyectos
--
-- Trabajadores:
--   -> no tienen acceso mediante esta política
--
-- ============================================================

CREATE POLICY projects_select_policy
ON public.projects
FOR SELECT
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND (
        (
            public.current_user_company_id() IS NOT NULL
            AND company_id = public.current_user_company_id()
        )
        OR
        (
            public.current_user_company_id() IS NULL
            AND company_id IS NULL
            AND user_id = auth.uid()
        )
    )
);


-- ============================================================
-- 3. INSERT
-- ============================================================
--
-- Cliente con empresa:
--   -> company_id debe coincidir con su empresa
--
-- Cliente sin empresa:
--   -> company_id debe ser NULL
--   -> user_id debe ser el usuario autenticado
--
-- Trabajadores:
--   -> no pueden insertar
--
-- ============================================================

CREATE POLICY projects_insert_policy
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND (
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
);


-- ============================================================
-- 4. UPDATE
-- ============================================================
--
-- Los clientes pueden modificar únicamente sus propios
-- proyectos y no pueden cambiar la empresa asociada.
--
-- Los trabajadores mantienen la política de actualización
-- interna existente.
--
-- ============================================================

CREATE POLICY projects_client_update_policy
ON public.projects
FOR UPDATE
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND (
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
)
WITH CHECK (
    NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND (
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
);


-- ============================================================
-- 5. VERIFICACIÓN
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'projects'
          AND policyname = 'projects_select_policy'
    ) THEN
        RAISE EXCEPTION
        'Migration 013 failed: projects_select_policy was not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'projects'
          AND policyname = 'projects_insert_policy'
    ) THEN
        RAISE EXCEPTION
        'Migration 013 failed: projects_insert_policy was not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'projects'
          AND policyname = 'projects_client_update_policy'
    ) THEN
        RAISE EXCEPTION
        'Migration 013 failed: projects_client_update_policy was not created';
    END IF;

END $$;


COMMIT;
