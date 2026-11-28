const element = id => document.getElementById(id);
const status = element('account-status');

async function request(action, payload) {
  const options = { cache: 'no-store', credentials: 'same-origin' };
  if (payload) {
    options.method = 'POST';
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(payload);
  }
  const response = await fetch('/api/account?action=' + action, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Please try again.');
  return result;
}

function message(text = '', error = false) {
  status.textContent = text;
  status.hidden = !text;
  status.dataset.state = error ? 'error' : 'info';
}

const goToAccount = () => location.replace('/account.html');

async function profilePage() {
  try {
    const { user, available } = await request('session');
    if (!user && available) return location.replace('/signin.html');
    if (!available) return message('Accounts are not available yet.');
    element('profile-name').textContent = user.name || 'No name provided';
    element('profile-email').textContent = user.email || 'No email provided';
    element('account-profile').hidden = false;
    element('profile-actions').hidden = false;
    message();
    element('account-logout').addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await request('logout', {});
        location.replace('/signin.html');
      } catch (error) {
        message(error.message, true);
        button.disabled = false;
      }
    });
  } catch {
    message('Your session could not be checked. Reload the page to try again.', true);
  }
}

async function signInPage() {
  const modes = [...document.querySelectorAll('[data-account-mode]')];
  const providers = [...document.querySelectorAll('[data-provider]')];
  const fields = element('account-fields');
  const name = element('account-name');
  const password = element('account-password');
  const remember = element('account-remember');
  const providerStatus = element('provider-status');
  let mode = 'signin';
  let available = false;
  const enabledProviders = new Set();

  function setMode(next) {
    mode = next;
    const signup = mode === 'signup';
    for (const button of modes) button.setAttribute('aria-pressed', String(button.dataset.accountMode === mode));
    element('name-field').hidden = !signup;
    name.disabled = !signup;
    name.required = signup;
    element('account-hint').textContent = signup ? 'Verify your email to activate your account.' : 'Enter your email and password to continue.';
    const label = signup ? 'Create account' : 'Sign in';
    element('account-submit').firstChild.textContent = label + ' ';
    password.autocomplete = signup ? 'new-password' : 'current-password';
    password.minLength = signup ? 12 : 0;
    password.value = '';
    message();
  }

  function busy(active) {
    fields.disabled = active || !available;
    remember.disabled = active || !available;
    for (const button of modes) button.disabled = active;
    for (const button of providers) button.disabled = active || !enabledProviders.has(button.dataset.provider);
  }

  for (const button of modes) button.addEventListener('click', () => setMode(button.dataset.accountMode));
  const params = new URLSearchParams(location.search);
  setMode(params.get('mode') === 'signup' ? 'signup' : 'signin');

  element('auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!available) return;
    const form = Object.fromEntries(new FormData(event.currentTarget));
    busy(true);
    message();
    try {
      const result = await request(mode, { ...form, remember: remember.checked });
      if (result.signedIn) return goToAccount();
      setMode('signin');
      message('Check your inbox for a confirmation link, then sign in with your password.');
    } catch (error) {
      message(error.message, true);
    } finally {
      busy(false);
    }
  });

  for (const button of providers) {
    button.addEventListener('click', async () => {
      busy(true);
      message();
      try {
        const { url } = await request('oauth', { provider: button.dataset.provider, remember: remember.checked });
        location.assign(url);
      } catch (error) {
        message(error.message, true);
        busy(false);
      }
    });
  }

  try {
    const result = await request('session');
    if (result.user) return goToAccount();
    available = result.available;
    for (const provider of result.providers || []) {
      if (available) enabledProviders.add(provider);
    }
    const pending = providers.filter(button => !enabledProviders.has(button.dataset.provider));
    providerStatus.hidden = pending.length === 0;
    if (pending.length === providers.length) {
      providerStatus.textContent = 'Google and Microsoft sign-in are awaiting setup.';
    } else if (pending.length === 1) {
      const providerName = pending[0].dataset.provider === 'google' ? 'Google' : 'Microsoft';
      providerStatus.textContent = `${providerName} sign-in is awaiting setup.`;
    }
    element('remember-field').hidden = !available;
    element('email-account').hidden = !available;
    busy(false);
    if (!available) return;
    const notice = params.get('notice');
    if (notice === 'provider') message('Provider sign-in could not be completed. Try again.', true);
    if (notice === 'confirm') message('This confirmation link is invalid or has expired.', true);
    if (notice === 'verified') message('Email verified. Sign in to access your account.');
  } catch {
    providerStatus.textContent = 'Sign-in could not be loaded. You can still explore the site as a guest.';
  }
}

if (document.body.dataset.accountPage === 'profile') profilePage();
else signInPage();
