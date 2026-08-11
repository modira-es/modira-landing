BEGIN;

-- ============================================================
-- MODIRA - MIGRACIÓN 023
-- PERMISO DE LECTURA DE EMPRESAS PARA CLIENTES AUTENTICADOS
-- ============================================================
--
-- Permite al rol authenticated realizar SELECT sobre
-- public.companies.
--
-- IMPORTANTE:
-- Este GRANT NO permite ver todas las empresas.
-- Las filas que puede consultar cada usuario siguen estando
-- controladas por las políticas RLS existentes.
--
-- ============================================================

GRANT SELECT
ON public.companies
TO authenticated;

COMMIT;