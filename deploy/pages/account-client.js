export async function accountRequest(action, payload) {
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

let pendingSession;

export function readAccountSession() {
  const action = document.body.dataset.accountPage === 'profile' ? 'profile' : 'session';
  pendingSession ??= accountRequest(action).finally(() => { pendingSession = undefined; });
  return pendingSession;
}

export function renderAccountAvatar(avatar, user) {
  const initials = document.createElement('span');
  const label = user.name || user.email?.split('@')[0] || 'Cellar';
  initials.textContent = label.trim().split(/\s+/u).slice(0, 2).map(word => [...word][0]).join('').toUpperCase();
  avatar.replaceChildren(initials);
  if (!user.avatarUrl) return;

  const photo = document.createElement('img');
  photo.alt = '';
  photo.referrerPolicy = 'no-referrer';
  photo.addEventListener('load', () => {
    if (avatar.firstChild === initials) avatar.replaceChildren(photo);
  }, { once: true });
  photo.src = user.avatarUrl;
}
