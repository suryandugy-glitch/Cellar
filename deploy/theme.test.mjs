import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('build/vercel');
const redirects = JSON.parse(await readFile(resolve('vercel.json'), 'utf8')).redirects;
assert.ok(!redirects.some(route => route.source === '/' &&
  (!route.has || route.has.some(check => check.type === 'host' && check.value === 'cellar-csv.vercel.app'))),
  'CSV domain root must serve the Studio index without a redirect');
assert.ok(redirects.some(route => route.source === '/' && route.destination === 'https://cellar-csv.vercel.app/' &&
  route.has?.some(check => check.type === 'host' && check.value === 'cellar-studio-hq.vercel.app')),
  'legacy studio domain must lead to the CSV domain');
const files = (await readdir(root)).filter(file => file.endsWith('.html'));
assert.ok(files.length >= 18, 'expected Guard, manual, sample, and company pages');
for (const file of files) {
  const html = await readFile(resolve(root, file), 'utf8');
  assert.equal(html.split('theme-system.css').length - 1, 1, `${file}: missing/duplicate theme CSS`);
  assert.equal(html.split('studio-footer.css').length - 1, 1, `${file}: missing/duplicate footer CSS`);
  assert.equal(html.split('cookie-consent.css').length - 1, 1, `${file}: missing/duplicate consent CSS`);
  assert.equal(html.split('theme-system.js').length - 1, 1, `${file}: missing/duplicate theme JS`);
  assert.equal(html.split('cookie-consent.js').length - 1, 1, `${file}: missing/duplicate consent JS`);
  for (const image of html.matchAll(/<img\b[^>]*>/gi)) {
    assert.match(image[0], /\balt\s*=/i, `${file}: image missing alt attribute`);
  }
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
assert.match(home, /id="possibilities"/);
assert.match(home, /Cellar Guard/);
assert.match(home, /href="\.\/manual\.html"/);
assert.match(home, /rel="canonical" href="https:\/\/cellar-csv\.vercel\.app\/"/);
const guard = await readFile(resolve(root, 'guard.html'), 'utf8');
assert.match(guard, /href="\.\/#possibilities"/);
const studio = await readFile(resolve(root, 'studio.html'), 'utf8');
assert.match(studio, /href="https:\/\/cellar-csv\.vercel\.app\/"/);
assert.match(studio, /href="\.\/guard\.html"/);
assert.match(studio, /id="possibilities"/);
for (const file of files) {
  const html = await readFile(resolve(root, file), 'utf8');
  assert.doesNotMatch(html, /cellar-studio-hq\.vercel\.app/, `${file}: old public hostname`);
  assert.doesNotMatch(html, /href="\.\/studio\.html#possibilities"/, `${file}: obsolete studio subpage anchor`);
}
for (const page of ['about.html', 'licenses.html', 'certifications.html', 'privacy.html', 'terms.html', 'policies.html', 'cookie-policy.html', 'refund-policy.html', 'business.html', 'contact.html']) {
  assert.match(home, new RegExp(`href="\\./${page}"`), `home: missing ${page}`);
  const html = await readFile(resolve(root, page), 'utf8');
  assert.match(html, /company-pages\.css/);
  assert.match(html, /company-pages\.js/);
  assert.match(html, /studio-site-footer/);
  assert.doesNotMatch(html, /STUDIO_FOOTER/);
  assert.match(html, /href="\.\/#possibilities"/, `${page}: studio navigation`);
}
for (const page of ['about.html', 'licenses.html', 'certifications.html']) {
  const html = await readFile(resolve(root, page), 'utf8');
  assert.match(html, /aria-current="page"/);
}
for (const file of ['index.html', 'manual.html', 'handbook.html']) {
  const html = await readFile(resolve(root, file), 'utf8');
  assert.equal(html.split('studio-site-footer').length - 1, 1, `${file}: expected one shared footer`);
  assert.match(html, /aria-label="Footer sitemap"/);
}
const about = await readFile(resolve(root, 'about.html'), 'utf8');
assert.match(about, /Suryandu Ganguly/);
assert.match(about, /Gunjan Roy/);
assert.match(about, /first focused product is Cellar Guard/);
const licenses = await readFile(resolve(root, 'licenses.html'), 'utf8');
assert.match(licenses, /Copyright \(c\) 2026 Cellar contributors/);
assert.match(licenses, /THE SOFTWARE IS PROVIDED "AS IS"/);
const credentials = await readFile(resolve(root, 'certifications.html'), 'utf8');
assert.match(credentials, /No verified company certifications currently listed/);
assert.doesNotMatch(credentials, /ISO 27001 certified|SOC 2 certified/i);
const privacy = await readFile(resolve(root, 'privacy.html'), 'utf8');
assert.match(privacy, /cellar-privacy-preferences/);
assert.match(privacy, /does not submit that text to Cellar Studio/);
const cookies = await readFile(resolve(root, 'cookie-policy.html'), 'utf8');
assert.match(cookies, /data-open-privacy-settings/);
assert.match(cookies, /Google Fonts and Vercel hosting/);
const refund = await readFile(resolve(root, 'refund-policy.html'), 'utf8');
assert.match(refund, /does not operate a paid checkout/);
const business = await readFile(resolve(root, 'business.html'), 'utf8');
assert.match(business, /Not publicly verified or announced/);
const contact = await readFile(resolve(root, 'contact.html'), 'utf8');
assert.match(contact, /id="enquiry-consent"[^>]*required/);
assert.match(contact, /id="enquiry-status" role="status" aria-live="polite"/);
assert.match(contact, /Copy enquiry to clipboard/);
assert.match(contact, /Clear form/);
assert.doesNotMatch(contact, /type="submit">Send/);
const formScript = await readFile(resolve(root, 'enquiry-form.js'), 'utf8');
assert.match(formScript, /navigator\.clipboard\.writeText/);
assert.doesNotMatch(formScript, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|\.submit\s*\(/);
const consentScript = await readFile(resolve(root, 'cookie-consent.js'), 'utf8');
assert.match(consentScript, /cellar-privacy-preferences/);
assert.match(consentScript, /data-privacy-essential/);
assert.match(consentScript, /data-privacy-allow/);
assert.match(consentScript, /if \(!preferences\?\.embeds\)/);
assert.doesNotMatch(consentScript, /gtag\s*\(|facebook\.com\/tr|google-analytics/);
for (const retired of ['explore.html','services.html','downloads.html','product-guard.html','product-deadlock.html','product-buildclinic.html','product-clausecraft.html','product-plancliff.html','product-crashcheck.html','product-learn.html','deadlock.html','deadlock-downloads.html']) {
  assert.ok(!files.includes(retired), `${retired}: retired catalogue or unrelated product page must not be published`);
}
const manual = await readFile(resolve(root,'manual.html'),'utf8');
assert.match(manual, /id="pr"/);
assert.match(manual, /csv-compatibility/);
assert.match(manual, /Cellar Guard/);
const js = await readFile(resolve(root, 'theme-system.js'), 'utf8');
assert.match(js, /localStorage\.setItem/);
assert.match(js, /Switch to/);
console.log(`${files.length} Guard-only HTML pages pass theme and navigation checks.`);
