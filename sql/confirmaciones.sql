-- ============================================================
--  Confirmaciones de asistencia · XV Fernanda Regina
--  Pegar TODO esto en:  Supabase → SQL Editor → New query → Run
--
--  ANTES DE EJECUTAR: cambia CAMBIA-ESTA-CLAVE (línea marcada)
--  por la contraseña con la que quieras entrar a la página
--  confirmaciones.html. No la compartas con los invitados.
-- ============================================================

-- ---------- 1. La tabla ----------
create table if not exists public.confirmaciones (
  id        uuid        primary key default gen_random_uuid(),
  apellido  text        not null check (char_length(trim(apellido)) between 2 and 60),
  boletos   smallint    not null check (boletos between 1 and 15),
  creado_en timestamptz not null default now()
);

alter table public.confirmaciones enable row level security;


-- ---------- 2. Permisos de los invitados ----------
-- Solo INSERT. Sin select, update ni delete: una vez enviada la
-- confirmación nadie puede cambiarla, borrarla, ni leer la lista
-- de los demás desde la invitación.
drop policy if exists "Invitados pueden confirmar" on public.confirmaciones;

create policy "Invitados pueden confirmar"
on public.confirmaciones for insert
to anon
with check (true);


-- ---------- 3. Lectura privada para la página de confirmaciones ----------
-- security definer = la función sí puede leer la tabla, pero exige
-- la clave. Así la lista nunca queda expuesta con la clave pública.
create or replace function public.ver_confirmaciones(clave text)
returns setof public.confirmaciones
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ↓↓↓ CAMBIA ESTO POR TU CLAVE ↓↓↓
  if clave is distinct from 'CAMBIA-ESTA-CLAVE' then
    raise exception 'Clave incorrecta' using errcode = '28000';
  end if;

  return query
    select * from public.confirmaciones order by creado_en desc;
end;
$$;

revoke all on function public.ver_confirmaciones(text) from public;
grant execute on function public.ver_confirmaciones(text) to anon;


-- ============================================================
--  Comprobación rápida (opcional): debe devolver 1 fila
-- ============================================================
-- select * from public.ver_confirmaciones('CAMBIA-ESTA-CLAVE');
