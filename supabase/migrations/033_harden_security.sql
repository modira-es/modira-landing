BEGIN;

-- ============================================================
-- MODIRA
-- 033 — HARDENING CONSOLIDADO DE SEGURIDAD
--
-- OBJETIVOS
--   1. Limitar tamaños de datos persistidos.
--   2. Limitar payloads JSONB.
--   3. Añadir rate limits reales en PostgreSQL.
--   4. Mantener RLS y permisos existentes salvo bypasses
--      detectados durante la auditoría.
--   5. Evitar escrituras directas que permitan saltarse RPCs
--      de negocio.
--   6. Proteger relaciones multi-tenant en budgets.
--   7. No ampliar capacidades de usuarios.
--   8. Mantener la lógica funcional existente.
--
-- NOTA:
-- Los CHECK de hardening utilizan NOT VALID para evitar que
-- datos históricos incompatibles bloqueen el despliegue.
-- Los CHECK sí se aplican inmediatamente a nuevas filas y
-- modificaciones posteriores.
-- ============================================================


-- ============================================================
-- 1. LIMITES DE LONGITUD
-- ============================================================


-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_nombre_length_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_nombre_length_check
CHECK (
    nombre IS NULL
    OR length(nombre) <= 200
) NOT VALID;


ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_telefono_length_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_telefono_length_check
CHECK (
    telefono IS NULL
    OR length(telefono) <= 32
) NOT VALID;


-- ------------------------------------------------------------
-- COMPANY CHANGE REQUESTS
-- ------------------------------------------------------------

ALTER TABLE public.company_change_requests
DROP CONSTRAINT IF EXISTS company_change_requested_company_name_length_check;

ALTER TABLE public.company_change_requests
ADD CONSTRAINT company_change_requested_company_name_length_check
CHECK (
    requested_company_name IS NULL
    OR length(requested_company_name) <= 200
) NOT VALID;


ALTER TABLE public.company_change_requests
DROP CONSTRAINT IF EXISTS company_change_reason_length_check;

ALTER TABLE public.company_change_requests
ADD CONSTRAINT company_change_reason_length_check
CHECK (
    reason IS NULL
    OR length(reason) <= 2000
) NOT VALID;


ALTER TABLE public.company_change_requests
DROP CONSTRAINT IF EXISTS company_change_review_notes_length_check;

ALTER TABLE public.company_change_requests
ADD CONSTRAINT company_change_review_notes_length_check
CHECK (
    review_notes IS NULL
    OR length(review_notes) <= 5000
) NOT VALID;


-- ------------------------------------------------------------
-- SUPPORT TICKETS
-- ------------------------------------------------------------

ALTER TABLE public.support_tickets
DROP CONSTRAINT IF EXISTS support_tickets_titulo_length_check;

ALTER TABLE public.support_tickets
ADD CONSTRAINT support_tickets_titulo_length_check
CHECK (
    titulo IS NULL
    OR length(titulo) <= 200
) NOT VALID;


ALTER TABLE public.support_tickets
DROP CONSTRAINT IF EXISTS support_tickets_descripcion_length_check;

ALTER TABLE public.support_tickets
ADD CONSTRAINT support_tickets_descripcion_length_check
CHECK (
    descripcion IS NULL
    OR length(descripcion) <= 5000
) NOT VALID;


-- ------------------------------------------------------------
-- PROJECTS
-- ------------------------------------------------------------

ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_nombre_length_check;

ALTER TABLE public.projects
ADD CONSTRAINT projects_nombre_length_check
CHECK (
    nombre IS NULL
    OR length(nombre) <= 200
) NOT VALID;


ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_descripcion_length_check;

ALTER TABLE public.projects
ADD CONSTRAINT projects_descripcion_length_check
CHECK (
    descripcion IS NULL
    OR length(descripcion) <= 10000
) NOT VALID;


-- ------------------------------------------------------------
-- PROJECT CHANGE REQUESTS
-- ------------------------------------------------------------

ALTER TABLE public.project_change_requests
DROP CONSTRAINT IF EXISTS project_change_requests_description_length_check;

ALTER TABLE public.project_change_requests
ADD CONSTRAINT project_change_requests_description_length_check
CHECK (
    description IS NULL
    OR length(description) <= 5000
) NOT VALID;


ALTER TABLE public.project_change_requests
DROP CONSTRAINT IF EXISTS project_change_requests_review_notes_length_check;

ALTER TABLE public.project_change_requests
ADD CONSTRAINT project_change_requests_review_notes_length_check
CHECK (
    review_notes IS NULL
    OR length(review_notes) <= 5000
) NOT VALID;


-- ------------------------------------------------------------
-- CLIENTS
-- ------------------------------------------------------------

ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_nombre_length_check;

ALTER TABLE public.clients
ADD CONSTRAINT clients_nombre_length_check
CHECK (
    nombre IS NULL
    OR length(nombre) <= 200
) NOT VALID;


ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_empresa_length_check;

ALTER TABLE public.clients
ADD CONSTRAINT clients_empresa_length_check
CHECK (
    empresa IS NULL
    OR length(empresa) <= 200
) NOT VALID;


ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_telefono_length_check;

ALTER TABLE public.clients
ADD CONSTRAINT clients_telefono_length_check
CHECK (
    telefono IS NULL
    OR length(telefono) <= 32
) NOT VALID;


ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_contacto_principal_length_check;

ALTER TABLE public.clients
ADD CONSTRAINT clients_contacto_principal_length_check
CHECK (
    contacto_principal IS NULL
    OR length(contacto_principal) <= 200
) NOT VALID;


ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_cif_vat_length_check;

ALTER TABLE public.clients
ADD CONSTRAINT clients_cif_vat_length_check
CHECK (
    cif_vat IS NULL
    OR length(cif_vat) <= 32
) NOT VALID;


ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_direccion_length_check;

ALTER TABLE public.clients
ADD CONSTRAINT clients_direccion_length_check
CHECK (
    direccion IS NULL
    OR length(direccion) <= 300
) NOT VALID;


ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_codigo_postal_length_check;

ALTER TABLE public.clients
ADD CONSTRAINT clients_codigo_postal_length_check
CHECK (
    codigo_postal IS NULL
    OR length(codigo_postal) <= 20
) NOT VALID;


ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_ciudad_length_check;

ALTER TABLE public.clients
ADD CONSTRAINT clients_ciudad_length_check
CHECK (
    ciudad IS NULL
    OR length(ciudad) <= 100
) NOT VALID;


ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_provincia_length_check;

ALTER TABLE public.clients
ADD CONSTRAINT clients_provincia_length_check
CHECK (
    provincia IS NULL
    OR length(provincia) <= 100
) NOT VALID;


ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_sector_length_check;

ALTER TABLE public.clients
ADD CONSTRAINT clients_sector_length_check
CHECK (
    sector IS NULL
    OR length(sector) <= 100
) NOT VALID;


ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_notas_length_check;

ALTER TABLE public.clients
ADD CONSTRAINT clients_notas_length_check
CHECK (
    notas IS NULL
    OR length(notas) <= 5000
) NOT VALID;


-- ------------------------------------------------------------
-- CLIENTS — JSONB ETIQUETAS
-- ------------------------------------------------------------

ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_etiquetas_size_hardening_check;

ALTER TABLE public.clients
ADD CONSTRAINT clients_etiquetas_size_hardening_check
CHECK (
    etiquetas IS NULL
    OR pg_column_size(etiquetas) <= 51200
) NOT VALID;


-- ------------------------------------------------------------
-- AUTOMATIONS
-- ------------------------------------------------------------

ALTER TABLE public.automations
DROP CONSTRAINT IF EXISTS automations_nombre_length_check;

ALTER TABLE public.automations
ADD CONSTRAINT automations_nombre_length_check
CHECK (
    nombre IS NULL
    OR length(nombre) <= 200
) NOT VALID;


ALTER TABLE public.automations
DROP CONSTRAINT IF EXISTS automations_descripcion_length_check;

ALTER TABLE public.automations
ADD CONSTRAINT automations_descripcion_length_check
CHECK (
    descripcion IS NULL
    OR length(descripcion) <= 5000
) NOT VALID;


ALTER TABLE public.automations
DROP CONSTRAINT IF EXISTS automations_frecuencia_length_check;

ALTER TABLE public.automations
ADD CONSTRAINT automations_frecuencia_length_check
CHECK (
    frecuencia IS NULL
    OR length(frecuencia) <= 50
) NOT VALID;


-- ------------------------------------------------------------
-- QUOTATIONS
-- ------------------------------------------------------------

ALTER TABLE public.quotations
DROP CONSTRAINT IF EXISTS quotations_numero_presupuesto_length_check;

ALTER TABLE public.quotations
ADD CONSTRAINT quotations_numero_presupuesto_length_check
CHECK (
    numero_presupuesto IS NULL
    OR length(numero_presupuesto) <= 50
) NOT VALID;


ALTER TABLE public.quotations
DROP CONSTRAINT IF EXISTS quotations_titulo_length_check;

ALTER TABLE public.quotations
ADD CONSTRAINT quotations_titulo_length_check
CHECK (
    titulo IS NULL
    OR length(titulo) <= 200
) NOT VALID;


ALTER TABLE public.quotations
DROP CONSTRAINT IF EXISTS quotations_descripcion_detallada_length_check;

ALTER TABLE public.quotations
ADD CONSTRAINT quotations_descripcion_detallada_length_check
CHECK (
    descripcion_detallada IS NULL
    OR length(descripcion_detallada) <= 10000
) NOT VALID;


ALTER TABLE public.quotations
DROP CONSTRAINT IF EXISTS quotations_notas_length_check;

ALTER TABLE public.quotations
ADD CONSTRAINT quotations_notas_length_check
CHECK (
    notas IS NULL
    OR length(notas) <= 5000
) NOT VALID;


ALTER TABLE public.quotations
DROP CONSTRAINT IF EXISTS quotations_document_path_length_check;

ALTER TABLE public.quotations
ADD CONSTRAINT quotations_document_path_length_check
CHECK (
    document_path IS NULL
    OR length(document_path) <= 500
) NOT VALID;


-- ------------------------------------------------------------
-- INVOICES
-- ------------------------------------------------------------

ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_numero_factura_length_check;

ALTER TABLE public.invoices
ADD CONSTRAINT invoices_numero_factura_length_check
CHECK (
    numero_factura IS NULL
    OR length(numero_factura) <= 50
) NOT VALID;


ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_descripcion_length_check;

ALTER TABLE public.invoices
ADD CONSTRAINT invoices_descripcion_length_check
CHECK (
    descripcion IS NULL
    OR length(descripcion) <= 5000
) NOT VALID;


ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_document_path_length_check;

ALTER TABLE public.invoices
ADD CONSTRAINT invoices_document_path_length_check
CHECK (
    document_path IS NULL
    OR length(document_path) <= 500
) NOT VALID;


-- ------------------------------------------------------------
-- MAINTENANCE CONTRACTS
-- ------------------------------------------------------------

ALTER TABLE public.maintenance_contracts
DROP CONSTRAINT IF EXISTS maintenance_contracts_nombre_plan_length_check;

ALTER TABLE public.maintenance_contracts
ADD CONSTRAINT maintenance_contracts_nombre_plan_length_check
CHECK (
    nombre_plan IS NULL
    OR length(nombre_plan) <= 200
) NOT VALID;


ALTER TABLE public.maintenance_contracts
DROP CONSTRAINT IF EXISTS maintenance_contracts_descripcion_length_check;

ALTER TABLE public.maintenance_contracts
ADD CONSTRAINT maintenance_contracts_descripcion_length_check
CHECK (
    descripcion IS NULL
    OR length(descripcion) <= 5000
) NOT VALID;


ALTER TABLE public.maintenance_contracts
DROP CONSTRAINT IF EXISTS maintenance_contracts_periodicidad_length_check;

ALTER TABLE public.maintenance_contracts
ADD CONSTRAINT maintenance_contracts_periodicidad_length_check
CHECK (
    periodicidad IS NULL
    OR length(periodicidad) <= 20
) NOT VALID;


ALTER TABLE public.maintenance_contracts
DROP CONSTRAINT IF EXISTS maintenance_contracts_estado_length_check;

ALTER TABLE public.maintenance_contracts
ADD CONSTRAINT maintenance_contracts_estado_length_check
CHECK (
    estado IS NULL
    OR length(estado) <= 20
) NOT VALID;


-- ------------------------------------------------------------
-- PROJECT DOCUMENTS
-- ------------------------------------------------------------

ALTER TABLE public.project_documents
DROP CONSTRAINT IF EXISTS project_documents_file_name_length_check;

ALTER TABLE public.project_documents
ADD CONSTRAINT project_documents_file_name_length_check
CHECK (
    file_name IS NULL
    OR length(file_name) <= 255
) NOT VALID;


ALTER TABLE public.project_documents
DROP CONSTRAINT IF EXISTS project_documents_storage_path_length_check;

ALTER TABLE public.project_documents
ADD CONSTRAINT project_documents_storage_path_length_check
CHECK (
    storage_path IS NULL
    OR length(storage_path) <= 500
) NOT VALID;


ALTER TABLE public.project_documents
DROP CONSTRAINT IF EXISTS project_documents_mime_type_length_check;

ALTER TABLE public.project_documents
ADD CONSTRAINT project_documents_mime_type_length_check
CHECK (
    mime_type IS NULL
    OR length(mime_type) <= 100
) NOT VALID;


-- ------------------------------------------------------------
-- ACTIVITY LOG
-- ------------------------------------------------------------

ALTER TABLE public.activity_log
DROP CONSTRAINT IF EXISTS activity_log_action_length_hardening_check;

ALTER TABLE public.activity_log
ADD CONSTRAINT activity_log_action_length_hardening_check
CHECK (
    action IS NULL
    OR length(action) <= 100
) NOT VALID;


ALTER TABLE public.activity_log
DROP CONSTRAINT IF EXISTS activity_log_resource_type_length_hardening_check;

ALTER TABLE public.activity_log
ADD CONSTRAINT activity_log_resource_type_length_hardening_check
CHECK (
    resource_type IS NULL
    OR length(resource_type) <= 100
) NOT VALID;


ALTER TABLE public.activity_log
DROP CONSTRAINT IF EXISTS activity_log_description_length_hardening_check;

ALTER TABLE public.activity_log
ADD CONSTRAINT activity_log_description_length_hardening_check
CHECK (
    description IS NULL
    OR length(description) <= 2000
) NOT VALID;


ALTER TABLE public.activity_log
DROP CONSTRAINT IF EXISTS activity_log_metadata_size_hardening_check;

ALTER TABLE public.activity_log
ADD CONSTRAINT activity_log_metadata_size_hardening_check
CHECK (
    metadata IS NULL
    OR pg_column_size(metadata) <= 51200
) NOT VALID;


-- ============================================================
-- 2. BUDGETS — LIMITES
-- ============================================================

ALTER TABLE public.budgets
DROP CONSTRAINT IF EXISTS budgets_descripcion_length_hardening_check;

ALTER TABLE public.budgets
ADD CONSTRAINT budgets_descripcion_length_hardening_check
CHECK (
    descripcion IS NULL
    OR length(descripcion) <= 5000
) NOT VALID;


ALTER TABLE public.budgets
DROP CONSTRAINT IF EXISTS budgets_estado_length_hardening_check;

ALTER TABLE public.budgets
ADD CONSTRAINT budgets_estado_length_hardening_check
CHECK (
    estado IS NULL
    OR length(estado) <= 50
) NOT VALID;


-- ============================================================
-- 3. BUDGETS — PROTECCIÓN DE CAMPOS DE AUTORIZACIÓN
--
-- El cliente puede trabajar con budgets de su empresa,
-- pero no debe poder reasignar un presupuesto a:
--
--   - otro usuario
--   - otra empresa
--
-- Tampoco debe poder asociarlo a un proyecto de otra empresa.
-- ============================================================

DROP POLICY IF EXISTS budgets_company_access
ON public.budgets;

CREATE POLICY budgets_company_access
ON public.budgets
FOR ALL
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
    AND user_id = auth.uid()
    AND (
        project_id IS NULL
        OR EXISTS (
            SELECT 1
            FROM public.projects p
            WHERE p.id = budgets.project_id
              AND p.company_id = public.current_user_company_id()
        )
    )
);


-- ============================================================
-- 4. TRIGGER BUDGETS — PROTEGER CAMPOS INMUTABLES
--
-- En UPDATE:
--   user_id y company_id no pueden cambiar.
--
-- project_id sí puede cambiar, pero queda sujeto a la
-- comprobación anterior de empresa mediante RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_budget_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN

    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    IF public.current_user_is_worker() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN

        IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION
                'No se puede modificar el propietario del presupuesto';
        END IF;

        IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
            RAISE EXCEPTION
                'No se puede modificar la empresa del presupuesto';
        END IF;

    END IF;

    RETURN NEW;

END;
$$;


REVOKE ALL
ON FUNCTION public.protect_budget_ownership()
FROM PUBLIC, anon, authenticated;


DROP TRIGGER IF EXISTS protect_budget_ownership
ON public.budgets;

CREATE TRIGGER protect_budget_ownership
BEFORE INSERT OR UPDATE
ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.protect_budget_ownership();


-- ============================================================
-- 5. TABLA DE RATE LIMITS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.security_rate_limits (
    rate_key TEXT PRIMARY KEY,

    window_started_at TIMESTAMPTZ NOT NULL
        DEFAULT clock_timestamp(),

    request_count INTEGER NOT NULL
        DEFAULT 0,

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT clock_timestamp(),

    CONSTRAINT security_rate_limits_key_length_check
        CHECK (length(rate_key) <= 300),

    CONSTRAINT security_rate_limits_count_check
        CHECK (request_count >= 0)
);


ALTER TABLE public.security_rate_limits
ENABLE ROW LEVEL SECURITY;


REVOKE ALL
ON public.security_rate_limits
FROM PUBLIC, anon, authenticated;


GRANT SELECT, INSERT, UPDATE, DELETE
ON public.security_rate_limits
TO service_role;


-- ============================================================
-- 6. FUNCIÓN INTERNA DE RATE LIMIT
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_security_rate_limit(
    p_rate_key TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_window_start TIMESTAMPTZ;
    v_request_count INTEGER;
BEGIN

    IF p_rate_key IS NULL
       OR length(p_rate_key) = 0
       OR length(p_rate_key) > 300
    THEN
        RAISE EXCEPTION 'Invalid rate limit key';
    END IF;


    IF p_limit IS NULL
       OR p_limit < 1
       OR p_limit > 1000
    THEN
        RAISE EXCEPTION 'Invalid rate limit';
    END IF;


    IF p_window_seconds IS NULL
       OR p_window_seconds < 1
       OR p_window_seconds > 86400
    THEN
        RAISE EXCEPTION 'Invalid rate limit window';
    END IF;


    PERFORM pg_advisory_xact_lock(
        hashtextextended(p_rate_key, 0)
    );


    SELECT
        window_started_at,
        request_count
    INTO
        v_window_start,
        v_request_count
    FROM public.security_rate_limits
    WHERE rate_key = p_rate_key
    FOR UPDATE;


    IF NOT FOUND THEN

        INSERT INTO public.security_rate_limits (
            rate_key,
            window_started_at,
            request_count,
            updated_at
        )
        VALUES (
            p_rate_key,
            v_now,
            1,
            v_now
        );

        RETURN;
    END IF;


    IF v_now >=
       v_window_start
       + make_interval(secs => p_window_seconds)
    THEN

        UPDATE public.security_rate_limits
        SET
            window_started_at = v_now,
            request_count = 1,
            updated_at = v_now
        WHERE rate_key = p_rate_key;

        RETURN;
    END IF;


    IF v_request_count >= p_limit THEN

        RAISE EXCEPTION 'Rate limit exceeded'
            USING ERRCODE = 'P0001';

    END IF;


    UPDATE public.security_rate_limits
    SET
        request_count = request_count + 1,
        updated_at = v_now
    WHERE rate_key = p_rate_key;

END;
$$;


REVOKE ALL
ON FUNCTION public.enforce_security_rate_limit(
    TEXT,
    INTEGER,
    INTEGER
)
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE
ON FUNCTION public.enforce_security_rate_limit(
    TEXT,
    INTEGER,
    INTEGER
)
TO service_role;


-- ============================================================
-- 7. TRIGGER CENTRAL DE RATE LIMIT
-- ============================================================

CREATE OR REPLACE FUNCTION public.security_rate_limit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_rate_key TEXT;
BEGIN

    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;


    v_user_id := auth.uid();


    IF public.current_user_is_worker() THEN
        RETURN NEW;
    END IF;


    v_rate_key :=
        TG_TABLE_SCHEMA
        || ':'
        || TG_TABLE_NAME
        || ':'
        || v_user_id::TEXT;


    -- ========================================================
    -- PROJECTS — 10 / HORA
    -- ========================================================

    IF TG_TABLE_NAME = 'projects' THEN

        PERFORM public.enforce_security_rate_limit(
            v_rate_key,
            10,
            3600
        );

        RETURN NEW;
    END IF;


    -- ========================================================
    -- COMPANY CHANGE REQUESTS — 3 / 24 HORAS
    -- ========================================================

    IF TG_TABLE_NAME = 'company_change_requests' THEN

        PERFORM public.enforce_security_rate_limit(
            v_rate_key,
            3,
            86400
        );

        RETURN NEW;
    END IF;


    -- ========================================================
    -- PROJECT CHANGE REQUESTS — 10 / HORA
    -- ========================================================

    IF TG_TABLE_NAME = 'project_change_requests' THEN

        PERFORM public.enforce_security_rate_limit(
            v_rate_key,
            10,
            3600
        );

        RETURN NEW;
    END IF;


    -- ========================================================
    -- SUPPORT TICKETS — 5 / HORA
    -- ========================================================

    IF TG_TABLE_NAME = 'support_tickets' THEN

        PERFORM public.enforce_security_rate_limit(
            v_rate_key,
            5,
            3600
        );

        RETURN NEW;
    END IF;


    -- ========================================================
    -- AUTOMATIONS — 10 / HORA
    -- ========================================================

    IF TG_TABLE_NAME = 'automations' THEN

        PERFORM public.enforce_security_rate_limit(
            v_rate_key,
            10,
            3600
        );

        RETURN NEW;
    END IF;


    -- ========================================================
    -- CLIENTS — 100 / HORA
    -- ========================================================

    IF TG_TABLE_NAME = 'clients' THEN

        PERFORM public.enforce_security_rate_limit(
            v_rate_key,
            100,
            3600
        );

        RETURN NEW;
    END IF;


    -- ========================================================
    -- MAINTENANCE CONTRACTS — 50 / HORA
    -- ========================================================

    IF TG_TABLE_NAME = 'maintenance_contracts' THEN

        PERFORM public.enforce_security_rate_limit(
            v_rate_key,
            50,
            3600
        );

        RETURN NEW;
    END IF;


    RETURN NEW;

END;
$$;


REVOKE ALL
ON FUNCTION public.security_rate_limit_trigger()
FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 8. ACTIVACIÓN DE RATE LIMITS
-- ============================================================


DROP TRIGGER IF EXISTS security_rate_limit_projects
ON public.projects;

CREATE TRIGGER security_rate_limit_projects
BEFORE INSERT
ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.security_rate_limit_trigger();


DROP TRIGGER IF EXISTS security_rate_limit_company_change_requests
ON public.company_change_requests;

CREATE TRIGGER security_rate_limit_company_change_requests
BEFORE INSERT
ON public.company_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.security_rate_limit_trigger();


DROP TRIGGER IF EXISTS security_rate_limit_project_change_requests
ON public.project_change_requests;

CREATE TRIGGER security_rate_limit_project_change_requests
BEFORE INSERT
ON public.project_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.security_rate_limit_trigger();


DROP TRIGGER IF EXISTS security_rate_limit_support_tickets
ON public.support_tickets;

CREATE TRIGGER security_rate_limit_support_tickets
BEFORE INSERT
ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.security_rate_limit_trigger();


DROP TRIGGER IF EXISTS security_rate_limit_automations
ON public.automations;

CREATE TRIGGER security_rate_limit_automations
BEFORE INSERT
ON public.automations
FOR EACH ROW
EXECUTE FUNCTION public.security_rate_limit_trigger();


DROP TRIGGER IF EXISTS security_rate_limit_clients
ON public.clients;

CREATE TRIGGER security_rate_limit_clients
BEFORE INSERT
ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.security_rate_limit_trigger();


DROP TRIGGER IF EXISTS security_rate_limit_maintenance_contracts
ON public.maintenance_contracts;

CREATE TRIGGER security_rate_limit_maintenance_contracts
BEFORE INSERT
ON public.maintenance_contracts
FOR EACH ROW
EXECUTE FUNCTION public.security_rate_limit_trigger();


-- ============================================================
-- 9. PROJECTS — ELIMINAR BYPASS DEL RPC DE CREACIÓN
--
-- La creación de proyectos debe pasar por:
--
--   create_project()
--   create_project_by_worker()
--
-- El INSERT directo permitía al cliente proporcionar
-- directamente campos que la RPC controla.
-- ============================================================

REVOKE INSERT
ON public.projects
FROM authenticated;


-- ============================================================
-- 10. COMPANY CHANGE REQUESTS — ELIMINAR BYPASS DEL RPC
--
-- La creación debe pasar por:
--
--   request_company_change()
--
-- La RPC centraliza la resolución de empresa, comprobación
-- de empresa actual y control de solicitudes pendientes.
-- ============================================================

REVOKE INSERT
ON public.company_change_requests
FROM authenticated;


-- ============================================================
-- 11. FUNCIONES SENSIBLES DE AI
-- ============================================================

REVOKE EXECUTE
ON FUNCTION public.consume_ai_rate_limit(
    TEXT,
    INTEGER,
    INTEGER
)
FROM anon, authenticated;


GRANT EXECUTE
ON FUNCTION public.consume_ai_rate_limit(
    TEXT,
    INTEGER,
    INTEGER
)
TO service_role;


-- ============================================================
-- 12. FUNCIONES ADMINISTRATIVAS
-- ============================================================

REVOKE EXECUTE
ON FUNCTION public.admin_list_profiles()
FROM anon;


REVOKE EXECUTE
ON FUNCTION public.admin_set_profile_role(
    UUID,
    TEXT
)
FROM anon;


REVOKE EXECUTE
ON FUNCTION public.admin_set_profile_status(
    UUID,
    TEXT
)
FROM anon;


REVOKE EXECUTE
ON FUNCTION public.admin_update_profile_company(
    UUID,
    UUID
)
FROM anon;


-- ============================================================
-- 13. TABLAS INTERNAS AI
-- ============================================================

REVOKE ALL
ON public.ai_quota_config
FROM anon, authenticated;


REVOKE ALL
ON public.ai_usage_periods
FROM anon, authenticated;


REVOKE ALL
ON public.ai_usage_reservations
FROM anon, authenticated;


REVOKE ALL
ON public.ai_anonymous_quota_periods
FROM anon, authenticated;


-- ============================================================
-- 14. LIMPIEZA DE RATE LIMITS
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_security_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN

    DELETE FROM public.security_rate_limits
    WHERE updated_at <
          clock_timestamp() - INTERVAL '48 hours';

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN v_deleted;

END;
$$;


REVOKE ALL
ON FUNCTION public.cleanup_security_rate_limits()
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE
ON FUNCTION public.cleanup_security_rate_limits()
TO service_role;


CREATE INDEX IF NOT EXISTS
idx_security_rate_limits_updated_at
ON public.security_rate_limits(updated_at);


-- ============================================================
-- 15. VALIDACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_has_insert_projects BOOLEAN;
    v_has_insert_company_changes BOOLEAN;
BEGIN

    -- --------------------------------------------------------
    -- security_rate_limits
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'security_rate_limits'
    ) THEN

        RAISE EXCEPTION
            'HARDENING FAILED: security_rate_limits missing';

    END IF;


    -- --------------------------------------------------------
    -- enforce_security_rate_limit
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
          ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'enforce_security_rate_limit'
          AND p.pronargs = 3
    ) THEN

        RAISE EXCEPTION
            'HARDENING FAILED: enforce_security_rate_limit missing';

    END IF;


    -- --------------------------------------------------------
    -- projects INSERT
    -- --------------------------------------------------------

    SELECT has_table_privilege(
        'authenticated',
        'public.projects',
        'INSERT'
    )
    INTO v_has_insert_projects;


    IF v_has_insert_projects THEN

        RAISE EXCEPTION
            'HARDENING FAILED: authenticated still has INSERT on projects';

    END IF;


    -- --------------------------------------------------------
    -- company_change_requests INSERT
    -- --------------------------------------------------------

    SELECT has_table_privilege(
        'authenticated',
        'public.company_change_requests',
        'INSERT'
    )
    INTO v_has_insert_company_changes;


    IF v_has_insert_company_changes THEN

        RAISE EXCEPTION
            'HARDENING FAILED: authenticated still has INSERT on company_change_requests';

    END IF;


    -- --------------------------------------------------------
    -- RATE LIMIT TRIGGERS
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'security_rate_limit_projects'
          AND NOT tgisinternal
    ) THEN

        RAISE EXCEPTION
            'HARDENING FAILED: projects rate limit trigger missing';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname =
            'security_rate_limit_company_change_requests'
          AND NOT tgisinternal
    ) THEN

        RAISE EXCEPTION
            'HARDENING FAILED: company change rate limit trigger missing';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname =
            'security_rate_limit_project_change_requests'
          AND NOT tgisinternal
    ) THEN

        RAISE EXCEPTION
            'HARDENING FAILED: project change rate limit trigger missing';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname =
            'security_rate_limit_support_tickets'
          AND NOT tgisinternal
    ) THEN

        RAISE EXCEPTION
            'HARDENING FAILED: support ticket rate limit trigger missing';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname =
            'security_rate_limit_automations'
          AND NOT tgisinternal
    ) THEN

        RAISE EXCEPTION
            'HARDENING FAILED: automation rate limit trigger missing';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname =
            'security_rate_limit_clients'
          AND NOT tgisinternal
    ) THEN

        RAISE EXCEPTION
            'HARDENING FAILED: client rate limit trigger missing';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname =
            'security_rate_limit_maintenance_contracts'
          AND NOT tgisinternal
    ) THEN

        RAISE EXCEPTION
            'HARDENING FAILED: maintenance contract rate limit trigger missing';

    END IF;


    -- --------------------------------------------------------
    -- BUDGET OWNERSHIP TRIGGER
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'protect_budget_ownership'
          AND NOT tgisinternal
    ) THEN

        RAISE EXCEPTION
            'HARDENING FAILED: budget ownership trigger missing';

    END IF;

END $$;


COMMIT;