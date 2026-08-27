BEGIN;
-- ============================================================
-- MODIRA — 006_support_and_activity.sql
-- Soporte + actividad.
-- ============================================================
-- ============================================================
-- 1. SUPPORT TICKETS — RLS
-- ============================================================
ALTER TABLE public.support_tickets
ENABLE ROW LEVEL SECURITY;
-- ============================================================
-- 2. CLIENT — SELECT
-- ============================================================
CREATE POLICY support_tickets_client_select
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
NOT public.current_user_is_worker()
AND
(
(
company_id IS NOT NULL
AND company_id =
public.current_user_company_id()
)
OR
(
company_id IS NULL
AND user_id = auth.uid()
)
)
);
-- ============================================================

-- 3. CLIENT — INSERT
-- ============================================================
CREATE POLICY support_tickets_client_insert
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
NOT public.current_user_is_worker()
AND user_id = auth.uid()
AND
(
company_id IS NULL
OR company_id =
public.current_user_company_id()
)
);
-- ============================================================
-- 4. WORKER — SELECT
-- ============================================================
CREATE POLICY support_tickets_worker_select
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
public.current_user_is_worker()
);
-- ============================================================
-- 5. WORKER — UPDATE
-- ============================================================
CREATE POLICY support_tickets_worker_update
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (
public.current_user_is_worker()
)

WITH CHECK (
public.current_user_is_worker()
);
GRANT SELECT, INSERT, UPDATE
ON public.support_tickets
TO authenticated;
REVOKE DELETE
ON public.support_tickets
FROM authenticated, anon;
-- ============================================================
-- 6. PROTEGER PROPIETARIO DEL TICKET
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_support_ticket_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
IF public.current_user_is_worker() THEN
IF NEW.user_id IS DISTINCT FROM OLD.user_id
OR NEW.company_id IS DISTINCT FROM OLD.company_id
THEN
RAISE EXCEPTION
'user_id y company_id no pueden modificarse';
END IF;
END IF;
RETURN NEW;
END;
$$;

CREATE TRIGGER support_tickets_protect_owner
BEFORE UPDATE
ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.protect_support_ticket_owner();
-- ============================================================
-- 7. CLOSE SUPPORT TICKET
-- ============================================================
CREATE OR REPLACE FUNCTION public.close_support_ticket(
p_ticket_id UUID
)
RETURNS public.support_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
v_ticket public.support_tickets;
BEGIN
IF NOT public.current_user_is_worker() THEN
RAISE EXCEPTION
'Acceso denegado: se requiere un trabajador activo';
END IF;
UPDATE public.support_tickets
SET
estado = 'cerrado',
fecha_cierre = CURRENT_TIMESTAMP,
updated_at = CURRENT_TIMESTAMP
WHERE id = p_ticket_id
RETURNING *
INTO v_ticket;

IF NOT FOUND THEN
RAISE EXCEPTION
'El ticket no existe';
END IF;
INSERT INTO public.activity_log (
user_id,
company_id,
action,
resource_type,
resource_id,
description
)
VALUES (
auth.uid(),
v_ticket.company_id,
'ticket.closed',
'support_ticket',
v_ticket.id,
'Ticket cerrado por un trabajador'
);
RETURN v_ticket;
END;
$$;
REVOKE ALL
ON FUNCTION public.close_support_ticket(UUID)
FROM PUBLIC, anon;
GRANT EXECUTE
ON FUNCTION public.close_support_ticket(UUID)
TO authenticated;
-- ============================================================
-- 8. ACTIVITY LOG
-- ============================================================

CREATE TABLE public.activity_log (
id UUID PRIMARY KEY
DEFAULT gen_random_uuid(),
user_id UUID
REFERENCES auth.users(id)
ON DELETE SET NULL,
company_id UUID
REFERENCES public.companies(id)
ON DELETE SET NULL,
action TEXT NOT NULL,
resource_type TEXT NOT NULL,
resource_id UUID,
description TEXT,
metadata JSONB,
created_at TIMESTAMPTZ NOT NULL
DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT activity_log_action_check
CHECK (
LENGTH(TRIM(action)) > 0
),
CONSTRAINT activity_log_resource_type_check
CHECK (
LENGTH(TRIM(resource_type)) > 0
)
);
-- ============================================================
-- 9. ACTIVITY LOG — ÍNDICES
-- ============================================================
CREATE INDEX idx_activity_log_user_id
ON public.activity_log(user_id);

CREATE INDEX idx_activity_log_company_id
ON public.activity_log(company_id);
CREATE INDEX idx_activity_log_resource_id
ON public.activity_log(resource_id);
CREATE INDEX idx_activity_log_created_at
ON public.activity_log(created_at DESC);
-- ============================================================
-- 10. ACTIVITY LOG — RLS
-- ============================================================
ALTER TABLE public.activity_log
ENABLE ROW LEVEL SECURITY;
-- ============================================================
-- 11. CLIENT — SELECT ACTIVITY
--
-- El cliente puede consultar:
--
-- 1. Actividad de su empresa.
--
-- 2. Actividad personal que no tenga company_id.
--
-- Los workers utilizan su policy independiente.
--
-- ============================================================
CREATE POLICY activity_log_client_select
ON public.activity_log
FOR SELECT
TO authenticated
USING (
NOT public.current_user_is_worker()
AND
(

(
company_id IS NOT NULL
AND company_id =
public.current_user_company_id()
)
OR
(
company_id IS NULL
AND user_id = auth.uid()
)
)
);
-- ============================================================
-- 12. WORKER — SELECT ACTIVITY
-- ============================================================
CREATE POLICY activity_log_worker_select
ON public.activity_log
FOR SELECT
TO authenticated
USING (
public.current_user_is_worker()
);
GRANT SELECT
ON public.activity_log
TO authenticated;
REVOKE INSERT, UPDATE, DELETE
ON public.activity_log
FROM authenticated;
-- ============================================================
-- 13. LOG ACTIVITY
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_activity(
p_action TEXT,

p_resource_type TEXT,
p_resource_id UUID DEFAULT NULL,
p_description TEXT DEFAULT NULL,
p_metadata JSONB DEFAULT NULL
)
RETURNS public.activity_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
v_user_id UUID;
v_company_id UUID;
v_activity public.activity_log;
BEGIN
v_user_id :=
auth.uid();
IF v_user_id IS NULL THEN
RAISE EXCEPTION
'Usuario no autenticado';
END IF;
IF public.current_user_is_worker() THEN
v_company_id := NULL;
ELSE
v_company_id :=
public.current_user_company_id();
END IF;
IF p_action IS NULL
OR TRIM(p_action) = ''
THEN
RAISE EXCEPTION
'La acción es obligatoria';
END IF;
IF p_resource_type IS NULL

OR TRIM(p_resource_type) = ''
THEN
RAISE EXCEPTION
'El tipo de recurso es obligatorio';
END IF;
INSERT INTO public.activity_log (
user_id,
company_id,
action,
resource_type,
resource_id,
description,
metadata
)
VALUES (
v_user_id,
v_company_id,
TRIM(p_action),
TRIM(p_resource_type),
p_resource_id,
p_description,
p_metadata
)
RETURNING *
INTO v_activity;
RETURN v_activity;
END;
$$;
REVOKE ALL
ON FUNCTION public.log_activity(
TEXT,
TEXT,
UUID,
TEXT,
JSONB
)

FROM PUBLIC, anon;
GRANT EXECUTE
ON FUNCTION public.log_activity(
TEXT,
TEXT,
UUID,
TEXT,
JSONB
)
TO authenticated;
-- ============================================================
-- 14. VERIFICACIONES FINALES
-- ============================================================
DO $$
DECLARE
v_count INTEGER;
BEGIN
-- --------------------------------------------------------
-- activity_log
-- --------------------------------------------------------
SELECT COUNT(*)
INTO v_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'activity_log';
IF v_count <> 1 THEN
RAISE EXCEPTION
'006 failed: activity_log does not exist';
END IF;
-- --------------------------------------------------------
-- RLS
-- --------------------------------------------------------

SELECT COUNT(*)
INTO v_count
FROM pg_class
WHERE oid = 'public.activity_log'::regclass
AND relrowsecurity = TRUE;
IF v_count <> 1 THEN
RAISE EXCEPTION
'006 failed: RLS is not enabled on activity_log';
END IF;
-- --------------------------------------------------------
-- Policies
-- --------------------------------------------------------
SELECT COUNT(*)
INTO v_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'activity_log'
AND policyname IN (
'activity_log_client_select',
'activity_log_worker_select'
);
IF v_count <> 2 THEN
RAISE EXCEPTION
'006 failed: activity_log policies are incomplete';
END IF;
-- --------------------------------------------------------
-- RPC
-- --------------------------------------------------------
SELECT COUNT(*)
INTO v_count
FROM pg_proc p
JOIN pg_namespace n

ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname = 'log_activity';
IF v_count <> 1 THEN
RAISE EXCEPTION
'006 failed: log_activity() does not exist';
END IF;
-- --------------------------------------------------------
-- Índice resource_id
-- --------------------------------------------------------
SELECT COUNT(*)
INTO v_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'activity_log'
AND indexname = 'idx_activity_log_resource_id';
IF v_count <> 1 THEN
RAISE EXCEPTION
'006 failed: idx_activity_log_resource_id is missing';
END IF;
END $$;

-- ------------------------------------------------------------
-- VERIFICACIONES FINALES DE SOPORTE / ACTIVIDAD
-- ------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='activity_log' AND indexname='idx_activity_log_resource_id') THEN
        RAISE EXCEPTION '006 failed: idx_activity_log_resource_id is missing';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='activity_log' AND indexname='idx_activity_log_resource') THEN
        RAISE EXCEPTION '006 failed: obsolete idx_activity_log_resource exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.support_tickets'::regclass AND conname='support_tickets_estado_check') THEN
        RAISE EXCEPTION '006 failed: support_tickets_estado_check is missing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.support_tickets'::regclass AND conname='support_tickets_prioridad_check') THEN
        RAISE EXCEPTION '006 failed: support_tickets_prioridad_check is missing';
    END IF;
END $$;

COMMIT;
