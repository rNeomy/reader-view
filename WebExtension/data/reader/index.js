/* global config */
'use strict';

var article;
var isFirefox = /Firefox/.test(navigator.userAgent);

var iframe = document.querySelector('iframe');
document.body.dataset.mode = localStorage.getItem('mode');
var settings = document.querySelector('#toolbar>div');

var styles = {
  top: document.createElement('style'),
  iframe: document.createElement('style')
};
styles.top.textContent = localStorage.getItem('top-css') || '';
styles.iframe.textContent = localStorage.getItem('user-css') || '';
document.documentElement.appendChild(styles.top);

document.addEventListener('click', e => {
  const bol = e.target.dataset.cmd === 'open-settings' || Boolean(e.target.closest('#toolbar>div'));
  settings.dataset.display = bol;
});

function getFont(font) {
  switch (font) {
  case 'serif':
      return 'Georgia, "Times New Roman", serif';
  case 'sans-serif':
  default:
    return 'Helvetica, Arial, sans-serif';
  }
}

var update = {
  sync: () => {
    const mode = localStorage.getItem('mode') || 'sepia';
    iframe.contentDocument.body.dataset.mode = mode;
  },
  async: () => {
    iframe.contentDocument.body.style['font-size'] = config.prefs['font-size'] + 'px';
    iframe.contentDocument.body.style['font-family'] = getFont(config.prefs['font']);
    iframe.contentDocument.body.style['line-height'] = config.prefs['line-height'] + 'px';
    iframe.contentDocument.body.style.width = config.prefs.width + 'px';

    iframe.contentDocument.body.dataset.font = config.prefs.font;
    iframe.contentWindow.focus();
  }
};

chrome.storage.onChanged.addListener(update.async);

document.addEventListener('click', e => {
  const target = e.target.closest('[data-cmd]');
  if (!target) {
    return;
  }
  const cmd = target.dataset.cmd;
  if (cmd.startsWith('font-type-')) {
    chrome.storage.local.set({
      'font': cmd.replace('font-type-', '')
    });
  }
  else if (cmd === 'font-decrease' || cmd === 'font-increase') {
    const size = config.prefs['font-size'];
    chrome.storage.local.set({
      'font-size': cmd === 'font-decrease' ? Math.max(9, size - 1) : Math.min(33, size + 1)
    });
  }
  else if (cmd === 'width-decrease' || cmd === 'width-increase') {
    const width = config.prefs.width;
    chrome.storage.local.set({
      width: cmd === 'width-decrease' ? Math.max(300, width - 50) : Math.min(1000, width + 50)
    });
  }
  else if (cmd === 'line-height-type-1' || cmd === 'line-height-type-2') {
    chrome.storage.local.set({
      'line-height': cmd === 'line-height-type-1' ? 28.8 : 32
    });
  }
  else if (cmd.startsWith('color-mode-')) {
    localStorage.setItem('mode', cmd.replace('color-mode-', ''));
    update.sync();
  }
  else if (cmd === 'close') {
    history.go(isFirefox ? -2 : -1);
  }
  else if (cmd === 'print') {
    iframe.contentWindow.print();
  }
  else if (cmd === 'save') {
    const content = `<!DOCTYPE html>
<html>
<head>
  <title dir="auto">${article.title}</title>
</head>
${iframe.contentDocument.body.outerHTML}
</html>`;
    const blob = new Blob([content], {
      type: 'text/html'
    });
    const objectURL = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), {
      href: objectURL,
      type: 'text/html',
      download: article.title.replace( /[<>:"/\\|?*]+/g, '' ) + '.html'
    });
    link.dispatchEvent(new MouseEvent('click'));
    setTimeout(() => URL.revokeObjectURL(objectURL));
  }
  else if (cmd === 'open-speech') {
    document.body.dataset.speech = true;
  }
  else if (cmd === 'close-speech') {
    document.body.dataset.speech = false;
  }
});

chrome.runtime.onMessage.addListener(request => {
  if (request.cmd === 'close') {
    history.go(isFirefox ? -2 : -1);
  }
  else if (request.cmd === 'update-styling') {
    styles.top.textContent = localStorage.getItem('top-css') || '';
    styles.iframe.textContent = localStorage.getItem('user-css') || '';
  }
});

chrome.runtime.sendMessage({
  cmd: 'read-data'
}, obj => {
  article = obj;
  if (!article) { // open this page from history for instance
    if (history.length) {
      history.back();
    }
    else {
      window.alert('Sorry the original content is not accessible anymore. Please load the origin content and retry');
    }
  }
  iframe.contentDocument.open();
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <style>
  body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 30px auto 0 auto;
  }
  body[data-mode="light"] {
    color: #00000;
    background-color: #ffffff;
  }
  body[data-mode="dark"] {
    color: #eeeeee;
    background-color: #333333;
  }
  body[data-mode="sepia"] {
    color: #5b4636;
    background-color: #f4ecd8;
  }
  body[data-loaded=true] {
    transition: color 0.4s, background-color 0.4s;
  }
  #reader-domain {
    font-size: 0.9em;
    line-height: 1.48em;
    padding-bottom: 4px;
    font-family: Helvetica, Arial, sans-serif;
    text-decoration: none;
    border-bottom-color: currentcolor;
    color: #0095dd;
  }
  #reader-title {
    font-size: 1.6em;
    line-height: 1.25em;
    width: 100%;
    margin: 20px 0;
    padding: 0;
  }
  #reader-credits {
    font-size: 0.9em;
    line-height: 1.48em;
    margin: 0 0 10px 0;
    padding: 0;
    font-style: italic;
  }
  #reader-estimated-time {
    font-size: 0.85em;
    line-height: 1.48em;
    margin: 0 0 10px 0;
    padding: 0;
  }
  #reader-credits:empty {
    disply: none;
  }
  .speech {
    position: relative;
  }
  .speech::after {
    content: '';
    position: absolute;
    left: -100vw;
    top: -5px;
    width: 300vw;
    height: calc(100% + 10px);
    box-shadow: 0 0 0 1000vw rgba(128,128,128,0.2);
  }
  </style>
</head>
<body>
  <a id="reader-domain" href="${article.url}">${(new URL(article.url)).hostname}</a>
  <h1 dir="auto" id="reader-title">${article.title || 'Unknown Title'}</h1>
  <div dir="auto" id="reader-credits">${article.byline || ''}</div>
  <div dir="auto" id="reader-estimated-time">${article.readingTimeMinsFast}-${article.readingTimeMinsSlow} minutes</div>
  <hr/>
  ${article.content}
</body>
</html>`;
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  update.sync();

  // automatically detect ltr and rtl
  [...iframe.contentDocument.querySelectorAll('article>*')]
    .forEach(e => e.setAttribute('dir', 'auto'));

  document.title = article.title + ' :: Reader View';
  // link handling
  iframe.contentDocument.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a && a.href && a.href.startsWith('http')) {
      e.preventDefault();
      if (config.prefs['new-tab']) {
        chrome.runtime.sendMessage({
          cmd: 'open',
          url: a.href
        });
      }
      else {
        window.top.location.replace(a.href);
      }
    }
  });

  document.head.appendChild(Object.assign(
    document.querySelector(`link[rel*='icon']`) || document.createElement('link'), {
      type: 'image/x-icon',
      rel: 'shortcut icon',
      href: 'chrome://favicon/' + article.url
    }
  ));
  iframe.contentDocument.getElementById('reader-domain').onclick = () => {
    history.back();
    return false;
  };

  iframe.contentWindow.addEventListener('click', () => {
    settings.dataset.display = false;
  });

  // Ctrl + S
  iframe.contentWindow.addEventListener('keydown', e => {
    if (e.code === 'KeyS' && e.metaKey) {
      e.preventDefault();
      document.querySelector('[data-cmd=save]').click();
      return false;
    }
  });

  iframe.contentDocument.documentElement.appendChild(styles.iframe);
  iframe.addEventListener('load', () => {
    // apply transition after initial changes
    document.body.dataset.loaded = iframe.contentDocument.body.dataset.loaded = true;
    if (isFirefox) {
      const script = iframe.contentDocument.documentElement.appendChild(document.createElement('script'));
      script.src = chrome.runtime.getURL('/data/reader/scroll.js');
    }
  });
  // close on escape
  {
    const callback = e => {
      if (e.key === 'Escape') {
        history.go(isFirefox ? -2 : -1);
      }
    };
    iframe.contentDocument.addEventListener('keyup', callback);
    document.addEventListener('keyup', callback);
  }
  config.load(update.async);
});
