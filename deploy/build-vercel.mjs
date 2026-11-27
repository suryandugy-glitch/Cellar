import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
studio = studio.replace(/  <link rel="canonical" href="[^"]*">\r?\n/, siteOrigin
  ? '  <link rel="canonical" href="' + siteOrigin + '/">\n' : '');
landing = landing.replace(/  <link rel="canonical" href="[^"]*">\r?\n/, siteOrigin
  ? '  <link rel="canonical" href="' + siteOrigin + '/guard.html">\n' +
    '  <meta property="og:url" content="' + siteOrigin + '/guard.html">\n'
  : '');
if (workspaceOrigin) {
  landing = landing.replace('href="./guide.html#quick-start">Open workspace',
    'href="./workspace.html">Open workspace');
} else {
  landing = landing.replace('href="./guide.html#quick-start">Open workspace',
    'href="./guide.html#quick-start">Workspace setup');
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
for (const page of ['walkthrough.html', 'guide.html', 'workplace.html', 'studio.html', 'explore.html', 'deadlock.html']) {
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
  { source: site + '/SpaceFix.zip', name: 'SpaceFix.zip' },
  ...['landing.css', 'landing.js', 'product-theme.css', 'product-shell.js', 'detail-shell.css', 'detail-shell.js', 'minimal-brutal.css', 'neo-bento.css', 'minimal-motion.js', 'verification-schematic.svg', 'walkthrough.js', 'guide.js', 'trace-grid.svg', 'studio.css', 'studio-brutalist.css', 'studio.js'].map(name => ({ source: site + '/' + name, name })),
  ...['app.css', 'app.js', 'logo.svg'].map(name => ({ source: web + '/' + name, name })),
  ...['passing.csv', 'passing.json', 'breaking.csv', 'breaking.json', 'fixed.csv', 'fixed.json']
    .map(file => ({ source: site + '/samples/' + file, name: 'samples/' + file }))
];
await Promise.all(assets.map(({ source, name }) => copyFile(new URL(source, root), new URL(name, output))));
console.log('Built the Cellar Studio company site and Guard product site in build/vercel.');
