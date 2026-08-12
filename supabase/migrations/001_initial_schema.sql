BEGIN;

-- ============================================================
-- MODIRA
-- 001_initial_schema.sql
-- PostgreSQL / Supabase
--
-- OBJETIVO:
-- Crear la estructura base completa de MODIRA.
--
-- IMPORTANTE:
-- - Esta migración define únicamente la estructura.
-- - La seguridad/RLS se implementa posteriormente.
-- - El registro de usuarios se implementa posteriormente.
-- - Los trabajadores se registran administrativamente.
-- - Supabase Auth es la fuente de identidad.
--
-- ESTRUCTURA:
--
-- auth.users
--      │
--      ├── profiles
--      ├── workers
--      │
--      └── datos de negocio
--
-- companies
--      │
--      ├── clients
--      ├── projects
--      ├── quotations
--      ├── invoices
--      ├── payments
--      ├── budgets
--      ├── support_tickets
--      └── automations
--
-- Además:
-- audit_requests → solicitudes públicas de auditoría
--
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

    created_by UUID
        REFERENCES auth.users(id)
        ON DELETE SET NULL,

    updated_by UUID
        REFERENCES auth.users(id)
        ON DELETE SET NULL,

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
--
-- IMPORTANTE:
-- company_id es OPCIONAL.
--
-- Esto permite desde el principio:
--
-- Cliente con empresa:
-- user_id    → usuario
-- company_id → empresa
--
-- Cliente sin empresa:
-- user_id    → usuario
-- company_id → NULL
--
-- La seguridad sobre quién puede crear/ver cada proyecto
-- se implementará en la migración de proyectos.
-- ============================================================

CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    company_id UUID
        REFERENCES public.companies(id)
        ON DELETE SET NULL,

    client_id UUID
        REFERENCES public.clients(id)
        ON DELETE SET NULL,

    nombre TEXT NOT NULL,

    descripcion TEXT,

    estado TEXT NOT NULL DEFAULT 'Pendiente',

    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMPTZ,


    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

    CONSTRAINT projects_estado_check
    CHECK (
        estado IN (
            'Pendiente',
            'Activo',
            'Pausado',
            'Entregado',
            'Completado'
        )
    )
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
--
-- numero_factura es GLOBALMENTE único.
--
-- No utilizamos:
-- UNIQUE(company_id, numero_factura)
--
-- porque MODIRA necesita identificadores de factura únicos
-- en todo el sistema.
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

    numero_factura TEXT NOT NULL UNIQUE,

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
-- 12. AUDIT REQUESTS
--
-- Solicitudes procedentes de la web pública.
--
-- La seguridad de esta tabla se definirá posteriormente.
-- ============================================================

CREATE TABLE public.audit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre TEXT NOT NULL,
    email VARCHAR(320) NOT NULL,
    empresa TEXT NOT NULL,
    empleados VARCHAR(50) NOT NULL,
    proceso TEXT NOT NULL,

    estado VARCHAR(50) NOT NULL DEFAULT 'nuevo',

    notas_internas TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 13. WORKERS
--
-- Los trabajadores se crean administrativamente.
--
-- auth.users
--     ↓
-- workers.auth_user_id
--
-- La seguridad de esta tabla se definirá en la migración 002.
-- ============================================================

CREATE TABLE public.workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    auth_user_id UUID NOT NULL UNIQUE
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    display_name TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 14. EMPRESA INICIAL DE MODIRA
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
)
ON CONFLICT (company_code) DO NOTHING;


-- ============================================================
-- 15. FUNCIÓN GENERAL updated_at
--
-- Todas las tablas con updated_at utilizan la misma función.
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
-- 16. TRIGGERS updated_at
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


CREATE TRIGGER audit_requests_updated_at
BEFORE UPDATE ON public.audit_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


CREATE TRIGGER workers_updated_at
BEFORE UPDATE ON public.workers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 17. ÍNDICES
-- ============================================================

CREATE INDEX idx_profiles_company_id
    ON public.profiles(company_id);


CREATE INDEX idx_clients_company_id
    ON public.clients(company_id);


CREATE INDEX idx_projects_user_id
    ON public.projects(user_id);


CREATE INDEX idx_projects_company_id
    ON public.projects(company_id);


CREATE INDEX idx_projects_client_id
    ON public.projects(client_id);


CREATE INDEX idx_quotations_company_id
    ON public.quotations(company_id);


CREATE INDEX idx_quotations_user_id
    ON public.quotations(user_id);


CREATE INDEX idx_quotations_client_id
    ON public.quotations(client_id);


CREATE INDEX idx_quotations_project_id
    ON public.quotations(project_id);


CREATE INDEX idx_invoices_company_id
    ON public.invoices(company_id);


CREATE INDEX idx_invoices_user_id
    ON public.invoices(user_id);


CREATE INDEX idx_invoices_client_id
    ON public.invoices(client_id);


CREATE INDEX idx_invoices_project_id
    ON public.invoices(project_id);


CREATE INDEX idx_invoices_quotation_id
    ON public.invoices(quotation_id);


CREATE INDEX idx_payments_company_id
    ON public.payments(company_id);


CREATE INDEX idx_payments_user_id
    ON public.payments(user_id);


CREATE INDEX idx_payments_invoice_id
    ON public.payments(invoice_id);


CREATE INDEX idx_payments_quotation_id
    ON public.payments(quotation_id);


CREATE INDEX idx_budgets_company_id
    ON public.budgets(company_id);


CREATE INDEX idx_budgets_user_id
    ON public.budgets(user_id);


CREATE INDEX idx_budgets_project_id
    ON public.budgets(project_id);


CREATE INDEX idx_support_tickets_company_id
    ON public.support_tickets(company_id);


CREATE INDEX idx_support_tickets_user_id
    ON public.support_tickets(user_id);


CREATE INDEX idx_automations_company_id
    ON public.automations(company_id);


CREATE INDEX idx_automations_user_id
    ON public.automations(user_id);


CREATE INDEX idx_audit_requests_created_at
    ON public.audit_requests(created_at DESC);


CREATE INDEX idx_audit_requests_estado
    ON public.audit_requests(estado);


CREATE INDEX idx_audit_requests_email
    ON public.audit_requests(email);


CREATE INDEX idx_workers_auth_user_id
    ON public.workers(auth_user_id);


-- ============================================================
-- 18. COMENTARIOS DE ESTRUCTURA
-- ============================================================

COMMENT ON TABLE public.companies IS
'Empresas/organizaciones de MODIRA. Unidad principal de aislamiento multiempresa.';


COMMENT ON TABLE public.profiles IS
'Perfil de usuario asociado a Supabase Auth y opcionalmente a una empresa.';


COMMENT ON TABLE public.clients IS
'Clientes gestionados por cada empresa de MODIRA.';


COMMENT ON TABLE public.projects IS
'Proyectos de MODIRA. Pueden pertenecer a una empresa o inicialmente solo a un usuario.';


COMMENT ON TABLE public.quotations IS
'Presupuestos comerciales de cada empresa.';


COMMENT ON TABLE public.invoices IS
'Facturas de cada empresa.';


COMMENT ON TABLE public.payments IS
'Pagos asociados a facturas o presupuestos.';


COMMENT ON TABLE public.budgets IS
'Presupuestos internos asociados a proyectos.';


COMMENT ON TABLE public.support_tickets IS
'Tickets de soporte de los clientes de MODIRA.';


COMMENT ON TABLE public.automations IS
'Automatizaciones configuradas por las empresas de MODIRA.';


COMMENT ON TABLE public.audit_requests IS
'Solicitudes de auditoría gratuita procedentes de la web pública.';


COMMENT ON TABLE public.workers IS
'Trabajadores internos de MODIRA vinculados a cuentas de Supabase Auth.';


-- ============================================================
-- 19. VERIFICACIONES FINALES
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
          'automations',
          'audit_requests',
          'workers'
      );

    IF v_tables <> 12 THEN
        RAISE EXCEPTION
            '001_initial_schema failed: expected 12 public tables, found %',
            v_tables;
    END IF;


    SELECT id
    INTO v_company_id
    FROM public.companies
    WHERE company_code = 'MODIRA-001'
    LIMIT 1;


    IF v_company_id IS NULL THEN
        RAISE EXCEPTION
            '001_initial_schema failed: MODIRA-001 was not created';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'company_id'
          AND is_nullable = 'YES'
    ) THEN
        RAISE EXCEPTION
            '001_initial_schema failed: projects.company_id must allow NULL';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.invoices'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) LIKE '%numero_factura%'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'invoices'
          AND indexdef LIKE '%UNIQUE INDEX%'
          AND indexdef LIKE '%numero_factura%'
    ) THEN
        RAISE EXCEPTION
            '001_initial_schema failed: invoices.numero_factura must be unique';
    END IF;

END $$;


COMMIT;