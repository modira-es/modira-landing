BEGIN;

-- ============================================================
-- MODIRA - MIGRACIÓN 020
-- CORRECCIÓN DE CREACIÓN Y ASIGNACIÓN DE EMPRESAS
-- AL REGISTRARSE
-- ============================================================
--
-- La migración 019 ya está aplicada.
--
-- Esta migración reemplaza únicamente la función
-- handle_new_user().
--
-- NO:
--   - crea un nuevo trigger
--   - modifica usuarios existentes
--   - modifica perfiles existentes
--   - elimina empresas
--
-- COMPORTAMIENTO:
--
-- 1. Cliente sin empresa:
--      company_id = NULL
--
-- 2. Cliente con empresa existente:
--      utiliza la empresa existente
--
-- 3. Cliente con empresa nueva:
--      crea la empresa
--      y la asocia al perfil
--
-- ============================================================


-- ============================================================
-- 1. REEMPLAZAR handle_new_user()
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
    -- 2. OBTENER EMPRESA DEL REGISTRO
    -- ========================================================

    v_empresa :=
        NULLIF(
            TRIM(
                NEW.raw_user_meta_data->>'empresa'
            ),
            ''
        );


    -- ========================================================
    -- 3. PROCESAR EMPRESA
    -- ========================================================

    IF v_empresa IS NOT NULL THEN

        -- ====================================================
        -- 3.1 BUSCAR EMPRESA EXISTENTE
        -- ====================================================

        SELECT id
        INTO v_company_id
        FROM public.companies
        WHERE
            company_code = v_empresa
            OR LOWER(TRIM(company_name)) = LOWER(v_empresa)
        ORDER BY
            CASE
                WHEN company_code = v_empresa THEN 0
                ELSE 1
            END
        LIMIT 1;


        -- ====================================================
        -- 3.2 SI NO EXISTE, CREAR EMPRESA
        -- ====================================================

        IF v_company_id IS NULL THEN

            -- Generar código interno único
            v_company_code :=
                'CLI-' ||
                UPPER(
                    encode(
                        gen_random_bytes(8),
                        'hex'
                    )
                );


            INSERT INTO public.companies (
                company_code,
                company_name,
                legal_name
            )
            VALUES (
                v_company_code,
                v_empresa,
                v_empresa
            )
            RETURNING id
            INTO v_company_id;

        END IF;

    END IF;


    -- ========================================================
    -- 4. CREAR PERFIL DEL USUARIO
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
    -- 5. DEVOLVER USUARIO
    -- ========================================================

    RETURN NEW;

END;

$function$;


-- ============================================================
-- 6. SEGURIDAD
-- ============================================================

REVOKE ALL
ON FUNCTION public.handle_new_user()
FROM PUBLIC;


COMMIT;
       