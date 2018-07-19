/* globals browser */
'use strict';

{
  const context = () => chrome.storage.local.get({
    'switch-to-reader-view': true,
    'open-in-reader-view': true
  }, prefs => {
    chrome.contextMenus.removeAll(() => {
      if (prefs['switch-to-reader-view']) {
        chrome.contextMenus.create({
          title: 'Switch to Reader View',
          id: 'switch-to-reader-view',
          contexts: ['page'],
          documentUrlPatterns: ['*://*/*']
        });
      }
      if (prefs['open-in-reader-view']) {
        chrome.contextMenus.create({
          title: 'Open in Reader View',
          id: 'open-in-reader-view',
          contexts: ['page', 'link'],
          documentUrlPatterns: ['*://*/*']
        });
      }
    });
  });
  chrome.runtime.onInstalled.addListener(context);
  chrome.runtime.onStartup.addListener(context);
  chrome.storage.onChanged.addListener(prefs => {
    if (prefs['switch-to-reader-view'] || prefs['open-in-reader-view']) {
      context();
    }
  });
}

var redirects = {};
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (redirects[tabId] && changeInfo.isArticle) {
    browser.tabs.toggleReaderMode(tabId);
    delete redirects[tabId];
  }
});

var onClicked = (info, tab) => {
  if (info.menuItemId === 'switch-to-reader-view') {
    browser.tabs.toggleReaderMode(tab.id);
  }
  else if (info.menuItemId === 'open-in-reader-view') {
    let url = info.linkUrl || info.pageUrl;
    let openInReaderMode = true;

    if (url.indexOf('/url?') !== -1 && url.indexOf('://www.google.') !== -1) {
      const tmp = /url=([^&]+)/.exec(url);
      if (tmp && tmp.length) {
        url = decodeURIComponent(tmp[1]);
      }
    }
    else if (url.indexOf('://news.google.') !== -1 && url.indexOf('/articles/') !== -1) {
      openInReaderMode = false;
    }
    chrome.storage.local.get({
      'open-next-to-active': true,
      'open-in-background': false
    }, prefs => {
      const options = {
        openInReaderMode,
        active: prefs['open-in-background'] === false,
        url
      };
      if (prefs['open-next-to-active']) {
        options.openerTabId = tab.id;
      }
      browser.tabs.create(options).then(tab => {
        if (openInReaderMode === false) {
          redirects[tab.id] = true;
        }
      });
    });
  }
};
chrome.contextMenus.onClicked.addListener(onClicked);

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
