-- ============================================================
--  CAMBIAR LA CLAVE DEL PANEL
--
--  Sustituye NUEVA-CLAVE-AQUI (línea 15, una sola vez) por la
--  contraseña que quieras y corre todo en:
--  Supabase → SQL Editor → New query → Run
--
--  A partir de aquí la clave vive en un único sitio: la función
--  clave_panel(). Para volver a cambiarla, basta con reejecutar
--  solo ese primer bloque.
-- ============================================================

create or replace function public.clave_panel()
returns text
language sql
immutable
as $$
  select 'NUEVA-CLAVE-AQUI'::text     -- ←←← CAMBIA ESTO Y NADA MÁS
$$;

-- Que nadie de fuera pueda consultarla. Las funciones de abajo sí,
-- porque corren como el dueño de la base (security definer).
revoke all on function public.clave_panel() from public;
revoke all on function public.clave_panel() from anon;


-- Las dos funciones que validaban con el texto escrito a mano pasan
-- a consultar clave_panel(). borrar_todas_confirmaciones no hace
-- falta tocarla: ya delega su comprobación en ver_confirmaciones.

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
