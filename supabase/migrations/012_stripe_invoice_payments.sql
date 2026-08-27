BEGIN;

-- ============================================================
-- MODIRA — 012_stripe_invoice_payments.sql
--
-- Integración Stripe para pagos de facturas de servicios.
--
-- OBJETIVO
-- 1. Registrar Checkout Sessions de Stripe.
-- 2. Registrar PaymentIntents.
-- 3. Evitar pagos duplicados.
-- 4. Garantizar un único pago exitoso por factura.
-- 5. Registrar eventos de webhook procesados.
--
-- IMPORTANTE
-- - NO modifica invoices.estado directamente desde el frontend.
-- - NO concede INSERT/UPDATE/DELETE sobre payments al cliente.
-- - La escritura de pagos se realizará desde backend mediante
--   la Edge Function de Stripe.
-- ============================================================


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
    ) THEN
        RAISE EXCEPTION
            '012 stopped: public.invoices does not exist';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'payments'
    ) THEN
        RAISE EXCEPTION
            '012 stopped: public.payments does not exist';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND column_name = 'importe_a_pagar'
    ) THEN
        RAISE EXCEPTION
            '012 stopped: invoices.importe_a_pagar does not exist';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'payments'
          AND column_name = 'stripe_payment_intent_id'
    ) THEN
        RAISE EXCEPTION
            '012 stopped: payments.stripe_payment_intent_id does not exist';
    END IF;

END $$;


-- ============================================================
-- 2. CHECKOUT SESSION DE STRIPE
-- ============================================================
--
-- Cada intento de pago genera una Checkout Session nueva.
--
-- Ejemplo:
--
--   cs_test_123456789
--
-- No lo guardamos en invoices porque una misma factura puede
-- tener varios intentos de pago.
--
-- payments:
--
--   intento 1 → Checkout Session A → fallido
--   intento 2 → Checkout Session B → exitoso
--
-- ============================================================

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255);


-- ============================================================
-- 3. ÍNDICE CHECKOUT SESSION
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
    idx_payments_stripe_checkout_session_unique
ON public.payments (
    stripe_checkout_session_id
)
WHERE stripe_checkout_session_id IS NOT NULL;


-- ============================================================
-- 4. ÍNDICE PAYMENT INTENT
-- ============================================================
--
-- Un PaymentIntent de Stripe solo puede representar un pago
-- concreto.
--
-- Evita registrar dos veces el mismo PaymentIntent.
--
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
    idx_payments_stripe_payment_intent_unique
ON public.payments (
    stripe_payment_intent_id
)
WHERE stripe_payment_intent_id IS NOT NULL;


-- ============================================================
-- 5. UN ÚNICO PAGO EXITOSO POR FACTURA
-- ============================================================
--
-- Una factura solo puede quedar pagada una vez.
--
-- Puede haber varios intentos:
--
--   intento 1 → failed
--   intento 2 → canceled
--   intento 3 → succeeded
--
-- Pero únicamente uno puede tener:
--
--   status = succeeded
--
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
    idx_payments_one_success_per_invoice
ON public.payments (
    invoice_id
)
WHERE
    invoice_id IS NOT NULL
    AND status = 'succeeded';


-- ============================================================
-- 6. ÍNDICE DE CONSULTA POR FACTURA
-- ============================================================

CREATE INDEX IF NOT EXISTS
    idx_payments_invoice_status
ON public.payments (
    invoice_id,
    status
);


-- ============================================================
-- 7. EVENTOS WEBHOOK DE STRIPE
-- ============================================================
--
-- Stripe puede reenviar un mismo evento.
--
-- Guardamos su ID para garantizar idempotencia.
--
-- Ejemplo:
--
--   evt_1ABCDEF...
--
-- Si vuelve a llegar el mismo evento:
--
--   ya existe → no se vuelve a procesar.
--
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,

    event_type VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

);


-- ============================================================
-- 8. ÍNDICE DE EVENTOS
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
    idx_stripe_webhook_events_event_id
ON public.stripe_webhook_events (
    stripe_event_id
);


-- ============================================================
-- 9. RLS WEBHOOK EVENTS
-- ============================================================
--
-- Esta tabla no es accesible desde el frontend.
--
-- La Edge Function utilizará service_role.
--
-- ============================================================

ALTER TABLE public.stripe_webhook_events
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
    stripe_webhook_events_no_client_access
ON public.stripe_webhook_events;

-- ============================================================
-- 9.1 PERMISOS PARA SERVICE_ROLE
-- ============================================================
--
-- La Edge Function del webhook utiliza service_role.
-- Necesita consultar los eventos ya procesados para garantizar
-- idempotencia y registrar nuevos eventos.
--
-- Los clientes anon/authenticated no reciben estos permisos.
-- ============================================================

GRANT SELECT, INSERT
ON public.stripe_webhook_events
TO service_role;

-- No se crea ninguna policy para authenticated/anon.
--
-- service_role podrá acceder porque utiliza el rol de servicio.


-- ============================================================
-- 10. PAYMENTS — SEGURIDAD
-- ============================================================
--
-- El frontend únicamente puede consultar payments.
--
-- Los pagos los crea/actualiza exclusivamente el backend.
--
-- ============================================================

REVOKE INSERT, UPDATE, DELETE
ON public.payments
FROM authenticated;


GRANT SELECT
ON public.payments
TO authenticated;


-- ============================================================
-- 11. PAYMENTS — RLS
-- ============================================================
--
-- Eliminamos cualquier policy antigua de escritura.
--
-- ============================================================

DROP POLICY IF EXISTS
    payments_company_access
ON public.payments;


DROP POLICY IF EXISTS
    payments_client_select
ON public.payments;


CREATE POLICY
    payments_client_select
ON public.payments
FOR SELECT
TO authenticated
USING (
    NOT public.current_user_is_worker()
    AND company_id = public.current_user_company_id()
);


-- ============================================================
-- 12. FUNCIÓN DE REGISTRO DE PAGO STRIPE
-- ============================================================
--
-- Esta función será llamada únicamente desde backend.
--
-- La función:
--
-- 1. Busca la factura.
-- 2. Comprueba que existe.
-- 3. Obtiene company_id y user_id desde la factura.
-- 4. Obtiene el importe REAL desde importe_a_pagar.
-- 5. Comprueba que Stripe ha cobrado exactamente ese importe.
-- 6. Registra el Payment.
-- 7. Si el pago es exitoso, marca la factura como pagada.
--
-- El backend NO podrá decidir arbitrariamente:
--
--   company_id
--   user_id
--   amount
--
-- Esos datos se validan contra invoices.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.register_stripe_invoice_payment(
    p_invoice_id UUID,
    p_checkout_session_id TEXT,
    p_payment_intent_id TEXT,
    p_amount INTEGER,
    p_currency VARCHAR(3),
    p_status VARCHAR(50),
    p_paid_at TIMESTAMPTZ DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$

DECLARE

    v_invoice public.invoices;
    v_payment public.payments;
    v_expected_amount INTEGER;

BEGIN

    -- ========================================================
    -- 1. FACTURA
    -- ========================================================

    SELECT *
    INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id
    FOR UPDATE;


    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Factura no encontrada';
    END IF;


    -- ========================================================
    -- 2. IMPORTE ESPERADO
    -- ========================================================
    --
    -- Stripe trabaja en céntimos.
    --
    -- invoices.importe_a_pagar:
    --     euros
    --
    -- Stripe / payments.amount:
    --     céntimos
    --
    -- Ejemplo:
    --
    -- 1.210,00 €
    --       ↓
    -- 121000
    --
    -- ========================================================

    v_expected_amount :=
        ROUND(
            v_invoice.importe_a_pagar * 100
        )::INTEGER;


    -- ========================================================
    -- 3. COMPROBAR IMPORTE
    -- ========================================================

    IF p_amount <> v_expected_amount THEN

        RAISE EXCEPTION
            'El importe del pago no coincide con la factura';

    END IF;


    -- ========================================================
    -- 4. COMPROBAR MONEDA
    -- ========================================================

    IF UPPER(COALESCE(p_currency, '')) <>
       UPPER(COALESCE(
           (
               SELECT c.currency
               FROM public.companies c
               WHERE c.id = v_invoice.company_id
           ),
           'EUR'
       ))
    THEN

        RAISE EXCEPTION
            'La moneda del pago no coincide con la moneda de la empresa';

    END IF;


    -- ========================================================
    -- 5. COMPROBAR PAYMENT INTENT EXISTENTE
    -- ========================================================
    --
    -- Si Stripe reenvía el mismo pago, devolvemos el registro
    -- existente en lugar de crear otro.
    --
    -- ========================================================

    IF p_payment_intent_id IS NOT NULL THEN

        SELECT *
        INTO v_payment
        FROM public.payments
        WHERE stripe_payment_intent_id = p_payment_intent_id
        LIMIT 1;

        IF FOUND THEN

            RETURN v_payment;

        END IF;

    END IF;


    -- ========================================================
    -- 6. COMPROBAR CHECKOUT SESSION EXISTENTE
    -- ========================================================

    IF p_checkout_session_id IS NOT NULL THEN

        SELECT *
        INTO v_payment
        FROM public.payments
        WHERE stripe_checkout_session_id =
              p_checkout_session_id
        LIMIT 1;

        IF FOUND THEN

            RETURN v_payment;

        END IF;

    END IF;


    -- ========================================================
    -- 7. SI LA FACTURA YA ESTÁ PAGADA
    -- ========================================================
    --
    -- No permitimos un segundo pago exitoso.
    --
    -- ========================================================

    IF LOWER(COALESCE(v_invoice.estado, '')) = 'pagada'
       AND p_status = 'succeeded'
    THEN

        RAISE EXCEPTION
            'La factura ya está pagada';

    END IF;


    -- ========================================================
    -- 8. REGISTRAR PAYMENT
    -- ========================================================

    INSERT INTO public.payments (

        company_id,

        user_id,

        invoice_id,

        stripe_checkout_session_id,

        stripe_payment_intent_id,

        amount,

        currency,

        status,

        description,

        paid_at

    )

    VALUES (

        v_invoice.company_id,

        v_invoice.user_id,

        v_invoice.id,

        p_checkout_session_id,

        p_payment_intent_id,

        p_amount,

        UPPER(p_currency),

        p_status,

        p_description,

        CASE
            WHEN p_status = 'succeeded'
            THEN COALESCE(
                p_paid_at,
                CURRENT_TIMESTAMP
            )
            ELSE NULL
        END

    )

    RETURNING *
    INTO v_payment;


    -- ========================================================
    -- 9. MARCAR FACTURA COMO PAGADA
    -- ========================================================

    IF p_status = 'succeeded' THEN

        UPDATE public.invoices

        SET
            estado = 'pagada',
            fecha_pago = COALESCE(
                p_paid_at,
                CURRENT_TIMESTAMP
            ),
            updated_at = CURRENT_TIMESTAMP

        WHERE id = v_invoice.id;

    END IF;


    RETURN v_payment;

END;

$function$;


-- ============================================================
-- 13. SEGURIDAD DE LA FUNCIÓN
-- ============================================================

REVOKE ALL
ON FUNCTION public.register_stripe_invoice_payment(
    UUID,
    TEXT,
    TEXT,
    INTEGER,
    VARCHAR,
    VARCHAR,
    TIMESTAMPTZ,
    TEXT
)
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE
ON FUNCTION public.register_stripe_invoice_payment(
    UUID,
    TEXT,
    TEXT,
    INTEGER,
    VARCHAR,
    VARCHAR,
    TIMESTAMPTZ,
    TEXT
)
TO service_role;


-- ============================================================
-- 14. COMENTARIOS
-- ============================================================

COMMENT ON COLUMN public.payments.stripe_checkout_session_id IS
'Identificador de la Checkout Session de Stripe utilizada para este intento de pago.';

COMMENT ON COLUMN public.payments.stripe_payment_intent_id IS
'Identificador del PaymentIntent de Stripe asociado al pago.';

COMMENT ON TABLE public.stripe_webhook_events IS
'Registro interno de eventos Stripe procesados para garantizar idempotencia.';


-- ============================================================
-- 15. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE

    v_count INTEGER;

BEGIN

    SELECT COUNT(*)
    INTO v_count

    FROM information_schema.columns

    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'stripe_checkout_session_id';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '012 failed: stripe_checkout_session_id missing';

    END IF;


    SELECT COUNT(*)
    INTO v_count

    FROM information_schema.tables

    WHERE table_schema = 'public'
      AND table_name = 'stripe_webhook_events';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '012 failed: stripe_webhook_events missing';

    END IF;


    SELECT COUNT(*)
    INTO v_count

    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace

    WHERE n.nspname = 'public'
      AND p.proname = 'register_stripe_invoice_payment';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '012 failed: register_stripe_invoice_payment() missing';

    END IF;

END $$;


COMMIT;