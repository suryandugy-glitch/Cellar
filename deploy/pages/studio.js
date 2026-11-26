(() => {
  'use strict';
  const search = document.querySelector('#product-search');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.product-card')];
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('#empty-state');
  let activeFilter = 'all';

  function updateDirectory() {
    const term = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const card of cards) {
      const typeMatches = activeFilter === 'all' || card.dataset.kind === activeFilter;
      const textMatches = !term || (card.dataset.search || '').includes(term) ||
        card.textContent.toLocaleLowerCase().includes(term);
      card.hidden = !(typeMatches && textMatches);
      if (!card.hidden) visible++;
    }
    count.textContent = visible === 1 ? '1 project' : visible + ' projects';
    empty.hidden = visible !== 0;
  }

  for (const button of filters) {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      for (const option of filters) option.setAttribute('aria-pressed', String(option === button));
      updateDirectory();
    });
  }
  search.addEventListener('input', updateDirectory);
  updateDirectory();

  const toggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');
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
    const typing = focused instanceof HTMLElement &&
      (focused.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName));
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
    } else if (event.key === '/' && !typing && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      search.focus();
    } else if (event.key === 'Escape' && focused === search) {
      if (search.value) {
        search.value = '';
        updateDirectory();
      } else {
        search.blur();
      }
    }
  });
})();
