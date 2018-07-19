/* globals Readability */
'use strict';

var loc = document.location;
var uri = {
  spec: loc.href,
  host: loc.host,
  prePath: loc.protocol + '//' + loc.host,
  scheme: loc.protocol.substr(0, loc.protocol.indexOf(':')),
  pathBase: loc.protocol + '//' + loc.host + loc.pathname.substr(0, loc.pathname.lastIndexOf('/') + 1)
};

var documentClone = document.cloneNode(true);
var article = new Readability(uri, documentClone).parse();

// if a website has an automatic redirect use this method to wait for a new page load
if (location.href.indexOf('://news.google.') !== -1 &&
    location.href.indexOf('/articles/') !== -1) {
  window.addEventListener('unload', () => chrome.runtime.sendMessage({
    cmd: 'reader-on-reload'
  }));
}
else {
  chrome.runtime.sendMessage({
    cmd: 'open-reader',
    article
  });
}
