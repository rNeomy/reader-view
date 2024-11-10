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
/* global args, article */

function enable() {
  const styles = document.createElement('style');
  styles.id = 'multiple-articles-styling';
  styles.textContent = `
    body:not([data-articles]) #multiple-articles-button {
      display: none;
    }
    body[data-articles="true"] #multiple-articles-button {
      color: var(--fg-selected);
    }
  `;
  document.head.append(styles);

  const span = document.createElement('span');
  span.id = 'multiple-articles-button';
  span.classList.add('icon-multiple-articles');
  span.dataset.cmd = 'switch-to-multiple-articles';
  span.setAttribute('title', document.body.dataset.articles === 'true' ?
    chrome.i18n.getMessage('rd_sts') : chrome.i18n.getMessage('rd_stm'));

  span.onclick = () => {
    if (document.body.dataset.articles === 'true') {
      args.set('extract-articles', false);
    }
    else {
      args.set('extract-articles', true);
    }

    // make sure we already have the article
    chrome.runtime.sendMessage({
      cmd: 'update-data',
      article
    }, () => {
      location.replace('?' + args.toString());
    });
  };

  const toolbar = document.getElementById('toolbar');
  toolbar.insertBefore(span, toolbar.children[1]);
}
function disable() {
  document.getElementById('multiple-articles-button')?.remove();
  document.getElementById('multiple-articles-styling')?.remove();
}

export {
  enable,
  disable
};
