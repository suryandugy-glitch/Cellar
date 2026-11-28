/* Browser-local named themes. Imported JSON is validated, never executed. */
(() => {
  'use strict';
  const api = window.CellarTheme;
  const form = document.querySelector('#theme-form');
  if (!form || !api) return;

  const libraryKey = 'cellar-studio-custom-library';
  const colorNames = ['background', 'surface', 'text', 'muted', 'accent', 'secondary', 'highlight', 'border'];
  const presetColors = {
    paper: { name: 'Paper & Ink', category: 'minimal', description: 'Quiet black and warm white', background: '#faf9f6', surface: '#ffffff', text: '#212121', muted: '#545454', accent: '#3b444c', secondary: '#d7d6d0', highlight: '#e0e7e8', border: '#5a5a5a', type: 'normal', corners: 'rounded', motion: 'reduced', style: 'minimal' },
    graphite: { name: 'Graphite', category: 'minimal', description: 'Minimalist dark slate', background: '#111318', surface: '#1b1e24', text: '#f5f6f8', muted: '#c0c5cf', accent: '#9aa8bf', secondary: '#4b5a75', highlight: '#a8d8d0', border: '#62707f', type: 'normal', corners: 'sharp', motion: 'reduced', style: 'minimal' },
    alpine: { name: 'Alpine Mist', category: 'minimal', description: 'Airy teal and stone', background: '#e8f2f0', surface: '#fafffd', text: '#163b38', muted: '#41645f', accent: '#286c64', secondary: '#b6ddd5', highlight: '#d4eee7', border: '#557d76', type: 'normal', corners: 'rounded', motion: 'reduced', style: 'minimal' },
    lavender: { name: 'Lavender Haze', category: 'minimal', description: 'Pastel violet and cream', background: '#f8f5fc', surface: '#ffffff', text: '#302840', muted: '#5f5570', accent: '#6956a0', secondary: '#ded3f0', highlight: '#eee4ff', border: '#776b8d', type: 'normal', corners: 'rounded', motion: 'reduced', style: 'minimal' },
    bauhaus: { name: 'Bauhaus Punch', category: 'brutalist', description: 'Primary color rebellion', background: '#fff7da', surface: '#fffef8', text: '#0e0e0e', muted: '#34302a', accent: '#df3b2e', secondary: '#3159db', highlight: '#ffdc44', border: '#090909', type: 'normal', corners: 'sharp', motion: 'full', style: 'brutalist' },
    acid: { name: 'Acid Electric', category: 'brutalist', description: 'Neon after dark', background: '#19191b', surface: '#2d2d2f', text: '#f5f4e7', muted: '#c8c5b7', accent: '#ff45cd', secondary: '#40d9fa', highlight: '#e2fe55', border: '#f5f4e7', type: 'normal', corners: 'sharp', motion: 'full', style: 'brutalist' },
    cobalt: { name: 'Cobalt Impact', category: 'brutalist', description: 'Electric blue meets orange', background: '#edf5ff', surface: '#fefeff', text: '#0c2350', muted: '#384e75', accent: '#143ca0', secondary: '#fc8f6a', highlight: '#ffe06b', border: '#0c2350', type: 'normal', corners: 'sharp', motion: 'full', style: 'brutalist' },
    concrete: { name: 'Concrete Pop', category: 'brutalist', description: 'Grayscale with sharp pink', background: '#e6e6e4', surface: '#ffffff', text: '#191919', muted: '#454545', accent: '#ed2a75', secondary: '#bdbdbd', highlight: '#f9ea55', border: '#111111', type: 'normal', corners: 'sharp', motion: 'full', style: 'brutalist' },
    studio: { ...api.defaults(), name: 'Studio Original', category: 'studio', description: 'Original Cellar expression' },
    midnight: { name: 'Midnight Signal', category: 'studio', description: 'Deep and electric', background: '#121728', surface: '#1d2337', text: '#f7f5ff', muted: '#c8c3df', accent: '#9775fa', secondary: '#ef93b6', highlight: '#abf0d1', border: '#d5ccf1', type: 'normal', corners: 'rounded', motion: 'full', style: 'studio' },
    sunset: { name: 'Sunset Type', category: 'studio', description: 'Warm editorial', background: '#fff5ed', surface: '#fffcf5', text: '#321d1c', muted: '#5b4340', accent: '#bd4429', secondary: '#ffb5a3', highlight: '#ffd08c', border: '#452520', type: 'normal', corners: 'sharp', motion: 'full', style: 'studio' },
    forest: { name: 'Forest Circuit', category: 'studio', description: 'Calm green energy', background: '#ecf4e7', surface: '#fcfff8', text: '#17362b', muted: '#426152', accent: '#1d6454', secondary: '#a5d3bf', highlight: '#c5e590', border: '#17362b', type: 'normal', corners: 'rounded', motion: 'full', style: 'studio' }
  };
  const colorPalettes = {
    Monochrome: ['#101820', '#3a4556', '#7a8791', '#d7dddf', '#f8f8f4'],
    Pastels: ['#f4cbd6', '#c6d7f7', '#cfebd4', '#f7e6a4', '#e8d5ff'],
    Ocean: ['#0b4a62', '#087e8b', '#26b4af', '#89d7ce', '#d8f4fa'],
    Earth: ['#5b4033', '#a95d39', '#d38c65', '#d3b88b', '#efe3d0'],
    Neon: ['#ff4fca', '#52ffce', '#dbff55', '#6652f8', '#2de1ff'],
    Sunrise: ['#be3b54', '#ff8757', '#ffc65d', '#ffe9a3', '#714c92']
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
    if (['studio', 'minimal', 'brutalist'].includes(value.style)) theme.style = value.style;
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
    theme.style = form.querySelector('input[name="theme-style"]:checked').value;
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
    preview.dataset.style = theme.style;
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
    form.querySelector(`input[name="theme-style"][value="${value.style || 'studio'}"]`).checked = true;
    const selectedColor = document.querySelector('#palette-target')?.value;
    if (selectedColor) document.querySelector('#palette-hex').value = value[selectedColor].toUpperCase();
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
      description.textContent = ({ studio: 'Studio', minimal: 'Minimalist', brutalist: 'Brutalist' }[entry.theme.style]) + ' · ' +
        (entry.theme.corners === 'rounded' ? 'Rounded' : 'Sharp') + ' · ' +
        (entry.theme.type === 'large' ? 'Larger text' : 'Standard text');
      const actions = document.createElement('div');
      actions.append(button('Use', 'use', entry.id), button('Edit', 'edit', entry.id), button('Delete', 'delete', entry.id));
      card.append(swatches, heading, description, actions);
      libraryElement.appendChild(card);
    });
  };

  const presetsElement = document.querySelector('#theme-presets');
  const renderPresets = (filter = 'all') => {
    presetsElement.replaceChildren();
    Object.entries(presetColors).forEach(([id, value]) => {
      if (filter !== 'all' && value.category !== filter) return;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'theme-preset';
      item.dataset.preset = id;
      item.setAttribute('aria-label', 'Load ' + value.name + ' palette');
      const swatches = document.createElement('span');
      swatches.className = 'theme-preset-swatches';
      swatches.setAttribute('aria-hidden', 'true');
      ['background', 'accent', 'highlight', 'secondary'].forEach(name => {
        const chip = document.createElement('i');
        chip.style.backgroundColor = value[name];
        swatches.appendChild(chip);
      });
      const kind = document.createElement('span');
      kind.className = 'theme-preset-kind';
      kind.textContent = { minimal: 'MINIMALISM', brutalist: 'BRUTALISM', studio: 'STUDIO COLOR' }[value.category];
      const title = document.createElement('strong');
      title.textContent = value.name;
      const description = document.createElement('small');
      description.textContent = value.description;
      item.append(swatches, kind, title, description);
      presetsElement.appendChild(item);
    });
  };
  renderPresets();
  document.querySelectorAll('[data-preset-filter]').forEach(filter => filter.addEventListener('click', () => {
    const selected = filter.dataset.presetFilter;
    document.querySelectorAll('[data-preset-filter]').forEach(item => {
      item.setAttribute('aria-pressed', String(item === filter));
    });
    renderPresets(selected);
  }));

  const paletteGroups = document.querySelector('#theme-palette-groups');
  Object.entries(colorPalettes).forEach(([name, colors]) => {
    const section = document.createElement('section');
    section.className = 'theme-palette-group';
    const title = document.createElement('h3');
    title.textContent = name;
    const row = document.createElement('div');
    row.className = 'theme-palette-swatches';
    colors.forEach(hex => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'theme-swatch';
      swatch.dataset.colorHex = hex;
      swatch.style.backgroundColor = hex;
      swatch.setAttribute('aria-label', name + ' ' + hex + ' color');
      swatch.title = hex.toUpperCase();
      row.appendChild(swatch);
    });
    section.append(title, row);
    paletteGroups.appendChild(section);
  });
  const paletteTarget = document.querySelector('#palette-target');
  const paletteHex = document.querySelector('#palette-hex');
  const paletteHint = document.querySelector('#palette-hint');
  const applyColor = color => {
    const chosen = document.querySelector('#theme-' + paletteTarget.value);
    chosen.value = color.toLowerCase();
    chosen.dispatchEvent(new Event('input', { bubbles: true }));
    paletteHex.value = color.toUpperCase();
    paletteHex.removeAttribute('aria-invalid');
    paletteHint.textContent = color.toUpperCase() + ' loaded for ' + paletteTarget.selectedOptions[0].textContent + '. Review the preview, then save.';
  };
  paletteHex.value = document.querySelector('#theme-accent').value.toUpperCase();
  paletteTarget.addEventListener('change', () => {
    paletteHex.value = document.querySelector('#theme-' + paletteTarget.value).value.toUpperCase();
  });
  paletteGroups.addEventListener('click', event => {
    const swatch = event.target.closest('button[data-color-hex]');
    if (swatch) applyColor(swatch.dataset.colorHex);
  });
  document.querySelector('#palette-use-hex').addEventListener('click', () => {
    if (!validHex(paletteHex.value)) {
      paletteHex.setAttribute('aria-invalid', 'true');
      paletteHint.textContent = 'Use a six-digit HEX color, for example #582EB7.';
      paletteHex.focus();
      return;
    }
    applyColor(paletteHex.value);
  });

  library = readLibrary();
  fill(api.readCustom());
  renderLibrary();

  colorInputs.forEach(input => input.addEventListener('input', updatePreview));
  form.querySelectorAll('input:not([data-color]),select').forEach(input => input.addEventListener('input', updatePreview));
  presetsElement.addEventListener('click', event => {
    const preset = event.target.closest('button[data-preset]');
    if (!preset) return;
    editingId = null;
    fill(presetColors[preset.dataset.preset]);
    message('Preset loaded in the preview. Customize it, then save to apply.');
    document.querySelector('#editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
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
