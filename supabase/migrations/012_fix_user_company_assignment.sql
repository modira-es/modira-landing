BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_company_id UUID;
    v_empresa TEXT;
BEGIN
    v_empresa := NULLIF(TRIM(NEW.raw_user_meta_data->>'empresa'), '');

    IF v_empresa IS NOT NULL THEN
        SELECT id
        INTO v_company_id
        FROM public.companies
        WHERE company_code = v_empresa
           OR company_name = v_empresa
        LIMIT 1;
    END IF;

    INSERT INTO public.profiles (
        id,
        nombre,
        company_id,
        rol
    )
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'nombre', ''),
            NULLIF(NEW.raw_user_meta_data->>'name', ''),
            NEW.email,
            'Usuario'
        ),
        v_company_id,
        'user'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

COMMIT;