-- ============================================================
-- MODIRA 018 — exigir cuenta activa en create_automation_run
-- ============================================================
--
-- Corrección incremental.
-- No modifica migraciones históricas 001–017.
--
-- Requiere el estado de 016/017.
--
-- Objetivo:
-- Impedir que una cuenta bloqueada pueda crear nuevas
-- ejecuciones de automatizaciones mediante la RPC.
--
-- La función original de 005 comprobaba:
--   - worker activo mediante current_user_is_worker()
--   - o ownership mediante automation.user_id = auth.uid()
--
-- Pero no exigía explícitamente:
--   current_user_is_active()
--
-- Esta migración añade esa comprobación antes de consultar
-- la automatización o crear la ejecución.
--
-- ============================================================


CREATE OR REPLACE FUNCTION public.create_automation_run(
    p_automation_id UUID
)

RETURNS public.automation_runs

LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp

AS $$

DECLARE
    v_automation public.automations;
    v_run public.automation_runs;

BEGIN

    -- ========================================================
    -- 1. AUTENTICACIÓN
    -- ========================================================

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;


    -- ========================================================
    -- 2. CUENTA ACTIVA
    -- ========================================================
    --
    -- La fuente de verdad para el acceso del usuario cliente
    -- es profiles.status = 'active'.
    --
    -- current_user_is_active() ya está definido en las
    -- migraciones anteriores y debe ser la comprobación común
    -- utilizada por esta frontera de seguridad.
    --
    -- Esta comprobación se realiza ANTES de consultar la
    -- automatización y antes de insertar automation_runs.
    --

    IF NOT public.current_user_is_active() THEN
        RAISE EXCEPTION
            'Acceso denegado: la cuenta no está activa';
    END IF;


    -- ========================================================
    -- 3. COMPROBAR QUE EXISTE LA AUTOMATIZACIÓN
    -- ========================================================

    SELECT *
    INTO v_automation
    FROM public.automations
    WHERE id = p_automation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'La automatización indicada no existe';
    END IF;


    -- ========================================================
    -- 4. AUTORIZACIÓN
    -- ========================================================
    --
    -- Worker activo:
    --     puede crear ejecuciones.
    --
    -- Cliente activo:
    --     solamente puede crear ejecuciones de una
    --     automatización cuyo propietario sea él mismo.
    --
    -- current_user_is_worker() ya incorpora la condición
    -- de worker activo según la arquitectura de Modira.
    --

    IF NOT (
        public.current_user_is_worker()
        OR v_automation.user_id = auth.uid()
    ) THEN

        RAISE EXCEPTION 'Acceso denegado';

    END IF;


    -- ========================================================
    -- 5. CREAR EJECUCIÓN
    -- ========================================================
    --
    -- company_id se obtiene directamente de la automatización.
    -- El cliente no puede proporcionar un company_id arbitrario.
    --
    -- Esto mantiene la coherencia con
    -- validate_automation_run_company(), definida en 005.
    --

    INSERT INTO public.automation_runs (
        automation_id,
        company_id,
        estado,
        inicio
    )

    VALUES (
        v_automation.id,
        v_automation.company_id,
        'pendiente',
        CURRENT_TIMESTAMP
    )

    RETURNING *
    INTO v_run;


    RETURN v_run;

END;

$$;


-- ============================================================
-- 6. PERMISOS DE LA RPC
-- ============================================================
--
-- La función solamente debe poder ejecutarse desde usuarios
-- autenticados.
--
-- anon y PUBLIC no pueden invocarla.
--

REVOKE ALL
ON FUNCTION public.create_automation_run(UUID)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.create_automation_run(UUID)
TO authenticated;


-- ============================================================
-- 7. DOCUMENTACIÓN
-- ============================================================

COMMENT ON FUNCTION public.create_automation_run(UUID)

IS
'Crea ejecuciones de automatizaciones únicamente para cuentas autenticadas y activas. Los workers activos pueden crear ejecuciones; los clientes activos únicamente pueden crear ejecuciones de sus propias automatizaciones.';


-- ============================================================
-- FIN DE 018
-- ============================================================