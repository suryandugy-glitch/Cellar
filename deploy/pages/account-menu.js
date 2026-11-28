import { accountRequest, readAccountSession, renderAccountAvatar } from './account-client.js';

const menu = document.createElement('div');
menu.className = 'site-account';
menu.hidden = true;
menu.innerHTML = `
  <a class="site-account-trigger" href="/signin.html" hidden>Sign in</a>
  <div class="site-account-profile" hidden>
    <button class="site-account-trigger" type="button" aria-label="Account options" aria-expanded="false" aria-controls="site-account-panel">
      <span class="account-avatar site-account-avatar" aria-hidden="true"></span>
    </button>
    <div id="site-account-panel" class="site-account-panel" aria-label="Signed-in account" role="group" hidden>
      <div class="site-account-identity">
        <span class="account-avatar site-account-portrait" aria-hidden="true"></span>
        <div class="site-account-information">
          <strong class="site-account-name"></strong>
          <span class="site-account-email"></span>
        </div>
      </div>
      <a class="site-account-link" href="/account.html">My account</a>
      <button class="site-account-signout" type="button">Sign out</button>
      <p class="site-account-message" role="status" hidden></p>
    </div>
  </div>`;

const guest = menu.querySelector('a');
const profile = menu.querySelector('.site-account-profile');
const trigger = profile.querySelector('button');
const panel = menu.querySelector('.site-account-panel');
const signOut = menu.querySelector('.site-account-signout');
const status = menu.querySelector('[role="status"]');
const avatars = menu.querySelectorAll('.account-avatar');
const profileName = menu.querySelector('.site-account-name');
const profileEmail = menu.querySelector('.site-account-email');
function setOpen(open) {
  panel.hidden = !open;
  trigger.setAttribute('aria-expanded', String(open));
}

const header = document.querySelector(
  '.site-header .header-actions, .company-header .company-nav-row, .guard-header .guard-nav, .nav-inner, .account-header'
);
const workspace = header ? null : document.getElementById('app');
if (header) {
  header.append(menu);
} else if (workspace) {
  const mount = () => {
    const actions = workspace.querySelector('.topbar > .actions');
    if (!actions || menu.parentElement === actions) return;
    setOpen(false);
    actions.append(menu);
  };
  mount();
  new MutationObserver(mount).observe(workspace, { childList: true });
}

function clearProfile() {
  setOpen(false);
  profile.hidden = true;
  profileName.textContent = '';
  profileEmail.textContent = '';
  for (const avatar of avatars) avatar.replaceChildren();
}

async function refreshMenu() {
  try {
    const { available, user } = await readAccountSession();
    menu.hidden = !available;
    guest.hidden = Boolean(user);
    if (!user) {
      clearProfile();
      return;
    }
    profile.hidden = false;
    const name = user.name || 'Cellar Studio account';
    trigger.setAttribute('aria-label', `Account options for ${name}`);
    profileName.textContent = name;
    profileEmail.textContent = user.email || '';
    for (const avatar of avatars) renderAccountAvatar(avatar, user);
  } catch {
    // Account lookup should not interrupt a public page.
    clearProfile();
    menu.hidden = false;
    guest.hidden = false;
  }
}

if (header || workspace) {
  void refreshMenu();
  trigger.addEventListener('click', () => setOpen(panel.hidden));
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      menu.hidden = true;
      clearProfile();
      void refreshMenu();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!panel.hidden && !menu.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || panel.hidden) return;
    const focusWasInMenu = menu.contains(document.activeElement);
    setOpen(false);
    if (focusWasInMenu) trigger.focus();
  });
  signOut.addEventListener('click', async () => {
    signOut.disabled = true;
    status.hidden = true;
    try {
      await accountRequest('logout', {});
      window.location.replace('/signin.html');
    } catch {
      status.textContent = 'Could not sign out. Please try again.';
      status.hidden = false;
      signOut.disabled = false;
    }
  });
}
