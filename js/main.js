/* ==========================================================
   Fernanda Regina · XV Años · 21 noviembre 2026
   ========================================================== */
(function () {
  'use strict';

  /* ---- CONFIGURACIÓN ---- */
  var EVENTO = new Date(2026, 10, 21, 19, 30, 0); // 21 nov 2026, 7:30 PM (mes 10 = noviembre)
  var CAL_YEAR = 2026, CAL_MONTH = 10, CAL_DAY = 21;

  var $ = function (s) { return document.querySelector(s); };

  /* ==========================================================
     1. CONTADOR EN TIEMPO REAL
     ========================================================== */
  var elD = $('#cDays'), elH = $('#cHours'), elM = $('#cMins'), elS = $('#cSecs');
  var secCount = $('.sec--count');

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function tick() {
    var diff = EVENTO.getTime() - Date.now();

    if (diff <= 0) {
      if (secCount) secCount.classList.add('is-day');
      elD.textContent = elH.textContent = elM.textContent = elS.textContent = '00';
      return;
    }

    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600);  s -= h * 3600;
    var m = Math.floor(s / 60);    s -= m * 60;

    elD.textContent = pad(d);
    elH.textContent = pad(h);
    elM.textContent = pad(m);
    elS.textContent = pad(s);
  }

  tick();
  setInterval(tick, 1000);
  // Re-sincroniza al volver a la pestaña (móviles congelan los timers en segundo plano)
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) tick();
  });

  /* ==========================================================
     2. CALENDARIO
     ========================================================== */
  (function buildCalendar() {
    var grid = $('#calGrid');
    if (!grid) return;

    var dows = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    var html = '';
    for (var i = 0; i < 7; i++) html += '<span class="dow">' + dows[i] + '</span>';

    var first = new Date(CAL_YEAR, CAL_MONTH, 1).getDay();  // 0=domingo
    var offset = (first + 6) % 7;                            // semana inicia en lunes
    var total = new Date(CAL_YEAR, CAL_MONTH + 1, 0).getDate();

    for (var b = 0; b < offset; b++) html += '<span></span>';
    for (var day = 1; day <= total; day++) {
      html += '<span class="' + (day === CAL_DAY ? 'on' : '') + '">' + day + '</span>';
    }
    grid.innerHTML = html;
  })();

  /* ==========================================================
     3. MÚSICA
     ========================================================== */
  var audio = $('#audio');
  var musicBtn = $('#musicBtn');
  var entry = $('#entry');
  var entryBtn = $('#entryBtn');

  audio.volume = 0;

  function fadeIn(target, ms) {
    var steps = 40, i = 0;
    var id = setInterval(function () {
      i++;
      audio.volume = Math.min(target, (i / steps) * target);
      if (i >= steps) clearInterval(id);
    }, ms / 40);
  }

  function startMusic() {
    var p = audio.play();
    if (p && typeof p.then === 'function') {
      return p.then(function () {
        fadeIn(0.75, 2200);
        musicBtn.classList.add('is-on');
        musicBtn.classList.remove('is-paused');
        return true;
      }).catch(function () { return false; });
    }
    return Promise.resolve(false);
  }

  musicBtn.addEventListener('click', function () {
    if (audio.paused) {
      audio.play();
      musicBtn.classList.remove('is-paused');
      musicBtn.setAttribute('aria-label', 'Pausar música');
    } else {
      audio.pause();
      musicBtn.classList.add('is-paused');
      musicBtn.setAttribute('aria-label', 'Reproducir música');
    }
  });

  /* ==========================================================
     4. PORTADA DE ENTRADA
     ========================================================== */
  document.body.classList.add('locked');

  function openInvitation() {
    entry.classList.add('is-gone');
    document.body.classList.remove('locked');
    window.scrollTo(0, 0);
    setTimeout(function () { if (entry.parentNode) entry.parentNode.removeChild(entry); }, 1100);
  }

  entryBtn.addEventListener('click', function () {
    startMusic();
    musicBtn.classList.add('is-on');
    openInvitation();
  });

  // Intento de autoplay: si el navegador lo permite, la invitación se abre sola.
  startMusic().then(function (ok) {
    if (ok) setTimeout(openInvitation, 1400);
  });

  // Respaldo: cualquier toque en la página inicia el audio si aún no suena.
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function once() {
      if (audio.paused) startMusic();
      musicBtn.classList.add('is-on');
      ['pointerdown', 'touchstart', 'keydown'].forEach(function (e2) {
        document.removeEventListener(e2, once);
      });
    }, { passive: true });
  });

  /* ==========================================================
     5. REVELADO AL HACER SCROLL
     ========================================================== */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  /* ==========================================================
     6. NAIPES DEL CIERRE
     Si window.CARTAS trae rutas de imágenes, usa esas cartas;
     si no, dibuja naipes con CSS como respaldo.
     ========================================================== */
  (function closingCards() {
    var box = $('#closingCards');
    if (!box) return;

    var imgs = (window.CARTAS && window.CARTAS.length) ? window.CARTAS : null;
    var suits = ['♥', '♠', '♥'];

    for (var i = 0; i < 3; i++) {
      var card = document.createElement('div');
      card.className = 'pcard' + (!imgs && i === 1 ? ' pcard--dark' : '');

      if (imgs) {
        var im = document.createElement('img');
        im.src = imgs[i % imgs.length];
        im.alt = '';
        card.appendChild(im);
      } else {
        card.setAttribute('data-suit', suits[i]);
      }
      box.appendChild(card);
    }
  })();

  /* ==========================================================
     7. NAIPES CAYENDO + POLVO DORADO
     ========================================================== */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduced) {
    var suits = ['', 's', 'd', 'c'];
    var cards = $('#fxCards');
    var nCards = window.innerWidth < 640 ? 9 : 16;

    for (var i = 0; i < nCards; i++) {
      var c = document.createElement('i');
      c.className = suits[i % 4];
      c.style.left = (Math.random() * 100) + '%';
      c.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      c.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg');
      c.style.animationDuration = (12 + Math.random() * 13) + 's';
      c.style.animationDelay = (-Math.random() * 22) + 's';
      var sc = 0.55 + Math.random() * 0.75;
      c.style.width = (26 * sc) + 'px';
      c.style.height = (36 * sc) + 'px';
      cards.appendChild(c);
    }

    var dust = $('#fxDust');
    var nDust = window.innerWidth < 640 ? 22 : 40;

    for (var j = 0; j < nDust; j++) {
      var p = document.createElement('i');
      var sz = 1.5 + Math.random() * 3.5;
      p.style.width = sz + 'px';
      p.style.height = sz + 'px';
      p.style.left = (Math.random() * 100) + '%';
      p.style.setProperty('--dx', (Math.random() * 90 - 45) + 'px');
      p.style.animationDuration = (16 + Math.random() * 20) + 's';
      p.style.animationDelay = (-Math.random() * 32) + 's';
      dust.appendChild(p);
    }
  }
})();
