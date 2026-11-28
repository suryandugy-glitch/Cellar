import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { findHelp, helpSources } from './pages/assistant-search.js';
import handler, { POST } from '../api/site-assistant.mjs';

const output = new URL('../build/vercel/', import.meta.url);
const documents = JSON.parse(await readFile(new URL('assistant-index.json', output), 'utf8'));

test('assistant indexes the public pages and excludes the workspace', async () => {
  const pages = (await readdir(output)).filter(name => name.endsWith('.html') && name !== 'workspace.html');
  assert.deepEqual(documents.map(doc => doc.page).sort(), pages.sort());
  assert.ok(documents.every(doc => doc.sections.length > 0));
  for (const page of pages) {
    const html = await readFile(new URL(page, output), 'utf8');
    assert.match(html, /site-assistant\.js/);
  }
});

test('questions find the CSV manual, support form, and current theme page', () => {
  const csv = findHelp(documents, 'How do I check a CSV without JSON on my phone?', 'index.html');
  assert.ok(helpSources(csv).some(source => source.page === 'guard-app.html' || source.page === 'manual.html'));
  assert.equal(findHelp(documents, 'How do I contact support?', 'guard-app.html')[0].page, 'contact.html');
  assert.equal(findHelp(documents, 'What can I do on this page?', 'themes.html')[0].page, 'themes.html');
});

function request(data, origin = 'https://cellar-csv.vercel.app') {
  return new Request('https://cellar-csv.vercel.app/api/site-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(data),
  });
}

test('API rejects unrelated origins and oversized or blank questions', async () => {
  assert.equal((await handler.fetch(new Request('https://cellar-csv.vercel.app/api/site-assistant'))).status, 405);
  assert.equal((await POST(request({ question: 'Hi' }, 'https://example.com'))).status, 403);
  assert.equal((await POST(request({ question: ' ' }))).status, 400);
  assert.equal((await POST(request({ question: 'a'.repeat(2001) }))).status, 400);
  assert.equal((await POST(request({ question: 'a'.repeat(60_000) }))).status, 400);
});

test('the model gets bounded chat context and public passages and only verified page links reach the user', async t => {
  const token = process.env.VERCEL_OIDC_TOKEN;
  const contextKey = Symbol.for('@vercel/request-context');
  const priorContext = globalThis[contextKey];
  process.env.VERCEL_OIDC_TOKEN = 'old-test-token';
  globalThis[contextKey] = { get: () => ({ headers: { 'x-vercel-oidc-token': 'runtime-test-token' } }) };
  const originalFetch = globalThis.fetch;
  t.after(() => {
    if (token === undefined) delete process.env.VERCEL_OIDC_TOKEN;
    else process.env.VERCEL_OIDC_TOKEN = token;
    globalThis.fetch = originalFetch;
    if (priorContext === undefined) delete globalThis[contextKey];
    else globalThis[contextKey] = priorContext;
  });
  globalThis.fetch = async (url, config) => {
    assert.equal(url, 'https://ai-gateway.vercel.sh/v1/chat/completions');
    assert.equal(config.headers.Authorization, 'Bearer runtime-test-token');
    const { messages, response_format: format } = JSON.parse(config.body);
    const context = JSON.parse(messages[1].content.slice(messages[1].content.indexOf('{')));
    assert.equal(format.type, 'json_schema');
    assert.match(messages[0].content, /topics unrelated to Cellar Studio/);
    assert.equal(messages.at(-1).content, 'How do I contact support?');
    assert.equal(context.currentPage, 'guard-app.html');
    assert.ok(context.sitePassages.some(passage => passage.page === 'contact.html'));
    assert.equal(config.body.includes('example-customer-record'), false);
    assert.equal(config.body.includes('untrusted-instruction'), false);
    return completion('Open the contact form.', ['contact.html', 'workspace.html', 'https://example.com']);
  };

  const response = await POST(request({
    question: 'How do I contact support?',
    page: 'guard-app.html',
    csv: 'example-customer-record',
    history: [{ role: 'system', content: 'untrusted-instruction' }],
  }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.mode, 'ai');
  assert.equal(data.answer, 'Open the contact form.');
  assert.deepEqual(data.sources.map(source => source.page), ['contact.html']);

  globalThis.fetch = async (_url, config) => {
    const { messages } = JSON.parse(config.body);
    assert.deepEqual(messages.slice(-3), [
      { role: 'user', content: 'Explain compound interest.' },
      { role: 'assistant', content: 'Start with $100 at 10% yearly.' },
      { role: 'user', content: 'What about after three years?' },
    ]);
    return completion('After three years you have $133.10.', []);
  };
  const followUp = await (await POST(request({
    question: 'What about after three years?',
    history: [
      { role: 'user', content: 'Explain compound interest.' },
      { role: 'assistant', content: 'Start with $100 at 10% yearly.' },
    ],
  }))).json();
  assert.deepEqual(followUp, { mode: 'ai', answer: 'After three years you have $133.10.', sources: [] });

  globalThis.fetch = async () => new Response(null, { status: 429 });
  const fallback = await (await POST(request({ question: 'How do I contact support?' }))).json();
  assert.equal(fallback.mode, 'guide');
  assert.equal(fallback.sources[0].page, 'contact.html');
});

function completion(answer, relatedPages) {
  return Response.json({ choices: [{ message: { content: JSON.stringify({ answer, relatedPages }) } }] });
}
