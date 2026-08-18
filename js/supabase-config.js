/* ==========================================================
   CONFIGURACIÓN
   Rellena estos datos con los de tu proyecto de Supabase.
   Mientras 'url' esté vacío, la sección del álbum se queda
   en "Próximamente" y no se rompe nada.
   ========================================================== */
window.SUPABASE = {
  // Settings → Data API → Project URL
  url: 'https://yhywubvveqnlgpkhrdgz.supabase.co',

  // Settings → API Keys → anon / public
  // Esta clave es pública por diseño: va en el navegador y no da acceso a
  // nada que las políticas no permitan (aquí, solo subir).
  // NUNCA pongas aquí la clave service_role.
  anonKey: 'sb_publishable_ZP2257ZkDMN9FOaPgp51Mw_iXpGwOaR',

  // Bucket privado de Storage donde caen las fotos
  bucket: 'album'
};

/* ==========================================================
   CARTAS RECORTADAS
   Cuando estén los recortes individuales, pon aquí sus rutas.
   Ejemplo:
   window.CARTAS = [
     'assets/img/cartas/reina.png',
     'assets/img/cartas/alicia.png',
     'assets/img/cartas/conejo.png',
     'assets/img/cartas/sombrerero.png',
     'assets/img/cartas/rey.png',
     'assets/img/cartas/oruga.png'
   ];
   ========================================================== */
window.CARTAS = [];
