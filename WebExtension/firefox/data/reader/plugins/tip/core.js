/**
    Reader View - Strips away clutter

    Copyright (C) 2014-2021 [@rNeomy](https://add0n.com/chrome-reader-view.html)

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

const tips = [{
  message: 'By selecting the actual content or part of it before switching to the reader view, you can prevent unwanted content from cluttering your view. This is also useful if the automatic selection module fails to detect the correct content.'
}, {
  message: 'This page contains remote images that the extension cannot fetch with the current permission set. If you need the extension to load these images, grant the extension to access remote content by enabling the "Open links in the reader view mode" from the options page.',
  hidden: true
}];
window.tips = tips;

tips.show = (i, forced = false) => {
  chrome.storage.local.get({
    ['tip.' + i]: localStorage.getItem('tip.' + i)
  }, prefs => {
    if (prefs['tip.' + i] !== 's' || forced) {
      const t = document.querySelector('#tips template');
      const clone = document.importNode(t.content, true);
      clone.querySelector('span').textContent = tips[i].message;


      clone.querySelector('input').addEventListener('click', e => {
        e.target.closest('div').remove();
        if (document.querySelector('#tips > div') === null) {
          document.body.dataset.tips = false;
        }
      });

      document.getElementById('tips').appendChild(clone);
      document.body.dataset.tips = true;

      chrome.storage.local.set({
        ['tip.' + i]: 's'
      });
    }
  });
};

function enable() {
  for (let i = 0; i < tips.length; i += 1) {
    if (tips[i].hidden === true) {
      continue;
    }
    tips.show(i);
  }
}
function disable() {}

export {
  enable,
  disable
};
