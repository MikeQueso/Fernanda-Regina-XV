-- ============================================================
--  ARREGLO · correr una sola vez en SQL Editor → New query → Run
--
--  1) Da el permiso de tabla que faltaba (sin esto los invitados
--     no pueden confirmar: "permission denied for table").
--  2) Cambia la clave del panel de confirmaciones.
--
--  ANTES DE EJECUTAR: sustituye TU-CLAVE-SECRETA (aparece 3 veces)
--  por la contraseña que quieras. Que no sea la del ejemplo.
-- ============================================================

-- ---------- 1. El permiso que faltaba ----------
grant insert on public.confirmaciones to anon;


-- ---------- 2. Tu clave, en las tres funciones ----------
create or replace function public.ver_confirmaciones(clave text)
returns setof public.confirmaciones
language plpgsql security definer set search_path = public
as $$
begin
  if clave is distinct from 'TU-CLAVE-SECRETA' then
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
  if clave is distinct from 'TU-CLAVE-SECRETA' then
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
  if clave is distinct from 'TU-CLAVE-SECRETA' then
    raise exception 'Clave incorrecta' using errcode = '28000';
  end if;
  delete from public.confirmaciones;
  get diagnostics borradas = row_count;
  return borradas;
end;
$$;
