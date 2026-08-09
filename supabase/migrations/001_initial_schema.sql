BEGIN;

-- ============================================================
-- MODIRA
-- 001_initial_schema.sql
-- PostgreSQL / Supabase
--
-- ARQUITECTURA:
-- auth.users
--      ↓
-- profiles
--      ↓
-- companies
--      ↓
-- ┌──────────┬──────────┬──────────┬──────────────┐
-- clients  projects  quotations  invoices       │
--                       │          │             │
--                       └──────────┴── payments   │
--                                                │
-- budgets / support_tickets / automations ───────┘
--
-- Supabase es la fuente de verdad.
-- No depende de Drizzle.
-- ============================================================


-- ============================================================
-- 1. EXTENSIONES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 2. COMPANIES
-- ============================================================

CREATE TABLE public.companies (
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
    country VARCHAR(2) NOT NULL DEFAULT 'ES',

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

    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    settings JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 3. PROFILES
-- ============================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    nombre TEXT NOT NULL,

    empresa TEXT,
    telefono TEXT,

    rol TEXT NOT NULL DEFAULT 'user',

    company_id UUID
        REFERENCES public.companies(id)
        ON DELETE SET NULL,

    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_ultimo_login TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT profiles_rol_check
        CHECK (rol IN ('user', 'admin'))
);


-- ============================================================
-- 4. CLIENTS
-- ============================================================

CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES public.companies(id)
        ON DELETE CASCADE,

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
    pais VARCHAR(2) DEFAULT 'ES',

    sector TEXT,
    notas TEXT,

    etiquetas JSONB NOT NULL DEFAULT '[]'::jsonb,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 5. PROJECTS
-- ============================================================

CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    company_id UUID NOT NULL
        REFERENCES public.companies(id)
        ON DELETE CASCADE,

    client_id UUID
        REFERENCES public.clients(id)
        ON DELETE SET NULL,

    nombre TEXT NOT NULL,
    descripcion TEXT,

    estado TEXT NOT NULL DEFAULT 'activo',

    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 6. QUOTATIONS
-- ============================================================

CREATE TABLE public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES public.companies(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE SET NULL,

    client_id UUID
        REFERENCES public.clients(id)
        ON DELETE SET NULL,

    numero_presupuesto TEXT NOT NULL,

    titulo TEXT NOT NULL,
    descripcion_detallada TEXT,

    servicios_incluidos JSONB NOT NULL DEFAULT '[]'::jsonb,

    precio_base NUMERIC(12,2) NOT NULL DEFAULT 0,
    iva_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 21,
    precio_total NUMERIC(12,2) NOT NULL DEFAULT 0,

    estado VARCHAR(50) NOT NULL DEFAULT 'borrador',

    fecha_emision TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_validez TIMESTAMPTZ,

    notas TEXT,

    stripe_session_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT quotations_company_number_unique
        UNIQUE (company_id, numero_presupuesto),

    CONSTRAINT quotations_price_check
        CHECK (
            precio_base >= 0
            AND iva_porcentaje >= 0
            AND precio_total >= 0
        )
);


-- ============================================================
-- 7. INVOICES
-- ============================================================

CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    company_id UUID NOT NULL
        REFERENCES public.companies(id)
        ON DELETE CASCADE,

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE SET NULL,

    client_id UUID
        REFERENCES public.clients(id)
        ON DELETE SET NULL,

    quotation_id UUID
        REFERENCES public.quotations(id)
        ON DELETE SET NULL,

    numero_factura TEXT NOT NULL,

    monto NUMERIC(12,2) NOT NULL DEFAULT 0,

    estado TEXT NOT NULL DEFAULT 'pendiente',

    fecha_emision TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento TIMESTAMPTZ,
    fecha_pago TIMESTAMPTZ,

    descripcion TEXT,

    subtotal NUMERIC(12,2),
    iva_porcentaje NUMERIC(5,2),
    iva_importe NUMERIC(12,2),

    stripe_invoice_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT invoices_company_number_unique
        UNIQUE (company_id, numero_factura),

    CONSTRAINT invoices_amount_check
        CHECK (monto >= 0)
);


-- ============================================================
-- 8. PAYMENTS
-- ============================================================

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES public.companies(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    invoice_id UUID
        REFERENCES public.invoices(id)
        ON DELETE SET NULL,

    quotation_id UUID
        REFERENCES public.quotations(id)
        ON DELETE SET NULL,

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

    CONSTRAINT payments_amount_check
        CHECK (amount >= 0)
);


-- ============================================================
-- 9. BUDGETS
-- ============================================================

CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    company_id UUID NOT NULL
        REFERENCES public.companies(id)
        ON DELETE CASCADE,

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE SET NULL,

    monto NUMERIC(12,2) NOT NULL,

    descripcion TEXT,

    estado TEXT NOT NULL DEFAULT 'pendiente',

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_aprobacion TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT budgets_amount_check
        CHECK (monto >= 0)
);


-- ============================================================
-- 10. SUPPORT TICKETS
-- ============================================================

CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    company_id UUID NOT NULL
        REFERENCES public.companies(id)
        ON DELETE CASCADE,

    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,

    estado TEXT NOT NULL DEFAULT 'abierto',
    prioridad TEXT NOT NULL DEFAULT 'normal',

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT support_tickets_estado_check
        CHECK (
            estado IN (
                'abierto',
                'en_proceso',
                'cerrado'
            )
        ),

    CONSTRAINT support_tickets_prioridad_check
        CHECK (
            prioridad IN (
                'baja',
                'normal',
                'alta',
                'urgente'
            )
        )
);


-- ============================================================
-- 11. AUTOMATIONS
-- ============================================================

CREATE TABLE public.automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    company_id UUID NOT NULL
        REFERENCES public.companies(id)
        ON DELETE CASCADE,

    nombre TEXT NOT NULL,
    descripcion TEXT,

    estado TEXT DEFAULT 'activa',
    tipo TEXT NOT NULL,

    configuracion JSONB,

    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_ultima_ejecucion TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 12. MODIRA - EMPRESA INICIAL
--
-- Se crea antes de asociar profiles.
-- created_by se deja NULL porque los usuarios pueden
-- existir ya en auth.users antes de esta migración.
-- ============================================================

INSERT INTO public.companies (
    company_code,
    company_name,
    legal_name,
    country,
    timezone,
    language,
    currency,
    is_active
)
VALUES (
    'MODIRA-001',
    'Modira',
    'Modira',
    'ES',
    'Europe/Madrid',
    'es',
    'EUR',
    TRUE
);


-- ============================================================
-- 13. CREAR PERFILES PARA USUARIOS EXISTENTES
--
-- Si ya existen usuarios en Supabase Auth, se crean aquí.
-- El email se utiliza temporalmente como nombre si no existe
-- información adicional.
-- ============================================================

INSERT INTO public.profiles (
    id,
    nombre,
    company_id,
    rol
)
SELECT
    au.id,
    COALESCE(
        NULLIF(au.raw_user_meta_data->>'nombre', ''),
        NULLIF(au.raw_user_meta_data->>'name', ''),
        au.email,
        'Usuario'
    ),
    c.id,
    'user'
FROM auth.users au
CROSS JOIN public.companies c
WHERE NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = au.id
);


-- ============================================================
-- 14. TRIGGER PARA NUEVOS USUARIOS
--
-- Todo usuario nuevo recibe inicialmente acceso a Modira.
-- En una futura fase de onboarding se podrá permitir que
-- el usuario cree/seleccione su propia empresa.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_company_id UUID;
BEGIN

    SELECT id
    INTO v_company_id
    FROM public.companies
    WHERE company_code = 'MODIRA-001'
    LIMIT 1;

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


DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 15. FUNCIÓN UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


-- ============================================================
-- 16. TRIGGERS UPDATED_AT
-- ============================================================

CREATE TRIGGER companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER quotations_updated_at
BEFORE UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER automations_updated_at
BEFORE UPDATE ON public.automations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 17. ÍNDICES
-- ============================================================

CREATE INDEX idx_profiles_company_id
    ON public.profiles(company_id);

CREATE INDEX idx_clients_company_id
    ON public.clients(company_id);

CREATE INDEX idx_projects_company_id
    ON public.projects(company_id);

CREATE INDEX idx_projects_client_id
    ON public.projects(client_id);

CREATE INDEX idx_quotations_company_id
    ON public.quotations(company_id);

CREATE INDEX idx_quotations_client_id
    ON public.quotations(client_id);

CREATE INDEX idx_quotations_project_id
    ON public.quotations(project_id);

CREATE INDEX idx_invoices_company_id
    ON public.invoices(company_id);

CREATE INDEX idx_invoices_client_id
    ON public.invoices(client_id);

CREATE INDEX idx_invoices_project_id
    ON public.invoices(project_id);

CREATE INDEX idx_invoices_quotation_id
    ON public.invoices(quotation_id);

CREATE INDEX idx_payments_company_id
    ON public.payments(company_id);

CREATE INDEX idx_payments_invoice_id
    ON public.payments(invoice_id);

CREATE INDEX idx_payments_quotation_id
    ON public.payments(quotation_id);

CREATE INDEX idx_budgets_company_id
    ON public.budgets(company_id);

CREATE INDEX idx_budgets_project_id
    ON public.budgets(project_id);

CREATE INDEX idx_support_tickets_company_id
    ON public.support_tickets(company_id);

CREATE INDEX idx_automations_company_id
    ON public.automations(company_id);


-- ============================================================
-- 18. FUNCIÓN SEGURA PARA OBTENER LA EMPRESA DEL USUARIO
--
-- IMPORTANTE:
-- SECURITY DEFINER evita la recursión RLS de profiles.
-- No hace SELECT sobre profiles desde una policy directamente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT p.company_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
    LIMIT 1;
$$;


-- ============================================================
-- 19. FUNCIÓN PARA SABER SI EL USUARIO ES ADMIN
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.rol = 'admin'
    );
$$;


-- ============================================================
-- 20. RLS
-- ============================================================

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


-- ============================================================
-- 21. COMPANIES POLICIES
-- ============================================================

CREATE POLICY companies_select_own
ON public.companies
FOR SELECT
TO authenticated
USING (
    id = public.current_user_company_id()
);

CREATE POLICY companies_update_own
ON public.companies
FOR UPDATE
TO authenticated
USING (
    id = public.current_user_company_id()
)
WITH CHECK (
    id = public.current_user_company_id()
);


-- ============================================================
-- 22. PROFILES POLICIES
--
-- No se consulta profiles dentro de la propia policy.
-- Esto evita la recursión que provocaba el error anterior.
-- ============================================================

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
);

CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
    id = auth.uid()
);

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    id = auth.uid()
)
WITH CHECK (
    id = auth.uid()
);


-- ============================================================
-- 23. CLIENTS POLICIES
-- ============================================================

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


-- ============================================================
-- 24. PROJECTS POLICIES
-- ============================================================

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


-- ============================================================
-- 25. QUOTATIONS POLICIES
-- ============================================================

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


-- ============================================================
-- 26. INVOICES POLICIES
-- ============================================================

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


-- ============================================================
-- 27. PAYMENTS POLICIES
-- ============================================================

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


-- ============================================================
-- 28. BUDGETS POLICIES
-- ============================================================

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


-- ============================================================
-- 29. SUPPORT TICKETS POLICIES
-- ============================================================

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


-- ============================================================
-- 30. AUTOMATIONS POLICIES
-- ============================================================

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


-- ============================================================
-- 31. COMMENTS
-- ============================================================

COMMENT ON TABLE public.companies IS
'Empresas/organizaciones de Modira. Unidad principal de aislamiento multiempresa.';

COMMENT ON TABLE public.profiles IS
'Perfil de usuario asociado a Supabase Auth y a una empresa.';

COMMENT ON TABLE public.clients IS
'Clientes gestionados por cada empresa de Modira.';

COMMENT ON TABLE public.projects IS
'Proyectos pertenecientes a una empresa y opcionalmente a un cliente.';

COMMENT ON TABLE public.quotations IS
'Presupuestos comerciales de cada empresa.';

COMMENT ON TABLE public.invoices IS
'Facturas de cada empresa.';

COMMENT ON TABLE public.payments IS
'Pagos asociados a facturas o presupuestos.';

COMMENT ON TABLE public.budgets IS
'Presupuestos internos/proyectos de cada empresa.';

COMMENT ON TABLE public.support_tickets IS
'Tickets de soporte de los usuarios de Modira.';

COMMENT ON TABLE public.automations IS
'Automatizaciones configuradas por empresa.';


-- ============================================================
-- 32. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_tables INTEGER;
    v_company_id UUID;
BEGIN

    SELECT COUNT(*)
    INTO v_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
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
      );

    IF v_tables <> 10 THEN
        RAISE EXCEPTION
            'Initial migration failed: expected 10 public tables, found %',
            v_tables;
    END IF;

    SELECT id
    INTO v_company_id
    FROM public.companies
    WHERE company_code = 'MODIRA-001'
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION
            'Initial migration failed: Modira company was not created';
    END IF;

END $$;


COMMIT;