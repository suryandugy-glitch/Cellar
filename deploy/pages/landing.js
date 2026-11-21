'use strict';

(() => {
  const themeToggle = document.querySelector('.theme-toggle');
  function applyTheme(theme) {
    const selected = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = selected;
    try { localStorage.setItem('cellar_theme', selected); } catch { /* Theme still works for this page. */ }
    const dark = selected === 'dark';
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', 'Theme: ' + selected);
      themeToggle.setAttribute('aria-pressed', String(dark));
      themeToggle.querySelector('.theme-name').textContent = dark ? 'Dark' : 'Light';
    }
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = dark ? '#080b12' : '#f5f6fb';
  }
  let savedTheme = 'dark';
  try { savedTheme = localStorage.getItem('cellar_theme') || 'dark'; } catch { /* Use dark mode if storage is unavailable. */ }
  applyTheme(savedTheme);
  themeToggle?.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

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
