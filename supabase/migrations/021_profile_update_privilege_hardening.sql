BEGIN;

-- ============================================================
-- MODIRA — 021_profile_update_privilege_hardening.sql
--
-- H-01 — BLOQUEO DE AUTOELEVACIÓN Y AUTOCAMBIO DE EMPRESA
--
-- El cliente autenticado únicamente puede modificar:
--   - nombre
--   - telefono
--
-- NO puede modificar directamente:
--   - id
--   - email
--   - rol
--   - company_id
--   - empresa
--   - status
--   - fecha_registro
--   - fecha_ultimo_login
--
-- Los cambios administrativos de rol, estado y empresa continúan
-- realizándose mediante las RPC SECURITY DEFINER correspondientes.
--
-- El cambio de empresa del cliente debe seguir el flujo:
--
--   cliente
--      ↓
--   request_company_change()
--      ↓
--   revisión Modira
--      ↓
--   resolve_company_change_request()
--      ↓
--   admin_update_profile_company()
--
-- ============================================================


-- ============================================================
-- 1. VALIDACIÓN PREVIA
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
    ) THEN
        RAISE EXCEPTION
            '021 stopped: public.profiles does not exist';
    END IF;

END;
$$;


-- ============================================================
-- 2. ELIMINAR UPDATE GENERAL PARA authenticated
-- ============================================================

REVOKE UPDATE
ON public.profiles
FROM authenticated;


-- ============================================================
-- 3. CONCEDER ÚNICAMENTE LOS CAMPOS QUE EL CLIENTE PUEDE EDITAR
-- ============================================================
--
-- IMPORTANTE:
-- "empresa" queda deliberadamente fuera.
--
-- El cliente NO cambia directamente su empresa.
-- Debe solicitar el cambio mediante request_company_change().
--
-- ============================================================

GRANT UPDATE (
    nombre,
    telefono
)
ON public.profiles
TO authenticated;


-- ============================================================
-- 4. RECREAR LA POLICY DE AUTOEDICIÓN
-- ============================================================

DROP POLICY IF EXISTS profiles_update_own
ON public.profiles;

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND id = auth.uid()
)
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND id = auth.uid()
);


-- ============================================================
-- 5. VERIFICAR QUE NO EXISTE UPDATE SOBRE CAMPOS SENSIBLES
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND grantee = 'authenticated'
      AND privilege_type = 'UPDATE'
      AND column_name IN (
          'id',
          'email',
          'rol',
          'company_id',
          'empresa',
          'status',
          'fecha_registro',
          'fecha_ultimo_login',
          'created_at'
      );

    IF v_count <> 0 THEN
        RAISE EXCEPTION
            '021 failed: authenticated retains UPDATE privilege on protected profile columns';
    END IF;

END;
$$;


-- ============================================================
-- 6. VERIFICAR QUE SOLO EXISTEN LOS CAMPOS EDITABLES
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND grantee = 'authenticated'
      AND privilege_type = 'UPDATE'
      AND column_name IN (
          'nombre',
          'telefono'
      );

    IF v_count <> 2 THEN
        RAISE EXCEPTION
            '021 failed: expected exactly 2 safe profile UPDATE columns';
    END IF;

END;
$$;


COMMIT;