/* ==========================================================
   Confirmación de asistencia
   Guarda la familia y los boletos en Supabase y ofrece el
   aviso por WhatsApp. Una vez enviado no se puede cambiar:
   el rol anon solo tiene permiso de INSERT, ni update ni delete.
   ========================================================== */
(function () {
  'use strict';

  var CFG      = window.SUPABASE || {};
  var WHATSAPP = window.WHATSAPP || '525611419206';
  var MAX_BOLETOS = 15;
  var LLAVE = 'regina-xv-confirmado';

  var form    = document.getElementById('rsvpForm');
  var apel    = document.getElementById('rsvpApellido');
  var sel     = document.getElementById('rsvpBoletos');
  var btn     = document.getElementById('rsvpBtn');
  var estado  = document.getElementById('rsvpEstado');
  var hecho   = document.getElementById('rsvpHecho');
  var hechoTx = document.getElementById('rsvpHechoTxt');
  var wa      = document.getElementById('rsvpWa');

  if (!form) return;

  /* ---- opciones de boletos ---- */
  for (var i = 1; i <= MAX_BOLETOS; i++) {
    var o = document.createElement('option');
    o.value = i;
    o.textContent = i + (i === 1 ? ' boleto' : ' boletos');
    sel.appendChild(o);
  }

  function decir(msg, error) {
    estado.textContent = msg || '';
    estado.classList.toggle('is-error', !!error);
  }

  function enlaceWa(apellido, boletos) {
    var texto = 'Aceptamos, gracias por invitarnos\n\n' +
                'Familia: ' + apellido + '\n' +
                'Boletos: ' + boletos;
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto);
  }

  function mostrarHecho(apellido, boletos) {
    form.hidden = true;
    hecho.hidden = false;
    hechoTx.textContent = 'Familia ' + apellido + ' · ' +
                          boletos + (boletos === 1 ? ' boleto' : ' boletos');
    wa.href = enlaceWa(apellido, boletos);
  }

  /* ---- si ya confirmó en este dispositivo, no se pide de nuevo ---- */
  try {
    var previo = JSON.parse(localStorage.getItem(LLAVE) || 'null');
    if (previo && previo.apellido) {
      mostrarHecho(previo.apellido, previo.boletos);
      return;
    }
  } catch (e) { /* almacenamiento bloqueado: se sigue normal */ }

  /* ---- envío ---- */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    var apellido = apel.value.trim().replace(/\s+/g, ' ');
    var boletos  = parseInt(sel.value, 10);

    if (apellido.length < 2) {
      decir('Escribe el apellido de tu familia.', true);
      apel.focus();
      return;
    }
    if (!boletos || boletos < 1 || boletos > MAX_BOLETOS) {
      decir('Selecciona cuántos boletos apartan.', true);
      sel.focus();
      return;
    }

    var aviso = 'Vas a confirmar ' + boletos + (boletos === 1 ? ' boleto' : ' boletos') +
                ' para la familia ' + apellido + '.\n\n' +
                'Esta cantidad ya no se podrá cambiar. ¿Confirmas?';
    if (!window.confirm(aviso)) return;

    if (!CFG.url || !CFG.anonKey) {
      decir('La confirmación en línea no está disponible. Avísanos por WhatsApp.', true);
      mostrarHecho(apellido, boletos);
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
      body: JSON.stringify({ apellido: apellido, boletos: boletos })
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' · ' + t.slice(0, 160)); });

      try {
        localStorage.setItem(LLAVE, JSON.stringify({ apellido: apellido, boletos: boletos }));
      } catch (e) { /* sin almacenamiento: no pasa nada */ }

      decir('');
      mostrarHecho(apellido, boletos);

      // Abre WhatsApp solo, aprovechando el gesto del botón.
      window.open(enlaceWa(apellido, boletos), '_blank', 'noopener');
    })["catch"](function (err) {
      btn.disabled = false;
      decir('No se pudo guardar. Revisa tu conexión e intenta de nuevo.', true);
      if (window.console) console.error('RSVP:', err.message);
    });
  });
})();
