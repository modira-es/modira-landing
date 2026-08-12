-- ============================================================
-- MODIRA
-- 006_automation_and_maintenance.sql
--
-- AUTOMATIZACIONES, EJECUCIONES Y MANTENIMIENTO
--
-- ============================================================
--
-- OBJETIVO
--
-- Esta migración amplía la estructura creada anteriormente para
-- gestionar:
--
--   1. Automatizaciones de cada empresa.
--   2. Historial de ejecuciones de automatizaciones.
--   3. Contratos/planes de mantenimiento.
--   4. Seguridad específica mediante RLS.
--   5. Creación controlada de ejecuciones mediante RPC.
--
-- La tabla public.automations ya existe desde 001.
--
-- Esta migración NO recrea automations.
--
-- ============================================================


BEGIN;


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    -- --------------------------------------------------------
    -- AUTOMATIONS
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'automations'
    ) THEN

        RAISE EXCEPTION
            '006 stopped: public.automations does not exist';

    END IF;


    -- --------------------------------------------------------
    -- COMPANIES
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'companies'
    ) THEN

        RAISE EXCEPTION
            '006 stopped: public.companies does not exist';

    END IF;


    -- --------------------------------------------------------
    -- PROFILES
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
    ) THEN

        RAISE EXCEPTION
            '006 stopped: public.profiles does not exist';

    END IF;


    -- --------------------------------------------------------
    -- WORKERS
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'workers'
    ) THEN

        RAISE EXCEPTION
            '006 stopped: public.workers does not exist';

    END IF;


    -- --------------------------------------------------------
    -- AUTOMATIONS.COMPANY_ID
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'automations'
          AND column_name = 'company_id'
    ) THEN

        RAISE EXCEPTION
            '006 stopped: automations.company_id does not exist';

    END IF;


    -- --------------------------------------------------------
    -- AUTOMATIONS.USER_ID
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'automations'
          AND column_name = 'user_id'
    ) THEN

        RAISE EXCEPTION
            '006 stopped: automations.user_id does not exist';

    END IF;


    -- --------------------------------------------------------
    -- AUTOMATIONS.ESTADO
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'automations'
          AND column_name = 'estado'
    ) THEN

        RAISE EXCEPTION
            '006 stopped: automations.estado does not exist';

    END IF;


    -- --------------------------------------------------------
    -- AUTOMATIONS.TIPO
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'automations'
          AND column_name = 'tipo'
    ) THEN

        RAISE EXCEPTION
            '006 stopped: automations.tipo does not exist';

    END IF;


    -- --------------------------------------------------------
    -- CURRENT USER COMPANY FUNCTION
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
            ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_company_id'
    ) THEN

        RAISE EXCEPTION
            '006 stopped: current_user_company_id() does not exist';

    END IF;


    -- --------------------------------------------------------
    -- CURRENT USER WORKER FUNCTION
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
            ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_is_worker'
    ) THEN

        RAISE EXCEPTION
            '006 stopped: current_user_is_worker() does not exist';

    END IF;


END $$;


-- ============================================================
-- 2. AMPLIAR AUTOMATIONS
-- ============================================================
--
-- Añadimos únicamente información necesaria para controlar
-- mejor el ciclo de vida de una automatización.
--
-- IMPORTANTE:
--
-- NO añadimos una columna "activa".
--
-- El estado de la automatización se controla exclusivamente
-- mediante:
--
--     estado
--
-- Esto evita tener dos fuentes de verdad:
--
--     activa = TRUE
--     estado = 'pausada'
--
-- ============================================================


ALTER TABLE public.automations

    ADD COLUMN IF NOT EXISTS frecuencia TEXT,

    ADD COLUMN IF NOT EXISTS ultima_ejecucion_exitosa
        TIMESTAMPTZ,

    ADD COLUMN IF NOT EXISTS proxima_ejecucion
        TIMESTAMPTZ;


-- ============================================================
-- 3. ESTADOS DE AUTOMATIZACIÓN
-- ============================================================
--
-- Estados permitidos:
--
--     activa
--     pausada
--     error
--     completada
--
-- ============================================================


ALTER TABLE public.automations
    DROP CONSTRAINT IF EXISTS automations_estado_check;


ALTER TABLE public.automations

    ADD CONSTRAINT automations_estado_check

    CHECK (
        estado IN (
            'activa',
            'pausada',
            'error',
            'completada'
        )
    );


-- ============================================================
-- 4. AUTOMATION RUNS
-- ============================================================
--
-- Historial de ejecuciones de automatizaciones.
--
-- Una automatización puede ejecutarse muchas veces:
--
-- AUTOMATION
--     │
--     ├── RUN 1
--     ├── RUN 2
--     ├── RUN 3
--     └── ...
--
-- Se almacena:
--
--     estado
--     inicio
--     finalizacion
--     duracion_ms
--     resultado
--     error
--
-- ============================================================


CREATE TABLE public.automation_runs (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    automation_id UUID NOT NULL
        REFERENCES public.automations(id)
        ON DELETE CASCADE,

    company_id UUID NOT NULL
        REFERENCES public.companies(id)
        ON DELETE CASCADE,

    estado TEXT NOT NULL
        DEFAULT 'pendiente',

    inicio TIMESTAMPTZ,

    finalizacion TIMESTAMPTZ,

    duracion_ms INTEGER,

    resultado JSONB,

    error TEXT,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT automation_runs_estado_check
    CHECK (
        estado IN (
            'pendiente',
            'ejecutando',
            'exito',
            'error'
        )
    ),

    CONSTRAINT automation_runs_duration_check
    CHECK (
        duracion_ms IS NULL
        OR duracion_ms >= 0
    )

);


-- ============================================================
-- 5. ÍNDICES AUTOMATION RUNS
-- ============================================================


CREATE INDEX idx_automation_runs_automation_id

ON public.automation_runs (
    automation_id
);


CREATE INDEX idx_automation_runs_company_id

ON public.automation_runs (
    company_id
);


CREATE INDEX idx_automation_runs_created_at

ON public.automation_runs (
    created_at DESC
);


CREATE INDEX idx_automation_runs_estado

ON public.automation_runs (
    estado
);


-- ============================================================
-- 6. MAINTENANCE CONTRACTS
-- ============================================================
--
-- Contratos/planes de mantenimiento vendidos por MODIRA.
--
-- Permite registrar:
--
--     cliente
--     empresa
--     plan
--     precio
--     periodicidad
--     fecha de inicio
--     fecha de finalización
--     estado
--
-- company_id puede ser NULL porque queremos permitir también
-- contratos asociados inicialmente únicamente al usuario.
--
-- En ese caso:
--
--     company_id = NULL
--     user_id = usuario propietario
--
-- ============================================================


CREATE TABLE public.maintenance_contracts (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    company_id UUID
        REFERENCES public.companies(id)
        ON DELETE SET NULL,

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    nombre_plan TEXT NOT NULL,

    descripcion TEXT,

    precio NUMERIC(12,2) NOT NULL,

    periodicidad TEXT NOT NULL
        DEFAULT 'mensual',

    estado TEXT NOT NULL
        DEFAULT 'activo',

    fecha_inicio DATE NOT NULL
        DEFAULT CURRENT_DATE,

    fecha_fin DATE,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT maintenance_contracts_price_check
    CHECK (
        precio >= 0
    ),

    CONSTRAINT maintenance_contracts_periodicidad_check
    CHECK (
        periodicidad IN (
            'mensual',
            'trimestral',
            'semestral',
            'anual'
        )
    ),

    CONSTRAINT maintenance_contracts_estado_check
    CHECK (
        estado IN (
            'activo',
            'pausado',
            'cancelado',
            'finalizado'
        )
    ),

    CONSTRAINT maintenance_contracts_dates_check
    CHECK (
        fecha_fin IS NULL
        OR fecha_fin >= fecha_inicio
    )

);


-- ============================================================
-- 7. ÍNDICES MAINTENANCE CONTRACTS
-- ============================================================


CREATE INDEX idx_maintenance_contracts_company_id

ON public.maintenance_contracts (
    company_id
);


CREATE INDEX idx_maintenance_contracts_user_id

ON public.maintenance_contracts (
    user_id
);


CREATE INDEX idx_maintenance_contracts_estado

ON public.maintenance_contracts (
    estado
);


CREATE INDEX idx_maintenance_contracts_fecha_inicio

ON public.maintenance_contracts (
    fecha_inicio
);


-- ============================================================
-- 8. UPDATED_AT — MAINTENANCE CONTRACTS
-- ============================================================
--
-- Reutilizamos la función general creada en 001.
-- ============================================================


DROP TRIGGER IF EXISTS
    maintenance_contracts_updated_at
ON public.maintenance_contracts;


CREATE TRIGGER
    maintenance_contracts_updated_at

BEFORE UPDATE
ON public.maintenance_contracts

FOR EACH ROW

EXECUTE FUNCTION
    public.update_updated_at_column();


-- ============================================================
-- 9. RLS — AUTOMATIONS
-- ============================================================
--
-- CLIENTE:
--
--     SELECT
--     INSERT
--     UPDATE
--
-- únicamente sobre automatizaciones de su empresa.
--
-- WORKER ACTIVO:
--
--     SELECT
--
-- sobre todas las automatizaciones.
--
-- DELETE:
--
--     No existe policy.
--     Por tanto queda bloqueado mediante RLS.
--
-- ============================================================


ALTER TABLE public.automations
    ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
    automations_company_access
ON public.automations;


DROP POLICY IF EXISTS
    automations_client_select
ON public.automations;


DROP POLICY IF EXISTS
    automations_client_insert
ON public.automations;


DROP POLICY IF EXISTS
    automations_client_update
ON public.automations;


DROP POLICY IF EXISTS
    automations_client_delete
ON public.automations;


DROP POLICY IF EXISTS
    automations_worker_select
ON public.automations;


-- ------------------------------------------------------------
-- CLIENTE → SELECT
-- ------------------------------------------------------------


CREATE POLICY
    automations_client_select

ON public.automations

FOR SELECT

TO authenticated

USING (

    NOT public.current_user_is_worker()

    AND

    company_id = public.current_user_company_id()

);


-- ------------------------------------------------------------
-- CLIENTE → INSERT
-- ------------------------------------------------------------


CREATE POLICY
    automations_client_insert

ON public.automations

FOR INSERT

TO authenticated

WITH CHECK (

    NOT public.current_user_is_worker()

    AND

    company_id = public.current_user_company_id()

    AND

    user_id = auth.uid()

);


-- ------------------------------------------------------------
-- CLIENTE → UPDATE
-- ------------------------------------------------------------


CREATE POLICY
    automations_client_update

ON public.automations

FOR UPDATE

TO authenticated

USING (

    NOT public.current_user_is_worker()

    AND

    company_id = public.current_user_company_id()

)

WITH CHECK (

    NOT public.current_user_is_worker()

    AND

    company_id = public.current_user_company_id()

    AND

    user_id = auth.uid()

);


-- ------------------------------------------------------------
-- WORKER → SELECT
-- ------------------------------------------------------------


CREATE POLICY
    automations_worker_select

ON public.automations

FOR SELECT

TO authenticated

USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 10. RLS — AUTOMATION RUNS
-- ============================================================
--
-- CLIENTE:
--
--     SELECT
--
-- sobre las ejecuciones de su empresa.
--
-- WORKER:
--
--     SELECT
--
-- sobre todas.
--
-- INSERT / UPDATE / DELETE:
--
--     No se permiten directamente.
--
-- Las ejecuciones se crean mediante:
--
--     create_automation_run()
--
-- ============================================================


ALTER TABLE public.automation_runs
    ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
    automation_runs_client_select
ON public.automation_runs;


DROP POLICY IF EXISTS
    automation_runs_worker_select
ON public.automation_runs;


-- ------------------------------------------------------------
-- CLIENTE → SELECT
-- ------------------------------------------------------------


CREATE POLICY
    automation_runs_client_select

ON public.automation_runs

FOR SELECT

TO authenticated

USING (

    NOT public.current_user_is_worker()

    AND

    company_id = public.current_user_company_id()

);


-- ------------------------------------------------------------
-- WORKER → SELECT
-- ------------------------------------------------------------


CREATE POLICY
    automation_runs_worker_select

ON public.automation_runs

FOR SELECT

TO authenticated

USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 11. RLS — MAINTENANCE CONTRACTS
-- ============================================================
--
-- CLIENTE:
--
--     SELECT
--     INSERT
--
-- Puede utilizar contratos:
--
--     de su empresa
--
-- o:
--
--     asociados directamente a su usuario
--     cuando company_id todavía sea NULL.
--
-- WORKER ACTIVO:
--
--     SELECT
--
-- sobre todos los contratos.
--
-- UPDATE / DELETE:
--
--     No existen policies.
--
-- Por tanto quedan bloqueados mediante RLS.
--
-- ============================================================


ALTER TABLE public.maintenance_contracts
    ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
    maintenance_contracts_client_select
ON public.maintenance_contracts;


DROP POLICY IF EXISTS
    maintenance_contracts_client_insert
ON public.maintenance_contracts;


DROP POLICY IF EXISTS
    maintenance_contracts_client_update
ON public.maintenance_contracts;


DROP POLICY IF EXISTS
    maintenance_contracts_client_delete
ON public.maintenance_contracts;


DROP POLICY IF EXISTS
    maintenance_contracts_worker_select
ON public.maintenance_contracts;


-- ------------------------------------------------------------
-- CLIENTE → SELECT
-- ------------------------------------------------------------


CREATE POLICY
    maintenance_contracts_client_select

ON public.maintenance_contracts

FOR SELECT

TO authenticated

USING (

    NOT public.current_user_is_worker()

    AND

    (

        (
            company_id IS NOT NULL
            AND
            company_id = public.current_user_company_id()
        )

        OR

        (
            company_id IS NULL
            AND
            user_id = auth.uid()
        )

    )

);


-- ------------------------------------------------------------
-- CLIENTE → INSERT
-- ------------------------------------------------------------
--
-- El usuario solamente puede crear:
--
--     un contrato para su propia empresa
--
-- o:
--
--     un contrato personal sin empresa.
--
-- No puede insertar un company_id perteneciente a otra empresa.
-- ============================================================


CREATE POLICY
    maintenance_contracts_client_insert

ON public.maintenance_contracts

FOR INSERT

TO authenticated

WITH CHECK (

    NOT public.current_user_is_worker()

    AND

    user_id = auth.uid()

    AND

    (

        (
            company_id IS NOT NULL
            AND
            company_id = public.current_user_company_id()
        )

        OR

        company_id IS NULL

    )

);


-- ------------------------------------------------------------
-- WORKER → SELECT
-- ------------------------------------------------------------


CREATE POLICY
    maintenance_contracts_worker_select

ON public.maintenance_contracts

FOR SELECT

TO authenticated

USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 12. VALIDACIÓN DE EMPRESA DE AUTOMATION RUNS
-- ============================================================
--
-- automation_runs.company_id debe coincidir siempre con la
-- empresa de la automatización asociada.
--
-- Esto evita inconsistencias como:
--
-- automation_id → empresa A
-- company_id    → empresa B
--
-- ============================================================


CREATE OR REPLACE FUNCTION
    public.validate_automation_run_company()

RETURNS TRIGGER

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public, pg_temp

AS $function$

DECLARE

    v_company_id UUID;

BEGIN

    SELECT company_id

    INTO v_company_id

    FROM public.automations

    WHERE id = NEW.automation_id;


    IF v_company_id IS NULL THEN

        RAISE EXCEPTION
            'La automatización indicada no existe';

    END IF;


    IF v_company_id <> NEW.company_id THEN

        RAISE EXCEPTION
            'automation_runs.company_id no coincide con la empresa de la automatización';

    END IF;


    RETURN NEW;

END;

$function$;


DROP TRIGGER IF EXISTS
    automation_runs_validate_company
ON public.automation_runs;


CREATE TRIGGER
    automation_runs_validate_company

BEFORE INSERT OR UPDATE

ON public.automation_runs

FOR EACH ROW

EXECUTE FUNCTION
    public.validate_automation_run_company();


-- ============================================================
-- 13. RPC — CREATE AUTOMATION RUN
-- ============================================================
--
-- La creación de una ejecución no se expone mediante INSERT
-- directo al frontend.
--
-- Se utiliza esta función controlada.
--
-- Puede utilizarla:
--
--     WORKER ACTIVO
--
-- o:
--
--     propietario de la empresa de la automatización.
--
-- ============================================================


CREATE OR REPLACE FUNCTION
    public.create_automation_run(
        p_automation_id UUID
    )

RETURNS public.automation_runs

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public, pg_temp

AS $function$

DECLARE

    v_automation public.automations;

    v_run public.automation_runs;

BEGIN

    -- --------------------------------------------------------
    -- Obtener automatización
    -- --------------------------------------------------------

    SELECT *
    INTO v_automation

    FROM public.automations

    WHERE id = p_automation_id;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'Automatización no encontrada';

    END IF;


    -- --------------------------------------------------------
    -- Seguridad
    -- --------------------------------------------------------
    --
    -- Puede crear una ejecución:
    --
    --     worker activo
    --
    -- o:
    --
    --     propietario de la empresa.
    -- --------------------------------------------------------


    IF NOT public.current_user_is_worker()

       AND

       v_automation.company_id <>
       public.current_user_company_id()

    THEN

        RAISE EXCEPTION
            'Acceso denegado';

    END IF;


    -- --------------------------------------------------------
    -- Crear ejecución
    -- --------------------------------------------------------


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

$function$;


-- ============================================================
-- 14. PERMISOS DE CREATE_AUTOMATION_RUN
-- ============================================================
--
-- No permitimos ejecución pública.
--
-- Solamente usuarios autenticados.
--
-- ============================================================


REVOKE ALL

ON FUNCTION
    public.create_automation_run(UUID)

FROM PUBLIC;


GRANT EXECUTE

ON FUNCTION
    public.create_automation_run(UUID)

TO authenticated;


REVOKE EXECUTE

ON FUNCTION
    public.create_automation_run(UUID)

FROM anon;


-- ============================================================
-- 15. PERMISOS DE LA FUNCIÓN DE VALIDACIÓN
-- ============================================================
--
-- Esta función es utilizada únicamente por el trigger.
--
-- No necesita ser ejecutable directamente desde el frontend.
-- ============================================================


REVOKE ALL

ON FUNCTION
    public.validate_automation_run_company()

FROM PUBLIC;


-- ============================================================
-- 16. COMENTARIOS DE ESTRUCTURA
-- ============================================================


COMMENT ON TABLE public.automations IS
'Automatizaciones configuradas por las empresas de MODIRA.';


COMMENT ON TABLE public.automation_runs IS
'Historial de ejecuciones de automatizaciones de MODIRA.';


COMMENT ON TABLE public.maintenance_contracts IS
'Contratos y planes de mantenimiento recurrente de MODIRA.';


COMMENT ON COLUMN public.automations.frecuencia IS
'Frecuencia prevista de ejecución de la automatización.';


COMMENT ON COLUMN public.automations.ultima_ejecucion_exitosa IS
'Fecha y hora de la última ejecución completada correctamente.';


COMMENT ON COLUMN public.automations.proxima_ejecucion IS
'Fecha y hora prevista para la siguiente ejecución.';


COMMENT ON COLUMN public.automation_runs.resultado IS
'Resultado estructurado de la ejecución de la automatización.';


COMMENT ON COLUMN public.automation_runs.error IS
'Descripción del error producido durante la ejecución, si existe.';


-- ============================================================
-- 17. VERIFICACIONES FINALES
-- ============================================================


DO $$
DECLARE

    v_count INTEGER;

BEGIN

    -- --------------------------------------------------------
    -- AUTOMATION RUNS
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM information_schema.tables

    WHERE
        table_schema = 'public'
        AND table_name = 'automation_runs';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '006 failed: automation_runs does not exist';

    END IF;


    -- --------------------------------------------------------
    -- MAINTENANCE CONTRACTS
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM information_schema.tables

    WHERE
        table_schema = 'public'
        AND table_name = 'maintenance_contracts';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '006 failed: maintenance_contracts does not exist';

    END IF;


    -- --------------------------------------------------------
    -- FRECUENCIA
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM information_schema.columns

    WHERE
        table_schema = 'public'
        AND table_name = 'automations'
        AND column_name = 'frecuencia';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '006 failed: automations.frecuencia does not exist';

    END IF;


    -- --------------------------------------------------------
    -- ÚLTIMA EJECUCIÓN
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM information_schema.columns

    WHERE
        table_schema = 'public'
        AND table_name = 'automations'
        AND column_name = 'ultima_ejecucion_exitosa';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '006 failed: automations.ultima_ejecucion_exitosa does not exist';

    END IF;


    -- --------------------------------------------------------
    -- PRÓXIMA EJECUCIÓN
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM information_schema.columns

    WHERE
        table_schema = 'public'
        AND table_name = 'automations'
        AND column_name = 'proxima_ejecucion';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '006 failed: automations.proxima_ejecucion does not exist';

    END IF;


    -- --------------------------------------------------------
    -- CREATE AUTOMATION RUN
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname = 'create_automation_run';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '006 failed: create_automation_run() does not exist';

    END IF;


    -- --------------------------------------------------------
    -- VALIDATE AUTOMATION RUN COMPANY
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname = 'validate_automation_run_company';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '006 failed: validate_automation_run_company() does not exist';

    END IF;


    -- --------------------------------------------------------
    -- RLS AUTOMATIONS
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_policies

    WHERE
        schemaname = 'public'
        AND tablename = 'automations';


    IF v_count < 3 THEN

        RAISE EXCEPTION
            '006 failed: automations RLS policies are incomplete';

    END IF;


    -- --------------------------------------------------------
    -- RLS AUTOMATION RUNS
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_policies

    WHERE
        schemaname = 'public'
        AND tablename = 'automation_runs';


    IF v_count <> 2 THEN

        RAISE EXCEPTION
            '006 failed: automation_runs RLS policies are incomplete';

    END IF;


    -- --------------------------------------------------------
    -- RLS MAINTENANCE CONTRACTS
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_policies

    WHERE
        schemaname = 'public'
        AND tablename = 'maintenance_contracts';


    IF v_count <> 3 THEN

        RAISE EXCEPTION
            '006 failed: maintenance_contracts RLS policies are incomplete';

    END IF;


END $$;


-- ============================================================
-- 18. VERIFICACIÓN DE PERMISOS RPC
-- ============================================================


DO $$
BEGIN

    IF NOT has_function_privilege(
        'authenticated',
        'public.create_automation_run(uuid)',
        'EXECUTE'
    ) THEN

        RAISE EXCEPTION
            '006 failed: authenticated cannot execute create_automation_run(uuid)';

    END IF;


END $$;


COMMIT;


-- ============================================================
-- RESULTADO FINAL
-- ============================================================
--
--
-- AUTOMATIONS
-- ===========
--
-- Cada empresa puede gestionar sus automatizaciones.
--
-- CLIENTE
--     ↓
-- SELECT / INSERT / UPDATE
--     ↓
-- Sus automatizaciones
--
-- WORKER ACTIVO
--     ↓
-- SELECT
--     ↓
-- Automatizaciones de MODIRA
--
--
-- AUTOMATION RUNS
-- ===============
--
-- AUTOMATIZACIÓN
--       ↓
-- create_automation_run()
--       ↓
-- automation_runs
--       ↓
-- historial
--
-- Estados:
--
--     pendiente
--     ejecutando
--     exito
--     error
--
--
-- MAINTENANCE CONTRACTS
-- =====================
--
-- CLIENTE
--     ↓
-- SELECT / INSERT
--     ↓
-- Sus contratos
--
-- WORKER ACTIVO
--     ↓
-- SELECT
--     ↓
-- Todos los contratos
--
--
-- UPDATE / DELETE
--     ↓
-- bloqueados mediante RLS
--
--
-- SEGURIDAD
-- =========
--
-- GRANT
--     ↓
-- Permiso PostgreSQL
--
-- RLS
--     ↓
-- Filas permitidas
--
-- RPC
--     ↓
-- Operaciones controladas
--
-- ============================================================