'use strict';

(() => {
  const form = document.querySelector('#enquiry-form');
  if (!form) return;

  const status = document.querySelector('#enquiry-status');
  const send = form.querySelector('button[type="submit"]');
  const email = form.elements.email;
  const topic = form.elements.topic;
  const message = form.elements.message;
  const consent = document.querySelector('#enquiry-consent');

  const validation = [
    [email, () => email.validity.typeMismatch ? 'Enter a valid email address or leave this field blank.' : ''],
    [topic, () => topic.value ? '' : 'Choose a topic.'],
    [message, () => message.value.trim().length < 10 ? 'Write at least 10 characters.' : ''],
    [consent, () => consent.checked ? '' : 'Confirm that you agree to send these details.']
  ].map(([field, getError]) => ({
    field,
    getError,
    error: document.querySelector(`#${field.id}-error`),
    help: field.getAttribute('aria-describedby')
  }));

  function showError({ field, error, help }, text) {
    error.textContent = text;
    field.setAttribute('aria-invalid', String(Boolean(text)));
    const descriptions = [help, text && error.id].filter(Boolean).join(' ');
    if (descriptions) field.setAttribute('aria-describedby', descriptions);
    else field.removeAttribute('aria-describedby');
  }

  for (const item of validation) {
    item.field.addEventListener('input', () => {
      if (item.error.textContent) showError(item, item.getError());
    });
  }

  form.addEventListener('submit', event => {
    if (send.disabled) {
      event.preventDefault();
      return;
    }

    let firstInvalid;
    for (const item of validation) {
      const error = item.getError();
      showError(item, error);
      if (error) firstInvalid ??= item.field;
    }
    if (firstInvalid) {
      event.preventDefault();
      status.textContent = 'Please correct the highlighted fields.';
      firstInvalid.focus();
      return;
    }

    // Gmail uses the subject to thread automated mail. Give each enquiry its own reference.
    const randomBytes = crypto.getRandomValues(new Uint8Array(8));
    const reference = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    form.elements.namedItem('_subject').value = `Cellar Studio | ${topic.value} | #${reference}`;

    status.textContent = 'Sending your message…';
    send.disabled = true;
  });

  form.addEventListener('reset', () => {
    for (const item of validation) showError(item, '');
    send.disabled = false;
    status.textContent = 'Form cleared.';
  });

  window.addEventListener('pageshow', () => {
    send.disabled = false;
    status.textContent = '';
  });

  form.noValidate = true;
})();
