-- ============================================================================
-- MODIRA - Marketing secure RPCs
-- Migration: 178_marketing_secure_rpcs.sql
-- Depends on: 177_marketing_analytics_foundation.sql
-- All browser-callable write functions check worker RBAC permissions. Advertising
-- OAuth/API tokens and external API calls remain in trusted Edge Functions.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. CREATE CAMPAIGN
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marketing_create_campaign(
    p_name text,
    p_channel text,
    p_platform text,
    p_objective text,
    p_status text,
    p_starts_on date,
    p_ends_on date,
    p_landing_page_url text,
    p_utm_source text,
    p_utm_medium text,
    p_utm_campaign text,
    p_utm_term text,
    p_utm_content text,
    p_planned_budget numeric,
    p_currency text,
    p_description text,
    p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_id uuid;
BEGIN
    PERFORM public.require_current_worker_permission('marketing.campaigns.manage');

    INSERT INTO public.marketing_campaigns (
        name, channel, platform, objective, status, starts_on, ends_on,
        landing_page_url, utm_source, utm_medium, utm_campaign, utm_term,
        utm_content, planned_budget, currency, description, notes, created_by
    ) VALUES (
        NULLIF(btrim(p_name), ''), p_channel, p_platform, p_objective,
        COALESCE(NULLIF(btrim(p_status), ''), 'draft'), p_starts_on, p_ends_on,
        NULLIF(btrim(p_landing_page_url), ''), NULLIF(btrim(p_utm_source), ''),
        NULLIF(btrim(p_utm_medium), ''), NULLIF(btrim(p_utm_campaign), ''),
        NULLIF(btrim(p_utm_term), ''), NULLIF(btrim(p_utm_content), ''),
        p_planned_budget, COALESCE(upper(NULLIF(btrim(p_currency), '')), 'EUR'),
        NULLIF(btrim(p_description), ''), NULLIF(btrim(p_notes), ''), auth.uid()
    ) RETURNING id INTO v_id;

    RETURN v_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. UPDATE CAMPAIGN
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marketing_update_campaign(
    p_campaign_id uuid,
    p_name text,
    p_channel text,
    p_platform text,
    p_objective text,
    p_status text,
    p_starts_on date,
    p_ends_on date,
    p_landing_page_url text,
    p_utm_source text,
    p_utm_medium text,
    p_utm_campaign text,
    p_utm_term text,
    p_utm_content text,
    p_planned_budget numeric,
    p_currency text,
    p_description text,
    p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_id uuid;
    v_currency varchar(3) := COALESCE(upper(NULLIF(btrim(p_currency), '')), 'EUR');
BEGIN
    PERFORM public.require_current_worker_permission('marketing.campaigns.manage');

    IF p_campaign_id IS NULL THEN
        RAISE EXCEPTION 'Debes indicar una campaña válida.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.marketing_campaigns c WHERE c.id = p_campaign_id) THEN
        RAISE EXCEPTION 'La campaña indicada no existe.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.marketing_campaign_daily_metrics m WHERE m.campaign_id = p_campaign_id AND m.currency <> v_currency)
       OR EXISTS (
           SELECT 1 FROM public.marketing_campaign_expenses mce
           JOIN public.expenses e ON e.id = mce.expense_id
           WHERE mce.campaign_id = p_campaign_id AND e.currency <> v_currency
       ) THEN
        RAISE EXCEPTION 'No se puede cambiar la moneda de una campaña que ya tiene métricas o gastos en otra moneda.';
    END IF;

    UPDATE public.marketing_campaigns
    SET name = NULLIF(btrim(p_name), ''),
        channel = p_channel,
        platform = p_platform,
        objective = p_objective,
        status = COALESCE(NULLIF(btrim(p_status), ''), 'draft'),
        starts_on = p_starts_on,
        ends_on = p_ends_on,
        landing_page_url = NULLIF(btrim(p_landing_page_url), ''),
        utm_source = NULLIF(btrim(p_utm_source), ''),
        utm_medium = NULLIF(btrim(p_utm_medium), ''),
        utm_campaign = NULLIF(btrim(p_utm_campaign), ''),
        utm_term = NULLIF(btrim(p_utm_term), ''),
        utm_content = NULLIF(btrim(p_utm_content), ''),
        planned_budget = p_planned_budget,
        currency = v_currency,
        description = NULLIF(btrim(p_description), ''),
        notes = NULLIF(btrim(p_notes), ''),
        updated_at = now()
    WHERE id = p_campaign_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'La campaña indicada no existe.';
    END IF;

    RETURN v_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. UPSERT MANUAL DAILY METRICS
-- This RPC only writes the manual source; it cannot overwrite imported metrics.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marketing_upsert_manual_metrics(
    p_campaign_id uuid,
    p_metric_date date,
    p_spend numeric,
    p_currency text,
    p_impressions bigint,
    p_reach bigint,
    p_clicks bigint,
    p_landing_page_views bigint,
    p_leads integer,
    p_conversions numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_id uuid;
BEGIN
    PERFORM public.require_current_worker_permission('marketing.campaigns.manage');

    IF p_campaign_id IS NULL OR p_metric_date IS NULL THEN
        RAISE EXCEPTION 'Debes indicar la campaña y la fecha de las métricas.';
    END IF;

    INSERT INTO public.marketing_campaign_daily_metrics (
        campaign_id, platform, metric_date, spend, currency, impressions,
        reach, clicks, landing_page_views, leads, conversions, source_payload
    ) VALUES (
        p_campaign_id, 'manual', p_metric_date, COALESCE(p_spend, 0),
        COALESCE(upper(NULLIF(btrim(p_currency), '')), 'EUR'),
        COALESCE(p_impressions, 0), COALESCE(p_reach, 0), COALESCE(p_clicks, 0),
        COALESCE(p_landing_page_views, 0), COALESCE(p_leads, 0),
        COALESCE(p_conversions, 0), '{}'::jsonb
    )
    ON CONFLICT (campaign_id, platform, metric_date) DO UPDATE SET
        spend = EXCLUDED.spend,
        currency = EXCLUDED.currency,
        impressions = EXCLUDED.impressions,
        reach = EXCLUDED.reach,
        clicks = EXCLUDED.clicks,
        landing_page_views = EXCLUDED.landing_page_views,
        leads = EXCLUDED.leads,
        conversions = EXCLUDED.conversions,
        updated_at = now()
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. LINK AN EXISTING ACCOUNTING EXPENSE TO A CAMPAIGN
-- expense_id is unique in marketing_campaign_expenses, so one expense cannot be
-- counted against two campaigns. cost_role controls double-counting treatment.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marketing_link_expense_to_campaign(
    p_campaign_id uuid,
    p_expense_id uuid,
    p_cost_role text,
    p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_id uuid;
BEGIN
    PERFORM public.require_current_worker_permission('marketing.expenses.manage');

    IF p_campaign_id IS NULL OR p_expense_id IS NULL THEN
        RAISE EXCEPTION 'Debes indicar la campaña y el gasto existente.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.marketing_campaigns c WHERE c.id = p_campaign_id) THEN
        RAISE EXCEPTION 'La campaña indicada no existe.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = p_expense_id) THEN
        RAISE EXCEPTION 'El gasto indicado no existe.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.marketing_campaigns c
        JOIN public.expenses e ON e.id = p_expense_id
        WHERE c.id = p_campaign_id AND c.currency <> e.currency
    ) THEN
        RAISE EXCEPTION 'La moneda del gasto debe coincidir con la moneda de la campaña. No se permite sumar importes sin conversión.';
    END IF;

    INSERT INTO public.marketing_campaign_expenses (
        campaign_id, expense_id, cost_role, notes, linked_by
    ) VALUES (
        p_campaign_id,
        p_expense_id,
        COALESCE(NULLIF(btrim(p_cost_role), ''), 'additional_campaign_cost'),
        NULLIF(btrim(p_notes), ''),
        auth.uid()
    ) RETURNING id INTO v_id;

    RETURN v_id;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Este gasto ya está asociado a una campaña. Elimina o modifica la asociación existente antes de volver a vincularlo.';
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. CHANGE LEAD STATUS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marketing_update_lead_status(
    p_lead_id uuid,
    p_status text,
    p_qualification_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_id uuid;
    v_status text;
BEGIN
    PERFORM public.require_current_worker_permission('marketing.leads.manage');

    v_status := lower(NULLIF(btrim(p_status), ''));
    IF v_status IS NULL OR v_status NOT IN ('new','contacted','qualified','disqualified','customer') THEN
        RAISE EXCEPTION 'El estado del lead no es válido.';
    END IF;

    UPDATE public.marketing_leads
    SET status = v_status,
        qualification_notes = CASE
            WHEN p_qualification_notes IS NULL THEN qualification_notes
            ELSE NULLIF(btrim(p_qualification_notes), '')
        END,
        qualified_at = CASE
            WHEN v_status = 'qualified' THEN COALESCE(qualified_at, now())
            ELSE qualified_at
        END,
        converted_at = CASE
            WHEN v_status = 'customer' THEN COALESCE(converted_at, now())
            ELSE converted_at
        END,
        updated_at = now()
    WHERE id = p_lead_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'El lead indicado no existe.';
    END IF;

    RETURN v_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6. LINK LEAD TO QUOTATION
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marketing_link_lead_quotation(
    p_lead_id uuid,
    p_quotation_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_id uuid;
BEGIN
    PERFORM public.require_current_worker_permission('marketing.leads.manage');

    IF NOT EXISTS (SELECT 1 FROM public.marketing_leads l WHERE l.id = p_lead_id) THEN
        RAISE EXCEPTION 'El lead indicado no existe.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = p_quotation_id) THEN
        RAISE EXCEPTION 'El presupuesto indicado no existe.';
    END IF;

    INSERT INTO public.marketing_lead_quotations (lead_id, quotation_id, linked_by)
    VALUES (p_lead_id, p_quotation_id, auth.uid())
    RETURNING id INTO v_id;

    RETURN v_id;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Este presupuesto ya está vinculado a un lead.';
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. LINK LEAD TO INVOICE
-- If the invoice already belongs to a quotation linked to a different lead, reject
-- the conflicting link to preserve the commercial chain.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marketing_link_lead_invoice(
    p_lead_id uuid,
    p_invoice_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_id uuid;
    v_quotation_lead_id uuid;
    v_invoice_quotation_id uuid;
BEGIN
    PERFORM public.require_current_worker_permission('marketing.leads.manage');

    IF NOT EXISTS (SELECT 1 FROM public.marketing_leads l WHERE l.id = p_lead_id) THEN
        RAISE EXCEPTION 'El lead indicado no existe.';
    END IF;

    SELECT i.quotation_id INTO v_invoice_quotation_id
    FROM public.invoices i WHERE i.id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La factura indicada no existe.';
    END IF;

    IF v_invoice_quotation_id IS NOT NULL THEN
        SELECT mlq.lead_id INTO v_quotation_lead_id
        FROM public.marketing_lead_quotations mlq
        WHERE mlq.quotation_id = v_invoice_quotation_id;

        IF v_quotation_lead_id IS NOT NULL AND v_quotation_lead_id <> p_lead_id THEN
            RAISE EXCEPTION 'La factura está vinculada a un presupuesto atribuido a otro lead.';
        END IF;
    END IF;

    INSERT INTO public.marketing_lead_invoices (lead_id, invoice_id, linked_by)
    VALUES (p_lead_id, p_invoice_id, auth.uid())
    RETURNING id INTO v_id;

    RETURN v_id;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Esta factura ya está vinculada directamente a un lead.';
END;
$function$;

-- ---------------------------------------------------------------------------
-- 8. DASHBOARD SUMMARY
-- Last-touch attribution: for the selected period, each identifiable lead is
-- credited to the most recent campaign touchpoint linked to that lead. Revenue is
-- attributed once per lead in this result, avoiding multi-campaign double counting.
-- Ad platform spend and additional accounting costs are reported separately.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marketing_get_dashboard_summary(
    p_from_date date DEFAULT NULL,
    p_to_date date DEFAULT NULL,
    p_campaign_id uuid DEFAULT NULL
)
RETURNS TABLE (
    campaign_uuid uuid,
    campaign_name text,
    campaign_platform text,
    campaign_currency varchar(3),
    ad_spend numeric,
    additional_campaign_costs numeric,
    total_marketing_cost numeric,
    impressions bigint,
    clicks bigint,
    landing_page_views bigint,
    platform_reported_leads bigint,
    attributed_leads bigint,
    qualified_leads bigint,
    new_customers bigint,
    quotations_count bigint,
    accepted_quotations_count bigint,
    invoices_count bigint,
    invoiced_revenue_eur numeric,
    collected_revenue_eur numeric,
    roas numeric,
    invoiced_roi_percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_from date := COALESCE(p_from_date, CURRENT_DATE - 29);
    v_to date := COALESCE(p_to_date, CURRENT_DATE);
BEGIN
    PERFORM public.require_current_worker_permission('marketing.dashboard.read');

    IF v_from > v_to THEN
        RAISE EXCEPTION 'El inicio del periodo no puede ser posterior al final.';
    END IF;

    IF v_to - v_from > 1095 THEN
        RAISE EXCEPTION 'El periodo máximo permitido para esta consulta es de 3 años.';
    END IF;

    RETURN QUERY
    WITH campaign_scope AS (
        SELECT c.id, c.name, c.platform, c.currency
        FROM public.marketing_campaigns c
        WHERE p_campaign_id IS NULL OR c.id = p_campaign_id
    ),
    metrics AS (
        SELECT m.campaign_id,
               SUM(m.spend)::numeric AS ad_spend,
               SUM(m.impressions)::bigint AS impressions,
               SUM(m.clicks)::bigint AS clicks,
               SUM(m.landing_page_views)::bigint AS landing_page_views,
               SUM(m.leads)::bigint AS platform_reported_leads
        FROM public.marketing_campaign_daily_metrics m
        WHERE m.metric_date BETWEEN v_from AND v_to
        GROUP BY m.campaign_id
    ),
    extra_costs AS (
        SELECT mce.campaign_id,
               SUM(e.total_amount)::numeric AS additional_campaign_costs
        FROM public.marketing_campaign_expenses mce
        JOIN public.expenses e ON e.id = mce.expense_id
        WHERE mce.cost_role = 'additional_campaign_cost'
          AND e.expense_date BETWEEN v_from AND v_to
          AND e.status IN ('approved','pending_payment','partially_paid','paid')
        GROUP BY mce.campaign_id
    ),
    last_touch AS (
        SELECT DISTINCT ON (e.lead_id)
               e.lead_id, e.campaign_id
        FROM public.marketing_attribution_events e
        WHERE e.lead_id IS NOT NULL
          AND e.campaign_id IS NOT NULL
          AND e.event_at >= v_from::timestamptz
          AND e.event_at < (v_to + 1)::timestamptz
        ORDER BY e.lead_id, e.event_at DESC, e.id DESC
    ),
    lead_totals AS (
        SELECT lt.campaign_id,
               COUNT(DISTINCT lt.lead_id)::bigint AS attributed_leads,
               COUNT(DISTINCT lt.lead_id) FILTER (WHERE l.status = 'qualified')::bigint AS qualified_leads,
               COUNT(DISTINCT lt.lead_id) FILTER (
                   WHERE l.status = 'customer'
                     AND l.converted_at >= v_from::timestamptz
                     AND l.converted_at < (v_to + 1)::timestamptz
               )::bigint AS new_customers
        FROM last_touch lt
        JOIN public.marketing_leads l ON l.id = lt.lead_id
        GROUP BY lt.campaign_id
    ),
    quotation_totals AS (
        SELECT lt.campaign_id,
               COUNT(DISTINCT q.id)::bigint AS quotations_count,
               COUNT(DISTINCT q.id) FILTER (WHERE q.estado = 'Aceptado')::bigint AS accepted_quotations_count
        FROM last_touch lt
        JOIN public.marketing_lead_quotations mlq ON mlq.lead_id = lt.lead_id
        JOIN public.quotations q ON q.id = mlq.quotation_id
        WHERE q.fecha_emision >= v_from::timestamptz
          AND q.fecha_emision < (v_to + 1)::timestamptz
        GROUP BY lt.campaign_id
    ),
    invoice_lead_map AS (
        SELECT mli.lead_id, mli.invoice_id
        FROM public.marketing_lead_invoices mli
        UNION
        SELECT mlq.lead_id, i.id AS invoice_id
        FROM public.marketing_lead_quotations mlq
        JOIN public.invoices i ON i.quotation_id = mlq.quotation_id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.marketing_lead_invoices direct_link
            WHERE direct_link.invoice_id = i.id
        )
    ),
    invoice_totals AS (
        SELECT lt.campaign_id,
               COUNT(DISTINCT i.id) FILTER (
                   WHERE lower(i.estado) NOT IN ('borrador','anulada','rectificada')
               )::bigint AS invoices_count,
               SUM(i.importe_a_pagar) FILTER (
                   WHERE lower(i.estado) NOT IN ('borrador','anulada','rectificada')
               )::numeric AS invoiced_revenue,
               SUM(i.importe_a_pagar) FILTER (
                   WHERE lower(i.estado) NOT IN ('borrador','anulada','rectificada')
                     AND (lower(i.estado) = 'pagada' OR i.fecha_pago IS NOT NULL)
               )::numeric AS collected_revenue
        FROM last_touch lt
        JOIN invoice_lead_map ilm ON ilm.lead_id = lt.lead_id
        JOIN public.invoices i ON i.id = ilm.invoice_id
        WHERE i.fecha_emision >= v_from::timestamptz
          AND i.fecha_emision < (v_to + 1)::timestamptz
        GROUP BY lt.campaign_id
    )
    SELECT cs.id,
           cs.name,
           cs.platform,
           cs.currency,
           COALESCE(m.ad_spend, 0)::numeric,
           COALESCE(ec.additional_campaign_costs, 0)::numeric,
           (COALESCE(m.ad_spend, 0) + COALESCE(ec.additional_campaign_costs, 0))::numeric,
           COALESCE(m.impressions, 0)::bigint,
           COALESCE(m.clicks, 0)::bigint,
           COALESCE(m.landing_page_views, 0)::bigint,
           COALESCE(m.platform_reported_leads, 0)::bigint,
           COALESCE(lt.attributed_leads, 0)::bigint,
           COALESCE(lt.qualified_leads, 0)::bigint,
           COALESCE(lt.new_customers, 0)::bigint,
           COALESCE(qt.quotations_count, 0)::bigint,
           COALESCE(qt.accepted_quotations_count, 0)::bigint,
           COALESCE(it.invoices_count, 0)::bigint,
           COALESCE(it.invoiced_revenue, 0)::numeric,
           COALESCE(it.collected_revenue, 0)::numeric,
           CASE WHEN cs.currency = 'EUR' AND COALESCE(m.ad_spend, 0) > 0
                THEN COALESCE(it.invoiced_revenue, 0) / m.ad_spend
                ELSE NULL END::numeric AS roas,
           CASE WHEN cs.currency = 'EUR' AND (COALESCE(m.ad_spend, 0) + COALESCE(ec.additional_campaign_costs, 0)) > 0
                THEN ((COALESCE(it.invoiced_revenue, 0) - (COALESCE(m.ad_spend, 0) + COALESCE(ec.additional_campaign_costs, 0)))
                     / (COALESCE(m.ad_spend, 0) + COALESCE(ec.additional_campaign_costs, 0))) * 100
                ELSE NULL END::numeric AS invoiced_roi_percent
    FROM campaign_scope cs
    LEFT JOIN metrics m ON m.campaign_id = cs.id
    LEFT JOIN extra_costs ec ON ec.campaign_id = cs.id
    LEFT JOIN lead_totals lt ON lt.campaign_id = cs.id
    LEFT JOIN quotation_totals qt ON qt.campaign_id = cs.id
    LEFT JOIN invoice_totals it ON it.campaign_id = cs.id
    ORDER BY cs.name;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 9. FUNCTION PRIVILEGES
-- Revoke default PUBLIC/anonymous execution, then allow authenticated callers;
-- every SECURITY DEFINER function enforces the corresponding RBAC permission.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.marketing_create_campaign(text,text,text,text,text,date,date,text,text,text,text,text,text,numeric,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.marketing_update_campaign(uuid,text,text,text,text,text,date,date,text,text,text,text,text,text,numeric,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.marketing_upsert_manual_metrics(uuid,date,numeric,text,bigint,bigint,bigint,bigint,integer,numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.marketing_link_expense_to_campaign(uuid,uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.marketing_update_lead_status(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.marketing_link_lead_quotation(uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.marketing_link_lead_invoice(uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.marketing_get_dashboard_summary(date,date,uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.marketing_create_campaign(text,text,text,text,text,date,date,text,text,text,text,text,text,numeric,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_update_campaign(uuid,text,text,text,text,text,date,date,text,text,text,text,text,text,numeric,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_upsert_manual_metrics(uuid,date,numeric,text,bigint,bigint,bigint,bigint,integer,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_link_expense_to_campaign(uuid,uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_update_lead_status(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_link_lead_quotation(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_link_lead_invoice(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_get_dashboard_summary(date,date,uuid) TO authenticated;

COMMIT;

-- Post-deployment verification (run separately):
-- SELECT routine_name, security_type FROM information_schema.routines
-- WHERE routine_schema='public' AND routine_name LIKE 'marketing_%' ORDER BY routine_name;
-- SELECT * FROM public.marketing_get_dashboard_summary(CURRENT_DATE - 29, CURRENT_DATE, NULL);
