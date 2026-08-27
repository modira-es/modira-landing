BEGIN;

-- ============================================================
-- MODIRA — 007_ai_conversations.sql
--
-- SISTEMA MODIRA AI
--
-- Crea:
--   - ai_conversations
--   - ai_messages
--
-- Funcionalidad:
--   - Conversaciones anónimas del chatbot de la landing.
--   - Identificación mediante session_id.
--   - Detección opcional de empresa y sector.
--   - Persistencia de mensajes usuario/asistente.
--   - Consulta interna por trabajadores activos y administradores.
--   - Acceso de escritura de la Edge Function mediante service_role.
--
-- IMPORTANTE:
-- Esta migración deja COMPLETAMENTE configurados los permisos
-- necesarios para la Edge Function modira-ai.
--
-- No depende de ninguna migración posterior para que el chatbot
-- pueda funcionar.
-- ============================================================


-- ============================================================
-- 1. TABLA DE CONVERSACIONES
-- ============================================================

CREATE TABLE public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificador persistente de la sesión del chatbot.
    -- El frontend lo guarda en localStorage.
    session_id TEXT NOT NULL,

    -- Empresa de Modira, si en el futuro la conversación
    -- puede relacionarse con una empresa existente.
    --
    -- Para visitantes anónimos normalmente será NULL.
    company_id UUID
        REFERENCES public.companies(id)
        ON DELETE SET NULL,

    -- Datos que la IA puede detectar durante la conversación.
    company_name TEXT,
    business_type TEXT,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ai_conversations_session_id_check
        CHECK (LENGTH(TRIM(session_id)) > 0)
);


-- ============================================================
-- 2. ÍNDICES DE CONVERSACIONES
-- ============================================================

CREATE UNIQUE INDEX idx_ai_conversations_session_id
ON public.ai_conversations(session_id);

CREATE INDEX idx_ai_conversations_company_id
ON public.ai_conversations(company_id);

CREATE INDEX idx_ai_conversations_created_at
ON public.ai_conversations(created_at DESC);

CREATE INDEX idx_ai_conversations_updated_at
ON public.ai_conversations(updated_at DESC);


-- ============================================================
-- 3. TABLA DE MENSAJES
-- ============================================================

CREATE TABLE public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL
        REFERENCES public.ai_conversations(id)
        ON DELETE CASCADE,

    role TEXT NOT NULL,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ai_messages_role_check
        CHECK (
            role IN ('user', 'assistant')
        ),

    CONSTRAINT ai_messages_content_check
        CHECK (
            LENGTH(TRIM(content)) > 0
        )
);


-- ============================================================
-- 4. ÍNDICES DE MENSAJES
-- ============================================================

CREATE INDEX idx_ai_messages_conversation_id
ON public.ai_messages(conversation_id);

CREATE INDEX idx_ai_messages_created_at
ON public.ai_messages(created_at);


-- ============================================================
-- 5. TRIGGER updated_at
-- ============================================================
--
-- Utiliza la función global:
--
--   public.update_updated_at_column()
--
-- Esta función ya forma parte de la infraestructura común
-- de Modira.
-- ============================================================

CREATE TRIGGER update_ai_conversations_updated_at
BEFORE UPDATE
ON public.ai_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.ai_conversations
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_messages
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 7. POLÍTICA — TRABAJADORES ACTIVOS
-- ============================================================
--
-- Los trabajadores activos pueden consultar las conversaciones
-- desde el Área de Empleados.
--
-- current_user_is_worker() comprueba que:
--   - auth.uid() pertenece a workers
--   - workers.is_active = TRUE
-- ============================================================

CREATE POLICY ai_conversations_worker_select
ON public.ai_conversations
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


CREATE POLICY ai_messages_worker_select
ON public.ai_messages
FOR SELECT
TO authenticated
USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 8. POLÍTICA — ADMINISTRADORES
-- ============================================================

CREATE POLICY ai_conversations_admin_select
ON public.ai_conversations
FOR SELECT
TO authenticated
USING (
    public.current_user_is_admin()
);


CREATE POLICY ai_messages_admin_select
ON public.ai_messages
FOR SELECT
TO authenticated
USING (
    public.current_user_is_admin()
);


-- ============================================================
-- 9. PERMISOS DEL ROL AUTHENTICATED
-- ============================================================
--
-- Los usuarios autenticados NO reciben INSERT, UPDATE ni DELETE.
--
-- Solo reciben SELECT.
--
-- RLS determina qué filas pueden consultar.
-- ============================================================

REVOKE ALL
ON public.ai_conversations
FROM anon, authenticated;

REVOKE ALL
ON public.ai_messages
FROM anon, authenticated;


GRANT SELECT
ON public.ai_conversations
TO authenticated;

GRANT SELECT
ON public.ai_messages
TO authenticated;


-- ============================================================
-- 10. PERMISOS DEL ROL SERVICE_ROLE
-- ============================================================
--
-- MUY IMPORTANTE.
--
-- La Edge Function:
--
--   modira-ai
--
-- utiliza:
--
--   SUPABASE_SERVICE_ROLE_KEY
--
-- Por tanto necesita acceso explícito a estas tablas.
--
-- No se concede ningún permiso equivalente a anon.
--
-- La Edge Function necesita:
--
--   ai_conversations:
--       SELECT
--       INSERT
--       UPDATE
--
--   ai_messages:
--       SELECT
--       INSERT
--       UPDATE
-- ============================================================


GRANT USAGE
ON SCHEMA public
TO service_role;


-- ------------------------------------------------------------
-- AI_CONVERSATIONS
-- ------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE
ON public.ai_conversations
TO service_role;


-- ------------------------------------------------------------
-- AI_MESSAGES
-- ------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE
ON public.ai_messages
TO service_role;


-- ============================================================
-- 11. VERIFICACIONES DE PERMISOS SERVICE_ROLE
-- ============================================================

DO $$
BEGIN

    -- --------------------------------------------------------
    -- ai_conversations SELECT
    -- --------------------------------------------------------

    IF NOT has_table_privilege(
        'service_role',
        'public.ai_conversations',
        'SELECT'
    ) THEN

        RAISE EXCEPTION
            '007 failed: service_role does not have SELECT on ai_conversations';

    END IF;


    -- --------------------------------------------------------
    -- ai_conversations INSERT
    -- --------------------------------------------------------

    IF NOT has_table_privilege(
        'service_role',
        'public.ai_conversations',
        'INSERT'
    ) THEN

        RAISE EXCEPTION
            '007 failed: service_role does not have INSERT on ai_conversations';

    END IF;


    -- --------------------------------------------------------
    -- ai_conversations UPDATE
    -- --------------------------------------------------------

    IF NOT has_table_privilege(
        'service_role',
        'public.ai_conversations',
        'UPDATE'
    ) THEN

        RAISE EXCEPTION
            '007 failed: service_role does not have UPDATE on ai_conversations';

    END IF;


    -- --------------------------------------------------------
    -- ai_messages SELECT
    -- --------------------------------------------------------

    IF NOT has_table_privilege(
        'service_role',
        'public.ai_messages',
        'SELECT'
    ) THEN

        RAISE EXCEPTION
            '007 failed: service_role does not have SELECT on ai_messages';

    END IF;


    -- --------------------------------------------------------
    -- ai_messages INSERT
    -- --------------------------------------------------------

    IF NOT has_table_privilege(
        'service_role',
        'public.ai_messages',
        'INSERT'
    ) THEN

        RAISE EXCEPTION
            '007 failed: service_role does not have INSERT on ai_messages';

    END IF;


    -- --------------------------------------------------------
    -- ai_messages UPDATE
    -- --------------------------------------------------------

    IF NOT has_table_privilege(
        'service_role',
        'public.ai_messages',
        'UPDATE'
    ) THEN

        RAISE EXCEPTION
            '007 failed: service_role does not have UPDATE on ai_messages';

    END IF;


    -- --------------------------------------------------------
    -- Schema usage
    -- --------------------------------------------------------

    IF NOT has_schema_privilege(
        'service_role',
        'public',
        'USAGE'
    ) THEN

        RAISE EXCEPTION
            '007 failed: service_role does not have USAGE on schema public';

    END IF;

END $$;


-- ============================================================
-- 12. VERIFICACIONES DE ESTRUCTURA
-- ============================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    -- --------------------------------------------------------
    -- ai_conversations
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ai_conversations';

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: ai_conversations does not exist';

    END IF;


    -- --------------------------------------------------------
    -- ai_messages
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ai_messages';

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: ai_messages does not exist';

    END IF;


    -- --------------------------------------------------------
    -- company_name
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_conversations'
      AND column_name = 'company_name';

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: company_name column is missing';

    END IF;


    -- --------------------------------------------------------
    -- business_type
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_conversations'
      AND column_name = 'business_type';

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: business_type column is missing';

    END IF;


    -- --------------------------------------------------------
    -- company_id
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_conversations'
      AND column_name = 'company_id';

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: company_id column is missing';

    END IF;


    -- --------------------------------------------------------
    -- session_id
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_conversations'
      AND column_name = 'session_id';

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: session_id column is missing';

    END IF;


    -- --------------------------------------------------------
    -- conversation_id
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_messages'
      AND column_name = 'conversation_id';

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: conversation_id column is missing';

    END IF;


    -- --------------------------------------------------------
    -- role
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_messages'
      AND column_name = 'role';

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: role column is missing';

    END IF;


    -- --------------------------------------------------------
    -- content
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_messages'
      AND column_name = 'content';

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: content column is missing';

    END IF;

END $$;


-- ============================================================
-- 13. VERIFICACIONES RLS
-- ============================================================

DO $$
BEGIN

    -- --------------------------------------------------------
    -- RLS conversations
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_class
        WHERE oid = 'public.ai_conversations'::regclass
          AND relrowsecurity = TRUE
    ) THEN

        RAISE EXCEPTION
            '007 failed: RLS is not enabled on ai_conversations';

    END IF;


    -- --------------------------------------------------------
    -- RLS messages
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_class
        WHERE oid = 'public.ai_messages'::regclass
          AND relrowsecurity = TRUE
    ) THEN

        RAISE EXCEPTION
            '007 failed: RLS is not enabled on ai_messages';

    END IF;


    -- --------------------------------------------------------
    -- Worker policy conversations
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'ai_conversations'
          AND policyname = 'ai_conversations_worker_select'
    ) THEN

        RAISE EXCEPTION
            '007 failed: ai_conversations_worker_select is missing';

    END IF;


    -- --------------------------------------------------------
    -- Admin policy conversations
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'ai_conversations'
          AND policyname = 'ai_conversations_admin_select'
    ) THEN

        RAISE EXCEPTION
            '007 failed: ai_conversations_admin_select is missing';

    END IF;


    -- --------------------------------------------------------
    -- Worker policy messages
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'ai_messages'
          AND policyname = 'ai_messages_worker_select'
    ) THEN

        RAISE EXCEPTION
            '007 failed: ai_messages_worker_select is missing';

    END IF;


    -- --------------------------------------------------------
    -- Admin policy messages
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'ai_messages'
          AND policyname = 'ai_messages_admin_select'
    ) THEN

        RAISE EXCEPTION
            '007 failed: ai_messages_admin_select is missing';

    END IF;

END $$;


-- ============================================================
-- 14. VERIFICACIÓN DE CONSTRAINTS
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.ai_messages'::regclass
          AND conname = 'ai_messages_role_check'
    ) THEN

        RAISE EXCEPTION
            '007 failed: ai_messages_role_check is missing';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.ai_messages'::regclass
          AND conname = 'ai_messages_content_check'
    ) THEN

        RAISE EXCEPTION
            '007 failed: ai_messages_content_check is missing';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.ai_conversations'::regclass
          AND conname = 'ai_conversations_session_id_check'
    ) THEN

        RAISE EXCEPTION
            '007 failed: ai_conversations_session_id_check is missing';

    END IF;

END $$;


COMMIT;


-- ============================================================
-- RESULTADO FINAL — MODIRA AI
-- ============================================================
--
-- VISITANTE ANÓNIMO
--        │
--        ▼
--    AIChatBot
--        │
--        ▼
--    modira-ai
--        │
--        ├──────────────► OpenAI
--        │
--        ▼
-- ai_conversations
--        │
--        └──────────────► ai_messages
--
--
-- DATOS DE CONVERSACIÓN
--
-- session_id
-- company_id
-- company_name
-- business_type
--
--
-- ACCESO
--
-- VISITANTE
--    │
--    └── ❌ acceso directo a las tablas
--
-- TRABAJADOR ACTIVO
--    │
--    └── ✅ SELECT mediante RLS
--
-- ADMIN
--    │
--    └── ✅ SELECT mediante RLS
--
-- EDGE FUNCTION
--    │
--    └── service_role
--         ├── SELECT
--         ├── INSERT
--         └── UPDATE
--
-- ============================================================