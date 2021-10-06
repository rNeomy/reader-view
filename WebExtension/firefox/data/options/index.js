/**
    Reader View - Strips away clutter

    Copyright (C) 2014-2021 [@rNeomy](https://add0n.com/chrome-reader-view.html)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the Mozilla Public License as published by
    the Mozilla Foundation, either version 2 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    Mozilla Public License for more details.
    You should have received a copy of the Mozilla Public License
    along with this program.  If not, see {https://www.mozilla.org/en-US/MPL/}.

    GitHub: https://github.com/rNeomy/reader-view/
    Homepage: https://add0n.com/chrome-reader-view.html
*/

/* global config */
'use strict';

// optional permission
{
  const request = e => {
    if (e.target.checked) {
      chrome.permissions.request({
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
// webnavigation
document.getElementById('auto-permission').addEventListener('click', e => {
  e.preventDefault();
  chrome.permissions.request({
    permissions: ['webNavigation'],
    origins: ['*://*/*']
  }, granted => {
    if (granted) {
      document.getElementById('auto-rules').disabled = false;
      document.getElementById('auto-permission').style.display = 'none';
    }
  });
});
chrome.permissions.contains({
  permissions: ['webNavigation'],
  origins: ['*://*/*']
}, granted => {
  if (granted) {
    document.getElementById('auto-rules').disabled = false;
    document.getElementById('auto-permission').style.display = 'none';
  }
});


function save() {
  localStorage.setItem('auto-fullscreen', document.getElementById('auto-fullscreen').checked);
  const json = document.getElementById('auto-rules').value.split(/\s*,\s*/).filter((s, i, l) => {
    return s && l.indexOf(s) === i;
  });
  document.getElementById('auto-rules').value = json.join(', ');
  localStorage.setItem('auto-rules', JSON.stringify(json));
  chrome.runtime.getBackgroundPage(bg => bg.webNavigation());

  let actions = [];
  try {
    actions = JSON.parse(document.getElementById('user-action').value);
  }
  catch (e) {
    alert('unable to parse "User actions":\n\n' + e.message);
    console.warn(e);
    if (config.prefs['user-action']) {
      actions = config.prefs['user-action'];
    }
  }

  const shortcuts = {};
  for (const div of [...document.getElementById('shortcuts').querySelectorAll('div')]) {
    const [ctrl, shift] = [...div.querySelectorAll('input[type=checkbox]')];
    const key = div.querySelector('input[type=text]');
    const id = div.dataset.id;

    if (key.value) {
      shortcuts[id] = [];
      if (ctrl.checked) {
        shortcuts[id].push('Ctrl/Command');
      }
      if (shift.checked) {
        shortcuts[id].push('Shift');
      }
      shortcuts[id].push(key.value.replace(/key/i, 'Key'));
    }
    else {
      shortcuts[id] = config.prefs.shortcuts[id];
    }
    ctrl.checked = config.prefs.shortcuts[id].indexOf('Ctrl/Command') !== -1;
    shift.checked = config.prefs.shortcuts[id].indexOf('Shift') !== -1;
    key.value = config.prefs.shortcuts[id].filter(s => s !== 'Ctrl/Command' && s !== 'Shift')[0];
  }

  chrome.storage.local.set({
    'embedded': document.getElementById('embedded').checked,
    'top-css': document.getElementById('top-style').value,
    'user-css': document.getElementById('user-css').value,
    'user-action': actions,
    'reader-mode': document.getElementById('reader-mode').checked,
    'faqs': document.getElementById('faqs').checked,
    'tts-delay': Math.max(document.getElementById('tts-delay').value, 0),
    'tts-scroll': document.getElementById('tts-scroll').value,
    'cache-highlights': Math.max(document.getElementById('cache-highlights').checked, 0),
    'highlights-count': document.getElementById('highlights-count').value,
    'context-open-in-reader-view': document.getElementById('context-open-in-reader-view').checked,
    'context-open-in-reader-view-bg': document.getElementById('context-open-in-reader-view-bg').checked,
    'context-switch-to-reader-view': document.getElementById('context-switch-to-reader-view').checked,

    'printing-button': document.getElementById('printing-button').checked,
    'screenshot-button': document.getElementById('screenshot-button').checked,
    'note-button': document.getElementById('note-button').checked,
    'mail-button': document.getElementById('mail-button').checked,
    'save-button': document.getElementById('save-button').checked,
    'fullscreen-button': document.getElementById('fullscreen-button').checked,
    'speech-button': document.getElementById('speech-button').checked,
    'images-button': document.getElementById('images-button').checked,
    'highlight-button': document.getElementById('highlight-button').checked,
    'design-mode-button': document.getElementById('design-mode-button').checked,
    'navigate-buttons': document.getElementById('navigate-buttons').checked,
    'show-icon': document.getElementById('show-icon').checked,
    'title': document.getElementById('title').value || '[ORIGINAL] :: [BRAND]',

    shortcuts
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}

function restore() {
  document.getElementById('auto-fullscreen').checked = localStorage.getItem('auto-fullscreen') === 'true';
  document.getElementById('auto-rules').value = JSON.parse((localStorage.getItem('auto-rules') || '[]')).join(', ');

  document.getElementById('embedded').checked = config.prefs['embedded'];
  document.getElementById('top-style').value = config.prefs['top-css'];
  document.getElementById('user-css').value = config.prefs['user-css'];
  document.getElementById('user-action').value = JSON.stringify(config.prefs['user-action'], null, '  ');

  document.getElementById('printing-button').checked = config.prefs['printing-button'];
  document.getElementById('screenshot-button').checked = config.prefs['screenshot-button'];
  document.getElementById('note-button').checked = config.prefs['note-button'];
  document.getElementById('mail-button').checked = config.prefs['mail-button'];
  document.getElementById('save-button').checked = config.prefs['save-button'];
  document.getElementById('fullscreen-button').checked = config.prefs['fullscreen-button'];
  document.getElementById('speech-button').checked = config.prefs['speech-button'];
  document.getElementById('images-button').checked = config.prefs['images-button'];
  document.getElementById('highlight-button').checked = config.prefs['highlight-button'];
  document.getElementById('design-mode-button').checked = config.prefs['design-mode-button'];
  document.getElementById('navigate-buttons').checked = config.prefs['navigate-buttons'];
  document.getElementById('show-icon').checked = config.prefs['show-icon'];
  document.getElementById('title').value = config.prefs['title'];

  document.getElementById('reader-mode').checked = config.prefs['reader-mode'];
  document.getElementById('faqs').checked = config.prefs['faqs'];
  document.getElementById('tts-delay').value = config.prefs['tts-delay'];
  document.getElementById('tts-scroll').value = config.prefs['tts-scroll'];
  document.getElementById('cache-highlights').checked = config.prefs['cache-highlights'];
  document.getElementById('highlights-count').value = config.prefs['highlights-count'];
  document.getElementById('context-open-in-reader-view').checked = config.prefs['context-open-in-reader-view'];
  document.getElementById('context-open-in-reader-view-bg').checked = config.prefs['context-open-in-reader-view-bg'];
  document.getElementById('context-switch-to-reader-view').checked = config.prefs['context-switch-to-reader-view'];

  for (const div of [...document.getElementById('shortcuts').querySelectorAll('div')]) {
    const [ctrl, shift] = [...div.querySelectorAll('input[type=checkbox]')];
    const key = div.querySelector('input[type=text]');
    const id = div.dataset.id;
    ctrl.checked = config.prefs.shortcuts[id].indexOf('Ctrl/Command') !== -1;
    shift.checked = config.prefs.shortcuts[id].indexOf('Shift') !== -1;
    key.value = config.prefs.shortcuts[id].filter(s => s !== 'Ctrl/Command' && s !== 'Shift')[0];
  }
}
config.load(restore);
document.getElementById('save').addEventListener('click', save);

document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));

document.getElementById('bug').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '#reviews'
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

document.getElementById('ref-1').onclick = () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '#faq5'
});
document.getElementById('ref-2').onclick = () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '#faq5'
});
document.getElementById('ref-3').onclick = () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '#faq16'
});

document.getElementById('export-highlights').addEventListener('click', () => {
  chrome.storage.local.get({
    'highlights-objects': {}
  }, prefs => {
    const blob = new Blob([
      JSON.stringify(prefs['highlights-objects'], null, '  ')
    ], {
      type: 'application/json'
    });
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
    }, () => chrome.runtime.lastError);
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
        chrome.storage.local.get({
          'highlights-objects': {},
          'highlights-keys': []
        }, prefs => {
          for (const href of Object.keys(json)) {
            prefs['highlights-keys'].push(href);
            prefs['highlights-objects'][href] = prefs['highlights-objects'][href] || [];
            prefs['highlights-objects'][href].push(...json[href]);

            chrome.runtime.sendMessage({
              cmd: 'append-highlights',
              href,
              highlights: json[href]
            });
          }
          prefs['highlights-keys'] = prefs['highlights-keys'].filter((s, i, l) => {
            return s && l.indexOf(s) === i;
          });
          chrome.storage.local.set(prefs);
        });
      };
      reader.readAsText(file, 'utf-8');
    }
  };
  input.click();
});

document.getElementById('export-notes').addEventListener('click', () => {
  const cache = {};
  chrome.storage.local.get(null, prefs => {
    for (const [key, value] of Object.entries(prefs)) {
      if (key.startsWith('notes:')) {
        cache[key] = value;
      }
    }
    const blob = new Blob([
      JSON.stringify(cache, null, '  ')
    ], {
      type: 'application/json'
    });
    const href = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), {
      href,
      type: 'application/json',
      download: 'reader-view-notes.json'
    }).dispatchEvent(new MouseEvent('click'));
    setTimeout(() => URL.revokeObjectURL(href));
  });
});
document.getElementById('import-notes').addEventListener('click', () => {
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
        chrome.storage.local.get(null, prefs => {
          for (const [key, value] of Object.entries(json)) {
            prefs[key] = Object.assign(prefs[key] || {}, value);
          }
          chrome.storage.local.set(prefs);
        });
      };
      reader.readAsText(file, 'utf-8');
    }
  };
  input.click();
});
