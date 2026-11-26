'use strict';

// Motion changes the reading rhythm, never the underlying copy or controls.
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const headline = document.querySelector('main h1');
  if (headline) {
    let index = 0;
    const wrapWords = element => {
      for (const child of [...element.childNodes]) {
        if (child.nodeType === Node.TEXT_NODE) {
          const fragments = document.createDocumentFragment();
          for (const part of child.textContent.match(/\s+|\S+/g) || []) {
            if (/^\s+$/.test(part)) fragments.append(document.createTextNode(part));
            else {
              const span = document.createElement('span');
              span.className = 'minimal-word';
              span.style.setProperty('--word-delay', Math.min(index++ * 48, 450) + 'ms');
              span.textContent = part;
              fragments.append(span);
            }
          }
          child.replaceWith(fragments);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          wrapWords(child);
        }
      }
    };
    wrapWords(headline);
  }

  const headings = document.querySelectorAll('.section-heading h2,.section-head h2,.content > h2,.closing h2');
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('minimal-heading-in');
      observer.unobserve(entry.target);
    }
  }, { threshold:.2, rootMargin:'0px 0px -32px 0px' });
  headings.forEach(node => observer.observe(node));
})();
