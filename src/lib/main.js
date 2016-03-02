'use strict';

var cm = require('sdk/context-menu');
var tabs = require('sdk/tabs');
var self = require('sdk/self');
var timers = require('sdk/timers');
var sp = require('sdk/simple-prefs');
var { Hotkey } = require("sdk/hotkeys");

cm.Item({
  label: 'Open in Reader View',
  image: self.data.url('icons/32.png'),
  context: cm.PageContext(),
  contentScript: 'self.on("click", function (node, data) {' +
                 '  self.postMessage(document.URL);' +
                 '});',
  onMessage: function (url) {
    tabs.open('about:reader?url=' + url);
  }
});
cm.Item({
  label: 'Open in Reader View',
  image: self.data.url('icons/32.png'),
  context: cm.SelectorContext('a[href]'),
  contentScript: 'self.on("click", function (node, data) {' +
                 '  self.postMessage(node.href);' +
                 '});',
  onMessage: function (url) {
    if (url.indexOf('google.com/url?') !== -1) {
      let tmp = /url\=([^\&]+)/.exec(url);
      if (tmp && tmp.length) {
        tabs.open('about:reader?url=' + decodeURIComponent(tmp[1]));
      }
    }
    else {
      tabs.open('about:reader?url=' + url);
    }
  }
});

var readerModeKey = Hotkey({
    combo: "accel-.",
    onPress: function() {
        let url = tabs.activeTab.url;
        let readerPrefix = 'about:reader?url=';
        let matchLoc = url.search(readerPrefix.substr(0,12));
        let outUrl = '';

        // Toggle it
        if (matchLoc != -1) {
            outUrl = url.substring(readerPrefix.length);
        } else {
            outUrl = readerPrefix + url;
        }
        //console.log(outUrl + " " + matchLoc)
        tabs.activeTab.url = outUrl;

    }
});

/* welcome */
exports.main = function (options) {
  if (options.loadReason === 'install' || options.loadReason === 'startup') {
    var version = sp.prefs.version;
    if (self.version !== version) {
      if (true) {
        timers.setTimeout(function () {
          tabs.open(
            'http://firefox.add0n.com/reader-view.html?v=' + self.version +
            (version ? '&p=' + version + '&type=upgrade' : '&type=install')
          );
        }, 3000);
      }
      sp.prefs.version = self.version;
    }
  }
};
