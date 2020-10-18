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

'use strict';

const tips = [
  'By selecting the actual content or part of it before switching to the reader view, you can prevent unwanted content from cluttering your view. This is also useful if the automatic selection module fails to detect the correct content.'
];

for (let i = 0; i < tips.length; i += 1) {
  chrome.storage.local.get({
    ['tip.' + i]: localStorage.getItem('tip.' + i)
  }, prefs => {
    if (prefs['tip.' + i] !== 's') {
      document.querySelector('#tips span').textContent = tips[i];
      document.body.dataset.tips = true;

      chrome.storage.local.set({
        ['tip.' + i]: 's'
      });
    }
  });
}

document.querySelector('#tips input').addEventListener('click', () => {
  document.body.dataset.tips = false;
});
