/* globals Readability */
'use strict';

{
  if (Readability.prototype._getReadTime === undefined) {
    Readability.prototype._getReadTime = function(textContent) {
      const lang = this._doc.documentElement.lang || 'en';
      const readingSpeed = this._getReadingSpeedForLanguage(lang);
      const charactersPerMinuteLow = readingSpeed.cpm - readingSpeed.variance;
      const charactersPerMinuteHigh = readingSpeed.cpm + readingSpeed.variance;
      const length = textContent.length;
      return {
        readingTimeMinsSlow: Math.ceil(length / charactersPerMinuteLow),
        readingTimeMinsFast: Math.ceil(length / charactersPerMinuteHigh)
      };
    };
    Readability.prototype._getReadingSpeedForLanguage = function(lang) {
      const readingSpeed = new Map([
        ['en', {cpm: 987, variance: 118}],
        ['ar', {cpm: 612, variance: 88}],
        ['de', {cpm: 920, variance: 86}],
        ['es', {cpm: 1025, variance: 127}],
        ['fi', {cpm: 1078, variance: 121}],
        ['fr', {cpm: 998, variance: 126}],
        ['he', {cpm: 833, variance: 130}],
        ['it', {cpm: 950, variance: 140}],
        ['jw', {cpm: 357, variance: 56}],
        ['nl', {cpm: 978, variance: 143}],
        ['pl', {cpm: 916, variance: 126}],
        ['pt', {cpm: 913, variance: 145}],
        ['ru', {cpm: 986, variance: 175}],
        ['sk', {cpm: 885, variance: 145}],
        ['sv', {cpm: 917, variance: 156}],
        ['tr', {cpm: 1054, variance: 156}],
        ['zh', {cpm: 255, variance: 29}]
      ]);
      return readingSpeed.get(lang) || readingSpeed.get('en');
    };
    const pars = Readability.prototype.parse;
    Readability.prototype.parse = function(...args) {
      const rtn = pars.apply(this, args);
      return Object.assign(
        rtn,
        this._getReadTime(rtn.textContent)
      );
    };
  }
}

// The implementation is from https://stackoverflow.com/a/5084441/260793
function getSelectionHTML() {
  const selection = window.getSelection();
  if (selection && selection.rangeCount && selection.toString().length > 100) {
    let range;
    if (selection.getRangeAt) {
      range = selection.getRangeAt(0);
    }
    else {
      range = document.createRange();
      range.setStart(selection.anchorNode, selection.anchorOffset);
      range.setEnd(selection.focusNode, selection.focusOffset);
    }
    const doc = document.implementation.createHTMLDocument(document.title);

    const article = doc.body.appendChild(doc.createElement('article'));
    article.appendChild(range.extractContents());
    return doc;
  }
  else {
    return;
  }
}
{
  const article = new Readability(
    getSelectionHTML() || document.cloneNode(true)
  ).parse();

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
}
