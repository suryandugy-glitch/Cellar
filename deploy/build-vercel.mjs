import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('build/vercel/', root);
const site = 'deploy/pages';
const web = 'src/main/resources/web';

function httpsOrigin(value, name) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password &&
        url.pathname === '/' && !url.search && !url.hash && url.href === url.origin + '/') {
      return url.href;
    }
  } catch {
    // Report the variable name without printing its value.
  }
  throw new Error(name + ' must be an HTTPS origin, such as https://cellar.example.com');
}

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const canonical = httpsOrigin(process.env.CELLAR_SITE_URL || (productionDomain && 'https://' + productionDomain),
  'CELLAR_SITE_URL or VERCEL_PROJECT_PRODUCTION_URL');
const workspace = httpsOrigin(process.env.CELLAR_WORKSPACE_URL, 'CELLAR_WORKSPACE_URL');
if (workspace && workspace === canonical) throw new Error('The workspace must use a separate origin from the public site.');

let landing = await readFile(new URL(site + '/index.html', root), 'utf8');
landing = landing.replace(/  <link rel="canonical" href="[^"]*">\r?\n/, canonical
  ? '  <link rel="canonical" href="' + escapeAttribute(canonical) + '">\n' +
    '  <meta property="og:url" content="' + escapeAttribute(canonical) + '">\n'
  : '');
if (workspace) {
  landing = landing.replace('href="#quick-start">Run Cellar locally</a>',
    'href="' + escapeAttribute(workspace) + '">Open workspace</a>');
}

const demo = await readFile(new URL(web + '/index.html', root), 'utf8');
await rm(output, { recursive: true, force: true });
await mkdir(new URL('samples/', output), { recursive: true });
await writeFile(new URL('index.html', output), landing);
await writeFile(new URL('demo.html', output), demo.replace('<html ', '<html data-preview '));

const assets = [
  ...['walkthrough.html', 'guide.html', 'landing.css', 'walkthrough.js', 'guide.js', 'trace-grid.svg'].map(name => ({ source: site + '/' + name, name })),
  ...['app.css', 'app.js', 'logo.svg'].map(name => ({ source: web + '/' + name, name })),
  ...['passing.csv', 'passing.json', 'breaking.csv', 'breaking.json', 'fixed.csv', 'fixed.json']
    .map(file => ({ source: site + '/samples/' + file, name: 'samples/' + file }))
];
await Promise.all(assets.map(({ source, name }) => copyFile(new URL(source, root), new URL(name, output))));
console.log('Built the Cellar public site in build/vercel.');
