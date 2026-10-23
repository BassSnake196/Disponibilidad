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
    function setMenuOpen(open) {
      navLinks.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      hamburger.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
      document.body.style.overflow = open ? 'hidden' : '';
    }

    hamburger.addEventListener('click', () => {
      const open = !navLinks.classList.contains('open');
      setMenuOpen(open);
    });

    // Cerrar con tecla Escape para usuarios de teclado y VoiceOver
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        setMenuOpen(false);
        hamburger.focus();
      }
    });

    // Cerrar al hacer click en un link
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        setMenuOpen(false);
      });
    });
  }

  /* ── Fade-in al hacer scroll ─────────────────────────── */
  const fadeElements = document.querySelectorAll('.fade-in');
  if (fadeElements.length) {
    if (prefersReducedMotion) {
      fadeElements.forEach(el => el.classList.add('visible'));
    } else {
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
  }

  /* ── Active nav link (VoiceOver aria-current="page") ─── */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      a.style.color = 'var(--c-gold)';
      a.style.opacity = '1';
      a.setAttribute('aria-current', 'page');
    } else {
      a.removeAttribute('aria-current');
    }
  });


  /* ── Accessible Form Validation Helper ───────────────── */
  function setupAccessibleForm(formId, statusId, fieldConfigs, getSuccessHtml) {
    const form = document.getElementById(formId);
    const statusBox = document.getElementById(statusId);
    if (!form || !statusBox) return;

    const fields = fieldConfigs.map(cfg => ({
      input: document.getElementById(cfg.inputId),
      err: document.getElementById(cfg.errId),
      validate: cfg.validate,
      msg: cfg.msg
    }));

    fields.forEach(({ input, err }) => {
      if (!input || !err) return;
      const clear = () => {
        input.classList.remove('has-error');
        input.setAttribute('aria-invalid', 'false');
        err.textContent = '';
      };
      input.addEventListener('input', clear);
      input.addEventListener('change', clear);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      let hasErrors = false;
      let firstInvalid = null;

      fields.forEach(({ input, err, validate, msg }) => {
        if (!input || !err) return;
        if (!validate(input.value)) {
          hasErrors = true;
          input.classList.add('has-error');
          input.setAttribute('aria-invalid', 'true');
          err.textContent = msg;
          if (!firstInvalid) firstInvalid = input;
        } else {
          input.classList.remove('has-error');
          input.setAttribute('aria-invalid', 'false');
          err.textContent = '';
        }
      });

      if (hasErrors) {
        statusBox.className = 'status-live-box error';
        statusBox.textContent = 'Por favor corrige los campos señalados para continuar.';
        if (firstInvalid) firstInvalid.focus();
      } else {
        statusBox.className = 'status-live-box success';
        statusBox.innerHTML = getSuccessHtml();
        form.reset();
        fields.forEach(({ input }) => {
          if (input) input.removeAttribute('aria-invalid');
        });
        statusBox.focus();
      }
    });
  }

  /* ── Booking Form Validation (Caso de Uso 2 en index.html) ── */
  setupAccessibleForm(
    'form-reservaciones',
    'booking-status',
    [
      {
        inputId: 'res-nombre',
        errId: 'err-res-nombre',
        validate: (v) => v.trim().length >= 3,
        msg: 'Ingresa tu nombre completo (mínimo 3 caracteres).'
      },
      {
        inputId: 'res-email',
        errId: 'err-res-email',
        validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
        msg: 'Ingresa un correo electrónico válido.'
      },
      {
        inputId: 'res-tel',
        errId: 'err-res-tel',
        validate: (v) => /^[0-9]{10}$/.test(v.trim().replace(/\D/g, '')),
        msg: 'Ingresa un teléfono válido de 10 dígitos.'
      },
      {
        inputId: 'res-sucursal',
        errId: 'err-res-sucursal',
        validate: (v) => Boolean(v && v !== ''),
        msg: 'Selecciona una sucursal.'
      },
      {
        inputId: 'res-fecha',
        errId: 'err-res-fecha',
        validate: (v) => Boolean(v && v !== ''),
        msg: 'Selecciona una fecha deseada.'
      },
      {
        inputId: 'res-personas',
        errId: 'err-res-personas',
        validate: (v) => Boolean(v && v !== ''),
        msg: 'Selecciona el número de personas.'
      }
    ],
    () => {
      const nombreVal = (document.getElementById('res-nombre')?.value || '').trim();
      return '<strong>¡Gracias, ' + nombreVal + '!</strong> Tu reservación ha sido recibida con éxito. Nos comunicaremos contigo para confirmar.';
    }
  );

  /* ── Contact Form Validation (en contacto.html) ────────── */
  setupAccessibleForm(
    'form-contacto',
    'contact-status',
    [
      {
        inputId: 'nombre',
        errId: 'err-nombre',
        validate: (v) => v.trim().length >= 3,
        msg: 'Ingresa tu nombre completo (mínimo 3 caracteres).'
      },
      {
        inputId: 'email',
        errId: 'err-email',
        validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
        msg: 'Ingresa un correo electrónico válido.'
      },
      {
        inputId: 'telefono',
        errId: 'err-telefono',
        validate: (v) => !v.trim() || /^[0-9]{10}$/.test(v.trim().replace(/\D/g, '')),
        msg: 'Ingresa un teléfono válido de 10 dígitos.'
      },
      {
        inputId: 'mensaje',
        errId: 'err-mensaje',
        validate: (v) => v.trim().length >= 5,
        msg: 'Escribe tu mensaje o detalle de tu pedido (mínimo 5 caracteres).'
      }
    ],
    () => {
      const nombreVal = (document.getElementById('nombre')?.value || '').trim();
      return '<strong>¡Gracias, ' + nombreVal + '!</strong> Hemos recibido tu mensaje y nos pondremos en contacto contigo a la brevedad.';
    }
  );

})();
