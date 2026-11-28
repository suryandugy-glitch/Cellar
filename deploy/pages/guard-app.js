const form = document.querySelector('#guard-form');
const status = document.querySelector('#guard-status');
const results = document.querySelector('#guard-results');
const run = document.querySelector('#run-check');
const cancel = document.querySelector('#cancel-check');
const download = document.querySelector('#download-report');
const fields = Object.fromEntries(['contract', 'csv'].map(key => [key, {
  file: document.querySelector('#' + key + '-file'),
  text: document.querySelector('#' + key + '-text'),
  note: document.querySelector('#' + key + '-file-status')
}]));
let worker;
let report;
let revision = 0;

function stop() {
  worker?.terminate();
  worker = undefined;
  run.disabled = false;
  cancel.hidden = true;
  form.removeAttribute('aria-busy');
}

function clearReport() {
  report = undefined;
  results.hidden = true;
  results.replaceChildren();
  download.disabled = true;
}

function changed() {
  revision++;
  stop();
  clearReport();
  status.textContent = '';
}

for (const { file, text, note } of Object.values(fields)) {
  file.addEventListener('change', () => {
    changed();
    const selected = file.files[0];
    note.textContent = selected ? selected.name + ' will be checked. Editing the text below uses the text instead.' : '';
  });
  text.addEventListener('input', () => {
    changed();
    file.value = '';
    note.textContent = '';
  });
}

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showReport(report) {
  const verdict = report.blocking ? 'Release blocked' : report.passed ? 'Ready to ship' : 'Ready with warnings';
  const banner = node('div', undefined, 'guard-verdict ' + (report.blocking ? 'guard-blocked' : report.passed ? 'guard-passed' : 'guard-warning'));
  const heading = node('h2', verdict);
  heading.tabIndex = -1;
  const scope = report.rowsChecked === null ? 'Headers checked' : report.rowsChecked.toLocaleString() + ' data records checked';
  banner.append(heading, node('p', scope + ' · ' + report.results.length + ' integrations'));
  results.replaceChildren(banner);
  for (const integration of report.results) {
    const panel = node('details', undefined, 'guard-result-card');
    panel.open = integration.issueCount > 0;
    const label = integration.issueCount ? (integration.severity === 'warning' ? 'WARN' : 'FAIL') : 'PASS';
    panel.append(node('summary', label + ' · ' + integration.integration + ' · ' + integration.issueCount + ' findings'),
      node('p', 'Owner: ' + integration.owner));
    const visibleFindings = integration.issues.slice(0, 12);
    if (visibleFindings.length) {
      const findings = node('ul');
      for (const issue of visibleFindings) {
        const item = node('li');
        const location = [issue.column, issue.record > 0 && 'record ' + issue.record].filter(Boolean).join(' · ');
        item.append(node('strong', issue.code), node('span', location), node('p', issue.message));
        findings.append(item);
      }
      panel.append(findings);
    }
    if (integration.issueCount > visibleFindings.length) {
      panel.append(node('p', 'Showing ' + visibleFindings.length + ' of ' + integration.issueCount +
        ' findings. Download the report for up to 200 per integration.'));
    }
    results.append(panel);
  }
  results.hidden = false;
  heading.focus();
  return verdict;
}

async function getSample(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('The sample could not load. Try again or choose your own files.');
  return response.text();
}

async function loadExample(csvPath) {
  changed();
  const request = revision;
  status.textContent = 'Loading example…';
  try {
    const [contract, csv] = await Promise.all([getSample('./samples/contract.json'), getSample(csvPath)]);
    if (request !== revision) return;
    for (const [key, value] of Object.entries({ contract, csv })) {
      fields[key].text.value = value;
      fields[key].file.value = '';
      fields[key].note.textContent = '';
    }
    status.textContent = 'Example loaded. Select Check export.';
  } catch (error) {
    if (request === revision) status.textContent = error.message;
  }
}

document.querySelector('#load-passing').addEventListener('click', () => loadExample('./samples/passing.csv'));
document.querySelector('#load-breaking').addEventListener('click', () => loadExample('./samples/breaking.csv'));
getSample('./samples/contract.json').then(text => {
  if (!fields.contract.text.value && !fields.contract.file.files.length) fields.contract.text.value = text;
}).catch(() => {
  if (!revision) status.textContent = 'Choose a contract file or paste your contract JSON to begin.';
});

form.addEventListener('submit', event => {
  event.preventDefault();
  if (worker) return;
  revision++;
  clearReport();
  const input = {};
  for (const [key, { file, text }] of Object.entries(fields)) {
    input[key] = file.files[0] || text.value;
    if (typeof input[key] === 'string' && !input[key].trim()) {
      status.textContent = key === 'csv' ? 'Choose a CSV file or paste CSV text.' : 'Choose a contract file or paste JSON.';
      text.focus();
      return;
    }
  }
  try {
    const active = new Worker(new URL('./guard-worker.js', import.meta.url), { type: 'module' });
    worker = active;
    active.addEventListener('message', ({ data }) => {
      if (worker !== active) return;
      stop();
      if (data.error) {
        status.textContent = data.error;
        return;
      }
      report = data.report;
      download.disabled = false;
      status.textContent = showReport(report) + '.';
    }, { once: true });
    active.addEventListener('error', () => {
      if (worker !== active) return;
      stop();
      status.textContent = 'The checker could not start. Reload the page and try again.';
    }, { once: true });
    status.textContent = 'Checking export…';
    form.setAttribute('aria-busy', 'true');
    run.disabled = true;
    cancel.hidden = false;
    active.postMessage(input);
  } catch {
    stop();
    status.textContent = 'The checker needs a browser that supports web workers.';
  }
});

run.disabled = false;

cancel.addEventListener('click', () => {
  stop();
  status.textContent = 'Check cancelled.';
  run.focus();
});

download.addEventListener('click', () => {
  if (!report) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2) + '\n'], { type: 'application/json' }));
  const link = node('a');
  link.href = url;
  link.download = 'cellar-guard-report.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
