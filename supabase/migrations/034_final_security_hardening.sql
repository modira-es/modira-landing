BEGIN;

-- ============================================================
-- MODIRA — FINAL SECURITY / INTEGRITY HARDENING
-- ============================================================
--
-- OBJETIVOS:
--
-- 1. Proteger el estado "pagada" de invoices.
-- 2. Validar fecha de vencimiento de invoices.
-- 3. Hacer maintenance_contracts.company_id obligatorio.
-- 4. Cambiar FK de maintenance_contracts a ON DELETE RESTRICT.
-- 5. Endurecer INSERT de maintenance_contracts.
-- 6. Restringir set_profile_status() según jerarquía.
-- 7. Impedir admin -> admin en cambio de rol.
-- 8. Impedir admin -> admin en cambio de estado.
-- 9. Crear RPC administrativa para workers.is_active.
-- 10. Añadir autenticación explícita a respond_to_quotation().
-- 11. Validar todas las constraints NOT VALID existentes.
--
-- EXCLUIDO DELIBERADAMENTE:
-- automations / automation_runs / n8n
--
-- ============================================================


-- ============================================================
-- 1. INVOICE — FECHA DE VENCIMIENTO
-- ============================================================

ALTER TABLE public.invoices
ADD CONSTRAINT invoices_due_date_after_issue_check
CHECK (
    fecha_vencimiento IS NULL
    OR fecha_vencimiento >= fecha_emision
)
NOT VALID;


-- ============================================================
-- 2. INVOICE — IMPEDIR RETROCESO DESDE "PAGADA"
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_paid_invoice_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN

    IF LOWER(COALESCE(OLD.estado, '')) = 'pagada'
       AND LOWER(COALESCE(NEW.estado, '')) <> 'pagada'
    THEN
        RAISE EXCEPTION
            'Una factura pagada no puede volver a un estado anterior';
    END IF;

    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS invoices_protect_paid_state
ON public.invoices;


CREATE TRIGGER invoices_protect_paid_state
BEFORE UPDATE OF estado
ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.protect_paid_invoice_state();


REVOKE ALL
ON FUNCTION public.protect_paid_invoice_state()
FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 3. MAINTENANCE CONTRACTS — COMPANY OBLIGATORIA
-- ============================================================

ALTER TABLE public.maintenance_contracts
ALTER COLUMN company_id SET NOT NULL;


-- ============================================================
-- 4. MAINTENANCE CONTRACTS — FK RESTRICT
-- ============================================================

ALTER TABLE public.maintenance_contracts
DROP CONSTRAINT IF EXISTS maintenance_contracts_company_id_fkey;


ALTER TABLE public.maintenance_contracts
ADD CONSTRAINT maintenance_contracts_company_id_fkey
FOREIGN KEY (company_id)
REFERENCES public.companies(id)
ON DELETE RESTRICT
ON UPDATE NO ACTION;


-- ============================================================
-- 5. MAINTENANCE CONTRACTS — RLS INSERT
-- ============================================================

DROP POLICY IF EXISTS maintenance_contracts_client_insert
ON public.maintenance_contracts;


CREATE POLICY maintenance_contracts_client_insert
ON public.maintenance_contracts
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 6. ADMIN — CAMBIO DE ROL
-- ============================================================
--
-- Un admin:
-- - no puede cambiar su propio rol
-- - no puede modificar el rol de otro admin
-- - sí puede modificar usuarios no-admin
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_set_profile_role(
    p_user_id UUID,
    p_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller UUID;
    v_target_role TEXT;
BEGIN

    v_caller := auth.uid();

    IF v_caller IS NULL THEN
        RAISE EXCEPTION
            'Usuario no autenticado.';
    END IF;

    IF NOT public.current_user_is_admin() THEN
        RAISE EXCEPTION
            'No tienes permisos para cambiar roles.';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION
            'El usuario es obligatorio.';
    END IF;

    IF p_role NOT IN ('user', 'admin') THEN
        RAISE EXCEPTION
            'Rol no válido.';
    END IF;

    IF p_user_id = v_caller THEN
        RAISE EXCEPTION
            'No puedes cambiar tu propio rol.';
    END IF;

    SELECT rol
    INTO v_target_role
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'El perfil indicado no existe.';
    END IF;

    IF v_target_role = 'admin' THEN
        RAISE EXCEPTION
            'Un administrador no puede modificar el rol de otro administrador.';
    END IF;

    UPDATE public.profiles
    SET
        rol = p_role,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    RETURN TRUE;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_set_profile_role(UUID, TEXT)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.admin_set_profile_role(UUID, TEXT)
TO authenticated;


ALTER FUNCTION public.admin_set_profile_role(UUID, TEXT)
SET search_path = public, pg_temp;


-- ============================================================
-- 7. ADMIN — CAMBIO DE STATUS
-- ============================================================
--
-- Admin:
-- - no puede cambiar su propio status
-- - no puede cambiar el status de otro admin
-- - sí puede gestionar usuarios y workers
--
-- Worker no-admin:
-- - no puede gestionar workers
-- - no puede gestionar admins
-- - no puede cambiarse a sí mismo
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_set_profile_status(
    p_user_id UUID,
    p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller UUID;
    v_target_role TEXT;
    v_active_admins INTEGER;
BEGIN

    v_caller := auth.uid();

    IF v_caller IS NULL THEN
        RAISE EXCEPTION
            'Usuario no autenticado.';
    END IF;

    IF NOT public.current_user_is_admin() THEN
        RAISE EXCEPTION
            'No tienes permisos para cambiar el estado de cuentas.';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION
            'El usuario es obligatorio.';
    END IF;

    IF p_status NOT IN ('active', 'blocked') THEN
        RAISE EXCEPTION
            'Estado no válido.';
    END IF;

    IF p_user_id = v_caller THEN
        RAISE EXCEPTION
            'No puedes cambiar tu propio estado.';
    END IF;

    SELECT rol
    INTO v_target_role
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'El perfil indicado no existe.';
    END IF;

    IF v_target_role = 'admin' THEN
        RAISE EXCEPTION
            'Un administrador no puede modificar el estado de otro administrador.';
    END IF;

    -- Defensa adicional.
    IF p_status = 'blocked'
       AND v_target_role = 'admin'
    THEN

        SELECT COUNT(*)
        INTO v_active_admins
        FROM public.profiles
        WHERE rol = 'admin'
          AND status = 'active';

        IF v_active_admins <= 1 THEN
            RAISE EXCEPTION
                'No se puede bloquear al último administrador activo.';
        END IF;

    END IF;

    UPDATE public.profiles
    SET
        status = p_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    IF p_status = 'blocked' THEN
        PERFORM public.revoke_user_sessions(p_user_id);
    END IF;

    RETURN TRUE;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_set_profile_status(UUID, TEXT)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.admin_set_profile_status(UUID, TEXT)
TO authenticated;


ALTER FUNCTION public.admin_set_profile_status(UUID, TEXT)
SET search_path = public, pg_temp;


-- ============================================================
-- 8. set_profile_status() — ENDURECIMIENTO WORKER / ADMIN
-- ============================================================
--
-- Worker:
--   puede gestionar usuarios normales
--   NO workers
--   NO admins
--   NO self
--
-- Admin:
--   puede gestionar usuarios normales y workers
--   NO admins
--   NO self
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_profile_status(
    p_user_id UUID,
    p_status TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_profile public.profiles;
    v_target_role TEXT;
    v_target_is_worker BOOLEAN;
    v_caller_is_admin BOOLEAN;
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'Usuario no autenticado';
    END IF;

    IF NOT public.current_user_is_worker() THEN
        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo de MODIRA';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION
            'El usuario objetivo es obligatorio';
    END IF;

    IF p_status NOT IN ('active', 'blocked') THEN
        RAISE EXCEPTION
            'Estado de cuenta no válido';
    END IF;

    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION
            'No puedes modificar el estado de tu propia cuenta';
    END IF;

    SELECT
        p.rol
    INTO
        v_target_role
    FROM public.profiles p
    WHERE p.id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'El perfil indicado no existe';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.workers w
        WHERE w.auth_user_id = p_user_id
    )
    INTO v_target_is_worker;

    v_caller_is_admin := public.current_user_is_admin();

    -- Ningún worker puede gestionar un admin.
    -- Ningún admin puede gestionar otro admin.
    IF v_target_role = 'admin' THEN
        RAISE EXCEPTION
            'No puedes modificar el estado de una cuenta administradora';
    END IF;

    -- Un worker normal no puede gestionar otros workers.
    IF v_target_is_worker
       AND NOT v_caller_is_admin
    THEN
        RAISE EXCEPTION
            'Un trabajador no puede modificar el estado de otro trabajador';
    END IF;

    UPDATE public.profiles
    SET
        status = p_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id
    RETURNING *
    INTO v_profile;

    IF p_status = 'blocked' THEN
        PERFORM public.revoke_user_sessions(p_user_id);
    END IF;

    RETURN v_profile;

END;
$$;


REVOKE ALL
ON FUNCTION public.set_profile_status(UUID, TEXT)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.set_profile_status(UUID, TEXT)
TO authenticated;


ALTER FUNCTION public.set_profile_status(UUID, TEXT)
SET search_path = public, auth, pg_temp;


-- ============================================================
-- 9. NUEVA RPC — ADMIN GESTIONA WORKERS
-- ============================================================
--
-- Permite:
--
-- admin -> activar/desactivar worker
--
-- No permite:
--
-- admin -> otro admin
-- admin -> self
-- worker -> worker
-- worker -> admin
--
-- La tabla workers NO recibe UPDATE directo.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_set_worker_status(
    p_user_id UUID,
    p_is_active BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_target_role TEXT;
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'Usuario no autenticado.';
    END IF;

    IF NOT public.current_user_is_admin() THEN
        RAISE EXCEPTION
            'Solo un administrador puede gestionar trabajadores.';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION
            'El usuario es obligatorio.';
    END IF;

    IF p_is_active IS NULL THEN
        RAISE EXCEPTION
            'El estado del worker es obligatorio.';
    END IF;

    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION
            'No puedes modificar tu propio estado de worker.';
    END IF;

    SELECT rol
    INTO v_target_role
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'El perfil indicado no existe.';
    END IF;

    IF v_target_role = 'admin' THEN
        RAISE EXCEPTION
            'Un administrador no puede gestionar otro administrador.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.workers
        WHERE auth_user_id = p_user_id
    ) THEN
        RAISE EXCEPTION
            'El usuario indicado no es un trabajador.';
    END IF;

    UPDATE public.workers
    SET
        is_active = p_is_active,
        updated_at = CURRENT_TIMESTAMP
    WHERE auth_user_id = p_user_id;

    RETURN TRUE;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_set_worker_status(UUID, BOOLEAN)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.admin_set_worker_status(UUID, BOOLEAN)
TO authenticated;


ALTER FUNCTION public.admin_set_worker_status(UUID, BOOLEAN)
SET search_path = public, pg_temp;


-- ============================================================
-- 10. RESPOND_TO_QUOTATION — AUTH EXPLÍCITA
-- ============================================================

CREATE OR REPLACE FUNCTION public.respond_to_quotation(
    p_estado TEXT,
    p_quotation_id UUID
)
RETURNS public.quotations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_quotation public.quotations;
    v_normalized_state TEXT;
BEGIN

    -- --------------------------------------------------------
    -- AUTENTICACIÓN EXPLÍCITA
    -- --------------------------------------------------------

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'Usuario no autenticado';
    END IF;


    -- --------------------------------------------------------
    -- VALIDAR ESTADO
    -- --------------------------------------------------------

    v_normalized_state :=
        INITCAP(
            LOWER(
                TRIM(
                    COALESCE(p_estado, '')
                )
            )
        );


    IF v_normalized_state NOT IN (
        'Aceptado',
        'Rechazado'
    ) THEN
        RAISE EXCEPTION
            'Estado de respuesta no válido. Debe ser Aceptado o Rechazado';
    END IF;


    -- --------------------------------------------------------
    -- OBTENER PRESUPUESTO
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
    -- SOLO PENDIENTE
    -- --------------------------------------------------------

    IF LOWER(TRIM(v_quotation.estado)) <> 'pendiente' THEN
        RAISE EXCEPTION
            'Este presupuesto ya ha sido respondido y no puede modificarse';
    END IF;


    -- --------------------------------------------------------
    -- CONTROL DE ACCESO
    -- --------------------------------------------------------

    IF NOT public.current_user_is_worker() THEN

        IF v_quotation.company_id IS DISTINCT FROM
           public.current_user_company_id()
        THEN
            RAISE EXCEPTION
                'Acceso denegado al presupuesto';
        END IF;

    END IF;


    -- --------------------------------------------------------
    -- ACTUALIZAR
    -- --------------------------------------------------------

    UPDATE public.quotations
    SET
        estado = v_normalized_state,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_quotation.id
    RETURNING *
    INTO v_quotation;


    RETURN v_quotation;

END;
$function$;


REVOKE ALL
ON FUNCTION public.respond_to_quotation(TEXT, UUID)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.respond_to_quotation(TEXT, UUID)
TO authenticated;


ALTER FUNCTION public.respond_to_quotation(TEXT, UUID)
SET search_path = public, pg_temp;


-- ============================================================
-- 11. VALIDAR TODAS LAS CONSTRAINTS NOT VALID
-- ============================================================
--
-- Incluye:
-- - constraints de hardening existentes
-- - nueva constraint de invoices
--
-- Solo se validan constraints CHECK/FOREIGN KEY que PostgreSQL
-- mantenga marcadas como NOT VALID.
--
-- ============================================================

DO $$
DECLARE
    r RECORD;
BEGIN

    FOR r IN
        SELECT
            n.nspname AS schema_name,
            c.relname AS table_name,
            con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class c
            ON c.oid = con.conrelid
        JOIN pg_namespace n
            ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND con.convalidated = false
          AND con.contype IN ('c', 'f')
        ORDER BY c.relname, con.conname
    LOOP

        EXECUTE format(
            'ALTER TABLE %I.%I VALIDATE CONSTRAINT %I',
            r.schema_name,
            r.table_name,
            r.constraint_name
        );

    END LOOP;

END;
$$;


-- ============================================================
-- 12. VERIFICACIONES FINALES DE LA MIGRACIÓN
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- Maintenance company_id debe ser NOT NULL
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'maintenance_contracts'
      AND column_name = 'company_id'
      AND is_nullable = 'NO';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            'FINAL HARDENING failed: maintenance_contracts.company_id is nullable';
    END IF;


    -- --------------------------------------------------------
    -- Nueva FK debe existir
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_constraint
    WHERE conrelid = 'public.maintenance_contracts'::regclass
      AND conname = 'maintenance_contracts_company_id_fkey';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            'FINAL HARDENING failed: maintenance company FK missing';
    END IF;


    -- --------------------------------------------------------
    -- Ninguna constraint NOT VALID debe quedar
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_constraint con
    JOIN pg_class c
        ON c.oid = con.conrelid
    JOIN pg_namespace n
        ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND con.convalidated = false
      AND con.contype IN ('c', 'f');

    IF v_count <> 0 THEN
        RAISE EXCEPTION
            'FINAL HARDENING failed: % NOT VALID constraints remain',
            v_count;
    END IF;


    -- --------------------------------------------------------
    -- RPC worker management debe existir
    -- --------------------------------------------------------

    IF to_regprocedure(
        'public.admin_set_worker_status(uuid,boolean)'
    ) IS NULL THEN

        RAISE EXCEPTION
            'FINAL HARDENING failed: admin_set_worker_status() missing';

    END IF;


    -- --------------------------------------------------------
    -- Trigger de factura pagada
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_trigger
    WHERE tgrelid = 'public.invoices'::regclass
      AND tgname = 'invoices_protect_paid_state'
      AND NOT tgisinternal;

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            'FINAL HARDENING failed: paid invoice trigger missing';
    END IF;

END;
$$;


COMMIT;