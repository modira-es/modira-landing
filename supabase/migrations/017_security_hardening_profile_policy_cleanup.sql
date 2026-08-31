-- MODIRA 017 — cierre incremental de escalada de privilegios y solapamiento RLS
--
-- No modifica migraciones históricas.
-- Requiere el estado de 016.
--
-- IMPORTANTE:
-- En el esquema actual profiles.is_active NO existe.
-- La fuente de verdad para el acceso del usuario cliente es:
--     profiles.status = 'active'
--
-- Por tanto, esta migración NO referencia profiles.is_active.

-- ============================================================
-- 1. ELIMINAR POLICIES LEGACY PERMISIVAS
-- ============================================================

-- Las policies permisivas se combinan mediante OR.
-- Si permanecen junto a las policies endurecidas de 016,
-- pueden reabrir accesos que 016 pretendía cerrar.

DROP POLICY IF EXISTS own_profile_access ON public.profiles;

DROP POLICY IF EXISTS company_members_can_view_company_record ON public.companies;

DROP POLICY IF EXISTS company_admins_can_manage_company_record ON public.companies;

DROP POLICY IF EXISTS company_users_can_view_clients ON public.clients;

DROP POLICY IF EXISTS company_managers_can_manage_clients ON public.clients;

DROP POLICY IF EXISTS own_profile_management ON public.profiles;

DROP POLICY IF EXISTS profile_creation_by_self_only ON public.profiles;

DROP POLICY IF EXISTS profile_delete_by_admin_only ON public.profiles;

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;

DROP POLICY IF EXISTS project_self_or_company_access ON public.projects;

DROP POLICY IF EXISTS project_insert_by_owner ON public.projects;

DROP POLICY IF EXISTS project_manage_by_owner_or_manager ON public.projects;

DROP POLICY IF EXISTS quotation_self_or_company_access ON public.quotations;

DROP POLICY IF EXISTS quotation_insert_by_owner ON public.quotations;

DROP POLICY IF EXISTS quotation_manage_by_owner_or_manager ON public.quotations;

DROP POLICY IF EXISTS invoice_self_or_company_access ON public.invoices;

DROP POLICY IF EXISTS invoice_insert_by_owner ON public.invoices;

DROP POLICY IF EXISTS invoice_manage_by_owner_or_manager ON public.invoices;

DROP POLICY IF EXISTS payment_self_or_company_access ON public.payments;

DROP POLICY IF EXISTS payment_insert_by_owner ON public.payments;

DROP POLICY IF EXISTS payment_manage_by_owner_or_manager ON public.payments;

DROP POLICY IF EXISTS budget_self_or_company_access ON public.budgets;

DROP POLICY IF EXISTS budget_insert_by_owner ON public.budgets;

DROP POLICY IF EXISTS budget_manage_by_owner_or_manager ON public.budgets;

DROP POLICY IF EXISTS automation_self_or_company_access ON public.automations;

DROP POLICY IF EXISTS automation_insert_by_owner ON public.automations;

DROP POLICY IF EXISTS automation_manage_by_owner_or_manager ON public.automations;

DROP POLICY IF EXISTS support_ticket_self_or_company_access ON public.support_tickets;

DROP POLICY IF EXISTS support_ticket_insert_by_owner ON public.support_tickets;

DROP POLICY IF EXISTS support_ticket_manage_by_owner_or_manager ON public.support_tickets;


-- ============================================================
-- 2. PROTEGER CAMPOS DE AUTORIZACIÓN DEL PERFIL
-- ============================================================
--
-- profiles.is_active NO existe en el esquema actual.
--
-- Los campos que constituyen la frontera de autorización son:
--   id
--   rol
--   company_id
--   status
--
-- El cliente autenticado no puede modificarlos directamente.

REVOKE UPDATE (id, rol, company_id, status)
ON public.profiles
FROM authenticated;

REVOKE INSERT (rol, company_id, status)
ON public.profiles
FROM authenticated;


-- ============================================================
-- 3. CREACIÓN SEGURA DEL PERFIL
-- ============================================================
--
-- El usuario únicamente puede crear su propio perfil.
-- El rol queda fijado a user.
-- No puede elegir una empresa existente.
-- El estado inicial queda fijado a active.
--
-- IMPORTANTE:
-- No se referencia is_active porque esa columna no existe.

DROP POLICY IF EXISTS profile_creation_by_self_safe
ON public.profiles;

CREATE POLICY profile_creation_by_self_safe
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
  AND rol = 'user'
  AND company_id IS NULL
  AND status = 'active'
);


-- ============================================================
-- 4. VERIFICAR PRIVILEGIOS DE COLUMNAS SENSIBLES
-- ============================================================
--
-- Debe quedar garantizado que authenticated no conserva
-- INSERT/UPDATE sobre los campos que afectan a autorización.

DO $$
DECLARE
  v_count integer;
BEGIN

  SELECT count(*)
  INTO v_count
  FROM information_schema.column_privileges
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND grantee = 'authenticated'
    AND privilege_type IN ('UPDATE', 'INSERT')
    AND (
      (
        privilege_type = 'UPDATE'
        AND column_name IN (
          'id',
          'rol',
          'company_id',
          'status'
        )
      )
      OR
      (
        privilege_type = 'INSERT'
        AND column_name IN (
          'rol',
          'company_id',
          'status'
        )
      )
    );

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      '017 failed: sensitive profile column privilege remains';
  END IF;

END $$;


-- ============================================================
-- 5. RPC ADMINISTRATIVA — LISTAR PERFILES
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_profiles()

RETURNS SETOF public.profiles

LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp

AS $$
BEGIN

  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT p
  FROM public.profiles p
  ORDER BY p.created_at DESC;

END;

$$;


-- ============================================================
-- 6. RPC ADMINISTRATIVA — CAMBIAR ROL
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_set_profile_role(
  p_user_id UUID,
  p_role TEXT
)

RETURNS VOID

LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp

AS $$
BEGIN

  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  IF p_user_id IS NULL
     OR p_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Parámetros no válidos';
  END IF;

  IF p_user_id = auth.uid()
     AND p_role <> 'admin' THEN
    RAISE EXCEPTION 'No puedes quitarte tus privilegios';
  END IF;

  UPDATE public.profiles
  SET
    rol = p_role,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;

END;

$$;


-- ============================================================
-- 7. RPC ADMINISTRATIVA — CAMBIAR ESTADO
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_set_profile_status(
  p_user_id UUID,
  p_status TEXT
)

RETURNS VOID

LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp

AS $$
BEGIN

  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  IF p_user_id IS NULL
     OR p_status NOT IN ('active', 'blocked') THEN
    RAISE EXCEPTION 'Parámetros no válidos';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes modificar tu propio estado';
  END IF;

  UPDATE public.profiles
  SET
    status = p_status,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;

  IF p_status = 'blocked' THEN
    PERFORM public.revoke_user_sessions(p_user_id);
  END IF;

END;

$$;


-- ============================================================
-- 8. PROTEGER RPCs ADMINISTRATIVAS
-- ============================================================

REVOKE ALL
ON FUNCTION public.admin_list_profiles()
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.admin_set_profile_role(UUID, TEXT)
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.admin_set_profile_status(UUID, TEXT)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.admin_list_profiles()
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_set_profile_role(UUID, TEXT)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_set_profile_status(UUID, TEXT)
TO authenticated;


-- ============================================================
-- 9. ENDURECER SIGNUP
-- ============================================================
--
-- El nombre de empresa proporcionado durante signup NO puede
-- utilizarse para localizar o asociarse automáticamente a una
-- empresa existente.
--
-- Si se proporciona empresa:
--   -> se crea una empresa nueva.
--
-- La asociación posterior a otra empresa debe pasar por el
-- flujo explícito de cambio de empresa.

CREATE OR REPLACE FUNCTION public.handle_new_user()

RETURNS TRIGGER

LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp

AS $$

DECLARE
  v_empresa TEXT;
  v_company_id UUID;
  v_company_code TEXT;

BEGIN

  v_empresa :=
    NULLIF(
      TRIM(
        COALESCE(
          NEW.raw_user_meta_data->>'empresa',
          ''
        )
      ),
      ''
    );


  IF v_empresa IS NOT NULL THEN

    v_company_code :=
      'CLI-' ||
      UPPER(
        REPLACE(
          gen_random_uuid()::TEXT,
          '-',
          ''
        )
      );

    INSERT INTO public.companies (
      company_code,
      company_name,
      legal_name,
      created_by
    )
    VALUES (
      v_company_code,
      LEFT(v_empresa, 200),
      LEFT(v_empresa, 200),
      NEW.id
    )
    RETURNING id
    INTO v_company_id;

  END IF;


  INSERT INTO public.profiles (
    id,
    nombre,
    empresa,
    company_id,
    rol,
    email
  )
  VALUES (
    NEW.id,

    COALESCE(
      NULLIF(
        TRIM(
          NEW.raw_user_meta_data->>'nombre'
        ),
        ''
      ),

      NULLIF(
        TRIM(
          NEW.raw_user_meta_data->>'name'
        ),
        ''
      ),

      NEW.email,

      'Usuario'
    ),

    v_empresa,

    v_company_id,

    'user',

    NEW.email
  )

  ON CONFLICT (id)
  DO UPDATE
  SET
    nombre = EXCLUDED.nombre,
    empresa = EXCLUDED.empresa,
    email = EXCLUDED.email;


  RETURN NEW;

END;

$$;


REVOKE ALL
ON FUNCTION public.handle_new_user()
FROM PUBLIC, anon, authenticated;


-- ============================================================
-- FIN DE MIGRACIÓN 017
-- ============================================================
--
-- Esta migración:
--
-- 1. Elimina policies RLS legacy permisivas.
-- 2. Impide que authenticated modifique rol/company_id/status.
-- 3. Elimina cualquier dependencia de profiles.is_active.
-- 4. Mantiene status='active' como estado inicial del perfil.
-- 5. Mantiene las RPCs administrativas protegidas por
--    current_user_is_admin().
-- 6. Revoca sesiones al bloquear cuentas.
-- 7. Impide que signup se una automáticamente a una empresa
--    existente.
--
-- 018 endurece posteriormente create_automation_run().
-- 019 endurece posteriormente la infraestructura de cuotas
-- de Modira AI.