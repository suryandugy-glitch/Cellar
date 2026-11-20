'use strict';

const legacyRoutes = new Set(['#check', '#demo-breaking', '#demo-passing', '#docs', '#roadmap']);
function followLegacyRoute() {
  if (legacyRoutes.has(location.hash)) location.replace('./demo.html' + location.hash);
  if (location.hash === '#features') location.replace('#workflow');
}
followLegacyRoute();

const sampleLinks = [...document.querySelectorAll('[data-sample]')];
const feedback = document.querySelector('#sample-feedback');
const reports = new Map();
let selection = 0;

function renderSample(report, chosen) {
  const passed = report.passed;
  const blocked = report.blocking;
  const firstMissing = report.results.flatMap(result => result.missing || [])[0];
  const header = document.querySelector('#sample-header');
  const headerCells = report.header.map((column, index) => {
    if (!blocked || index !== 0) return document.createTextNode(column);
    const highlight = document.createElement('span');
    highlight.className = 'changed';
    highlight.textContent = column;
    return highlight;
  });
  header.replaceChildren(...headerCells.flatMap((column, index) => index ? [',', column] : [column]));

  document.querySelector('#sample-verdict').dataset.outcome = blocked ? 'blocked' : passed ? 'passed' : 'warning';
  document.querySelector('#sample-symbol').textContent = passed ? '✓' : '!';
  document.querySelector('#sample-outcome').textContent = blocked ? 'Release blocked' : passed ? 'Ready to ship' : 'Warnings only';
  document.querySelector('#sample-detail').textContent = firstMissing ? 'Required column missing: ' + firstMissing + '.' :
    passed ? 'All integrations meet their contract.' : 'Review the findings in the full sample report.';
  document.querySelector('#sample-results').replaceChildren(...report.results.map(result => {
    const row = document.createElement('li');
    const integration = document.createElement('code');
    const outcome = document.createElement('span');
    integration.textContent = result.integration;
    outcome.className = 'outcome';
    outcome.dataset.result = result.passed ? 'pass' : result.severity === 'warning' ? 'warn' : 'fail';
    outcome.textContent = { pass: 'Passed', warn: 'Warning', fail: 'Failed' }[outcome.dataset.result];
    row.append(integration, outcome);
    return row;
  }));

  document.querySelector('#full-report').href = chosen.href;
  sampleLinks.forEach(link => {
    if (link === chosen) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
}

async function selectSample(chosen) {
  const request = ++selection;
  const sample = chosen.dataset.sample;
  feedback.textContent = 'Loading sample…';
  try {
    if (!reports.has(sample)) {
      const response = await fetch('./samples/' + sample + '.json');
      if (!response.ok) throw new Error('Sample unavailable');
      reports.set(sample, await response.json());
    }
    if (request !== selection) return;
    renderSample(reports.get(sample), chosen);
    feedback.textContent = '';
  } catch {
    if (request !== selection) return;
    const fallback = document.createElement('a');
    fallback.href = chosen.href;
    fallback.textContent = 'Open the sample page';
    feedback.replaceChildren('Could not load the sample here. ', fallback);
  }
}

sampleLinks.forEach(link => link.addEventListener('click', event => {
  if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  void selectSample(link);
}));

const copyButton = document.querySelector('#copy-commands');
if (navigator.clipboard) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    const copyFeedback = document.querySelector('#copy-feedback');
    try {
      await navigator.clipboard.writeText(document.querySelector('#setup-commands').textContent);
      copyFeedback.textContent = 'Copied.';
    } catch {
      copyFeedback.textContent = 'Select the commands to copy them.';
    }
  });
}
