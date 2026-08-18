/* ==========================================================
   Álbum compartido · subida directa a Supabase Storage
   Usa la API REST de Storage, sin librerías externas.
   ========================================================== */
(function () {
  'use strict';

  var CFG = window.SUPABASE || {};
  var MAX_MB = 50;

  var box    = document.getElementById('albumBox');
  var soon   = document.getElementById('albumSoon');
  var input  = document.getElementById('albumInput');
  var btn    = document.getElementById('albumBtn');
  var status = document.getElementById('albumStatus');
  var list   = document.getElementById('albumList');

  if (!box) return;

  // Sin configurar todavía → deja la sección en "Próximamente".
  if (!CFG.url || !CFG.anonKey) {
    box.hidden = true;
    if (soon) soon.hidden = false;
    return;
  }

  var BASE = CFG.url.replace(/\/+$/, '') + '/storage/v1/object/' + CFG.bucket + '/';

  function say(msg, isError) {
    status.textContent = msg;
    status.classList.toggle('is-error', !!isError);
  }

  function safeName(file) {
    var dot = file.name.lastIndexOf('.');
    var ext = dot > -1 ? file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'jpg';
    var stamp = new Date().toISOString().slice(0, 19).replace(/[:T-]/g, '');
    var rand = Math.random().toString(36).slice(2, 8);
    return stamp + '-' + rand + '.' + ext;
  }

  function upload(file, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', BASE + safeName(file), true);
      xhr.setRequestHeader('apikey', CFG.anonKey);
      xhr.setRequestHeader('Authorization', 'Bearer ' + CFG.anonKey);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('x-upsert', 'false');

      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error('HTTP ' + xhr.status + ' · ' + xhr.responseText.slice(0, 160)));
      };
      xhr.onerror = function () { reject(new Error('Sin conexión')); };
      xhr.send(file);
    });
  }

  function addThumb(file) {
    if (!/^image\//.test(file.type)) return;
    var img = document.createElement('img');
    img.className = 'album__thumb';
    img.alt = '';
    img.src = URL.createObjectURL(file);
    img.onload = function () { URL.revokeObjectURL(img.src); };
    list.appendChild(img);
  }

  var bar = document.createElement('div');
  bar.className = 'album__bar';
  var barFill = document.createElement('i');
  bar.appendChild(barFill);
  bar.hidden = true;
  status.insertAdjacentElement('afterend', bar);

  btn.addEventListener('click', function () { input.click(); });

  input.addEventListener('change', function () {
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;

    var tooBig = files.filter(function (f) { return f.size > MAX_MB * 1024 * 1024; });
    if (tooBig.length) {
      say('Hay ' + tooBig.length + ' archivo(s) de más de ' + MAX_MB + ' MB. Quítalos e intenta de nuevo.', true);
      input.value = '';
      return;
    }

    btn.disabled = true;
    bar.hidden = false;
    var done = 0, failed = 0;

    function next(i) {
      if (i >= files.length) {
        btn.disabled = false;
        bar.hidden = true;
        barFill.style.width = '0%';
        input.value = '';
        if (failed) say('Se subieron ' + done + ' de ' + files.length + '. ' + failed + ' fallaron, vuelve a intentar.', true);
        else say('¡Listo! Gracias por compartir ' + done + (done === 1 ? ' foto.' : ' fotos.'));
        return;
      }

      say('Subiendo ' + (i + 1) + ' de ' + files.length + '…');

      upload(files[i], function (p) {
        barFill.style.width = Math.round(((i + p) / files.length) * 100) + '%';
      }).then(function () {
        done++;
        addThumb(files[i]);
      }).catch(function (err) {
        failed++;
        if (window.console) console.error('Álbum:', err.message);
      }).then(function () {
        next(i + 1);
      });
    }

    next(0);
  });
})();
