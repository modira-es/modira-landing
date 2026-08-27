BEGIN;

-- ============================================================
-- MODIRA — 008_quotation_documents.sql
-- Documentos PDF de presupuestos comerciales (quotations).
-- ============================================================
--
-- 001 define quotations.
-- 002 define RLS y acceso CRUD.
--
-- Esta migración añade:
--
--   - document_path en quotations
--   - bucket privado quotations
--   - acceso Storage para workers activos
--   - acceso Storage para clientes de la empresa
--   - RPC attach_quotation_document()
--
-- El PDF se guarda con la ruta:
--
--      <company_id>/<numero_presupuesto>.pdf
--
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
          AND table_name = 'quotations'
    ) THEN

        RAISE EXCEPTION
            '008 stopped: public.quotations does not exist';

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
            '008 stopped: current_user_is_worker() does not exist';

    END IF;

END $$;


-- ============================================================
-- 2. REFERENCIA AL PDF
-- ============================================================

ALTER TABLE public.quotations
    ADD COLUMN IF NOT EXISTS document_path TEXT;


CREATE INDEX IF NOT EXISTS idx_quotations_document_path
    ON public.quotations(document_path)
    WHERE document_path IS NOT NULL;


-- ============================================================
-- 3. BUCKET PRIVADO
-- ============================================================
--
-- El bucket debe permanecer privado.
--
-- El acceso se realiza mediante:
--
--   - Storage RLS
--   - signed URLs
--
-- ============================================================

INSERT INTO storage.buckets (
    id,
    name,
    public
)
VALUES (
    'quotations',
    'quotations',
    FALSE
)
ON CONFLICT (id)
DO UPDATE
SET
    name = EXCLUDED.name,
    public = FALSE;


-- ============================================================
-- 4. ELIMINAR POLICIES STORAGE ANTERIORES
-- ============================================================
--
-- Esto hace que la migración sea reproducible.
--
-- Si las policies ya existen porque se ejecutó anteriormente
-- la 008 o porque fueron creadas manualmente, se eliminan
-- antes de volver a crearlas.
--
-- ============================================================

DROP POLICY IF EXISTS
    quotation_documents_worker_insert
ON storage.objects;


DROP POLICY IF EXISTS
    quotation_documents_worker_select
ON storage.objects;


DROP POLICY IF EXISTS
    quotation_documents_worker_update
ON storage.objects;


DROP POLICY IF EXISTS
    quotation_documents_worker_delete
ON storage.objects;


DROP POLICY IF EXISTS
    quotation_documents_client_select
ON storage.objects;


-- ============================================================
-- 5. WORKER → SUBIR PDF
-- ============================================================
--
-- El trabajador activo puede subir documentos al bucket
-- quotations.
--
-- La validación de la ruta exacta se realiza posteriormente
-- mediante attach_quotation_document().
--
-- ============================================================

CREATE POLICY
    quotation_documents_worker_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (

    bucket_id = 'quotations'

    AND
    public.current_user_is_worker()

);


-- ============================================================
-- 6. WORKER → CONSULTAR PDFs
-- ============================================================

CREATE POLICY
    quotation_documents_worker_select
ON storage.objects
FOR SELECT
TO authenticated
USING (

    bucket_id = 'quotations'

    AND
    public.current_user_is_worker()

);


-- ============================================================
-- 7. WORKER → SUSTITUIR PDF
-- ============================================================

CREATE POLICY
    quotation_documents_worker_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (

    bucket_id = 'quotations'

    AND
    public.current_user_is_worker()

)
WITH CHECK (

    bucket_id = 'quotations'

    AND
    public.current_user_is_worker()

);


-- ============================================================
-- 8. WORKER → ELIMINAR PDF
-- ============================================================

CREATE POLICY
    quotation_documents_worker_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (

    bucket_id = 'quotations'

    AND
    public.current_user_is_worker()

);


-- ============================================================
-- 9. CLIENTE → CONSULTAR PDF DEL PRESUPUESTO
-- ============================================================
--
-- ESTA ES LA POLICY QUE FALTABA EN LA 008.
--
-- Es equivalente a la policy que ejecutaste manualmente
-- en el SQL Editor.
--
-- El cliente puede consultar un PDF si:
--
--   1. pertenece al bucket quotations
--
--   Y
--
--   2. existe un presupuesto cuyo document_path coincide
--      exactamente con el objeto solicitado
--
--   Y además:
--
--      a) el presupuesto pertenece directamente al usuario
--
--      O
--
--      b) el presupuesto pertenece a la empresa del usuario
--
-- Esto permite que el cliente pueda utilizar:
--
--      createSignedUrl()
--
-- desde el frontend.
--
-- ============================================================

CREATE POLICY
    quotation_documents_client_select
ON storage.objects
FOR SELECT
TO authenticated
USING (

    bucket_id = 'quotations'

    AND EXISTS (
        SELECT 1
        FROM public.quotations q
        WHERE
            q.document_path = storage.objects.name

            AND (
                q.user_id = auth.uid()

                OR

                q.company_id IN (
                    SELECT p.company_id
                    FROM public.profiles p
                    WHERE
                        p.id = auth.uid()
                        AND p.company_id IS NOT NULL
                )
            )
    )

);


-- ============================================================
-- 10. RPC — ASOCIAR PDF A PRESUPUESTO
-- ============================================================
--
-- El frontend/worker:
--
--   1. sube primero el PDF a Storage
--   2. llama a esta RPC
--
-- La RPC comprueba:
--
--   1. que el usuario sea worker activo
--   2. que exista el presupuesto
--   3. que la ruta sea exactamente:
--
--         company_id/numero_presupuesto.pdf
--
--   4. que el objeto exista realmente en Storage
--
-- Después guarda document_path en quotations.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.attach_quotation_document(
    p_quotation_id UUID,
    p_document_path TEXT
)
RETURNS public.quotations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE

    v_quotation public.quotations;
    v_expected_path TEXT;

BEGIN

    -- --------------------------------------------------------
    -- 10.1. Comprobar trabajador
    -- --------------------------------------------------------

    IF NOT public.current_user_is_worker() THEN

        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';

    END IF;


    -- --------------------------------------------------------
    -- 10.2. Obtener presupuesto
    -- --------------------------------------------------------

    SELECT *
    INTO v_quotation
    FROM public.quotations
    WHERE id = p_quotation_id
    FOR UPDATE;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'Presupuesto no encontrado';

    END IF;


    -- --------------------------------------------------------
    -- 10.3. Construir ruta esperada
    -- --------------------------------------------------------
    --
    --     company_id/numero_presupuesto.pdf
    --
    -- --------------------------------------------------------

    v_expected_path :=
        v_quotation.company_id::TEXT
        || '/'
        || v_quotation.numero_presupuesto
        || '.pdf';


    -- --------------------------------------------------------
    -- 10.4. Validar ruta recibida
    -- --------------------------------------------------------

    IF p_document_path IS NULL
       OR TRIM(p_document_path) = '' THEN

        RAISE EXCEPTION
            'El documento del presupuesto es obligatorio';

    END IF;


    IF p_document_path <> v_expected_path THEN

        RAISE EXCEPTION
            'La ruta del documento no coincide con el presupuesto';

    END IF;


    -- --------------------------------------------------------
    -- 10.5. Comprobar que el objeto existe
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM storage.objects
        WHERE
            bucket_id = 'quotations'
            AND name = p_document_path
    ) THEN

        RAISE EXCEPTION
            'El documento no existe en el bucket de presupuestos';

    END IF;


    -- --------------------------------------------------------
    -- 10.6. Asociar documento
    -- --------------------------------------------------------

    UPDATE public.quotations
    SET
        document_path = p_document_path,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_quotation_id
    RETURNING * INTO v_quotation;


    RETURN v_quotation;

END;
$$;


-- ============================================================
-- 11. PERMISOS DE LA RPC
-- ============================================================

REVOKE ALL
ON FUNCTION public.attach_quotation_document(UUID, TEXT)
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE
ON FUNCTION public.attach_quotation_document(UUID, TEXT)
TO authenticated;


ALTER FUNCTION public.attach_quotation_document(UUID, TEXT)
SET search_path = public, pg_temp;


-- ============================================================
-- 12. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE

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
            AND table_name = 'quotations'
            AND column_name = 'document_path'
    ) THEN

        RAISE EXCEPTION
            '008 failed: quotations.document_path is missing';

    END IF;


    -- --------------------------------------------------------
    -- bucket privado
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE
            id = 'quotations'
            AND public = FALSE
    ) THEN

        RAISE EXCEPTION
            '008 failed: quotations bucket is not private';

    END IF;


    -- --------------------------------------------------------
    -- policies Storage
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname IN (
            'quotation_documents_worker_insert',
            'quotation_documents_worker_select',
            'quotation_documents_worker_update',
            'quotation_documents_worker_delete',
            'quotation_documents_client_select'
        );


    IF v_policy_count <> 5 THEN

        RAISE EXCEPTION
            '008 failed: quotation Storage policies are incomplete. Expected 5, found %',
            v_policy_count;

    END IF;


    -- --------------------------------------------------------
    -- RPC
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
            ON n.oid = p.pronamespace
        WHERE
            n.nspname = 'public'
            AND p.proname = 'attach_quotation_document'
    ) THEN

        RAISE EXCEPTION
            '008 failed: attach_quotation_document() is missing';

    END IF;

END $$;


COMMIT;


-- ============================================================
-- RESULTADO FINAL
-- ============================================================
--
-- BUCKET:
--
--     quotations
--     privado
--
--
-- WORKER:
--
--     INSERT
--     SELECT
--     UPDATE
--     DELETE
--
--
-- CLIENTE:
--
--     SELECT únicamente de PDFs relacionados con presupuestos
--     de su usuario o de su empresa.
--
--
-- RUTA DE LOS PDFs:
--
--     <company_id>/<numero_presupuesto>.pdf
--
--
-- RPC:
--
--     attach_quotation_document()
--
-- ============================================================