-- ============================================================
--  Invitaciones · XV Fernanda Regina
--
--  Esquema de la lista de invitados. Este archivo NO trae datos:
--  la lista con nombres y códigos vive fuera del repositorio
--  (privado/cargar-invitados.sql), porque el repo es público.
--
--  Supabase → SQL Editor → New query → Run
-- ============================================================


-- ---------- 1. La lista ----------
create table if not exists public.invitaciones (
  codigo        text     primary key check (codigo ~ '^[0-9]{4,6}$'),
  nombre        text     not null,
  nombre_boleto text,                      -- opcional: cómo sale en los boletos
  boletos       smallint not null check (boletos between 1 and 50),
  orden         integer
);

alter table public.invitaciones enable row level security;

-- Sin políticas ni permisos: desde fuera nadie puede leerla.
-- Solo las funciones de abajo la consultan.
revoke all on public.invitaciones from anon, authenticated;


-- ---------- 2. Una sola confirmación por invitación ----------
delete from public.confirmaciones a
  using public.confirmaciones b
  where a.codigo is not null
    and a.codigo = b.codigo
    and a.creado_en > b.creado_en;

create unique index if not exists confirmaciones_codigo_unico
  on public.confirmaciones (codigo);

-- Los boletos ahora los fija la lista; se amplía el tope anterior de 15.
alter table public.confirmaciones drop constraint if exists confirmaciones_boletos_check;
alter table public.confirmaciones add constraint confirmaciones_boletos_check
  check (boletos between 1 and 50);

-- Confirmar ya no es un insert directo: pasa por confirmar_invitacion(),
-- que comprueba que la invitación exista. Así nadie mete filas inventadas.
revoke insert on public.confirmaciones from anon;
drop policy if exists "Invitados pueden confirmar" on public.confirmaciones;


-- ---------- 3. Comparar nombres con tolerancia ----------
-- Quita acentos, mayúsculas y signos. No usa la extensión unaccent para
-- no depender de en qué esquema esté instalada.
create or replace function public.normalizar_nombre(t text)
returns text
language sql
immutable
set search_path = public
as $$
  select btrim(regexp_replace(
           regexp_replace(
             translate(lower(coalesce(t, '')),
                       'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
                       'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc'),
             '[^a-z0-9]+', ' ', 'g'),
           '\s+', ' ', 'g'))
$$;

-- El código es lo que identifica; el nombre es una comprobación, así que
-- basta con que coincida una palabra ("maria" encuentra "Tía María").
create or replace function public.nombres_coinciden(escrito text, guardado text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  e text := public.normalizar_nombre(escrito);
  g text := public.normalizar_nombre(guardado);
  w text;
begin
  if length(e) < 2 or g = '' then
    return false;
  end if;

  if position(e in g) > 0 or position(g in e) > 0 then
    return true;
  end if;

  foreach w in array string_to_array(e, ' ') loop
    if length(w) >= 3
       and w not in ('tia', 'tio', 'familia', 'fam', 'los', 'las', 'del')
       and position(' ' || w || ' ' in ' ' || g || ' ') > 0 then
      return true;
    end if;
  end loop;

  return false;
end;
$$;


-- ---------- 4. Lo que usa la invitación ----------

-- ¿Ya hay lista cargada? Si no, la invitación muestra "próximamente".
create or replace function public.hay_invitaciones()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.invitaciones)
$$;

-- Devuelve la invitación solo si nombre y código coinciden.
create or replace function public.buscar_invitacion(p_nombre text, p_codigo text)
returns table (nombre text, mostrar text, codigo text, boletos smallint, confirmada boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
    select i.nombre,
           coalesce(i.nombre_boleto, i.nombre),
           i.codigo,
           i.boletos,
           exists (select 1 from public.confirmaciones c where c.codigo = i.codigo)
    from public.invitaciones i
    where i.codigo = regexp_replace(coalesce(p_codigo, ''), '[^0-9]', '', 'g')
      and (public.nombres_coinciden(p_nombre, i.nombre)
           or public.nombres_coinciden(p_nombre, i.nombre_boleto));
end;
$$;

-- Confirma. Si ya estaba confirmada no duplica, solo devuelve los datos
-- (así otro integrante de la familia puede volver a bajar sus boletos).
create or replace function public.confirmar_invitacion(p_nombre text, p_codigo text)
returns table (nombre text, mostrar text, codigo text, boletos smallint, confirmada boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  inv public.invitaciones%rowtype;
begin
  select i.* into inv
  from public.invitaciones i
  where i.codigo = regexp_replace(coalesce(p_codigo, ''), '[^0-9]', '', 'g')
    and (public.nombres_coinciden(p_nombre, i.nombre)
         or public.nombres_coinciden(p_nombre, i.nombre_boleto));

  if not found then
    return;   -- sin filas = no coincide
  end if;

  insert into public.confirmaciones (apellido, codigo, boletos)
  values (inv.nombre, inv.codigo, inv.boletos)
  on conflict (codigo) do nothing;

  return query
    select inv.nombre, coalesce(inv.nombre_boleto, inv.nombre), inv.codigo, inv.boletos, true;
end;
$$;


-- ---------- 5. Lo que usa el panel (con clave) ----------

create or replace function public.ver_invitaciones(clave text)
returns table (codigo text, nombre text, mostrar text, boletos smallint, orden integer,
               confirmada boolean, confirmado_en timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if clave is distinct from public.clave_panel() then
    raise exception 'Clave incorrecta' using errcode = '28000';
  end if;

  return query
    select i.codigo, i.nombre, coalesce(i.nombre_boleto, i.nombre), i.boletos, i.orden,
           c.codigo is not null, c.creado_en
    from public.invitaciones i
    left join public.confirmaciones c on c.codigo = i.codigo
    order by i.orden nulls last, i.nombre;
end;
$$;

-- Quita la confirmación de una invitación (para pruebas o errores).
create or replace function public.desconfirmar_invitacion(clave text, p_codigo text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  borradas integer;
begin
  if clave is distinct from public.clave_panel() then
    raise exception 'Clave incorrecta' using errcode = '28000';
  end if;

  delete from public.confirmaciones where codigo = p_codigo;
  get diagnostics borradas = row_count;
  return borradas;
end;
$$;


-- ---------- 6. Permisos ----------
-- Supabase da EXECUTE a anon por defecto, así que se quita explícitamente
-- y solo se devuelve en lo que la invitación y el panel necesitan.
revoke all on function public.normalizar_nombre(text)              from public, anon, authenticated;
revoke all on function public.nombres_coinciden(text, text)        from public, anon, authenticated;
revoke all on function public.hay_invitaciones()                   from public, anon, authenticated;
revoke all on function public.buscar_invitacion(text, text)        from public, anon, authenticated;
revoke all on function public.confirmar_invitacion(text, text)     from public, anon, authenticated;
revoke all on function public.ver_invitaciones(text)               from public, anon, authenticated;
revoke all on function public.desconfirmar_invitacion(text, text)  from public, anon, authenticated;

grant execute on function public.hay_invitaciones()                  to anon;
grant execute on function public.buscar_invitacion(text, text)       to anon;
grant execute on function public.confirmar_invitacion(text, text)    to anon;
grant execute on function public.ver_invitaciones(text)              to anon;
grant execute on function public.desconfirmar_invitacion(text, text) to anon;

notify pgrst, 'reload schema';
