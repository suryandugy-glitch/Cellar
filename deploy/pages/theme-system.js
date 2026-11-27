/* Shared, accessible theme control for every published Studio page. */
(() => {
  'use strict';
  const key = 'cellar-studio-theme';
  const root = document.documentElement;
  let theme = 'light';
  try {
    const saved = window.localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch (_) {
    // Browsers with disabled storage can still switch themes for this visit.
  }

  const apply = (next, save) => {
    theme = next;
    root.setAttribute('data-theme', next);
    root.style.colorScheme = next;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#18191b' : '#f6f5ef');
    if (save) {
      try { window.localStorage.setItem(key, next); } catch (_) { /* private mode */ }
    }
    const button = document.querySelector('#studio-theme-toggle');
    if (button) {
      const target = next === 'dark' ? 'light' : 'dark';
      button.setAttribute('aria-label', 'Switch to ' + target + ' mode');
      button.setAttribute('title', 'Switch to ' + target + ' mode');
      button.querySelector('.theme-icon').textContent = next === 'dark' ? '☼' : '☾';
      button.querySelector('.theme-caption').textContent = next === 'dark' ? 'LIGHT' : 'DARK';
    }
  };

  // Runs in the head before page content is painted to avoid theme flashing.
  apply(theme, false);
  const init = () => {
    if (!document.body || document.querySelector('#studio-theme-toggle')) return;
    const button = document.createElement('button');
    button.id = 'studio-theme-toggle';
    button.className = 'studio-theme-toggle';
    button.type = 'button';
    button.innerHTML = '<span class="theme-icon" aria-hidden="true"></span><span class="theme-caption"></span>';
    button.addEventListener('click', () => apply(theme === 'dark' ? 'light' : 'dark', true));
    document.body.appendChild(button);
    apply(theme, false);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
