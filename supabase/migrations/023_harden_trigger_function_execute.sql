BEGIN;

-- ============================================================
-- MODIRA — 023_harden_trigger_function_execute.sql
--
-- SECURITY HARDENING
--
-- Estas funciones son utilizadas exclusivamente por triggers
-- internos de PostgreSQL. Ningún usuario debe poder invocarlas
-- directamente mediante RPC/PostgREST.
-- ============================================================

REVOKE EXECUTE
ON FUNCTION public.protect_support_ticket_owner()
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE
ON FUNCTION public.validate_automation_run_company()
FROM PUBLIC, anon, authenticated;

COMMIT;