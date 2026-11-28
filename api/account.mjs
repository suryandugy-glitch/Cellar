import { createServerClient } from '@supabase/ssr';
import { parse, serialize } from 'cookie';
import { accountConfig } from '../server/account-config.mjs';

const sessionCookie = '__Host-cellar-session';
const rememberCookie = '__Host-cellar-remember';
const flowCookie = '__Host-cellar-signin';
const month = 30 * 24 * 60 * 60;
const flowExpiry = 15 * 60;
const maxBody = 8192;

function json(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(value));
}

function redirect(res, path) {
  res.statusCode = 303;
  res.setHeader('Location', path);
  res.end();
}

async function body(req) {
  if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new Error('Expected JSON');
  }
  if (Number(req.headers['content-length']) > maxBody) throw new Error('Request too large');
  let value = req.body;
  if (value === undefined) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxBody) throw new Error('Request too large');
      chunks.push(chunk);
    }
    value = Buffer.concat(chunks);
  }
  if (typeof value === 'string' || Buffer.isBuffer(value)) {
    if (Buffer.byteLength(value) > maxBody) throw new Error('Request too large');
    value = JSON.parse(value.toString());
  }
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Buffer.byteLength(JSON.stringify(value)) > maxBody) throw new Error('Invalid request');
  return value;
}

function requestCookies(req, res) {
  const jar = new Map(Object.entries(parse(req.headers.cookie || '')));
  const pending = new Map();
  return {
    get: name => jar.get(name),
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    set(name, value, maxAge) {
      if (maxAge === 0) jar.delete(name);
      else jar.set(name, value);
      pending.set(name, serialize(name, value, {
        secure: true, httpOnly: true, path: '/', sameSite: 'lax', maxAge,
      }));
      res.setHeader('Set-Cookie', [...pending.values()]);
    },
    clearSession() {
      for (const name of jar.keys()) {
        if (name === sessionCookie || name.startsWith(sessionCookie + '.') ||
            name === sessionCookie + '-code-verifier') this.set(name, '', 0);
      }
      this.set(rememberCookie, '', 0);
      this.set(flowCookie, '', 0);
    },
  };
}

function emailFrom(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? value.trim() : '';
}

function profile(user) {
  const metadata = user.user_metadata ?? {};
  const name = [metadata.full_name, metadata.name].find(value => typeof value === 'string' && value.trim());
  const avatarUrl = [metadata.avatar_url, metadata.picture].find(value => {
    if (typeof value !== 'string' || value.length > 2048) return false;
    const url = URL.parse(value);
    return url && !url.username && !url.password && /^https:\/\/lh[3-6]\.googleusercontent\.com$/.test(url.origin);
  });
  return { email: user.email || '', name: name?.trim().slice(0, 100) || '', avatarUrl: avatarUrl ?? null };
}

function authError(res, error, fallback, status = 400) {
  if (error?.status === 429) return json(res, 429, { error: 'Too many attempts. Wait a moment and try again.' });
  if (error?.status >= 500) return json(res, 503, { error: 'Account services are temporarily unavailable.' });
  return json(res, status, { error: fallback });
}

export function buildAccountHandler({ getConfig = accountConfig, createClient = createServerClient } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    try {
      const config = getConfig();
      const request = new URL(req.url, 'https://cellar.local');
      const action = request.searchParams.get('action') || 'session';
      const method = req.method;
      if (method !== 'GET' && method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        return json(res, 405, { error: 'Method not allowed.' });
      }
      if (method === 'POST' && (!config || req.headers.origin !== config.origin)) {
        return json(res, config ? 403 : 503, { error: config ? 'Open the Cellar Studio website to continue.' : 'Accounts are not available yet.' });
      }
      if (!config) return json(res, 200, { available: false, providers: [], user: null });

      const cookie = requestCookies(req, res);
      let remember = cookie.get(rememberCookie) === '1';
      if (method === 'GET' && ['callback', 'confirm'].includes(action)) {
        remember = action === 'callback' && cookie.get(flowCookie) === 'keep';
      }
      const { auth } = createClient(config.url, config.key, {
        cookieOptions: { name: sessionCookie },
        cookies: {
          getAll: cookie.getAll,
          setAll(changes) {
            for (const { name, value, options } of changes) {
              const clear = options.maxAge === 0 || value === '';
              const verifier = name.includes('-code-verifier');
              cookie.set(name, value, clear ? 0 : verifier ? flowExpiry : remember ? month : undefined);
            }
          },
        },
      });
      const account = '/account.html';
      const confirmUrl = config.origin + '/api/account?action=confirm';
      const rememberDevice = () => cookie.set(rememberCookie, remember ? '1' : '', remember ? month : 0);

      if (method === 'GET') {
        if (action === 'callback') {
          if (!cookie.get(flowCookie)) return redirect(res, '/signin.html?notice=provider');
          cookie.set(flowCookie, '', 0);
          const code = request.searchParams.get('code');
          if (!code || code.length > 2048) return redirect(res, '/signin.html?notice=provider');
          const { error } = await auth.exchangeCodeForSession(code);
          if (error) return redirect(res, '/signin.html?notice=provider');
          rememberDevice();
          return redirect(res, account);
        }
        if (action === 'confirm') {
          const token = request.searchParams.get('token_hash');
          if (!token || token.length > 512 || request.searchParams.get('type') !== 'email') {
            return redirect(res, '/signin.html?notice=confirm');
          }
          const confirm = createClient(config.url, config.key, {
            cookies: { getAll: () => [], setAll() {} },
          });
          const { error } = await confirm.auth.verifyOtp({ type: 'email', token_hash: token });
          if (error) return redirect(res, '/signin.html?notice=confirm');
          return redirect(res, '/signin.html?notice=verified');
        }
        if (action !== 'session') return json(res, 404, { error: 'Action not found.' });
        const hasSession = cookie.get(sessionCookie) || cookie.get(sessionCookie + '.0');
        const { data, error } = hasSession ? await auth.getUser() : {};
        if (error?.status >= 500) return authError(res, error, '');
        return json(res, 200, {
          available: true, providers: Object.keys(config.providers), user: data?.user ? profile(data.user) : null,
        });
      }

      let input;
      try { input = await body(req); } catch { return json(res, 400, { error: 'The request is invalid.' }); }
      if (action === 'logout') {
        const { error } = await auth.signOut({ scope: 'local' });
        cookie.clearSession();
        if (error && error.status >= 500) return authError(res, error, '');
        return json(res, 200, { ok: true });
      }
      remember = input.remember === true;
      if (action === 'oauth') {
        const provider = Object.hasOwn(config.providers, input.provider) ? config.providers[input.provider] : null;
        if (!provider) return json(res, 404, { error: 'This sign-in provider is unavailable.' });
        const options = { redirectTo: config.origin + '/api/account?action=callback', skipBrowserRedirect: true };
        if (provider === 'azure') options.scopes = 'email';
        const { data, error } = await auth.signInWithOAuth({ provider, options });
        if (error || !data?.url) return authError(res, error, 'Unable to open this sign-in provider.');
        const url = new URL(data.url);
        if (url.origin !== config.url || url.pathname !== '/auth/v1/authorize') {
          return json(res, 502, { error: 'Unable to open this sign-in provider.' });
        }
        cookie.set(flowCookie, remember ? 'keep' : 'session', flowExpiry);
        return json(res, 200, { url: url.href });
      }
      if (action !== 'signin' && action !== 'signup') return json(res, 404, { error: 'Action not found.' });
      const email = emailFrom(input.email);
      const password = input.password;
      if (!email || typeof password !== 'string' || !password.length || Buffer.byteLength(password) > 72) {
        return json(res, 400, { error: 'Enter a valid email address and password.' });
      }

      if (action === 'signin') {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) return authError(res, error, 'Could not sign in. Check your credentials and confirm your email.', 401);
        rememberDevice();
        return json(res, 200, { signedIn: true });
      }

      const name = typeof input.name === 'string' ? input.name.trim() : '';
      if (!name || name.length > 100 || password.length < 12) {
        return json(res, 400, { error: 'Enter a name and a password with at least 12 characters.' });
      }
      const { data, error } = await auth.signUp({
        email, password, options: { data: { full_name: name }, emailRedirectTo: confirmUrl },
      });
      if (error && !['user_already_exists', 'email_exists'].includes(error.code)) {
        return authError(res, error, 'Could not create the account. Check your details and try again.');
      }
      if (data?.session) {
        await auth.signOut({ scope: 'local' });
        cookie.clearSession();
        return json(res, 503, { error: 'Email confirmation is required before account creation can be used.' });
      }
      return json(res, 200, { confirmation: true });
    } catch {
      return json(res, 503, { error: 'Account services are temporarily unavailable.' });
    }
  };
}

export default buildAccountHandler();
