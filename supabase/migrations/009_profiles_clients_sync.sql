BEGIN;

-- ============================================================
-- MODIRA — 009_profiles_clients_sync.sql
-- ============================================================
--
-- OBJETIVO
--
-- Sincronizar los perfiles de usuarios de Modira con la tabla
-- public.clients.
--
-- Problema que resuelve:
--
-- Un usuario puede registrarse indicando:
--   - nombre
--   - email
--   - empresa
--   - teléfono
--
-- pero actualmente el registro se guarda en public.profiles y
-- NO se crea automáticamente un registro correspondiente en
-- public.clients.
--
-- Esto provoca que EmployeeArea no encuentre ningún cliente
-- asociado a la empresa al crear un presupuesto.
--
-- Esta migración:
--
-- 1. Añade clients.profile_id.
-- 2. Vincula clientes existentes con perfiles existentes.
-- 3. Crea clientes para perfiles que todavía no tengan uno.
-- 4. Sincroniza automáticamente los datos del perfil con clients.
-- 5. Permite a los workers consultar clients.
-- 6. NO permite a los workers modificar/eliminar clients.
--
-- NO modifica:
--   - 001_core_schema.sql
--   - 002_security_auth_and_rls.sql
--   - quotations
--   - projects
--   - invoices
--   - budgets
--   - payments
--   - automatizaciones
--   - soporte
-- ============================================================


-- ============================================================
-- 1. AÑADIR RELACIÓN clients -> profiles
-- ============================================================

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS profile_id UUID;


-- ============================================================
-- 2. CREAR FOREIGN KEY SI TODAVÍA NO EXISTE
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.clients'::regclass
          AND conname = 'clients_profile_id_fkey'
    ) THEN

        ALTER TABLE public.clients
        ADD CONSTRAINT clients_profile_id_fkey
        FOREIGN KEY (profile_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;

    END IF;

END $$;


-- ============================================================
-- 3. ÍNDICE PARA profile_id
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_clients_profile_id
ON public.clients(profile_id);


-- ============================================================
-- 4. FUNCIÓN AUXILIAR PARA CREAR/SINCRONIZAR CLIENTES
-- ============================================================
--
-- Esta función se ejecutará mediante trigger cuando:
--
--   INSERT INTO profiles
--
-- o cuando cambien datos relevantes del perfil.
--
-- La función es SECURITY DEFINER para que pueda realizar la
-- sincronización independientemente de las políticas RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_profile_to_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_client_id UUID;
BEGIN

    -- --------------------------------------------------------
    -- Solo sincronizamos usuarios normales.
    --
    -- Los workers de Modira no deben convertirse
    -- automáticamente en clientes.
    -- --------------------------------------------------------

    IF NEW.rol <> 'user' THEN
        RETURN NEW;
    END IF;


    -- --------------------------------------------------------
    -- Si el perfil todavía no tiene empresa asociada,
    -- no podemos crear un cliente dentro de una empresa.
    -- --------------------------------------------------------

    IF NEW.company_id IS NULL THEN
        RETURN NEW;
    END IF;


    -- --------------------------------------------------------
    -- 1. Buscar primero un cliente ya vinculado directamente
    --    al perfil.
    -- --------------------------------------------------------

    SELECT c.id
    INTO v_client_id
    FROM public.clients c
    WHERE c.profile_id = NEW.id
    LIMIT 1;


    -- --------------------------------------------------------
    -- 2. Si todavía no existe vínculo, intentar encontrar un
    --    cliente existente por empresa + email.
    --
    --    Esto evita crear duplicados para usuarios/clientes que
    --    ya existían antes de ejecutar esta migración.
    -- --------------------------------------------------------

    IF v_client_id IS NULL
       AND NEW.email IS NOT NULL
    THEN

        SELECT c.id
        INTO v_client_id
        FROM public.clients c
        WHERE c.company_id = NEW.company_id
          AND c.profile_id IS NULL
          AND c.email IS NOT NULL
          AND LOWER(TRIM(c.email)) = LOWER(TRIM(NEW.email))
        ORDER BY c.created_at ASC
        LIMIT 1;

    END IF;


    -- --------------------------------------------------------
    -- 3. Si encontramos un cliente existente, vincularlo y
    --    actualizar únicamente los datos procedentes del
    --    perfil.
    --
    --    NO modificamos:
    --      contacto_principal
    --      cif_vat
    --      direccion
    --      codigo_postal
    --      ciudad
    --      provincia
    --      pais
    --      sector
    --      notas
    --      etiquetas
    --      is_active
    --
    --    Esos campos pueden ser gestionados desde la zona
    --    correspondiente de clientes.
    -- --------------------------------------------------------

    IF v_client_id IS NOT NULL THEN

        UPDATE public.clients
        SET
            profile_id = NEW.id,
            company_id = NEW.company_id,
            nombre = NEW.nombre,
            empresa = NEW.empresa,
            email = NEW.email,
            telefono = NEW.telefono,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_client_id;


        RETURN NEW;

    END IF;


    -- --------------------------------------------------------
    -- 4. Si no existe ningún cliente, crearlo.
    -- --------------------------------------------------------

    INSERT INTO public.clients (
        profile_id,
        company_id,
        nombre,
        empresa,
        email,
        telefono,
        is_active
    )
    VALUES (
        NEW.id,
        NEW.company_id,
        NEW.nombre,
        NEW.empresa,
        NEW.email,
        NEW.telefono,
        TRUE
    );


    RETURN NEW;

END;
$$;


-- ============================================================
-- 5. PERMISOS DE LA FUNCIÓN
-- ============================================================
--
-- El trigger es el encargado de ejecutarla.
-- No queremos que un usuario pueda llamarla manualmente.
-- ============================================================

REVOKE ALL
ON FUNCTION public.sync_profile_to_client()
FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 6. TRIGGER DE SINCRONIZACIÓN
-- ============================================================
--
-- Se ejecuta:
--
--   - al crear un perfil
--   - al cambiar nombre
--   - al cambiar email
--   - al cambiar empresa
--   - al cambiar teléfono
--   - al cambiar company_id
--   - al cambiar rol
--
-- Esto permite que el cliente permanezca sincronizado.
-- ============================================================

DROP TRIGGER IF EXISTS profiles_sync_client
ON public.profiles;


CREATE TRIGGER profiles_sync_client
AFTER INSERT OR UPDATE OF
    nombre,
    email,
    empresa,
    telefono,
    company_id,
    rol
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_to_client();


-- ============================================================
-- 7. BACKFILL DE CLIENTES EXISTENTES
-- ============================================================
--
-- Esta parte es MUY importante.
--
-- Los usuarios que ya existen antes de ejecutar la 009 no
-- pasarán por el trigger INSERT de profiles.
--
-- Por eso recorremos los perfiles existentes y:
--
--   a) vinculamos un cliente existente si encontramos uno
--   b) creamos uno si no existe.
--
-- Solo se procesan perfiles:
--
--   rol = user
--   company_id IS NOT NULL
--
-- Los workers quedan fuera.
-- ============================================================

DO $$
DECLARE
    v_profile RECORD;
    v_client_id UUID;
BEGIN

    FOR v_profile IN
        SELECT
            p.id,
            p.nombre,
            p.email,
            p.empresa,
            p.telefono,
            p.company_id,
            p.rol
        FROM public.profiles p
        WHERE p.rol = 'user'
          AND p.company_id IS NOT NULL
    LOOP

        v_client_id := NULL;


        -- ----------------------------------------------------
        -- Buscar cliente ya vinculado
        -- ----------------------------------------------------

        SELECT c.id
        INTO v_client_id
        FROM public.clients c
        WHERE c.profile_id = v_profile.id
        LIMIT 1;


        -- ----------------------------------------------------
        -- Si no está vinculado, buscar por empresa + email
        -- ----------------------------------------------------

        IF v_client_id IS NULL
           AND v_profile.email IS NOT NULL
        THEN

            SELECT c.id
            INTO v_client_id
            FROM public.clients c
            WHERE c.company_id = v_profile.company_id
              AND c.profile_id IS NULL
              AND c.email IS NOT NULL
              AND LOWER(TRIM(c.email)) =
                  LOWER(TRIM(v_profile.email))
            ORDER BY c.created_at ASC
            LIMIT 1;

        END IF;


        -- ----------------------------------------------------
        -- Si existe, vincular y sincronizar
        -- ----------------------------------------------------

        IF v_client_id IS NOT NULL THEN

            UPDATE public.clients
            SET
                profile_id = v_profile.id,
                company_id = v_profile.company_id,
                nombre = v_profile.nombre,
                empresa = v_profile.empresa,
                email = v_profile.email,
                telefono = v_profile.telefono,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_client_id;


        ELSE

            -- ------------------------------------------------
            -- Si no existe, crear cliente
            -- ------------------------------------------------

            INSERT INTO public.clients (
                profile_id,
                company_id,
                nombre,
                empresa,
                email,
                telefono,
                is_active
            )
            VALUES (
                v_profile.id,
                v_profile.company_id,
                v_profile.nombre,
                v_profile.empresa,
                v_profile.email,
                v_profile.telefono,
                TRUE
            );

        END IF;

    END LOOP;

END $$;


-- ============================================================
-- 8. ÍNDICE ÚNICO PARA EVITAR DOS CLIENTES DEL MISMO PERFIL
-- ============================================================
--
-- profile_id es NULL para clientes independientes.
--
-- PostgreSQL permite múltiples NULL en un índice UNIQUE,
-- por lo que los clientes manuales seguirán funcionando
-- correctamente.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_profile_id_unique
ON public.clients(profile_id)
WHERE profile_id IS NOT NULL;


-- ============================================================
-- 9. ACCESO DE WORKERS A CLIENTS
-- ============================================================
--
-- 002 creó:
--
--   clients_company_access
--
-- pero esa política contiene:
--
--   NOT current_user_is_worker()
--
-- Por tanto, un worker NO puede consultar clients.
--
-- NO modificamos la política existente porque sigue siendo
-- correcta para los usuarios normales.
--
-- Añadimos una política independiente exclusivamente para
-- SELECT de workers.
-- ============================================================

DROP POLICY IF EXISTS clients_worker_select
ON public.clients;


CREATE POLICY clients_worker_select
ON public.clients
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 10. COMPROBAR QUE RLS SIGUE ACTIVO
-- ============================================================

ALTER TABLE public.clients
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 11. COMENTARIOS
-- ============================================================

COMMENT ON COLUMN public.clients.profile_id
IS
'Perfil de usuario de Modira asociado al cliente. NULL para clientes creados manualmente sin perfil de usuario.';


COMMENT ON FUNCTION public.sync_profile_to_client()
IS
'Sincroniza automáticamente perfiles de usuarios de Modira con sus clientes asociados.';


-- ============================================================
-- 12. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- Verificar profile_id
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'clients'
          AND column_name = 'profile_id'
    ) THEN

        RAISE EXCEPTION
            '009 failed: clients.profile_id was not created';

    END IF;


    -- --------------------------------------------------------
    -- Verificar foreign key
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.clients'::regclass
          AND conname = 'clients_profile_id_fkey'
    ) THEN

        RAISE EXCEPTION
            '009 failed: clients_profile_id_fkey is missing';

    END IF;


    -- --------------------------------------------------------
    -- Verificar función
    -- --------------------------------------------------------

    IF to_regprocedure(
        'public.sync_profile_to_client()'
    ) IS NULL THEN

        RAISE EXCEPTION
            '009 failed: sync_profile_to_client() is missing';

    END IF;


    -- --------------------------------------------------------
    -- Verificar trigger
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'profiles_sync_client'
          AND tgrelid = 'public.profiles'::regclass
          AND NOT tgisinternal
    ) THEN

        RAISE EXCEPTION
            '009 failed: profiles_sync_client trigger is missing';

    END IF;


    -- --------------------------------------------------------
    -- Verificar índice único
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'clients'
          AND indexname = 'idx_clients_profile_id_unique'
    ) THEN

        RAISE EXCEPTION
            '009 failed: clients profile unique index is missing';

    END IF;


    -- --------------------------------------------------------
    -- Verificar política worker
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'clients_worker_select';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '009 failed: clients_worker_select policy is missing';

    END IF;


    -- --------------------------------------------------------
    -- Verificar política original de clientes
    -- --------------------------------------------------------
    --
    -- Nos aseguramos de que la política de 002 sigue existiendo.
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'clients_company_access';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '009 failed: original clients_company_access policy is missing';

    END IF;


END $$;


-- ============================================================
-- 13. RESUMEN DE SEGURIDAD
-- ============================================================
--
-- Usuarios normales:
--
--   SELECT clients:
--       permitido únicamente para su company_id
--
--   INSERT/UPDATE/DELETE clients:
--       permitido según la política existente de 002
--
-- Workers:
--
--   SELECT clients:
--       permitido
--
--   INSERT clients:
--       NO permitido por RLS
--
--   UPDATE clients:
--       NO permitido por RLS
--
--   DELETE clients:
--       NO permitido por RLS
--
-- El trigger SECURITY DEFINER puede sincronizar los clientes
-- automáticamente sin abrir permisos adicionales al usuario.
-- ============================================================


COMMIT;