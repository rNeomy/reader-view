'use strict';

var article;

{
  const css = localStorage.getItem('top-css');
  if (css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.documentElement.appendChild(style);
  }
}

var iframe = document.querySelector('iframe');
var settings = document.querySelector('#toolbar>div');
var styles = document.createElement('style');

document.addEventListener('click', e => {
  const bol = e.target.dataset.cmd === 'open-settings' || Boolean(e.target.closest('#toolbar>div'));
  settings.dataset.display = bol;
});

function update() {
  chrome.storage.local.get({
    'font-size': 13,
    'font-family': 'Helvetica, Arial, sans-serif',
    'width': 600,
    'line-height': 28.8,
    'mode': 'sepia',
    'user-css': `body {
  padding-bottom: 64px;
}
a:visited {
  color: #d33bf0;
}
a:link, a:link:hover, a:link:active {
  color: #0095dd;
}
a:link {
  text-decoration: none;
  font-weight: normal;
}
p {
  text-align: justify;
}
pre {
  white-space: pre-line;
}
/* CSS for "sepia" theme */
body[data-mode=sepia] {
}
/* CSS for "light" theme */
body[data-mode=light] {}
/* CSS for "dark" theme */
body[data-mode=dark] {}`
  }, prefs => {
    iframe.contentDocument.body.style = `
      font-family: ${prefs['font-family']};
      font-size: ${prefs['font-size']}px;
      width: ${prefs.width}px;
      line-height: ${prefs['line-height']}px;
      color: ${({
        light: '#00000',
        dark: '#eeeeee',
        sepia: '#5b4636'
      })[prefs.mode]};
      background-color: ${({
        light: '#ffffff',
        dark: '#333333',
        sepia: '#f4ecd8'
      })[prefs.mode]};
    `;
    iframe.contentDocument.body.dataset.mode = prefs.mode;
    document.body.dataset.mode = prefs.mode;
    styles.textContent = prefs['user-css'];
    iframe.contentWindow.focus();
  });
}

document.addEventListener('click', e => {
  const target = e.target.closest('[data-cmd]');
  if (!target) {
    return;
  }
  const cmd = target.dataset.cmd;
  if (cmd === 'font-type-1') {
    chrome.storage.local.set({
      'font-family': 'Helvetica, Arial, sans-serif'
    }, update);
  }
  else if (cmd === 'font-type-2') {
    chrome.storage.local.set({
      'font-family': 'Georgia, "Times New Roman", serif'
    }, update);
  }
  else if (cmd === 'font-decrease') {
    chrome.storage.local.get({
      'font-size': 13
    }, prefs => {
      prefs['font-size'] = Math.max(9, prefs['font-size'] - 1);
      chrome.storage.local.set(prefs, update);
    });
  }
  else if (cmd === 'font-increase') {
    chrome.storage.local.get({
      'font-size': 13
    }, prefs => {
      prefs['font-size'] = Math.min(33, prefs['font-size'] + 1);
      chrome.storage.local.set(prefs, update);
    });
  }
  else if (cmd === 'width-decrease') {
    chrome.storage.local.get({
      'width': 600
    }, prefs => {
      prefs.width = Math.max(300, prefs.width - 50);
      chrome.storage.local.set(prefs, update);
    });
  }
  else if (cmd === 'width-increase') {
    chrome.storage.local.get({
      'width': 600
    }, prefs => {
      prefs.width = Math.min(1000, prefs.width + 50);
      chrome.storage.local.set(prefs, update);
    });
  }
  else if (cmd === 'line-height-type-1') {
    chrome.storage.local.set({
      'line-height': 28.8
    }, update);
  }
  else if (cmd === 'line-height-type-2') {
    chrome.storage.local.set({
      'line-height': 32
    }, update);
  }
  else if (cmd === 'color-mode-1') {
    chrome.storage.local.set({
      'mode': 'light'
    }, update);
  }
  else if (cmd === 'color-mode-2') {
    chrome.storage.local.set({
      'mode': 'dark'
    }, update);
  }
  else if (cmd === 'color-mode-3') {
    chrome.storage.local.set({
      'mode': 'sepia'
    }, update);
  }
  else if (cmd === 'close') {
    history.back();
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
    history.back();
  }
});
document.addEventListener('keyup', e => {
  if (e.key === 'Escape') {
    history.back();
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
    transition: color 0.4s, background-color 0.4s;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 30px auto 0 auto;
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
<hr/>
${article.content}
</body>
</html>`;
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  // automatically detect ltr and rtl
  [...iframe.contentDocument.querySelectorAll('article>*')]
    .forEach(e => e.setAttribute('dir', 'auto'));

  document.title = article.title + ' :: Reader View';
  // link handling
  iframe.contentDocument.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a && a.href && a.href.startsWith('http')) {
      e.preventDefault();
      chrome.storage.local.get({
        'new-tab': true
      }, prefs => {
        if (prefs['new-tab']) {
          chrome.runtime.sendMessage({
            cmd: 'open',
            url: a.href
          });
        }
        else {
          window.top.location.replace(a.href);
        }
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

  // Ctrl + S
  iframe.contentWindow.addEventListener('keydown', e => {
    if (e.code === 'KeyS' && e.metaKey) {
      e.preventDefault();
      document.querySelector('[data-cmd=save]').click();
      return false;
    }
  });

  iframe.contentDocument.documentElement.appendChild(styles);
  update();
});
//
chrome.storage.onChanged.addListener(prefs => {
  if (prefs['user-css']) {
    styles.textContent = prefs['user-css'].newValue;
  }
});
