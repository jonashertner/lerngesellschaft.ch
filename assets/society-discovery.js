/* Flash-free, fail-safe progressive reveal and accessible mobile menu controls. */
(() => {
  'use strict';

  const menu = document.querySelector('.site-mobile-menu');
  if (menu) {
    const closeMenu = () => {
      if (menu.open) menu.open = false;
    };
    menu.addEventListener('click', event => {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('click', event => {
      if (menu.open && !menu.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) {
        closeMenu();
        const summary = menu.querySelector('summary');
        if (summary) summary.focus();
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 820) closeMenu();
    }, { passive: true });
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;

  const targets = Array.from(document.querySelectorAll('[data-reveal]'));
  if (!targets.length) return;

  const pending = new Set();
  const reveal = el => {
    if (!pending.has(el)) return;
    el.classList.add('reveal-visible');
    el.classList.remove('reveal-pending');
    pending.delete(el);
  };

  const scan = () => {
    const limit = window.innerHeight + 80;
    for (const el of Array.from(pending)) {
      if (el.getBoundingClientRect().top <= limit) reveal(el);
    }
  };

  const initialLimit = window.innerHeight * 0.96;
  for (const el of targets) {
    if (el.getBoundingClientRect().top > initialLimit) {
      el.classList.add('reveal-pending');
      pending.add(el);
    }
  }
  if (!pending.size) return;

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight + 80) {
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0, rootMargin: '80px 0px 80px 0px' });

  for (const el of pending) observer.observe(el);
  window.addEventListener('scroll', scan, { passive: true });
  window.addEventListener('hashchange', () => setTimeout(scan, 60));
})();
