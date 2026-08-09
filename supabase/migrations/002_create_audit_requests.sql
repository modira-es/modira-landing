BEGIN;

-- =========================================================
-- MODIRA - MIGRACIÓN 002
-- Solicitudes de auditoría gratuita
--
-- IMPORTANTE:
-- - Las solicitudes proceden de visitantes públicos de la web.
-- - No requieren autenticación.
-- - Los visitantes SOLO pueden INSERTAR solicitudes.
-- - Las solicitudes NO son públicas para SELECT.
-- - La lectura/gestión quedará reservada al sistema interno.
-- =========================================================


-- =========================================================
-- 1. TABLA AUDIT_REQUESTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.audit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre TEXT NOT NULL,
    email VARCHAR(320) NOT NULL,
    empresa TEXT NOT NULL,
    empleados VARCHAR(50) NOT NULL,
    proceso TEXT NOT NULL,

    estado VARCHAR(50) NOT NULL DEFAULT 'nuevo',

    notas_internas TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 2. ÍNDICES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_audit_requests_created_at
ON public.audit_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_requests_estado
ON public.audit_requests(estado);

CREATE INDEX IF NOT EXISTS idx_audit_requests_email
ON public.audit_requests(email);


-- =========================================================
-- 3. UPDATED_AT
-- =========================================================

DROP TRIGGER IF EXISTS audit_requests_updated_at
ON public.audit_requests;

CREATE TRIGGER audit_requests_updated_at
BEFORE UPDATE ON public.audit_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =========================================================
-- 4. ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.audit_requests ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- 5. ELIMINAR POLÍTICAS SI EXISTIERAN
-- =========================================================

DROP POLICY IF EXISTS audit_requests_public_insert
ON public.audit_requests;

DROP POLICY IF EXISTS audit_requests_authenticated_select
ON public.audit_requests;

DROP POLICY IF EXISTS audit_requests_authenticated_update
ON public.audit_requests;


-- =========================================================
-- 6. INSERT PÚBLICO
--
-- Permite que un visitante de la web envíe
-- una solicitud sin tener cuenta en Modira.
--
-- IMPORTANTE:
-- No permite SELECT, UPDATE ni DELETE.
-- =========================================================

CREATE POLICY audit_requests_public_insert
ON public.audit_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
    estado = 'nuevo'
);


-- =========================================================
-- 7. LECTURA PARA USUARIOS AUTENTICADOS
--
-- De momento permitimos lectura a usuarios autenticados
-- para poder construir posteriormente el panel interno.
--
-- Más adelante podemos restringirlo todavía más
-- según rol/empresa si es necesario.
-- =========================================================

CREATE POLICY audit_requests_authenticated_select
ON public.audit_requests
FOR SELECT
TO authenticated
USING (
    true
);


-- =========================================================
-- 8. ACTUALIZACIÓN PARA USUARIOS AUTENTICADOS
--
-- Permite cambiar estado y notas desde el panel interno.
-- =========================================================

CREATE POLICY audit_requests_authenticated_update
ON public.audit_requests
FOR UPDATE
TO authenticated
USING (
    true
)
WITH CHECK (
    true
);


COMMIT;