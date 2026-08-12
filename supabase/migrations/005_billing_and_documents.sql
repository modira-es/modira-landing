-- ============================================================
-- MODIRA
-- 005_billing_and_documents.sql
--
-- FACTURACIÓN Y DOCUMENTOS
--
-- ============================================================
--
-- FUNCIONALIDADES:
--
-- 1. Trabajadores activos pueden consultar facturas de
--    todas las empresas.
--
-- 2. Los trabajadores no pueden crear, modificar ni eliminar
--    facturas directamente.
--
-- 3. Las facturas tienen un identificador global:
--
--       MODIRA-26-K7P4X9
--
-- 4. El identificador es aleatorio.
--
-- 5. numero_factura es UNIQUE en toda MODIRA.
--
-- 6. Cada factura puede tener un PDF asociado.
--
-- 7. Los PDFs se almacenan en un bucket privado.
--
-- 8. Los trabajadores pueden subir, consultar, sustituir
--    y eliminar PDFs.
--
-- 9. Los clientes únicamente pueden consultar el PDF de
--    sus propias facturas.
--
-- 10. attach_invoice_document() permite asociar el PDF a
--     la factura sin conceder UPDATE general sobre invoices.
--
-- ============================================================


BEGIN;


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================


DO $$
BEGIN

    -- --------------------------------------------------------
    -- invoices
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
    ) THEN

        RAISE EXCEPTION
            '005 stopped: public.invoices does not exist';

    END IF;


    -- --------------------------------------------------------
    -- numero_factura
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND column_name = 'numero_factura'
    ) THEN

        RAISE EXCEPTION
            '005 stopped: invoices.numero_factura does not exist';

    END IF;


    -- --------------------------------------------------------
    -- current_user_is_worker()
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
            '005 stopped: current_user_is_worker() does not exist';

    END IF;


END $$;


-- ============================================================
-- 2. DOCUMENT_PATH
--
-- Añadimos la referencia al PDF asociado a cada factura.
--
-- Ejemplo:
--
-- numero_factura:
--     MODIRA-26-K7P4X9
--
-- document_path:
--     MODIRA-26-K7P4X9.pdf
--
-- ============================================================


ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS document_path TEXT;


-- ============================================================
-- 3. COMPROBAR DUPLICADOS ANTES DE CREAR UNIQUE
--
-- La arquitectura exige que numero_factura sea único
-- globalmente.
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
            '005 stopped: duplicate numero_factura values exist';

    END IF;

END $$;


-- ============================================================
-- 4. ELIMINAR UNICIDADES ANTERIORES
--
-- El 001 puede haber creado:
--
--     UNIQUE (company_id, numero_factura)
--
-- o una UNIQUE inline sobre:
--
--     numero_factura
--
-- En la arquitectura definitiva queremos una única
-- restricción global controlada por un índice con nombre
-- explícito:
--
--     idx_invoices_numero_factura_unique
--
-- ============================================================


ALTER TABLE public.invoices
    DROP CONSTRAINT IF EXISTS
        invoices_company_id_numero_factura_key;


ALTER TABLE public.invoices
    DROP CONSTRAINT IF EXISTS
        invoices_numero_factura_key;


-- ============================================================
-- 5. UNICIDAD GLOBAL DE NUMERO_FACTURA
--
-- El identificador debe ser único en toda MODIRA,
-- independientemente de la empresa.
--
-- Ejemplo:
--
--     Empresa A → MODIRA-26-K7P4X9
--     Empresa B → MODIRA-26-H3M8QW
--
-- Nunca:
--
--     Empresa A → MODIRA-26-K7P4X9
--     Empresa B → MODIRA-26-K7P4X9
--
-- ============================================================


CREATE UNIQUE INDEX IF NOT EXISTS
    idx_invoices_numero_factura_unique

ON public.invoices (
    numero_factura
);


-- ============================================================
-- 6. FUNCIÓN generate_invoice_number()
--
-- Genera identificadores como:
--
--     MODIRA-26-K7P4X9
--     MODIRA-26-H3M8QW
--     MODIRA-26-R7T2KA
--
-- Caracteres utilizados:
--
--     ABCDEFGHJKLMNPQRSTUVWXYZ23456789
--
-- Se excluyen:
--
--     I
--     O
--     0
--     1
--
-- para evitar confusiones visuales.
--
-- 32^6 = 1.073.741.824 combinaciones.
--
-- La función NO recibe company_id.
--
-- El número es global para toda MODIRA.
--
-- ============================================================


CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public, pg_temp

AS $function$

DECLARE

    v_year TEXT;
    v_random TEXT;
    v_invoice_number TEXT;

BEGIN

    -- --------------------------------------------------------
    -- Año actual
    --
    -- 2026 → 26
    -- --------------------------------------------------------

    v_year :=
        TO_CHAR(
            CURRENT_DATE,
            'YY'
        );


    -- --------------------------------------------------------
    -- Generar 6 caracteres aleatorios
    -- --------------------------------------------------------

    SELECT string_agg(
        substr(
            'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
            floor(
                random() * 32 + 1
            )::INTEGER,
            1
        ),
        ''
    )

    INTO v_random

    FROM generate_series(
        1,
        6
    );


    -- --------------------------------------------------------
    -- Construir identificador
    -- --------------------------------------------------------

    v_invoice_number :=
        'MODIRA-'
        || v_year
        || '-'
        || v_random;


    -- --------------------------------------------------------
    -- Comprobar colisión
    -- --------------------------------------------------------

    WHILE EXISTS (
        SELECT 1
        FROM public.invoices
        WHERE numero_factura = v_invoice_number
    )

    LOOP

        SELECT string_agg(
            substr(
                'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                floor(
                    random() * 32 + 1
                )::INTEGER,
                1
            ),
            ''
        )

        INTO v_random

        FROM generate_series(
            1,
            6
        );


        v_invoice_number :=
            'MODIRA-'
            || v_year
            || '-'
            || v_random;

    END LOOP;


    RETURN v_invoice_number;

END;

$function$;


-- ============================================================
-- 7. PERMISOS generate_invoice_number()
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
-- 8. RLS SOBRE INVOICES
--
-- CLIENTE:
--
--     Puede consultar las facturas de su empresa.
--
-- WORKER:
--
--     Puede consultar todas las facturas.
--
-- Los workers NO reciben INSERT, UPDATE ni DELETE.
--
-- ============================================================


ALTER TABLE public.invoices
    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 9. CLIENTE → SELECT
-- ============================================================


DROP POLICY IF EXISTS
    invoices_client_select

ON public.invoices;


CREATE POLICY
    invoices_client_select

ON public.invoices

FOR SELECT

TO authenticated

USING (

    NOT public.current_user_is_worker()

    AND

    company_id =
        public.current_user_company_id()

);


-- ============================================================
-- 10. WORKER → SELECT TODAS LAS FACTURAS
-- ============================================================


DROP POLICY IF EXISTS
    invoices_worker_select

ON public.invoices;


CREATE POLICY
    invoices_worker_select

ON public.invoices

FOR SELECT

TO authenticated

USING (

    public.current_user_is_worker()

);


-- ============================================================
-- 11. CREAR BUCKET PRIVADO DE FACTURAS
--
-- Nombre:
--
--     invoices
--
-- Público:
--
--     FALSE
--
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

SET
    public = FALSE;


-- ============================================================
-- 12. ELIMINAR POLÍTICAS STORAGE ANTERIORES
--
-- Permite que la migración sea reproducible.
-- ============================================================


DROP POLICY IF EXISTS
    invoice_documents_worker_insert

ON storage.objects;


DROP POLICY IF EXISTS
    invoice_documents_worker_select

ON storage.objects;


DROP POLICY IF EXISTS
    invoice_documents_worker_update

ON storage.objects;


DROP POLICY IF EXISTS
    invoice_documents_worker_delete

ON storage.objects;


DROP POLICY IF EXISTS
    invoice_documents_client_select

ON storage.objects;


-- ============================================================
-- 13. WORKER → SUBIR PDF
--
-- El trabajador puede subir únicamente documentos que
-- correspondan a una factura existente.
--
-- Nombre obligatorio:
--
--     numero_factura.pdf
--
-- ============================================================


CREATE POLICY
    invoice_documents_worker_insert

ON storage.objects

FOR INSERT

TO authenticated

WITH CHECK (

    bucket_id = 'invoices'

    AND

    public.current_user_is_worker()

    AND

    EXISTS (

        SELECT 1

        FROM public.invoices i

        WHERE
            storage.objects.name =
                i.numero_factura || '.pdf'

    )

);


-- ============================================================
-- 14. WORKER → CONSULTAR PDFs
-- ============================================================


CREATE POLICY
    invoice_documents_worker_select

ON storage.objects

FOR SELECT

TO authenticated

USING (

    bucket_id = 'invoices'

    AND

    public.current_user_is_worker()

);


-- ============================================================
-- 15. WORKER → SUSTITUIR PDF
-- ============================================================


CREATE POLICY
    invoice_documents_worker_update

ON storage.objects

FOR UPDATE

TO authenticated

USING (

    bucket_id = 'invoices'

    AND

    public.current_user_is_worker()

)

WITH CHECK (

    bucket_id = 'invoices'

    AND

    public.current_user_is_worker()

);


-- ============================================================
-- 16. WORKER → ELIMINAR PDF
-- ============================================================


CREATE POLICY
    invoice_documents_worker_delete

ON storage.objects

FOR DELETE

TO authenticated

USING (

    bucket_id = 'invoices'

    AND

    public.current_user_is_worker()

);


-- ============================================================
-- 17. CLIENTE → CONSULTAR SU PDF
--
-- El cliente únicamente puede acceder al PDF correspondiente
-- a una factura cuyo user_id sea su propio auth.uid().
--
-- ============================================================


CREATE POLICY
    invoice_documents_client_select

ON storage.objects

FOR SELECT

TO authenticated

USING (

    bucket_id = 'invoices'

    AND

    EXISTS (

        SELECT 1

        FROM public.invoices i

        WHERE

            i.numero_factura =
                regexp_replace(
                    storage.objects.name,
                    '\.pdf$',
                    ''
                )

            AND

            i.user_id = auth.uid()

    )

);


-- ============================================================
-- 18. FUNCIÓN attach_invoice_document()
--
-- Permite a un trabajador activo asociar un PDF a una factura.
--
-- No concedemos UPDATE general sobre invoices.
--
-- La función únicamente modifica:
--
--     document_path
--
-- ============================================================


CREATE OR REPLACE FUNCTION public.attach_invoice_document(
    p_invoice_id UUID,
    p_document_path TEXT
)

RETURNS public.invoices

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public, pg_temp

AS $function$

DECLARE

    v_invoice public.invoices;

BEGIN

    -- --------------------------------------------------------
    -- 1. Comprobar trabajador
    -- --------------------------------------------------------

    IF NOT public.current_user_is_worker() THEN

        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';

    END IF;


    -- --------------------------------------------------------
    -- 2. Validar ruta
    -- --------------------------------------------------------

    IF p_document_path IS NULL
       OR TRIM(p_document_path) = '' THEN

        RAISE EXCEPTION
            'El documento de factura es obligatorio';

    END IF;


    -- --------------------------------------------------------
    -- 3. Obtener factura
    -- --------------------------------------------------------

    SELECT *
    INTO v_invoice

    FROM public.invoices

    WHERE id = p_invoice_id

    FOR UPDATE;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'Factura no encontrada';

    END IF;


    -- --------------------------------------------------------
    -- 4. Comprobar nombre del documento
    --
    -- Debe coincidir exactamente con:
    --
    --     numero_factura.pdf
    -- --------------------------------------------------------

    IF p_document_path <>
       v_invoice.numero_factura || '.pdf'
    THEN

        RAISE EXCEPTION
            'El nombre del documento no coincide con el número de factura';

    END IF;


    -- --------------------------------------------------------
    -- 5. Comprobar que el documento existe en Storage
    -- --------------------------------------------------------

    IF NOT EXISTS (

        SELECT 1

        FROM storage.objects

        WHERE
            bucket_id = 'invoices'

            AND

            name = p_document_path

    ) THEN

        RAISE EXCEPTION
            'El documento no existe en el bucket de facturas';

    END IF;


    -- --------------------------------------------------------
    -- 6. Guardar documento
    -- --------------------------------------------------------

    UPDATE public.invoices

    SET

        document_path =
            p_document_path,

        updated_at =
            CURRENT_TIMESTAMP

    WHERE id = p_invoice_id

    RETURNING *

    INTO v_invoice;


    RETURN v_invoice;

END;

$function$;


-- ============================================================
-- 19. PERMISOS attach_invoice_document()
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
-- 20. SEGURIDAD DE LA FUNCIÓN
-- ============================================================


ALTER FUNCTION public.attach_invoice_document(
    UUID,
    TEXT
)

SET search_path =
    public,
    pg_temp;


-- ============================================================
-- 21. ÍNDICE DOCUMENT_PATH
-- ============================================================


CREATE INDEX IF NOT EXISTS
    idx_invoices_document_path

ON public.invoices (
    document_path
)

WHERE document_path IS NOT NULL;


-- ============================================================
-- 22. VERIFICACIONES FINALES
-- ============================================================


DO $$
DECLARE

    v_function_count INTEGER;
    v_policy_count INTEGER;

BEGIN

    -- --------------------------------------------------------
    -- document_path
    -- --------------------------------------------------------

    IF NOT EXISTS (

        SELECT 1

        FROM information_schema.columns

        WHERE
            table_schema = 'public'
            AND table_name = 'invoices'
            AND column_name = 'document_path'

    ) THEN

        RAISE EXCEPTION
            '005 failed: document_path was not created';

    END IF;


    -- --------------------------------------------------------
    -- bucket
    -- --------------------------------------------------------

    IF NOT EXISTS (

        SELECT 1

        FROM storage.buckets

        WHERE
            id = 'invoices'
            AND public = FALSE

    ) THEN

        RAISE EXCEPTION
            '005 failed: invoices bucket was not created correctly';

    END IF;


    -- --------------------------------------------------------
    -- generate_invoice_number()
    -- --------------------------------------------------------

    SELECT COUNT(*)

    INTO v_function_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname = 'generate_invoice_number';


    IF v_function_count <> 1 THEN

        RAISE EXCEPTION
            '005 failed: generate_invoice_number() was not created';

    END IF;


    -- --------------------------------------------------------
    -- attach_invoice_document()
    -- --------------------------------------------------------

    SELECT COUNT(*)

    INTO v_function_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname = 'attach_invoice_document';


    IF v_function_count <> 1 THEN

        RAISE EXCEPTION
            '005 failed: attach_invoice_document() was not created';

    END IF;


    -- --------------------------------------------------------
    -- UNIQUE numero_factura
    -- --------------------------------------------------------

    IF NOT EXISTS (

        SELECT 1

        FROM pg_indexes

        WHERE
            schemaname = 'public'
            AND tablename = 'invoices'
            AND indexname =
                'idx_invoices_numero_factura_unique'

    ) THEN

        RAISE EXCEPTION
            '005 failed: global invoice number unique index missing';

    END IF;


    -- --------------------------------------------------------
    -- Worker SELECT
    -- --------------------------------------------------------

    SELECT COUNT(*)

    INTO v_policy_count

    FROM pg_policies

    WHERE
        schemaname = 'public'
        AND tablename = 'invoices'
        AND policyname =
            'invoices_worker_select';


    IF v_policy_count <> 1 THEN

        RAISE EXCEPTION
            '005 failed: invoices worker policy was not created';

    END IF;


    -- --------------------------------------------------------
    -- Client SELECT
    -- --------------------------------------------------------

    SELECT COUNT(*)

    INTO v_policy_count

    FROM pg_policies

    WHERE
        schemaname = 'public'
        AND tablename = 'invoices'
        AND policyname =
            'invoices_client_select';


    IF v_policy_count <> 1 THEN

        RAISE EXCEPTION
            '005 failed: invoices client policy was not created';

    END IF;


    -- --------------------------------------------------------
    -- Storage worker INSERT
    -- --------------------------------------------------------

    SELECT COUNT(*)

    INTO v_policy_count

    FROM pg_policies

    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname =
            'invoice_documents_worker_insert';


    IF v_policy_count <> 1 THEN

        RAISE EXCEPTION
            '005 failed: worker INSERT policy was not created';

    END IF;


    -- --------------------------------------------------------
    -- Storage worker SELECT
    -- --------------------------------------------------------

    SELECT COUNT(*)

    INTO v_policy_count

    FROM pg_policies

    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname =
            'invoice_documents_worker_select';


    IF v_policy_count <> 1 THEN

        RAISE EXCEPTION
            '005 failed: worker SELECT policy was not created';

    END IF;


    -- --------------------------------------------------------
    -- Storage worker UPDATE
    -- --------------------------------------------------------

    SELECT COUNT(*)

    INTO v_policy_count

    FROM pg_policies

    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname =
            'invoice_documents_worker_update';


    IF v_policy_count <> 1 THEN

        RAISE EXCEPTION
            '005 failed: worker UPDATE policy was not created';

    END IF;


    -- --------------------------------------------------------
    -- Storage worker DELETE
    -- --------------------------------------------------------

    SELECT COUNT(*)

    INTO v_policy_count

    FROM pg_policies

    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname =
            'invoice_documents_worker_delete';


    IF v_policy_count <> 1 THEN

        RAISE EXCEPTION
            '005 failed: worker DELETE policy was not created';

    END IF;


    -- --------------------------------------------------------
    -- Storage client SELECT
    -- --------------------------------------------------------

    SELECT COUNT(*)

    INTO v_policy_count

    FROM pg_policies

    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname =
            'invoice_documents_client_select';


    IF v_policy_count <> 1 THEN

        RAISE EXCEPTION
            '005 failed: client SELECT policy was not created';

    END IF;


END $$;


-- ============================================================
-- 23. COMPROBACIÓN EXTRA DE UNICIDAD
-- ============================================================


DO $$
DECLARE

    v_index_count INTEGER;

BEGIN

    SELECT COUNT(*)

    INTO v_index_count

    FROM pg_indexes

    WHERE
        schemaname = 'public'
        AND tablename = 'invoices'
        AND indexname =
            'idx_invoices_numero_factura_unique';


    IF v_index_count <> 1 THEN

        RAISE EXCEPTION
            '005 failed: invoice global unique index is not available';

    END IF;

END $$;


COMMIT;


-- ============================================================
-- RESULTADO FINAL
--
--
-- FACTURAS
-- =========
--
-- numero_factura:
--
--     MODIRA-26-K7P4X9
--
-- UNIQUE GLOBAL
--
-- No puede repetirse entre empresas.
--
--
-- WORKER ACTIVO
-- =============
--
-- SELECT invoices
--       ↓
-- TODAS LAS EMPRESAS
--
-- INSERT invoices
--       ↓
-- ❌
--
-- UPDATE invoices
--       ↓
-- ❌
--
-- DELETE invoices
--       ↓
-- ❌
--
--
-- CLIENTE
-- =======
--
-- SELECT invoices
--       ↓
-- ÚNICAMENTE SU EMPRESA
--
--
-- DOCUMENTOS
-- ==========
--
-- Bucket:
--
--     invoices
--
-- Privado:
--
--     FALSE
--
--
-- WORKER ACTIVO
--       ↓
-- subir PDF
-- consultar PDF
-- sustituir PDF
-- eliminar PDF
--
--
-- CLIENTE
--       ↓
-- consultar PDF
--       ↓
-- únicamente si:
--
-- invoices.user_id = auth.uid()
--
--
-- ASOCIACIÓN
-- ==========
--
-- attach_invoice_document()
--       ↓
-- trabajador activo
--       ↓
-- comprueba factura
--       ↓
-- comprueba nombre PDF
--       ↓
-- comprueba existencia en Storage
--       ↓
-- guarda document_path
--
-- ============================================================