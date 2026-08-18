# Invitación XV Años · Fernanda Regina

Invitación digital de una sola página. Tema: **La Reina de Corazones**
(Alicia en el País de las Maravillas).

**Evento:** sábado 21 de noviembre de 2026 · Misa 7:30 PM

---

## Estructura

```
index.html                  Toda la página
css/styles.css              Estilos
js/main.js                  Contador, calendario, música, animaciones
js/album.js                 Subida de fotos a Supabase
js/supabase-config.js       ← AQUÍ van tus claves y las cartas
assets/audio/cancion.mp3    Música de fondo
assets/img/                 Rosas, gato, soldado, cartas
```

Es HTML/CSS/JS plano: **no necesita compilarse ni instalar nada**.

## Verla en local

```
python -m http.server 5173
```

Y abrir <http://localhost:5173>.

> Ábrela con un servidor, no con doble clic al `index.html`.
> Con `file://` el navegador bloquea el audio y las fuentes.

---

## Qué falta por llenar

| Sección | Estado |
|---|---|
| Fotos de Fernanda Regina | pendiente |
| Hora de la recepción | pendiente |
| Itinerario | pendiente |
| Código de vestimenta | pendiente |
| Datos de regalos | pendiente |
| Cartas recortadas | pendiente |
| Álbum (Supabase) | falta configurar |

Las secciones pendientes ya están maquetadas y muestran un aviso de
"Próximamente". Para activarlas solo se llena el contenido y se borra su
bloque `<div class="soon">`.

---

## Configurar el álbum de fotos (Supabase)

1. Crear un proyecto en <https://supabase.com> (plan gratis).
2. **Storage → New bucket** → nombre `album`, marcado como **Public bucket**.
   Hace falta que sea público para que la galería pueda mostrar las fotos
   en la página (un `<img>` no puede mandar cabeceras de autenticación).
3. **SQL Editor → New query** → pegar y ejecutar:

   ```sql
   create policy "Invitados pueden subir fotos"
   on storage.objects for insert
   to anon
   with check (bucket_id = 'album');

   create policy "Invitados pueden ver el album"
   on storage.objects for select
   to anon
   using (bucket_id = 'album');
   ```

   Son las dos únicas operaciones permitidas: **subir y ver**. No se
   concede `update` ni `delete`, así que nadie puede borrar ni reemplazar
   una foto desde la página. Para eso hay que entrar al dashboard.

4. Copiar de **Settings → Data API** el *Project URL*, y de
   **Settings → API Keys** la clave *anon / public*.
5. Pegarlas en `js/supabase-config.js`:

   ```js
   window.SUPABASE = {
     url: 'https://TU-PROYECTO.supabase.co',
     anonKey: 'eyJ...',
     bucket: 'album'
   };
   ```

En cuanto `url` tenga valor, el botón "Subir fotos" se activa solo.

> La clave `anon` es pública por diseño: vive en el navegador y solo puede
> hacer lo que las políticas permitan, que aquí es insertar y leer.
> La que **nunca** se publica ni se pega en este archivo es la `service_role`.

Las fotos quedan en el dashboard de Supabase, en **Storage → album**.

### Cómo guarda las fotos

Cada imagen se sube en dos tamaños, redimensionada **en el navegador del
invitado** antes de salir:

| Carpeta | Lado mayor | Para qué |
|---|---|---|
| `fotos/` | 2048 px · JPEG q86 | lo que se ve al abrir la foto |
| `thumbs/` | 480 px · JPEG q72 | la cuadrícula de la galería |

Así una foto de 5 MB del celular viaja como ~400 KB. Sube más rápido con
datos móviles, la galería no tarda en cargar y el plan gratis (1 GB) rinde
para miles de fotos en vez de doscientas.

Los videos se suben tal cual, sin recomprimir, y salen en la galería con un
ícono de reproducir.

---

## Publicar

### Netlify (recomendado — funciona con repo privado)

1. <https://app.netlify.com> → *Add new site* → *Import an existing project*.
2. Conectar GitHub y elegir este repositorio.
3. Build command: **vacío**. Publish directory: **`.`**
4. *Deploy*.

### GitHub Pages

Requiere que el repositorio sea **público** en el plan gratuito.

*Settings → Pages → Source: Deploy from a branch → `main` / `root`.*
