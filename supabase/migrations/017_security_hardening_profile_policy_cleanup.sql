-- MODIRA 017 — cierre incremental de escalada de privilegios y solapamiento RLS
-- No modifica migraciones históricas. Requiere el estado de 016.

-- Policies legacy que no comprueban status o usan reglas de ownership más amplias.
-- Las policies permisivas se combinan mediante OR, por lo que deben retirarse.
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

-- Un usuario no puede modificar campos que son fuente de autorización.
-- status ya estaba protegido por 016; se repite idempotentemente con el resto.
REVOKE UPDATE (id, rol, company_id, is_active, status)
ON public.profiles FROM authenticated;

-- El alta directa conserva únicamente id + datos básicos; los campos sensibles
-- deben usar sus defaults y no pueden ser elegidos por el cliente.
REVOKE INSERT (rol, company_id, is_active, status)
ON public.profiles FROM authenticated;

DROP POLICY IF EXISTS profile_creation_by_self_safe ON public.profiles;
CREATE POLICY profile_creation_by_self_safe
ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid()
  AND rol = 'user'
  AND company_id IS NULL
  AND is_active = TRUE
  AND status = 'active'
);

-- Verificación de que los campos sensibles no quedan concedidos al rol cliente.
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM information_schema.column_privileges
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND grantee = 'authenticated'
    AND privilege_type IN ('UPDATE', 'INSERT')
    AND (
      (privilege_type = 'UPDATE' AND column_name IN ('id', 'rol', 'company_id', 'is_active', 'status'))
      OR (privilege_type = 'INSERT' AND column_name IN ('rol', 'company_id', 'is_active', 'status'))
    );

  IF v_count <> 0 THEN
    RAISE EXCEPTION '017 failed: sensitive profile column privilege remains';
  END IF;
END $$;

-- RPCs administrativas: la autorización se comprueba dentro de la frontera privilegiada.
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
  RETURN QUERY SELECT p FROM public.profiles p ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_profile_role(p_user_id UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  IF p_user_id IS NULL OR p_role NOT IN ('user', 'admin') THEN RAISE EXCEPTION 'Parámetros no válidos'; END IF;
  IF p_user_id = auth.uid() AND p_role <> 'admin' THEN RAISE EXCEPTION 'No puedes quitarte tus privilegios'; END IF;
  UPDATE public.profiles SET rol = p_role, updated_at = CURRENT_TIMESTAMP WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_profile_status(p_user_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  IF p_user_id IS NULL OR p_status NOT IN ('active', 'blocked') THEN RAISE EXCEPTION 'Parámetros no válidos'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'No puedes modificar tu propio estado'; END IF;
  UPDATE public.profiles SET status = p_status, updated_at = CURRENT_TIMESTAMP WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;
  IF p_status = 'blocked' THEN PERFORM public.revoke_user_sessions(p_user_id); END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_profile_role(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_profile_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_status(UUID, TEXT) TO authenticated;

-- 017 cierra la escalada de privilegios de perfiles y elimina policies RLS legacy permisivas.

-- Evitar que el nombre de empresa enviado en signup se utilice para unirse
-- a una empresa existente. Cada alta crea una empresa nueva; la asociación
-- posterior debe pasar por el flujo explícito de cambio de empresa.
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
  v_empresa := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'empresa', '')), '');

  IF v_empresa IS NOT NULL THEN
    v_company_code := 'CLI-' || UPPER(REPLACE(gen_random_uuid()::TEXT, '-', ''));
    INSERT INTO public.companies (company_code, company_name, legal_name, created_by)
    VALUES (v_company_code, LEFT(v_empresa, 200), LEFT(v_empresa, 200), NEW.id)
    RETURNING id INTO v_company_id;
  END IF;

  INSERT INTO public.profiles (id, nombre, empresa, company_id, rol, email)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'nombre'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      NEW.email,
      'Usuario'
    ),
    v_empresa,
    v_company_id,
    'user',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET nombre = EXCLUDED.nombre,
      empresa = EXCLUDED.empresa,
      email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 017 también impide que signup asocie metadata a una empresa existente.
