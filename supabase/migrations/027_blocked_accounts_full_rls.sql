BEGIN;

-- ============================================================
-- MODIRA — 027_blocked_accounts_full_rls.sql
--
-- Corrige el hallazgo de auditoría V-04:
--
-- La migración 020 endureció payments, quotations y workers con
-- current_user_is_active(), pero el resto de políticas orientadas
-- a clientes (clients, budgets, automations, projects, support
-- tickets, activity_log, maintenance_contracts, project_documents
-- y company_change_requests) seguían sin comprobar el estado de
-- la cuenta. Un usuario bloqueado con un access token aún vigente
-- conservaba acceso PostgREST directo hasta la expiración del JWT.
--
-- Con 026, el bloqueo revoca además las sesiones Auth; esta
-- migración cierra la ventana residual a nivel de políticas RLS
-- recreando cada política cliente con la comprobación de estado.
--
-- Los workers no se ven afectados: current_user_is_worker() ya
-- exige perfil activo.
-- ============================================================


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    IF to_regprocedure('public.current_user_is_active()') IS NULL THEN
        RAISE EXCEPTION '027 stopped: current_user_is_active() does not exist (016 required)';
    END IF;

    IF to_regprocedure('public.current_user_is_worker()') IS NULL THEN
        RAISE EXCEPTION '027 stopped: current_user_is_worker() does not exist';
    END IF;

    IF to_regprocedure('public.current_user_company_id()') IS NULL THEN
        RAISE EXCEPTION '027 stopped: current_user_company_id() does not exist';
    END IF;

END $$;


-- ============================================================
-- 2. CLIENTS
-- ============================================================

DROP POLICY IF EXISTS clients_company_access ON public.clients;

CREATE POLICY clients_company_access
ON public.clients
FOR ALL
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 3. BUDGETS
-- ============================================================

DROP POLICY IF EXISTS budgets_company_access ON public.budgets;

CREATE POLICY budgets_company_access
ON public.budgets
FOR ALL
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 4. AUTOMATIONS
-- ============================================================

DROP POLICY IF EXISTS automations_client_select ON public.automations;
DROP POLICY IF EXISTS automations_client_insert ON public.automations;
DROP POLICY IF EXISTS automations_client_update ON public.automations;

CREATE POLICY automations_client_select
ON public.automations
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);

CREATE POLICY automations_client_insert
ON public.automations
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND company_id = public.current_user_company_id()
);

CREATE POLICY automations_client_update
ON public.automations
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
    AND user_id = auth.uid()
);


-- ============================================================
-- 5. PROJECTS
-- ============================================================

DROP POLICY IF EXISTS projects_select_policy ON public.projects;
DROP POLICY IF EXISTS projects_insert_policy ON public.projects;
DROP POLICY IF EXISTS projects_client_update_policy ON public.projects;

CREATE POLICY projects_select_policy
ON public.projects
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
    OR
    (
        public.current_user_is_active()
        AND NOT public.current_user_is_worker()
        AND user_id = auth.uid()
    )
);

CREATE POLICY projects_insert_policy
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND
    (
        (
            public.current_user_company_id() IS NOT NULL
            AND company_id = public.current_user_company_id()
        )
        OR
        (
            public.current_user_company_id() IS NULL
            AND company_id IS NULL
        )
    )
    AND estado IN (
        'Pendiente',
        'Activo',
        'Pausado',
        'Entregado',
        'Completado'
    )
);

CREATE POLICY projects_client_update_policy
ON public.projects
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
)
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND estado IN (
        'Pendiente',
        'Activo',
        'Pausado',
        'Entregado',
        'Completado'
    )
);


-- ============================================================
-- 6. SUPPORT TICKETS
-- ============================================================

DROP POLICY IF EXISTS support_tickets_client_select ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_client_insert ON public.support_tickets;

CREATE POLICY support_tickets_client_select
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND
    (
        (
            company_id IS NOT NULL
            AND company_id = public.current_user_company_id()
        )
        OR
        (
            company_id IS NULL
            AND user_id = auth.uid()
        )
    )
);

CREATE POLICY support_tickets_client_insert
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND
    (
        company_id IS NULL
        OR company_id = public.current_user_company_id()
    )
);


-- ============================================================
-- 7. ACTIVITY LOG
-- ============================================================

DROP POLICY IF EXISTS activity_log_client_select ON public.activity_log;

CREATE POLICY activity_log_client_select
ON public.activity_log
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND
    (
        (
            company_id IS NOT NULL
            AND company_id = public.current_user_company_id()
        )
        OR
        (
            company_id IS NULL
            AND user_id = auth.uid()
        )
    )
);


-- ============================================================
-- 8. MAINTENANCE CONTRACTS
-- ============================================================

DROP POLICY IF EXISTS maintenance_contracts_client_select ON public.maintenance_contracts;
DROP POLICY IF EXISTS maintenance_contracts_client_insert ON public.maintenance_contracts;

CREATE POLICY maintenance_contracts_client_select
ON public.maintenance_contracts
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND
    (
        (
            company_id IS NOT NULL
            AND company_id = public.current_user_company_id()
        )
        OR
        (
            company_id IS NULL
            AND user_id = auth.uid()
        )
    )
);

CREATE POLICY maintenance_contracts_client_insert
ON public.maintenance_contracts
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND
    (
        company_id IS NULL
        OR company_id = public.current_user_company_id()
    )
);


-- ============================================================
-- 9. PROJECT DOCUMENTS (RLS DE TABLA)
-- ============================================================
--
-- La política cliente de lectura se recalcula por proyecto y
-- propietario; se añade la comprobación de estado de cuenta.
-- Las políticas de worker permanecen intactas.
-- ============================================================

DROP POLICY IF EXISTS project_documents_select ON public.project_documents;

CREATE POLICY project_documents_select
ON public.project_documents
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
    OR
    (
        public.current_user_is_active()
        AND NOT public.current_user_is_worker()
        AND EXISTS (
            SELECT 1
            FROM public.projects p
            WHERE p.id = project_documents.project_id
              AND p.user_id = auth.uid()
        )
    )
);


-- ============================================================
-- 10. PROJECT CHANGE REQUESTS
-- ============================================================

DROP POLICY IF EXISTS project_change_requests_select ON public.project_change_requests;

CREATE POLICY project_change_requests_select
ON public.project_change_requests
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
    OR
    (
        public.current_user_is_active()
        AND NOT public.current_user_is_worker()
        AND EXISTS (
            SELECT 1
            FROM public.projects p
            WHERE p.id = project_change_requests.project_id
              AND p.user_id = auth.uid()
        )
    )
);


-- ============================================================
-- 11. COMPANY CHANGE REQUESTS
-- ============================================================

DROP POLICY IF EXISTS company_change_requests_client_insert ON public.company_change_requests;
DROP POLICY IF EXISTS company_change_requests_client_select ON public.company_change_requests;

CREATE POLICY company_change_requests_client_insert
ON public.company_change_requests
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
    AND current_company_id IS NOT DISTINCT FROM
        public.current_user_company_id()
    AND status = 'pending'
    AND (
        requested_company_id IS NOT NULL
        OR NULLIF(TRIM(requested_company_name), '') IS NOT NULL
    )
    AND (
        requested_company_id IS NULL
        OR requested_company_id <>
            public.current_user_company_id()
    )
);

CREATE POLICY company_change_requests_client_select
ON public.company_change_requests
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
);


-- ============================================================
-- 12. AI CONVERSATIONS / MESSAGES (LECTURA PROPIA)
-- ============================================================

DROP POLICY IF EXISTS ai_conversations_user_select ON public.ai_conversations;
DROP POLICY IF EXISTS ai_messages_user_select ON public.ai_messages;

CREATE POLICY ai_conversations_user_select
ON public.ai_conversations
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND user_id = auth.uid()
);

CREATE POLICY ai_messages_user_select
ON public.ai_messages
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND EXISTS (
        SELECT 1
        FROM public.ai_conversations c
        WHERE c.id = ai_messages.conversation_id
          AND c.user_id = auth.uid()
    )
);


-- ============================================================
-- 13. INVOICES (LECTURA PROPIA)
-- ============================================================

DROP POLICY IF EXISTS invoices_client_select ON public.invoices;

CREATE POLICY invoices_client_select
ON public.invoices
FOR SELECT
TO authenticated
USING (
    public.current_user_is_active()
    AND NOT public.current_user_is_worker()
    AND user_id = auth.uid()
);


-- ============================================================
-- 14. COMPANY CHANGE REQUESTS — WORKERS (sin cambio semántico)
-- ============================================================
--
-- Se recrean para mantener consistencia documental; el predicado
-- de worker ya exige perfil activo a través de
-- current_user_is_worker().
-- ============================================================

-- (Sin cambios: las políticas worker de 002 ya dependen
-- exclusivamente de current_user_is_worker(), que incorpora
-- el estado activo desde 016.)

-- ============================================================
-- 15. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE
    v_missing INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- Cada política cliente recreada debe referenciar
    -- current_user_is_active().
    --
    -- Para políticas SELECT/UPDATE la condición está en:
    --   pg_policies.qual
    --
    -- Para políticas INSERT la condición está en:
    --   pg_policies.with_check
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_missing
    FROM (
        -- ----------------------------------------------------
        -- CLIENTS — FOR ALL
        -- ----------------------------------------------------
        SELECT 1 WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'clients'
              AND policyname = 'clients_company_access'
              AND (
                  qual LIKE '%current_user_is_active()%'
                  OR
                  with_check LIKE '%current_user_is_active()%'
              )
        )

        UNION ALL

        -- ----------------------------------------------------
        -- BUDGETS — FOR ALL
        -- ----------------------------------------------------
        SELECT 1 WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'budgets'
              AND policyname = 'budgets_company_access'
              AND (
                  qual LIKE '%current_user_is_active()%'
                  OR
                  with_check LIKE '%current_user_is_active()%'
              )
        )

        UNION ALL

        -- ----------------------------------------------------
        -- AUTOMATIONS — SELECT
        -- ----------------------------------------------------
        SELECT 1 WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'automations'
              AND policyname = 'automations_client_select'
              AND qual LIKE '%current_user_is_active()%'
        )

        UNION ALL

        -- ----------------------------------------------------
        -- PROJECTS — INSERT
        -- ----------------------------------------------------
        SELECT 1 WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'projects'
              AND policyname = 'projects_insert_policy'
              AND with_check LIKE '%current_user_is_active()%'
        )

        UNION ALL

        -- ----------------------------------------------------
        -- SUPPORT TICKETS — SELECT
        -- ----------------------------------------------------
        SELECT 1 WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'support_tickets'
              AND policyname = 'support_tickets_client_select'
              AND qual LIKE '%current_user_is_active()%'
        )

        UNION ALL

        -- ----------------------------------------------------
        -- ACTIVITY LOG — SELECT
        -- ----------------------------------------------------
        SELECT 1 WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'activity_log'
              AND policyname = 'activity_log_client_select'
              AND qual LIKE '%current_user_is_active()%'
        )

        UNION ALL

        -- ----------------------------------------------------
        -- MAINTENANCE CONTRACTS — SELECT
        -- ----------------------------------------------------
        SELECT 1 WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'maintenance_contracts'
              AND policyname = 'maintenance_contracts_client_select'
              AND qual LIKE '%current_user_is_active()%'
        )

        UNION ALL

        -- ----------------------------------------------------
        -- PROJECT DOCUMENTS — SELECT
        -- ----------------------------------------------------
        SELECT 1 WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'project_documents'
              AND policyname = 'project_documents_select'
              AND qual LIKE '%current_user_is_active()%'
        )

        UNION ALL

        -- ----------------------------------------------------
        -- PROJECT CHANGE REQUESTS — SELECT
        -- ----------------------------------------------------
        SELECT 1 WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'project_change_requests'
              AND policyname = 'project_change_requests_select'
              AND qual LIKE '%current_user_is_active()%'
        )

        UNION ALL

        -- ----------------------------------------------------
        -- COMPANY CHANGE REQUESTS — INSERT
        -- ----------------------------------------------------
        SELECT 1 WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'company_change_requests'
              AND policyname = 'company_change_requests_client_insert'
              AND with_check LIKE '%current_user_is_active()%'
        )

        UNION ALL

        -- ----------------------------------------------------
        -- INVOICES — SELECT
        -- ----------------------------------------------------
        SELECT 1 WHERE NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'invoices'
              AND policyname = 'invoices_client_select'
              AND qual LIKE '%current_user_is_active()%'
        )

    ) AS checks;

    IF v_missing <> 0 THEN
        RAISE EXCEPTION
            '027 failed: active-account checks incomplete in client policies';
    END IF;

END $$;




COMMIT;
