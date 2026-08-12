-- ============================================================
-- MODIRA
-- 007_support_and_activity.sql
--
-- SOPORTE Y ACTIVIDAD
--
-- ============================================================
--
-- Esta migración consolida el sistema de soporte y añade un
-- historial interno de actividad.
--
--
-- SUPPORT TICKETS
-- ---------------
--
-- CLIENTE:
--   SELECT -> tickets de su empresa
--   INSERT -> tickets para sí mismo y su empresa
--
-- WORKER ACTIVO:
--   SELECT -> todos los tickets
--   UPDATE -> gestión de tickets
--
-- user_id y company_id NO pueden ser modificados para mover
-- un ticket entre usuarios o empresas.
--
-- Ningún usuario puede eliminar tickets desde el frontend.
--
--
-- ACTIVITY LOG
-- ------------
--
-- Registra acciones relevantes realizadas dentro del sistema.
--
-- Ejemplos:
--
--   project.created
--   project.updated
--   invoice.created
--   ticket.created
--   ticket.updated
--   ticket.closed
--   automation.executed
--
-- Los usuarios únicamente pueden consultar el historial.
-- El registro se realiza mediante funciones controladas.
--
-- ============================================================


BEGIN;


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

DO $$
BEGIN

    -- --------------------------------------------------------
    -- SUPPORT TICKETS
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'support_tickets'
    ) THEN

        RAISE EXCEPTION
            '007 stopped: public.support_tickets does not exist';

    END IF;


    -- --------------------------------------------------------
    -- Campos fundamentales
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'support_tickets'
          AND column_name = 'user_id'
    ) THEN

        RAISE EXCEPTION
            '007 stopped: support_tickets.user_id does not exist';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'support_tickets'
          AND column_name = 'company_id'
    ) THEN

        RAISE EXCEPTION
            '007 stopped: support_tickets.company_id does not exist';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'support_tickets'
          AND column_name = 'estado'
    ) THEN

        RAISE EXCEPTION
            '007 stopped: support_tickets.estado does not exist';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'support_tickets'
          AND column_name = 'prioridad'
    ) THEN

        RAISE EXCEPTION
            '007 stopped: support_tickets.prioridad does not exist';

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'support_tickets'
          AND column_name = 'fecha_cierre'
    ) THEN

        RAISE EXCEPTION
            '007 stopped: support_tickets.fecha_cierre does not exist';

    END IF;


    -- --------------------------------------------------------
    -- Función updated_at
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
            ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'update_updated_at_column'
    ) THEN

        RAISE EXCEPTION
            '007 stopped: update_updated_at_column() does not exist';

    END IF;


    -- --------------------------------------------------------
    -- Función de seguridad de workers
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
            '007 stopped: current_user_is_worker() does not exist';

    END IF;


    -- --------------------------------------------------------
    -- Función de empresa
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
            ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'current_user_company_id'
    ) THEN

        RAISE EXCEPTION
            '007 stopped: current_user_company_id() does not exist';

    END IF;

END $$;


-- ============================================================
-- 2. SOPORTE — RLS
-- ============================================================
--
-- La tabla fue creada en 001.
-- Aquí únicamente dejamos definida su política final.
-- ============================================================

ALTER TABLE public.support_tickets
    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. ELIMINAR POLÍTICAS ANTERIORES
-- ============================================================
--
-- Dejamos una única definición final del acceso.
-- ============================================================

DROP POLICY IF EXISTS
    support_tickets_company_access
ON public.support_tickets;


DROP POLICY IF EXISTS
    support_tickets_client_select
ON public.support_tickets;


DROP POLICY IF EXISTS
    support_tickets_client_insert
ON public.support_tickets;


DROP POLICY IF EXISTS
    support_tickets_worker_select
ON public.support_tickets;


DROP POLICY IF EXISTS
    support_tickets_worker_update
ON public.support_tickets;


DROP POLICY IF EXISTS
    support_tickets_delete
ON public.support_tickets;


-- ============================================================
-- 4. CLIENTE → CONSULTAR SUS TICKETS
-- ============================================================
--
-- support_tickets.company_id es NOT NULL desde 001.
--
-- Por tanto, todos los tickets pertenecen necesariamente a
-- una empresa.
--
-- El cliente solo puede consultar tickets de su empresa.
--
-- Los trabajadores activos quedan excluidos de esta política
-- y utilizan la política específica de worker.
-- ============================================================

CREATE POLICY
    support_tickets_client_select

ON public.support_tickets

FOR SELECT

TO authenticated

USING (

    NOT public.current_user_is_worker()

    AND company_id =
        public.current_user_company_id()

);


-- ============================================================
-- 5. CLIENTE → CREAR TICKET
-- ============================================================
--
-- El ticket debe pertenecer:
--
--     user_id    = usuario autenticado
--     company_id = empresa del usuario
--
-- El frontend no puede crear tickets para otro usuario o
-- empresa.
-- ============================================================

CREATE POLICY
    support_tickets_client_insert

ON public.support_tickets

FOR INSERT

TO authenticated

WITH CHECK (

    NOT public.current_user_is_worker()

    AND user_id = auth.uid()

    AND company_id =
        public.current_user_company_id()

);


-- ============================================================
-- 6. WORKER → CONSULTAR TODOS LOS TICKETS
-- ============================================================
--
-- Un worker activo gestiona soporte de todas las empresas.
-- ============================================================

CREATE POLICY
    support_tickets_worker_select

ON public.support_tickets

FOR SELECT

TO authenticated

USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 7. WORKER → MODIFICAR TICKETS
-- ============================================================
--
-- El worker puede gestionar:
--
--     estado
--     prioridad
--     fecha_cierre
--     otros campos operativos permitidos
--
-- La protección de user_id y company_id se realiza mediante
-- trigger para impedir mover un ticket entre usuarios o
-- empresas.
-- ============================================================

CREATE POLICY
    support_tickets_worker_update

ON public.support_tickets

FOR UPDATE

TO authenticated

USING (
    public.current_user_is_worker()
)

WITH CHECK (
    public.current_user_is_worker()
);


-- ============================================================
-- 8. PERMISOS POSTGRESQL — SUPPORT TICKETS
-- ============================================================
--
-- Estos permisos permiten que las policies anteriores puedan
-- actuar.
--
-- DELETE queda expresamente bloqueado.
-- ============================================================

GRANT SELECT, INSERT, UPDATE
ON public.support_tickets
TO authenticated;


REVOKE DELETE
ON public.support_tickets
FROM authenticated;


-- ============================================================
-- 9. PROTEGER PROPIETARIO Y EMPRESA DEL TICKET
-- ============================================================
--
-- Un worker puede actualizar un ticket, pero nunca debe poder
-- cambiar:
--
--     user_id
--     company_id
--
-- porque eso permitiría mover un ticket a otro usuario o
-- empresa.
--
-- La policy RLS no puede comparar directamente OLD y NEW,
-- por lo que utilizamos un trigger.
-- ============================================================

CREATE OR REPLACE FUNCTION
    public.protect_support_ticket_owner()
RETURNS TRIGGER

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public, pg_temp

AS $function$

BEGIN

    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN

        RAISE EXCEPTION
            'No se puede modificar el usuario propietario del ticket';

    END IF;


    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN

        RAISE EXCEPTION
            'No se puede modificar la empresa del ticket';

    END IF;


    RETURN NEW;

END;

$function$;


REVOKE ALL
ON FUNCTION public.protect_support_ticket_owner()
FROM PUBLIC;


DROP TRIGGER IF EXISTS
    support_tickets_protect_owner
ON public.support_tickets;


CREATE TRIGGER
    support_tickets_protect_owner

BEFORE UPDATE
ON public.support_tickets

FOR EACH ROW

EXECUTE FUNCTION
    public.protect_support_ticket_owner();


-- ============================================================
-- 10. ACTIVITY LOG
-- ============================================================
--
-- Historial interno de acciones relevantes del sistema.
--
-- Un registro puede estar asociado:
--
--     usuario
--     empresa
--     recurso
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_log (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES auth.users(id)
        ON DELETE SET NULL,

    company_id UUID
        REFERENCES public.companies(id)
        ON DELETE SET NULL,

    action TEXT NOT NULL,

    resource_type TEXT NOT NULL,

    resource_id UUID,

    description TEXT,

    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP

);


-- ============================================================
-- 11. VALIDACIONES ACTIVITY LOG
-- ============================================================

ALTER TABLE public.activity_log
    DROP CONSTRAINT IF EXISTS activity_log_action_check;


ALTER TABLE public.activity_log
    ADD CONSTRAINT activity_log_action_check
    CHECK (
        LENGTH(TRIM(action)) > 0
    );


ALTER TABLE public.activity_log
    DROP CONSTRAINT IF EXISTS activity_log_resource_type_check;


ALTER TABLE public.activity_log
    ADD CONSTRAINT activity_log_resource_type_check
    CHECK (
        LENGTH(TRIM(resource_type)) > 0
    );


-- ============================================================
-- 12. ÍNDICES ACTIVITY LOG
-- ============================================================

CREATE INDEX IF NOT EXISTS
    idx_activity_log_user_id

ON public.activity_log (
    user_id
);


CREATE INDEX IF NOT EXISTS
    idx_activity_log_company_id

ON public.activity_log (
    company_id
);


CREATE INDEX IF NOT EXISTS
    idx_activity_log_resource

ON public.activity_log (
    resource_type,
    resource_id
);


CREATE INDEX IF NOT EXISTS
    idx_activity_log_created_at

ON public.activity_log (
    created_at DESC
);


CREATE INDEX IF NOT EXISTS
    idx_activity_log_action

ON public.activity_log (
    action
);


-- ============================================================
-- 13. ACTIVITY LOG — RLS
-- ============================================================

ALTER TABLE public.activity_log
    ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
    activity_log_client_select
ON public.activity_log;


DROP POLICY IF EXISTS
    activity_log_worker_select
ON public.activity_log;


-- ============================================================
-- 14. ACTIVITY LOG — CLIENTE
-- ============================================================
--
-- El cliente puede consultar:
--
--     actividad de su empresa
--
-- y, si existe una actividad personal sin company_id:
--
--     actividad asociada a su propio user_id.
--
-- Los workers no utilizan esta política.
-- ============================================================

CREATE POLICY
    activity_log_client_select

ON public.activity_log

FOR SELECT

TO authenticated

USING (

    NOT public.current_user_is_worker()

    AND

    (

        (
            company_id IS NOT NULL
            AND company_id =
                public.current_user_company_id()
        )

        OR

        (
            company_id IS NULL
            AND user_id = auth.uid()
        )

    )

);


-- ============================================================
-- 15. ACTIVITY LOG — WORKER
-- ============================================================
--
-- Los workers activos pueden consultar el historial interno
-- necesario para el Área de Empleados.
-- ============================================================

CREATE POLICY
    activity_log_worker_select

ON public.activity_log

FOR SELECT

TO authenticated

USING (
    public.current_user_is_worker()
);


-- ============================================================
-- 16. PERMISOS ACTIVITY LOG
-- ============================================================
--
-- El frontend solo puede consultar.
--
-- No concedemos INSERT, UPDATE ni DELETE directamente.
-- ============================================================

GRANT SELECT
ON public.activity_log
TO authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.activity_log
FROM authenticated;


-- ============================================================
-- 17. FUNCIÓN log_activity()
-- ============================================================
--
-- Función centralizada para registrar actividad.
--
-- La función se ejecuta con privilegios controlados para poder
-- insertar en activity_log sin conceder INSERT directo al
-- frontend.
--
-- user_id y company_id se obtienen de la sesión.
--
-- Un worker registra company_id = NULL porque puede actuar
-- sobre múltiples empresas.
-- ============================================================

CREATE OR REPLACE FUNCTION
    public.log_activity(
        p_action TEXT,
        p_resource_type TEXT,
        p_resource_id UUID DEFAULT NULL,
        p_description TEXT DEFAULT NULL,
        p_metadata JSONB DEFAULT NULL
    )

RETURNS public.activity_log

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public, pg_temp

AS $function$

DECLARE

    v_user_id UUID;

    v_company_id UUID;

    v_activity public.activity_log;

BEGIN

    -- --------------------------------------------------------
    -- Usuario autenticado
    -- --------------------------------------------------------

    v_user_id := auth.uid();


    IF v_user_id IS NULL THEN

        RAISE EXCEPTION
            'Usuario no autenticado';

    END IF;


    -- --------------------------------------------------------
    -- Empresa
    -- --------------------------------------------------------

    IF public.current_user_is_worker() THEN

        v_company_id := NULL;

    ELSE

        v_company_id :=
            public.current_user_company_id();

    END IF;


    -- --------------------------------------------------------
    -- Validaciones
    -- --------------------------------------------------------

    IF p_action IS NULL
       OR TRIM(p_action) = ''
    THEN

        RAISE EXCEPTION
            'La acción es obligatoria';

    END IF;


    IF p_resource_type IS NULL
       OR TRIM(p_resource_type) = ''
    THEN

        RAISE EXCEPTION
            'El tipo de recurso es obligatorio';

    END IF;


    -- --------------------------------------------------------
    -- Insertar actividad
    -- --------------------------------------------------------

    INSERT INTO public.activity_log (

        user_id,
        company_id,
        action,
        resource_type,
        resource_id,
        description,
        metadata

    )

    VALUES (

        v_user_id,
        v_company_id,
        TRIM(p_action),
        TRIM(p_resource_type),
        p_resource_id,
        p_description,
        p_metadata

    )

    RETURNING *

    INTO v_activity;


    RETURN v_activity;

END;

$function$;


-- ============================================================
-- 18. PERMISOS log_activity()
-- ============================================================

REVOKE ALL

ON FUNCTION public.log_activity(
    TEXT,
    TEXT,
    UUID,
    TEXT,
    JSONB
)

FROM PUBLIC;


GRANT EXECUTE

ON FUNCTION public.log_activity(
    TEXT,
    TEXT,
    UUID,
    TEXT,
    JSONB
)

TO authenticated;


REVOKE EXECUTE

ON FUNCTION public.log_activity(
    TEXT,
    TEXT,
    UUID,
    TEXT,
    JSONB
)

FROM anon;


-- ============================================================
-- 19. TRIGGER updated_at — SUPPORT TICKETS
-- ============================================================
--
-- support_tickets ya tiene updated_at desde 001.
--
-- Garantizamos que se actualice automáticamente.
-- ============================================================

DROP TRIGGER IF EXISTS
    support_tickets_updated_at
ON public.support_tickets;


CREATE TRIGGER
    support_tickets_updated_at

BEFORE UPDATE
ON public.support_tickets

FOR EACH ROW

EXECUTE FUNCTION
    public.update_updated_at_column();


-- ============================================================
-- 20. FUNCIÓN PARA CERRAR TICKET
-- ============================================================
--
-- Permite a un worker activo cerrar un ticket de forma
-- controlada.
--
-- Al cerrar:
--
--     estado = cerrado
--     fecha_cierre = NOW()
--
-- Además registra:
--
--     ticket.closed
--
-- en activity_log.
-- ============================================================

CREATE OR REPLACE FUNCTION
    public.close_support_ticket(
        p_ticket_id UUID
    )

RETURNS public.support_tickets

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public, pg_temp

AS $function$

DECLARE

    v_ticket public.support_tickets;

BEGIN

    -- --------------------------------------------------------
    -- Worker activo
    -- --------------------------------------------------------

    IF NOT public.current_user_is_worker() THEN

        RAISE EXCEPTION
            'Acceso denegado: se requiere un trabajador activo';

    END IF;


    -- --------------------------------------------------------
    -- Obtener ticket
    -- --------------------------------------------------------

    SELECT *

    INTO v_ticket

    FROM public.support_tickets

    WHERE id = p_ticket_id

    FOR UPDATE;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'Ticket no encontrado';

    END IF;


    -- --------------------------------------------------------
    -- Si ya está cerrado
    -- --------------------------------------------------------

    IF v_ticket.estado = 'cerrado' THEN

        RETURN v_ticket;

    END IF;


    -- --------------------------------------------------------
    -- Cerrar ticket
    -- --------------------------------------------------------

    UPDATE public.support_tickets

    SET

        estado = 'cerrado',

        fecha_cierre = CURRENT_TIMESTAMP,

        updated_at = CURRENT_TIMESTAMP

    WHERE id = p_ticket_id

    RETURNING *

    INTO v_ticket;


    -- --------------------------------------------------------
    -- Registrar actividad
    -- --------------------------------------------------------

    INSERT INTO public.activity_log (

        user_id,
        company_id,
        action,
        resource_type,
        resource_id,
        description

    )

    VALUES (

        auth.uid(),
        v_ticket.company_id,
        'ticket.closed',
        'support_ticket',
        v_ticket.id,
        'Ticket cerrado por un trabajador'

    );


    RETURN v_ticket;

END;

$function$;


-- ============================================================
-- 21. PERMISOS close_support_ticket()
-- ============================================================

REVOKE ALL

ON FUNCTION public.close_support_ticket(UUID)

FROM PUBLIC;


GRANT EXECUTE

ON FUNCTION public.close_support_ticket(UUID)

TO authenticated;


REVOKE EXECUTE

ON FUNCTION public.close_support_ticket(UUID)

FROM anon;


-- ============================================================
-- 22. VERIFICACIONES FINALES
-- ============================================================

DO $$
DECLARE

    v_count INTEGER;

BEGIN

    -- --------------------------------------------------------
    -- activity_log
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM information_schema.tables

    WHERE table_schema = 'public'
      AND table_name = 'activity_log';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: activity_log does not exist';

    END IF;


    -- --------------------------------------------------------
    -- RLS support_tickets
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_class

    WHERE oid = 'public.support_tickets'::regclass
      AND relrowsecurity = TRUE;


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: RLS is not enabled on support_tickets';

    END IF;


    -- --------------------------------------------------------
    -- Client SELECT
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_policies

    WHERE schemaname = 'public'
      AND tablename = 'support_tickets'
      AND policyname = 'support_tickets_client_select';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: support_tickets_client_select missing';

    END IF;


    -- --------------------------------------------------------
    -- Client INSERT
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_policies

    WHERE schemaname = 'public'
      AND tablename = 'support_tickets'
      AND policyname = 'support_tickets_client_insert';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: support_tickets_client_insert missing';

    END IF;


    -- --------------------------------------------------------
    -- Worker SELECT
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_policies

    WHERE schemaname = 'public'
      AND tablename = 'support_tickets'
      AND policyname = 'support_tickets_worker_select';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: support_tickets_worker_select missing';

    END IF;


    -- --------------------------------------------------------
    -- Worker UPDATE
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_policies

    WHERE schemaname = 'public'
      AND tablename = 'support_tickets'
      AND policyname = 'support_tickets_worker_update';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: support_tickets_worker_update missing';

    END IF;


    -- --------------------------------------------------------
    -- RLS activity_log
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_class

    WHERE oid = 'public.activity_log'::regclass
      AND relrowsecurity = TRUE;


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: RLS is not enabled on activity_log';

    END IF;


    -- --------------------------------------------------------
    -- Activity client SELECT
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_policies

    WHERE schemaname = 'public'
      AND tablename = 'activity_log'
      AND policyname = 'activity_log_client_select';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: activity_log_client_select missing';

    END IF;


    -- --------------------------------------------------------
    -- Activity worker SELECT
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_policies

    WHERE schemaname = 'public'
      AND tablename = 'activity_log'
      AND policyname = 'activity_log_worker_select';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: activity_log_worker_select missing';

    END IF;


    -- --------------------------------------------------------
    -- log_activity()
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE n.nspname = 'public'
      AND p.proname = 'log_activity';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: log_activity() does not exist';

    END IF;


    -- --------------------------------------------------------
    -- close_support_ticket()
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE n.nspname = 'public'
      AND p.proname = 'close_support_ticket';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: close_support_ticket() does not exist';

    END IF;


    -- --------------------------------------------------------
    -- protect_support_ticket_owner()
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_count

    FROM pg_proc p

    JOIN pg_namespace n
        ON n.oid = p.pronamespace

    WHERE n.nspname = 'public'
      AND p.proname = 'protect_support_ticket_owner';


    IF v_count <> 1 THEN

        RAISE EXCEPTION
            '007 failed: protect_support_ticket_owner() does not exist';

    END IF;

END $$;


COMMIT;


-- ============================================================
-- RESULTADO FINAL
-- ============================================================
--
--
-- SOPORTE
-- =======
--
-- CLIENTE
--   │
--   ├── Crear ticket
--   │       │
--   │       ├── user_id = auth.uid()
--   │       └── company_id = empresa del usuario
--   │
--   └── Consultar tickets de su empresa
--
--
-- WORKER ACTIVO
--   │
--   ├── Consultar todos los tickets
--   ├── Modificar tickets
--   └── Cerrar tickets mediante RPC
--
--
-- PROTECCIÓN
--   │
--   ├── user_id     → no modificable
--   └── company_id  → no modificable
--
--
-- DELETE
--   │
--   └── ❌ No permitido desde frontend
--
--
-- ACTIVIDAD
-- =========
--
-- Usuario autenticado
--        │
--        ▼
--   log_activity()
--        │
--        ├── user_id
--        ├── company_id
--        ├── action
--        ├── resource_type
--        ├── resource_id
--        ├── description
--        ├── metadata
--        └── created_at
--
--
-- EJEMPLOS
--
-- project.created
--       │
--       ▼
-- activity_log
--
--
-- invoice.created
--       │
--       ▼
-- activity_log
--
--
-- ticket.closed
--       │
--       ▼
-- close_support_ticket()
--       │
--       ├── estado = cerrado
--       ├── fecha_cierre = NOW()
--       └── activity_log
--
-- ============================================================