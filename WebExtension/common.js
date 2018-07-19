'use strict';

function notify(message) {
  chrome.notifications.create({
    title: 'Reader View',
    type: 'basic',
    iconUrl: 'data/icons/48.png',
    message
  });
}

function update(tab) {
  const page = tab.url.startsWith('http');
  const reader = tab.url.startsWith(chrome.runtime.getURL('data/reader/index.html'));
  chrome.pageAction[page || reader ? 'show' : 'hide'](tab.id);
  chrome.pageAction.setIcon({
    tabId: tab.id,
    path: {
      16: 'data/icons' + (reader ? '/orange' : '') + '/16.png',
      32: 'data/icons' + (reader ? '/orange' : '') + '/32.png',
      64: 'data/icons' + (reader ? '/orange' : '') + '/64.png'
    }
  });
}
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => update(tab));
chrome.tabs.query({}, tabs => tabs.forEach(update));

var cache = {};

function onClicked(tab) {
  if (tab.url.startsWith('http')) {
    chrome.tabs.executeScript(tab.id, {
      file: 'data/inject/Readability.js'
    }, () => {
      if (chrome.runtime.lastError) {
        notify(chrome.runtime.lastError.message);
      }
      else {
        chrome.tabs.executeScript(tab.id, {
          file: 'data/inject/wrapper.js'
        }, () => {});
      }
    });
  }
  else {
    chrome.tabs.sendMessage(tab.id, {
      cmd: 'close'
    });
  }
}

chrome.pageAction.onClicked.addListener(onClicked);

{
  const callback = () => {
    chrome.contextMenus.create({
      id: 'open-in-reader-view',
      title: 'Open in Reader View',
      contexts: ['link']
    });
    chrome.contextMenus.create({
      id: 'open-in-reader-view-bg',
      title: 'Open in background Reader View',
      contexts: ['link']
    });
    chrome.contextMenus.create({
      id: 'switch-to-reader-view',
      title: 'Switch to Reader View',
      contexts: ['page'],
      documentUrlPatterns: ['*://*/*']
    });
  };
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
}
chrome.contextMenus.onClicked.addListener(({menuItemId, pageUrl, linkUrl}, tab) => {
  const url = linkUrl || pageUrl;
  if (menuItemId === 'switch-to-reader-view') {
    onClicked(tab);
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

chrome.runtime.onMessage.addListener((request, sender, response) => {
  const id = sender.tab.id;
  const url = sender.tab.url;
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
  }
  else if (request.cmd === 'open') {
    chrome.tabs.create({
      url: request.url,
      openerTabId: sender.tab.id,
      index: sender.tab.index + 1
    });
  }
  else if (request.cmd === 'reader-on-reload') {
    const callback = tabId => {
      if (tabId === sender.tab.id) {
        chrome.tabs.onUpdated.removeListener(callback);
        onClicked(sender.tab);
      }
    };
    chrome.tabs.onUpdated.addListener(callback);
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  delete cache[tabId];
});

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': true,
  'last-update': 0
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    const now = Date.now();
    const doUpdate = (now - prefs['last-update']) / 1000 / 60 / 60 / 24 > 30;
    chrome.storage.local.set({
      version,
      'last-update': doUpdate ? Date.now() : prefs['last-update']
    }, () => {
      // do not display the FAQs page if last-update occurred less than 30 days ago.
      if (doUpdate) {
        const p = Boolean(prefs.version);
        chrome.tabs.create({
          url: chrome.runtime.getManifest().homepage_url + '?version=' + version +
            '&type=' + (p ? ('upgrade&p=' + prefs.version) : 'install'),
          active: p === false
        });
      }
    });
  }
});

{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL(
    chrome.runtime.getManifest().homepage_url + '?rd=feedback&name=' + name + '&version=' + version
  );
}
