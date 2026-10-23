/* ============================================================
   CON BRANKO — main.js
   Scroll-driven video + loading + navbar + fade-in
   ============================================================ */

(function () {
  'use strict';

  /* ── Config ──────────────────────────────────────────── */
  // Segundo del video en el que se congela el hero (filete flotando
  // sobre el sartén con el vapor subiendo). Ajusta este valor para
  // elegir otro frame (el video dura 10s).
  const FREEZE_AT = 9.5;

  /* ── Loading screen ──────────────────────────────────── */
  const loadingScreen = document.getElementById('loading-screen');
  let videoReady = false;
  let loadingDone = false;
  let videoFrozen = false;

  function tryHideLoading() {
    if (videoReady && loadingDone) {
      loadingScreen?.classList.add('hidden');
      // mostrar hero content
      const heroContent = document.querySelector('.hero-content');
      if (heroContent) heroContent.classList.add('visible');
      // reintentar reproducción al ocultar el loader (si aún no se congeló)
      const v = document.getElementById('hero-video');
      if (v && v.paused && !videoFrozen) {
        const p = v.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    }
  }

  // Fallback final: si el autoplay quedó bloqueado, arrancar el video
  // en la primera interacción del usuario (un solo intento). No reanuda
  // si el video ya se congeló en su frame final.
  ['pointerdown', 'touchstart', 'scroll', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, function resumeVideo() {
      const v = document.getElementById('hero-video');
      if (v && v.paused && !videoFrozen) {
        const p = v.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    }, { once: true, passive: true });
  });

  // Mínimo 2s para que se vea el loading
  setTimeout(() => {
    loadingDone = true;
    tryHideLoading();
  }, 1000);

  /* ── Video hero: reproduce una vez y se congela ──────── */
  // El video arranca desde el inicio, reproduce la caída del filete y
  // se detiene (congela) al llegar a FREEZE_AT, dejándolo "flotando".
  // Al recargar la página, el video vuelve a reproducirse desde 0.
  const video = document.getElementById('hero-video');
  const scrollHint = document.querySelector('.scroll-hint');

  if (video) {
    let freezeTimer = null;

    // Congela el video en el frame objetivo y deshabilita los disparadores.
    function doFreeze() {
      if (videoFrozen) return;
      videoFrozen = true;
      video.pause();
      const target = Math.min(FREEZE_AT, (video.duration || FREEZE_AT));
      try { video.currentTime = target; } catch (e) { /* noop */ }
      video.removeEventListener('timeupdate', freezeAtTarget);
      if (freezeTimer) { clearTimeout(freezeTimer); freezeTimer = null; }
    }

    // Disparador 1: por tiempo de reproducción (preciso, pestaña visible).
    function freezeAtTarget() {
      if (video.currentTime >= FREEZE_AT || video.ended) doFreeze();
    }
    video.addEventListener('timeupdate', freezeAtTarget);

    // Disparador 2: temporizador programado (robusto aunque la pestaña
    // esté en segundo plano y 'timeupdate' no se dispare).
    function scheduleFreeze() {
      if (videoFrozen) return;
      if (freezeTimer) clearTimeout(freezeTimer);
      const remainingMs = Math.max(0, (FREEZE_AT - video.currentTime)) * 1000;
      freezeTimer = setTimeout(doFreeze, remainingMs + 60);
    }

    function startPlayback() {
      if (videoFrozen) return;
      const p = video.play();
      if (p && typeof p.then === 'function') {
        p.then(scheduleFreeze).catch(() => {});
      } else {
        scheduleFreeze();
      }
    }

    function markVideoReady() {
      videoReady = true;
      video.classList.add('loaded');
      startPlayback();
      tryHideLoading();
    }

    if (video.readyState >= 2) {
      markVideoReady();
    } else {
      video.addEventListener('canplay', markVideoReady, { once: true });
      video.addEventListener('loadeddata', markVideoReady, { once: true });
    }

    // Si el video no carga (archivo faltante, etc.) no bloquear el loading
    video.addEventListener('error', () => {
      videoReady = true;
      tryHideLoading();
    });

    // Ocultar el indicador de scroll una vez que el usuario baja
    if (scrollHint) {
      window.addEventListener('scroll', () => {
        scrollHint.classList.toggle('hidden', window.scrollY > 40);
      }, { passive: true });
    }
  }

  /* ── Parallax del hero (mouse + giroscopio) ──────────── */
  const parallaxLayer = document.querySelector('[data-parallax]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (parallaxLayer && !prefersReducedMotion) {
    const MAX_OFFSET = 15; // px, según especificación
    let rafId = null;
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0;

    function render() {
      // Suavizado (easing hacia el objetivo)
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      parallaxLayer.style.transform =
        'translate3d(' + currentX.toFixed(2) + 'px,' + currentY.toFixed(2) + 'px,0)';
      if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
        rafId = requestAnimationFrame(render);
      } else {
        rafId = null;
      }
    }
    function schedule() { if (rafId === null) rafId = requestAnimationFrame(render); }

    function setTarget(nx, ny) {
      // nx, ny normalizados en [-1, 1]; se invierte para sensación natural
      targetX = -nx * MAX_OFFSET;
      targetY = -ny * MAX_OFFSET;
      schedule();
    }

    // Mouse
    window.addEventListener('mousemove', (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      setTarget(nx, ny);
    }, { passive: true });

    // Giroscopio (móvil)
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || e.beta == null) return;
      const nx = Math.max(-1, Math.min(1, e.gamma / 30)); // izq-der
      const ny = Math.max(-1, Math.min(1, e.beta / 30));  // frente-atrás
      setTarget(nx, ny);
    }, { passive: true });
  }

  /* ── Navbar scroll ───────────────────────────────────── */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  }

  /* ── Hamburger menu ──────────────────────────────────── */
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    // Cerrar al hacer click en un link
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Fade-in al hacer scroll ─────────────────────────── */
  const fadeElements = document.querySelectorAll('.fade-in');
  if (fadeElements.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    fadeElements.forEach(el => observer.observe(el));
  }

  /* ── Active nav link ─────────────────────────────────── */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      a.style.color = 'var(--c-gold)';
      a.style.opacity = '1';
    }
  });


  /* ── Booking Form Validation (Caso de Uso 2) ────────── */
  const bookingForm = document.getElementById('form-reservaciones');
  const bookingStatus = document.getElementById('booking-status');

  if (bookingForm && bookingStatus) {
    const fields = [
      {
        input: document.getElementById('res-nombre'),
        err: document.getElementById('err-res-nombre'),
        validate: (v) => v.trim().length >= 3,
        msg: 'Ingresa tu nombre completo (mínimo 3 caracteres).'
      },
      {
        input: document.getElementById('res-email'),
        err: document.getElementById('err-res-email'),
        validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
        msg: 'Ingresa un correo electrónico válido.'
      },
      {
        input: document.getElementById('res-tel'),
        err: document.getElementById('err-res-tel'),
        validate: (v) => /^[0-9]{10}$/.test(v.trim().replace(/\D/g, '')),
        msg: 'Ingresa un teléfono válido de 10 dígitos.'
      },
      {
        input: document.getElementById('res-sucursal'),
        err: document.getElementById('err-res-sucursal'),
        validate: (v) => Boolean(v && v !== ''),
        msg: 'Selecciona una sucursal.'
      },
      {
        input: document.getElementById('res-fecha'),
        err: document.getElementById('err-res-fecha'),
        validate: (v) => Boolean(v && v !== ''),
        msg: 'Selecciona una fecha deseada.'
      },
      {
        input: document.getElementById('res-personas'),
        err: document.getElementById('err-res-personas'),
        validate: (v) => Boolean(v && v !== ''),
        msg: 'Selecciona el número de personas.'
      }
    ];

    fields.forEach(({ input, err }) => {
      if (!input || !err) return;
      const clear = () => {
        input.classList.remove('has-error');
        err.textContent = '';
      };
      input.addEventListener('input', clear);
      input.addEventListener('change', clear);
    });

    bookingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      let hasErrors = false;
      let firstInvalid = null;

      fields.forEach(({ input, err, validate, msg }) => {
        if (!input || !err) return;
        if (!validate(input.value)) {
          hasErrors = true;
          input.classList.add('has-error');
          err.textContent = msg;
          if (!firstInvalid) firstInvalid = input;
        } else {
          input.classList.remove('has-error');
          err.textContent = '';
        }
      });

      if (hasErrors) {
        bookingStatus.className = 'status-live-box error';
        bookingStatus.textContent = 'Por favor corrige los campos señalados en rojo para continuar.';
        if (firstInvalid) firstInvalid.focus();
      } else {
        const nombreVal = document.getElementById('res-nombre').value.trim();
        bookingStatus.className = 'status-live-box success';
        bookingStatus.innerHTML = '<strong>¡Gracias, ' + nombreVal + '!</strong> Tu reservación ha sido recibida con éxito. Nos comunicaremos contigo para confirmar.';
        bookingForm.reset();
        bookingStatus.focus();
      }
    });
  }

})();
