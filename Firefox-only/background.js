'use strict';

{
  const context = () => chrome.storage.local.get({
    'switch-to-reader-view': true,
    'open-in-reader-view': true,
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'switch-to-reader-view') {
    browser.tabs.toggleReaderMode(tab.id);
  }
  else if (info.menuItemId === 'open-in-reader-view') {
    let url = info.linkUrl || info.pageUrl;
    if (url.indexOf('/url?') !== -1 && url.startsWith('https://www.google.')) {
      const tmp = /url=([^&]+)/.exec(url);
      if (tmp && tmp.length) {
        url = decodeURIComponent(tmp[1]);
      }
    }
    chrome.storage.local.get({
      'open-next-to-active': true,
      'open-in-background': false,
    }, prefs => {
      const options = {
        openInReaderMode: true,
        active: prefs['open-in-background'] === false,
        url
      };
      if (prefs['open-next-to-active']) {
        options.openerTabId = tab.id;
      }
      browser.tabs.create(options);
    });
  }
});

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': navigator.userAgent.indexOf('Firefox') === -1,
  'last-update': 0,
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
