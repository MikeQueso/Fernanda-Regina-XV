-- ============================================================
--  PASO FINAL · pegar y correr tal cual. NO hay que editar nada.
--
--  Arregla el único fallo que queda: "Borrar todo" respondía
--  "DELETE requires a WHERE clause", porque Supabase rechaza los
--  DELETE sin WHERE como protección contra borrados accidentales.
--
--  Tu clave actual se queda igual: este script no la toca ni la
--  menciona. La comprobación se delega en ver_confirmaciones(),
--  que ya la tiene guardada — por eso aquí no aparece escrita.
--
--  Correr en: Supabase → SQL Editor → New query → Run
-- ============================================================

create or replace function public.borrar_todas_confirmaciones(clave text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  borradas integer;
begin
  -- Si la clave es incorrecta, ver_confirmaciones lanza la excepción
  -- y este bloque se corta aquí. Así la contraseña vive en un solo
  -- sitio y no hay que repetirla.
  perform 1 from public.ver_confirmaciones(clave);

  delete from public.confirmaciones where true;
  get diagnostics borradas = row_count;
  return borradas;
end;
$$;

revoke all on function public.borrar_todas_confirmaciones(text) from public;
grant execute on function public.borrar_todas_confirmaciones(text) to anon;
