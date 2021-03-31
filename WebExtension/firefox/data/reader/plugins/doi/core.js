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

/* global article, iframe, Prism */

'use strict';

function enable() {
  const link = article.doi;
  if (link) {
    fetch(link, {
      headers: {
        'Accept': 'application/vnd.citationstyles.csl+json'
      }
    }).then(r => r.json()).then(r => {
      if (r.indexed) {
        const date = r.indexed.timestamp;
        if (date) {
          const div = document.createElement('div');
          div.id = 'doi';
          const a = document.createElement('a');
          a.href = article.doi;
          a.textContent = r.DOI;
          div.appendChild(a);
          div.appendChild(document.createTextNode(', Published on ' + (new Date(date)).toLocaleDateString() + ', '));
          const more = document.createElement('a');
          more.href = '#';
          more.textContent = 'more';
          const json = document.createElement('pre');
          more.onclick = e => {
            e.preventDefault();
            import('./prism/prism.js').then(() => {
              json.id = 'doi-json';
              const code = document.createElement('code');
              code.innerHTML = Prism.highlight(JSON.stringify(r, null, '  '), Prism.languages.json, 'json');
              json.appendChild(code);
              div.insertAdjacentElement('afterend', json);

              const style = document.createElement('link');
              style.href = 'plugins/doi/prism/prism.css';
              style.rel = 'stylesheet';
              iframe.contentDocument.head.appendChild(style);

              more.expanded = true;
              more.textContent = 'less';
              more.onclick = () => {
                if (more.expanded) {
                  more.expanded = false;
                  more.textContent = 'more';
                  json.classList.add('hidden');
                }
                else {
                  more.expanded = true;
                  more.textContent = 'less';
                  json.classList.remove('hidden');
                }
              };
            });
          };
          div.appendChild(more);

          iframe.contentDocument.getElementById('reader-estimated-time').insertAdjacentElement('afterend', div);
        }
      }
    }).catch(e => {
      console.warn('DOI plug-in error', e);
    });
  }
}
function disable() {

}

export {
  enable,
  disable
};
