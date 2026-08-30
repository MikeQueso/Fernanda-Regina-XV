/* ==========================================================
   Confirmación de asistencia
   El invitado escribe su apellido, la invitación lo busca en la
   lista de js/familias.js y le muestra los boletos que ya tiene
   asignados. La cantidad no la elige él.

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

  var elegida = null;   // la familia seleccionada

  /* ---- utilidades ---- */
  function normalizar(s) {
    return String(s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quita acentos
      .replace(/\s+/g, ' ').trim();
  }

  function plural(n) { return n === 1 ? 'boleto' : 'boletos'; }

  function decir(msg, error) {
    estado.textContent = msg || '';
    estado.classList.toggle('is-error', !!error);
  }

  function enlaceWa(f) {
    var texto = 'Aceptamos, gracias por invitarnos\n\n' +
                'Familia: ' + f.apellido + '\n' +
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

  /* ---- búsqueda ---- */
  function buscar(texto) {
    var q = normalizar(texto);
    if (q.length < 2) return [];

    var empiezan = [], contienen = [];
    FAMILIAS.forEach(function (f) {
      var n = normalizar(f.apellido);
      if (n.indexOf(q) === 0) empiezan.push(f);
      else if (n.indexOf(q) > -1) contienen.push(f);
    });
    return empiezan.concat(contienen).slice(0, MAX_SUG);
  }

  function cerrarLista() {
    lista.hidden = true;
    lista.innerHTML = '';
    apel.setAttribute('aria-expanded', 'false');
  }

  function elegir(f) {
    elegida = f;
    apel.value = f.apellido;
    cerrarLista();

    hFam.textContent = 'Familia ' + f.apellido;
    hNum.textContent = f.boletos;
    hTxt.textContent = plural(f.boletos);
    hallada.hidden = false;
    btn.disabled = false;
    decir('');
  }

  function pintarSugerencias(res) {
    lista.innerHTML = '';
    if (!res.length) { cerrarLista(); return; }

    res.forEach(function (f) {
      var li = document.createElement('li');
      li.className = 'rsvp__op';
      li.setAttribute('role', 'option');
      li.tabIndex = -1;
      li.innerHTML = '<span>' + f.apellido + '</span><i>' +
                     f.boletos + ' ' + plural(f.boletos) + '</i>';
      li.addEventListener('mousedown', function (e) { e.preventDefault(); elegir(f); });
      lista.appendChild(li);
    });

    lista.hidden = false;
    apel.setAttribute('aria-expanded', 'true');
  }

  apel.addEventListener('input', function () {
    elegida = null;
    hallada.hidden = true;
    btn.disabled = true;

    var texto = apel.value;
    if (normalizar(texto).length < 2) { cerrarLista(); decir(''); return; }

    var res = buscar(texto);
    pintarSugerencias(res);

    // Si escribió el nombre completo y coincide exacto, se elige solo.
    var exacta = FAMILIAS.filter(function (f) {
      return normalizar(f.apellido) === normalizar(texto);
    })[0];
    if (exacta) elegir(exacta);
    else if (!res.length) decir('No encontramos ese apellido en la lista.', true);
    else decir('');
  });

  apel.addEventListener('blur', function () { setTimeout(cerrarLista, 120); });

  apel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cerrarLista();
    else if (e.key === 'Enter' && !lista.hidden) {
      var primera = lista.querySelector('.rsvp__op');
      if (primera) { e.preventDefault(); primera.dispatchEvent(new Event('mousedown')); }
    }
  });

  /* ---- envío ---- */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    if (!elegida) {
      decir('Escribe tu apellido y elígelo de la lista.', true);
      apel.focus();
      return;
    }

    if (!CFG.url || !CFG.anonKey) {
      mostrarHecho(elegida);
      return;
    }

    btn.disabled = true;
    decir('Enviando…');

    fetch(CFG.url.replace(/\/+$/, '') + '/rest/v1/confirmaciones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CFG.anonKey,
        Authorization: 'Bearer ' + CFG.anonKey,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ apellido: elegida.apellido, boletos: elegida.boletos })
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) {
        throw new Error('HTTP ' + r.status + ' · ' + t.slice(0, 160));
      });

      try { localStorage.setItem(LLAVE, JSON.stringify(elegida)); } catch (e) {}

      decir('');
      mostrarHecho(elegida);
      window.open(enlaceWa(elegida), '_blank', 'noopener');
    })["catch"](function (err) {
      btn.disabled = false;
      decir('No se pudo guardar. Revisa tu conexión e intenta de nuevo.', true);
      if (window.console) console.error('RSVP:', err.message);
    });
  });
})();
