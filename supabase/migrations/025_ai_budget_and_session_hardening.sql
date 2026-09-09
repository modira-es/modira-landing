BEGIN;

-- ============================================================
-- MODIRA — 025_ai_budget_and_session_hardening.sql
--
-- Corrige hallazgos de auditoría:
--
--   V-01  budget_cents / anonymous_budget_cents eran NULL,
--         de modo que la única protección económica de Modira AI
--         eran los límites de peticiones y tokens. Esta migración
--         activa límites económicos reales (coste máximo en céntimos
--         por periodo para usuarios autenticados y anónimos).
--
--   V-07  ai_conversations.session_id era TEXT libre. La Edge
--         Function escribe claves compuestas
--             <uuid>:<uuid>                          (autenticado)
--             anon-ip:<64 hex>:<uuid>                (anónimo)
--         Esta migración añade una restricción CHECK de integridad
--         tras normalizar cualquier fila legacy.
--
-- No se pierde ningún dato: las filas legacy se renombran de forma
-- determinista a formato conforme.
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
          AND table_name = 'ai_quota_config'
    ) THEN
        RAISE EXCEPTION
            '025 stopped: public.ai_quota_config does not exist (019 required)';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'ai_conversations'
    ) THEN
        RAISE EXCEPTION
            '025 stopped: public.ai_conversations does not exist (007 required)';
    END IF;

END $$;


-- ============================================================
-- 2. PRESUPUESTO ECONÓMICO REAL (V-01)
-- ============================================================
--
-- Los valores son CÉNTIMOS por periodo:
--
--   budget_cents            = 200  → 2,00 € por hora  (autenticados)
--   anonymous_budget_cents  = 100  → 1,00 € por 24 h  (anónimos)
--
-- La reserva de cuota (reserve_ai_quota_for_user /
-- reserve_ai_anonymous_quota) compara coste estimado + reservado
-- contra este tope ANTES de llamar a OpenAI, y finalize_ai_quota
-- concilia el uso real.
--
-- Si el coste real de OpenAI cambia, estos valores se ajustan con
-- una operación administrativa (UPDATE mediante service_role) sin
-- necesidad de redeploy.
-- ============================================================

UPDATE public.ai_quota_config
SET
    budget_cents           = 200,
    anonymous_budget_cents = 100,
    updated_at             = CURRENT_TIMESTAMP
WHERE config_key = 'modira-ai';


-- ============================================================
-- 3. VERIFICACIÓN DEL PRESUPUESTO
-- ============================================================

DO $$
DECLARE
    v_budget NUMERIC;
    v_anon_budget NUMERIC;
BEGIN

    SELECT budget_cents, anonymous_budget_cents
    INTO v_budget, v_anon_budget
    FROM public.ai_quota_config
    WHERE config_key = 'modira-ai';

    IF v_budget IS NULL THEN
        RAISE EXCEPTION
            '025 failed: budget_cents must not be NULL for modira-ai';
    END IF;

    IF v_anon_budget IS NULL THEN
        RAISE EXCEPTION
            '025 failed: anonymous_budget_cents must not be NULL for modira-ai';
    END IF;

END $$;


-- ============================================================
-- 4. NORMALIZACIÓN DE SESSION_IDS LEGACY (antes de la constraint)
-- ============================================================
--
-- Formatos conformes que se respetan tal cual:
--
--   <uuid>:<uuid>
--   anon-ip:<64 hex>:<uuid>
--
-- Cualquier otro valor (por ejemplo session_id = uuid plano de
-- épocas anteriores a 019) se renombra de forma determinista:
--
--   anon-ip:<sha256 del valor original>:<uuid final>
--
-- sha256 garantiza 64 hex y unicidad estable (dos filas distintas
-- no pueden colisionar porque el hash depende del valor original,
-- que ya era único por el índice UNIQUE de session_id).
-- ============================================================

UPDATE public.ai_conversations
SET session_id =
        'anon-ip:'
        || encode(extensions.digest(session_id, 'sha256'), 'hex')
        || ':'
        || COALESCE(
               CASE
                   WHEN (string_to_array(session_id, ':'))
                        [array_length(string_to_array(session_id, ':'), 1)]
                        ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                   THEN (string_to_array(session_id, ':'))
                        [array_length(string_to_array(session_id, ':'), 1)]
                   ELSE gen_random_uuid()::TEXT
               END,
               gen_random_uuid()::TEXT
           )
WHERE session_id !~ '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|anon-ip:[0-9a-f]{64}):[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';


-- ============================================================
-- 5. INTEGRIDAD DE SESSION_ID (V-07)
-- ============================================================

ALTER TABLE public.ai_conversations
DROP CONSTRAINT IF EXISTS ai_conversations_session_id_format_check;

ALTER TABLE public.ai_conversations
ADD CONSTRAINT ai_conversations_session_id_format_check
CHECK (
    session_id ~ '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|anon-ip:[0-9a-f]{64}):[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND length(session_id) <= 150
);


-- ============================================================
-- 6. VERIFICACIÓN DE LA CONSTRAINT
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_count
    FROM pg_constraint
    WHERE conrelid = 'public.ai_conversations'::regclass
      AND conname = 'ai_conversations_session_id_format_check';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            '025 failed: ai_conversations_session_id_format_check is missing';
    END IF;

END $$;


COMMIT;
