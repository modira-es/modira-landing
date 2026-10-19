-- Migration 174: habilitar Realtime para la bandeja de notificaciones
-- Complementa 173_notification_retention.sql.
-- Permite que el frontend reciba INSERT/UPDATE de public.notifications
-- mediante Supabase Realtime. No cambia RLS ni permisos de lectura/escritura.

BEGIN;

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN
        RAISE EXCEPTION
            'No existe la publicación supabase_realtime. Comprueba que Supabase Realtime está habilitado antes de aplicar esta migración.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime
            ADD TABLE public.notifications;
    END IF;
END;
$migration$;

COMMIT;
