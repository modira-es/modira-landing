BEGIN;

-- ============================================================
-- MODIRA - MIGRACIÓN 022
-- CORRECCIÓN DE GENERACIÓN DEL CÓDIGO DE EMPRESA
-- ============================================================
--
-- La migración 021 utilizaba gen_random_bytes(8) para generar
-- company_code.
--
-- En el contexto del trigger de Supabase Auth esa función no
-- está disponible, provocando:
--
--   function gen_random_bytes(integer) does not exist
--
-- Esta migración sustituye esa generación por gen_random_uuid(),
-- que ya está disponible en la base de datos.
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
        -- 2.1 BUSCAR EMPRESA EXISTENTE
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
        -- 2.2 SI NO EXISTE, CREAR EMPRESA
        -- ====================================================

        IF v_company_id IS NULL THEN

            -- =================================================
            -- Generar código interno único usando UUID.
            --
            -- Ejemplo:
            --
            -- CLI-7F3A8C91D2E44B6A9C123456789ABCDE
            --
            -- No indica cuántas empresas existen.
            -- =================================================

            v_company_code :=
                'CLI-' ||
                UPPER(
                    REPLACE(
                        gen_random_uuid()::text,
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
                v_empresa,
                v_empresa,
                NEW.id
            )
            RETURNING id
            INTO v_company_id;

        END IF;

    END IF;


    -- ========================================================
    -- 3. CREAR PERFIL
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
    -- 4. FINALIZAR
    -- ========================================================

    RETURN NEW;

END;

$function$;


-- ============================================================
-- 5. SEGURIDAD
-- ============================================================

REVOKE ALL
ON FUNCTION public.handle_new_user()
FROM PUBLIC;


COMMIT;