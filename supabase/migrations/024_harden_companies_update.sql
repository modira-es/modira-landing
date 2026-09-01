BEGIN;

-- ============================================================
-- MODIRA — 024_harden_companies_update.sql
--
-- SECURITY — companies_update_own
--
-- Los clientes NO modifican directamente la empresa.
-- Los cambios de empresa se realizan mediante el flujo seguro
-- de solicitud de cambio / administración.
--
-- Los workers mantienen su acceso universal mediante sus
-- propias políticas/privilegios.
-- ============================================================

-- Eliminar cualquier UPDATE directo del rol authenticated.
REVOKE UPDATE
ON TABLE public.companies
FROM authenticated;

-- Eliminar la policy de UPDATE directo si existe.
DROP POLICY IF EXISTS companies_update_own
ON public.companies;

COMMIT;