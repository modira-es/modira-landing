-- Fase 1: Infraestructura de multiempresa
-- Tablas: companies, profiles, clients
-- Diseñado para SaaS, multiempresa, multiusuario y crecimiento futuro.

-- Prefer pgcrypto for gen_random_uuid(); avoids depending on uuid-ossp.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Profiles role as flexible text field for compatibility y crecimiento.
-- No se fuerza enum en esta fase para evitar migraciones complejas sobre esquemas existentes.

CREATE TABLE IF NOT EXISTS companies (
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

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
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

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS apellidos TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS puesto TEXT,
  ADD COLUMN IF NOT EXISTS departamento TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_companies_billing_email ON companies (billing_email);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies (created_at);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies (subscription_status);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies (is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles (company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_rol ON profiles (rol);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles (is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles (created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON profiles (last_seen_at);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients (company_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients (email);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients (created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_company_email ON clients (company_id, email);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Helper functions to evaluate membership/roles without causing RLS recursion.
-- SECURITY DEFINER functions run with the privileges of the function owner,
-- which allows them to query `profiles` without being subject to the same RLS
-- checks that would cause recursion when policies reference the `profiles` table.
-- NOTE: these functions should be owned by the DB owner (default when run by the owner)
-- so that they can bypass RLS. If your environment requires explicit ownership changes,
-- run an additional `ALTER FUNCTION ... OWNER TO <owner>` as needed.

CREATE OR REPLACE FUNCTION public._is_company_member(comp_id uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SET search_path = public, pg_temp;
    SELECT EXISTS(
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND company_id = comp_id AND is_active
    );
  $$;

CREATE OR REPLACE FUNCTION public._is_company_admin(comp_id uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SET search_path = public, pg_temp;
    SELECT EXISTS(
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND company_id = comp_id AND rol IN ('owner','admin') AND is_active
    );
  $$;

CREATE OR REPLACE FUNCTION public._is_company_manager(comp_id uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SET search_path = public, pg_temp;
    SELECT EXISTS(
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND company_id = comp_id AND rol IN ('owner','admin','manager') AND is_active
    );
  $$;

-- Policies: create only if they don't exist. Use pg_policy join to check.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'company_members_can_view_company_record' AND n.nspname = 'public' AND c.relname = 'companies'
  ) THEN
    EXECUTE 'CREATE POLICY company_members_can_view_company_record ON public.companies FOR SELECT USING ( public._is_company_member(companies.id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'company_insert_by_creator' AND n.nspname = 'public' AND c.relname = 'companies'
  ) THEN
    EXECUTE 'CREATE POLICY company_insert_by_creator ON public.companies FOR INSERT WITH CHECK ( created_by = auth.uid() )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'company_admins_can_manage_company_record' AND n.nspname = 'public' AND c.relname = 'companies'
  ) THEN
    EXECUTE 'CREATE POLICY company_admins_can_manage_company_record ON public.companies FOR ALL USING ( public._is_company_admin(companies.id) ) WITH CHECK ( public._is_company_admin(companies.id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'own_profile_access' AND n.nspname = 'public' AND c.relname = 'profiles'
  ) THEN
    EXECUTE 'CREATE POLICY own_profile_access ON public.profiles FOR SELECT USING ( auth.uid() = id OR public._is_company_admin(profiles.company_id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'own_profile_management' AND n.nspname = 'public' AND c.relname = 'profiles'
  ) THEN
    EXECUTE 'CREATE POLICY own_profile_management ON public.profiles FOR UPDATE USING ( auth.uid() = id OR public._is_company_admin(profiles.company_id) ) WITH CHECK ( (auth.uid() = id AND (profiles.company_id IS NULL OR profiles.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))) OR public._is_company_admin(profiles.company_id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'profile_creation_by_self_only' AND n.nspname = 'public' AND c.relname = 'profiles'
  ) THEN
    EXECUTE 'CREATE POLICY profile_creation_by_self_only ON public.profiles FOR INSERT WITH CHECK ( auth.uid() = id )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'company_users_can_view_clients' AND n.nspname = 'public' AND c.relname = 'clients'
  ) THEN
    EXECUTE 'CREATE POLICY company_users_can_view_clients ON public.clients FOR SELECT USING ( public._is_company_member(clients.company_id) )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'company_managers_can_manage_clients' AND n.nspname = 'public' AND c.relname = 'clients'
  ) THEN
    EXECUTE 'CREATE POLICY company_managers_can_manage_clients ON public.clients FOR ALL USING ( public._is_company_manager(clients.company_id) ) WITH CHECK ( public._is_company_manager(clients.company_id) )';
  END IF;
END
$$;

-- Add FK from profiles.id -> auth.users(id) if not present. This enforces that profiles map 1:1 to auth.users.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_auth_users') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_auth_users FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END
$$;
