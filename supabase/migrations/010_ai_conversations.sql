-- ============================================================
-- MODIRA
-- 010_ai_conversations.sql
--
-- SISTEMA DE CONVERSACIONES DE MODIRA AI
--
-- Crea:
--
--   ai_conversations
--   ai_messages
--
-- Las conversaciones proceden del chatbot de la landing.
--
-- Los visitantes son ANÓNIMOS.
--
-- La conversación se identifica mediante session_id.
--
-- La IA puede detectar, cuando el visitante lo proporciona:
--
--   company_name
--   business_type
--
-- company_id se mantiene NULL para visitantes anónimos.
-- En el futuro podrá utilizarse para relacionar una
-- conversación con una empresa real de Modira.
--
-- La Edge Function modira-ai utiliza service_role
-- para guardar y actualizar las conversaciones.
--
-- Los trabajadores activos y administradores podrán
-- consultar las conversaciones desde el área interna.
--
-- ============================================================


BEGIN;


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    -- --------------------------------------------------------
    -- Comprobar companies
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'companies'
    ) THEN

        RAISE EXCEPTION
            '010 stopped: public.companies does not exist';

    END IF;


    -- --------------------------------------------------------
    -- Comprobar función de trabajador
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
          ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_is_worker'
    ) THEN

        RAISE EXCEPTION
            '010 stopped: current_user_is_worker() does not exist';

    END IF;


    -- --------------------------------------------------------
    -- Comprobar función de administrador
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
          ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_is_admin'
    ) THEN

        RAISE EXCEPTION
            '010 stopped: current_user_is_admin() does not exist';

    END IF;

END $$;


-- ============================================================
-- 2. TABLA AI_CONVERSATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_conversations (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    -- --------------------------------------------------------
    -- SESIÓN ANÓNIMA DEL VISITANTE
    -- --------------------------------------------------------

    session_id TEXT,

    -- --------------------------------------------------------
    -- EMPRESA REAL DE MODIRA
    --
    -- Normalmente NULL para visitantes anónimos.
    --
    -- Si en el futuro la conversación se relaciona con
    -- una empresa registrada en Modira, se podrá utilizar.
    -- --------------------------------------------------------

    company_id UUID
        REFERENCES public.companies(id)
        ON DELETE SET NULL,

    -- --------------------------------------------------------
    -- NOMBRE DE EMPRESA DECLARADO POR EL VISITANTE
    --
    -- Ejemplo:
    --
    -- "Mi empresa se llama Fontanerías Pérez"
    --
    -- company_name = "Fontanerías Pérez"
    -- --------------------------------------------------------

    company_name TEXT,

    -- --------------------------------------------------------
    -- TIPO / SECTOR DE NEGOCIO DETECTADO
    --
    -- Ejemplo:
    --
    -- "Somos una empresa de fontanería"
    --
    -- business_type = "Fontanería"
    -- --------------------------------------------------------

    business_type TEXT,

    -- --------------------------------------------------------
    -- FECHAS
    -- --------------------------------------------------------

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP

);


-- ============================================================
-- 3. TABLA AI_MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_messages (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    -- Conversación a la que pertenece.

    conversation_id UUID NOT NULL
        REFERENCES public.ai_conversations(id)
        ON DELETE CASCADE,

    -- Quién escribió el mensaje.

    role TEXT NOT NULL,

    -- Contenido del mensaje.

    content TEXT NOT NULL,

    -- Fecha del mensaje.

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    -- --------------------------------------------------------
    -- VALIDACIÓN DEL ROLE
    -- --------------------------------------------------------

    CONSTRAINT ai_messages_role_check
    CHECK (
        role IN (
            'user',
            'assistant'
        )
    ),

    -- --------------------------------------------------------
    -- NO PERMITIR MENSAJES VACÍOS
    -- --------------------------------------------------------

    CONSTRAINT ai_messages_content_check
    CHECK (
        LENGTH(TRIM(content)) > 0
    )

);


-- ============================================================
-- 4. ÍNDICES
-- ============================================================

-- Buscar conversaciones por sesión.

CREATE INDEX IF NOT EXISTS
    idx_ai_conversations_session_id
ON public.ai_conversations (
    session_id
);


-- Buscar conversaciones por empresa real.

CREATE INDEX IF NOT EXISTS
    idx_ai_conversations_company_id
ON public.ai_conversations (
    company_id
);


-- Buscar conversaciones por nombre de empresa.

CREATE INDEX IF NOT EXISTS
    idx_ai_conversations_company_name
ON public.ai_conversations (
    company_name
);


-- Buscar conversaciones por tipo de negocio.

CREATE INDEX IF NOT EXISTS
    idx_ai_conversations_business_type
ON public.ai_conversations (
    business_type
);


-- Ordenar conversaciones por fecha.

CREATE INDEX IF NOT EXISTS
    idx_ai_conversations_created_at
ON public.ai_conversations (
    created_at DESC
);


-- Buscar mensajes de una conversación.

CREATE INDEX IF NOT EXISTS
    idx_ai_messages_conversation_id
ON public.ai_messages (
    conversation_id
);


-- Ordenar mensajes cronológicamente.

CREATE INDEX IF NOT EXISTS
    idx_ai_messages_created_at
ON public.ai_messages (
    created_at
);


-- ============================================================
-- 5. TRIGGER PARA UPDATED_AT
-- ============================================================

DROP TRIGGER IF EXISTS
    update_ai_conversations_updated_at
ON public.ai_conversations;


CREATE TRIGGER
    update_ai_conversations_updated_at

BEFORE UPDATE
ON public.ai_conversations

FOR EACH ROW

EXECUTE FUNCTION
    public.update_updated_at_column();


-- ============================================================
-- 6. ACTIVAR RLS
-- ============================================================

ALTER TABLE public.ai_conversations
ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ai_messages
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 7. ELIMINAR POLÍTICAS PREVIAS
-- ============================================================

DROP POLICY IF EXISTS
    ai_conversations_worker_select
ON public.ai_conversations;


DROP POLICY IF EXISTS
    ai_conversations_admin_select
ON public.ai_conversations;


DROP POLICY IF EXISTS
    ai_messages_worker_select
ON public.ai_messages;


DROP POLICY IF EXISTS
    ai_messages_admin_select
ON public.ai_messages;


-- ============================================================
-- 8. POLÍTICA WORKER — CONVERSACIONES
-- ============================================================

CREATE POLICY
    ai_conversations_worker_select

ON public.ai_conversations

FOR SELECT

TO authenticated

USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 9. POLÍTICA ADMIN — CONVERSACIONES
-- ============================================================

CREATE POLICY
    ai_conversations_admin_select

ON public.ai_conversations

FOR SELECT

TO authenticated

USING (
    public.current_user_is_admin()
);


-- ============================================================
-- 10. POLÍTICA WORKER — MENSAJES
-- ============================================================

CREATE POLICY
    ai_messages_worker_select

ON public.ai_messages

FOR SELECT

TO authenticated

USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 11. POLÍTICA ADMIN — MENSAJES
-- ============================================================

CREATE POLICY
    ai_messages_admin_select

ON public.ai_messages

FOR SELECT

TO authenticated

USING (
    public.current_user_is_admin()
);


-- ============================================================
-- 12. PERMISOS PARA ANON Y AUTHENTICATED
-- ============================================================
--
-- El frontend NO tendrá acceso directo de escritura.
--
-- El visitante interactúa exclusivamente con la Edge
-- Function modira-ai.
--
-- ============================================================

REVOKE ALL
ON public.ai_conversations
FROM anon;


REVOKE ALL
ON public.ai_conversations
FROM authenticated;


REVOKE ALL
ON public.ai_messages
FROM anon;


REVOKE ALL
ON public.ai_messages
FROM authenticated;


-- ------------------------------------------------------------
-- SELECT para usuarios autenticados.
--
-- RLS determinará quién puede realmente consultar.
-- ------------------------------------------------------------

GRANT SELECT
ON public.ai_conversations
TO authenticated;


GRANT SELECT
ON public.ai_messages
TO authenticated;


-- ============================================================
-- 13. PERMISOS PARA SERVICE_ROLE
-- ============================================================
--
-- MUY IMPORTANTE.
--
-- La Edge Function modira-ai utiliza:
--
-- SUPABASE_SERVICE_ROLE_KEY
--
-- Por tanto necesita permisos explícitos para:
--
--   SELECT
--   INSERT
--   UPDATE
--
-- sobre las tablas.
--
-- No damos estos permisos a anon.
--
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
-- 14. VERIFICACIONES DE PERMISOS SERVICE_ROLE
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
            '010 failed: service_role does not have SELECT on ai_conversations';

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
            '010 failed: service_role does not have INSERT on ai_conversations';

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
            '010 failed: service_role does not have UPDATE on ai_conversations';

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
            '010 failed: service_role does not have SELECT on ai_messages';

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
            '010 failed: service_role does not have INSERT on ai_messages';

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
            '010 failed: service_role does not have UPDATE on ai_messages';

    END IF;

END $$;


-- ============================================================
-- 15. VERIFICACIONES FINALES
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
            '010 failed: ai_conversations does not exist';

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
            '010 failed: ai_messages does not exist';

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
            '010 failed: company_name column does not exist';

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
            '010 failed: business_type column does not exist';

    END IF;


    -- --------------------------------------------------------
    -- RLS conversations
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_class
    WHERE oid = 'public.ai_conversations'::regclass
      AND relrowsecurity = TRUE;

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '010 failed: RLS is not enabled on ai_conversations';

    END IF;


    -- --------------------------------------------------------
    -- RLS messages
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_class
    WHERE oid = 'public.ai_messages'::regclass
      AND relrowsecurity = TRUE;

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '010 failed: RLS is not enabled on ai_messages';

    END IF;


    -- --------------------------------------------------------
    -- Worker policy conversations
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_conversations'
      AND policyname = 'ai_conversations_worker_select';

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '010 failed: ai_conversations_worker_select missing';

    END IF;


    -- --------------------------------------------------------
    -- Admin policy conversations
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_conversations'
      AND policyname = 'ai_conversations_admin_select';

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '010 failed: ai_conversations_admin_select missing';

    END IF;


    -- --------------------------------------------------------
    -- Worker policy messages
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_messages'
      AND policyname = 'ai_messages_worker_select';

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '010 failed: ai_messages_worker_select missing';

    END IF;


    -- --------------------------------------------------------
    -- Admin policy messages
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_messages'
      AND policyname = 'ai_messages_admin_select';

    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '010 failed: ai_messages_admin_select missing';

    END IF;

END $$;


COMMIT;


-- ============================================================
-- RESULTADO FINAL — MIGRACIÓN 010
-- ============================================================
--
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
-- DATOS DE LA CONVERSACIÓN
--
-- session_id
-- company_id       → NULL para visitante anónimo
-- company_name     → detectado si el visitante lo proporciona
-- business_type    → detectado si el visitante lo proporciona
--
--
-- EJEMPLO
--
-- Visitante:
--
-- "Soy Roberto y mi empresa es de fontanería,
--  se llama Fontanerías Pérez."
--
--
-- Resultado:
--
-- company_id:
-- NULL
--
-- company_name:
-- "Fontanerías Pérez"
--
-- business_type:
-- "Fontanería"
--
--
-- ACCESO
--
-- VISITANTE
--    │
--    └── NO acceso directo a las tablas
--
--
-- WORKER ACTIVO
--    │
--    └── SELECT conversaciones y mensajes
--
--
-- ADMIN
--    │
--    └── SELECT conversaciones y mensajes
--
--
-- EDGE FUNCTION
--    │
--    └── service_role
--         ├── SELECT
--         ├── INSERT
--         └── UPDATE
--
-- ============================================================