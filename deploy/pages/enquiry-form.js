'use strict';

(() => {
  const form = document.querySelector('#enquiry-form');
  if (!form) return;

  const inbox = document.querySelector('#studio-email');
  const status = document.querySelector('#enquiry-status');
  const copy = document.querySelector('#enquiry-copy');
  const fallback = document.querySelector('#enquiry-fallback');
  const preview = document.querySelector('#enquiry-preview');
  const draftLink = document.querySelector('#enquiry-draft-link');
  const { name, email, topic, message, consent } = form.elements;

  const validation = [
    [email, () => email.validity.typeMismatch ? 'Enter a valid email address or leave this field blank.' : ''],
    [topic, () => topic.value ? '' : 'Choose a topic.'],
    [message, () => message.value.trim().length < 10 ? 'Write at least 10 characters.' : ''],
    [consent, () => consent.checked ? '' : 'Confirm that you understand how the email will be shared.']
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

  function readDraft() {
    fallback.hidden = true;
    preview.value = '';
    draftLink.removeAttribute('href');
    let firstInvalid;
    for (const item of validation) {
      const error = item.getError();
      showError(item, error);
      if (error) firstInvalid ??= item.field;
    }
    if (firstInvalid) {
      status.textContent = 'Please correct the highlighted fields.';
      firstInvalid.focus();
      return null;
    }

    const sender = [];
    if (name.value.trim()) sender.push('Name: ' + name.value.trim());
    if (email.value.trim()) sender.push('Preferred reply email: ' + email.value.trim());
    return {
      subject: 'Cellar Studio | ' + topic.value,
      body: [...sender, message.value.trim()].join('\r\n\r\n').replace(/\r?\n/g, '\r\n')
    };
  }

  for (const item of validation) {
    item.field.addEventListener('input', () => {
      if (item.error.textContent) showError(item, item.getError());
    });
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const draft = readDraft();
    if (!draft) return;

    draftLink.href = inbox.getAttribute('href') +
      '?subject=' + encodeURIComponent(draft.subject) + '&body=' + encodeURIComponent(draft.body);
    status.textContent = 'Select Send in your email app. If it does not open, choose Copy message.';
    draftLink.click();
  });

  copy.addEventListener('click', async () => {
    const draft = readDraft();
    if (!draft) return;

    const text = 'Subject: ' + draft.subject + '\n\n' + draft.body;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = 'Message copied. Paste it into an email to ' + inbox.textContent.trim() + '.';
        return;
      } catch {
        // Offer manual copying if the browser denies clipboard access.
      }
    }
    preview.value = text;
    fallback.hidden = false;
    status.textContent = 'Copy the text below and paste it into an email to ' + inbox.textContent.trim() + '.';
    preview.focus();
    preview.select();
  });

  form.addEventListener('reset', () => {
    for (const item of validation) showError(item, '');
    fallback.hidden = true;
    preview.value = '';
    draftLink.removeAttribute('href');
    status.textContent = 'Form cleared.';
  });

  form.elements['enquiry-fields'].disabled = false;
})();
