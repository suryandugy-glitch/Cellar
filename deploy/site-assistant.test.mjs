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
  assert.equal((await POST(request({ question: 'a'.repeat(600) }))).status, 400);
  assert.equal((await POST(request({ question: 'a'.repeat(5000) }))).status, 400);
});

test('the live model receives only public passages and question context', async t => {
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
    const context = JSON.parse(JSON.parse(config.body).messages[1].content);
    assert.equal(context.question, 'How do I contact support?');
    assert.equal(context.currentPage, 'guard-app.html');
    assert.ok(context.sitePassages.some(passage => passage.page === 'contact.html'));
    assert.equal(JSON.stringify(context).includes('example-customer-record'), false);
    return Response.json({ choices: [{ message: { content: 'Open the contact form.' } }] });
  };

  const response = await POST(request({
    question: 'How do I contact support?',
    page: 'guard-app.html',
    csv: 'example-customer-record',
  }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.mode, 'ai');
  assert.equal(data.answer, 'Open the contact form.');
  assert.equal(data.sources[0].page, 'contact.html');

  globalThis.fetch = async () => new Response(null, { status: 429 });
  const fallback = await (await POST(request({ question: 'How do I contact support?' }))).json();
  assert.equal(fallback.mode, 'guide');
  assert.equal(fallback.sources[0].page, 'contact.html');
});
