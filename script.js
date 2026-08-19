/* ═══════════════════════════════════════════════════════════════
   ONYX — Interaction Layer
   · Grid parallax
   · Meta flicker
   · Scroll-reveal (IntersectionObserver)
   · Nav scroll state
   · Smooth CTA hover lift
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
      setTimeout(() => { grid.style.transition = ''; }, 1600);
    });
  }

  /* ── META TAG FLICKER ──────────────────────────────────────── */
  document.querySelectorAll('.meta-tag').forEach((tag) => {
    setInterval(() => {
      if (Math.random() > 0.80) {
        const prev = tag.style.opacity || '1';
        tag.style.opacity = (Math.random() * 0.10 + 0.08).toFixed(2);
        setTimeout(() => { tag.style.opacity = prev; }, 100 + Math.random() * 280);
      }
    }, 2200 + Math.random() * 3800);
  });

  /* ── VIDEO FALLBACK ────────────────────────────────────────── */
  const video = document.querySelector('.hero-video');
  if (video) {
    video.addEventListener('error', () => { video.style.display = 'none'; });
    const p = video.play();
    if (p) p.catch(() => {});
  }

  /* ── HEADLINE LETTER TRACKING ──────────────────────────────── */
  // Letter-spacing is now controlled by CSS clamp — no JS override needed.

  /* ── NAV SCROLL SHADOW ─────────────────────────────────────── */
  const nav = document.querySelector('.hero-nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 60) {
        nav.style.background = 'rgba(4, 6, 15, 0.90)';
        nav.style.borderColor = 'rgba(255, 255, 255, 0.20)';
      } else {
        nav.style.background = 'rgba(4, 6, 15, 0.65)';
        nav.style.borderColor = 'rgba(255, 255, 255, 0.12)';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }


  /* ── SCROLL-REVEAL (IntersectionObserver) ──────────────────── */
  // STEP 10: Trigger on section-level containers, not adjacent text siblings.
  // This prevents the choppy stagger that occurred when eyebrow + headline
  // each triggered independently as adjacent elements in the same section.
  const revealEls = document.querySelectorAll(
    '.retail-statement-wrap, ' +
    '.how-video-wrap, .how-eyebrow, ' +
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

  /* ── MISSION IMAGE REVEAL ──────────────────────────────────── */
  const missionImg = document.querySelector('.mission-image');
  if (missionImg) {
    const imgObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          imgObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    imgObs.observe(missionImg);
  }

  /* ── CONTACT PANEL ─────────────────────────────────────────── */
  const openBtn   = document.getElementById('nav-contact');
  const panel     = document.getElementById('contact-panel');
  const overlay   = document.getElementById('contact-overlay');
  const closeBtn  = document.getElementById('cp-close');
  const tabs      = document.querySelectorAll('.cp-tab');

  function openPanel() {
    panel.classList.add('is-open');
    overlay.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // Focus first input after transition
    setTimeout(() => {
      const first = panel.querySelector('input, select, textarea');
      if (first) first.focus();
    }, 520);
  }

  function closePanel() {
    panel.classList.remove('is-open');
    overlay.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    openBtn && openBtn.focus();
  }

  const footerContactBtn = document.getElementById('footer-contact');
  if (openBtn)  openBtn.addEventListener('click', openPanel);
  if (footerContactBtn) footerContactBtn.addEventListener('click', openPanel);
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
  if (overlay)  overlay.addEventListener('click', closePanel);

  // Escape key closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel && panel.classList.contains('is-open')) {
      closePanel();
    }
  });

  // Tab switching (visual only)
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('cp-tab--active'));
      tab.classList.add('cp-tab--active');
    });
  });

  // Footer "Contact Us" link also opens panel
  const footerContactLink = document.querySelector('.footer-links .footer-link:last-child');
  if (footerContactLink) {
    footerContactLink.addEventListener('click', (e) => {
      e.preventDefault();
      openPanel();
    });
  }

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
