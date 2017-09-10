'use strict';

function notify(message) {
  chrome.notifications.create({
    title: 'Reader View',
    type: 'basic',
    iconUrl: 'data/icons/48.png',
    message
  });
}

function update(tab) {
  const page = tab.url.startsWith('http');
  const reader = tab.url.startsWith(chrome.runtime.getURL('data/reader/index.html'));
  chrome.pageAction[page || reader ? 'show' : 'hide'](tab.id);
  chrome.pageAction.setIcon({
    tabId: tab.id,
    path: {
      16: 'data/icons' + (reader ? '/orange' : '') + '/16.png',
      32: 'data/icons' + (reader ? '/orange' : '') + '/32.png',
      64: 'data/icons' + (reader ? '/orange' : '') + '/64.png'
    }
  });
}
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => update(tab));
chrome.tabs.query({}, tabs => tabs.forEach(update));

var cache = {};

function onClicked(tab) {
  if (tab.url.startsWith('http')) {
    chrome.tabs.executeScript(tab.id, {
      file: 'data/inject/Readability.js'
    }, () => {
      if (chrome.runtime.lastError) {
        notify(chrome.runtime.lastError.message);
      }
      else {
        chrome.tabs.executeScript(tab.id, {
          file: 'data/inject/wrapper.js'
        }, () => {});
      }
    });
  }
  else {
    chrome.tabs.sendMessage(tab.id, {
      cmd: 'close'
    });
  }
}

chrome.pageAction.onClicked.addListener(onClicked);

chrome.commands.onCommand.addListener(function(command) {
  if (command === 'toggle-reader-view') {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, tabs => {
      if (tabs.length) {
        onClicked(tabs[0]);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, response) => {
  const id = sender.tab.id;
  const url = sender.tab.url;
  if (request.cmd === 'open-reader' && request.article) {
    cache[sender.tab.id] = request.article;
    cache[sender.tab.id].url = url;
    chrome.tabs.update(id, {
      url: chrome.runtime.getURL('data/reader/index.html?id=' + id)
    });
  }
  else if (request.cmd === 'open-reader') {
    notify('Sorry, this page cannot be converted!');
  }
  else if (request.cmd === 'read-data') {
    response(cache[id]);
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  delete cache[tabId];
});

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': true
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    chrome.storage.local.set({version}, () => {
      chrome.tabs.create({
        url: 'http://add0n.com/chrome-reader-view.html?version=' + version +
          '&type=' + (prefs.version ? ('upgrade&p=' + prefs.version) : 'install')
      });
    });
  }
});

(function() {
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL('http://add0n.com/feedback.html?name=' + name + '&version=' + version);
})();
