'use strict';

var config = {
  callbacks: [] // will be called when prefs are ready
};
config.prefs = {
  'font-size': 13,
  'font': 'sans-serif',
  'width': 600,
  'line-height': 28.8,
  'new-tab': true,
  'reader-mode': false,
  'faqs': true,
  'version': null,
  'user-css': '', // is used for exporting from old method; do not delete
  'context-open-in-reader-view': true,
  'context-open-in-reader-view-bg': true,
  'context-switch-to-reader-view': true
};

chrome.storage.onChanged.addListener(prefs => {
  Object.keys(prefs).forEach(key => config.prefs[key] = prefs[key].newValue);
});

chrome.storage.local.get(config.prefs, prefs => {
  Object.assign(config.prefs, prefs);
  config.ready = true;
  config.callbacks.forEach(c => c());
});
config.load = c => {
  if (config.ready) {
    c();
  }
  else {
    config.callbacks.push(c);
  }
};
