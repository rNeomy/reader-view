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

/* global article, iframe, Prism, ready */

'use strict';

const observe = () => {
  const link = article.doi;
  if (link) {
    const div = document.createElement('div');
    div.id = 'doi';
    const a = document.createElement('a');
    a.href = link;
    a.target = '_blank';
    a.textContent = 'Parsing...';
    div.append('DOI: ', a);
    iframe.contentDocument.getElementById('published-time').insertAdjacentElement('afterend', div);

    fetch(link, {
      headers: {
        'Accept': 'application/vnd.citationstyles.csl+json'
      }
    }).then(r => r.json()).then(r => {
      if (r.indexed) {
        const date = r.indexed.timestamp;
        if (date) {
          a.textContent = r.DOI;

          const more = document.createElement('a');
          more.href = '#';
          more.textContent = 'Show Details';

          div.append(', ', more);

          more.onclick = e => {
            e.preventDefault();
            import('./prism/prism.js').then(() => {
              const json = document.createElement('pre');
              json.id = 'doi-json';
              div.insertAdjacentElement('afterend', json);
              const code = document.createElement('code');
              code.innerHTML = Prism.highlight(JSON.stringify(r, null, '  '), Prism.languages.json, 'json');
              json.appendChild(code);

              const style = document.createElement('link');
              style.href = 'plugins/doi/prism/prism.css';
              style.rel = 'stylesheet';
              iframe.contentDocument.head.appendChild(style);

              more.expanded = true;
              more.textContent = 'Hide Details';
              more.onclick = e => {
                e.preventDefault();
                e.stopPropagation();
                if (more.expanded) {
                  more.expanded = false;
                  more.textContent = 'Show Details';
                  json.classList.add('hidden');
                }
                else {
                  more.expanded = true;
                  more.textContent = 'Hide Details';
                  json.classList.remove('hidden');
                }
              };
            });
          };
        }
        else {
          throw Error('cannot parse');
        }
      }
      else {
        throw Error('cannot parse');
      }
    }).catch(e => {
      console.warn('DOI plug-in error', e);
      a.textContent = link;
    });
  }
};

function enable() {
  disable();
  ready().then(observe);
}
function disable() {
  try {
    document.getElementById('doi').remove();
  }
  catch (e) {}
}

export {
  enable,
  disable
};
