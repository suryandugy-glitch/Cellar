import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { siteOrigin, workspaceOrigin } from './vercel-origins.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('build/vercel/', root);
const site = 'deploy/pages';
const web = 'src/main/resources/web';

let landing = await readFile(new URL(site + '/index.html', root), 'utf8');
landing = landing.replace(/  <link rel="canonical" href="[^"]*">\r?\n/, siteOrigin
  ? '  <link rel="canonical" href="' + siteOrigin + '/">\n' +
    '  <meta property="og:url" content="' + siteOrigin + '/">\n'
  : '');
if (workspaceOrigin) {
  landing = landing.replace('href="#quick-start">Run Cellar locally</a>',
    'href="./workspace.html">Open workspace</a>');
}

const demo = await readFile(new URL(web + '/index.html', root), 'utf8');
await rm(output, { recursive: true, force: true });
await mkdir(new URL('samples/', output), { recursive: true });
await writeFile(new URL('index.html', output), landing);
await writeFile(new URL('demo.html', output), demo.replace('<html ', '<html data-preview '));
if (workspaceOrigin) {
  const workspace = demo.replace('<html ', '<html data-api-origin="' + workspaceOrigin + '" ')
    .replace('<title>', '<meta name="robots" content="noindex">\n  <title>');
  await writeFile(new URL('workspace.html', output), workspace);
}

const assets = [
  ...['walkthrough.html', 'guide.html', 'landing.css', 'walkthrough.js', 'guide.js', 'trace-grid.svg'].map(name => ({ source: site + '/' + name, name })),
  ...['app.css', 'app.js', 'logo.svg'].map(name => ({ source: web + '/' + name, name })),
  ...['passing.csv', 'passing.json', 'breaking.csv', 'breaking.json', 'fixed.csv', 'fixed.json']
    .map(file => ({ source: site + '/samples/' + file, name: 'samples/' + file }))
];
await Promise.all(assets.map(({ source, name }) => copyFile(new URL(source, root), new URL(name, output))));
console.log('Built the Cellar public site in build/vercel.');
