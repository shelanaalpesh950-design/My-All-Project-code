/* =============================================
   MANDAL MANAGING — script.js
   Features:
   1. Navbar scroll effect
   2. Hamburger mobile menu toggle
   3. Counter animation (stats in hero)
   4. Scroll reveal animations
   5. Contact form validation
============================================= */

// ─── 1. NAVBAR SCROLL EFFECT ───────────────────
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});


// ─── 2. HAMBURGER MENU ─────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close menu when any nav link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
  });
});


// ─── 3. COUNTER ANIMATION ──────────────────────
/**
 * Animates a number from 0 to targetValue over ~1.5 seconds.
 * @param {HTMLElement} el     - The element whose textContent to update
 * @param {number}      target - The final number to count up to
 * @param {number}      dur    - Duration in ms (default 1500)
 */
function animateCounter(el, target, dur = 1500) {
  const start     = performance.now();
  const startVal  = 0;

  function step(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / dur, 1);
    // Ease-out cubic
    const eased    = 1 - Math.pow(1 - progress, 3);
    const current  = Math.round(startVal + eased * (target - startVal));
    el.textContent = current.toLocaleString('gu');
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// Use IntersectionObserver so counters only start when hero is visible
const statEls = [
  { el: document.getElementById('stat1'), target: 1200 },
  { el: document.getElementById('stat2'), target: 200  },
  { el: document.getElementById('stat3'), target: 25   },
];

let countersStarted = false;

const heroObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !countersStarted) {
      countersStarted = true;
      statEls.forEach(({ el, target }) => animateCounter(el, target));
    }
  });
}, { threshold: 0.4 });

const heroSection = document.querySelector('.hero');
if (heroSection) heroObserver.observe(heroSection);


// ─── 4. SCROLL REVEAL ANIMATIONS ───────────────
/**
 * Adds a CSS class 'reveal-visible' to elements as they scroll into view.
 * Base CSS sets them invisible / translated; the class makes them appear.
 */
const style = document.createElement('style');
style.textContent = `
  .reveal {
    opacity: 0;
    transform: translateY(32px);
    transition: opacity 0.65s cubic-bezier(.22,.61,.36,1),
                transform 0.65s cubic-bezier(.22,.61,.36,1);
  }
  .reveal.visible {
    opacity: 1;
    transform: none;
  }
`;
document.head.appendChild(style);

// Select all cards and grid items to animate
const revealTargets = document.querySelectorAll(
  '.pillar, .event-card, .member-card, .about-text, .about-pillars, .contact-info, .contact-form'
);

revealTargets.forEach((el, i) => {
  el.classList.add('reveal');
  el.style.transitionDelay = `${(i % 4) * 80}ms`; // stagger within rows
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target); // only animate once
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

revealTargets.forEach(el => revealObserver.observe(el));


// ─── 5. CONTACT FORM VALIDATION ────────────────
const contactForm = document.getElementById('contactForm');

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Clear previous errors
    clearErrors();

    const name    = document.getElementById('name');
    const phone   = document.getElementById('phone');
    const message = document.getElementById('message');
    let   valid   = true;

    // Name check
    if (!name.value.trim()) {
      showError('nameError', 'નામ ભરવું જરૂરી છે.');
      name.focus();
      valid = false;
    }

    // Phone check (basic: at least 8 digits)
    if (!phone.value.trim()) {
      showError('phoneError', 'ફ઼ ો .)');
      if (valid) phone.focus();
      valid = false;
    } else if (!/[\d]{8,}/.test(phone.value.replace(/\D/g, ''))) {
      showError('phoneError', 'સ .')
      if (valid) phone.focus();
      valid = false;
    }

    // Message check
    if (!message.value.trim()) {
      showError('msgError', 'સ .');
      if (valid) message.focus();
      valid = false;
    }

    if (!valid) return;

    // Simulate form submission (replace with real API call)
    simulateSubmit();
  });
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearErrors() {
  ['nameError', 'phoneError', 'msgError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  const success = document.getElementById('formSuccess');
  if (success) success.style.display = 'none';
}

function simulateSubmit() {
  const submitBtn = contactForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'સ ☁️ ...';

  // Fake network delay
  setTimeout(() => {
    contactForm.reset();
    submitBtn.disabled  = false;
    submitBtn.innerHTML = 'સ &nbsp;<span class="btn-arrow">→</span>';
    const success = document.getElementById('formSuccess');
    if (success) {
      success.style.display = 'block';
      // Auto-hide after 5s
      setTimeout(() => { success.style.display = 'none'; }, 5000);
    }
  }, 1400);
}


// ─── 6. ACTIVE NAV HIGHLIGHT ON SCROLL ─────────
const sections  = document.querySelectorAll('section[id]');
const navItems  = document.querySelectorAll('.nav-links a');

const activeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navItems.forEach(a => a.classList.remove('active-nav'));
      const activeLink = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
      if (activeLink) activeLink.classList.add('active-nav');
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => activeObserver.observe(s));

// Add CSS for active nav link
const navActiveStyle = document.createElement('style');
navActiveStyle.textContent = `
  .nav-links a.active-nav {
    color: var(--gold) !important;
  }
  .nav-links a.active-nav::after {
    width: 100% !important;
  }
`;
document.head.appendChild(navActiveStyle);
