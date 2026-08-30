-- ============================================================
--  PASO FINAL · el último script, correr una vez
--
--  Arregla dos cosas:
--    1) "Borrar todo" fallaba: Supabase bloquea DELETE sin WHERE.
--    2) La clave estaba repetida en tres sitios y era fácil que se
--       quedara la del ejemplo. Ahora vive en UN SOLO lugar.
--
--  ⚠️ CAMBIA 'PON-AQUI-TU-CLAVE' EN LA LÍNEA 22 — SOLO AHÍ.
--     Es la contraseña para entrar a confirmaciones.html.
--     No la compartas con los invitados.
-- ============================================================


-- ---------- 1. La clave, en un único sitio ----------
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


-- ---------- 2. Ver la lista ----------
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


-- ---------- 3. Borrar una ----------
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


-- ---------- 4. Borrar todas ----------
create or replace function public.borrar_todas_confirmaciones(clave text)
returns integer
language plpgsql security definer set search_path = public
as $$
declare borradas integer;
begin
  if clave is distinct from public.clave_panel() then
    raise exception 'Clave incorrecta' using errcode = '28000';
  end if;
  -- El "where true" es obligatorio: Supabase rechaza los DELETE
  -- sin WHERE como protección contra borrados accidentales.
  delete from public.confirmaciones where true;
  get diagnostics borradas = row_count;
  return borradas;
end;
$$;


revoke all on function public.ver_confirmaciones(text) from public;
revoke all on function public.borrar_confirmacion(text, uuid) from public;
revoke all on function public.borrar_todas_confirmaciones(text) from public;
grant execute on function public.ver_confirmaciones(text) to anon;
grant execute on function public.borrar_confirmacion(text, uuid) to anon;
grant execute on function public.borrar_todas_confirmaciones(text) to anon;


-- ============================================================
--  Comprobar que quedó: debe dar error "Clave incorrecta".
--  Si NO da error, es que no cambiaste la clave de la línea 22.
-- ============================================================
-- select * from public.ver_confirmaciones('PON-AQUI-TU-CLAVE');
