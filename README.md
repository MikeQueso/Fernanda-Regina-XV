# Invitación XV Años · Fernanda Regina

Invitación digital de una sola página. Tema: **La Reina de Corazones**
(Alicia en el País de las Maravillas).

**Evento:** sábado 21 de noviembre de 2026 · Misa 7:30 PM · Recepción 8:00 PM

- Invitación: <https://mikequeso.github.io/Fernanda-Regina-XV/>
- Panel de confirmaciones: <https://mikequeso.github.io/Fernanda-Regina-XV/confirmaciones.html>

---

## Estructura

```
index.html                      La invitación
confirmaciones.html             Panel privado: quién confirmó y quién falta (pide clave)
css/styles.css                  Estilos
js/main.js                      Contador, calendario, música, animaciones
js/album.js                     Álbum de fotos (Supabase Storage)
js/rsvp.js                      Confirmación con nombre + código
js/boletos-pdf.js               PDF de boletos que se descarga al confirmar
js/supabase-config.js           URL y clave publicable de Supabase
assets/vendor/jspdf.umd.min.js  jsPDF 2.5.1 (licencia MIT); se carga solo al generar el PDF
assets/audio, assets/img        Música e imágenes
sql/                            Scripts de la base, sin datos personales
privado/                        ⚠️ No está en el repositorio: lista de invitados y códigos
```

Es HTML/CSS/JS plano: **no necesita compilarse ni instalar nada**.

## Verla en local

```
python -m http.server 5173
```

Y abrir <http://localhost:5173>. Con doble clic al `index.html` (`file://`) el
navegador bloquea el audio, las fuentes y la base de datos.

---

## Cómo funciona la confirmación

1. Cada invitación tiene un **código único** de 4 dígitos.
2. El invitado escribe **nombre + código**. La base solo responde si coinciden; tolera
   acentos y mayúsculas, y basta una palabra del nombre ("maria" encuentra "Tía María").
3. Ve sus boletos, confirma, se descarga un **PDF** (un pase con el agradecimiento y un
   boleto por persona) y avisa por WhatsApp.
4. Cada invitación se confirma **una sola vez**. Si otro integrante entra con el mismo
   código, solo vuelve a bajar los boletos.

La lista vive en Supabase (tabla `invitaciones`), **no en este repositorio**, porque el
repositorio es público. Desde la página no hay forma de leerla completa: las funciones
solo devuelven la invitación cuyo nombre y código coinciden.

### Archivos privados

`privado/` está en `.gitignore`.

| Archivo | Para qué |
|---|---|
| `privado/invitados.json` | Fuente de verdad de los códigos. **No regenerarlos**: los ya repartidos dejarían de servir. |
| `privado/cargar-invitados.sql` | Esquema + la lista. Se corre en el SQL Editor; se puede repetir sin duplicar. |

Fuera del proyecto: `Descargas/CODIGOS INVITACION XV REGINA.xlsx`, con el código y el
mensaje de cada invitación.

## Panel de confirmaciones

- Invitaciones y boletos confirmados, porcentaje, y cuántos faltan.
- Filtros *Todas / Confirmadas / Pendientes* y búsqueda por nombre o código.
- Botón de WhatsApp en cada fila con el mensaje del código listo para mandar.
- La ✕ quita una confirmación; *Borrar confirmaciones* las quita todas. La lista de
  invitados nunca se borra desde aquí.
- Se actualiza solo cada minuto.

La clave vive en la función `clave_panel()`; para cambiarla, `sql/cambiar-clave.sql`.

## Scripts SQL

| Archivo | Qué hace |
|---|---|
| `sql/confirmaciones.sql` | Instalación inicial de la tabla de confirmaciones |
| `sql/agregar-codigo.sql` | Columna `codigo` en confirmaciones |
| `sql/paso-final.sql` | Arreglo del borrado masivo |
| `sql/cambiar-clave.sql` | Cambiar la clave del panel |
| `sql/invitaciones.sql` | Esquema de la lista, **sin datos** (la versión con datos está en `privado/`) |

---

## Álbum de fotos

Bucket público `album` con políticas `insert` y `select` para `anon`, sin `update` ni
`delete`: los invitados suben y ven, pero no borran. Las fotos se redimensionan en el
navegador antes de subir (`fotos/` a 2048 px y `thumbs/` a 480 px). Tope de 50 MB por
archivo, que en la práctica solo alcanzan los videos.

## Que Supabase no se pause

Los proyectos gratuitos se pausan tras ~7 días sin actividad, y al pausarse la
invitación deja de guardar fotos y confirmaciones.

`.github/workflows/mantener-supabase-activo.yml` le manda una petición cada 3 días desde
GitHub Actions. Si el proyecto no responde, la ejecución falla y GitHub avisa por correo.

> GitHub desactiva los workflows programados si el repositorio pasa 60 días sin commits.
> Si se acerca la fecha y no has tocado nada, entra a **Actions** y ejecútalo a mano.

## Publicar

GitHub Pages desde `main` / raíz. Cada push actualiza el sitio en alrededor de un minuto.
