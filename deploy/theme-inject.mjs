import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = process.argv[2];
if (!directory) throw new Error('Provide the generated website output directory.');
const root = resolve(directory);
const links = '  <link rel="stylesheet" href="./theme-system.css">\n' +
  '  <script src="./theme-system.js"></script>\n';
let count = 0;
for (const name of await readdir(root)) {
  if (!name.endsWith('.html')) continue;
  const path = resolve(root, name);
  const html = await readFile(path, 'utf8');
  if (html.includes('theme-system.js')) continue;
  if (!/<\/head>/i.test(html)) throw new Error(`Missing closing head in ${name}`);
  await writeFile(path, html.replace(/<\/head>/i, `${links}</head>`));
  count++;
}
console.log(`Shared theme installed on ${count} HTML pages.`);
