import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { siteOrigin, workspaceOrigin } from './vercel-origins.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('build/vercel/', root);
const site = 'deploy/pages';
const web = 'src/main/resources/web';

function restrictConnections(html, origin = '') {
  const policy = origin ? "connect-src 'self' " + origin : "connect-src 'self'";
  return html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' +
    '  <meta http-equiv="Content-Security-Policy" content="' + policy + '">');
}

let landing = await readFile(new URL(site + '/index.html', root), 'utf8');
let studio = await readFile(new URL(site + '/studio.html', root), 'utf8');
const canonicalOrigin = siteOrigin || 'https://cellar-csv.vercel.app';
studio = studio.replace(/  <link rel="canonical" href="[^"]*">\r?\n/,
  '  <link rel="canonical" href="' + canonicalOrigin + '/">\n');
landing = landing.replace(/  <link rel="canonical" href="[^"]*">\r?\n/,
  '  <link rel="canonical" href="' + canonicalOrigin + '/guard.html">\n' +
  '  <meta property="og:url" content="' + canonicalOrigin + '/guard.html">\n');
if (workspaceOrigin) {
  // A connected Java backend provides the live workspace entry. Public static
  // deployments instead offer the downloadable Java release.
  landing = landing.replace(
    '<a class="button button-primary" href="https://github.com/suryandugy-glitch/Cellar-Studio/releases/tag/guard-v3.1.0">Download Guard ZIP</a>',
    '<a class="button button-primary" href="./workspace.html">Open workspace</a>');
}

const demo = (await readFile(new URL(web + '/index.html', root), 'utf8'))
  .replace('</head>', '  <link rel="stylesheet" href="./neo-bento.css">\n</head>')
  .replace('<body>', '<body class="cellar-workspace-demo">');
await rm(output, { recursive: true, force: true });
await mkdir(new URL('samples/', output), { recursive: true });
await writeFile(new URL('index.html', output), restrictConnections(studio));
await writeFile(new URL('guard.html', output), restrictConnections(landing));
await writeFile(new URL('demo.html', output), restrictConnections(demo.replace('<html ', '<html data-preview ')));
if (workspaceOrigin) {
  const workspace = demo.replace('<html ', '<html data-api-origin="' + workspaceOrigin + '" ')
    .replace('<title>', '<meta name="robots" content="noindex">\n  <title>');
  await writeFile(new URL('workspace.html', output), restrictConnections(workspace, workspaceOrigin));
}
for (const page of ['walkthrough.html', 'guide.html', 'manual.html', 'workplace.html', 'studio.html', 'handbook.html', 'products.html', 'about.html', 'licenses.html', 'certifications.html', 'privacy.html', 'terms.html', 'policies.html', 'cookie-policy.html', 'refund-policy.html', 'business.html', 'contact.html', 'guard-app.html']) {
  const html = await readFile(new URL(site + '/' + page, root), 'utf8');
  await writeFile(new URL(page, output), restrictConnections(html));
  if (page === 'guide.html' && !workspaceOrigin) {
    const setup = html.replace(/<title>[^<]+<\/title>/, '<title>Cellar | Workspace setup</title>')
      .replace('Use Cellar with your exports.', 'Workspace setup')
      .replace('Start the Java workspace, define your contracts, and run the same checks before every release.',
        'This deployment has no connected Java workspace. Run Cellar locally or follow the shared workspace deployment guide below.');
    await writeFile(new URL('workspace.html', output), restrictConnections(setup));
  }
}

const assets = [
  { source: 'cellar.json', name: 'samples/contract.json' },
  ...['studio-maximal.css', 'guard-app.css', 'guard-app.js', 'guard-worker.js', 'guard-engine.js', 'theme-system.css', 'theme-system.js', 'studio-footer.css', 'cookie-consent.css', 'cookie-consent.js', 'landing.css', 'landing.js', 'product-theme.css', 'product-shell.js', 'detail-shell.css', 'detail-shell.js', 'explore-base.css', 'minimal-brutal.css', 'neo-bento.css', 'minimal-motion.js', 'studio-vision.css', 'studio-vision.js', 'company-pages.css', 'company-pages.js', 'enquiry-form.js', 'verification-schematic.svg', 'walkthrough.js', 'guide.js', 'trace-grid.svg', 'studio.css', 'studio-brutalist.css', 'studio.js'].map(name => ({ source: site + '/' + name, name })),
  ...['app.css', 'app.js', 'logo.svg'].map(name => ({ source: web + '/' + name, name })),
  ...['passing.csv', 'passing.json', 'breaking.csv', 'breaking.json', 'fixed.csv', 'fixed.json']
    .map(file => ({ source: site + '/samples/' + file, name: 'samples/' + file }))
];
await Promise.all(assets.map(({ source, name }) => copyFile(new URL(source, root), new URL(name, output))));
const { execFileSync } = await import('node:child_process');
const { fileURLToPath } = await import('node:url');
execFileSync(process.execPath, [fileURLToPath(new URL('deploy/theme-inject.mjs', root)), fileURLToPath(output)]);

// Publish one primary domain: Studio HQ lives at / (index.html), while
// Cellar Guard remains a separate product page at /guard.html.
// Rewriting after catalog/theme generation also handles injected links.
const publicOrigin = 'https://cellar-csv.vercel.app';
for (const entry of await readdir(output, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.html$/.test(entry.name)) continue;
  const file = new URL(entry.name, output);
  const original = await readFile(file, 'utf8');
  let html = original
    .replace(/https:\/\/cellar-studio-hq\.vercel\.app/g, publicOrigin)
    .replaceAll('href="./studio.html#possibilities"', 'href="./#possibilities"');
  if (html !== original) await writeFile(file, html);
}
console.log('Built Cellar Studio and its sole product, Cellar Guard, in build/vercel.');
