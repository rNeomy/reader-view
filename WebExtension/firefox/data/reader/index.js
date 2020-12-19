/**
    Reader View - .Strips away clutter like buttons, background images, and changes the page's text size, contrast and layout for better readability

    Copyright (C) 2014-2020 [@rNeomy](https://add0n.com/chrome-reader-view.html)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the Mozilla Public License as published by
    the Mozilla Foundation, either version 2 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    Mozilla Public License for more details.
    You should have received a copy of the Mozilla Public License
    along with this program.  If not, see {https://www.mozilla.org/en-US/MPL/}.

    GitHub: https://github.com/rNeomy/reader-view/
    Homepage: https://add0n.com/chrome-reader-view.html
*/

/* global config, TTS */
'use strict';

let article;

let tts;
let highlight;

const args = new URLSearchParams(location.search);

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
window.hash = hash;

const nav = {
  back() {
    chrome.runtime.sendMessage({
      'cmd': 'go-back'
    });
  }
};
window.nav = nav;

const template = async () => {
  const r = await await fetch('template.html');
  return await r.text();
};

const update = {
  async: () => {
    const prefs = config.prefs;
    let lh = 'unset';
    if (prefs['line-height']) {
      lh = (prefs['font-size'] * (prefs['line-height'] === 32 ? 1.5 : 1.2)).toFixed(1) + 'px';
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
    //
    document.querySelector('#font-details [data-id="font-size"]').textContent = prefs['font-size'] + 'px';
    document.querySelector('#font-details [data-id="screen-width"]').textContent = prefs['width'] || 'unset';
    document.querySelector('#font-details [data-id="line-height"]').textContent = lh;
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
shortcuts.render = () => {
  for (const {span, id} of shortcuts) {
    if (span) {
      span.title = span.title.replace(
        '(command)',
        '(' + config.prefs.shortcuts[id].map(s => s.replace('Key', '')).join(' + ') + ')'
      );
    }
  }
};

/* printing */
{
  const span = document.createElement('span');
  span.title = 'Print in the Reader View (command)';
  span.classList.add('icon-print', 'hidden');
  span.id = 'printing-button';

  span.onclick = () => iframe.contentWindow.print();
  shortcuts.push({
    id: 'print',
    action: span.onclick,
    span
  });
  document.getElementById('toolbar').appendChild(span);
}
/* email */
{
  const span = document.createElement('span');
  span.title = 'Email Content (command)';
  span.classList.add('icon-mail', 'hidden');
  span.id = 'mail-button';

  span.onclick = () => {
    const a = document.createElement('a');
    a.target = '_blank';
    a.href = 'mailto:' + config.prefs['mail-to'] + '?subject=' + encodeURIComponent(article.title.trim()) + '&body=';
    let body = article.textContent.trim().replace(/\n{4,}/g, '\n\n\n');
    const ending = config.prefs['mail-ending'].replace(/\[(\w+)\]/g, (a, b) => {
      return article[b.toLowerCase()] || a;
    });
    const max = config.prefs['mail-max'] - a.href.length - ending.length;

    if (body.length > max) {
      body = body.substr(0, max - 3) + '...';
    }
    body += ending;
    a.href += encodeURIComponent(body);
    a.click();
  };
  shortcuts.push({
    id: 'email',
    action: span.onclick,
    span
  });
  document.getElementById('toolbar').appendChild(span);
}
/* save as HTML*/
{
  const span = document.createElement('span');
  span.title = 'Save in HTML format (command)';
  span.classList.add('icon-save', 'hidden');
  span.id = 'save-button';
  span.onclick = () => {
    const content = iframe.contentDocument.documentElement.outerHTML
      // remove all script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // remove transition
      .replace(/transition:.*/, '')
      // add title
      .replace('<head>', '<head><title>' + document.title + '</title>');
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
    id: 'save',
    span,
    action: span.onclick
  });
  document.getElementById('toolbar').appendChild(span);
}
/* fullscreen */
{
  const span = document.createElement('span');
  span.title = 'Switch to the fullscreen reading (command)';
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
    id: 'fullscreen',
    span,
    action: span.onclick
  });
  document.getElementById('toolbar').appendChild(span);
}
/* design mode */
{
  const span = document.createElement('span');
  span.classList.add('hidden', 'icon-design');
  span.id = 'design-mode-button';
  span.title = `Toggle design mode (command)

When active, you can edit the document or delete elements like MS word

Ctrl/Command + B: Toggles bold on/off for the selection or at the insertion point.
Ctrl/Command + I: Toggles italics on/off for the selection or at the insertion point.
Ctrl/Command + U: Toggles underline on/off for the selection or at the insertion point.`;
  span.dataset.cmd = 'toggle-design-mode';
  shortcuts.push({
    id: 'design-mode',
    span,
    action() {
      span.click();
    }
  });
  document.getElementById('toolbar').appendChild(span);
}
/* speech */
{
  const span = document.createElement('span');
  span.title = 'Read this Article (command)\nTo start from middle, select starting word, then press this button';
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
        maxlength: config.prefs['tts-maxlength'],
        minlength: config.prefs['tts-minlength'],
        scroll: config.prefs['tts-scroll']
      });
      tts.on('status', s => {
        document.querySelector('#speech [data-id=msg-speech]').textContent = s === 'buffering' ? '...' : '';
      });
      tts.on('error', e => chrome.runtime.sendMessage({
        cmd: 'notify',
        msg: e.message || e
      }));

      window.addEventListener('beforeunload', () => chrome.runtime.sendMessage({
        cmd: 'delete-cache',
        cache: tts.CACHE
      }));
      tts.feed(...iframe.contentDocument.querySelectorAll('.page p, .page h1, .page h2, .page h3, .page h4, .page li, .page td, .page th'));
      await tts.attach(document.getElementById('speech'));
      await tts.ready();
      tts.buttons.play.title =
        `Play/Pause (${config.prefs.shortcuts['speech-play'].map(s => s.replace('Key', '')).join(' + ')})`;
      tts.buttons.next.title =
        `Next (${config.prefs.shortcuts['speech-next'].map(s => s.replace('Key', '')).join(' + ')})`;
      tts.buttons.previous.title +=
        `Previous (${config.prefs.shortcuts['speech-previous'].map(s => s.replace('Key', '')).join(' + ')})`;

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
            for (const c of (e.targets ? e.targets : [e.target || e])) {
              if (
                c === parent || c.target === parent ||
                parent.contains(c.target || c) || (c.target || c).contains(parent)
              ) {
                return true;
              }
            }
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
  chrome.storage.local.get({
    'speech-mode': ''
  }, prefs => {
    document.getElementById('speech').dataset.mode = prefs['speech-mode'];
    document.querySelector('[data-cmd="minimize-speech"]').textContent = prefs['speech-mode'] === '' ? '-' : '□';
  });
  shortcuts.push({
    id: 'speech',
    span,
    action: span.onclick
  }, {
    id: 'speech-previous',
    action: () => tts && tts.buttons.previous.click()
  }, {
    id: 'speech-next',
    action: () => tts && tts.buttons.next.click()
  }, {
    id: 'speech-play',
    action: () => tts && tts.buttons.play.click()
  });
  document.getElementById('toolbar').appendChild(span);
}

/* images */
{
  const span = document.createElement('span');
  span.classList.add('hidden');
  span.id = 'images-button';
  span.title = 'Toggle images (command)';
  span.dataset.cmd = 'open-image-utils';
  shortcuts.push({
    id: 'images',
    span,
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
  span.title = `Toggle highlight (command)`;
  span.dataset.cmd = 'toggle-highlight';
  span.dataset.disabled = true;
  shortcuts.push({
    id: 'highlight',
    span,
    action() {
      span.click();
    }
  });
  document.getElementById('toolbar').appendChild(span);

  // post highlights to bg if this feature is used
  const post = () => chrome.runtime.sendMessage({
    cmd: 'highlights',
    value: highlight.export(),
    href: args.get('url').split('#')[0]
  });
  window.addEventListener('beforeunload', () => {
    if (highlight.used) {
      post();
    }
  });
  chrome.runtime.onMessage.addListener(request => {
    if (request.cmd === 'export-highlights' && highlight.used) {
      post();
    }
    else if (request.cmd === 'append-highlights' && request.href === args.get('url').split('#')[0]) {
      highlight.import(request.highlights);
    }
  });
}

/* user actions */
{
  config.load(() => {
    try {
      config.prefs['user-action'].forEach((action, index) => {
        const span = document.createElement('span');
        span.classList.add('custom');
        span.title = action.title || 'User Action';
        const img = document.createElement('img');
        img.src = action.icon || 'command.svg';
        span.appendChild(img);
        document.getElementById('toolbar').appendChild(span);
        span.onclick = () => {
          const s = document.createElement('script');
          const b = new Blob([action.code]);
          s.src = URL.createObjectURL(b);
          iframe.contentDocument.body.appendChild(s);
          URL.revokeObjectURL(s.src);
          s.remove();
        };
        if (action.shortcut) {
          const id = 'ua-' + index;
          shortcuts.push({
            id,
            span,
            action: span.onclick
          });
          config.prefs.shortcuts[id] = action.shortcut.split(/\s+\+\s+/);
        }
      });
    }
    catch (e) {
      console.warn('User Action Installation Failed', e);
    }
  });
}

const styles = {
  top: document.createElement('style'),
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
  else if (cmd === 'minimize-speech') {
    const e = document.getElementById('speech');
    const mode = e.dataset.mode;
    if (mode === 'collapsed') {
      e.dataset.mode = '';
      target.textContent = '-';
    }
    else {
      e.dataset.mode = 'collapsed';
      target.textContent = '□';
    }
    chrome.storage.local.set({
      'speech-mode': e.dataset.mode
    });
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
    highlight.used = true;
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
}, async obj => {
  article = obj;
  document.title = article.title.replace(' :: Reader View', '') + ' :: Reader View';
  if (!article) { // open this page from history for instance
    return location.replace(args.get('url'));
  }
  iframe.contentDocument.open();
  const {pathname, hostname} = (new URL(article.url));
  const gcs = window.getComputedStyle(document.documentElement);
  iframe.contentDocument.write((await template())
    .replace('%dir%', article.dir ? ' dir=' + article.dir : '')
    .replace('%light-color%', gcs.getPropertyValue('--color-mode-light-color'))
    .replace('%light-bg%', gcs.getPropertyValue('--color-mode-light-bg'))
    .replace('%dark-color%', gcs.getPropertyValue('--color-mode-dark-color'))
    .replace('%dark-bg%', gcs.getPropertyValue('--color-mode-dark-bg'))
    .replace('%sepia-color%', gcs.getPropertyValue('--color-mode-sepia-color'))
    .replace('%sepia-bg%', gcs.getPropertyValue('--color-mode-sepia-bg'))
    .replace('%solarized-light-color%', gcs.getPropertyValue('--color-mode-solarized-light-color'))
    .replace('%solarized-light-bg%', gcs.getPropertyValue('--color-mode-solarized-light-bg'))
    .replace('%nord-light-color%', gcs.getPropertyValue('--color-mode-nord-light-color'))
    .replace('%nord-light-bg%', gcs.getPropertyValue('--color-mode-nord-light-bg'))
    .replace('%groove-dark-color%', gcs.getPropertyValue('--color-mode-groove-dark-color'))
    .replace('%groove-dark-bg%', gcs.getPropertyValue('--color-mode-groove-dark-bg'))
    .replace('%solarized-dark-color%', gcs.getPropertyValue('--color-mode-solarized-dark-color'))
    .replace('%solarized-dark-bg%', gcs.getPropertyValue('--color-mode-solarized-dark-bg'))
    .replace('%nord-dark-color%', gcs.getPropertyValue('--color-mode-nord-dark-color'))
    .replace('%nord-dark-bg%', gcs.getPropertyValue('--color-mode-nord-dark-bg'))
    .replace('%content%', article.content)
    .replace('%title%', article.title || 'Unknown Title')
    .replace('%byline%', article.byline || '')
    .replace('%reading-time-fast%', article.readingTimeMinsFast)
    .replace('%reading-time-slow%', article.readingTimeMinsSlow)
    .replace('%href%', article.url)
    .replace('%hostname%', hostname)
    .replace('%pathname%', pathname)
    .replace('/*user-css*/', config.prefs['user-css'])
    .replace('%data-images%', config.prefs['show-images'])
    .replace('%data-font%', config.prefs.font)
    .replace('%data-mode%', config.prefs.mode));
  iframe.contentDocument.close();

  // fix relative links;
  const es = [...iframe.contentDocument.querySelectorAll('[src^="//"]')];
  for (const e of es) {
    e.src = article.url.split(':')[0] + ':' + e.getAttribute('src');
  }

  document.head.appendChild(Object.assign(
    document.querySelector(`link[rel*='icon']`) || document.createElement('link'), {
      type: 'image/x-icon',
      rel: 'shortcut icon',
      href: 'chrome://favicon/' + article.url
    }
  ));
  // navigation
  {
    const next = document.getElementById('navigate-next');
    const previous = document.getElementById('navigate-previous');
    previous.onclick = next.onclick = e => {
      const {clientHeight} = iframe.contentDocument.documentElement;
      const lineHeight = parseInt(window.getComputedStyle(document.body).fontSize) * config.prefs.guide;
      const guide = document.getElementById('guide');
      guide.style.height = lineHeight + 'px';
      if (e.target === next) {
        iframe.contentDocument.documentElement.scrollTop += clientHeight - lineHeight;
        guide.style.top = 0;
        guide.style.bottom = 'unset';
      }
      else {
        iframe.contentDocument.documentElement.scrollTop -= clientHeight - lineHeight;
        guide.style.top = 'unset';
        guide.style.bottom = 0;
      }
      if (config.prefs.guide) {
        guide.classList.remove('hidden');
      }
      window.clearTimeout(guide.timeout);
      guide.timeout = window.setTimeout(() => guide.classList.add('hidden'), config.prefs['guide-timeout']);
    };
    const scroll = () => {
      const {scrollHeight, clientHeight, scrollTop} = iframe.contentDocument.documentElement;
      previous.disabled = scrollTop === 0;
      next.disabled = scrollHeight <= scrollTop + clientHeight;
    };
    iframe.contentWindow.addEventListener('scroll', scroll);
    scroll();
    shortcuts.push({
      id: 'next-page',
      span: next,
      action: () => next.click()
    }, {
      id: 'previous-page',
      span: previous,
      action: () => previous.click()
    });
    shortcuts.render();

    // scrollbar
    if (navigator.platform !== 'MacIntel') {
      const html = iframe.contentDocument.documentElement;
      const check = () => {
        const bol = html.scrollHeight > html.clientHeight;
        document.body.dataset.scroll = bol;
      };
      const resizeObserver = new ResizeObserver(check);
      resizeObserver.observe(html);
    }
  }

  iframe.contentDocument.documentElement.appendChild(styles.internals);
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
        const s = config.prefs.shortcuts[o.id];
        if (s.indexOf(e.code) === -1) {
          return;
        }
        if (s.indexOf('Ctrl/Command') !== -1 && (e.ctrlKey || e.metaKey) === false) {
          return;
        }
        if (s.indexOf('Ctrl/Command') === -1 && (e.ctrlKey || e.metaKey)) {
          return;
        }
        if (s.indexOf('Shift') !== -1 && e.shiftKey === false) {
          return;
        }
        if (s.indexOf('Shift') === -1 && e.shiftKey) {
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        o.action();
        return false;
      });
    };
    // editor commands issue in FF
    iframe.contentWindow.addEventListener('keydown', e => {
      if (iframe.contentDocument.designMode === 'on') {
        const meta = e.metaKey || e.ctrlKey;
        if (meta && e.code === 'KeyB') {
          iframe.contentDocument.execCommand('bold');
          e.preventDefault();
        }
        else if (meta && e.code === 'KeyI') {
          iframe.contentDocument.execCommand('italic');
          e.preventDefault();
        }
        else if (meta && e.code === 'KeyU') {
          iframe.contentDocument.execCommand('underline');
          e.preventDefault();
        }
      }
    });
    iframe.contentWindow.addEventListener('keydown', callback);
    window.addEventListener('keydown', callback);
    iframe.contentWindow.focus();
  }
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
  if (ps['font-size'] || ps['font'] || ps['line-height'] || ps['width']) {
    update.async();
  }
  if (ps['show-images']) {
    update.images();
  }
  if (ps['mode']) {
    document.body.dataset.mode = config.prefs.mode;
  }
});

// load
config.load(() => {
  document.body.dataset.mode = config.prefs.mode;
  if (config.prefs['printing-button']) {
    document.getElementById('printing-button').classList.remove('hidden');
  }
  if (config.prefs['mail-button']) {
    document.getElementById('mail-button').classList.remove('hidden');
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

  if (config.prefs['navigate-buttons']) {
    document.getElementById('navigate').classList.remove('hidden');
  }

  render();
});
