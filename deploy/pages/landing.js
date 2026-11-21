'use strict';

(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const aura = document.createElement('div');
  aura.className = 'cursor-aura';
  aura.setAttribute('aria-hidden', 'true');
  document.body.append(aura);
  let frame = 0;
  let point = null;
  window.addEventListener('pointermove', event => {
    point = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      aura.style.left = point.x + 'px';
      aura.style.top = point.y + 'px';
      aura.classList.add('active');
      frame = 0;
    });
  }, { passive: true });

  const reveal = document.querySelectorAll('.section-head, .step, .feature-card, .agent-note, .home-quick-start');
  if (!('IntersectionObserver' in window)) return;
  reveal.forEach(element => element.classList.add('reveal-ready'));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.13, rootMargin: '0px 0px -36px 0px' });
  reveal.forEach(element => observer.observe(element));
})();
