BEGIN;
-- ============================================================
-- MODIRA — 005_automation_and_maintenance.sql
-- Automatizaciones, ejecuciones y mantenimiento.
-- ============================================================
-- ============================================================
-- 1. AUTOMATION RUNS
-- ============================================================
--
-- Historial de ejecuciones de una automatización.
--
-- Una ejecución contiene:
--
-- estado
-- inicio
-- finalizacion
-- duracion_ms
-- resultado
-- error
--
-- La ejecución se crea mediante create_automation_run().
--
-- El worker puede consultar ejecuciones.
-- El cliente puede consultar sus propias ejecuciones.
--
-- ============================================================
CREATE TABLE public.automation_runs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
automation_id UUID NOT NULL
REFERENCES public.automations(id)
ON DELETE CASCADE,
company_id UUID NOT NULL
REFERENCES public.companies(id)
ON DELETE CASCADE,
estado TEXT NOT NULL DEFAULT 'pendiente',

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
),
CONSTRAINT automation_runs_dates_check
CHECK (
finalizacion IS NULL
OR inicio IS NULL
OR finalizacion >= inicio
)
);
-- ============================================================
-- 2. ÍNDICES AUTOMATION RUNS
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
-- 3. MAINTENANCE CONTRACTS
-- ============================================================
--
-- Contratos/planes de mantenimiento vendidos por MODIRA.
--
-- company_id puede ser NULL para permitir contratos asociados
-- inicialmente únicamente al usuario.
--
-- ============================================================
CREATE TABLE public.maintenance_contracts (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL
REFERENCES auth.users(id)
ON DELETE CASCADE,
company_id UUID
REFERENCES public.companies(id)
ON DELETE SET NULL,
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
CHECK (precio >= 0),
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
CREATE INDEX idx_maintenance_contracts_company_id
ON public.maintenance_contracts(company_id);
CREATE INDEX idx_maintenance_contracts_user_id
ON public.maintenance_contracts(user_id);
CREATE INDEX idx_maintenance_contracts_estado
ON public.maintenance_contracts(estado);
CREATE INDEX idx_maintenance_contracts_fecha_inicio
ON public.maintenance_contracts(fecha_inicio);
CREATE TRIGGER maintenance_contracts_updated_at
BEFORE UPDATE ON public.maintenance_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- ============================================================
-- 4. RLS AUTOMATIONS
-- ============================================================
ALTER TABLE public.automations
ENABLE ROW LEVEL SECURITY;
CREATE POLICY automations_client_select
ON public.automations
FOR SELECT
TO authenticated
USING (
NOT public.current_user_is_worker()

AND company_id = public.current_user_company_id()
);
CREATE POLICY automations_client_insert
ON public.automations
FOR INSERT
TO authenticated
WITH CHECK (
NOT public.current_user_is_worker()
AND user_id = auth.uid()
AND company_id = public.current_user_company_id()
);
CREATE POLICY automations_client_update
ON public.automations
FOR UPDATE
TO authenticated
USING (
NOT public.current_user_is_worker()
AND company_id = public.current_user_company_id()
)
WITH CHECK (
NOT public.current_user_is_worker()
AND company_id = public.current_user_company_id()
AND user_id = auth.uid()
);
CREATE POLICY automations_worker_select
ON public.automations
FOR SELECT
TO authenticated
USING (
public.current_user_is_worker()
);
GRANT SELECT, INSERT, UPDATE
ON public.automations
TO authenticated;
-- ============================================================
-- 5. TRIGGER PARA MANTENER LOS IMPORTES FISCALES
-- ============================================================
--
-- El trigger mantiene sincronizados automáticamente:
--
--   subtotal
--   iva_porcentaje
--   iva_importe
--   monto
--   irpf_porcentaje
--   irpf_importe
--   importe_a_pagar
--
-- Esto es especialmente importante porque las RPC de creación
-- y actualización de facturas pueden modificar subtotal e IVA
-- sin calcular manualmente todos los importes derivados.
--
-- Flujo:
--
--   subtotal
--       +
--   IVA
--       ↓
--   monto
--       -
--   IRPF
--       ↓
--   importe_a_pagar
--
-- El trigger se ejecuta tanto al crear como al modificar
-- una factura.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_invoice_amounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN

    -- ========================================================
    -- 1. NORMALIZAR BASE IMPONIBLE
    -- ========================================================

    NEW.subtotal := ROUND(
        COALESCE(NEW.subtotal, 0),
        2
    );

    IF NEW.subtotal < 0 THEN
        RAISE EXCEPTION
            'La base imponible no puede ser negativa';
    END IF;


    -- ========================================================
    -- 2. CALCULAR IVA
    -- ========================================================

    IF COALESCE(NEW.iva_aplicado, FALSE) = FALSE THEN

        NEW.iva_porcentaje := 0;
        NEW.iva_importe := 0;

    ELSE

        NEW.iva_porcentaje := ROUND(
            COALESCE(NEW.iva_porcentaje, 0),
            2
        );

        IF NEW.iva_porcentaje < 0
           OR NEW.iva_porcentaje > 100
        THEN
            RAISE EXCEPTION
                'El porcentaje de IVA debe estar entre 0 y 100';
        END IF;

        NEW.iva_importe := ROUND(
            NEW.subtotal * NEW.iva_porcentaje / 100,
            2
        );

    END IF;


    -- ========================================================
    -- 3. CALCULAR TOTAL BRUTO
    -- ========================================================

    NEW.monto := ROUND(
        NEW.subtotal + NEW.iva_importe,
        2
    );


    -- ========================================================
    -- 4. CALCULAR IRPF
    -- ========================================================

    IF COALESCE(NEW.irpf_aplicado, FALSE) = FALSE THEN

        NEW.irpf_porcentaje := 0;
        NEW.irpf_importe := 0;

    ELSE

        NEW.irpf_porcentaje := ROUND(
            COALESCE(NEW.irpf_porcentaje, 0),
            2
        );

        IF NEW.irpf_porcentaje <= 0
           OR NEW.irpf_porcentaje > 100
        THEN
            RAISE EXCEPTION
                'El porcentaje de IRPF debe ser mayor que 0 y menor o igual que 100';
        END IF;

        NEW.irpf_importe := ROUND(
            NEW.subtotal * NEW.irpf_porcentaje / 100,
            2
        );

    END IF;


    -- ========================================================
    -- 5. CALCULAR IMPORTE REAL A PAGAR
    -- ========================================================

    NEW.importe_a_pagar := ROUND(
        GREATEST(
            NEW.monto - NEW.irpf_importe,
            0
        ),
        2
    );


    RETURN NEW;

END;
$$;


-- ============================================================
-- TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS invoices_sync_amounts
ON public.invoices;

CREATE TRIGGER invoices_sync_amounts
BEFORE INSERT OR UPDATE
ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_amounts();
-- ============================================================
-- 6. VALIDACIÓN DE EMPRESA DE AUTOMATION RUN
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_automation_run_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$

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
'automation_runs.company_id no coincide con la empresa de
la automatización';
END IF;
RETURN NEW;
END;
$$;
CREATE TRIGGER automation_runs_validate_company
BEFORE INSERT OR UPDATE
ON public.automation_runs
FOR EACH ROW
EXECUTE FUNCTION public.validate_automation_run_company();
-- ============================================================
-- 7. CREATE AUTOMATION RUN
-- ============================================================
--
-- Los registros de ejecución NO se crean mediante INSERT
-- directo desde el frontend.
--

-- Se crean mediante esta función.
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
-- --------------------------------------------------------
-- Comprobar que existe la automatización
-- --------------------------------------------------------
SELECT *
INTO v_automation
FROM public.automations
WHERE id = p_automation_id;
IF NOT FOUND THEN
RAISE EXCEPTION
'La automatización indicada no existe';
END IF;
-- --------------------------------------------------------
-- Seguridad
--
-- Worker activo:
-- puede crear ejecuciones.
--
-- Cliente:
-- solamente puede crear una ejecución de una
-- automatización cuyo propietario sea él mismo.
-- --------------------------------------------------------

IF NOT (
public.current_user_is_worker()
OR (
NOT public.current_user_is_worker()
AND v_automation.user_id = auth.uid()
)
) THEN
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
$$;
-- ============================================================
-- 8. PERMISOS RPC

-- ============================================================
REVOKE ALL
ON FUNCTION public.create_automation_run(UUID)
FROM PUBLIC, anon;
GRANT EXECUTE
ON FUNCTION public.create_automation_run(UUID)
TO authenticated;
-- ============================================================
-- 9. RLS MAINTENANCE CONTRACTS
-- ============================================================
ALTER TABLE public.maintenance_contracts
ENABLE ROW LEVEL SECURITY;
CREATE POLICY maintenance_contracts_client_select
ON public.maintenance_contracts
FOR SELECT
TO authenticated
USING (
NOT public.current_user_is_worker()
AND (
(
company_id IS NOT NULL
AND company_id = public.current_user_company_id()
)
OR
(
company_id IS NULL
AND user_id = auth.uid()
)
)
);
CREATE POLICY maintenance_contracts_client_insert
ON public.maintenance_contracts
FOR INSERT

TO authenticated
WITH CHECK (
NOT public.current_user_is_worker()
AND user_id = auth.uid()
AND (
company_id IS NULL
OR company_id = public.current_user_company_id()
)
);
CREATE POLICY maintenance_contracts_worker_select
ON public.maintenance_contracts
FOR SELECT
TO authenticated
USING (
public.current_user_is_worker()
);
GRANT SELECT, INSERT
ON public.maintenance_contracts
TO authenticated;
-- ============================================================
-- 10. VALIDACIONES FINALES
-- ============================================================
DO $$
DECLARE
v_count INTEGER;
BEGIN
-- --------------------------------------------------------
-- automation_runs
-- --------------------------------------------------------
SELECT COUNT(*)
INTO v_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'automation_runs';

IF v_count <> 1 THEN
RAISE EXCEPTION
'005 failed: automation_runs does not exist';
END IF;
-- --------------------------------------------------------
-- inicio
-- --------------------------------------------------------
IF NOT EXISTS (
SELECT 1
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'automation_runs'
AND column_name = 'inicio'
) THEN
RAISE EXCEPTION
'005 failed: automation_runs.inicio missing';
END IF;
-- --------------------------------------------------------
-- finalizacion
-- --------------------------------------------------------
IF NOT EXISTS (
SELECT 1
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'automation_runs'
AND column_name = 'finalizacion'
) THEN
RAISE EXCEPTION
'005 failed: automation_runs.finalizacion missing';
END IF;
-- --------------------------------------------------------
-- NO updated_at
-- --------------------------------------------------------

IF EXISTS (
SELECT 1
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'automation_runs'
AND column_name = 'updated_at'
) THEN
RAISE EXCEPTION
'005 failed: automation_runs.updated_at must not exist';
END IF;
-- --------------------------------------------------------
-- estado constraint
-- --------------------------------------------------------
SELECT COUNT(*)
INTO v_count
FROM pg_constraint
WHERE conrelid = 'public.automation_runs'::regclass
AND conname = 'automation_runs_estado_check';
IF v_count <> 1 THEN
RAISE EXCEPTION
'005 failed: automation_runs_estado_check missing';
END IF;
-- --------------------------------------------------------
-- dates constraint
-- --------------------------------------------------------
SELECT COUNT(*)
INTO v_count
FROM pg_constraint
WHERE conrelid = 'public.automation_runs'::regclass
AND conname = 'automation_runs_dates_check';
IF v_count <> 1 THEN
RAISE EXCEPTION

'005 failed: automation_runs_dates_check missing';
END IF;
-- --------------------------------------------------------
-- automation_runs policies
-- --------------------------------------------------------
SELECT COUNT(*)
INTO v_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'automation_runs';
IF v_count <> 2 THEN
RAISE EXCEPTION
'005 failed: automation_runs RLS policies incomplete';
END IF;
-- --------------------------------------------------------
-- create_automation_run()
-- --------------------------------------------------------
SELECT COUNT(*)
INTO v_count
FROM pg_proc p
JOIN pg_namespace n
ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname = 'create_automation_run'
AND pg_get_function_identity_arguments(p.oid)
= 'p_automation_id uuid';
IF v_count <> 1 THEN
RAISE EXCEPTION
'005 failed: create_automation_run() missing';
END IF;
-- --------------------------------------------------------

-- maintenance_contracts
-- --------------------------------------------------------
SELECT COUNT(*)
INTO v_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'maintenance_contracts';
IF v_count <> 1 THEN
RAISE EXCEPTION
'005 failed: maintenance_contracts does not exist';
END IF;
-- --------------------------------------------------------
-- maintenance policies
-- --------------------------------------------------------
SELECT COUNT(*)
INTO v_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'maintenance_contracts';
IF v_count <> 3 THEN
RAISE EXCEPTION
'005 failed: maintenance_contracts RLS policies
incomplete';
END IF;
END $$;
COMMIT;
