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

/* global args */

let id;

function enable() {
  id = setTimeout(() => {
    if (confirm(`Oops! Reader View is crashed. Would you like to restart the extension?

The address of current page will be copied to the clipboard`)) {
      navigator.clipboard.writeText(args.get('url')).finally(() => {
        chrome.runtime.reload();
      });
    }
  }, 2000);
  chrome.runtime.sendMessage({
    cmd: 'health-check'
  }, r => {
    if (r === true) {
      clearTimeout(id);
    }
  });
}
function disable() {
  clearTimeout(id);
}

export {
  enable,
  disable
};
