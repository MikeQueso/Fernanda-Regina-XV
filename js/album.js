/* ==========================================================
   Álbum compartido · Supabase Storage
   Subida directa + galería de todo lo que suben los invitados.
   Usa la API REST, sin librerías externas.

   Cada foto se guarda en dos tamaños:
     fotos/…   version grande, para ver en pantalla completa
     thumbs/…  miniatura, para que la galeria cargue ligera
   ========================================================== */
(function () {
  'use strict';

  var CFG = window.SUPABASE || {};
  // Debe coincidir con el "File size limit" del bucket en Supabase (50 MB).
  // Las fotos nunca se acercan porque se redimensionan antes de subir;
  // el tope solo lo tocan los videos largos.
  var MAX_MB     = 50;
  var LADO_FOTO  = 2048;  // lado mayor de la version grande
  var LADO_THUMB = 480;   // lado mayor de la miniatura
  var POR_PAGINA = 60;

  var box    = document.getElementById('albumBox');
  var soon   = document.getElementById('albumSoon');
  var input  = document.getElementById('albumInput');
  var btn    = document.getElementById('albumBtn');
  var status = document.getElementById('albumStatus');
  var grid   = document.getElementById('albumGrid');
  var vacio  = document.getElementById('albumVacio');
  var masBtn = document.getElementById('albumMas');

  if (!box) return;

  if (!CFG.url || !CFG.anonKey) {
    box.hidden = true;
    if (soon) soon.hidden = false;
    return;
  }

  var API  = CFG.url.replace(/\/+$/, '') + '/storage/v1';
  var HEAD = { apikey: CFG.anonKey, Authorization: 'Bearer ' + CFG.anonKey };

  function urlPublica(ruta) {
    return API + '/object/public/' + CFG.bucket + '/' + ruta.split('/').map(encodeURIComponent).join('/');
  }
  function esVideo(nombre) { return /\.(mp4|mov|webm|m4v|3gp|avi)$/i.test(nombre); }

  function say(msg, error) {
    status.textContent = msg || '';
    status.classList.toggle('is-error', !!error);
  }

  /* ================= barra de progreso ================= */
  var bar = document.createElement('div');
  bar.className = 'album__bar';
  bar.hidden = true;
  var barFill = document.createElement('i');
  bar.appendChild(barFill);
  status.insertAdjacentElement('afterend', bar);

  /* ================= redimensionar antes de subir ================= */
  function redimensionar(file, lado, calidad) {
    return new Promise(function (resolve) {
      var pedir = window.createImageBitmap
        ? createImageBitmap(file, { imageOrientation: 'from-image' })["catch"](function () {
            return createImageBitmap(file);
          })
        : Promise.reject();

      pedir.then(function (bmp) {
        var esc = Math.min(1, lado / Math.max(bmp.width, bmp.height));
        var W = Math.max(1, Math.round(bmp.width * esc));
        var H = Math.max(1, Math.round(bmp.height * esc));

        var cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        cv.getContext('2d').drawImage(bmp, 0, 0, W, H);
        if (bmp.close) bmp.close();

        cv.toBlob(function (blob) { resolve(blob || file); }, 'image/jpeg', calidad);
      })["catch"](function () { resolve(file); }); // si algo falla, sube el original
    });
  }

  /* ================= subida ================= */
  function nombreBase(file) {
    var dot = file.name.lastIndexOf('.');
    var ext = dot > -1 ? file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'jpg';
    var stamp = new Date().toISOString().slice(0, 19).replace(/[:T-]/g, '');
    return { base: stamp + '-' + Math.random().toString(36).slice(2, 8), ext: ext };
  }

  function subir(ruta, blob, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', API + '/object/' + CFG.bucket + '/' + ruta, true);
      xhr.setRequestHeader('apikey', CFG.anonKey);
      xhr.setRequestHeader('Authorization', 'Bearer ' + CFG.anonKey);
      xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error('HTTP ' + xhr.status + ' · ' + xhr.responseText.slice(0, 160)));
      };
      xhr.onerror = function () { reject(new Error('Sin conexión')); };
      xhr.send(blob);
    });
  }

  function subirUno(file, onProgress) {
    var n = nombreBase(file);

    if (!/^image\//.test(file.type)) {
      // Video u otro: se sube tal cual, sin miniatura.
      return subir('fotos/' + n.base + '.' + n.ext, file, onProgress);
    }

    return redimensionar(file, LADO_FOTO, 0.86).then(function (grande) {
      return subir('fotos/' + n.base + '.jpg', grande, onProgress).then(function () {
        return redimensionar(file, LADO_THUMB, 0.72).then(function (thumb) {
          // Si la miniatura falla no pasa nada: la galería usa la grande.
          return subir('thumbs/' + n.base + '.jpg', thumb)["catch"](function () {});
        });
      });
    });
  }

  btn.addEventListener('click', function () { input.click(); });

  input.addEventListener('change', function () {
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;

    // Solo se revisa lo que no es imagen: las fotos se redimensionan antes
    // de subir, así que jamás alcanzan el tope.
    var grandes = files.filter(function (f) {
      return !/^image\//.test(f.type) && f.size > MAX_MB * 1024 * 1024;
    });
    if (grandes.length) {
      say('Hay ' + grandes.length + ' video(s) de más de ' + MAX_MB +
          ' MB. Recórtalos o quítalos e intenta de nuevo.', true);
      input.value = '';
      return;
    }

    btn.disabled = true;
    bar.hidden = false;
    var hechas = 0, fallidas = 0;

    function siguiente(i) {
      if (i >= files.length) {
        btn.disabled = false;
        bar.hidden = true;
        barFill.style.width = '0%';
        input.value = '';
        if (fallidas) say('Se subieron ' + hechas + ' de ' + files.length + '. ' + fallidas + ' fallaron, vuelve a intentar.', true);
        else say('¡Listo! Gracias por compartir ' + hechas + (hechas === 1 ? ' recuerdo.' : ' recuerdos.'));
        if (hechas) cargarGaleria(true);
        return;
      }

      say('Subiendo ' + (i + 1) + ' de ' + files.length + '…');
      subirUno(files[i], function (p) {
        barFill.style.width = Math.round(((i + p) / files.length) * 100) + '%';
      }).then(function () { hechas++; })
        ["catch"](function (err) {
          fallidas++;
          if (window.console) console.error('Álbum:', err.message);
        })
        .then(function () { siguiente(i + 1); });
    }

    siguiente(0);
  });

  /* ================= galería ================= */
  var items = [];      // { ruta, thumb, video }
  var offset = 0;
  var cargando = false;

  function listar(offset) {
    return fetch(API + '/object/list/' + CFG.bucket, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, HEAD),
      body: JSON.stringify({
        prefix: 'fotos/',
        limit: POR_PAGINA,
        offset: offset,
        sortBy: { column: 'created_at', order: 'desc' }
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function pintar(nuevos) {
    nuevos.forEach(function (it) {
      var fig = document.createElement('button');
      fig.type = 'button';
      fig.className = 'shot' + (it.video ? ' shot--video' : '');
      fig.setAttribute('aria-label', it.video ? 'Ver video' : 'Ver foto');

      if (it.video) {
        fig.innerHTML = '<span class="shot__play"></span>';
      } else {
        var img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = '';
        img.src = it.thumb;
        img.onerror = function () { img.src = urlPublica(it.ruta); };
        fig.appendChild(img);
      }

      fig.addEventListener('click', function () { abrirVisor(items.indexOf(it)); });
      grid.appendChild(fig);
    });
  }

  function cargarGaleria(reiniciar) {
    if (cargando) return;
    cargando = true;

    if (reiniciar) { offset = 0; items = []; grid.innerHTML = ''; }

    listar(offset).then(function (lista) {
      // Se descartan las carpetas (id null), el marcador invisible que
      // Supabase crea al hacer una carpeta desde el dashboard, y cualquier
      // archivo vacío o que no sea imagen ni video.
      var archivos = (lista || []).filter(function (o) {
        if (!o.id || !o.name) return false;
        if (o.name === '.emptyFolderPlaceholder' || o.name.charAt(0) === '.') return false;

        var meta = o.metadata || {};
        if (!meta.size) return false;

        var tipo = meta.mimetype || '';
        return /^image\//.test(tipo) || /^video\//.test(tipo) || esVideo(o.name);
      });

      var nuevos = archivos.map(function (o) {
        var ruta = 'fotos/' + o.name;
        return {
          ruta: ruta,
          thumb: urlPublica('thumbs/' + o.name.replace(/\.[^.]+$/, '.jpg')),
          video: esVideo(o.name)
        };
      });

      items = items.concat(nuevos);
      pintar(nuevos);
      offset += archivos.length;

      vacio.hidden = items.length > 0;
      masBtn.hidden = archivos.length < POR_PAGINA;
      grid.hidden = items.length === 0;
      cargando = false;
    })["catch"](function (err) {
      // Sin permiso de lectura todavía: no se muestra galería, la subida sigue viva.
      grid.hidden = true;
      masBtn.hidden = true;
      vacio.hidden = true;
      cargando = false;
      if (window.console) console.warn('Galería no disponible:', err.message);
    });
  }

  if (masBtn) masBtn.addEventListener('click', function () { cargarGaleria(false); });

  /* ================= visor a pantalla completa ================= */
  var visor, visorCaja, actual = -1;

  function construirVisor() {
    visor = document.createElement('div');
    visor.className = 'visor';
    visor.hidden = true;
    visor.innerHTML =
      '<button class="visor__x" type="button" aria-label="Cerrar">&times;</button>' +
      '<button class="visor__nav visor__nav--prev" type="button" aria-label="Anterior"></button>' +
      '<button class="visor__nav visor__nav--next" type="button" aria-label="Siguiente"></button>' +
      '<div class="visor__caja"></div>' +
      '<p class="visor__pos"></p>';
    document.body.appendChild(visor);
    visorCaja = visor.querySelector('.visor__caja');

    visor.querySelector('.visor__x').addEventListener('click', cerrarVisor);
    visor.querySelector('.visor__nav--prev').addEventListener('click', function (e) { e.stopPropagation(); mover(-1); });
    visor.querySelector('.visor__nav--next').addEventListener('click', function (e) { e.stopPropagation(); mover(1); });
    visor.addEventListener('click', function (e) { if (e.target === visor || e.target === visorCaja) cerrarVisor(); });

    document.addEventListener('keydown', function (e) {
      if (visor.hidden) return;
      if (e.key === 'Escape') cerrarVisor();
      else if (e.key === 'ArrowLeft') mover(-1);
      else if (e.key === 'ArrowRight') mover(1);
    });

    // Deslizar en móvil
    var x0 = null;
    visor.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    visor.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1);
      x0 = null;
    }, { passive: true });
  }

  function abrirVisor(i) {
    if (i < 0 || i >= items.length) return;
    if (!visor) construirVisor();
    actual = i;
    render();
    visor.hidden = false;
    document.body.classList.add('locked');
  }

  function cerrarVisor() {
    if (!visor) return;
    visor.hidden = true;
    visorCaja.innerHTML = '';
    document.body.classList.remove('locked');
  }

  function mover(d) {
    if (!items.length) return;
    actual = (actual + d + items.length) % items.length;
    render();
  }

  function render() {
    var it = items[actual];
    visorCaja.innerHTML = '';

    var el;
    if (it.video) {
      el = document.createElement('video');
      el.src = urlPublica(it.ruta);
      el.controls = true;
      el.autoplay = true;
      el.playsInline = true;
    } else {
      el = document.createElement('img');
      el.src = urlPublica(it.ruta);
      el.alt = '';
    }
    visorCaja.appendChild(el);
    visor.querySelector('.visor__pos').textContent = (actual + 1) + ' / ' + items.length;
  }

  cargarGaleria(true);
})();
