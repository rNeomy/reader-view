/**
    Reader View - Strips away clutter

    Copyright (C) 2014-2022 [@rNeomy]

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
    Homepage: https://webextension.org/listing/chrome-reader-view.html
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

document.getElementById('auto-permission').addEventListener('click', e => {
  e.preventDefault();
  chrome.permissions.request({
    origins: ['*://*/*']
  }, granted => {
    if (granted) {
      document.getElementById('auto-rules').disabled = false;
      document.getElementById('auto-permission').style.display = 'none';
    }
  });
});
chrome.permissions.contains({
  origins: ['*://*/*']
}, granted => {
  if (granted) {
    document.getElementById('auto-rules').disabled = false;
    document.getElementById('auto-permission').style.display = 'none';
  }
});

function save() {
  const json = document.getElementById('auto-rules').value.split(/\s*,\s*/).filter((s, i, l) => {
    return s && l.indexOf(s) === i;
  });
  document.getElementById('auto-rules').value = json.join(', ');

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
    'auto-rules': json,
    'auto-fullscreen': document.getElementById('auto-fullscreen').checked,
    'embedded': document.getElementById('embedded').checked,
    'top-css': document.getElementById('top-style').value,
    'user-css': document.getElementById('user-css').value,
    'os-sync': document.getElementById('os-sync').checked,
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

    './plugins/tip/core.mjs': document.getElementById('./plugins/tip/core.mjs').checked,
    './plugins/doi/core.mjs': document.getElementById('./plugins/doi/core.mjs').checked,
    './plugins/note/core.mjs': document.getElementById('./plugins/note/core.mjs').checked,
    './plugins/notify/core.mjs': document.getElementById('./plugins/notify/core.mjs').checked,
    './plugins/health/core.mjs': document.getElementById('./plugins/health/core.mjs').checked,
    './plugins/chapters/core.mjs': document.getElementById('./plugins/chapters/core.mjs').checked,

    shortcuts
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}

function restore() {
  document.getElementById('auto-fullscreen').checked = config.prefs['auto-fullscreen'];
  document.getElementById('auto-rules').value = config.prefs['auto-rules'].join(', ');

  document.getElementById('embedded').checked = config.prefs['embedded'];
  document.getElementById('top-style').value = config.prefs['top-css'];
  document.getElementById('user-css').value = config.prefs['user-css'];
  document.getElementById('user-action').value = JSON.stringify(config.prefs['user-action'], null, '  ');
  document.getElementById('os-sync').checked = config.prefs['os-sync'];

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

  document.getElementById('./plugins/tip/core.mjs').checked = config.prefs['./plugins/tip/core.mjs'];
  document.getElementById('./plugins/doi/core.mjs').checked = config.prefs['./plugins/doi/core.mjs'];
  document.getElementById('./plugins/note/core.mjs').checked = config.prefs['./plugins/note/core.mjs'];
  document.getElementById('./plugins/notify/core.mjs').checked = config.prefs['./plugins/notify/core.mjs'];
  document.getElementById('./plugins/health/core.mjs').checked = config.prefs['./plugins/health/core.mjs'];
  document.getElementById('./plugins/chapters/core.mjs').checked = config.prefs['./plugins/chapters/core.mjs'];

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
