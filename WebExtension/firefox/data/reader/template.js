/* global config */
'use strict';

const args = new URLSearchParams(top.location.search);

if (window.top !== window) {
  chrome = top.chrome;
  window.config = top.config;
}

// back
document.getElementById('reader-domain').addEventListener('click', e => {
  e.preventDefault();
  e.stopPropagation();
  top.nav.back();
});

// link handling
document.addEventListener('click', e => {
  const a = e.target.closest('a');
  if (a && a.href) {
    // external links
    if (a.href.startsWith('http') && e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      return chrome.runtime.sendMessage({
        cmd: 'open',
        url: a.href,
        reader: config.prefs['reader-mode'],
        current: e.ctrlKey === false && e.metaKey === false
      });
    }
    // internal links
    // https://github.com/rNeomy/reader-view/issues/52
    try {
      const link = new URL(a.href);
      if (link.pathname === location.pathname && link.origin === location.origin) {
        e.preventDefault();
        e.stopPropagation();
        if (link.hash) {
          if (e.button === 0 && e.metaKey === false) {
            top.hash(link);
          }
          else {
            chrome.runtime.sendMessage({
              cmd: 'open',
              url: args.get('url').split('#')[0] + link.hash,
              reader: config.prefs['reader-mode'],
              current: e.ctrlKey === false && e.metaKey === false
            });
          }
        }
      }
    }
    catch (e) {
      console.warn(e);
    }
  }
});
// prefs
config.onChanged.push(ps => {
  if (ps['user-css']) {
    document.getElementById('user-css').textContent = config.prefs['user-css'];
  }
  if (ps['show-images']) {
    document.body.dataset.images = config.prefs['show-images'];
  }
  if (ps['mode']) {
    document.body.dataset.mode = config.prefs.mode;
  }
  if (ps['font']) {
    document.body.dataset.font = config.prefs.font;
  }
});
