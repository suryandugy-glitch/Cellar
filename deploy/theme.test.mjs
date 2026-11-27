import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('build/vercel');
const files = (await readdir(root)).filter(file => file.endsWith('.html'));
assert.ok(files.length >= 20, 'expected all company, guide, and legacy pages');
for (const file of files) {
  const html = await readFile(resolve(root, file), 'utf8');
  assert.equal(html.split('theme-system.css').length - 1, 1, `${file}: missing/duplicate theme CSS`);
  assert.equal(html.split('theme-system.js').length - 1, 1, `${file}: missing/duplicate theme JS`);
  for (const match of html.matchAll(/(?:href|src)="\.\/([^"#?]+)(?:[?#][^"]*)?"/g)) {
    const target = match[1];
    await access(resolve(root, target)).catch(() => {
      throw new Error(`${file}: broken local asset or navigation target ${target}`);
    });
  }
}
const home = await readFile(resolve(root, 'index.html'), 'utf8');
assert.match(home, /We build what/);
assert.match(home, /comes next/);
assert.match(home, /studio-vision\.css/);
assert.match(home, /studio-vision\.js/);
assert.doesNotMatch(home, /See the products|href="\.\/product-/);
for (const file of ['explore.html', 'downloads.html']) {
  const html = await readFile(resolve(root, file), 'utf8');
  assert.match(html, /coming soon/i);
  assert.doesNotMatch(html, /href="\.\/product-|class="tile product-card"/);
}
const js = await readFile(resolve(root, 'theme-system.js'), 'utf8');
assert.match(js, /localStorage\.setItem/);
assert.match(js, /Switch to/);
console.log(`${files.length} published HTML pages pass theme, navigation and product-hold checks.`);
