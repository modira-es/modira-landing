-- ============================================================
-- MODIRA - MIGRACIÓN 003
-- ÁREA DE TRABAJADORES
-- ============================================================
--
-- Esta migración es independiente de las migraciones 001 y 002.
--
-- Los trabajadores:
--   1. Se crean manualmente en Supabase Authentication.
--   2. Se registran aquí vinculándolos mediante auth_user_id.
--   3. Únicamente tienen acceso a su propia cuenta de trabajador.
--
-- No se crean:
--   - Empresas
--   - Clientes
--   - Auditorías
--   - Solicitudes
--   - Facturas
--   - Datos de clientes
--   - Relaciones con las tablas de 001/002
--
-- ============================================================


-- ============================================================
-- 1. TABLA DE TRABAJADORES
-- ============================================================

create table if not exists public.workers (
    id uuid primary key default gen_random_uuid(),

    -- Usuario correspondiente de Supabase Authentication
    auth_user_id uuid not null unique
        references auth.users(id)
        on delete cascade,

    -- Nombre visible del trabajador
    display_name text,

    -- Permite desactivar el acceso sin eliminar la cuenta
    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- 2. ÍNDICE
-- ============================================================

create index if not exists idx_workers_auth_user_id
    on public.workers(auth_user_id);


-- ============================================================
-- 3. FUNCIÓN PARA updated_at
-- ============================================================

create or replace function public.update_workers_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


-- ============================================================
-- 4. TRIGGER PARA updated_at
-- ============================================================

drop trigger if exists workers_updated_at
on public.workers;

create trigger workers_updated_at
before update on public.workers
for each row
execute function public.update_workers_updated_at();


-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table public.workers enable row level security;


-- ============================================================
-- 6. POLÍTICA DE LECTURA
-- ============================================================
--
-- Un trabajador únicamente puede consultar:
--   - Su propio registro
--   - Si está activo
--
-- auth.uid() corresponde al usuario actualmente autenticado
-- en Supabase Authentication.
--
-- ============================================================

drop policy if exists "Workers can view their own account"
on public.workers;

create policy "Workers can view their own account"
on public.workers
for select
to authenticated
using (
    auth.uid() = auth_user_id
    and is_active = true
);


-- ============================================================
-- 7. NO SE PERMITE INSERTAR DESDE EL FRONTEND
-- ============================================================
--
-- Los trabajadores se registran manualmente desde el
-- Supabase SQL Editor / entorno administrativo.
--
-- Por tanto, NO creamos una política INSERT.
--
-- ============================================================


-- ============================================================
-- 8. NO SE PERMITE BORRAR DESDE EL FRONTEND
-- ============================================================
--
-- La eliminación de un trabajador se realizará
-- administrativamente.
--
-- Al borrar el usuario de auth.users, el registro de workers
-- se eliminará automáticamente gracias a ON DELETE CASCADE.
--
-- ============================================================


-- ============================================================
-- 9. NO SE PERMITE MODIFICAR DESDE EL FRONTEND
-- ============================================================
--
-- El trabajador no puede cambiar:
--   - auth_user_id
--   - is_active
--   - display_name
--
-- Todo ello queda bajo control administrativo.
--
-- ============================================================


-- ============================================================
-- FIN MIGRACIÓN 003
-- ============================================================