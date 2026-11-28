/* Browser-local named themes. Imported JSON is validated, never executed. */
(() => {
  'use strict';
  const api = window.CellarTheme;
  const form = document.querySelector('#theme-form');
  if (!form || !api) return;

  const libraryKey = 'cellar-studio-custom-library';
  const colorNames = ['background', 'surface', 'text', 'muted', 'accent', 'secondary', 'highlight', 'border'];
  const presetColors = {
    studio: api.defaults(),
    midnight: { name: 'Midnight Signal', background: '#121728', surface: '#1d2337', text: '#f7f5ff', muted: '#c8c3df', accent: '#9775fa', secondary: '#ef93b6', highlight: '#abf0d1', border: '#d5ccf1', type: 'normal', corners: 'rounded', motion: 'full' },
    sunset: { name: 'Sunset Type', background: '#fff5ed', surface: '#fffcf5', text: '#321d1c', muted: '#5b4340', accent: '#bd4429', secondary: '#ffb5a3', highlight: '#ffd08c', border: '#452520', type: 'normal', corners: 'sharp', motion: 'full' },
    forest: { name: 'Forest Circuit', background: '#ecf4e7', surface: '#fcfff8', text: '#17362b', muted: '#426152', accent: '#1d6454', secondary: '#a5d3bf', highlight: '#c5e590', border: '#17362b', type: 'normal', corners: 'rounded', motion: 'full' }
  };
  const colorInputs = [...form.querySelectorAll('input[data-color]')];
  const preview = document.querySelector('#theme-preview');
  const contrastStatus = document.querySelector('#theme-contrast');
  const status = document.querySelector('#theme-status');
  const libraryElement = document.querySelector('#theme-library');
  let editingId = null;
  let library = [];

  const luminance = hex => {
    const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const linear = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
  };
  const contrast = (first, second) => {
    const a = luminance(first), b = luminance(second);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  };
  const textFor = hex => contrast('#151515', hex) >= contrast('#ffffff', hex) ? '#151515' : '#ffffff';
  const validHex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

  const normalize = value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('This file does not contain a theme object.');
    const theme = api.defaults();
    for (const field of colorNames) {
      if (!validHex(value[field])) throw new Error('Invalid or missing color: ' + field + '. Use six-digit hex colors.');
      theme[field] = value[field].toLowerCase();
    }
    if (typeof value.name === 'string' && value.name.trim()) theme.name = value.name.trim().slice(0, 36);
    if (['normal', 'large'].includes(value.type)) theme.type = value.type;
    if (['sharp', 'rounded'].includes(value.corners)) theme.corners = value.corners;
    if (['full', 'reduced'].includes(value.motion)) theme.motion = value.motion;
    return theme;
  };
  const readLibrary = () => {
    try {
      const raw = window.localStorage.getItem(libraryKey);
      if (!raw || raw.length > 25000) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, 12).flatMap(entry => {
        try {
          return typeof entry.id === 'string' && entry.id.length < 90
            ? [{ id: entry.id, theme: normalize(entry.theme) }] : [];
        } catch (_) { return []; }
      });
    } catch (_) { return []; }
  };
  const persistLibrary = () => {
    try { window.localStorage.setItem(libraryKey, JSON.stringify(library)); return true; }
    catch (_) { return false; }
  };
  const message = (value, kind = 'info') => {
    status.textContent = value;
    status.dataset.kind = kind;
  };
  const draft = () => {
    const theme = api.defaults();
    theme.name = document.querySelector('#theme-name').value.trim().slice(0, 36) || 'My palette';
    colorInputs.forEach(input => { theme[input.dataset.color] = input.value.toLowerCase(); });
    theme.type = document.querySelector('#theme-type').value;
    theme.corners = document.querySelector('#theme-corners').value;
    theme.motion = document.querySelector('#theme-motion').value;
    return theme;
  };
  const updatePreview = () => {
    const theme = draft();
    colorNames.forEach(field => preview.style.setProperty('--preview-' + field.replace('background', 'bg'), theme[field]));
    preview.style.setProperty('--preview-on-accent', textFor(theme.accent));
    preview.style.setProperty('--preview-on-highlight', textFor(theme.highlight));
    preview.style.setProperty('--preview-on-secondary', textFor(theme.secondary));
    preview.dataset.corners = theme.corners;
    preview.dataset.type = theme.type;
    preview.dataset.motion = theme.motion;
    colorInputs.forEach(input => { input.nextElementSibling.textContent = input.value.toUpperCase(); });

    const checks = [
      ['page', contrast(theme.text, theme.background)],
      ['card', contrast(theme.text, theme.surface)],
      ['secondary text', Math.min(contrast(theme.muted, theme.background), contrast(theme.muted, theme.surface))]
    ];
    const failing = checks.filter(([, ratio]) => ratio < 4.5).map(([name]) => name);
    contrastStatus.dataset.warning = String(failing.length > 0);
    contrastStatus.textContent = failing.length
      ? 'Check readability: ' + failing.join(', ') + ' is below the 4.5:1 text contrast target. Try Improve text contrast.'
      : `Good text contrast: ${checks[0][1].toFixed(1)}:1 on the page and ${checks[1][1].toFixed(1)}:1 on cards.`;
  };
  const fill = value => {
    document.querySelector('#theme-name').value = value.name;
    colorInputs.forEach(input => { input.value = value[input.dataset.color]; });
    document.querySelector('#theme-type').value = value.type;
    document.querySelector('#theme-corners').value = value.corners;
    document.querySelector('#theme-motion').value = value.motion;
    updatePreview();
  };

  const button = (label, action, id) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.textContent = label;
    item.dataset.action = action;
    item.dataset.id = id;
    return item;
  };
  const renderLibrary = () => {
    libraryElement.replaceChildren();
    if (!library.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No custom themes yet. Create and save one above.';
      libraryElement.appendChild(empty);
      return;
    }
    library.forEach(entry => {
      const card = document.createElement('article');
      card.className = 'theme-saved-card';
      const swatches = document.createElement('div');
      swatches.className = 'theme-saved-swatches';
      swatches.setAttribute('aria-hidden', 'true');
      for (const name of ['background', 'accent', 'highlight', 'secondary']) {
        const swatch = document.createElement('i');
        swatch.style.backgroundColor = entry.theme[name];
        swatches.appendChild(swatch);
      }
      const heading = document.createElement('h3');
      heading.textContent = entry.theme.name;
      const description = document.createElement('p');
      description.textContent = (entry.theme.corners === 'rounded' ? 'Rounded' : 'Sharp') + ' · ' +
        (entry.theme.type === 'large' ? 'Larger text' : 'Standard text');
      const actions = document.createElement('div');
      actions.append(button('Use', 'use', entry.id), button('Edit', 'edit', entry.id), button('Delete', 'delete', entry.id));
      card.append(swatches, heading, description, actions);
      libraryElement.appendChild(card);
    });
  };

  library = readLibrary();
  fill(api.readCustom());
  renderLibrary();

  colorInputs.forEach(input => input.addEventListener('input', updatePreview));
  form.querySelectorAll('input:not([data-color]),select').forEach(input => input.addEventListener('input', updatePreview));
  document.querySelectorAll('[data-preset]').forEach(preset => preset.addEventListener('click', () => {
    editingId = null;
    fill(presetColors[preset.dataset.preset]);
    message('Preset loaded in the preview. Customize it, then save to apply.');
    document.querySelector('#editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  document.querySelector('#theme-reset').addEventListener('click', () => {
    editingId = null;
    fill(api.defaults());
    message('Editor reset to the original palette. Your saved themes are unchanged.');
  });
  document.querySelector('#theme-fix-contrast').addEventListener('click', () => {
    const theme = draft();
    const choices = ['#151515', '#ffffff'];
    choices.sort((a, b) => Math.min(contrast(b, theme.background), contrast(b, theme.surface)) -
      Math.min(contrast(a, theme.background), contrast(a, theme.surface)));
    document.querySelector('#theme-text').value = choices[0];
    document.querySelector('#theme-muted').value = choices[0];
    updatePreview();
    message('Text colors adjusted for better contrast. Review the preview before saving.');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const theme = draft();
    if (!document.querySelector('#theme-name').value.trim()) {
      document.querySelector('#theme-name').focus();
      message('Give your theme a name before saving.', 'error');
      return;
    }
    if (!editingId && library.length >= 12) {
      message('You can save up to 12 themes. Delete one before adding another.', 'error');
      return;
    }
    const id = editingId || ('theme-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8));
    const existing = library.findIndex(item => item.id === id);
    if (existing === -1) library.unshift({ id, theme });
    else library[existing] = { id, theme };
    editingId = id;
    const persisted = persistLibrary();
    api.saveCustom(theme);
    renderLibrary();
    message(persisted ? `“${theme.name}” is saved and applied across Cellar Studio.`
      : 'Theme applied for this visit. Browser storage is disabled, so it may not survive a reload.', persisted ? 'success' : 'error');
  });
  libraryElement.addEventListener('click', event => {
    const action = event.target.closest('button[data-action]');
    if (!action) return;
    const selected = library.find(item => item.id === action.dataset.id);
    if (!selected) return;
    if (action.dataset.action === 'delete') {
      library = library.filter(item => item.id !== selected.id);
      if (editingId === selected.id) editingId = null;
      const persisted = persistLibrary();
      renderLibrary();
      message(persisted ? `Removed “${selected.theme.name}” from saved themes. Your currently applied colors are unchanged.` : 'Could not save the deletion in this browser.', persisted ? 'info' : 'error');
      return;
    }
    editingId = selected.id;
    fill(selected.theme);
    if (action.dataset.action === 'use') {
      api.saveCustom(selected.theme);
      message(`“${selected.theme.name}” is now active on all Studio pages.`, 'success');
    } else {
      message(`Editing “${selected.theme.name}”. Save & apply when ready.`);
      document.querySelector('#editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  document.querySelector('#theme-export').addEventListener('click', () => {
    const theme = draft();
    const data = JSON.stringify({ format: 'cellar-studio-theme', version: 1, theme }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = (theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cellar-theme') + '.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('Theme JSON downloaded from the current editor.');
  });
  document.querySelector('#theme-import').addEventListener('change', async event => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 32768) throw new Error('Theme file must be 32 KiB or smaller.');
      const parsed = JSON.parse(await file.text());
      const theme = normalize(parsed.format === 'cellar-studio-theme' ? parsed.theme : parsed);
      editingId = null;
      fill(theme);
      message('Theme imported into the editor. Review and save to apply.');
      document.querySelector('#editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      message('Import failed: ' + (error instanceof Error ? error.message : 'Invalid JSON file.'), 'error');
    } finally { input.value = ''; }
  });
})();
