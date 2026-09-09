BEGIN;

-- ============================================================
-- MODIRA — 026_admin_rpcs_and_stripe_catalog.sql
--
-- Corrige el hallazgo de auditoría V-03:
--
-- El servidor tRPC (server/routers/admin.ts y stripe.ts) invoca
-- objetos que NO existían en ninguna migración:
--
--   RPC:  admin_list_profiles()
--         admin_set_profile_role(uuid, text)
--         admin_set_profile_status(uuid, text)
--
--   Tablas:  stripe_products
--            stripe_prices
--            user_subscriptions
--
-- Esta migración los crea con seguridad completa:
--
--   - RPCs SECURITY DEFINER, solo administradores activos,
--     con revocación explícita para anon/authenticated.
--   - Al bloquear una cuenta se revocan sus sesiones Auth
--     (revoke_user_sessions), cerrando la ventana residual
--     identificada en la auditoría (V-04 complementario).
--   - Tablas de catálogo Stripe con RLS y lectura pública
--     restringida a registros activos (catálogo de precios).
--   - user_subscriptions sin escritura desde el frontend.
-- ============================================================


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        RAISE EXCEPTION '026 stopped: public.profiles does not exist';
    END IF;

    IF to_regprocedure('public.current_user_is_admin()') IS NULL THEN
        RAISE EXCEPTION '026 stopped: current_user_is_admin() does not exist (016 required)';
    END IF;

    IF to_regprocedure('public.revoke_user_sessions(uuid)') IS NULL THEN
        RAISE EXCEPTION '026 stopped: revoke_user_sessions(uuid) does not exist (016 required)';
    END IF;

END $$;


-- ============================================================
-- 2. RPC — LISTAR PERFILES (SOLO ADMIN ACTIVO)
-- ============================================================

DROP FUNCTION IF EXISTS public.admin_list_profiles();

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    email VARCHAR(320),
    empresa TEXT,
    company_id UUID,
    rol TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    fecha_ultimo_login TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    IF NOT public.current_user_is_admin() THEN
        RAISE EXCEPTION 'No tienes permisos para consultar perfiles.';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.nombre,
        p.email,
        p.empresa,
        p.company_id,
        p.rol,
        p.status,
        p.created_at,
        p.fecha_ultimo_login
    FROM public.profiles p
    ORDER BY p.created_at ASC;

END;
$$;

REVOKE ALL
ON FUNCTION public.admin_list_profiles()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_list_profiles()
TO authenticated;


-- ============================================================
-- 3. RPC — CAMBIAR ROL (SOLO ADMIN ACTIVO)
-- ============================================================
--
-- Reglas:
--   - El rol destino solo puede ser 'user' o 'admin'.
--   - Un administrador no puede cambiar su propio rol
--     (evita auto-degradación accidental y auto-elevación).
-- ============================================================
DROP FUNCTION IF EXISTS public.admin_set_profile_role(UUID, TEXT);
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
BEGIN

    v_caller := auth.uid();

    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    IF NOT public.current_user_is_admin() THEN
        RAISE EXCEPTION 'No tienes permisos para cambiar roles.';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'El usuario es obligatorio.';
    END IF;

    IF p_role NOT IN ('user', 'admin') THEN
        RAISE EXCEPTION 'Rol no válido.';
    END IF;

    IF p_user_id = v_caller THEN
        RAISE EXCEPTION 'No puedes cambiar tu propio rol.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = p_user_id
    ) THEN
        RAISE EXCEPTION 'El perfil indicado no existe.';
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
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_set_profile_role(UUID, TEXT)
TO authenticated;


-- ============================================================
-- 4. RPC — CAMBIAR ESTADO DE CUENTA (SOLO ADMIN ACTIVO)
-- ============================================================
--
-- Reglas:
--   - p_status solo puede ser 'active' o 'blocked'.
--   - Un administrador no puede cambiar su propio estado
--     (evita bloquearse a sí mismo).
--   - Al bloquear se revocan las sesiones Auth del usuario,
--     de modo que sus refresh tokens dejan de funcionar
--     inmediatamente (no solo al expirar el access token).
--   - No se permite bloquear al último administrador activo.
-- ============================================================
DROP FUNCTION IF EXISTS public.admin_set_profile_status(UUID, TEXT);
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
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    IF NOT public.current_user_is_admin() THEN
        RAISE EXCEPTION 'No tienes permisos para cambiar el estado de cuentas.';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'El usuario es obligatorio.';
    END IF;

    IF p_status NOT IN ('active', 'blocked') THEN
        RAISE EXCEPTION 'Estado no válido.';
    END IF;

    IF p_user_id = v_caller THEN
        RAISE EXCEPTION 'No puedes cambiar tu propio estado.';
    END IF;

    SELECT rol
    INTO v_target_role
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El perfil indicado no existe.';
    END IF;

    -- No bloquear al último administrador activo.
    IF p_status = 'blocked' AND v_target_role = 'admin' THEN

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
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_set_profile_status(UUID, TEXT)
TO authenticated;


-- ============================================================
-- 5. TABLAS DEL CATÁLOGO STRIPE
-- ============================================================
--
-- Solo lectura desde el frontend, y únicamente de registros
-- activos. La escritura pertenece a backend/service_role
-- (sincronización manual o webhook de catálogo).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stripe_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_product_id TEXT NOT NULL UNIQUE,
    name TEXT,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.stripe_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_price_id TEXT NOT NULL UNIQUE,
    stripe_product_id TEXT NOT NULL
        REFERENCES public.stripe_products(stripe_product_id)
        ON DELETE CASCADE,
    unit_amount INTEGER NOT NULL
        CONSTRAINT stripe_prices_amount_check CHECK (unit_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'eur',
    interval VARCHAR(32),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_price_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stripe_prices_product
ON public.stripe_prices(stripe_product_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user
ON public.user_subscriptions(user_id);

CREATE TRIGGER stripe_products_updated_at
BEFORE UPDATE ON public.stripe_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER stripe_prices_updated_at
BEFORE UPDATE ON public.stripe_prices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 6. RLS DEL CATÁLOGO STRIPE
-- ============================================================

ALTER TABLE public.stripe_products
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.stripe_prices
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_subscriptions
ENABLE ROW LEVEL SECURITY;

-- Catálogo visible: solo registros activos.
CREATE POLICY stripe_products_public_select
ON public.stripe_products
FOR SELECT
TO anon, authenticated
USING (active = TRUE);

CREATE POLICY stripe_prices_public_select
ON public.stripe_prices
FOR SELECT
TO anon, authenticated
USING (active = TRUE);

-- Suscripciones: solo lectura del propio usuario.
CREATE POLICY user_subscriptions_select_own
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Sin políticas de escritura para anon/authenticated:
-- la sincronización de catálogo/suscripciones corresponde a
-- service_role o a procesos internos.


-- ============================================================
-- 7. PERMISOS
-- ============================================================

GRANT SELECT
ON public.stripe_products,
   public.stripe_prices
TO anon, authenticated;

GRANT SELECT
ON public.user_subscriptions
TO authenticated;

REVOKE INSERT, UPDATE, DELETE
ON public.stripe_products,
   public.stripe_prices,
   public.user_subscriptions
FROM anon, authenticated;


-- ============================================================
-- 8. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
          'admin_list_profiles',
          'admin_set_profile_role',
          'admin_set_profile_status'
      );

    IF v_count <> 3 THEN
        RAISE EXCEPTION '026 failed: admin RPCs are incomplete';
    END IF;

    SELECT COUNT(*)
    INTO v_count
    FROM pg_class
    WHERE oid IN (
        'public.stripe_products'::regclass,
        'public.stripe_prices'::regclass,
        'public.user_subscriptions'::regclass
    )
      AND relrowsecurity = TRUE;

    IF v_count <> 3 THEN
        RAISE EXCEPTION '026 failed: Stripe catalog tables must have RLS enabled';
    END IF;

    IF has_function_privilege(
        'anon',
        'public.admin_list_profiles()',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION '026 failed: anon must not execute admin_list_profiles';
    END IF;

END $$;


COMMIT;
