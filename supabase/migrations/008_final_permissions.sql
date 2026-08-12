-- ============================================================
-- MODIRA
-- 008_final_permissions.sql
--
-- PERMISOS FINALES Y CIERRE DE SEGURIDAD
--
-- ============================================================
--
-- Esta migración es el cierre de seguridad de la estructura
-- inicial de MODIRA.
--
-- Su función es:
--
--   1. Garantizar RLS en todas las tablas de negocio.
--   2. Definir los permisos PostgreSQL finales.
--   3. Cerrar accesos innecesarios a anon.
--   4. Controlar las RPC mediante EXECUTE.
--   5. Verificar que la arquitectura final está completa.
--
-- IMPORTANTE:
--
-- Las funciones específicas se crean en las migraciones
-- correspondientes.
--
-- El 008 únicamente configura sus permisos finales cuando
-- es necesario.
--
-- ============================================================


BEGIN;


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================


DO $$
DECLARE

    v_table TEXT;

    v_required_tables TEXT[] := ARRAY[
        'companies',
        'profiles',
        'clients',
        'projects',
        'quotations',
        'invoices',
        'payments',
        'budgets',
        'support_tickets',
        'automations',
        'audit_requests',
        'workers',
        'activity_log',
        'automation_runs',
        'maintenance_contracts'
    ];

BEGIN

    -- --------------------------------------------------------
    -- Comprobar que existen todas las tablas
    -- --------------------------------------------------------

    FOREACH v_table IN ARRAY v_required_tables

    LOOP

        IF NOT EXISTS (

            SELECT 1

            FROM information_schema.tables

            WHERE
                table_schema = 'public'
                AND table_name = v_table

        ) THEN

            RAISE EXCEPTION
                '008 stopped: public.% does not exist',
                v_table;

        END IF;

    END LOOP;


    -- --------------------------------------------------------
    -- Funciones centrales de seguridad
    -- --------------------------------------------------------

    IF NOT EXISTS (

        SELECT 1

        FROM pg_proc p

        JOIN pg_namespace n
            ON n.oid = p.pronamespace

        WHERE
            n.nspname = 'public'
            AND p.proname = 'current_user_company_id'

    ) THEN

        RAISE EXCEPTION
            '008 stopped: current_user_company_id() does not exist';

    END IF;


    IF NOT EXISTS (

        SELECT 1

        FROM pg_proc p

        JOIN pg_namespace n
            ON n.oid = p.pronamespace

        WHERE
            n.nspname = 'public'
            AND p.proname = 'current_user_is_admin'

    ) THEN

        RAISE EXCEPTION
            '008 stopped: current_user_is_admin() does not exist';

    END IF;


    IF NOT EXISTS (

        SELECT 1

        FROM pg_proc p

        JOIN pg_namespace n
            ON n.oid = p.pronamespace

        WHERE
            n.nspname = 'public'
            AND p.proname = 'current_user_is_worker'

    ) THEN

        RAISE EXCEPTION
            '008 stopped: current_user_is_worker() does not exist';

    END IF;


    IF NOT EXISTS (

        SELECT 1

        FROM pg_proc p

        JOIN pg_namespace n
            ON n.oid = p.pronamespace

        WHERE
            n.nspname = 'public'
            AND p.proname = 'current_user_is_worker_account'

    ) THEN

        RAISE EXCEPTION
            '008 stopped: current_user_is_worker_account() does not exist';

    END IF;

END $$;


-- ============================================================
-- 2. ACTIVAR RLS
--
-- Todas las tablas de negocio deben tener Row Level Security.
-- ============================================================


ALTER TABLE public.companies
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.profiles
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.clients
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.projects
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.quotations
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.invoices
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.payments
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.budgets
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.support_tickets
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.automations
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.audit_requests
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.workers
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.activity_log
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.automation_runs
    ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.maintenance_contracts
    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. REVOCACIÓN GENERAL PARA ANON
-- ============================================================


REVOKE ALL
ON TABLE
    public.companies,
    public.profiles,
    public.clients,
    public.projects,
    public.quotations,
    public.invoices,
    public.payments,
    public.budgets,
    public.support_tickets,
    public.automations,
    public.audit_requests,
    public.workers,
    public.activity_log,
    public.automation_runs,
    public.maintenance_contracts

FROM anon;


-- ============================================================
-- 4. REVOCACIÓN GENERAL PARA AUTHENTICATED
--
-- Después concedemos únicamente los permisos necesarios.
-- ============================================================


REVOKE ALL
ON TABLE
    public.companies,
    public.profiles,
    public.clients,
    public.projects,
    public.quotations,
    public.invoices,
    public.payments,
    public.budgets,
    public.support_tickets,
    public.automations,
    public.audit_requests,
    public.workers,
    public.activity_log,
    public.automation_runs,
    public.maintenance_contracts

FROM authenticated;


-- ============================================================
-- 5. COMPANIES
-- ============================================================


GRANT SELECT
ON public.companies
TO authenticated;


-- ============================================================
-- 6. PROFILES
-- ============================================================


GRANT SELECT, UPDATE
ON public.profiles
TO authenticated;


-- ============================================================
-- 7. CLIENTS
-- ============================================================


GRANT SELECT, INSERT, UPDATE
ON public.clients
TO authenticated;


REVOKE DELETE
ON public.clients
FROM authenticated;


-- ============================================================
-- 8. PROJECTS
--
-- SELECT:
--     permitido
--
-- INSERT:
--     permitido
--
-- UPDATE:
--     únicamente nombre y estado
--
-- DELETE:
--     prohibido
--
-- La RLS específica de projects se define en 003.
-- ============================================================


GRANT SELECT
ON public.projects
TO authenticated;


GRANT INSERT
ON public.projects
TO authenticated;


REVOKE UPDATE
ON public.projects
FROM authenticated;


GRANT UPDATE (
    nombre,
    estado
)
ON public.projects
TO authenticated;


REVOKE DELETE
ON public.projects
FROM authenticated;


-- ============================================================
-- 9. QUOTATIONS
-- ============================================================


GRANT SELECT
ON public.quotations
TO authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.quotations
FROM authenticated;


-- ============================================================
-- 10. INVOICES
-- ============================================================


GRANT SELECT
ON public.invoices
TO authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.invoices
FROM authenticated;


-- ============================================================
-- 11. PAYMENTS
-- ============================================================


GRANT SELECT
ON public.payments
TO authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.payments
FROM authenticated;


-- ============================================================
-- 12. BUDGETS
-- ============================================================


GRANT SELECT
ON public.budgets
TO authenticated;


REVOKE DELETE
ON public.budgets
FROM authenticated;


-- ============================================================
-- 13. SUPPORT TICKETS
-- ============================================================


GRANT SELECT, INSERT, UPDATE
ON public.support_tickets
TO authenticated;


REVOKE DELETE
ON public.support_tickets
FROM authenticated;


-- ============================================================
-- 14. AUTOMATIONS
-- ============================================================


GRANT SELECT, INSERT, UPDATE
ON public.automations
TO authenticated;


REVOKE DELETE
ON public.automations
FROM authenticated;


-- ============================================================
-- 15. AUTOMATION RUNS
--
-- Los registros de ejecución se crean mediante:
--
--     create_automation_run(UUID)
--
-- Esta función ya fue creada y autorizada en 006.
--
-- El frontend únicamente puede consultar.
-- ============================================================


GRANT SELECT
ON public.automation_runs
TO authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.automation_runs
FROM authenticated;


-- ============================================================
-- 16. MAINTENANCE CONTRACTS
-- ============================================================


GRANT SELECT, INSERT
ON public.maintenance_contracts
TO authenticated;


REVOKE UPDATE, DELETE
ON public.maintenance_contracts
FROM authenticated;


-- ============================================================
-- 17. ACTIVITY LOG
--
-- La creación se realiza mediante:
--
--     log_activity(...)
--
-- El frontend puede consultar.
-- ============================================================


GRANT SELECT
ON public.activity_log
TO authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.activity_log
FROM authenticated;


-- ============================================================
-- 18. WORKERS
--
-- Los trabajadores se gestionan administrativamente.
--
-- El frontend únicamente puede consultar.
-- ============================================================


GRANT SELECT
ON public.workers
TO authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.workers
FROM authenticated;


-- ============================================================
-- 19. AUDIT REQUESTS
--
-- VISITANTE:
--
--     INSERT
--
-- AUTHENTICATED:
--
--     INSERT
--     SELECT / UPDATE según RLS
--
-- ANON:
--
--     únicamente INSERT
-- ============================================================


GRANT INSERT
ON public.audit_requests
TO anon;


GRANT INSERT
ON public.audit_requests
TO authenticated;


GRANT SELECT, UPDATE
ON public.audit_requests
TO authenticated;


REVOKE SELECT, UPDATE, DELETE
ON public.audit_requests
FROM anon;


REVOKE DELETE
ON public.audit_requests
FROM authenticated;


-- ============================================================
-- 20. FUNCIONES CENTRALES DE SEGURIDAD
-- ============================================================


REVOKE ALL
ON FUNCTION public.current_user_company_id()
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.current_user_company_id()
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.current_user_company_id()
FROM anon;


REVOKE ALL
ON FUNCTION public.current_user_is_admin()
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.current_user_is_admin()
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.current_user_is_admin()
FROM anon;


REVOKE ALL
ON FUNCTION public.current_user_is_worker()
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.current_user_is_worker()
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.current_user_is_worker()
FROM anon;


REVOKE ALL
ON FUNCTION public.current_user_is_worker_account()
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.current_user_is_worker_account()
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.current_user_is_worker_account()
FROM anon;


-- ============================================================
-- 21. RPC — create_project()
--
-- FIRMA REAL:
--
--     create_project(
--         TEXT,
--         TIMESTAMPTZ,
--         TIMESTAMPTZ
--     )
--
-- Esta función fue creada en 003.
-- ============================================================


REVOKE ALL
ON FUNCTION public.create_project(
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.create_project(
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ
)
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.create_project(
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ
)
FROM anon;


-- ============================================================
-- 22. RPC — get_worker_projects()
-- ============================================================


REVOKE ALL
ON FUNCTION public.get_worker_projects()
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.get_worker_projects()
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.get_worker_projects()
FROM anon;


-- ============================================================
-- 23. RPC — update_project_by_worker()
--
-- FIRMA:
--
--     UUID,
--     TEXT,
--     TEXT
-- ============================================================


REVOKE ALL
ON FUNCTION public.update_project_by_worker(
    UUID,
    TEXT,
    TEXT
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.update_project_by_worker(
    UUID,
    TEXT,
    TEXT
)
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.update_project_by_worker(
    UUID,
    TEXT,
    TEXT
)
FROM anon;


-- ============================================================
-- 24. RPC — generate_invoice_number()
-- ============================================================


REVOKE ALL
ON FUNCTION public.generate_invoice_number()
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.generate_invoice_number()
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.generate_invoice_number()
FROM anon;


-- ============================================================
-- 25. RPC — attach_invoice_document()
-- ============================================================


REVOKE ALL
ON FUNCTION public.attach_invoice_document(
    UUID,
    TEXT
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.attach_invoice_document(
    UUID,
    TEXT
)
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.attach_invoice_document(
    UUID,
    TEXT
)
FROM anon;


-- ============================================================
-- 26. RPC — close_support_ticket()
-- ============================================================


REVOKE ALL
ON FUNCTION public.close_support_ticket(
    UUID
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.close_support_ticket(
    UUID
)
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.close_support_ticket(
    UUID
)
FROM anon;


-- ============================================================
-- 27. RPC — log_activity()
-- ============================================================


REVOKE ALL
ON FUNCTION public.log_activity(
    TEXT,
    TEXT,
    UUID,
    TEXT,
    JSONB
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.log_activity(
    TEXT,
    TEXT,
    UUID,
    TEXT,
    JSONB
)
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.log_activity(
    TEXT,
    TEXT,
    UUID,
    TEXT,
    JSONB
)
FROM anon;


-- ============================================================
-- 28. VERIFICACIÓN — RLS
-- ============================================================


DO $$
DECLARE

    v_table TEXT;

    v_required_tables TEXT[] := ARRAY[
        'companies',
        'profiles',
        'clients',
        'projects',
        'quotations',
        'invoices',
        'payments',
        'budgets',
        'support_tickets',
        'automations',
        'audit_requests',
        'workers',
        'activity_log',
        'automation_runs',
        'maintenance_contracts'
    ];

BEGIN

    FOREACH v_table IN ARRAY v_required_tables

    LOOP

        IF NOT EXISTS (

            SELECT 1

            FROM pg_class c

            JOIN pg_namespace n
                ON n.oid = c.relnamespace

            WHERE
                n.nspname = 'public'
                AND c.relname = v_table
                AND c.relrowsecurity = TRUE

        ) THEN

            RAISE EXCEPTION
                '008 failed: RLS is not enabled on public.%',
                v_table;

        END IF;

    END LOOP;

END $$;


-- ============================================================
-- 29. VERIFICACIÓN — FUNCIONES CENTRALES
-- ============================================================


DO $$
DECLARE

    v_function_count INTEGER;

BEGIN

    SELECT COUNT(*)

    INTO v_function_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname IN (
            'current_user_company_id',
            'current_user_is_admin',
            'current_user_is_worker',
            'current_user_is_worker_account'
        );


    IF v_function_count <> 4 THEN

        RAISE EXCEPTION
            '008 failed: expected 4 security functions, found %',
            v_function_count;

    END IF;

END $$;


-- ============================================================
-- 30. VERIFICACIÓN — create_project()
--
-- FIRMA REAL:
--
--     TEXT,
--     TIMESTAMPTZ,
--     TIMESTAMPTZ
-- ============================================================


DO $$
DECLARE

    v_count INTEGER;

BEGIN

    SELECT COUNT(*)

    INTO v_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname = 'create_project'
        AND pg_get_function_identity_arguments(p.oid)
            = 'p_descripcion text, p_fecha_inicio timestamp with time zone, p_fecha_fin timestamp with time zone';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '008 failed: create_project(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) missing';

    END IF;

END $$;


-- ============================================================
-- 31. VERIFICACIÓN — get_worker_projects()
-- ============================================================


DO $$
DECLARE

    v_count INTEGER;

BEGIN

    SELECT COUNT(*)

    INTO v_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname = 'get_worker_projects'
        AND pg_get_function_identity_arguments(p.oid) = '';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '008 failed: get_worker_projects() missing';

    END IF;

END $$;


-- ============================================================
-- 32. VERIFICACIÓN — update_project_by_worker()
-- ============================================================


DO $$
DECLARE

    v_count INTEGER;

BEGIN

    SELECT COUNT(*)

    INTO v_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname = 'update_project_by_worker'
        AND pg_get_function_identity_arguments(p.oid)
            = 'p_project_id uuid, p_nombre text, p_estado text';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '008 failed: update_project_by_worker(UUID, TEXT, TEXT) missing';

    END IF;

END $$;


-- ============================================================
-- 33. VERIFICACIÓN — generate_invoice_number()
-- ============================================================


DO $$
DECLARE

    v_count INTEGER;

BEGIN

    SELECT COUNT(*)

    INTO v_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname = 'generate_invoice_number'
        AND pg_get_function_identity_arguments(p.oid) = '';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '008 failed: generate_invoice_number() missing';

    END IF;

END $$;


-- ============================================================
-- 34. VERIFICACIÓN — attach_invoice_document()
-- ============================================================


DO $$
DECLARE

    v_count INTEGER;

BEGIN

    SELECT COUNT(*)

    INTO v_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname = 'attach_invoice_document'
        AND pg_get_function_identity_arguments(p.oid)
            = 'p_invoice_id uuid, p_document_path text';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '008 failed: attach_invoice_document(UUID, TEXT) missing';

    END IF;

END $$;


-- ============================================================
-- 35. VERIFICACIÓN — log_activity()
-- ============================================================


DO $$
DECLARE

    v_count INTEGER;

BEGIN

    SELECT COUNT(*)

    INTO v_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname = 'log_activity'
        AND pg_get_function_identity_arguments(p.oid)
            = 'p_action text, p_resource_type text, p_resource_id uuid, p_description text, p_metadata jsonb';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '008 failed: log_activity() missing';

    END IF;

END $$;


-- ============================================================
-- 36. VERIFICACIÓN — create_automation_run()
--
-- IMPORTANTE:
--
-- La firma REAL es:
--
--     create_automation_run(UUID)
--
-- La función fue creada en 006.
--
-- Aquí SOLO verificamos que exista.
--
-- NO hacemos GRANT/REVOKE sobre ella porque 006 ya gestiona
-- correctamente sus permisos.
-- ============================================================


DO $$
DECLARE

    v_count INTEGER;

BEGIN

    SELECT COUNT(*)

    INTO v_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname = 'create_automation_run'
        AND pg_get_function_identity_arguments(p.oid)
            = 'p_automation_id uuid';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '008 failed: create_automation_run(UUID) missing';

    END IF;

END $$;


-- ============================================================
-- 37. VERIFICACIÓN — close_support_ticket()
-- ============================================================


DO $$
DECLARE

    v_count INTEGER;

BEGIN

    SELECT COUNT(*)

    INTO v_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname = 'close_support_ticket'
        AND pg_get_function_identity_arguments(p.oid)
            = 'p_ticket_id uuid';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '008 failed: close_support_ticket(UUID) missing';

    END IF;

END $$;


-- ============================================================
-- 38. VERIFICACIÓN — WORKERS
-- ============================================================


DO $$
BEGIN

    IF has_table_privilege(
        'authenticated',
        'public.workers',
        'INSERT'
    ) THEN

        RAISE EXCEPTION
            '008 failed: authenticated still has INSERT on workers';

    END IF;


    IF has_table_privilege(
        'authenticated',
        'public.workers',
        'UPDATE'
    ) THEN

        RAISE EXCEPTION
            '008 failed: authenticated still has UPDATE on workers';

    END IF;


    IF has_table_privilege(
        'authenticated',
        'public.workers',
        'DELETE'
    ) THEN

        RAISE EXCEPTION
            '008 failed: authenticated still has DELETE on workers';

    END IF;

END $$;


-- ============================================================
-- 39. VERIFICACIÓN — AUDIT REQUESTS
-- ============================================================


DO $$
BEGIN

    IF NOT has_table_privilege(
        'anon',
        'public.audit_requests',
        'INSERT'
    ) THEN

        RAISE EXCEPTION
            '008 failed: anon lacks INSERT on audit_requests';

    END IF;


    IF has_table_privilege(
        'anon',
        'public.audit_requests',
        'SELECT'
    ) THEN

        RAISE EXCEPTION
            '008 failed: anon has SELECT on audit_requests';

    END IF;


    IF has_table_privilege(
        'anon',
        'public.audit_requests',
        'UPDATE'
    ) THEN

        RAISE EXCEPTION
            '008 failed: anon has UPDATE on audit_requests';

    END IF;


    IF has_table_privilege(
        'anon',
        'public.audit_requests',
        'DELETE'
    ) THEN

        RAISE EXCEPTION
            '008 failed: anon has DELETE on audit_requests';

    END IF;

END $$;


-- ============================================================
-- 40. VERIFICACIÓN — SIN ACCESO ANÓNIMO A DATOS PRIVADOS
-- ============================================================


DO $$
BEGIN

    IF has_table_privilege(
        'anon',
        'public.companies',
        'SELECT'
    ) THEN

        RAISE EXCEPTION
            '008 failed: anon has SELECT on companies';

    END IF;


    IF has_table_privilege(
        'anon',
        'public.profiles',
        'SELECT'
    ) THEN

        RAISE EXCEPTION
            '008 failed: anon has SELECT on profiles';

    END IF;


    IF has_table_privilege(
        'anon',
        'public.projects',
        'SELECT'
    ) THEN

        RAISE EXCEPTION
            '008 failed: anon has SELECT on projects';

    END IF;


    IF has_table_privilege(
        'anon',
        'public.invoices',
        'SELECT'
    ) THEN

        RAISE EXCEPTION
            '008 failed: anon has SELECT on invoices';

    END IF;


    IF has_table_privilege(
        'anon',
        'public.workers',
        'SELECT'
    ) THEN

        RAISE EXCEPTION
            '008 failed: anon has SELECT on workers';

    END IF;

END $$;


-- ============================================================
-- 41. VERIFICACIÓN — RPC PRIVADAS
--
-- Comprobamos únicamente las RPC cuya gestión de permisos
-- corresponde al cierre de seguridad.
-- ============================================================


DO $$
BEGIN

    IF has_function_privilege(
        'anon',
        'public.create_project(text,timestamptz,timestamptz)',
        'EXECUTE'
    ) THEN

        RAISE EXCEPTION
            '008 failed: anon can execute create_project()';

    END IF;


    IF has_function_privilege(
        'anon',
        'public.get_worker_projects()',
        'EXECUTE'
    ) THEN

        RAISE EXCEPTION
            '008 failed: anon can execute get_worker_projects()';

    END IF;


    IF has_function_privilege(
        'anon',
        'public.generate_invoice_number()',
        'EXECUTE'
    ) THEN

        RAISE EXCEPTION
            '008 failed: anon can execute generate_invoice_number()';

    END IF;

END $$;


-- ============================================================
-- 42. VERIFICACIÓN — PERMISOS DE PROJECTS
-- ============================================================


DO $$
BEGIN

    IF NOT has_table_privilege(
        'authenticated',
        'public.projects',
        'SELECT'
    ) THEN

        RAISE EXCEPTION
            '008 failed: authenticated lacks SELECT on projects';

    END IF;


    IF NOT has_table_privilege(
        'authenticated',
        'public.projects',
        'INSERT'
    ) THEN

        RAISE EXCEPTION
            '008 failed: authenticated lacks INSERT on projects';

    END IF;


    IF NOT has_column_privilege(
        'authenticated',
        'public.projects',
        'nombre',
        'UPDATE'
    ) THEN

        RAISE EXCEPTION
            '008 failed: authenticated lacks UPDATE on projects.nombre';

    END IF;


    IF NOT has_column_privilege(
        'authenticated',
        'public.projects',
        'estado',
        'UPDATE'
    ) THEN

        RAISE EXCEPTION
            '008 failed: authenticated lacks UPDATE on projects.estado';

    END IF;


    IF has_column_privilege(
        'authenticated',
        'public.projects',
        'company_id',
        'UPDATE'
    ) THEN

        RAISE EXCEPTION
            '008 failed: authenticated can UPDATE projects.company_id';

    END IF;


    IF has_column_privilege(
        'authenticated',
        'public.projects',
        'user_id',
        'UPDATE'
    ) THEN

        RAISE EXCEPTION
            '008 failed: authenticated can UPDATE projects.user_id';

    END IF;


    IF has_table_privilege(
        'authenticated',
        'public.projects',
        'DELETE'
    ) THEN

        RAISE EXCEPTION
            '008 failed: authenticated has DELETE on projects';

    END IF;

END $$;


-- ============================================================
-- 43. COMMIT
-- ============================================================


COMMIT;


-- ============================================================
-- RESULTADO FINAL
-- ============================================================
--
-- RLS
-- ===
--
-- Todas las tablas de negocio quedan protegidas.
--
--
-- AUTOMATION RUNS
-- ===============
--
-- La función:
--
--     create_automation_run(UUID)
--
-- se crea en 006.
--
-- El frontend no puede insertar directamente.
--
-- El registro de ejecución se crea mediante la RPC.
--
--
-- PROJECTS
-- ========
--
-- Cliente:
--
--     SELECT
--     INSERT
--     UPDATE de nombre/estado según RLS
--     DELETE ❌
--
--
-- FACTURACIÓN
-- ===========
--
-- invoices:
--
--     SELECT
--     INSERT ❌
--     UPDATE ❌
--     DELETE ❌
--
-- Los documentos se gestionan mediante las funciones
-- y políticas definidas en 005.
--
--
-- ANON
-- ====
--
-- Únicamente:
--
--     audit_requests INSERT
--
-- No puede consultar datos privados.
--
-- ============================================================