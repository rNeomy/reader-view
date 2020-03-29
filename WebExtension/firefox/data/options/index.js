/* globals config */
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

  chrome.storage.local.set({
    'embedded': document.getElementById('embedded').checked,
    'top-css': document.getElementById('top-style').value,
    'user-css': document.getElementById('user-css').value,
    'reader-mode': document.getElementById('reader-mode').checked,
    'faqs': document.getElementById('faqs').checked,
    'tts-delay': Math.max(document.getElementById('tts-delay').value, 0),
    'cache-highlights': document.getElementById('cache-highlights').checked,
    'context-open-in-reader-view': document.getElementById('context-open-in-reader-view').checked,
    'context-open-in-reader-view-bg': document.getElementById('context-open-in-reader-view-bg').checked,
    'context-switch-to-reader-view': document.getElementById('context-switch-to-reader-view').checked,

    'printing-button': document.getElementById('printing-button').checked,
    'save-button': document.getElementById('save-button').checked,
    'fullscreen-button': document.getElementById('fullscreen-button').checked,
    'speech-button': document.getElementById('speech-button').checked,
    'images-button': document.getElementById('images-button').checked,
    'highlight-button': document.getElementById('highlight-button').checked,
    'design-mode-button': document.getElementById('design-mode-button').checked,
    'navigate-buttons': document.getElementById('navigate-buttons').checked
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

  document.getElementById('printing-button').checked = config.prefs['printing-button'];
  document.getElementById('save-button').checked = config.prefs['save-button'];
  document.getElementById('fullscreen-button').checked = config.prefs['fullscreen-button'];
  document.getElementById('speech-button').checked = config.prefs['speech-button'];
  document.getElementById('images-button').checked = config.prefs['images-button'];
  document.getElementById('highlight-button').checked = config.prefs['highlight-button'];
  document.getElementById('design-mode-button').checked = config.prefs['design-mode-button'];
  document.getElementById('navigate-buttons').checked = config.prefs['navigate-buttons'];

  document.getElementById('reader-mode').checked = config.prefs['reader-mode'];
  document.getElementById('faqs').checked = config.prefs['faqs'];
  document.getElementById('tts-delay').value = config.prefs['tts-delay'];
  document.getElementById('cache-highlights').checked = config.prefs['cache-highlights'];
  document.getElementById('context-open-in-reader-view').checked = config.prefs['context-open-in-reader-view'];
  document.getElementById('context-open-in-reader-view-bg').checked = config.prefs['context-open-in-reader-view-bg'];
  document.getElementById('context-switch-to-reader-view').checked = config.prefs['context-switch-to-reader-view'];
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
