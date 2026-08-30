-- ============================================================
--  Guardar también el código de cada familia
--
--  Con apellidos repetidos, ver solo "Rodríguez · 2 boletos" en el
--  panel no dice cuál de las dos familias confirmó. El código sí.
--
--  Pegar y correr tal cual. No hay nada que editar.
--  Supabase → SQL Editor → New query → Run
-- ============================================================

alter table public.confirmaciones
  add column if not exists codigo text;

-- Nota: no lleva "not null" a propósito. Las confirmaciones que ya
-- existan se quedan con el código vacío en vez de romper la tabla.
