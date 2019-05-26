/* globals config */
'use strict';

function save() {
  localStorage.setItem('top-css', document.getElementById('top-style').value || '');
  localStorage.setItem('user-css', document.getElementById('user-css').value || '');

  localStorage.setItem('printing-button', document.getElementById('printing-button').checked);
  localStorage.setItem('save-button', document.getElementById('save-button').checked);
  localStorage.setItem('fullscreen-button', document.getElementById('fullscreen-button').checked);
  localStorage.setItem('speech-button', document.getElementById('speech-button').checked);
  localStorage.setItem('images-button', document.getElementById('images-button').checked);
  localStorage.setItem('navigate-buttons', document.getElementById('navigate-buttons').checked);

  localStorage.setItem('auto-fullscreen', document.getElementById('auto-fullscreen').checked);

  chrome.storage.local.set({
    'user-css': document.getElementById('user-css').value,
    'new-tab': document.getElementById('new-tab').checked,
    'reader-mode': document.getElementById('reader-mode').checked,
    'faqs': document.getElementById('faqs').checked,
    'context-open-in-reader-view': document.getElementById('context-open-in-reader-view').checked,
    'context-open-in-reader-view-bg': document.getElementById('context-open-in-reader-view-bg').checked,
    'context-switch-to-reader-view': document.getElementById('context-switch-to-reader-view').checked
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}

function restore() {
  document.getElementById('top-style').value = localStorage.getItem('top-css') || '';
  document.getElementById('user-css').value = localStorage.getItem('user-css') || '';

  document.getElementById('printing-button').checked = localStorage.getItem('printing-button') !== 'false';
  document.getElementById('save-button').checked = localStorage.getItem('save-button') !== 'false';
  document.getElementById('fullscreen-button').checked = localStorage.getItem('fullscreen-button') !== 'false';
  document.getElementById('speech-button').checked = localStorage.getItem('speech-button') !== 'false';
  document.getElementById('auto-fullscreen').checked = localStorage.getItem('auto-fullscreen') === 'true';
  document.getElementById('images-button').checked = localStorage.getItem('images-button') !== 'false';
  document.getElementById('navigate-buttons').checked = localStorage.getItem('navigate-buttons') !== 'false';

  chrome.storage.local.get(config.prefs, prefs => {
    document.getElementById('new-tab').checked = prefs['new-tab'];
    document.getElementById('reader-mode').checked = prefs['reader-mode'];
    document.getElementById('faqs').checked = prefs['faqs'];
    document.getElementById('context-open-in-reader-view').checked = prefs['context-open-in-reader-view'];
    document.getElementById('context-open-in-reader-view-bg').checked = prefs['context-open-in-reader-view-bg'];
    document.getElementById('context-switch-to-reader-view').checked = prefs['context-switch-to-reader-view'];
  });
}
config.load(restore);
document.getElementById('save').addEventListener('click', save);

document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));

document.getElementById('reload').addEventListener('click', () => chrome.runtime.reload());

document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    const status = document.getElementById('status');
    window.setTimeout(() => status.textContent = '', 750);
    status.textContent = 'Double-click to reset!';
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});

if (navigator.userAgent.indexOf('Firefox') !== -1) {
  document.getElementById('rate').href =
    'https://addons.mozilla.org/en-US/firefox/addon/reader-view/reviews/';
}
else if (navigator.userAgent.indexOf('OPR') !== -1) {
  document.getElementById('rate').href =
    'https://addons.opera.com/en/extensions/details/reader-view-2/#feedback-container';
}

document.getElementById('ref').href = chrome.runtime.getManifest().homepage_url + '#faq5';
