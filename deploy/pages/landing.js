'use strict';

(() => {
  // All public Cellar Studio pages use one accessible, light-only palette.
  // Do not restore a previously saved dark-mode preference.
  document.documentElement.dataset.theme = 'light';
  const color = document.querySelector('meta[name="theme-color"]');
  if (color) color.content = '#f6f5ef';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) {
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
  }

  const reveal = document.querySelectorAll('.section-head, .step, .feature-card, .agent-note, .home-quick-start');
  if (reduced || !('IntersectionObserver' in window)) return;
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
