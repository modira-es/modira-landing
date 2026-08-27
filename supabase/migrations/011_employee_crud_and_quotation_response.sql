BEGIN;

-- ============================================================
-- MODIRA — 011_employee_crud_and_quotation_response.sql
--
-- OBJETIVO
-- ============================================================
--
-- 1. Permitir al CLIENTE responder a un presupuesto:
--      Pendiente -> Aceptado
--      Pendiente -> Rechazado
--
-- 2. Mantener bloqueadas las modificaciones directas del cliente
--    sobre quotations.
--
-- 3. Permitir al WORKER ACTIVO:
--      - editar facturas
--      - eliminar facturas
--
-- 4. Mantener numero_factura INMUTABLE.
--
-- 5. Mantener IVA e IRPF compatibles con migración 010.
--
-- 6. Al eliminar una factura:
--      - eliminar su PDF de Storage si existe
--      - eliminar la factura
--
-- 7. NO conceder UPDATE/DELETE directo sobre invoices.
--    Las operaciones sensibles se realizan mediante RPC.
--
-- ============================================================


-- ============================================================
-- 0. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    -- --------------------------------------------------------
    -- Quotations
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'quotations'
    ) THEN

        RAISE EXCEPTION
            '011 stopped: public.quotations does not exist';

    END IF;


    -- --------------------------------------------------------
    -- Invoices
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
    ) THEN

        RAISE EXCEPTION
            '011 stopped: public.invoices does not exist';

    END IF;


    -- --------------------------------------------------------
    -- Workers
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'workers'
    ) THEN

        RAISE EXCEPTION
            '011 stopped: public.workers does not exist';

    END IF;


    -- --------------------------------------------------------
    -- Función de seguridad de worker
    -- --------------------------------------------------------

    IF to_regprocedure(
        'public.current_user_is_worker()'
    ) IS NULL THEN

        RAISE EXCEPTION
            '011 stopped: current_user_is_worker() does not exist';

    END IF;


    -- --------------------------------------------------------
    -- Función existente de creación de facturas
    -- --------------------------------------------------------

    IF to_regprocedure(
        'public.create_invoice_by_worker(uuid,uuid,timestamptz,timestamptz,text,numeric,numeric)'
    ) IS NULL THEN

        RAISE EXCEPTION
            '011 stopped: create_invoice_by_worker() does not exist';

    END IF;


    -- --------------------------------------------------------
    -- Columnas fiscales de 010
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND column_name = 'iva_aplicado'
    ) THEN

        RAISE EXCEPTION
            '011 stopped: invoices.iva_aplicado does not exist';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND column_name = 'irpf_aplicado'
    ) THEN

        RAISE EXCEPTION
            '011 stopped: invoices.irpf_aplicado does not exist';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND column_name = 'importe_a_pagar'
    ) THEN

        RAISE EXCEPTION
            '011 stopped: invoices.importe_a_pagar does not exist';

    END IF;


END $$;


-- ============================================================
-- 1. RESPONDER A UN PRESUPUESTO
-- ============================================================
--
-- El cliente únicamente puede realizar:
--
--      Pendiente -> Aceptado
--      Pendiente -> Rechazado
--
-- No se permite:
--
--      Aceptado -> Rechazado
--      Rechazado -> Aceptado
--      Aceptado -> Pendiente
--      Rechazado -> Pendiente
--
-- El cliente solo puede responder presupuestos de su empresa.
--
-- El worker/admin también puede utilizar la función si fuese
-- necesario, pero siempre respetando las transiciones válidas.
-- ============================================================


CREATE OR REPLACE FUNCTION public.respond_to_quotation(
    p_estado TEXT,
    p_quotation_id UUID
)
RETURNS public.quotations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$

DECLARE

    v_quotation public.quotations;

    v_normalized_state TEXT;

BEGIN

    -- ========================================================
    -- 1. VALIDAR ESTADO
    -- ========================================================

    v_normalized_state :=
        INITCAP(
            LOWER(
                TRIM(
                    COALESCE(
                        p_estado,
                        ''
                    )
                )
            )
        );


    IF v_normalized_state NOT IN (
        'Aceptado',
        'Rechazado'
    ) THEN

        RAISE EXCEPTION
            'Estado de respuesta no válido. Debe ser Aceptado o Rechazado';

    END IF;


    -- ========================================================
    -- 2. OBTENER PRESUPUESTO
    -- ========================================================

    SELECT *
    INTO v_quotation

    FROM public.quotations

    WHERE id = p_quotation_id

    FOR UPDATE;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'Presupuesto no encontrado';

    END IF;


    -- ========================================================
    -- 3. COMPROBAR QUE ESTÁ PENDIENTE
    -- ========================================================

    IF LOWER(
        TRIM(
            v_quotation.estado
        )
    ) <> 'pendiente' THEN

        RAISE EXCEPTION
            'Este presupuesto ya ha sido respondido y no puede modificarse';

    END IF;


    -- ========================================================
    -- 4. COMPROBAR ACCESO
    -- ========================================================
    --
    -- Worker:
    --     puede responder cualquier presupuesto.
    --
    -- Cliente:
    --     únicamente presupuestos de su empresa.
    --
    -- ========================================================

    IF NOT public.current_user_is_worker() THEN

        IF v_quotation.company_id IS DISTINCT FROM
           public.current_user_company_id()
        THEN

            RAISE EXCEPTION
                'Acceso denegado al presupuesto';

        END IF;

    END IF;


    -- ========================================================
    -- 5. ACTUALIZAR ESTADO
    -- ========================================================

    UPDATE public.quotations

    SET
        estado = v_normalized_state,
        updated_at = CURRENT_TIMESTAMP

    WHERE id = v_quotation.id

    RETURNING *
    INTO v_quotation;


    RETURN v_quotation;

END;

$function$;


-- ============================================================
-- 2. PERMISOS respond_to_quotation()
-- ============================================================

REVOKE ALL
ON FUNCTION public.respond_to_quotation(
    TEXT,
    UUID
)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.respond_to_quotation(
    TEXT,
    UUID
)
TO authenticated;


ALTER FUNCTION public.respond_to_quotation(
    TEXT,
    UUID
)
SET search_path = public, pg_temp;


-- ============================================================
-- 3. ACTUALIZAR FACTURA COMO WORKER
-- ============================================================
--
-- El número de factura NO se recibe como parámetro.
--
-- Por tanto:
--
--      numero_factura = INMUTABLE
--
-- Se pueden modificar:
--
--      empresa
--      proyecto
--      fecha emisión
--      fecha vencimiento
--      descripción
--      subtotal
--      IVA
--      IRPF
--      estado
--
-- El user_id y client_id se recalculan desde el proyecto.
--
-- Esto evita que el worker pueda crear una combinación
-- inconsistente empresa/proyecto/cliente.
--
-- ============================================================


CREATE OR REPLACE FUNCTION public.update_invoice_by_worker(
    p_invoice_id UUID,
    p_company_id UUID,
    p_project_id UUID,
    p_fecha_emision TIMESTAMPTZ DEFAULT NULL,
    p_fecha_vencimiento TIMESTAMPTZ DEFAULT NULL,
    p_descripcion TEXT DEFAULT NULL,
    p_subtotal NUMERIC(12,2) DEFAULT 0,
    p_iva_aplicado BOOLEAN DEFAULT TRUE,
    p_iva_porcentaje NUMERIC(5,2) DEFAULT 21,
    p_irpf_aplicado BOOLEAN DEFAULT FALSE,
    p_irpf_porcentaje NUMERIC(5,2) DEFAULT 0,
    p_estado TEXT DEFAULT 'pendiente'
)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$

DECLARE

    v_invoice public.invoices;

    v_project_user_id UUID;
    v_project_client_id UUID;
    v_project_company_id UUID;

    v_subtotal NUMERIC(12,2);
    v_iva_porcentaje NUMERIC(5,2);
    v_irpf_porcentaje NUMERIC(5,2);

    v_normalized_status TEXT;

BEGIN

    -- ========================================================
    -- 1. WORKER ACTIVO
    -- ========================================================

    IF NOT public.current_user_is_worker() THEN

        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';

    END IF;


    -- ========================================================
    -- 2. VALIDAR FACTURA
    -- ========================================================

    SELECT *
    INTO v_invoice

    FROM public.invoices

    WHERE id = p_invoice_id

    FOR UPDATE;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'Factura no encontrada';

    END IF;


    -- ========================================================
    -- 3. VALIDAR EMPRESA
    -- ========================================================

    IF p_company_id IS NULL THEN

        RAISE EXCEPTION
            'La empresa es obligatoria';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM public.companies
        WHERE id = p_company_id
    ) THEN

        RAISE EXCEPTION
            'La empresa indicada no existe';

    END IF;


    -- ========================================================
    -- 4. VALIDAR PROYECTO
    -- ========================================================

    IF p_project_id IS NULL THEN

        RAISE EXCEPTION
            'El proyecto es obligatorio';

    END IF;


    SELECT
        user_id,
        client_id,
        company_id

    INTO
        v_project_user_id,
        v_project_client_id,
        v_project_company_id

    FROM public.projects

    WHERE id = p_project_id;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'El proyecto indicado no existe';

    END IF;


    -- ========================================================
    -- 5. EMPRESA Y PROYECTO DEBEN COINCIDIR
    -- ========================================================

    IF v_project_company_id IS DISTINCT FROM
       p_company_id
    THEN

        RAISE EXCEPTION
            'El proyecto no pertenece a la empresa seleccionada';

    END IF;


    -- ========================================================
    -- 6. NORMALIZAR SUBTOTAL
    -- ========================================================

    v_subtotal :=
        ROUND(
            COALESCE(
                p_subtotal,
                0
            ),
            2
        );


    IF v_subtotal < 0 THEN

        RAISE EXCEPTION
            'La base imponible no puede ser negativa';

    END IF;


    -- ========================================================
    -- 7. NORMALIZAR IVA
    -- ========================================================

    IF p_iva_aplicado IS NULL THEN

        p_iva_aplicado := TRUE;

    END IF;


    v_iva_porcentaje :=
        ROUND(
            COALESCE(
                p_iva_porcentaje,
                0
            ),
            2
        );


    IF p_iva_aplicado = TRUE THEN

        IF v_iva_porcentaje < 0
           OR v_iva_porcentaje > 100
        THEN

            RAISE EXCEPTION
                'El porcentaje de IVA debe estar entre 0 y 100';

        END IF;

    ELSE

        v_iva_porcentaje := 0;

    END IF;


    -- ========================================================
    -- 8. NORMALIZAR IRPF
    -- ========================================================

    IF p_irpf_aplicado IS NULL THEN

        p_irpf_aplicado := FALSE;

    END IF;


    v_irpf_porcentaje :=
        ROUND(
            COALESCE(
                p_irpf_porcentaje,
                0
            ),
            2
        );


    IF p_irpf_aplicado = TRUE THEN

        IF v_irpf_porcentaje <= 0
           OR v_irpf_porcentaje > 100
        THEN

            RAISE EXCEPTION
                'El porcentaje de IRPF debe ser mayor que 0 y menor o igual que 100';

        END IF;

    ELSE

        v_irpf_porcentaje := 0;

    END IF;


    -- ========================================================
    -- 9. VALIDAR ESTADO
    -- ========================================================

    v_normalized_status :=
        LOWER(
            TRIM(
                COALESCE(
                    p_estado,
                    'pendiente'
                )
            )
        );


    IF v_normalized_status NOT IN (
        'pendiente',
        'pagada',
        'vencida',
        'cancelada'
    ) THEN

        RAISE EXCEPTION
            'Estado de factura no válido';

    END IF;


    -- ========================================================
    -- 10. ACTUALIZAR
    -- ========================================================
    --
    -- IMPORTANTE:
    --
    -- NO modificamos:
    --
    --     numero_factura
    --     id
    --     created_at
    --
    -- El trigger de 010 calcula automáticamente:
    --
    --     iva_importe
    --     monto
    --     irpf_importe
    --     importe_a_pagar
    --
    -- ========================================================

    UPDATE public.invoices

    SET

        user_id =
            v_project_user_id,

        company_id =
            p_company_id,

        project_id =
            p_project_id,

        client_id =
            v_project_client_id,

        fecha_emision =
            COALESCE(
                p_fecha_emision,
                fecha_emision
            ),

        fecha_vencimiento =
            p_fecha_vencimiento,

        descripcion =
            NULLIF(
                TRIM(
                    COALESCE(
                        p_descripcion,
                        ''
                    )
                ),
                ''
            ),

        subtotal =
            v_subtotal,

        iva_aplicado =
            p_iva_aplicado,

        iva_porcentaje =
            v_iva_porcentaje,

        irpf_aplicado =
            p_irpf_aplicado,

        irpf_porcentaje =
            v_irpf_porcentaje,

        estado =
            v_normalized_status,

        updated_at =
            CURRENT_TIMESTAMP

    WHERE id = p_invoice_id

    RETURNING *
    INTO v_invoice;


    RETURN v_invoice;

END;

$function$;


-- ============================================================
-- 4. PERMISOS update_invoice_by_worker()
-- ============================================================

REVOKE ALL
ON FUNCTION public.update_invoice_by_worker(
    UUID,
    UUID,
    UUID,
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    NUMERIC,
    BOOLEAN,
    NUMERIC,
    BOOLEAN,
    NUMERIC,
    TEXT
)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.update_invoice_by_worker(
    UUID,
    UUID,
    UUID,
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    NUMERIC,
    BOOLEAN,
    NUMERIC,
    BOOLEAN,
    NUMERIC,
    TEXT
)
TO authenticated;


ALTER FUNCTION public.update_invoice_by_worker(
    UUID,
    UUID,
    UUID,
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    NUMERIC,
    BOOLEAN,
    NUMERIC,
    BOOLEAN,
    NUMERIC,
    TEXT
)
SET search_path = public, pg_temp;


-- ============================================================
-- 5. ELIMINAR FACTURA COMO WORKER
-- ============================================================
--
-- Elimina:
--
--   1. PDF asociado, si existe.
--   2. Factura.
--
-- Payments.invoice_id tiene ON DELETE SET NULL, por lo que
-- eliminar una factura no elimina los pagos históricos.
--
-- ============================================================


CREATE OR REPLACE FUNCTION public.delete_invoice_by_worker(
    p_invoice_id UUID
)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$

DECLARE

    v_invoice public.invoices;

BEGIN

    -- ========================================================
    -- 1. WORKER ACTIVO
    -- ========================================================

    IF NOT public.current_user_is_worker() THEN

        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';

    END IF;


    -- ========================================================
    -- 2. OBTENER FACTURA
    -- ========================================================

    SELECT *
    INTO v_invoice

    FROM public.invoices

    WHERE id = p_invoice_id

    FOR UPDATE;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'Factura no encontrada';

    END IF;


    -- ========================================================
    -- 3. ELIMINAR PDF
    -- ========================================================
    --
    -- El bucket invoices es privado.
    --
    -- La ruta normalmente es:
    --
    --     numero_factura.pdf
    --
    -- ========================================================

    IF v_invoice.document_path IS NOT NULL
       AND TRIM(
           v_invoice.document_path
       ) <> ''
    THEN

        DELETE FROM storage.objects

        WHERE bucket_id = 'invoices'

          AND name =
              v_invoice.document_path;

    ELSE

        -- Compatibilidad con documentos existentes que pudieran
        -- no tener document_path registrado correctamente.

        DELETE FROM storage.objects

        WHERE bucket_id = 'invoices'

          AND name =
              v_invoice.numero_factura || '.pdf';

    END IF;


    -- ========================================================
    -- 4. ELIMINAR FACTURA
    -- ========================================================

    DELETE FROM public.invoices

    WHERE id = p_invoice_id

    RETURNING *
    INTO v_invoice;


    RETURN v_invoice;

END;

$function$;


-- ============================================================
-- 6. PERMISOS delete_invoice_by_worker()
-- ============================================================

REVOKE ALL
ON FUNCTION public.delete_invoice_by_worker(
    UUID
)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.delete_invoice_by_worker(
    UUID
)
TO authenticated;


ALTER FUNCTION public.delete_invoice_by_worker(
    UUID
)
SET search_path = public, pg_temp;


-- ============================================================
-- 7. ASEGURAR QUE EL WORKER NO TIENE CRUD DIRECTO EN INVOICES
-- ============================================================
--
-- Seguimos la arquitectura de las migraciones 004/005:
--
-- SELECT -> directo
-- INSERT -> RPC
-- UPDATE -> RPC
-- DELETE -> RPC
--
-- ============================================================

REVOKE INSERT, UPDATE, DELETE
ON public.invoices
FROM authenticated;


-- ============================================================
-- 8. GARANTIZAR SELECT DE INVOICES
-- ============================================================

GRANT SELECT
ON public.invoices
TO authenticated;


-- ============================================================
-- 9. COMPROBACIONES FINALES
-- ============================================================

DO $$
DECLARE

    v_count INTEGER;

BEGIN

    -- --------------------------------------------------------
    -- respond_to_quotation
    -- --------------------------------------------------------

    IF to_regprocedure(
        'public.respond_to_quotation(text,uuid)'
    ) IS NULL THEN

        RAISE EXCEPTION
            '011 failed: respond_to_quotation() is missing';

    END IF;


    -- --------------------------------------------------------
    -- update_invoice_by_worker
    -- --------------------------------------------------------

    IF to_regprocedure(
        'public.update_invoice_by_worker(uuid,uuid,uuid,timestamptz,timestamptz,text,numeric,boolean,numeric,boolean,numeric,text)'
    ) IS NULL THEN

        RAISE EXCEPTION
            '011 failed: update_invoice_by_worker() is missing';

    END IF;


    -- --------------------------------------------------------
    -- delete_invoice_by_worker
    -- --------------------------------------------------------

    IF to_regprocedure(
        'public.delete_invoice_by_worker(uuid)'
    ) IS NULL THEN

        RAISE EXCEPTION
            '011 failed: delete_invoice_by_worker() is missing';

    END IF;


    -- --------------------------------------------------------
    -- SELECT invoices
    -- --------------------------------------------------------

    IF NOT has_table_privilege(
        'authenticated',
        'public.invoices',
        'SELECT'
    ) THEN

        RAISE EXCEPTION
            '011 failed: authenticated must retain SELECT on invoices';

    END IF;


    -- --------------------------------------------------------
    -- INSERT invoices NO directo
    -- --------------------------------------------------------

    IF has_table_privilege(
        'authenticated',
        'public.invoices',
        'INSERT'
    ) THEN

        RAISE EXCEPTION
            '011 failed: authenticated must NOT have direct INSERT on invoices';

    END IF;


    -- --------------------------------------------------------
    -- UPDATE invoices NO directo
    -- --------------------------------------------------------

    IF has_table_privilege(
        'authenticated',
        'public.invoices',
        'UPDATE'
    ) THEN

        RAISE EXCEPTION
            '011 failed: authenticated must NOT have direct UPDATE on invoices';

    END IF;


    -- --------------------------------------------------------
    -- DELETE invoices NO directo
    -- --------------------------------------------------------

    IF has_table_privilege(
        'authenticated',
        'public.invoices',
        'DELETE'
    ) THEN

        RAISE EXCEPTION
            '011 failed: authenticated must NOT have direct DELETE on invoices';

    END IF;


    -- --------------------------------------------------------
    -- RLS invoices
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_class

    WHERE oid =
        'public.invoices'::regclass

      AND relrowsecurity = TRUE;


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '011 failed: RLS is not enabled on invoices';

    END IF;


    -- --------------------------------------------------------
    -- RLS quotations
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_class

    WHERE oid =
        'public.quotations'::regclass

      AND relrowsecurity = TRUE;


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '011 failed: RLS is not enabled on quotations';

    END IF;


    -- --------------------------------------------------------
    -- Estado quotations
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid =
            'public.quotations'::regclass

          AND conname =
            'quotations_estado_check'
    ) THEN

        RAISE EXCEPTION
            '011 failed: quotations_estado_check is missing';

    END IF;


    -- --------------------------------------------------------
    -- Número factura UNIQUE
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'invoices'
          AND indexname =
              'idx_invoices_numero_factura_unique'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid =
            'public.invoices'::regclass

          AND conname =
            'invoices_numero_factura_key'
    ) THEN

        -- La migración 004 sustituye la constraint antigua por
        -- un índice UNIQUE.
        RAISE EXCEPTION
            '011 failed: invoice number uniqueness is missing';

    END IF;


    -- --------------------------------------------------------
    -- Columnas fiscales 010
    -- --------------------------------------------------------

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
            '011 failed: fiscal invoice columns are incomplete';

    END IF;


END $$;


-- ============================================================
-- 10. COMENTARIOS
-- ============================================================

COMMENT ON FUNCTION public.respond_to_quotation(
    TEXT,
    UUID
)
IS
'Permite responder un presupuesto únicamente desde Pendiente hacia Aceptado o Rechazado.';


COMMENT ON FUNCTION public.update_invoice_by_worker(
    UUID,
    UUID,
    UUID,
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    NUMERIC,
    BOOLEAN,
    NUMERIC,
    BOOLEAN,
    NUMERIC,
    TEXT
)
IS
'Permite a un trabajador activo editar una factura sin modificar su numero_factura. Los importes fiscales son recalculados por el trigger de facturación.';


COMMENT ON FUNCTION public.delete_invoice_by_worker(
    UUID
)
IS
'Permite a un trabajador activo eliminar una factura y su PDF asociado.';


-- ============================================================
-- FIN 011
-- ============================================================

COMMIT;