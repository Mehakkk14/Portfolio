/* ============================================================
   Portfolio – Main Script
   Premium interactions, animations & UI logic
   Vanilla ES6+ · No dependencies
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ----------------------------------------------------------
     0. UTILITY HELPERS
  ---------------------------------------------------------- */

  /** Throttle — fires at most once per `limit` ms (rAF-friendly) */
  const throttle = (fn, limit = 16) => {
    let waiting = false;
    return (...args) => {
      if (waiting) return;
      waiting = true;
      requestAnimationFrame(() => {
        fn(...args);
        waiting = false;
      });
    };
  };

  /** Debounce — fires `delay` ms after the last call */
  const debounce = (fn, delay = 100) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  /** Ease-out cubic for smooth counter animation */
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  /** Shorthand selectors */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];


  /* ----------------------------------------------------------
     1. LOADING SCREEN
     Show for a minimum of 2 s, then fade out and reveal content.
  ---------------------------------------------------------- */

  const initLoader = () => {
    const loader = $('#loading-screen') || $('.loader') || $('#loader');
    if (!loader) return;

    const MIN_DISPLAY = 2000; // ms
    const startTime = performance.now();

    const hideLoader = () => {
      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, MIN_DISPLAY - elapsed);

      setTimeout(() => {
        loader.classList.add('fade-out');
        // Wait for the CSS transition to finish before removing
        loader.addEventListener('transitionend', () => {
          loader.style.display = 'none';
          document.body.classList.add('loaded');
        }, { once: true });

        // Fallback in case transitionend doesn't fire
        setTimeout(() => {
          loader.style.display = 'none';
          document.body.classList.add('loaded');
        }, 800);
      }, remaining);
    };

    // Fire once all assets have loaded (or immediately if already loaded)
    if (document.readyState === 'complete') {
      hideLoader();
    } else {
      window.addEventListener('load', hideLoader, { once: true });
    }
  };


  /* ----------------------------------------------------------
     2. NAVBAR BEHAVIOR
     - Scroll-triggered background class
     - Active link highlighting
     - Smooth scroll on click
     - Mobile hamburger toggle
  ---------------------------------------------------------- */

  const initNavbar = () => {
    const navbar = $('nav') || $('.navbar');
    const hamburger = $('.hamburger') || $('.menu-toggle');
    const navMenu = $('.nav-menu') || $('.nav-links');
    const navLinks = $$('nav a[href^="#"], .navbar a[href^="#"]');
    const sections = $$('section[id]');

    if (!navbar) return;

    // -- Scroll class (background change after 50 px) ----------
    const onScroll = () => {
      const scrolled = window.scrollY > 50;
      navbar.classList.toggle('scrolled', scrolled);
    };

    // -- Active link highlighting based on scroll position ------
    const highlightActiveLink = () => {
      const scrollPos = window.scrollY + navbar.offsetHeight + 80;

      let currentId = '';
      sections.forEach((sec) => {
        if (sec.offsetTop <= scrollPos) {
          currentId = sec.id;
        }
      });

      navLinks.forEach((link) => {
        link.classList.toggle(
          'active',
          link.getAttribute('href') === `#${currentId}`
        );
      });
    };

    // Combined throttled scroll handler
    const handleScroll = throttle(() => {
      onScroll();
      highlightActiveLink();
    });
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial call
    onScroll();
    highlightActiveLink();

    // -- Smooth scroll on nav link click ------------------------
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const target = $(targetId);
        if (!target) return;

        const offset = navbar.offsetHeight + 10;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({ top, behavior: 'smooth' });

        // Close mobile menu if open
        if (navMenu) navMenu.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
      });
    });

    // -- Hamburger toggle ---------------------------------------
    if (hamburger && navMenu) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
      });
    }
  };


  /* ----------------------------------------------------------
     3. SCROLL ANIMATIONS (Intersection Observer)
     Observe .fade-in-up, .fade-in-left, .fade-in-right,
     .scale-in, .slide-in. Add 'visible' on enter.
     Stagger children automatically.
  ---------------------------------------------------------- */

  const initScrollAnimations = () => {
    const animatedSelectors = [
      '.fade-in-up',
      '.fade-in-left',
      '.fade-in-right',
      '.scale-in',
      '.slide-in',
    ];

    const elements = $$(animatedSelectors.join(','));
    if (!elements.length) return;

    // Assign stagger delays to groups of sibling elements
    const assignStaggerDelays = () => {
      const groupParents = new Map(); // parent -> count

      elements.forEach((el) => {
        const parent = el.parentElement;
        if (!parent) return;

        if (!groupParents.has(parent)) {
          groupParents.set(parent, 0);
        }

        const index = groupParents.get(parent);
        groupParents.set(parent, index + 1);

        // Only stagger if there's more than one animated child in the parent
        el.style.setProperty('--delay', `${index * 0.1}s`);
        el.style.transitionDelay = `${index * 0.1}s`;
      });
    };

    assignStaggerDelays();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // animate only once
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));
  };


  /* ----------------------------------------------------------
     4. COUNTER ANIMATION
     Animate .counter elements from 0 → data-target.
     Eased, ~2 s duration. Handles '+' suffix.
  ---------------------------------------------------------- */

  const initCounters = () => {
    const counters = $$('.counter[data-target]');
    if (!counters.length) return;

    const DURATION = 2000; // ms

    const animateCounter = (el) => {
      const raw = el.getAttribute('data-target');
      const hasSuffix = raw.includes('+');
      const target = parseInt(raw.replace(/[^0-9]/g, ''), 10);
      if (isNaN(target)) return;

      let start = null;

      const step = (timestamp) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / DURATION, 1);
        const easedProgress = easeOutCubic(progress);
        const current = Math.round(easedProgress * target);

        el.textContent = current.toLocaleString() + (hasSuffix ? '+' : '');

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };

    // Observe the stats section (or each counter individually)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Animate all counters inside the intersecting container
            const targets =
              entry.target.classList.contains('counter')
                ? [entry.target]
                : $$('.counter[data-target]', entry.target);

            targets.forEach((c) => animateCounter(c));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    // Try to observe the parent stats section, fallback to individual counters
    const statsSection = $('#stats') || $('.stats-section') || $('.stats');
    if (statsSection) {
      observer.observe(statsSection);
    } else {
      counters.forEach((c) => observer.observe(c));
    }
  };


  /* ----------------------------------------------------------
     5. TYPING EFFECT
     Cycle through designation texts on .typing-text element.
  ---------------------------------------------------------- */

  const initTypingEffect = () => {
    const el = $('.typing-text');
    if (!el) return;

    const texts = [
      'Blockchain Developer',
      'Full Stack Developer',
      'CS Engineering Student',
    ];

    const TYPING_SPEED = 100;  // ms per char
    const DELETING_SPEED = 50;
    const PAUSE_AFTER_TYPE = 2000;
    const PAUSE_AFTER_DELETE = 500;

    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const tick = () => {
      const currentText = texts[textIndex];

      if (!isDeleting) {
        // Typing
        charIndex++;
        el.textContent = currentText.slice(0, charIndex);

        if (charIndex === currentText.length) {
          // Finished typing – pause then start deleting
          isDeleting = true;
          setTimeout(tick, PAUSE_AFTER_TYPE);
          return;
        }
        setTimeout(tick, TYPING_SPEED);
      } else {
        // Deleting
        charIndex--;
        el.textContent = currentText.slice(0, charIndex);

        if (charIndex === 0) {
          // Finished deleting – move to next text
          isDeleting = false;
          textIndex = (textIndex + 1) % texts.length;
          setTimeout(tick, PAUSE_AFTER_DELETE);
          return;
        }
        setTimeout(tick, DELETING_SPEED);
      }
    };

    // Start after a short delay so the hero section is visible
    setTimeout(tick, 800);
  };


  /* ----------------------------------------------------------
     6. SMOOTH SCROLL (General)
     All anchor links starting with '#' scroll smoothly,
     accounting for fixed navbar offset.
  ---------------------------------------------------------- */

  const initSmoothScroll = () => {
    const navbar = $('nav') || $('.navbar');
    const offset = navbar ? navbar.offsetHeight + 10 : 70;

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (href === '#' || href === '#!') return;

      const target = $(href);
      if (!target) return;

      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  };


  /* ----------------------------------------------------------
     7. PARALLAX / FLOATING ELEMENTS
     Subtle parallax on hero background shapes on mouse move.
  ---------------------------------------------------------- */

  const initParallax = () => {
    const hero = $('#hero') || $('.hero');
    if (!hero) return;

    const shapes = $$('.shape, .float, .hero-shape, .bg-shape', hero);
    if (!shapes.length) return;

    // Only enable on wider screens
    if (window.innerWidth < 768) return;

    const handleMouseMove = throttle((e) => {
      const { clientX, clientY } = e;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Normalise to -1 … 1
      const nx = (clientX - centerX) / centerX;
      const ny = (clientY - centerY) / centerY;

      shapes.forEach((shape, i) => {
        // Each shape moves a slightly different amount for depth
        const depth = (i + 1) * 12;
        const x = nx * depth;
        const y = ny * depth;
        shape.style.transform = `translate(${x}px, ${y}px)`;
      });
    });

    hero.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Reset when cursor leaves the hero
    hero.addEventListener('mouseleave', () => {
      shapes.forEach((shape) => {
        shape.style.transition = 'transform 0.6s ease-out';
        shape.style.transform = 'translate(0, 0)';
        // Remove inline transition after it completes
        setTimeout(() => (shape.style.transition = ''), 600);
      });
    });
  };


  /* ----------------------------------------------------------
     8. CONTACT FORM
     Basic validation + styled success message (no backend).
  ---------------------------------------------------------- */

  const initContactForm = () => {
    const form = $('#contact-form') || $('form.contact-form') || $('form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Simple field validation
      const inputs = $$('input, textarea', form);
      let isValid = true;

      inputs.forEach((input) => {
        // Remove previous error states
        input.classList.remove('error');

        if (input.hasAttribute('required') && !input.value.trim()) {
          input.classList.add('error');
          isValid = false;
        }

        // Email pattern check
        if (
          input.type === 'email' &&
          input.value.trim() &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())
        ) {
          input.classList.add('error');
          isValid = false;
        }
      });

      if (!isValid) return;

      // Show success message
      let msg = form.querySelector('.form-success');
      if (!msg) {
        msg = document.createElement('div');
        msg.className = 'form-success';
        msg.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>Message sent successfully! I'll get back to you soon.</span>
        `;
        form.appendChild(msg);
      }

      // Trigger animation
      requestAnimationFrame(() => msg.classList.add('show'));

      // Reset form
      form.reset();

      // Hide success message after a few seconds
      setTimeout(() => {
        msg.classList.remove('show');
      }, 5000);
    });
  };


  /* ----------------------------------------------------------
     9. BACK TO TOP BUTTON
     Show after 500 px scroll; smooth-scroll to top on click.
  ---------------------------------------------------------- */

  const initBackToTop = () => {
    const btn = $('#backToTop') || $('.back-to-top');
    if (!btn) return;

    const toggleVisibility = throttle(() => {
      btn.classList.toggle('visible', window.scrollY > 500);
    });

    window.addEventListener('scroll', toggleVisibility, { passive: true });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Initial check
    toggleVisibility();
  };


  /* ----------------------------------------------------------
     10. CURSOR GLOW EFFECT (Desktop only)
     A subtle gold glow div that follows the cursor.
  ---------------------------------------------------------- */

  const initCursorGlow = () => {
    // Only on wider screens
    if (window.innerWidth <= 768) return;

    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    Object.assign(glow.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '350px',
      height: '350px',
      borderRadius: '50%',
      background:
        'radial-gradient(circle, rgba(0,173,181,0.08) 0%, transparent 70%)',
      pointerEvents: 'none',
      zIndex: '9999',
      transform: 'translate(-50%, -50%)',
      transition: 'opacity 0.3s ease',
      opacity: '0',
    });

    document.body.appendChild(glow);

    // Show after a moment
    requestAnimationFrame(() => (glow.style.opacity = '1'));

    let mouseX = 0;
    let mouseY = 0;
    let glowX = 0;
    let glowY = 0;

    document.addEventListener(
      'mousemove',
      (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
      },
      { passive: true }
    );

    // Smooth follow using rAF (lerp)
    const followCursor = () => {
      glowX += (mouseX - glowX) * 0.15;
      glowY += (mouseY - glowY) * 0.15;
      glow.style.transform = `translate(${glowX - 175}px, ${glowY - 175}px)`;
      requestAnimationFrame(followCursor);
    };

    requestAnimationFrame(followCursor);

    // Hide on mouse leave
    document.addEventListener('mouseleave', () => (glow.style.opacity = '0'));
    document.addEventListener('mouseenter', () => (glow.style.opacity = '1'));
  };


  /* ----------------------------------------------------------
     11. PROJECT CARD TILT EFFECT
     Subtle 3D tilt on .project-card mouse move, reset on leave.
  ---------------------------------------------------------- */

  const initCardTilt = () => {
    const cards = $$('.project-card');
    if (!cards.length) return;

    const MAX_TILT = 8; // degrees

    cards.forEach((card) => {
      card.addEventListener(
        'mousemove',
        (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;  // cursor X within card
          const y = e.clientY - rect.top;   // cursor Y within card
          const halfW = rect.width / 2;
          const halfH = rect.height / 2;

          // Normalise to -1 … 1 then scale to MAX_TILT
          const rotateY = ((x - halfW) / halfW) * MAX_TILT;
          const rotateX = ((halfH - y) / halfH) * MAX_TILT;

          card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
          card.style.transition = 'transform 0.1s ease-out';
        },
        { passive: true }
      );

      card.addEventListener('mouseleave', () => {
        card.style.transform =
          'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        card.style.transition = 'transform 0.5s ease-out';
      });
    });
  };


  /* ----------------------------------------------------------
     12. CERTIFICATES MODAL LIGHTBOX
     Opens a high-res certificate image in a smooth overlay modal when clicked.
  ---------------------------------------------------------- */

  const initCertificatesModal = () => {
    const modal = $('#cert-modal');
    const modalImg = $('#cert-modal-img');
    const modalCaption = $('#cert-modal-caption');
    const closeBtn = $('.cert-modal-close');
    const certCards = $$('.cert-card.clickable');

    if (!modal || !modalImg || !closeBtn || !certCards.length) return;

    const openModal = (card) => {
      const imgSrc = card.getAttribute('data-certificate');
      const title = $('p', card).textContent;

      if (!imgSrc) return;

      modalImg.src = imgSrc;
      modalCaption.textContent = title;
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden'; // prevent page scrolling
    };

    const closeModal = () => {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = ''; // restore scrolling
      
      // Clear image source after transition finishes to avoid flash on next open
      setTimeout(() => {
        if (!modal.classList.contains('active')) {
          modalImg.src = '';
        }
      }, 350);
    };

    certCards.forEach((card) => {
      card.addEventListener('click', () => openModal(card));
      
      // Accessibility: support keyboard trigger (Enter/Space)
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `View certificate for ${$('p', card).textContent}`);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(card);
        }
      });
    });

    closeBtn.addEventListener('click', closeModal);

    // Close on click outside the image
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('cert-modal-content')) {
        closeModal();
      }
    });

    // Close on Escape key press
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });
  };


  /* ----------------------------------------------------------
     INITIALISE EVERYTHING
  ---------------------------------------------------------- */

  initLoader();
  initNavbar();
  initScrollAnimations();
  initCounters();
  initTypingEffect();
  initSmoothScroll();
  initParallax();
  initContactForm();
  initBackToTop();
  initCursorGlow();
  initCardTilt();
  initCertificatesModal();
});
