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

/* global defaults, aStorage */
self.importScripts('defaults.js');
self.importScripts('menus.js');
self.importScripts('navigate.js');
self.importScripts('storage.js');

const notify = e => {
  console.error(e);
  return chrome.notifications.create({
    title: chrome.runtime.getManifest().name,
    type: 'basic',
    iconUrl: '/data/icons/48.png',
    message: e.message || e
  }, id => {
    setTimeout(chrome.notifications.clear, 3000, id);
  });
};

const onClicked = async (tab, embedded = false) => {
  const root = chrome.runtime.getURL('');
  if (tab.url && tab.url.startsWith(root)) {
    chrome.tabs.sendMessage(tab.id, {
      cmd: 'close'
    });
  }
  else {
    const target = {
      tabId: tab.id
    };

    try {
      await chrome.scripting.executeScript({
        target,
        injectImmediately: true,
        files: ['/data/inject/Readability.js']
      });

      const prefs = await new Promise(resolve => chrome.storage.local.get({
        'auto-fullscreen': defaults['auto-fullscreen'],
        './plugins/chapters/core.mjs': defaults['./plugins/chapters/core.mjs']
      }, resolve));

      if (prefs['auto-fullscreen']) {
        chrome.windows.update(tab.windowId, {
          state: 'fullscreen'
        });
      }

      await chrome.scripting.executeScript({
        target,
        injectImmediately: true,
        files: ['defaults.js']
      });
      await chrome.scripting.executeScript({
        target,
        injectImmediately: true,
        files: ['/data/config.js']
      });
      await chrome.scripting.executeScript({
        target,
        injectImmediately: true,
        func: b => window.embedded = b,
        args: [embedded]
      });

      // detect chapters
      if (prefs['./plugins/chapters/core.mjs']) {
        await chrome.scripting.executeScript({
          target,
          injectImmediately: true,
          files: ['/data/inject/next-chap/fastest-levenshtein/mod.js']
        });
        await chrome.scripting.executeScript({
          target,
          injectImmediately: true,
          files: ['/data/inject/next-chap/NextChap.js']
        });
      }

      await chrome.scripting.executeScript({
        target,
        injectImmediately: true,
        files: ['/data/inject/wrapper.js']
      });
    }
    catch (e) {
      console.warn(e);
      notify(e);
    }
  }
};
chrome.action.onClicked.addListener(onClicked);

chrome.commands.onCommand.addListener(command => {
  if (command === 'toggle-reader-view') {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, ([tab]) => tab && onClicked(tab));
  }
});

/* when tab loads switch to the reader view */
const lazy = tabId => {
  lazy.cache[tabId] = true;

  chrome.tabs.onUpdated.removeListener(lazy.watch);
  chrome.tabs.onUpdated.addListener(lazy.watch);
};
lazy.cache = {};
lazy.watch = (tabId, info, tab) => {
  // Google News redirects to the original article
  if (tab.url && tab.url.startsWith('https://news.google.com/articles/')) {
    return;
  }

  if (lazy.cache[tabId]) {
    onClicked(tab);
    delete lazy.cache[tabId];
    if (Object.keys(lazy.cache).length === 0) {
      chrome.tabs.onUpdated.removeListener(lazy.watch);
    }
  }
};

const onMessage = (request, sender, response) => {
  if (request.cmd === 'switch-to-reader-view') {
    onClicked(sender.tab);
  }
  else if (request.cmd === 'open-reader' && request.article) {
    request.article.icon = sender.tab.favIconUrl;
    aStorage.set(sender.tab.id, request.article).then(() => {
      const id = sender.tab ? sender.tab.id : '';
      const url = sender.tab ? sender.tab.url : '';
      chrome.tabs.update(id, {
        url: chrome.runtime.getURL('/data/reader/index.html?id=' + id + '&url=' + encodeURIComponent(url))
      });
    }).catch(notify);
  }
  else if (request.cmd === 'open-reader') {
    notify(chrome.i18n.getMessage('bg_warning_1'));
  }
  else if (request.cmd === 'notify') {
    notify(request.msg);
  }
  else if (request.cmd === 'read-data') {
    const id = sender.tab ? sender.tab.id : '';
    aStorage.get(id).then(article => {
      if (article) {
        chrome.storage.local.get({
          'highlights-objects': defaults['highlights-objects']
        }, prefs => {
          article.highlights = prefs['highlights-objects'][article.url.split('#')[0]];
          response(article);
        });
        chrome.action.setIcon({
          tabId: id,
          path: {
            16: '/data/icons/blue/16.png',
            32: '/data/icons/blue/32.png',
            48: '/data/icons/blue/48.png'
          }
        });
      }
      else {
        response(false);
      }
    });

    return true;
  }
  else if (request.cmd === 'open') {
    const id = sender.tab ? sender.tab.id : '';

    // open in the current tab
    if (request.current) {
      if (request.reader) { // open in reader view
        lazy(id);
      }
      chrome.tabs.update({
        url: request.url
      }).catch(e => {
        console.log(`Error updating tab to go to URL ${request.url}, cause : ${e.message}`);
      });
    }
    else {
      chrome.tabs.create({
        url: request.url,
        openerTabId: id,
        index: sender.tab.index + 1,
        active: false
      }, t => request.reader && lazy(t.id));
    }
  }
  else if (request.cmd === 'reader-on-reload') {
    lazy(sender.tab.id);
  }
  else if (request.cmd === 'highlights') {
    chrome.storage.local.get({
      'cache-highlights': defaults['cache-highlights'],
      'highlights-objects': defaults['highlights-objects'],
      'highlights-keys': defaults['highlights-keys'],
      'highlights-count': defaults['highlights-count']
    }, prefs => {
      const highlights = prefs['highlights-objects'];

      if (request.value.length && prefs['cache-highlights']) {
        highlights[request.href] = request.value;
        prefs['highlights-keys'].unshift(request.href);
        prefs['highlights-keys'] = prefs['highlights-keys'].filter((s, i, l) => {
          return s && l.indexOf(s) === i;
        }).slice(0, prefs['highlights-count']);
      }
      else {
        delete highlights[request.href];
        const i = prefs['highlights-keys'].indexOf(request.href);
        if (i !== -1) {
          prefs['highlights-keys'].splice(i, 1);
        }
      }
      chrome.storage.local.set({
        'highlights-keys': prefs['highlights-keys'],
        'highlights-objects': prefs['highlights-keys'].reduce((p, c) => {
          p[c] = highlights[c] || {};
          return p;
        }, {})
      });
    });
  }
  else if (request.cmd === 'exit-fullscreen') {
    chrome.windows.update(sender.tab.windowId, {
      state: 'normal'
    });
  }
  else if (request.cmd === 'health-check') {
    response(true);
  }
  else if (request.cmd === 'converting' || request.cmd === 'converted' || request.cmd === 'aborted') {
    const title = request.cmd === 'converting' ? chrome.i18n.getMessage('bg_converting') : chrome.runtime.getManifest().name;
    const color = request.cmd === 'converting' ? 'green/' : (request.cmd === 'converted' ? 'blue/' : '');
    chrome.action.setTitle({
      tabId: sender.tab.id,
      title
    });
    chrome.action.setIcon({
      tabId: sender.tab.id,
      path: {
        '16': '/data/icons/' + color + '16.png',
        '32': '/data/icons/' + color + '32.png',
        '48': '/data/icons/' + color + '48.png',
        '64': '/data/icons/' + color + '64.png'
      }
    });
  }
  else if (request.cmd === 'prepare-tts-network') {
    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [1010],
      addRules: [{
        'id': 1010,
        'priority': 1,
        'action': {
          'type': 'modifyHeaders',
          'requestHeaders': [{
            'header': 'referer',
            'operation': 'set',
            'value': request.referer
          }, {
            'header': 'origin',
            'operation': 'set',
            'value': request.origin
          }]
        },
        'condition': {
          'urlFilter': request.origin,
          'resourceTypes': ['xmlhttprequest'],
          'tabIds': [sender.tab.id]
        }
      }]
    }).then(() => response());
    return true;
  }
};
chrome.runtime.onMessage.addListener(onMessage);

/* remove highlighting cache */
chrome.storage.onChanged.addListener(ps => {
  if (ps['cache-highlights'] && ps['cache-highlights'].newValue === false) {
    chrome.storage.local.set({
      'highlights-keys': [],
      'highlights-objects': {}
    });
  }
});

/* delete all old caches */
const cleanup = () => typeof caches === 'object' && caches.keys().then(keys => {
  for (const key of keys) {
    caches.delete(key);
  }
});
chrome.runtime.onInstalled.addListener(cleanup);
chrome.runtime.onStartup.addListener(cleanup);
chrome.tabs.onRemoved.addListener(id => {
  // revert restrictions on remote access
  chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [id]
  });
  //
  if (typeof caches !== 'undefined') {
    caches.delete(id.toString());
  }
});

/* exit reader view if you can */
chrome.runtime.onSuspend.addListener(() => chrome.tabs.query({}, tabs => {
  console.info('SUSPEND');
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, {
      cmd: 'close'
    }, () => chrome.runtime.lastError);
  }
}));

/*
  backward font compatibility
  TO-DO: Remove this after next release
*/
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('font', prefs => {
    if (prefs.font === 'serif' || prefs.font === 'sans-serif') {
      chrome.storage.local.set({
        font: (prefs.font === 'serif' ? `Georgia, 'Times New Roman', serif` : `Helvetica, Arial, sans-serif`)
      });
    }
  });
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const {homepage_url: page, name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
