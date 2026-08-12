-- ============================================================
-- MODIRA
-- 004_signup_and_companies.sql
--
-- REGISTRO DE USUARIOS Y GESTIÓN AUTOMÁTICA DE EMPRESAS
--
-- Consolida:
--   - 012_fix_user_company_assignment.sql
--   - 019_auto_create_company_on_signup.sql
--   - 020_fix_company_assignment_on_signup.sql
--   - 021_fix_company_creation_on_signup.sql
--   - 022_fix_company_code_generation.sql
--   - 023_grant_select_companies.sql
--
-- ============================================================
--
-- FLUJO FINAL:
--
-- auth.users
--      ↓
-- on_auth_user_created
--      ↓
-- handle_new_user()
--      ↓
-- ¿empresa indicada?
--      │
--      ├── NO
--      │     ↓
--      │  profiles.company_id = NULL
--      │
--      └── SÍ
--            ↓
--       ¿Existe empresa?
--            │
--       ┌────┴────┐
--       ↓         ↓
--      SÍ        NO
--       ↓         ↓
--   reutilizar   crear
--       │         │
--       └────┬────┘
--            ↓
--      profiles.company_id
--
-- ============================================================

BEGIN;


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    -- --------------------------------------------------------
    -- profiles
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
    ) THEN

        RAISE EXCEPTION
            '004 stopped: public.profiles does not exist';

    END IF;


    -- --------------------------------------------------------
    -- companies
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'companies'
    ) THEN

        RAISE EXCEPTION
            '004 stopped: public.companies does not exist';

    END IF;


    -- --------------------------------------------------------
    -- profiles.company_id
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'company_id'
    ) THEN

        RAISE EXCEPTION
            '004 stopped: profiles.company_id does not exist';

    END IF;


    -- --------------------------------------------------------
    -- profiles.empresa
    --
    -- Se mantiene porque el frontend actual utiliza este campo
    -- para conservar el nombre introducido durante el registro.
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'empresa'
    ) THEN

        RAISE EXCEPTION
            '004 stopped: profiles.empresa does not exist';

    END IF;


    -- --------------------------------------------------------
    -- companies.company_code
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'companies'
          AND column_name = 'company_code'
    ) THEN

        RAISE EXCEPTION
            '004 stopped: companies.company_code does not exist';

    END IF;


    -- --------------------------------------------------------
    -- companies.created_by
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'companies'
          AND column_name = 'created_by'
    ) THEN

        RAISE EXCEPTION
            '004 stopped: companies.created_by does not exist';

    END IF;


    -- --------------------------------------------------------
    -- companies.company_name
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'companies'
          AND column_name = 'company_name'
    ) THEN

        RAISE EXCEPTION
            '004 stopped: companies.company_name does not exist';

    END IF;


END $$;


-- ============================================================
-- 2. FUNCIÓN handle_new_user()
--
-- Esta función se ejecuta automáticamente cuando Supabase Auth
-- crea un usuario.
--
-- Es SECURITY DEFINER porque necesita crear/consultar registros
-- internos independientemente de las políticas RLS del usuario
-- que todavía se está registrando.
--
-- ============================================================
--
-- COMPORTAMIENTO:
--
-- 1. SIN EMPRESA
--
-- metadata.empresa = NULL / vacío
--          ↓
-- profiles.company_id = NULL
--
--
-- 2. EMPRESA EXISTENTE
--
-- metadata.empresa = "Empresa X"
--          ↓
-- buscar company_code
--          ↓
-- buscar company_name
--          ↓
-- reutilizar empresa
--
--
-- 3. EMPRESA NUEVA
--
-- metadata.empresa = "Empresa Nueva"
--          ↓
-- no existe
--          ↓
-- generar company_code
--          ↓
-- crear empresa
--          ↓
-- created_by = NEW.id
--          ↓
-- asociar profiles.company_id
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$

DECLARE

    v_company_id UUID;
    v_empresa TEXT;
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
    -- 2. PROCESAR EMPRESA
    -- ========================================================

    IF v_empresa IS NOT NULL THEN

        -- ====================================================
        -- 2.1 PROTEGER CONTRA REGISTROS SIMULTÁNEOS
        --
        -- Dos usuarios pueden intentar registrar al mismo
        -- tiempo la misma empresa.
        --
        -- El bloqueo dura únicamente durante esta transacción.
        -- ====================================================

        PERFORM pg_advisory_xact_lock(
            hashtextextended(
                LOWER(v_empresa),
                0
            )
        );


        -- ====================================================
        -- 2.2 BUSCAR EMPRESA EXISTENTE
        --
        -- Puede coincidir por:
        --
        --   company_code
        --   company_name
        --
        -- company_code tiene prioridad.
        --
        -- La comparación por nombre ignora mayúsculas/minúsculas
        -- y espacios exteriores.
        -- ====================================================

        SELECT id
        INTO v_company_id

        FROM public.companies

        WHERE
            company_code = v_empresa
            OR
            LOWER(TRIM(company_name)) = LOWER(v_empresa)

        ORDER BY
            CASE
                WHEN company_code = v_empresa
                    THEN 0
                ELSE 1
            END

        LIMIT 1;


        -- ====================================================
        -- 2.3 SI NO EXISTE → CREAR EMPRESA
        -- ====================================================

        IF v_company_id IS NULL THEN

            -- ------------------------------------------------
            -- Generar identificador interno único.
            --
            -- Ejemplo:
            --
            -- CLI-7F3A8C91D2E44B6A9C123456789ABCDE
            --
            -- No indica el número de empresas existentes.
            --
            -- Se utiliza gen_random_uuid() porque es compatible
            -- con el contexto del trigger de Supabase Auth.
            -- ------------------------------------------------

            v_company_code :=
                'CLI-'
                ||
                UPPER(
                    REPLACE(
                        gen_random_uuid()::TEXT,
                        '-',
                        ''
                    )
                );


            -- ------------------------------------------------
            -- Crear empresa
            --
            -- created_by = NEW.id es fundamental.
            --
            -- NEW.id es el usuario que acaba de registrarse.
            -- ------------------------------------------------

            INSERT INTO public.companies (
                company_code,
                company_name,
                legal_name,
                created_by
            )
            VALUES (
                v_company_code,
                TRIM(v_empresa),
                TRIM(v_empresa),
                NEW.id
            )
            RETURNING id
            INTO v_company_id;

        END IF;

    END IF;


    -- ========================================================
    -- 3. CREAR PROFILE
    --
    -- Si no existe empresa:
    --
    --     v_company_id = NULL
    --
    -- Esto es correcto y permite el flujo:
    --
    -- Cliente sin empresa
    --      ↓
    -- company_id NULL
    --      ↓
    -- puede crear posteriormente sus propios proyectos.
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
    -- 4. DEVOLVER USUARIO
    -- ========================================================

    RETURN NEW;

END;

$function$;


-- ============================================================
-- 3. SEGURIDAD DE handle_new_user()
--
-- El usuario final NO debe poder ejecutar directamente esta
-- función.
--
-- Solo PostgreSQL/Supabase Auth la utiliza mediante el trigger.
-- ============================================================

REVOKE ALL
ON FUNCTION public.handle_new_user()
FROM PUBLIC;


REVOKE ALL
ON FUNCTION public.handle_new_user()
FROM anon;


REVOKE ALL
ON FUNCTION public.handle_new_user()
FROM authenticated;


-- ============================================================
-- 4. TRIGGER DE SUPABASE AUTH
--
-- El trigger se ejecuta después de crear un usuario en:
--
--     auth.users
--
-- No creamos un segundo trigger.
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;


CREATE TRIGGER on_auth_user_created

AFTER INSERT
ON auth.users

FOR EACH ROW

EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 5. RLS DE COMPANIES
--
-- Activamos RLS para que el GRANT SELECT posterior no implique
-- acceso indiscriminado a todas las empresas.
--
-- La documentación de la 023 distingue explícitamente:
--
-- GRANT
--   ↓
-- permite intentar SELECT
--
-- RLS
--   ↓
-- determina qué filas pueden verse.
-- YA HECHO EN 002
-- ============================================================




-- ============================================================
-- 6. SELECT DE CLIENTES SOBRE SU EMPRESA
--
-- Un cliente autenticado puede consultar únicamente la empresa
-- asociada a su propio profile.
--
-- Los trabajadores tienen su acceso controlado por la policy
-- específica de worker de la migración 002.
-- ============================================================

DROP POLICY IF EXISTS companies_select_own
ON public.companies;


CREATE POLICY companies_select_own
ON public.companies

FOR SELECT

TO authenticated

USING (

    NOT public.current_user_is_worker()

    AND

    id = public.current_user_company_id()

);




-- ============================================================
-- 8. INSERT DIRECTO DE COMPANIES
--
-- El usuario NO necesita crear empresas directamente.
--
-- Las empresas nuevas se crean exclusivamente desde:
--
--     handle_new_user()
--
-- durante el registro.
--
-- Esto evita que el frontend pueda manipular:
--
--     created_by
--     company_code
--     company_id
--
-- directamente.
-- ============================================================

DROP POLICY IF EXISTS companies_insert
ON public.companies;


-- No se crea ninguna policy INSERT.


REVOKE INSERT
ON public.companies
FROM anon;


REVOKE INSERT
ON public.companies
FROM authenticated;


-- ============================================================
-- 9. UPDATE DIRECTO DE COMPANIES
--
-- No se permite desde el frontend mediante esta migración.
--
-- Las modificaciones administrativas de empresas se harán
-- mediante mecanismos específicos en futuras migraciones.
-- ============================================================

REVOKE UPDATE
ON public.companies
FROM anon;


REVOKE UPDATE
ON public.companies
FROM authenticated;


-- ============================================================
-- 10. DELETE DIRECTO DE COMPANIES
--
-- Una empresa no puede eliminarse desde el frontend.
-- ============================================================

REVOKE DELETE
ON public.companies
FROM anon;


REVOKE DELETE
ON public.companies
FROM authenticated;


-- ============================================================
-- 11. PERMISO SELECT
--
-- Necesario para que authenticated pueda consultar companies.
--
-- IMPORTANTE:
--
-- Esto NO permite leer todas las empresas.
--
-- RLS continúa limitando las filas.
-- YA PUESTO EN 002
-- ============================================================




-- ============================================================
-- 12. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_trigger_count INTEGER;
    v_function_count INTEGER;
    v_policy_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- Comprobar handle_new_user()
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_function_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE
        n.nspname = 'public'
        AND p.proname = 'handle_new_user';


    IF v_function_count <> 1 THEN

        RAISE EXCEPTION
            '004 failed: handle_new_user() was not created correctly';

    END IF;


    -- --------------------------------------------------------
    -- Comprobar trigger
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_trigger_count

    FROM pg_trigger

    WHERE
        tgname = 'on_auth_user_created'
        AND tgrelid = 'auth.users'::regclass
        AND NOT tgisinternal;


    IF v_trigger_count <> 1 THEN

        RAISE EXCEPTION
            '004 failed: on_auth_user_created trigger is missing';

    END IF;


    -- --------------------------------------------------------
    -- Comprobar RLS
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_class
        WHERE
            oid = 'public.companies'::regclass
            AND relrowsecurity = TRUE
    ) THEN

        RAISE EXCEPTION
            '004 failed: RLS is not enabled on companies';

    END IF;


    -- --------------------------------------------------------
    -- Comprobar policy de clientes
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_policy_count

    FROM pg_policies

    WHERE
        schemaname = 'public'
        AND tablename = 'companies'
        AND policyname = 'companies_select_own';


    IF v_policy_count <> 1 THEN

        RAISE EXCEPTION
            '004 failed: companies_select_own policy missing';

    END IF;





    -- --------------------------------------------------------
    -- Comprobar company_code UNIQUE
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE
            conrelid = 'public.companies'::regclass
            AND contype = 'u'
            AND conkey = ARRAY[
                (
                    SELECT attnum
                    FROM pg_attribute
                    WHERE
                        attrelid = 'public.companies'::regclass
                        AND attname = 'company_code'
                )
            ]::smallint[]
    ) THEN

        RAISE EXCEPTION
            '004 failed: companies.company_code must be UNIQUE';

    END IF;


END $$;


COMMIT;


-- ============================================================
-- RESULTADO FINAL
--
--
-- REGISTRO SIN EMPRESA
-- ====================
--
-- Usuario
--   ↓
-- auth.users
--   ↓
-- handle_new_user()
--   ↓
-- v_empresa = NULL
--   ↓
-- profiles.company_id = NULL
--
--
-- REGISTRO CON EMPRESA EXISTENTE
-- ==============================
--
-- Usuario
--   ↓
-- auth.users
--   ↓
-- handle_new_user()
--   ↓
-- buscar company_code / company_name
--   ↓
-- empresa encontrada
--   ↓
-- profiles.company_id = empresa.id
--
--
-- REGISTRO CON EMPRESA NUEVA
-- ===========================
--
-- Usuario
--   ↓
-- auth.users
--   ↓
-- handle_new_user()
--   ↓
-- empresa no encontrada
--   ↓
-- generar company_code
--   ↓
-- crear companies
--   ↓
-- created_by = NEW.id
--   ↓
-- profiles.company_id = nueva empresa
--
--
-- SEGURIDAD
-- =========
--
-- Frontend
--    ↓
-- NO puede crear companies directamente
--
-- Supabase Auth
--    ↓
-- handle_new_user()
--    ↓
-- crea/asigna empresa
--
-- authenticated
--    ↓
-- SELECT companies
--    ↓
-- RLS
--    ↓
-- solo filas permitidas
--
-- ============================================================