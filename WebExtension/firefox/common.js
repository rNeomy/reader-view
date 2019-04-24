/* globals config */
'use strict';

function notify(message) {
  chrome.notifications.create({
    title: 'Reader View',
    type: 'basic',
    iconUrl: 'data/icons/48.png',
    message
  });
}

// page action
if ('declarativeContent' in chrome) {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
      chrome.declarativeContent.onPageChanged.addRules([{
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {
              schemes: ['http', 'https']
            }
          })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }]);
    });
  });
}
else {
  chrome.tabs.onUpdated.addListener(tabId => chrome.pageAction.show(tabId));
  chrome.tabs.query({}, tabs => tabs.forEach(tab => chrome.pageAction.show(tab.id)));
}

function onClicked(tab) {
  const root = chrome.runtime.getURL('');
  if (tab.url && tab.url.startsWith(root)) {
    chrome.tabs.sendMessage(tab.id, {
      cmd: 'close'
    });
  }
  else {
    chrome.tabs.executeScript(tab.id, {
      file: 'data/inject/Readability.js'
    }, () => {
      if (chrome.runtime.lastError) {
        notify(chrome.runtime.lastError.message);
      }
      else {
        if (localStorage.getItem('auto-fullscreen') === 'true') {
          chrome.windows.update(tab.windowId, {
            state: 'fullscreen'
          });
        }
        chrome.tabs.executeScript(tab.id, {
          file: 'data/inject/wrapper.js'
        });
      }
    });
  }
}

chrome.pageAction.onClicked.addListener(onClicked);

{
  const callback = () => config.load(() => {
    if (config.prefs['context-open-in-reader-view']) {
      chrome.contextMenus.create({
        id: 'open-in-reader-view',
        title: 'Open in Reader View',
        contexts: ['link']
      });
    }
    if (config.prefs['context-open-in-reader-view-bg']) {
      chrome.contextMenus.create({
        id: 'open-in-reader-view-bg',
        title: 'Open in background Reader View',
        contexts: ['link']
      });
    }
    if (config.prefs['context-switch-to-reader-view']) {
      chrome.contextMenus.create({
        id: 'switch-to-reader-view',
        title: 'Switch to Reader View',
        contexts: ['page'],
        documentUrlPatterns: ['*://*/*']
      });
    }
  });
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
}
chrome.contextMenus.onClicked.addListener(({menuItemId, pageUrl, linkUrl}, tab) => {
  const url = linkUrl || pageUrl;
  if (menuItemId === 'switch-to-reader-view') {
    onClicked(tab);
  }
  else if (menuItemId.startsWith('open-in-reader-view')) {
    chrome.permissions.request({
      permissions: ['tabs'],
      origins: ['*://*/*']
    }, () => {
      chrome.tabs.create({
        url,
        openerTabId: tab.id,
        index: tab.index + 1,
        active: !menuItemId.endsWith('-bg')
      }, t => window.setTimeout(onClicked, 1000, {
        id: t.id,
        url
      }));
    });
  }
});

chrome.commands.onCommand.addListener(function(command) {
  if (command === 'toggle-reader-view') {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, tabs => {
      if (tabs.length) {
        onClicked(tabs[0]);
      }
    });
  }
});

var onUpdated = (tabId, info, tab) => {
  if (onUpdated.cache[tabId] && info.url) {
    onClicked(tab);
    delete onUpdated.cache[tabId];
    if (Object.keys(onUpdated.cache).length === 0) {
      chrome.tabs.onUpdated.removeListener(onUpdated);
    }
  }
};
onUpdated.cache = {};
var cache = {};
chrome.tabs.onRemoved.addListener(tabId => delete cache[tabId]);

chrome.runtime.onMessage.addListener((request, sender, response) => {
  const id = sender.tab ? sender.tab.id : '';
  const url = sender.tab ? sender.tab.url : '';
  if (request.cmd === 'open-reader' && request.article) {
    cache[sender.tab.id] = request.article;
    cache[sender.tab.id].url = url;
    chrome.tabs.update(id, {
      url: chrome.runtime.getURL('data/reader/index.html?id=' + id)
    });
  }
  else if (request.cmd === 'open-reader') {
    notify('Sorry, this page cannot be converted!');
  }
  else if (request.cmd === 'read-data') {
    response(cache[id]);
    chrome.pageAction.show(id, () => chrome.pageAction.setIcon({
      tabId: id,
      path: {
        16: 'data/icons/orange/16.png',
        32: 'data/icons/orange/32.png',
        48: 'data/icons/orange/48.png',
        64: 'data/icons/orange/64.png'
      }
    }));
  }
  else if (request.cmd === 'open') {
    if (request.current) {
      chrome.tabs.update({
        url: request.url
      }, tab => request.reader && window.setTimeout(onClicked, 1000, tab));
    }
    else {
      chrome.tabs.create({
        url: request.url,
        openerTabId: id,
        index: sender.tab.index + 1
      }, tab => request.reader && onClicked(tab));
    }
  }
  else if (request.cmd === 'reader-on-reload') {
    onUpdated.cache[id] = true;
    chrome.tabs.onUpdated.addListener(onUpdated);
  }
});

{ // one-time
  const callback = () => config.load(() => {
    if (!localStorage.getItem('user-css')) {
      if (config['mode']) {
        localStorage.setItem('mode', config.prefs.mode);
        chrome.storage.local.remove('mode');
      }
      else {
        localStorage.setItem('mode', 'sepia');
      }

      if (config.prefs['user-css']) {
        localStorage.setItem('user-css', config.prefs['user-css']);
        chrome.storage.local.remove('user-css');
      }
      else {
        localStorage.setItem('user-css', `body {
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
pre {
  white-space: pre-line;
}
pre code {
  background-color: #eff0f1;
  color: #393318;
  font-family: monospace;
  display: block;
  padding: 5px 10px;
}
body[data-mode="dark"] pre code {
  background-color: #585858;
  color: #e8e8e8;
}

/* CSS for sans-serif fonts */
body[data-font=sans-serif] {}
/* CSS for serif fonts */
body[data-font=serif] {}

/* CSS for "sepia" theme */
body[data-mode=sepia] {
}
/* CSS for "light" theme */
body[data-mode=light] {}
/* CSS for "dark" theme */
body[data-mode=dark] {}`);
      }
    }
  });
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
}
// FAQs
{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
  onInstalled.addListener(({reason, previousVersion}) => {
    chrome.storage.local.get({
      'faqs': true,
      'last-update': 0
    }, prefs => {
      if (reason === 'install' || (prefs.faqs && reason === 'update')) {
        const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
        if (doUpdate && previousVersion !== version) {
          chrome.tabs.create({
            url: page + '?version=' + version +
              (previousVersion ? '&p=' + previousVersion : '') +
              '&type=' + reason,
            active: reason === 'install'
          });
          chrome.storage.local.set({'last-update': Date.now()});
        }
      }
    });
  });
  setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
}
