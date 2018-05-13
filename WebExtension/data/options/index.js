'use strict';

function save() {
  localStorage.setItem('top-css', document.getElementById('top-style').value || '');
  chrome.storage.local.set({
    'user-css': document.getElementById('reader-style').value,
    'new-tab': document.getElementById('new-tab').checked,
    'faqs': document.getElementById('faqs').checked,
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}

function restore() {
  document.getElementById('top-style').value = localStorage.getItem('top-css') || '';

  chrome.storage.local.get({
    'user-css': `img {
  display: block;
  max-width: 100%;
  width: auto;
  height: auto;
}
body {
  padding-bottom: 64px;
}
a:link, a:link:hover, a:link:active {
  color: #0095dd;
}
a:link {
  text-decoration: underline;
  font-weight: normal;
}
/* CSS for "sepia" theme */
body[data-mode=sepia] {
}
/* CSS for "light" theme */
body[data-mode=light] {
}
/* CSS for "dark" theme */
body[data-mode=dark] {
}`,
    'top-css': '',
    'new-tab': true,
    'faqs': true
  }, prefs => {
    document.getElementById('reader-style').value = prefs['user-css'];
    document.getElementById('new-tab').checked = prefs['new-tab'];
    document.getElementById('faqs').checked = prefs['faqs'];
  });
}
document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);

document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));

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
