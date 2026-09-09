BEGIN;

-- ============================================================
-- MODIRA 029 — AI abandoned reservation cleanup
-- ============================================================
--
-- OBJETIVO:
--
-- Gestionar reservas AI que hayan quedado en estado 'reserved'
-- porque la Edge Function terminó abruptamente antes de llamar
-- a finalize_ai_quota().
--
-- IMPORTANTE:
--
-- - NO elimina ai_conversations.
-- - NO elimina ai_messages.
-- - NO elimina ai_usage_reservations.
-- - Las reservas abandonadas pasan a estado 'expired'.
-- - Se liberan únicamente los contadores del período al que
--   pertenecía realmente la reserva.
--
-- Esto evita que una reserva de un período anterior pueda
-- modificar accidentalmente los contadores de un período nuevo.
--
-- ============================================================


-- ============================================================
-- 1. CLEANUP DE RESERVAS EXPIRADAS
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_ai_usage_reservations()

RETURNS INTEGER

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = pg_catalog, public, pg_temp

AS $$

DECLARE

    r public.ai_usage_reservations;

    v_now TIMESTAMPTZ := clock_timestamp();

    v_count INTEGER := 0;

BEGIN

    /*
     * Procesamos únicamente reservas todavía pendientes.
     *
     * FOR UPDATE SKIP LOCKED evita competir con otra ejecución
     * simultánea del cleanup o con finalize_ai_quota().
     */

    FOR r IN

        SELECT *

        FROM public.ai_usage_reservations

        WHERE status = 'reserved'
          AND expires_at <= v_now

        ORDER BY expires_at

        FOR UPDATE SKIP LOCKED

    LOOP

        -- ====================================================
        -- RESERVA ANÓNIMA
        -- ====================================================

        IF r.scope_key LIKE 'anon-ip:%'
        THEN

            /*
             * El advisory lock es el mismo utilizado por
             * reserve_ai_anonymous_quota().
             *
             * Esto evita modificar los contadores mientras
             * otra reserva para la misma identidad está siendo
             * creada.
             */

            PERFORM pg_advisory_xact_lock(
                hashtextextended(
                    r.scope_key,
                    19020
                )
            );


            /*
             * Solo liberamos contadores si la fila actual
             * corresponde todavía al período en el que nació
             * la reserva.
             *
             * Si el período ya terminó y fue renovado, sus
             * reserved_* ya fueron reiniciados y NO debemos
             * restarlos de nuevo.
             */

            UPDATE public.ai_anonymous_quota_periods

            SET

                reserved_requests =
                    GREATEST(
                        0,
                        reserved_requests - 1
                    ),

                reserved_input_tokens =
                    GREATEST(
                        0,
                        reserved_input_tokens
                        - r.estimated_input_tokens
                    ),

                reserved_output_tokens =
                    GREATEST(
                        0,
                        reserved_output_tokens
                        - r.estimated_output_tokens
                    ),

                reserved_cost_cents =
                    GREATEST(
                        0,
                        reserved_cost_cents
                        - r.estimated_cost_cents
                    ),

                updated_at = v_now

            WHERE identity_key = r.scope_key

              AND period_started_at <= r.expires_at

              AND period_ends_at > r.expires_at;


        ELSE

            -- =================================================
            -- RESERVA AUTENTICADA
            -- =================================================

            PERFORM pg_advisory_xact_lock(
                hashtextextended(
                    r.scope_key,
                    19019
                )
            );


            /*
             * Liberar solamente si la reserva pertenece al
             * período actualmente almacenado.
             */

            UPDATE public.ai_usage_periods

            SET

                reserved_requests =
                    GREATEST(
                        0,
                        reserved_requests - 1
                    ),

                reserved_input_tokens =
                    GREATEST(
                        0,
                        reserved_input_tokens
                        - r.estimated_input_tokens
                    ),

                reserved_output_tokens =
                    GREATEST(
                        0,
                        reserved_output_tokens
                        - r.estimated_output_tokens
                    ),

                reserved_cost_cents =
                    GREATEST(
                        0,
                        reserved_cost_cents
                        - r.estimated_cost_cents
                    ),

                updated_at = v_now

            WHERE scope_key = r.scope_key

              AND period_started_at <= r.expires_at

              AND period_ends_at > r.expires_at;


            -- ================================================
            -- CUOTA EMPRESA
            -- ================================================
            --
            -- La reserva de empresa se libera si existe
            -- company_id, independientemente de la configuración
            -- actual de company_request_limit.
            --
            -- Esto evita dejar contadores bloqueados si la
            -- configuración cambia después de crear la reserva.
            --

            IF r.company_id IS NOT NULL
            THEN

                PERFORM pg_advisory_xact_lock(
                    hashtextextended(
                        'company:' || r.company_id::TEXT,
                        19019
                    )
                );


                UPDATE public.ai_usage_periods

                SET

                    reserved_requests =
                        GREATEST(
                            0,
                            reserved_requests - 1
                        ),

                    reserved_input_tokens =
                        GREATEST(
                            0,
                            reserved_input_tokens
                            - r.estimated_input_tokens
                        ),

                    reserved_output_tokens =
                        GREATEST(
                            0,
                            reserved_output_tokens
                            - r.estimated_output_tokens
                        ),

                    reserved_cost_cents =
                        GREATEST(
                            0,
                            reserved_cost_cents
                            - r.estimated_cost_cents
                        ),

                    updated_at = v_now

                WHERE scope_key =
                    'company:' || r.company_id::TEXT

                  AND period_started_at <= r.expires_at

                  AND period_ends_at > r.expires_at;

            END IF;

        END IF;


        -- ====================================================
        -- MARCAR RESERVA COMO EXPIRADA
        -- ====================================================

        UPDATE public.ai_usage_reservations

        SET

            status = 'expired',

            finalized_at = v_now

        WHERE id = r.id

          AND status = 'reserved';


        IF FOUND
        THEN
            v_count := v_count + 1;
        END IF;

    END LOOP;


    RETURN v_count;

END;

$$;


-- ============================================================
-- 2. PERMISOS DEL CLEANUP
-- ============================================================

REVOKE ALL
ON FUNCTION public.cleanup_ai_usage_reservations()
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE
ON FUNCTION public.cleanup_ai_usage_reservations()
TO service_role;


-- ============================================================
-- 3. FINALIZE AI QUOTA — HARDENING DE EXPIRACIÓN
-- ============================================================
--
-- Si una Edge Function intenta finalizar una reserva después
-- de su expiración:
--
--     reserved -> expired
--
-- y nunca:
--
--     reserved -> consumed
--
-- La conversación y los mensajes no se modifican aquí.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.finalize_ai_quota(

    p_reservation_id UUID,

    p_actual_input_tokens INTEGER,

    p_actual_output_tokens INTEGER,

    p_actual_cost_cents NUMERIC,

    p_success BOOLEAN

)

RETURNS BOOLEAN

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = pg_catalog, public, pg_temp

AS $$

DECLARE

    r public.ai_usage_reservations;

    c public.ai_quota_config;

    v_now TIMESTAMPTZ := clock_timestamp();

BEGIN

    -- ========================================================
    -- VALIDACIÓN
    -- ========================================================

    IF p_actual_input_tokens < 0
       OR p_actual_output_tokens < 0
       OR p_actual_cost_cents < 0
    THEN

        RAISE EXCEPTION
            'Invalid AI usage';

    END IF;


    -- ========================================================
    -- CONFIGURACIÓN
    -- ========================================================

    SELECT *
    INTO c

    FROM public.ai_quota_config

    WHERE config_key = 'modira-ai';


    -- ========================================================
    -- RESERVA
    -- ========================================================

    SELECT *
    INTO r

    FROM public.ai_usage_reservations

    WHERE id = p_reservation_id

    FOR UPDATE;


    IF NOT FOUND
       OR r.status <> 'reserved'
    THEN

        RETURN FALSE;

    END IF;


    -- ========================================================
    -- RESERVA EXPIRADA
    -- ========================================================
    --
    -- La Edge Function no puede consumir una reserva cuyo TTL
    -- ya haya terminado.
    --

    IF r.expires_at <= v_now
    THEN

        /*
         * Utilizar los mismos locks que las funciones de
         * reserva/cleanup.
         */

        IF r.scope_key LIKE 'anon-ip:%'
        THEN

            PERFORM pg_advisory_xact_lock(
                hashtextextended(
                    r.scope_key,
                    19020
                )
            );


            UPDATE public.ai_anonymous_quota_periods

            SET

                reserved_requests =
                    GREATEST(
                        0,
                        reserved_requests - 1
                    ),

                reserved_input_tokens =
                    GREATEST(
                        0,
                        reserved_input_tokens
                        - r.estimated_input_tokens
                    ),

                reserved_output_tokens =
                    GREATEST(
                        0,
                        reserved_output_tokens
                        - r.estimated_output_tokens
                    ),

                reserved_cost_cents =
                    GREATEST(
                        0,
                        reserved_cost_cents
                        - r.estimated_cost_cents
                    ),

                updated_at = v_now

            WHERE identity_key = r.scope_key

              AND period_started_at <= r.expires_at

              AND period_ends_at > r.expires_at;


        ELSE

            PERFORM pg_advisory_xact_lock(
                hashtextextended(
                    r.scope_key,
                    19019
                )
            );


            UPDATE public.ai_usage_periods

            SET

                reserved_requests =
                    GREATEST(
                        0,
                        reserved_requests - 1
                    ),

                reserved_input_tokens =
                    GREATEST(
                        0,
                        reserved_input_tokens
                        - r.estimated_input_tokens
                    ),

                reserved_output_tokens =
                    GREATEST(
                        0,
                        reserved_output_tokens
                        - r.estimated_output_tokens
                    ),

                reserved_cost_cents =
                    GREATEST(
                        0,
                        reserved_cost_cents
                        - r.estimated_cost_cents
                    ),

                updated_at = v_now

            WHERE scope_key = r.scope_key

              AND period_started_at <= r.expires_at

              AND period_ends_at > r.expires_at;


            IF r.company_id IS NOT NULL
            THEN

                PERFORM pg_advisory_xact_lock(
                    hashtextextended(
                        'company:' || r.company_id::TEXT,
                        19019
                    )
                );


                UPDATE public.ai_usage_periods

                SET

                    reserved_requests =
                        GREATEST(
                            0,
                            reserved_requests - 1
                        ),

                    reserved_input_tokens =
                        GREATEST(
                            0,
                            reserved_input_tokens
                            - r.estimated_input_tokens
                        ),

                    reserved_output_tokens =
                        GREATEST(
                            0,
                            reserved_output_tokens
                            - r.estimated_output_tokens
                        ),

                    reserved_cost_cents =
                        GREATEST(
                            0,
                            reserved_cost_cents
                            - r.estimated_cost_cents
                        ),

                    updated_at = v_now

                WHERE scope_key =
                    'company:' || r.company_id::TEXT

                  AND period_started_at <= r.expires_at

                  AND period_ends_at > r.expires_at;

            END IF;

        END IF;


        UPDATE public.ai_usage_reservations

        SET

            status = 'expired',

            finalized_at = v_now

        WHERE id = r.id

          AND status = 'reserved';


        RETURN FALSE;

    END IF;


    -- ========================================================
    -- CUOTA ANÓNIMA
    -- ========================================================

    IF r.scope_key LIKE 'anon-ip:%'
    THEN

        PERFORM pg_advisory_xact_lock(
            hashtextextended(
                r.scope_key,
                19020
            )
        );


        UPDATE public.ai_anonymous_quota_periods

        SET

            reserved_requests =
                GREATEST(
                    0,
                    reserved_requests - 1
                ),

            reserved_input_tokens =
                GREATEST(
                    0,
                    reserved_input_tokens
                    - r.estimated_input_tokens
                ),

            reserved_output_tokens =
                GREATEST(
                    0,
                    reserved_output_tokens
                    - r.estimated_output_tokens
                ),

            reserved_cost_cents =
                GREATEST(
                    0,
                    reserved_cost_cents
                    - r.estimated_cost_cents
                ),

            request_count =
                request_count
                + CASE
                    WHEN p_success THEN 1
                    ELSE 0
                  END,

            input_tokens =
                input_tokens
                + CASE
                    WHEN p_success
                    THEN p_actual_input_tokens
                    ELSE 0
                  END,

            output_tokens =
                output_tokens
                + CASE
                    WHEN p_success
                    THEN p_actual_output_tokens
                    ELSE 0
                  END,

            cost_cents =
                cost_cents
                + CASE
                    WHEN p_success
                    THEN p_actual_cost_cents
                    ELSE 0
                  END,

            updated_at = v_now

        WHERE identity_key = r.scope_key;


    ELSE

        -- ====================================================
        -- CUOTA AUTENTICADA
        -- ====================================================

        PERFORM pg_advisory_xact_lock(
            hashtextextended(
                r.scope_key,
                19019
            )
        );


        UPDATE public.ai_usage_periods

        SET

            reserved_requests =
                GREATEST(
                    0,
                    reserved_requests - 1
                ),

            reserved_input_tokens =
                GREATEST(
                    0,
                    reserved_input_tokens
                    - r.estimated_input_tokens
                ),

            reserved_output_tokens =
                GREATEST(
                    0,
                    reserved_output_tokens
                    - r.estimated_output_tokens
                ),

            reserved_cost_cents =
                GREATEST(
                    0,
                    reserved_cost_cents
                    - r.estimated_cost_cents
                ),

            request_count =
                request_count
                + CASE
                    WHEN p_success THEN 1
                    ELSE 0
                  END,

            input_tokens =
                input_tokens
                + CASE
                    WHEN p_success
                    THEN p_actual_input_tokens
                    ELSE 0
                  END,

            output_tokens =
                output_tokens
                + CASE
                    WHEN p_success
                    THEN p_actual_output_tokens
                    ELSE 0
                  END,

            cost_cents =
                cost_cents
                + CASE
                    WHEN p_success
                    THEN p_actual_cost_cents
                    ELSE 0
                  END,

            updated_at = v_now

        WHERE scope_key = r.scope_key;


        -- ====================================================
        -- CUOTA EMPRESA
        -- ====================================================

        IF r.company_id IS NOT NULL
        THEN

            PERFORM pg_advisory_xact_lock(
                hashtextextended(
                    'company:' || r.company_id::TEXT,
                    19019
                )
            );


            UPDATE public.ai_usage_periods

            SET

                reserved_requests =
                    GREATEST(
                        0,
                        reserved_requests - 1
                    ),

                reserved_input_tokens =
                    GREATEST(
                        0,
                        reserved_input_tokens
                        - r.estimated_input_tokens
                    ),

                reserved_output_tokens =
                    GREATEST(
                        0,
                        reserved_output_tokens
                        - r.estimated_output_tokens
                    ),

                reserved_cost_cents =
                    GREATEST(
                        0,
                        reserved_cost_cents
                        - r.estimated_cost_cents
                    ),

                request_count =
                    request_count
                    + CASE
                        WHEN p_success THEN 1
                        ELSE 0
                      END,

                input_tokens =
                    input_tokens
                    + CASE
                        WHEN p_success
                        THEN p_actual_input_tokens
                        ELSE 0
                      END,

                output_tokens =
                    output_tokens
                    + CASE
                        WHEN p_success
                        THEN p_actual_output_tokens
                        ELSE 0
                      END,

                cost_cents =
                    cost_cents
                    + CASE
                        WHEN p_success
                        THEN p_actual_cost_cents
                        ELSE 0
                      END,

                updated_at = v_now

            WHERE scope_key =
                'company:' || r.company_id::TEXT;

        END IF;

    END IF;


    -- ========================================================
    -- ESTADO FINAL
    -- ========================================================

    UPDATE public.ai_usage_reservations

    SET

        status =
            CASE
                WHEN p_success
                THEN 'consumed'
                ELSE 'released'
            END,

        actual_input_tokens =
            p_actual_input_tokens,

        actual_output_tokens =
            p_actual_output_tokens,

        actual_cost_cents =
            p_actual_cost_cents,

        finalized_at = v_now

    WHERE id = p_reservation_id

      AND status = 'reserved';


    RETURN TRUE;

END;

$$;


-- ============================================================
-- 4. PERMISOS — REAFIRMAR SERVICE_ROLE ONLY
-- ============================================================

REVOKE ALL
ON FUNCTION public.finalize_ai_quota(
    UUID,
    INTEGER,
    INTEGER,
    NUMERIC,
    BOOLEAN
)
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE
ON FUNCTION public.finalize_ai_quota(
    UUID,
    INTEGER,
    INTEGER,
    NUMERIC,
    BOOLEAN
)
TO service_role;


-- ============================================================
-- 5. VERIFICACIÓN
-- ============================================================

DO $$

DECLARE

    v_security_definer BOOLEAN;

    v_anon_execute BOOLEAN;

    v_authenticated_execute BOOLEAN;

    v_service_role_execute BOOLEAN;

BEGIN

    SELECT
        p.prosecdef

    INTO v_security_definer

    FROM pg_proc p

    JOIN pg_namespace n
      ON n.oid = p.pronamespace

    WHERE n.nspname = 'public'
      AND p.proname =
          'cleanup_ai_usage_reservations'
      AND pg_get_function_identity_arguments(p.oid) = '';


    IF NOT COALESCE(v_security_definer, FALSE)
    THEN

        RAISE EXCEPTION
            '029 failed: cleanup function is not SECURITY DEFINER';

    END IF;


    SELECT
        has_function_privilege(
            'anon',
            'public.cleanup_ai_usage_reservations()',
            'EXECUTE'
        ),

        has_function_privilege(
            'authenticated',
            'public.cleanup_ai_usage_reservations()',
            'EXECUTE'
        ),

        has_function_privilege(
            'service_role',
            'public.cleanup_ai_usage_reservations()',
            'EXECUTE'
        )

    INTO
        v_anon_execute,
        v_authenticated_execute,
        v_service_role_execute;


    IF v_anon_execute
       OR v_authenticated_execute
       OR NOT v_service_role_execute
    THEN

        RAISE EXCEPTION
            '029 failed: cleanup RPC grants incorrect';

    END IF;


    IF has_function_privilege(
        'anon',
        'public.finalize_ai_quota(UUID,INTEGER,INTEGER,NUMERIC,BOOLEAN)',
        'EXECUTE'
    )
    OR has_function_privilege(
        'authenticated',
        'public.finalize_ai_quota(UUID,INTEGER,INTEGER,NUMERIC,BOOLEAN)',
        'EXECUTE'
    )
    OR NOT has_function_privilege(
        'service_role',
        'public.finalize_ai_quota(UUID,INTEGER,INTEGER,NUMERIC,BOOLEAN)',
        'EXECUTE'
    )
    THEN

        RAISE EXCEPTION
            '029 failed: finalize RPC grants incorrect';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'ai_usage_reservations'
          AND indexname =
              'idx_ai_usage_reservations_expiry'
    )
    THEN

        RAISE EXCEPTION
            '029 failed: reservation expiry index missing';

    END IF;


END;

$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
COMMIT;