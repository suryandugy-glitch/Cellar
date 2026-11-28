import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const entities = { amp: '&', apos: "'", quot: '"', lt: '<', gt: '>', nbsp: ' ', rsquo: '’', ndash: '–', mdash: '—' };

function plainText(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&([a-z]+);|&#(x[0-9a-f]+|\d+);/gi, (match, name, number) => {
    if (name) return entities[name] ?? match;
    const point = number.startsWith('x') ? Number.parseInt(number.slice(1), 16) : Number(number);
    return point <= 0x10ffff ? String.fromCodePoint(point) : match;
  }).replace(/\s+/g, ' ').trim();
}

export async function buildAssistantIndex(directory, files) {
  const documents = [];
  for (const page of files) {
    if (!/^[a-z0-9-]+\.html$/.test(page) || page === 'workspace.html') continue;
    const html = await readFile(resolve(directory, page), 'utf8');
    if (html.includes('data-account-page=')) continue;
    const label = plainText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? page);
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? '';
    const content = main.replace(/<(script|style|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
    const sections = content.split(/(?=<h[1-3]\b)/i).map(part => {
      const heading = part.match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i);
      const title = heading ? plainText(heading[1]) : label;
      const text = plainText(heading ? part.slice(heading.index + heading[0].length) : part);
      return { title, text: text.slice(0, 1800) };
    }).filter(section => section.text.length > 30);
    if (page === 'demo.html') {
      sections.push({
        title: 'Try sample checks',
        text: 'The demo shows synthetic CSV checks and reports. Open the CSV Checker from the Cellar Guard product page to choose a file, paste CSV text, and set your own import rules.',
      });
    }
    documents.push({ page, label, sections });
  }
  await writeFile(resolve(directory, 'assistant-index.json'), JSON.stringify(documents) + '\n');
}
