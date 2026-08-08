BEGIN;

-- =========================================================
-- MODIRA - MIGRACIÓN 001
-- Arquitectura multiempresa sobre Supabase PostgreSQL
--
-- IMPORTANTE:
-- - No elimina tablas.
-- - No elimina datos.
-- - Conserva user_id en las tablas existentes.
-- - Añade company_id para preparar el modelo multiempresa.
-- =========================================================


-- =========================================================
-- 1. EXTENSIONES
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =========================================================
-- 2. COMPANIES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_code VARCHAR(50) NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    legal_name TEXT,
    cif_vat TEXT,
    billing_email VARCHAR(320),
    phone TEXT,
    website TEXT,
    logo_url TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    province TEXT,
    country TEXT DEFAULT 'ES',
    industry TEXT,
    employees INTEGER,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Madrid',
    language VARCHAR(10) NOT NULL DEFAULT 'es',
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    stripe_customer_id TEXT,
    subscription_plan TEXT,
    subscription_status VARCHAR(50),
    trial_ends_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID,
    updated_by UUID,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 3. PROFILES → COMPANY
-- =========================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_id UUID;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'profiles_company_id_fkey'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE SET NULL;
    END IF;
END $$;


-- =========================================================
-- 4. CREAR EMPRESA INICIAL
--
-- Se crea únicamente si todavía no existe ninguna company.
-- Los perfiles existentes se asocian a ella.
-- =========================================================

DO $$
DECLARE
    v_company_id UUID;
    v_profile_id UUID;
BEGIN

    SELECT id
    INTO v_company_id
    FROM public.companies
    ORDER BY created_at
    LIMIT 1;

    IF v_company_id IS NULL THEN

        SELECT id
        INTO v_profile_id
        FROM public.profiles
        ORDER BY created_at
        LIMIT 1;

        INSERT INTO public.companies (
            company_code,
            company_name,
            legal_name,
            created_by,
            updated_by
        )
        VALUES (
            'MODIRA-001',
            'Modira',
            'Modira',
            v_profile_id,
            v_profile_id
        )
        RETURNING id INTO v_company_id;

    END IF;

    UPDATE public.profiles
    SET company_id = v_company_id
    WHERE company_id IS NULL;

END $$;


-- =========================================================
-- 5. CLIENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    nombre TEXT NOT NULL,
    empresa TEXT,
    email VARCHAR(320),
    telefono TEXT,
    contacto_principal TEXT,
    cif_vat TEXT,
    direccion TEXT,
    codigo_postal TEXT,
    ciudad TEXT,
    provincia TEXT,
    pais TEXT DEFAULT 'ES',
    sector TEXT,
    notas TEXT,
    etiquetas JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT clients_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 6. QUOTATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID NOT NULL,
    project_id UUID,
    client_id UUID,
    numero_presupuesto TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descripcion_detallada TEXT,
    servicios_incluidos JSONB NOT NULL DEFAULT '[]'::jsonb,
    precio_base NUMERIC(12,2) NOT NULL DEFAULT 0,
    iva_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 21,
    precio_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado VARCHAR(50) NOT NULL DEFAULT 'borrador',
    fecha_emision TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_validez TIMESTAMPTZ,
    notas TEXT,
    stripe_session_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT quotations_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE,

    CONSTRAINT quotations_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT quotations_project_id_fkey
        FOREIGN KEY (project_id)
        REFERENCES public.projects(id)
        ON DELETE SET NULL,

    CONSTRAINT quotations_client_id_fkey
        FOREIGN KEY (client_id)
        REFERENCES public.clients(id)
        ON DELETE SET NULL,

    CONSTRAINT quotations_company_number_unique
        UNIQUE (company_id, numero_presupuesto)
);


-- =========================================================
-- 7. PAYMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID NOT NULL,
    invoice_id UUID,
    stripe_invoice_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    amount INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(50) NOT NULL,
    description TEXT,
    paid_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT payments_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE,

    CONSTRAINT payments_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT payments_invoice_id_fkey
        FOREIGN KEY (invoice_id)
        REFERENCES public.invoices(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 8. COMPANY_ID EN TABLAS EXISTENTES
-- =========================================================

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS company_id UUID;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS company_id UUID;

ALTER TABLE public.budgets
ADD COLUMN IF NOT EXISTS company_id UUID;

ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS company_id UUID;

ALTER TABLE public.automations
ADD COLUMN IF NOT EXISTS company_id UUID;


-- =========================================================
-- 9. RELLENAR COMPANY_ID DE DATOS EXISTENTES
--
-- Se obtiene la company a través del user_id actual.
-- =========================================================

UPDATE public.projects p
SET company_id = pr.company_id
FROM public.profiles pr
WHERE p.user_id = pr.id
  AND p.company_id IS NULL;

UPDATE public.invoices i
SET company_id = pr.company_id
FROM public.profiles pr
WHERE i.user_id = pr.id
  AND i.company_id IS NULL;

UPDATE public.budgets b
SET company_id = pr.company_id
FROM public.profiles pr
WHERE b.user_id = pr.id
  AND b.company_id IS NULL;

UPDATE public.support_tickets s
SET company_id = pr.company_id
FROM public.profiles pr
WHERE s.user_id = pr.id
  AND s.company_id IS NULL;

UPDATE public.automations a
SET company_id = pr.company_id
FROM public.profiles pr
WHERE a.user_id = pr.id
  AND a.company_id IS NULL;


-- =========================================================
-- 10. FOREIGN KEYS DE TABLAS EXISTENTES
-- =========================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'projects_company_id_fkey'
    ) THEN
        ALTER TABLE public.projects
        ADD CONSTRAINT projects_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'invoices_company_id_fkey'
    ) THEN
        ALTER TABLE public.invoices
        ADD CONSTRAINT invoices_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'budgets_company_id_fkey'
    ) THEN
        ALTER TABLE public.budgets
        ADD CONSTRAINT budgets_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'support_tickets_company_id_fkey'
    ) THEN
        ALTER TABLE public.support_tickets
        ADD CONSTRAINT support_tickets_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'automations_company_id_fkey'
    ) THEN
        ALTER TABLE public.automations
        ADD CONSTRAINT automations_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE;
    END IF;

END $$;


-- =========================================================
-- 11. COMPROBAR QUE LOS DATOS EXISTENTES TIENEN COMPANY
-- =========================================================

DO $$
BEGIN

    IF EXISTS (
        SELECT 1
        FROM public.projects
        WHERE company_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Migration stopped: projects contains rows without company_id';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.invoices
        WHERE company_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Migration stopped: invoices contains rows without company_id';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.budgets
        WHERE company_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Migration stopped: budgets contains rows without company_id';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.support_tickets
        WHERE company_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Migration stopped: support_tickets contains rows without company_id';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.automations
        WHERE company_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Migration stopped: automations contains rows without company_id';
    END IF;

END $$;


-- =========================================================
-- 12. ÍNDICES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_profiles_company_id
ON public.profiles(company_id);

CREATE INDEX IF NOT EXISTS idx_clients_company_id
ON public.clients(company_id);

CREATE INDEX IF NOT EXISTS idx_projects_company_id
ON public.projects(company_id);

CREATE INDEX IF NOT EXISTS idx_invoices_company_id
ON public.invoices(company_id);

CREATE INDEX IF NOT EXISTS idx_quotations_company_id
ON public.quotations(company_id);

CREATE INDEX IF NOT EXISTS idx_payments_company_id
ON public.payments(company_id);

CREATE INDEX IF NOT EXISTS idx_budgets_company_id
ON public.budgets(company_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_company_id
ON public.support_tickets(company_id);

CREATE INDEX IF NOT EXISTS idx_automations_company_id
ON public.automations(company_id);


-- =========================================================
-- 13. FUNCIÓN PARA UPDATED_AT
-- =========================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


-- =========================================================
-- 14. TRIGGERS UPDATED_AT
-- =========================================================

DROP TRIGGER IF EXISTS companies_updated_at
ON public.companies;

CREATE TRIGGER companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS clients_updated_at
ON public.clients;

CREATE TRIGGER clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS quotations_updated_at
ON public.quotations;

CREATE TRIGGER quotations_updated_at
BEFORE UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS payments_updated_at
ON public.payments;

CREATE TRIGGER payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =========================================================
-- 15. FUNCIÓN RLS
-- =========================================================

CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT company_id
    FROM public.profiles
    WHERE id = auth.uid()
      AND company_id IS NOT NULL
    LIMIT 1;
$$;


-- =========================================================
-- 16. RLS
-- =========================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- 17. ELIMINAR POLÍTICAS ANTERIORES
--
-- Solo para estas tablas. No afecta a los datos.
-- =========================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'companies',
              'profiles',
              'clients',
              'projects',
              'quotations',
              'invoices',
              'payments',
              'budgets',
              'support_tickets',
              'automations'
          )
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname,
            r.schemaname,
            r.tablename
        );
    END LOOP;
END $$;


-- =========================================================
-- 18. POLÍTICAS COMPANIES
-- =========================================================

CREATE POLICY companies_select
ON public.companies
FOR SELECT
TO authenticated
USING (
    id = public.current_user_company_id()
);

CREATE POLICY companies_insert
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid()
);

CREATE POLICY companies_update
ON public.companies
FOR UPDATE
TO authenticated
USING (
    id = public.current_user_company_id()
)
WITH CHECK (
    id = public.current_user_company_id()
);


-- =========================================================
-- 19. POLÍTICAS PROFILES
-- =========================================================

CREATE POLICY profiles_select
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
    OR (
        company_id IS NOT NULL 
        AND company_id IN (
            SELECT p.company_id 
            FROM public.profiles p 
            WHERE p.id = auth.uid()
        )
    )
);

CREATE POLICY profiles_insert
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
    id = auth.uid()
);

CREATE POLICY profiles_update
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    id = auth.uid()
)
WITH CHECK (
    id = auth.uid()
);


-- =========================================================
-- 20. POLÍTICAS TABLAS MULTIEMPRESA
-- =========================================================

CREATE POLICY clients_company_access
ON public.clients
FOR ALL
TO authenticated
USING (
    company_id = public.current_user_company_id()
)
WITH CHECK (
    company_id = public.current_user_company_id()
);


CREATE POLICY projects_company_access
ON public.projects
FOR ALL
TO authenticated
USING (
    company_id = public.current_user_company_id()
)
WITH CHECK (
    company_id = public.current_user_company_id()
);


CREATE POLICY quotations_company_access
ON public.quotations
FOR ALL
TO authenticated
USING (
    company_id = public.current_user_company_id()
)
WITH CHECK (
    company_id = public.current_user_company_id()
);


CREATE POLICY invoices_company_access
ON public.invoices
FOR ALL
TO authenticated
USING (
    company_id = public.current_user_company_id()
)
WITH CHECK (
    company_id = public.current_user_company_id()
);


CREATE POLICY payments_company_access
ON public.payments
FOR ALL
TO authenticated
USING (
    company_id = public.current_user_company_id()
)
WITH CHECK (
    company_id = public.current_user_company_id()
);


CREATE POLICY budgets_company_access
ON public.budgets
FOR ALL
TO authenticated
USING (
    company_id = public.current_user_company_id()
)
WITH CHECK (
    company_id = public.current_user_company_id()
);


CREATE POLICY support_tickets_company_access
ON public.support_tickets
FOR ALL
TO authenticated
USING (
    company_id = public.current_user_company_id()
)
WITH CHECK (
    company_id = public.current_user_company_id()
);


CREATE POLICY automations_company_access
ON public.automations
FOR ALL
TO authenticated
USING (
    company_id = public.current_user_company_id()
)
WITH CHECK (
    company_id = public.current_user_company_id()
);


COMMIT;