'use strict';

var cm = require('sdk/context-menu');
var tabs = require('sdk/tabs');
var self = require('sdk/self');
var timers = require('sdk/timers');
var sp = require('sdk/simple-prefs');

cm.Item({
  label: 'Switch back to normal view',
  image: self.data.url('icons/32.png'),
  context: [cm.PageContext(), cm.URLContext('about:reader*')],
  contentScript: 'self.on("click", () => self.postMessage(document.URL));',
  onMessage: (url) => tabs.activeTab.url = decodeURIComponent(url.replace('about:reader?url=', ''))
});

var update = (function () {
  let aItem, bItem, cItem, dItem;

  function analyze (url) {
    if (url.indexOf('google.com/url?') !== -1) {
      let tmp = /url\=([^\&]+)/.exec(url);
      if (tmp && tmp.length) {
        return 'about:reader?url=' + decodeURIComponent(tmp[1]);
      }
    }
    else {
      return 'about:reader?url=' + url;
    }
  }

  function open (url) {
    if (sp.prefs.relatedToCurrent) {
      let {getMostRecentBrowserWindow} = require('sdk/window/utils');
      let browser = getMostRecentBrowserWindow().gBrowser;
      let tab = browser.loadOneTab(url, {
        relatedToCurrent: true,
        inBackground: sp.prefs.inBackground
      });
      if (!sp.prefs.inBackground) {
        browser.selectedTab = tab;
      }
    }
    else {
      tabs.open({
        url,
        inBackground: sp.prefs.inBackground
      });
    }
  }

  return function () {
    if (sp.prefs.open) {
      aItem = aItem || cm.Item({
        label: 'Open in Reader View',
        image: self.data.url('icons/32.png'),
        context: [cm.PageContext(), cm.URLContext(['http://*', 'https://*'])],
        contentScript: 'self.on("click", () => self.postMessage(document.URL));',
        onMessage: (url) => open('about:reader?url=' + url)
      });

      bItem = bItem || cm.Item({
        label: 'Open in Reader View',
        image: self.data.url('icons/32.png'),
        context: cm.SelectorContext('a[href]'),
        contentScript: 'self.on("click", (node) => self.postMessage(node.href))',
        onMessage: (url) => open(analyze(url))
      });
    }
    else {
      if (aItem) {
        aItem.destroy();
        aItem = null;
      }
      if (bItem) {
        bItem.destroy();
        bItem = null;
      }
    }
    if (sp.prefs.switch) {
      cItem = cItem || cm.Item({
        label: 'Switch to Reader View',
        image: self.data.url('icons/32.png'),
        context: [cm.PageContext(), cm.URLContext(['http://*', 'https://*'])],
        contentScript: 'self.on("click", () => self.postMessage(document.URL));',
        onMessage: (url) => tabs.activeTab.url = 'about:reader?url=' + url
      });

      dItem = dItem || cm.Item({
        label: 'Switch to Reader View',
        image: self.data.url('icons/32.png'),
        context: cm.SelectorContext('a[href]'),
        contentScript: 'self.on("click", (node) => self.postMessage(node.href))',
        onMessage: (url) => tabs.activeTab.url = analyze(url)
      });
    }
    else {
      if (cItem) {
        cItem.destroy();
        cItem = null;
      }
      if (dItem) {
        dItem.destroy();
        dItem = null;
      }
    }
  };
})();

sp.on('open', update);
sp.on('switch', update);
update();

/* welcome */
exports.main = function (options) {
  if (options.loadReason === 'install' || options.loadReason === 'startup') {
    var version = sp.prefs.version;
    if (!version) {
      timers.setTimeout(function () {
        tabs.open(
          'http://firefox.add0n.com/reader-view.html?v=' + self.version +
          (version ? '&p=' + version + '&type=upgrade' : '&type=install')
        );
      }, 3000);
      sp.prefs.version = self.version;
    }
  }
};
