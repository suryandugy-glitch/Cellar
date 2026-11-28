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
const validate = document.querySelector('#validate-contract');
const saveContract = document.querySelector('#download-contract');
const draft = document.querySelector('#draft-contract');
const draftDelimiter = document.querySelector('#draft-delimiter');
const fillRules = document.querySelector('#fill-rules');
const builder = document.querySelector('#builder-columns');
const builderDelimiter = document.querySelector('#builder-delimiter');
const rememberRules = document.querySelector('#remember-rules');
const forgetRules = document.querySelector('#forget-rules');
const savedRulesStatus = document.querySelector('#saved-rules-status');
const rulesKey = 'cellar-guard-saved-rules';
let worker;
let report;
let revision = 0;

const input = key => fields[key].file.files[0] || fields[key].text.value;
const hasInput = key => Boolean(fields[key].file.files.length || fields[key].text.value.trim());
const delimiterValue = select => select.value === 'tab' ? '\t' : select.value;

function stop() {
  worker?.terminate();
  worker = undefined;
  run.disabled = false;
  validate.disabled = false;
  draft.disabled = false;
  fillRules.disabled = false;
  cancel.hidden = true;
  form.removeAttribute('aria-busy');
}

function clearReport() {
  report = undefined;
  results.hidden = true;
  results.replaceChildren();
  download.disabled = true;
}

function setFieldError(key, invalid) {
  fields[key].file.setAttribute('aria-invalid', String(invalid));
  fields[key].text.setAttribute('aria-invalid', String(invalid));
}

function changed(key) {
  revision++;
  stop();
  clearReport();
  if (key) {
    setFieldError(key, false);
    if (key === 'contract') saveContract.disabled = true;
  }
}

for (const [key, { file, text, note }] of Object.entries(fields)) {
  file.addEventListener('change', () => {
    changed(key);
    const selected = file.files[0];
    if (!selected) {
      note.textContent = '';
      status.textContent = 'Choose a file or paste text to continue.';
      return;
    }
    note.textContent = 'Reading ' + selected.name + '…';
    if (key === 'contract' || hasInput('contract')) {
      startCheck(hasInput('csv') ? 'check' : 'validate', true);
    } else {
      note.textContent = 'Selected ' + selected.name + '.';
      status.textContent = 'CSV selected. Use your import rules or choose a JSON contract to run the check.';
    }
  });
  text.addEventListener('input', () => {
    changed(key);
    file.value = '';
    note.textContent = '';
    status.textContent = key === 'contract'
      ? 'Contract edited. Validate it or check it against a CSV.'
      : 'CSV edited. Select Check export to run the check.';
  });
}

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showReport(report, focus) {
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
  if (focus) heading.focus();
  return verdict;
}

async function getSample(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('The sample could not load. Try again or choose your own files.');
  return response.text();
}

async function loadExample(csvPath) {
  changed('csv');
  const request = revision;
  status.textContent = 'Loading example…';
  try {
    const [contract, csv] = await Promise.all([
      hasInput('contract') ? null : getSample('./samples/contract.json'),
      getSample(csvPath)
    ]);
    if (request !== revision) return;
    if (contract !== null && !hasInput('contract')) fields.contract.text.value = contract;
    fields.csv.text.value = csv;
    fields.csv.file.value = '';
    fields.csv.note.textContent = 'Example CSV loaded.';
    startCheck('check', true);
  } catch {
    if (request === revision) status.textContent = 'The example could not load. Try again or choose your own files.';
  }
}

function saveJson(source, filename) {
  const url = URL.createObjectURL(new Blob([source], { type: 'application/json' }));
  const link = node('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function startCheck(action, focus = false, rulesToRemember) {
  if (worker) return;
  revision++;
  const task = action === 'fill' ? 'draft' : action === 'check' && !hasInput('csv') ? 'validate' : action;
  if (task !== 'draft' && !hasInput('contract')) {
    status.textContent = 'Enter the required columns and select Use these rules, or import a JSON contract.';
    return;
  }
  if (task === 'draft' && !hasInput('csv')) {
    status.textContent = 'Choose a known-good CSV first, or paste its text.';
    return;
  }

  if (task !== 'draft') {
    clearReport();
    setFieldError('contract', false);
  }
  if (task !== 'validate') setFieldError('csv', false);

  try {
    const active = new Worker(new URL('./guard-worker.js', import.meta.url), { type: 'module' });
    worker = active;
    active.addEventListener('message', ({ data }) => {
      if (worker !== active) return;
      stop();
      if (data.details) {
        if (data.details.source !== null) fields.contract.text.value = data.details.source;
        const count = data.details.count;
        const filename = fields.contract.file.files[0]?.name;
        fields.contract.note.textContent = 'Contract valid · ' + count +
          (count === 1 ? ' integration' : ' integrations') + (filename ? ' · ' + filename : '.');
        saveContract.disabled = false;
        if (rulesToRemember && rememberRules.checked) {
          try {
            localStorage.setItem(rulesKey, JSON.stringify(rulesToRemember));
            forgetRules.hidden = false;
            savedRulesStatus.textContent = 'Rules saved on this device.';
          } catch {
            savedRulesStatus.textContent = 'The browser could not save these rules. You can still use them now.';
          }
        }
      }
      if (data.error) {
        setFieldError(data.field, true);
        fields[data.field].note.textContent = data.error;
        status.textContent = (data.field === 'contract' ? 'Contract error. ' : 'CSV error. ') + data.error;
        return;
      }
      if (data.draft) {
        if (action === 'fill') {
          const generated = JSON.parse(data.draft);
          builder.value = generated.integrations[0].required.join('\n');
          builderDelimiter.value = generated.delimiter === '\t' ? 'tab' : generated.delimiter;
          builder.removeAttribute('aria-invalid');
          status.textContent = 'Review the required columns and select Use these rules to apply them.';
          builder.focus();
          return;
        }
        saveJson(data.draft, 'cellar-guard-starter-contract.json');
        status.textContent = 'Starter contract downloaded. Review it, then choose it to run a check.';
        return;
      }
      if (data.report) {
        report = data.report;
        const filename = fields.csv.file.files[0]?.name;
        if (filename) fields.csv.note.textContent = 'Checked ' + filename + '.';
        download.disabled = false;
        status.textContent = showReport(report, focus) + '.';
        return;
      }
      status.textContent = hasInput('csv')
        ? 'Contract valid. Select Check export to check the CSV.'
        : 'Contract valid. Choose a CSV or load an example to run a check.';
    }, { once: true });
    active.addEventListener('error', () => {
      if (worker !== active) return;
      stop();
      status.textContent = 'The checker could not start. Reload the page and try again.';
    }, { once: true });
    status.textContent = task === 'draft' ? 'Creating starter contract…' :
      task === 'validate' ? 'Validating contract…' : 'Checking export…';
    form.setAttribute('aria-busy', 'true');
    run.disabled = true;
    validate.disabled = true;
    draft.disabled = true;
    fillRules.disabled = true;
    cancel.hidden = false;
    active.postMessage({ task, contract: input('contract'), csv: input('csv'), delimiter: delimiterValue(draftDelimiter) });
  } catch {
    stop();
    status.textContent = 'The checker needs a browser that supports web workers.';
  }
}

document.querySelector('#load-passing').addEventListener('click', () => loadExample('./samples/passing.csv'));
document.querySelector('#load-breaking').addEventListener('click', () => loadExample('./samples/breaking.csv'));
getSample('./samples/contract.json').then(text => {
  if (revision || hasInput('contract') || !forgetRules.hidden) return;
  fields.contract.text.value = text;
  fields.contract.note.textContent = 'Example contract loaded.';
}).catch(() => {
  if (!revision) status.textContent = 'Enter the required columns or import a JSON contract to begin.';
});

form.addEventListener('submit', event => {
  event.preventDefault();
  startCheck('check', true);
});
run.disabled = false;
validate.addEventListener('click', () => startCheck('validate'));
draft.addEventListener('click', () => startCheck('draft'));
fillRules.addEventListener('click', () => startCheck('fill'));

builder.addEventListener('input', () => builder.removeAttribute('aria-invalid'));
document.querySelector('#apply-rules').addEventListener('click', () => {
  const required = builder.value.split(/\r?\n/).filter(column => column.trim());
  if (!required.length) {
    builder.setAttribute('aria-invalid', 'true');
    status.textContent = 'Enter at least one required column.';
    builder.focus();
    return;
  }
  changed('contract');
  fields.contract.file.value = '';
  fields.contract.text.value = JSON.stringify({
    version: 2,
    delimiter: delimiterValue(builderDelimiter),
    validateRows: true,
    integrations: [{ id: 'customer-import', required }],
  }, null, 2);
  fields.contract.note.textContent = 'Validating your import rules…';
  const rulesToRemember = rememberRules.checked
    ? { columns: required.join('\n'), delimiter: builderDelimiter.value }
    : undefined;
  startCheck('check', true, rulesToRemember);
});

try {
  const saved = JSON.parse(localStorage.getItem(rulesKey));
  if (typeof saved?.columns === 'string' && saved.columns.trim() && [',', ';', 'tab'].includes(saved.delimiter)) {
    builder.value = saved.columns;
    builderDelimiter.value = saved.delimiter;
    rememberRules.checked = true;
    forgetRules.hidden = false;
    savedRulesStatus.textContent = 'Saved rules loaded. Tap Use these rules to apply them.';
  }
} catch {
  // A blocked or unavailable storage area does not prevent CSV checks.
}

forgetRules.addEventListener('click', () => {
  try {
    localStorage.removeItem(rulesKey);
    rememberRules.checked = false;
    forgetRules.hidden = true;
    savedRulesStatus.textContent = 'Saved rules removed from this device.';
  } catch {
    savedRulesStatus.textContent = 'The browser could not remove the saved rules.';
  }
});

cancel.addEventListener('click', () => {
  stop();
  status.textContent = 'Check cancelled.';
  run.focus();
});

document.querySelector('#clear-inputs').addEventListener('click', () => {
  changed('contract');
  setFieldError('csv', false);
  for (const { text, file, note } of Object.values(fields)) {
    text.value = '';
    file.value = '';
    note.textContent = '';
  }
  builder.value = '';
  builderDelimiter.value = ',';
  builder.removeAttribute('aria-invalid');
  savedRulesStatus.textContent = forgetRules.hidden ? '' : 'Saved rules stay on this device. Reload to restore them.';
  status.textContent = 'Inputs cleared. Enter your import rules or load an example.';
});

saveContract.addEventListener('click', () => {
  saveJson(fields.contract.text.value, 'cellar-guard-contract.json');
});

download.addEventListener('click', () => {
  if (report) saveJson(JSON.stringify(report, null, 2) + '\n', 'cellar-guard-report.json');
});
