'use strict';

// Progressive enhancement: content is visible by default and stays visible
// when IntersectionObserver or motion preferences are unavailable.
(() => {
  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const elements = [...document.querySelectorAll('[data-reveal]')];
  if (elements.length === 0) return;

  document.documentElement.classList.add('reveal-ready');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

  elements.forEach(element => observer.observe(element));
})();
