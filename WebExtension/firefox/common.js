/* global config */
'use strict';

// polyfill
chrome.tabs.goBack = chrome.tabs.goBack || function(tabId) {
  chrome.tabs.executeScript(tabId, {
    code: 'history.back()'
  });
};

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
  const observe = () => chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
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
  if (chrome.extension.inIncognitoContext) {
    observe();
  }
  else {
    chrome.runtime.onInstalled.addListener(observe);
  }
}
else {
  chrome.tabs.onUpdated.addListener(tabId => chrome.pageAction.show(tabId));
  chrome.tabs.query({}, tabs => tabs.forEach(tab => chrome.pageAction.show(tab.id)));
}

function onClicked(tab, embedded = false) {
  const root = chrome.runtime.getURL('');
  if (tab.url && tab.url.startsWith(root)) {
    chrome.tabs.goBack(tab.id);
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
          file: 'config.js'
        }, () => {
          chrome.runtime.lastError;
          chrome.tabs.executeScript(tab.id, {
            code: 'window.embedded = ' + embedded
          }, () => {
            chrome.runtime.lastError;
            chrome.tabs.executeScript(tab.id, {
              file: 'data/inject/wrapper.js'
            }, () => chrome.runtime.lastError);
          });
        });
      }
    });
  }
}

chrome.pageAction.onClicked.addListener(onClicked);

const menus = () => config.load(() => {
  chrome.contextMenus.create({
    id: 'open-in-embedded-reader-view',
    title: 'Open in Simple Mode',
    contexts: ['page_action']
  }, () => chrome.runtime.lastError);
  if (config.prefs['context-open-in-reader-view']) {
    chrome.contextMenus.create({
      id: 'open-in-reader-view',
      title: 'Open in Reader View',
      contexts: ['link']
    }, () => chrome.runtime.lastError);
  }
  else {
    chrome.contextMenus.remove('open-in-reader-view', () => chrome.runtime.lastError);
  }
  if (config.prefs['context-open-in-reader-view-bg']) {
    chrome.contextMenus.create({
      id: 'open-in-reader-view-bg',
      title: 'Open in background Reader View',
      contexts: ['link']
    }, () => chrome.runtime.lastError);
  }
  else {
    chrome.contextMenus.remove('open-in-reader-view-bg', () => chrome.runtime.lastError);
  }
  if (config.prefs['context-switch-to-reader-view']) {
    chrome.contextMenus.create({
      id: 'switch-to-reader-view',
      title: 'Switch to Reader View',
      contexts: ['page'],
      documentUrlPatterns: ['*://*/*']
    }, () => chrome.runtime.lastError);
  }
  else {
    chrome.contextMenus.remove('switch-to-reader-view', () => chrome.runtime.lastError);
  }
});
chrome.runtime.onInstalled.addListener(menus);
chrome.runtime.onStartup.addListener(menus);

const onContext = ({menuItemId, pageUrl, linkUrl}, tab) => {
  let url = linkUrl || pageUrl;
  // dealing with internal pages
  if (url && url.startsWith('http') === false) {
    const link = new URL(url);
    const args = new URLSearchParams(link.search);
    if (args.has('url')) {
      url = args.get('url').split('#')[0] + link.hash;
    }
  }
  if (menuItemId === 'switch-to-reader-view') {
    onClicked(tab);
  }
  else if (menuItemId === 'open-in-embedded-reader-view') {
    onClicked(tab, true);
  }
  else if (menuItemId.startsWith('open-in-reader-view')) {
    chrome.tabs.create({
      url,
      openerTabId: tab.id,
      index: tab.index + 1,
      active: !menuItemId.endsWith('-bg')
    }, t => onClicked({
      id: t.id,
      url
    }));
  }
};
chrome.contextMenus.onClicked.addListener(onContext);

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

const onUpdated = (tabId, info, tab) => {
  if (onUpdated.cache[tabId] && (info.url || info.status === 'complete')) {
    onClicked(tab);
    delete onUpdated.cache[tabId];
    if (Object.keys(onUpdated.cache).length === 0) {
      chrome.tabs.onUpdated.removeListener(onUpdated);
    }
  }
};
onUpdated.cache = {};
const cache = {};
const highlights = {};
window.highlights = highlights;
chrome.tabs.onRemoved.addListener(tabId => delete cache[tabId]);

chrome.runtime.onMessage.addListener((request, sender, response) => {
  const id = sender.tab ? sender.tab.id : '';
  const url = sender.tab ? sender.tab.url : '';
  if (request.cmd === 'open-reader' && request.article) {
    cache[sender.tab.id] = request.article;
    chrome.tabs.update(id, {
      url: chrome.runtime.getURL('data/reader/index.html?id=' + id + '&url=' + encodeURIComponent(url))
    });
  }
  else if (request.cmd === 'open-reader') {
    notify('Sorry, this page cannot be converted!');
  }
  else if (request.cmd === 'read-data') {
    cache[id].highlights = highlights[cache[id].url];
    response(cache[id]);
    chrome.pageAction.show(id, () => chrome.pageAction.setIcon({
      tabId: id,
      path: {
        16: 'data/icons/blue/16.png',
        19: 'data/icons/blue/19.png',
        32: 'data/icons/blue/32.png',
        38: 'data/icons/blue/38.png',
        48: 'data/icons/blue/48.png',
        64: 'data/icons/blue/64.png'
      }
    }));
  }
  else if (request.cmd === 'open') {
    if (request.current) {
      if (request.reader) {
        onUpdated.cache[id] = true;
        chrome.tabs.onUpdated.addListener(onUpdated);
      }
      chrome.tabs.update({
        url: request.url
      });
    }
    else {
      chrome.tabs.create({
        url: request.url,
        openerTabId: id,
        index: sender.tab.index + 1,
        active: false
      }, tab => request.reader && onClicked(tab));
    }
  }
  else if (request.cmd === 'reader-on-reload') {
    onUpdated.cache[id] = true;
    chrome.tabs.onUpdated.addListener(onUpdated);
  }
  else if (request.cmd === 'go-back') {
    chrome.tabs.goBack(sender.tab.id);
  }
  else if (request.cmd === 'highlights') {
    if (request.value.length && config.prefs['cache-highlights']) {
      highlights[request.href] = request.value;
    }
    else {
      delete highlights[request.href];
    }
  }
});

// on change
config.onChanged.push(prefs => {
  if (prefs['cache-highlights']) {
    if (prefs['cache-highlights'].newValue === false) {
      for (const key of Object.keys(highlights)) {
        delete highlights[key];
      }
    }
  }
  if (
    prefs['context-open-in-reader-view'] ||
    prefs['context-open-in-reader-view-bg'] ||
    prefs['context-switch-to-reader-view']
  ) {
    menus();
  }
});

/* FAQs & Feedback */
{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
  if (navigator.webdriver !== true) {
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
}
