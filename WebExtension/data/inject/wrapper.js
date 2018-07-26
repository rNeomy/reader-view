/* globals Readability */
'use strict';

// The implementation is from https://stackoverflow.com/a/5084441/260793
function getSelectionHTML() {
  var userSelection = window.getSelection();
  if (userSelection && userSelection.rangeCount) {
    var range;
    if (userSelection.getRangeAt) {
      range = userSelection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.setStart(userSelection.anchorNode, userSelection.anchorOffset);
      range.setEnd(userSelection.focusNode, userSelection.focusOffset);
    }

    const doc = document.implementation.createHTMLDocument('virtual');
    doc.body.appendChild(range.cloneContents());
    return doc.body.innerHTML;
  } else {
    return '';
  }
}

var doc = document.cloneNode(true);
var content = getSelectionHTML().replace(/(^\s+|\s+$)/g, '');
if (content) {
  doc.body.innerHTML = '<article>' + content + '</article>';
}

var article = new Readability(doc).parse();

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
