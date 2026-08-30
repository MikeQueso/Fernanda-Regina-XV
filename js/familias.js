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

   Mientras esta lista esté vacía, la sección de confirmación
   muestra un aviso de "próximamente" en vez del formulario.

   Formato:
     { apellido: 'Apellido de la familia', codigo: '0000', boletos: 0 },
   ========================================================== */
window.FAMILIAS = [

];
