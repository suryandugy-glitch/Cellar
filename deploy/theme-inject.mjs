import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = process.argv[2];
if (!directory) throw new Error('Provide the generated website output directory.');
const root = resolve(directory);
const footerTemplate = await readFile(new URL('./site-footer.html', import.meta.url), 'utf8');
const footerMarker = '<!-- STUDIO_FOOTER -->';
const links = '  <link rel="stylesheet" href="./theme-system.css">\n' +
  '  <link rel="stylesheet" href="./studio-footer.css">\n' +
  '  <link rel="stylesheet" href="./cookie-consent.css">\n' +
  '  <script src="./theme-system.js"></script>\n' +
  '  <script src="./cookie-consent.js" defer></script>\n';
let count = 0;
for (const name of await readdir(root)) {
  if (!name.endsWith('.html')) continue;
  const path = resolve(root, name);
  let html = await readFile(path, 'utf8');
  if (html.includes(footerMarker)) html = html.replace(footerMarker, footerTemplate.trim());
  if (html.includes('theme-system.js')) {
    await writeFile(path, html);
    continue;
  }
  if (!/<\/head>/i.test(html)) throw new Error(`Missing closing head in ${name}`);
  await writeFile(path, html.replace(/<\/head>/i, `${links}</head>`));
  count++;
}
console.log(`Shared theme installed on ${count} HTML pages.`);
