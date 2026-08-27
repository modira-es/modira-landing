BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.companies (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 company_code VARCHAR(50) NOT NULL UNIQUE,
 company_name TEXT NOT NULL,
 legal_name TEXT, cif_vat TEXT, billing_email VARCHAR(320), phone TEXT,
 website TEXT, logo_url TEXT, address TEXT, postal_code TEXT, city TEXT,
 province TEXT, country VARCHAR(2) NOT NULL DEFAULT 'ES', industry TEXT,
 employees INTEGER, timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Madrid',
 language VARCHAR(10) NOT NULL DEFAULT 'es', currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
 stripe_customer_id TEXT, subscription_plan TEXT, subscription_status VARCHAR(50),
 trial_ends_at TIMESTAMPTZ, created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.profiles (
 id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 nombre TEXT NOT NULL, email VARCHAR(320), empresa TEXT, telefono TEXT,
 rol TEXT NOT NULL DEFAULT 'user',
 company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
 fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_ultimo_login TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT profiles_rol_check CHECK (rol IN ('user','admin'))
);

CREATE TABLE public.clients (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 nombre TEXT NOT NULL, empresa TEXT, email VARCHAR(320), telefono TEXT,
 contacto_principal TEXT, cif_vat TEXT, direccion TEXT, codigo_postal TEXT,
 ciudad TEXT, provincia TEXT, pais VARCHAR(2) DEFAULT 'ES', sector TEXT,
 notas TEXT, etiquetas JSONB NOT NULL DEFAULT '[]'::jsonb,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.projects (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
 client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
 nombre TEXT NOT NULL, descripcion TEXT,
 estado TEXT NOT NULL DEFAULT 'Pendiente',
 fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, fecha_fin TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT projects_estado_check CHECK (estado IN ('Pendiente','Activo','Pausado','Entregado','Completado'))
);


-- ============================================================
-- GENERADOR AUTOMÁTICO DE NÚMEROS DE PRESUPUESTO
-- ============================================================
--
-- Formato:
--
--   PRES-26-B578CF
--
-- PRES  -> identifica el documento como presupuesto
-- 26    -> últimos dos dígitos del año actual
-- B578CF -> identificador aleatorio de 6 caracteres
--
-- No es secuencial.
-- La unicidad se garantiza adicionalmente mediante:
--
--   UNIQUE (company_id, numero_presupuesto)
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN
        'PRES-' ||
        TO_CHAR(CURRENT_DATE, 'YY') ||
        '-' ||
        UPPER(
            SUBSTRING(
                REPLACE(gen_random_uuid()::TEXT, '-', '')
                FROM 1 FOR 6
            )
        );
END;
$$;


GRANT EXECUTE
ON FUNCTION public.generate_quotation_number()
TO authenticated;


CREATE TABLE public.quotations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
 client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,

 numero_presupuesto TEXT NOT NULL DEFAULT public.generate_quotation_number(),

 titulo TEXT NOT NULL,
 descripcion_detallada TEXT,
 servicios_incluidos JSONB NOT NULL DEFAULT '[]'::jsonb,
 precio_base NUMERIC(12,2) NOT NULL DEFAULT 0,
 iva_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 21,
 precio_total NUMERIC(12,2) NOT NULL DEFAULT 0,
 estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
 fecha_emision TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_validez TIMESTAMPTZ,
 notas TEXT,
 stripe_session_id TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

 CONSTRAINT quotations_estado_check
     CHECK (estado IN ('Pendiente','Aceptado','Rechazado')),

 CONSTRAINT quotations_company_number_unique
     UNIQUE (company_id, numero_presupuesto),

 CONSTRAINT quotations_price_check
     CHECK (
         precio_base >= 0
         AND iva_porcentaje >= 0
         AND precio_total >= 0
     )
);


CREATE TABLE public.invoices (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
 client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
 quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
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
 document_path TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT invoices_amount_check CHECK (monto >= 0)
);

CREATE TABLE public.payments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
 quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
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
 CONSTRAINT payments_amount_check CHECK (amount >= 0)
);

CREATE TABLE public.budgets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
 monto NUMERIC(12,2) NOT NULL,
 descripcion TEXT,
 estado TEXT NOT NULL DEFAULT 'pendiente',
 fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_aprobacion TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT budgets_amount_check CHECK (monto >= 0)
);

CREATE TABLE public.support_tickets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
 titulo TEXT NOT NULL,
 descripcion TEXT NOT NULL,
 estado TEXT NOT NULL DEFAULT 'abierto',
 prioridad TEXT NOT NULL DEFAULT 'normal',
 fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_cierre TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT support_tickets_estado_check CHECK (estado IN ('abierto','en_progreso','cerrado')),
 CONSTRAINT support_tickets_prioridad_check CHECK (prioridad IN ('baja','normal','alta','urgente'))
);

CREATE TABLE public.automations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 nombre TEXT NOT NULL,
 descripcion TEXT,
 estado TEXT NOT NULL DEFAULT 'activo',
 fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 frecuencia TEXT,
 ultima_ejecucion_exitosa TIMESTAMPTZ,
 proxima_ejecucion TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT automations_estado_check CHECK (estado IN ('activo','pausado','cancelado','finalizado'))
);

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

CREATE TABLE public.workers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name TEXT,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.company_change_requests (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 current_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
 requested_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
 reason TEXT,
 status VARCHAR(20) NOT NULL DEFAULT 'pending',
 reviewed_by UUID REFERENCES public.workers(id) ON DELETE SET NULL,
 reviewed_at TIMESTAMPTZ,
 review_notes TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT company_change_requests_status_check
     CHECK (status IN ('pending','approved','rejected','cancelled')),
 CONSTRAINT company_change_requests_different_company_check
     CHECK (
         current_company_id IS NULL
         OR current_company_id <> requested_company_id
     )
);

CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_clients_company_id ON public.clients(company_id);
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_company_id ON public.projects(company_id);
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_quotations_company_id ON public.quotations(company_id);
CREATE INDEX idx_quotations_project_id ON public.quotations(project_id);
CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_payments_company_id ON public.payments(company_id);
CREATE INDEX idx_budgets_company_id ON public.budgets(company_id);
CREATE INDEX idx_support_tickets_company_id ON public.support_tickets(company_id);
CREATE INDEX idx_automations_company_id ON public.automations(company_id);
CREATE INDEX idx_workers_auth_user_id ON public.workers(auth_user_id);
CREATE INDEX idx_company_change_requests_user_id ON public.company_change_requests(user_id);
CREATE INDEX idx_company_change_requests_current_company_id ON public.company_change_requests(current_company_id);
CREATE INDEX idx_company_change_requests_requested_company_id ON public.company_change_requests(requested_company_id);
CREATE INDEX idx_company_change_requests_status ON public.company_change_requests(status);
CREATE INDEX idx_company_change_requests_reviewed_by ON public.company_change_requests(reviewed_by);
CREATE INDEX idx_company_change_requests_created_at ON public.company_change_requests(created_at);

CREATE UNIQUE INDEX idx_company_change_requests_one_pending
 ON public.company_change_requests(user_id)
 WHERE status = 'pending';

INSERT INTO public.companies
(company_code,company_name,legal_name,country,timezone,language,currency,is_active)
VALUES
('MODIRA-001','Modira','Modira','ES','Europe/Madrid','es','EUR',TRUE);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER quotations_updated_at
BEFORE UPDATE ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER automations_updated_at
BEFORE UPDATE ON public.automations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_requests_updated_at
BEFORE UPDATE ON public.audit_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER workers_updated_at
BEFORE UPDATE ON public.workers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER company_change_requests_updated_at
BEFORE UPDATE ON public.company_change_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.company_change_requests
IS 'Solicitudes de clientes para cambiar la empresa asociada a su perfil.';

COMMENT ON COLUMN public.company_change_requests.status
IS 'pending, approved, rejected o cancelled.';


DO $$
BEGIN

 IF NOT EXISTS (
     SELECT 1
     FROM information_schema.tables
     WHERE table_schema='public'
       AND table_name='profiles'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: profiles was not created';
 END IF;


 IF NOT EXISTS (
     SELECT 1
     FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name='profiles'
       AND column_name='email'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: profiles.email is required';
 END IF;


 IF NOT EXISTS (
     SELECT 1
     FROM information_schema.tables
     WHERE table_schema='public'
       AND table_name='workers'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: workers was not created';
 END IF;


 IF NOT EXISTS (
     SELECT 1
     FROM information_schema.tables
     WHERE table_schema='public'
       AND table_name='quotations'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: quotations was not created';
 END IF;


 IF NOT EXISTS (
     SELECT 1
     FROM pg_constraint
     WHERE conrelid='public.automations'::regclass
       AND conname='automations_estado_check'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: automations_estado_check is missing';
 END IF;


 IF NOT EXISTS (
     SELECT 1
     FROM pg_constraint
     WHERE conrelid='public.quotations'::regclass
       AND conname='quotations_estado_check'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: quotations_estado_check is missing';
 END IF;


 IF NOT EXISTS (
     SELECT 1
     FROM pg_constraint
     WHERE conrelid='public.support_tickets'::regclass
       AND conname='support_tickets_estado_check'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: support_tickets_estado_check is missing';
 END IF;


 IF NOT EXISTS (
     SELECT 1
     FROM pg_constraint
     WHERE conrelid='public.support_tickets'::regclass
       AND conname='support_tickets_prioridad_check'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: support_tickets_prioridad_check is missing';
 END IF;


 IF NOT EXISTS (
     SELECT 1
     FROM information_schema.tables
     WHERE table_schema='public'
       AND table_name='company_change_requests'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: company_change_requests was not created';
 END IF;


 IF NOT EXISTS (
     SELECT 1
     FROM pg_constraint
     WHERE conrelid='public.company_change_requests'::regclass
       AND conname='company_change_requests_status_check'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: company_change_requests_status_check is missing';
 END IF;


 IF NOT EXISTS (
     SELECT 1
     FROM pg_constraint
     WHERE conrelid='public.company_change_requests'::regclass
       AND conname='company_change_requests_different_company_check'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: company_change_requests_different_company_check is missing';
 END IF;


 IF NOT EXISTS (
     SELECT 1
     FROM pg_indexes
     WHERE schemaname='public'
       AND tablename='company_change_requests'
       AND indexname='idx_company_change_requests_one_pending'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: pending company change request unique index is missing';
 END IF;


 -- ----------------------------------------------------------
 -- Verificación del generador de números de presupuesto
 -- ----------------------------------------------------------

 IF to_regprocedure(
     'public.generate_quotation_number()'
 ) IS NULL
 THEN
     RAISE EXCEPTION
         '001 failed: generate_quotation_number() is missing';
 END IF;


 IF NOT EXISTS (
     SELECT 1
     FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name='quotations'
       AND column_name='numero_presupuesto'
       AND column_default LIKE '%generate_quotation_number%'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: quotations.numero_presupuesto does not use generate_quotation_number()';
 END IF;


 IF NOT EXISTS (
     SELECT 1
     FROM pg_constraint
     WHERE conrelid='public.quotations'::regclass
       AND conname='quotations_company_number_unique'
 )
 THEN
     RAISE EXCEPTION
         '001 failed: quotations_company_number_unique is missing';
 END IF;

END $$;

COMMIT;