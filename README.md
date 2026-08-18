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
2. **Storage → New bucket** → nombre `album`, marcar **Public bucket**.
3. **Storage → Policies** → en el bucket `album`, crear una política que
   permita subir a cualquier visitante:

   ```sql
   create policy "Invitados pueden subir fotos"
   on storage.objects for insert
   to anon
   with check (bucket_id = 'album');
   ```

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
> hacer lo que las políticas del bucket permitan. Con la política de arriba
> los invitados **pueden subir pero no borrar ni listar** lo de los demás.
> La que nunca se publica es la `service_role`.

Las fotos quedan en el dashboard de Supabase, en **Storage → album**.

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
