BEGIN;

-- ============================================================
-- MODIRA - MIGRACIÓN 018
-- IDENTIFICADOR ÚNICO ALEATORIO DE FACTURAS
-- ============================================================
--
-- OBJETIVO:
--
-- Generar automáticamente un identificador único para cada
-- factura.
--
-- FORMATO:
--
-- MODIRA-26-K7P4X9
--
-- El identificador:
--
-- - No muestra cuántas facturas existen.
-- - No depende de un contador visible.
-- - Es único en toda MODIRA.
-- - Puede utilizarse como nombre del PDF.
--
-- EJEMPLO:
--
-- numero_factura
--     MODIRA-26-K7P4X9
--
-- PDF
--     MODIRA-26-K7P4X9.pdf
--
-- ============================================================


-- ============================================================
-- 1. COMPROBACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    -- Comprobar que existe invoices
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
    ) THEN

        RAISE EXCEPTION
        'Migration 018 stopped: public.invoices does not exist';

    END IF;


    -- Comprobar numero_factura
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND column_name = 'numero_factura'
    ) THEN

        RAISE EXCEPTION
        'Migration 018 stopped: invoices.numero_factura does not exist';

    END IF;


    -- Comprobar current_user_is_worker()
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND proname = 'current_user_is_worker'
    ) THEN

        RAISE EXCEPTION
        'Migration 018 stopped: current_user_is_worker() does not exist';

    END IF;

END $$;


-- ============================================================
-- 2. COMPROBAR DUPLICADOS EXISTENTES
-- ============================================================
--
-- Antes de crear la restricción UNIQUE comprobamos que no
-- existan números de factura duplicados.
--
-- ============================================================

DO $$
BEGIN

    IF EXISTS (
        SELECT numero_factura
        FROM public.invoices
        WHERE numero_factura IS NOT NULL
        GROUP BY numero_factura
        HAVING COUNT(*) > 1
    ) THEN

        RAISE EXCEPTION
        'Migration 018 stopped: duplicate numero_factura values already exist';

    END IF;

END $$;


-- ============================================================
-- 3. ELIMINAR LA RESTRICCIÓN ANTERIOR
-- ============================================================
--
-- La migración inicial utilizaba una unicidad basada en:
--
-- company_id + numero_factura
--
-- Esto permitiría:
--
-- Empresa A → MODIRA-26-K7P4X9
-- Empresa B → MODIRA-26-K7P4X9
--
-- Nosotros queremos que el identificador sea único en toda
-- MODIRA.
--
-- ============================================================

ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_company_id_numero_factura_key;


-- ============================================================
-- 4. CREAR UNICIDAD GLOBAL
-- ============================================================
--
-- Nunca podrán existir dos facturas con el mismo
-- numero_factura.
--
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
idx_invoices_numero_factura_unique
ON public.invoices (numero_factura)
WHERE numero_factura IS NOT NULL;


-- ============================================================
-- 5. FUNCIÓN PARA GENERAR EL IDENTIFICADOR
-- ============================================================
--
-- Genera identificadores como:
--
-- MODIRA-26-K7P4X9
-- MODIRA-26-H3M8QW
-- MODIRA-26-R7T2KA
--
-- Se utilizan 32 caracteres:
--
-- ABCDEFGHJKLMNPQRSTUVWXYZ23456789
--
-- Se excluyen:
--
-- I
-- O
-- 0
-- 1
--
-- para evitar confusiones visuales.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE

    v_year TEXT;
    v_random TEXT;
    v_invoice_number TEXT;

BEGIN

    -- ========================================================
    -- 1. COMPROBAR TRABAJADOR ACTIVO
    -- ========================================================

    IF NOT public.current_user_is_worker() THEN

        RAISE EXCEPTION
        'Acceso denegado: se requiere un trabajador activo';

    END IF;


    -- ========================================================
    -- 2. OBTENER AÑO ACTUAL
    -- ========================================================

    v_year := TO_CHAR(CURRENT_DATE, 'YY');


    -- ========================================================
    -- 3. GENERAR CÓDIGO ALEATORIO
    -- ========================================================
    --
    -- 32 posibilidades por posición.
    --
    -- 32^6 = 1.073.741.824 combinaciones.
    --
    -- ========================================================

    SELECT string_agg(
        substr(
            'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
            floor(random() * 32 + 1)::integer,
            1
        ),
        ''
    )
    INTO v_random
    FROM generate_series(1, 6);


    -- ========================================================
    -- 4. CREAR IDENTIFICADOR COMPLETO
    -- ========================================================

    v_invoice_number :=
        'MODIRA-'
        || v_year
        || '-'
        || v_random;


    -- ========================================================
    -- 5. COMPROBAR QUE NO EXISTA
    -- ========================================================
    --
    -- Si por una probabilidad extremadamente pequeña el código
    -- ya existiera, generamos otro.
    --
    -- ========================================================

    WHILE EXISTS (
        SELECT 1
        FROM public.invoices
        WHERE numero_factura = v_invoice_number
    )
    LOOP

        SELECT string_agg(
            substr(
                'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                floor(random() * 32 + 1)::integer,
                1
            ),
            ''
        )
        INTO v_random
        FROM generate_series(1, 6);


        v_invoice_number :=
            'MODIRA-'
            || v_year
            || '-'
            || v_random;

    END LOOP;


    -- ========================================================
    -- 6. DEVOLVER IDENTIFICADOR
    -- ========================================================

    RETURN v_invoice_number;

END;
$$;


-- ============================================================
-- 6. CONTROLAR QUIÉN PUEDE EJECUTAR LA FUNCIÓN
-- ============================================================
--
-- La función no puede ejecutarse de forma anónima.
--
-- Los usuarios autenticados pueden llamarla, pero la propia
-- función comprueba que sean trabajadores activos.
--
-- ============================================================

REVOKE ALL
ON FUNCTION public.generate_invoice_number()
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.generate_invoice_number()
TO authenticated;


-- ============================================================
-- 7. VERIFICACIÓN FINAL
-- ============================================================

DO $$
BEGIN

    -- Comprobar función
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND proname = 'generate_invoice_number'
    ) THEN

        RAISE EXCEPTION
        'Migration 018 failed: generate_invoice_number() was not created';

    END IF;


    -- Comprobar índice único
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'invoices'
          AND indexname = 'idx_invoices_numero_factura_unique'
    ) THEN

        RAISE EXCEPTION
        'Migration 018 failed: unique invoice number index was not created';

    END IF;

END $$;


COMMIT;