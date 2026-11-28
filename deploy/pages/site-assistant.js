import { findHelp, helpSources, siteGuide } from './assistant-search.js';

const base = new URL('./', import.meta.url);
const page = location.pathname.split('/').pop() || 'index.html';
const contextPage = page.endsWith('.html') ? page : page + '.html';
const history = [];
let lastQuestion = '';
let publicIndex;

function element(tag, text, attributes = {}) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

const launch = element('button', 'Ask Cellar', { type: 'button', class: 'site-assistant-launch', 'aria-haspopup': 'dialog' });
const dialog = element('dialog', '', { class: 'site-assistant', 'aria-labelledby': 'site-assistant-title' });
const head = element('header');
const title = element('h2', 'Ask Cellar', { id: 'site-assistant-title' });
const headerControls = element('div', '', { class: 'site-assistant-header-controls' });
const reset = element('button', 'New chat', { type: 'button' });
const expand = element('button', 'Expand', { type: 'button', 'aria-pressed': 'false' });
const close = element('button', 'Close', { type: 'button' });
headerControls.append(reset, expand, close);
head.append(title, headerControls);
const log = element('div', '', { class: 'site-assistant-log', role: 'log', 'aria-label': 'Conversation', tabindex: '0' });
const initial = element('p', 'Ask a question, work through an example, or get help using Cellar Studio.');
log.append(initial);
const suggestions = element('div', '', { class: 'site-assistant-suggestions' });
const form = element('form', '', { class: 'site-assistant-form' });
const field = element('textarea', '', { id: 'site-assistant-question', rows: '2', maxlength: '2000', required: '', placeholder: 'What would you like to figure out?' });
const send = element('button', 'Ask', { type: 'submit' });
const status = element('p', '', { class: 'site-assistant-status', role: 'status' });
const privacy = element('p', 'Recent chat messages may be sent to the AI provider. Leave out passwords and customer records.', { class: 'site-assistant-privacy' });
const controls = element('div', '', { class: 'site-assistant-input' });
controls.append(field, send);
form.append(element('label', 'Your question', { for: field.id }), controls, status, privacy);
dialog.append(head, log, suggestions, form);
document.body.append(launch, dialog);

if (location.hostname.endsWith('.github.io')) {
  initial.append(' ', element('a', 'Open AI chat', { href: 'https://cellar-csv.vercel.app/?ask=1' }));
}

for (const [label, question] of [
  ['Show me a CSV demo', 'Show me a small example of a CSV failing a Cellar Guard check, then explain how to fix it.'],
  ['Explain a general topic', 'Explain compound interest with a simple, worked example.'],
  ['How do I contact support?', 'How do I contact support?'],
]) {
  const button = element('button', label, { type: 'button' });
  button.addEventListener('click', () => {
    field.value = question;
    form.requestSubmit();
  });
  suggestions.append(button);
}

function addMessage(label, text, sources = [], role = 'answer') {
  const item = element('article', '', { class: 'site-assistant-' + role });
  item.append(element('strong', label), element('p', text));
  const links = element('ul', '', { class: 'site-assistant-sources', 'aria-label': 'Related pages' });
  for (const source of sources) {
    if (typeof source.label !== 'string' || !/^[a-z0-9-]+\.html$/.test(source.page)) continue;
    const li = element('li');
    li.append(element('a', source.label, { href: new URL(source.page === 'index.html' ? './' : source.page, base).href }));
    links.append(li);
  }
  if (links.childElementCount) item.append(links);
  log.append(item);
  // Bound the transcript so a long session stays responsive on a phone.
  if (log.childElementCount > 25) log.firstElementChild.remove();
  log.scrollTop = log.scrollHeight;
}

async function getGuide(question) {
  if (!publicIndex) {
    publicIndex = fetch(new URL('assistant-index.json', base)).then(response => {
      if (!response.ok) throw new Error('Site guide unavailable.');
      return response.json();
    }).catch(error => { publicIndex = undefined; throw error; });
  }
  const matches = findHelp(await publicIndex, question, contextPage, lastQuestion);
  return { mode: 'guide', answer: siteGuide(matches), sources: helpSources(matches) };
}

async function getAnswer(question) {
  if (!location.hostname.endsWith('.github.io')) {
    try {
      const response = await fetch(new URL('api/site-assistant', base), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history, page: contextPage }),
        signal: AbortSignal.timeout(13_000),
      });
      if (response.ok) {
        const result = await response.json();
        if (typeof result.answer === 'string') return result;
      }
    } catch {
      // The public guide is also available without the model endpoint.
    }
  }
  return getGuide(question);
}

launch.addEventListener('click', () => dialog.showModal());
close.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => launch.focus());
reset.addEventListener('click', () => {
  history.length = 0;
  lastQuestion = '';
  log.replaceChildren(initial);
  suggestions.hidden = false;
  field.value = '';
  status.textContent = '';
  field.focus();
});
expand.addEventListener('click', () => {
  const expanded = dialog.classList.toggle('site-assistant-expanded');
  expand.setAttribute('aria-pressed', String(expanded));
  log.scrollTop = log.scrollHeight;
});
if (new URL(location.href).searchParams.get('ask') === '1') dialog.showModal();

form.addEventListener('submit', async event => {
  event.preventDefault();
  const question = field.value.trim();
  if (!question || send.disabled) return;
  addMessage('You', question, [], 'question');
  field.value = '';
  send.disabled = true;
  reset.disabled = true;
  suggestions.hidden = true;
  status.textContent = 'Preparing a reply…';
  try {
    const result = await getAnswer(question);
    const ai = result.mode === 'ai';
    const answer = ai ? result.answer : 'AI chat is unavailable right now. Here’s what the site guide found.\n\n' + result.answer;
    addMessage(ai ? 'Cellar assistant' : 'Site guide', answer, result.sources);
    history.push({ role: 'user', content: question });
    if (ai) history.push({ role: 'assistant', content: result.answer.slice(0, 2800) });
    if (history.length > 6) history.splice(0, history.length - 6);
    lastQuestion = question;
  } catch {
    addMessage('Site guide', 'AI chat and the site guide could not load. You can still open the manual or contact support.', [
      { page: 'manual.html', label: 'Cellar Guard manual' },
      { page: 'contact.html', label: 'Contact support' },
    ]);
  } finally {
    status.textContent = '';
    send.disabled = false;
    reset.disabled = false;
  }
});
