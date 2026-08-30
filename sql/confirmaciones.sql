-- ============================================================
--  Confirmaciones de asistencia · XV Fernanda Regina
--
--  Instalación completa desde cero. Si la base ya existe, lo que
--  hay que correr es sql/paso-final.sql, no esto.
--
--  Pegar TODO en: Supabase → SQL Editor → New query → Run
--  ⚠️ Cambia 'PON-AQUI-TU-CLAVE' (aparece una sola vez, más abajo).
-- ============================================================


-- ---------- 1. La tabla ----------
create table if not exists public.confirmaciones (
  id        uuid        primary key default gen_random_uuid(),
  apellido  text        not null check (char_length(trim(apellido)) between 2 and 60),
  boletos   smallint    not null check (boletos between 1 and 15),
  creado_en timestamptz not null default now()
);

alter table public.confirmaciones enable row level security;

-- En Postgres el permiso de tabla y la política de RLS son dos cosas
-- distintas: la política decide QUÉ filas, el grant decide SI se puede
-- tocar la tabla. Sin este grant, insertar falla con "permission denied"
-- aunque la política sea correcta.
-- Solo insert: nunca select, update ni delete para los invitados.
grant insert on public.confirmaciones to anon;


-- ---------- 2. Permisos de los invitados ----------
-- Una vez enviada la confirmación nadie puede cambiarla, borrarla, ni
-- leer la lista de los demás desde la invitación.
drop policy if exists "Invitados pueden confirmar" on public.confirmaciones;

create policy "Invitados pueden confirmar"
on public.confirmaciones for insert
to anon
with check (true);


-- ---------- 3. La clave del panel, en un único sitio ----------
create or replace function public.clave_panel()
returns text
language sql
immutable
as $$
  select 'PON-AQUI-TU-CLAVE'::text     -- ←←← CAMBIA ESTO Y NADA MÁS
$$;

-- Que nadie de fuera pueda leerla. Las funciones de abajo sí pueden,
-- porque corren como el dueño de la base (security definer).
revoke all on function public.clave_panel() from public;
revoke all on function public.clave_panel() from anon;


-- ---------- 4. Ver la lista ----------
-- security definer = la función sí puede leer la tabla, pero exige la
-- clave. Así la lista nunca queda expuesta con la clave publicable.
create or replace function public.ver_confirmaciones(clave text)
returns setof public.confirmaciones
language plpgsql security definer set search_path = public
as $$
begin
  if clave is distinct from public.clave_panel() then
    raise exception 'Clave incorrecta' using errcode = '28000';
  end if;
  return query select * from public.confirmaciones order by creado_en desc;
end;
$$;


-- ---------- 5. Borrado, solo con la clave ----------
-- Sirve para limpiar pruebas. Los invitados siguen sin poder borrar:
-- no hay política de delete para anon, y estas funciones exigen la clave.

create or replace function public.borrar_confirmacion(clave text, fila_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare borradas integer;
begin
  if clave is distinct from public.clave_panel() then
    raise exception 'Clave incorrecta' using errcode = '28000';
  end if;
  delete from public.confirmaciones where id = fila_id;
  get diagnostics borradas = row_count;
  return borradas;
end;
$$;

create or replace function public.borrar_todas_confirmaciones(clave text)
returns integer
language plpgsql security definer set search_path = public
as $$
declare borradas integer;
begin
  if clave is distinct from public.clave_panel() then
    raise exception 'Clave incorrecta' using errcode = '28000';
  end if;
  -- El "where true" no es opcional: Supabase rechaza los DELETE sin
  -- WHERE como protección contra borrados accidentales.
  delete from public.confirmaciones where true;
  get diagnostics borradas = row_count;
  return borradas;
end;
$$;

-- Nota: en esta base la clave quedó como se instaló y el usuario decidió
-- conservarla. Para cambiarla basta con editar clave_panel() y volver a
-- ejecutar solo esa función.


revoke all on function public.ver_confirmaciones(text) from public;
revoke all on function public.borrar_confirmacion(text, uuid) from public;
revoke all on function public.borrar_todas_confirmaciones(text) from public;
grant execute on function public.ver_confirmaciones(text) to anon;
grant execute on function public.borrar_confirmacion(text, uuid) to anon;
grant execute on function public.borrar_todas_confirmaciones(text) to anon;
