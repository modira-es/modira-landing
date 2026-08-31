-- MODIRA 018 — exigir cuenta activa en create_automation_run
-- Corrección incremental: no modifica migraciones históricas 001–017.

CREATE OR REPLACE FUNCTION public.create_automation_run(
  p_automation_id UUID
)
RETURNS public.automation_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_automation public.automations;
  v_run public.automation_runs;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- El estado activo es obligatorio para workers y clientes.
  IF NOT public.current_user_is_active() THEN
    RAISE EXCEPTION 'Acceso denegado: la cuenta no está activa';
  END IF;

  SELECT *
  INTO v_automation
  FROM public.automations
  WHERE id = p_automation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La automatización indicada no existe';
  END IF;

  IF NOT (
    public.current_user_is_worker()
    OR (
      NOT public.current_user_is_worker()
      AND v_automation.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  INSERT INTO public.automation_runs (
    automation_id,
    company_id,
    estado,
    inicio
  )
  VALUES (
    v_automation.id,
    v_automation.company_id,
    'pendiente',
    CURRENT_TIMESTAMP
  )
  RETURNING * INTO v_run;

  RETURN v_run;
END;
$$;

REVOKE ALL ON FUNCTION public.create_automation_run(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_automation_run(UUID) TO authenticated;

COMMENT ON FUNCTION public.create_automation_run(UUID)
IS 'Crea ejecuciones solo para cuentas autenticadas y activas, con ownership o worker activo.';
