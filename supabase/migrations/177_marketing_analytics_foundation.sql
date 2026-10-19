-- ============================================================================
-- MODIRA - Marketing analytics foundation
-- Migration: 177_marketing_analytics_foundation.sql
-- Purpose:
--   * Add campaign, advertising metrics, integration metadata, attribution and lead tables.
--   * Reuse existing profiles, audit_requests, expenses, quotations and invoices.
--   * Register identifiable registrations/audit requests as leads without creating
--     duplicate leads for the same normalized email.
--   * Add marketing permissions to the existing worker RBAC system.
-- Security model:
--   * RLS enabled on every new table.
--   * Authenticated workers receive read access only through explicit RBAC policies.
--   * No direct INSERT/UPDATE/DELETE grants are added; future writes must go through
--     validated SECURITY DEFINER RPCs or trusted Edge Functions.
--   * Never store OAuth/API secrets in marketing_integrations.settings.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. CAMPAIGNS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    channel text NOT NULL DEFAULT 'other',
    platform text NOT NULL DEFAULT 'manual',
    objective text NOT NULL DEFAULT 'lead_generation',
    status text NOT NULL DEFAULT 'draft',
    starts_on date,
    ends_on date,
    landing_page_url text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    planned_budget numeric(14,2),
    currency varchar(3) NOT NULL DEFAULT 'EUR',
    notes text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT marketing_campaigns_name_check CHECK (length(btrim(name)) BETWEEN 1 AND 200),
    CONSTRAINT marketing_campaigns_description_check CHECK (description IS NULL OR length(description) <= 5000),
    CONSTRAINT marketing_campaigns_channel_check CHECK (channel IN ('paid_search','paid_social','organic_search','organic_social','email','referral','direct','partner','offline','other')),
    CONSTRAINT marketing_campaigns_platform_check CHECK (platform IN ('manual','meta_ads','google_ads','linkedin_ads','tiktok_ads','other')),
    CONSTRAINT marketing_campaigns_objective_check CHECK (objective IN ('brand_awareness','traffic','lead_generation','sales','retargeting','other')),
    CONSTRAINT marketing_campaigns_status_check CHECK (status IN ('draft','active','paused','completed','archived')),
    CONSTRAINT marketing_campaigns_dates_check CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on),
    CONSTRAINT marketing_campaigns_budget_check CHECK (planned_budget IS NULL OR planned_budget >= 0),
    CONSTRAINT marketing_campaigns_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT marketing_campaigns_landing_url_check CHECK (landing_page_url IS NULL OR length(landing_page_url) <= 2000),
    CONSTRAINT marketing_campaigns_notes_check CHECK (notes IS NULL OR length(notes) <= 10000)
);

COMMENT ON TABLE public.marketing_campaigns IS
'Campañas de marketing de MODIRA. Contiene configuración comercial; no contiene credenciales de plataformas publicitarias.';

-- ---------------------------------------------------------------------------
-- 2. AD PLATFORM INTEGRATION METADATA (credentials belong in a secret store)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_integrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    external_account_id text NOT NULL,
    account_name text,
    status text NOT NULL DEFAULT 'pending',
    settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    last_synced_at timestamptz,
    last_sync_status text,
    last_sync_error text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT marketing_integrations_provider_check CHECK (provider IN ('meta_ads','google_ads','linkedin_ads','tiktok_ads','other')),
    CONSTRAINT marketing_integrations_external_account_check CHECK (length(btrim(external_account_id)) BETWEEN 1 AND 200),
    CONSTRAINT marketing_integrations_account_name_check CHECK (account_name IS NULL OR length(account_name) <= 300),
    CONSTRAINT marketing_integrations_status_check CHECK (status IN ('pending','connected','paused','error','disconnected')),
    CONSTRAINT marketing_integrations_sync_status_check CHECK (last_sync_status IS NULL OR last_sync_status IN ('success','partial','error')),
    CONSTRAINT marketing_integrations_last_error_check CHECK (last_sync_error IS NULL OR length(last_sync_error) <= 5000),
    CONSTRAINT marketing_integrations_settings_object_check CHECK (jsonb_typeof(settings) = 'object'),
    CONSTRAINT marketing_integrations_provider_account_unique UNIQUE (provider, external_account_id)
);

COMMENT ON TABLE public.marketing_integrations IS
'Metadatos de cuentas publicitarias conectadas. No guardar aquí access tokens, refresh tokens, client secrets ni claves API; usar secretos de Supabase Edge Functions u otro almacén seguro.';

COMMENT ON COLUMN public.marketing_integrations.settings IS
'Configuración no secreta de integración. No incluir tokens, contraseñas ni credenciales.';

-- ---------------------------------------------------------------------------
-- 3. SYNCHRONIZATION RUNS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_sync_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id uuid NOT NULL REFERENCES public.marketing_integrations(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'running',
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    campaigns_seen integer NOT NULL DEFAULT 0,
    metric_rows_upserted integer NOT NULL DEFAULT 0,
    error_message text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT marketing_sync_runs_status_check CHECK (status IN ('running','success','partial','error','cancelled')),
    CONSTRAINT marketing_sync_runs_counts_check CHECK (campaigns_seen >= 0 AND metric_rows_upserted >= 0),
    CONSTRAINT marketing_sync_runs_dates_check CHECK (completed_at IS NULL OR completed_at >= started_at),
    CONSTRAINT marketing_sync_runs_error_check CHECK (error_message IS NULL OR length(error_message) <= 10000),
    CONSTRAINT marketing_sync_runs_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object')
);

-- ---------------------------------------------------------------------------
-- 4. DAILY CAMPAIGN METRICS
-- One row per local campaign, platform and date. Manual and imported metrics are
-- distinguishable. Platform data is not automatically mixed with accounting costs.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_campaign_daily_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
    integration_id uuid REFERENCES public.marketing_integrations(id) ON DELETE SET NULL,
    platform text NOT NULL DEFAULT 'manual',
    external_campaign_id text,
    metric_date date NOT NULL,
    spend numeric(14,2) NOT NULL DEFAULT 0,
    currency varchar(3) NOT NULL DEFAULT 'EUR',
    impressions bigint NOT NULL DEFAULT 0,
    reach bigint NOT NULL DEFAULT 0,
    clicks bigint NOT NULL DEFAULT 0,
    landing_page_views bigint NOT NULL DEFAULT 0,
    leads integer NOT NULL DEFAULT 0,
    conversions numeric(14,2) NOT NULL DEFAULT 0,
    source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    imported_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT marketing_metrics_platform_check CHECK (platform IN ('manual','meta_ads','google_ads','linkedin_ads','tiktok_ads','other')),
    CONSTRAINT marketing_metrics_external_id_check CHECK (external_campaign_id IS NULL OR length(external_campaign_id) <= 300),
    CONSTRAINT marketing_metrics_spend_check CHECK (spend >= 0),
    CONSTRAINT marketing_metrics_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT marketing_metrics_counts_check CHECK (impressions >= 0 AND reach >= 0 AND clicks >= 0 AND landing_page_views >= 0 AND leads >= 0 AND conversions >= 0),
    CONSTRAINT marketing_metrics_payload_object_check CHECK (jsonb_typeof(source_payload) = 'object'),
    CONSTRAINT marketing_metrics_campaign_platform_date_unique UNIQUE (campaign_id, platform, metric_date)
);

COMMENT ON TABLE public.marketing_campaign_daily_metrics IS
'Métricas diarias agregadas por campaña y plataforma. No guardar datos personales en source_payload.';

-- ---------------------------------------------------------------------------
-- 5. IDENTIFIABLE LEADS
-- Anonymous chatbot conversations and anonymous visits are NOT leads by themselves.
-- A lead requires a name and valid-looking email. Marketing consent is separate and
-- is never assumed from submitting a form or creating an account.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    normalized_email text GENERATED ALWAYS AS (lower(btrim(email))) STORED,
    company_name text,
    company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
    client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
    phone text,
    status text NOT NULL DEFAULT 'new',
    qualification_notes text,
    marketing_consent_status text NOT NULL DEFAULT 'not_requested',
    marketing_consent_at timestamptz,
    marketing_consent_source text,
    privacy_notice_version text,
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    qualified_at timestamptz,
    converted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT marketing_leads_name_check CHECK (length(btrim(name)) BETWEEN 1 AND 200),
    CONSTRAINT marketing_leads_email_check CHECK (length(btrim(email)) BETWEEN 3 AND 320 AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    CONSTRAINT marketing_leads_company_name_check CHECK (company_name IS NULL OR length(company_name) <= 300),
    CONSTRAINT marketing_leads_phone_check CHECK (phone IS NULL OR length(phone) <= 50),
    CONSTRAINT marketing_leads_status_check CHECK (status IN ('new','contacted','qualified','disqualified','customer')),
    CONSTRAINT marketing_leads_consent_status_check CHECK (marketing_consent_status IN ('not_requested','granted','denied','withdrawn')),
    CONSTRAINT marketing_leads_consent_data_check CHECK (
        (marketing_consent_status = 'granted' AND marketing_consent_at IS NOT NULL)
        OR marketing_consent_status <> 'granted'
    ),
    CONSTRAINT marketing_leads_notes_check CHECK (qualification_notes IS NULL OR length(qualification_notes) <= 10000),
    CONSTRAINT marketing_leads_consent_source_check CHECK (marketing_consent_source IS NULL OR length(marketing_consent_source) <= 200),
    CONSTRAINT marketing_leads_privacy_version_check CHECK (privacy_notice_version IS NULL OR length(privacy_notice_version) <= 100),
    CONSTRAINT marketing_leads_first_last_seen_check CHECK (last_seen_at >= first_seen_at)
);

-- Normalize identity by email so the same person submitting a form and registering
-- does not create duplicate lead rows. A source history table retains each origin.
CREATE UNIQUE INDEX IF NOT EXISTS marketing_leads_normalized_email_uidx
    ON public.marketing_leads (normalized_email);

COMMENT ON TABLE public.marketing_leads IS
'Leads identificados para seguimiento comercial. Una conversación anónima no crea un lead por sí sola. El consentimiento de marketing es independiente y no se presume.';

COMMENT ON COLUMN public.marketing_leads.marketing_consent_status IS
'Consentimiento para comunicaciones de marketing. No usar not_requested como autorización.';

-- ---------------------------------------------------------------------------
-- 6. LEAD SOURCE HISTORY
-- source_record_id is polymorphic by design; source_type identifies the source table.
-- Existing source records remain owned by their existing subsystem.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_lead_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
    source_type text NOT NULL,
    source_record_id uuid NOT NULL,
    source_occurred_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT marketing_lead_sources_type_check CHECK (source_type IN ('registration','audit_request','contact_form','chatbot_identified','manual','other')),
    CONSTRAINT marketing_lead_sources_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT marketing_lead_sources_source_unique UNIQUE (source_type, source_record_id)
);

-- ---------------------------------------------------------------------------
-- 7. ATTRIBUTION EVENTS
-- Store only events allowed by the applicable consent/legal basis. Do not send raw
-- message contents, IP addresses, or other unnecessary personal data in metadata.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_attribution_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid REFERENCES public.marketing_leads(id) ON DELETE SET NULL,
    campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
    session_id text,
    anonymous_id text,
    event_name text NOT NULL,
    event_at timestamptz NOT NULL DEFAULT now(),
    consent_category text NOT NULL DEFAULT 'necessary',
    source text,
    medium text,
    campaign text,
    term text,
    content text,
    landing_page_url text,
    referrer_url text,
    idempotency_key text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT marketing_attribution_event_name_check CHECK (length(btrim(event_name)) BETWEEN 1 AND 100),
    CONSTRAINT marketing_attribution_identity_check CHECK (lead_id IS NOT NULL OR session_id IS NOT NULL OR anonymous_id IS NOT NULL),
    CONSTRAINT marketing_attribution_consent_check CHECK (consent_category IN ('necessary','analytics','marketing')),
    CONSTRAINT marketing_attribution_session_check CHECK (session_id IS NULL OR length(session_id) <= 300),
    CONSTRAINT marketing_attribution_anonymous_check CHECK (anonymous_id IS NULL OR length(anonymous_id) <= 300),
    CONSTRAINT marketing_attribution_utm_length_check CHECK (
        (source IS NULL OR length(source) <= 500) AND
        (medium IS NULL OR length(medium) <= 500) AND
        (campaign IS NULL OR length(campaign) <= 500) AND
        (term IS NULL OR length(term) <= 500) AND
        (content IS NULL OR length(content) <= 500)
    ),
    CONSTRAINT marketing_attribution_urls_check CHECK (
        (landing_page_url IS NULL OR length(landing_page_url) <= 2000) AND
        (referrer_url IS NULL OR length(referrer_url) <= 2000)
    ),
    CONSTRAINT marketing_attribution_idempotency_check CHECK (idempotency_key IS NULL OR length(idempotency_key) <= 300),
    CONSTRAINT marketing_attribution_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_attribution_idempotency_uidx
    ON public.marketing_attribution_events (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

COMMENT ON TABLE public.marketing_attribution_events IS
'Eventos de atribución y conversión. La aplicación/Edge Function debe comprobar el consentimiento antes de registrar eventos analíticos o publicitarios; esta tabla no habilita cookies ni píxeles.';

-- ---------------------------------------------------------------------------
-- 8. EXISTING EXPENSES ASSOCIATED WITH CAMPAIGNS
-- One accounting expense can be associated with at most one campaign. cost_role
-- explicitly prevents an ad-platform invoice from being added a second time on top
-- of the platform-reported media spend.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_campaign_expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
    expense_id uuid NOT NULL UNIQUE REFERENCES public.expenses(id) ON DELETE RESTRICT,
    cost_role text NOT NULL DEFAULT 'additional_campaign_cost',
    notes text,
    linked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT marketing_campaign_expenses_cost_role_check CHECK (cost_role IN ('media_spend_reconciliation','additional_campaign_cost','exclude_from_marketing')),
    CONSTRAINT marketing_campaign_expenses_notes_check CHECK (notes IS NULL OR length(notes) <= 5000)
);

COMMENT ON COLUMN public.marketing_campaign_expenses.cost_role IS
'media_spend_reconciliation: gasto contable que concilia inversión ya medida por la plataforma y no se suma como coste adicional; additional_campaign_cost: coste adicional de campaña; exclude_from_marketing: relación informativa excluida de los totales.';

-- ---------------------------------------------------------------------------
-- 9. LEAD TO QUOTATION / INVOICE LINKS
-- These bridges avoid modifying the existing commercial and accounting tables.
-- An invoice can be linked to a lead directly even if it has no quotation.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_lead_quotations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
    quotation_id uuid NOT NULL UNIQUE REFERENCES public.quotations(id) ON DELETE RESTRICT,
    linked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT marketing_lead_quotations_lead_quotation_unique UNIQUE (lead_id, quotation_id)
);

CREATE TABLE IF NOT EXISTS public.marketing_lead_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
    invoice_id uuid NOT NULL UNIQUE REFERENCES public.invoices(id) ON DELETE RESTRICT,
    linked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT marketing_lead_invoices_lead_invoice_unique UNIQUE (lead_id, invoice_id)
);

-- ---------------------------------------------------------------------------
-- 10. CURRENCY CONSISTENCY FOR CAMPAIGN METRICS
-- Imported metrics must be normalized to the campaign currency by the trusted
-- ingestion function. This prevents adding amounts expressed in different currencies.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marketing_validate_metric_currency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_campaign_currency varchar(3);
BEGIN
    SELECT c.currency INTO v_campaign_currency
    FROM public.marketing_campaigns c
    WHERE c.id = NEW.campaign_id;

    IF v_campaign_currency IS NULL THEN
        RAISE EXCEPTION 'La campaña indicada no existe.';
    END IF;

    IF upper(NEW.currency) <> v_campaign_currency THEN
        RAISE EXCEPTION 'La moneda de las métricas (%) debe coincidir con la moneda de la campaña (%). Convierte los importes antes de importarlos.', NEW.currency, v_campaign_currency;
    END IF;

    NEW.currency := upper(NEW.currency);
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS marketing_metrics_currency_guard_insert ON public.marketing_campaign_daily_metrics;
CREATE TRIGGER marketing_metrics_currency_guard_insert
BEFORE INSERT ON public.marketing_campaign_daily_metrics
FOR EACH ROW EXECUTE FUNCTION public.marketing_validate_metric_currency();

DROP TRIGGER IF EXISTS marketing_metrics_currency_guard_update ON public.marketing_campaign_daily_metrics;
CREATE TRIGGER marketing_metrics_currency_guard_update
BEFORE UPDATE OF campaign_id, currency ON public.marketing_campaign_daily_metrics
FOR EACH ROW EXECUTE FUNCTION public.marketing_validate_metric_currency();

REVOKE ALL ON FUNCTION public.marketing_validate_metric_currency() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 11. UPDATED_AT TRIGGERS
-- Reuse the existing update_updated_at_column() function already used by MODIRA.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS marketing_campaigns_updated_at ON public.marketing_campaigns;
CREATE TRIGGER marketing_campaigns_updated_at
BEFORE UPDATE ON public.marketing_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS marketing_integrations_updated_at ON public.marketing_integrations;
CREATE TRIGGER marketing_integrations_updated_at
BEFORE UPDATE ON public.marketing_integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS marketing_metrics_updated_at ON public.marketing_campaign_daily_metrics;
CREATE TRIGGER marketing_metrics_updated_at
BEFORE UPDATE ON public.marketing_campaign_daily_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS marketing_leads_updated_at ON public.marketing_leads;
CREATE TRIGGER marketing_leads_updated_at
BEFORE UPDATE ON public.marketing_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 12. AUTOMATIC LEAD CAPTURE FROM EXISTING REGISTRATION AND AUDIT FORM
-- Only identifiable users/audit requests create leads. Anonymous chatbot activity
-- is intentionally not converted to a lead unless identity is supplied reliably.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marketing_capture_profile_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_lead_id uuid;
    v_name text;
    v_email text;
    v_company_name text;
BEGIN
    -- Do not treat admin/worker profiles as prospective customers.
    IF NEW.rol <> 'user' OR NEW.email IS NULL OR btrim(NEW.email) = '' THEN
        RETURN NEW;
    END IF;

    v_name := NULLIF(btrim(NEW.nombre), '');
    v_email := lower(btrim(NEW.email));
    v_company_name := NULLIF(btrim(NEW.empresa), '');

    IF v_name IS NULL OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.marketing_leads (
        name, email, company_name, company_id, status, first_seen_at, last_seen_at
    ) VALUES (
        v_name, v_email, v_company_name, NEW.company_id, 'new', now(), now()
    )
    ON CONFLICT (normalized_email) DO UPDATE SET
        name = EXCLUDED.name,
        company_name = COALESCE(EXCLUDED.company_name, public.marketing_leads.company_name),
        company_id = COALESCE(EXCLUDED.company_id, public.marketing_leads.company_id),
        last_seen_at = GREATEST(public.marketing_leads.last_seen_at, now()),
        updated_at = now()
    RETURNING id INTO v_lead_id;

    INSERT INTO public.marketing_lead_sources (
        lead_id, source_type, source_record_id, source_occurred_at, metadata
    ) VALUES (
        v_lead_id, 'registration', NEW.id, COALESCE(NEW.created_at, now()),
        jsonb_build_object('profile_status', NEW.status)
    )
    ON CONFLICT (source_type, source_record_id) DO UPDATE SET
        lead_id = EXCLUDED.lead_id,
        source_occurred_at = EXCLUDED.source_occurred_at,
        metadata = EXCLUDED.metadata;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.marketing_capture_audit_request_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_lead_id uuid;
    v_name text;
    v_email text;
    v_company_name text;
BEGIN
    v_name := NULLIF(btrim(NEW.nombre), '');
    v_email := lower(btrim(NEW.email));
    v_company_name := NULLIF(btrim(NEW.empresa), '');

    IF v_name IS NULL OR v_email IS NULL OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.marketing_leads (
        name, email, company_name, status, first_seen_at, last_seen_at
    ) VALUES (
        v_name, v_email, v_company_name, 'new', COALESCE(NEW.created_at, now()), COALESCE(NEW.created_at, now())
    )
    ON CONFLICT (normalized_email) DO UPDATE SET
        name = EXCLUDED.name,
        company_name = COALESCE(EXCLUDED.company_name, public.marketing_leads.company_name),
        last_seen_at = GREATEST(public.marketing_leads.last_seen_at, EXCLUDED.last_seen_at),
        updated_at = now()
    RETURNING id INTO v_lead_id;

    INSERT INTO public.marketing_lead_sources (
        lead_id, source_type, source_record_id, source_occurred_at, metadata
    ) VALUES (
        v_lead_id, 'audit_request', NEW.id, COALESCE(NEW.created_at, now()),
        jsonb_build_object('audit_status', NEW.estado)
    )
    ON CONFLICT (source_type, source_record_id) DO UPDATE SET
        lead_id = EXCLUDED.lead_id,
        source_occurred_at = EXCLUDED.source_occurred_at,
        metadata = EXCLUDED.metadata;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS marketing_capture_profile_lead_insert ON public.profiles;
CREATE TRIGGER marketing_capture_profile_lead_insert
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.marketing_capture_profile_lead();

DROP TRIGGER IF EXISTS marketing_capture_profile_lead_update ON public.profiles;
CREATE TRIGGER marketing_capture_profile_lead_update
AFTER UPDATE OF nombre, email, empresa, company_id, rol, status
ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.marketing_capture_profile_lead();

DROP TRIGGER IF EXISTS marketing_capture_audit_request_lead ON public.audit_requests;
CREATE TRIGGER marketing_capture_audit_request_lead
AFTER INSERT ON public.audit_requests
FOR EACH ROW EXECUTE FUNCTION public.marketing_capture_audit_request_lead();

-- Trigger functions are invoked by their triggers, not by browser clients.
REVOKE ALL ON FUNCTION public.marketing_capture_profile_lead() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.marketing_capture_audit_request_lead() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 13. INDEXES FOR DASHBOARDS AND RELATIONSHIPS
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS marketing_campaigns_status_dates_idx
    ON public.marketing_campaigns (status, starts_on, ends_on);
CREATE INDEX IF NOT EXISTS marketing_integrations_provider_status_idx
    ON public.marketing_integrations (provider, status);
CREATE INDEX IF NOT EXISTS marketing_sync_runs_integration_started_idx
    ON public.marketing_sync_runs (integration_id, started_at DESC);
CREATE INDEX IF NOT EXISTS marketing_metrics_campaign_date_idx
    ON public.marketing_campaign_daily_metrics (campaign_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS marketing_metrics_platform_date_idx
    ON public.marketing_campaign_daily_metrics (platform, metric_date DESC);
CREATE INDEX IF NOT EXISTS marketing_leads_status_created_idx
    ON public.marketing_leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_leads_company_idx
    ON public.marketing_leads (company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS marketing_lead_sources_lead_created_idx
    ON public.marketing_lead_sources (lead_id, source_occurred_at DESC);
CREATE INDEX IF NOT EXISTS marketing_attribution_events_lead_date_idx
    ON public.marketing_attribution_events (lead_id, event_at DESC) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS marketing_attribution_events_campaign_date_idx
    ON public.marketing_attribution_events (campaign_id, event_at DESC) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS marketing_campaign_expenses_campaign_idx
    ON public.marketing_campaign_expenses (campaign_id);
CREATE INDEX IF NOT EXISTS marketing_lead_quotations_lead_idx
    ON public.marketing_lead_quotations (lead_id);
CREATE INDEX IF NOT EXISTS marketing_lead_invoices_lead_idx
    ON public.marketing_lead_invoices (lead_id);

-- ---------------------------------------------------------------------------
-- 14. RBAC PERMISSIONS
-- Idempotently seed permission catalogue entries and assign them to existing roles.
-- ---------------------------------------------------------------------------
INSERT INTO public.worker_permissions (code, resource, action, description)
VALUES
    ('marketing.dashboard.read',    'marketing.dashboard',    'read',   'Consultar el dashboard de marketing y sus indicadores autorizados.'),
    ('marketing.campaigns.read',    'marketing.campaigns',    'read',   'Consultar campañas y métricas publicitarias.'),
    ('marketing.campaigns.manage',  'marketing.campaigns',    'manage', 'Crear y modificar campañas de marketing.'),
    ('marketing.expenses.manage',   'marketing.expenses',     'manage', 'Asociar gastos existentes a campañas y gestionar su clasificación de marketing.'),
    ('marketing.integrations.read', 'marketing.integrations', 'read',   'Consultar el estado de las integraciones publicitarias.'),
    ('marketing.integrations.manage','marketing.integrations','manage','Configurar y administrar integraciones publicitarias.'),
    ('marketing.leads.read',        'marketing.leads',        'read',   'Consultar leads y su historial comercial.'),
    ('marketing.leads.manage',      'marketing.leads',        'manage', 'Gestionar el estado y cualificación de leads.'),
    ('marketing.attribution.read',  'marketing.attribution',  'read',   'Consultar eventos y datos de atribución comercial.'),
    ('marketing.reports.export',    'marketing.reports',      'export', 'Exportar informes de marketing.')
ON CONFLICT (code) DO UPDATE SET
    resource = EXCLUDED.resource,
    action = EXCLUDED.action,
    description = EXCLUDED.description;

-- Direction receives all marketing permissions; other roles receive only the
-- minimum expected for their responsibilities. Missing roles are simply skipped.
WITH role_permission_codes(role_code, permission_code) AS (
    SELECT 'direction', p.code
    FROM public.worker_permissions p
    WHERE p.code LIKE 'marketing.%'
    UNION ALL SELECT 'commercial', unnest(ARRAY[
        'marketing.dashboard.read','marketing.campaigns.read','marketing.campaigns.manage',
        'marketing.leads.read','marketing.leads.manage','marketing.attribution.read','marketing.reports.export'
    ]::text[])
    UNION ALL SELECT 'accounting', unnest(ARRAY[
        'marketing.dashboard.read','marketing.campaigns.read','marketing.expenses.manage',
        'marketing.attribution.read','marketing.reports.export'
    ]::text[])
    UNION ALL SELECT 'developer', unnest(ARRAY[
        'marketing.dashboard.read','marketing.campaigns.read','marketing.integrations.read',
        'marketing.integrations.manage'
    ]::text[])
)
INSERT INTO public.worker_role_permissions (role_id, permission_id)
SELECT DISTINCT wr.id, wp.id
FROM role_permission_codes rpc
JOIN public.worker_roles wr ON wr.code = rpc.role_code AND wr.is_active = TRUE
JOIN public.worker_permissions wp ON wp.code = rpc.permission_code
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 15. ROW LEVEL SECURITY
-- All access is worker-only and permission-gated. No customer or anonymous access.
-- No direct write policies are created in this foundation migration.
-- ---------------------------------------------------------------------------
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_attribution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_lead_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_lead_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_campaigns_worker_select ON public.marketing_campaigns;
CREATE POLICY marketing_campaigns_worker_select ON public.marketing_campaigns
FOR SELECT TO authenticated
USING (public.current_user_is_active() AND public.current_user_is_worker() AND public.current_worker_has_permission('marketing.campaigns.read'));

DROP POLICY IF EXISTS marketing_integrations_worker_select ON public.marketing_integrations;
CREATE POLICY marketing_integrations_worker_select ON public.marketing_integrations
FOR SELECT TO authenticated
USING (public.current_user_is_active() AND public.current_user_is_worker() AND (
    public.current_worker_has_permission('marketing.integrations.read') OR
    public.current_worker_has_permission('marketing.integrations.manage')
));

DROP POLICY IF EXISTS marketing_sync_runs_worker_select ON public.marketing_sync_runs;
CREATE POLICY marketing_sync_runs_worker_select ON public.marketing_sync_runs
FOR SELECT TO authenticated
USING (public.current_user_is_active() AND public.current_user_is_worker() AND (
    public.current_worker_has_permission('marketing.integrations.read') OR
    public.current_worker_has_permission('marketing.integrations.manage')
));

DROP POLICY IF EXISTS marketing_metrics_worker_select ON public.marketing_campaign_daily_metrics;
CREATE POLICY marketing_metrics_worker_select ON public.marketing_campaign_daily_metrics
FOR SELECT TO authenticated
USING (public.current_user_is_active() AND public.current_user_is_worker() AND public.current_worker_has_permission('marketing.campaigns.read'));

DROP POLICY IF EXISTS marketing_leads_worker_select ON public.marketing_leads;
CREATE POLICY marketing_leads_worker_select ON public.marketing_leads
FOR SELECT TO authenticated
USING (public.current_user_is_active() AND public.current_user_is_worker() AND public.current_worker_has_permission('marketing.leads.read'));

DROP POLICY IF EXISTS marketing_lead_sources_worker_select ON public.marketing_lead_sources;
CREATE POLICY marketing_lead_sources_worker_select ON public.marketing_lead_sources
FOR SELECT TO authenticated
USING (public.current_user_is_active() AND public.current_user_is_worker() AND public.current_worker_has_permission('marketing.leads.read'));

DROP POLICY IF EXISTS marketing_attribution_worker_select ON public.marketing_attribution_events;
CREATE POLICY marketing_attribution_worker_select ON public.marketing_attribution_events
FOR SELECT TO authenticated
USING (public.current_user_is_active() AND public.current_user_is_worker() AND public.current_worker_has_permission('marketing.attribution.read'));

DROP POLICY IF EXISTS marketing_campaign_expenses_worker_select ON public.marketing_campaign_expenses;
CREATE POLICY marketing_campaign_expenses_worker_select ON public.marketing_campaign_expenses
FOR SELECT TO authenticated
USING (public.current_user_is_active() AND public.current_user_is_worker() AND (
    public.current_worker_has_permission('marketing.campaigns.read') OR
    public.current_worker_has_permission('marketing.expenses.manage')
));

DROP POLICY IF EXISTS marketing_lead_quotations_worker_select ON public.marketing_lead_quotations;
CREATE POLICY marketing_lead_quotations_worker_select ON public.marketing_lead_quotations
FOR SELECT TO authenticated
USING (public.current_user_is_active() AND public.current_user_is_worker() AND public.current_worker_has_permission('marketing.leads.read'));

DROP POLICY IF EXISTS marketing_lead_invoices_worker_select ON public.marketing_lead_invoices;
CREATE POLICY marketing_lead_invoices_worker_select ON public.marketing_lead_invoices
FOR SELECT TO authenticated
USING (public.current_user_is_active() AND public.current_user_is_worker() AND public.current_worker_has_permission('marketing.leads.read'));

-- Explicit grants for authenticated SELECT are still constrained by RLS.
GRANT SELECT ON public.marketing_campaigns TO authenticated;
GRANT SELECT ON public.marketing_integrations TO authenticated;
GRANT SELECT ON public.marketing_sync_runs TO authenticated;
GRANT SELECT ON public.marketing_campaign_daily_metrics TO authenticated;
GRANT SELECT ON public.marketing_leads TO authenticated;
GRANT SELECT ON public.marketing_lead_sources TO authenticated;
GRANT SELECT ON public.marketing_attribution_events TO authenticated;
GRANT SELECT ON public.marketing_campaign_expenses TO authenticated;
GRANT SELECT ON public.marketing_lead_quotations TO authenticated;
GRANT SELECT ON public.marketing_lead_invoices TO authenticated;

-- Ensure browser roles cannot write directly to the new tables. Trusted backend
-- functions / service role will be introduced in the next implementation stage.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public.marketing_campaigns, public.marketing_integrations, public.marketing_sync_runs,
   public.marketing_campaign_daily_metrics, public.marketing_leads, public.marketing_lead_sources,
   public.marketing_attribution_events, public.marketing_campaign_expenses,
   public.marketing_lead_quotations, public.marketing_lead_invoices
FROM PUBLIC, anon, authenticated;

COMMIT;

-- Post-deployment verification (run separately in Supabase SQL Editor):
-- SELECT table_name, row_security FROM information_schema.tables
-- WHERE table_schema='public' AND table_name LIKE 'marketing_%' ORDER BY table_name;
-- SELECT code, resource, action FROM public.worker_permissions WHERE code LIKE 'marketing.%' ORDER BY code;
-- SELECT wr.code AS role_code, wp.code AS permission_code
-- FROM public.worker_role_permissions wrp
-- JOIN public.worker_roles wr ON wr.id=wrp.role_id
-- JOIN public.worker_permissions wp ON wp.id=wrp.permission_id
-- WHERE wp.code LIKE 'marketing.%' ORDER BY wr.code, wp.code;
