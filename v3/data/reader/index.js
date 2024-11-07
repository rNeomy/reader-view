/**
    Reader View - Strips away clutter

    Copyright (C) 2014-2022 [@rNeomy]

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
    Homepage: https://webextension.org/listing/chrome-reader-view.html
*/

/* global config, tips */
'use strict';

let article;
let highlight;

const args = new URLSearchParams(location.search);

// Relax restrictions on remote access (#175)
const remote = () => {
  const id = Number(args.get('id'));
  return Promise.race([
    // https://github.com/rNeomy/reader-view/issues/183
    new Promise(resolve => setTimeout(() => {
      resolve('possible remote timeout');
    }, 200)),
    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [id],
      addRules: [{
        'id': id,
        'priority': 1,
        'action': {
          'type': 'modifyHeaders',
          'requestHeaders': [{
            'header': 'referer',
            'operation': 'set',
            'value': args.get('url')
          }, {
            'header': 'origin',
            'operation': 'remove'
          }],
          'responseHeaders': [{
            'operation': 'set',
            'header': 'access-control-allow-origin',
            'value': '*'
          }]
        },
        'condition': {
          'resourceTypes': ['image'],
          'tabIds': [id]
        }
      }]
    }).then(() => '')
  ]).then(msg => msg && console.log(msg));
};

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
  const hash = link.hash.substring(1);

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

// scrollbar
const scrollbar = {
  has() {
    const rt = iframe.contentDocument.documentElement;
    return rt.scrollHeight > rt.clientHeight;
  },
  width() {
    // Creating invisible container
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll'; // forcing scrollbar to appear
    outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
    document.body.appendChild(outer);

    // Creating inner element and placing it in the container
    const inner = document.createElement('div');
    outer.appendChild(inner);

    // Calculating difference between container's full width and the child width
    const scrollbarWidth = (outer.offsetWidth - inner.offsetWidth);

    // Removing temporary elements from the DOM
    outer.parentNode.removeChild(outer);

    scrollbar.width = () => scrollbarWidth;

    return scrollbarWidth;
  }
};

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
  const r = await fetch('template.html');
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
      font-family: ${prefs.font};
      width: ${prefs.width ? `min(100% - 2rem, ${prefs.width + 'px'})` : 'calc(100vw - 50px)'};
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
    document.body.dataset.font = (
      prefs['supported-fonts'].filter(o => o.value === prefs.font).map(o => o.name).shift() || prefs.font
    ).toLowerCase().replaceAll(/\s+/g, '-');
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
fontUtils.addEventListener('focus', () => {
  fontUtils.dataset.opening = false;
});
const imageUtils = document.querySelector('#image-utils');
imageUtils.addEventListener('focus', () => {
  imageUtils.dataset.opening = false;
});

const shortcuts = new Map();
shortcuts.render = (spans = shortcuts.keys()) => {
  for (const span of spans) {
    const id = shortcuts.get(span)?.id;
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
  shortcuts.set(document.getElementById('toolbar'), {
    id: 'toggle-toolbar',
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
  shortcuts.set(span, {
    id: 'print',
    action: span.onclick
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
    chrome.permissions.request({
      origins: ['<all_urls>']
    }, granted => {
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
  shortcuts.set(span, {
    id: 'screenshot',
    action: span.onclick
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
  shortcuts.set(span, {
    id: 'email',
    action: span.onclick
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

    if (e.shiftKey) {
      // remove style tags (on MarkDown)
      for (const s of [...dom.querySelectorAll('style')]) {
        s.remove();
      }
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
  shortcuts.set(span, {
    id: 'save',
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
  shortcuts.set(span, {
    id: 'fullscreen',
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
  shortcuts.set(span, {
    id: 'design-mode',
    action() {
      span.click();
    }
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
  shortcuts.set(span, {
    id: 'images',
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
  shortcuts.set(span, {
    id: 'note',
    action: span.onclick
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
  shortcuts.set(span, {
    id: 'highlight',
    action() {
      span.click();
    }
  });
  document.getElementById('toolbar').appendChild(span);

  chrome.runtime.onMessage.addListener(request => {
    if (request.cmd === 'append-highlights' && request.href === args.get('url').split('#')[0]) {
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
          shortcuts.set(span, {
            id,
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

document.getElementById('font-selector').onchange = e => {
  chrome.storage.local.set({
    'font': e.target.value
  });
};

document.addEventListener('click', e => {
  const target = e.target.closest('[data-cmd]');
  if (!target) {
    return;
  }
  const cmd = target.dataset.cmd;
  if (cmd) {
    e.target.classList.add('active');
  }

  if (cmd === 'font-decrease' || cmd === 'font-increase') {
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
    const mode = cmd.replace('color-mode-', '');
    const kind = target.parentElement.dataset.id;

    // if os-sync is enabled and mode is not changed, the old os-based color will be selected
    if (config.prefs['os-sync']) {
      document.body.dataset.mode = mode;
      iframe.contentDocument.documentElement.dataset.mode = mode;
    }

    chrome.storage.local.set({
      mode,
      ['preferred-' + kind + '-mode']: mode
    });
  }
  else if (cmd === 'close') {
    nav.back(true);
  }
  else if (cmd === 'open-font-utils') {
    fontUtils.dataset.opening = true;
    fontUtils.focus();

    // Loading fonts
    const e = document.getElementById('font-selector');
    if (e.isLoaded !== true) {
      e.textContent = '';

      const aa = config.prefs['supported-fonts'].length ? config.prefs['supported-fonts'] : defaults['supported-fonts'];
      for (const {name, value} of aa) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = name;
        e.append(option);
      }

      e.value = config.prefs.font;
      e.selectedOptions[0]?.scrollIntoView({block: 'center'});
      e.isLoaded = true;
    }
  }
  else if (cmd === 'open-image-utils') {
    imageUtils.dataset.opening = true;
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
    chrome.runtime.sendMessage({
      cmd: 'highlights',
      value: highlight.export(),
      href: args.get('url').split('#')[0]
    });
  }
  else if (cmd === 'toggle-design-mode') {
    const active = iframe.contentDocument.designMode === 'on';
    e.target.dataset.active = active === false;
    iframe.contentDocument.designMode = active ? 'off' : 'on';
    // iframe.contentDocument.spellcheck = active ? 'false' : 'true';

    if (active === false) {
      document.title = '[Design Mode]';
      add('libs/design-mode/inject.js').then(() => {
        // reposition
        if (scrollbar.has()) {
          [...document.querySelectorAll('.edit-toolbar')].forEach(e => {
            e.style.right = CSS.px(10 + scrollbar.width());
          });
        }
      });
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
ready.busy = true;
ready.cache = [];


const render = () => chrome.runtime.sendMessage({
  cmd: 'read-data'
}, async obj => {
  if (obj === false) {
    document.getElementById('content').dataset.msg = chrome.i18n.getMessage('rd_warning_1') + '\n\n' + args.get('url');

    setTimeout(() => {
      document.querySelector('[data-cmd=close]').click();
    }, 3000);

    return;
  }
  // set referer
  await remote().catch(e => console.error('cannot set referer', e));

  article = obj;
  document.body.dataset.lang = article.lang;

  const currentDate = new Date();
  document.title = document.oTitle = config.prefs.title
    .replace('[ORIGINAL]', (article.title || args.get('url')).replace(' :: Reader View', ''))
    .replace('[BRAND]', 'Reader View')
    .replace('[DD]', String(currentDate.getDate()).padStart(2, '0'))
    .replace('[MM]', String(currentDate.getMonth() + 1).padStart(2, '0'))
    .replace('[YYYY]', currentDate.getFullYear());

  if (!article) { // open this page from history for instance
    return location.replace(args.get('url'));
  }

  iframe.contentDocument.open();
  const {pathname, hostname} = (new URL(article.url));
  const gcs = window.getComputedStyle(document.documentElement);

  const {textVide} = await import('./libs/text-vide/index.mjs');
  // http://add0n.com/chrome-reader-view.html#IDComment1118667428
  const content = config.prefs['fixation-point'] ? textVide(article.content.replace(/&nbsp;/g, ' '), {
    fixationPoint: config.prefs['fixation-point']
  }) : article.content;

  iframe.addEventListener('load', () => {
    if (document.body.dataset.loaded !== 'true') {
      // apply transition after initial changes
      document.body.dataset.loaded = iframe.contentDocument.body.dataset.loaded = true;

      highlight = new iframe.contentWindow.TextHighlight();
      if (article.highlights) {
        highlight.import(article.highlights);
      }
    }
  });

  iframe.contentDocument.write((await template())
    .replaceAll('%dir%', article.dir ? ' dir=' + article.dir : '')
    .replaceAll('%lang%', article.lang ? ' lang=' + article.lang : '')
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
    .replaceAll('%data-font%', document.body.dataset.font)
    .replaceAll('%data-columns%', config.prefs['column-count']));
  iframe.contentDocument.close();
  iframe.contentDocument.documentElement.dataset.mode = document.body.dataset.mode;

  // To-Do; check on Firefox
  iframe.contentDocument.addEventListener('DOMContentLoaded', () => {
    iframe.dispatchEvent(new Event('load'));
  });

  // improves printing title for Firefox; https://github.com/rNeomy/reader-view/issues/157
  const t = document.createElement('title');
  t.textContent = document.title.split(/\s*::/)[0];
  iframe.contentDocument.head.appendChild(t);

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
    shortcuts.set(next, {
      id: 'next-page',
      action: () => next.click()
    });
    shortcuts.set(previous, {
      id: 'previous-page',
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

    // ready
    ready.busy = false;
    for (const resolve of ready.cache) {
      resolve(iframe.contentDocument);
    }
    ready.cache.length = 0;
  }

  iframe.contentDocument.documentElement.appendChild(styles.internals);

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

      for (const o of shortcuts.values()) {
        const s = config.prefs.shortcuts[o.id] || '';
        if (s.includes(e.code) === false) {
          continue;
        }
        if (s.includes('Ctrl/Command') && (e.ctrlKey || e.metaKey) === false) {
          continue;
        }
        if (s.includes('Ctrl/Command') === false && (e.ctrlKey || e.metaKey)) {
          continue;
        }
        if (s.includes('Shift') && e.shiftKey === false) {
          continue;
        }
        if (s.includes('Shift') === false && e.shiftKey) {
          continue;
        }
        e.preventDefault();
        e.stopImmediatePropagation();

        o.action(e);
        break;
      }
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
  const url = args.get('url');
  const indexOfHash = url.indexOf('#');
  if (indexOfHash !== -1 && indexOfHash !== url.length - 1) {
    const link = new URL(url);
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
  if (ps['font']) {
    document.getElementById('font-selector').value = ps.font.newValue;
  }
  if (ps['show-images']) {
    update.images();
  }
  if (ps['mode']) {
    document.body.dataset.mode = config.prefs.mode;
  }
  if (ps['os-sync']) {
    mode.query?.dispatchEvent(new Event('change'));
  }
  if (ps['toggle-toolbar']) {
    document.body.dataset.toolbar = config.prefs['toggle-toolbar'];
  }
});

// Decide color scheme based on user configs and os theme
const mode = (e = mode.query) => new Promise(resolve => {
  if (!config.prefs['os-sync'] || !e) {
    resolve(config.prefs.mode);
    return;
  }
  const theme = e.matches ? 'dark' : 'light';

  chrome.storage.local.get({
    'preferred-dark-mode': 'groove-dark',
    'preferred-light-mode': 'sepia'
  }, prefs => {
    resolve(prefs[`preferred-${theme}-mode`]);
  });
});
mode.query = window?.matchMedia('(prefers-color-scheme: dark)');
if (mode.query) {
  mode.query.addEventListener('change', async () => {
    const m = await mode();
    document.body.dataset.mode = m;
    if (iframe.contentDocument) {
      iframe.contentDocument.documentElement.dataset.mode = m;
    }
  });
}

// load
config.load(() => {
  mode().then(v => document.body.dataset.mode = v);

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
