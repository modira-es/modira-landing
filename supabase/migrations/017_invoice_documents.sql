BEGIN;

-- ============================================================
-- MODIRA - MIGRACIÓN 017
-- DOCUMENTOS DE FACTURAS
-- ============================================================
--
-- OBJETIVO:
--
-- Permitir almacenar el PDF asociado a cada factura
-- y controlar su acceso mediante Supabase Storage.
--
-- ESTRUCTURA:
--
-- invoices
--     │
--     ├── invoice_number
--     │      └── MODIRA-2026-0001
--     │
--     └── document_path
--            └── MODIRA-2026-0001.pdf
--
-- STORAGE:
--
-- invoices/
-- ├── MODIRA-2026-0001.pdf
-- ├── MODIRA-2026-0002.pdf
-- └── ...
--
-- ACCESO:
--
-- TRABAJADOR ACTIVO
--     → puede subir documentos
--     → puede consultar documentos
--     → puede sustituir documentos
--     → puede eliminar documentos
--
-- CLIENTE
--     → puede consultar únicamente sus propias facturas
--
-- OTROS USUARIOS
--     → sin acceso
--
-- IMPORTANTE:
--
-- - El bucket es PRIVADO.
-- - El nombre del archivo utiliza el número de factura.
-- - No se añade document_name porque el propio nombre del
--   archivo coincide con invoice_number.
-- - El UUID interno de la factura sigue siendo el identificador
--   técnico principal de la tabla invoices.
--
-- ============================================================


-- ============================================================
-- 1. AÑADIR RUTA DEL DOCUMENTO A INVOICES
-- ============================================================

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS document_path TEXT;


-- ============================================================
-- 2. CREAR BUCKET PRIVADO PARA FACTURAS
-- ============================================================

INSERT INTO storage.buckets (
    id,
    name,
    public
)
VALUES (
    'invoices',
    'invoices',
    false
)
ON CONFLICT (id)
DO UPDATE SET
    public = false;


-- ============================================================
-- 3. TRABAJADORES ACTIVOS → SUBIR FACTURAS
-- ============================================================
--
-- El archivo debe tener como nombre:
--
-- MODIRA-2026-0001.pdf
--
-- y estar dentro del bucket invoices.
--
-- El número debe corresponder a una factura existente.
--
-- ============================================================

DROP POLICY IF EXISTS invoice_documents_worker_insert
ON storage.objects;

CREATE POLICY invoice_documents_worker_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'invoices'
    AND public.current_user_is_worker()
    AND EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.invoice_number = split_part(storage.objects.name, '/', 1)
          AND storage.objects.name LIKE '%.pdf'
    )
);


-- ============================================================
-- 4. TRABAJADORES ACTIVOS → CONSULTAR FACTURAS
-- ============================================================

DROP POLICY IF EXISTS invoice_documents_worker_select
ON storage.objects;

CREATE POLICY invoice_documents_worker_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'invoices'
    AND public.current_user_is_worker()
);


-- ============================================================
-- 5. CLIENTES → CONSULTAR SUS PROPIAS FACTURAS
-- ============================================================
--
-- El nombre del archivo debe coincidir con invoice_number:
--
-- MODIRA-2026-0001.pdf
--
-- Se comprueba:
--
-- 1. Existe una factura con ese número.
-- 2. Esa factura pertenece al usuario autenticado.
--
-- ============================================================

DROP POLICY IF EXISTS invoice_documents_client_select
ON storage.objects;

CREATE POLICY invoice_documents_client_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'invoices'
    AND EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.invoice_number = split_part(storage.objects.name, '/', 1)
          AND i.user_id = auth.uid()
          AND storage.objects.name LIKE '%.pdf'
    )
);


-- ============================================================
-- 6. TRABAJADORES ACTIVOS → SUSTITUIR DOCUMENTOS
-- ============================================================

DROP POLICY IF EXISTS invoice_documents_worker_update
ON storage.objects;

CREATE POLICY invoice_documents_worker_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'invoices'
    AND public.current_user_is_worker()
)
WITH CHECK (
    bucket_id = 'invoices'
    AND public.current_user_is_worker()
);


-- ============================================================
-- 7. TRABAJADORES ACTIVOS → ELIMINAR DOCUMENTOS
-- ============================================================

DROP POLICY IF EXISTS invoice_documents_worker_delete
ON storage.objects;

CREATE POLICY invoice_documents_worker_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'invoices'
    AND public.current_user_is_worker()
);


-- ============================================================
-- 8. VERIFICACIÓN FINAL
-- ============================================================

DO $$
BEGIN

    -- Comprobar document_path
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND column_name = 'document_path'
    ) THEN
        RAISE EXCEPTION
        'Migration 017 failed: invoices.document_path does not exist';
    END IF;


    -- Comprobar bucket privado
    IF NOT EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id = 'invoices'
          AND public = false
    ) THEN
        RAISE EXCEPTION
        'Migration 017 failed: private invoices bucket does not exist';
    END IF;


    -- Comprobar policy worker SELECT
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'invoice_documents_worker_select'
    ) THEN
        RAISE EXCEPTION
        'Migration 017 failed: worker SELECT policy does not exist';
    END IF;


    -- Comprobar policy cliente SELECT
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'invoice_documents_client_select'
    ) THEN
        RAISE EXCEPTION
        'Migration 017 failed: client SELECT policy does not exist';
    END IF;

END $$;


COMMIT;