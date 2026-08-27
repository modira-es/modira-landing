BEGIN;

-- ============================================================
-- MODIRA — 013_project_documents.sql
--
-- DOCUMENTOS PDF DE PROYECTOS
--
-- OBJETIVO
-- ============================================================
--
-- Esta migración añade soporte documental para projects.
--
-- Un proyecto puede tener múltiples documentos PDF.
--
-- MODELO:
--
-- projects
--     │
--     └── project_documents
--             │
--             └── Storage: project-documents
--
--
-- CLIENTE
-- -------
-- Puede:
--   - consultar los documentos de sus propios proyectos
--   - descargar/abrir esos documentos mediante Storage
--
-- No puede:
--   - subir documentos
--   - sustituir documentos
--   - eliminar documentos
--   - modificar directamente project_documents
--
--
-- WORKER ACTIVO
-- -------------
-- Puede:
--   - consultar documentos de todos los proyectos
--   - subir documentos
--   - sustituir documentos
--   - eliminar documentos
--
-- La escritura de project_documents se realiza mediante RPCs
-- SECURITY DEFINER.
--
-- El acceso físico a Storage se controla mediante RLS sobre
-- storage.objects.
--
-- BUCKET:
--
--     project-documents
--
-- Público:
--
--     FALSE
--
--
-- RUTA DE STORAGE
-- ---------------
--
-- Cada documento utiliza una ruta determinista:
--
--     <project_id>/<document_id>.pdf
--
-- Ejemplo:
--
--     4b1f...a91c/83d2...7f42.pdf
--
-- El nombre original del archivo NO se utiliza como ruta.
-- Se guarda en project_documents.file_name.
--
-- Esto evita:
--   - colisiones de nombres
--   - problemas con nombres de archivos
--   - caracteres especiales
--   - rutas manipuladas por el usuario
--
--
-- FLUJO DE SUBIDA
-- ---------------
--
-- 1. Worker obtiene/genera un UUID para el documento.
--
-- 2. Worker sube:
--
--      project_id/document_id.pdf
--
--    al bucket project-documents.
--
-- 3. Worker llama:
--
--      attach_project_document()
--
-- 4. La RPC comprueba:
--      - worker activo
--      - proyecto existente
--      - document_id válido
--      - nombre original válido
--      - MIME application/pdf
--      - existencia real del objeto en Storage
--
-- 5. Se crea/actualiza project_documents.
--
--
-- SUSTITUCIÓN
-- -----------
--
-- Para sustituir un PDF:
--
--      mismo project_id
--      mismo document_id
--
-- y se reemplaza el objeto existente en Storage.
--
-- La fila project_documents conserva su identidad e historial
-- básico y se actualiza updated_at.
--
--
-- ELIMINACIÓN
-- -----------
--
-- Primero se elimina el objeto de Storage mediante el cliente
-- Storage/API.
--
-- Después se llama:
--
--      detach_project_document()
--
-- para eliminar la referencia de project_documents.
--
-- No se elimina directamente storage.objects mediante SQL.
--
-- ============================================================


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    -- --------------------------------------------------------
    -- projects
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'projects'
    ) THEN
        RAISE EXCEPTION
            '013 stopped: public.projects does not exist';
    END IF;


    -- --------------------------------------------------------
    -- projects.id
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'id'
    ) THEN
        RAISE EXCEPTION
            '013 stopped: projects.id does not exist';
    END IF;


    -- --------------------------------------------------------
    -- projects.user_id
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'user_id'
    ) THEN
        RAISE EXCEPTION
            '013 stopped: projects.user_id does not exist';
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
            '013 stopped: current_user_is_worker() does not exist';
    END IF;

END $$;


-- ============================================================
-- 2. TABLA PROJECT_DOCUMENTS
-- ============================================================
--
-- Un proyecto puede tener múltiples documentos.
--
-- id:
--   Identificador del documento.
--
-- project_id:
--   Proyecto al que pertenece.
--
-- file_name:
--   Nombre original mostrado al usuario.
--
-- storage_path:
--   Ruta real dentro del bucket privado.
--
-- mime_type:
--   Tipo MIME del archivo.
--
-- file_size:
--   Tamaño informado del archivo en bytes.
--
-- uploaded_by:
--   Usuario que realizó la subida.
--
-- created_at:
--   Fecha de creación de la referencia documental.
--
-- updated_at:
--   Última actualización/reemplazo.
--
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_documents (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    file_size BIGINT NOT NULL,
    uploaded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT project_documents_project_fk
        FOREIGN KEY (project_id)
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    CONSTRAINT project_documents_mime_type_check
        CHECK (mime_type = 'application/pdf'),

    CONSTRAINT project_documents_file_size_check
        CHECK (file_size > 0),

    CONSTRAINT project_documents_file_name_check
        CHECK (length(btrim(file_name)) > 0),

    CONSTRAINT project_documents_storage_path_unique
        UNIQUE (storage_path)
);


-- ============================================================
-- 3. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS
    idx_project_documents_project_id
ON public.project_documents (
    project_id
);


CREATE INDEX IF NOT EXISTS
    idx_project_documents_created_at
ON public.project_documents (
    created_at DESC
);


CREATE UNIQUE INDEX IF NOT EXISTS
    idx_project_documents_storage_path_unique
ON public.project_documents (
    storage_path
);


-- ============================================================
-- 4. RLS SOBRE PROJECT_DOCUMENTS
-- ============================================================

ALTER TABLE public.project_documents
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. ELIMINAR POLICIES DOCUMENTALES PREVIAS
-- ============================================================
--
-- La migración debe ser reproducible si se ejecuta sobre una
-- base que ya contenga una versión anterior de esta funcionalidad.
--
-- ============================================================

DROP POLICY IF EXISTS
    project_documents_select
ON public.project_documents;


DROP POLICY IF EXISTS
    project_documents_insert
ON public.project_documents;


DROP POLICY IF EXISTS
    project_documents_update
ON public.project_documents;


DROP POLICY IF EXISTS
    project_documents_delete
ON public.project_documents;


-- ============================================================
-- 6. PROJECT_DOCUMENTS — SELECT
-- ============================================================
--
-- WORKER ACTIVO:
--     todos los documentos.
--
-- CLIENTE:
--     únicamente documentos de proyectos cuyo user_id
--     coincide con auth.uid().
--
-- No utilizamos company_id para determinar el acceso.
--
-- Esto sigue el modelo definitivo de projects:
--
--     projects.user_id = propietario del proyecto
--
-- ============================================================

CREATE POLICY
    project_documents_select
ON public.project_documents
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
    OR
    EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_documents.project_id
          AND p.user_id = auth.uid()
    )
);


-- ============================================================
-- 7. NO HAY INSERT/UPDATE/DELETE DIRECTO
-- ============================================================
--
-- Las escrituras sobre project_documents se realizan mediante
-- funciones SECURITY DEFINER.
--
-- No creamos policies de INSERT/UPDATE/DELETE para
-- authenticated.
--
-- De esta manera:
--
-- CLIENTE
--     ❌ INSERT
--     ❌ UPDATE
--     ❌ DELETE
--
-- WORKER
--     ❌ INSERT directo
--     ❌ UPDATE directo
--     ❌ DELETE directo
--
-- WORKER
--     ↓
-- RPC segura
--     ↓
-- project_documents
--
-- ============================================================


-- ============================================================
-- 8. PERMISOS BASE
-- ============================================================

GRANT SELECT
ON public.project_documents
TO authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.project_documents
FROM authenticated, anon;


-- ============================================================
-- 9. BUCKET PRIVADO
-- ============================================================
--
-- Todos los documentos de proyectos se almacenan en un bucket
-- privado.
--
-- ============================================================

INSERT INTO storage.buckets (
    id,
    name,
    public
)
VALUES (
    'project-documents',
    'project-documents',
    FALSE
)
ON CONFLICT (id)
DO UPDATE
SET
    name = EXCLUDED.name,
    public = FALSE;


-- ============================================================
-- 10. ELIMINAR POLICIES STORAGE ANTERIORES
-- ============================================================

DROP POLICY IF EXISTS
    project_documents_storage_worker_insert
ON storage.objects;


DROP POLICY IF EXISTS
    project_documents_storage_worker_select
ON storage.objects;


DROP POLICY IF EXISTS
    project_documents_storage_worker_update
ON storage.objects;


DROP POLICY IF EXISTS
    project_documents_storage_worker_delete
ON storage.objects;


DROP POLICY IF EXISTS
    project_documents_storage_client_select
ON storage.objects;


-- ============================================================
-- 11. STORAGE — WORKER → INSERT
-- ============================================================
--
-- El worker activo puede subir únicamente PDFs dentro de una
-- ruta correspondiente a un proyecto existente.
--
-- Formato obligatorio:
--
--     <project_id>/<document_id>.pdf
--
-- El primer segmento debe ser exactamente el UUID de un proyecto.
--
-- El segundo segmento debe tener formato UUID.
--
-- ============================================================

CREATE POLICY
    project_documents_storage_worker_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (

    bucket_id = 'project-documents'

    AND
    public.current_user_is_worker()

    AND
    name ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.pdf$'

    AND
    EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE
            name LIKE p.id::TEXT || '/%'
    )

);


-- ============================================================
-- 12. STORAGE — WORKER → SELECT
-- ============================================================
--
-- El worker activo puede consultar documentos que estén
-- correctamente registrados en project_documents.
--
-- No se concede acceso a objetos huérfanos.
--
-- ============================================================

CREATE POLICY
    project_documents_storage_worker_select
ON storage.objects
FOR SELECT
TO authenticated
USING (

    bucket_id = 'project-documents'

    AND
    public.current_user_is_worker()

    AND
    EXISTS (
        SELECT 1
        FROM public.project_documents d
        WHERE
            d.storage_path = storage.objects.name
    )

);


-- ============================================================
-- 13. STORAGE — WORKER → UPDATE
-- ============================================================
--
-- Permite sustituir un documento ya registrado.
--
-- La ruta del objeto no cambia.
--
-- ============================================================

CREATE POLICY
    project_documents_storage_worker_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (

    bucket_id = 'project-documents'

    AND
    public.current_user_is_worker()

    AND
    EXISTS (
        SELECT 1
        FROM public.project_documents d
        WHERE
            d.storage_path = storage.objects.name
    )

)
WITH CHECK (

    bucket_id = 'project-documents'

    AND
    public.current_user_is_worker()

    AND
    name ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.pdf$'

    AND
    EXISTS (
        SELECT 1
        FROM public.project_documents d
        WHERE
            d.storage_path = storage.objects.name
    )

);


-- ============================================================
-- 14. STORAGE — WORKER → DELETE
-- ============================================================

CREATE POLICY
    project_documents_storage_worker_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (

    bucket_id = 'project-documents'

    AND
    public.current_user_is_worker()

    AND
    EXISTS (
        SELECT 1
        FROM public.project_documents d
        WHERE
            d.storage_path = storage.objects.name
    )

);


-- ============================================================
-- 15. STORAGE — CLIENTE → SELECT
-- ============================================================
--
-- El cliente únicamente puede consultar objetos que:
--
-- 1. pertenezcan al bucket project-documents;
-- 2. estén registrados en project_documents;
-- 3. pertenezcan a un proyecto;
-- 4. cuyo user_id sea auth.uid().
--
-- ============================================================

CREATE POLICY
    project_documents_storage_client_select
ON storage.objects
FOR SELECT
TO authenticated
USING (

    bucket_id = 'project-documents'

    AND
    NOT public.current_user_is_worker()

    AND
    EXISTS (
        SELECT 1
        FROM public.project_documents d
        JOIN public.projects p
          ON p.id = d.project_id
        WHERE
            d.storage_path = storage.objects.name
            AND
            p.user_id = auth.uid()
    )

);


-- ============================================================
-- 16. RPC — ATTACH PROJECT DOCUMENT
-- ============================================================
--
-- El frontend:
--
-- 1. genera un UUID document_id;
-- 2. sube:
--
--      project_id/document_id.pdf
--
-- 3. llama a esta función.
--
-- La función registra el documento.
--
-- Si document_id ya existe para el mismo proyecto:
--     se actualiza la información del documento.
--
-- Si document_id ya pertenece a otro proyecto:
--     se rechaza.
--
-- La función NO permite cambiar:
--
--     project_id
--     id
--
-- de un documento existente.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.attach_project_document(
    p_project_id UUID,
    p_document_id UUID,
    p_file_name TEXT,
    p_file_size BIGINT
)
RETURNS public.project_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_document public.project_documents;
    v_storage_path TEXT;
BEGIN

    -- --------------------------------------------------------
    -- 1. WORKER ACTIVO
    -- --------------------------------------------------------

    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';
    END IF;


    -- --------------------------------------------------------
    -- 2. VALIDAR PROJECT_ID
    -- --------------------------------------------------------

    IF p_project_id IS NULL THEN
        RAISE EXCEPTION
            'El proyecto es obligatorio';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM public.projects
        WHERE id = p_project_id
    ) THEN
        RAISE EXCEPTION
            'Proyecto no encontrado';
    END IF;


    -- --------------------------------------------------------
    -- 3. VALIDAR DOCUMENT_ID
    -- --------------------------------------------------------

    IF p_document_id IS NULL THEN
        RAISE EXCEPTION
            'El identificador del documento es obligatorio';
    END IF;


    -- --------------------------------------------------------
    -- 4. VALIDAR NOMBRE
    -- --------------------------------------------------------

    IF p_file_name IS NULL
       OR btrim(p_file_name) = ''
    THEN
        RAISE EXCEPTION
            'El nombre del documento es obligatorio';
    END IF;


    IF length(btrim(p_file_name)) > 255 THEN
        RAISE EXCEPTION
            'El nombre del documento no puede superar 255 caracteres';
    END IF;


    -- --------------------------------------------------------
    -- 5. VALIDAR TAMAÑO
    -- --------------------------------------------------------

    IF p_file_size IS NULL
       OR p_file_size <= 0
    THEN
        RAISE EXCEPTION
            'El tamaño del documento debe ser mayor que cero';
    END IF;


    -- --------------------------------------------------------
    -- 6. CONSTRUIR RUTA
    -- --------------------------------------------------------

    v_storage_path :=
        p_project_id::TEXT
        || '/'
        || p_document_id::TEXT
        || '.pdf';


    -- --------------------------------------------------------
    -- 7. COMPROBAR OBJETO REAL EN STORAGE
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM storage.objects
        WHERE
            bucket_id = 'project-documents'
            AND
            name = v_storage_path
    ) THEN
        RAISE EXCEPTION
            'El documento no existe en el bucket de proyectos';
    END IF;


    -- --------------------------------------------------------
    -- 8. COMPROBAR DOCUMENT_ID EXISTENTE
    -- --------------------------------------------------------
    --
    -- Un mismo document_id no puede pasar de un proyecto a otro.
    --
    -- --------------------------------------------------------

    SELECT *
    INTO v_document
    FROM public.project_documents
    WHERE id = p_document_id
    FOR UPDATE;


    IF FOUND THEN

        IF v_document.project_id <> p_project_id THEN
            RAISE EXCEPTION
                'El documento ya pertenece a otro proyecto';
        END IF;


        UPDATE public.project_documents
        SET
            file_name = btrim(p_file_name),
            storage_path = v_storage_path,
            mime_type = 'application/pdf',
            file_size = p_file_size,
            uploaded_by = auth.uid(),
            updated_at = CURRENT_TIMESTAMP
        WHERE
            id = p_document_id
        RETURNING *
        INTO v_document;


        RETURN v_document;

    END IF;


    -- --------------------------------------------------------
    -- 9. CREAR REFERENCIA DOCUMENTAL
    -- --------------------------------------------------------

    INSERT INTO public.project_documents (
        id,
        project_id,
        file_name,
        storage_path,
        mime_type,
        file_size,
        uploaded_by
    )
    VALUES (
        p_document_id,
        p_project_id,
        btrim(p_file_name),
        v_storage_path,
        'application/pdf',
        p_file_size,
        auth.uid()
    )
    RETURNING *
    INTO v_document;


    RETURN v_document;

END;
$$;


-- ============================================================
-- 17. PERMISOS ATTACH_PROJECT_DOCUMENT
-- ============================================================

REVOKE ALL
ON FUNCTION public.attach_project_document(
    UUID,
    UUID,
    TEXT,
    BIGINT
)
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE
ON FUNCTION public.attach_project_document(
    UUID,
    UUID,
    TEXT,
    BIGINT
)
TO authenticated;


-- ============================================================
-- 18. RPC — DETACH PROJECT DOCUMENT
-- ============================================================
--
-- Esta función elimina únicamente la referencia documental.
--
-- El objeto físico debe eliminarse previamente mediante:
--
--     supabase.storage
--
-- Después:
--
--     detach_project_document(document_id)
--
-- Esto evita manipular directamente storage.objects desde SQL.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.detach_project_document(
    p_document_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN

    -- --------------------------------------------------------
    -- 1. WORKER ACTIVO
    -- --------------------------------------------------------

    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';
    END IF;


    -- --------------------------------------------------------
    -- 2. COMPROBAR EXISTENCIA
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM public.project_documents
        WHERE id = p_document_id
    ) THEN
        RAISE EXCEPTION
            'Documento de proyecto no encontrado';
    END IF;


    -- --------------------------------------------------------
    -- 3. ELIMINAR REFERENCIA
    -- --------------------------------------------------------

    DELETE FROM public.project_documents
    WHERE id = p_document_id;

END;
$$;


-- ============================================================
-- 19. PERMISOS DETACH_PROJECT_DOCUMENT
-- ============================================================

REVOKE ALL
ON FUNCTION public.detach_project_document(UUID)
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE
ON FUNCTION public.detach_project_document(UUID)
TO authenticated;


-- ============================================================
-- 20. SEGURIDAD DE LAS RPC
-- ============================================================

ALTER FUNCTION public.attach_project_document(
    UUID,
    UUID,
    TEXT,
    BIGINT
)
SET search_path = public, pg_temp;


ALTER FUNCTION public.detach_project_document(
    UUID
)
SET search_path = public, pg_temp;


-- ============================================================
-- 21. VERIFICACIONES FINALES — TABLA
-- ============================================================

DO $$
DECLARE
    v_rls_enabled BOOLEAN;
    v_policy_count INTEGER;
    v_index_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- Tabla
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE
            table_schema = 'public'
            AND table_name = 'project_documents'
    ) THEN
        RAISE EXCEPTION
            '013 failed: project_documents table was not created';
    END IF;


    -- --------------------------------------------------------
    -- RLS
    -- --------------------------------------------------------

    SELECT relrowsecurity
    INTO v_rls_enabled
    FROM pg_class
    WHERE oid = 'public.project_documents'::regclass;


    IF v_rls_enabled IS NOT TRUE THEN
        RAISE EXCEPTION
            '013 failed: RLS is not enabled on project_documents';
    END IF;


    -- --------------------------------------------------------
    -- SELECT policy
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'public'
        AND tablename = 'project_documents'
        AND policyname = 'project_documents_select';


    IF v_policy_count <> 1 THEN
        RAISE EXCEPTION
            '013 failed: project_documents_select policy was not created';
    END IF;


    -- --------------------------------------------------------
    -- No direct INSERT policy
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'public'
        AND tablename = 'project_documents'
        AND cmd = 'INSERT';


    IF v_policy_count <> 0 THEN
        RAISE EXCEPTION
            '013 failed: direct INSERT policy exists on project_documents';
    END IF;


    -- --------------------------------------------------------
    -- No direct UPDATE policy
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'public'
        AND tablename = 'project_documents'
        AND cmd = 'UPDATE';


    IF v_policy_count <> 0 THEN
        RAISE EXCEPTION
            '013 failed: direct UPDATE policy exists on project_documents';
    END IF;


    -- --------------------------------------------------------
    -- No direct DELETE policy
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'public'
        AND tablename = 'project_documents'
        AND cmd = 'DELETE';


    IF v_policy_count <> 0 THEN
        RAISE EXCEPTION
            '013 failed: direct DELETE policy exists on project_documents';
    END IF;


    -- --------------------------------------------------------
    -- Índice project_id
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_index_count
    FROM pg_indexes
    WHERE
        schemaname = 'public'
        AND tablename = 'project_documents'
        AND indexname = 'idx_project_documents_project_id';


    IF v_index_count <> 1 THEN
        RAISE EXCEPTION
            '013 failed: project_documents project index is missing';
    END IF;


    -- --------------------------------------------------------
    -- Índice storage_path
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_index_count
    FROM pg_indexes
    WHERE
        schemaname = 'public'
        AND tablename = 'project_documents'
        AND indexname = 'idx_project_documents_storage_path_unique';


    IF v_index_count <> 1 THEN
        RAISE EXCEPTION
            '013 failed: project_documents storage path unique index is missing';
    END IF;

END $$;


-- ============================================================
-- 22. VERIFICACIONES FINALES — STORAGE
-- ============================================================

DO $$
DECLARE
    v_bucket_public BOOLEAN;
    v_policy_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- Bucket
    -- --------------------------------------------------------

    SELECT public
    INTO v_bucket_public
    FROM storage.buckets
    WHERE id = 'project-documents';


    IF NOT FOUND THEN
        RAISE EXCEPTION
            '013 failed: project-documents bucket does not exist';
    END IF;


    IF v_bucket_public IS NOT FALSE THEN
        RAISE EXCEPTION
            '013 failed: project-documents bucket must be private';
    END IF;


    -- --------------------------------------------------------
    -- Worker INSERT
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname =
            'project_documents_storage_worker_insert';


    IF v_policy_count <> 1 THEN
        RAISE EXCEPTION
            '013 failed: Storage worker INSERT policy is missing';
    END IF;


    -- --------------------------------------------------------
    -- Worker SELECT
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname =
            'project_documents_storage_worker_select';


    IF v_policy_count <> 1 THEN
        RAISE EXCEPTION
            '013 failed: Storage worker SELECT policy is missing';
    END IF;


    -- --------------------------------------------------------
    -- Worker UPDATE
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname =
            'project_documents_storage_worker_update';


    IF v_policy_count <> 1 THEN
        RAISE EXCEPTION
            '013 failed: Storage worker UPDATE policy is missing';
    END IF;


    -- --------------------------------------------------------
    -- Worker DELETE
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname =
            'project_documents_storage_worker_delete';


    IF v_policy_count <> 1 THEN
        RAISE EXCEPTION
            '013 failed: Storage worker DELETE policy is missing';
    END IF;


    -- --------------------------------------------------------
    -- Client SELECT
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE
        schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname =
            'project_documents_storage_client_select';


    IF v_policy_count <> 1 THEN
        RAISE EXCEPTION
            '013 failed: Storage client SELECT policy is missing';
    END IF;

END $$;


-- ============================================================
-- 23. VERIFICACIONES FINALES — RPCs
-- ============================================================

DO $$
DECLARE
    v_attach_count INTEGER;
    v_detach_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- attach_project_document()
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_attach_count
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE
        n.nspname = 'public'
        AND p.proname = 'attach_project_document'
        AND p.pronargs = 4
        AND p.proargtypes[0] = 'uuid'::regtype
        AND p.proargtypes[1] = 'uuid'::regtype
        AND p.proargtypes[2] = 'text'::regtype
        AND p.proargtypes[3] = 'int8'::regtype;


    IF v_attach_count <> 1 THEN
        RAISE EXCEPTION
            '013 failed: attach_project_document() was not created correctly';
    END IF;


    -- --------------------------------------------------------
    -- detach_project_document()
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_detach_count
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE
        n.nspname = 'public'
        AND p.proname = 'detach_project_document'
        AND p.pronargs = 1
        AND p.proargtypes[0] = 'uuid'::regtype;


    IF v_detach_count <> 1 THEN
        RAISE EXCEPTION
            '013 failed: detach_project_document() was not created correctly';
    END IF;

END $$;


-- ============================================================
-- 24. VERIFICACIONES FINALES — PERMISOS
-- ============================================================

DO $$
BEGIN

    IF NOT has_table_privilege(
        'authenticated',
        'public.project_documents',
        'SELECT'
    ) THEN
        RAISE EXCEPTION
            '013 failed: authenticated lacks SELECT on project_documents';
    END IF;


    IF has_table_privilege(
        'authenticated',
        'public.project_documents',
        'INSERT'
    ) THEN
        RAISE EXCEPTION
            '013 failed: authenticated still has INSERT on project_documents';
    END IF;


    IF has_table_privilege(
        'authenticated',
        'public.project_documents',
        'UPDATE'
    ) THEN
        RAISE EXCEPTION
            '013 failed: authenticated still has UPDATE on project_documents';
    END IF;


    IF has_table_privilege(
        'authenticated',
        'public.project_documents',
        'DELETE'
    ) THEN
        RAISE EXCEPTION
            '013 failed: authenticated still has DELETE on project_documents';
    END IF;

END $$;


-- ============================================================
-- 25. RESULTADO FINAL
-- ============================================================
--
-- PROJECTS
-- ========
--
-- Un proyecto puede tener:
--
--     0 documentos
--     1 documento
--     N documentos
--
--
-- DOCUMENTOS
-- ==========
--
-- project_documents
--       │
--       ├── proyecto
--       ├── nombre original
--       ├── ruta Storage
--       ├── MIME
--       ├── tamaño
--       ├── usuario que lo subió
--       └── fechas
--
--
-- STORAGE
-- =======
--
-- Bucket:
--
--     project-documents
--
-- Público:
--
--     FALSE
--
--
-- WORKER ACTIVO
-- =============
--
-- SELECT
--   ↓
-- Todos los documentos registrados.
--
-- INSERT
--   ↓
-- Puede subir PDFs a proyectos existentes.
--
-- UPDATE
--   ↓
-- Puede sustituir PDFs existentes.
--
-- DELETE
--   ↓
-- Puede eliminar PDFs existentes.
--
--
-- CLIENTE
-- =======
--
-- SELECT
--   ↓
-- Únicamente documentos de sus propios proyectos.
--
-- INSERT
--   ↓
-- ❌
--
-- UPDATE
--   ↓
-- ❌
--
-- DELETE
--   ↓
-- ❌
--
--
-- ESCRITURA DE METADATOS
-- ======================
--
-- Worker
--   ↓
-- attach_project_document()
--   ↓
-- SECURITY DEFINER
--   ↓
-- project_documents
--
--
-- ELIMINACIÓN DE METADATOS
-- ========================
--
-- Worker
--   ↓
-- elimina objeto mediante Storage API
--   ↓
-- detach_project_document()
--   ↓
-- elimina referencia de project_documents
--
-- ============================================================

COMMIT;