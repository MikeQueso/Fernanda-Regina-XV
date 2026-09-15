# Invitación XV Años · Fernanda Regina

Invitación digital de una sola página. Tema: **La Reina de Corazones**
(Alicia en el País de las Maravillas).

**Evento:** sábado 21 de noviembre de 2026 · Misa 7:30 PM · Recepción 8:00 PM

Publicada en <https://mikequeso.github.io/Fernanda-Regina-XV/>

---

## Estructura

```
index.html                  La invitación
css/styles.css              Estilos
js/main.js                  Contador, calendario, música, animaciones
js/album.js                 Álbum de fotos (Supabase Storage)
js/supabase-config.js       URL y clave publicable de Supabase, y modo del álbum
assets/audio, assets/img    Música e imágenes
```

Es HTML/CSS/JS plano: **no necesita compilarse ni instalar nada**.

## Verla en local

```
python -m http.server 5173
```

Y abrir <http://localhost:5173>. Con doble clic al `index.html` (`file://`) el
navegador bloquea el audio, las fuentes y el álbum.

---

## Confirmación de asistencia

Un solo botón, **Aceptar invitación**, que abre WhatsApp con el mensaje
*"Aceptamos, gracias por invitarnos"* dirigido al 56 1141 9206.

Es un enlace normal, sin formularios ni JavaScript, así que funciona en cualquier
teléfono. El botón y su texto son grandes y de alto contraste a propósito:
también abren la invitación personas mayores.

## Álbum de fotos

Cerrado hasta el día de la fiesta con el aviso *"Este apartado se abrirá en el gran
día"*. Se abre solo el **21 de noviembre de 2026 a medianoche**, hora del centro de
México. `window.ALBUM` en `js/supabase-config.js` controla el modo:

| Valor | Efecto |
|---|---|
| `'auto'` | Cerrado hasta el día de la fiesta; ese día se abre solo |
| `'abierto'` | Abierto ya, para probar |
| `'cerrado'` | Cerrado aunque ya sea el día |

Bucket público `album` con políticas `insert` y `select` para `anon`, sin `update` ni
`delete`: los invitados suben y ven, pero no borran. Las fotos se redimensionan en el
navegador antes de subir (`fotos/` a 2048 px y `thumbs/` a 480 px). Tope de 50 MB por
archivo, que en la práctica solo alcanzan los videos.

## Que Supabase no se pause

Los proyectos gratuitos se pausan tras ~7 días sin actividad, y al pausarse el álbum
deja de funcionar.

`.github/workflows/mantener-supabase-activo.yml` le manda una petición cada 3 días desde
GitHub Actions. Si el proyecto no responde, la ejecución falla y GitHub avisa por correo.

> GitHub desactiva los workflows programados si el repositorio pasa 60 días sin commits.
> Si se acerca la fecha y no has tocado nada, entra a **Actions** y ejecútalo a mano.

## Publicar

GitHub Pages desde `main` / raíz. Cada push actualiza el sitio en alrededor de un minuto.
