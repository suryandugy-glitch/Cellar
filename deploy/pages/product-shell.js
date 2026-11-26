'use strict';

// Accessible product navigation shared by all Cellar Guard documentation pages.
(() => {
  const nav = document.querySelector('.site-header .site-nav');
  const actions = document.querySelector('.site-header .header-actions');
  if (!nav || !actions) return;

  if (!nav.id) nav.id = 'product-navigation';
  const toggle = document.createElement('button');
  toggle.className = 'mobile-nav-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', nav.id);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open navigation');
  toggle.textContent = '☰';
  actions.prepend(toggle);

  function closeMenu({ returnFocus = false } = {}) {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    toggle.textContent = '☰';
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    if (open) closeMenu();
    else {
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close navigation');
      toggle.textContent = '×';
      nav.querySelector('a')?.focus();
    }
  });

  nav.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu({ returnFocus: true });
  });
  document.addEventListener('pointerdown', event => {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });
  window.matchMedia('(min-width: 921px)').addEventListener('change', event => {
    if (event.matches) closeMenu();
  });
})();
