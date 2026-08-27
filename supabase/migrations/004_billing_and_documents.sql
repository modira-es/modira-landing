BEGIN;

-- ============================================================
-- MODIRA — 004_billing_and_documents.sql
-- Facturación, numeración, documentos, Storage y creación
-- de facturas por workers.
--
-- REGLAS DE EMPRESA:
--
-- 1. profiles.company_id representa la empresa ACTUAL
--    del cliente.
--
-- 2. invoices.company_id representa la empresa a la que
--    pertenece la factura.
--
-- 3. Si una factura fue creada cuando el cliente no tenía
--    empresa (company_id IS NULL), se puede asociar a la
--    primera empresa que se le asigne posteriormente.
--
-- 4. Si una factura ya tiene empresa, NO se modifica
--    automáticamente aunque el cliente cambie posteriormente
--    de empresa.
--
-- Esto conserva correctamente el histórico de facturación.
-- ============================================================


-- ============================================================
-- 1. RLS DE INVOICES
-- ============================================================

ALTER TABLE public.invoices
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. UNICIDAD DE NUMERO DE FACTURA
-- ============================================================

ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_numero_factura_key;


CREATE UNIQUE INDEX IF NOT EXISTS
    idx_invoices_numero_factura_unique
ON public.invoices(numero_factura);


-- ============================================================
-- 3. PERMISOS BASE
-- ============================================================

GRANT SELECT
ON public.invoices
TO authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.invoices
FROM authenticated;


-- ============================================================
-- 4. RLS — CLIENTE
-- ============================================================

DROP POLICY IF EXISTS invoices_client_select
ON public.invoices;


CREATE POLICY invoices_client_select
ON public.invoices
FOR SELECT
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND user_id = auth.uid()
);


-- ============================================================
-- 5. RLS — WORKER
-- ============================================================

DROP POLICY IF EXISTS invoices_worker_select
ON public.invoices;


CREATE POLICY invoices_worker_select
ON public.invoices
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 6. NUMERACIÓN GLOBAL
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_year TEXT := TO_CHAR(CURRENT_DATE, 'YY');
    v_random TEXT;
    v_invoice_number TEXT;
BEGIN

    LOOP

        SELECT string_agg(
            substr(
                'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                floor(random() * 32 + 1)::INTEGER,
                1
            ),
            ''
        )
        INTO v_random
        FROM generate_series(1, 6);


        v_invoice_number :=
            'MODIRA-' || v_year || '-' || v_random;


        EXIT WHEN NOT EXISTS (
            SELECT 1
            FROM public.invoices
            WHERE numero_factura = v_invoice_number
        );

    END LOOP;


    RETURN v_invoice_number;

END;
$$;


REVOKE ALL
ON FUNCTION public.generate_invoice_number()
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.generate_invoice_number()
TO authenticated;


-- ============================================================
-- 7. SINCRONIZACIÓN DE FACTURAS SIN EMPRESA
--
-- Cuando un cliente recibe una empresa:
--
-- profiles.company_id:
--
--     NULL → EMPRESA_A
--
-- se actualizan únicamente sus facturas que todavía tienen:
--
--     invoices.company_id IS NULL
--
-- NO se modifican facturas que ya pertenecen a una empresa.
--
-- Por tanto:
--
-- Empresa A → Empresa B
--
-- NO mueve facturas históricas de A a B.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_invoice_company_on_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN

    -- --------------------------------------------------------
    -- Solo nos interesa cuando el cliente obtiene una empresa.
    --
    -- NULL → empresa
    --
    -- También permitimos que la lógica sea idempotente:
    -- si ya tenía una empresa, solamente se actualizarán
    -- facturas que todavía estén NULL.
    -- --------------------------------------------------------

    IF NEW.company_id IS NOT NULL THEN

        UPDATE public.invoices
        SET
            company_id = NEW.company_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.id
          AND company_id IS NULL;

    END IF;


    RETURN NEW;

END;
$$;


REVOKE ALL
ON FUNCTION public.sync_invoice_company_on_profile_change()
FROM PUBLIC, anon;


-- ============================================================
-- 8. TRIGGER DE SINCRONIZACIÓN
-- ============================================================

DROP TRIGGER IF EXISTS
    trg_sync_invoice_company_on_profile_change
ON public.profiles;


CREATE TRIGGER
    trg_sync_invoice_company_on_profile_change

AFTER UPDATE OF company_id

ON public.profiles

FOR EACH ROW

WHEN (
    NEW.company_id IS DISTINCT FROM OLD.company_id
)

EXECUTE FUNCTION
    public.sync_invoice_company_on_profile_change();


-- ============================================================
-- 9. STORAGE
-- ============================================================

INSERT INTO storage.buckets (
    id,
    name,
    public
)
VALUES (
    'invoices',
    'invoices',
    FALSE
)
ON CONFLICT (id)
DO UPDATE
SET public = FALSE;


-- ------------------------------------------------------------
-- Worker INSERT
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
    invoice_documents_worker_insert
ON storage.objects;


CREATE POLICY invoice_documents_worker_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'invoices'
    AND public.current_user_is_worker()
    AND name LIKE '%.pdf'
    AND EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE name = i.numero_factura || '.pdf'
    )
);


-- ------------------------------------------------------------
-- Worker SELECT
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
    invoice_documents_worker_select
ON storage.objects;


CREATE POLICY invoice_documents_worker_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'invoices'
    AND public.current_user_is_worker()
    AND EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE storage.objects.name =
              i.numero_factura || '.pdf'
    )
);


-- ------------------------------------------------------------
-- Worker UPDATE
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
    invoice_documents_worker_update
ON storage.objects;


CREATE POLICY invoice_documents_worker_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'invoices'
    AND public.current_user_is_worker()
    AND EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE storage.objects.name =
              i.numero_factura || '.pdf'
    )
)
WITH CHECK (
    bucket_id = 'invoices'
    AND public.current_user_is_worker()
    AND EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE storage.objects.name =
              i.numero_factura || '.pdf'
    )
);


-- ------------------------------------------------------------
-- Worker DELETE
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
    invoice_documents_worker_delete
ON storage.objects;


CREATE POLICY invoice_documents_worker_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'invoices'
    AND public.current_user_is_worker()
    AND EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE storage.objects.name =
              i.numero_factura || '.pdf'
    )
);


-- ------------------------------------------------------------
-- Cliente SELECT
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
    invoice_documents_client_select
ON storage.objects;


CREATE POLICY invoice_documents_client_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'invoices'
    AND NOT public.current_user_is_worker()
    AND EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.numero_factura =
              regexp_replace(
                  storage.objects.name,
                  '\.pdf$',
                  ''
              )
          AND i.user_id = auth.uid()
    )
);


-- ============================================================
-- 10. attach_invoice_document()
-- ============================================================

CREATE OR REPLACE FUNCTION public.attach_invoice_document(
    p_invoice_id UUID,
    p_document_path TEXT
)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invoice public.invoices;
BEGIN

    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';
    END IF;


    IF p_document_path IS NULL
       OR TRIM(p_document_path) = '' THEN

        RAISE EXCEPTION
            'El documento es obligatorio';
    END IF;


    UPDATE public.invoices
    SET
        document_path = TRIM(p_document_path),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_invoice_id
    RETURNING *
    INTO v_invoice;


    IF NOT FOUND THEN
        RAISE EXCEPTION
            'La factura no existe';
    END IF;


    RETURN v_invoice;

END;
$$;


REVOKE ALL
ON FUNCTION public.attach_invoice_document(
    UUID,
    TEXT
)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.attach_invoice_document(
    UUID,
    TEXT
)
TO authenticated;


-- ============================================================
-- 11. create_invoice_by_worker()
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
AS $$
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

    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';
    END IF;


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
            'La empresa seleccionada no existe';
    END IF;


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


    v_subtotal :=
        COALESCE(p_subtotal, 0);


    v_iva_porcentaje :=
        COALESCE(p_iva_porcentaje, 0);


    IF v_subtotal < 0 THEN
        RAISE EXCEPTION
            'El importe no puede ser negativo';
    END IF;


    IF v_iva_porcentaje < 0
       OR v_iva_porcentaje > 100 THEN

        RAISE EXCEPTION
            'El IVA debe estar entre 0 y 100';
    END IF;


    IF p_fecha_vencimiento IS NOT NULL
       AND COALESCE(
           p_fecha_emision,
           CURRENT_TIMESTAMP
       ) > p_fecha_vencimiento THEN

        RAISE EXCEPTION
            'La fecha de vencimiento no puede ser anterior a la fecha de emisión';
    END IF;


    v_iva_importe :=
        ROUND(
            v_subtotal *
            v_iva_porcentaje /
            100,
            2
        );


    v_monto :=
        ROUND(
            v_subtotal +
            v_iva_importe,
            2
        );


    v_numero_factura :=
        public.generate_invoice_number();


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
        COALESCE(
            p_fecha_emision,
            CURRENT_TIMESTAMP
        ),
        p_fecha_vencimiento,
        NULLIF(
            TRIM(p_descripcion),
            ''
        ),
        v_subtotal,
        v_iva_porcentaje,
        v_iva_importe
    )
    RETURNING *
    INTO v_invoice;


    RETURN v_invoice;

END;
$$;


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
FROM PUBLIC, anon;


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
-- 12. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- Índice de facturación
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'invoices'
          AND indexname =
              'idx_invoices_numero_factura_unique'
    ) THEN

        RAISE EXCEPTION
            '004 failed: idx_invoices_numero_factura_unique is missing';

    END IF;


    -- --------------------------------------------------------
    -- Constraint antiguo
    -- --------------------------------------------------------

    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid =
              'public.invoices'::regclass
          AND conname =
              'invoices_numero_factura_key'
    ) THEN

        RAISE EXCEPTION
            '004 failed: obsolete invoices_numero_factura_key still exists';

    END IF;


    -- --------------------------------------------------------
    -- Policies
    -- --------------------------------------------------------

    IF (
        SELECT COUNT(*)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'invoices'
          AND policyname IN (
              'invoices_client_select',
              'invoices_worker_select'
          )
    ) <> 2 THEN

        RAISE EXCEPTION
            '004 failed: invoices RLS policies are incomplete';

    END IF;


    -- --------------------------------------------------------
    -- Funciones principales
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_proc
    WHERE pronamespace =
          'public'::regnamespace
      AND proname IN (
          'generate_invoice_number',
          'attach_invoice_document',
          'create_invoice_by_worker',
          'sync_invoice_company_on_profile_change'
      );


    IF v_count <> 4 THEN

        RAISE EXCEPTION
            '004 failed: billing RPC/function set is incomplete';

    END IF;


    -- --------------------------------------------------------
    -- Trigger de sincronización
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname =
              'trg_sync_invoice_company_on_profile_change'
          AND tgrelid =
              'public.profiles'::regclass
          AND NOT tgisinternal
    ) THEN

        RAISE EXCEPTION
            '004 failed: invoice company synchronization trigger is missing';

    END IF;


    -- --------------------------------------------------------
    -- Storage
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id = 'invoices'
          AND public = FALSE
    ) THEN

        RAISE EXCEPTION
            '004 failed: invoices storage bucket is not private';

    END IF;

END $$;


COMMIT;
