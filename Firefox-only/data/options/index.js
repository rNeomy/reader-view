'use strict';

chrome.storage.local.get({
  'open-next-to-active': true,
  'open-in-background': false,
  'switch-to-reader-view': true,
  'open-in-reader-view': true
}, prefs => {
  document.getElementById('open-next-to-active').checked = prefs['open-next-to-active'];
  document.getElementById('open-in-background').checked = prefs['open-in-background'];
  document.getElementById('switch-to-reader-view').checked = prefs['switch-to-reader-view'];
  document.getElementById('open-in-reader-view').checked = prefs['open-in-reader-view'];
});

document.getElementById('save').addEventListener('click', () => chrome.storage.local.set({
  'open-next-to-active': document.getElementById('open-next-to-active').checked,
  'open-in-background': document.getElementById('open-in-background').checked,
  'switch-to-reader-view': document.getElementById('switch-to-reader-view').checked,
  'open-in-reader-view': document.getElementById('open-in-reader-view').checked
}, () => {
  const info = document.getElementById('info');
  info.textContent = 'Options are saved.';
  window.setTimeout(() => info.textContent = '', 750);
}));
