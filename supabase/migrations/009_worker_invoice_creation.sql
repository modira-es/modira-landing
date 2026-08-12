-- ============================================================
-- MODIRA
-- 009_worker_invoice_creation.sql
--
-- CREACIÓN CONTROLADA DE FACTURAS DESDE EL ÁREA DE EMPLEADOS
-- ============================================================
--
-- Los trabajadores activos NO reciben INSERT directo sobre
-- public.invoices.
--
-- La creación se realiza mediante esta RPC:
--
--     create_invoice_by_worker(...)
--
-- La función:
--   1. Comprueba que el usuario es un trabajador activo.
--   2. Comprueba que la empresa existe.
--   3. Comprueba que el proyecto pertenece a la empresa.
--   4. Obtiene el user_id propietario del proyecto.
--   5. Genera numero_factura mediante generate_invoice_number().
--   6. Calcula IVA y total.
--   7. Inserta la factura de forma controlada.
--   8. Devuelve la factura creada.
--
-- ============================================================

BEGIN;

-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
    ) THEN
        RAISE EXCEPTION
            '009 stopped: public.invoices does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'projects'
    ) THEN
        RAISE EXCEPTION
            '009 stopped: public.projects does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
          ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_is_worker'
    ) THEN
        RAISE EXCEPTION
            '009 stopped: current_user_is_worker() does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
          ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'generate_invoice_number'
    ) THEN
        RAISE EXCEPTION
            '009 stopped: generate_invoice_number() does not exist';
    END IF;
END $$;

-- ============================================================
-- 2. FUNCIÓN create_invoice_by_worker()
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_invoice_by_worker(
    p_company_id UUID,
    p_project_id UUID,
    p_fecha_emision TIMESTAMPTZ DEFAULT NULL,
    p_fecha_vencimiento TIMESTAMPTZ DEFAULT NULL,
    p_descripcion TEXT DEFAULT NULL,
    p_subtotal NUMERIC(12,2) DEFAULT 0,
    p_iva_porcentaje NUMERIC(5,2) DEFAULT 21
)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_invoice public.invoices;
    v_project_user_id UUID;
    v_project_company_id UUID;
    v_numero_factura TEXT;
    v_subtotal NUMERIC(12,2);
    v_iva_porcentaje NUMERIC(5,2);
    v_iva_importe NUMERIC(12,2);
    v_monto NUMERIC(12,2);
BEGIN
    -- ========================================================
    -- 1. COMPROBAR TRABAJADOR ACTIVO
    -- ========================================================

    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';
    END IF;

    -- ========================================================
    -- 2. VALIDAR EMPRESA
    -- ========================================================

    IF p_company_id IS NULL THEN
        RAISE EXCEPTION
            'La empresa es obligatoria';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.companies c
        WHERE c.id = p_company_id
    ) THEN
        RAISE EXCEPTION
            'La empresa seleccionada no existe';
    END IF;

    -- ========================================================
    -- 3. VALIDAR PROYECTO
    -- ========================================================

    IF p_project_id IS NULL THEN
        RAISE EXCEPTION
            'El proyecto es obligatorio';
    END IF;

    SELECT
        p.user_id,
        p.company_id
    INTO
        v_project_user_id,
        v_project_company_id
    FROM public.projects p
    WHERE p.id = p_project_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'El proyecto seleccionado no existe';
    END IF;

    IF v_project_company_id IS DISTINCT FROM p_company_id THEN
        RAISE EXCEPTION
            'El proyecto no pertenece a la empresa seleccionada';
    END IF;

    IF v_project_user_id IS NULL THEN
        RAISE EXCEPTION
            'El proyecto no tiene un usuario propietario válido';
    END IF;

    -- ========================================================
    -- 4. VALIDAR IMPORTES
    -- ========================================================

    v_subtotal := COALESCE(p_subtotal, 0);
    v_iva_porcentaje := COALESCE(p_iva_porcentaje, 0);

    IF v_subtotal < 0 THEN
        RAISE EXCEPTION
            'El importe no puede ser negativo';
    END IF;

    IF v_iva_porcentaje < 0 OR v_iva_porcentaje > 100 THEN
        RAISE EXCEPTION
            'El IVA debe estar entre 0 y 100';
    END IF;

    v_iva_importe := ROUND(
        v_subtotal * v_iva_porcentaje / 100,
        2
    );

    v_monto := ROUND(
        v_subtotal + v_iva_importe,
        2
    );

    -- ========================================================
    -- 5. GENERAR IDENTIFICADOR GLOBAL
    -- ========================================================

    v_numero_factura := public.generate_invoice_number();

    -- ========================================================
    -- 6. CREAR FACTURA
    -- ========================================================

    INSERT INTO public.invoices (
        user_id,
        company_id,
        project_id,
        numero_factura,
        monto,
        estado,
        fecha_emision,
        fecha_vencimiento,
        descripcion,
        subtotal,
        iva_porcentaje,
        iva_importe
    )
    VALUES (
        v_project_user_id,
        p_company_id,
        p_project_id,
        v_numero_factura,
        v_monto,
        'pendiente',
        COALESCE(p_fecha_emision, CURRENT_TIMESTAMP),
        p_fecha_vencimiento,
        NULLIF(TRIM(p_descripcion), ''),
        v_subtotal,
        v_iva_porcentaje,
        v_iva_importe
    )
    RETURNING *
    INTO v_invoice;

    RETURN v_invoice;
END;
$function$;

-- ============================================================
-- 3. PERMISOS
-- ============================================================

REVOKE ALL
ON FUNCTION public.create_invoice_by_worker(
    UUID,
    UUID,
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    NUMERIC,
    NUMERIC
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.create_invoice_by_worker(
    UUID,
    UUID,
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    NUMERIC,
    NUMERIC
)
TO authenticated;

-- ============================================================
-- 4. COMPROBACIÓN FINAL
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
    WHERE n.nspname = 'public'
      AND p.proname = 'create_invoice_by_worker';

    IF v_function_count <> 1 THEN
        RAISE EXCEPTION
            '009 failed: create_invoice_by_worker() was not created';
    END IF;
END $$;

COMMIT;

-- ============================================================
-- RESULTADO FINAL
-- ============================================================
--
-- TRABAJADOR ACTIVO
--       ↓
-- create_invoice_by_worker()
--       ↓
-- valida empresa
--       ↓
-- valida proyecto
--       ↓
-- obtiene usuario propietario del proyecto
--       ↓
-- genera numero_factura
--       ↓
-- calcula IVA
--       ↓
-- INSERT controlado
--       ↓
-- devuelve factura creada
--
-- El trabajador sigue sin tener INSERT directo sobre invoices.
-- ============================================================
