-- ============================================================
-- MODIRA - MIGRACIÓN 007
-- ESTADO DE CUENTA DE TRABAJADOR
-- ============================================================
--
-- OBJETIVO:
--
-- Permitir al frontend determinar de forma segura si la cuenta
-- autenticada pertenece a un trabajador, independientemente
-- de si actualmente está activo o desactivado.
--
-- Esto permite diferenciar:
--
--   Cliente normal
--       -> no existe en workers
--
--   Trabajador activo
--       -> existe en workers + is_active = true
--
--   Trabajador inactivo
--       -> existe en workers + is_active = false
--
-- IMPORTANTE:
--
-- - NO modifica ninguna tabla.
-- - NO modifica ninguna policy existente.
-- - NO modifica auth.users.
-- - NO modifica profiles.
-- - NO sustituye current_user_is_worker().
-- - NO modifica las migraciones 001-006.
--
-- La función se utilizará únicamente para que el frontend
-- pueda aplicar correctamente las reglas de navegación.
--
-- ============================================================

BEGIN;


-- ============================================================
-- 1. FUNCIÓN
-- ============================================================
--
-- Devuelve:
--
--   true  -> la cuenta autenticada pertenece a workers
--   false -> no pertenece a workers
--
-- No tiene en cuenta is_active porque necesitamos distinguir
-- entre:
--
--   trabajador activo
--   trabajador inactivo
--
-- La función solo puede consultar el registro correspondiente
-- al usuario actualmente autenticado.
--
-- SECURITY DEFINER permite realizar esta comprobación aunque
-- el usuario no pueda consultar directamente un trabajador
-- inactivo mediante RLS.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_is_worker_account()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workers w
        WHERE w.auth_user_id = auth.uid()
    );
$$;


-- ============================================================
-- 2. SEGURIDAD DE EJECUCIÓN
-- ============================================================
--
-- Evitamos que usuarios no autenticados puedan ejecutar
-- esta función.
--
-- El frontend únicamente necesita ejecutarla como
-- usuario autenticado.
--
-- ============================================================

REVOKE EXECUTE
ON FUNCTION public.current_user_is_worker_account()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.current_user_is_worker_account()
TO authenticated;


-- ============================================================
-- 3. VERIFICACIÓN
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
          ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_is_worker_account'
    ) THEN

        RAISE EXCEPTION
            'Migration 007 failed: current_user_is_worker_account() does not exist';

    END IF;

END $$;


COMMIT;


-- ============================================================
-- RESULTADO
-- ============================================================
--
-- Cliente normal:
--
--   current_user_is_worker_account() -> false
--
-- Trabajador activo:
--
--   current_user_is_worker_account() -> true
--
-- Trabajador inactivo:
--
--   current_user_is_worker_account() -> true
--
-- La diferencia entre activo/inactivo continúa dependiendo
-- de public.workers.is_active y de current_user_is_worker().
--
-- ============================================================