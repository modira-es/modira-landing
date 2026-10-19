-- Migration 175: completar notificaciones automáticas de proyectos
-- Complementa las migraciones 173 (retención) y 174 (Realtime).
-- No modifica la tabla notifications, sus tipos ni sus políticas RLS.
-- No duplica las notificaciones existentes de project_updates ni de hitos completados.

BEGIN;

CREATE OR REPLACE FUNCTION public.emit_project_lifecycle_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_project public.projects%ROWTYPE;
    v_version public.project_scope_versions%ROWTYPE;
    v_recipient uuid;
    v_title text;
    v_message text;
    v_type text;
    v_metadata jsonb;
BEGIN
    IF TG_TABLE_NAME = 'projects' THEN
        -- Solo notificar al cliente cuando un trabajador crea el proyecto
        -- para él. No enviar una notificación al propio cliente que lo crea.
        IF TG_OP = 'INSERT'
           AND auth.uid() IS NOT NULL
           AND public.current_user_is_worker()
           AND NEW.user_id IS NOT NULL
           AND NEW.user_id <> auth.uid()
        THEN
            INSERT INTO public.notifications (
                user_id, project_id, tipo, titulo, mensaje, metadata
            )
            VALUES (
                NEW.user_id,
                NEW.id,
                'project_update',
                'Nuevo proyecto',
                'Se ha creado un proyecto para ti en Modira.',
                jsonb_build_object(
                    'event', 'project_created',
                    'project_id', NEW.id
                )
            );
        END IF;

        RETURN NEW;

    ELSIF TG_TABLE_NAME = 'project_documents' THEN
        -- El aviso se genera solo al adjuntar un documento nuevo.
        -- Las modificaciones de metadatos del documento no generan otro aviso.
        IF TG_OP = 'INSERT' THEN
            SELECT p.user_id
            INTO v_recipient
            FROM public.projects p
            WHERE p.id = NEW.project_id;

            IF v_recipient IS NOT NULL
               AND v_recipient IS DISTINCT FROM auth.uid()
            THEN
                INSERT INTO public.notifications (
                    user_id, project_id, tipo, titulo, mensaje, metadata
                )
                VALUES (
                    v_recipient,
                    NEW.project_id,
                    'document_available',
                    'Nuevo documento disponible',
                    'Se ha añadido el documento "' ||
                        left(btrim(NEW.file_name), 160) ||
                        '" a tu proyecto.',
                    jsonb_build_object(
                        'event', 'project_document_added',
                        'document_id', NEW.id,
                        'file_name', left(NEW.file_name, 255)
                    )
                );
            END IF;
        END IF;

        RETURN NEW;

    ELSIF TG_TABLE_NAME = 'project_scope_versions' THEN
        -- Avisar al cliente únicamente en la transición de borrador
        -- no publicado a versión publicada.
        IF TG_OP = 'UPDATE'
           AND OLD.published_at IS NULL
           AND NEW.published_at IS NOT NULL
        THEN
            SELECT p.user_id
            INTO v_recipient
            FROM public.projects p
            WHERE p.id = NEW.project_id;

            IF v_recipient IS NOT NULL
               AND v_recipient IS DISTINCT FROM auth.uid()
            THEN
                INSERT INTO public.notifications (
                    user_id, project_id, tipo, titulo, mensaje, metadata
                )
                VALUES (
                    v_recipient,
                    NEW.project_id,
                    'document_available',
                    'Nuevo alcance disponible',
                    'Se ha publicado la versión V' ||
                        NEW.version_number::text ||
                        ' del alcance de tu proyecto.',
                    jsonb_build_object(
                        'event', 'project_scope_version_published',
                        'scope_version_id', NEW.id,
                        'version_number', NEW.version_number
                    )
                );
            END IF;
        END IF;

        RETURN NEW;

    ELSIF TG_TABLE_NAME = 'project_scope_change_requests' THEN
        -- El destinatario se obtiene de la versión publicada, nunca del cliente.
        -- Así no se permite que el cliente elija arbitrariamente al empleado.
        IF TG_OP = 'INSERT' THEN
            SELECT sv.published_by
            INTO v_recipient
            FROM public.project_scope_versions sv
            WHERE sv.id = NEW.scope_version_id
              AND sv.project_id = NEW.project_id;

            IF v_recipient IS NOT NULL
               AND v_recipient IS DISTINCT FROM NEW.user_id
               AND EXISTS (
                   SELECT 1
                   FROM public.workers w
                   JOIN public.profiles p ON p.id = w.auth_user_id
                   WHERE w.auth_user_id = v_recipient
                     AND w.is_active IS TRUE
                     AND p.status = 'active'
               )
            THEN
                INSERT INTO public.notifications (
                    user_id, project_id, tipo, titulo, mensaje, metadata
                )
                VALUES (
                    v_recipient,
                    NEW.project_id,
                    'project_change_request',
                    'Solicitud de cambios en el alcance',
                    'El cliente ha solicitado cambios en la versión V' ||
                        COALESCE((
                            SELECT sv.version_number::text
                            FROM public.project_scope_versions sv
                            WHERE sv.id = NEW.scope_version_id
                        ), '?') ||
                        ' del alcance del proyecto.',
                    jsonb_build_object(
                        'event', 'project_scope_change_requested',
                        'scope_change_request_id', NEW.id,
                        'scope_version_id', NEW.scope_version_id
                    )
                );
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$function$;

ALTER FUNCTION public.emit_project_lifecycle_notification() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.emit_project_lifecycle_notification() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.emit_project_lifecycle_notification() FROM anon;
REVOKE ALL ON FUNCTION public.emit_project_lifecycle_notification() FROM authenticated;

DROP TRIGGER IF EXISTS projects_notify_client_on_worker_creation ON public.projects;
CREATE TRIGGER projects_notify_client_on_worker_creation
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.emit_project_lifecycle_notification();

DROP TRIGGER IF EXISTS project_documents_notify_client_on_insert ON public.project_documents;
CREATE TRIGGER project_documents_notify_client_on_insert
AFTER INSERT ON public.project_documents
FOR EACH ROW
EXECUTE FUNCTION public.emit_project_lifecycle_notification();

DROP TRIGGER IF EXISTS project_scope_versions_notify_client_on_publish ON public.project_scope_versions;
CREATE TRIGGER project_scope_versions_notify_client_on_publish
AFTER UPDATE OF published_at ON public.project_scope_versions
FOR EACH ROW
EXECUTE FUNCTION public.emit_project_lifecycle_notification();

DROP TRIGGER IF EXISTS project_scope_change_requests_notify_publisher ON public.project_scope_change_requests;
CREATE TRIGGER project_scope_change_requests_notify_publisher
AFTER INSERT ON public.project_scope_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.emit_project_lifecycle_notification();

COMMENT ON FUNCTION public.emit_project_lifecycle_notification() IS
'Genera notificaciones de ciclo de vida para creación de proyecto por trabajador, documento nuevo, publicación de alcance y solicitud de cambios del alcance. No reemplaza las notificaciones existentes de actualizaciones de proyecto ni de hitos completados.';

COMMIT;
