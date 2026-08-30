/* ==========================================================
   Confirmación de asistencia

   El invitado escribe su apellido y el código de su invitación.
   Solo si los dos coinciden con una familia de js/familias.js
   se le muestran los boletos que tiene asignados. El código es
   lo que distingue a dos familias con el mismo apellido, y de
   paso impide ver los boletos ajenos.

   Guarda en Supabase y ofrece el aviso por WhatsApp. Una vez
   enviado no se puede cambiar: el rol anon solo tiene INSERT.
   ========================================================== */
(function () {
  'use strict';

  var CFG      = window.SUPABASE || {};
  var FAMILIAS = window.FAMILIAS || [];
  var WHATSAPP = window.WHATSAPP || '525611419206';
  var LLAVE    = 'regina-xv-confirmado';
  var MAX_SUG  = 6;

  var form    = document.getElementById('rsvpForm');
  var apel    = document.getElementById('rsvpApellido');
  var cod     = document.getElementById('rsvpCodigo');
  var lista   = document.getElementById('rsvpLista');
  var hallada = document.getElementById('rsvpHallada');
  var hFam    = document.getElementById('rsvpHFam');
  var hNum    = document.getElementById('rsvpHNum');
  var hTxt    = document.getElementById('rsvpHTxt');
  var btn     = document.getElementById('rsvpBtn');
  var estado  = document.getElementById('rsvpEstado');
  var hecho   = document.getElementById('rsvpHecho');
  var gFam    = document.getElementById('rsvpGraciasFam');
  var hechoTx = document.getElementById('rsvpHechoTxt');
  var wa      = document.getElementById('rsvpWa');

  if (!form) return;

  var elegida = null;   // la familia validada (apellido + código)

  /* ---- utilidades ---- */
  function normalizar(s) {
    return String(s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')   // quita acentos
      .replace(/\s+/g, ' ').trim();
  }

  function limpiarCodigo(s) { return String(s).replace(/\s+/g, '').trim(); }
  function plural(n) { return n === 1 ? 'boleto' : 'boletos'; }

  function decir(msg, error) {
    estado.textContent = msg || '';
    estado.classList.toggle('is-error', !!error);
  }

  function enlaceWa(f) {
    var texto = 'Aceptamos, gracias por invitarnos\n\n' +
                'Familia: ' + f.apellido + '\n' +
                'Código: ' + f.codigo + '\n' +
                'Boletos: ' + f.boletos;
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto);
  }

  /* ---- pantalla final ---- */
  function mostrarHecho(f) {
    form.hidden = true;
    hecho.hidden = false;
    gFam.textContent = f.apellido;
    hechoTx.textContent = f.boletos + ' ' + plural(f.boletos) + ' apartados';
    wa.href = enlaceWa(f);
  }

  /* ---- si ya confirmó en este dispositivo ---- */
  try {
    var previo = JSON.parse(localStorage.getItem(LLAVE) || 'null');
    if (previo && previo.apellido) { mostrarHecho(previo); return; }
  } catch (e) { /* almacenamiento bloqueado: sigue normal */ }

  /* ---- sin lista de invitados todavía ----
     Sin familias cargadas el formulario rechazaría a todo el mundo,
     así que en su lugar se muestra un aviso de que falta poco. */
  if (!FAMILIAS.length) {
    form.hidden = true;
    var espera = document.getElementById('rsvpEspera');
    if (espera) espera.hidden = false;
    return;
  }

  /* ---- sugerencias de apellido ----
     Se muestran apellidos sin repetir: si hay dos familias con el
     mismo, en la lista aparece una sola vez y el código decide cuál.
     Tampoco se enseñan los boletos aquí, para no exponerlos. */
  function apellidosSugeridos(texto) {
    var q = normalizar(texto);
    if (q.length < 2) return [];

    var vistos = {}, empiezan = [], contienen = [];
    FAMILIAS.forEach(function (f) {
      var n = normalizar(f.apellido);
      if (vistos[n]) return;
      if (n.indexOf(q) === 0)      { vistos[n] = 1; empiezan.push(f.apellido); }
      else if (n.indexOf(q) > -1)  { vistos[n] = 1; contienen.push(f.apellido); }
    });
    return empiezan.concat(contienen).slice(0, MAX_SUG);
  }

  function cerrarLista() {
    lista.hidden = true;
    lista.innerHTML = '';
    apel.setAttribute('aria-expanded', 'false');
  }

  function pintarSugerencias(res) {
    lista.innerHTML = '';
    if (!res.length) { cerrarLista(); return; }

    res.forEach(function (nombre) {
      var li = document.createElement('li');
      li.className = 'rsvp__op';
      li.setAttribute('role', 'option');
      li.tabIndex = -1;
      li.textContent = nombre;
      li.addEventListener('mousedown', function (e) {
        e.preventDefault();
        apel.value = nombre;
        cerrarLista();
        validar();
        if (!cod.value) cod.focus();
      });
      lista.appendChild(li);
    });

    lista.hidden = false;
    apel.setAttribute('aria-expanded', 'true');
  }

  /* ---- validación de apellido + código ---- */
  function validar() {
    elegida = null;
    hallada.hidden = true;
    btn.disabled = true;

    var a = normalizar(apel.value);
    var c = limpiarCodigo(cod.value);

    if (a.length < 2) { decir(''); return; }

    var mismoApellido = FAMILIAS.filter(function (f) {
      return normalizar(f.apellido) === a;
    });

    if (!mismoApellido.length) {
      // Puede que aún esté escribiendo: solo se avisa si no hay ni sugerencias.
      if (!apellidosSugeridos(apel.value).length) {
        decir('No encontramos ese apellido en la lista.', true);
      } else {
        decir('');
      }
      return;
    }

    if (!c) { decir(''); return; }

    var f = mismoApellido.filter(function (x) {
      return limpiarCodigo(x.codigo) === c;
    })[0];

    if (!f) {
      decir('El código no corresponde a esa familia.', true);
      return;
    }

    elegida = f;
    hFam.textContent = 'Familia ' + f.apellido;
    hNum.textContent = f.boletos;
    hTxt.textContent = plural(f.boletos);
    hallada.hidden = false;
    btn.disabled = false;
    decir('');
  }

  apel.addEventListener('input', function () {
    pintarSugerencias(apellidosSugeridos(apel.value));
    validar();
  });

  cod.addEventListener('input', validar);

  apel.addEventListener('blur', function () { setTimeout(cerrarLista, 120); });

  apel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cerrarLista();
    else if (e.key === 'Enter' && !lista.hidden) {
      var primera = lista.querySelector('.rsvp__op');
      if (primera) { e.preventDefault(); primera.dispatchEvent(new Event('mousedown')); }
    }
  });

  /* ---- guardar en Supabase ----
     La columna 'codigo' se agrega con sql/agregar-codigo.sql. Si todavía
     no está, el primer intento falla con PGRST204 y se reintenta sin ella,
     para que las confirmaciones no se pierdan mientras tanto. */
  function guardar(f, conCodigo) {
    var fila = { apellido: f.apellido, boletos: f.boletos };
    if (conCodigo) fila.codigo = f.codigo;

    return fetch(CFG.url.replace(/\/+$/, '') + '/rest/v1/confirmaciones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CFG.anonKey,
        Authorization: 'Bearer ' + CFG.anonKey,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(fila)
    }).then(function (r) {
      if (r.ok) return true;
      return r.text().then(function (t) {
        if (conCodigo && /PGRST204|codigo/i.test(t)) {
          if (window.console) console.warn('Falta la columna "codigo"; se guarda sin ella.');
          return guardar(f, false);
        }
        throw new Error('HTTP ' + r.status + ' · ' + t.slice(0, 160));
      });
    });
  }

  /* ---- envío ---- */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    if (!elegida) {
      decir('Escribe tu apellido y el código de tu invitación.', true);
      (normalizar(apel.value).length < 2 ? apel : cod).focus();
      return;
    }

    if (!CFG.url || !CFG.anonKey) { mostrarHecho(elegida); return; }

    btn.disabled = true;
    decir('Enviando…');

    guardar(elegida, true).then(function () {
      try { localStorage.setItem(LLAVE, JSON.stringify(elegida)); } catch (e) {}

      decir('');
      // WhatsApp no se abre solo: taparía el mensaje antes de leerlo.
      mostrarHecho(elegida);
    })["catch"](function (err) {
      btn.disabled = false;
      decir('No se pudo guardar. Revisa tu conexión e intenta de nuevo.', true);
      if (window.console) console.error('RSVP:', err.message);
    });
  });
})();
