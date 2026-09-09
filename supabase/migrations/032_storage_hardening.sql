BEGIN;

-- ============================================================
-- MODIRA — 032_storage_hardening.sql
--
-- H-06 — Storage hardening
--
-- Objetivos:
--   1. Mantener los 3 buckets privados.
--   2. Limitar los 3 buckets a application/pdf.
--   3. Limitar el tamaño máximo a 20 MiB.
--   4. Endurecer Storage de quotations.
--   5. Endurecer ligeramente el SELECT de invoices.
--   6. Mantener project-documents sin cambios funcionales.
--   7. Verificar automáticamente el estado final.
--
-- Flujo quotations:
--
--   quotation existente
--          ↓
--   upload:
--   <company_id>/<numero_presupuesto>.pdf
--          ↓
--   attach_quotation_document()
--          ↓
--   quotations.document_path
--
-- ============================================================


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id = 'invoices'
    ) THEN
        RAISE EXCEPTION
            '032 stopped: invoices bucket does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id = 'project-documents'
    ) THEN
        RAISE EXCEPTION
            '032 stopped: project-documents bucket does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id = 'quotations'
    ) THEN
        RAISE EXCEPTION
            '032 stopped: quotations bucket does not exist';
    END IF;

END $$;


-- ============================================================
-- 2. BUCKET HARDENING
--
-- Todos los documentos son privados.
-- Solo se aceptan PDFs.
-- Máximo 20 MiB por objeto.
-- ============================================================

UPDATE storage.buckets
SET
    public = false,
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY['application/pdf']::text[]
WHERE id IN (
    'invoices',
    'project-documents',
    'quotations'
);


-- ============================================================
-- 3. INVOICES — ENDURECER SELECT DEL CLIENTE
--
-- La política actual ya aísla correctamente por user_id.
--
-- Cambiamos únicamente:
--
--   regexp_replace(objects.name, '\.pdf$', '') = numero_factura
--
-- por:
--
--   objects.name = numero_factura || '.pdf'
--
-- Esto hace la correspondencia de ruta estricta y explícita.
-- ============================================================

DROP POLICY IF EXISTS invoice_documents_client_select
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
        WHERE
            i.numero_factura IS NOT NULL
            AND objects.name =
                i.numero_factura || '.pdf'
            AND i.user_id = auth.uid()
    )
);


-- ============================================================
-- 4. QUOTATIONS — WORKER SELECT
--
-- El worker solo puede leer documentos que estén registrados
-- como document_path de un presupuesto.
-- ============================================================

DROP POLICY IF EXISTS quotation_documents_worker_select
ON storage.objects;

CREATE POLICY quotation_documents_worker_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'quotations'
    AND public.current_user_is_worker()
    AND EXISTS (
        SELECT 1
        FROM public.quotations q
        WHERE q.document_path = objects.name
    )
);


-- ============================================================
-- 5. QUOTATIONS — WORKER INSERT
--
-- IMPORTANTE:
--
-- document_path todavía puede ser NULL durante el upload.
--
-- Por ello NO comprobamos:
--
--     q.document_path = objects.name
--
-- en INSERT.
--
-- Comprobamos directamente que la ruta corresponda a un
-- quotation existente:
--
--     <company_id>/<numero_presupuesto>.pdf
--
-- Esto coincide con attach_quotation_document().
-- ============================================================

DROP POLICY IF EXISTS quotation_documents_worker_insert
ON storage.objects;

CREATE POLICY quotation_documents_worker_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'quotations'
    AND public.current_user_is_worker()
    AND name ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.+\.pdf$'
    AND EXISTS (
        SELECT 1
        FROM public.quotations q
        WHERE
            name =
                q.company_id::text
                || '/'
                || q.numero_presupuesto
                || '.pdf'
    )
);


-- ============================================================
-- 6. QUOTATIONS — WORKER UPDATE
--
-- El objeto actual debe estar registrado en quotations.
--
-- La nueva ruta, si cambia, también debe corresponder a un
-- quotation existente.
-- ============================================================

DROP POLICY IF EXISTS quotation_documents_worker_update
ON storage.objects;

CREATE POLICY quotation_documents_worker_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'quotations'
    AND public.current_user_is_worker()
    AND EXISTS (
        SELECT 1
        FROM public.quotations q
        WHERE q.document_path = objects.name
    )
)
WITH CHECK (
    bucket_id = 'quotations'
    AND public.current_user_is_worker()
    AND name ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.+\.pdf$'
    AND EXISTS (
        SELECT 1
        FROM public.quotations q
        WHERE
            name =
                q.company_id::text
                || '/'
                || q.numero_presupuesto
                || '.pdf'
    )
);


-- ============================================================
-- 7. QUOTATIONS — WORKER DELETE
--
-- Solo puede eliminar un documento que esté actualmente
-- registrado en quotations.document_path.
-- ============================================================

DROP POLICY IF EXISTS quotation_documents_worker_delete
ON storage.objects;

CREATE POLICY quotation_documents_worker_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'quotations'
    AND public.current_user_is_worker()
    AND EXISTS (
        SELECT 1
        FROM public.quotations q
        WHERE q.document_path = objects.name
    )
);


-- ============================================================
-- 8. VERIFICACIONES — BUCKETS
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    -- Deben existir exactamente los 3 buckets.
    SELECT COUNT(*)
    INTO v_count
    FROM storage.buckets
    WHERE id IN (
        'invoices',
        'project-documents',
        'quotations'
    );

    IF v_count <> 3 THEN
        RAISE EXCEPTION
            '032 failed: expected 3 storage buckets, found %',
            v_count;
    END IF;


    -- Todos privados.
    IF EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id IN (
            'invoices',
            'project-documents',
            'quotations'
        )
        AND public IS DISTINCT FROM false
    ) THEN
        RAISE EXCEPTION
            '032 failed: all storage buckets must be private';
    END IF;


    -- 20 MiB.
    IF EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id IN (
            'invoices',
            'project-documents',
            'quotations'
        )
        AND file_size_limit IS DISTINCT FROM 20971520
    ) THEN
        RAISE EXCEPTION
            '032 failed: all storage buckets must have a 20 MiB limit';
    END IF;


    -- Solo PDF.
    IF EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id IN (
            'invoices',
            'project-documents',
            'quotations'
        )
        AND (
            allowed_mime_types IS NULL
            OR allowed_mime_types <> ARRAY['application/pdf']::text[]
        )
    ) THEN
        RAISE EXCEPTION
            '032 failed: all storage buckets must allow only application/pdf';
    END IF;

END $$;


-- ============================================================
-- 9. VERIFICACIONES — INVOICES
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'invoice_documents_client_select';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: invoice client SELECT policy missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'invoice_documents_worker_select';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: invoice worker SELECT policy missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'invoice_documents_worker_insert';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: invoice worker INSERT policy missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'invoice_documents_worker_update';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: invoice worker UPDATE policy missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'invoice_documents_worker_delete';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: invoice worker DELETE policy missing';
    END IF;

END $$;


-- ============================================================
-- 10. VERIFICACIONES — PROJECT DOCUMENTS
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'project_documents_storage_client_select';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: project documents client SELECT policy missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'project_documents_storage_worker_select';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: project documents worker SELECT policy missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'project_documents_storage_worker_insert';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: project documents worker INSERT policy missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'project_documents_storage_worker_update';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: project documents worker UPDATE policy missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'project_documents_storage_worker_delete';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: project documents worker DELETE policy missing';
    END IF;

END $$;


-- ============================================================
-- 11. VERIFICACIONES — QUOTATIONS
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'quotation_documents_client_select';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: quotation client SELECT policy missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'quotation_documents_worker_select';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: quotation worker SELECT policy missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'quotation_documents_worker_insert';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: quotation worker INSERT policy missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'quotation_documents_worker_update';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: quotation worker UPDATE policy missing';
    END IF;


    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'quotation_documents_worker_delete';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '032 failed: quotation worker DELETE policy missing';
    END IF;

END $$;


-- ============================================================
-- 12. VERIFICACIÓN ESPECÍFICA — QUOTATIONS INSERT
--
-- La política debe comprobar:
--   - bucket quotations
--   - worker
--   - formato company UUID / *.pdf
--   - quotation existente
-- ============================================================

DO $$
DECLARE
    v_with_check TEXT;
BEGIN

    SELECT with_check
    INTO v_with_check
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'quotation_documents_worker_insert';

    IF v_with_check IS NULL
       OR v_with_check NOT LIKE '%quotations%'
       OR v_with_check NOT LIKE '%current_user_is_worker%'
       OR v_with_check NOT LIKE '%numero_presupuesto%'
       OR v_with_check NOT LIKE '%company_id%'
    THEN
        RAISE EXCEPTION
            '032 failed: quotation INSERT policy is not sufficiently restricted';
    END IF;

END $$;


-- ============================================================
-- 13. VERIFICACIÓN ESPECÍFICA — QUOTATIONS UPDATE
-- ============================================================

DO $$
DECLARE
    v_qual TEXT;
    v_with_check TEXT;
BEGIN

    SELECT qual, with_check
    INTO v_qual, v_with_check
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'quotation_documents_worker_update';

    IF v_qual IS NULL
       OR v_with_check IS NULL
       OR v_qual NOT LIKE '%document_path%'
       OR v_with_check NOT LIKE '%numero_presupuesto%'
       OR v_with_check NOT LIKE '%company_id%'
    THEN
        RAISE EXCEPTION
            '032 failed: quotation UPDATE policy is not sufficiently restricted';
    END IF;

END $$;


-- ============================================================
-- 14. VERIFICACIÓN ESPECÍFICA — QUOTATIONS DELETE
-- ============================================================

DO $$
DECLARE
    v_qual TEXT;
BEGIN

    SELECT qual
    INTO v_qual
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'quotation_documents_worker_delete';

    IF v_qual IS NULL
       OR v_qual NOT LIKE '%document_path%'
    THEN
        RAISE EXCEPTION
            '032 failed: quotation DELETE policy is not sufficiently restricted';
    END IF;

END $$;


COMMIT;

BEGIN;

-- ============================================================
-- MODIRA — STORAGE FIX
-- Corregir INSERT de quotations para respetar el flujo real:
-- 1. Se sube el PDF
-- 2. Después attach_quotation_document() registra document_path
--
-- La ruta válida es:
--   <company_id>/<numero_presupuesto>.pdf
-- ============================================================

DROP POLICY IF EXISTS quotation_documents_worker_insert
ON storage.objects;

CREATE POLICY quotation_documents_worker_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'quotations'
    AND public.current_user_is_worker()
    AND name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.+\.pdf$'
    AND EXISTS (
        SELECT 1
        FROM public.quotations q
        WHERE name = q.company_id::text || '/' || q.numero_presupuesto || '.pdf'
    )
);

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

DO $$
DECLARE
    v_policy record;
BEGIN

    SELECT *
    INTO v_policy
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'quotation_documents_worker_insert';

    IF v_policy.with_check IS NULL
       OR v_policy.with_check NOT LIKE '%quotations%'
       OR v_policy.with_check NOT LIKE '%company_id%'
       OR v_policy.with_check NOT LIKE '%numero_presupuesto%' THEN
        RAISE EXCEPTION
            'Storage fix failed: quotation INSERT policy is incorrect';
    END IF;

END $$;

COMMIT;