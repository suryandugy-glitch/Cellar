'use strict';
/* Cellar web UI. Presentation only: rules, checks and agents run on the server. Text is only inserted as text nodes; the CSP forbids inline script and style. */
(function () {
  var root = document.getElementById('app');
  var state = { page: 'home', doc: 'intro', csv: '', advisory: false, result: null, scout: null, before: '', after: '' };
  var store = { get: function (k) { try { return sessionStorage.getItem(k) || localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} } };
  document.documentElement.setAttribute('data-theme', store.get('cellar_theme') || 'dark');

  function h(tag, attrs) { var el = document.createElement(tag); for (var k in (attrs || {})) { var v = attrs[k]; if (k === 'class') el.className = v; else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v); else if (v === true) el.setAttribute(k, ''); else if (v !== false && v != null) el.setAttribute(k, v); } for (var i = 2; i < arguments.length; i++) add(el, arguments[i]); return el; }
  function add(el, c) { if (c == null || c === false) return; if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; } el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function glass(cls) { return 'glass ' + (cls || ''); }

  function api(method, path, body) {
    var headers = { 'Accept': 'application/json' }, key = store.get('cellar_key');
    if (key) headers['X-Access-Key'] = key;
    var opts = { method: method, headers: headers, cache: 'no-store' };
    if (method !== 'GET') { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body || {}); }
    return fetch(path, opts).then(function (r) { return r.json().catch(function () { return { error: 'Unexpected response from server.' }; }).then(function (d) {
      if (r.status === 401) { store.set('cellar_key', '', true); route(true); throw new Error('Access key needed.'); }
      if (!r.ok) throw new Error(d.error || 'Request failed (' + r.status + ').'); return d; }); });
  }
  function toast(text) { var t = h('div', { class: glass('toast'), role: 'status' }, text); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }
  function copy(text) { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast('Copied'); }, function () { toast('Copy not available here'); }); }
  function notice(kind, text) { return h('div', { class: 'msg ' + kind, role: kind === 'bad' ? 'alert' : 'status' }, text); }
  function showError(box, e) { clear(box); box.appendChild(notice('bad', e.message || 'Something went wrong.')); }
  function download(name, text, type) { var a = h('a', { href: URL.createObjectURL(new Blob([text], { type: type })), download: name }); document.body.appendChild(a); a.click(); a.remove(); }
  function th(list) { return h('thead', {}, h('tr', {}, list.map(function (x) { return h('th', {}, x); }))); }

  // ---------- navigation ----------
  var REPO = 'https://github.com/suryandugy-glitch/Cellar';
  var SITE = [['home', 'Home'], ['features', 'Features'], ['docs', 'Docs'], ['roadmap', 'Roadmap']];
  var APP = [['check', 'Check'], ['contracts', 'Contracts'], ['diff', 'Compare'], ['history', 'History'], ['live', 'Live inbox'], ['activity', 'Activity']];
  var PAGES = SITE.concat(APP);
  function go(p) { location.hash = '#' + p; }
  function ext(href, label, cls) { return h('a', { class: cls || 'chip', href: href, target: '_blank', rel: 'noopener noreferrer' }, label); }
  function shell(body) {
    var inApp = APP.some(function (p) { return p[0] === state.page; });
    function tabs(list, label) { return h('nav', { class: 'tabs', 'aria-label': label }, list.map(function (p) { return h('button', { 'aria-current': state.page === p[0] ? 'page' : null, onclick: function () { go(p[0]); } }, p[1]); })); }
    return h('div', {}, h('header', { class: glass('top') }, h('img', { src: '/logo.svg', alt: '' }), h('span', { class: 'brand', onclick: function () { go('home'); } }, 'Cellar'), tabs(SITE, 'Site'), h('span', { class: 'spacer' }),
      h('button', { class: 'chip', onclick: palette, 'aria-label': 'Search the docs and commands' }, 'Search ', h('kbd', {}, 'Ctrl K')), ext(REPO, 'GitHub'), h('button', { class: 'chip', onclick: toggleTheme, 'aria-label': 'Toggle theme' }, 'Theme'),
      h('button', { class: 'btn primary nowrap', onclick: function () { go('check'); } }, 'Open the app')),
      h('main', {}, inApp ? h('div', { class: glass('subnav') }, tabs(APP, 'Workbench')) : null, body),
      h('footer', {}, h('div', {}, 'Cellar ' + (state.version || '') + ' · MIT licensed · agents run offline on your own server · no cell values are stored'), h('div', {}, ext(REPO, 'GitHub repository'), ' ', ext(REPO + '/issues', 'Report an issue'), ' ', ext(REPO + '/releases', 'Releases'))));
  }
  function toggleTheme() { var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', t); store.set('cellar_theme', t); }

  // ---------- command palette (pages, docs, actions) ----------
  function palette() {
    var items = PAGES.map(function (p) { return ['Go to ' + p[1], function () { go(p[0]); }]; })
      .concat(DOCS.map(function (d) { return ['Docs: ' + d.title, function () { state.doc = d.id; go('docs'); route(); }]; }))
      .concat([['Run the breaking demo', function () { demo('bad', true); }], ['Run the passing demo', function () { demo('ok', true); }], ['Toggle theme', toggleTheme], ['Open GitHub repository', function () { window.open(REPO, '_blank', 'noopener'); }], ['Copy start command', function () { copy('sh run.sh'); }]]);
    var list = h('div'), input = h('input', { type: 'text', placeholder: 'Search docs and commands…', 'aria-label': 'Search' }), sel = 0, shown = [];
    var wrap = h('div', { class: 'pal', onclick: function (e) { if (e.target === wrap) wrap.remove(); } }, h('div', { class: glass('box') }, input, list));
    function draw() { clear(list); shown = items.filter(function (i) { return i[0].toLowerCase().indexOf(input.value.toLowerCase()) >= 0; }).slice(0, 9); sel = Math.min(sel, Math.max(0, shown.length - 1));
      shown.forEach(function (i, n) { list.appendChild(h('button', { class: n === sel ? 'sel' : '', onclick: function () { wrap.remove(); i[1](); } }, i[0])); }); }
    input.addEventListener('input', function () { sel = 0; draw(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') wrap.remove(); else if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); } else if (e.key === 'Enter' && shown[sel]) { wrap.remove(); shown[sel][1](); } });
    document.body.appendChild(wrap); draw(); input.focus();
  }
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!document.querySelector('.pal')) palette(); } });

  // ---------- home: plain language ----------
  function homeView() {
    function card(t, d, b) { return h('div', { class: glass('card lift') }, b ? h('span', { class: 'badge' }, b) : null, h('h3', {}, t), h('p', { class: 'muted' }, d)); }
    function step(n, t, d) { return h('div', { class: glass('card lift') }, h('div', { class: 'num' }, n), h('h3', {}, t), h('p', { class: 'muted' }, d)); }
    var faq = [['Do I need to be a developer?', 'To set it up once, a little. To use it day to day, no. You paste or drop a file, press Check, and read a plain-English result.'], ['Does it store my customers’ data?', 'No. It only looks at column names and counts. Cell values are never saved or shown in reports.'], ['Does it need the internet or an AI account?', 'No. Everything runs on your own computer or server. The helper agents are built-in rules, not a cloud service.'], ['What is a “contract”?', 'A short list that says what each customer’s report needs from your file: which columns, and what kind of values. You write it once.'], ['Is it free?', 'Yes. It is open source under the MIT license. The code is on GitHub.']];
    return h('div', {},
      h('section', { class: 'hero' }, ext(REPO + '/releases', 'v' + (state.version || '3.0') + ' released', 'pill'),
        h('h1', {}, 'Don’t let a small file change ', h('span', { class: 'grad' }, 'break your customers.')),
        h('p', { class: 'lead' }, 'Cellar is a safety check for CSV files (the spreadsheets your software sends to other people’s tools). Before you ship a change, it tells you in plain words who would break and what to do about it.'),
        h('div', {}, h('button', { class: 'btn primary', onclick: function () { demo('bad', true); } }, 'See it catch a problem'), h('button', { class: 'btn', onclick: function () { go('docs'); } }, 'Read the docs'), ext(REPO, 'Star on GitHub', 'btn')),
        h('div', { class: glass('cmd') }, h('code', {}, '$ sh run.sh'), h('button', { class: 'btn', onclick: function () { copy('sh run.sh'); } }, 'Copy'), h('span', { class: 'muted small' }, 'Windows: run.bat · needs Java 21+')),
        h('div', { class: glass('term') }, h('div', { class: 'bar' }, h('span', { class: 'dot' }), h('span', { class: 'dot y' }), h('span', { class: 'dot g' }), ' what you see'),
          h('pre', {}, h('span', { class: 'fail' }, 'FAIL'), '  Inventory report needs “order_id”\n', h('span', { class: 'pass' }, 'PASS'), '  Finance summary is fine\n', h('span', { class: 'dim' }, 'Helper: “order_id” was probably renamed to “id”.\nVerdict: do not ship yet.')))),
      h('h2', {}, 'In plain words'), h('div', { class: glass('card') }, h('p', {}, 'Think of Cellar as ', h('strong', {}, 'spell-check for the files other software reads'), '. Your app makes a CSV file. Your customers’ tools read it and expect certain columns. If someone renames or removes a column, nothing looks wrong on your side, but their import quietly fails days later.'), h('p', { class: 'muted' }, 'Cellar catches that on your side, before release, and names the customer report that would break.')),
      h('h2', {}, 'A real example'), h('div', { class: glass('card') }, h('p', {}, 'A developer renames ', h('code', {}, 'order_id'), ' to ', h('code', {}, 'id'), '. Her tests pass. A week later the client’s weekly stock report fails to import. With Cellar, the same change is flagged the moment it is proposed: “Inventory report needs order_id. Likely renamed to id. Keep both until the report is updated.”')),
      h('h2', {}, 'Who it is for'), h('div', { class: 'grid' }, card('Small software agencies', 'You send recurring exports to several clients and want to stop fixing surprise breakages.'), card('Team leads and owners', 'You want a clear ship or do-not-ship answer without reading code.'), card('Developers and support', 'You want the exact column, the likely cause and a ready-to-paste note for the ticket.')),
      h('h2', {}, 'How it works'), h('div', { class: 'grid' }, step('1', 'Tell it what customers need', 'Write a short contract once, or let the Scout helper draft it from a sample file.'), step('2', 'Check your file', 'Drop a CSV in the app, run the command in CI, or put it in the Live inbox folder.'), step('3', 'Read the answer', 'Green means safe. Red names the customer, the column and what to do.')),
      h('h2', {}, 'What you get'), h('div', { class: 'grid' }, card('Automatic helper agents', 'Triage spots renames, Release gate says ship or block, Reporter writes the note, Drift watch notices changes since last time.', 'Automatic'), card('AI agents (optional)', 'Plain-language explanations, a message to the owner, contract review and Q&A. Never sees your rows.', 'Optional'), card('Live inbox', 'Drop CSV files in a folder and they are checked automatically within seconds.', 'Automatic'), card('Contract editor and revisions', 'Edit rules safely. Two people can’t overwrite each other.', 'Available'), card('Compare two files', 'See added, removed and reordered columns and who is affected.', 'Available'), card('History and activity', 'Trend chart of recent checks and a tamper-evident log.', 'Available'), card('Works in CI', 'Same engine on the command line with simple exit codes for GitHub Actions.', 'Available')),
      h('h2', {}, 'Cellar vs doing it by hand'), h('div', { class: glass('card scroll') }, h('table', {}, th(['Task', 'By hand', 'With Cellar']), h('tbody', {}, [['Noticing a break', 'A customer complains', 'The check fails before release'], ['Finding the cause', 'Compare files line by line', 'Names the column and likely rename'], ['Knowing who to tell', 'Ask around', 'Owner is written in the contract'], ['Writing it up', 'Copy things into a ticket', 'One-click pull request note'], ['Catching it again later', 'Hope someone remembers', 'Runs on every change, automatically']].map(function (r) { return h('tr', {}, r.map(function (c) { return h('td', {}, c); })); })))),
      h('h2', {}, 'Common questions'), faq.map(function (q) { return h('details', { class: glass('card faq') }, h('summary', {}, q[0]), h('p', { class: 'muted' }, q[1])); }),
      h('div', { class: glass('card cta') }, h('h2', {}, 'Make your exports safer today'), h('p', { class: 'muted' }, 'Open source, runs on your machine, no sign-in.'), h('button', { class: 'btn primary', onclick: function () { go('check'); } }, 'Open the app'), ext(REPO, 'Explore on GitHub', 'btn')));
  }

  // ---------- features ----------
  function featuresView() {
    var F = [['Checks', 'Contract checks', 'Columns, types, ranges, allowed values, unique and not-empty rules, row counts.', 'Available'], ['Agents', 'Triage agent', 'Detects likely column renames and suggests a safe migration.', 'Available'], ['Agents', 'Release gate agent', 'Plain ship or block verdict on every run.', 'Available'], ['Agents', 'Reporter agent', 'Writes the pull request comment for you.', 'Available'], ['Agents', 'Drift watch agent', 'Compares every export with the last passing one.', 'Available'], ['Agents', 'Scout agent', 'Drafts a contract from a sample CSV.', 'Available'], ['Automation', 'Live inbox', 'Folder watcher checks new CSV files within seconds.', 'Available'], ['Automation', 'CLI and CI', 'check, diff, validate, export-demo with exit codes 0, 1, 2.', 'Available'], ['Team', 'Revision-guarded contracts', 'Stale edits are rejected, every revision is listed.', 'Available'], ['Team', 'Activity log', 'Chained log that shows if it was edited.', 'Available'], ['Safety', 'No cell values stored', 'Reports hold column names, counts and record numbers only.', 'Available'], ['Safety', 'Encrypted storage and limits', 'AES-256-GCM at rest, size limits, rate limits, optional access key.', 'Available'], ['Safety', 'Per-customer workspaces', 'Separate contracts per client repository.', 'Planned'], ['Team', 'Slack and email alerts', 'Tell the owner when their report is at risk.', 'Planned']];
    return h('div', {}, h('h1', {}, 'Features'), h('p', { class: 'muted' }, 'Everything marked Available is in this repository today.'), h('div', { class: 'grid' }, F.map(function (f) { return h('div', { class: glass('card lift') }, h('span', { class: 'badge ' + (f[3] === 'Planned' ? 'plan' : '') }, f[3]), ' ', h('span', { class: 'muted small' }, f[0]), h('h3', {}, f[1]), h('p', { class: 'muted' }, f[2])); })));
  }

  // ---------- roadmap ----------
  function roadmapView() {
    var R = [['Now', ['Contract checks and compare', 'Automatic agents and Live inbox', 'Docs and command palette', 'Shared access key for servers']], ['Next', ['Scoped API tokens for CI', 'Per-repository workspaces', 'Restore an older contract revision', 'Alerts to Slack and email']], ['Later', ['GitHub App with pull request comments', 'Other file formats (JSON, XML)', 'Optional AI explanations you can turn on', 'Sign-in with SSO for larger teams']]];
    return h('div', {}, h('h1', {}, 'Roadmap'), h('p', { class: 'muted' }, 'Plans can change. Ideas and votes are welcome on GitHub.'), h('div', { class: 'grid' }, R.map(function (c) { return h('div', { class: glass('card') }, h('span', { class: 'badge' }, c[0]), h('ul', {}, c[1].map(function (x) { return h('li', {}, x); }))); })), ext(REPO + '/issues', 'Suggest a feature', 'btn'));
  }

  // ---------- docs ----------
  var CI = 'name: cellar\non: pull_request\npermissions:\n  contents: read\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-java@v4\n        with: { distribution: temurin, java-version: 21 }\n      - run: java Build.java package\n      - run: java -jar dist/cellar.jar export-demo --out build/sales.csv\n      - run: java -jar dist/cellar.jar check --csv build/sales.csv --summary --format markdown';
  var CONTRACT = '{\n  "version": 2,\n  "integrations": [\n    {\n      "id": "inventory-report",\n      "owner": "Inventory team",\n      "required": ["order_id", "sku"],\n      "rules": { "order_id": { "notEmpty": true, "unique": true } }\n    }\n  ]\n}';
  var DOCS = [
    { id: 'intro', title: 'Introduction', body: [['p', 'Cellar checks the CSV files your software produces against what each customer workflow needs, and tells you in plain language who would break before you ship.'], ['h', 'Who is it for?'], ['p', 'Agencies and product teams that send recurring exports to customers or other systems.'], ['h', 'What it is not'], ['p', 'It checks column names and the rules you declare. A pass does not prove every value is right for every importer.']] },
    { id: 'quick', title: 'Quick start', body: [['p', 'You need Java 21 or newer.'], ['code', 'sh run.sh'], ['p', 'On Windows run run.bat. Open the address it prints (usually http://127.0.0.1:8080). There is no sign-in.'], ['list', ['Open Check and press “Breaking demo”, then Run check.', 'Read the result: Inventory fails, Finance passes.', 'Open Contracts to see and edit the rules.']]] },
    { id: 'install', title: 'Installation', body: [['p', 'Download or clone the repository, then run the start script. The first run builds dist/cellar.jar.'], ['code', 'git clone ' + REPO + '.git\ncd Cellar\nsh run.sh'], ['p', 'Manual build with tests:'], ['code', 'java Build.java test'], ['p', 'If port 8080 is busy Cellar tries the next ports automatically, or use --port 9090.']] },
    { id: 'contracts', title: 'Contracts', body: [['p', 'A contract lists integrations (customer workflows) and what each needs.'], ['code', CONTRACT], ['list', ['required: columns that must exist.', 'rules: per column, type (string, integer, decimal, boolean, date, datetime), notEmpty, unique, enum, min, max.', 'minRows, maxRows: row count limits. severity: error blocks, warning does not.', 'allowed and order: lock the exact extra columns or column order.']]] },
    { id: 'cli', title: 'CLI commands', body: [['p', 'Same engine as the web app. Exit code 0 is ok, 1 is blocked, 2 is invalid input.'], ['code', 'java -jar dist/cellar.jar web [--port N]'], ['code', 'java -jar dist/cellar.jar check --csv FILE --format text|json|markdown [--advisory] [--summary]'], ['code', 'java -jar dist/cellar.jar diff --baseline OLD.csv --csv NEW.csv'], ['code', 'java -jar dist/cellar.jar validate'], ['code', 'java -jar dist/cellar.jar export-demo --out build/sales.csv [--demo-break]'], ['code', 'java -jar dist/cellar.jar audit-verify']] },
    { id: 'ci', title: 'GitHub Actions', body: [['p', 'Run the check on every pull request. Point the export step at your real exporter with synthetic data.'], ['code', CI]] },
    { id: 'agents', title: 'Agents', body: [['p', 'Agents are built-in, offline rules. They run automatically on every check and never see cell values.'], ['list', ['Triage: finds likely renamed columns.', 'Release gate: ship or block.', 'Reporter: pull request comment.', 'Drift watch: changes since the last passing export.', 'Scout: drafts a contract from a sample CSV (Check page).']]] },
    { id: 'ai', title: 'AI agents', body: [['p', 'Optional. Off by default. Turn on by giving the server an API key. The AI never sees your CSV rows: it gets the contract, column names, counts and rule results only.'], ['code', 'CELLAR_AI_KEY=your-key\nCELLAR_AI_PROVIDER=anthropic      # or openai (any OpenAI-compatible URL)\nCELLAR_AI_MODEL=claude-sonnet-5-5  # optional\nCELLAR_AI_URL=                     # optional, https only'], ['list', ['Explain for my team: plain-language summary of a check.', 'Draft a message to the owner: ready to send.', 'Review my contract: up to 5 improvements.', 'Ask: free questions about the latest result and contract (500 characters).']], ['p', 'Limits: a few requests per minute, short answers, and text inside files is treated as data, not instructions. Always review AI output before acting on it.']] },
    { id: 'inbox', title: 'Live inbox', body: [['p', 'Drop any .csv into the inbox folder and it is checked automatically within a couple of seconds. Results appear on the Live inbox page and in History.'], ['code', 'data/inbox/   (or set CELLAR_INBOX=/path/to/folder)'], ['p', 'Files over 8 MiB, non-CSV files and shortcuts (symlinks) are ignored.']] },
    { id: 'deploy', title: 'Deploy and security', body: [['p', 'Local use needs no settings. To share on a network set these, and put Cellar behind HTTPS.'], ['code', 'CELLAR_BIND=0.0.0.0\nCELLAR_PUBLIC_URL=https://cellar.example.com\nCELLAR_ACCESS_KEY=a-long-shared-key\nCELLAR_TRUST_PROXY=true\nCELLAR_DATA=/var/lib/cellar\nCELLAR_MASTER_KEY=<base64 of 32 random bytes>'], ['list', ['Without CELLAR_ACCESS_KEY it refuses to listen beyond localhost.', 'Data is encrypted at rest. Back up the data folder and the master key together.', 'Built-in protections: host and origin checks, rate limits, body size limits, strict content security policy.', 'No independent security audit has been done.']]] },
    { id: 'api', title: 'API', body: [['p', 'JSON over HTTP. Send X-Access-Key if one is configured. POST and PUT need an Origin header from the same site.'], ['code', 'GET  /api/health   /api/session   /api/stats   /api/live\nGET  /api/config   /api/revisions /api/history /api/activity\nPUT  /api/config   {config, revision}\nPOST /api/check    {csv, advisory}\nPOST /api/diff     {before, after}\nPOST /api/scout    {csv}']] },
    { id: 'trouble', title: 'Troubleshooting', body: [['h', '“Operation failed” on start'], ['p', 'Read the DETAIL line under it. Common causes: Java older than 21, or a folder you can’t write to. Use --data to pick another folder.'], ['h', 'Port in use'], ['p', 'Cellar tries the next ports. Or run with --port 9090.'], ['h', 'Access key asked on localhost'], ['p', 'CELLAR_ACCESS_KEY is set in your environment. Unset it for no-login mode.'], ['h', 'Check says a column is missing but it is there'], ['p', 'Names must match exactly, including capital letters and spaces.']] }
  ];
  function docBlock(b) {
    if (b[0] === 'p') return h('p', {}, b[1]); if (b[0] === 'h') return h('h3', {}, b[1]); if (b[0] === 'list') return h('ul', {}, b[1].map(function (x) { return h('li', {}, x); }));
    return h('div', { class: 'codeblock' }, h('button', { class: 'btn', onclick: function () { copy(b[1]); } }, 'Copy'), h('pre', {}, b[1]));
  }
  function docsView() {
    var cur = DOCS.filter(function (d) { return d.id === state.doc; })[0] || DOCS[0], i = DOCS.indexOf(cur), q = h('input', { type: 'text', placeholder: 'Filter docs…', 'aria-label': 'Filter docs' }), side = h('nav', { class: 'side', 'aria-label': 'Docs' });
    function drawSide() { clear(side); DOCS.filter(function (d) { var t = q.value.toLowerCase(); return !t || (d.title + JSON.stringify(d.body)).toLowerCase().indexOf(t) >= 0; }).forEach(function (d) { side.appendChild(h('button', { 'aria-current': d.id === cur.id ? 'page' : null, onclick: function () { state.doc = d.id; route(); } }, d.title)); }); }
    q.addEventListener('input', drawSide); drawSide();
    return h('div', { class: 'docs' }, h('div', { class: glass('card sidebox') }, q, side, ext(REPO, 'View on GitHub', 'btn')),
      h('article', { class: glass('card doc') }, h('h1', {}, cur.title), cur.body.map(docBlock),
        h('div', { class: 'pager' }, i > 0 ? h('button', { class: 'btn', onclick: function () { state.doc = DOCS[i - 1].id; route(); } }, '← ' + DOCS[i - 1].title) : h('span'), i < DOCS.length - 1 ? h('button', { class: 'btn', onclick: function () { state.doc = DOCS[i + 1].id; route(); } }, DOCS[i + 1].title + ' →') : null)));
  }

  // ---------- live inbox ----------
  function liveView() {
    var box = h('div'), info = h('p', { class: 'muted small' }), timer;
    function load() { api('GET', '/api/live').then(function (d) { info.textContent = 'Watching folder: ' + d.inbox + ' (checks new or changed .csv files automatically)'; clear(box);
      box.appendChild(d.entries.length ? h('div', { class: 'scroll' }, h('table', {}, th(['When', 'File', 'Result', 'Failing integrations']), h('tbody', {}, d.entries.map(function (e) { return h('tr', {}, h('td', {}, e.at), h('td', {}, h('code', {}, e.file)), h('td', {}, e.error ? h('span', { class: 'status warn' }, 'ERROR') : h('span', { class: 'status ' + (e.blocking ? 'fail' : e.passed ? 'pass' : 'warn') }, e.blocking ? 'BLOCKED' : e.passed ? 'PASSED' : 'WARN')), h('td', {}, e.error || (e.failing || []).join(', ') || '—')); })))) : h('p', { class: 'muted' }, 'Nothing yet. Drop a CSV file into the folder above.')); }).catch(function (e) { clearInterval(timer); showError(box, e); }); }
    load(); timer = setInterval(function () { if (!document.body.contains(box)) clearInterval(timer); else load(); }, 3000);
    return h('div', {}, h('h1', {}, 'Live inbox'), h('div', { class: glass('card') }, info, box));
  }

  // ---------- check ----------
  var WHY = { MISSING_COLUMN: 'A column your customer needs is not in this file.', EMPTY_VALUE: 'A required cell is blank.', DUPLICATE_VALUE: 'Two rows share a value that must be unique.', INVALID_TYPE: 'A value is the wrong kind (for example text where a number is expected).', ENUM_VALUE: 'A value is not in the list of allowed values.', BELOW_MIN: 'A number is lower than allowed.', ABOVE_MAX: 'A number is higher than allowed.', UNEXPECTED_COLUMN: 'The file has a column this customer did not agree to.', COLUMN_ORDER: 'Columns are in a different order than this customer expects.', MIN_ROWS: 'The file has too few rows.', MAX_ROWS: 'The file has too many rows.' };
  function aiPanel(getReport) {
    var out = h('div', { class: 'aiout' }), q = h('input', { type: 'text', maxlength: '500', placeholder: 'Ask about this result or your contract…', 'aria-label': 'Question for the AI helper' });
    function ask(task, question) { clear(out); out.appendChild(h('p', { class: 'muted' }, 'Thinking…'));
      api('POST', '/api/ai', { task: task, question: question || '', report: getReport() }).then(function (d) { clear(out); out.appendChild(h('div', { class: 'agent' }, h('span', { class: 'tag' }, 'AI · ' + d.model), h('p', { class: 'airesp' }, d.text), h('button', { class: 'btn', onclick: function () { copy(d.text); } }, 'Copy'))); }).catch(function (e) { showError(out, e); }); }
    if (!state.ai) return h('div', { class: glass('card') }, h('h2', {}, 'AI helper is off'), h('p', { class: 'muted small' }, 'Turn it on by setting CELLAR_AI_KEY on the server (see Docs → AI agents). Only column names, counts and rule results are ever sent, never your rows.'));
    return h('div', { class: glass('card') }, h('h2', {}, 'AI agents'), h('p', { class: 'muted small' }, 'Sends only column names, counts and rule results to your AI provider. Never your rows.'),
      h('button', { class: 'btn primary', onclick: function () { ask('explain'); } }, 'Explain for my team'), h('button', { class: 'btn', onclick: function () { ask('message'); } }, 'Draft a message to the owner'), h('button', { class: 'btn', onclick: function () { ask('advise'); } }, 'Review my contract'),
      h('div', { class: 'inline' }, q, h('button', { class: 'btn', onclick: function () { ask('ask', q.value); } }, 'Ask')), out);
  }
  function statusPill(r) { var ok = r.passed, warn = !ok && r.severity === 'warning'; return h('span', { class: 'status ' + (ok ? 'pass' : warn ? 'warn' : 'fail') }, ok ? 'PASS' : warn ? 'WARN' : 'FAIL'); }
  function agentsView(list) {
    return h('div', { class: glass('card') }, h('h2', {}, 'Agents ran automatically'), list.map(function (a) {
      return h('div', { class: 'agent' }, h('span', { class: 'tag' }, a.agent), (a.findings || []).map(function (f) { return h('div', {}, h('h3', {}, f.title), h('p', { class: 'muted small' }, f.detail + ' ' + f.action)); }),
        a.markdown ? [h('pre', { class: 'small' }, a.markdown), h('button', { class: 'btn', onclick: function () { copy(a.markdown); } }, 'Copy PR comment')] : null); }));
  }
  function resultView(res) {
    var banner = res.blocking ? notice('bad', 'Release blocked: at least one error-severity integration failed.') : res.passed ? notice('ok', 'All integrations satisfy their declared requirements.') : notice('warn', res.advisory ? 'Advisory mode: findings recorded, nothing blocks.' : 'Warnings only: nothing blocks the release.');
    return h('div', {}, banner, h('p', { class: 'muted small' }, 'Scope: ' + res.scope + ' · records checked: ' + res.rowsChecked + ' · contract ', h('code', {}, res.contractHash.slice(0, 12))),
      res.agents ? agentsView(res.agents) : null, aiPanel(function () { return res; }),
      res.results.map(function (r) { return h('div', { class: glass('card') }, h('div', {}, statusPill(r), ' ', h('strong', {}, r.integration), h('span', { class: 'muted' }, '  owner: ' + r.owner)),
        r.issues.length ? h('div', { class: 'scroll' }, h('table', {}, th(['What happened', 'Column', 'Row', 'What to do']), h('tbody', {}, r.issues.map(function (i) { return h('tr', {}, h('td', {}, WHY[i.code] || i.code, ' ', h('code', {}, i.code)), h('td', {}, h('code', {}, i.column)), h('td', {}, String(i.record)), h('td', {}, i.message)); })))) : null,
        r.truncated ? h('p', { class: 'muted small' }, 'Showing first ' + r.issues.length + ' of ' + r.issueCount + '.') : null); }),
      h('button', { class: 'btn', onclick: function () { var rp = (res.agents || []).filter(function (a) { return a.markdown; })[0]; download('cellar-report.md', rp ? rp.markdown : '', 'text/markdown'); } }, 'Download report (.md)'), h('button', { class: 'btn', onclick: function () { download('cellar-report.json', JSON.stringify(res, null, 2), 'application/json'); } }, 'Download JSON report'));
  }
  function demo(kind, jump) { api('GET', '/api/demo').then(function (d) { state.csv = kind === 'bad' ? d.brokenCsv : d.csv; if (jump) { state.result = null; go('check'); if (state.page === 'check') route(); setTimeout(function () { var b = document.getElementById('run'); if (b) b.click(); }, 120); } }).catch(function (e) { toast(e.message); }); }
  function checkView() {
    var msg = h('div'), out = h('div'), scoutBox = h('div');
    var ta = h('textarea', { id: 'csv', spellcheck: 'false', placeholder: 'Paste or drop a CSV generated by your exporter from synthetic data…' }); ta.value = state.csv; ta.addEventListener('input', function () { state.csv = ta.value; });
    var drop = h('div', { class: 'drop' }, ta);
    ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { var f = e.dataTransfer.files[0]; if (f) readFile(f); });
    function readFile(f) { if (f.size > 8 * 1024 * 1024) { showError(msg, new Error('File exceeds the 8 MiB limit.')); return; } f.arrayBuffer().then(function (b) { try { state.csv = new TextDecoder('utf-8', { fatal: true }).decode(b); ta.value = state.csv; clear(msg); } catch (e) { showError(msg, new Error('File is not valid UTF-8.')); } }); }
    var adv = h('input', { type: 'checkbox', id: 'adv' }); adv.checked = state.advisory; adv.addEventListener('change', function () { state.advisory = adv.checked; });
    var run = h('button', { class: 'btn primary', id: 'run', onclick: function () { clear(msg); run.disabled = true;
      api('POST', '/api/check', { csv: state.csv, advisory: state.advisory }).then(function (res) { state.result = res; clear(out); out.appendChild(resultView(res)); }).catch(function (e) { state.result = null; clear(out); showError(out, e); }).then(function () { run.disabled = false; }); } }, 'Run check');
    ta.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run.click(); });
    var file = h('input', { type: 'file', id: 'f', accept: '.csv,text/csv,text/plain', onchange: function () { if (file.files[0]) readFile(file.files[0]); file.value = ''; } });
    var scout = h('button', { class: 'btn', onclick: function () { clear(scoutBox); api('POST', '/api/scout', { csv: state.csv }).then(function (d) { state.scout = d; scoutBox.appendChild(scoutView(d)); }).catch(function (e) { showError(scoutBox, e); }); } }, 'Scout a contract');
    if (state.result) out.appendChild(resultView(state.result));
    var guide = store.get('cellar_guide') ? null : h('div', { class: glass('card') }, h('strong', {}, 'First time? Three steps'), h('ol', {}, h('li', {}, 'Press “Breaking demo” to load an example file with a problem.'), h('li', {}, 'Press “Run check” and read who would break and why.'), h('li', {}, 'Open Contracts to see the rules, or “Scout a contract” to build rules from your own file.')), h('button', { class: 'btn', onclick: function () { store.set('cellar_guide', '1'); route(); } }, 'Got it, hide this'));
    return h('div', {}, h('h1', {}, 'Check an export'), guide, h('div', { class: glass('card') }, h('p', { class: 'muted small' }, 'Validated on the server against the shared contract. Cell values are never stored or echoed back. Tip: Ctrl+Enter runs the check.'),
      drop, file, h('label', { class: 'btn', for: 'f' }, 'Open CSV file'), h('button', { class: 'btn', onclick: function () { demo('ok'); setTimeout(function () { ta.value = state.csv; }, 150); } }, 'Passing demo'), h('button', { class: 'btn', onclick: function () { demo('bad'); setTimeout(function () { ta.value = state.csv; }, 150); } }, 'Breaking demo'), h('button', { class: 'btn', onclick: function () { download('sample-export.csv', 'order_id,sku,total_cents,currency\nORD-001,SEED-01,25000,INR\nORD-002,TOOL-02,79900,INR\n', 'text/csv'); } }, 'Download sample CSV'), scout,
      h('div', { class: 'inline' }, adv, h('label', { for: 'adv' }, 'Advisory mode (record findings without blocking)')), run, msg), scoutBox, out);
  }
  function scoutView(d) {
    return h('div', { class: glass('card') }, h('div', { class: 'agent' }, h('span', { class: 'tag' }, 'Scout'), h('h3', {}, 'Drafted an integration from your sample'), h('p', { class: 'muted small' }, 'Review the rules, then add it to your contract.')),
      h('pre', { class: 'small scroll' }, JSON.stringify(d, null, 2)),
      h('button', { class: 'btn primary', onclick: function () { addIntegration(d); } }, 'Add to contract'));
  }
  function addIntegration(d) {
    api('GET', '/api/config').then(function (c) { var cfg = c.config, copyD = JSON.parse(JSON.stringify(d)), n = 1, base = copyD.id; while (cfg.integrations.some(function (i) { return i.id === copyD.id; })) copyD.id = base + '-' + (++n);
      cfg.integrations.push(copyD); return api('PUT', '/api/config', { config: cfg, revision: c.revision }); }).then(function () { toast('Added to contract'); }).catch(function (e) { toast(e.message); });
  }

  // ---------- contracts ----------
  function contractsView() {
    var msg = h('div'), cards = h('div', { class: 'grid' }), revBox = h('div'), ta = h('textarea', { class: 'tall', spellcheck: 'false', 'aria-label': 'Contract JSON' }), cur = null;
    function load() { api('GET', '/api/config').then(function (d) { cur = d; ta.value = JSON.stringify(d.config, null, 2); clear(cards);
        d.config.integrations.forEach(function (i) { cards.appendChild(h('div', { class: glass('card lift') }, h('strong', {}, i.id), h('p', { class: 'muted small' }, (i.owner || 'Unassigned') + (i.description ? ' · ' + i.description : '')), h('p', {}, (i.required || []).map(function (c) { return [h('code', {}, c), ' ']; })))); }); })
      .then(function () { return api('GET', '/api/revisions'); }).then(function (r) { clear(revBox); revBox.appendChild(h('div', { class: 'scroll' }, h('table', {}, th(['When', 'Who', 'Version', '']), h('tbody', {}, r.revisions.map(function (v, n) { return h('tr', {}, h('td', {}, v.at), h('td', {}, v.actor), h('td', {}, h('code', {}, v.hash.slice(0, 12)), n === 0 ? ' (current)' : ''), h('td', {}, n > 0 && v.restorable ? h('button', { class: 'btn', onclick: function () { if (window.confirm('Go back to this version? The current one stays in the list.')) api('POST', '/api/restore', { hash: v.hash }).then(function () { toast('Restored'); load(); }).catch(function (e) { showError(msg, e); }); } }, 'Restore') : '')); }))))); }).catch(function (e) { showError(msg, e); }); }
    var save = h('button', { class: 'btn primary', onclick: function () { clear(msg); var p; try { p = JSON.parse(ta.value); } catch (e) { msg.appendChild(notice('bad', 'That is not valid JSON.')); return; }
      api('PUT', '/api/config', { config: p, revision: cur.revision }).then(function () { msg.appendChild(notice('ok', 'Saved. The server validated the whole contract first.')); load(); }).catch(function (e) { showError(msg, e); }); } }, 'Validate and save');
    load();
    return h('div', {}, h('h1', {}, 'Integration contracts'), cards, h('div', { class: glass('card') }, h('h2', {}, 'Edit as JSON'), h('p', { class: 'muted small' }, 'Edits are validated server-side and rejected if someone changed the contract first.'), ta, save, h('button', { class: 'btn', onclick: load }, 'Reload'), h('button', { class: 'btn', onclick: function () { download('cellar-contract.json', ta.value, 'application/json'); } }, 'Export JSON'), h('label', { class: 'btn', for: 'imp' }, 'Import JSON'), h('input', { type: 'file', id: 'imp', accept: '.json,application/json', onchange: function (e) { var f = e.target.files[0]; if (f && f.size < 1048576) f.text().then(function (t) { ta.value = t; toast('Loaded. Press Validate and save to apply.'); }); e.target.value = ''; } }), msg), aiPanel(function () { return null; }), h('h2', {}, 'Revisions'), h('div', { class: glass('card') }, revBox));
  }

  // ---------- compare ----------
  function diffView() {
    var msg = h('div'), out = h('div'), a = h('textarea', { 'aria-label': 'Baseline CSV' }), b = h('textarea', { 'aria-label': 'New CSV' }); a.value = state.before; b.value = state.after;
    a.addEventListener('input', function () { state.before = a.value; }); b.addEventListener('input', function () { state.after = b.value; });
    function list(l, items) { return h('p', {}, h('strong', {}, l + ': '), items.length ? items.map(function (x) { return [h('code', {}, x), ' ']; }) : h('span', { class: 'muted' }, 'none')); }
    var go2 = h('button', { class: 'btn primary', onclick: function () { clear(out); clear(msg); api('POST', '/api/diff', { before: state.before, after: state.after }).then(function (d) {
      out.appendChild(h('div', { class: glass('card') }, list('Added', d.added), list('Removed', d.removed), h('p', {}, h('strong', {}, 'Reordered: '), d.reordered ? 'yes' : 'no'), h('h2', {}, 'Affected integrations'),
        d.impacted.length ? d.impacted.map(function (i) { return h('p', {}, h('strong', {}, i.integration), ' (', i.owner, ')', i.removedRequired.length ? ' lost: ' + i.removedRequired.join(', ') : '', i.unexpectedAdded.length ? ' unexpected: ' + i.unexpectedAdded.join(', ') : '', i.orderMismatch ? ' order mismatch' : ''); }) : h('p', { class: 'muted' }, 'No integration is affected.'), h('p', { class: 'muted small' }, d.note))); }).catch(function (e) { showError(msg, e); }); } }, 'Compare headers');
    return h('div', {}, h('h1', {}, 'Compare two exports'), h('div', { class: glass('card') }, h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Baseline CSV'), a), h('div', {}, h('label', {}, 'New CSV'), b)), go2, msg), out);
  }

  // ---------- history ----------
  function historyView() {
    var box = h('div');
    api('GET', '/api/history').then(function (d) {
      var hist = d.history, passed = hist.filter(function (e) { return e.passed; }).length;
      var outcome = function (e) { return e.blocking ? 'fail' : e.passed ? 'pass' : 'warn'; };
      box.appendChild(hist.length ? h('div', {}, h('div', { class: 'grid' }, [[hist.length, 'runs recorded'], [Math.round(passed * 100 / hist.length) + '%', 'pass rate'], [hist.filter(function (e) { return e.blocking; }).length, 'blocked releases']].map(function (s) { return h('div', { class: glass('card') }, h('div', { class: 'num' }, String(s[0])), h('span', { class: 'muted' }, s[1])); })),
        h('div', { class: glass('card') }, h('p', { class: 'muted small' }, 'Oldest → newest'), h('div', { class: 'bars', role: 'img', 'aria-label': 'Outcome of recent runs' }, hist.slice(0, 40).reverse().map(function (e) { return h('div', { class: 'bar ' + outcome(e), title: e.timestamp }); }))),
        h('div', { class: glass('card scroll') }, h('table', {}, th(['Time', 'Outcome', 'Records', 'Integrations']), h('tbody', {}, hist.map(function (e) { return h('tr', {}, h('td', {}, e.timestamp), h('td', {}, h('span', { class: 'status ' + outcome(e) }, e.blocking ? 'BLOCKED' : e.passed ? 'PASSED' : e.advisory ? 'ADVISORY' : 'WARN')), h('td', {}, String(e.rowsChecked)), h('td', {}, e.results.map(function (r) { return r.integration + ':' + (r.passed ? 'pass' : 'fail'); }).join('  '))); }))))) : h('div', { class: glass('card') }, h('p', { class: 'muted' }, 'No checks recorded yet. Run one from the Check page.')));
    }).catch(function (e) { showError(box, e); });
    return h('div', {}, h('h1', {}, 'Check history'), box);
  }

  // ---------- activity ----------
  function activityView() {
    var msg = h('div'), box = h('div');
    function load() { api('GET', '/api/activity').then(function (d) { clear(box); box.appendChild(h('div', { class: 'scroll' }, h('table', {}, th(['#', 'Time', 'Action', 'Detail']), h('tbody', {}, d.entries.map(function (e) { return h('tr', {}, h('td', {}, String(e.seq)), h('td', {}, e.ts), h('td', {}, e.action), h('td', {}, e.detail)); }))))); }).catch(function (e) { showError(msg, e); }); }
    var verify = h('button', { class: 'btn primary', onclick: function () { api('GET', '/api/activity/verify').then(function (v) { clear(msg); msg.appendChild(v.ok ? notice('ok', 'Log intact: ' + v.entries + ' entries.') : notice('bad', 'Log BROKEN: ' + v.problem)); }).catch(function (e) { showError(msg, e); }); } }, 'Verify integrity');
    load();
    return h('div', {}, h('h1', {}, 'Activity'), h('div', { class: glass('card') }, h('p', { class: 'muted small' }, 'Every check, compare and contract edit. Entries are chained, so edits to the file are detectable.'), verify, h('button', { class: 'btn', onclick: load }, 'Refresh'), msg), h('div', { class: glass('card') }, box));
  }

  // ---------- optional shared access key (server deployments only) ----------
  function gateView() {
    var msg = h('div'), k = h('input', { type: 'password', id: 'k', autocomplete: 'off', maxlength: '128' });
    return h('form', { class: glass('gate'), onsubmit: function (e) { e.preventDefault(); store.set('cellar_key', k.value, true); route(); } }, h('h1', {}, 'Access key'), h('p', { class: 'muted small' }, 'This server is shared. Enter its access key.'), k, h('button', { class: 'btn primary', type: 'submit' }, 'Continue'), msg);
  }

  var VIEWS = { home: homeView, features: featuresView, docs: docsView, roadmap: roadmapView, live: liveView, check: checkView, contracts: contractsView, diff: diffView, history: historyView, activity: activityView };
  function route(needKey) {
    var p = location.hash.slice(1); state.page = VIEWS[p] ? p : 'home'; clear(root);
    api('GET', '/api/session').then(function (s) {
      state.version = s.version; state.ai = !!s.ai;
      if (s.keyRequired && (needKey === true || !store.get('cellar_key'))) { root.appendChild(gateView()); return; }
      root.appendChild(shell(VIEWS[state.page]()));
    }).catch(function () { clear(root); root.appendChild(h('p', { class: 'boot' }, 'Cannot reach the server.')); });
  }
  window.addEventListener('hashchange', function () { route(); });
  route();
})();
