'use strict';
(() => {
  const root = document.querySelector('.studio-detail');
  if (!root) return;
  const isExplore = root.classList.contains('studio-explore');
  const shell = document.querySelector(isExplore ? '.nav-inner' : '.header-inner');
  const menu = document.querySelector(isExplore ? '.nav-links' : 'header nav');
  if (!shell || !menu) return;
  menu.id = isExplore ? 'explore-navigation' : 'deadlock-navigation';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'detail-menu-toggle';
  toggle.setAttribute('aria-label', 'Open navigation');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', menu.id);
  toggle.textContent = '☰';
  shell.append(toggle);

  const close = (focus = false) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    toggle.textContent = '☰';
    if (focus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') close();
    else {
      menu.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close navigation');
      toggle.textContent = '×';
      menu.querySelector('a')?.focus();
    }
  });
  menu.addEventListener('click', event => { if (event.target.closest('a')) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(true); });
  document.addEventListener('pointerdown', event => {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) close();
  });
  window.matchMedia('(min-width: 821px)').addEventListener('change', event => { if (event.matches) close(); });
})();
