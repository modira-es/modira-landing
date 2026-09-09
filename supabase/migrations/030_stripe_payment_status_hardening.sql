BEGIN;

-- ============================================================
-- MODIRA — 030_stripe_payment_status_hardening.sql
--
-- Impide estados arbitrarios en payments.status.
-- Estados permitidos:
-- - failed
-- - canceled
-- - succeeded
-- ============================================================

ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments
ADD CONSTRAINT payments_status_check
CHECK (
    status IN (
        'failed',
        'canceled',
        'succeeded'
    )
);

COMMIT;