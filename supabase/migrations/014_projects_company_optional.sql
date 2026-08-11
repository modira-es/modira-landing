BEGIN;

-- ============================================================
-- MODIRA - MIGRACIÓN 014
-- COMPANY_ID OPCIONAL EN PROJECTS
-- ============================================================
--
-- OBJETIVO:
--
-- Permitir que clientes sin empresa asociada puedan crear
-- proyectos.
--
-- En estos casos:
--
-- company_id = NULL
-- user_id = auth.uid()
--
-- La seguridad de acceso se controla mediante las policies
-- de la migración 013.
--
-- Los proyectos de clientes con empresa continúan utilizando
-- company_id para el aislamiento por empresa.
--
-- ============================================================


ALTER TABLE public.projects
ALTER COLUMN company_id DROP NOT NULL;


-- ============================================================
-- VERIFICACIÓN
-- ============================================================

DO $$
DECLARE
    v_is_nullable TEXT;
BEGIN

    SELECT is_nullable
    INTO v_is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'company_id';

    IF v_is_nullable <> 'YES' THEN
        RAISE EXCEPTION
        'Migration 014 failed: projects.company_id is still NOT NULL';
    END IF;

END $$;


COMMIT;