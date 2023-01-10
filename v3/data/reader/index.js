/**
    Reader View - Strips away clutter

    Copyright (C) 2014-2022 [@rNeomy](https://add0n.com/chrome-reader-view.html)

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

/* global config, TTS, tips */
'use strict';

let article;

let tts;
let highlight;

const args = new URLSearchParams(location.search);

// add script
const add = (src, o) => new Promise((resolve, reject) => {
  if (o && typeof o !== 'undefined') {
    return resolve();
  }

  const s = document.createElement('script');
  s.src = src;
  s.onload = () => resolve();
  s.onerror = e => reject(e);
  document.body.appendChild(s);
});

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

// exit by passing ESC, exit after link is opened in the Reader view, exit after auto reader view
const nav = {
  back(forced = false) {
    const now = Date.now();
    if (forced === false && (!nav.timeout || (now - nav.timeout > 2000))) {
      nav.timeout = now;
      return window.notify('Press ESC again to exit', undefined, 2000);
    }

    chrome.runtime.sendMessage({
      cmd: 'closed'
    });
    history.back(-2);
  }
};
window.nav = nav;

// favicon
const favicon = article => {
  const next = (href = '/data/icons/32.png') => {
    const link = Object.assign(document.querySelector(`link[rel*='icon']`) || document.createElement('link'), {
      rel: 'shortcut icon',
      href
    });
    document.head.appendChild(link);
  };

  if (config.prefs['show-icon'] === false) {
    next();
  }
  else if (article.icon && article.icon.startsWith('data:')) {
    next(article.icon);
  }
  else if (chrome.runtime.getManifest()['manifest_version'] === 3) {
    chrome.permissions.contains({
      permissions: ['favicon']
    }, granted => {
      if (granted) {
        next(chrome.runtime.getURL('/_favicon/?pageUrl=') + encodeURIComponent(article.url) + '&size=32');
      }
      else {
        next();
      }
    });
  }
  else {
    next();
  }
};

const template = async () => {
  const r = await await fetch('template.html');
  return await r.text();
};

const download = (href, type, convert = false) => {
  if (convert) {
    const blob = new Blob([href], {
      type: 'text/html'
    });
    href = URL.createObjectURL(blob);
    setTimeout(() => URL.revokeObjectURL(href), 10);
  }

  const extension = ({
    'markdown': 'md'
  })[type.split('/')[1]] || type.split('/')[1];

  // const extension = type.split('/')[1];

  const link = Object.assign(document.createElement('a'), {
    href,
    type,
    download: article.title.replace( /[<>:"/\\|?*]+/g, '' ) + '.' + extension
  });
  link.dispatchEvent(new MouseEvent('click'));
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
    p {
      text-align: ${prefs['text-align'] ? 'justify' : 'initial'}
    }
    .page {
      line-height: ${lh};
      column-count: ${prefs['column-count'] === 1 ? 'unset' : prefs['column-count']};
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
    document.querySelector('#font-utils [data-id="column-count"] [data-id="display"]').textContent = prefs['column-count'];
    document.querySelector('#font-utils [data-id="fixation-point"] [data-id="display"]').textContent = prefs['fixation-point'];
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
  setTimeout(() => {
    fontUtils.classList.add('hidden');
    iframe.contentWindow.focus();
  }, 100);
});
const imageUtils = document.querySelector('#image-utils');
imageUtils.addEventListener('blur', () => {
  imageUtils.classList.add('hidden');
  iframe.contentWindow.focus();
});

const shortcuts = [];
shortcuts.render = () => {
  for (const {span, id} of shortcuts) {
    if (span && config.prefs.shortcuts[id]) {
      span.title = span.title.replace(
        '(command)',
        '(' + config.prefs.shortcuts[id].map(s => s.replace('Key', '')).join(' + ') + ')'
      );
    }
  }
};

/* Toolbar Visibility*/
{
  shortcuts.push({
    id: 'toggle-toolbar',
    span: document.getElementById('toolbar'),
    action: () => chrome.storage.local.set({
      'toggle-toolbar': config.prefs['toggle-toolbar'] === false
    })
  });
}

/* printing */
{
  const span = document.createElement('span');
  span.title = chrome.i18n.getMessage('rd_printing');
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

/* screenshot */
{
  const span = document.createElement('span');
  span.title = chrome.i18n.getMessage('rd_screenshot');
  span.classList.add('icon-screenshot', 'hidden');
  span.id = 'screenshot-button';

  span.onclick = () => {
    console.log(1);
    chrome.permissions.request({
      origins: ['<all_urls>']
    }, granted => {
      console.log(granted);
      if (granted) {
        const e = document.getElementById('navigate');
        e.style.visibility = 'hidden';

        chrome.tabs.captureVisibleTab(href => {
          const lastError = chrome.runtime.lastError;

          if (lastError) {
            window.notify(lastError);
          }
          else {
            const {width} = document.getElementById('toolbar').getBoundingClientRect();

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const image = new Image();

            image.onload = () => {
              canvas.width = image.naturalWidth - width * devicePixelRatio;
              canvas.height = image.naturalHeight;
              ctx.drawImage(image, width * 2, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
              download(canvas.toDataURL('image/png'), 'image/png');

              e.style.visibility = 'visible';
            };
            image.src = href;
          }
        });
      }
      else {
        window.notify('Cannot take the screenshot');
      }
    });
  };
  shortcuts.push({
    id: 'screenshot',
    action: span.onclick,
    span
  });
  document.getElementById('toolbar').appendChild(span);
}
/* email */
{
  const span = document.createElement('span');
  span.title = chrome.i18n.getMessage('rd_email');
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
/* save as HTML or MarkDown */
{
  const span = document.createElement('span');
  span.title = chrome.i18n.getMessage('rd_save');
  span.classList.add('icon-save', 'hidden');
  span.id = 'save-button';
  span.onclick = e => {
    const dom = iframe.contentDocument.documentElement.cloneNode(true);

    // remove script tags
    for (const s of [...dom.querySelectorAll('script')]) {
      s.remove();
    }
    // remove style tags
    for (const s of [...dom.querySelectorAll('style')]) {
      s.remove();
    }

    if (e.shiftKey) {
      add('libs/turndown/turndown.js', self.TurndownService).then(() => {
        const turndownService = new self.TurndownService();
        const markdown = turndownService.turndown(dom.querySelector('body'));

        download(markdown, 'text/markdown', true);
      });
    }
    else {
      // add title
      const t = document.createElement('title');
      t.textContent = document.title;
      dom.querySelector('head').appendChild(t);
      // convert notes
      for (const note of [...dom.querySelectorAll('.note')]) {
        if (note.value && e.altKey === false) {
          note.textContent = note.value;
          note.disabled = true;
        }
        else {
          note.remove();
        }
      }

      const content = '<!DOCTYPE html>\n' + dom.outerHTML
        // remove transition
        .replace(/transition:.*/, '');
      download(content, 'text/html', true);
    }
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
  span.title = chrome.i18n.getMessage('rd_fullscreen');
  span.classList.add('icon-fullscreen', 'hidden');
  span.id = 'fullscreen-button';
  span.onclick = () => {
    // what if we are on the automatic fullscreen
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      chrome.runtime.sendMessage({
        cmd: 'exit-fullscreen'
      });
    }
    else {
      iframe.requestFullscreen().catch(e => window.notify(e));
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
  span.title = chrome.i18n.getMessage('rd_design');
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
  span.title = chrome.i18n.getMessage('rd_speech');
  span.classList.add('icon-speech', 'hidden');
  span.id = 'speech-button';
  span.onclick = async () => {
    if (document.body.dataset.speech === 'true') {
      document.querySelector('[data-cmd="close-speech"]').click();
    }
    else if (typeof TTS === 'undefined') {
      document.body.dataset.speech = true;
      iframe.contentDocument.body.dataset.speech = true;

      await add('libs/text-to-speech/engines/watson.js');
      await add('libs/text-to-speech/engines/translate.js');
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
        document.querySelector('#speech [data-id=msg-speech]').textContent = s === 'buffering' ? 'Please Wait...' : '';
      });
      tts.on('error', e => chrome.runtime.sendMessage({
        cmd: 'notify',
        msg: e.message || e
      }));

      window.addEventListener('beforeunload', () => chrome.runtime.sendMessage({
        cmd: 'delete-cache',
        cache: tts.CACHE
      }));
      const nodes = [...iframe.contentDocument.querySelectorAll(`.page p,
        .page section,
        .page h1,
        .page h2,
        .page h3,
        .page h4,
        .page li,
        .page td,
        .page th`)];
      if (nodes.length === 0) {
        const article = iframe.contentDocument.querySelector('article');
        if (article) {
          nodes.push(article);
        }
      }
      if (nodes.length === 0) {
        return alert('Cannot find any pages!');
      }
      tts.feed(...nodes.filter(a => a));
      await tts.attach(document.getElementById('speech'));
      await tts.ready();
      tts.buttons.play.title =
        `Play/Pause (${config.prefs.shortcuts['speech-play'].map(s => s.replace('Key', '')).join(' + ')})`;
      tts.buttons.next.title =
        `Next (${config.prefs.shortcuts['speech-next'].map(s => s.replace('Key', '')).join(' + ')})`;
      tts.buttons.previous.title +=
        `Previous (${config.prefs.shortcuts['speech-previous'].map(s => s.replace('Key', '')).join(' + ')})`;

      // start from user selection or from the start point
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
              if (c === parent || c.target === parent) {
                return true;
              }
              if ((c.target || c).nodeType === Node.ELEMENT_NODE) {
                if (parent.contains(c.target || c) || (c.target || c)?.contains(parent)) {
                  return true;
                }
              }
            }
          });
          if (bounded.length) {
            const offset = tts.sections.indexOf(bounded[0]);
            tts.navigate(undefined, offset);
            return true;
          }
        }
      };
      if (tts.jump() !== true) {
        // auto play
        tts.buttons.play.click();
      }
    }
    else {
      if (tts.jump() !== true) {
        // auto play
        tts.buttons.play.click();
      }
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
  span.title = chrome.i18n.getMessage('rd_images');
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

/* note */
{
  const span = document.createElement('span');
  span.title = chrome.i18n.getMessage('rd_note');
  span.classList.add('icon-note', 'hidden');
  span.id = 'note-button';

  span.onclick = () => {
    document.dispatchEvent(new Event('add-note'));
  };
  shortcuts.push({
    id: 'note',
    action: span.onclick,
    span
  });
  document.getElementById('toolbar').appendChild(span);
}

/* highlight */
{
  const span = document.createElement('span');
  span.classList.add('hidden', 'icon-highlight');
  span.id = 'highlight-button';
  span.title = chrome.i18n.getMessage('rd_highlight');
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
    if (highlight && highlight.used) {
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
    else if (request.cmd === 'close') {
      nav.back(true);
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
          add('libs/sval/sval.min.js', self.Sval).then(() => {
            try {
              const instance = new self.Sval({
                ecmaVer: 10,
                sandBox: true
              });
              instance.import('document', iframe.contentDocument);
              instance.run(action.code);
            }
            catch (e) {
              console.warn(e);
              alert(e.message);
            }
          });
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
      'font-size': cmd === 'font-decrease' ? Math.max(9, size - 1) : Math.min(50, size + 1)
    });
  }
  else if (cmd === 'width-decrease' || cmd === 'width-increase') {
    const width = config.prefs.width;
    if (width) {
      chrome.storage.local.set({
        width: cmd === 'width-decrease' ? Math.max(300, width - 50) : Math.min(3000, width + 50)
      });
    }
    else {
      chrome.storage.local.set({
        width: 600
      });
    }
  }
  else if (cmd === 'column-decrease' || cmd === 'column-increase') {
    let n = config.prefs['column-count'];
    n += cmd === 'column-decrease' ? -1 : 1;
    n = Math.max(1, Math.min(4, n));

    chrome.storage.local.set({
      'column-count': n
    });
  }
  else if (cmd === 'fixation-decrease' || cmd === 'fixation-increase') {
    let n = config.prefs['fixation-point'];
    n += cmd === 'fixation-decrease' ? -1 : 1;
    n = Math.max(0, Math.min(5, n));

    chrome.storage.local.set({
      'fixation-point': n
    }, () => {
      document.querySelector('#font-utils [data-id="fixation-point"] span').textContent = 'Reloading...';
      clearTimeout(self.fixationId);
      self.fixationId = setTimeout(() => location.reload(), 2000);
    });
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
  else if (cmd === 'text-align-true' || cmd === 'text-align-false') {
    chrome.storage.local.set({
      'text-align': cmd === 'text-align-true'
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
    nav.back(true);
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
    // iframe.contentDocument.spellcheck = active ? 'false' : 'true';

    if (active === false) {
      document.title = '[Design Mode]';
      add('libs/design-mode/inject.js');
    }
    else {
      document.title = document.oTitle;
      [...document.querySelectorAll('.edit-toolbar')].forEach(e => {
        const a = e.contentDocument.querySelector('[data-command="close"]');
        a.dispatchEvent(new Event('click', {bubbles: true}));
      });
    }
  }
});

/* transition */
document.getElementById('toolbar').addEventListener('transitionend', e => {
  e.target.classList.remove('active');
});

/* use this function to get doc */
const ready = () => new Promise(resolve => {
  if (ready.busy) {
    return ready.cache.push(resolve);
  }
  resolve(iframe.contentDocument);
});
iframe.onload = () => {
  if (article) {
    ready.busy = false;
    for (const resolve of ready.cache) {
      resolve(iframe.contentDocument);
    }
    ready.cache.length = 0;
  }
};
ready.busy = true;
ready.cache = [];


const render = () => chrome.runtime.sendMessage({
  cmd: 'read-data'
}, async obj => {
  if (obj === false) {
    document.getElementById('content').dataset.msg = chrome.i18n.getMessage('rd_warning_1');

    setTimeout(() => {
      document.querySelector('[data-cmd=close]').click();
    }, 3000);

    return;
  }

  article = obj;

  document.title = document.oTitle = config.prefs.title
    .replace('[ORIGINAL]', (article.title || args.get('url')).replace(' :: Reader View', ''))
    .replace('[BRAND]', 'Reader View');

  if (!article) { // open this page from history for instance
    return location.replace(args.get('url'));
  }

  iframe.contentDocument.open();
  const {pathname, hostname} = (new URL(article.url));
  const gcs = window.getComputedStyle(document.documentElement);

  const {textVide} = await import('./libs/text-vide/index.mjs');
  const content = config.prefs['fixation-point'] ? textVide(article.content, {
    fixationPoint: config.prefs['fixation-point']
  }) : article.content;

  iframe.contentDocument.write((await template())
    .replaceAll('%dir%', article.dir ? ' dir=' + article.dir : '')
    .replaceAll('%light-color%', gcs.getPropertyValue('--color-mode-light-color'))
    .replaceAll('%light-bg%', gcs.getPropertyValue('--color-mode-light-bg'))
    .replaceAll('%dark-color%', gcs.getPropertyValue('--color-mode-dark-color'))
    .replaceAll('%dark-bg%', gcs.getPropertyValue('--color-mode-dark-bg'))
    .replaceAll('%sepia-color%', gcs.getPropertyValue('--color-mode-sepia-color'))
    .replaceAll('%sepia-bg%', gcs.getPropertyValue('--color-mode-sepia-bg'))
    .replaceAll('%solarized-light-color%', gcs.getPropertyValue('--color-mode-solarized-light-color'))
    .replaceAll('%solarized-light-bg%', gcs.getPropertyValue('--color-mode-solarized-light-bg'))
    .replaceAll('%nord-light-color%', gcs.getPropertyValue('--color-mode-nord-light-color'))
    .replaceAll('%nord-light-bg%', gcs.getPropertyValue('--color-mode-nord-light-bg'))
    .replaceAll('%groove-dark-color%', gcs.getPropertyValue('--color-mode-groove-dark-color'))
    .replaceAll('%groove-dark-bg%', gcs.getPropertyValue('--color-mode-groove-dark-bg'))
    .replaceAll('%solarized-dark-color%', gcs.getPropertyValue('--color-mode-solarized-dark-color'))
    .replaceAll('%solarized-dark-bg%', gcs.getPropertyValue('--color-mode-solarized-dark-bg'))
    .replaceAll('%nord-dark-color%', gcs.getPropertyValue('--color-mode-nord-dark-color'))
    .replaceAll('%nord-dark-bg%', gcs.getPropertyValue('--color-mode-nord-dark-bg'))
    .replaceAll('%content%', content)
    .replaceAll('%title%', article.title || 'Unknown Title')
    .replaceAll('%byline%', article.byline || '')
    .replaceAll('%reading-time-fast%', article.readingTimeMinsFast)
    .replaceAll('%reading-time-slow%', article.readingTimeMinsSlow)
    .replaceAll('%published-time%', article['published_time'] || '')
    .replaceAll('%href%', article.url)
    .replaceAll('%hostname%', hostname)
    .replaceAll('%pathname%', pathname)
    .replaceAll('/*user-css*/', config.prefs['user-css'])
    .replaceAll('%data-images%', config.prefs['show-images'])
    .replaceAll('%data-font%', config.prefs.font)
    .replaceAll('%data-mode%', config.prefs.mode));
  iframe.contentDocument.close();

  // remote image loading
  {
    let shown = false;
    iframe.contentWindow.addEventListener('error', e => {
      if (shown === false && e.target.tagName === 'IMG' && e.target.src.startsWith('http')) {
        chrome.storage.local.get({
          'warn-on-remote-resources': true
        }, prefs => {
          if (prefs['warn-on-remote-resources']) {
            chrome.permissions.contains({
              origins: ['*://*/*']
            }, granted => {
              if (granted === false) {
                tips.show(1, false);
              }
            });
          }
          shown = true;
        });
      }
    }, true);
  }

  // fix relative links;
  const es = [...iframe.contentDocument.querySelectorAll('[src^="//"]')];
  for (const e of es) {
    e.src = article.url.split(':')[0] + ':' + e.getAttribute('src');
  }

  // favicon
  favicon(article);

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
      clearTimeout(guide.timeout);
      guide.timeout = setTimeout(() => guide.classList.add('hidden'), config.prefs['guide-timeout']);
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
    if (document.body.dataset.loaded !== 'true') {
      // apply transition after initial changes
      document.body.dataset.loaded = iframe.contentDocument.body.dataset.loaded = true;

      highlight = new iframe.contentWindow.Highlight();
      if (article.highlights) {
        highlight.import(article.highlights);
      }
    }
  });
  // highlight
  iframe.contentDocument.addEventListener('selectionchange', () => {
    const s = iframe.contentDocument.getSelection();
    const active = s.toString().trim() !== '';
    try {
      if (iframe.contentDocument.activeElement.classList.contains('note')) {
        document.getElementById('highlight-button').dataset.disabled = true;
        return;
      }
    }
    catch (e) {}
    document.getElementById('highlight-button').dataset.disabled = active === false;
  });
  // close on escape
  {
    const callback = e => {
      if (e.key === 'Escape' && !(
        document.fullscreenElement ||
        window.matchMedia('(display-mode: fullscreen)').matches)
      ) {
        return nav.back();
      }
      if (e.key === 'Escape' && window.matchMedia('(display-mode: fullscreen)').matches) {
        chrome.runtime.sendMessage({
          cmd: 'exit-fullscreen'
        });
      }
      if (e.code === 'KeyJ' && e.shiftKey && (e.ctrlKey || e.metaKey)) {
        iframe.contentDocument.body.focus();
        iframe.contentDocument.body.click();

        e.preventDefault();
        return;
      }

      shortcuts.forEach(o => {
        const s = config.prefs.shortcuts[o.id] || '';
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
        o.action(e);
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
  if (
    ps['font-size'] || ps['font'] ||
    ps['line-height'] || ps['width'] ||
    ps['text-align'] ||
    ps['column-count'] ||
    ps['fixation-point']
  ) {
    update.async();
  }
  if (ps['show-images']) {
    update.images();
  }
  if (ps['mode']) {
    document.body.dataset.mode = config.prefs.mode;
  }
  if (ps['toggle-toolbar']) {
    document.body.dataset.toolbar = config.prefs['toggle-toolbar'];
  }
});

// load
config.load(() => {
  document.body.dataset.mode = config.prefs.mode;
  document.body.dataset.toolbar = config.prefs['toggle-toolbar'];
  if (config.prefs['printing-button']) {
    document.getElementById('printing-button').classList.remove('hidden');
  }
  if (config.prefs['screenshot-button']) {
    document.getElementById('screenshot-button').classList.remove('hidden');
  }
  if (config.prefs['note-button']) {
    document.getElementById('note-button').classList.remove('hidden');
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

// convert data HREFs
const links = window.links = (d = document) => {
  for (const a of [...d.querySelectorAll('[data-href]')]) {
    if (a.hasAttribute('href') === false) {
      a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
    }
  }
};
document.addEventListener('DOMContentLoaded', () => links());
