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
    'user-css': `
img {
  display: block;
  max-width: 100%;
  width: auto;
  height: auto;
}
a:link, a:link:hover, a:link:active {
  color: #0095dd;
}
a:link {
  text-decoration: underline;
  font-weight: normal;
}
p {
  text-align: justify;
}
body {
  padding-bottom: 64px;
}`
  }, prefs => {
    iframe.contentDocument.body.style = `
      transition: color 0.4s, background-color 0.4s;
      font-family: ${prefs['font-family']};
      font-size: ${prefs['font-size']}px;
      width: ${prefs.width}px;
      margin: 64px auto 0 auto;
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
  <title>${article.title}</title>
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
      download: article.title.replace( /[<>:"/\\|?*]+/g, '' ) + '.html',
    });
    link.dispatchEvent(new MouseEvent('click'));
    setTimeout(() => URL.revokeObjectURL(objectURL));
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
  iframe.contentDocument.write(article.content);
  iframe.contentDocument.close();
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

  document.getElementsByTagName('head')[0].appendChild(Object.assign(
    document.querySelector(`link[rel*='icon']`) || document.createElement('link'), {
      type: 'image/x-icon',
      rel: 'shortcut icon',
      href: 'chrome://favicon/' + article.url
    }
  ));
  const doc = iframe.contentDocument;

  const h1 = doc.createElement('h1');
  h1.textContent = article.title;
  h1.id = 'reader-title';
  h1.style = `
    font-size: 1.6em;
    line-height: 1.25em;
    width: 100%;
    margin: 30px 0;
    padding: 0;
  `;
  doc.body.insertBefore(h1, doc.body.firstChild);

  const a = iframe.contentDocument.createElement('a');
  a.href = article.url;
  a.onclick = () => {
    history.back();
    return false;
  };
  a.textContent = (new URL(article.url)).hostname;
  a.id = 'reader-domain';
  a.style = `
    font-size: 0.9em;
    line-height: 1.48em;
    padding-bottom: 4px;
    font-family: Helvetica, Arial, sans-serif;
    text-decoration: none;
    border-bottom: 1px solid;
    border-bottom-color: currentcolor;
    color: #0095dd;
  `;
  doc.body.insertBefore(a, doc.body.firstChild);
  /*
  const script = doc.createElement('script');
  script.src = '/data/inject/iscroll.js';
  doc.body.appendChild(script);
  */
  iframe.contentWindow.addEventListener('click', () => {
    settings.dataset.display = false;
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
