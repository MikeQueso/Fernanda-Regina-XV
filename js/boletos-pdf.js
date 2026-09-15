/* ==========================================================
   Boletos en PDF

   Al tocar "Aceptar invitación" el enlace abre WhatsApp como siempre y,
   al mismo tiempo, se descarga un pase en PDF con el agradecimiento y
   los datos del evento.

   WhatsApp no espera al PDF a propósito: si el enlace se abriera después
   de generarlo, en iPhone ya no saltaría directo a la app sino a una
   página intermedia, y eso confunde a las personas mayores.

   El pase es general, sin nombre ni número de boletos: la invitación ya
   no pregunta quién confirma.

   Se dibuja en un canvas con las tipografías e imágenes de la invitación
   y se empaqueta con jsPDF (assets/vendor), que solo se carga cuando la
   sección de confirmación se acerca o al tocar el botón.
   ========================================================== */
(function () {
  'use strict';

  var W = 900, H = 1600;             // lienzo de la página
  var PDF_W = 450, PDF_H = 800;      // página del PDF, en puntos
  var JSPDF = 'assets/vendor/jspdf.umd.min.js';
  var ARCHIVO = 'Boletos-XV-Fernanda-Regina.pdf';

  var EVENTO = {
    fecha:      'Sábado 21 de noviembre de 2026',
    misaHora:   '7:30 PM',
    misaLugar:  'Catedral Jesús Señor de la Misericordia',
    recHora:    '8:00 PM',
    recLugar:   'Jardín de Eventos Xoxicalli',
    vestimenta: 'Formal · excepto color rojo'
  };

  var F_SCRIPT = '"Italianno", "Pinyon Script", cursive';
  var F_TITLE  = '"Cinzel", Georgia, serif';
  var F_BODY   = '"Cormorant Garamond", Georgia, serif';

  /* ---------------- carga de recursos ---------------- */
  var promesas = {};

  function unaVez(clave, fn) {
    if (!promesas[clave]) promesas[clave] = fn();
    return promesas[clave];
  }

  function imagen(src) {
    return unaVez('img:' + src, function () {
      return new Promise(function (resolve) {
        var im = new Image();
        im.onload = function () { resolve(im); };
        im.onerror = function () { resolve(null); };   // sin esa imagen, se dibuja lo demás
        im.src = src;
      });
    });
  }

  function jsPDFListo() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    return unaVez('jspdf', function () {
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = JSPDF;
        s.onload = function () {
          if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
          else reject(new Error('jsPDF no se inicializó'));
        };
        s.onerror = function () {
          delete promesas.jspdf;                        // permite reintentar
          reject(new Error('No se pudo cargar jsPDF'));
        };
        document.head.appendChild(s);
      });
    });
  }

  function fuentes() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('120px "Italianno"'),
      document.fonts.load('600 40px "Cinzel"'),
      document.fonts.load('500 40px "Cormorant Garamond"'),
      document.fonts.load('italic 300 40px "Cormorant Garamond"')
    ]).then(function () {}, function () {});
  }

  function recursos() {
    return Promise.all([
      jsPDFListo(),
      fuentes(),
      imagen('assets/img/rosa.png'),
      imagen('assets/img/rosas-ramo.png'),
      imagen('assets/img/cartas/reina-corazones.webp')
    ]).then(function (r) {
      return { JsPDF: r[0], img: { rosa: r[2], ramo: r[3], carta: r[4] } };
    });
  }

  /* ---------------- dibujo ---------------- */
  function oro(ctx, arriba, abajo) {
    var g = ctx.createLinearGradient(0, arriba, 0, abajo);
    g.addColorStop(0, '#f8ecc0');
    g.addColorStop(0.5, '#d4af37');
    g.addColorStop(1, '#a67c1e');
    return g;
  }

  // Texto centrado. Si no cabe en maxW, baja el tamaño hasta que quepa.
  function texto(ctx, txt, y, o) {
    var tamBase = o.tam, tam = o.tam, min = o.min || Math.round(o.tam * 0.55);
    var espBase = o.espacio || 0;

    function fuente(t) {
      return [o.estilo, o.peso || 400, t + 'px', o.familia].filter(Boolean).join(' ');
    }
    function medir(t) {
      ctx.font = fuente(t);
      var esp = espBase * t / tamBase;
      if (!esp) return { w: ctx.measureText(txt).width, esp: 0 };
      var w = 0, chars = Array.from(txt);
      chars.forEach(function (c) { w += ctx.measureText(c).width; });
      return { w: w + esp * (chars.length - 1), esp: esp };
    }

    var m = medir(tam);
    while (o.maxW && m.w > o.maxW && tam > min) { tam -= 2; m = medir(tam); }

    ctx.font = fuente(tam);
    ctx.fillStyle = o.oro ? oro(ctx, y - tam * 0.85, y + tam * 0.1) : (o.color || '#f5ece0');
    ctx.textBaseline = 'alphabetic';
    if (o.sombra) { ctx.shadowColor = o.sombra; ctx.shadowBlur = tam * 0.3; }

    if (!m.esp) {
      // Sin espaciado se dibuja de corrido: la letra cursiva une sus trazos.
      ctx.textAlign = 'center';
      ctx.fillText(txt, W / 2, y);
    } else {
      ctx.textAlign = 'left';
      var x = W / 2 - m.w / 2;
      Array.from(txt).forEach(function (c) {
        ctx.fillText(c, x, y);
        x += ctx.measureText(c).width + m.esp;
      });
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function corazon(ctx, cx, cy, s, fill) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s / 32, s / 32);
    ctx.beginPath();
    ctx.moveTo(0, 13.5);
    ctx.bezierCurveTo(-14.5, 3.5, -16.5, -7.5, -10, -12.3);
    ctx.bezierCurveTo(-4.5, -16.3, 0, -10.5, 0, -7.5);
    ctx.bezierCurveTo(0, -10.5, 4.5, -16.3, 10, -12.3);
    ctx.bezierCurveTo(16.5, -7.5, 14.5, 3.5, 0, 13.5);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  function ornamento(ctx, y, largo) {
    var cx = W / 2, a = largo || 150;
    var g1 = ctx.createLinearGradient(cx - a - 24, 0, cx - 24, 0);
    g1.addColorStop(0, 'rgba(212,175,55,0)');
    g1.addColorStop(1, 'rgba(212,175,55,.9)');
    ctx.fillStyle = g1;
    ctx.fillRect(cx - a - 24, y, a, 2);
    var g2 = ctx.createLinearGradient(cx + 24, 0, cx + a + 24, 0);
    g2.addColorStop(0, 'rgba(212,175,55,.9)');
    g2.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(cx + 24, y, a, 2);
    corazon(ctx, cx, y + 1, 28, oro(ctx, y - 14, y + 14));
  }

  function dibujar(ctx, im, cx, cy, ancho, grados) {
    if (!im) return;
    var alto = ancho * im.naturalHeight / im.naturalWidth;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((grados || 0) * Math.PI / 180);
    ctx.shadowColor = 'rgba(0,0,0,.65)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    ctx.drawImage(im, -ancho / 2, -alto / 2, ancho, alto);
    ctx.restore();
  }

  function fondo(ctx, img) {
    var g = ctx.createRadialGradient(W / 2, H * 0.34, 40, W / 2, H * 0.45, H * 0.8);
    g.addColorStop(0, '#5a0d1c');
    g.addColorStop(0.45, '#24060e');
    g.addColorStop(1, '#070103');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Rombos muy tenues, como un tapiz
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    for (var d = -H; d < W + H; d += 46) {
      ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + H, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(d, H); ctx.lineTo(d + H, 0); ctx.stroke();
    }
    ctx.restore();

    // Marco dorado doble
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = oro(ctx, 0, H);
    rrect(ctx, 34, 34, W - 68, H - 68, 26);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.55;
    rrect(ctx, 50, 50, W - 100, H - 100, 18);
    ctx.stroke();
    ctx.restore();

    dibujar(ctx, img.rosa, 70, 72, 250, -16);
    dibujar(ctx, img.rosa, W - 58, 92, 205, 22);
    dibujar(ctx, img.ramo, 30, H - 150, 190, 8);
    dibujar(ctx, img.rosa, W - 48, H - 60, 210, -24);
  }

  function pagina(ctx, img) {
    fondo(ctx, img);

    texto(ctx, 'Fernanda Regina', 262, { familia: F_SCRIPT, tam: 150, maxW: 700, color: '#ffffff', sombra: 'rgba(213,20,46,.6)' });
    texto(ctx, 'XV AÑOS', 332, { familia: F_TITLE, peso: 600, tam: 40, espacio: 14, oro: true });
    ornamento(ctx, 392, 160);

    texto(ctx, 'Muchas gracias por aceptar', 498, { familia: F_SCRIPT, tam: 96, maxW: 720 });
    texto(ctx, 'estar con nosotros', 584, { familia: F_SCRIPT, tam: 96, maxW: 720 });

    dibujar(ctx, img.carta, W / 2, 812, 220, -4);

    texto(ctx, 'PASE DE ACCESO', 1078, { familia: F_TITLE, peso: 600, tam: 46, espacio: 10, maxW: 700, oro: true });
    ornamento(ctx, 1124, 110);

    texto(ctx, EVENTO.fecha.toUpperCase(), 1190, { familia: F_TITLE, peso: 600, tam: 30, espacio: 3, maxW: 700, oro: true });
    texto(ctx, 'Misa · ' + EVENTO.misaHora, 1256, { familia: F_BODY, peso: 500, tam: 38 });
    texto(ctx, EVENTO.misaLugar, 1296, { familia: F_BODY, estilo: 'italic', peso: 300, tam: 30, maxW: 600, color: 'rgba(245,236,224,.78)' });
    texto(ctx, 'Recepción · ' + EVENTO.recHora, 1356, { familia: F_BODY, peso: 500, tam: 38 });
    texto(ctx, EVENTO.recLugar, 1396, { familia: F_BODY, estilo: 'italic', peso: 300, tam: 30, maxW: 600, color: 'rgba(245,236,224,.78)' });

    texto(ctx, 'Vestimenta: ' + EVENTO.vestimenta, 1454, { familia: F_BODY, peso: 500, tam: 28, maxW: 560, color: '#f2dc9a' });
    texto(ctx, 'Presenta este pase en la entrada', 1502, { familia: F_BODY, estilo: 'italic', peso: 300, tam: 28, maxW: 560, color: 'rgba(245,236,224,.6)' });
  }

  /* ---------------- armado del PDF ---------------- */
  var enCurso = null;   // si tocan dos veces seguidas, no se generan dos PDFs

  function generar() {
    if (enCurso) return enCurso;

    enCurso = recursos().then(function (r) {
      var canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      pagina(canvas.getContext('2d'), r.img);

      var doc = new r.JsPDF({ orientation: 'portrait', unit: 'pt', format: [PDF_W, PDF_H], compress: true });
      doc.setProperties({
        title: 'Pase · XV Fernanda Regina',
        subject: 'Pase de acceso',
        creator: 'Invitación XV Fernanda Regina'
      });
      doc.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, PDF_W, PDF_H, undefined, 'FAST');
      doc.save(ARCHIVO);
    });

    enCurso.then(liberar, liberar);
    return enCurso;
  }

  function liberar() { enCurso = null; }

  /* ---------------- botón de aceptar ---------------- */
  var aceptar = document.querySelector('.btn-aceptar');
  var estado  = document.getElementById('rsvpPdfEstado');
  var otraVez = document.getElementById('rsvpPdf');

  function decir(msg, error) {
    if (!estado) return;
    estado.textContent = msg;
    estado.classList.toggle('is-error', !!error);
  }

  function bajarBoletos() {
    decir('Preparando tus boletos en PDF…');
    generar().then(function () {
      decir('¡Listo! Tus boletos se descargaron en PDF.');
    }, function (err) {
      decir('No se pudieron descargar tus boletos. Toca el botón de abajo para intentarlo otra vez.', true);
      if (window.console) console.error('PDF:', err);
    }).then(function () {
      if (otraVez) otraVez.hidden = false;   // para volver a bajarlos si hace falta
    });
  }

  if (aceptar) {
    // Sin preventDefault: el enlace sigue abriendo WhatsApp en el mismo toque.
    aceptar.addEventListener('click', bajarBoletos);

    // Se preparan los recursos cuando la sección se acerca, para que al tocar
    // el botón el PDF salga casi al instante.
    if ('IntersectionObserver' in window) {
      var cerca = new IntersectionObserver(function (entradas) {
        if (entradas[0].isIntersecting) {
          recursos()['catch'](function () {});
          cerca.disconnect();
        }
      }, { rootMargin: '600px 0px' });
      cerca.observe(aceptar);
    }
  }

  if (otraVez) otraVez.addEventListener('click', bajarBoletos);

  // Solo para revisar el diseño sin descargar nada
  window.BoletosPDF = {
    generar: generar,
    _dibujar: function (canvas) {
      return recursos().then(function (r) {
        canvas.width = W;
        canvas.height = H;
        pagina(canvas.getContext('2d'), r.img);
      });
    }
  };
})();
