(() => {
  'use strict';
  const search = document.querySelector('#product-search');
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.product-card')];
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('#empty-state');
  let filter = 'all';

  function update() {
    const term = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const card of cards) {
      const matchingType = filter === 'all' || card.dataset.kind === filter;
      const matchingText = !term || card.dataset.search.includes(term) || card.textContent.toLocaleLowerCase().includes(term);
      card.hidden = !(matchingType && matchingText);
      if (!card.hidden) visible++;
    }
    count.textContent = visible + (visible === 1 ? ' project' : ' projects');
    empty.hidden = visible !== 0;
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      filter = button.dataset.filter;
      for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
      update();
    });
  }
  search.addEventListener('input', update);
  update();
  // Keyboard-first product discovery: "/" focuses search; Escape clears or exits.
  document.addEventListener('keydown', event => {
    const target = event.target;
    const typing = target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (event.key === '/' && !typing && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault(); search.focus();
    } else if (event.key === 'Escape' && document.activeElement === search) {
      if (search.value) { search.value = ''; update(); }
      else search.blur();
    }
  });
})();