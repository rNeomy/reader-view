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

let container;

function enable() {
  container = document.createElement('div');
  container.classList.add('notify');
  document.body.appendChild(container);
  window.notify = (message, type = 'info', delay = 3000) => {
    const div = document.createElement('div');
    div.textContent = message;
    div.classList.add(type);
    container.appendChild(div);
    setTimeout(() => div.remove(), delay);
  };
}
function disable() {
  try {
    container.remove();
  }
  catch (e) {}
  delete window.notify;
}

export {
  enable,
  disable
};
