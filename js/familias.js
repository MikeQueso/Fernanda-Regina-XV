/* ==========================================================
   LISTA DE FAMILIAS INVITADAS

   Cada familia lleva:
     apellido  como lo van a escribir
     codigo    número único, es su "contraseña" de invitación
     boletos   los que le tocan

   El invitado escribe apellido + código, y solo si los dos
   coinciden ve sus boletos. Por eso puede haber dos familias
   con el mismo apellido sin que se confundan.

   ⚠️ El código debe ser distinto en cada familia.
   ========================================================== */
window.FAMILIAS = [
  // ⚠️ EJEMPLOS — reemplazar por la lista real
  { apellido: 'García Fernández', codigo: '1041', boletos: 4 },
  { apellido: 'Pérez Salinas',    codigo: '1042', boletos: 2 },
  { apellido: 'Tadeo Macías',     codigo: '1043', boletos: 3 },
  { apellido: 'Rodríguez',        codigo: '1044', boletos: 5 },
  { apellido: 'Rodríguez',        codigo: '1045', boletos: 2 },  // mismo apellido, otra familia
  { apellido: 'Martínez Cruz',    codigo: '1046', boletos: 2 }
];
