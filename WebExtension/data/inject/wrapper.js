/* globals Readability */
'use strict';

var article = new Readability(document.cloneNode(true)).parse();

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
