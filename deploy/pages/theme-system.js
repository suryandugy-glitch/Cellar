/* One accessible appearance picker for every Cellar Studio page. */
(() => {
  'use strict';
  const key = 'cellar-studio-theme';
  const root = document.documentElement;
  const device = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const choices = ['system', 'light', 'dark'];
  let preference = 'system';

  try {
    const saved = window.localStorage.getItem(key);
    if (choices.includes(saved)) preference = saved;
  } catch (_) {
    // The theme still works for this visit when storage is unavailable.
  }

  const currentTheme = () => preference === 'system'
    ? (device?.matches ? 'dark' : 'light') : preference;

  const update = (save = false) => {
    const resolved = currentTheme();
    root.setAttribute('data-theme', resolved);
    root.setAttribute('data-theme-preference', preference);
    root.style.colorScheme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#18191b' : '#f6f5ef');
    if (save) {
      try { window.localStorage.setItem(key, preference); } catch (_) { /* private mode */ }
    }
    const trigger = document.querySelector('#studio-theme-toggle');
    if (trigger) {
      const visibleName = preference === 'system' ? 'Auto' : preference === 'dark' ? 'Dark' : 'Light';
      trigger.setAttribute('aria-label', 'Change theme. Current selection: ' + visibleName);
      trigger.setAttribute('title', 'Change theme (currently ' + visibleName + ')');
      trigger.querySelector('.studio-theme-glyph').textContent = resolved === 'dark' ? '☾' : '☼';
      trigger.querySelector('.studio-theme-caption').textContent = 'THEME · ' + visibleName.toUpperCase();
    }
    document.querySelectorAll('input[name="studio-theme-choice"]').forEach(input => {
      input.checked = input.value === preference;
    });
  };

  // Resolve stored or device theme before the first page paint.
  update();

  const init = () => {
    if (!document.body || document.querySelector('#studio-theme-toggle')) return;
    const picker = document.createElement('div');
    picker.className = 'studio-theme-picker';
    picker.innerHTML = `
      <div id="studio-theme-menu" class="studio-theme-menu" hidden>
        <p class="studio-theme-heading">Appearance</p>
        <p class="studio-theme-hint">Choose a theme for all Cellar Studio pages.</p>
        <fieldset class="studio-theme-options">
          <legend class="studio-theme-sr-only">Choose site theme</legend>
          <label class="studio-theme-option"><input type="radio" name="studio-theme-choice" value="system"><span><strong>System</strong><small>Match your device</small></span></label>
          <label class="studio-theme-option"><input type="radio" name="studio-theme-choice" value="light"><span><strong>Light</strong><small>Bright Studio palette</small></span></label>
          <label class="studio-theme-option"><input type="radio" name="studio-theme-choice" value="dark"><span><strong>Dark</strong><small>Low-light Studio palette</small></span></label>
        </fieldset>
      </div>
      <button id="studio-theme-toggle" class="studio-theme-toggle" type="button"
        aria-controls="studio-theme-menu" aria-expanded="false">
        <span class="studio-theme-glyph" aria-hidden="true"></span>
        <span class="studio-theme-caption"></span>
      </button>`;
    document.body.appendChild(picker);

    const trigger = picker.querySelector('#studio-theme-toggle');
    const panel = picker.querySelector('#studio-theme-menu');
    const close = (restoreFocus = false) => {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) trigger.focus();
    };

    trigger.addEventListener('click', () => {
      const opening = panel.hidden;
      panel.hidden = !opening;
      trigger.setAttribute('aria-expanded', String(opening));
      if (opening) panel.querySelector('input:checked')?.focus();
    });
    picker.querySelectorAll('input[name="studio-theme-choice"]').forEach(input => {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        preference = input.value;
        update(true);
        close(true);
      });
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) close(true);
    });
    document.addEventListener('pointerdown', event => {
      if (!panel.hidden && !picker.contains(event.target)) close();
    });
    update();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  // System mode tracks OS changes; other tabs keep the same chosen preference.
  const deviceChanged = () => { if (preference === 'system') update(); };
  if (device?.addEventListener) device.addEventListener('change', deviceChanged);
  else if (device?.addListener) device.addListener(deviceChanged);
  window.addEventListener('storage', event => {
    if (event.key !== key) return;
    preference = choices.includes(event.newValue) ? event.newValue : 'system';
    update();
  });
})();
