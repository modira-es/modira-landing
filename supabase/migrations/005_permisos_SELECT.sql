-- ============================================================
-- MODIRA - MIGRACIÓN 005
-- PERMISOS DE LECTURA PARA EL ÁREA DE TRABAJADORES
-- ============================================================

BEGIN;

GRANT SELECT ON public.workers TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

COMMIT;