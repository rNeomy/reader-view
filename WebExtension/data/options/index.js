'use strict';

function save() {
  localStorage.setItem('top-css', document.getElementById('top-style').value || '');
  chrome.storage.local.set({
    'user-css': document.getElementById('reader-style').value,
    'new-tab': document.getElementById('new-tab').checked,
    'faqs': document.getElementById('faqs').checked,
    'speech': document.getElementById('speech').value
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}
window.speechSynthesis.onvoiceschanged = function() {
  console.log(1212, window.speechSynthesis.getVoices());
};
function restore() {
  window.setTimeout(() => speechSynthesis.getVoices().forEach(o => {
    const option = document.createElement('option');
    option.value = o.voiceURI;
    option.textContent = `${o.name} (${o.lang})`;
    document.getElementById('speech').appendChild(option);
  }), 1000);
  document.getElementById('top-style').value = localStorage.getItem('top-css') || '';

  chrome.storage.local.get({
    'user-css': `body {
  padding-bottom: 64px;
}
a:visited {
  color: #d33bf0;
}
a:link, a:link:hover, a:link:active {
  color: #0095dd;
}
a:link {
  text-decoration: none;
  font-weight: normal;
}
p {
  text-align: justify;
}
pre {
  white-space: pre-line;
}
/* CSS for sans-serif fonts */
body[data-font=sans-serif] {
}
/* CSS for serif fonts */
body[data-font=serif] {
}
/* CSS for "sepia" theme */
body[data-mode=sepia] {
}
/* CSS for "light" theme */
body[data-mode=light] {}
/* CSS for "dark" theme */
body[data-mode=dark] {}`,
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
