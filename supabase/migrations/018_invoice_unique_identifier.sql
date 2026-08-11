BEGIN;

-- ============================================================
-- MODIRA - MIGRACIÓN 018
-- IDENTIFICADOR ÚNICO ALEATORIO PARA FACTURAS
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
-- Donde:
--
-- MODIRA  → identificador de la plataforma
-- 26      → año de creación de la factura
-- K7P4X9  → identificador aleatorio
--
-- El identificador NO revela cuántas facturas existen.
--
-- El trabajador NO introduce manualmente el número.
--
-- ============================================================


-- ============================================================
-- 1. COMPROBACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    -- Comprobar que existe la tabla invoices
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
    ) THEN
        RAISE EXCEPTION
        'Migration 018 stopped: public.invoices does not exist';
    END IF;


    -- Comprobar que existe numero_factura
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

END $$;


-- ============================================================
-- 2. ELIMINAR LA RESTRICCIÓN ANTERIOR
-- ============================================================
--
-- La migración inicial permite que el mismo número de factura
-- exista en empresas diferentes:
--
-- UNIQUE (company_id, numero_factura)
--
-- Ahora queremos que el identificador sea único en TODA
-- MODIRA, independientemente de la empresa.
--
-- ============================================================

ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_company_id_numero_factura_key;


-- ============================================================
-- 3. CREAR UNICIDAD GLOBAL
-- ============================================================
--
-- De esta forma nunca podrán existir dos facturas con:
--
-- MODIRA-26-K7P4X9
--
-- aunque pertenezcan a empresas diferentes.
--
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
idx_invoices_numero_factura_unique
ON public.invoices (numero_factura);


-- ============================================================
-- 4. FUNCIÓN PARA GENERAR EL IDENTIFICADOR
-- ============================================================
--
-- Genera:
--
-- MODIRA-26-K7P4X9
--
-- utilizando:
--
-- - Año actual
-- - 6 caracteres aleatorios
--
-- Caracteres utilizados:
--
-- ABCDEFGHJKLMNPQRSTUVWXYZ
-- 23456789
--
-- Se excluyen caracteres como:
--
-- I, O, 0, 1
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
    -- 1. COMPROBAR QUE EL USUARIO ES UN TRABAJADOR ACTIVO
    -- ========================================================

    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION
        'Acceso denegado: se requiere un trabajador activo';
    END IF;


    -- ========================================================
    -- 2. OBTENER LOS DOS ÚLTIMOS DÍGITOS DEL AÑO
    -- ========================================================

    v_year := TO_CHAR(CURRENT_DATE, 'YY');


    -- ========================================================
    -- 3. GENERAR 6 CARACTERES ALEATORIOS
    -- ========================================================
    --
    -- Utilizamos 32 caracteres posibles:
    --
    -- ABCDEFGHJKLMNPQRSTUVWXYZ23456789
    --
    -- 32^6 = 1.073.741.824 combinaciones posibles.
    --
    -- La probabilidad de coincidencia es extremadamente baja,
    -- y además la base de datos impone UNIQUE.
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
    -- 5. DEVOLVER IDENTIFICADOR
    -- ========================================================

    RETURN v_invoice_number;

END;
$$;


-- ============================================================
-- 5. PERMISOS DE EJECUCIÓN
-- ============================================================
--
-- Nadie puede ejecutar la función de forma anónima.
--
-- Los usuarios autenticados podrán ejecutarla, pero la propia
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
-- 6. VERIFICACIÓN FINAL
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


-- ============================================================
-- RESULTADO
-- ============================================================
--
-- Ejemplos:
--
-- MODIRA-26-K7P4X9
-- MODIRA-26-H3M8QW
-- MODIRA-26-R7T2KA
--
-- No se puede saber cuántas facturas existen.
--
-- Cada identificador es único en toda la plataforma.
--
-- El mismo identificador no puede pertenecer a dos empresas.
--
-- ============================================================