/* One accessible appearance picker for every Cellar Studio page. */
(() => {
  'use strict';
  const key = 'cellar-studio-theme';
  const customKey = 'cellar-studio-custom-theme';
  const root = document.documentElement;
  const device = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const choices = ['system', 'light', 'dark', 'custom'];
  const defaults = Object.freeze({
    name: 'My palette',
    background: '#f6f5ef', surface: '#fffef9', text: '#151515', muted: '#484842',
    accent: '#582eb7', secondary: '#ffba91', highlight: '#d9ef8e', border: '#151515',
    type: 'normal', corners: 'sharp', motion: 'full', style: 'studio'
  });
  const colors = ['background', 'surface', 'text', 'muted', 'accent', 'secondary', 'highlight', 'border'];
  const isHex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  const sanitize = value => {
    const result = { ...defaults };
    if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
    if (typeof value.name === 'string' && value.name.trim()) result.name = value.name.trim().slice(0, 36);
    colors.forEach(name => { if (isHex(value[name])) result[name] = value[name].toLowerCase(); });
    if (['normal', 'large'].includes(value.type)) result.type = value.type;
    if (['sharp', 'rounded'].includes(value.corners)) result.corners = value.corners;
    if (['full', 'reduced'].includes(value.motion)) result.motion = value.motion;
    if (['studio', 'minimal', 'brutalist'].includes(value.style)) result.style = value.style;
    return result;
  };
  const darkBackground = hex => {
    const components = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const luminance = components.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return (luminance[0] * 0.2126 + luminance[1] * 0.7152 + luminance[2] * 0.0722) < 0.20;
  };
  let preference = 'system';
  let customTheme = { ...defaults };

  try {
    const saved = window.localStorage.getItem(key);
    if (choices.includes(saved)) preference = saved;
    const savedCustom = window.localStorage.getItem(customKey);
    if (savedCustom && savedCustom.length < 4096) customTheme = sanitize(JSON.parse(savedCustom));
  } catch (_) {
    // The theme still works for this visit when storage is unavailable.
  }

  const currentTheme = () => preference === 'system'
    ? (device?.matches ? 'dark' : 'light')
    : preference === 'custom' ? (darkBackground(customTheme.background) ? 'dark' : 'light') : preference;

  const update = (save = false) => {
    const resolved = currentTheme();
    root.setAttribute('data-theme', resolved);
    root.setAttribute('data-theme-preference', preference);
    root.setAttribute('data-theme-type', preference === 'custom' ? customTheme.type : 'normal');
    root.setAttribute('data-theme-corners', preference === 'custom' ? customTheme.corners : 'sharp');
    root.setAttribute('data-theme-motion', preference === 'custom' ? customTheme.motion : 'full');
    root.setAttribute('data-theme-style', preference === 'custom' ? customTheme.style : 'studio');
    colors.forEach(name => root.style.setProperty('--custom-' + name, customTheme[name]));
    root.style.setProperty('--custom-on-accent', darkBackground(customTheme.accent) ? '#ffffff' : '#151515');
    root.style.setProperty('--custom-on-highlight', darkBackground(customTheme.highlight) ? '#ffffff' : '#151515');
    root.style.setProperty('--custom-on-secondary', darkBackground(customTheme.secondary) ? '#ffffff' : '#151515');
    root.style.colorScheme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#18191b' : '#f6f5ef');
    if (save) {
      try { window.localStorage.setItem(key, preference); } catch (_) { /* private mode */ }
    }
    const trigger = document.querySelector('#studio-theme-toggle');
    if (trigger) {
      const visibleName = preference === 'system' ? 'Auto'
        : preference === 'custom' ? 'Custom' : preference === 'dark' ? 'Dark' : 'Light';
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
          <label class="studio-theme-option"><input type="radio" name="studio-theme-choice" value="custom"><span><strong>Custom</strong><small>Your saved colors &amp; layout</small></span></label>
        </fieldset>
        <a class="studio-theme-editor-link" href="./themes.html">Customize colors and settings</a>
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
    if (event.key === key) {
      preference = choices.includes(event.newValue) ? event.newValue : 'system';
      update();
    } else if (event.key === customKey) {
      try { customTheme = event.newValue ? sanitize(JSON.parse(event.newValue)) : { ...defaults }; }
      catch (_) { customTheme = { ...defaults }; }
      update();
    }
  });
  window.CellarTheme = Object.freeze({
    defaults: () => ({ ...defaults }),
    readCustom: () => ({ ...customTheme }),
    saveCustom: value => {
      customTheme = sanitize(value);
      preference = 'custom';
      try {
        window.localStorage.setItem(customKey, JSON.stringify(customTheme));
        window.localStorage.setItem(key, preference);
      } catch (_) { /* The theme still applies until this page is closed. */ }
      update();
      return { ...customTheme };
    }
  });
})();
