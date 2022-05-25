/* global onClicked, lazy, defaults */

const menus = () => chrome.storage.local.get({
  'context-open-in-reader-view': defaults['context-open-in-reader-view'],
  'context-open-in-reader-view-bg': defaults['context-open-in-reader-view-bg'],
  'context-switch-to-reader-view': defaults['context-switch-to-reader-view']
}, prefs => {
  chrome.contextMenus.create({
    id: 'open-in-embedded-reader-view',
    title: chrome.i18n.getMessage('bg_simple_mode'),
    contexts: ['action']
  }, () => chrome.runtime.lastError);
  if (prefs['context-open-in-reader-view']) {
    chrome.contextMenus.create({
      id: 'open-in-reader-view',
      title: chrome.i18n.getMessage('bg_reader_view'),
      contexts: ['link']
    }, () => chrome.runtime.lastError);
  }
  else {
    chrome.contextMenus.remove('open-in-reader-view', () => chrome.runtime.lastError);
  }
  if (prefs['context-open-in-reader-view-bg']) {
    chrome.contextMenus.create({
      id: 'open-in-reader-view-bg',
      title: chrome.i18n.getMessage('bg_inactive_reader_view'),
      contexts: ['link']
    }, () => chrome.runtime.lastError);
  }
  else {
    chrome.contextMenus.remove('open-in-reader-view-bg', () => chrome.runtime.lastError);
  }
  if (prefs['context-switch-to-reader-view']) {
    chrome.contextMenus.create({
      id: 'switch-to-reader-view',
      title: chrome.i18n.getMessage('bg_switch_reader'),
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
if (chrome.extension.inIncognitoContext) {
  menus();
}
// on change
chrome.storage.onChanged.addListener(ps => {
  if (
    ps['context-open-in-reader-view'] ||
    ps['context-open-in-reader-view-bg'] ||
    ps['context-switch-to-reader-view']
  ) {
    menus();
  }
});

const onContext = ({menuItemId, pageUrl, linkUrl}, tab) => {
  if (menuItemId === 'switch-to-reader-view') {
    onClicked(tab);
  }
  else if (menuItemId === 'open-in-embedded-reader-view') {
    onClicked(tab, true);
  }
  else if (menuItemId.startsWith('open-in-reader-view')) {
    let url = linkUrl || pageUrl;

    // dealing with internal pages
    if (url && url.startsWith('http') === false) {
      const link = new URL(url);
      const args = new URLSearchParams(link.search);
      if (args.has('url')) {
        url = args.get('url').split('#')[0] + link.hash;
      }
    }

    chrome.tabs.create({
      url,
      openerTabId: tab.id,
      index: tab.index + 1,
      active: !menuItemId.endsWith('-bg')
    }, t => lazy(t.id));
  }
};
chrome.contextMenus.onClicked.addListener(onContext);
