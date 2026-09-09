BEGIN;

-- ============================================================
-- MODIRA — 031_stripe_payment_intent_transition.sql
--
-- STRIPE — TRANSICIÓN DE ESTADO DEL MISMO PAYMENTINTENT
--
-- Corrige el caso:
--
--   PaymentIntent
--       failed
--          ↓
--       succeeded
--
-- Un mismo PaymentIntent puede fallar y posteriormente
-- completarse correctamente.
--
-- La migración 012 permite múltiples intentos por factura,
-- pero un mismo PaymentIntent solo puede existir una vez.
--
-- La migración 030 limita payments.status a:
--   failed
--   canceled
--   succeeded
--
-- Esta migración NO modifica índices ni datos existentes.
-- ============================================================


-- ============================================================
-- 1. ACTUALIZAR RPC STRIPE
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
    -- 5. PAYMENT INTENT EXISTENTE
    --
    -- Idempotencia + transición de estado.
    --
    -- Si el mismo PaymentIntent ya existe:
    --
    --   succeeded
    --       -> no se modifica.
    --
    --   failed/canceled -> succeeded
    --       -> se actualiza.
    --
    --   cualquier otra combinación
    --       -> se mantiene el registro existente.
    --
    -- Nunca permitimos degradar:
    --
    --   succeeded -> failed
    --   succeeded -> canceled
    --
    -- ========================================================

    IF p_payment_intent_id IS NOT NULL THEN

        SELECT *
        INTO v_payment
        FROM public.payments
        WHERE stripe_payment_intent_id = p_payment_intent_id
        LIMIT 1
        FOR UPDATE;

        IF FOUND THEN

            -- ------------------------------------------------
            -- El PaymentIntent no puede cambiar de factura.
            -- ------------------------------------------------

            IF v_payment.invoice_id IS DISTINCT FROM v_invoice.id THEN
                RAISE EXCEPTION
                    'El PaymentIntent ya está asociado a otra factura';
            END IF;


            -- ------------------------------------------------
            -- Ya está exitoso.
            -- Nunca lo degradamos.
            -- ------------------------------------------------

            IF v_payment.status = 'succeeded' THEN
                RETURN v_payment;
            END IF;


            -- ------------------------------------------------
            -- TRANSICIÓN VÁLIDA:
            --
            -- failed/canceled -> succeeded
            -- ------------------------------------------------

            IF p_status = 'succeeded'
               AND v_payment.status IN (
                   'failed',
                   'canceled'
               )
            THEN

                -- --------------------------------------------
                -- Si la factura ya fue pagada mediante otro
                -- PaymentIntent, no permitimos otro succeeded.
                -- --------------------------------------------

                IF LOWER(
                    COALESCE(v_invoice.estado, '')
                ) = 'pagada'
                THEN
                    RAISE EXCEPTION
                        'La factura ya está pagada';
                END IF;


                -- --------------------------------------------
                -- Actualizar el Payment existente.
                -- --------------------------------------------

                UPDATE public.payments
                SET
                    status = 'succeeded',
                    paid_at = COALESCE(
                        p_paid_at,
                        CURRENT_TIMESTAMP
                    ),
                    description = COALESCE(
                        p_description,
                        v_payment.description
                    ),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = v_payment.id
                RETURNING *
                INTO v_payment;


                -- --------------------------------------------
                -- Marcar factura como pagada.
                -- --------------------------------------------

                UPDATE public.invoices
                SET
                    estado = 'pagada',
                    fecha_pago = COALESCE(
                        p_paid_at,
                        CURRENT_TIMESTAMP
                    ),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = v_invoice.id;


                RETURN v_payment;

            END IF;


            -- ------------------------------------------------
            -- No cambiar estados sin una transición válida.
            -- ------------------------------------------------

            RETURN v_payment;

        END IF;

    END IF;


    -- ========================================================
    -- 6. CHECKOUT SESSION EXISTENTE
    -- ========================================================

    IF p_checkout_session_id IS NOT NULL THEN

        SELECT *
        INTO v_payment
        FROM public.payments
        WHERE stripe_checkout_session_id =
              p_checkout_session_id
        LIMIT 1
        FOR UPDATE;

        IF FOUND THEN

            -- ------------------------------------------------
            -- La Checkout Session tampoco puede cambiar
            -- de factura.
            -- ------------------------------------------------

            IF v_payment.invoice_id IS DISTINCT FROM v_invoice.id THEN
                RAISE EXCEPTION
                    'La Checkout Session ya está asociada a otra factura';
            END IF;

            RETURN v_payment;

        END IF;

    END IF;


    -- ========================================================
    -- 7. FACTURA YA PAGADA
    -- ========================================================

    IF LOWER(COALESCE(v_invoice.estado, '')) = 'pagada'
       AND p_status = 'succeeded'
    THEN
        RAISE EXCEPTION
            'La factura ya está pagada';
    END IF;


    -- ========================================================
    -- 8. REGISTRAR NUEVO PAYMENT
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
-- 10. MANTENER PERMISOS DE LA RPC
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
-- 11. VERIFICACIONES
-- ============================================================

DO $$
DECLARE
    v_security_definer BOOLEAN;
BEGIN

    -- --------------------------------------------------------
    -- SECURITY DEFINER
    -- --------------------------------------------------------

    SELECT p.prosecdef
    INTO v_security_definer
    FROM pg_proc p
    JOIN pg_namespace n
        ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname =
          'register_stripe_invoice_payment';

    IF v_security_definer IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION
            '031 failed: RPC must be SECURITY DEFINER';
    END IF;


    -- --------------------------------------------------------
    -- search_path seguro
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
            ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname =
              'register_stripe_invoice_payment'
          AND 'search_path=public, pg_temp' =
              ANY(p.proconfig)
    ) THEN
        RAISE EXCEPTION
            '031 failed: secure search_path missing';
    END IF;


    -- --------------------------------------------------------
    -- anon NO puede ejecutar
    -- --------------------------------------------------------

    IF has_function_privilege(
        'anon',
        'public.register_stripe_invoice_payment(uuid,text,text,integer,character varying,character varying,timestamp with time zone,text)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            '031 failed: anon can execute Stripe RPC';
    END IF;


    -- --------------------------------------------------------
    -- authenticated NO puede ejecutar
    -- --------------------------------------------------------

    IF has_function_privilege(
        'authenticated',
        'public.register_stripe_invoice_payment(uuid,text,text,integer,character varying,character varying,timestamp with time zone,text)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            '031 failed: authenticated can execute Stripe RPC';
    END IF;


    -- --------------------------------------------------------
    -- service_role SÍ puede ejecutar
    -- --------------------------------------------------------

    IF NOT has_function_privilege(
        'service_role',
        'public.register_stripe_invoice_payment(uuid,text,text,integer,character varying,character varying,timestamp with time zone,text)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            '031 failed: service_role cannot execute Stripe RPC';
    END IF;

END $$;


COMMIT;