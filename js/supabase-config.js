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

  // Bucket público de Storage donde caen las fotos
  bucket: 'album'
};

/* Álbum de fotos:
     'auto'     cerrado hasta el 21 de noviembre de 2026; ese día se abre solo
     'abierto'  abierto ya (útil para probar)
     'cerrado'  cerrado aunque ya sea el día */
window.ALBUM = 'auto';
