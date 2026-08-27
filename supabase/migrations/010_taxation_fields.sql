BEGIN;

-- ============================================================
-- MODIRA — 010_taxation_fields.sql
-- Fiscalidad de IVA e IRPF para facturas.
--
-- OBJETIVO
--   1. Mantener el IVA que ya existe en invoices:
--        subtotal
--        iva_porcentaje
--        iva_importe
--   2. Añadir un indicador explícito de aplicación de IVA.
--   3. Preparar el registro de IRPF por factura.
--   4. Preparar el importe realmente exigible al cliente cuando
--      en el futuro exista una retención.
--
-- IMPORTANTE
--   - NO modifica el frontend.
--   - NO activa ninguna opción nueva en la web.
--   - NO modifica la RPC create_invoice_by_worker() de 009.
--   - Las facturas actuales siguen funcionando como antes.
--
-- CORRECCIÓN RESPECTO A LA 010 ANTERIOR
--   La RPC 009 no envía importe_a_pagar al INSERT de invoices.
--   Por ello NO podemos depender de DEFAULT 0 + CHECK.
--   Se utiliza un trigger BEFORE INSERT/UPDATE que calcula
--   importe_a_pagar automáticamente a partir de monto e IRPF.
-- ============================================================


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
            '010 stopped: public.invoices does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND column_name = 'subtotal'
    ) THEN
        RAISE EXCEPTION
            '010 stopped: invoices.subtotal does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND column_name = 'iva_porcentaje'
    ) THEN
        RAISE EXCEPTION
            '010 stopped: invoices.iva_porcentaje does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND column_name = 'iva_importe'
    ) THEN
        RAISE EXCEPTION
            '010 stopped: invoices.iva_importe does not exist';
    END IF;
END $$;


-- ============================================================
-- 2. IVA — INDICADOR EXPLÍCITO
-- ============================================================
--
-- iva_porcentaje e iva_importe YA existen.
--
-- Añadimos solamente iva_aplicado.
--
-- TRUE  -> la factura aplica IVA.
-- FALSE -> la factura no aplica IVA.
--
-- No se duplican los importes existentes.
-- ============================================================

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS iva_aplicado BOOLEAN
    NOT NULL DEFAULT TRUE;


-- ============================================================
-- 3. IRPF — DATOS PREPARADOS PARA FUTURO
-- ============================================================
--
-- No se aplica IRPF automáticamente.
--
-- Valores por defecto:
--   irpf_aplicado   = FALSE
--   irpf_porcentaje = 0
--   irpf_importe    = 0
-- ============================================================

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS irpf_aplicado BOOLEAN
    NOT NULL DEFAULT FALSE;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS irpf_porcentaje NUMERIC(5,2)
    NOT NULL DEFAULT 0;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS irpf_importe NUMERIC(12,2)
    NOT NULL DEFAULT 0;


-- ============================================================
-- 4. IMPORTE A PAGAR
-- ============================================================
--
-- monto:
--   total bruto de la factura.
--
-- importe_a_pagar:
--   monto - retención IRPF.
--
-- Ahora mismo:
--   irpf_importe = 0
--   importe_a_pagar = monto
--
-- Se mantiene como columna física para que en el futuro pueda
-- utilizarse directamente en el flujo de pagos.
-- ============================================================

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS importe_a_pagar NUMERIC(12,2)
    NOT NULL DEFAULT 0;


-- ============================================================
-- 5. TRIGGER PARA MANTENER importe_a_pagar
-- ============================================================
--
-- Esto es necesario porque 009 inserta:
--
--   monto
--   subtotal
--   iva_porcentaje
--   iva_importe
--
-- pero NO inserta importe_a_pagar.
--
-- El trigger lo calcula antes de que PostgreSQL evalúe las
-- constraints, por lo que la RPC 009 continúa funcionando
-- sin modificarla.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_invoice_amounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Normalización defensiva de los datos de IRPF.
    NEW.irpf_porcentaje := COALESCE(NEW.irpf_porcentaje, 0);
    NEW.irpf_importe := COALESCE(NEW.irpf_importe, 0);

    -- Si IRPF no está aplicado, no puede existir retención.
    IF COALESCE(NEW.irpf_aplicado, FALSE) = FALSE THEN
        NEW.irpf_porcentaje := 0;
        NEW.irpf_importe := 0;
    END IF;

    -- El importe a pagar siempre deriva del total bruto
    -- menos la retención de IRPF.
    NEW.importe_a_pagar := ROUND(
        GREATEST(
            COALESCE(NEW.monto, 0) - NEW.irpf_importe,
            0
        ),
        2
    );

    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS invoices_sync_amounts
ON public.invoices;

CREATE TRIGGER invoices_sync_amounts
BEFORE INSERT OR UPDATE
ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_amounts();


-- ============================================================
-- 6. NORMALIZACIÓN DE DATOS EXISTENTES
-- ============================================================
--
-- Se hace DESPUÉS de crear el trigger para que todos los datos
-- existentes pasen por la misma lógica.
--
-- Para facturas existentes:
--   - Si tenían IVA > 0, iva_aplicado = TRUE.
--   - Si tenían IVA = 0, iva_aplicado = FALSE.
--   - IRPF queda desactivado por defecto.
--   - importe_a_pagar = monto.
-- ============================================================

UPDATE public.invoices
SET
    iva_porcentaje = COALESCE(iva_porcentaje, 0),
    iva_importe = COALESCE(iva_importe, 0),
    iva_aplicado = CASE
        WHEN COALESCE(iva_porcentaje, 0) > 0
             OR COALESCE(iva_importe, 0) > 0
        THEN TRUE
        ELSE FALSE
    END,
    irpf_aplicado = FALSE,
    irpf_porcentaje = 0,
    irpf_importe = 0;


-- ============================================================
-- 7. CONSTRAINT IVA
-- ============================================================
--
-- Se conserva la posibilidad de:
--   IVA aplicado     -> porcentaje >= 0
--   IVA no aplicado  -> porcentaje e importe = 0
--
-- Esto no rompe la RPC 009, que actualmente puede recibir IVA 0.
-- ============================================================

ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_iva_aplicado_check;

ALTER TABLE public.invoices
ADD CONSTRAINT invoices_iva_aplicado_check
CHECK (
    (
        iva_aplicado = TRUE
        AND COALESCE(iva_porcentaje, 0) >= 0
        AND COALESCE(iva_porcentaje, 0) <= 100
        AND COALESCE(iva_importe, 0) >= 0
    )
    OR
    (
        iva_aplicado = FALSE
        AND COALESCE(iva_porcentaje, 0) = 0
        AND COALESCE(iva_importe, 0) = 0
    )
);


-- ============================================================
-- 8. CONSTRAINT IRPF
-- ============================================================
--
-- Si IRPF está desactivado:
--   porcentaje = 0
--   importe = 0
--
-- Si está activado:
--   porcentaje > 0
--   porcentaje <= 100
--   importe >= 0
--   importe <= base imponible
-- ============================================================

ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_irpf_aplicado_check;

ALTER TABLE public.invoices
ADD CONSTRAINT invoices_irpf_aplicado_check
CHECK (
    (
        irpf_aplicado = TRUE
        AND irpf_porcentaje > 0
        AND irpf_porcentaje <= 100
        AND irpf_importe >= 0
        AND irpf_importe <= COALESCE(subtotal, 0)
    )
    OR
    (
        irpf_aplicado = FALSE
        AND irpf_porcentaje = 0
        AND irpf_importe = 0
    )
);


-- ============================================================
-- 9. CONSTRAINT importe_a_pagar
-- ============================================================
--
-- Esta constraint ahora sí es segura porque el trigger anterior
-- siempre calcula importe_a_pagar antes de evaluar la constraint.
-- ============================================================

ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_importe_a_pagar_check;

ALTER TABLE public.invoices
ADD CONSTRAINT invoices_importe_a_pagar_check
CHECK (
    importe_a_pagar >= 0
    AND importe_a_pagar = ROUND(
        monto - irpf_importe,
        2
    )
);


-- ============================================================
-- 10. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_invoices_irpf_aplicado
ON public.invoices(irpf_aplicado);

CREATE INDEX IF NOT EXISTS idx_invoices_iva_aplicado
ON public.invoices(iva_aplicado);


-- ============================================================
-- 11. COMENTARIOS
-- ============================================================

COMMENT ON COLUMN public.invoices.iva_aplicado IS
'Indica si la factura aplica IVA. El porcentaje e importe del IVA se conservan en iva_porcentaje e iva_importe.';

COMMENT ON COLUMN public.invoices.irpf_aplicado IS
'Indica si la factura lleva retención de IRPF. No implica que MODIRA ingrese la retención en Hacienda.';

COMMENT ON COLUMN public.invoices.irpf_porcentaje IS
'Porcentaje de retención IRPF aplicado a la base imponible de la factura.';

COMMENT ON COLUMN public.invoices.irpf_importe IS
'Importe de IRPF retenido sobre la base imponible de la factura.';

COMMENT ON COLUMN public.invoices.importe_a_pagar IS
'Importe que efectivamente debe pagar el cliente al profesional después de descontar, si existe, la retención de IRPF.';


-- ============================================================
-- 12. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Las 7 columnas fiscales deben existir.
    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name IN (
          'iva_aplicado',
          'iva_porcentaje',
          'iva_importe',
          'irpf_aplicado',
          'irpf_porcentaje',
          'irpf_importe',
          'importe_a_pagar'
      );

    IF v_count <> 7 THEN
        RAISE EXCEPTION
            '010 failed: expected 7 fiscal invoice columns, found %',
            v_count;
    END IF;


    -- El trigger debe existir.
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c
          ON c.oid = t.tgrelid
        JOIN pg_namespace n
          ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'invoices'
          AND t.tgname = 'invoices_sync_amounts'
          AND NOT t.tgisinternal
    ) THEN
        RAISE EXCEPTION
            '010 failed: invoices_sync_amounts trigger is missing';
    END IF;


    -- Constraints.
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.invoices'::regclass
          AND conname = 'invoices_iva_aplicado_check'
    ) THEN
        RAISE EXCEPTION
            '010 failed: invoices_iva_aplicado_check is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.invoices'::regclass
          AND conname = 'invoices_irpf_aplicado_check'
    ) THEN
        RAISE EXCEPTION
            '010 failed: invoices_irpf_aplicado_check is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.invoices'::regclass
          AND conname = 'invoices_importe_a_pagar_check'
    ) THEN
        RAISE EXCEPTION
            '010 failed: invoices_importe_a_pagar_check is missing';
    END IF;


    -- Todas las facturas actuales deben conservar el comportamiento
    -- anterior: sin IRPF => importe_a_pagar = monto.
    IF EXISTS (
        SELECT 1
        FROM public.invoices
        WHERE irpf_aplicado = FALSE
          AND (
              irpf_porcentaje <> 0
              OR irpf_importe <> 0
              OR importe_a_pagar <> monto
          )
    ) THEN
        RAISE EXCEPTION
            '010 failed: existing invoices contain inconsistent IRPF data';
    END IF;
END $$;


COMMIT;


-- ============================================================
-- RESULTADO FINAL
-- ============================================================
--
-- invoices
--
-- IVA:
--   iva_aplicado
--   iva_porcentaje
--   iva_importe
--
-- IRPF:
--   irpf_aplicado
--   irpf_porcentaje
--   irpf_importe
--
-- IMPORTES:
--   monto
--   importe_a_pagar
--
-- EJEMPLO ACTUAL (sin IRPF):
--
--   subtotal        1.000,00
--   IVA 21 %          210,00
--   monto           1.210,00
--   IRPF               0,00
--   importe_a_pagar 1.210,00
--
-- EJEMPLO FUTURO (IRPF 15 %):
--
--   subtotal        1.000,00
--   IVA 21 %          210,00
--   monto           1.210,00
--   IRPF 15 %         150,00
--   importe_a_pagar 1.060,00
--
-- La RPC 009 NO necesita modificarse para que las facturas
-- actuales sigan funcionando.
-- ============================================================