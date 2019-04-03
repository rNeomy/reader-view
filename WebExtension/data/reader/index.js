/* global config, TTS */
'use strict';

var article;
var isFirefox = /Firefox/.test(navigator.userAgent);

var tts;

var iframe = document.querySelector('iframe');
document.body.dataset.mode = localStorage.getItem('mode');
var settings = document.querySelector('#toolbar>div');

const shortcuts = [];

/* printing */
{
  const span = document.createElement('span');
  span.title = 'Print in the Reader View (Meta + P)';
  span.classList.add('icon-print');
  if (localStorage.getItem('printing-button') === 'false') {
    span.style.display = 'none';
  }
  span.onclick = () => iframe.contentWindow.print();
  shortcuts.push({
    condition: e => e.code === 'KeyP' && e.metaKey,
    action: span.onclick
  });
  document.getElementById('toolbar').appendChild(span);
}
/* save as HTML*/
{
  const span = document.createElement('span');
  span.title = 'Save in HTML format (Meta + S)';
  span.classList.add('icon-save');
  if (localStorage.getItem('save-button') === 'false') {
    span.style.display = 'none';
  }
  span.onclick = () => {
    const content = iframe.contentDocument.documentElement.outerHTML;
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
  };
  shortcuts.push({
    condition: e => e.code === 'KeyS' && e.metaKey && !e.shiftKey,
    action: span.onclick
  });
  document.getElementById('toolbar').appendChild(span);
}
/* fullscreen */
{
  const span = document.createElement('span');
  span.title = 'Switch to the fullscreen reading (F9)';
  span.classList.add('icon-fullscreen');
  if (localStorage.getItem('fullscreen-button') === 'false') {
    span.style.display = 'none';
  }
  span.onclick = () => {
    if (iframe.requestFullscreen) {
      iframe.requestFullscreen();
    }
    else if (iframe.mozRequestFullScreen) {
      iframe.mozRequestFullScreen();
    }
    else if (iframe.webkitRequestFullScreen) {
      iframe.webkitRequestFullScreen();
    }
    else if (iframe.msRequestFullscreen) {
      iframe.msRequestFullscreen();
    }
  };
  shortcuts.push({
    condition: e => e.code === 'F9',
    action: span.onclick
  });
  document.getElementById('toolbar').appendChild(span);
}
/* speech */
{
  const span = document.createElement('span');
  span.title = 'Read this Article (Beta) (Meta + Shift + S)';
  span.classList.add('icon-speech');
  if (localStorage.getItem('speech-button') === 'false') {
    span.style.display = 'none';
  }
  span.onclick = () => {
    if (document.body.dataset.speech === 'true') {
      document.querySelector('[data-cmd="close-speech"]').click();
    }
    else if (typeof TTS === 'undefined') {
      const script = document.createElement('script');
      script.onload = () => {
        tts = new TTS(iframe.contentDocument);
        tts.feed(...iframe.contentDocument.querySelectorAll('.page p, .page h1, .page h2, .page h3, .page h4'));
        tts.attach(document.getElementById('speech'));
        tts.ready().then(() => tts.buttons.play.click());
      };
      script.src = 'libs/text-to-speech/tts.js';
      document.body.appendChild(script);
      document.body.dataset.speech = true;
    }
    else {
      tts.buttons.play.click();
      document.body.dataset.speech = true;
    }
  };
  shortcuts.push({
    condition: e => e.code === 'KeyS' && e.metaKey && e.shiftKey,
    action: span.onclick
  });
  document.getElementById('toolbar').appendChild(span);
}

/* images */
{
  const span = document.createElement('span');
  span.title = 'Toggle images (Meta + Shift + I)';
  span.classList.add('icon-picture-' + (localStorage.getItem('show-images') === 'false' ? 'false' : 'true'));
  if (localStorage.getItem('images-button') === 'false') {
    span.style.display = 'none';
  }
  span.onclick = () => {
    const bol = localStorage.getItem('show-images') === 'false';
    localStorage.setItem('show-images', bol ? true : false);
    if (bol) {
      span.classList.add('icon-picture-true');
      span.classList.remove('icon-picture-false');
    }
    else {
      span.classList.add('icon-picture-false');
      span.classList.remove('icon-picture-true');
    }
    iframe.contentDocument.body.dataset.images = bol;
  };
  shortcuts.push({
    condition: e => e.code === 'KeyI' && e.metaKey && e.shiftKey,
    action: span.onclick
  });
  document.getElementById('toolbar').appendChild(span);
}

var styles = {
  top: document.createElement('style'),
  iframe: document.createElement('style'),
  internals: document.createElement('style')
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
    document.body.dataset.mode = iframe.contentDocument.body.dataset.mode = mode;
  },
  async: () => {
    styles.internals.textContent = `
      body {
        font-size:  ${config.prefs['font-size']}px;
        font-family: ${getFont(config.prefs['font'])};
        line-height: ${config.prefs['line-height'] ? config.prefs['line-height'] + 'px' : 'unset'};
        width: ${config.prefs.width ? config.prefs.width + 'px' : 'calc(100vw - 50px)'};
        font: ${config.prefs.font};
      }
    `;
    document.querySelector('[data-id=no-height] input').checked = Boolean(config.prefs['line-height']) === false;
    document.querySelector('[data-id=full-width] input').checked = Boolean(config.prefs.width) === false;

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
    if (width) {
      chrome.storage.local.set({
        width: cmd === 'width-decrease' ? Math.max(300, width - 50) : Math.min(1000, width + 50)
      });
    }
    else {
      chrome.storage.local.set({
        width: 600
      });
    }
  }
  else if (cmd === 'full-width') {
    chrome.storage.local.set({
      width: e.target.parentElement.querySelector('input').checked ? 600 : 0
    });
  }
  else if (cmd === 'line-height-type-1' || cmd === 'line-height-type-2') {
    chrome.storage.local.set({
      'line-height': cmd === 'line-height-type-1' ? 28.8 : 32
    });
  }
  else if (cmd === 'no-height') {
    chrome.storage.local.set({
      'line-height': e.target.parentElement.querySelector('input').checked ? 28.8 : 0
    });
  }
  else if (cmd.startsWith('color-mode-')) {
    localStorage.setItem('mode', cmd.replace('color-mode-', ''));
    update.sync();
  }
  else if (cmd === 'close') {
    // do this until the script is unloaded
    window.setTimeout(() => {
      e.target.dispatchEvent(new Event('click', {
        bubbles: true
      }));
    }, 200);
    history.go(-1);
  }
  else if (cmd === 'close-speech') {
    document.body.dataset.speech = false;
    tts.stop();
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
    color: #222222;
    background-color: whitesmoke;
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
  body[data-images=false] img {
    display: none;
  }
  img {
    max-width: 100%;
    height: auto;
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
  .tts-speaking {
    position: relative;
  }
  .tts-speaking::after {
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
  iframe.contentDocument.body.dataset.images = localStorage.getItem('show-images');
  update.sync();

  // automatically detect ltr and rtl
  [...iframe.contentDocument.querySelectorAll('article>*')]
    .forEach(e => e.setAttribute('dir', 'auto'));

  document.title = article.title + ' :: Reader View';
  // link handling
  iframe.contentDocument.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a && a.href && a.href.startsWith('http') && e.button === 0) {
      e.preventDefault();
      chrome.runtime.sendMessage({
        cmd: 'open',
        url: a.href,
        reader: config.prefs['reader-mode'],
        current: config.prefs['new-tab'] === false
      });
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

  iframe.contentDocument.documentElement.appendChild(styles.internals);
  iframe.contentDocument.documentElement.appendChild(styles.iframe);
  iframe.addEventListener('load', () => {
    // apply transition after initial changes
    document.body.dataset.loaded = iframe.contentDocument.body.dataset.loaded = true;
  });
  // close on escape
  {
    const callback = e => {
      if (e.key === 'Escape' && !(
        document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement)
      ) {
        history.go(isFirefox ? -2 : -1);
      }
      shortcuts.forEach(o => {
        if (o.condition(e)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          o.action();
          return false;
        }
      });
    };
    iframe.contentDocument.addEventListener('keydown', callback);
    document.addEventListener('keydown', callback);
  }
  config.load(update.async);
});
