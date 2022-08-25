/* global defaults */

const navigate = () => chrome.storage.local.get({
  'auto-rules': defaults['auto-rules']
}, async prefs => {
  await chrome.scripting.unregisterContentScripts();

  if (prefs['auto-rules'].length) {
    chrome.scripting.registerContentScripts([{
      'id': 'navigate',
      'matches': ['*://*/*'],
      'runAt': 'document_start',
      'js': ['/data/navigate.js']
    }]);
  }
});

chrome.runtime.onStartup.addListener(navigate);
chrome.runtime.onInstalled.addListener(navigate);
chrome.storage.onChanged.addListener(ps => ps['auto-rules'] && navigate());
