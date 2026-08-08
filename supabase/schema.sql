-- Definitive Supabase schema for Modira
-- Designed to be applied safely on an existing Supabase database.
-- This script is idempotent and reuses existing public tables when possible.

-- Required extension for UUID generation.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Companies table
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
  country TEXT,
  industry TEXT,
  employees INTEGER,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  language VARCHAR(10) NOT NULL DEFAULT 'es',
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  stripe_customer_id TEXT,
  subscription_plan TEXT,
  subscription_status VARCHAR(50),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  updated_by UUID,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  apellidos TEXT,
  empresa TEXT,
  telefono TEXT,
  avatar_url TEXT,
  puesto TEXT,
  departamento TEXT,
  rol VARCHAR(50) NOT NULL DEFAULT 'user',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_registro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_ultimo_login TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_profiles_auth_users'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_auth_users FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  empresa TEXT,
  email VARCHAR(320),
  telefono TEXT,
  contacto_principal TEXT,
  cif_vat TEXT,
  direccion TEXT,
  ciudad TEXT,
  provincia TEXT,
  pais TEXT,
  codigo_postal TEXT,
  sector TEXT,
  notas TEXT,
  etiquetas JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  estado VARCHAR(50) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado', 'completado')),
  fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  fecha_fin TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_presupuesto TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  empresa TEXT,
  titulo TEXT NOT NULL,
  descripcion_detallada TEXT,
  servicios_incluidos JSONB NOT NULL DEFAULT '[]'::jsonb,
  precio_base NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  iva_porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 21.00,
  precio_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  estado VARCHAR(50) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'pendiente', 'pagado', 'rechazado', 'caducado')),
  fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  fecha_validez TIMESTAMP WITH TIME ZONE,
  notas TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  numero_factura TEXT NOT NULL UNIQUE,
  monto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'vencida')),
  fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento TIMESTAMP WITH TIME ZONE,
  fecha_pago TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  status VARCHAR(50) NOT NULL,
  description TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  monto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  descripcion TEXT,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  estado VARCHAR(50) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_progreso', 'cerrado')),
  prioridad VARCHAR(50) NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_cierre TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Automations table
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  estado VARCHAR(50) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'pausada', 'inactiva')),
  tipo TEXT,
  configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_ultima_ejecucion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Common indexes for performance and compatibility
CREATE INDEX IF NOT EXISTS idx_companies_billing_email ON public.companies (billing_email);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON public.companies (created_at);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON public.companies (subscription_status);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON public.companies (is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles (company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_rol ON public.profiles (rol);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles (is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles (last_seen_at);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients (company_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients (email);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients (created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_company_email ON public.clients (company_id, email);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects (created_at);
CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON public.quotations (user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_project_id ON public.quotations (project_id);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON public.quotations (created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices (project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices (created_at);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments (created_at);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets (user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_project_id ON public.budgets (project_id);
CREATE INDEX IF NOT EXISTS idx_budgets_created_at ON public.budgets (created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets (created_at);
CREATE INDEX IF NOT EXISTS idx_automations_user_id ON public.automations (user_id);
CREATE INDEX IF NOT EXISTS idx_automations_created_at ON public.automations (created_at);

-- Trigger function for updated_at maintenance
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public._is_company_member(comp_id UUID) RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SET search_path = public, pg_temp;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND company_id = comp_id
      AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION public._is_company_admin(comp_id UUID) RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SET search_path = public, pg_temp;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND company_id = comp_id
      AND rol IN ('owner', 'admin')
      AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION public._is_company_manager(comp_id UUID) RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SET search_path = public, pg_temp;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND company_id = comp_id
      AND rol IN ('owner', 'admin', 'manager')
      AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION public._same_company_as_profile(target_profile_id UUID) RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SET search_path = public, pg_temp;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles current_user
    JOIN public.profiles target_profile ON target_profile.id = target_profile_id
    WHERE current_user.id = auth.uid()
      AND current_user.is_active
      AND target_profile.company_id IS NOT NULL
      AND current_user.company_id = target_profile.company_id
  );
$$;

-- Enable RLS on all core tables
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

-- Policies for companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'company_members_can_view_company_record'
      AND n.nspname = 'public' AND c.relname = 'companies'
  ) THEN
    EXECUTE 'CREATE POLICY company_members_can_view_company_record ON public.companies FOR SELECT USING ( public._is_company_member(companies.id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'company_insert_by_creator'
      AND n.nspname = 'public' AND c.relname = 'companies'
  ) THEN
    EXECUTE 'CREATE POLICY company_insert_by_creator ON public.companies FOR INSERT WITH CHECK ( created_by = auth.uid() )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'company_admins_can_manage_company_record'
      AND n.nspname = 'public' AND c.relname = 'companies'
  ) THEN
    EXECUTE 'CREATE POLICY company_admins_can_manage_company_record ON public.companies FOR ALL USING ( public._is_company_admin(companies.id) ) WITH CHECK ( public._is_company_admin(companies.id) )';
  END IF;
END
$$;

-- Policies for profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'own_profile_access'
      AND n.nspname = 'public' AND c.relname = 'profiles'
  ) THEN
    EXECUTE 'CREATE POLICY own_profile_access ON public.profiles FOR SELECT USING ( auth.uid() = id OR public._is_company_admin(profiles.company_id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'own_profile_management'
      AND n.nspname = 'public' AND c.relname = 'profiles'
  ) THEN
    EXECUTE 'CREATE POLICY own_profile_management ON public.profiles FOR UPDATE USING ( auth.uid() = id OR public._is_company_admin(profiles.company_id) ) WITH CHECK ( auth.uid() = id OR public._is_company_admin(profiles.company_id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'profile_creation_by_self_only'
      AND n.nspname = 'public' AND c.relname = 'profiles'
  ) THEN
    EXECUTE 'CREATE POLICY profile_creation_by_self_only ON public.profiles FOR INSERT WITH CHECK ( auth.uid() = id )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'profile_delete_by_admin_only'
      AND n.nspname = 'public' AND c.relname = 'profiles'
  ) THEN
    EXECUTE 'CREATE POLICY profile_delete_by_admin_only ON public.profiles FOR DELETE USING ( public._is_company_admin(profiles.company_id) )';
  END IF;
END
$$;

-- Policies for clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'company_users_can_view_clients'
      AND n.nspname = 'public' AND c.relname = 'clients'
  ) THEN
    EXECUTE 'CREATE POLICY company_users_can_view_clients ON public.clients FOR SELECT USING ( public._is_company_member(clients.company_id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'company_managers_can_manage_clients'
      AND n.nspname = 'public' AND c.relname = 'clients'
  ) THEN
    EXECUTE 'CREATE POLICY company_managers_can_manage_clients ON public.clients FOR ALL USING ( public._is_company_manager(clients.company_id) ) WITH CHECK ( public._is_company_manager(clients.company_id) )';
  END IF;
END
$$;

-- Policies for projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'project_self_or_company_access'
      AND n.nspname = 'public' AND c.relname = 'projects'
  ) THEN
    EXECUTE 'CREATE POLICY project_self_or_company_access ON public.projects FOR SELECT USING ( auth.uid() = user_id OR public._same_company_as_profile(user_id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'project_insert_by_owner'
      AND n.nspname = 'public' AND c.relname = 'projects'
  ) THEN
    EXECUTE 'CREATE POLICY project_insert_by_owner ON public.projects FOR INSERT WITH CHECK ( user_id = auth.uid() )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'project_manage_by_owner_or_manager'
      AND n.nspname = 'public' AND c.relname = 'projects'
  ) THEN
    EXECUTE 'CREATE POLICY project_manage_by_owner_or_manager ON public.projects FOR ALL USING ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) ) WITH CHECK ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) )';
  END IF;
END
$$;

-- Policies for quotations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'quotation_self_or_company_access'
      AND n.nspname = 'public' AND c.relname = 'quotations'
  ) THEN
    EXECUTE 'CREATE POLICY quotation_self_or_company_access ON public.quotations FOR SELECT USING ( auth.uid() = user_id OR public._same_company_as_profile(user_id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'quotation_insert_by_owner'
      AND n.nspname = 'public' AND c.relname = 'quotations'
  ) THEN
    EXECUTE 'CREATE POLICY quotation_insert_by_owner ON public.quotations FOR INSERT WITH CHECK ( user_id = auth.uid() )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'quotation_manage_by_owner_or_manager'
      AND n.nspname = 'public' AND c.relname = 'quotations'
  ) THEN
    EXECUTE 'CREATE POLICY quotation_manage_by_owner_or_manager ON public.quotations FOR ALL USING ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) ) WITH CHECK ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) )';
  END IF;
END
$$;

-- Policies for invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'invoice_self_or_company_access'
      AND n.nspname = 'public' AND c.relname = 'invoices'
  ) THEN
    EXECUTE 'CREATE POLICY invoice_self_or_company_access ON public.invoices FOR SELECT USING ( auth.uid() = user_id OR public._same_company_as_profile(user_id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'invoice_insert_by_owner'
      AND n.nspname = 'public' AND c.relname = 'invoices'
  ) THEN
    EXECUTE 'CREATE POLICY invoice_insert_by_owner ON public.invoices FOR INSERT WITH CHECK ( user_id = auth.uid() )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'invoice_manage_by_owner_or_manager'
      AND n.nspname = 'public' AND c.relname = 'invoices'
  ) THEN
    EXECUTE 'CREATE POLICY invoice_manage_by_owner_or_manager ON public.invoices FOR ALL USING ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) ) WITH CHECK ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) )';
  END IF;
END
$$;

-- Policies for payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'payment_self_or_company_access'
      AND n.nspname = 'public' AND c.relname = 'payments'
  ) THEN
    EXECUTE 'CREATE POLICY payment_self_or_company_access ON public.payments FOR SELECT USING ( auth.uid() = user_id OR public._same_company_as_profile(user_id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'payment_insert_by_owner'
      AND n.nspname = 'public' AND c.relname = 'payments'
  ) THEN
    EXECUTE 'CREATE POLICY payment_insert_by_owner ON public.payments FOR INSERT WITH CHECK ( user_id = auth.uid() )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'payment_manage_by_owner_or_manager'
      AND n.nspname = 'public' AND c.relname = 'payments'
  ) THEN
    EXECUTE 'CREATE POLICY payment_manage_by_owner_or_manager ON public.payments FOR ALL USING ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) ) WITH CHECK ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) )';
  END IF;
END
$$;

-- Policies for budgets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'budget_self_or_company_access'
      AND n.nspname = 'public' AND c.relname = 'budgets'
  ) THEN
    EXECUTE 'CREATE POLICY budget_self_or_company_access ON public.budgets FOR SELECT USING ( auth.uid() = user_id OR public._same_company_as_profile(user_id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'budget_insert_by_owner'
      AND n.nspname = 'public' AND c.relname = 'budgets'
  ) THEN
    EXECUTE 'CREATE POLICY budget_insert_by_owner ON public.budgets FOR INSERT WITH CHECK ( user_id = auth.uid() )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'budget_manage_by_owner_or_manager'
      AND n.nspname = 'public' AND c.relname = 'budgets'
  ) THEN
    EXECUTE 'CREATE POLICY budget_manage_by_owner_or_manager ON public.budgets FOR ALL USING ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) ) WITH CHECK ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) )';
  END IF;
END
$$;

-- Policies for support_tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'support_ticket_self_or_company_access'
      AND n.nspname = 'public' AND c.relname = 'support_tickets'
  ) THEN
    EXECUTE 'CREATE POLICY support_ticket_self_or_company_access ON public.support_tickets FOR SELECT USING ( auth.uid() = user_id OR public._same_company_as_profile(user_id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'support_ticket_insert_by_owner'
      AND n.nspname = 'public' AND c.relname = 'support_tickets'
  ) THEN
    EXECUTE 'CREATE POLICY support_ticket_insert_by_owner ON public.support_tickets FOR INSERT WITH CHECK ( user_id = auth.uid() )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'support_ticket_manage_by_owner_or_manager'
      AND n.nspname = 'public' AND c.relname = 'support_tickets'
  ) THEN
    EXECUTE 'CREATE POLICY support_ticket_manage_by_owner_or_manager ON public.support_tickets FOR ALL USING ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) ) WITH CHECK ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) )';
  END IF;
END
$$;

-- Policies for automations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'automation_self_or_company_access'
      AND n.nspname = 'public' AND c.relname = 'automations'
  ) THEN
    EXECUTE 'CREATE POLICY automation_self_or_company_access ON public.automations FOR SELECT USING ( auth.uid() = user_id OR public._same_company_as_profile(user_id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'automation_insert_by_owner'
      AND n.nspname = 'public' AND c.relname = 'automations'
  ) THEN
    EXECUTE 'CREATE POLICY automation_insert_by_owner ON public.automations FOR INSERT WITH CHECK ( user_id = auth.uid() )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'automation_manage_by_owner_or_manager'
      AND n.nspname = 'public' AND c.relname = 'automations'
  ) THEN
    EXECUTE 'CREATE POLICY automation_manage_by_owner_or_manager ON public.automations FOR ALL USING ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) ) WITH CHECK ( auth.uid() = user_id OR public._is_company_manager((SELECT company_id FROM public.profiles WHERE id = user_id)) )';
  END IF;
END
$$;
