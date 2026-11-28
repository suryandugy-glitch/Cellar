const skip = new Set('a an and are about can could do does for from have how i in is it me my of on or should the this to use was what when where which why will with would you your'.split(' '));

function words(value) {
  return (value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(word => word.length > 1 && !skip.has(word));
}

export function findHelp(documents, question, page, previous = '') {
  const query = new Set(words(question));
  const context = new Set(words(previous));
  const results = [];
  for (const doc of documents) {
    for (const section of doc.sections) {
      const title = new Set(words(doc.label + ' ' + section.title));
      const body = new Set(words(section.text));
      const termScore = term => title.has(term) ? 4 : body.has(term) ? 1 : 0;
      let score = 0;
      for (const term of query) score += termScore(term);
      for (const term of context) if (!query.has(term)) score += termScore(term) * 0.35;
      if (doc.page === page) score += /\b(this|current) page\b/i.test(question) ? 12 : 1.5;
      if (doc.page === 'contact.html' && /\b(contact|support)\b/i.test(question)) score += 6;
      if (score > 0) results.push({ ...section, page: doc.page, label: doc.label, score });
    }
  }
  const selected = [];
  const counts = new Map();
  for (const result of results.sort((a, b) => b.score - a.score)) {
    const count = counts.get(result.page) ?? 0;
    if (count === 2) continue;
    selected.push(result);
    if (selected.length === 6) break;
    counts.set(result.page, count + 1);
  }
  return selected;
}

export function helpSources(matches) {
  return [...new Map(matches.map(({ page, label }) => [page, { page, label }])).values()].slice(0, 4);
}

export function siteGuide(matches) {
  const best = matches[0];
  if (!best) return 'I couldn’t find an answer in the site guide. Try asking about CSV checks, themes, or support.';
  const limit = 360;
  const excerpt = best.text.length <= limit ? best.text : best.text.slice(0, limit).replace(/\s+\S*$/, '') + '…';
  return best.title + '\n\n' + excerpt;
}
