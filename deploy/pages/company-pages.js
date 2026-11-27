'use strict';
(() => {
  const button = document.querySelector('.company-menu-toggle');
  const menu = document.querySelector('#company-nav');
  if (!button || !menu) return;
  const close = (restoreFocus = false) => {
    menu.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open navigation');
    if (restoreFocus) button.focus();
  };
  button.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    if (open) menu.querySelector('a')?.focus();
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => close()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) close(true);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) close();
  });
})();
