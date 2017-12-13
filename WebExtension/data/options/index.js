'use strict';

function save() {
  chrome.storage.local.set({
    'user-css': document.querySelector('textarea').value,
    'new-tab': document.getElementById('new-tab').checked,
    'faqs': document.getElementById('faqs').checked,
  }, () => {
    // Update status to let user know options were saved.
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}

function restore() {
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
    'new-tab': true,
    'faqs': true
  }, prefs => {
    document.querySelector('textarea').value = prefs['user-css'];
    document.getElementById('new-tab').checked = prefs['new-tab'];
    document.getElementById('faqs').checked = prefs['faqs'];
  });
}
document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);
