'use strict';

const repo = 'https://github.com/suryandugy-glitch/Cellar';
const root = document.querySelector('#app');
const preview = document.documentElement.hasAttribute('data-preview');
const apiOrigin = document.documentElement.dataset.apiOrigin || '';
const keyStorage = apiOrigin ? 'cellar_key:' + apiOrigin : 'cellar_key';
const glyphs = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  check: 'm5 12 4 4L19 6',
  shield: 'M12 22s7-3 7-9V5l-7-3-7 3v8c0 6 7 9 7 9z m-3-10 2 2 4-4',
  file: 'M6 3h8l4 4v14H6z M14 3v5h5 M9 12h6 M9 16h6',
  compare: 'M4 7h15m-4-4 4 4-4 4 M20 17H5m4-4-4 4 4 4',
  history: 'M3 12a9 9 0 1 1 2.6 6.4 M3 4v8h8 M12 7v5l3 2',
  inbox: 'M4 5h16l2 10v4H2v-4z M2 14h6l2 3h4l2-3h6',
  activity: 'M2 12h5l3-7 4 14 3-7h5',
  book: 'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1z M12 5v15',
  github: 'M9 19c-4 1-4-2-6-2m12 5v-3a3 3 0 0 0-.8-2.3c3-.3 6-1.5 6-6A4.7 4.7 0 0 0 19 7.4a4.3 4.3 0 0 0-.1-3.3S17.7 3.8 15 5.4a12.6 12.6 0 0 0-6 0C6.3 3.8 5.1 4.1 5.1 4.1A4.3 4.3 0 0 0 5 7.4a4.7 4.7 0 0 0-1.2 3.3c0 4.5 3 5.7 6 6A3 3 0 0 0 9 19v3',
  search: 'M21 21l-4.4-4.4 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z',
  moon: 'M20.7 15.6A8.6 8.6 0 0 1 8.4 3.3 9 9 0 1 0 20.7 15.6z',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0z',
  play: 'M8 4l12 8-12 8z',
  plus: 'M12 5v14M5 12h14',
  alert: 'M12 3l10 18H2z M12 9v4m0 4h.01',
  stop: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M8.5 8.5l7 7m0-7-7 7',
  layers: 'm12 2 10 5-10 5L2 7z M2 12l10 5 10-5 M2 17l10 5 10-5',
  chevron: 'm9 6 6 6-6 6',
  menu: 'M3 5h18M3 12h18M3 19h18',
  close: 'm6 6 12 12M18 6 6 18',
  download: 'M12 3v12m-4-4 4 4 4-4 M4 17v4h16v-4',
  refresh: 'M20 8a8.5 8.5 0 1 0 1 7 M20 3v5h-5',
  lock: 'M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3',
  arrowUp: 'M12 19V5m-7 7 7-7 7 7'
};
const sections = preview ? [
  ['check', 'Sample checks', 'check'],
  ['docs', 'Documentation', 'book']
] : [
  ['overview', 'Overview', 'grid'],
  ['check', 'Check an export', 'check'],
  ['contracts', 'Contracts', 'layers'],
  ['compare', 'Compare exports', 'compare'],
  ['setup', 'Pilot setup', 'check'],
  ['architecture', 'Architecture', 'branch'],
  ['features', 'Features', 'shield'],
  ['cli', 'CLI commands', 'play'],
  ['why', 'Why Cellar', 'activity'],
  ['history', 'Run history', 'history'],
  ['inbox', 'Live inbox', 'inbox'],
  ['activity', 'Activity log', 'activity'],
  ['docs', 'Documentation', 'book']
];
const aliases = { home: 'overview', diff: 'compare', live: 'inbox', features: preview ? 'docs' : 'features', roadmap: 'docs',
  'demo-breaking': 'check', 'demo-passing': 'check' };
const state = {
  session: null, accessKey: '', csv: '', before: '', after: '', advisory: false,
  report: null, demoPending: false, checkBusy: false
};
const ruleLabels = {
  MISSING_COLUMN: 'Required column missing', EMPTY_VALUE: 'Required value is blank',
  DUPLICATE_VALUE: 'Value must be unique', INVALID_TYPE: 'Wrong value type',
  ENUM_VALUE: 'Value outside allowed list', BELOW_MIN: 'Below minimum', ABOVE_MAX: 'Above maximum',
  UNEXPECTED_COLUMN: 'Unexpected column', COLUMN_ORDER: 'Column order changed',
  MIN_ROWS: 'Too few rows', MAX_ROWS: 'Too many rows'
};

function node(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (value != null && value !== false) el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child != null && child !== false) el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

function icon(name) {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  const path = document.createElementNS(namespace, 'path');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  path.setAttribute('d', glyphs[name]);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.7');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

function button(label, action, options = {}) {
  const { style = '', glyph, title, type = 'button' } = options;
  return node('button', { class: 'btn ' + style, type, title, 'aria-label': style.includes('square') ? label : null, onclick: action },
    glyph && icon(glyph), style.includes('square') ? null : label);
}

function link(label, href, options = {}) {
  const { style = 'btn', glyph, external } = options;
  return node('a', { class: style, href, target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null }, glyph && icon(glyph), label);
}

function storageRead(storage, key) {
  try { return window[storage].getItem(key); } catch { return null; }
}
function storageWrite(storage, key, value) {
  try {
    if (value) window[storage].setItem(key, value);
    else window[storage].removeItem(key);
  } catch { /* The active session can continue if browser storage is disabled. */ }
}

function setTheme(theme) {
  const selected = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = selected;
  storageWrite('localStorage', 'cellar_theme', selected);
  document.querySelector('meta[name="theme-color"]').content = selected === 'dark' ? '#080b12' : '#f5f6fb';
}

async function api(path, method = 'GET', body) {
  const headers = { Accept: 'application/json' };
  if (state.session?.keyRequired && state.accessKey) headers['X-Access-Key'] = state.accessKey;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(apiOrigin + '/api/' + path, {
      method, headers, credentials: 'omit', redirect: 'error',
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new Error('Cellar could not be reached. Check that the Java server is running.');
  }
  const data = await response.json().catch(() => null);
  if (response.status === 401 && state.session?.keyRequired) {
    state.accessKey = '';
    storageWrite('sessionStorage', keyStorage, null);
  }
  if (!response.ok || !data) throw new Error(data?.error || 'The server returned an unexpected response.');
  return data;
}

function announce(message) {
  document.querySelector('#announcements').textContent = message;
}
function setNotice(el, text, kind = '') {
  el.className = 'notice ' + kind;
  el.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
  el.textContent = text;
}
function errorMessage(el, error) { setNotice(el, error.message, 'bad'); }
function dateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function count(value) { return typeof value === 'number' ? value.toLocaleString() : '—'; }
function saveFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = node('a', { href: url, download: name });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copy(text, message) {
  try {
    if (!navigator.clipboard) throw new Error();
    await navigator.clipboard.writeText(text);
    setNotice(message, 'Copied to clipboard.', 'good');
  } catch {
    setNotice(message, 'Clipboard access is unavailable. You can select and copy the text.', 'warn');
  }
}
function locked(control, action, message) {
  return async () => {
    if (control.disabled) return;
    control.disabled = true;
    if (message) setNotice(message, '');
    try { await action(); }
    catch (error) {
      if (message) errorMessage(message, error);
    } finally { control.disabled = false; }
  };
}
function pageHeading(title, description, ...actions) {
  return node('header', { class: 'page-head' },
    node('div', {}, node('h1', {}, title), node('p', { class: 'muted' }, description)),
    actions.length ? node('div', { class: 'actions' }, actions) : null);
}
function panel(title, content, action, description) {
  return node('section', { class: 'panel' },
    node('header', { class: 'panel-head' }, node('div', {}, node('h2', {}, title),
      description && node('p', { class: 'muted small' }, description)), action),
    content);
}
function empty(glyph, title, description, action) {
  return node('div', { class: 'empty' }, node('span', { class: 'symbol' }, icon(glyph)),
    node('h3', {}, title), node('p', { class: 'muted small' }, description), action);
}
function badge(label, kind = '', glyph) {
  return node('span', { class: 'badge ' + kind }, glyph && icon(glyph), label);
}
function outcome(entry) {
  if (entry.error) return badge('Error', 'bad', 'alert');
  if (entry.blocking) return badge('Blocked', 'bad', 'stop');
  if (entry.passed) return badge('Passed', 'good', 'check');
  return badge(entry.advisory ? 'Advisory' : 'Warnings', 'warn', 'alert');
}
function table(headers, rows) {
  return node('div', { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': headers.join(', ') },
    node('table', {}, node('thead', {}, node('tr', {}, headers.map(label => node('th', { scope: 'col' }, label)))),
      node('tbody', {}, rows.map(row => node('tr', {}, row.map(cell => node('td', {}, cell)))))));
}
function chips(values) {
  return values?.length
    ? node('div', { class: 'chips' }, values.map(value => node('code', { class: 'chip' }, value)))
    : node('span', { class: 'muted small' }, 'None');
}
function working(label) { return node('p', { class: 'muted pad', role: 'status' }, label); }
function renderError(el, error, retry) {
  const message = node('div');
  errorMessage(message, error);
  el.replaceChildren(node('div', { class: 'pad stack' }, message, retry && node('div', {}, button('Retry', retry, { glyph: 'refresh' }))));
}

function sectionId() {
  const name = location.hash.slice(1);
  const id = aliases[name] || name;
  return sections.some(section => section[0] === id) ? id : preview ? 'check' : 'overview';
}

function navigate(id) {
  if (sectionId() === id) render(true);
  else location.hash = id;
}

function brand() {
  return node('a', { class: 'brand', href: preview ? './' : '#overview' }, node('img', { src: './logo.svg', alt: '' }),
    node('span', {}, node('strong', {}, 'Cellar'), node('small', {}, 'CSV compatibility')));
}

function launchDemo() {
  if (preview) { navigate('demo-breaking'); return; }
  state.demoPending = true;
  navigate('check');
}

function palette() {
  if (document.querySelector('dialog[open]')) return;
  const commands = sections.map(([id, label, glyph]) => [label, glyph, () => navigate(id)]);
  commands.push(['Run breaking demo', 'play', launchDemo]);
  const search = node('input', { type: 'search', placeholder: 'Find a page or command…', 'aria-label': 'Find a page or command' });
  const list = node('div', { class: 'command-list' });
  const dialog = node('dialog', { 'aria-label': 'Search workspace' }, search, list);
  function draw() {
    const query = search.value.toLowerCase().trim();
    const matches = commands.filter(([label]) => label.toLowerCase().includes(query));
    list.replaceChildren(...matches.map(([label, glyph, run]) => button(label, () => { dialog.close(); run(); }, { glyph })),
      ...(!matches.length ? [node('p', { class: 'muted pad' }, 'No matching commands.')] : []));
  }
  search.addEventListener('input', draw);
  search.addEventListener('keydown', event => {
    if (event.key === 'Enter') list.querySelector('button')?.click();
    if (event.key === 'ArrowDown') { event.preventDefault(); list.querySelector('button')?.focus(); }
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  draw();
  dialog.showModal();
  search.focus();
}

function shell(id, content) {
  const label = sections.find(section => section[0] === id)[1];
  function group(title, entries) {
    if (!entries.length) return null;
    return node('nav', { class: 'nav-group', 'aria-label': title }, node('span', { class: 'nav-label' }, title), entries);
  }
  function navItem([name, title, glyph]) {
    return node('a', { class: 'nav-link', href: '#' + name, 'aria-current': name === id ? 'page' : null }, icon(glyph), node('span', {}, title));
  }
  const closeMenu = button('Close navigation', () => toggleMenu(false), { style: 'square mobile-menu mobile-close', glyph: 'close' });
  const healthDot = node('span', { class: 'dot', 'aria-hidden': 'true' });
  const healthTitle = node('strong', {}, 'Server ready');
  const healthDetail = node('small', {}, state.session.version ? 'v' + state.session.version : 'Cellar Java');
  const connection = node('div', { class: 'connection', role: 'status', 'aria-live': 'polite' }, healthDot, healthTitle, healthDetail);
  const docs = sections.find(section => section[0] === 'docs');
  const pick = ids => sections.filter(section => ids.includes(section[0])).map(navItem);
  const sidebar = node('aside', { class: 'sidebar', id: 'workspace-navigation' }, closeMenu, brand(),
    group(preview ? 'Preview' : 'Workspace', pick(preview ? ['check'] : ['overview', 'check', 'contracts', 'compare'])),
    preview ? null : group('Explore', pick(['setup', 'architecture', 'features', 'cli', 'why'])),
    preview ? null : group('Monitor', pick(['history', 'inbox', 'activity'])),
    group('Resources', [docs && navItem(docs), link('GitHub', repo, { style: 'nav-link', glyph: 'github', external: true })].filter(Boolean)),
    preview ? null : node('div', { class: 'sidebar-bottom' },
      connection,
      state.session.keyRequired ? button('Lock workspace', () => {
        state.accessKey = '';
        state.report = null;
        state.csv = state.before = state.after = '';
        storageWrite('sessionStorage', keyStorage, null);
        connect();
      }, { style: 'text compact', glyph: 'lock' }) : null));
  const menu = button('Open navigation', () => toggleMenu(true), { style: 'square mobile-menu', glyph: 'menu' });
  menu.setAttribute('aria-controls', sidebar.id);
  menu.setAttribute('aria-expanded', 'false');
  const top = node('header', { class: 'topbar' },
    node('div', { class: 'breadcrumb' }, menu, node('span', { class: 'muted crumb-root' }, 'Workspace'), icon('chevron'), node('strong', {}, label)),
    node('div', { class: 'actions' },
      node('button', { class: 'btn', type: 'button', onclick: palette, 'aria-label': 'Search workspace' },
        icon('search'), node('span', { class: 'search-label' }, 'Search'), node('kbd', { class: 'kbd' }, 'Ctrl K')),
      themeButton()));
  function toggleMenu(open) {
    sidebar.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    (open ? closeMenu : menu).focus();
  }
  sidebar.addEventListener('keydown', event => { if (event.key === 'Escape') toggleMenu(false); });
  sidebar.addEventListener('click', event => {
    if (sidebar.classList.contains('open') && event.target.closest('a')) toggleMenu(false);
  });
  let healthKnown = true;
  async function refreshHealth() {
    try {
      await api('ready');
      if (!healthKnown) { healthTitle.textContent = 'Server ready'; healthDetail.textContent = state.session.version ? 'v' + state.session.version : 'Cellar Java'; }
      healthDot.classList.remove('down'); healthKnown = true;
    } catch {
      if (healthKnown) { healthTitle.textContent = 'Server unavailable'; healthDetail.textContent = 'Check the Java process'; }
      healthDot.classList.add('down'); healthKnown = false;
    }
  }
  void refreshHealth();
  const healthTimer = setInterval(() => {
    if (!connection.isConnected) { clearInterval(healthTimer); return; }
    if (document.visibilityState === 'visible') void refreshHealth();
  }, 30000);
  return node('div', { class: 'layout' }, sidebar, node('div', {}, top,
    node('main', { class: 'content', id: 'main-content', tabindex: '-1' }, content)));
}

function themeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
  const control = button(label, () => {
    setTheme(dark ? 'light' : 'dark');
    const next = themeButton();
    control.replaceWith(next);
    next.focus();
  }, { style: 'square', glyph: dark ? 'sun' : 'moon', title: label });
  return control;
}

function illustration() {
  const columns = ['id', 'sku', 'currency'];
  return node('div', { class: 'schema', 'aria-label': 'Animated preview of a CSV validation pipeline' },
    node('div', { class: 'pipeline-caption' }, 'THE CELLAR CHECK PIPELINE'),
    node('div', { class: 'schema-file' },
      node('div', { class: 'schema-title' }, icon('file'), 'sales-export.csv'),
      node('div', { class: 'schema-grid' }, columns.map(value => node('span', {}, value)),
        Array.from({ length: 9 }, () => node('i')))),
    node('div', { class: 'schema-flow' }, ['Extract columns', 'Check contract', 'Run agents'].map((label, index) => node('div', { class: 'flow-node' }, node('span', { class: 'flow-pulse' }, String(index + 1).padStart(2, '0')), label))),
    node('div', { class: 'schema-alert' }, icon('alert'), 'Missing order_id'),
    node('div', { class: 'schema-pass' }, icon('check'), 'finance-summary · PASS'));
}

function overview() {
  const quickCommandMessage = node('div', { class: 'notice' });
  const metrics = node('div', { class: 'metrics', 'aria-label': 'Workspace metrics' });
  const recent = node('div', {}, working('Loading recent checks…'));
  const coverage = node('div', {}, working('Loading contracts…'));
  const trend = node('div', { class: 'release-trend-empty' }, working('Loading recent release outcomes…'));
  const latestCheck = node('div', { class: 'latest-check-empty' }, working('Loading the latest check…'));
  function metric(label, value, detail, glyph, color = '') {
    return node('section', { class: 'metric' },
      node('div', { class: 'metric-label' }, node('span', { class: 'symbol ' + color }, icon(glyph)), label),
      node('div', { class: 'metric-value' }, value), node('p', { class: 'muted small' }, detail));
  }
  function loadMetrics(stats) {
    const runs = stats?.runs;
    metrics.replaceChildren(
      metric('Saved checks', count(runs), 'Latest 100 runs retained', 'activity'),
      metric('Pass rate', runs ? Math.round(100 * stats.passed / runs) + '%' : '—', runs ? 'Across saved checks' : 'Awaiting first check', 'check', 'good'),
      metric('Blocked releases', count(stats?.blocked), 'Among saved checks', 'stop', 'bad'),
      metric('Integrations', count(stats?.integrations), 'In the active contract', 'layers', 'blue'));
  }
  const statError = node('div');
  async function loadStats() {
    try { loadMetrics(await api('stats')); statError.replaceChildren(); }
    catch (error) { renderError(statError, error, loadStats); }
  }
  async function loadRecent() {
    try {
      const { history } = await api('history');
      recent.replaceChildren(history.length
        ? table(['Outcome', 'Run time', 'Rows'], history.slice(0, 5).map(run => [outcome(run), dateTime(run.timestamp), count(run.rowsChecked)]))
        : empty('history', 'No checks recorded yet', 'Upload a CSV or run the demo to see a release verdict here.', link('Check an export', '#check', { style: 'btn text compact' })));
      const latest = history[0];
      if (!latest) {
        trend.replaceChildren(empty('history', 'Trend starts with your first check', 'Run checks against the same contract to see recent release outcomes.'));
        latestCheck.replaceChildren(empty('check', 'No release decision yet', 'Run a check to see its outcome and affected integrations.', link('Start a check', '#check', { style: 'btn text compact' })));
        return;
      }
      const recentRuns = history.slice(0, 8).reverse();
      const outcomeLabel = run => run.blocking ? 'Blocked' : run.passed ? 'Passed' : run.advisory ? 'Advisory' : 'Warnings';
      trend.replaceChildren(
        node('p', { class: 'muted small' }, 'Latest ' + recentRuns.length + ' checks, oldest to newest.'),
        node('div', { class: 'release-trend', role: 'list', 'aria-label': 'Recent release outcomes' }, recentRuns.map((run, index) =>
          node('div', { class: 'release-trend-item', role: 'listitem', title: outcomeLabel(run) + ' · ' + dateTime(run.timestamp) },
            node('span', { class: 'trend-dot ' + (run.blocking ? 'blocked' : run.passed ? 'passed' : 'advisory'), 'aria-hidden': 'true' }),
            node('span', { class: 'trend-sequence', 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0')),
            node('span', { class: 'sr-only' }, outcomeLabel(run) + ' · ' + dateTime(run.timestamp))))),
        node('div', { class: 'trend-legend' }, badge('Passed', 'good'), badge('Blocked', 'bad'), badge('Warnings / advisory', 'warn')));
      const affected = (latest.results || []).filter(result => !result.passed);
      latestCheck.replaceChildren(
        node('div', { class: 'latest-check-head' }, badge(outcomeLabel(latest), latest.blocking ? 'bad' : latest.passed ? 'good' : 'warn'),
          node('time', { class: 'muted small', datetime: latest.timestamp }, dateTime(latest.timestamp))),
        node('p', { class: 'latest-check-summary' }, affected.length
          ? affected.length + ' integration' + (affected.length === 1 ? '' : 's') + ' need review.'
          : 'No integration findings in this run.'),
        affected.length ? node('ul', { class: 'latest-affected' }, affected.slice(0, 5).map(result =>
          node('li', {}, node('strong', { class: 'wrap' }, result.integration), node('span', { class: 'muted small' }, count(result.issueCount) + ' finding' + (result.issueCount === 1 ? '' : 's'))))) : null,
        link('Review run history', '#history', { style: 'btn text compact' }));
    } catch (error) { renderError(recent, error, loadRecent); }
  }
  async function loadCoverage() {
    try {
      const { config } = await api('config');
      coverage.replaceChildren(config.integrations.length
        ? node('ul', { class: 'connection-list' }, config.integrations.slice(0, 4).map(integration =>
          node('li', {}, node('span', { class: 'symbol blue' }, icon('file')),
            node('div', {}, node('strong', { class: 'wrap small' }, integration.id), node('small', {}, integration.owner || 'Unassigned')),
            badge((integration.required?.length || 0) + ' required'))))
        : empty('layers', 'No integrations', 'Add an integration to define what your customers need.'));
    } catch (error) { renderError(coverage, error, loadCoverage); }
  }
  loadMetrics();
  void loadStats();
  void loadRecent();
  void loadCoverage();
  return node('div', { class: 'page' },
    pageHeading('Release health', 'Live workspace health from your Cellar validation history.'),
    node('section', { class: 'pilot-summary panel' },
      node('div', { class: 'pilot-summary-copy' },
        node('span', { class: 'eyebrow' }, 'PILOT READINESS'),
        node('h2', {}, pilotProgress().size ? 'Keep your pilot moving' : 'Get your first pilot ready'),
        node('p', { class: 'muted small' }, pilotProgress().size + ' of ' + pilotSteps.length + ' setup steps complete. Use advisory checks before enabling a blocking gate.')),
      link('Open setup checklist', '#setup', { style: 'btn primary' })),
    node('section', { class: 'hero' }, node('div', {},
      node('span', { class: 'eyebrow' }, 'RELEASE CONFIDENCE · BUILT INTO YOUR WORKFLOW'),
      node('h2', {}, 'Catch the CSV change that breaks a customer’s import, before it ships.'),
      node('p', {}, 'Check an export against your contracts before it reaches a customer’s import.'),
      node('div', { class: 'actions' },
        link('New check', '#check', { style: 'btn primary', glyph: 'plus' }),
        button('Try breaking demo', launchDemo, { glyph: 'play' }),
        button('Copy CLI check', () => void copy('java -jar dist/cellar.jar check --csv build/sales.csv --summary --format markdown', quickCommandMessage), { glyph: 'file' }))), illustration()),
    statError, metrics,
    node('div', { class: 'two wide' },
      panel('Recent checks', recent, link('View history', '#history', { style: 'btn text compact' })),
      panel('Contract coverage', coverage, link('View contracts', '#contracts', { style: 'btn text compact' }))),
    node('div', { class: 'two wide' },
      panel('Recent release outcomes', trend, link('Full history', '#history', { style: 'btn text compact' })),
      panel('Latest check', latestCheck, link('Run another check', '#check', { style: 'btn text compact' }))),
    quickCommandMessage,
    node('div', { class: 'two wide' },
      panel('How a check moves through Cellar', node('div', { class: 'overview-flow' },
        ['CSV export', 'Contract rules', 'Validation agents', 'Release gate'].map((label, index) =>
          node('a', { class: 'overview-flow-step', href: ['#check', '#contracts', '#features', '#history'][index] },
            node('span', { class: 'step-index' }, String(index + 1).padStart(2, '0')), node('strong', {}, label),
            node('small', {}, ['Read the file', 'Load the declared schema', 'Explain findings', 'Allow or block'][index])))),
        link('Explore architecture', '#architecture', { style: 'btn text compact' })),
      panel('What Cellar covers', node('div', { class: 'overview-capabilities' },
        [['Contract validation', 'Required columns, values, types and row limits'], ['Release gate', 'Real pass or block verdicts and exit codes'], ['Traceability', 'History, revisions and an integrity-checked activity log']].map(([title, detail]) =>
          node('div', { class: 'capability-row' }, node('strong', {}, title), node('span', { class: 'muted small' }, detail)))),
        link('View all features', '#features', { style: 'btn text compact' }))));
}

const pilotSteps = [
  { id: 'scope', title: 'Choose one export and pilot owner', description: 'Start with a recurring customer export and name the person who can confirm what its consumer needs.', href: '#docs', action: 'Review the pilot guide' },
  { id: 'contracts', title: 'Map the downstream requirements', description: 'Add each affected workflow, its owner, required columns, and any agreed value rules.', href: '#contracts', action: 'Open contracts' },
  { id: 'fixture', title: 'Check a representative export', description: 'Run the real exporter on synthetic or redacted data, then confirm a known-good file passes.', href: '#check', action: 'Run a check' },
  { id: 'review', title: 'Review findings in advisory mode', description: 'Discuss warnings with the pilot owner and tune rules before a finding can block a release.', href: '#check', action: 'Review check workflow' },
  { id: 'ci', title: 'Add the check to CI', description: 'Run Cellar after export generation and keep repository permissions read-only.', href: '#cli', action: 'See CLI and CI commands' },
  { id: 'gate', title: 'Enable the gate after agreement', description: 'Require the check only after the owner accepts the contract, findings, and rollback plan.', href: '#docs', action: 'Review rollout guidance' }
];
const pilotStorageKey = 'cellar_pilot_setup:' + window.location.origin + ':' + apiOrigin;

function pilotProgress() {
  try {
    const saved = JSON.parse(storageRead('localStorage', pilotStorageKey) || '[]');
    return new Set(Array.isArray(saved) ? saved.filter(id => pilotSteps.some(step => step.id === id)) : []);
  } catch { return new Set(); }
}

function pilotChecklist() {
  const checked = pilotProgress();
  const progress = node('div', { class: 'pilot-progress', role: 'group', 'aria-label': 'Pilot setup progress' });
  const list = node('ol', { class: 'pilot-steps' });
  function drawProgress() {
    const complete = checked.size;
    progress.replaceChildren(
      node('div', { class: 'pilot-progress-copy' }, node('strong', {}, complete + ' of ' + pilotSteps.length + ' steps complete'),
        node('span', { class: 'muted small' }, complete === pilotSteps.length ? 'Ready for your agreed release gate' : 'Work through the pilot in order; repeat steps as requirements change.')),
      node('div', { class: 'pilot-progress-track', role: 'progressbar', 'aria-label': 'Pilot setup progress', 'aria-valuemin': '0', 'aria-valuemax': String(pilotSteps.length), 'aria-valuenow': String(complete) },
        node('span', { style: 'width:' + Math.round(complete / pilotSteps.length * 100) + '%' })));
  }
  function drawSteps() {
    list.replaceChildren(...pilotSteps.map((step, index) => {
      const checkbox = node('input', { type: 'checkbox', checked: checked.has(step.id), 'aria-label': 'Mark ' + step.title + ' complete' });
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) checked.add(step.id); else checked.delete(step.id);
        storageWrite('localStorage', pilotStorageKey, JSON.stringify([...checked]));
        checkbox.closest('.pilot-step')?.classList.toggle('complete', checkbox.checked);
        drawProgress();
      });
      return node('li', { class: 'pilot-step' + (checked.has(step.id) ? ' complete' : '') },
        node('label', { class: 'pilot-step-check' }, checkbox, node('span', { class: 'step-index' }, String(index + 1).padStart(2, '0'))),
        node('div', { class: 'pilot-step-copy' }, node('h2', {}, step.title), node('p', { class: 'muted small' }, step.description)),
        link(step.action, step.href, { style: 'btn compact' }));
    }));
  }
  const download = button('Download pilot plan', () => {
    const lines = ['# Cellar pilot setup', '', 'Progress is saved in this browser. This file contains no CSV data.', ''];
    pilotSteps.forEach((step, index) => lines.push((checked.has(step.id) ? '- [x] ' : '- [ ] ') + (index + 1) + '. ' + step.title + ' — ' + step.description));
    lines.push('', 'Enable a blocking gate only after the pilot owner agrees on the contract, findings, and rollback plan.', '');
    saveFile('cellar-pilot-setup.md', lines.join('\n'), 'text/markdown;charset=utf-8');
  }, { glyph: 'download' });
  drawProgress();
  drawSteps();
  return node('div', { class: 'pilot-setup-body' }, progress, list,
    node('div', { class: 'pilot-footer' }, node('p', { class: 'muted small' }, 'Checklist status stays in this browser. It does not record customer data or represent an approval.'), download));
}

function setupPage() {
  return node('div', { class: 'page' },
    pageHeading('Pilot setup', 'A practical path from first contract to a release gate the customer understands.'),
    node('section', { class: 'pilot-intro panel pad' }, node('span', { class: 'eyebrow' }, 'A CUSTOMER-READY ROLLOUT'),
      node('h2', {}, 'Prove the workflow with one export first.'),
      node('p', { class: 'muted' }, 'Use synthetic or redacted fixtures. Review each contract with its owner, start in advisory mode, and make checks blocking only after the team agrees on the rules.')),
    panel('Pilot readiness', pilotChecklist()),
    panel('Need the full rollout notes?', node('div', { class: 'pad actions' },
      link('Open startup playbook', repo + '/blob/main/docs/STARTUP_PLAYBOOK.md', { external: true }),
      link('Read CI setup', repo + '#use-it-in-ci', { external: true }))));
}

function sampleCheck() {
  const sample = location.hash === '#demo-passing' ? 'passing' : 'breaking';
  const output = node('div', { class: 'stack' }, working('Loading sample report…'));
  async function load() {
    try {
      const [csv, report] = await Promise.all([
        fetch('./samples/' + sample + '.csv').then(response => {
          if (!response.ok) throw new Error('The sample CSV is unavailable.');
          return response.text();
        }),
        fetch('./samples/' + sample + '.json').then(response => {
          if (!response.ok) throw new Error('The sample report is unavailable.');
          return response.json();
        })
      ]);
      output.replaceChildren(panel('Sample CSV', node('div', { class: 'pad' }, node('pre', {}, csv))), reportView(report));
    } catch (error) { renderError(output, error, load); }
  }
  void load();
  function sampleLink(value, label) {
    const active = value === sample;
    const item = link(label, '#demo-' + value, { style: active ? 'btn primary' : 'btn' });
    if (active) item.setAttribute('aria-current', 'page');
    return item;
  }
  return node('div', { class: 'page' },
    pageHeading('Sample checks', 'Explore reports generated from two synthetic CSV exports.', link('Install Cellar', repo + '#quick-start', { external: true })),
    node('nav', { class: 'actions', 'aria-label': 'Sample reports' }, sampleLink('passing', 'Passing sample'), sampleLink('breaking', 'Breaking sample')),
    output);
}

async function fileText(file, maxBytes = 8 * 1024 * 1024) {
  if (file.size > maxBytes) throw new Error('This file exceeds the ' + (maxBytes / 1048576) + ' MiB limit.');
  const bytes = await file.arrayBuffer();
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('This file could not be read as UTF-8.'); }
}

function csvField(id, label, current, onChange, message) {
  const area = node('textarea', {
    id, class: 'csv', spellcheck: 'false', placeholder: 'order_id,sku,total_cents,currency', required: true
  });
  area.value = current;
  let revision = 0;
  function set(value) { revision++; area.value = value; onChange(value); }
  area.addEventListener('input', () => { revision++; onChange(area.value); });
  async function read(file) {
    if (!file) return;
    const started = ++revision;
    try {
      const text = await fileText(file);
      if (started !== revision) return;
      set(text);
      setNotice(message, 'Loaded ' + file.name + '.', 'good');
    } catch (error) { if (started === revision) errorMessage(message, error); }
  }
  const picker = node('input', { type: 'file', accept: '.csv,text/csv,text/plain', 'aria-label': 'Upload ' + label });
  picker.addEventListener('change', () => { void read(picker.files[0]); picker.value = ''; });
  const field = node('div', { class: 'fields' }, node('label', { for: id }, label),
    node('div', { class: 'drop' }, picker, node('p', { class: 'muted small' }, 'Choose or drop a UTF-8 CSV up to 8 MiB.')), area);
  field.addEventListener('dragover', event => {
    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault();
      field.querySelector('.drop').classList.add('over');
    }
  });
  field.addEventListener('dragleave', event => {
    if (!field.contains(event.relatedTarget)) field.querySelector('.drop').classList.remove('over');
  });
  field.addEventListener('drop', event => {
    if (event.dataTransfer.files.length) {
      event.preventDefault();
      field.querySelector('.drop').classList.remove('over');
      void read(event.dataTransfer.files[0]);
    }
  });
  return { field, area, set };
}

function aiPanel(report) {
  if (!state.session?.ai) return null;
  const output = node('div', { class: 'notice' });
  const question = node('input', { type: 'text', maxlength: '500', 'aria-label': 'Question for the AI assistant', placeholder: 'Ask about your contract or results' });
  const controls = [];
  async function ask(task) {
    const text = question.value.trim();
    if (task === 'ask' && !text) { question.focus(); return; }
    controls.forEach(control => { control.disabled = true; });
    setNotice(output, 'Waiting for a response…');
    try {
      const result = await api('ai', 'POST', { task, question: task === 'ask' ? text : '', report });
      const feedback = node('div', { class: 'notice' });
      output.className = 'stack';
      output.replaceChildren(node('p', { class: 'muted small' }, result.model),
        node('p', { class: 'ai-answer wrap' }, result.text),
        node('div', {}, button('Copy response', () => copy(result.text, feedback))), feedback);
    } catch (error) { errorMessage(output, error); }
    finally { controls.forEach(control => { control.disabled = false; }); }
  }
  if (report) controls.push(button('Explain results', () => ask('explain')), button('Draft owner message', () => ask('message')));
  else controls.push(button('Review contract', () => ask('advise')));
  const askButton = button('Ask', null, { type: 'submit' });
  const shortcuts = controls.slice();
  controls.push(askButton);
  return panel('AI assistant', node('div', { class: 'pad stack' },
    node('p', { class: 'muted small' }, 'The provider receives a summary from Cellar and any question you enter.'),
    node('div', { class: 'actions' }, shortcuts),
    node('form', { class: 'stack', onsubmit: event => { event.preventDefault(); if (!askButton.disabled) void ask('ask'); } },
      question, node('div', {}, askButton)), output));
}

function reportView(report) {
  const kind = report.blocking ? 'bad' : report.passed ? 'good' : 'warn';
  const label = report.blocking ? 'Release blocked' : report.passed ? 'Ready to ship' : report.advisory ? 'Advisory findings' : 'Warnings only';
  const details = report.blocking ? 'Resolve blocking findings before shipping.' :
    report.passed ? 'All integrations meet their declared requirements.' : 'The findings below were recorded and do not block this release.';
  const markdown = report.agents?.find(agent => agent.markdown)?.markdown;
  const feedback = node('div', { class: 'notice' });
  const resultPanels = report.results.map(result => {
    const issueStatus = result.passed ? badge('Passed', 'good', 'check') :
      result.severity === 'warning' ? badge('Warning', 'warn', 'alert') : badge('Failed', 'bad', 'stop');
    return panel(result.integration, result.issues.length
      ? node('div', {}, table(['Rule', 'Column', 'Record', 'Suggested action'], result.issues.map(issue =>
        [node('span', { title: issue.code }, ruleLabels[issue.code] || issue.code), node('code', {}, issue.column || '—'), issue.record, issue.message])),
      result.truncated ? node('p', { class: 'muted small pad' }, 'Showing ' + result.issues.length + ' of ' + result.issueCount + ' findings.') : null)
      : node('p', { class: 'muted small pad' }, 'No findings.'), issueStatus, result.owner);
  });
  const agents = (report.agents || []).map(agent => node('div', { class: 'agent' },
    node('h3', {}, agent.agent),
    (agent.findings || []).map(finding => node('div', { class: 'wrap' }, node('strong', { class: 'small' }, finding.title),
      node('p', { class: 'muted small' }, [finding.detail, finding.action].filter(Boolean).join(' ')))),
    agent.markdown ? node('pre', {}, agent.markdown) : null));
  return node('section', { class: 'stack', 'aria-label': 'Check results' },
    node('div', { class: 'notice verdict ' + kind, tabindex: '-1' },
      node('h2', {}, icon(kind === 'good' ? 'check' : 'alert'), label), node('p', {}, details),
      node('p', { class: 'small' }, report.results.length + ' integrations · ' +
        (report.scope === 'headers-only' ? 'Headers checked' : count(report.rowsChecked) + ' rows checked'))),
    preview ? null : node('div', { class: 'actions' },
      markdown && button('Copy PR comment', () => copy(markdown, feedback)),
      markdown && button('Download Markdown', () => saveFile('cellar-report.md', markdown, 'text/markdown'), { glyph: 'download' }),
      button('Download JSON', () => saveFile('cellar-report.json', JSON.stringify(report, null, 2), 'application/json'), { glyph: 'download' })),
    feedback, resultPanels,
    agents.length ? node('details', { class: 'panel details' }, node('summary', {}, 'Agent findings'), node('div', { class: 'pad' }, agents)) : null,
    aiPanel(report));
}

function addScoutDraft(draft, host) {
  const message = node('div', { class: 'notice' });
  const add = button('Add to contract', null, { style: 'primary' });
  add.addEventListener('click', locked(add, async () => {
    const { config, revision } = await api('config');
    const base = draft.id;
    let id = base;
    for (let suffix = 2; config.integrations.some(item => item.id === id); suffix++) id = base + '-' + suffix;
    config.integrations.push({ ...draft, id });
    await api('config', 'PUT', { config, revision });
    setNotice(message, 'Added ' + id + ' to the active contract.', 'good');
    add.remove();
  }, message));
  host.replaceChildren(panel('Scout draft', node('div', { class: 'pad stack' },
    node('p', { class: 'muted small' }, 'Review the generated rules before adding them to the active contract.'),
    node('pre', {}, JSON.stringify(draft, null, 2)), node('div', { class: 'actions' }, add, link('Open contracts', '#contracts')), message)));
}

function checkPage() {
  const message = node('div', { class: 'notice' });
  const results = node('div', {}, state.report && reportView(state.report));
  const draft = node('div');
  const csv = csvField('export-csv', 'Export CSV', state.csv, value => { state.csv = value; }, message);
  const advisory = node('input', { type: 'checkbox', checked: state.advisory, onchange: event => { state.advisory = event.target.checked; } });
  const run = button('Run check', null, { style: 'primary', glyph: 'play', type: 'submit' });
  const passing = button('Passing demo', null);
  const breaking = button('Breaking demo', null);
  const scout = button('Scout a contract', null);
  const form = node('form', { class: 'pad stack' }, csv.field,
    node('div', { class: 'actions' }, passing, breaking, scout),
    node('label', { class: 'checkbox' }, advisory, 'Advisory mode'),
    node('div', { class: 'actions' }, run, node('span', { class: 'muted small' }, 'Ctrl + Enter')), message);
  const controls = [run, passing, breaking, scout];
  function setBusy(busy) { controls.forEach(control => { control.disabled = busy; }); }
  setBusy(state.checkBusy);
  if (state.checkBusy) results.replaceChildren(validationProgress());
  async function runCheck() {
    if (state.checkBusy) return;
    const session = state.session;
    state.checkBusy = true;
    setBusy(true);
    state.report = null;
    results.replaceChildren(validationProgress());
    setNotice(message, '');
    try {
      const report = await api('check', 'POST', { csv: csv.area.value, advisory: advisory.checked });
      if (session !== state.session) return;
      state.report = report;
      results.replaceChildren(reportView(report));
      if (results.isConnected) results.querySelector('.verdict').focus();
    } catch (error) { results.replaceChildren(); errorMessage(message, error); }
    finally {
      results.querySelector('.validation-progress')?.classList.add('complete');
      state.checkBusy = false;
      setBusy(false);
      if (!results.isConnected && session === state.session && sectionId() === 'check') render();
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); void runCheck(); });
  csv.area.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); form.requestSubmit(); }
  });
  async function loadDemo(bad) {
    const demo = await api('demo');
    if (!csv.area.isConnected) return;
    csv.set(bad ? demo.brokenCsv : demo.csv);
    setNotice(message, 'Demo CSV loaded.', 'good');
  }
  async function chooseDemo(bad, autoRun = false) {
    setBusy(true);
    try { await loadDemo(bad); }
    catch (error) { errorMessage(message, error); return; }
    finally { setBusy(false); }
    if (autoRun && results.isConnected) await runCheck();
  }
  passing.addEventListener('click', () => chooseDemo(false));
  breaking.addEventListener('click', () => chooseDemo(true));
  scout.addEventListener('click', locked(scout, async () => {
    if (csv.area.reportValidity()) addScoutDraft(await api('scout', 'POST', { csv: csv.area.value }), draft);
  }, message));
  if (state.demoPending && !state.checkBusy) {
    state.demoPending = false;
    void chooseDemo(true, true);
  }
  return node('div', { class: 'page' },
    pageHeading('Check an export', 'Get a release verdict for a CSV against your active contract.', link('View contracts', '#contracts', { glyph: 'layers' })),
    panel('Export to check', form), draft, results);
}

function validationProgress() {
  const stages = ['Reading CSV structure', 'Extracting column names', 'Loading contract rules', 'Validating requirements', 'Running triage analysis', 'Generating final verdict'];
  const list = node('ol', { class: 'validation-stages', 'aria-live': 'polite' }, stages.map((label, index) => node('li', { class: index === 0 ? 'active' : '' }, node('span', { class: 'stage-mark' }, index === 0 ? '···' : String(index + 1).padStart(2, '0')), label)));
  const progress = node('section', { class: 'validation-progress panel pad', role: 'status' }, node('div', { class: 'progress-heading' }, node('span', { class: 'eyebrow' }, 'LIVE VALIDATION'), node('strong', {}, 'Checking against your active contract')), node('div', { class: 'progress-track' }, node('i')), list);
  let current = 0;
  const timer = setInterval(() => {
    if (!progress.isConnected || progress.classList.contains('complete')) { clearInterval(timer); return; }
    list.children[current]?.classList.remove('active'); list.children[current]?.classList.add('done');
    current = Math.min(current + 1, stages.length - 1); list.children[current]?.classList.add('active');
  }, 480);
  return progress;
}

function contractsPage() {
  const integrations = node('div', {}, working('Loading integrations…'));
  const revisions = node('div', {}, working('Loading revisions…'));
  const message = node('div', { class: 'notice' });
  const revisionLabel = node('p', { class: 'muted small' });
  const editor = node('textarea', { class: 'csv contract-editor', id: 'contract-json', spellcheck: 'false', disabled: true });
  const importer = node('input', { type: 'file', id: 'contract-import', accept: '.json,application/json', disabled: true });
  const save = button('Validate and save', null, { style: 'primary', type: 'submit' });
  const reload = button('Reload from server', null, { glyph: 'refresh' });
  const download = button('Export JSON', () => saveFile('cellar-contract.json', editor.value, 'application/json'), { glyph: 'download' });
  const add = button('Add to draft', null, { glyph: 'plus' });
  const edits = [editor, importer, save, download, add];
  let current;
  let busy = false;

  function draw(data) {
    current = data;
    editor.value = JSON.stringify(data.config, null, 2);
    revisionLabel.textContent = 'Active revision ' + data.revision.slice(0, 12);
    integrations.replaceChildren(data.config.integrations.length
      ? node('ul', { class: 'connection-list' }, data.config.integrations.map(integration =>
        node('li', {}, node('span', { class: 'symbol blue' }, icon('file')),
          node('div', { class: 'stack' },
            node('div', {}, node('strong', { class: 'wrap' }, integration.id),
              node('small', {}, integration.owner || 'Unassigned', integration.description && ' · ' + integration.description)),
            chips(integration.required)),
          badge(integration.severity === 'warning' ? 'Warning' : 'Blocking', integration.severity === 'warning' ? 'warn' : ''))))
      : empty('layers', 'No active integrations', 'Add an integration to the draft and save the contract.'));
  }
  function task(action) {
    return async () => {
      if (busy) return;
      busy = true;
      [...edits, reload].forEach(control => { control.disabled = true; });
      setNotice(message, '');
      try { await action(); }
      catch (error) { errorMessage(message, error); }
      finally {
        busy = false;
        reload.disabled = false;
        edits.forEach(control => { control.disabled = !current; });
      }
    };
  }
  async function loadRevisions() {
    try {
      const data = await api('revisions');
      revisions.replaceChildren(data.revisions.length
        ? table(['Revision', 'Saved at', 'Actor', 'Action'], data.revisions.map((revision, index) =>
          [node('code', {}, revision.hash.slice(0, 12)), dateTime(revision.at), revision.actor,
            index === 0 ? badge('Current') : revision.restorable ? button('Restore', task(async () => {
              if (!window.confirm('Restore this contract revision?')) return;
              await api('restore', 'POST', { hash: revision.hash });
              await load();
              setNotice(message, 'Contract revision restored.', 'good');
            }), { style: 'compact' }) : '—']))
        : empty('history', 'No saved revisions', 'Contract changes will appear here.'));
    } catch (error) { renderError(revisions, error, loadRevisions); }
  }
  async function load() {
    try { draw(await api('config')); }
    catch (error) {
      if (!current) renderError(integrations, error, () => void task(load)());
      throw error;
    }
    await loadRevisions();
  }
  function parseDraft() {
    let draft;
    try { draft = JSON.parse(editor.value); }
    catch { throw new Error('The contract draft contains invalid JSON.'); }
    if (!Array.isArray(draft?.integrations)) throw new Error('The draft must contain an integrations array.');
    return draft;
  }
  const saveDraft = task(async () => {
    const config = parseDraft();
    draw(await api('config', 'PUT', { config, revision: current.revision }));
    setNotice(message, 'Contract validated and saved.', 'good');
    await loadRevisions();
  });
  reload.addEventListener('click', () => {
    if (current && editor.value.trim() !== JSON.stringify(current.config, null, 2) && !window.confirm('Discard this draft and reload the active contract?')) return;
    void task(load)();
  });
  importer.addEventListener('change', event => {
    const file = event.target.files[0];
    importer.value = '';
    if (!file) return;
    void task(async () => {
      editor.value = await fileText(file, 1024 * 1024);
      setNotice(message, 'Draft imported. Validate and save to apply it.', 'good');
    })();
  });
  const id = node('input', { id: 'integration-id', type: 'text', placeholder: 'inventory-report' });
  const owner = node('input', { id: 'integration-owner', type: 'text', placeholder: 'Inventory team' });
  const columns = node('input', { id: 'integration-columns', type: 'text', placeholder: 'order_id, sku' });
  function field(label, input) { return node('div', { class: 'fields' }, node('label', { for: input.id }, label), input); }
  const newIntegration = node('details', { class: 'panel details' }, node('summary', {}, 'Add an integration'),
    node('div', { class: 'pad stack' }, field('Integration ID', id), field('Owner', owner),
      field('Required columns, comma separated', columns), node('div', {}, add)));
  add.addEventListener('click', task(async () => {
    const config = parseDraft();
    const name = id.value.trim();
    const required = columns.value.split(',').map(value => value.trim()).filter(Boolean);
    if (!name || !required.length) throw new Error('Enter an integration ID and at least one required column.');
    if (config.integrations.some(item => item?.id === name)) throw new Error('That integration ID already exists in the draft.');
    config.integrations.push({ id: name, owner: owner.value.trim() || 'Unassigned', required });
    editor.value = JSON.stringify(config, null, 2);
    id.value = owner.value = columns.value = '';
    setNotice(message, 'Integration added to the draft. Validate and save to apply it.', 'good');
  }));
  const form = node('form', { class: 'pad stack', onsubmit: event => { event.preventDefault(); void saveDraft(); } },
    node('label', { class: 'field-label', for: editor.id }, 'Contract JSON'), editor, revisionLabel,
    node('div', { class: 'actions' }, save, reload, download), field('Import a JSON draft', importer), message);
  void task(load)();
  return node('div', { class: 'page' },
    pageHeading('Contracts', 'Define the columns and rules each integration depends on.'),
    panel('Active integrations', integrations), newIntegration,
    panel('Contract editor', form), panel('Revision history', revisions), aiPanel(null));
}

function comparePage() {
  const message = node('div', { class: 'notice' });
  const results = node('div');
  const before = csvField('before-csv', 'Baseline CSV', state.before, value => { state.before = value; }, message);
  const after = csvField('after-csv', 'New CSV', state.after, value => { state.after = value; }, message);
  const compare = button('Compare headers', null, { style: 'primary', glyph: 'compare', type: 'submit' });
  const demo = button('Load demo exports', null);
  demo.addEventListener('click', locked(demo, async () => {
    const samples = await api('demo');
    before.set(samples.csv);
    after.set(samples.brokenCsv);
    setNotice(message, 'Demo exports loaded.', 'good');
  }, message));
  const compareHeaders = locked(compare, async () => {
    const diff = await api('diff', 'POST', { before: before.area.value, after: after.area.value });
    results.replaceChildren(panel('Header changes', node('div', { class: 'pad stack' },
      node('div', { class: 'two' },
        node('div', { class: 'stack' }, node('h3', {}, 'Added columns'), chips(diff.added)),
        node('div', { class: 'stack' }, node('h3', {}, 'Removed columns'), chips(diff.removed))),
      node('p', { class: 'small muted' }, diff.reordered ? 'Shared columns were reordered.' : 'Shared columns have the same relative order.'),
      node('p', { class: 'small muted' }, diff.note))),
    panel('Affected integrations', diff.impacted.length
      ? table(['Integration', 'Owner', 'Required columns removed', 'Unexpected columns', 'Order mismatch'],
        diff.impacted.map(item => [item.integration, item.owner, chips(item.removedRequired), chips(item.unexpectedAdded), item.orderMismatch ? 'Yes' : 'No']))
      : empty('shield', 'No integrations affected', 'No declared header rule flags this change.')));
    announce('Header comparison complete.');
  }, message);
  const form = node('form', { class: 'pad stack', onsubmit: event => { event.preventDefault(); results.replaceChildren(); void compareHeaders(); } },
    node('div', { class: 'two' }, before.field, after.field), node('div', { class: 'actions' }, compare, demo), message);
  return node('div', { class: 'page' },
    pageHeading('Compare exports', 'See what changed between two CSV headers and who is affected.'),
    panel('Exports to compare', form), results);
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^\s*[=+\-@]|\t|\r|\n/.test(text.slice(0, 1)) || /^\s+[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

function historyPage() {
  const box = node('div', {}, working('Loading run history…'));
  const message = node('div', { class: 'notice' });
  const filter = node('select', { 'aria-label': 'Filter run history', disabled: true },
    [['all', 'All outcomes'], ['passed', 'Passed'], ['blocked', 'Blocked'], ['warnings', 'Warnings and advisory']].map(
      ([value, label]) => node('option', { value }, label)));
  const exportButton = button('Export CSV', exportHistory, { glyph: 'download' });
  const refresh = button('Refresh', null, { glyph: 'refresh' });
  let history = [];
  function filtered() {
    if (filter.value === 'passed') return history.filter(run => run.passed);
    if (filter.value === 'blocked') return history.filter(run => run.blocking);
    if (filter.value === 'warnings') return history.filter(run => !run.passed && !run.blocking);
    return history;
  }
  function outcomeText(run) {
    return run.blocking ? 'Blocked' : run.passed ? 'Passed' : run.advisory ? 'Advisory' : 'Warnings';
  }
  function summaries(run) {
    return (run.results || []).map(result => result.integration + ' (' + (result.passed ? 'passed' : 'findings') + ')').join(', ');
  }
  function draw() {
    const rows = filtered();
    exportButton.disabled = !rows.length;
    box.replaceChildren(rows.length
      ? table(['Outcome', 'Run time', 'Records', 'Integration results'], rows.map(run =>
        [outcome(run), dateTime(run.timestamp), count(run.rowsChecked), summaries(run)]))
      : empty('history', history.length ? 'No matching checks' : 'No checks recorded yet',
        history.length ? 'Choose another filter to see more results.' : 'Run a check to start tracking release verdicts.',
        history.length ? null : link('Check an export', '#check', { style: 'btn text' })));
  }
  function exportHistory() {
    const rows = [['Outcome', 'Timestamp', 'Records', 'Integrations'], ...filtered().map(run =>
      [outcomeText(run), run.timestamp, run.rowsChecked, summaries(run)])];
    saveFile('cellar-history.csv', rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n', 'text/csv;charset=utf-8');
  }
  const load = locked(refresh, async () => {
    const data = await api('history');
    history = data.history;
    filter.disabled = false;
    draw();
  }, message);
  filter.addEventListener('change', draw);
  refresh.addEventListener('click', load);
  exportButton.disabled = true;
  void load().then(() => { if (filter.disabled) box.replaceChildren(); });
  return node('div', { class: 'page' },
    pageHeading('Run history', 'Review and export the latest checks from this workspace.', refresh),
    panel('Recorded checks', node('div', {}, node('div', { class: 'pad' }, message), box),
      node('div', { class: 'actions' }, filter, exportButton)));
}

function inboxPage() {
  const summary = node('p', { class: 'muted small wrap' }, 'Loading the watched folder…');
  const box = node('div', {}, working('Loading inbox results…'));
  const notice = node('div', { class: 'notice' });
  const refresh = button('Refresh', null, { glyph: 'refresh' });
  const load = locked(refresh, async () => {
    try {
      const data = await api('live');
      summary.replaceChildren(data.inbox ? ['Watched folder ', node('code', {}, data.inbox)] : 'The server has no watched folder configured.');
      box.replaceChildren(data.entries.length
        ? table(['File', 'Outcome', 'Checked at', 'Findings'], data.entries.map(entry =>
          [node('code', {}, entry.file), outcome(entry), dateTime(entry.at), entry.error || (entry.failing || []).join(', ') || '—']))
        : empty('inbox', 'Inbox is empty', 'Drop a CSV in the watched folder on the Java server to check it automatically.'));
    } catch (error) {
      summary.textContent = 'Could not refresh the watched folder.';
      if (!box.querySelector('table')) box.replaceChildren();
      throw error;
    }
  }, notice);
  refresh.addEventListener('click', load);
  void load();
  const timer = setInterval(() => {
    if (!box.isConnected) { clearInterval(timer); return; }
    if (document.visibilityState === 'visible') void load();
  }, 6000);
  return node('div', { class: 'page' },
    pageHeading('Live inbox', 'Review CSV files checked automatically by your server.', refresh),
    panel('Inbox checks', node('div', {}, node('div', { class: 'pad stack' }, summary, notice), box)));
}

function activityPage() {
  const box = node('div', {}, working('Loading activity…'));
  const message = node('div', { class: 'notice' });
  const verify = button('Verify integrity', null, { glyph: 'shield' });
  const refresh = button('Refresh', null, { glyph: 'refresh' });
  async function load() {
    try {
      const data = await api('activity');
      box.replaceChildren(data.entries.length
        ? table(['Sequence', 'Time', 'Action', 'Actor', 'Detail'], data.entries.map(entry =>
          [entry.seq, dateTime(entry.ts), node('code', {}, entry.action), entry.actor, entry.detail]))
        : empty('activity', 'No activity recorded', 'Checks and contract changes appear in the activity log.'));
    } catch (error) { renderError(box, error, load); }
  }
  refresh.addEventListener('click', locked(refresh, load));
  verify.addEventListener('click', locked(verify, async () => {
    const result = await api('activity/verify');
    setNotice(message, result.ok ? 'Log verified. ' + count(result.entries) + ' entries checked.' :
      'Integrity check failed. ' + result.problem, result.ok ? 'good' : 'bad');
  }, message));
  void load();
  return node('div', { class: 'page' },
    pageHeading('Activity log', 'Trace checks, comparisons, and changes to the active contract.', verify, refresh),
    message, panel('Workspace activity', box));
}

function documentation() {
  const docs = name => repo + '/blob/main/docs/' + name;
  return node('div', { class: 'page' },
    pageHeading('Documentation', 'Set up Cellar, define integration contracts, and run checks before release.'),
    preview ? panel('Run Cellar locally', node('div', { class: 'pad stack' },
      node('p', {}, 'Use Java 21 or newer to run Cellar and check your own exports. The sample checks here use synthetic data.'),
      node('div', { class: 'actions' }, link('Quick start', repo + '#quick-start', { external: true }),
        link('See sample checks', '#check'))))
    : panel('Run your first check', node('div', { class: 'pad stack' },
      node('ol', {},
        node('li', {}, 'Open Check an export and choose Breaking demo.'),
        node('li', {}, 'Run the check and review the integration findings.'),
        node('li', {}, 'Open Contracts to see the rules behind the result.')),
      node('div', { class: 'actions' }, link('Check an export', '#check'), button('Try breaking demo', launchDemo, { glyph: 'play' })))),
    node('div', { class: 'two' },
      panel('Define compatibility', node('div', { class: 'pad stack' },
        node('p', {}, 'Use required columns and field rules to describe what each consumer expects. Use advisory mode to record findings while rolling out new rules.'),
        node('div', {}, link('Contract reference', docs('CONTRACTS.md'), { external: true })))),
      panel('Use Cellar in CI', node('div', { class: 'pad stack' },
        node('p', {}, 'Build with Java 21 and run the CLI against a synthetic export from your pipeline. Exit 0 allows the release, exit 1 blocks it, and exit 2 signals an input error.'),
        node('pre', {}, 'java Build.java package\njava -jar dist/cellar.jar check --csv build/export.csv --summary'),
        node('div', {}, link('CI setup', repo + '#use-it-in-ci', { external: true }))))),
    panel('Server and project references', node('div', { class: 'pad actions' },
      link('Deployment', repo + '#share-it-on-a-server', { external: true }),
      link('Security', docs('WEB_SECURITY.md'), { external: true }),
      link('Roadmap', repo + '#roadmap', { external: true }))));
}

function architecturePage() {
  const components = [
    { id: 'csv', number: '01', name: 'CSV reader', file: 'Csv.java', detail: 'Parses the uploaded export and extracts its header and records. Reports retain structural findings without storing cell values.' },
    { id: 'contract', number: '02', name: 'Contract', file: 'Contract.java', detail: 'Loads the versioned integration schema: required columns, header policy, row limits, and per-column rules.' },
    { id: 'checker', number: '03', name: 'Validation engine', file: 'Checker.java', detail: 'Evaluates each integration against the CSV and produces the findings used by the workspace, reports, CLI, and API.' },
    { id: 'agents', number: '04', name: 'Agents', file: 'Agents.java', detail: 'Runs built-in offline triage, drift, and contract-scout helpers. Optional AI assistance is separate and stays off until configured.' },
    { id: 'report', number: '05', name: 'Release report', file: 'Reports.java', detail: 'Formats the actual validation outcome and findings for people and CI. Exit code 1 blocks; 0 allows; 2 means invalid input.' },
    { id: 'store', number: '06', name: 'Workspace history', file: 'Store.java', detail: 'Persists contracts, revisions, reports, and audit entries while keeping raw CSV cell values out of stored reports.' }
  ];
  const detail = node('div', { class: 'architecture-detail', 'aria-live': 'polite' });
  const stageNodes = components.map((component, index) => node('button', {
    class: 'architecture-node' + (index === 0 ? ' selected' : ''), type: 'button',
    'aria-pressed': index === 0 ? 'true' : 'false', onclick: () => select(component)
  }, node('span', { class: 'step-index' }, component.number), node('strong', {}, component.name),
  node('code', {}, component.file)));
  function select(component) {
    stageNodes.forEach(item => {
      const selected = item.querySelector('strong').textContent === component.name;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    detail.replaceChildren(node('div', { class: 'architecture-detail-copy' },
      node('span', { class: 'eyebrow' }, 'CELLAR COMPONENT'),
      node('h2', {}, component.name), node('p', { class: 'muted' }, component.detail)),
      link('View ' + component.file, 'https://github.com/suryandugy-glitch/Cellar/blob/main/src/main/java/io/cellar/' + component.file, { external: true, style: 'btn compact' }));
  }
  select(components[0]);
  return node('div', { class: 'page' },
    pageHeading('Architecture', 'A CSV moves through the same validation engine in the workspace, API, CLI, and CI.'),
    node('section', { class: 'architecture-panel panel pad' },
      node('div', { class: 'architecture-intro' }, node('span', { class: 'eyebrow' }, 'FROM EXPORT TO DECISION'),
        node('h2', {}, 'One contract check. A traceable release decision.'),
        node('p', { class: 'muted' }, 'Select a component to see its role and the implementation behind it.')),
      node('div', { class: 'architecture-flow', role: 'group', 'aria-label': 'Cellar validation pipeline' }, stageNodes),
      detail),
    node('div', { class: 'two' },
      panel('One engine across entry points', node('div', { class: 'pad stack' },
        node('p', {}, 'The Java workspace and HTTP API call the same checker used by the command line. CI can run that CLI against a synthetic export from the real exporter.'),
        node('div', { class: 'actions' }, link('Check an export', '#check', { style: 'btn primary' }), link('CLI commands', '#cli', { style: 'btn' })))),
      panel('Data boundary', node('div', { class: 'pad stack' },
        node('p', {}, 'Cell values are processed for the check but not retained in reports. Reports contain structural details such as column names, counts, and record numbers.'),
        link('Security notes', repo + '/blob/main/docs/WEB_SECURITY.md', { style: 'btn text compact', external: true })))));
}

function featuresPage() {
  const features = [
    ['Pilot onboarding', 'Follow a measured rollout from choosing one export through reviewing findings and agreeing before enabling a blocking gate.', '#setup'],
    ['Contract validation', 'Required and allowed headers, exact order, types, ranges, enums, non-empty and unique values, and row-count limits.', '#contracts'],
    ['Triage and explanations', 'Offline built-in agents identify suspicious header renames and explain safe compatibility steps.', '#check'],
    ['Release gate', 'Every check returns a real pass or block decision. CLI exit codes are 0 allowed, 1 blocked, and 2 invalid input.', '#check'],
    ['Reports and history', 'Review findings, download reports, filter recent runs, and compare changes against a passing baseline.', '#history'],
    ['Drift watch', 'Compare the candidate export with its previous shape and flag added, missing, or changed headers.', '#compare'],
    ['Contract Scout', 'Draft a contract from CSV headers, then review it before saving to the active contract.', '#check'],
    ['Live inbox', 'Automatically validate CSV files added to the configured local inbox directory.', '#inbox'],
    ['CLI and CI', 'Run the same contract validation locally and in a workflow without requiring a hosted account.', '#cli'],
    ['Contract revisions', 'Reject stale edits, review saved revisions, and restore a previous contract version.', '#contracts'],
    ['Privacy boundary', 'Reports retain structural findings; raw CSV cell values are not stored in validation history.', '#docs'],
    ['Optional AI', 'AI explanations can summarize findings or suggest fixes when configured. Built-in rules work offline and remain separate.', '#docs'],
    ['Activity integrity', 'Review configuration changes and verify the chained activity log from the workspace.', '#activity']
  ];
  return node('div', { class: 'page' },
    pageHeading('Features', 'A product map of Cellar’s implemented checks, release controls, and operating tools.'),
    node('div', { class: 'feature-grid-workspace' }, features.map(([title, description, href], index) =>
      node('article', { class: 'feature-card-workspace' }, node('span', { class: 'step-index' }, String(index + 1).padStart(2, '0')),
        node('h2', {}, title), node('p', { class: 'muted' }, description), link('Open ' + title, href, { style: 'btn text compact' })))),
    node('div', { class: 'notice feature-boundary' }, 'Offline rules are Cellar’s default. Optional AI uses your configured provider and receives no CSV cell values.'));
}

function cliPage() {
  const message = node('div', { class: 'notice' });
  const commands = [
    ['Start workspace', 'java -jar dist/cellar.jar web', 'Runs the local workspace.'],
    ['Check an export', 'java -jar dist/cellar.jar check --csv build/sales.csv --summary --format markdown', 'Checks headers and row rules, writes a summary, and returns the release-gate exit code.'],
    ['Compare exports', 'java -jar dist/cellar.jar diff --baseline build/previous.csv --csv build/current.csv', 'Reports structural changes between a known baseline and candidate export.'],
    ['Validate contract', 'java -jar dist/cellar.jar validate', 'Checks the active contract before using it.'],
    ['Create sample contract', 'java -jar dist/cellar.jar init', 'Creates cellar.json only when one does not already exist.'],
    ['Generate synthetic CSV', 'java -jar dist/cellar.jar export-demo --out build/sales.csv', 'Writes a synthetic example. Add --demo-break to remove the inventory order_id column.'],
    ['Read local history', 'java -jar dist/cellar.jar history', 'Prints the latest locally saved check summaries.'],
    ['Verify activity chain', 'java -jar dist/cellar.jar audit-verify', 'Checks the tamper-evident activity log when the master key is configured.']
  ];
  return node('div', { class: 'page' },
    pageHeading('CLI commands', 'Run the same Java validation engine from a terminal or CI job.', link('CI example', repo + '#use-it-in-ci', { external: true })),
    node('section', { class: 'cli-intro panel pad' }, node('span', { class: 'eyebrow' }, 'JAVA 21+ · NO EXTRA RUNTIME DEPENDENCIES'),
      node('h2', {}, 'Make the release gate repeatable.'),
      node('p', { class: 'muted' }, 'Commands below match the CLI accepted by this repository. Copy one and replace example file paths with your generated export.'),
      node('p', { class: 'notice', role: 'note' }, 'Exit codes: 0 allowed · 1 blocked · 2 invalid input.')),
    message,
    node('div', { class: 'cli-grid' }, commands.map(([title, command, detail]) =>
      node('article', { class: 'cli-card panel' }, node('div', { class: 'panel-head' }, node('h2', {}, title),
        button('Copy command', () => void copy(command, message), { style: 'compact' })),
      node('div', { class: 'pad stack' }, node('p', { class: 'muted small' }, detail), node('pre', {}, command))))),
    panel('Full command help', node('div', { class: 'pad stack' },
      node('pre', {}, 'java -jar dist/cellar.jar --help'),
      node('p', { class: 'muted small' }, 'Use --config and --data on commands that support them; --help lists each option.'))));
}

function whyPage() {
  const rows = [
    ['Find the affected consumer', 'Read exporter code and compare files manually.', 'Cellar names each integration whose declared contract fails.'],
    ['Explain the change', 'Trace a header or value through customer-specific requirements.', 'Findings name the rule, column, and record where available.'],
    ['Decide whether to ship', 'Agree on a decision in code review or a custom script.', 'Use the check verdict locally or its exit code in CI.'],
    ['Repeat the check', 'Recreate the command and keep reports separately.', 'Save run history and compare against a passing baseline.']
  ];
  return node('div', { class: 'page' },
    pageHeading('Why Cellar', 'Keep the consumer contract beside the export check so release decisions are easy to explain.'),
    node('section', { class: 'why-intro panel pad' }, node('span', { class: 'eyebrow' }, 'A QUALITATIVE WORKFLOW COMPARISON'),
      node('h2', {}, 'Make CSV compatibility part of the release path.'),
      node('p', { class: 'muted' }, 'This describes the workflow Cellar supports. It is not a benchmark or a claim that every check catches every downstream issue.')),
    panel('Manual diagnosis and a contract-based check', table(['Task', 'Ad-hoc manual workflow', 'With Cellar'], rows)),
    node('div', { class: 'actions' }, link('Try a breaking demo', '#check', { style: 'btn primary' }), link('See the architecture', '#architecture', { style: 'btn' })));
}

function backToTopControl() {
  const control = button('Back to top', () => window.scrollTo({
    top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  }), { style: 'square back-to-top', glyph: 'arrowUp' });
  control.hidden = true;
  control.setAttribute('aria-label', 'Back to top');
  document.body.append(control);
  control.hidden = window.scrollY < 360;
  let frame = 0;
  window.addEventListener('scroll', () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      control.hidden = window.scrollY < 360;
      frame = 0;
    });
  }, { passive: true });
}

function gate() {
  const message = node('div', { class: 'notice' });
  const input = node('input', { type: 'password', id: 'access-key', required: true, autocomplete: 'off' });
  const submit = button('Unlock workspace', null, { style: 'primary', type: 'submit', glyph: 'lock' });
  const open = locked(submit, async () => {
    state.accessKey = input.value;
    try { await api('config'); }
    catch (error) { state.accessKey = ''; throw error; }
    storageWrite('sessionStorage', keyStorage, state.accessKey);
    render(true);
  }, message);
  return node('main', { class: 'panel gate stack', id: 'main-content' }, brand(),
    node('h1', {}, 'Unlock Cellar'),
    node('p', { class: 'muted' }, 'Enter the shared access key for this Cellar server.'),
    node('form', { class: 'stack', onsubmit: event => { event.preventDefault(); void open(); } },
      node('div', { class: 'fields' }, node('label', { for: input.id }, 'Access key'), input), submit, message));
}

const views = { overview, check: preview ? sampleCheck : checkPage,
  contracts: contractsPage, compare: comparePage, history: historyPage,
  inbox: inboxPage, activity: activityPage, docs: documentation,
  architecture: architecturePage, features: featuresPage, cli: cliPage, why: whyPage, setup: setupPage };

function render(focus = false) {
  if (!preview && (!state.session || (state.session.keyRequired && !state.accessKey))) {
    if (state.session) {
      root.replaceChildren(gate());
      if (focus) document.querySelector('#access-key')?.focus();
    }
    return;
  }
  const id = sectionId();
  root.replaceChildren(shell(id, views[id]()));
  document.title = sections.find(section => section[0] === id)[1] + ' | Cellar';
  if (focus) {
    document.querySelector('#main-content').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

async function connect() {
  state.session = null;
  root.replaceChildren(node('p', { class: 'boot', role: 'status' }, 'Connecting to Cellar…'));
  try {
    state.session = await api('session');
    if (apiOrigin && state.session.keyRequired !== true) {
      throw new Error('The connected Java workspace must require an access key.');
    }
    state.accessKey = state.session.keyRequired ? storageRead('sessionStorage', keyStorage) || '' : '';
    if (state.accessKey) {
      try { await api('config'); }
      catch (error) { if (state.accessKey) throw error; }
    }
    render();
  } catch (error) {
    state.session = null;
    root.replaceChildren(node('main', { class: 'panel gate stack', id: 'main-content' },
      brand(), node('h1', {}, 'Connection unavailable'), node('p', { class: 'muted', role: 'alert' }, error.message),
      node('p', { class: 'muted' }, apiOrigin
        ? 'Check that the Java API is online and allows this site’s HTTPS origin.'
        : 'Start Cellar and open the address printed by the Java server.'),
      node('div', {}, button('Retry connection', connect, { style: 'primary', glyph: 'refresh' }))));
  }
}

document.querySelector('.skip-link').addEventListener('click', event => {
  const main = document.querySelector('#main-content');
  if (!main) return;
  event.preventDefault();
  main.tabIndex = -1;
  main.focus();
});
window.addEventListener('hashchange', () => render(true));
document.addEventListener('keydown', event => {
  if ((preview || (state.session && (!state.session.keyRequired || state.accessKey))) &&
    (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    palette();
  }
});
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.matchMedia('(pointer: fine)').matches) {
  let pointerFrame = 0;
  let pointer = null;
  document.addEventListener('pointermove', event => {
    pointer = { x: event.clientX, y: event.clientY };
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--pointer-x', pointer.x + 'px');
      document.documentElement.style.setProperty('--pointer-y', pointer.y + 'px');
      pointerFrame = 0;
    });
  }, { passive: true });
}
setTheme(storageRead('localStorage', 'cellar_theme') || 'dark');
backToTopControl();
if (preview) render();
else void connect();
