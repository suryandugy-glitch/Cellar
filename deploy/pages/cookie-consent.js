'use strict';
// Consent for optional, explicitly marked external embeds. No analytics scripts
// or advertising cookies are installed here. Functional preferences use localStorage.
(() => {
  const key = 'cellar-privacy-preferences';
  let preferences = null;
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null');
    if (stored && typeof stored.embeds === 'boolean') preferences = stored;
  } catch (_) { /* Private browsing or invalid/disabled storage. */ }

  function save(embeds) {
    preferences = { embeds: Boolean(embeds), updatedAt: new Date().toISOString() };
    try { localStorage.setItem(key, JSON.stringify(preferences)); } catch (_) { /* Session-only. */ }
    const banner = document.querySelector('#studio-cookie-banner');
    if (banner) banner.remove();
    applyEmbedPreference();
  }

  function applyEmbedPreference() {
    for (const slot of document.querySelectorAll('[data-consent-embed]')) {
      let iframe = slot.querySelector('iframe[data-consent-frame]');
      if (!preferences?.embeds) {
        iframe?.remove();
        slot.querySelector('[data-embed-placeholder]')?.removeAttribute('hidden');
        continue;
      }
      if (!iframe) {
        const source = slot.getAttribute('data-embed-src');
        // A page author must explicitly configure a secure HTTPS URL and title.
        if (!source?.startsWith('https://') || !slot.getAttribute('data-embed-title')) continue;
        iframe = document.createElement('iframe');
        iframe.dataset.consentFrame = '';
        iframe.src = source;
        iframe.title = slot.getAttribute('data-embed-title');
        iframe.loading = 'lazy';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        slot.appendChild(iframe);
      }
      slot.querySelector('[data-embed-placeholder]')?.setAttribute('hidden', '');
    }
  }

  function openSettings() {
    let dialog = document.querySelector('#studio-privacy-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'studio-privacy-dialog';
      dialog.className = 'studio-privacy-dialog';
      dialog.setAttribute('aria-labelledby', 'studio-dialog-title');
      dialog.innerHTML = '<form method="dialog"><h2 id="studio-dialog-title">Privacy settings</h2>' +
        '<p>Essential storage remembers the site theme and this preference. Optional external embeds stay off unless you allow them. There are currently no active embedded media widgets.</p>' +
        '<label class="studio-privacy-check"><input id="studio-embed-consent" type="checkbox"><span>Allow optional external embeds if introduced later</span></label>' +
        '<p class="studio-privacy-note">This choice does not block Google Fonts or the Vercel hosting connection. The site does not install advertising or analytics cookies through this module.</p>' +
        '<div class="studio-privacy-actions"><button type="button" data-privacy-save>Save preferences</button><button type="submit" class="studio-privacy-secondary">Cancel</button></div></form>';
      document.body.appendChild(dialog);
      dialog.querySelector('[data-privacy-save]').addEventListener('click', () => {
        save(dialog.querySelector('#studio-embed-consent').checked);
        dialog.close();
      });
    }
    dialog.querySelector('#studio-embed-consent').checked = Boolean(preferences?.embeds);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector('#studio-embed-consent').focus();
  }

  function init() {
    applyEmbedPreference();
    document.addEventListener('click', event => {
      if (event.target.closest('[data-open-privacy-settings]')) openSettings();
    });
    if (preferences) return;
    const banner = document.createElement('section');
    banner.id = 'studio-cookie-banner';
    banner.className = 'studio-cookie-banner';
    banner.setAttribute('aria-label', 'Cookie and privacy choices');
    banner.innerHTML = '<h2>Your privacy, your call.</h2><p>Only functional browser storage is in use. Optional third-party embeds are off by default; no ad or analytics cookies are installed by this site.</p>' +
      '<div class="studio-cookie-actions"><button type="button" data-privacy-essential>Essential only</button><button type="button" data-privacy-allow>Allow embeds</button><a href="./cookie-policy.html">Cookie policy</a></div>';
    document.body.appendChild(banner);
    banner.querySelector('[data-privacy-essential]').addEventListener('click', () => save(false));
    banner.querySelector('[data-privacy-allow]').addEventListener('click', () => save(true));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
