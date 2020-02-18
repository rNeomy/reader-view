/* globals config */
'use strict';

// optional permission
{
  const request = e => {
    if (e.target.checked) {
      chrome.permissions.request({
        permissions: ['tabs'],
        origins: ['*://*/*']
      }, granted => {
        if (granted === false) {
          e.target.checked = false;
        }
      });
    }
  };
  document.getElementById('context-open-in-reader-view').addEventListener('change', request);
  document.getElementById('context-open-in-reader-view-bg').addEventListener('change', request);
  document.getElementById('reader-mode').addEventListener('change', request);
}

function save() {
  localStorage.setItem('top-css', document.getElementById('top-style').value || '');
  localStorage.setItem('user-css', document.getElementById('user-css').value || '');

  localStorage.setItem('printing-button', document.getElementById('printing-button').checked);
  localStorage.setItem('save-button', document.getElementById('save-button').checked);
  localStorage.setItem('fullscreen-button', document.getElementById('fullscreen-button').checked);
  localStorage.setItem('speech-button', document.getElementById('speech-button').checked);
  localStorage.setItem('images-button', document.getElementById('images-button').checked);
  localStorage.setItem('highlight-button', document.getElementById('highlight-button').checked);
  localStorage.setItem('design-mode-button', document.getElementById('design-mode-button').checked);
  localStorage.setItem('navigate-buttons', document.getElementById('navigate-buttons').checked);

  localStorage.setItem('auto-fullscreen', document.getElementById('auto-fullscreen').checked);

  chrome.storage.local.set({
    'user-css': document.getElementById('user-css').value,
    'new-tab': document.getElementById('new-tab').checked,
    'reader-mode': document.getElementById('reader-mode').checked,
    'faqs': document.getElementById('faqs').checked,
    'tts-delay': Math.max(document.getElementById('tts-delay').value, 0),
    'cache-highlights': document.getElementById('cache-highlights').checked,
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
  document.getElementById('highlight-button').checked = localStorage.getItem('highlight-button') !== 'false';
  document.getElementById('design-mode-button').checked = localStorage.getItem('design-mode-button') !== 'false';
  document.getElementById('navigate-buttons').checked = localStorage.getItem('navigate-buttons') !== 'false';

  chrome.storage.local.get(config.prefs, prefs => {
    document.getElementById('new-tab').checked = prefs['new-tab'];
    document.getElementById('reader-mode').checked = prefs['reader-mode'];
    document.getElementById('faqs').checked = prefs['faqs'];
    document.getElementById('tts-delay').value = prefs['tts-delay'];
    document.getElementById('cache-highlights').checked = prefs['cache-highlights'];
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
else if (navigator.userAgent.indexOf('Edg/') !== -1) {
  document.getElementById('rate').href =
    'https://microsoftedge.microsoft.com/addons/detail/lpmbefndcmjoaepdpgmoonafikcalmnf';
}

document.getElementById('ref').href = chrome.runtime.getManifest().homepage_url + '#faq5';

document.getElementById('export-highlights').addEventListener('click', () => {
  chrome.runtime.getBackgroundPage(bg => {
    const blob = new Blob([
      JSON.stringify(bg.highlights, null, '  ')
    ], {type: 'application/json'});
    const href = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), {
      href,
      type: 'application/json',
      download: 'reader-view-highlights.json'
    }).dispatchEvent(new MouseEvent('click'));
    setTimeout(() => URL.revokeObjectURL(href));
  });
});
// ask all tabs to export their highlights so that the object is ready for exporting
chrome.tabs.query({}, (tabs = []) => {
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, {
      cmd: 'export-highlights'
    });
  }
});

document.getElementById('import-highlights').addEventListener('click', () => {
  const input = document.createElement('input');
  input.style.display = 'none';
  input.type = 'file';
  input.accept = '.json';
  input.acceptCharset = 'utf-8';

  document.body.appendChild(input);
  input.initialValue = input.value;
  input.onchange = () => {
    if (input.value !== input.initialValue) {
      const file = input.files[0];
      if (file.size > 100e6) {
        console.warn('100MB backup? I don\'t believe you.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = event => {
        input.remove();
        const json = JSON.parse(event.target.result);
        chrome.runtime.getBackgroundPage(bg => {
          for (const key of Object.keys(json)) {
            bg.highlights[key] = bg.highlights[key] || [];
            bg.highlights[key].push(...json[key]);
          }
        });
      };
      reader.readAsText(file, 'utf-8');
    }
  };
  input.click();
});
