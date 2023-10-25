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

/* global article, iframe, shortcuts */

const chapters = {};
chapters.add = () => {
  const {next, previous} = article.chapters;

  if (!previous && !next) {
    console.info('There is no next or previous chapters for this article');
    return;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(`
    <div id="chapters-container">
      <style>
        #chapters {
          display: grid;
          grid-template-columns: 1fr 1fr;
          margin: 2ch 0;
        }
        #chapters a {
          cursor: pointer;
        }
        #chapters a[href=""] {
          opacity: 0.5;
          pointer-events: none;
          color: inherit;
        }
        #chapters a:first-child {
          justify-self: start;
        }
        #chapters a:last-child {
          justify-self: end;
        }
      </style>
      <hr>
      <div id="chapters">
        <a href="${previous || ''}" title="move to the previous chapter (command)">Previous Chapter</a>
        <a href="${next || ''}" title="move to the next chapter (command)">Next Chapter</a>
      </div>
    </div>
  `, 'text/html');
  iframe.contentDocument.body.append(doc.querySelector('div'));

  const ne = iframe.contentDocument.querySelector('#chapters a:first-child');
  shortcuts.set(ne, {
    id: 'previous-chapter',
    span: ne,
    action: () => ne.click()
  });
  const pe = iframe.contentDocument.querySelector('#chapters a:last-child');
  shortcuts.set(pe, {
    id: 'next-chapter',
    span: pe,
    action: () => pe.click()
  });
  shortcuts.render([ne, pe]);
};

chapters.remove = () => {
  iframe.contentDocument.getElementById('chapters-container')?.remove();
};

function enable() {
  chapters.add();
}
function disable() {
  chapters.remove();
}

export {
  enable,
  disable
};
