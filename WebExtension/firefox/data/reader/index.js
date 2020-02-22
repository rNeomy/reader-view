/* global config, TTS */
'use strict';

let article;

let tts;
let highlight;

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
      lh = prefs['font-size'] * (prefs['line-height'] === 32 ? 1.5 : 1.2) + 'px';
    }
    styles.internals.textContent = `body {
      font-size:  ${prefs['font-size']}px;
      font-family: ${getFont(prefs.font)};
      width: ${prefs.width ? prefs.width + 'px' : 'calc(100vw - 50px)'};
    }
    .page {
      line-height: ${lh};
    }
    h1, h2, h3 {
      line-height: initial;
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
/* design mode */
{
  const span = document.createElement('span');
  span.classList.add('hidden', 'icon-design');
  span.id = 'design-mode-button';
  span.title = `Toggle design mode (Meta + Shift + D)

When active, you can edit the document or delete elements like MS word`;
  span.dataset.cmd = 'toggle-design-mode';
  shortcuts.push({
    condition: e => e.code === 'KeyD' && (e.metaKey || e.ctrlKey) && e.shiftKey,
    action() {
      span.click();
    }
  });
  document.getElementById('toolbar').appendChild(span);
}
/* speech */
{
  const span = document.createElement('span');
  span.title = 'Read this Article (Beta)\nTo start from middle, select starting word, then press this button\n(Meta + Shift + S)';
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
      await add('libs/text-to-speech/vendors/sentence-boundary-detection/sbd.js');
      tts = new TTS(iframe.contentDocument, {
        separator: config.prefs['tts-separator'],
        delay: config.prefs['tts-delay'],
        maxlength: config.prefs['tts-maxlength']
      });
      tts.feed(...iframe.contentDocument.querySelectorAll('.page p, .page h1, .page h2, .page h3, .page h4, .page li, .page td, .page th'));
      await tts.attach(document.getElementById('speech'));
      await tts.ready();
      tts.buttons.play.title = 'Play/Pause (Meta + Shift + X)'; // eslint-disable-line require-atomic-updates
      tts.buttons.next.title = 'Next (Meta + Shift + C)'; // eslint-disable-line require-atomic-updates
      tts.buttons.previous.title += 'Previous (Meta + Shift + Z)'; // eslint-disable-line require-atomic-updates
      // auto play
      tts.buttons.play.click();
      // start from user selection
      tts.jump = () => {
        const selection = iframe.contentWindow.getSelection();
        if (selection && selection.rangeCount && selection.toString().trim().length) {
          let range;
          if (selection.getRangeAt) {
            range = selection.getRangeAt(0);
          }
          else {
            range = document.createRange();
            range.setStart(selection.anchorNode, selection.anchorOffset);
            range.setEnd(selection.focusNode, selection.focusOffset);
          }
          let parent = range.commonAncestorContainer;
          if (parent.nodeType !== parent.ELEMENT_NODE) {
            parent = parent.parentElement;
          }
          const bounded = tts.sections.filter(e => {
            return e === parent || e.target === parent || parent.contains(e.target || e);
          });
          if (bounded.length) {
            const offset = tts.sections.indexOf(bounded[0]);
            tts.navigate(undefined, offset);
          }
        }
      };
      tts.jump();
    }
    else {
      tts.buttons.play.click();
      tts.jump();
      document.body.dataset.speech = true;
      iframe.contentDocument.body.dataset.speech = true;
    }
  };
  shortcuts.push({
    condition: e => e.code === 'KeyS' && (e.metaKey || e.ctrlKey) && e.shiftKey,
    action: span.onclick
  }, {
    condition: e => e.code === 'KeyZ' && (e.metaKey || e.ctrlKey) && e.shiftKey,
    action: () => tts && tts.buttons.previous.click()
  }, {
    condition: e => e.code === 'KeyC' && (e.metaKey || e.ctrlKey) && e.shiftKey,
    action: () => tts && tts.buttons.next.click()
  }, {
    condition: e => e.code === 'KeyX' && (e.metaKey || e.ctrlKey) && e.shiftKey,
    action: () => tts && tts.buttons.play.click()
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

/* highlight */
{
  const span = document.createElement('span');
  span.classList.add('hidden', 'icon-highlight');
  span.id = 'highlight-button';
  span.title = `Toggle highlight (Meta + Shift + H)`;
  span.dataset.cmd = 'toggle-highlight';
  span.dataset.disabled = true;
  shortcuts.push({
    condition: e => e.code === 'KeyH' && (e.metaKey || e.ctrlKey) && e.shiftKey,
    action() {
      span.click();
    }
  });
  document.getElementById('toolbar').appendChild(span);

  // post highlights to bg
  const post = () => chrome.runtime.sendMessage({
    cmd: 'highlights',
    value: highlight.export(),
    href: args.get('url')
  });
  window.addEventListener('beforeunload', post);
  chrome.runtime.onMessage.addListener(request => {
    if (request.cmd === 'export-highlights') {
      post();
    }
  });
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
  else if (cmd === 'toggle-highlight') {
    highlight.toggle();
  }
  else if (cmd === 'toggle-design-mode') {
    const active = iframe.contentDocument.designMode === 'on';
    e.target.dataset.active = active === false;
    iframe.contentDocument.designMode = active ? 'off' : 'on';
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
  const {pathname, hostname} = (new URL(article.url));
  const gcs = window.getComputedStyle(document.documentElement);
  const html = `
<!DOCTYPE html>
<html${article.dir ? ' dir=' + article.dir : ''}>
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
    color: ${gcs.getPropertyValue('--color-mode-light-color')};
    background-color: ${gcs.getPropertyValue('--color-mode-light-bg')};
  }
  body[data-mode="dark"] {
    color: ${gcs.getPropertyValue('--color-mode-dark-color')};
    background-color: ${gcs.getPropertyValue('--color-mode-dark-bg')};
  }
  body[data-mode="sepia"] {
    color: ${gcs.getPropertyValue('--color-mode-sepia-color')};
    background-color: ${gcs.getPropertyValue('--color-mode-sepia-bg')};
  }
  body[data-mode="solarized-light"] {
    color: ${gcs.getPropertyValue('--color-mode-solarized-light-color')};
    background-color: ${gcs.getPropertyValue('--color-mode-solarized-light-bg')};
  }
  body[data-mode="groove-dark"] {
    color: ${gcs.getPropertyValue('--color-mode-groove-dark-color')};
    background-color: ${gcs.getPropertyValue('--color-mode-groove-dark-bg')};
  }
  body[data-mode="solarized-dark"] {
    color: ${gcs.getPropertyValue('--color-mode-solarized-dark-color')};
    background-color: ${gcs.getPropertyValue('--color-mode-solarized-dark-bg')};
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
  a {
    color: #0095dd;
    text-decoration: none;
  }
  #reader-domain {
    font-family: Helvetica, Arial, sans-serif;
    text-decoration: none;
    border-bottom-color: currentcolor;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    display: inline-block;
    direction: ltr;
  }
  #reader-domain>span:first-child {
    font-size: 1.1em;
  }
  #reader-domain>span:last-child {
    font-size: 0.8em;
    white-spance: no
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
  mark.hghlght {
    background-color: #ffff81;
  }
  </style>
</head>
<body>
  <span></span> <!-- for IntersectionObserver -->
  <a id="reader-domain" href="${article.url}">
    <span>${hostname}</span>
    <span>${pathname}</span>
  </a>
  <h1 dir="auto" id="reader-title">${article.title || 'Unknown Title'}</h1>
  <div dir="auto" id="reader-credits">${article.byline || ''}</div>
  <div dir="auto" id="reader-estimated-time">${article.readingTimeMinsFast}-${article.readingTimeMinsSlow} minutes</div>
  <hr/>
  ${article.content}
  <span></span> <!-- for IntersectionObserver -->
  <script async src="libs/highlight/highlight.js"></script>
</body>
</html>`;
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  iframe.contentDocument.body.dataset.images = config.prefs['show-images'];
  iframe.contentDocument.body.dataset.mode = config.prefs.mode;

  document.title = article.title + ' :: Reader View';
  // hash
  const hash = link => {
    const hash = link.hash.substr(1);
    const a = iframe.contentDocument.querySelector(`[name="${hash}"],#${hash}`);
    if (a) {
      a.scrollIntoView({
        block: 'start',
        inline: 'nearest'
      });
      a.focus();
    }
    else {
      console.warn('hash', link.hash, 'is unreachable');
    }
  };
  // link handling
  iframe.contentDocument.addEventListener('click', e => {
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
              hash(link);
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
      condition: e => e.shiftKey && e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey),
      action: () => next.click()
    }, {
      condition: e => e.shiftKey && e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey),
      action: () => previous.click()
    });
  }

  iframe.contentDocument.documentElement.appendChild(styles.internals);
  iframe.contentDocument.documentElement.appendChild(styles.iframe);
  iframe.addEventListener('load', () => {
    // apply transition after initial changes
    document.body.dataset.loaded = iframe.contentDocument.body.dataset.loaded = true;

    highlight = new iframe.contentWindow.Highlight();
    if (article.highlights) {
      highlight.import(article.highlights);
    }
  });
  // highlight
  iframe.contentDocument.addEventListener('selectionchange', () => {
    const s = iframe.contentDocument.getSelection();
    const active = s.toString().trim() !== '';
    document.getElementById('highlight-button').dataset.disabled = active === false;
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
    iframe.contentWindow.addEventListener('keydown', callback);
    window.addEventListener('keydown', callback);
    iframe.contentWindow.focus();
  }
  iframe.contentDocument.body.dataset.font = config.prefs.font;
  // move to hash
  if (args.get('url').indexOf('#') !== -1) {
    const link = new URL(args.get('url'));
    hash(link);
  }
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
  if (config.prefs['highlight-button']) {
    document.getElementById('highlight-button').classList.remove('hidden');
  }
  if (config.prefs['design-mode-button']) {
    document.getElementById('design-mode-button').classList.remove('hidden');
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
