'use strict';
/* Cellar web UI. Presentation only: rules, checks and agents run on the server. Text is only inserted as text nodes; the CSP forbids inline script and style. */
(function () {
  var root = document.getElementById('app');
  var state = { page: 'home', csv: '', advisory: false, result: null, scout: null, before: '', after: '' };
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
  var PAGES = [['home', 'Home'], ['check', 'Check'], ['contracts', 'Contracts'], ['diff', 'Compare'], ['history', 'History'], ['activity', 'Activity']];
  function go(p) { location.hash = '#' + p; }
  function shell(body) {
    return h('div', {}, h('header', { class: glass('top') }, h('img', { src: '/logo.svg', alt: '' }), h('span', { class: 'brand', onclick: function () { go('home'); } }, 'Cellar'),
      h('nav', { class: 'tabs', 'aria-label': 'Sections' }, PAGES.map(function (p) { return h('button', { 'aria-current': state.page === p[0] ? 'page' : null, onclick: function () { go(p[0]); } }, p[1]); })), h('span', { class: 'spacer' }),
      h('button', { class: 'chip', onclick: palette, 'aria-label': 'Open command palette' }, 'Search ', h('kbd', {}, 'Ctrl K')),
      h('button', { class: 'chip', onclick: toggleTheme, 'aria-label': 'Toggle theme' }, 'Theme')), h('main', {}, body), h('footer', {}, 'Cellar ' + (state.version || '') + ' · agents run offline on your server · no cell values are stored'));
  }
  function toggleTheme() { var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', t); store.set('cellar_theme', t); }

  // ---------- command palette ----------
  function palette() {
    var items = PAGES.map(function (p) { return ['Go to ' + p[1], function () { go(p[0]); }]; }).concat([['Run breaking demo', function () { demo('bad', true); }], ['Run passing demo', function () { demo('ok', true); }], ['Toggle theme', toggleTheme], ['Copy run command', function () { copy('sh run.sh'); }]]);
    var list = h('div'), input = h('input', { type: 'text', placeholder: 'Type a command…', 'aria-label': 'Command' }), sel = 0, shown = [];
    var wrap = h('div', { class: 'pal', onclick: function (e) { if (e.target === wrap) wrap.remove(); } }, h('div', { class: glass('box') }, input, list));
    function draw() { clear(list); shown = items.filter(function (i) { return i[0].toLowerCase().indexOf(input.value.toLowerCase()) >= 0; }); sel = Math.min(sel, Math.max(0, shown.length - 1));
      shown.forEach(function (i, n) { list.appendChild(h('button', { class: n === sel ? 'sel' : '', onclick: function () { wrap.remove(); i[1](); } }, i[0])); }); }
    input.addEventListener('input', function () { sel = 0; draw(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') wrap.remove(); else if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); } else if (e.key === 'Enter' && shown[sel]) { wrap.remove(); shown[sel][1](); } });
    document.body.appendChild(wrap); draw(); input.focus();
  }
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!document.querySelector('.pal')) palette(); } });

  // ---------- home ----------
  function homeView() {
    function step(n, t, d) { return h('div', { class: glass('card lift') }, h('div', { class: 'num' }, n), h('h3', {}, t), h('p', { class: 'muted' }, d)); }
    function feat(t, d, b) { return h('div', { class: glass('card lift') }, h('span', { class: 'badge' }, b || 'Available'), h('h3', {}, t), h('p', { class: 'muted' }, d)); }
    return h('div', {},
      h('section', { class: 'hero' }, h('span', { class: 'pill' }, 'Cellar ' + (state.version || '') + ' · no sign-in needed'),
        h('h1', {}, 'CSV changes shouldn’t ', h('span', { class: 'grad' }, 'break customers silently.')),
        h('p', { class: 'lead' }, 'Cellar checks every export against what each customer workflow needs, names the integration that breaks, and lets automatic agents explain the fix before you ship.'),
        h('div', {}, h('button', { class: 'btn primary', onclick: function () { demo('bad', true); } }, 'Try the breaking demo'), h('button', { class: 'btn', onclick: function () { go('check'); } }, 'Open the workbench')),
        h('div', { class: glass('cmd') }, h('code', {}, '$ java -jar dist/cellar.jar check --csv build/sales.csv'), h('button', { class: 'btn', onclick: function () { copy('java -jar dist/cellar.jar check --csv build/sales.csv'); } }, 'Copy')),
        h('div', { class: glass('term') }, h('div', { class: 'bar' }, h('span', { class: 'dot' }), h('span', { class: 'dot y' }), h('span', { class: 'dot g' }), ' cellar check'),
          h('pre', {}, h('span', { class: 'dim' }, '$ cellar check --csv build/sales.csv\n'), h('span', { class: 'fail' }, 'FAIL'), '  inventory-report  requires order_id\n', h('span', { class: 'pass' }, 'PASS'), '  finance-summary   satisfies its contract\n', h('span', { class: 'dim' }, 'Triage agent: order_id likely renamed to id\nGate: BLOCK  (exit code 1)')))),
      h('h2', {}, 'How it works'), h('div', { class: 'grid' }, step('01', 'Declare', 'Record what each customer workflow needs in a small contract: columns, types, ranges.'), step('02', 'Check', 'Every export is validated on the server. Reports never contain cell values.'), step('03', 'Resolve', 'Agents triage the break, name the owner and write the PR comment for you.')),
      h('h2', {}, 'Automatic agents'), h('div', { class: 'grid' }, feat('Triage', 'Spots renamed columns like order_id → id and proposes a safe migration.'), feat('Release gate', 'Gives a clear ship or block verdict on every run.'), feat('Reporter', 'Writes a ready-to-paste pull request comment.'), feat('Scout', 'Drafts a contract from a sample CSV in one click.')),
      h('h2', {}, 'Built in'), h('div', { class: 'grid' }, feat('Contract editor', 'Revision-guarded edits so two people never overwrite each other.'), feat('Compare exports', 'See added, removed and reordered columns and who they affect.'), feat('History and activity', 'Trend of the last 100 runs and a tamper-evident activity log.'), feat('CLI and CI', 'Same engine, exit codes 0, 1 and 2 for GitHub Actions.')),
      h('h2', {}, 'Manual vs Cellar'), h('div', { class: glass('card scroll') }, h('table', {}, th(['Task', 'Ad hoc', 'With Cellar']), h('tbody', {}, [['Spotting a break', 'A customer reports a failed import', 'Fails the pull request check'], ['Finding the cause', 'Diff sample files by hand', 'Names the column and likely rename'], ['Telling the owner', 'Chase who owns the report', 'Owner is in the contract'], ['Writing it up', 'Copy findings into a ticket', 'Reporter agent drafts it']].map(function (r) { return h('tr', {}, r.map(function (c) { return h('td', {}, c); })); })))),
      h('div', { class: glass('card'), }, h('h2', {}, 'Ready to see it?'), h('button', { class: 'btn primary', onclick: function () { go('check'); } }, 'Run your first check')));
  }

  // ---------- check ----------
  function statusPill(r) { var ok = r.passed, warn = !ok && r.severity === 'warning'; return h('span', { class: 'status ' + (ok ? 'pass' : warn ? 'warn' : 'fail') }, ok ? 'PASS' : warn ? 'WARN' : 'FAIL'); }
  function agentsView(list) {
    return h('div', { class: glass('card') }, h('h2', {}, 'Agents ran automatically'), list.map(function (a) {
      return h('div', { class: 'agent' }, h('span', { class: 'tag' }, a.agent), (a.findings || []).map(function (f) { return h('div', {}, h('h3', {}, f.title), h('p', { class: 'muted small' }, f.detail + ' ' + f.action)); }),
        a.markdown ? [h('pre', { class: 'small' }, a.markdown), h('button', { class: 'btn', onclick: function () { copy(a.markdown); } }, 'Copy PR comment')] : null); }));
  }
  function resultView(res) {
    var banner = res.blocking ? notice('bad', 'Release blocked: at least one error-severity integration failed.') : res.passed ? notice('ok', 'All integrations satisfy their declared requirements.') : notice('warn', res.advisory ? 'Advisory mode: findings recorded, nothing blocks.' : 'Warnings only: nothing blocks the release.');
    return h('div', {}, banner, h('p', { class: 'muted small' }, 'Scope: ' + res.scope + ' · records checked: ' + res.rowsChecked + ' · contract ', h('code', {}, res.contractHash.slice(0, 12))),
      res.agents ? agentsView(res.agents) : null,
      res.results.map(function (r) { return h('div', { class: glass('card') }, h('div', {}, statusPill(r), ' ', h('strong', {}, r.integration), h('span', { class: 'muted' }, '  owner: ' + r.owner)),
        r.issues.length ? h('div', { class: 'scroll' }, h('table', {}, th(['Code', 'Column', 'Record', 'What to do']), h('tbody', {}, r.issues.map(function (i) { return h('tr', {}, h('td', {}, h('code', {}, i.code)), h('td', {}, h('code', {}, i.column)), h('td', {}, String(i.record)), h('td', {}, i.message)); })))) : null,
        r.truncated ? h('p', { class: 'muted small' }, 'Showing first ' + r.issues.length + ' of ' + r.issueCount + '.') : null); }),
      h('button', { class: 'btn', onclick: function () { download('cellar-report.json', JSON.stringify(res, null, 2), 'application/json'); } }, 'Download JSON report'));
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
    return h('div', {}, h('h1', {}, 'Check an export'), h('div', { class: glass('card') }, h('p', { class: 'muted small' }, 'Validated on the server against the shared contract. Cell values are never stored or echoed back. Tip: Ctrl+Enter runs the check.'),
      drop, file, h('label', { class: 'btn', for: 'f' }, 'Open CSV file'), h('button', { class: 'btn', onclick: function () { demo('ok'); setTimeout(function () { ta.value = state.csv; }, 150); } }, 'Passing demo'), h('button', { class: 'btn', onclick: function () { demo('bad'); setTimeout(function () { ta.value = state.csv; }, 150); } }, 'Breaking demo'), scout,
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
      .then(function () { return api('GET', '/api/revisions'); }).then(function (r) { clear(revBox); revBox.appendChild(h('div', { class: 'scroll' }, h('table', {}, th(['When', 'Who', 'Hash']), h('tbody', {}, r.revisions.map(function (v) { return h('tr', {}, h('td', {}, v.at), h('td', {}, v.actor), h('td', {}, h('code', {}, v.hash.slice(0, 12)))); }))))); }).catch(function (e) { showError(msg, e); }); }
    var save = h('button', { class: 'btn primary', onclick: function () { clear(msg); var p; try { p = JSON.parse(ta.value); } catch (e) { msg.appendChild(notice('bad', 'That is not valid JSON.')); return; }
      api('PUT', '/api/config', { config: p, revision: cur.revision }).then(function () { msg.appendChild(notice('ok', 'Saved. The server validated the whole contract first.')); load(); }).catch(function (e) { showError(msg, e); }); } }, 'Validate and save');
    load();
    return h('div', {}, h('h1', {}, 'Integration contracts'), cards, h('div', { class: glass('card') }, h('h2', {}, 'Edit as JSON'), h('p', { class: 'muted small' }, 'Edits are validated server-side and rejected if someone changed the contract first.'), ta, save, h('button', { class: 'btn', onclick: load }, 'Reload'), msg), h('h2', {}, 'Revisions'), h('div', { class: glass('card') }, revBox));
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

  var VIEWS = { home: homeView, check: checkView, contracts: contractsView, diff: diffView, history: historyView, activity: activityView };
  function route(needKey) {
    var p = location.hash.slice(1); state.page = VIEWS[p] ? p : 'home'; clear(root);
    api('GET', '/api/session').then(function (s) {
      state.version = s.version;
      if (s.keyRequired && (needKey === true || !store.get('cellar_key'))) { root.appendChild(gateView()); return; }
      root.appendChild(shell(VIEWS[state.page]()));
    }).catch(function () { clear(root); root.appendChild(h('p', { class: 'boot' }, 'Cannot reach the server.')); });
  }
  window.addEventListener('hashchange', function () { route(); });
  route();
})();
