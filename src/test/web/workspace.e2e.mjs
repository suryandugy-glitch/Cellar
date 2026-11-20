import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:https';
import { once } from 'node:events';
import { config } from '../../../vercel.mjs';
import { siteOrigin, workspaceOrigin } from '../../../deploy/vercel-origins.mjs';
import { chromium } from '../../../build/e2e/node_modules/playwright/index.mjs';

const root = new URL('../../../', import.meta.url);
const frontend = new URL(siteOrigin);
const backend = new URL(workspaceOrigin);
assert.equal(frontend.hostname, '127.0.0.1');
assert.equal(backend.hostname, 'localhost');
const key = process.env.CELLAR_ACCESS_KEY;
assert.ok(key);

const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/workspace.html', ['workspace.html', 'text/html']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/app.css', ['app.css', 'text/css']],
  ['/landing.css', ['landing.css', 'text/css']],
  ['/logo.svg', ['logo.svg', 'image/svg+xml']],
  ['/trace-grid.svg', ['trace-grid.svg', 'image/svg+xml']]
]);
const server = createServer({
  key: await readFile(new URL('build/e2e/frontend.key', root)),
  cert: await readFile(new URL('build/e2e/frontend.crt', root))
}, async (request, response) => {
  const asset = assets.get(request.url);
  if (!asset) { response.writeHead(404).end(); return; }
  try {
    const body = await readFile(new URL('build/vercel/' + asset[0], root));
    for (const { key, value } of config.headers[0].headers) response.setHeader(key, value);
    response.writeHead(200, { 'Content-Type': asset[1] }).end(body);
  } catch {
    response.writeHead(500).end();
  }
});
server.listen(Number(frontend.port), frontend.hostname);
await once(server, 'listening');
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome' });
  // Both fixture origins above are loopback HTTPS endpoints with temporary certificates.
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const allowed = await page.request.fetch(workspaceOrigin + '/api/check', {
    method: 'OPTIONS',
    headers: {
      Origin: siteOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,x-access-key'
    }
  });
  assert.equal(allowed.status(), 204);
  assert.equal(allowed.headers()['access-control-allow-origin'], siteOrigin);

  const denied = await page.request.fetch(workspaceOrigin + '/api/check', {
    method: 'OPTIONS',
    headers: { Origin: 'https://other.example', 'Access-Control-Request-Method': 'POST' }
  });
  assert.equal(denied.status(), 403);
  assert.equal(denied.headers()['access-control-allow-origin'], undefined);
  const foreignPost = await page.request.post(workspaceOrigin + '/api/check', {
    headers: { Origin: 'https://other.example', 'X-Access-Key': key },
    data: { csv: 'order_id,sku,total_cents,currency\nE2E-1,TEST,100,INR\n' }
  });
  assert.equal(foreignPost.status(), 403);
  const unsupported = await page.request.fetch(workspaceOrigin + '/api/config', {
    method: 'OPTIONS',
    headers: { Origin: siteOrigin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'x-other' }
  });
  assert.equal(unsupported.status(), 403);

  await page.goto(siteOrigin);
  await page.getByRole('link', { name: 'Open workspace' }).click();
  await page.getByRole('heading', { name: 'Unlock Cellar' }).waitFor();
  await page.getByLabel('Access key').fill('incorrect-test-key');
  await page.getByRole('button', { name: 'Unlock workspace' }).click();
  await page.getByText('Access key required.', { exact: true }).waitFor();
  await page.getByLabel('Access key').fill(key);
  await page.getByRole('button', { name: 'Unlock workspace' }).click();
  await page.getByText('Server connected', { exact: true }).waitFor();
  await page.getByRole('navigation', { name: 'Workspace' }).getByRole('link', { name: 'Check an export', exact: true }).click();

  const result = page.getByRole('region', { name: 'Check results' });
  const upload = page.getByLabel('Upload Export CSV');
  for (const [column, verdict] of [['id', 'Release blocked'], ['order_id', 'Ready to ship']]) {
    await upload.setInputFiles({
      name: column + '.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(column + ',sku,total_cents,currency\nE2E-1,TEST,100,INR\n')
    });
    await page.getByText('Loaded ' + column + '.csv.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Run check' }).click();
    await result.getByRole('heading', { name: verdict, exact: true }).waitFor();
  }

  await page.getByRole('link', { name: 'Run history' }).click();
  const rows = page.getByRole('table').getByRole('row');
  await rows.nth(1).getByRole('cell', { name: 'Passed', exact: true }).waitFor();
  await rows.nth(2).getByRole('cell', { name: 'Blocked', exact: true }).waitFor();
  await page.reload();
  await rows.nth(1).getByRole('cell', { name: 'Passed', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Lock workspace' }).click();
  await page.getByRole('heading', { name: 'Unlock Cellar' }).waitFor();
  console.log('Browser workspace checks passed: preflight, authentication, uploads, verdicts, history and lock.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
