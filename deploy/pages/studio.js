(() => {
  'use strict';
  const toggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');
  if (!toggle || !mobileMenu) return;
  function setMenu(open, restoreFocus = false) {
    mobileMenu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) mobileMenu.querySelector('a')?.focus();
    if (!open && restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => setMenu(mobileMenu.hidden));
  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024 && !mobileMenu.hidden) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    const focused = document.activeElement;
    if (event.key === 'Escape' && !mobileMenu.hidden) {
      setMenu(false, true);
    } else if (event.key === 'Tab' && !mobileMenu.hidden) {
      const links = [...mobileMenu.querySelectorAll('a')];
      if (event.shiftKey && focused === links[0]) {
        event.preventDefault();
        toggle.focus();
      } else if (!event.shiftKey && focused === links[links.length - 1]) {
        event.preventDefault();
        toggle.focus();
      }
    }
  });
})();
