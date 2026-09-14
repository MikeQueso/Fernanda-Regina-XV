/* ==========================================================
   Confirmación de asistencia

   El invitado escribe el nombre de su invitación y su código.
   La lista vive en Supabase (tabla invitaciones), no en este
   repositorio público: la base solo responde cuando nombre y
   código coinciden, así que desde la página no se puede sacar
   la lista de invitados.

   Al confirmar se muestra el agradecimiento, se descarga el PDF
   con los boletos y se ofrece el aviso por WhatsApp.
   ========================================================== */
(function () {
  'use strict';

  var CFG         = window.SUPABASE || {};
  var WHATSAPP    = window.WHATSAPP || '525611419206';
  var LLAVE       = 'regina-xv-invitacion';
  var LLAVE_VIEJA = 'regina-xv-confirmado';   // formato anterior, ya no sirve

  function $(id) { return document.getElementById(id); }

  var form      = $('rsvpForm');
  var inNombre  = $('rsvpNombre');
  var inCodigo  = $('rsvpCodigo');
  var hallada   = $('rsvpHallada');
  var hNombre   = $('rsvpHNombre');
  var hNum      = $('rsvpHNum');
  var hTxt      = $('rsvpHTxt');
  var hNota     = $('rsvpHNota');
  var btn       = $('rsvpBtn');
  var btnTxt    = $('rsvpBtnTxt');
  var estado    = $('rsvpEstado');
  var espera    = $('rsvpEspera');
  var hecho     = $('rsvpHecho');
  var gNombre   = $('rsvpGraciasNombre');
  var hechoTx   = $('rsvpHechoTxt');
  var btnPdf    = $('rsvpPdf');
  var pdfEstado = $('rsvpPdfEstado');
  var wa        = $('rsvpWa');
  var otra      = $('rsvpOtra');

  if (!form) return;

  var encontrada = null;   // invitación que coincide con lo escrito
  var datosHecho = null;   // invitación ya confirmada que se está mostrando
  var temporizador = null;
  var turno = 0;           // descarta respuestas que llegan tarde

  /* ---------------- utilidades ---------------- */
  function decir(msg, error) {
    estado.textContent = msg || '';
    estado.classList.toggle('is-error', !!error);
  }
  function plural(n) { return n === 1 ? 'boleto' : 'boletos'; }
  function digitos(s) { return String(s || '').replace(/\D+/g, ''); }
  function largoNombre(s) { return String(s || '').replace(/\s+/g, '').length; }

  function rpc(fn, cuerpo) {
    return fetch(CFG.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CFG.anonKey,
        Authorization: 'Bearer ' + CFG.anonKey
      },
      body: JSON.stringify(cuerpo || {})
    }).then(function (r) {
      if (!r.ok) throw new Error(fn + ' HTTP ' + r.status);
      return r.json();
    });
  }

  function enlaceWa(d) {
    var texto = 'Aceptamos, gracias por invitarnos\n\n' +
                'Invitación: ' + d.mostrar + '\n' +
                'Código: ' + d.codigo + '\n' +
                'Boletos: ' + d.boletos;
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto);
  }

  function guardarLocal(d) {
    try { localStorage.setItem(LLAVE, JSON.stringify(d)); } catch (e) {}
  }
  function leerLocal() {
    try {
      localStorage.removeItem(LLAVE_VIEJA);
      var d = JSON.parse(localStorage.getItem(LLAVE) || 'null');
      return d && d.codigo && d.mostrar && d.boletos ? d : null;
    } catch (e) { return null; }
  }

  /* ---------------- PDF de boletos ---------------- */
  function descargarPdf() {
    if (!datosHecho) return;
    if (!window.BoletosPDF) {
      pdfEstado.classList.add('is-error');
      pdfEstado.textContent = 'No se pudo preparar el PDF. Recarga la página e intenta de nuevo.';
      return;
    }
    btnPdf.disabled = true;
    pdfEstado.classList.remove('is-error');
    pdfEstado.textContent = 'Preparando tus boletos…';

    window.BoletosPDF.generar(datosHecho).then(function () {
      pdfEstado.textContent = '¡Listo! Tus boletos se descargaron en PDF.';
    }, function (err) {
      pdfEstado.classList.add('is-error');
      pdfEstado.textContent = 'No se pudo generar el PDF. Toca el botón para intentarlo de nuevo.';
      if (window.console) console.error('PDF:', err);
    }).then(function () {
      btnPdf.disabled = false;
    });
  }

  btnPdf.addEventListener('click', descargarPdf);

  /* ---------------- pantallas ---------------- */
  function mostrarHecho(d, recienConfirmada) {
    datosHecho = d;
    form.hidden = true;
    espera.hidden = true;
    hecho.hidden = false;

    gNombre.textContent = d.mostrar;
    hechoTx.textContent = d.boletos + ' ' + plural(d.boletos) + ' apartados · código ' + d.codigo;
    wa.href = enlaceWa(d);

    if (recienConfirmada) {
      hecho.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Primero se lee el agradecimiento; después baja el PDF.
      setTimeout(descargarPdf, 900);
    }
  }

  function mostrarEspera() {
    form.hidden = true;
    espera.hidden = false;
  }

  function limpiarHallada() {
    encontrada = null;
    hallada.hidden = true;
    btn.disabled = true;
  }

  function abrirFormulario() {
    hecho.hidden = true;
    pdfEstado.textContent = '';
    inNombre.value = '';
    inCodigo.value = '';
    limpiarHallada();
    decir('');

    if (!CFG.url || !CFG.anonKey) { mostrarEspera(); return; }

    rpc('hay_invitaciones').then(function (hay) {
      if (hay === true) {
        espera.hidden = true;
        form.hidden = false;
      } else {
        mostrarEspera();
      }
    })['catch'](mostrarEspera);
  }

  // Un mismo celular puede confirmar varias invitaciones (por ejemplo,
  // alguien que confirma por sus papás y por su propia familia).
  otra.addEventListener('click', function () {
    try { localStorage.removeItem(LLAVE); } catch (e) {}
    datosHecho = null;
    abrirFormulario();
    inNombre.focus();
  });

  /* ---------------- búsqueda ---------------- */
  function programar() {
    clearTimeout(temporizador);
    turno++;
    limpiarHallada();

    if (largoNombre(inNombre.value) < 2 || digitos(inCodigo.value).length < 4) {
      decir('');
      return;
    }
    decir('Buscando tu invitación…');
    temporizador = setTimeout(buscar, 450);
  }

  function buscar() {
    var mio = ++turno;

    rpc('buscar_invitacion', { p_nombre: inNombre.value, p_codigo: inCodigo.value })
      .then(function (filas) {
        if (mio !== turno) return;

        var f = filas && filas[0];
        if (!f) {
          decir('No encontramos una invitación con ese nombre y código. Revisa el mensaje que te enviamos.', true);
          return;
        }

        encontrada = f;
        hNombre.textContent = f.mostrar;
        hNum.textContent = f.boletos;
        hTxt.textContent = plural(f.boletos);
        hNota.textContent = f.confirmada ? 'Esta invitación ya está confirmada' : 'Boletos apartados para ti';
        btnTxt.textContent = f.confirmada ? 'Ver mis boletos' : 'Confirmar asistencia';
        hallada.hidden = false;
        btn.disabled = false;
        decir('');

        if (window.BoletosPDF) window.BoletosPDF.precargar();
      })['catch'](function (err) {
        if (mio !== turno) return;
        decir('No pudimos conectar. Revisa tu internet e intenta de nuevo.', true);
        if (window.console) console.error('RSVP:', err);
      });
  }

  inNombre.addEventListener('input', programar);
  inCodigo.addEventListener('input', function () {
    var limpio = digitos(inCodigo.value).slice(0, 6);
    if (limpio !== inCodigo.value) inCodigo.value = limpio;
    programar();
  });

  /* ---------------- confirmar ---------------- */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    if (!encontrada) {
      decir('Escribe el nombre de tu invitación y tu código.', true);
      return;
    }

    btn.disabled = true;
    decir(encontrada.confirmada ? 'Abriendo tus boletos…' : 'Confirmando…');

    rpc('confirmar_invitacion', { p_nombre: inNombre.value, p_codigo: inCodigo.value })
      .then(function (filas) {
        var f = filas && filas[0];
        if (!f) throw new Error('La invitación ya no coincide');

        var d = { nombre: f.nombre, mostrar: f.mostrar, codigo: f.codigo, boletos: f.boletos };
        guardarLocal(d);
        decir('');
        mostrarHecho(d, true);
      })['catch'](function (err) {
        btn.disabled = false;
        decir('No se pudo confirmar. Revisa tu conexión e intenta de nuevo.', true);
        if (window.console) console.error('RSVP:', err);
      });
  });

  /* ---------------- arranque ---------------- */
  var previo = leerLocal();
  if (previo) mostrarHecho(previo, false);
  else abrirFormulario();
})();
