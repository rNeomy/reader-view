/* global config, TTS */
'use strict';

let article;

let tts;

const args = new URLSearchParams(location.search);

const nav = {
  back() {
    chrome.runtime.sendMessage({
      'cmd': 'go-back'
    });
  }
};

const update = {
  async: () => {
    const prefs = config.prefs;
    let lh = 'unset';
    if (prefs['line-height']) {
      lh = prefs['font-size'] * (prefs['line-height'] === 32 ? 1.5 : 1.1) + 'px';
    }
    styles.internals.textContent = `body {
      font-size:  ${prefs['font-size']}px;
      font-family: ${getFont(prefs.font)};
      line-height: ${lh};
      width: ${prefs.width ? prefs.width + 'px' : 'calc(100vw - 50px)'};
    }`;
    document.querySelector('[data-id=no-height] input').checked = Boolean(prefs['line-height']) === false;
    document.querySelector('[data-id=full-width] input').checked = Boolean(prefs.width) === false;
    // as a CSS selector
    document.body.dataset.font = prefs.font;
    if (iframe.contentDocument) {
      iframe.contentDocument.body.dataset.font = prefs.font;
    }
  },
  images: () => {
    const bol = config.prefs['show-images'];
    const span = document.querySelector('[data-cmd="open-image-utils"]');
    if (bol) {
      span.classList.add('icon-picture-true');
      span.classList.remove('icon-picture-false');
    }
    else {
      span.classList.add('icon-picture-false');
      span.classList.remove('icon-picture-true');
    }
    iframe.contentDocument.body.dataset.images = bol;
  }
};

const iframe = document.querySelector('iframe');

const fontUtils = document.querySelector('#font-utils');
fontUtils.addEventListener('blur', () => {
  fontUtils.classList.add('hidden');
  iframe.contentWindow.focus();
});
const imageUtils = document.querySelector('#image-utils');
imageUtils.addEventListener('blur', () => {
  imageUtils.classList.add('hidden');
  iframe.contentWindow.focus();
});

const shortcuts = [];

/* printing */
{
  const span = document.createElement('span');
  span.title = 'Print in the Reader View (Meta + P)';
  span.classList.add('icon-print', 'hidden');
  span.id = 'printing-button';

  span.onclick = () => iframe.contentWindow.print();
  shortcuts.push({
    condition: e => e.code === 'KeyP' && (e.metaKey || e.ctrlKey),
    action: span.onclick
  });
  document.getElementById('toolbar').appendChild(span);
}
/* save as HTML*/
{
  const span = document.createElement('span');
  span.title = 'Save in HTML format (Meta + S)';
  span.classList.add('icon-save', 'hidden');
  span.id = 'save-button';
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
    condition: e => e.code === 'KeyS' && (e.metaKey || e.ctrlKey) && !e.shiftKey,
    action: span.onclick
  });
  document.getElementById('toolbar').appendChild(span);
}
/* fullscreen */
{
  const span = document.createElement('span');
  span.title = 'Switch to the fullscreen reading (F9)';
  span.classList.add('icon-fullscreen', 'hidden');
  span.id = 'fullscreen-button';
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
  span.classList.add('icon-speech', 'hidden');
  span.id = 'speech-button';
  span.onclick = async () => {
    if (document.body.dataset.speech === 'true') {
      document.querySelector('[data-cmd="close-speech"]').click();
    }
    else if (typeof TTS === 'undefined') {
      const add = src => new Promise(resolve => {
        const script = document.createElement('script');
        script.onload = resolve;
        script.src = src;
        document.body.appendChild(script);
      });
      document.body.dataset.speech = true;
      iframe.contentDocument.body.dataset.speech = true;
      await add('libs/text-to-speech/engines/watson.js');
      await add('libs/text-to-speech/tts.js');
      tts = new TTS(iframe.contentDocument);
      tts.feed(...iframe.contentDocument.querySelectorAll('.page p, .page h1, .page h2, .page h3, .page h4, .page li, .page td, .page th'));
      tts.attach(document.getElementById('speech'));
      await tts.ready();
      tts.buttons.play.click();
    }
    else {
      tts.buttons.play.click();
      document.body.dataset.speech = true;
      iframe.contentDocument.body.dataset.speech = true;
    }
  };
  shortcuts.push({
    condition: e => e.code === 'KeyS' && (e.metaKey || e.ctrlKey) && e.shiftKey,
    action: span.onclick
  });
  document.getElementById('toolbar').appendChild(span);
}

/* images */
{
  const span = document.createElement('span');
  span.classList.add('hidden');
  span.id = 'images-button';
  span.title = 'Toggle images (Meta + Shift + I)';
  span.dataset.cmd = 'open-image-utils';
  shortcuts.push({
    condition: e => e.code === 'KeyI' && (e.metaKey || e.ctrlKey) && e.shiftKey,
    action() {
      chrome.storage.local.set({
        'show-images': config.prefs['show-images'] === false
      });
    }
  });
  document.getElementById('toolbar').appendChild(span);
}

const styles = {
  top: document.createElement('style'),
  iframe: document.createElement('style'),
  internals: document.createElement('style')
};

function getFont(font) {
  switch (font) {
  case 'serif':
    return 'Georgia, "Times New Roman", serif';
  case 'sans-serif':
  default:
    return 'Helvetica, Arial, sans-serif';
  }
}

document.addEventListener('click', e => {
  const target = e.target.closest('[data-cmd]');
  if (!target) {
    return;
  }
  const cmd = target.dataset.cmd;
  if (cmd) {
    e.target.classList.add('active');
  }

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
    chrome.storage.local.set({
      mode: cmd.replace('color-mode-', '')
    });
  }
  else if (cmd === 'close') {
    nav.back();
  }
  else if (cmd === 'close-speech') {
    document.body.dataset.speech = false;
    iframe.contentDocument.body.dataset.speech = false;
    tts.buttons.stop.click();
  }
  else if (cmd === 'open-font-utils') {
    fontUtils.classList.remove('hidden');
    fontUtils.focus();
  }
  else if (cmd === 'open-image-utils') {
    imageUtils.classList.remove('hidden');
    imageUtils.focus();
  }
  else if (cmd === 'image-increase' || cmd === 'image-decrease') {
    [...iframe.contentDocument.images].forEach(img => {
      const {width} = img.getBoundingClientRect();
      if (width >= 32) {
        const scale = cmd === 'image-increase' ? 1.1 : 0.9;
        img.width = Math.max(width * scale, 32);
        img.height = 'auto';
      }
    });
  }
  else if (cmd === 'image-show' || cmd === 'image-hide') {
    chrome.storage.local.set({
      'show-images': cmd === 'image-show'
    });
  }
});
/* transition */
document.getElementById('toolbar').addEventListener('transitionend', e => {
  e.target.classList.remove('active');
});

const render = () => chrome.runtime.sendMessage({
  cmd: 'read-data'
}, obj => {
  article = obj;
  if (!article) { // open this page from history for instance
    return location.replace(args.get('url'));
  }
  iframe.contentDocument.open();
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <style>
  html {
    scroll-behavior: smooth;
  }
  body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 30px auto 0 auto;
    padding: 10px;
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
  body[data-speech="false"] .tts-speaking::after {
    display: none;
  }
  </style>
</head>
<body>
  <span></span> <!-- for IntersectionObserver -->
  <a id="reader-domain" href="${article.url}">${(new URL(article.url)).hostname}</a>
  <h1 dir="auto" id="reader-title">${article.title || 'Unknown Title'}</h1>
  <div dir="auto" id="reader-credits">${article.byline || ''}</div>
  <div dir="auto" id="reader-estimated-time">${article.readingTimeMinsFast}-${article.readingTimeMinsSlow} minutes</div>
  <hr/>
  ${article.content}
  <span></span> <!-- for IntersectionObserver -->
</body>
</html>`;
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  iframe.contentDocument.body.dataset.images = config.prefs['show-images'];
  iframe.contentDocument.body.dataset.mode = config.prefs.mode;

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
    nav.back();
    return false;
  };
  // navigation
  {
    const next = document.getElementById('navigate-next');
    const previous = document.getElementById('navigate-previous');
    previous.onclick = next.onclick = e => {
      const {clientHeight} = iframe.contentDocument.documentElement;
      iframe.contentDocument.documentElement.scrollTop += (e.target === next ? 1 : -1) * clientHeight;
    };
    const scroll = () => {
      const {scrollHeight, clientHeight, scrollTop} = iframe.contentDocument.documentElement;
      previous.disabled = scrollTop === 0;
      next.disabled = scrollHeight <= scrollTop + clientHeight;
    };
    iframe.contentWindow.addEventListener('scroll', scroll);
    scroll();
    shortcuts.push({
      condition: e => e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey),
      action: () => next.click()
    }, {
      condition: e => e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey),
      action: () => previous.click()
    });
  }


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
        nav.back();
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
    iframe.contentWindow.focus();
  }
  iframe.contentDocument.body.dataset.font = config.prefs.font;
});

// pref changes
config.onChanged.push(ps => {
  if (ps['top-css']) {
    styles.top.textContent = config.prefs['top-css'];
  }
  if (ps['user-css']) {
    styles.iframe.textContent = config.prefs['user-css'];
  }
  if (ps['font-size'] || ps['font'] || ps['line-height'] || ps['width']) {
    update.async();
  }
  if (ps['show-images']) {
    update.images();
  }
  if (ps['mode']) {
    document.body.dataset.mode = iframe.contentDocument.body.dataset.mode = config.prefs.mode;
  }
});

// load
config.load(() => {
  document.body.dataset.mode = config.prefs.mode;
  if (config.prefs['printing-button']) {
    document.getElementById('printing-button').classList.remove('hidden');
  }
  if (config.prefs['save-button']) {
    document.getElementById('save-button').classList.remove('hidden');
  }
  if (config.prefs['fullscreen-button']) {
    document.getElementById('fullscreen-button').classList.remove('hidden');
  }
  if (config.prefs['speech-button']) {
    document.getElementById('speech-button').classList.remove('hidden');
  }
  if (config.prefs['images-button']) {
    document.getElementById('images-button').classList.remove('hidden');
  }
  update.images();
  update.async();

  styles.top.textContent = config.prefs['top-css'];
  document.documentElement.appendChild(styles.top);
  styles.iframe.textContent = config.prefs['user-css'];

  if (config.prefs['navigate-buttons']) {
    document.getElementById('navigate').classList.remove('hidden');
  }

  render();
});
