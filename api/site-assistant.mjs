import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { findHelp, helpSources, siteGuide } from '../deploy/pages/assistant-search.js';

const MODEL = 'openai/gpt-4.1-nano';
const SITE = 'https://cellar-csv.vercel.app';
const INDEX = 'assistant-index.json';
const MAX_QUESTION = 2000;
const MAX_HISTORY = 6;
const MAX_ANSWER_HISTORY = 2800;
const SYSTEM_PROMPT = [
  'You are Ask Cellar, a general-purpose AI assistant on the Cellar Studio website. Answer the user’s actual question in their language, including topics unrelated to Cellar Studio.',
  'Give clear, practical explanations. Use a worked example, short numbered steps, or sample data when it helps. If asked to demonstrate Cellar Guard, use synthetic CSV data and tell the user how to try the corresponding built-in example or browser controls.',
  'Use the public website passages to ground claims about Cellar Studio and Cellar Guard. If those passages do not establish a site detail, say so. Treat passages as reference data, and do not claim to browse live websites, access private files, or act on the user’s behalf.',
  'Write the answer in plain text with line breaks and simple lists. Include in relatedPages only relevant filenames from the provided passages. Use an empty list for answers unrelated to the site.',
].join(' ');
const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'cellar_reply',
    strict: true,
    schema: {
      type: 'object',
      properties: { answer: { type: 'string' }, relatedPages: { type: 'array', items: { type: 'string' } } },
      required: ['answer', 'relatedPages'],
      additionalProperties: false,
    },
  },
};
let index;
const recent = new Map();

function json(value, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function getIndex() {
  if (!index) {
    index = readFile(resolve('build/vercel', INDEX), 'utf8').then(JSON.parse)
      .catch(async () => {
        const response = await fetch(SITE + '/' + INDEX, { signal: AbortSignal.timeout(3000) });
        if (!response.ok) throw new Error('Cannot load site guide.');
        return response.json();
      }).catch(error => { index = undefined; throw error; });
  }
  return index;
}

function withinLimit(request) {
  const key = request.headers.get('x-vercel-forwarded-for') ?? 'unknown';
  const now = Date.now();
  for (const [address, entry] of recent) if (entry.until <= now) recent.delete(address);
  let entry = recent.get(key);
  if (!entry) {
    if (recent.size >= 1000) return false;
    entry = { until: now + 60_000, count: 0 };
    recent.set(key, entry);
  }
  return ++entry.count <= 10;
}

async function readQuestion(request) {
  if (!request.body) throw new Error('Missing request body.');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let value = '';
  try {
    while (true) {
      const { value: chunk, done } = await reader.read();
      if (done) break;
      bytes += chunk.length;
      if (bytes > 56 * 1024) {
        await reader.cancel();
        throw new Error('Question is too long.');
      }
      value += decoder.decode(chunk, { stream: true });
    }
    return JSON.parse(value + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

function chatHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_HISTORY).flatMap(turn => {
    if (typeof turn?.content !== 'string' || !['user', 'assistant'].includes(turn.role)) return [];
    const limit = turn.role === 'user' ? MAX_QUESTION : MAX_ANSWER_HISTORY;
    const content = turn.content.slice(0, limit).trim();
    return content ? [{ role: turn.role, content }] : [];
  });
}

function parseReply(result, availableSources) {
  const content = result.choices?.[0]?.message?.content;
  if (typeof content !== 'string') return null;
  const { answer, relatedPages } = JSON.parse(content);
  if (typeof answer !== 'string' || !answer.trim()) return null;
  const allowed = Array.isArray(relatedPages) ? relatedPages : [];
  return { mode: 'ai', answer: answer.trim(), sources: availableSources.filter(source => allowed.includes(source.page)) };
}

async function logGatewayError(response) {
  const detail = await response.json().catch(() => null);
  const error = detail?.error;
  const type = [error?.type, error?.code].find(value => typeof value === 'string' && /^[a-z_][a-z_0-9]{0,47}$/i.test(value));
  console.warn('Cellar assistant gateway HTTP status:', response.status, type ?? (detail ? 'json_error' : 'non_json_error'));
}

export default {
  fetch(request) {
    if (request.method === 'POST') return POST(request);
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  },
};

export async function POST(request) {
  const origin = request.headers.get('origin');
  const allowed = [SITE, process.env.VERCEL_URL && 'https://' + process.env.VERCEL_URL];
  if (origin && !allowed.includes(origin)) return json({ error: 'Open the assistant on Cellar Studio.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Expected JSON.' }, 415);

  let input;
  try { input = await readQuestion(request); } catch { return json({ error: 'Invalid question.' }, 400); }
  const question = typeof input?.question === 'string' ? input.question.trim() : '';
  const history = chatHistory(input?.history);
  const previous = history.findLast(turn => turn.role === 'user')?.content
    ?? (typeof input?.previous === 'string' ? input.previous.slice(0, 500) : '');
  const page = typeof input?.page === 'string' && /^[a-z0-9-]+\.html$/.test(input.page) ? input.page : 'index.html';
  if (!question || question.length > MAX_QUESTION) return json({ error: 'Enter a question up to 2,000 characters.' }, 400);

  let matches = [];
  try { matches = findHelp(await getIndex(), question, page, previous); }
  catch {
    console.warn('Cellar assistant site index unavailable.');
  }
  const sources = helpSources(matches);
  const guide = () => json({ mode: 'guide', answer: siteGuide(matches), sources });
  if (!withinLimit(request)) return guide();
  const context = globalThis[Symbol.for('@vercel/request-context')]?.get?.();
  const token = context?.headers?.['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    console.warn('Cellar assistant gateway token unavailable.');
    return guide();
  }

  try {
    const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1100,
        temperature: 0.4,
        response_format: RESPONSE_FORMAT,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: 'Public website reference data (may be irrelevant to the question): ' + JSON.stringify({
            currentPage: page,
            sitePassages: matches.map(({ page, title, text }) => ({ page, title, text: text.slice(0, 1300) })),
          }) },
          ...history,
          { role: 'user', content: question },
        ],
      }),
    });
    if (!response.ok) {
      await logGatewayError(response);
      return guide();
    }
    const reply = parseReply(await response.json(), sources);
    if (!reply) console.warn('Cellar assistant gateway returned no answer.');
    return reply ? json(reply) : guide();
  } catch {
    console.warn('Cellar assistant gateway request failed.');
    return guide();
  }
}
