BEGIN;

-- ============================================================
-- MODIRA - MIGRACIÓN 019
-- CREACIÓN Y ASIGNACIÓN AUTOMÁTICA DE EMPRESA AL REGISTRARSE
-- ============================================================
--
-- OBJETIVO:
--
-- Corregir el flujo de registro de clientes para que:
--
-- 1. Empresa vacía:
--       profiles.company_id = NULL
--
-- 2. Empresa existente:
--       Se reutiliza la empresa existente.
--
-- 3. Empresa nueva:
--       Se crea automáticamente en public.companies.
--
-- Después:
--
--       auth.users
--            ↓
--       handle_new_user()
--            ↓
--       profiles.company_id
--            ↓
--       projects.company_id
--
-- La empresa queda asociada al perfil del cliente.
--
-- IMPORTANTE:
--
-- Los trabajadores de MODIRA NO utilizan este flujo.
-- Los trabajadores se gestionan mediante public.workers.
--
-- ============================================================


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    -- Comprobar profiles
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
    ) THEN

        RAISE EXCEPTION
        'Migration 019 stopped: public.profiles does not exist';

    END IF;


    -- Comprobar companies
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'companies'
    ) THEN

        RAISE EXCEPTION
        'Migration 019 stopped: public.companies does not exist';

    END IF;


    -- Comprobar columna company_id
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'company_id'
    ) THEN

        RAISE EXCEPTION
        'Migration 019 stopped: profiles.company_id does not exist';

    END IF;


    -- Comprobar columna empresa
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'empresa'
    ) THEN

        RAISE EXCEPTION
        'Migration 019 stopped: profiles.empresa does not exist';

    END IF;


    -- Comprobar trigger de nuevos usuarios
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
          AND tgrelid = 'auth.users'::regclass
    ) THEN

        RAISE EXCEPTION
        'Migration 019 stopped: on_auth_user_created trigger does not exist';

    END IF;

END $$;


-- ============================================================
-- 2. REDEFINIR handle_new_user()
-- ============================================================
--
-- La función anterior de la 012 solamente buscaba la empresa.
--
-- Ahora:
--
--     Empresa existente → reutilizar
--
--     Empresa inexistente → crear
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$

DECLARE

    v_company_id UUID;
    v_empresa TEXT;
    v_company_name TEXT;
    v_company_code TEXT;

BEGIN

    -- ========================================================
    -- 1. OBTENER EMPRESA DEL REGISTRO
    -- ========================================================

    v_empresa :=
        NULLIF(
            TRIM(
                NEW.raw_user_meta_data->>'empresa'
            ),
            ''
        );


    -- ========================================================
    -- 2. SI EL USUARIO HA INDICADO EMPRESA
    -- ========================================================

    IF v_empresa IS NOT NULL THEN

        -- ====================================================
        -- Normalizamos el nombre
        -- ====================================================

        v_company_name := TRIM(v_empresa);


        -- ====================================================
        -- Evitamos que dos registros simultáneos creen
        -- accidentalmente dos empresas con el mismo nombre.
        --
        -- El bloqueo se realiza únicamente durante esta
        -- transacción y sobre el nombre normalizado.
        -- ====================================================

        PERFORM pg_advisory_xact_lock(
            hashtextextended(
                LOWER(v_company_name),
                0
            )
        );


        -- ====================================================
        -- 3. BUSCAR EMPRESA EXISTENTE
        -- ====================================================
        --
        -- Puede coincidir con:
        --
        -- company_code
        -- company_name
        --
        -- La comparación por nombre no distingue mayúsculas
        -- y minúsculas.
        -- ====================================================

        SELECT id
        INTO v_company_id
        FROM public.companies
        WHERE company_code = v_company_name
           OR LOWER(TRIM(company_name)) = LOWER(v_company_name)
        ORDER BY
            CASE
                WHEN company_code = v_company_name THEN 0
                ELSE 1
            END
        LIMIT 1;


        -- ====================================================
        -- 4. SI NO EXISTE → CREAR EMPRESA
        -- ====================================================

        IF v_company_id IS NULL THEN

            -- ------------------------------------------------
            -- Código interno único para la empresa.
            --
            -- Ejemplo:
            --
            -- CLI-A81F4C92D13B7E20
            --
            -- No representa el número de empresas existentes.
            -- ------------------------------------------------

            v_company_code :=
                'CLI-'
                || UPPER(
                    encode(
                        gen_random_bytes(8),
                        'hex'
                    )
                );


            INSERT INTO public.companies (
                company_code,
                company_name,
                legal_name,
                country,
                timezone,
                language,
                currency,
                is_active,
                created_by
            )
            VALUES (
                v_company_code,
                v_company_name,
                v_company_name,
                'ES',
                'Europe/Madrid',
                'es',
                'EUR',
                TRUE,
                NEW.id
            )
            RETURNING id
            INTO v_company_id;

        END IF;

    END IF;


    -- ========================================================
    -- 5. CREAR PERFIL
    -- ========================================================
    --
    -- Se guarda:
    --
    -- nombre
    -- empresa introducida
    -- company_id
    -- rol = user
    --
    -- ========================================================

    INSERT INTO public.profiles (
        id,
        nombre,
        empresa,
        company_id,
        rol
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

        'user'
    )

    ON CONFLICT (id) DO NOTHING;


    -- ========================================================
    -- 6. DEVOLVER USUARIO
    -- ========================================================

    RETURN NEW;

END;
$$;


-- ============================================================
-- 3. SEGURIDAD DE LA FUNCIÓN
-- ============================================================
--
-- La función se ejecuta como SECURITY DEFINER porque necesita
-- poder crear una empresa y actualizar la asociación del perfil
-- independientemente de las políticas RLS del usuario.
--
-- El usuario NO obtiene permisos directos para crear empresas.
--
-- ============================================================

REVOKE ALL
ON FUNCTION public.handle_new_user()
FROM PUBLIC;


-- ============================================================
-- 4. VERIFICACIÓN FINAL
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
          ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'handle_new_user'
    ) THEN

        RAISE EXCEPTION
        'Migration 019 failed: handle_new_user() was not created';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
          AND tgrelid = 'auth.users'::regclass
    ) THEN

        RAISE EXCEPTION
        'Migration 019 failed: on_auth_user_created trigger is missing';

    END IF;

END $$;


COMMIT;