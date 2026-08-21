/* ═══════════════════════════════════════════════════════════════
   OPSIB — Interaction Layer
   · Grid parallax
   · Meta flicker
   · Scroll-reveal (IntersectionObserver)
   · Nav scroll state
   · Contact panel
   · Contact form submission
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── GRID PARALLAX ─────────────────────────────────────────── */
  const grid = document.querySelector('.hero-grid');
  let raf = false;
  let mx = 0, my = 0;

  if (grid) {
    document.addEventListener('mousemove', (e) => {
      mx = (e.clientX / window.innerWidth  - 0.5);
      my = (e.clientY / window.innerHeight - 0.5);
      // Transient compositor hint — no permanent will-change layer.
      grid.classList.add('is-parallax');
      if (!raf) {
        requestAnimationFrame(() => {
          grid.style.transform = `translate(${mx * 9}px, ${my * 9}px)`;
          raf = false;
        });
        raf = true;
      }
    });

    document.addEventListener('mouseleave', () => {
      grid.style.transition = 'transform 1.6s cubic-bezier(0.16,1,0.3,1)';
      grid.style.transform  = 'translate(0,0)';
      setTimeout(() => {
        grid.style.transition = '';
        grid.classList.remove('is-parallax');
      }, 1600);
    });
  }

  /* ── META TAG FLICKER ──────────────────────────────────────── */
  // Timer handles are retained so they can be cleared when the hero
  // scrolls out of view. v2.0 started six intervals and never
  // stopped them, so they kept firing behind opaque sections.
  const metaTags = document.querySelectorAll('.meta-tag');
  let flickerTimers = [];

  function startFlicker() {
    if (flickerTimers.length) return;
    metaTags.forEach((tag) => {
      flickerTimers.push(setInterval(() => {
        if (Math.random() > 0.80) {
          const prev = tag.style.opacity || '1';
          tag.style.opacity = (Math.random() * 0.10 + 0.08).toFixed(2);
          setTimeout(() => { tag.style.opacity = prev; }, 100 + Math.random() * 280);
        }
      }, 2200 + Math.random() * 3800));
    });
  }

  function stopFlicker() {
    flickerTimers.forEach(clearInterval);
    flickerTimers = [];
  }

  /* ── VIDEO FALLBACK ────────────────────────────────────────── */
  const video = document.querySelector('.hero-video');
  if (video) {
    video.addEventListener('error', () => { video.style.display = 'none'; });
    const p = video.play();
    if (p) p.catch(() => {});
  }

  /* ── PAUSE OFFSCREEN HERO WORK ─────────────────────────────── */
  // .hero is position:fixed and never unmounts, so once the page
  // scrolls past it the video kept decoding and the parallax kept
  // listening behind opaque content. Suspend all of it while the
  // hero is out of view and restore on re-entry.
  const heroSpacer = document.querySelector('.hero-spacer');
  let heroVisible = true;

  function setHeroActive(active) {
    if (active === heroVisible) return;
    heroVisible = active;
    if (active) {
      startFlicker();
      if (video && video.paused) { const q = video.play(); if (q) q.catch(() => {}); }
    } else {
      stopFlicker();
      if (video && !video.paused) video.pause();
      if (grid) grid.classList.remove('is-parallax');
    }
  }

  startFlicker();

  if (heroSpacer) {
    new IntersectionObserver(
      (entries) => entries.forEach((e) => setHeroActive(e.isIntersecting)),
      { threshold: 0 }
    ).observe(heroSpacer);
  }

  /* ── NAV SCROLL STATE ──────────────────────────────────────── */
  // Appearance lives in CSS. The guard means one class toggle per
  // threshold crossing instead of two inline style writes per tick.
  const nav = document.querySelector('.hero-nav');
  if (nav) {
    let scrolled = null;
    const onScroll = () => {
      const past = window.scrollY > 60;
      if (past === scrolled) return;
      scrolled = past;
      nav.classList.toggle('is-scrolled', past);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── ARTICLE READING PROGRESS ──────────────────────────────── */
  const progress = document.getElementById('read-progress');
  if (progress) {
    let pRaf = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      progress.style.transform = `scaleX(${pct})`;
      pRaf = false;
    };
    window.addEventListener('scroll', () => {
      if (!pRaf) { requestAnimationFrame(update); pRaf = true; }
    }, { passive: true });
    update();
  }


  /* ── SCROLL-REVEAL (IntersectionObserver) ──────────────────── */
  // One reveal per content group, never per adjacent sibling. The
  // product-overview eyebrow and video share a container so they
  // enter as a single unit instead of animating independently.
  const revealEls = document.querySelectorAll(
    '.retail-statement-wrap, ' +
    '.how-bridge .section-container, ' +
    '.mission-card, .mission-image-wrap, ' +
    '.footer-col'
  );

  revealEls.forEach((el) => {
    el.classList.add('reveal');
  });

  // Stagger footer cols
  document.querySelectorAll('.footer-col').forEach((col, i) => {
    col.classList.add(`reveal-delay-${Math.min(i + 1, 4)}`);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // stays visible — fire once
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -20px 0px' }
  );

  revealEls.forEach((el) => observer.observe(el));

  /* ── CONTACT PANEL ─────────────────────────────────────────── */
  const openBtn   = document.getElementById('nav-contact');
  const panel     = document.getElementById('contact-panel');
  const overlay   = document.getElementById('contact-overlay');
  const closeBtn  = document.getElementById('cp-close');

  // Remember which control opened the panel so focus returns there,
  // rather than always to the nav button.
  let lastTrigger = null;

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]),' +
                    ' select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  if (panel) panel.inert = true;

  function openPanel(e) {
    lastTrigger = (e && e.currentTarget) || openBtn;
    panel.inert = false;
    panel.classList.add('is-open');
    overlay.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const first = panel.querySelector(FOCUSABLE);
      if (first) first.focus();
    }, 520);
  }

  function closePanel() {
    panel.classList.remove('is-open');
    overlay.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    panel.inert = true;
    document.body.style.overflow = '';
    if (lastTrigger) lastTrigger.focus();
    else if (openBtn) openBtn.focus();
  }

  const footerContactBtn = document.getElementById('footer-contact');
  const demoContactBtn   = document.getElementById('demo-contact-btn');
  if (openBtn)  openBtn.addEventListener('click', openPanel);
  if (footerContactBtn) footerContactBtn.addEventListener('click', openPanel);
  if (demoContactBtn) demoContactBtn.addEventListener('click', openPanel);
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
  if (overlay)  overlay.addEventListener('click', closePanel);

  // Escape closes; Tab is trapped inside the dialog. aria-modal="true"
  // was declared in v2.0 but nothing contained focus, so it escaped
  // to the page behind.
  document.addEventListener('keydown', (e) => {
    if (!panel || !panel.classList.contains('is-open')) return;

    if (e.key === 'Escape') { closePanel(); return; }

    if (e.key !== 'Tab') return;
    const items = Array.from(panel.querySelectorAll(FOCUSABLE))
      .filter((el) => el.offsetParent !== null);
    if (!items.length) return;

    const first = items[0];
    const last  = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Form AJAX Submission
  const form      = document.getElementById('cp-form');
  const submitBtn = document.getElementById('cp-submit');
  const statusBox = document.getElementById('cp-status');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (statusBox) {
        statusBox.hidden = true;
        statusBox.className = 'cp-status';
        statusBox.textContent = '';
      }

      const formData = {
        firstname: document.getElementById('cp-firstname')?.value.trim(),
        lastname:  document.getElementById('cp-lastname')?.value.trim(),
        email:     document.getElementById('cp-email')?.value.trim(),
        phone:     document.getElementById('cp-phone')?.value.trim(),
        jobtitle:  document.getElementById('cp-jobtitle')?.value.trim(),
        company:   document.getElementById('cp-company')?.value.trim(),
        country:   document.getElementById('cp-country')?.value,
        message:   document.getElementById('cp-message')?.value.trim()
      };

      const origBtnText = submitBtn ? submitBtn.textContent : 'Submit';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'SUBMITTING...';
      }

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          if (statusBox) {
            statusBox.className = 'cp-status cp-status--success';
            statusBox.textContent = result.message || 'Thank you! Your request has been submitted.';
            statusBox.hidden = false;
          }
          
          // Track conversion in PostHog
          if (window.posthog) {
            posthog.capture('demo_requested', {
              company: formData.company,
              jobtitle: formData.jobtitle
            });
            // Identify the user with their email so their session is linked to their identity
            posthog.identify(formData.email, {
              email: formData.email,
              name: formData.firstname + ' ' + formData.lastname,
              company: formData.company
            });
          }

          form.reset();
        } else {
          if (statusBox) {
            statusBox.className = 'cp-status cp-status--error';
            statusBox.textContent = result.error || 'Please check your information and try again.';
            statusBox.hidden = false;
          }
        }
      } catch (err) {
        console.error('Form submit error:', err);
        if (statusBox) {
          statusBox.className = 'cp-status cp-status--error';
          statusBox.textContent = 'Unable to connect to server. Please try again.';
          statusBox.hidden = false;
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = origBtnText;
        }
      }
    });
  }

})();
