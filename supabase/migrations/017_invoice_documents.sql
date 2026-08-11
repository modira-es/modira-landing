BEGIN;

-- ============================================================
-- MODIRA - MIGRACIÓN 017
-- DOCUMENTOS DE FACTURAS
-- ============================================================
--
-- OBJETIVO:
--
-- Preparar el sistema para almacenar el PDF correspondiente
-- a cada factura.
--
-- FLUJO:
--
-- TRABAJADOR
--     ↓
-- Crea factura
--     ↓
-- Se genera numero_factura
--     ↓
-- Prepara PDF
--     ↓
-- Sube PDF a MODIRA
--     ↓
-- CLIENTE
--     ↓
-- Puede consultar su factura
--
--
-- NOMBRE DEL ARCHIVO:
--
-- MODIRA-26-K7P4X9.pdf
--
-- El nombre del PDF coincide con numero_factura.
--
-- El archivo se almacena en un bucket PRIVADO.
--
-- ============================================================


-- ============================================================
-- 1. COMPROBACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    -- Comprobar tabla invoices
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
    ) THEN

        RAISE EXCEPTION
        'Migration 017 stopped: public.invoices does not exist';

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
        'Migration 017 stopped: invoices.numero_factura does not exist';

    END IF;


    -- Comprobar id
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND column_name = 'id'
    ) THEN

        RAISE EXCEPTION
        'Migration 017 stopped: invoices.id does not exist';

    END IF;


    -- Comprobar user_id
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND column_name = 'user_id'
    ) THEN

        RAISE EXCEPTION
        'Migration 017 stopped: invoices.user_id does not exist';

    END IF;


    -- Comprobar current_user_is_worker()
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND proname = 'current_user_is_worker'
    ) THEN

        RAISE EXCEPTION
        'Migration 017 stopped: current_user_is_worker() does not exist';

    END IF;

END $$;


-- ============================================================
-- 2. AÑADIR RUTA DEL DOCUMENTO
-- ============================================================
--
-- Ejemplo:
--
-- numero_factura
--     MODIRA-26-K7P4X9
--
-- document_path
--     MODIRA-26-K7P4X9.pdf
--
-- No guardamos document_name porque el nombre visible del
-- documento será el propio numero_factura.
--
-- ============================================================

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS document_path TEXT;


-- ============================================================
-- 3. CREAR BUCKET PRIVADO
-- ============================================================
--
-- Los documentos NO serán accesibles mediante una URL pública.
--
-- El acceso se controla mediante las políticas de
-- storage.objects.
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
    false
)
ON CONFLICT (id)
DO UPDATE SET
    public = false;


-- ============================================================
-- 4. TRABAJADORES → SUBIR PDF
-- ============================================================
--
-- El nombre del archivo debe coincidir exactamente con:
--
-- numero_factura + '.pdf'
--
-- Ejemplo:
--
-- MODIRA-26-K7P4X9.pdf
--
-- Además:
--
-- - Debe existir la factura.
-- - El usuario debe ser trabajador activo.
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
        WHERE storage.objects.name =
              i.numero_factura || '.pdf'
    )
);


-- ============================================================
-- 5. TRABAJADORES → VER PDFs
-- ============================================================
--
-- Un trabajador activo puede consultar los documentos
-- almacenados en el bucket de facturas.
--
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
-- 6. CLIENTES → VER ÚNICAMENTE SUS FACTURAS
-- ============================================================
--
-- El cliente solo puede consultar un PDF si:
--
-- 1. El archivo corresponde a una factura existente.
-- 2. El numero_factura coincide con el nombre del archivo.
-- 3. La factura pertenece al usuario autenticado.
--
-- Ejemplo:
--
-- Cliente A
--     ↓
-- invoice.user_id = auth.uid()
--     ↓
-- MODIRA-26-K7P4X9.pdf
--     ↓
-- ✅ acceso
--
-- Factura de Cliente B
--     ↓
-- invoice.user_id != auth.uid()
--     ↓
-- ❌ acceso
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
-- 7. TRABAJADORES → SUSTITUIR PDF
-- ============================================================
--
-- Permite reemplazar una factura si se ha subido un documento
-- incorrecto.
--
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
-- 8. TRABAJADORES → ELIMINAR PDF
-- ============================================================
--
-- Permite eliminar un documento incorrecto desde el sistema.
--
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
-- 9. FUNCIÓN PARA ASOCIAR EL PDF A LA FACTURA
-- ============================================================
--
-- Después de subir:
--
-- MODIRA-26-K7P4X9.pdf
--
-- necesitamos guardar:
--
-- invoices.document_path
--
-- No damos UPDATE general sobre invoices a los trabajadores.
--
-- En su lugar utilizamos una función SECURITY DEFINER.
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
AS $$
DECLARE

    v_invoice public.invoices;

BEGIN

    -- ========================================================
    -- 1. COMPROBAR TRABAJADOR ACTIVO
    -- ========================================================

    IF NOT public.current_user_is_worker() THEN

        RAISE EXCEPTION
        'Acceso denegado: se requiere un trabajador activo';

    END IF;


    -- ========================================================
    -- 2. VALIDAR RUTA
    -- ========================================================
    --
    -- Debe ser:
    --
    -- numero_factura.pdf
    --
    -- No permitimos rutas arbitrarias.
    --
    -- ========================================================

    IF p_document_path IS NULL
       OR p_document_path = '' THEN

        RAISE EXCEPTION
        'El documento de factura es obligatorio';

    END IF;


    -- ========================================================
    -- 3. OBTENER FACTURA
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
    -- 4. COMPROBAR QUE EL NOMBRE COINCIDE
    -- ========================================================

    IF p_document_path <> v_invoice.numero_factura || '.pdf' THEN

        RAISE EXCEPTION
        'El nombre del documento no coincide con el número de factura';

    END IF;


    -- ========================================================
    -- 5. GUARDAR DOCUMENTO
    -- ========================================================

    UPDATE public.invoices
    SET
        document_path = p_document_path,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_invoice_id
    RETURNING *
    INTO v_invoice;


    RETURN v_invoice;

END;
$$;


-- ============================================================
-- 10. PERMITIR EJECUTAR LA FUNCIÓN
-- ============================================================

REVOKE ALL
ON FUNCTION public.attach_invoice_document(UUID, TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.attach_invoice_document(UUID, TEXT)
TO authenticated;


-- ============================================================
-- 11. VERIFICACIONES FINALES
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
        'Migration 017 failed: document_path was not created';

    END IF;


    -- Comprobar bucket
    IF NOT EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id = 'invoices'
          AND public = false
    ) THEN

        RAISE EXCEPTION
        'Migration 017 failed: invoices bucket was not created correctly';

    END IF;


    -- Comprobar función
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND proname = 'attach_invoice_document'
    ) THEN

        RAISE EXCEPTION
        'Migration 017 failed: attach_invoice_document() was not created';

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
        'Migration 017 failed: worker SELECT policy was not created';

    END IF;


    -- Comprobar policy client SELECT
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'invoice_documents_client_select'
    ) THEN

        RAISE EXCEPTION
        'Migration 017 failed: client SELECT policy was not created';

    END IF;

END $$;


COMMIT;