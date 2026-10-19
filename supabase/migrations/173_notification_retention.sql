-- Migration: notification retention and automatic cleanup
-- Purpose:
--   * Notifications are a transient user inbox, not the audit log.
--   * Keep notifications for 90 days, then delete them automatically.
--   * Do not delete or modify activity_log or any business/source records.
--   * Run cleanup daily through pg_cron.
--
-- Important:
--   * This affects only public.notifications rows older than 90 days.
--   * The existing notification read/insert/RLS behavior is intentionally unchanged.
--   * The cleanup function is not executable by authenticated/anon clients.

BEGIN;

-- Supports efficient retention cleanup without changing existing read paths.
CREATE INDEX IF NOT EXISTS idx_notifications_retention_created_at
    ON public.notifications (created_at);

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_deleted_count bigint := 0;
BEGIN
    /*
     * Delete a bounded batch per run to avoid one unbounded cleanup transaction.
     * Daily runs will continue draining any backlog.
     *
     * Retention policy: 90 days from notifications.created_at,
     * regardless of read/unread status.
     */
    WITH old_notifications AS (
        SELECT n.id
        FROM public.notifications AS n
        WHERE n.created_at < now() - interval '90 days'
        ORDER BY n.created_at ASC
        LIMIT 5000
        FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.notifications AS n
    USING old_notifications AS old
    WHERE n.id = old.id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$function$;

ALTER FUNCTION public.cleanup_old_notifications() OWNER TO postgres;

COMMENT ON FUNCTION public.cleanup_old_notifications() IS
'Deletes up to 5000 notifications older than 90 days. This is inbox housekeeping only; activity_log and business records are not modified. Intended for scheduled execution by pg_cron.';

-- Explicitly prevent client-side invocation of the maintenance function.
REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM authenticated;

-- Schedule one daily run. Re-running this migration replaces the named job
-- instead of creating duplicate scheduled jobs.
DO $block$
DECLARE
    v_job_id bigint;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'pg_cron'
    ) THEN
        RAISE EXCEPTION
            'pg_cron is not installed. Install/enable pg_cron before applying notification retention.';
    END IF;

    FOR v_job_id IN
        SELECT jobid
        FROM cron.job
        WHERE jobname = 'modira-cleanup-old-notifications'
    LOOP
        PERFORM cron.unschedule(v_job_id);
    END LOOP;

    PERFORM cron.schedule(
        'modira-cleanup-old-notifications',
        '17 3 * * *',
        $command$SELECT public.cleanup_old_notifications();$command$
    );
END;
$block$;

COMMIT;
