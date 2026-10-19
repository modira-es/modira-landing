-- Migration 176: completar activity_log para acciones de proyectos
-- Reutiliza activity_log. No modifica la retención de notifications (migración 173).
-- Las notificaciones son temporales; activity_log conserva el historial de negocio.

BEGIN;

CREATE OR REPLACE FUNCTION public.audit_project_activity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_project_id uuid;
    v_resource_id uuid;
    v_company_id uuid;
    v_actor_id uuid := auth.uid();
    v_action text;
    v_resource_type text;
    v_description text;
    v_metadata jsonb := '{}'::jsonb;
    v_old jsonb;
    v_new jsonb;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
    END IF;

    IF TG_TABLE_NAME = 'projects' THEN
        v_project_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
        v_resource_id := v_project_id;
        v_company_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.company_id ELSE NEW.company_id END;
        v_resource_type := 'project';

        IF TG_OP = 'INSERT' THEN
            v_action := 'project.created';
            v_description := 'Se ha creado un proyecto';
            v_metadata := jsonb_build_object(
                'nombre', NEW.nombre,
                'estado', NEW.estado
            );
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.nombre IS NOT DISTINCT FROM NEW.nombre
               AND OLD.descripcion IS NOT DISTINCT FROM NEW.descripcion
               AND OLD.estado IS NOT DISTINCT FROM NEW.estado
               AND OLD.fecha_inicio IS NOT DISTINCT FROM NEW.fecha_inicio
               AND OLD.fecha_fin IS NOT DISTINCT FROM NEW.fecha_fin
               AND OLD.change_requests_enabled IS NOT DISTINCT FROM NEW.change_requests_enabled
               AND OLD.change_requests_deadline IS NOT DISTINCT FROM NEW.change_requests_deadline
            THEN
                RETURN NEW;
            END IF;

            v_action := 'project.updated';
            v_description := 'Se ha modificado un proyecto';
            v_metadata := jsonb_build_object(
                'old', jsonb_build_object(
                    'nombre', OLD.nombre,
                    'descripcion', OLD.descripcion,
                    'estado', OLD.estado,
                    'fecha_inicio', OLD.fecha_inicio,
                    'fecha_fin', OLD.fecha_fin,
                    'change_requests_enabled', OLD.change_requests_enabled,
                    'change_requests_deadline', OLD.change_requests_deadline
                ),
                'new', jsonb_build_object(
                    'nombre', NEW.nombre,
                    'descripcion', NEW.descripcion,
                    'estado', NEW.estado,
                    'fecha_inicio', NEW.fecha_inicio,
                    'fecha_fin', NEW.fecha_fin,
                    'change_requests_enabled', NEW.change_requests_enabled,
                    'change_requests_deadline', NEW.change_requests_deadline
                )
            );
        ELSE
            v_action := 'project.deleted';
            v_description := 'Se ha eliminado un proyecto';
            v_metadata := jsonb_build_object(
                'nombre', OLD.nombre,
                'estado', OLD.estado
            );
        END IF;

    ELSIF TG_TABLE_NAME = 'project_milestones' THEN
        v_project_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.project_id ELSE NEW.project_id END;
        v_resource_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
        v_resource_type := 'project_milestone';

        SELECT p.company_id INTO v_company_id
        FROM public.projects p WHERE p.id = v_project_id;

        IF TG_OP = 'INSERT' THEN
            v_action := 'project_milestone.created';
            v_description := 'Se ha creado un hito del proyecto';
            v_metadata := jsonb_build_object(
                'project_id', NEW.project_id,
                'nombre', NEW.nombre,
                'estado', NEW.estado,
                'fecha_prevista', NEW.fecha_prevista
            );
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.nombre IS NOT DISTINCT FROM NEW.nombre
               AND OLD.descripcion IS NOT DISTINCT FROM NEW.descripcion
               AND OLD.fecha_prevista IS NOT DISTINCT FROM NEW.fecha_prevista
               AND OLD.orden IS NOT DISTINCT FROM NEW.orden
               AND OLD.estado IS NOT DISTINCT FROM NEW.estado
            THEN
                RETURN NEW;
            END IF;

            v_action := CASE
                WHEN OLD.estado IS DISTINCT FROM NEW.estado
                    THEN 'project_milestone.status_changed'
                ELSE 'project_milestone.updated'
            END;
            v_description := CASE
                WHEN OLD.estado IS DISTINCT FROM NEW.estado
                    THEN 'Se ha cambiado el estado de un hito'
                ELSE 'Se ha modificado un hito del proyecto'
            END;
            v_metadata := jsonb_build_object(
                'project_id', NEW.project_id,
                'old', jsonb_build_object(
                    'nombre', OLD.nombre,
                    'estado', OLD.estado,
                    'fecha_prevista', OLD.fecha_prevista,
                    'orden', OLD.orden
                ),
                'new', jsonb_build_object(
                    'nombre', NEW.nombre,
                    'estado', NEW.estado,
                    'fecha_prevista', NEW.fecha_prevista,
                    'orden', NEW.orden
                )
            );
        ELSE
            v_action := 'project_milestone.deleted';
            v_description := 'Se ha eliminado un hito del proyecto';
            v_metadata := jsonb_build_object(
                'project_id', OLD.project_id,
                'nombre', OLD.nombre,
                'estado', OLD.estado
            );
        END IF;

    ELSIF TG_TABLE_NAME = 'project_updates' THEN
        v_project_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.project_id ELSE NEW.project_id END;
        v_resource_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
        v_resource_type := 'project_update';

        SELECT p.company_id INTO v_company_id
        FROM public.projects p WHERE p.id = v_project_id;

        IF TG_OP = 'INSERT' THEN
            v_action := 'project_update.created';
            v_description := 'Se ha publicado una actualización del proyecto';
            v_metadata := jsonb_build_object(
                'project_id', NEW.project_id,
                'titulo', NEW.titulo
            );
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.titulo IS NOT DISTINCT FROM NEW.titulo
               AND OLD.contenido IS NOT DISTINCT FROM NEW.contenido
            THEN
                RETURN NEW;
            END IF;
            v_action := 'project_update.updated';
            v_description := 'Se ha modificado una actualización del proyecto';
            v_metadata := jsonb_build_object(
                'project_id', NEW.project_id,
                'old_titulo', OLD.titulo,
                'new_titulo', NEW.titulo
            );
        ELSE
            v_action := 'project_update.deleted';
            v_description := 'Se ha eliminado una actualización del proyecto';
            v_metadata := jsonb_build_object(
                'project_id', OLD.project_id,
                'titulo', OLD.titulo
            );
        END IF;

    ELSIF TG_TABLE_NAME = 'project_documents' THEN
        v_project_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.project_id ELSE NEW.project_id END;
        v_resource_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
        v_resource_type := 'project_document';

        SELECT p.company_id INTO v_company_id
        FROM public.projects p WHERE p.id = v_project_id;

        IF TG_OP = 'INSERT' THEN
            v_action := 'project_document.attached';
            v_description := 'Se ha adjuntado un documento al proyecto';
            v_metadata := jsonb_build_object(
                'project_id', NEW.project_id,
                'file_name', NEW.file_name,
                'mime_type', NEW.mime_type,
                'file_size', NEW.file_size
            );
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.file_name IS NOT DISTINCT FROM NEW.file_name
               AND OLD.mime_type IS NOT DISTINCT FROM NEW.mime_type
               AND OLD.file_size IS NOT DISTINCT FROM NEW.file_size
            THEN
                RETURN NEW;
            END IF;
            v_action := 'project_document.updated';
            v_description := 'Se han actualizado los datos de un documento del proyecto';
            v_metadata := jsonb_build_object(
                'project_id', NEW.project_id,
                'old_file_name', OLD.file_name,
                'new_file_name', NEW.file_name,
                'file_size', NEW.file_size
            );
        ELSE
            v_action := 'project_document.deleted';
            v_description := 'Se ha eliminado un documento del proyecto';
            v_metadata := jsonb_build_object(
                'project_id', OLD.project_id,
                'file_name', OLD.file_name
            );
        END IF;

    ELSIF TG_TABLE_NAME = 'project_scope_versions' THEN
        v_project_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.project_id ELSE NEW.project_id END;
        v_resource_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
        v_resource_type := 'project_scope_version';

        SELECT p.company_id INTO v_company_id
        FROM public.projects p WHERE p.id = v_project_id;

        IF TG_OP = 'INSERT' THEN
            v_action := 'project_scope_version.created';
            v_description := 'Se ha creado un borrador del alcance del proyecto';
            v_metadata := jsonb_build_object(
                'project_id', NEW.project_id,
                'version_number', NEW.version_number,
                'status', NEW.status
            );
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.status IS NOT DISTINCT FROM NEW.status
               AND OLD.is_current IS NOT DISTINCT FROM NEW.is_current
               AND OLD.published_at IS NOT DISTINCT FROM NEW.published_at
            THEN
                RETURN NEW;
            END IF;
            v_action := CASE
                WHEN OLD.published_at IS NULL AND NEW.published_at IS NOT NULL
                    THEN 'project_scope_version.published'
                WHEN OLD.status IS DISTINCT FROM NEW.status
                    THEN 'project_scope_version.status_changed'
                ELSE 'project_scope_version.updated'
            END;
            v_description := CASE
                WHEN OLD.published_at IS NULL AND NEW.published_at IS NOT NULL
                    THEN 'Se ha publicado una versión del alcance del proyecto'
                ELSE 'Se ha actualizado el estado de una versión del alcance'
            END;
            v_metadata := jsonb_build_object(
                'project_id', NEW.project_id,
                'version_number', NEW.version_number,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'is_current', NEW.is_current,
                'published_at', NEW.published_at
            );
        ELSE
            v_action := 'project_scope_version.deleted';
            v_description := 'Se ha eliminado una versión del alcance del proyecto';
            v_metadata := jsonb_build_object(
                'project_id', OLD.project_id,
                'version_number', OLD.version_number,
                'status', OLD.status
            );
        END IF;

    ELSIF TG_TABLE_NAME = 'project_scope_change_requests' THEN
        v_project_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.project_id ELSE NEW.project_id END;
        v_resource_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
        v_company_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.company_id ELSE NEW.company_id END;
        v_resource_type := 'project_scope_change_request';

        IF TG_OP = 'INSERT' THEN
            v_action := 'project_scope_change_request.created';
            v_description := 'El cliente ha solicitado cambios en el alcance';
            v_metadata := jsonb_build_object(
                'project_id', NEW.project_id,
                'scope_version_id', NEW.scope_version_id,
                'status', NEW.status
            );
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.status IS NOT DISTINCT FROM NEW.status
               AND OLD.reviewed_by IS NOT DISTINCT FROM NEW.reviewed_by
               AND OLD.review_notes IS NOT DISTINCT FROM NEW.review_notes
            THEN
                RETURN NEW;
            END IF;
            v_action := 'project_scope_change_request.updated';
            v_description := 'Se ha actualizado una solicitud de cambios del alcance';
            v_metadata := jsonb_build_object(
                'project_id', NEW.project_id,
                'scope_version_id', NEW.scope_version_id,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'reviewed_by', NEW.reviewed_by
            );
        ELSE
            v_action := 'project_scope_change_request.deleted';
            v_description := 'Se ha eliminado una solicitud de cambios del alcance';
            v_metadata := jsonb_build_object(
                'project_id', OLD.project_id,
                'scope_version_id', OLD.scope_version_id,
                'status', OLD.status
            );
        END IF;

    ELSIF TG_TABLE_NAME = 'project_change_requests' THEN
        -- La función request_project_change ya registra el INSERT en activity_log.
        -- Este trigger se instala solo para UPDATE/DELETE y evita duplicar ese INSERT.
        v_project_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.project_id ELSE NEW.project_id END;
        v_resource_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
        v_company_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.company_id ELSE NEW.company_id END;
        v_resource_type := 'project_change_request';

        IF TG_OP = 'UPDATE' THEN
            IF OLD.status IS NOT DISTINCT FROM NEW.status
               AND OLD.reviewed_by IS NOT DISTINCT FROM NEW.reviewed_by
               AND OLD.review_notes IS NOT DISTINCT FROM NEW.review_notes
               AND OLD.accepted_at IS NOT DISTINCT FROM NEW.accepted_at
               AND OLD.completed_by IS NOT DISTINCT FROM NEW.completed_by
               AND OLD.completed_at IS NOT DISTINCT FROM NEW.completed_at
            THEN
                RETURN NEW;
            END IF;
            v_action := 'project_change_request.updated';
            v_description := 'Se ha actualizado una solicitud de cambios del proyecto';
            v_metadata := jsonb_build_object(
                'project_id', NEW.project_id,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'reviewed_by', NEW.reviewed_by,
                'completed_by', NEW.completed_by
            );
        ELSE
            v_action := 'project_change_request.deleted';
            v_description := 'Se ha eliminado una solicitud de cambios del proyecto';
            v_metadata := jsonb_build_object(
                'project_id', OLD.project_id,
                'status', OLD.status
            );
        END IF;
    ELSE
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

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
        v_actor_id,
        v_company_id,
        v_action,
        v_resource_type,
        v_resource_id,
        v_description,
        v_metadata
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$function$;

ALTER FUNCTION public.audit_project_activity_change() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.audit_project_activity_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_project_activity_change() FROM anon;
REVOKE ALL ON FUNCTION public.audit_project_activity_change() FROM authenticated;

-- Proyectos
DROP TRIGGER IF EXISTS projects_audit_activity ON public.projects;
CREATE TRIGGER projects_audit_activity
AFTER INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.audit_project_activity_change();

-- Hitos: el trigger existente de notificación milestone_completed se conserva.
DROP TRIGGER IF EXISTS project_milestones_audit_activity ON public.project_milestones;
CREATE TRIGGER project_milestones_audit_activity
AFTER INSERT OR UPDATE OR DELETE ON public.project_milestones
FOR EACH ROW EXECUTE FUNCTION public.audit_project_activity_change();

-- Actualizaciones: las funciones existentes siguen siendo responsables de notificar al cliente.
DROP TRIGGER IF EXISTS project_updates_audit_activity ON public.project_updates;
CREATE TRIGGER project_updates_audit_activity
AFTER INSERT OR UPDATE OR DELETE ON public.project_updates
FOR EACH ROW EXECUTE FUNCTION public.audit_project_activity_change();

-- Documentos
DROP TRIGGER IF EXISTS project_documents_audit_activity ON public.project_documents;
CREATE TRIGGER project_documents_audit_activity
AFTER INSERT OR UPDATE OR DELETE ON public.project_documents
FOR EACH ROW EXECUTE FUNCTION public.audit_project_activity_change();

-- Versiones y solicitudes de cambios del alcance
DROP TRIGGER IF EXISTS project_scope_versions_audit_activity ON public.project_scope_versions;
CREATE TRIGGER project_scope_versions_audit_activity
AFTER INSERT OR UPDATE OR DELETE ON public.project_scope_versions
FOR EACH ROW EXECUTE FUNCTION public.audit_project_activity_change();

DROP TRIGGER IF EXISTS project_scope_change_requests_audit_activity ON public.project_scope_change_requests;
CREATE TRIGGER project_scope_change_requests_audit_activity
AFTER INSERT OR UPDATE OR DELETE ON public.project_scope_change_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_project_activity_change();

-- Solicitudes de cambio del proyecto: el INSERT ya lo registra request_project_change().
DROP TRIGGER IF EXISTS project_change_requests_audit_activity ON public.project_change_requests;
CREATE TRIGGER project_change_requests_audit_activity
AFTER UPDATE OR DELETE ON public.project_change_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_project_activity_change();

COMMENT ON FUNCTION public.audit_project_activity_change() IS
'Registra en activity_log las acciones relevantes sobre proyectos, hitos, actualizaciones, documentos y versiones/solicitudes de alcance. Evita duplicar el INSERT de project_change_requests, que ya registra request_project_change().';

COMMIT;
