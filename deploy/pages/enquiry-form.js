'use strict';
// Intentionally local-only: there is no submission endpoint or email recipient.
(() => {
  const form = document.querySelector('#enquiry-form');
  if (!form) return;
  const status = document.querySelector('#enquiry-status');
  const fallback = document.querySelector('#enquiry-fallback');
  const preview = document.querySelector('#enquiry-preview');
  const fields = {
    name: document.querySelector('#enquiry-name'),
    email: document.querySelector('#enquiry-email'),
    topic: document.querySelector('#enquiry-topic'),
    message: document.querySelector('#enquiry-message'),
    consent: document.querySelector('#enquiry-consent')
  };
  const errors = {
    email: document.querySelector('#enquiry-email-error'),
    topic: document.querySelector('#enquiry-topic-error'),
    message: document.querySelector('#enquiry-message-error'),
    consent: document.querySelector('#enquiry-consent-error')
  };

  function markError(name, message) {
    errors[name].textContent = message;
    fields[name].setAttribute('aria-invalid', String(Boolean(message)));
    if (name === 'consent') {
      fields[name].setAttribute('aria-describedby', message ? `consent-help ${errors[name].id}` : 'consent-help');
    } else if (message) fields[name].setAttribute('aria-describedby', errors[name].id);
    else fields[name].removeAttribute('aria-describedby');
    return Boolean(message);
  }

  function validate() {
    const invalid = [];
    if (markError('email', fields.email.value.trim() && fields.email.validity.typeMismatch ? 'Enter a valid email address or leave this optional field blank.' : '')) invalid.push(fields.email);
    if (markError('topic', !fields.topic.value ? 'Choose a topic.' : '')) invalid.push(fields.topic);
    const length = fields.message.value.trim().length;
    if (markError('message', length < 10 ? 'Write at least 10 characters.' : '')) invalid.push(fields.message);
    if (markError('consent', !fields.consent.checked ? 'Confirm that you understand this is a local draft, not a message being sent.' : '')) invalid.push(fields.consent);
    return invalid;
  }

  for (const [name, field] of Object.entries(fields)) {
    if (name === 'name') continue;
    field.addEventListener(name === 'consent' ? 'change' : 'blur', () => {
      if (errors[name]?.textContent) {
        if (name === 'email') markError('email', field.value.trim() && field.validity.typeMismatch ? 'Enter a valid email address or leave this optional field blank.' : '');
        else if (name === 'topic') markError('topic', !field.value ? 'Choose a topic.' : '');
        else if (name === 'message') markError('message', field.value.trim().length < 10 ? 'Write at least 10 characters.' : '');
        else markError('consent', !field.checked ? 'Confirm this is a local-only draft.' : '');
      }
    });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    fallback.hidden = true;
    const invalid = validate();
    if (invalid.length) {
      status.textContent = 'Please correct the highlighted fields. Nothing has been sent.';
      invalid[0].focus();
      return;
    }
    const draft = [
      'Cellar Studio enquiry draft — NOT SENT',
      'Topic: ' + fields.topic.value,
      fields.name.value.trim() ? 'Name: ' + fields.name.value.trim() : '',
      fields.email.value.trim() ? 'Email: ' + fields.email.value.trim() : '',
      '',
      fields.message.value.trim(),
      '',
      'Prepared locally. No data was submitted to Cellar Studio.'
    ].filter((line, i, array) => line !== '' || (i > 0 && array[i - 1] !== '')).join('\n');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(draft);
      status.textContent = 'Copied to clipboard. The enquiry has NOT been sent. You can paste it into a message when a contact channel becomes available.';
    } catch (_) {
      preview.value = draft;
      fallback.hidden = false;
      status.textContent = 'Automatic copying is unavailable. Select and copy the prepared text below. Nothing has been sent.';
      preview.focus();
      preview.select();
    }
  });
  form.addEventListener('reset', () => {
    for (const name of Object.keys(errors)) markError(name, '');
    status.textContent = 'Form cleared. No data was submitted or saved.';
    fallback.hidden = true;
    preview.value = '';
  });
})();
